#!/usr/bin/env node
// Unit tests for src/parse-recipe.mjs — every `.ttrs` slot kind, the header
// rules (including `canon:` being optional), and the defined error cases.
//
// Run: node packages/document-renderer/tests/test_parse_recipe.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { parseRecipe, recipeKindFromFilename } from '../src/parse-recipe.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function checkEqual(actual, expected, msg) {
  if (!deepEqual(actual, expected)) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function hasCode(errors, code) { return errors.some((e) => e.code === code); }

const HEADER = 'document: Market Requirements Document\nkind: mrd\nrecipe_id: product.mrd\nrecipe_version: "1.0"\n';

function tpl(body, headerExtra = '') {
  return `---\n${HEADER}${headerExtra}---\n${body}`;
}

// ── Header ───────────────────────────────────────────────────────────────

{
  const { header, errors } = parseRecipe(tpl(''));
  check(errors.length === 0, `plain header should parse clean, got: ${JSON.stringify(errors)}`);
  checkEqual(header, {
    document: 'Market Requirements Document',
    kind: 'mrd',
    recipe_id: 'product.mrd',
    recipe_version: '1.0',
    canon: null,
  }, 'header parses and `canon` defaults to null');
}

{
  // The repository is an optional input — a header without `canon:` is legal.
  const { header, errors } = parseRecipe(tpl('Plain prose only.'));
  check(errors.length === 0, 'a recipe with no canon and no references parses clean');
  check(header.canon === null, '`canon:` absent yields null, not an error');
}

{
  const { header } = parseRecipe(tpl('', 'canon: ../canon\n'));
  check(header.canon === '../canon', '`canon:` is read when present');
}

for (const field of ['document', 'kind', 'recipe_id', 'recipe_version']) {
  const stripped = HEADER.split('\n').filter((l) => !l.startsWith(`${field}:`)).join('\n');
  const { errors } = parseRecipe(`---\n${stripped}---\nbody`);
  check(hasCode(errors, 'TTRS-001') && errors.some((e) => e.message.includes(field)),
    `missing header field \`${field}\` is flagged TTRS-001`);
}

{
  const { errors } = parseRecipe('no front matter here at all');
  check(hasCode(errors, 'TTRS-001'), 'missing front matter is flagged');
}

{
  const { errors } = parseRecipe(tpl('', '').replace('kind: mrd', 'kind: MRD'));
  check(hasCode(errors, 'TTRS-001'), 'a non-lower-case `kind` is flagged');
}

// ── Filename / kind ──────────────────────────────────────────────────────

check(recipeKindFromFilename('product.mrd.ttrs') === 'mrd', 'kind is read off the filename');
check(recipeKindFromFilename('product.ttrs') === undefined, 'a missing kind segment is not a recipe name');
check(recipeKindFromFilename('product.mrd.trs') === undefined, 'the .trs near-miss is not a recipe name');

// ── Fixed text ───────────────────────────────────────────────────────────

{
  const { ast, errors } = parseRecipe(tpl('Just prose, nothing else.'));
  check(errors.length === 0, 'fixed text parses clean');
  checkEqual(ast, [{ type: 'text', value: 'Just prose, nothing else.' }], 'fixed text is one verbatim run');
}

{
  const { ast } = parseRecipe(tpl('An escaped \\{{ stays literal.'));
  checkEqual(ast, [{ type: 'text', value: 'An escaped {{ stays literal.' }], '`\\{{` escapes a literal delimiter');
}

// ── Model-object reference ───────────────────────────────────────────────

{
  const { ast, errors } = parseRecipe(tpl('{{ REQ-14 }}'));
  check(errors.length === 0, `bare reference parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'reference', id: 'REQ-14', fields: [] }], 'bare reference');
}

{
  const { ast } = parseRecipe(tpl('{{ REQ-14.text }}'));
  checkEqual(ast, [{ type: 'reference', id: 'REQ-14', fields: ['text'] }], 'reference with a field');
}

{
  const { ast } = parseRecipe(tpl('{{ REQ-14.parent.title }}'));
  checkEqual(ast, [{ type: 'reference', id: 'REQ-14', fields: ['parent', 'title'] }], 'reference with a field path');
}

{
  const { ast, errors } = parseRecipe(tpl('{{ CAPABILITY-V1.2.3 }}'));
  check(errors.length === 0, `CAPABILITY diagram address parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'reference', id: 'CAPABILITY-V1.2.3', fields: [] }],
    'a CAPABILITY id keeps its own dots — they are not a field path');
}

