// Pass 1 — the deterministic half of the document renderer.
//
// Resolves every model-object reference and every derived figure in a `.ttrs`
// template. Runs and is testable with NO agent present: nothing in this module
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

import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path';

import { parseTemplate, templateKindFromFilename } from './parse-template.mjs';
import { buildRepositoryIndex } from './repository.mjs';

// Rendered in place of a reference the run could not resolve. The run has already
// failed by the time this is visible; it exists so the failure is never a blank.
const UNRESOLVED_MARKER = (id) => `«unresolved: ${id}»`;

// Field consulted, in order, when a reference names no field path of its own.
const DEFAULT_FIELDS = ['name', 'title', 'id'];

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

function renderReference(node, index, errors) {
  const entry = index.get(node.id);
  if (!entry) {
    errors.push({
      code: 'TTRS-010',
      message: `model-object reference "${node.id}" does not resolve — no object with that id is in the repository`,
    });
    return UNRESOLVED_MARKER(node.id);
  }

  if (node.fields.length === 0) {
    for (const name of DEFAULT_FIELDS) {
      if (entry.fields[name] !== undefined) return entry.fields[name];
    }
    errors.push({
      code: 'TTRS-010',
      message: `model-object reference "${node.id}" resolves, but the object carries none of: ${DEFAULT_FIELDS.join(', ')}`,
    });
    return UNRESOLVED_MARKER(node.id);
  }

  const value = traverse(entry, node.fields, index);
  if (value === undefined) {
    const path = `${node.id}.${node.fields.join('.')}`;
    errors.push({
      code: 'TTRS-010',
      message: `model-object reference "${path}" does not resolve — the field path is not present on that object`,
    });
    return UNRESOLVED_MARKER(path);
  }
  return value;
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
      message: `figref "${node.name}" names no figure declared earlier in this template`,
    });
    return UNRESOLVED_MARKER(node.name);
  }
  return `Figure ${number}`;
}

/**
 * Run pass 1 over a `.ttrs` template.
 *
 * @param {object} options
 * @param {string} options.text            template source
 * @param {string} [options.templatePath]  path the source came from — enables the
 *                                         filename/`kind:` cross-check and gives
 *                                         figure paths a base directory
 * @param {string} [options.repositoryRoot] canon root; overrides the header's `canon:`.
 *                                          Pass `null` to force the no-repository case.
 * @param {Function} [options.rasterise]   hook turning a resolved figure source into
 *                                         the path to embed; omitted, the source path
 *                                         is embedded as-is
 * @returns {Promise<{ok, markdown, header, instructionSlots, figures, errors}>}
 */
export async function runPass1({ text, templatePath, repositoryRoot, rasterise } = {}) {
  const { header, ast, errors } = parseTemplate(text);

  if (header === null) {
    return { ok: false, markdown: '', header: null, instructionSlots: [], figures: [], errors };
  }

  if (templatePath) {
    const kindFromName = templateKindFromFilename(basename(templatePath));
    if (kindFromName === undefined) {
      errors.push({
        code: 'TTRS-013',
        message: `"${templatePath}" is not named <basename>.<kind>.ttrs`,
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
  if (canonRoot && !explicit && templatePath) {
    canonRoot = resolvePath(join(dirname(templatePath), canonRoot));
  }

  if (!canonRoot && needsRepository(ast)) {
    errors.push({
      code: 'TTRS-011',
      message: 'template references a model object but no repository is configured',
    });
  }

  const index = await buildRepositoryIndex(canonRoot);

  const ctx = {
    baseDir: templatePath ? dirname(templatePath) : null,
    exists: (p) => existsSync(p),
    rasterise: rasterise ?? null,
    figures: [],
    figureNumbers: new Map(),
  };

  const instructionSlots = [];
  const out = [];

  for (const node of ast) {
    switch (node.type) {
      case 'text':
        out.push(node.value);
        break;
      case 'reference':
        out.push(canonRoot ? renderReference(node, index, errors) : UNRESOLVED_MARKER(node.id));
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
  };
}

function basename(p) {
  const parts = String(p).split(/[\\/]/);
  return parts[parts.length - 1];
}
