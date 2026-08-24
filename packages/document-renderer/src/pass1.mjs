// Pass 1 — the deterministic half of the document renderer.
//
// Resolves every model-object reference and every derived figure in a `.ttrs`
// recipe. Runs and is testable with NO agent present: nothing in this module
// calls a model, and nothing in it may. Instruction slots are pass 2's job and
// are copied through untouched, so an unfilled section is visible in the output
// rather than silently blank.
//
// This module ships as a unit callable on its own, so pass 2 and Studio's
// preview can both depend on it as a library rather than on the whole renderer.
//
// Two invariants worth stating outright:
//
//   * It writes nothing into the model. Every filesystem touch here is a read.
//   * It is re-run-stable. Given unchanged inputs the Markdown is byte-identical —
//     no timestamps, no filesystem-order dependence, no counters that reset.
//
// Failure discipline: an unresolvable reference FAILS the run by name. It never
// renders as empty text. The distinct codes matter — a caller must be able to
// tell "you have no repository configured" (TTRS-011) apart from "your
// repository does not contain this id" (TTRS-010).
//
// The language names FIVE non-ok reference states (DIRECTIVE_LANGUAGE.md §5).
// This pass computes four of them and reports the fifth (⚑S) as not computed.
// The three canon-side ones are @transitrix/document-view-engine's own
// (resolveReference()'s ⚑U / ⚑A / ⚑V), deliberately reused rather than
// re-invented — one notation must not grow two classifications of the same
// failure. The fourth is this pass's, and is about configuration, not canon:
//
//   unresolved         ⚑U  TTRS-010  no object with that id in the repository
//   not-admitted       ⚑A  TTRS-014  it exists, but admission_state isn't active
//   out-of-validity    ⚑V  TTRS-015  [valid_from, valid_to] misses the render date
//   no-repository      —   TTRS-011  the recipe cites canon; none is configured
//
// The worst defect this guards against is not a missing reference — it is a
// reference that resolves and renders as plainly correct text when the object
// behind it was never admitted, or stopped being valid. So a non-ok state is
// never rendered as its bare value.
//
// ⚑S (suspect) is NOT computed in this pass, and is reported as "not computed"
// rather than omitted. DIRECTIVE_LANGUAGE.md §5.1 requires three distinguishable
// outcomes and not two — suspect, checked-and-clean, and never-checked — because
// a render that never checked must not look like one that came back clean. That
// is the one failure mode which reads as success. Three standing reasons for
// declining, none of them a time-box — see the `suspicion` field of the result.

import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path';

import { parseRecipe, recipeKindFromFilename } from './parse-recipe.mjs';
import { buildRepositoryIndex } from './repository.mjs';

// Rendered in place of a reference that did not land in `ok`. The run has already
// failed by the time this is visible; it exists so the failure is never a blank,
// and never a value that reads as correct.
const UNRESOLVED_MARKER = (id) => `«unresolved: ${id}»`;
const STATE_MARKER = (state, id) => `«${STATES[state].label}: ${id}»`;

// The one place a state's code, flag and wording live together.
const STATES = {
  unresolved: { code: 'TTRS-010', flag: '⚑U', label: 'unresolved' },
  'not-admitted': { code: 'TTRS-014', flag: '⚑A', label: 'not admitted' },
  'out-of-validity': { code: 'TTRS-015', flag: '⚑V', label: 'out of validity' },
};

// Why ⚑S is absent, carried in the result so a caller never has to guess
// whether suspicion was clean or simply never run.
const SUSPICION_NOT_COMPUTED = {
  computed: false,
  state: 'not-computed',
  reason:
    'link suspicion (⚑S) is not computed in pass 1: it is out of scope by the '
    + 'rendered-documents decision, it is derived from commit history rather than '
    + 'read from a file, and CONTRACT.md §16.2 scopes it to REL/claim records '
    + 'rather than the element references a recipe cites.',
};

