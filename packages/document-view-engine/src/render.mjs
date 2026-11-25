// Render profiles (hub epic "Document-view engine: recipe transclusion,
// reference flags, render profiles", §4) — walks a recipe's AST
// (parse-recipe.mjs) through an evaluator (evaluate.mjs) and emits HTML in
// one of two profiles from the one evaluation pass:
//
//   review — every span is coloured by its §3 state, and colour is never the
//            only channel: a non-default class also carries a flag glyph
//            that doubles as the margin mark once this HTML feeds a print
//            layout (§7, not built yet).
//   clean  — everything renders black, no flags, no counters; the render
//            fails (non-zero exit / `failed: true`) on any state in
//            `failOn` (default: unresolved, not-admitted, out-of-validity —
//            `suspect` warns only, per §4's "clean ... warns").
//
// Scope of this module: `inline` and `field-ref` (bound to an `each` row) —
// the two derived-content forms evaluate.mjs resolves — `figure` / `figref`
// (§2's "Illustrations", §4's manual/missing border classes), `trace`
// (§2's "Trace matrix", built from evaluate.mjs's evaluateTrace()), and
// `view` for the `blocks` and `glossary` notations (§2's "view renders a model
// view at build time from its source"). A `view` node for any other notation,
// or the `blocks` notation's `grid:` (matrix-subset) root,
// still renders as a missing/failed illustration rather than throwing — the
// remaining notations are later slices on the same epic, same posture as
// figure/figref and trace shipping ahead of `view` itself.
//
// A trace matrix's uncovered cells are not one of §3's four reference
// states — they mark a coverage gap in the model, not a broken reference —
// so they never feed `failedStates` / the `clean` profile's `--fail-on`.
// `REQ-VERIF-COVERAGE-001` (15-requirement.md §4) is the existing
// cross-cutting check for "does this build fail on a coverage gap"; this
// matrix only renders what the model shows.
//
// `figure` and `view` share one "illustration" numbering sequence, in
// document order (§2: "Numbers are assigned at render time in document
// order" — the two forms are not distinguished). `collectFigureNumbers()`
// below counts both node types in its single ahead-of-render walk.
//
// Derivation share (§5), telemetry (§6) and PDF output (§7) are parked —
// see this package's README for what's still open on the epic.
import { access, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { parseBlocksYaml, collectBlockIds, renderBlocksSvg } from './blocks-view.mjs';
import { parseGlossaryYaml, renderGlossaryHtml } from './glossary-view.mjs';
import { isValidId } from '../../document-renderer/src/ids.mjs';
import { typeOfId } from './evaluate.mjs';

const DEFAULT_FAIL_ON = ['unresolved', 'not-admitted', 'out-of-validity'];

function summarize(events, failures) {
  const allowed = new Set('TERM REQUIREMENT ACTOR REL ASSERTION VERIFICATION VALIDATION APPLICATION PRODUCT CAPABILITY GOAL NEED BUSINESS_OBJECT id name title text description parent type level kind from to about verifies validates reports_to depends_on uses hosts realizes'.split(' '));
  const category = s => allowed.has(s) ? s : 'other';
  const maps = { types: new Map(), fields: new Map(), relations: new Map(), matrixPairs: new Map() };
  const bump = (map, key, n = 1) => maps[map].set(key, (maps[map].get(key) ?? 0) + n);
  const usage = { references: 0, selections: 0, matrices: 0 };
  const states = Object.fromEntries(['ok', 'suspect', 'unresolved', 'not-admitted', 'out-of-validity'].map(s => [s, 0]));
  const illustrations = { derived: 0, total: 0 };
  const lines = [[]];
  const append = (value, derived) => String(value ?? '').split('\n').forEach((text, i) => { if (i) lines.push([]); lines.at(-1).push({ text, derived }); });
  for (const e of events) {
    if (e.type === 'text') append(e.value, false);
    if (e.type === 'inline' || e.type === 'field-ref') {
      usage.references++; bump('types', category(e.usage.type));
      for (const f of e.usage.fields) bump('fields', category(f));
      if (e.result.state === 'ok') states.ok++;
      // Failed resolution content can be diagnostic prose, not model words.
      if (e.result.state === 'ok' || e.result.state === 'suspect') {
        append(e.result.content, true);
      }
    }
    if (e.type === 'each') { usage.selections++; bump('types', category(e.entityType)); for (const f of e.usage.fields) bump('fields', category(f)); }
    if (e.type === 'trace') {
      usage.matrices++; bump('types', category(e.from)); bump('types', category(e.to));
      bump('relations', category(e.via)); bump('matrixPairs', `${category(e.from)}:${category(e.to)}`, e.usage.pairs.length);
    }
    if (e.type === 'view' || e.type === 'figure') { illustrations.total++; if (e.type === 'view' && e.state !== 'unresolved') illustrations.derived++; }
  }
  for (const s of failures) if (Object.hasOwn(states, s)) states[s]++;
  let derived = 0, manual = 0;
  const text = line => line.map(p => p.text).join('');
  const underline = s => /^\s*(?:=+|-+)\s*$/.test(s);
  const tableRule = s => s.includes('|') && /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(s);
  for (let i = 0; i < lines.length; i++) {
    const source = text(lines[i]);
    if (/^\s*#{1,6}(?:\s|$)/.test(source) || underline(source) || tableRule(source)
      || (i + 1 < lines.length && underline(text(lines[i + 1])))) continue;
    // Tokenize the assembled line; event boundaries must not create words.
    const provenance = lines[i].flatMap(p => Array(p.text.length).fill(p.derived));
    for (const match of source.matchAll(/[\p{L}\p{N}]+/gu)) {
      if (provenance.slice(match.index, match.index + match[0].length).some(Boolean)) derived++;
      else manual++;
    }
  }
  const payload = { version: 1, usage, states, illustrations, derivationShare: derived + manual ? derived / (derived + manual) : 0 };
  for (const key of Object.keys(maps)) payload[key] = Object.fromEntries([...maps[key]].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  return payload;
}

const STATE_INFO = {
  ok: { color: 'ok', flag: null },
  suspect: { color: 'suspect', flag: '⚑S' },
  'not-admitted': { color: 'unresolved', flag: '⚑A' },
  'out-of-validity': { color: 'unresolved', flag: '⚑V' },
  unresolved: { color: 'unresolved', flag: '⚑U' },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSpan(state, content, profile, counts) {
  counts[state] = (counts[state] ?? 0) + 1;
  if (profile === 'clean') {
    return `<span class="dv-clean">${escapeHtml(content ?? '')}</span>`;
  }
  const info = STATE_INFO[state];
  const flagHtml = info.flag ? `<sup class="dv-flag">${info.flag}</sup>` : '';
  return `<span class="dv-${info.color}">${escapeHtml(content ?? '')}${flagHtml}</span>`;
}

function fail(out, state) {
  out.failedStates.push(state);
}

// ── Trace matrix (§2 "Trace matrix") ────────────────────────────────────
// Renders every row and every column evaluateTrace() returns, covered or
// not — an empty row/column is the point of the matrix (§2), never
// dropped. `clean` renders a plain black table (a check mark or nothing,
// no colour, no flag); `review` colours a covered cell the same `ok` green
// as any other resolved reference and an uncovered cell the same
// unresolved red + ⚑U flag `evaluateFieldPath`'s own unresolved state gets
// — the closest existing §4 class, since a coverage gap has no state of
// its own in §3.

function renderTraceTable({ rows, cols, covered }, profile) {
  const cell = (rowId, colId) => {
    const hit = covered.has(`${rowId}|${colId}`);
    if (profile === 'clean') {
      return `<td class="dv-clean">${hit ? '✓' : ''}</td>`;
    }
    return hit
      ? '<td class="dv-trace-cell dv-ok">✓</td>'
      : '<td class="dv-trace-cell dv-unresolved"><sup class="dv-flag">⚑U</sup></td>';
  };
  const headerCells = cols.map((colId) => `<th>${escapeHtml(colId)}</th>`).join('');
  const bodyRows = rows
    .map((rowId) => `<tr><th>${escapeHtml(rowId)}</th>${cols.map((colId) => cell(rowId, colId)).join('')}</tr>`)
    .join('');
  return `<table class="dv-trace"><thead><tr><th></th>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

// ── Figure numbering (§2 "Illustrations": "Numbers are assigned at render
// time in document order") ─────────────────────────────────────────────
// A `figref` can name a figure that appears later in the recipe than the
// reference itself, so numbers can't be assigned during the single
// streaming render pass — a forward reference wouldn't know its number yet.
// This walks the AST once, ahead of the real render, expanding `each` rows
// exactly as renderNodes() will (same evaluator, same node order), and
// records `as =` name → figure number. The real render pass then assigns
// the same numbers again by simply counting `figure` nodes as it reaches
// them — deterministic given the same AST and evaluator, so the two passes
// agree without the second pass needing the map for anything but `figref`.

async function collectFigureNumbers(nodes, evaluator, ctx, state) {
  for (const node of nodes) {
    if (node.type === 'figure' || node.type === 'view') {
      state.count += 1;
      if (node.as) {
        if (state.numbers.has(node.as)) {
          state.numbers.set(node.as, null);
          state.diagnostics.push({ code: 'duplicate-anchor', anchor: node.as, source: node.path, state: 'unresolved' });
        } else state.numbers.set(node.as, state.count);
      }
    } else if (node.type === 'each') {
      const rowIds = await evaluator.evaluateEach(node, ctx);
      for (const rowId of rowIds) {
        // eslint-disable-next-line no-await-in-loop -- must match renderNodes()'s row order exactly
        await collectFigureNumbers(node.children, evaluator, { ...ctx, currentRowId: rowId }, state);
      }
    }
  }
}

async function fileExists(absPath) {
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function renderNodes(nodes, evaluator, ctx, out) {
  for (const node of nodes) {
    // eslint-disable-next-line no-await-in-loop -- each node can depend on canon reads; order matters for figref numbering
    await renderNode(node, evaluator, ctx, out);
  }
}

async function renderNode(node, evaluator, ctx, out) {
  if (['figure', 'view', 'figref'].includes(node.type)) {
    out.document.push({ ...node, currentRowId: ctx.currentRowId ?? null });
  }
  switch (node.type) {
    case 'text':
      out.document.push({ type: 'text', value: node.value });
      out.html.push(escapeHtml(node.value));
      return;

    case 'inline': {
      const result = await evaluator.evaluateFieldPath(node.id, node.fields, ctx);
      out.document.push({ ...node, fields: [...node.fields], result, usage: { type: typeOfId(node.id), fields: [...node.fields] } });
      out.html.push(renderSpan(result.state, result.content, ctx.profile, out.counts));
      if (result.state !== 'ok') fail(out, result.state);
      return;
    }

    case 'field-ref': {
      if (!ctx.currentRowId) {
        // buildAst() already rejects a field-ref outside `each` — reachable
        // only if a caller hands render() an AST that skipped that check.
        const result = { id: null, state: 'unresolved', flag: '⚑U', content: null };
        out.document.push({ ...node, id: null, fields: [...node.fields], result, usage: { type: null, fields: [...node.fields] } });
        out.html.push(renderSpan('unresolved', '', ctx.profile, out.counts));
        fail(out, 'unresolved');
        return;
      }
      const result = await evaluator.evaluateFieldPath(ctx.currentRowId, node.fields, ctx);
      out.document.push({ ...node, id: ctx.currentRowId, fields: [...node.fields], result, usage: { type: typeOfId(ctx.currentRowId), fields: [...node.fields] } });
      out.html.push(renderSpan(result.state, result.content, ctx.profile, out.counts));
      if (result.state !== 'ok') fail(out, result.state);
      return;
    }

    case 'each': {
      const rowIds = await evaluator.evaluateEach(node, ctx);
      out.document.push({ type: 'each', entityType: node.entityType, where: node.where.map((clause) => ({ ...clause })), orderBy: node.orderBy, rowIds: [...rowIds], currentRowId: ctx.currentRowId ?? null, usage: { type: node.entityType, fields: [...node.where.map((clause) => clause.field), ...(node.orderBy ? [node.orderBy] : [])] } });
      for (const rowId of rowIds) {
        // eslint-disable-next-line no-await-in-loop -- rows render in selection order
        await renderNodes(node.children, evaluator, { ...ctx, currentRowId: rowId }, out);
      }
      return;
    }

    case 'trace': {
      const matrix = await evaluator.evaluateTrace(node, ctx);
      out.document.push({ ...node, rows: [...matrix.rows], cols: [...matrix.cols], usage: { types: [node.from, node.to], relation: node.via, pairs: matrix.rows.flatMap((from) => matrix.cols.map((to) => ({ from, to, covered: matrix.covered.has(`${from}|${to}`) }))) } });
      out.html.push(renderTraceTable(matrix, ctx.profile));
      return;
    }

    case 'view': {
      out.figureCounter += 1;
      const number = out.figureCounter;
      const label = `Figure ${number}`;
      const fitClass = `dv-fit-${node.fit ?? 'width'}`;
      const absPath = isAbsolute(node.path) ? node.path : join(ctx.recipeDir ?? '.', node.path);
      // eslint-disable-next-line no-await-in-loop -- order matters; this node's own illustration number must be assigned before the next one
      const exists = await fileExists(absPath);
      let viewHtml = null;
      let suspect = false;
      let cause = exists ? 'view-parse-failed' : 'missing-file';
      if (exists) {
        // eslint-disable-next-line no-await-in-loop -- must read this view before the next node, same as figure's existence check
        const text = await readFile(absPath, 'utf8').catch(() => null);
        if (text === null) cause = 'unreadable-source';
        if (ctx.viewAdapter && text !== null) {
          try {
            const result = await ctx.viewAdapter({ source: absPath, text, node: { ...node }, evaluator, renderDate: ctx.renderDate });
            viewHtml = typeof result?.html === 'string' ? result.html : null;
            suspect = result?.suspect === true;
            if (viewHtml === null) cause = 'view-render-failed';
          } catch { cause = 'view-render-failed'; }
        }
        if (!ctx.viewAdapter && text !== null) {
        const parsed = text === null ? { ok: false } : parseBlocksYaml(text);
        if (parsed.ok) {
          viewHtml = renderBlocksSvg(parsed.blocks);
          for (const id of collectBlockIds(parsed.blocks)) {
            if (!isValidId(id)) continue;
            // eslint-disable-next-line no-await-in-loop -- one small tree per view; suspicion must be known before this node renders
            const state = await evaluator.resolveReference(id, ctx);
            if (state.state === 'suspect') { suspect = true; break; }
          }
        }
        if (!parsed.ok && text !== null) {
          const glossary = parseGlossaryYaml(text);
          if (glossary.ok) {
            try { viewHtml = renderGlossaryHtml(await evaluator.evaluateGlossary(ctx), glossary); }
            catch { viewHtml = null; cause = 'view-render-failed'; }
          }
        }
        }
      }
      const failedToRender = !exists || viewHtml === null;
      Object.assign(out.document.at(-1), {
        number, provenance: 'derived', content: viewHtml, fit: node.fit ?? 'width',
        state: failedToRender ? 'unresolved' : suspect ? 'suspect' : 'ok',
      });
      if (failedToRender || suspect) out.diagnostics.push({ code: failedToRender ? cause : 'suspect-objects', source: node.path, number, state: failedToRender ? 'unresolved' : 'suspect' });
      if (failedToRender) fail(out, 'unresolved');
      else if (suspect) fail(out, 'suspect');
      if (ctx.profile === 'clean') {
        const body = viewHtml ?? '';
        out.html.push(`<figure class="dv-clean ${fitClass}">${body}<figcaption>${label}</figcaption></figure>`);
        return;
      }
      const borderClass = failedToRender ? 'dv-illus-missing' : suspect ? 'dv-illus-suspect' : 'dv-illus-view';
      const flagHtml = failedToRender ? '<sup class="dv-flag">⚑U</sup>' : suspect ? '<sup class="dv-flag">⚑S</sup>' : '';
      out.html.push(`<figure class="${borderClass} ${fitClass}">${flagHtml}${viewHtml ?? ''}<figcaption>${label}</figcaption></figure>`);
      return;
    }

    case 'figure': {
      out.figureCounter += 1;
      const number = out.figureCounter;
      const absPath = isAbsolute(node.path) ? node.path : join(ctx.recipeDir ?? '.', node.path);
      // eslint-disable-next-line no-await-in-loop -- order matters; this node's own figure number must be assigned before the next one
      const exists = await fileExists(absPath);
      Object.assign(out.document.at(-1), { number, provenance: 'manual', state: exists ? 'ok' : 'unresolved' });
      if (!exists) out.diagnostics.push({ code: 'missing-file', source: node.path, number, state: 'unresolved' });
      const captionText = node.caption ? `Figure ${number} — ${node.caption}` : `Figure ${number}`;
      if (!exists) fail(out, 'unresolved');
      if (ctx.profile === 'clean') {
        out.html.push(`<figure class="dv-clean"><img src="${escapeHtml(absPath)}" alt="${escapeHtml(captionText)}"><figcaption>${escapeHtml(captionText)}</figcaption></figure>`);
        return;
      }
      const borderClass = exists ? 'dv-illus-manual' : 'dv-illus-missing';
      const flagHtml = exists ? '' : '<sup class="dv-flag">⚑U</sup>';
      out.html.push(`<figure class="${borderClass}">${flagHtml}<img src="${escapeHtml(absPath)}" alt="${escapeHtml(captionText)}"><figcaption>${escapeHtml(captionText)}</figcaption></figure>`);
      return;
    }

    case 'figref': {
      const number = ctx.figureNumbers.get(node.name);
      if (number === undefined || number === null) {
        out.diagnostics.push({ code: number === null ? 'ambiguous-anchor' : 'unknown-anchor', anchor: node.name, state: 'unresolved' });
        out.html.push(renderSpan('unresolved', '', ctx.profile, out.counts));
        fail(out, 'unresolved');
        return;
      }
      const label = `Figure ${number}`;
      if (ctx.profile === 'clean') {
        out.html.push(`<span class="dv-clean">${label}</span>`);
        return;
      }
      out.html.push(`<span class="dv-figref">${label}</span>`);
      return;
    }

    default:
      throw new Error(`render: unknown AST node type "${node.type}"`);
  }
}

// Renders `ast` (from parseRecipe()) against `evaluator` (from
// createEvaluator()) in the given profile. `recipeDir` — the directory
// containing the recipe file — resolves a `figure`'s relative image path;
// omit it only when every `figure` path in the AST is already absolute (as
// unit-test fixtures typically are). Returns:
//   html   — the rendered document body (no page chrome — §7's layout is a
//            later layer, not built yet)
//   failed — true iff `profile === 'clean'` and a state in `failOn` occurred
//            anywhere in the render
//   counts — { [state]: number } — how many spans landed in each §3 state,
//            across the whole render
export async function renderDocument(ast, evaluator, { profile = 'review', renderDate, failOn = DEFAULT_FAIL_ON, recipeDir, viewAdapter } = {}) {
  if (profile !== 'review' && profile !== 'clean') {
    throw new Error(`render: profile must be "review" or "clean", got "${profile}"`);
  }
  if (!Array.isArray(failOn) || Array.from(failOn).some(state => !DEFAULT_FAIL_ON.concat('suspect').includes(state))) {
    throw new Error('render: failOn must be an array of diagnostic states');
  }
  failOn = [...failOn];
  const figureState = { count: 0, numbers: new Map(), diagnostics: [] };
  await collectFigureNumbers(ast, evaluator, { profile, renderDate, recipeDir }, figureState);

  const out = {
    html: [],
    document: [],
    diagnostics: figureState.diagnostics,
    counts: {},
    failedStates: figureState.diagnostics.map(() => 'unresolved'),
    figureCounter: 0,
  };
  await renderNodes(ast, evaluator, { profile, renderDate, recipeDir, viewAdapter, figureNumbers: figureState.numbers }, out);

  const diagnosticFailed = out.failedStates.some((state) => failOn.includes(state));
  const failed = profile === 'clean' && diagnosticFailed;

  const telemetry = summarize(out.document, out.failedStates);
  if (profile === 'review') {
    out.html.push(`<p class="dv-metrics">Derivation share: ${(telemetry.derivationShare * 100).toFixed(1)}%</p>`);
    out.html.push(`<p class="dv-metrics">illustrations — ${telemetry.illustrations.derived} of ${telemetry.illustrations.total} rendered from the model</p>`);
  }
  return { html: out.html.join(''), failed, diagnosticFailed, counts: out.counts, document: out.document, diagnostics: out.diagnostics, telemetry };
}

// stdout is HTML; stderr retains diagnostics independently of presentation.
export async function renderCli(args) {
  const { resolve, dirname } = await import('node:path');
  const { parseRecipe } = await import('./parse-recipe.mjs');
  const { createEvaluator } = await import('./evaluate.mjs');
  const { wrapHtmlForPrintRendering } = await import('../../document-renderer/src/render-vivliostyle.mjs');
  let file;
  const options = {};
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--profile' || arg === '--fail-on') {
      if (seen.has(arg) || i + 1 === args.length) throw new Error(`Invalid ${arg}`);
      seen.add(arg);
      const value = args[++i];
      if (arg === '--profile') options.profile = value;
      else options.failOn = value === '' ? [] : value.split(',');
    } else if (arg.startsWith('-') || file) throw new Error(`Unexpected argument: ${arg}`);
    else file = arg;
  }
  if (!file) throw new Error('Usage: node render.mjs <recipe> [--profile review|clean] [--fail-on states]');
  if (options.profile !== undefined && !['review', 'clean'].includes(options.profile)) throw new Error('Invalid profile');
  if (options.failOn?.some(state => !DEFAULT_FAIL_ON.concat('suspect').includes(state))) throw new Error('Invalid fail-on state');
  const recipeDir = dirname(resolve(file));
  const { header, ast, errors } = parseRecipe(await readFile(file, 'utf8'));
  if (errors.length) throw new Error(errors.map(error => error.message).join('; '));
  if (typeof header.canon !== 'string' || !header.canon) throw new Error('Recipe canon is required');
  const evaluator = await createEvaluator(resolve(recipeDir, header.canon));
  const result = await renderDocument(ast, evaluator, { ...options, recipeDir });
  const { html, ...evidence } = result;
  return { html: wrapHtmlForPrintRendering(html, header, options), evidence, exitCode: result.diagnosticFailed ? 1 : 0 };
}

const { pathToFileURL } = await import('node:url');
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await renderCli(process.argv.slice(2));
    console.log(result.html);
    console.error(JSON.stringify(result.evidence));
    process.exitCode = result.exitCode;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
