// Unit tests for the L0 one-step join (adl-join.mjs — method/03-architecture-decision-log.md
// §10, method/05-catalogue-integration.md §7).
// Run: node --test packages/ingest-cli/src/adl-join.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adoptAdl } from './adl-join.mjs';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'adl-join-test-'));
}

test('adoptAdl creates the records folder, the vendored guard, and the CI workflow', async () => {
  const root = tmpOrgRoot();
  const res = await adoptAdl(root);

  assert.ok(existsSync(join(root, 'operations', 'decisions', '.gitkeep')));
  assert.ok(existsSync(join(root, 'scripts', 'check-adl.mjs')));
  assert.ok(existsSync(join(root, '.github', 'workflows', 'adl-check.yml')));
  assert.deepEqual(res.created.sort(), ['.github/workflows/adl-check.yml', 'operations/decisions/', 'scripts/check-adl.mjs'].sort());
  assert.equal(res.existing.length, 0);
  assert.equal(res.centralLine, null);

  const workflow = readFileSync(join(root, '.github', 'workflows', 'adl-check.yml'), 'utf8');
  assert.match(workflow, /node scripts\/check-adl\.mjs/);
});

test('adoptAdl is idempotent — a second run reports everything as existing and overwrites nothing', async () => {
  const root = tmpOrgRoot();
  await adoptAdl(root);
  const custom = '# hand-edited, must survive a re-run\n';
  writeFileSync(join(root, 'scripts', 'check-adl.mjs'), custom, 'utf8');

  const res = await adoptAdl(root);
  assert.deepEqual(res.created, []);
  assert.deepEqual(res.existing.sort(), ['.github/workflows/adl-check.yml', 'operations/decisions/', 'scripts/check-adl.mjs'].sort());
  assert.equal(readFileSync(join(root, 'scripts', 'check-adl.mjs'), 'utf8'), custom);
});

test('adoptAdl reports operations/decisions/ as existing without disturbing an already-authored record', async () => {
  const root = tmpOrgRoot();
  mkdirSync(join(root, 'operations', 'decisions'), { recursive: true });
  writeFileSync(join(root, 'operations', 'decisions', 'ADR-2026-01-01-first.md'), '---\nid: ADR-2026-01-01-first\n---\n', 'utf8');

  const res = await adoptAdl(root);
  assert.ok(res.existing.includes('operations/decisions/'));
  assert.ok(existsSync(join(root, 'operations', 'decisions', 'ADR-2026-01-01-first.md')));
});

test('adoptAdl prints the harvest.config.yaml source line only when a repo coordinate is given', async () => {
  const withRepo = await adoptAdl(tmpOrgRoot(), { repoCoordinate: 'acme/service-x' });
  assert.match(withRepo.centralLine, /repo: service-x/);
  assert.match(withRepo.centralLine, /path: operations\/decisions/);
  assert.match(withRepo.centralLine, /clone: https:\/\/github\.com\/acme\/service-x\.git/);

  const withoutRepo = await adoptAdl(tmpOrgRoot());
  assert.equal(withoutRepo.centralLine, null);
});
