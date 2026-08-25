// Unit tests for the canonical ID grammar helper (ids.mjs — IDS_AND_REFERENCES.md §1).
// Underscore is TYPE-only; a middle segment is [A-Za-z0-9]+.
// Run: node --test packages/ingest-cli/src/ids.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidId, slugSegment, makeId } from './ids.mjs';

test('isValidId: underscore is TYPE-only', () => {
  assert.equal(isValidId('TYPE-foo_bar-1'), false);
  assert.equal(isValidId('TYPE-foo-bar-1'), true);
  assert.equal(isValidId('TYPE_NAME-foo-1'), true);
});

test('slugSegment: splits a label on non-alphanumerics, does not emit underscore', () => {
  assert.equal(slugSegment('Personal Data'), 'personal-data');
  assert.equal(slugSegment('PERSONAL_DATA'), 'personal-data');
  assert.equal(slugSegment('coding-conventions'), 'coding-conventions');
  assert.ok(!String(slugSegment('Personal Data')).includes('_'));
});

test('slugSegment: a generated id from a multi-word label passes isValidId', () => {
  const id = makeId('LAW', [slugSegment('Personal Data')], 1);
  assert.equal(id, 'LAW-personal-data-1');
  assert.equal(isValidId(id), true);
});
