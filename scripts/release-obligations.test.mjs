// Unit + fixture tests for scripts/release-obligations.mjs — the derived
// "what must hold in release R" query, elements/17-relations.md §3.2.
// Run: node --test scripts/release-obligations.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveType,
  inEffect,
  ancestorChain,
  loadCatalogue,
  releaseObligations,
} from './release-obligations.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKED_EXAMPLE = join(REPO_ROOT, 'notations', 'examples', 'relations', 'required-for');

// --- pure helpers ----------------------------------------------------------

test('deriveType — the ID prefix, underscore TYPEs included', () => {
  assert.equal(deriveType('RELEASE-PAYMENTS-GATEWAY-2'), 'RELEASE');
  assert.equal(deriveType('REQUIREMENT-STRONG-AUTH-1'), 'REQUIREMENT');
  assert.equal(deriveType('TARGET_STATE-1'), 'TARGET_STATE');
  assert.equal(deriveType('not-an-id'), undefined);
  assert.equal(deriveType(undefined), undefined);
});

test('inEffect — windows are inclusive at both ends (LIFECYCLE-004 reading)', () => {
  const w = { valid_from: '2026-03-02', valid_to: '2026-06-30' };
  assert.equal(inEffect(w, '2026-03-01'), false, 'day before valid_from');
  assert.equal(inEffect(w, '2026-03-02'), true, 'valid_from itself is in effect');
  assert.equal(inEffect(w, '2026-05-01'), true);
  assert.equal(inEffect(w, '2026-06-30'), true, 'valid_to itself is still in effect');
  assert.equal(inEffect(w, '2026-07-01'), false, 'day after valid_to');
  assert.equal(inEffect({ valid_from: '2026-01-01', valid_to: null }, '2030-01-01'), true);
});

// --- chain walk ------------------------------------------------------------

function releaseEl(id, predecessor) {
  return { id, type: 'RELEASE', predecessor, valid_from: '2026-01-01', valid_to: null };
}

test('ancestorChain — R at depth 0, ancestors follow predecessor', () => {
  const elements = new Map([
    ['RELEASE-A-3', releaseEl('RELEASE-A-3', 'RELEASE-A-2')],
    ['RELEASE-A-2', releaseEl('RELEASE-A-2', 'RELEASE-A-1')],
    ['RELEASE-A-1', releaseEl('RELEASE-A-1', null)],
  ]);
  const chain = ancestorChain('RELEASE-A-3', { elements, relations: [] });
  assert.deepEqual(chain.map((c) => [c.id, c.depth]), [
    ['RELEASE-A-3', 0],
    ['RELEASE-A-2', 1],
    ['RELEASE-A-1', 2],
  ]);
});

test('ancestorChain — negative: a predecessor cycle terminates instead of hanging', () => {
  const elements = new Map([
    ['RELEASE-A-1', releaseEl('RELEASE-A-1', 'RELEASE-A-2')],
    ['RELEASE-A-2', releaseEl('RELEASE-A-2', 'RELEASE-A-1')],
  ]);
  const chain = ancestorChain('RELEASE-A-1', { elements, relations: [] });
  assert.deepEqual(chain.map((c) => c.id), ['RELEASE-A-1', 'RELEASE-A-2']);
});

test('ancestorChain — negative: an unresolvable predecessor ends the walk', () => {
  const elements = new Map([['RELEASE-A-2', releaseEl('RELEASE-A-2', 'RELEASE-A-GONE')]]);
  const chain = ancestorChain('RELEASE-A-2', { elements, relations: [] });
  assert.deepEqual(chain.map((c) => c.id), ['RELEASE-A-2']);
});

// --- the query, against the shipped worked example -------------------------

test('worked example — 2.4.0 as at 2026-08-07: one direct, one inherited', async () => {
  const catalogue = await loadCatalogue(WORKED_EXAMPLE);
  const { obligations, findings } = releaseObligations(
    'RELEASE-PAYMENTS-GATEWAY-2', catalogue, '2026-08-07',
  );
  assert.deepEqual(findings, []);
  assert.deepEqual(obligations, [
    {
      requirement: 'REQUIREMENT-STRONG-AUTH-1',
      attached_to: 'RELEASE-PAYMENTS-GATEWAY-2',
      depth: 0,
      inherited: false,
      relation: 'REL-STRONG-AUTH-REQUIRED-FOR-GATEWAY-2-1',
    },
    {
      requirement: 'REQUIREMENT-PAYMENT-AVAILABILITY-1',
      attached_to: 'RELEASE-PAYMENTS-GATEWAY-1',
      depth: 1,
      inherited: true,
      relation: 'REL-AVAILABILITY-REQUIRED-FOR-GATEWAY-1-1',
    },
  ]);
});

test('worked example — inheritance runs one way: 2.3.0 never sees 2.4.0’s obligation', async () => {
  const catalogue = await loadCatalogue(WORKED_EXAMPLE);
  const { obligations } = releaseObligations(
    'RELEASE-PAYMENTS-GATEWAY-1', catalogue, '2026-08-07',
  );
  assert.deepEqual(obligations.map((o) => o.requirement), ['REQUIREMENT-PAYMENT-AVAILABILITY-1']);
});

