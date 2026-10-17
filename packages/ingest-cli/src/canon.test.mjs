// Unit tests for canon.mjs's alias-uniqueness gate (ELEM-ALIAS-001) and its TERM
// extension (ELEMENT_PRIMITIVES.md §7.30/§9, transitrix-hq#118).
//
// Run: node --test packages/ingest-cli/src/canon.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCanonIndex } from './canon.mjs';
// The list reader is shared by canon indexing and catalogue surface matching.
import { readTopList, dump } from './yaml.mjs';
import { collectLocalElements } from './catalogue.mjs';
import { spawnSync } from 'node:child_process';
import { PRESETS_VERSION } from './coverage-presets.mjs';
import { fileURLToPath } from 'node:url';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'canon-test-'));
}

function writeElement(root, layer, folder, id, name, extra = '') {
  const dir = join(root, 'canon', 'elements', layer, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.yaml`), `id: ${id}\nname: "${name}"\n${extra}`, 'utf8');
}

test('buildCanonIndex: two different elements sharing a plain name is NOT a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '01_motivation', 'stakeholders', 'STAKEHOLDER-1', 'Operations');
  writeElement(root, '02_business', 'actors', 'ACTOR-1', 'Operations');
  const { collisions } = await buildCanonIndex(root);
  assert.deepEqual(collisions, []);
});

test('buildCanonIndex: an alias colliding with another element\'s name IS a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'business-objects', 'BUSINESS_OBJECT-1', 'Customer Order');
  writeElement(root, '02_business', 'roles', 'ROLE-1', 'Order Desk', 'aliases:\n  - "Customer Order"\n');
  const { collisions } = await buildCanonIndex(root);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].value, 'Customer Order');
});

test('buildCanonIndex: a TERM restating another element\'s plain name IS a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'business-objects', 'BUSINESS_OBJECT-1', 'Customer Order');
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Customer Order');
  const { collisions } = await buildCanonIndex(root);
  assert.equal(collisions.length, 1);
  assert.deepEqual([collisions[0].a, collisions[0].b].sort(), ['BUSINESS_OBJECT-1', 'TERM-1']);
});

test('buildCanonIndex: a TERM admitted first, then a plain-named element reusing it, IS a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Data Residency');
  writeElement(root, '01_motivation', 'requirements', 'REQUIREMENT-1', 'Data Residency');
  const { collisions } = await buildCanonIndex(root);
  assert.equal(collisions.length, 1);
});

test('buildCanonIndex: two different TERMs is still not a collision when names differ', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Data Residency');
  writeElement(root, '02_business', 'terms', 'TERM-2', 'Data Localisation');
  const { collisions } = await buildCanonIndex(root);
  assert.deepEqual(collisions, []);
});

test('buildCanonIndex: a TERM re-using its own name/alias is not a self-collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Data Residency', 'aliases:\n  - "Data Residency"\n');
  const { collisions } = await buildCanonIndex(root);
  assert.deepEqual(collisions, []);
});

for (const indent of ['', '  ', '    ']) {
  for (const newline of ['\n', '\r\n']) {
    test(`alias lists: indent ${indent.length}, ${JSON.stringify(newline)}`, async (t) => {
      const list = (value) => [
        'aliases: # surface forms', '# comment before first item',
        `${indent}- "${value}" # comment`, '', `${indent}# comment between items`,
        `${indent}- "Other"`, 'tags:', '- unrelated', 'name: Next', '',
      ].join(newline);
      assert.deepEqual(readTopList(list('Alpha'), 'aliases'), ['Alpha', 'Other']);
      const root = tmpOrgRoot();
      t.after(() => rmSync(root, { recursive: true, force: true }));
      writeElement(root, '02_business', 'actors', 'ACTOR-1', 'First', list('Alpha'));
      writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', `aliases:${newline}${indent}- Alpha${newline}`);
      const index = await buildCanonIndex(root);
      assert.equal(index.nameMap.get('alpha').matched_on, 'alias');
      assert.equal(index.nameMap.has('unrelated'), false);
      assert.equal(index.collisions.length, 1);
      assert.deepEqual((await collectLocalElements(root)).map(e => e.aliases), [['Alpha', 'Other'], ['Alpha']]);
      writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', `aliases:${newline}${indent}- Unique${newline}`);
      assert.deepEqual((await buildCanonIndex(root)).collisions, []);
    });
  }
}

