#!/usr/bin/env node
// Unit tests for src/parse-skeleton.mjs — every syntax form in the document-view
// engine epic's §2, plus header validation (§1) and the defined error cases.
//
// Run: node packages/document-view-engine/tests/test_parse_skeleton.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { parseSkeleton } from '../src/parse-skeleton.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function checkEqual(actual, expected, msg) {
  if (!deepEqual(actual, expected)) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function skeleton(body, headerExtra = '') {
  return `---\ndocument: design description\ncanon: ../canon\n${headerExtra}---\n${body}`;
}

// ── Header (§1) ──────────────────────────────────────────────────────────

{
  const { header, errors } = parseSkeleton(skeleton(''));
  check(errors.length === 0, `plain header should parse clean, got: ${JSON.stringify(errors)}`);
  checkEqual(header, { document: 'design description', canon: '../canon', profile: 'neutral' }, 'header defaults profile to neutral');
}

{
  const { errors } = parseSkeleton('---\ncanon: ../canon\n---\nbody');
  check(errors.some((e) => /document.*required/.test(e.message)), 'missing document is flagged');
}

{
  const { errors } = parseSkeleton('---\ndocument: x\n---\nbody');
  check(errors.some((e) => /canon.*required/.test(e.message)), 'missing canon is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('', 'profile: srs-legacy\n'));
  check(errors.some((e) => /profile.*reserved/.test(e.message)), 'non-neutral profile is flagged as reserved');
}

{
  const { errors } = parseSkeleton('no front matter here at all');
  check(errors.some((e) => /front-matter/.test(e.message)), 'missing front matter is flagged');
}

// ── Inline forms (§2) ────────────────────────────────────────────────────

{
  const { ast, errors } = parseSkeleton(skeleton('{{ REQ-14 }}'));
  check(errors.length === 0, `bare id should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'inline', id: 'REQ-14', fields: [] }], 'bare {{ REQ-14 }}');
}

{
  const { ast, errors } = parseSkeleton(skeleton('{{ REQ-14.text }}'));
  check(errors.length === 0, `id.field should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'inline', id: 'REQ-14', fields: ['text'] }], '{{ REQ-14.text }}');
}

{
  const { ast, errors } = parseSkeleton(skeleton('{{ REQ-14.parent.title }}'));
  check(errors.length === 0, `traversal should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'inline', id: 'REQ-14', fields: ['parent', 'title'] }], '{{ REQ-14.parent.title }}');
}

{
  const { errors } = parseSkeleton(skeleton('{{ REQ-14.a.b.c.d }}'));
  check(errors.some((e) => /max traversal depth 3/.test(e.message)), 'field path over depth 3 is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('{{ not-an-id }}'));
  check(errors.some((e) => /not a valid ID/.test(e.message)), 'malformed id is flagged');
}

{
  const { ast, errors } = parseSkeleton(skeleton('{{ CAPABILITY-V1.2.3 }}'));
  check(errors.length === 0, `capability id should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'inline', id: 'CAPABILITY-V1.2.3', fields: [] }], 'capability diagram-address id has no field path of its own');
}

// ── Escape (§2) ───────────────────────────────────────────────────────────

{
  const { ast, errors } = parseSkeleton(skeleton('literal \\{{ not a directive }}'));
  check(errors.length === 0, `escaped brace should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'text', value: 'literal {{ not a directive }}' }], '\\{{ escapes to a literal {{');
}

// ── Selection — {{# each }} (§2) ─────────────────────────────────────────

{
  const body = '{{# each REQUIREMENT where level = system and kind = functional order by id }}\n### {{ .id }} — {{ .title }}\n\n{{ .text }}\n{{/ each }}';
  const { ast, errors } = parseSkeleton(skeleton(body));
  check(errors.length === 0, `each block should parse clean: ${JSON.stringify(errors)}`);
  check(ast.length === 1 && ast[0].type === 'each', 'produces one each node');
  const node = ast[0];
  checkEqual(node.entityType, 'REQUIREMENT', 'each entityType');
  checkEqual(node.where, [
    { field: 'level', op: '=', value: 'system' },
    { field: 'kind', op: '=', value: 'functional' },
  ], 'each where clauses, ANDed');
  checkEqual(node.orderBy, 'id', 'each order by');
  const fieldRefs = node.children.filter((c) => c.type === 'field-ref');
  checkEqual(fieldRefs.map((f) => f.fields), [['id'], ['title'], ['text']], 'each body .field references resolve to current object');
}

{
  // no where, no order by — both optional per §2
  const { ast, errors } = parseSkeleton(skeleton('{{# each REQUIREMENT }}{{ .id }}{{/ each }}'));
  check(errors.length === 0, `bare each should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast[0].where, [], 'bare each has no where clauses');
  checkEqual(ast[0].orderBy, null, 'bare each has no order by');
}

