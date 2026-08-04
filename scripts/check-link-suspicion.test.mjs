// Unit + fixture tests for scripts/check-link-suspicion.mjs.
// Run: node --test scripts/check-link-suspicion.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  statementLines,
  contentIdentity,
  parseManifest,
  replayExplains,
  checkAll,
} from './check-link-suspicion.mjs';

// --- statementLines / contentIdentity — pure, no filesystem or git ------

test('statementLines/contentIdentity — positive: reformat, key reorder, and comments raise nothing', () => {
  const a = [
    'notation: requirement',
    'id: REQUIREMENT-1',
    'name: "Erase user data within 30 days"',
    'zone: canon',
    'admitted_at: "2026-05-01"',
  ].join('\n');
  const b = [
    '# a reformatted, key-reordered, commented copy of the same statement',
    'zone: canon   # unchanged envelope field, different formatting',
    'name:   "Erase user data within 30 days"',
    'admitted_at: "2026-08-05"   # envelope field bumped, e.g. re-admission',
    'id: REQUIREMENT-1',
    'notation: requirement',
  ].join('\n');
  assert.deepEqual(statementLines(a), statementLines(b));
  assert.equal(contentIdentity(a), contentIdentity(b));
});

test('statementLines/contentIdentity — negative: a changed statement changes content identity', () => {
  const before = 'notation: requirement\nid: REQUIREMENT-1\nname: "Erase user data within 30 days"\n';
  const after = 'notation: requirement\nid: REQUIREMENT-1\nname: "Erase user data within 14 days"\n';
  assert.notEqual(contentIdentity(before), contentIdentity(after));
});

test('statementLines — excludes the full administrative envelope, including nested gate_checks', () => {
  const text = [
    'notation: requirement',
    'id: REQUIREMENT-1',
    'name: "Statement"',
    'zone: canon',
    'admitted_at: "2026-05-01"',
    'admitted_by: "v.korobeinikov"',
    'gate_checks:',
    '  uniqueness: pass',
    '  consistency: pass',
    '  completeness: pass',
    'valid_from: "2026-05-01"',
    'valid_to: null',
  ].join('\n');
  const lines = statementLines(text);
  assert.ok(!lines.some(l => l.includes('uniqueness')), 'nested gate_checks lines must be excluded');
  assert.ok(!lines.some(l => l.startsWith('admitted_by')));
  assert.ok(lines.some(l => l.includes('Statement')), 'the statement field itself must survive');
});

// --- parseManifest / replayExplains — pure -------------------------------

test('parseManifest — reads mechanical, applies_to, and line_edits', () => {
  const text = [
    'mechanical: true',
    'applies_to:',
    '  - canon/elements/x/REQUIREMENT-1.yaml',
    'line_edits:',
    '  - from: "owner_role: ROLE-OLD-1"',
    '    to: "owner_role: ROLE-NEW-1"',
  ].join('\n');
  const manifest = parseManifest(text);
  assert.equal(manifest.mechanical, true);
  assert.deepEqual(manifest.applies_to, ['canon/elements/x/REQUIREMENT-1.yaml']);
  assert.deepEqual(manifest.line_edits, [{ from: 'owner_role: ROLE-OLD-1', to: 'owner_role: ROLE-NEW-1' }]);
});

test('replayExplains — positive: a fully declared edit reproduces the after-state', () => {
  const before = ['name: "X"', 'owner_role: ROLE-OLD-1'];
  const after = ['name: "X"', 'owner_role: ROLE-NEW-1'];
  const edits = [{ from: 'owner_role: ROLE-OLD-1', to: 'owner_role: ROLE-NEW-1' }];
  assert.equal(replayExplains(before, after, edits), true);
});

test('replayExplains — negative: an undeclared change is not explained (cannot self-grant)', () => {
  const before = ['name: "X"', 'owner_role: ROLE-OLD-1'];
  const after = ['name: "Y"', 'owner_role: ROLE-NEW-1']; // name changed too, not declared
  const edits = [{ from: 'owner_role: ROLE-OLD-1', to: 'owner_role: ROLE-NEW-1' }];
  assert.equal(replayExplains(before, after, edits), false);
});

// --- fixture-repository end-to-end -----------------------------------

function writeYaml(dir, filename, lines) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), lines.join('\n') + '\n', 'utf8');
}