test('alias lists: empty, absent, quotes, comments and emitter round trip', () => {
  assert.deepEqual(readTopList('tags:\n- unrelated\n', 'aliases'), []);
  assert.deepEqual(readTopList('aliases: [] # empty\ntags:\n- unrelated\n', 'aliases'), []);
  const aliases = ['Alpha', 'A "quote"', 'C:\\data', "Owner's name", 'A # B', 'null', '123'];
  assert.deepEqual(readTopList(dump({ aliases }), 'aliases'), aliases);
  assert.deepEqual(readTopList("aliases:\n- 'Owner''s name' # comment\n- Alpha#Beta\n- nullify\n", 'aliases'), ["Owner's name", 'Alpha#Beta', 'nullify']);
  assert.deepEqual(readTopList('aliases:\n- 3D model\n', 'aliases'), ['3D model']);
});

const unsupportedAliases = [
  'aliases : [Alpha]', '"aliases": [Alpha]', 'aliases: [Alpha]', 'aliases: Alpha', 'aliases: {}', 'aliases: null',
  'aliases:\n', 'aliases:\n- Alpha\n  - Beta', 'aliases:\n\t- Alpha',
  'aliases:\n- Alpha\n- key: value', 'aliases:\n- Alpha\n- [Beta]',
  'aliases:\n- Alpha\n- |\n  Beta', 'aliases:\n- Alpha\n  continuation',
  'aliases:\n- Alpha\n- *ref', 'aliases:\n- &ref Alpha', 'aliases:\n- !str Alpha',
  'aliases:\n- "unclosed', "aliases:\n- 'unclosed", 'aliases:\n- "Alpha" trailing',
  'aliases:\n- "bad\\q"', 'aliases:\n-', 'aliases:\n- null', 'aliases:\n- 123',
  'aliases:\n- true', 'aliases: []\n- Alpha', 'aliases:\n- Alpha\naliases: []',
];
for (const text of unsupportedAliases) {
  test(`alias lists reject unsupported input: ${JSON.stringify(text)}`, async (t) => {
    assert.throws(() => readTopList(text, 'aliases'), /Unsupported YAML list for aliases/);
    const root = tmpOrgRoot();
    t.after(() => rmSync(root, { recursive: true, force: true }));
    writeElement(root, '02_business', 'actors', 'ACTOR-1', 'First', `${text}\n`);
    await assert.rejects(buildCanonIndex(root), /Unsupported YAML list for aliases/);
    await assert.rejects(collectLocalElements(root), /Unsupported YAML list for aliases/);
  });
}

test('repo-check CLI: layout parity, unique negative control and unsupported non-success', (t) => {
  const root = tmpOrgRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'transitrix.yaml'), `methodology_version: "${PRESETS_VERSION}"\ncoverage_profile: core\n`);
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../ingest.mjs', import.meta.url)), 'repo-check', root], { encoding: 'utf8' });
  for (const indent of ['', '  ']) {
    for (const [alias, count] of [['Alpha', 1], ['Unique', 0]]) {
      writeElement(root, '02_business', 'actors', 'ACTOR-1', 'First', `aliases:\n${indent}- Alpha\n`);
      writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', `aliases:\n${indent}- ${alias}\n`);
      const result = run();
      assert.equal(result.status, 0, result.stderr); // report-only collision contract
      assert.match(result.stdout, new RegExp(`alias_collisions: ${count}`));
    }
  }
  writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', 'aliases: [Alpha]\n');
  const result = run();
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unsupported YAML list for aliases/);
});

// Reporting evidence keeps its identity and inclusive window through the gate.
import { admittedMatch } from './canon.mjs';
import { emitCandidates, shapeCandidates } from './emit-candidates.mjs';
import { buildReviewQueue } from './review-queue.mjs';
import { loadCandidates, validateCandidate } from './validate.mjs';
import { loadVocabulary, relationKinds } from './vocabulary.mjs';
import { parseProfileDecl, resolveCoverageProfile } from './coverage.mjs';

const reporting = (extra = {}) => ({
  id: 'REL-SYN-1', rel_kind: 'reports_to', from: 'ACTOR-SYN-A-1', to: 'ACTOR-SYN-B-1',
  valid_from: '2026-01-01', valid_to: '2026-06-30', extraction_confidence: 'high',
  evidence: ['INTERVIEW-SYN-1'], extensions: { source_label: 'Synthetic' }, ...extra,
});
const shaped = rel => shapeCandidates('INTERVIEW-SYN-1', { relations: [rel] }).candidates[0];

