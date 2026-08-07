#!/usr/bin/env node
// Unit tests for src/parse-template.mjs — every `.ttrs` slot kind, the header
// rules (including `canon:` being optional), and the defined error cases.
//
// Run: node packages/document-renderer/tests/test_parse_template.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { parseTemplate, templateKindFromFilename } from '../src/parse-template.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function checkEqual(actual, expected, msg) {
  if (!deepEqual(actual, expected)) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function hasCode(errors, code) { return errors.some((e) => e.code === code); }

const HEADER = 'document: Market Requirements Document\nkind: mrd\ntemplate_id: product.mrd\ntemplate_version: "1.0"\n';

function tpl(body, headerExtra = '') {
  return `---\n${HEADER}${headerExtra}---\n${body}`;
}

// ── Header ───────────────────────────────────────────────────────────────

{
  const { header, errors } = parseTemplate(tpl(''));
  check(errors.length === 0, `plain header should parse clean, got: ${JSON.stringify(errors)}`);
  checkEqual(header, {
    document: 'Market Requirements Document',
    kind: 'mrd',
    template_id: 'product.mrd',
    template_version: '1.0',
    canon: null,
  }, 'header parses and `canon` defaults to null');
}

{
  // The repository is an optional input — a header without `canon:` is legal.
  const { header, errors } = parseTemplate(tpl('Plain prose only.'));
  check(errors.length === 0, 'a template with no canon and no references parses clean');
  check(header.canon === null, '`canon:` absent yields null, not an error');
}

{
  const { header } = parseTemplate(tpl('', 'canon: ../canon\n'));
  check(header.canon === '../canon', '`canon:` is read when present');
}

for (const field of ['document', 'kind', 'template_id', 'template_version']) {
  const stripped = HEADER.split('\n').filter((l) => !l.startsWith(`${field}:`)).join('\n');
  const { errors } = parseTemplate(`---\n${stripped}---\nbody`);
  check(hasCode(errors, 'TTRS-001') && errors.some((e) => e.message.includes(field)),
    `missing header field \`${field}\` is flagged TTRS-001`);
}

{
  const { errors } = parseTemplate('no front matter here at all');
  check(hasCode(errors, 'TTRS-001'), 'missing front matter is flagged');
}

{
  const { errors } = parseTemplate(tpl('', '').replace('kind: mrd', 'kind: MRD'));
  check(hasCode(errors, 'TTRS-001'), 'a non-lower-case `kind` is flagged');
}

// ── Filename / kind ──────────────────────────────────────────────────────

check(templateKindFromFilename('product.mrd.ttrs') === 'mrd', 'kind is read off the filename');
check(templateKindFromFilename('product.ttrs') === undefined, 'a missing kind segment is not a template name');
check(templateKindFromFilename('product.mrd.trs') === undefined, 'the .trs near-miss is not a template name');

// ── Fixed text ───────────────────────────────────────────────────────────

{
  const { ast, errors } = parseTemplate(tpl('Just prose, nothing else.'));
  check(errors.length === 0, 'fixed text parses clean');
  checkEqual(ast, [{ type: 'text', value: 'Just prose, nothing else.' }], 'fixed text is one verbatim run');
}

{
  const { ast } = parseTemplate(tpl('An escaped \\{{ stays literal.'));
  checkEqual(ast, [{ type: 'text', value: 'An escaped {{ stays literal.' }], '`\\{{` escapes a literal delimiter');
}

// ── Model-object reference ───────────────────────────────────────────────

{
  const { ast, errors } = parseTemplate(tpl('{{ REQ-14 }}'));
  check(errors.length === 0, `bare reference parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'reference', id: 'REQ-14', fields: [] }], 'bare reference');
}

{
  const { ast } = parseTemplate(tpl('{{ REQ-14.text }}'));
  checkEqual(ast, [{ type: 'reference', id: 'REQ-14', fields: ['text'] }], 'reference with a field');
}

{
  const { ast } = parseTemplate(tpl('{{ REQ-14.parent.title }}'));
  checkEqual(ast, [{ type: 'reference', id: 'REQ-14', fields: ['parent', 'title'] }], 'reference with a field path');
}

{
  const { ast, errors } = parseTemplate(tpl('{{ CAPABILITY-V1.2.3 }}'));
  check(errors.length === 0, `CAPABILITY diagram address parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'reference', id: 'CAPABILITY-V1.2.3', fields: [] }],
    'a CAPABILITY id keeps its own dots — they are not a field path');
}

{
  const { errors } = parseTemplate(tpl('{{ not-an-id }}'));
  check(hasCode(errors, 'TTRS-002'), 'an invalid id is flagged');
}

{
  const { errors } = parseTemplate(tpl('{{ REQ-14.a.b.c.d }}'));
  check(errors.some((e) => /depth 3/.test(e.message)), 'field path deeper than 3 is flagged');
}

{
  const { errors } = parseTemplate(tpl('{{ REQ-14'));
  check(errors.some((e) => /unterminated/.test(e.message)), 'an unterminated directive is flagged');
}

