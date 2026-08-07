// Unit tests for the C1 class-derivation logic in check-notations.mjs.
// Run: node --test scripts/check-notations.test.mjs
//
// Exercises the pure functions only (no filesystem, no subprocess) — the
// integration-level guarantee (the real repo's counts match its README) is
// covered by running scripts/check-notations.mjs itself in CI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveClassCounts,
  parseStatedViewCounts,
  findStandardIdentifierEmissions,
  checkPackageEnvelopeStatement,
  findDocumentSourceFailures,
  deriveDeprecationFailures,
} from './check-notations.mjs';

test('deriveClassCounts — positive: counts non-deprecated specs per class', () => {
  const counts = deriveClassCounts({
    diagrams: [{ deprecated: false }, { deprecated: false }, { deprecated: false }],
    reports: [{ deprecated: false }],
    documents: [{ deprecated: false }],
  });
  assert.deepEqual(counts, { diagrams: 3, reports: 1, documents: 1 });
});

test('deriveClassCounts — negative: a deprecated spec does not count', () => {
  const counts = deriveClassCounts({
    diagrams: [{ deprecated: false }, { deprecated: true }],
    reports: [],
    documents: [],
  });
  assert.equal(counts.diagrams, 1, 'the deprecated spec must be excluded');
});

test('deriveClassCounts — negative: moving a spec between class folders changes both counts', () => {
  const before = deriveClassCounts({
    diagrams: [{ deprecated: false }, { deprecated: false }],
    reports: [{ deprecated: false }],
    documents: [],
  });
  // Simulate moving one spec from diagrams/ to reports/.
  const after = deriveClassCounts({
    diagrams: [{ deprecated: false }],
    reports: [{ deprecated: false }, { deprecated: false }],
    documents: [],
  });
  assert.notEqual(before.diagrams, after.diagrams);
  assert.notEqual(before.reports, after.reports);
});

test('parseStatedViewCounts — positive: reads all three counts from README-shaped prose', () => {
  const text = '### Diagram views (A = 11)\n\nsome text\n\n### Report views (C = 4)\n\nmore text\n\n### Document views (D = 1)\n';
  const stated = parseStatedViewCounts(text);
  assert.deepEqual(stated, { diagrams: 11, reports: 4, documents: 1 });
});

test('parseStatedViewCounts — negative: a missing pattern reports null, not zero', () => {
  const stated = parseStatedViewCounts('# Notations\n\nno counts stated here.\n');
  assert.equal(stated.diagrams, null);
  assert.equal(stated.reports, null);
  assert.equal(stated.documents, null);
});

test('parseStatedViewCounts — negative: diagrams/reports present but document count still missing reports null', () => {
  const text = '### Diagram views (A = 11)\n\n### Report views (C = 4)\n';
  const stated = parseStatedViewCounts(text);
  assert.equal(stated.documents, null);
});

test('findStandardIdentifierEmissions — positive: a clean fields table with no standard-identifier value', () => {
  const text = [
    '| Field | Required | Type | Default | Semantics |',
    '|---|---|---|---|---|',
    '| `view.standard` | no | string | unset | Reserved for future use; not read by the render contract. |',
  ].join('\n');
  assert.deepEqual(findStandardIdentifierEmissions(text), []);
});

test('findStandardIdentifierEmissions — positive: a narrative mention outside a table row is not flagged', () => {
  const text = 'This layout deliberately avoids adopting a named specification numbering convention as a default.';
  assert.deepEqual(findStandardIdentifierEmissions(text), []);
});

test('findStandardIdentifierEmissions — negative: a documented iso-… default value in a table row is flagged', () => {
  const text = [
    '| Field | Required | Type | Default | Semantics |',
    '|---|---|---|---|---|',
    '| `view.standard` | no | string | `iso-29148` | default document-structure profile |',
  ].join('\n');
  assert.deepEqual(findStandardIdentifierEmissions(text), ['iso-29148']);
});

test('findStandardIdentifierEmissions — negative: a documented ieee-… default value in a table row is flagged', () => {
  const text = [
    '| Field | Required | Type | Default | Semantics |',
    '|---|---|---|---|---|',
    '| `view.standard` | no | string | `ieee-830` | default document-structure profile |',
  ].join('\n');
  assert.deepEqual(findStandardIdentifierEmissions(text), ['ieee-830']);
});