test('reporting vocabulary pin, coverage defaults and malformed controls', () => {
  assert.equal(loadVocabulary().methodology_version, PRESETS_VERSION);
  assert.ok(relationKinds().has('reports_to'));
  const core = resolveCoverageProfile({ kind: 'short', name: 'core' }, PRESETS_VERSION);
  const full = resolveCoverageProfile({ kind: 'short', name: 'full' }, PRESETS_VERSION);
  const custom = resolveCoverageProfile(parseProfileDecl(`coverage_profile:\n  extends: core\n  layers:\n    02_business:\n      relations:\n        add: [reports_to]\n`), PRESETS_VERSION);
  assert.equal(validateCandidate(shaped(reporting()), core).coverage_flag, 'out_of_profile');
  assert.equal(validateCandidate(shaped(reporting()), full).coverage_flag, 'in_profile');
  assert.equal(validateCandidate(shaped(reporting()), custom).coverage_flag, 'in_profile');
  assert.deepEqual(validateCandidate(shaped(reporting()), full).validation_flags, []);
  for (const extra of [{ id: undefined }, { id: 'ROLE-SYN-1' }, { valid_from: '2026-02-30' },
    { valid_from: '0000-01-01' }, { valid_to: undefined }, { valid_to: '2025-01-01' }, { from: 'ROLE-SYN-1' },
    { to: [] }, { rel_kind: 'unknown_reporting' }]) {
    assert.ok(validateCandidate(shaped(reporting(extra)), full).validation_flags.length, JSON.stringify(extra));
  }
  assert.deepEqual(validateCandidate(shaped(reporting({ valid_to: null })), full).validation_flags, []);
  assert.deepEqual(validateCandidate(shaped(reporting({ valid_to: '2026-01-01' })), full).validation_flags, []);
  const low = reporting({ extraction_confidence: 'low' });
  const suggestion = shapeCandidates('INTERVIEW-SYN-1', { relations: [low] }).suggestions[0];
  for (const key of ['id', 'valid_from', 'valid_to', 'evidence', 'extensions']) assert.deepEqual(suggestion[key], low[key]);
});

test('reporting emission, replay, recurrence and review preserve separate records', async t => {
  const root = tmpOrgRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, '_intake', 'processing', 'candidates');
  mkdirSync(dir, { recursive: true });
  const source = join(root, 'source.yaml');
  writeFileSync(source, 'id: INTERVIEW-SYN-1\n');
  const resultPath = join(root, 'result.json');
  const records = [reporting(), reporting({ id: 'REL-SYN-2', valid_from: '2026-08-01', valid_to: null }),
    reporting({ id: 'REL-SYN-3', evidence: ['INTERVIEW-SYN-2'] }),
    reporting({ id: 'REL-SYN-4', to: 'ACTOR-SYN-C-1' }),
    reporting({ id: 'REL-SYN-5', from: 'ACTOR-SYN-B-1', to: 'ACTOR-SYN-A-1' }),
    reporting({ id: 'REL-SYN-6', valid_from: '2026-01-01', valid_to: '2026-01-01' })];
  writeFileSync(resultPath, JSON.stringify({ relations: records }));
  const emit = () => emitCandidates({ orgRoot: root, fieldArtefactPath: source, resultPath, candidatesDir: dir });
  await emit();
  await emit();
  const loaded = (await loadCandidates(dir)).map(x => x.candidate);
  assert.equal(loaded.length, records.length);
  for (const r of records) assert.deepEqual(loaded.find(c => c.id === r.id), shaped(r));
  const canonDir = join(root, 'canon', 'relations');
  mkdirSync(canonDir, { recursive: true });
  const r = records[0];
  writeFileSync(join(canonDir, `${r.id}.yaml`), dump({ ...r, type: r.rel_kind }));
  const index = await buildCanonIndex(root);
  assert.equal(admittedMatch(shaped(r), index), r.id);
  for (const other of records.slice(1)) assert.equal(admittedMatch(shaped(other), index), null);
  assert.equal(admittedMatch(shaped(reporting({ valid_to: null })), index), null);
  const queue = await buildReviewQueue({ orgRoot: root, candidatesDir: dir });
  assert.equal(queue.excluded_admitted.length, 1);
  assert.equal(queue.candidates.length, records.length - 1);
  for (const c of queue.candidates) {
    const input = records.find(r => r.id === c.id);
    for (const key of ['id', 'from', 'to', 'valid_from', 'valid_to', 'evidence', 'extensions']) assert.deepEqual(c[key], input[key]);
    assert.deepEqual(c.validation_flags, []);
  }
  // Invalid replay envelopes must not disappear just because identity matches.
  writeFileSync(join(dir, 'malformed.json'), JSON.stringify({ ...shaped(r), derived_from: 3 }));
  const invalid = await buildReviewQueue({ orgRoot: root, candidatesDir: dir });
  assert.equal(invalid.candidates.filter(c => c.validation_flags.length).length, 1);
  for (const kind of ['employment', 'unit_parent']) {
    writeFileSync(join(canonDir, `${kind}.yaml`), dump({ type: kind, from: r.from, to: r.to }));
    const legacy = await buildCanonIndex(root);
    assert.ok(admittedMatch(shaped({ ...r, rel_kind: kind, id: 'REL-SYN-99' }), legacy));
    assert.equal(admittedMatch(shaped({ ...r, rel_kind: kind, from: r.to, to: r.from }), legacy), null);
  }
});

