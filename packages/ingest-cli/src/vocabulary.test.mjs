// Unit tests for the closed-vocabulary loader (vocabulary.mjs).
// Run: node --test packages/ingest-cli/src/vocabulary.test.mjs
//
// Covers the epic's three required cases (notations/vocabulary.yaml's own
// scope note, §6): a clean pass, a real divergence that fails, and a
// deliberately corrupted artefact that fails. Plus the derived-view helpers
// placement.mjs and validate.mjs actually consume.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  parseVocabulary,
  loadVocabulary,
  elementPlacement,
  relationKinds,
  valueSet,
  VocabularyError,
} from './vocabulary.mjs';

const INGEST_CLI = fileURLToPath(new URL('../ingest.mjs', import.meta.url));
const REAL_VOCABULARY = fileURLToPath(new URL('../../../notations/vocabulary.yaml', import.meta.url));
const REAL_PIN = fileURLToPath(new URL('../../../notations/CURRENT_VERSION.yaml', import.meta.url));

function runCli(args, { cwd, notationsDir } = {}) {
  const env = { ...process.env };
  if (notationsDir === undefined) delete env.TRANSITRIX_NOTATIONS_DIR;
  else env.TRANSITRIX_NOTATIONS_DIR = notationsDir;
  return spawnSync(process.execPath, [INGEST_CLI, ...args], {
    cwd: cwd || process.cwd(),
    env,
    encoding: 'utf8',
  });
}

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

// --- Executable bootstrap and consumer location contract -------------------

test('ingest executable: source default is module-relative, not cwd-relative', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vocab-cli-cwd-'));
  const result = runCli(['--help'], { cwd });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^transitrix-ingest /);
  assert.equal(result.stderr, '');
});

test('ingest executable: a relative notations directory is resolved from the command cwd', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vocab-cli-relative-'));
  const notations = join(cwd, 'release-notations');
  mkdirSync(notations);
  copyFileSync(REAL_VOCABULARY, join(notations, 'vocabulary.yaml'));
  copyFileSync(REAL_PIN, join(notations, 'CURRENT_VERSION.yaml'));
  const result = runCli(['--help'], { cwd, notationsDir: 'release-notations' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^transitrix-ingest /);
});

test('ingest executable: --version remains available without vocabulary files', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vocab-cli-version-'));
  const result = runCli(['--version'], { cwd, notationsDir: join(cwd, 'missing') });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '0.0.1');
  assert.equal(result.stderr, '');
});

