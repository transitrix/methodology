// Unit tests for the closed-vocabulary loader (vocabulary.mjs).
// Run: node --test packages/ingest-cli/src/vocabulary.test.mjs
//
// Covers the epic's three required cases (notations/vocabulary.yaml's own
// scope note, §6): a clean pass, a real divergence that fails, and a
// deliberately corrupted artefact that fails. Plus the derived-view helpers
// placement.mjs and validate.mjs actually consume.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseVocabulary,
  loadVocabulary,
  elementPlacement,
  relationKinds,
  valueSet,
  VocabularyError,
} from './vocabulary.mjs';

// A minimal but shape-valid document — small enough to hand-edit per test,
// exercising every block loadVocabulary()'s validate() requires.
function minimalDoc() {
  return `
methodology_version: "9.9.9"

element_types:
  DRIVER:
    mode: standalone
    layer: 01_motivation
    folder: 01_motivation/factors/
    promotable: false
  GOAL:
    mode: standalone
    layer: 01_motivation
    folder: 01_motivation/goals/
    promotable: false

deprecated_element_types:
  FACTOR:
    replaced_by: DRIVER
    rule: null
    accepted: true

relation_types:
  goal_parent:
    from: [GOAL]
    to: [GOAL]

deprecated_relation_types:
  activity_goal:
    replaced_by: goal_parent
    rule: ACTION-005

value_vocabularies:
  rule.severity:
    values: [error, warning, info, deprecation]
    spec: null
    rule: null
  REQUIREMENT.origin:
    values: [legislative, process-product, project-product]
    spec: notations/elements/15-requirement.md
    rule: REQ-004

deferred:

rule_codes:
  ACT-001:
    severity: error
    spec: notations/views/diagrams/07-action.md
`;
}

function writeTmp(text) {
  const dir = mkdtempSync(join(tmpdir(), 'vocab-test-'));
  const path = join(dir, 'vocabulary.yaml');
  writeFileSync(path, text, 'utf8');
  const pinPath = join(dir, 'CURRENT_VERSION.yaml');
  writeFileSync(pinPath, 'methodology_version: "9.9.9"\n', 'utf8');
  return { path, pinPath };
}

// --- 1. Clean pass -----------------------------------------------------------

test('loadVocabulary — positive: the real repo artefact loads, parses, and validates clean', () => {
  const voc = loadVocabulary();
  assert.equal(typeof voc.methodology_version, 'string');
  assert.ok(Object.keys(voc.element_types).length > 0);
  assert.ok(Object.keys(voc.relation_types).length > 0);
});

test('loadVocabulary — positive: a minimal well-formed document loads clean', () => {
  const { path, pinPath } = writeTmp(minimalDoc());
  const voc = loadVocabulary({ path, pinPath });
  assert.equal(voc.methodology_version, '9.9.9');
  assert.deepEqual(Object.keys(voc.element_types), ['DRIVER', 'GOAL']);
});

// --- 2. Real divergence — internally inconsistent, fails validate() ----------