// Field consulted, in order, when a reference names no field path of its own.
const DEFAULT_FIELDS = ['name', 'title', 'id'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function coversDate(validFrom, validTo, renderDate) {
  if (validFrom === null || validFrom === undefined) return true; // nothing to check against
  if (renderDate < validFrom) return false;
  if (validTo !== null && validTo !== undefined && renderDate > validTo) return false;
  return true;
}

// The §3 classification, in document-view-engine's order: existence, then
// admission, then validity. Returns 'ok' when the object is usable.
function classifyReference(entry, renderDate) {
  if (!entry) return 'unresolved';
  if (entry.admissionState !== 'active') return 'not-admitted';
  if (!coversDate(entry.validFrom, entry.validTo, renderDate)) return 'out-of-validity';
  return 'ok';
}

function needsRepository(ast) {
  return ast.some((node) => node.type === 'reference' || node.type === 'view');
}

function traverse(entry, fields, index) {
  let current = entry;
  for (let i = 0; i < fields.length; i++) {
    const value = current.fields[fields[i]];
    if (value === undefined) return undefined;
    // A middle segment must name another object to keep walking into.
    if (i < fields.length - 1) {
      const next = index.get(value);
      if (!next) return undefined;
      current = next;
      continue;
    }
    return value;
  }
  return undefined;
}

// Records one non-ok reference state: always as a finding, and — in the strict
// profile — as an error that fails the run. The message names the file, the id
// and the state, in that order, because that is the order someone fixing it
// needs them in.
function recordState(node, state, ctx) {
  const { code, label, flag } = STATES[state];
  ctx.findings.push({ code, state, flag, id: node.id, file: ctx.recipeLabel });
  ctx.states[state] = (ctx.states[state] ?? 0) + 1;
  if (ctx.profile === 'strict') {
    ctx.errors.push({
      code,
      message: `${ctx.recipeLabel}: model-object reference "${node.id}" is ${label}`,
    });
  }
}

function renderReference(node, index, ctx) {
  const entry = index.get(node.id);
  const state = classifyReference(entry, ctx.renderDate);

  if (state !== 'ok') {
    recordState(node, state, ctx);
    // In review the value is shown WITH its flag, so a reader sees both what the
    // recipe meant and that it is not usable. In strict it never renders as
    // its bare value — a wrong-but-plausible render is the defect being guarded
    // against, and it is worse than a visibly missing one.
    if (ctx.profile === 'review' && entry) {
      const value = readValue(node, entry, index);
      if (value !== undefined) return `${value} ${STATES[state].flag}`;
    }
    return STATE_MARKER(state, node.id);
  }

  ctx.states.ok = (ctx.states.ok ?? 0) + 1;

  const value = readValue(node, entry, index);
  if (value !== undefined) return value;

  // The object is admitted and in validity; it is the field path that is absent.
  const path = node.fields.length === 0
    ? node.id
    : `${node.id}.${node.fields.join('.')}`;
  const detail = node.fields.length === 0
    ? `resolves, but the object carries none of: ${DEFAULT_FIELDS.join(', ')}`
    : 'does not resolve — the field path is not present on that object';
  ctx.errors.push({
    code: 'TTRS-010',
    message: `${ctx.recipeLabel}: model-object reference "${path}" ${detail}`,
  });
  return UNRESOLVED_MARKER(path);
}

// The value a reference substitutes: its own field path, or the first of the
// default fields the object carries. `undefined` when neither is present.
function readValue(node, entry, index) {
  if (!entry) return undefined;
  if (node.fields.length === 0) {
    for (const name of DEFAULT_FIELDS) {
      if (entry.fields[name] !== undefined) return entry.fields[name];
    }
    return undefined;
  }
  return traverse(entry, node.fields, index);
}

function resolveAssetPath(baseDir, path) {
  if (!baseDir) return path;
  return isAbsolute(path) ? path : resolvePath(join(baseDir, path));
}

// A derived figure (`{{ view … }}`) is authored as text in the existing view
// notation; a supplied figure (`{{ figure … }}`) is an asset and is never
// generated. Pass 1 resolves both to a stable, numbered embed. Turning a view
// source into a raster is the output layer's job, reached through the optional
// `rasterise` hook so this module stays free of any renderer dependency.
function renderFigure(node, ctx, errors) {
  const kind = node.type === 'view' ? 'view' : 'figure';
  const abs = resolveAssetPath(ctx.baseDir, node.path);

  if (!ctx.exists(abs)) {
    errors.push({
      code: 'TTRS-012',
      message: `${kind} source "${node.path}" does not exist${ctx.baseDir ? ` (looked in ${ctx.baseDir})` : ''}`,
    });
    return UNRESOLVED_MARKER(node.path);
  }

  const number = ctx.figures.length + 1;
  const name = node.as ?? `figure-${number}`;
  const embedPath = ctx.rasterise
    ? ctx.rasterise({ kind, source: abs, name, number, fit: node.fit ?? null })
    : node.path;

  ctx.figures.push({
    number,
    name,
    kind,
    source: node.path,
    derived: kind === 'view',
    fit: node.fit ?? null,
    caption: node.caption ?? null,
    embedPath,
  });
  ctx.figureNumbers.set(name, number);

  const caption = node.caption ?? `Figure ${number}`;
  return `![${caption}](${embedPath})`;
}

function renderFigref(node, ctx, errors) {
  const number = ctx.figureNumbers.get(node.name);
  if (number === undefined) {
    errors.push({
      code: 'TTRS-012',
      message: `figref "${node.name}" names no figure declared earlier in this recipe`,
    });
    return UNRESOLVED_MARKER(node.name);
  }
  return `Figure ${number}`;
}

/**
 * Run pass 1 over a `.ttrs` recipe.
 *
 * @param {object} options
 * @param {string} options.text            recipe source
 * @param {string} [options.recipePath]    path the source came from — enables the
 *                                         filename/`kind:` cross-check and gives
 *                                         figure paths a base directory
 * @param {string} [options.repositoryRoot] canon root; overrides the header's `canon:`.
 *                                          Pass `null` to force the no-repository case.
 * @param {Function} [options.rasterise]   hook turning a resolved figure source into
 *                                         the path to embed; omitted, the source path
 *                                         is embedded as-is
 * @param {'strict'|'review'} [options.profile] `strict` (default) fails the run on
 *                                         every non-ok reference state; `review`
 *                                         renders each one flagged and does not fail.
 *                                         Corresponds to @transitrix/document-view-engine's
 *                                         `clean` / `review` pair.
 * @param {string} [options.renderDate]    ISO date validity is resolved at; defaults to
 *                                         today. Pin it to keep runs on different days
 *                                         byte-identical — the date is an input.
 * @returns {Promise<{ok, markdown, header, instructionSlots, figures, errors, findings, states, suspicion, profile, renderDate}>}
 */
export async function runPass1({
  text, recipePath, repositoryRoot, rasterise, profile = 'strict', renderDate,
} = {}) {
  if (profile !== 'strict' && profile !== 'review') {
    throw new Error(`runPass1: profile must be "strict" or "review", got "${profile}"`);
  }
  const date = renderDate ?? todayIso();
  const { header, ast, errors } = parseRecipe(text);

  const emptyResult = (hdr) => ({
    ok: false,
    markdown: '',
    header: hdr,
    instructionSlots: [],
    figures: [],
    errors,
    findings: [],
    states: {},
    suspicion: SUSPICION_NOT_COMPUTED,
    profile,
    renderDate: date,
  });

  if (header === null) return emptyResult(null);

  if (recipePath) {
    const kindFromName = recipeKindFromFilename(basename(recipePath));
    if (kindFromName === undefined) {
      errors.push({
        code: 'TTRS-013',
        message: `"${recipePath}" is not named <basename>.<kind>.ttrs`,
      });
    } else if (header.kind && kindFromName !== header.kind) {
      errors.push({
        code: 'TTRS-013',
        message: `filename declares kind "${kindFromName}" but the header declares "${header.kind}"`,
      });
    }
  }

  // The repository is an optional input. Resolve which root we have, if any.
  const explicit = repositoryRoot !== undefined;
  let canonRoot = explicit ? repositoryRoot : header.canon;
  if (canonRoot && !explicit && recipePath) {
    canonRoot = resolvePath(join(dirname(recipePath), canonRoot));
  }

  // The fourth state, and the only one that is about configuration rather than
  // canon. Named in the same breath as the other three so a caller reading the
  // findings never has to look in two places for "why did nothing resolve".
  const recipeLabel = recipePath ? basename(recipePath) : '<recipe>';
  const noRepository = !canonRoot && needsRepository(ast);
  if (noRepository) {
    errors.push({
      code: 'TTRS-011',
      message: `${recipeLabel}: recipe references a model object but no repository is configured`,
    });
  }

  const index = await buildRepositoryIndex(canonRoot);

  const ctx = {
    baseDir: recipePath ? dirname(recipePath) : null,
    exists: (p) => existsSync(p),
    rasterise: rasterise ?? null,
    figures: [],
    figureNumbers: new Map(),
    profile,
    renderDate: date,
    recipeLabel,
    errors,
    findings: noRepository
      ? [{ code: 'TTRS-011', state: 'no-repository', flag: null, id: null, file: recipeLabel }]
      : [],
    states: noRepository ? { 'no-repository': 1 } : {},
  };

  const instructionSlots = [];
  const out = [];

  for (const node of ast) {
    switch (node.type) {
      case 'text':
        out.push(node.value);
        break;
      case 'reference':
        // With no repository the run has already failed as TTRS-011; the id is
        // still marked in the output rather than left blank.
        out.push(canonRoot ? renderReference(node, index, ctx) : UNRESOLVED_MARKER(node.id));
        break;
      case 'view':
      case 'figure':
        out.push(canonRoot || node.type === 'figure'
          ? renderFigure(node, ctx, errors)
          : UNRESOLVED_MARKER(node.path));
        break;
      case 'figref':
        out.push(renderFigref(node, ctx, errors));
        break;
      case 'instruct':
        // Pass 2's job. Copied through byte-for-byte — an unfilled section stays
        // visible, and pass 2 finds it by the same syntax that put it here.
        instructionSlots.push({
          slotId: node.slotId,
          question: node.question,
          inputs: node.inputs,
          sufficient: node.sufficient,
        });
        out.push(node.raw);
        break;
      default:
        break; // a node the parser already reported on
    }
  }

  return {
    ok: errors.length === 0,
    markdown: out.join(''),
    header,
    instructionSlots,
    figures: ctx.figures,
    errors,
    // Every non-ok reference state, in document order, whatever the profile —
    // `review` reports exactly what `strict` fails on.
    findings: ctx.findings,
    states: ctx.states,
    // Never omitted. "Clean" and "never checked" must not look alike.
    suspicion: SUSPICION_NOT_COMPUTED,
    profile,
    renderDate: date,
  };
}

function basename(p) {
  const parts = String(p).split(/[\\/]/);
  return parts[parts.length - 1];
}