{
  const { errors } = parseSkeleton(skeleton('{{ .id }}'));
  check(errors.some((e) => /outside an .* each/.test(e.message)), '.field outside each is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('{{# each REQUIREMENT }}unclosed'));
  check(errors.some((e) => /unclosed/.test(e.message)), 'unclosed each is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('{{/ each }}'));
  check(errors.some((e) => /no matching/.test(e.message)), 'unmatched close is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('{{# each REQUIREMENT where level > system }}{{/ each }}'));
  check(errors.some((e) => /unsupported operator/.test(e.message)), 'operator other than = / != is flagged');
}

// ── Trace matrix (§2) ─────────────────────────────────────────────────────

{
  const { ast, errors } = parseSkeleton(skeleton('{{ trace from = REQUIREMENT to = VERIFICATION via = verifies }}'));
  check(errors.length === 0, `trace should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'trace', from: 'REQUIREMENT', to: 'VERIFICATION', via: 'verifies' }], 'trace directive');
}

{
  const { errors } = parseSkeleton(skeleton('{{ trace from = REQUIREMENT to = VERIFICATION }}'));
  check(errors.some((e) => /missing required "via"/.test(e.message)), 'trace missing via is flagged');
}

// ── Embedded view (§2) ────────────────────────────────────────────────────

{
  const { ast, errors } = parseSkeleton(skeleton('{{ view path/to/view-file }}'));
  check(errors.length === 0, `view should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'view', path: 'path/to/view-file', as: null, fit: 'width' }], 'view directive, fit defaults to width');
}

{
  const { ast, errors } = parseSkeleton(skeleton('{{ view path/to/view-file as = fig-arch fit = page }}'));
  check(errors.length === 0, `view with as/fit should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'view', path: 'path/to/view-file', as: 'fig-arch', fit: 'page' }], 'view directive with as/fit');
}

{
  const { errors } = parseSkeleton(skeleton('{{ view path/to/view-file fit = tall }}'));
  check(errors.some((e) => /fit must be one of width\/page\/none/.test(e.message)), 'invalid fit value is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('{{ view }}'));
  check(errors.some((e) => /requires a path/.test(e.message)), 'view with no path is flagged');
}

// ── Figure / figref (§2) ──────────────────────────────────────────────────

{
  const { ast, errors } = parseSkeleton(skeleton('{{ figure path/to/image.png caption = "Device, front" as = fig-device }}'));
  check(errors.length === 0, `figure should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(
    ast,
    [{ type: 'figure', path: 'path/to/image.png', caption: 'Device, front', as: 'fig-device' }],
    'figure directive with quoted caption',
  );
}

{
  const { ast, errors } = parseSkeleton(skeleton('{{ figure path/to/image.png }}'));
  check(errors.length === 0, `bare figure should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'figure', path: 'path/to/image.png', caption: null, as: null }], 'figure with no caption/as');
}

{
  const { errors } = parseSkeleton(skeleton('{{ figure }}'));
  check(errors.some((e) => /requires a path/.test(e.message)), 'figure with no path is flagged');
}

{
  const { ast, errors } = parseSkeleton(skeleton('{{ figref fig-arch }}'));
  check(errors.length === 0, `figref should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [{ type: 'figref', name: 'fig-arch' }], 'figref directive');
}

{
  const { errors } = parseSkeleton(skeleton('{{ figref }}'));
  check(errors.some((e) => /requires a name/.test(e.message)), 'figref with no name is flagged');
}

{
  const { errors } = parseSkeleton(skeleton('{{ figref fig-arch fig-other }}'));
  check(errors.some((e) => /takes a single name/.test(e.message)), 'figref with more than one name is flagged');
}

// ── Mixed text + directive ────────────────────────────────────────────────

{
  const { ast, errors } = parseSkeleton(skeleton('Before {{ REQ-14 }} after.'));
  check(errors.length === 0, `mixed text should parse clean: ${JSON.stringify(errors)}`);
  checkEqual(ast, [
    { type: 'text', value: 'Before ' },
    { type: 'inline', id: 'REQ-14', fields: [] },
    { type: 'text', value: ' after.' },
  ], 'literal text runs interleave with directives');
}

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('All parse-skeleton checks passed.');