// ── Figures ──────────────────────────────────────────────────────────────

{
  const { ast, errors } = parseTemplate(tpl('{{ view diagrams/context.blocks.transitrix.yaml }}'));
  check(errors.length === 0, `view parses clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'view', path: 'diagrams/context.blocks.transitrix.yaml', as: null, fit: 'width' }],
    'a derived figure defaults fit to width');
}

{
  const { ast } = parseTemplate(tpl('{{ view d/c.yaml as = context fit = page }}'));
  checkEqual(ast, [{ type: 'view', path: 'd/c.yaml', as: 'context', fit: 'page' }], 'view attributes are read');
}

{
  const { errors } = parseTemplate(tpl('{{ view d/c.yaml fit = enormous }}'));
  check(hasCode(errors, 'TTRS-002'), 'an unknown fit value is flagged');
}

{
  const { ast } = parseTemplate(tpl('{{ figure assets/photo.png caption = "The rig" as = rig }}'));
  checkEqual(ast, [{ type: 'figure', path: 'assets/photo.png', caption: 'The rig', as: 'rig' }],
    'a supplied figure carries a quoted caption');
}

{
  const { ast } = parseTemplate(tpl('{{ figref rig }}'));
  checkEqual(ast, [{ type: 'figref', name: 'rig' }], 'figref names a figure');
}

// ── Instruction slot ─────────────────────────────────────────────────────

{
  const src = '{{# instruct market-size }}\nquestion: How large is the market?\ninputs: CAP-1, REQ-14\nsufficient: A number, a currency, a year and the method.\n{{/ instruct }}';
  const { ast, errors } = parseTemplate(tpl(src));
  check(errors.length === 0, `instruction slot parses clean: ${JSON.stringify(errors)}`);
  check(ast.length === 1 && ast[0].type === 'instruct', 'the slot is one node');
  check(ast[0].slotId === 'market-size', 'slot id is read');
  check(ast[0].question === 'How large is the market?', 'question is read');
  checkEqual(ast[0].inputs, ['CAP-1', 'REQ-14'], 'inputs are split on commas');
  check(ast[0].sufficient === 'A number, a currency, a year and the method.', 'sufficient is read');
  check(ast[0].raw === src, 'raw carries the slot verbatim, so pass 1 can copy it through');
}

{
  const { ast, errors } = parseTemplate(tpl(
    '{{# instruct only }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'));
  check(errors.length === 0, 'inputs are optional');
  checkEqual(ast[0].inputs, [], 'absent inputs yield an empty list');
}

{
  // The body is opaque: a `{{ … }}` inside a slot is instruction text, not a
  // reference the parser resolves. This is what makes the four kinds non-nesting.
  const { ast, errors } = parseTemplate(tpl(
    '{{# instruct opaque }}\nquestion: Cite {{ REQ-14 }} in your answer.\nsufficient: S.\n{{/ instruct }}'));
  check(errors.length === 0, `an opaque body parses clean: ${JSON.stringify(errors)}`);
  check(ast.length === 1 && ast[0].type === 'instruct', 'nothing inside the slot becomes its own node');
  check(ast[0].question === 'Cite {{ REQ-14 }} in your answer.', 'the inner delimiters stay literal text');
}

{
  const { errors } = parseTemplate(tpl('{{# instruct nofin }}\nquestion: Q?\nsufficient: S.'));
  check(errors.some((e) => /never closed/.test(e.message)), 'an unclosed slot is flagged');
}

{
  const { errors } = parseTemplate(tpl('{{# instruct }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'));
  check(errors.some((e) => /missing slot id/.test(e.message)), 'a slot with no id is flagged');
}

{
  const { errors } = parseTemplate(tpl('{{# instruct Bad_Id }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'));
  check(hasCode(errors, 'TTRS-002'), 'a malformed slot id is flagged');
}

{
  const { errors } = parseTemplate(tpl('{{# instruct noq }}\nsufficient: S.\n{{/ instruct }}'));
  check(errors.some((e) => /question.*required/.test(e.message)), 'a slot without a question is flagged');
}

{
  const { errors } = parseTemplate(tpl('{{# instruct nosuf }}\nquestion: Q?\n{{/ instruct }}'));
  check(errors.some((e) => /sufficient.*required/.test(e.message)), 'a slot without a sufficiency test is flagged');
}

{
  const two = '{{# instruct dup }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}\n'
    + '{{# instruct dup }}\nquestion: Q2?\nsufficient: S2.\n{{/ instruct }}';
  const { errors } = parseTemplate(tpl(two));
  check(hasCode(errors, 'TTRS-003'), 'two slots may not share one id — the run record names each slot');
}

{
  const { errors } = parseTemplate(tpl('{{# each REQUIREMENT }}x{{/ each }}'));
  check(hasCode(errors, 'TTRS-002'), 'instruct is the only block form');
}

// ── Mixed ────────────────────────────────────────────────────────────────

{
  const { ast, errors } = parseTemplate(tpl('Before {{ REQ-14 }} after.'));
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
console.log('All parse-template checks passed.');
