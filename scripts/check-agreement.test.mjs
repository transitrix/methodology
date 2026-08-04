// Unit + fixture tests for scripts/check-agreement.mjs.
// Run: node --test scripts/check-agreement.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkAgreement, looksLikeTool, deriveType } from './check-agreement.mjs';

const SCRIPT_PATH = fileURLToPath(new URL('./check-agreement.mjs', import.meta.url));

test('checkAgreement — positive: absent agreement is untouched (byte-identical back-compat)', () => {
  assert.deepEqual(checkAgreement({}), []);
  assert.deepEqual(checkAgreement(), []);
});

test('checkAgreement — positive: a human writing agreed passes', () => {
  assert.deepEqual(checkAgreement({ agreement: 'agreed', agreed_by: 'v.korobeinikov' }), []);
});

test('checkAgreement — positive: draft/disputed accept either a human or a tool writer', () => {
  assert.deepEqual(checkAgreement({ agreement: 'draft', agreed_by: 'reg-intel-scanner' }), []);
  assert.deepEqual(checkAgreement({ agreement: 'draft', agreed_by: 'v.korobeinikov' }), []);
  assert.deepEqual(checkAgreement({ agreement: 'disputed', agreed_by: '@transitrix/ingest-cli' }), []);
  assert.deepEqual(checkAgreement({ agreement: 'disputed', agreed_by: 'v.korobeinikov' }), []);
});

test('checkAgreement — negative: a tool writing agreed fails AGREE-002', () => {
  assert.deepEqual(checkAgreement({ agreement: 'agreed', agreed_by: 'ingest-reviewer-claude' }), ['AGREE-002']);
  assert.deepEqual(checkAgreement({ agreement: 'agreed', agreed_by: '@transitrix/reg-intel-cli' }), ['AGREE-002']);
  assert.deepEqual(checkAgreement({ agreement: 'agreed', agreed_by: 'reg-intel-scanner' }), ['AGREE-002']);
});

test('checkAgreement — negative: an invalid enum value fails AGREE-001', () => {
  assert.deepEqual(checkAgreement({ agreement: 'approved', agreed_by: 'v.korobeinikov' }), ['AGREE-001']);
});

test('checkAgreement — negative: agreement present with no writer fails AGREE-003', () => {
  assert.deepEqual(checkAgreement({ agreement: 'draft' }), ['AGREE-003']);
  assert.deepEqual(checkAgreement({ agreement: 'agreed' }), ['AGREE-003']);
});

test('looksLikeTool — matches the decisions-cli ADMIT-007 tool-identifier convention', () => {
  assert.equal(looksLikeTool('ingest-reviewer-claude'), true);
  assert.equal(looksLikeTool('reg-intel-scanner'), true);
  assert.equal(looksLikeTool('some-cli'), true);
  assert.equal(looksLikeTool('@transitrix/ingest-cli'), true);
  assert.equal(looksLikeTool('nightly-bot'), true);
  assert.equal(looksLikeTool('v.korobeinikov'), false);
  assert.equal(looksLikeTool(''), false);
  assert.equal(looksLikeTool(undefined), false);
});

test('deriveType — reads the TYPE prefix ahead of the first hyphen', () => {
  assert.equal(deriveType('REQUIREMENT-DATA-ERASURE-1'), 'REQUIREMENT');
  assert.equal(deriveType('CONSTRAINT-GDPR-RESIDENCY-1'), 'CONSTRAINT');
  assert.equal(deriveType('NEED-TIMELY-OUTAGE-STATUS-1'), 'NEED');
  assert.equal(deriveType(undefined), undefined);
});

// --- fixture-repo end-to-end test -------------------------------------

function writeYaml(dir, filename, lines) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), lines.join('\n') + '\n', 'utf8');
}

test('CLI — positive: a fixture repo with only absent/human-agreed elements is clean (exit 0)', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-agreement-clean-'));
  try {
    const reqDir = join(root, 'canon', 'elements', '01_motivation', 'requirements');
    writeYaml(reqDir, 'REQUIREMENT-1.yaml', [
      'notation: requirement',
      'id: REQUIREMENT-1',
      'name: "No agreement field at all"',
      'zone: canon',
    ]);
    writeYaml(reqDir, 'REQUIREMENT-2.yaml', [
      'notation: requirement',
      'id: REQUIREMENT-2',
      'name: "Human-agreed"',
      'agreement: agreed',
      'agreed_by: "v.korobeinikov"',
      'zone: canon',
    ]);

    const out = execFileSync('node', [SCRIPT_PATH, '--root', root], { encoding: 'utf8' });
    assert.match(out, /clean/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI — negative: a tool-written agreed element fails with exit 1 and reports AGREE-002', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-agreement-dirty-'));
  try {
    const needDir = join(root, 'canon', 'elements', '01_motivation', 'needs');
    writeYaml(needDir, 'NEED-1.yaml', [
      'notation: need',
      'id: NEED-1',
      'name: "Tool-agreed need"',
      'agreement: agreed',
      'agreed_by: "ingest-reviewer-claude"',
      'zone: canon',
    ]);

    let threw = false;
    let output = '';
    try {
      execFileSync('node', [SCRIPT_PATH, '--root', root], { encoding: 'utf8' });
    } catch (err) {
      threw = true;
      output = err.stdout;
      assert.equal(err.status, 1);
    }
    assert.ok(threw, 'CLI must exit non-zero on a finding');
    assert.match(output, /AGREE-002/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI — a TYPE outside REQUIREMENT/CONSTRAINT/NEED is never evaluated for AGREE-*', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-agreement-outside-scope-'));
  try {
    const capDir = join(root, 'canon', 'elements', '05_implementation', 'capabilities');
    writeYaml(capDir, 'CAPABILITY-1.yaml', [
      'notation: capability',
      'id: CAPABILITY-1',
      'name: "Not an agreement-axis TYPE"',
      'agreement: not-a-real-value', // would fail AGREE-001 if this TYPE were in scope
      'zone: canon',
    ]);

    const out = execFileSync('node', [SCRIPT_PATH, '--root', root], { encoding: 'utf8' });
    assert.match(out, /clean/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