{
  const { errors } = parseRecipe(tpl('{{ not-an-id }}'));
  check(hasCode(errors, 'TTRS-002'), 'an invalid id is flagged');
}

{
  const { errors } = parseRecipe(tpl('{{ REQ-14.a.b.c.d }}'));
  check(errors.some((e) => /depth 3/.test(e.message)), 'field path deeper than 3 is flagged');
}

{
  const { errors } = parseRecipe(tpl('{{ REQ-14'));
  check(errors.some((e) => /unterminated/.test(e.message)), 'an unterminated directive is flagged');
}

// ── Figures ──────────────────────────────────────────────────────────────

{
  const { ast, errors } = parseRecipe(tpl('{{ view diagrams/context.blocks.transitrix.yaml }}'));
  check(errors.length === 0, `view parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'view', path: 'diagrams/context.blocks.transitrix.yaml', as: null, fit: 'width' }],
    'a derived figure defaults fit to width');
}

{
  const { ast } = parseRecipe(tpl('{{ view d/c.yaml as = context fit = page }}'));
  checkEqual(ast, [{ type: 'view', path: 'd/c.yaml', as: 'context', fit: 'page' }], 'view attributes are read');
}

{
  const { errors } = parseRecipe(tpl('{{ view d/c.yaml fit = enormous }}'));
  check(hasCode(errors, 'TTRS-002'), 'an unknown fit value is flagged');
}

{
  const { ast } = parseRecipe(tpl('{{ figure assets/photo.png caption = "The rig" as = rig }}'));
  checkEqual(ast, [{ type: 'figure', path: 'assets/photo.png', caption: 'The rig', as: 'rig' }],
    'a supplied figure carries a quoted caption');
}

{
  const { ast } = parseRecipe(tpl('{{ figref rig }}'));
  checkEqual(ast, [{ type: 'figref', name: 'rig' }], 'figref names a figure');
}

// ── Instruction slot ─────────────────────────────────────────────────────

{
  const src = '{{# instruct market-size }}\nquestion: How large is the market?\ninputs: CAP-1, REQ-14\nsufficient: A number, a currency, a year and the method.\n{{/ instruct }}';
  const { ast, errors } = parseRecipe(tpl(src));
  check(errors.length === 0, `instruction slot parses clean: ${JSON.stringify(errors)}`);
  check(ast.length === 1 && ast[0].type === 'instruct', 'the slot is one node');
  check(ast[0].slotId === 'market-size', 'slot id is read');
  check(ast[0].question === 'How large is the market?', 'question is read');
  checkEqual(ast[0].inputs, ['CAP-1', 'REQ-14'], 'inputs are split on commas');
  check(ast[0].sufficient === 'A number, a currency, a year and the method.', 'sufficient is read');
  check(ast[0].raw === src, 'raw carries the slot verbatim, so pass 1 can copy it through');
}

{
  const { ast, errors } = parseRecipe(tpl(
    '{{# instruct only }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'));
  check(errors.length === 0, 'inputs are optional');
  checkEqual(ast[0].inputs, [], 'absent inputs yield an empty list');
}

{
  // The body is opaque: a `{{ … }}` inside a slot is instruction text, not a
  // reference the parser resolves. This is what makes the four kinds non-nesting.
  const { ast, errors } = parseRecipe(tpl(
    '{{# instruct opaque }}\nquestion: Cite {{ REQ-14 }} in your answer.\nsufficient: S.\n{{/ instruct }}'));
  check(errors.length === 0, `an opaque body parses clean: ${JSON.stringify(errors)}`);
  check(ast.length === 1 && ast[0].type === 'instruct', 'nothing inside the slot becomes its own node');
  check(ast[0].question === 'Cite {{ REQ-14 }} in your answer.', 'the inner delimiters stay literal text');
}

{
  const { errors } = parseRecipe(tpl('{{# instruct nofin }}\nquestion: Q?\nsufficient: S.'));
  check(errors.some((e) => /never closed/.test(e.message)), 'an unclosed slot is flagged');
}

{
  const { errors } = parseRecipe(tpl('{{# instruct }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'));
  check(errors.some((e) => /missing slot id/.test(e.message)), 'a slot with no id is flagged');
}

{
  const { errors } = parseRecipe(tpl('{{# instruct Bad_Id }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'));
  check(hasCode(errors, 'TTRS-002'), 'a malformed slot id is flagged');
}

{
  const { errors } = parseRecipe(tpl('{{# instruct noq }}\nsufficient: S.\n{{/ instruct }}'));
  check(errors.some((e) => /question.*required/.test(e.message)), 'a slot without a question is flagged');
}

{
  const { errors } = parseRecipe(tpl('{{# instruct nosuf }}\nquestion: Q?\n{{/ instruct }}'));
  check(errors.some((e) => /sufficient.*required/.test(e.message)), 'a slot without a sufficiency test is flagged');
}

{
  const two = '{{# instruct dup }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}\n'
    + '{{# instruct dup }}\nquestion: Q2?\nsufficient: S2.\n{{/ instruct }}';
  const { errors } = parseRecipe(tpl(two));
  check(hasCode(errors, 'TTRS-003'), 'two slots may not share one id — the run record names each slot');
}

// ── Recognised, not implemented in this pass (TTRS-004) ─────────────────
// `each` and `trace` are constructs of the one directive language, not typos.
// They must never be reported in the same bucket as malformed syntax, and must
// never be dropped silently.

{
  const { errors } = parseRecipe(tpl('{{# each REQUIREMENT }}x{{/ each }}'));
  check(hasCode(errors, 'TTRS-004'), 'an `each` block is recognised, not implemented — not TTRS-002');
  check(!hasCode(errors, 'TTRS-002'), 'an `each` block is never reported as unknown syntax');
}

{
  const where = '{{# each REQUIREMENT where level = "system" and kind != "safety" order by id }}'
    + '{{ .title }}{{/ each }}';
  const { errors } = parseRecipe(tpl(where));
  check(hasCode(errors, 'TTRS-004'), 'a full `each` with where/order by is recognised, not implemented');
  check(!hasCode(errors, 'TTRS-002'),
    "the block's contents raise no syntax errors of their own — it is consumed whole");
  checkEqual(errors.filter((e) => e.code === 'TTRS-004').length, 1,
    'one honest report per unimplemented block, not a cascade');
}

{
  const { errors } = parseRecipe(tpl('{{ trace from = REQUIREMENT to = TEST via = verifies }}'));
  check(hasCode(errors, 'TTRS-004'), '`trace` is recognised, not implemented — not TTRS-002');
  check(!hasCode(errors, 'TTRS-002'), '`trace` is never reported as unknown syntax');
}

{
  const { errors } = parseRecipe(tpl('{{ .title }}'));
  check(hasCode(errors, 'TTRS-004'),
    'a bare field reference belongs to `each` — recognised, not a malformed id');
}

{
  const { errors } = parseRecipe(tpl('{{# each REQUIREMENT }}x'));
  check(hasCode(errors, 'TTRS-004'), 'an unclosed `each` still reports as recognised-not-implemented');
}

{
  // Still genuinely unknown syntax — the new code must not swallow this one.
  const { errors } = parseRecipe(tpl('{{# repeat REQUIREMENT }}x{{/ repeat }}'));
  check(hasCode(errors, 'TTRS-002'), 'an undefined block form is still TTRS-002');
  check(!hasCode(errors, 'TTRS-004'), 'an undefined block form is not dressed up as unimplemented');
}

// ── Mixed ────────────────────────────────────────────────────────────────

{
  const { ast, errors } = parseRecipe(tpl('Before {{ REQ-14 }} after.'));
  check(errors.length === 0, `mixed text parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [
    { type: 'text', value: 'Before ' },
    { type: 'reference', id: 'REQ-14', fields: [] },
    { type: 'text', value: ' after.' },
  ], 'literal runs interleave with directives');
}

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('All parse-recipe checks passed.');
