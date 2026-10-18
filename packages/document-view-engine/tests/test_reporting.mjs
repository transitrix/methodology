// Reporting integration: Python 3.12 + PyYAML 6.0.1, Node.js >=20.
// Run: node packages/document-view-engine/tests/test_reporting.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createEvaluator } from '../src/evaluate.mjs';

function writeYaml(dir, name, lines) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), lines.join('\n') + '\n', 'utf8');
}

// Exercise the shipped catalogue and command, not a second hand-written oracle.
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const exampleRoot = join(sourceRoot, 'notations/examples/relations/reports-to');
const listReporting = { entityType: 'REL', where: [{ field: 'type', op: '=', value: 'reports_to' }], orderBy: 'id' };
const traceReporting = { from: 'ACTOR', to: 'ACTOR', via: 'reports_to' };
const actorPath = (root, letter) => join(root, `canon/elements/02_business/actors/ACTOR-SYN-${letter}-1.yaml`);
const relPath = (root, n) => join(root, `canon/relations/REL-SYN-REPORTING-${n}.yaml`);
function replace(path, from, to) {
  const before = readFileSync(path, 'utf8');
  assert.ok(before.includes(from), `fixture mutation must match: ${from}`);
  writeFileSync(path, before.replace(from, to));
}
function oracle(root, date, extra = []) {
  const run = spawnSync('python3', [join(sourceRoot, 'tools/reporting.py'), '--root', root, '--as-at', date, ...extra], { encoding: 'utf8' });
  assert.ifError(run.error);
  assert.ok([0, 1, 2].includes(run.status), run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(run.status, !result.complete ? 2 : result.valid ? 0 : 1);
  return result;
}
async function parity(root, date) {
  const result = oracle(root, date);
  // A rendering is not a validity certificate. Stop before rendering an invalid
  // or incomplete catalogue, preserving its upstream diagnostics for the caller.
  assert.ok(result.complete && result.valid, JSON.stringify(result.findings));
  const evaluator = await createEvaluator(join(root, 'canon'));
  const ids = await evaluator.evaluateEach(listReporting, { renderDate: date });
  assert.deepEqual(ids, result.pairs.flatMap((p) => p.relations).sort());
  const matrix = await evaluator.evaluateTrace(traceReporting, { renderDate: date });
  assert.deepEqual([...matrix.covered].sort(), result.pairs.map((p) => `${p.from_actor}|${p.to_actor}`).sort());
  for (const manager of ['ACTOR-SYN-B-1', 'ACTOR-SYN-C-1']) {
    const reverse = oracle(root, date, ['--actor', manager, '--direction', 'reports']);
    assert.deepEqual(reverse.pairs, result.pairs.filter((p) => p.to_actor === manager));
  }
  return { evaluator, ids, matrix, result };
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'reporting-view-'));
  cpSync(exampleRoot, root, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('dated reporting listing and trace match the shipped forward/reverse oracle', async () => {
  for (const date of ['2025-12-31', '2026-01-01', '2026-05-31', '2026-06-01', '2026-06-15', '2026-06-30', '2026-07-01', '2026-08-01']) {
    await parity(exampleRoot, date);
  }
});

test('one-day records, quoted scalars, aliases and repeated evidence survive selection', async (t) => {
  const root = fixture(t);
  replace(actorPath(root, 'B'), 'type: person', "type: person\nformer_ids:\n  - ACTOR-OLD-B-1");
  const duplicate = readFileSync(relPath(root, 1), 'utf8')
    .replace('REL-SYN-REPORTING-1', 'REL-SYN-REPORTING-4')
    .replace('to: ACTOR-SYN-B-1', "to: 'ACTOR-OLD-B-1'")
    .replace('type: reports_to', "type: 'reports_to'")
    .replace('"2026-01-01"\nvalid_to:', '"2026-06-15"\nvalid_to:')
    .replace('"2026-06-30"', '"2026-06-15"');
  writeFileSync(relPath(root, 4).replace('.yaml', '.yml'), duplicate);
  for (const date of ['2026-06-14', '2026-06-15', '2026-06-16']) {
    const { ids, evaluator } = await parity(root, date);
    assert.equal(ids.includes('REL-SYN-REPORTING-4'), date === '2026-06-15');
    const field = await evaluator.evaluateFieldPath('ACTOR-OLD-B-1', ['name'], { renderDate: date });
    assert.equal(field.state, 'ok');
    assert.ok(field.content);
  }
});

test('draft relation never contributes even when both people are admitted', async (t) => {
  const root = fixture(t);
  replace(relPath(root, 1), 'zone: canon', 'zone: canon\nadmission_state: proposed\nproposed_at: "2026-01-01"\nproposed_by: synthetic-example\nowner_to_confirm: synthetic-example');
  replace(relPath(root, 1), 'admitted_at: "2026-01-01"', '');
  replace(relPath(root, 1), 'admitted_by: synthetic-example', '');
  const { ids } = await parity(root, '2026-06-15');
  assert.ok(!ids.includes('REL-SYN-REPORTING-1'));
});

test('invalid and incomplete catalogue inputs stop the supported reporting pipeline', async (t) => {
  for (const [name, mutate] of [
    ['wrong subtype', (r) => replace(actorPath(r, 'B'), 'type: person', 'type: business_unit')],
    ['unresolved', (r) => replace(relPath(r, 1), 'to: ACTOR-SYN-B-1', 'to: ACTOR-MISSING-1')],
    ['missing endpoint', (r) => replace(relPath(r, 1), 'to: ACTOR-SYN-B-1', '')],
    ['missing start', (r) => replace(relPath(r, 1), 'valid_from: "2026-01-01"', '')],
    ['missing end', (r) => replace(relPath(r, 1), 'valid_to: "2026-06-30"', '')],
    ['invalid day', (r) => replace(relPath(r, 1), 'valid_from: "2026-01-01"', 'valid_from: "2026-02-30"')],
    ['reversed window', (r) => replace(relPath(r, 1), 'valid_from: "2026-01-01"', 'valid_from: "2026-07-01"')],
    ['inactive endpoint', (r) => replace(actorPath(r, 'B'), 'valid_to: null', 'valid_to: "2026-01-01"')],
    ['draft endpoint', (r) => replace(actorPath(r, 'B'), 'zone: canon', 'zone: canon\nadmission_state: proposed')],
    ['self link', (r) => replace(relPath(r, 1), 'to: ACTOR-SYN-B-1', 'to: ACTOR-SYN-A-1')],
    ['cycle', (r) => writeFileSync(relPath(r, 4), readFileSync(relPath(r, 1), 'utf8').replace('REL-SYN-REPORTING-1', 'REL-SYN-REPORTING-4').replace('from: ACTOR-SYN-A-1', 'from: ACTOR-SYN-B-1').replace('to: ACTOR-SYN-B-1', 'to: ACTOR-SYN-A-1'))],
    ['incomplete catalogue', (r) => rmSync(join(r, 'transitrix.yaml'))],
    ['malformed YAML', (r) => writeFileSync(relPath(r, 1), 'id: [broken')],
  ]) {
    await t.test(name, async (t) => {
      const root = fixture(t);
      mutate(root);
      const result = oracle(root, '2026-06-15');
      assert.ok(!result.complete || !result.valid);
      assert.deepEqual(result.pairs, []);
      assert.ok(result.findings.length > 0);
      // Locally decidable admission/window/endpoint defects also fail closed
      // in the generic view, even before the caller's mandatory schema check.
      if (!['wrong subtype', 'self link', 'cycle', 'incomplete catalogue', 'malformed YAML'].includes(name)) {
        const evaluator = await createEvaluator(join(root, 'canon'));
        assert.ok(!(await evaluator.evaluateEach(listReporting, { renderDate: '2026-06-15' })).includes('REL-SYN-REPORTING-1'));
        assert.ok(!(await evaluator.evaluateTrace(traceReporting, { renderDate: '2026-06-15' })).covered.has('ACTOR-SYN-A-1|ACTOR-SYN-B-1'));
      }
    });
  }
});

test('generic relations and claims retain orientation and reject inactive evidence', async (t) => {
  const root = fixture(t);
  for (const n of [1, 2, 3]) replace(relPath(root, n), 'type: reports_to', 'type: custom_link');
  writeYaml(join(root, 'canon/verifications'), 'VERIFICATION-SYN-1.yaml', [
    'id: VERIFICATION-SYN-1', 'verifies: ACTOR-SYN-A-1',
    'valid_from: "2026-06-15"', 'valid_to: "2026-06-15"',
  ]);
  for (const date of ['2026-06-14', '2026-06-15', '2026-06-16', '2026-07-01']) {
    const e = await createEvaluator(join(root, 'canon'));
    const m = await e.evaluateTrace({ ...traceReporting, via: 'custom_link' }, { renderDate: date });
    assert.equal(m.covered.has('ACTOR-SYN-A-1|ACTOR-SYN-B-1'), date !== '2026-07-01');
    assert.ok(!m.covered.has('ACTOR-SYN-B-1|ACTOR-SYN-A-1'));
    const claim = await e.evaluateTrace({ from: 'ACTOR', to: 'VERIFICATION', via: 'verifies' }, { renderDate: date });
    assert.equal(claim.covered.has('ACTOR-SYN-A-1|VERIFICATION-SYN-1'), date === '2026-06-15');
  }
  replace(join(root, 'canon/verifications/VERIFICATION-SYN-1.yaml'), 'id: VERIFICATION-SYN-1', 'id: VERIFICATION-SYN-1\nadmission_state: proposed');
  const e = await createEvaluator(join(root, 'canon'));
  assert.equal((await e.evaluateTrace({ from: 'ACTOR', to: 'VERIFICATION', via: 'verifies' }, { renderDate: '2026-06-15' })).covered.size, 0);
});

test('ambiguous identities and missing catalogue root are explicit input errors', async (t) => {
  const root = fixture(t);
  replace(actorPath(root, 'B'), 'type: person', 'type: person\nformer_ids: [ACTOR-SYN-A-1]');
  await assert.rejects(createEvaluator(join(root, 'canon')), /Ambiguous former identity/);
  await assert.rejects(createEvaluator(join(root, 'missing')), /ENOENT/);
});

test('finite endpoint windows include both boundaries without clipping', async (t) => {
  const root = fixture(t);
  rmSync(relPath(root, 2));
  rmSync(relPath(root, 3));
  for (const letter of ['A', 'B']) replace(actorPath(root, letter), 'valid_to: null', 'valid_to: "2026-06-30"');
  for (const date of ['2025-12-31', '2026-01-01', '2026-06-30', '2026-07-01']) {
    const { ids, matrix } = await parity(root, date);
    const active = date >= '2026-01-01' && date <= '2026-06-30';
    assert.equal(ids.length, active ? 1 : 0);
    assert.equal(matrix.covered.size, active ? 1 : 0);
  }
});
