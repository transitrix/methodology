// Unit + fixture tests for src/packages.mjs (PACKAGES.md §1, §7, §4.2, §8).
// Run: node --test packages/ingest-cli/src/packages.test.mjs
//
// parsePackagesDecl/validatePackagesDecl are exercised as pure functions (no
// filesystem). resolveValidatorEntryPoints/runPackageValidators are exercised
// against a throwaway fixture directory to prove the extension points for
// real: an external package's declared validator actually runs when present,
// and is silently skipped when absent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parsePackagesDecl,
  validatePackagesDecl,
  resolveValidatorEntryPoints,
  runPackageValidators,
  SHIPPED_PACKAGES,
} from './packages.mjs';

// ── parsePackagesDecl ────────────────────────────────────────────

test('parsePackagesDecl — positive: inline shipped-form list', () => {
  const entries = parsePackagesDecl('transitrix: 1\npackages: [reqif]\n');
  assert.deepEqual(entries, [{ kind: 'shipped', name: 'reqif', raw: 'reqif' }]);
});

test('parsePackagesDecl — positive: absent packages: key yields no entries', () => {
  assert.deepEqual(parsePackagesDecl('transitrix: 1\nzones: [canon]\n'), []);
});

test('parsePackagesDecl — positive: empty inline list yields no entries', () => {
  assert.deepEqual(parsePackagesDecl('packages: []\n'), []);
});

test('parsePackagesDecl — positive: block form mixing a shipped name and an external map', () => {
  const text = [
    'transitrix: 1',
    'packages:',
    '  - reqif',
    '  - name: acme-widgets',
    '    distribution: external',
    '    version: "1.2.0"',
    '    compatible_with: ">=3.1.0 <4.0.0"',
    '    validator: "acme-widgets/validate.mjs"',
    'zones: [canon]',
    '',
  ].join('\n');
  const entries = parsePackagesDecl(text);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0], { kind: 'shipped', name: 'reqif', raw: 'reqif' });
  assert.equal(entries[1].kind, 'external');
  assert.equal(entries[1].name, 'acme-widgets');
  assert.equal(entries[1].version, '1.2.0');
  assert.equal(entries[1].compatible_with, '>=3.1.0 <4.0.0');
  assert.equal(entries[1].validator, 'acme-widgets/validate.mjs');
});

test('parsePackagesDecl — negative: an external map missing required fields is malformed, not silently dropped', () => {
  const text = [
    'packages:',
    '  - name: acme-widgets',
    '    version: "1.2.0"',
    '',
  ].join('\n');
  const entries = parsePackagesDecl(text);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, 'malformed');
  assert.match(entries[0].reason, /compatible_with/);
  assert.match(entries[0].reason, /validator/);
});

// ── validatePackagesDecl — PKG-001 / PKG-002 ─────────────────────

test('validatePackagesDecl — positive: a shipped, known name produces no finding', () => {
  const findings = validatePackagesDecl([{ kind: 'shipped', name: 'reqif' }], { methodologyVersion: '3.1.0' });
  assert.deepEqual(findings, []);
});

test('validatePackagesDecl — negative: a typo in a shipped-form name is PKG-001, actionable', () => {
  const findings = validatePackagesDecl([{ kind: 'shipped', name: 'reqiff' }], { methodologyVersion: '3.1.0' });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'PKG-001');
  assert.match(findings[0].message, /reqiff/);
  assert.match(findings[0].message, /not a package shipped/);
});

test('validatePackagesDecl — negative: a malformed block-form entry surfaces as PKG-001', () => {
  const findings = validatePackagesDecl(
    [{ kind: 'malformed', name: 'acme-widgets', reason: 'missing required field(s): validator' }],
    { methodologyVersion: '3.1.0' },
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'PKG-001');
});

test('validatePackagesDecl — positive: an external package whose compatible_with admits methodology_version produces no finding', () => {
  const findings = validatePackagesDecl(
    [{ kind: 'external', name: 'acme-widgets', version: '1.2.0', compatible_with: '>=3.1.0 <4.0.0', validator: 'x/validate.mjs' }],
    { methodologyVersion: '3.1.0' },
  );
  assert.deepEqual(findings, []);
});

