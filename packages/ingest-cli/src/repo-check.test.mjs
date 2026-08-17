// Unit + integration tests for repo-check.mjs's profile-completeness check
// (methodology review finding, 2026-08-09, transitrix-hq#104 item 2).
//
// The check covers a gap suggest-profile.mjs and checkCanonPlacement both miss: a
// TYPE placed straight into canon/elements/ by hand, never going through the loaded
// candidate stream. Run: node --test packages/ingest-cli/src/repo-check.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { profileCompleteness, elementTypesOnDisk, repoCheck } from './repo-check.mjs';
import { PRESETS_VERSION } from './coverage-presets.mjs';

// Fixture manifests declare the version the built-in presets were stated against,
// read from the constant rather than hardcoded — a literal here goes stale at every
// release and silently flips `tooling.ok` to false in every fixture below, which is
// the same drift transitrix-hq#199 reported in the constant itself.
const MANIFEST = `methodology_version: "${PRESETS_VERSION}"\ncoverage_profile: core\n`;

// ── profileCompleteness — pure-function unit tests ──────────────────────

test('profileCompleteness: unresolved profile is not resolvable, regardless of disk', () => {
  const result = profileCompleteness(new Set(['NODE']), { unresolved: true, isFull: true, elements: null, removedElements: null });
  assert.equal(result.resolvable, false);
  assert.deepEqual(result.out_of_profile_types, []);
});

test('profileCompleteness: preset profile flags a TYPE the preset does not cover', () => {
  // `core` (coverage-presets.mjs) excludes NODE — mirrors the issue's own example.
  const profile = { unresolved: false, isFull: false, elements: new Set(['GOAL', 'CAPABILITY']), removedElements: null };
  const result = profileCompleteness(new Set(['GOAL', 'NODE']), profile);
  assert.equal(result.resolvable, true);
  assert.deepEqual(result.out_of_profile_types, ['NODE']);
});

test('profileCompleteness: full profile only flags explicitly removed TYPEs', () => {
  const profile = { unresolved: false, isFull: true, elements: null, removedElements: new Set(['NODE']) };
  const result = profileCompleteness(new Set(['NODE', 'GOAL']), profile);
  assert.deepEqual(result.out_of_profile_types, ['NODE']);
});

test('profileCompleteness: full profile with nothing removed reports nothing', () => {
  const profile = { unresolved: false, isFull: true, elements: null, removedElements: null };
  const result = profileCompleteness(new Set(['NODE', 'GOAL']), profile);
  assert.deepEqual(result.out_of_profile_types, []);
});

test('profileCompleteness: sorted output, no duplicates from the input set', () => {
  const profile = { unresolved: false, isFull: false, elements: new Set(), removedElements: null };
  const result = profileCompleteness(new Set(['NODE', 'CAPABILITY', 'ACTION']), profile);
  assert.deepEqual(result.out_of_profile_types, ['ACTION', 'CAPABILITY', 'NODE']);
});

// ── elementTypesOnDisk — scoped to canon/elements/ only ─────────────────

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'repo-check-test-'));
}

test('elementTypesOnDisk: reads TYPE from id: across nested canon/elements/ folders', () => {
  const root = tmpOrgRoot();
  const nodesDir = join(root, 'canon', 'elements', '04_technology', 'nodes');
  mkdirSync(nodesDir, { recursive: true });
  writeFileSync(join(nodesDir, 'NODE-1.yaml'), 'id: NODE-1\nname: Test Node\n', 'utf8');
  const goalsDir = join(root, 'canon', 'elements', '01_motivation', 'goals');
  mkdirSync(goalsDir, { recursive: true });
  writeFileSync(join(goalsDir, 'GOAL-1.yaml'), 'id: GOAL-1\nname: Test Goal\n', 'utf8');
  return elementTypesOnDisk(root).then(({ types, unreadable }) => {
    assert.deepEqual([...types].sort(), ['GOAL', 'NODE']);
    assert.deepEqual(unreadable, []);
  });
});