test('worked example — a closed-window pair is excluded, and still answerable inside its window', async () => {
  const catalogue = await loadCatalogue(WORKED_EXAMPLE);

  const now = releaseObligations('RELEASE-PAYMENTS-GATEWAY-1', catalogue, '2026-08-07');
  assert.ok(
    !now.obligations.some((o) => o.requirement === 'REQUIREMENT-LEGACY-CIPHER-SUITE-1'),
    'withdrawn scope statement must not come back after its valid_to',
  );

  const then = releaseObligations('RELEASE-PAYMENTS-GATEWAY-1', catalogue, '2026-04-01');
  assert.deepEqual(
    then.obligations.map((o) => o.requirement).sort(),
    ['REQUIREMENT-LEGACY-CIPHER-SUITE-1', 'REQUIREMENT-PAYMENT-AVAILABILITY-1'],
    'the REL file was not deleted, so the historical answer survives',
  );

  // ...and 2.4.0 does not inherit the withdrawn one today either.
  const successorNow = releaseObligations('RELEASE-PAYMENTS-GATEWAY-2', catalogue, '2026-08-07');
  assert.ok(!successorNow.obligations.some((o) => o.requirement === 'REQUIREMENT-LEGACY-CIPHER-SUITE-1'));
});

test('as-at date and release are independent axes — a back-dated query sees the then-current scope', async () => {
  const catalogue = await loadCatalogue(WORKED_EXAMPLE);
  // Asking about 2.4.0 as at 2026-04-01 — before it shipped — is a coherent
  // question: what was in scope for this chain as things stood then. The
  // withdrawn statement was current at that date, so it comes back. The query
  // filters on the two windows §3.2 names (relation, REQUIREMENT); it does not
  // additionally require the release to be in effect at the as-at date.
  const { obligations } = releaseObligations(
    'RELEASE-PAYMENTS-GATEWAY-2', catalogue, '2026-04-01',
  );
  assert.deepEqual(
    obligations.map((o) => o.requirement).sort(),
    ['REQUIREMENT-LEGACY-CIPHER-SUITE-1', 'REQUIREMENT-PAYMENT-AVAILABILITY-1'],
  );
  // STRONG-AUTH's relation had not opened yet, so it is absent.
  assert.ok(!obligations.some((o) => o.requirement === 'REQUIREMENT-STRONG-AUTH-1'));
});

test('worked example — release order comes from predecessor, never from version strings', async () => {
  const catalogue = await loadCatalogue(WORKED_EXAMPLE);
  // Strip the link; the version strings still read 2.3.0 / 2.4.0 and must not
  // be consulted to re-establish the chain.
  catalogue.elements.get('RELEASE-PAYMENTS-GATEWAY-2').predecessor = null;
  const { obligations } = releaseObligations(
    'RELEASE-PAYMENTS-GATEWAY-2', catalogue, '2026-08-07',
  );
  assert.deepEqual(obligations.map((o) => o.requirement), ['REQUIREMENT-STRONG-AUTH-1']);
});

// --- negative fixtures: endpoint types (REL-002) ---------------------------

function writeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'relobl-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body, 'utf8');
  }
  return root;
}

const OK_RELEASE = `notation: release
id: RELEASE-X-1
of: APPLICATION-X-1
version: "1.0"
valid_from: "2026-01-01"
valid_to: null
`;

const OK_REQUIREMENT = `notation: requirement
id: REQUIREMENT-X-1
valid_from: "2026-01-01"
valid_to: null
`;

function relFile(from, to) {
  return `notation: relation
id: REL-X-1
type: required_for
from: ${from}
to: ${to}
valid_from: "2026-01-01"
valid_to: null
`;
}