import { cpSync } from 'node:fs';

test('emitted reporting evidence supports dated logical pairs without double-counting', async t => {
  const root = tmpOrgRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const example = fileURLToPath(new URL('../../../notations/examples/relations/reports-to/', import.meta.url));
  cpSync(example, root, { recursive: true });
  const relDir = join(root, 'canon', 'relations');
  rmSync(relDir, { recursive: true });
  mkdirSync(relDir);
  const dir = join(root, '_intake', 'processing', 'candidates');
  mkdirSync(dir, { recursive: true });
  const source = join(root, 'source.yaml'), resultPath = join(root, 'result.json');
  writeFileSync(source, 'id: INTERVIEW-SYN-1\n');
  writeFileSync(resultPath, JSON.stringify({ relations: [reporting(),
    reporting({ id: 'REL-SYN-2', to: 'ACTOR-SYN-C-1', valid_from: '2026-06-01', valid_to: null }),
    reporting({ id: 'REL-SYN-3', valid_from: '2026-08-01', valid_to: null }),
    reporting({ id: 'REL-SYN-4' })] }));
  await emitCandidates({ orgRoot: root, fieldArtefactPath: source, resultPath, candidatesDir: dir });
  const queue = await buildReviewQueue({ orgRoot: root, candidatesDir: dir });
  assert.equal(queue.candidates.length, 4);
  // Simulate the independent admission gate, never performed by ingest itself.
  for (const { candidate: c } of await loadCandidates(dir)) {
    writeFileSync(join(relDir, `${c.id}.yaml`), dump({
      notation: 'relation', id: c.id, type: c.rel_kind, from: c.from, to: c.to,
      valid_from: c.valid_from, valid_to: c.valid_to, zone: 'canon', example: true,
      admitted_at: '2026-01-01', admitted_by: 'synthetic-example',
      gate_checks: { uniqueness: 'pass', consistency: 'pass', completeness: 'pass' },
      evidence: c.evidence, extensions: c.extensions,
    }));
  }
  const query = (day, actor = 'ACTOR-SYN-A-1', direction = 'managers') => {
    const result = spawnSync('python3', [fileURLToPath(new URL('../../../tools/reporting.py', import.meta.url)),
      '--root', root, '--as-at', day, '--actor', actor, '--direction', direction], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    return JSON.parse(result.stdout);
  };
  const may = query('2026-05-31');
  assert.equal(may.pairs.length, 1);
  assert.deepEqual(may.pairs[0].relations, ['REL-SYN-1', 'REL-SYN-4']);
  assert.equal(may.findings.some(f => f.code === 'REL-013'), false);
  const june = query('2026-06-30');
  assert.equal(june.pairs.length, 2);
  assert.ok(june.findings.some(f => f.code === 'REL-013' && f.severity === 'warning'));
  assert.deepEqual(query('2026-06-30', 'ACTOR-SYN-B-1', 'reports').pairs, [june.pairs[0]]);
  assert.equal(query('2026-07-01').pairs.length, 1);
  assert.deepEqual(query('2026-08-01').pairs[0].relations, ['REL-SYN-3']);
  assert.equal((await buildReviewQueue({ orgRoot: root, candidatesDir: dir })).candidates.length, 0);
});