test('elementTypesOnDisk: REL/ASSERTION outside canon/elements/ never appear', () => {
  const root = tmpOrgRoot();
  const relDir = join(root, 'canon', 'relations');
  mkdirSync(relDir, { recursive: true });
  writeFileSync(join(relDir, 'REL-1.yaml'), 'id: REL-1\ntype: hosts\n', 'utf8');
  return elementTypesOnDisk(root).then(({ types }) => {
    assert.equal(types.size, 0);
  });
});

test('elementTypesOnDisk: absent canon/elements/ yields an empty set, not a throw', () => {
  const root = tmpOrgRoot();
  return elementTypesOnDisk(root).then(({ types, unreadable }) => {
    assert.equal(types.size, 0);
    assert.deepEqual(unreadable, []);
  });
});

// Note: forcing a genuine OS-level read failure (permission denial, mid-walk
// deletion) is not reliably reproducible cross-platform in a fast unit test —
// chmod 0o000 is a no-op for the file owner's own read on NTFS, and a directory or
// symlink standing in for a `.yaml` file is filtered out by walkYaml's own
// Dirent.isFile() check before readFile is ever called on it, so neither exercises
// the catch branch. The unreadable-tracking code itself is a small, directly
// reviewable try/catch; the aggregation and data-free stripping around it are
// covered below.

// ── repoCheck() end-to-end — the red flag actually surfaces ─────────────

test('repoCheck: a hand-placed out-of-profile TYPE is flagged even though nothing loaded it as a candidate', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');
  const nodesDir = join(root, 'canon', 'elements', '04_technology', 'nodes');
  mkdirSync(nodesDir, { recursive: true });
  // `core` (coverage-presets.mjs) excludes NODE — the issue's own example.
  writeFileSync(join(nodesDir, 'NODE-1.yaml'), 'id: NODE-1\nname: Test Node\n', 'utf8');

  const report = await repoCheck(root);
  assert.equal(report.profile_completeness.resolvable, true);
  assert.deepEqual(report.profile_completeness.out_of_profile_types, ['NODE']);
  assert.ok(report.integrity.red_flags.some((f) => f.includes('NODE') && f.includes('outside the active coverage profile')));
});

test('repoCheck: an unresolved profile is reported as not-resolvable, never a false-clean empty list', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), `methodology_version: "${PRESETS_VERSION}"\ncoverage_profile: not-a-real-preset\n`, 'utf8');
  const nodesDir = join(root, 'canon', 'elements', '04_technology', 'nodes');
  mkdirSync(nodesDir, { recursive: true });
  writeFileSync(join(nodesDir, 'NODE-1.yaml'), 'id: NODE-1\nname: Test Node\n', 'utf8');

  const report = await repoCheck(root);
  assert.equal(report.profile_completeness.resolvable, false);
  assert.deepEqual(report.profile_completeness.out_of_profile_types, []);
});

test('repoCheck: a TYPE covered by the profile raises no flag', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');
  const goalsDir = join(root, 'canon', 'elements', '01_motivation', 'goals');
  mkdirSync(goalsDir, { recursive: true });
  writeFileSync(join(goalsDir, 'GOAL-1.yaml'), 'id: GOAL-1\nname: Test Goal\n', 'utf8');

  const report = await repoCheck(root);
  assert.equal(report.profile_completeness.resolvable, true);
  assert.deepEqual(report.profile_completeness.out_of_profile_types, []);
});

// ── unreadable-file diagnostics (transitrix-hq#104 item 5) ──────────────
//
// Forcing a genuine OS-level read failure is not reliably reproducible
// cross-platform in a fast unit test (see the note above elementTypesOnDisk's
// tests), so these cover the two things that ARE deterministic: the clean-repo
// baseline stays zero, and `zones` — spread into the data-free report as-is — never
// carries the per-file `unreadable` detail (file paths), regardless of count.

