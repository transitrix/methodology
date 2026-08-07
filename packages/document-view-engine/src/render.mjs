// Render profiles (hub epic "Document-view engine: skeleton transclusion,
// reference flags, render profiles", §4) — walks a skeleton's AST
// (parse-skeleton.mjs) through an evaluator (evaluate.mjs) and emits HTML in
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
// (§2's "Illustrations", §4's manual/missing border classes), and `trace`
// (§2's "Trace matrix", built from evaluate.mjs's evaluateTrace()). `view`
// still renders as a neutral pass-through placeholder so a full-syntax
// skeleton still renders end-to-end without throwing; an embedded,
// at-build-time-rendered model view is a later layer — see this package's
// README for what's still open on the epic.
//
// A trace matrix's uncovered cells are not one of §3's four reference
// states — they mark a coverage gap in the model, not a broken reference —
// so they never feed `failedStates` / the `clean` profile's `--fail-on`.
// `REQ-VERIF-COVERAGE-001` (15-requirement.md §4) is the existing
// cross-cutting check for "does this build fail on a coverage gap"; this
// matrix only renders what the model shows.
//
// `figure` participates in its own numbering sequence today. §2 treats
// `view` and `figure` as one shared "illustration" sequence numbered
// together in document order — since `view` isn't evaluated yet, it takes
// no number and no slot. Wiring `view` in later will need to fold it into
// the same counter this module already builds for `figure`, which will
// shift every figure number after the first `view` in a mixed-syntax
// document; flagging now so it isn't a surprise then.

import { access } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

const DEFAULT_FAIL_ON = ['unresolved', 'not-admitted', 'out-of-validity'];

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
    .replace(/>/g, '&gt;');
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
// A `figref` can name a figure that appears later in the skeleton than the
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
    if (node.type === 'figure') {
      state.count += 1;
      if (node.as) state.numbers.set(node.as, state.count);
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
  switch (node.type) {
    case 'text':
      out.html.push(escapeHtml(node.value));
      return;

    case 'inline': {
      const result = await evaluator.evaluateFieldPath(node.id, node.fields, ctx);
      out.html.push(renderSpan(result.state, result.content, ctx.profile, out.counts));
      if (result.state !== 'ok') out.failedStates.push(result.state);
      return;
    }

    case 'field-ref': {
      if (!ctx.currentRowId) {
        // buildAst() already rejects a field-ref outside `each` — reachable
        // only if a caller hands render() an AST that skipped that check.
        out.html.push(renderSpan('unresolved', '', ctx.profile, out.counts));
        out.failedStates.push('unresolved');
        return;
      }
      const result = await evaluator.evaluateFieldPath(ctx.currentRowId, node.fields, ctx);
      out.html.push(renderSpan(result.state, result.content, ctx.profile, out.counts));
      if (result.state !== 'ok') out.failedStates.push(result.state);
      return;
    }

    case 'each': {
      const rowIds = await evaluator.evaluateEach(node, ctx);
      for (const rowId of rowIds) {
        // eslint-disable-next-line no-await-in-loop -- rows render in selection order
        await renderNodes(node.children, evaluator, { ...ctx, currentRowId: rowId }, out);
      }
      return;
    }

    case 'trace': {
      const matrix = await evaluator.evaluateTrace(node, ctx);
      out.html.push(renderTraceTable(matrix, ctx.profile));
      return;
    }

    // Not evaluated yet (see module header) — pass through as an inert
    // marker so a full-syntax skeleton still renders instead of throwing.
    case 'view':
      out.html.push(`<!-- dv-view: not yet rendered (${escapeHtml(node.path)}) -->`);
      return;

    case 'figure': {
      out.figureCounter += 1;
      const number = out.figureCounter;
      const absPath = isAbsolute(node.path) ? node.path : join(ctx.skeletonDir ?? '.', node.path);
      // eslint-disable-next-line no-await-in-loop -- order matters; this node's own figure number must be assigned before the next one
      const exists = await fileExists(absPath);
      const captionText = node.caption ? `Figure ${number} — ${node.caption}` : `Figure ${number}`;
      if (!exists) out.failedStates.push('unresolved');
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
      if (number === undefined) {
        out.html.push(renderSpan('unresolved', '', ctx.profile, out.counts));
        out.failedStates.push('unresolved');
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

// Renders `ast` (from parseSkeleton()) against `evaluator` (from
// createEvaluator()) in the given profile. `skeletonDir` — the directory
// containing the skeleton file — resolves a `figure`'s relative image path;
// omit it only when every `figure` path in the AST is already absolute (as
// unit-test fixtures typically are). Returns:
//   html         — the rendered document body (no page chrome — §7's layout
//                  is a later layer)
//   failed       — true iff `profile === 'clean'` and a state in `failOn`
//                  occurred anywhere in the render
//   counts       — { [state]: number } — how many spans landed in each §3
//                  state, across the whole render
export async function renderDocument(ast, evaluator, { profile = 'review', renderDate, failOn = DEFAULT_FAIL_ON, skeletonDir } = {}) {
  if (profile !== 'review' && profile !== 'clean') {
    throw new Error(`render: profile must be "review" or "clean", got "${profile}"`);
  }
  const figureState = { count: 0, numbers: new Map() };
  await collectFigureNumbers(ast, evaluator, { profile, renderDate, skeletonDir }, figureState);

  const out = { html: [], counts: {}, failedStates: [], figureCounter: 0 };
  await renderNodes(ast, evaluator, { profile, renderDate, skeletonDir, figureNumbers: figureState.numbers }, out);

  const failed = profile === 'clean' && out.failedStates.some((state) => failOn.includes(state));
  return { html: out.html.join(''), failed, counts: out.counts };
}