test('loadVocabulary — negative: relation_types naming a non-live element TYPE fails', () => {
  const bad = minimalDoc().replace(
    'relation_types:\n  goal_parent:\n    from: [GOAL]\n    to: [GOAL]',
    'relation_types:\n  goal_parent:\n    from: [GOAL]\n    to: [NOT_A_REAL_TYPE]'
  );
  const { path, pinPath } = writeTmp(bad);
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

test('loadVocabulary — negative: a deprecated alias pointing at a non-live TYPE fails', () => {
  const bad = minimalDoc().replace('replaced_by: DRIVER', 'replaced_by: NOT_A_REAL_TYPE');
  const { path, pinPath } = writeTmp(bad);
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

test('loadVocabulary — negative: a deprecated alias with no `accepted` flag fails', () => {
  // `accepted` decides warn-vs-reject. Defaulting it would silently pick one of the
  // two, which is the ambiguity the field exists to remove — so it must be present.
  const bad = minimalDoc().replace('    rule: null\n    accepted: true', '    rule: null');
  const { path, pinPath } = writeTmp(bad);
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

test('loadVocabulary — negative: a closed alias window with no `retired_in` fails', () => {
  const bad = minimalDoc().replace('    accepted: true', '    accepted: false');
  const { path, pinPath } = writeTmp(bad);
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

test('loadVocabulary — negative: an open alias window carrying `retired_in` fails', () => {
  const bad = minimalDoc().replace('    accepted: true', '    accepted: true\n    retired_in: "1.0.0"');
  const { path, pinPath } = writeTmp(bad);
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

test('loadVocabulary — positive: a closed alias window with `retired_in` loads clean', () => {
  const ok = minimalDoc().replace('    accepted: true', '    accepted: false\n    retired_in: "1.0.0"');
  const { path, pinPath } = writeTmp(ok);
  const voc = loadVocabulary({ path, pinPath });
  assert.equal(voc.deprecated_element_types.FACTOR.accepted, false);
  assert.equal(voc.deprecated_element_types.FACTOR.retired_in, '1.0.0');
});

test('loadVocabulary — negative: a rule_codes severity outside value_vocabularies["rule.severity"] fails', () => {
  const bad = minimalDoc().replace('severity: error\n    spec: notations/views/diagrams/07-action.md', 'severity: catastrophic\n    spec: notations/views/diagrams/07-action.md');
  const { path, pinPath } = writeTmp(bad);
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

test('loadVocabulary — negative: methodology_version not matching the pin fails', () => {
  const { path } = writeTmp(minimalDoc());
  const dir = mkdtempSync(join(tmpdir(), 'vocab-test-'));
  const pinPath = join(dir, 'CURRENT_VERSION.yaml');
  writeFileSync(pinPath, 'methodology_version: "1.0.0"\n', 'utf8');
  assert.throws(() => loadVocabulary({ path, pinPath }), VocabularyError);
});

// --- 3. Corrupted artefact — fails to parse -----------------------------------

test('parseVocabulary — negative: an unsupported flow-map construct throws', () => {
  assert.throws(() => parseVocabulary('element_types:\n  DRIVER: {mode: standalone}\n'), VocabularyError);
});

test('parseVocabulary — negative: a duplicate key throws', () => {
  assert.throws(() => parseVocabulary('methodology_version: "1.0.0"\nmethodology_version: "2.0.0"\n'), VocabularyError);
});

test('parseVocabulary — negative: an odd-numbered indent throws', () => {
  assert.throws(() => parseVocabulary('element_types:\n   DRIVER:\n'), VocabularyError);
});

test('loadVocabulary — negative: a missing artefact file fails, never falls back to a built-in default', () => {
  assert.throws(
    () => loadVocabulary({ path: '/does/not/exist/vocabulary.yaml', pinPath: '/does/not/exist/CURRENT_VERSION.yaml' }),
    VocabularyError
  );
});

// --- Derived views — what placement.mjs / validate.mjs actually consume ------

test('elementPlacement — positive: a live TYPE resolves its own mode/layer/folder', () => {
  const { path, pinPath } = writeTmp(minimalDoc());
  const voc = loadVocabulary({ path, pinPath });
  const placement = elementPlacement(voc);
  assert.deepEqual(placement.DRIVER, { type: 'DRIVER', mode: 'standalone', layer: '01_motivation', folder: '01_motivation/factors/', promotable: false });
});

test('elementPlacement — positive: a deprecated alias resolves to its replacement\'s placement', () => {
  const { path, pinPath } = writeTmp(minimalDoc());
  const voc = loadVocabulary({ path, pinPath });
  const placement = elementPlacement(voc);
  assert.equal(placement.FACTOR.folder, placement.DRIVER.folder);
  assert.equal(placement.FACTOR.deprecated, true);
  assert.equal(placement.FACTOR.replacedBy, 'DRIVER');
});

test('relationKinds — positive: includes both live kinds and deprecated aliases', () => {
  const { path, pinPath } = writeTmp(minimalDoc());
  const voc = loadVocabulary({ path, pinPath });
  const kinds = relationKinds(voc);
  assert.ok(kinds.has('goal_parent'));
  assert.ok(kinds.has('activity_goal'));
});

test('valueSet — negative: an unknown vocabulary name throws rather than returning an empty set', () => {
  const { path, pinPath } = writeTmp(minimalDoc());
  const voc = loadVocabulary({ path, pinPath });
  assert.throws(() => valueSet('NOT.A_REAL_VOCAB', voc), VocabularyError);
});

test('valueSet — positive: a known vocabulary returns its closed set', () => {
  const { path, pinPath } = writeTmp(minimalDoc());
  const voc = loadVocabulary({ path, pinPath });
  assert.deepEqual(valueSet('REQUIREMENT.origin', voc), new Set(['legislative', 'process-product', 'project-product']));
});