test('repoCheck: a clean repo reports zero unreadable files and no red flag for it', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');
  const goalsDir = join(root, 'canon', 'elements', '01_motivation', 'goals');
  mkdirSync(goalsDir, { recursive: true });
  writeFileSync(join(goalsDir, 'GOAL-1.yaml'), 'id: GOAL-1\nname: Test Goal\n', 'utf8');

  const report = await repoCheck(root);
  assert.equal(report.integrity.unreadable_files, 0);
  assert.ok(!report.integrity.red_flags.some((f) => f.includes('could not be read')));
});

test('repoCheck: the data-free report never carries the per-file unreadable detail', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');

  const report = await repoCheck(root);
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes(root.replace(/\\/g, '\\\\')) && !serialized.includes(root));
  for (const z of ['canon', 'field', 'codex']) {
    assert.equal(Object.prototype.hasOwnProperty.call(report.zones[z], 'unreadable'), false);
  }
});

// ── version currency (F11.2) — `tooling.ok`, the report's headline signal ─
//
// transitrix-hq#199: PRESETS_VERSION sat at 2.1.0 across the 3.2.0 → 3.6.0
// releases, so this signal read false for every adopter who correctly kept
// `methodology_version` current — and nothing here covered it. These two tests
// pin both directions of the comparison.

test('repoCheck: tooling.ok is true when the declared version matches the built-in presets', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');

  const report = await repoCheck(root);
  assert.equal(report.tooling.cli_presets_version, PRESETS_VERSION);
  assert.equal(report.tooling.methodology_version_match, true);
  assert.equal(report.tooling.ok, true);
  assert.ok(!report.integrity.red_flags.some((f) => f.includes('does not match the CLI built-in presets version')));
});

test('repoCheck: a declared version behind the built-in presets flips tooling.ok and raises a red flag', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), 'methodology_version: "0.0.1"\ncoverage_profile: core\n', 'utf8');

  const report = await repoCheck(root);
  assert.equal(report.tooling.methodology_version_match, false);
  assert.equal(report.tooling.ok, false);
  assert.ok(report.integrity.red_flags.some((f) => f.includes('does not match the CLI built-in presets version')));
});

// ── binding envelope (BIND-001..005, CONTRACT.md §17.2) surfaces here too ─

test('repoCheck: a clean repo (no canon_id, no origin) carries no `bindings` section at all', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');
  const goalsDir = join(root, 'canon', 'elements', '01_motivation', 'goals');
  mkdirSync(goalsDir, { recursive: true });
  writeFileSync(join(goalsDir, 'GOAL-1.yaml'), 'id: GOAL-1\nname: Test Goal\n', 'utf8');

  const report = await repoCheck(root);
  assert.equal(Object.prototype.hasOwnProperty.call(report, 'bindings'), false);
});

test('repoCheck: BIND-005 — an `origin` field on a project repository\'s own element is flagged', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');
  const goalsDir = join(root, 'canon', 'elements', '01_motivation', 'goals');
  mkdirSync(goalsDir, { recursive: true });
  writeFileSync(join(goalsDir, 'GOAL-1.yaml'), 'id: GOAL-1\nname: Test Goal\norigin:\n  repository: acme/architecture\n  id: GOAL-1\n', 'utf8');

  const report = await repoCheck(root);
  assert.deepEqual(report.bindings.origin_present, [{ local_id: 'GOAL-1' }]);
  assert.ok(report.integrity.red_flags.some((f) => f.includes('BIND-005')));
});

test('repoCheck: BIND-004 — a canon_id present with no catalogue pin configured is flagged', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), MANIFEST, 'utf8');
  const goalsDir = join(root, 'canon', 'elements', '01_motivation', 'goals');
  mkdirSync(goalsDir, { recursive: true });
  writeFileSync(join(goalsDir, 'GOAL-1.yaml'), 'id: GOAL-1\nname: Test Goal\ncanon_id: "TERM-001"\n', 'utf8');

  const report = await repoCheck(root);
  assert.deepEqual(report.bindings.missing_pin, [{ local_id: 'GOAL-1' }]);
  assert.ok(report.integrity.red_flags.some((f) => f.includes('BIND-004')));
});
