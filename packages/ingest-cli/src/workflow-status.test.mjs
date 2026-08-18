// Regression test for transitrix-hq#211 — workflow-status.mjs's ADR scan must not
// count the shipped ADR template (or any other non-record .md file dropped into
// operations/decisions/) as a real proposed record.
//
// Run: node --test packages/ingest-cli/src/workflow-status.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeWorkflowStatus } from './workflow-status.mjs';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'workflow-status-test-'));
}

function writeAdr(decisionsDir, filename, frontMatter) {
  const fm = Object.entries(frontMatter).map(([k, v]) => `${k}: ${v}`).join('\n');
  writeFileSync(join(decisionsDir, filename), `---\n${fm}\n---\n\nbody\n`, 'utf8');
}

test('scanAdr: the shipped template (literal ADR-YYYY-MM-DD-*.template.md) is excluded', async () => {
  const root = tmpOrgRoot();
  const decisions = join(root, 'operations', 'decisions');
  mkdirSync(decisions, { recursive: true });
  writeAdr(decisions, 'ADR-YYYY-MM-DD-short-slug.template.md', {
    id: 'ADR-YYYY-MM-DD-short-slug', title: 'FILL-ME', status: 'proposed', date: '"YYYY-MM-DD"', author: 'human-architect',
  });
  writeAdr(decisions, 'ADR-2026-08-18-real-decision.md', {
    id: 'ADR-2026-08-18-real-decision', title: 'Real', status: 'proposed', date: '"2026-08-18"', author: 'agent',
  });

  const { sections } = await computeWorkflowStatus(root);
  const adr = sections.find(s => s.object === 'ADR');
  const total = adr.rows.reduce((n, r) => n + r.count, 0);
  assert.equal(total, 1, 'template must not be counted alongside the one real record');
  assert.deepEqual(adr.rows.find(r => r.phase === 'proposed (author: agent)').ids, ['ADR-2026-08-18-real-decision']);
});

test('scanAdr: legacy ADR-NNNN records are still counted (not filename-shape false negatives)', async () => {
  const root = tmpOrgRoot();
  const decisions = join(root, 'operations', 'decisions');
  mkdirSync(decisions, { recursive: true });
  writeAdr(decisions, 'ADR-0001-legacy-decision.md', {
    id: 'ADR-0001', title: 'Legacy', status: 'accepted', date: '"2026-01-01"', author: 'human-architect',
  });

  const { sections } = await computeWorkflowStatus(root);
  const adr = sections.find(s => s.object === 'ADR');
  assert.deepEqual(adr.rows.find(r => r.phase === 'accepted').ids, ['ADR-0001']);
});

test('scanAdr: an arbitrary non-record .md file in the folder is ignored, not bucketed unknown', async () => {
  const root = tmpOrgRoot();
  const decisions = join(root, 'operations', 'decisions');
  mkdirSync(decisions, { recursive: true });
  writeFileSync(join(decisions, 'README.md'), '# Decisions folder\n', 'utf8');

  const { sections } = await computeWorkflowStatus(root);
  const adr = sections.find(s => s.object === 'ADR');
  const total = adr.rows.reduce((n, r) => n + r.count, 0);
  assert.equal(total, 0);
});
