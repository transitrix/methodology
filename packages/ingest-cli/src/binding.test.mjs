// Unit tests for L2 recognition + L3 promotion (binding.mjs —
// method/09-releases-and-propagation.md §6.2, CONTRACT.md §17).
// Run: node --test packages/ingest-cli/src/binding.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  proposeBindings,
  buildBindingProposals,
  applyBinding,
  buildPromotionProposal,
  buildPromotionProposalDoc,
  BindingError,
} from './binding.mjs';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'binding-test-'));
}

function writeManifest(root, catalogueBlock) {
  writeFileSync(
    join(root, 'transitrix.yaml'),
    `transitrix: 1\nmethodology_version: "3.4.0"\nnotations: [dgca]\nzones: [canon]\n${catalogueBlock || ''}`,
    'utf8'
  );
}

function writeSlice(root, relPath, text) {
  const abs = join(root, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, text, 'utf8');
}

function writeCanonElement(root, relPath, fields) {
  const abs = join(root, 'canon', 'elements', relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  const lines = [];
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${item}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  writeFileSync(abs, lines.join('\n') + '\n', 'utf8');
}

function pinnedRoot(sliceYaml) {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', sliceYaml);
  return root;
}

const ONE_TERM_SLICE =
  'version: "1.0.0"\nelements:\n' +
  '  - id: TERM-001\n    type: TERM\n    name: "Capability"\n    aliases: [Competency]\n    description: "A shared capability term."\n';

const TWO_TYPE_SLICE =
  'version: "1.0.0"\nelements:\n' +
  '  - id: TERM-001\n    type: TERM\n    name: "Capability"\n    aliases: [Competency]\n    description: "A shared capability term."\n' +
  '  - id: CAPABILITY-001\n    type: CAPABILITY\n    name: "Capability"\n    aliases: []\n    description: "A capability, not a term."\n';

// ── proposeBindings — L2, pure ──────────────────────────────────────────

test('proposeBindings: an unbound element with an unambiguous same-TYPE match is proposed', () => {
  const local = [{ id: 'TERM-9', type: 'TERM', name: 'Capability', aliases: [], canon_id: null }];
  const central = { elements: [{ id: 'TERM-001', type: 'TERM', name: 'Capability', aliases: [] }] };
  const proposals = proposeBindings(local, central);
  assert.deepEqual(proposals, [{ local_id: 'TERM-9', proposed_canon_id: 'TERM-001', matched_on: 'name' }]);
});

test('proposeBindings: a match on a different TYPE is never proposed (BIND-002 would reject it)', () => {
  const local = [{ id: 'CAPABILITY-9', type: 'CAPABILITY', name: 'Capability', aliases: [], canon_id: null }];
  const central = { elements: [{ id: 'TERM-001', type: 'TERM', name: 'Capability', aliases: [] }] };
  const proposals = proposeBindings(local, central);
  assert.deepEqual(proposals, []);
});

test('proposeBindings: an already-bound element is never re-proposed', () => {
  const local = [{ id: 'TERM-9', type: 'TERM', name: 'Capability', aliases: [], canon_id: 'TERM-001' }];
  const central = { elements: [{ id: 'TERM-001', type: 'TERM', name: 'Capability', aliases: [] }] };
  assert.deepEqual(proposeBindings(local, central), []);
});

test('proposeBindings: an ambiguous match (two distinct central ids, same TYPE) is never proposed', () => {
  const local = [{ id: 'TERM-9', type: 'TERM', name: 'Competency', aliases: [], canon_id: null }];
  const central = {
    elements: [
      { id: 'TERM-001', type: 'TERM', name: 'Capability', aliases: ['Competency'] },
      { id: 'TERM-002', type: 'TERM', name: 'Capacity', aliases: ['Competency'] },
    ],
  };
  assert.deepEqual(proposeBindings(local, central), []);
});

test('proposeBindings: no pin (null catalogueSlice) proposes nothing', () => {
  const local = [{ id: 'TERM-9', type: 'TERM', name: 'Capability', aliases: [], canon_id: null }];
  assert.deepEqual(proposeBindings(local, null), []);
});

test('proposeBindings: idempotent — running twice on the same input yields the same result', () => {
  const local = [{ id: 'TERM-9', type: 'TERM', name: 'Capability', aliases: [], canon_id: null }];
  const central = { elements: [{ id: 'TERM-001', type: 'TERM', name: 'Capability', aliases: [] }] };
  assert.deepEqual(proposeBindings(local, central), proposeBindings(local, central));
});

// ── buildBindingProposals — the review artefact ──────────────────────────

test('buildBindingProposals: proposes, never admits — gate.admits_to_canon is false', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  const doc = await buildBindingProposals(root);
  assert.deepEqual(doc.gate, { admits_to_canon: false });
  assert.deepEqual(doc.pin, { source: 'acme/architecture', version: '1.0.0' });
  assert.deepEqual(doc.proposals, [{ local_id: 'TERM-9', proposed_canon_id: 'TERM-001', matched_on: 'name' }]);
});