test('checkPackageEnvelopeStatement — positive: a "No." answer citing CONTRACT.md passes', () => {
  const text = [
    '## 9. Core envelope statement',
    '',
    '**No.** This package does not carry CONTRACT.md\'s envelope on any object kind.',
    '',
    '## 10. Evolution',
  ].join('\n');
  assert.equal(checkPackageEnvelopeStatement(text), null);
});

test('checkPackageEnvelopeStatement — positive: a "Yes." answer passes without needing a CONTRACT.md citation', () => {
  const text = [
    '## 6. Core envelope statement',
    '',
    '**Yes.** Every object carries the core envelope, per CONTRACT.md §2/§6/§7.',
  ].join('\n');
  assert.equal(checkPackageEnvelopeStatement(text), null);
});

test('checkPackageEnvelopeStatement — negative: no section at all fails', () => {
  const text = '## 5. Validation rules\n\nsome rules\n';
  assert.match(checkPackageEnvelopeStatement(text), /missing a "## N\. Core envelope statement" section/);
});

test('checkPackageEnvelopeStatement — negative: a section present but silent on yes/no fails', () => {
  const text = [
    '## 9. Core envelope statement',
    '',
    'This package interacts with the core envelope in some ways.',
    '',
    '## 10. Evolution',
  ].join('\n');
  assert.match(checkPackageEnvelopeStatement(text), /does not open with a plain/);
});

test('checkPackageEnvelopeStatement — negative: a "No." answer that never cites CONTRACT.md fails', () => {
  const text = [
    '## 9. Core envelope statement',
    '',
    '**No.** This package just does not.',
    '',
    '## 10. Evolution',
  ].join('\n');
  assert.match(checkPackageEnvelopeStatement(text), /does not cite CONTRACT\.md/);
});

test('deriveDeprecationFailures — positive: deprecated spec with removed_in passes clean', () => {
  const failures = deriveDeprecationFailures(
    [{ name: '03-fga.md', deprecated: true, removedIn: '4.0.0' }],
    'notations/views/diagrams'
  );
  assert.deepEqual(failures, []);
});

test('deriveDeprecationFailures — negative: deprecated spec with no removed_in reports DEP1', () => {
  const failures = deriveDeprecationFailures(
    [{ name: '03-fga.md', deprecated: true, removedIn: null }],
    'notations/views/diagrams'
  );
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'DEP1');
  assert.match(failures[0].message, /03-fga\.md/);
});

test('deriveDeprecationFailures — negative: a non-deprecated spec without removed_in is not flagged', () => {
  const failures = deriveDeprecationFailures(
    [{ name: '02-dgca.md', deprecated: false, removedIn: null }],
    'notations/views/diagrams'
  );
  assert.deepEqual(failures, []);
});

test('findDocumentSourceFailures — positive: a canonical document source passes clean', () => {
  const failures = findDocumentSourceFailures(['templates/product.mrd.ttrs']);
  assert.deepEqual(failures, []);
});

test('findDocumentSourceFailures — negative: a .trs file is named as the near-miss, in words', () => {
  const failures = findDocumentSourceFailures(['templates/product.mrd.trs']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'T1');
  // The point of the check: it must say ".ttrs" and say why ".trs" is wrong,
  // rather than surfacing as an unrecognised-file error.
  assert.match(failures[0].message, /\.ttrs/);
  assert.match(failures[0].message, /one keystroke away/);
});

test('findDocumentSourceFailures — negative: a .ttrs file with no kind segment is flagged', () => {
  const failures = findDocumentSourceFailures(['templates/product.ttrs']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'T1');
  assert.match(failures[0].message, /<basename>\.<kind>\.ttrs/);
});

test('findDocumentSourceFailures — negative: an upper-case kind segment is flagged', () => {
  const failures = findDocumentSourceFailures(['templates/product.MRD.ttrs']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'T1');
});

test('findDocumentSourceFailures — unrelated files are untouched', () => {
  const failures = findDocumentSourceFailures([
    'notations/CONTRACT.md',
    'notations/examples/bpmn/order.bpmn.transitrix.yaml',
    'packages/document-renderer/src/pass1.mjs',
  ]);
  assert.deepEqual(failures, []);
});
