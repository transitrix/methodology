// Unit + integration tests for the L1 catalogue-integration loader and diff
// (catalogue.mjs — method/05-catalogue-integration.md §6, CONTRACT.md §17).
// Run: node --test packages/ingest-cli/src/catalogue.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseCatalogueDecl,
  parseCatalogueSlice,
  loadCatalogueSlice,
  collectLocalElements,
  findVocabularyDivergence,
  catalogueCheck,
  CatalogueError,
} from './catalogue.mjs';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'catalogue-test-'));
}

function sliceText(version, elementsYaml) {
  return `version: "${version}"\nelements:\n${elementsYaml}`;
}

const ONE_ELEMENT_SLICE = sliceText('1.0.0',
  '  - id: TERM-001\n' +
  '    type: TERM\n' +
  '    name: "Capability"\n' +
  '    aliases: [Competency]\n' +
  '    description: "A shared capability term."\n'
);

const TWO_ELEMENT_SLICE = sliceText('1.0.0',
  '  - id: TERM-001\n' +
  '    type: TERM\n' +
  '    name: "Capability"\n' +
  '    aliases: [Competency]\n' +
  '    description: "A shared capability term."\n' +
  '  - id: TERM-002\n' +
  '    type: TERM\n' +
  '    name: "Capacity"\n' +
  '    aliases: [Competency]\n' +
  '    description: "A different central term, same alias."\n'
);

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

// readTopList (yaml.mjs) only understands the block-list shape adopter canon files
// actually use (`key:\n  - item`), not an inline `[a, b]` — so array fields are
// emitted in block form here to match what collectLocalElements will parse.
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

// ── parseCatalogueDecl ───────────────────────────────────────────────────

test('parseCatalogueDecl: absent field returns null (valid — L0/pre-L1)', () => {
  assert.equal(parseCatalogueDecl('methodology_version: "3.4.0"\n'), null);
});

test('parseCatalogueDecl: well-formed map parses', () => {
  const decl = parseCatalogueDecl('catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  assert.deepEqual(decl, { source: 'acme/architecture', version: '1.0.0', path: 'vendor/catalogue.yaml' });
});

test('parseCatalogueDecl: missing a required key is malformed, not absent', () => {
  const decl = parseCatalogueDecl('catalogue:\n  source: acme/architecture\n  path: vendor/catalogue.yaml\n');
  assert.equal(decl.malformed, true);
  assert.match(decl.reason, /version/);
});

test('parseCatalogueDecl: an inline scalar value is malformed, not absent', () => {
  const decl = parseCatalogueDecl('catalogue: bogus\n');
  assert.equal(decl.malformed, true);
});

// ── parseCatalogueSlice ──────────────────────────────────────────────────

test('parseCatalogueSlice: a well-formed slice parses its elements', () => {
  const slice = parseCatalogueSlice(ONE_ELEMENT_SLICE);
  assert.equal(slice.version, '1.0.0');
  assert.deepEqual(slice.elements, [
    { id: 'TERM-001', type: 'TERM', name: 'Capability', aliases: ['Competency'], description: 'A shared capability term.' },
  ]);
});

test('parseCatalogueSlice: missing top-level version throws', () => {
  assert.throws(() => parseCatalogueSlice('elements:\n  - id: TERM-001\n    type: TERM\n    name: "X"\n'), CatalogueError);
});

test('parseCatalogueSlice: missing elements list throws', () => {
  assert.throws(() => parseCatalogueSlice('version: "1.0.0"\n'), CatalogueError);
});

test('parseCatalogueSlice: an element entry missing a required field throws', () => {
  const bad = 'version: "1.0.0"\nelements:\n  - id: TERM-001\n    name: "X"\n'; // missing `type`
  assert.throws(() => parseCatalogueSlice(bad), CatalogueError);
});

// ── loadCatalogueSlice — fails closed ────────────────────────────────────

test('loadCatalogueSlice: no `catalogue:` pin returns null, not an error (L0)', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  const result = await loadCatalogueSlice(root);
  assert.equal(result, null);
});

test('loadCatalogueSlice: a pin whose path does not exist throws', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  await assert.rejects(() => loadCatalogueSlice(root), CatalogueError);
});

test('loadCatalogueSlice: unparseable slice content throws', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', 'not a valid slice\n');
  await assert.rejects(() => loadCatalogueSlice(root), CatalogueError);
});

test('loadCatalogueSlice: a version mismatch between the pin and the slice throws', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "2.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', ONE_ELEMENT_SLICE); // slice declares 1.0.0
  await assert.rejects(() => loadCatalogueSlice(root), CatalogueError);
});

test('loadCatalogueSlice: a matching pin + slice loads clean', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', ONE_ELEMENT_SLICE);
  const result = await loadCatalogueSlice(root);
  assert.equal(result.version, '1.0.0');
  assert.equal(result.elements.length, 1);
});

// ── collectLocalElements ─────────────────────────────────────────────────

test('collectLocalElements: reads id/name/aliases/canon_id off canon files', async () => {
  const root = tmpOrgRoot();
  writeCanonElement(root, 'GOAL-1.yaml', { id: 'GOAL-1', name: 'Reduce cost', aliases: ['Cut cost'] });
  const elements = await collectLocalElements(root);
  assert.equal(elements.length, 1);
  assert.equal(elements[0].id, 'GOAL-1');
  assert.equal(elements[0].name, 'Reduce cost');
  assert.deepEqual(elements[0].aliases, ['Cut cost']);
  assert.equal(elements[0].canon_id, null);
});

test('collectLocalElements: an absent canon/ yields an empty list, not a throw', async () => {
  const root = tmpOrgRoot();
  const elements = await collectLocalElements(root);
  assert.deepEqual(elements, []);
});