test('checkAll — far-end change raises suspicion, reformat raises nothing, hatch cannot be self-granted', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'check-link-suspicion-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  run(['init', '-q']);
  run(['config', 'user.email', 'fixture@example.com']);
  run(['config', 'user.name', 'Fixture']);

  const reqDir = join(root, 'canon', 'elements', '01_motivation', 'requirements');
  const relDir = join(root, 'canon', 'relations');

  writeYaml(reqDir, 'REQUIREMENT-CHANGED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-CHANGED-1', 'name: "Erase user data within 30 days"', 'zone: canon',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-REFORMATTED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-REFORMATTED-1', 'name: "Retain audit logs for 1 year"', 'zone: canon',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-MECHANICAL-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-MECHANICAL-1', 'name: "Route escalations to the owning role"',
    'owner_role: ROLE-OLD-1', 'zone: canon',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-HATCH-REFUSED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-HATCH-REFUSED-1', 'name: "Route escalations to the owning role"',
    'owner_role: ROLE-OLD-1', 'zone: canon',
  ]);

  writeYaml(relDir, 'REL-1.yaml', [
    'notation: relation', 'id: REL-1', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-CHANGED-1', 'zone: canon',
  ]);
  writeYaml(relDir, 'REL-2.yaml', [
    'notation: relation', 'id: REL-2', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-REFORMATTED-1', 'zone: canon',
  ]);
  writeYaml(relDir, 'REL-3.yaml', [
    'notation: relation', 'id: REL-3', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-MECHANICAL-1', 'zone: canon',
  ]);
  writeYaml(relDir, 'REL-4.yaml', [
    'notation: relation', 'id: REL-4', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-HATCH-REFUSED-1', 'zone: canon',
  ]);

  run(['add', '-A']);
  run(['commit', '-q', '-m', 'c1: initial fixture']);

  // c2: a real statement change, a reformat-only change, a fully-declared
  // mechanical edit, and an edit that declares mechanical but goes further
  // than what it declared.
  writeYaml(reqDir, 'REQUIREMENT-CHANGED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-CHANGED-1', 'name: "Erase user data within 14 days"', 'zone: canon',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-REFORMATTED-1.yaml', [
    '# reformatted only — same statement, different layout',
    'zone: canon',
    'name:   "Retain audit logs for 1 year"',
    'id: REQUIREMENT-REFORMATTED-1',
    'notation: requirement',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-MECHANICAL-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-MECHANICAL-1', 'name: "Route escalations to the owning role"',
    'owner_role: ROLE-NEW-1', 'zone: canon',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-HATCH-REFUSED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-HATCH-REFUSED-1', 'name: "Route escalations to the new owning role"',
    'owner_role: ROLE-NEW-1', 'zone: canon',
  ]);
  writeYaml(join(root, 'migrations', 'rename-role'), 'TRANSFORM.yaml', [
    'mechanical: true',
    'applies_to:',
    '  - canon/elements/01_motivation/requirements/REQUIREMENT-MECHANICAL-1.yaml',
    'line_edits:',
    '  - from: "owner_role: ROLE-OLD-1"',
    '    to: "owner_role: ROLE-NEW-1"',
  ]);
  writeYaml(join(root, 'migrations', 'rename-role-incomplete'), 'TRANSFORM.yaml', [
    'mechanical: true',
    'applies_to:',
    '  - canon/elements/01_motivation/requirements/REQUIREMENT-HATCH-REFUSED-1.yaml',
    'line_edits:',
    '  - from: "owner_role: ROLE-OLD-1"',
    '    to: "owner_role: ROLE-NEW-1"',
  ]);

  run(['add', '-A']);
  run(['commit', '-q', '-m', 'c2: mixed edits']);

  const findings = await checkAll(root);
  const byTarget = Object.fromEntries(findings.map(f => [f.targetId, f]));

  assert.ok(byTarget['REQUIREMENT-CHANGED-1'], 'a real statement change must raise suspicion');
  assert.ok(!byTarget['REQUIREMENT-REFORMATTED-1'], 'a reformat-only change must raise nothing');
  assert.ok(!byTarget['REQUIREMENT-MECHANICAL-1'], 'a fully-declared, independently-verified edit must raise nothing');
  assert.ok(byTarget['REQUIREMENT-HATCH-REFUSED-1'], 'an edit that outruns its declared line_edits must still raise suspicion');
  assert.equal(byTarget['REQUIREMENT-HATCH-REFUSED-1'].hatchRefused, true, 'the tool cannot self-grant the hatch by declaring mechanical: true alone');
});

test('checkAll — agreement lapse: an edit after agreement raises it, re-agreeing in the same commit does not', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'check-link-suspicion-agree-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  run(['init', '-q']);
  run(['config', 'user.email', 'fixture@example.com']);
  run(['config', 'user.name', 'Fixture']);

  const reqDir = join(root, 'canon', 'elements', '01_motivation', 'requirements');

  writeYaml(reqDir, 'REQUIREMENT-LAPSED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-LAPSED-1', 'name: "Original commitment"',
    'agreement: agreed', 'agreed_by: "v.korobeinikov"', 'agreed_at: "2026-08-01"', 'zone: canon',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-RECONFIRMED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-RECONFIRMED-1', 'name: "Original commitment"',
    'agreement: agreed', 'agreed_by: "v.korobeinikov"', 'agreed_at: "2026-08-01"', 'zone: canon',
  ]);

  run(['add', '-A']);
  run(['commit', '-q', '-m', 'c1: both requirements agreed']);

  // c2: LAPSED's statement changes but agreement lines are untouched — this
  // is the condition §16.2's third row exists to catch.
  writeYaml(reqDir, 'REQUIREMENT-LAPSED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-LAPSED-1', 'name: "Quietly rewritten commitment"',
    'agreement: agreed', 'agreed_by: "v.korobeinikov"', 'agreed_at: "2026-08-01"', 'zone: canon',
  ]);
  // RECONFIRMED's statement changes too, but agreed_at is bumped in the same
  // commit — a conscious re-agreement to the new statement.
  writeYaml(reqDir, 'REQUIREMENT-RECONFIRMED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-RECONFIRMED-1', 'name: "Deliberately renegotiated commitment"',
    'agreement: agreed', 'agreed_by: "v.korobeinikov"', 'agreed_at: "2026-08-05"', 'zone: canon',
  ]);

  run(['add', '-A']);
  run(['commit', '-q', '-m', 'c2: one quiet rewrite, one re-agreement']);

  const findings = await checkAll(root);
  const byTarget = Object.fromEntries(findings.map(f => [f.targetId, f]));

  assert.ok(byTarget['REQUIREMENT-LAPSED-1'], 'a statement change with no re-agreement must lapse');
  assert.equal(byTarget['REQUIREMENT-LAPSED-1'].application, 'agreement-lapse');
  assert.ok(!byTarget['REQUIREMENT-RECONFIRMED-1'], 'a statement change re-agreed in the same commit must not lapse');
});
