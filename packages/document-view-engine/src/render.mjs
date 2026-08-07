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
// the two derived-content forms evaluate.mjs resolves. `trace` / `view` /
// `figure` / `figref` render as neutral pass-through placeholders so a
// full-syntax skeleton still renders end-to-end without throwing; their
// real rendering (a coverage matrix; an embedded model view or image, with
// its own border-colour classes) is a later layer — see this package's
// README for what's still open on the epic.

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

    // Not evaluated yet (see module header) — pass through as an inert
    // marker so a full-syntax skeleton still renders instead of throwing.
    case 'trace':
      out.html.push(`<!-- dv-trace: not yet rendered (from=${escapeHtml(node.from)} to=${escapeHtml(node.to)} via=${escapeHtml(node.via)}) -->`);
      return;
    case 'view':
      out.html.push(`<!-- dv-view: not yet rendered (${escapeHtml(node.path)}) -->`);
      return;
    case 'figure':
      out.html.push(`<!-- dv-figure: not yet rendered (${escapeHtml(node.path)}) -->`);
      return;
    case 'figref':
      out.html.push(`<!-- dv-figref: not yet rendered (${escapeHtml(node.name)}) -->`);
      return;

    default:
      throw new Error(`render: unknown AST node type "${node.type}"`);
  }
}

// Renders `ast` (from parseSkeleton()) against `evaluator` (from
// createEvaluator()) in the given profile. Returns:
//   html         — the rendered document body (no page chrome — §7's layout
//                  is a later layer)
//   failed       — true iff `profile === 'clean'` and a state in `failOn`
//                  occurred anywhere in the render
//   counts       — { [state]: number } — how many spans landed in each §3
//                  state, across the whole render
export async function renderDocument(ast, evaluator, { profile = 'review', renderDate, failOn = DEFAULT_FAIL_ON } = {}) {
  if (profile !== 'review' && profile !== 'clean') {
    throw new Error(`render: profile must be "review" or "clean", got "${profile}"`);
  }
  const out = { html: [], counts: {}, failedStates: [] };
  await renderNodes(ast, evaluator, { profile, renderDate }, out);

  const failed = profile === 'clean' && out.failedStates.some((state) => failOn.includes(state));
  return { html: out.html.join(''), failed, counts: out.counts };
}
