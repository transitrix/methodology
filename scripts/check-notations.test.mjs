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