// ── findVocabularyDivergence — pure diff ─────────────────────────────────

test('findVocabularyDivergence: a clean repo (no surface-form overlap) reports nothing', () => {
  const local = [{ id: 'GOAL-1', name: 'Reduce cost', aliases: [], canon_id: null }];
  const central = [{ id: 'TERM-001', name: 'Capability', aliases: [], type: 'TERM' }];
  const result = findVocabularyDivergence(local, central);
  assert.deepEqual(result, { collisions: [], unbound_matches: [] });
});

test('findVocabularyDivergence: an unbound local element matching a central term is an unbound_match', () => {
  const local = [{ id: 'CAPABILITY-1', name: 'Capability', aliases: [], canon_id: null }];
  const central = [{ id: 'TERM-001', name: 'Capability', aliases: [], type: 'TERM' }];
  const result = findVocabularyDivergence(local, central);
  assert.equal(result.collisions.length, 0);
  assert.deepEqual(result.unbound_matches, [{ local_id: 'CAPABILITY-1', central_ids: ['TERM-001'] }]);
});

test('findVocabularyDivergence: a bound local element matching ONLY its own canon_id target is clean', () => {
  const local = [{ id: 'CAPABILITY-1', name: 'Capability', aliases: [], canon_id: 'TERM-001' }];
  const central = [{ id: 'TERM-001', name: 'Capability', aliases: [], type: 'TERM' }];
  const result = findVocabularyDivergence(local, central);
  assert.deepEqual(result, { collisions: [], unbound_matches: [] });
});

test('findVocabularyDivergence: a bound local element matching a DIFFERENT central element is a collision', () => {
  const local = [{ id: 'CAPABILITY-1', name: 'Capability', aliases: [], canon_id: 'TERM-999' }];
  const central = [{ id: 'TERM-001', name: 'Capability', aliases: [], type: 'TERM' }];
  const result = findVocabularyDivergence(local, central);
  assert.deepEqual(result.collisions, [{ local_id: 'CAPABILITY-1', central_ids: ['TERM-001'] }]);
  assert.equal(result.unbound_matches.length, 0);
});

test('findVocabularyDivergence: unambiguous locally, ambiguous centrally — still reported (acceptance case)', () => {
  // One local element, no binding, whose alias matches TWO different central elements.
  const local = [{ id: 'CAPABILITY-1', name: 'Competency', aliases: [], canon_id: null }];
  const central = [
    { id: 'TERM-001', name: 'Capability', aliases: ['Competency'], type: 'TERM' },
    { id: 'TERM-002', name: 'Capacity', aliases: ['Competency'], type: 'TERM' },
  ];
  const result = findVocabularyDivergence(local, central);
  assert.equal(result.unbound_matches.length, 1);
  assert.deepEqual(result.unbound_matches[0].central_ids, ['TERM-001', 'TERM-002']);
});

test('findVocabularyDivergence: idempotent — running twice on the same input yields the same result', () => {
  const local = [
    { id: 'CAPABILITY-1', name: 'Capability', aliases: ['Competency'], canon_id: null },
    { id: 'CAPABILITY-2', name: 'Capacity', aliases: [], canon_id: 'TERM-999' },
  ];
  const central = [
    { id: 'TERM-001', name: 'Capability', aliases: ['Competency'], type: 'TERM' },
    { id: 'TERM-002', name: 'Capacity', aliases: [], type: 'TERM' },
  ];
  const first = findVocabularyDivergence(local, central);
  const second = findVocabularyDivergence(local, central);
  assert.deepEqual(first, second);
});

// ── catalogueCheck — end-to-end orchestrator ─────────────────────────────

test('catalogueCheck: no pin returns null', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, '');
  const result = await catalogueCheck(root);
  assert.equal(result, null);
});

test('catalogueCheck: a pin present with a bad path throws (fails closed)', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  await assert.rejects(() => catalogueCheck(root), CatalogueError);
});

test('catalogueCheck: end-to-end collision surfaces through the full pipeline', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', TWO_ELEMENT_SLICE);
  writeCanonElement(root, 'CAPABILITY-1.yaml', { id: 'CAPABILITY-1', name: 'Competency', canon_id: 'TERM-001' });
  const result = await catalogueCheck(root);
  assert.deepEqual(result.pin, { source: 'acme/architecture', version: '1.0.0' });
  assert.deepEqual(result.collisions, [{ local_id: 'CAPABILITY-1', central_ids: ['TERM-002'] }]);
  assert.equal(result.unbound_matches.length, 0);
});

test('catalogueCheck: end-to-end unbound-match surfaces through the full pipeline', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', ONE_ELEMENT_SLICE);
  writeCanonElement(root, 'CAPABILITY-1.yaml', { id: 'CAPABILITY-1', name: 'Capability' });
  const result = await catalogueCheck(root);
  assert.deepEqual(result.unbound_matches, [{ local_id: 'CAPABILITY-1', central_ids: ['TERM-001'] }]);
  assert.equal(result.collisions.length, 0);
});

test('catalogueCheck: idempotent end-to-end — running twice against unchanged input reports the same thing', async () => {
  const root = tmpOrgRoot();
  writeManifest(root, 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue.yaml\n');
  writeSlice(root, 'vendor/catalogue.yaml', ONE_ELEMENT_SLICE);
  writeCanonElement(root, 'CAPABILITY-1.yaml', { id: 'CAPABILITY-1', name: 'Capability' });
  const first = await catalogueCheck(root);
  const second = await catalogueCheck(root);
  assert.deepEqual(first, second);
});