test('buildBindingProposals: no pin declared yields zero proposals, no `pin` key', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  const doc = await buildBindingProposals(root);
  assert.equal(doc.pin, undefined);
  assert.deepEqual(doc.proposals, []);
});

// ── applyBinding — the human-gated write ─────────────────────────────────

test('applyBinding: writes canon_id into the local element file', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  const res = await applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' });
  assert.equal(res.outcome, 'bound');
  const text = readFileSync(join(root, 'canon', 'elements', 'TERM-9.yaml'), 'utf8');
  assert.match(text, /canon_id: "TERM-001"/);
});

test('applyBinding: re-applying the same binding is idempotent (unchanged, no rewrite)', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  await applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' });
  const res = await applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' });
  assert.equal(res.outcome, 'unchanged');
});

test('applyBinding: refuses to silently replace a different existing binding', async () => {
  const root = pinnedRoot(TWO_TYPE_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability', canon_id: 'TERM-001' });
  await assert.rejects(
    () => applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'CAPABILITY-001' }),
    BindingError
  );
});

test('applyBinding: BIND-001 — a canon_id that does not resolve in the pinned catalogue is rejected', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  await assert.rejects(
    () => applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-999' }),
    BindingError
  );
});

test('applyBinding: BIND-002 — a canon_id resolving to a different TYPE is rejected', async () => {
  const root = pinnedRoot(TWO_TYPE_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  await assert.rejects(
    () => applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'CAPABILITY-001' }),
    BindingError
  );
});

test('applyBinding: BIND-003 — a canon_id already claimed by a different local element is rejected', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability', canon_id: 'TERM-001' });
  writeCanonElement(root, 'TERM-10.yaml', { id: 'TERM-10', name: 'Capacity' });
  await assert.rejects(
    () => applyBinding({ orgRoot: root, localId: 'TERM-10', canonId: 'TERM-001' }),
    BindingError
  );
});

test('applyBinding: BIND-004 — no catalogue pin configured is rejected', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  await assert.rejects(
    () => applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' }),
    BindingError
  );
});

test('applyBinding: an unknown local id is rejected', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  await assert.rejects(
    () => applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' }),
    BindingError
  );
});

// ── buildPromotionProposal / buildPromotionProposalDoc — L3 ─────────────

test('buildPromotionProposal: shapes the local element plus origin, no repository boundary write', () => {
  const local = { id: 'TERM-9', type: 'TERM', name: 'Capability', aliases: ['Competency'], description: 'A shared capability term.' };
  const proposal = buildPromotionProposal(local, 'acme/adopter');
  assert.deepEqual(proposal, {
    local_id: 'TERM-9',
    type: 'TERM',
    name: 'Capability',
    aliases: ['Competency'],
    description: 'A shared capability term.',
    origin: { repository: 'acme/adopter', id: 'TERM-9' },
  });
});

test('buildPromotionProposal: --repository is required', () => {
  const local = { id: 'TERM-9', type: 'TERM', name: 'Capability', aliases: [], description: null };
  assert.throws(() => buildPromotionProposal(local, undefined), BindingError);
});

test('buildPromotionProposalDoc: proposes, never admits — gate.admits_to_canon is false', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability', description: 'A shared capability term.' });
  const doc = await buildPromotionProposalDoc(root, 'TERM-9', 'acme/adopter');
  assert.deepEqual(doc.gate, { admits_to_canon: false });
  assert.deepEqual(doc.proposal.origin, { repository: 'acme/adopter', id: 'TERM-9' });
});

test('buildPromotionProposalDoc: an already-bound element refuses promotion (already bound, nothing to promote)', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability', canon_id: 'TERM-001' });
  await assert.rejects(
    () => buildPromotionProposalDoc(root, 'TERM-9', 'acme/adopter'),
    BindingError
  );
});

test('buildPromotionProposalDoc: an unknown local id is rejected', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  await assert.rejects(
    () => buildPromotionProposalDoc(root, 'TERM-9', 'acme/adopter'),
    BindingError
  );
});

// ── Idempotence — re-running L2/L3 changes nothing new ──────────────────

test('applyBinding: applying the same accepted proposal twice leaves the file byte-identical after the first write', async () => {
  const root = pinnedRoot(ONE_TERM_SLICE);
  writeCanonElement(root, 'TERM-9.yaml', { id: 'TERM-9', name: 'Capability' });
  await applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' });
  const first = readFileSync(join(root, 'canon', 'elements', 'TERM-9.yaml'), 'utf8');
  await applyBinding({ orgRoot: root, localId: 'TERM-9', canonId: 'TERM-001' });
  const second = readFileSync(join(root, 'canon', 'elements', 'TERM-9.yaml'), 'utf8');
  assert.equal(first, second);
});