test('ingest executable: missing vocabulary makes repo-check explicitly incomplete', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vocab-cli-missing-'));
  const result = runCli(['repo-check', cwd], { cwd, notationsDir: join(cwd, 'missing') });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /repo-check: incomplete — all health checks unavailable; no checks ran\./);
  assert.match(result.stderr, /artefact not found/);
  assert.match(result.stderr, /Set TRANSITRIX_NOTATIONS_DIR/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test('ingest executable: missing pin also fails closed with recovery guidance', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vocab-cli-pin-'));
  const notations = join(cwd, 'notations');
  mkdirSync(notations);
  copyFileSync(REAL_VOCABULARY, join(notations, 'vocabulary.yaml'));
  const result = runCli(['repo-check', cwd], { cwd, notationsDir: notations });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /repo-check: incomplete — all health checks unavailable; no checks ran\./);
  assert.match(result.stderr, /version pin not readable/);
  assert.match(result.stderr, /Set TRANSITRIX_NOTATIONS_DIR/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

// --- Optional constructs, invalid values and version compatibility ---------

test('optional vocabulary metadata distinguishes unsupported syntax from invalid values', () => {
  const cases = [
    { suffix: '\ncompatibility_note:\n  purpose: synthetic\n' },
    { suffix: '\ncompatibility_note: {purpose: synthetic}\n', error: /unsupported YAML construct/ },
    { suffix: '', invalid: true, error: /rule_codes\.ACT-001\.severity `catastrophic` is not in/ },
  ];
  for (const { suffix, invalid, error } of cases) {
    const text = (invalid ? minimalDoc().replace('severity: error', 'severity: catastrophic') : minimalDoc()) + suffix;
    const paths = writeTmp(text);
    try {
      if (error) assert.throws(() => loadVocabulary(paths), error);
      else assert.equal(loadVocabulary(paths).compatibility_note.purpose, 'synthetic');
    } finally {
      rmSync(dirname(paths.path), { recursive: true, force: true });
    }
  }
});

// These cases describe this consumer build only, not compatibility of an older
// build with an unavailable artefact. Keep the release bytes and pin paired;
// mutate one independent cause at a time through the actual executable.
for (const [name, mutate, error] of [
  ['unchanged release', text => text, null],
  ['supported optional map', text => text + '\ncompatibility_note:\n  purpose: synthetic\n', null],
  ['unsupported optional flow map', text => text + '\ncompatibility_note: {purpose: synthetic}\n', /unsupported YAML construct `\{purpose: synthetic\}`/],
  ['invalid vocabulary value', text => text.replace(/severity: error/, 'severity: catastrophic'), /severity `catastrophic` is not in value_vocabularies/],
  ['mismatched release pin', text => text, /methodology_version .* ≠ pin "0\.0\.0"/],
]) {
  test(`repo-check vocabulary compatibility: ${name}`, () => {
    const cwd = mkdtempSync(join(tmpdir(), 'vocab-compatibility-'));
    try {
      const notations = join(cwd, 'notations');
      const model = join(cwd, 'model');
      mkdirSync(notations);
      mkdirSync(model);
      writeFileSync(join(notations, 'vocabulary.yaml'), mutate(readFileSync(REAL_VOCABULARY, 'utf8')));
      writeFileSync(join(notations, 'CURRENT_VERSION.yaml'), name === 'mismatched release pin'
        ? 'methodology_version: "0.0.0"\n' : readFileSync(REAL_PIN, 'utf8'));
      const result = runCli(['repo-check', model], { cwd, notationsDir: notations });
      if (error) {
        assert.equal(result.status, 2);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, error);
        assert.match(result.stderr, /repo-check: incomplete — all health checks unavailable; no checks ran\./);
        assert.match(result.stderr, /Set TRANSITRIX_NOTATIONS_DIR/);
        assert.doesNotMatch(result.stderr, /\n\s+at /);
      } else {
        // Completion on an empty synthetic model is not model conformance.
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /generated_by: "@transitrix\/ingest-cli"/);
        assert.equal(result.stderr, '');
      }
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
}

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

test('requirement-chain registry preserves exact source pairs, Project narrowing and Field boundary', () => {
  const voc = loadVocabulary();
  const r = voc.relation_types.source_trace;
  const pairs = r.from.flatMap(from => r.to.map(to => `${from}>${to}`))
    .filter(pair => !r.excluded_pairs.includes(pair)).sort();
  const expected = ['REQUIREMENT>DRIVER', 'NEED>DRIVER'];
  for (const from of ['REQUIREMENT', 'NEED', 'DRIVER']) {
    for (const to of ['INTERVIEW', 'SURVEY', 'OBSERVATION', 'DRAFT']) expected.push(`${from}>${to}`);
  }
  assert.deepEqual(pairs, expected.sort());
  assert.deepEqual(voc.relation_types.project_scope.to_subtype, ['Project']);
  assert.deepEqual(voc.relation_types.project_product.from_subtype, ['Project']);
  for (const type of voc.field_types) assert.equal(voc.element_types[type], undefined);
});

test('Field endpoints are admitted only for source_trace targets; malformed pair exclusions fail closed', () => {
  const fieldDoc = minimalDoc().replace('relation_types:\n', 'field_types: [OBSERVATION]\n\nrelation_types:\n');
  const base = fieldDoc.replace('  goal_parent:\n    from: [GOAL]\n    to: [GOAL]',
    '  source_trace:\n    from: [DRIVER]\n    to: [OBSERVATION]\n  goal_parent:\n    from: [GOAL]\n    to: [GOAL]');
  assert.ok(loadVocabulary(writeTmp(base)).relation_types.source_trace);
  assert.throws(() => loadVocabulary(writeTmp(base.replace('to: [GOAL]', 'to: [OBSERVATION]'))), /not a live element TYPE/);
  assert.throws(() => loadVocabulary(writeTmp(base.replace('from: [DRIVER]', 'from: [OBSERVATION]'))), /not a live element TYPE/);
  assert.throws(() => loadVocabulary(writeTmp(base.replace('to: [OBSERVATION]', 'to: [OBSERVATION]\n    excluded_pairs: [DRIVER>GOAL]'))), /excluded_pairs/);
});
