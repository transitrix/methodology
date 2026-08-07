// Derivation share (hub epic "Document-view engine: skeleton transclusion,
// reference flags, render profiles", §5) — how much of a rendered
// document's body content comes from canon (`derived`) versus was authored
// directly in the skeleton (`manual`), printed as a word-count ratio in the
// `review` profile only (§4: "clean ... no counters").
//
// Scope: pure word-counting helpers, no canon I/O of their own — render.mjs
// calls these against the same node content it is already resolving, in its
// one render pass, rather than walking the AST again.
//
// "Structure authored in the skeleton" (headings, table scaffolding) is
// never counted, on either side of the ratio — a `text` node's own line
// shape decides this, since parse-skeleton.mjs keeps markdown opaque and
// carries no block-type information of its own:
//   - an ATX heading line ("#" .. "######" then whitespace or end of line)
//   - a markdown table row (starts with "|")
// Everything else in a `text` node is manual body prose. A `figure`'s or
// `view`'s own caption is never part of a `text` node's content in the
// first place, so it is excluded by construction, not by this filter.

const HEADING_LINE = /^\s{0,3}#{1,6}(\s|$)/;
const TABLE_ROW_LINE = /^\s*\|/;

function isStructuralLine(line) {
  return HEADING_LINE.test(line) || TABLE_ROW_LINE.test(line);
}

function countWords(s) {
  const trimmed = String(s ?? '').trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

// Word count for a `text` node's raw skeleton content — every line that
// isn't structure (heading / table row) counts as manual prose.
export function manualWordCount(text) {
  return text
    .split('\n')
    .filter((line) => !isStructuralLine(line))
    .reduce((sum, line) => sum + countWords(line), 0);
}

// Word count for a derived span's resolved content (an `inline` or
// `field-ref` node's evaluated value) — no structure to exclude, since a
// resolved field's content never carries skeleton-authored markdown.
export function derivedWordCount(content) {
  return countWords(content);
}

// Ratio in [0, 1]; `null` when the document has no counted content at all
// (an undefined share, not a zero one).
export function derivationShareRatio(derivedWords, manualWords) {
  const total = derivedWords + manualWords;
  return total === 0 ? null : derivedWords / total;
}

// §5: "print the ratio" — "Derivation share: NN% (X of Y words)".
export function formatDerivationShare(derivedWords, manualWords) {
  const ratio = derivationShareRatio(derivedWords, manualWords);
  const total = derivedWords + manualWords;
  const pct = ratio === null ? 'n/a' : `${Math.round(ratio * 100)}%`;
  return `Derivation share: ${pct} (${derivedWords} of ${total} words)`;
}

// §5: "Illustrations are a separate line, never folded into the word
// ratio ... Print illustrations — N of M rendered from the model." `total`
// counts every `figure`/`view` node in the document; `fromModel` counts
// only `view`s that actually rendered SVG from their model source — a
// `figure` is manual by definition and never counts toward it, the same
// way it never counts toward derivedWords.
export function formatIllustrationsLine(fromModel, total) {
  return `Illustrations — ${fromModel} of ${total} rendered from the model`;
}
