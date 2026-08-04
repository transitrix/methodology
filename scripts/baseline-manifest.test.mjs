// Unit + fixture tests for scripts/baseline-manifest.mjs.
// Run: node --test scripts/baseline-manifest.test.mjs
//
// deriveType/render are exercised as pure functions (no filesystem, no
// subprocess). A fixture-repository test drives the real CLI against a
// throwaway git repo to prove the end-to-end scope: every TYPE under
// canon/ (not a hardcoded subset) reaches the rendered manifest.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveType, groupByType, render } from './baseline-manifest.mjs';

const SCRIPT_PATH = fileURLToPath(new URL('./baseline-manifest.mjs', import.meta.url));

test('deriveType — positive: reads the TYPE prefix ahead of the first hyphen', () => {
  assert.equal(deriveType('REQUIREMENT-DATA-RETENTION-1'), 'REQUIREMENT');
  assert.equal(deriveType('NEED-1'), 'NEED');
  assert.equal(deriveType('TARGET_STATE-CLOUD-1'), 'TARGET_STATE'); // underscore TYPE, hyphenated middle
  assert.equal(deriveType('CAPABILITY-V1.2'), 'CAPABILITY'); // V/H address, not a plain integer
});

test('deriveType — negative: a malformed id yields no TYPE', () => {
  assert.equal(deriveType('not-an-id'), undefined);
  assert.equal(deriveType('123-FOO'), undefined);
});

test('groupByType — positive: an unlisted TYPE is grouped, not dropped', () => {
  // Nothing in baseline-manifest.mjs enumerates TYPE names — grouping is
  // driven entirely by what deriveType finds on each element's id. A TYPE
  // this test invents on the spot (never referenced by the script) proves
  // the omission the epic flagged cannot recur: registering a TYPE without
  // touching this script does not silently exclude it.
  const elements = [
    { id: 'REQUIREMENT-1', type: 'REQUIREMENT', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
    { id: 'WIDGET-1', type: 'WIDGET', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
  ];
  const byType = groupByType(elements);
  assert.ok(byType.has('WIDGET'), 'an invented, never-hardcoded TYPE must still be grouped');
  assert.equal(byType.get('WIDGET').length, 1);
});

test('render — positive: every admitted TYPE appears in the admitted-set-by-type table', () => {
  const elements = [
    { id: 'REQUIREMENT-1', type: 'REQUIREMENT', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
    { id: 'ASSERTION-1', type: 'ASSERTION', admission_state: 'active', reviewer_authority: 'expert_confirmed', about: 'REQUIREMENT-1' },
    { id: 'VERIFICATION-1', type: 'VERIFICATION', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
    { id: 'NEED-1', type: 'NEED', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
    { id: 'VALIDATION-1', type: 'VALIDATION', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
    { id: 'RISK-1', type: 'RISK', admission_state: 'active', reviewer_authority: 'expert_confirmed' },
    { id: 'METRIC-1', type: 'METRIC', admission_state: 'active', reviewer_authority: 'ai_reviewed' },
  ];
  const text = render('v-test', elements);
  for (const type of ['REQUIREMENT', 'ASSERTION', 'VERIFICATION', 'NEED', 'VALIDATION', 'RISK', 'METRIC']) {
    assert.ok(text.includes(`| \`${type}\` |`), `${type} missing from the admitted-set-by-type table`);
  }
  assert.ok(!text.includes('Design-controls'), 'title must not name the retired design-controls capability');
});

test('render — negative: a proposed (non-active) element is excluded from every count', () => {
  const elements = [
    { id: 'REQUIREMENT-1', type: 'REQUIREMENT', admission_state: 'proposed', reviewer_authority: 'expert_confirmed' },
  ];
  const text = render('v-test', elements);
  assert.ok(text.includes('0 admitted element(s)'));
  assert.ok(!text.includes('REQUIREMENT-1'));
});

test('fixture repository — one element per registered TYPE reaches the manifest, unmodified script', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'baseline-manifest-fixture-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const run = (args, opts = {}) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', ...opts });

  run(['init', '-q']);
  run(['config', 'user.email', 'fixture@example.com']);
  run(['config', 'user.name', 'Fixture']);

  const fixtureTypes = [
    ['canon/elements/01_motivation/requirements/REQUIREMENT-1.yaml', 'REQUIREMENT-1'],
    ['canon/assertions/ASSERTION-1.yaml', 'ASSERTION-1'],
    ['canon/verifications/VERIFICATION-1.yaml', 'VERIFICATION-1'],
    ['canon/elements/01_motivation/needs/NEED-1.yaml', 'NEED-1'],
    ['canon/validations/VALIDATION-1.yaml', 'VALIDATION-1'],
    ['canon/elements/01_motivation/risks/RISK-1.yaml', 'RISK-1'],
    ['canon/elements/01_motivation/metrics/METRIC-1.yaml', 'METRIC-1'],
  ];
  for (const [path, id] of fixtureTypes) {
    const full = join(dir, path);
    mkdirSync(full.replace(/[^/\\]+$/, ''), { recursive: true });
    writeFileSync(full, `id: ${id}\nzone: canon\n`, 'utf8');
  }
  // A view document under canon/views/ must NOT be picked up as an element.
  const viewPath = join(dir, 'canon/views/dgca/example.dgca.transitrix.yaml');
  mkdirSync(viewPath.replace(/[^/\\]+$/, ''), { recursive: true });
  writeFileSync(viewPath, 'notation: dgca\nid: DGCA-1\n', 'utf8');

  run(['add', '-A']);
  run(['commit', '-q', '-m', 'fixture baseline']);
  run(['tag', 'fixture-baseline']);

  const output = execFileSync('node', [SCRIPT_PATH, 'fixture-baseline'], { cwd: dir, encoding: 'utf8' });

  for (const [, id] of fixtureTypes) {
    const type = id.replace(/-1$/, '');
    assert.ok(output.includes(`| \`${type}\` |`), `${type} missing from fixture manifest output`);
  }
  assert.ok(!output.includes('DGCA'), 'canon/views/ content must not appear as an admitted element');
  assert.ok(output.includes(`${fixtureTypes.length} admitted element(s)`));
});
