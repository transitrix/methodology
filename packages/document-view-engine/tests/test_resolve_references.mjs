#!/usr/bin/env node
// Unit + fixture tests for src/resolve-references.mjs — the document-view engine
// epic's §3 (reference resolution, the four distinguishable states).
//
// Run: node packages/document-view-engine/tests/test_resolve_references.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  statementLines,
  contentIdentity,
  buildCanonIndex,
  resolveReference,
  createResolver,
} from '../src/resolve-references.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function checkEqual(actual, expected, msg) {
  if (actual !== expected) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// ── Pure — content identity (§16.1), reused unchanged from suspicion §16.2 ─

{
  const a = 'notation: requirement\nid: REQUIREMENT-1\nname: "X"\nzone: canon\nadmitted_at: "2026-05-01"\n';
  const b = '# reformatted\nzone: canon\nname: "X"\nadmitted_at: "2026-08-05"\nid: REQUIREMENT-1\nnotation: requirement\n';
  check(contentIdentity(a) === contentIdentity(b), 'content identity ignores envelope fields and formatting');
}
{
  const before = 'notation: requirement\nid: REQUIREMENT-1\nname: "30 days"\n';
  const after = 'notation: requirement\nid: REQUIREMENT-1\nname: "14 days"\n';
  check(contentIdentity(before) !== contentIdentity(after), 'a changed statement changes content identity');
  check(statementLines(after).some((l) => l.includes('14 days')), 'statement content survives statementLines');
}

// ── Fixture — a small git-backed canon exercising all four states ─────────

function writeYaml(dir, name, lines) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), lines.join('\n') + '\n', 'utf8');
}

async function run() {
  const orgRoot = mkdtempSync(join(tmpdir(), 'resolve-references-'));
  const canonRoot = join(orgRoot, 'canon');
  const git = (args) => execFileSync('git', args, { cwd: orgRoot, encoding: 'utf8' });
  git(['init', '-q']);
  git(['config', 'user.email', 'fixture@example.com']);
  git(['config', 'user.name', 'Fixture']);

  const reqDir = join(canonRoot, 'elements', '01_motivation', 'requirements');
  const relDir = join(canonRoot, 'relations');

  // Plain elements: one clean, one out-of-validity, one not-admitted (proposed).
  writeYaml(reqDir, 'REQUIREMENT-OK-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-OK-1', 'name: "Erase data within 30 days"', 'zone: canon',
    'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-EXPIRED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-EXPIRED-1', 'name: "Retired requirement"', 'zone: canon',
    'valid_from: "2020-01-01"', 'valid_to: "2021-01-01"',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-PROPOSED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-PROPOSED-1', 'name: "Harvested draft"', 'zone: canon',
    'admission_state: proposed', 'valid_from: "2026-01-01"', 'valid_to: null',
  ]);

  // REL targets for the suspicion fixture: one that will change after the
  // REL's own last commit (suspect), one that will only be reformatted
  // (not suspect), one whose change is explained by a migration manifest
  // (hatch), one whose declared hatch under-states the change (refused).
  writeYaml(reqDir, 'REQUIREMENT-CHANGED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-CHANGED-1', 'name: "Erase user data within 30 days"', 'zone: canon',
    'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-REFORMATTED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-REFORMATTED-1', 'name: "Retain audit logs"', 'zone: canon',
    'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-MECHANICAL-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-MECHANICAL-1', 'name: "Route escalations"', 'owner_role: ROLE-OLD-1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);

  writeYaml(relDir, 'REL-SUSPECT-1.yaml', [
    'notation: relation', 'id: REL-SUSPECT-1', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-CHANGED-1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(relDir, 'REL-CLEAN-1.yaml', [
    'notation: relation', 'id: REL-CLEAN-1', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-REFORMATTED-1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(relDir, 'REL-HATCHED-1.yaml', [
    'notation: relation', 'id: REL-HATCHED-1', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-MECHANICAL-1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(relDir, 'REL-UNRESOLVED-TARGET-1.yaml', [
    'notation: relation', 'id: REL-UNRESOLVED-TARGET-1', 'type: parent', 'from: CAPABILITY-X-1', 'to: REQUIREMENT-GHOST-1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);

  git(['add', '-A']);
  git(['commit', '-q', '-m', 'c1: initial fixture']);

  // c2: change the suspect target's statement, reformat the clean target,
  // and apply a fully-declared mechanical edit to the hatched target.
  writeYaml(reqDir, 'REQUIREMENT-CHANGED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-CHANGED-1', 'name: "Erase user data within 14 days"', 'zone: canon',
    'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-REFORMATTED-1.yaml', [
    '# reformatted only — same statement, different layout',
    'zone: canon', 'name:   "Retain audit logs"', 'id: REQUIREMENT-REFORMATTED-1', 'notation: requirement',
    'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-MECHANICAL-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-MECHANICAL-1', 'name: "Route escalations"', 'owner_role: ROLE-NEW-1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(join(orgRoot, 'migrations', 'rename-role'), 'TRANSFORM.yaml', [
    'mechanical: true',
    'applies_to:',
    '  - canon/elements/01_motivation/requirements/REQUIREMENT-MECHANICAL-1.yaml',
    'line_edits:',
    '  - from: "owner_role: ROLE-OLD-1"',
    '    to: "owner_role: ROLE-NEW-1"',
  ]);
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'c2: mixed edits after the REL records were last touched']);

  const { index, resolveReference: resolve } = await createResolver(canonRoot);

  check(index.size > 0, 'buildCanonIndex found the fixture files');

  checkEqual((await resolve('REQUIREMENT-DOES-NOT-EXIST-1')).flag, '⚑U', 'a nonexistent id is unresolved');
  checkEqual((await resolve('REQUIREMENT-PROPOSED-1')).flag, '⚑A', 'a proposed draft is not admitted');
  checkEqual((await resolve('REQUIREMENT-OK-1', { renderDate: '2026-08-06' })).flag, null, 'a clean, in-effect requirement resolves ok');
  checkEqual((await resolve('REQUIREMENT-EXPIRED-1', { renderDate: '2026-08-06' })).flag, '⚑V', 'a render date past valid_to is out of validity');
  checkEqual((await resolve('REQUIREMENT-EXPIRED-1', { renderDate: '2020-06-01' })).flag, null, 'the same requirement resolves ok inside its validity window');

  checkEqual((await resolve('REL-SUSPECT-1', { renderDate: '2026-08-06' })).flag, '⚑S', 'a REL whose target changed after the REL was last touched is suspect');
  checkEqual((await resolve('REL-CLEAN-1', { renderDate: '2026-08-06' })).flag, null, 'a REL whose target was only reformatted is not suspect');
  checkEqual((await resolve('REL-HATCHED-1', { renderDate: '2026-08-06' })).flag, null, 'a REL whose target change is fully explained by a migration manifest is not suspect');
  checkEqual((await resolve('REL-UNRESOLVED-TARGET-1', { renderDate: '2026-08-06' })).flag, null, 'a REL with an unresolvable endpoint is silent here, not suspicious');

  // Precomputed index/manifests are reused across calls, not re-scanned per id.
  const direct = await resolveReference('REQUIREMENT-OK-1', index, { canonRoot, renderDate: '2026-08-06' });
  checkEqual(direct.state, 'ok', 'resolveReference works standalone against a prebuilt index too');

  rmSync(orgRoot, { recursive: true, force: true });
}

await run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_resolve_references: all checks passed.');