test('negative: a valid pair is the control — no findings, one obligation', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/01_motivation/requirements/REQUIREMENT-X-1.yaml': OK_REQUIREMENT,
    'canon/relations/REL-X-1.yaml': relFile('REQUIREMENT-X-1', 'RELEASE-X-1'),
  });
  try {
    const catalogue = await loadCatalogue(root);
    const r = releaseObligations('RELEASE-X-1', catalogue, '2026-08-07');
    assert.deepEqual(r.findings, []);
    assert.deepEqual(r.obligations.map((o) => o.requirement), ['REQUIREMENT-X-1']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative: wrong `from` TYPE — a GOAL source is REL-002, and is excluded', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/01_motivation/goals/GOAL-X-1.yaml': 'notation: goal\nid: GOAL-X-1\nvalid_from: "2026-01-01"\nvalid_to: null\n',
    'canon/relations/REL-X-1.yaml': relFile('GOAL-X-1', 'RELEASE-X-1'),
  });
  try {
    const catalogue = await loadCatalogue(root);
    const r = releaseObligations('RELEASE-X-1', catalogue, '2026-08-07');
    assert.equal(r.obligations.length, 0, 'a malformed pair is never silently included');
    assert.equal(r.findings.length, 1);
    assert.match(r.findings[0], /^REL-002 REL-X-1: `from` is GOAL-X-1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative: wrong `to` TYPE — an APPLICATION target is REL-002', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/01_motivation/requirements/REQUIREMENT-X-1.yaml': OK_REQUIREMENT,
    'canon/elements/03_application/applications/APPLICATION-X-1.yaml': 'notation: application\nid: APPLICATION-X-1\nvalid_from: "2026-01-01"\nvalid_to: null\n',
    'canon/relations/REL-X-1.yaml': relFile('REQUIREMENT-X-1', 'APPLICATION-X-1'),
  });
  try {
    const catalogue = await loadCatalogue(root);
    // Scoped to the whole subject rather than a release — precisely the
    // modelling error `required_for` exists to prevent.
    const r = releaseObligations('RELEASE-X-1', catalogue, '2026-08-07');
    assert.deepEqual(r.obligations, []);
    // The bad pair names no release in this chain, so it is not this query's
    // business to report — it is still excluded.
    assert.deepEqual(r.findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative: `to` names an id that does not resolve — REL-002, reported', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/01_motivation/requirements/REQUIREMENT-X-1.yaml': OK_REQUIREMENT,
    'canon/relations/REL-X-1.yaml': relFile('REQUIREMENT-X-1', 'RELEASE-X-GONE'),
  });
  try {
    const catalogue = await loadCatalogue(root);
    const r = releaseObligations('RELEASE-X-GONE', catalogue, '2026-08-07');
    assert.deepEqual(r.obligations, []);
    assert.match(r.findings[0], /does not resolve/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative: a retired REQUIREMENT drops out even with an open relation window', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/01_motivation/requirements/REQUIREMENT-X-1.yaml':
      'notation: requirement\nid: REQUIREMENT-X-1\nvalid_from: "2026-01-01"\nvalid_to: "2026-05-31"\n',
    'canon/relations/REL-X-1.yaml': relFile('REQUIREMENT-X-1', 'RELEASE-X-1'),
  });
  try {
    const catalogue = await loadCatalogue(root);
    assert.deepEqual(
      releaseObligations('RELEASE-X-1', catalogue, '2026-08-07').obligations, [],
      'retired obligation is out of scope',
    );
    assert.equal(
      releaseObligations('RELEASE-X-1', catalogue, '2026-05-31').obligations.length, 1,
      'still in scope on its own valid_to',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative: the query subject must be a RELEASE', async () => {
  const catalogue = await loadCatalogue(WORKED_EXAMPLE);
  const r = releaseObligations('APPLICATION-PAYMENTS-GATEWAY-1', catalogue, '2026-08-07');
  assert.deepEqual(r.obligations, []);
  assert.match(r.findings[0], /is a APPLICATION, not a RELEASE/);
});

test('dedup — one requirement attached at two depths is returned once, at the nearest', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/05_implementation/releases/RELEASE-X-2.yaml':
      'notation: release\nid: RELEASE-X-2\nof: APPLICATION-X-1\nversion: "2.0"\npredecessor: RELEASE-X-1\nvalid_from: "2026-02-01"\nvalid_to: null\n',
    'canon/elements/01_motivation/requirements/REQUIREMENT-X-1.yaml': OK_REQUIREMENT,
    'canon/relations/REL-X-1.yaml': relFile('REQUIREMENT-X-1', 'RELEASE-X-1'),
    'canon/relations/REL-X-2.yaml':
      'notation: relation\nid: REL-X-2\ntype: required_for\nfrom: REQUIREMENT-X-1\nto: RELEASE-X-2\nvalid_from: "2026-02-01"\nvalid_to: null\n',
  });
  try {
    const catalogue = await loadCatalogue(root);
    const { obligations } = releaseObligations('RELEASE-X-2', catalogue, '2026-08-07');
    assert.equal(obligations.length, 1);
    assert.deepEqual(obligations[0], {
      requirement: 'REQUIREMENT-X-1',
      attached_to: 'RELEASE-X-2',
      depth: 0,
      inherited: false,
      relation: 'REL-X-2',
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('other relation kinds are ignored — depends_on is not release scope', async () => {
  const root = writeRepo({
    'canon/elements/05_implementation/releases/RELEASE-X-1.yaml': OK_RELEASE,
    'canon/elements/01_motivation/requirements/REQUIREMENT-X-1.yaml': OK_REQUIREMENT,
    'canon/relations/REL-X-9.yaml':
      'notation: relation\nid: REL-X-9\ntype: depends_on\nfrom: REQUIREMENT-X-1\nto: RELEASE-X-1\nvalid_from: "2026-01-01"\nvalid_to: null\n',
  });
  try {
    const catalogue = await loadCatalogue(root);
    const r = releaseObligations('RELEASE-X-1', catalogue, '2026-08-07');
    assert.deepEqual(r.obligations, []);
    assert.deepEqual(r.findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