test('validatePackagesDecl — negative: an external package whose compatible_with excludes methodology_version is PKG-002', () => {
  const findings = validatePackagesDecl(
    [{ kind: 'external', name: 'acme-widgets', version: '1.2.0', compatible_with: '>=4.0.0', validator: 'x/validate.mjs' }],
    { methodologyVersion: '3.1.0' },
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'PKG-002');
  assert.match(findings[0].message, /does not admit/);
});

test('validatePackagesDecl — negative: a malformed external version is PKG-001', () => {
  const findings = validatePackagesDecl(
    [{ kind: 'external', name: 'acme-widgets', version: 'not-a-version', compatible_with: '>=3.1.0', validator: 'x/validate.mjs' }],
    { methodologyVersion: '3.1.0' },
  );
  assert.ok(findings.some((f) => f.rule === 'PKG-001' && /malformed \`version\`/.test(f.message)));
});

// ── resolveValidatorEntryPoints / runPackageValidators — fixture ─

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'pkg-test-'));
  return root;
}

test('resolveValidatorEntryPoints — positive: an external package validator present on disk resolves present:true', () => {
  const root = makeFixture();
  try {
    mkdirSync(join(root, 'acme-widgets'), { recursive: true });
    writeFileSync(join(root, 'acme-widgets', 'validate.mjs'), 'console.log("ok");\n');
    const resolved = resolveValidatorEntryPoints(root, [
      { kind: 'external', name: 'acme-widgets', validator: 'acme-widgets/validate.mjs' },
    ]);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].present, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolveValidatorEntryPoints — negative: a declared but not-installed validator resolves present:false, not an error', () => {
  const root = makeFixture();
  try {
    const resolved = resolveValidatorEntryPoints(root, [
      { kind: 'external', name: 'acme-widgets', validator: 'acme-widgets/validate.mjs' },
    ]);
    assert.equal(resolved[0].present, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolveValidatorEntryPoints — negative: a shipped package with no node_modules install resolves present:false', () => {
  const root = makeFixture();
  try {
    const resolved = resolveValidatorEntryPoints(root, [{ kind: 'shipped', name: 'reqif' }]);
    assert.equal(resolved[0].present, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPackageValidators — positive: a present external validator actually runs and reports pass', async () => {
  const root = makeFixture();
  try {
    mkdirSync(join(root, 'acme-widgets'), { recursive: true });
    writeFileSync(join(root, 'acme-widgets', 'validate.mjs'), 'process.exit(0);\n');
    const results = await runPackageValidators(root, [
      { kind: 'external', name: 'acme-widgets', validator: 'acme-widgets/validate.mjs' },
    ]);
    assert.equal(results.length, 1);
    assert.equal(results[0].ran, true);
    assert.equal(results[0].ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPackageValidators — negative: a present external validator that exits non-zero is reported as a failure, not silently swallowed', async () => {
  const root = makeFixture();
  try {
    mkdirSync(join(root, 'acme-widgets'), { recursive: true });
    writeFileSync(join(root, 'acme-widgets', 'validate.mjs'), 'console.error("bad object"); process.exit(1);\n');
    const results = await runPackageValidators(root, [
      { kind: 'external', name: 'acme-widgets', validator: 'acme-widgets/validate.mjs' },
    ]);
    assert.equal(results[0].ran, true);
    assert.equal(results[0].ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runPackageValidators — negative: a declared but absent validator is skipped (ran:false), not attempted', async () => {
  const root = makeFixture();
  try {
    const results = await runPackageValidators(root, [
      { kind: 'external', name: 'acme-widgets', validator: 'acme-widgets/validate.mjs' },
    ]);
    assert.equal(results[0].ran, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('SHIPPED_PACKAGES — positive: reqif is registered with a name -> path lookup only (no reqif-specific check logic)', () => {
  assert.ok(SHIPPED_PACKAGES.reqif);
  assert.equal(typeof SHIPPED_PACKAGES.reqif.npmPackage, 'string');
  assert.equal(typeof SHIPPED_PACKAGES.reqif.bin, 'string');
});
