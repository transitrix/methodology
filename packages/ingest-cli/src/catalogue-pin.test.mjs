// Unit + integration tests for the L1 pin writer (catalogue.mjs's writeCataloguePin /
// applyCataloguePin — method/05-catalogue-integration.md §4.2, §7).
// Run: node --test packages/ingest-cli/src/catalogue-pin.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeCataloguePin, applyCataloguePin, parseCatalogueDecl, CatalogueError } from './catalogue.mjs';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'catalogue-pin-test-'));
}

const BASE_MANIFEST = 'transitrix: 1\nmethodology_version: "3.4.0"\nnotations: [dgca]\nzones: [canon]\n';

test('writeCataloguePin appends a well-formed block to manifest text with no existing pin', () => {
  const out = writeCataloguePin(BASE_MANIFEST, { source: 'acme/architecture', version: '1.0.0', path: 'vendor/catalogue/architecture-1.0.0.yaml' });
  assert.ok(out.startsWith(BASE_MANIFEST));
  const decl = parseCatalogueDecl(out);
  assert.deepEqual(decl, { source: 'acme/architecture', version: '1.0.0', path: 'vendor/catalogue/architecture-1.0.0.yaml' });
});

test('writeCataloguePin refuses when a catalogue: field is already declared', () => {
  const already = BASE_MANIFEST + 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: vendor/catalogue/architecture-1.0.0.yaml\n';
  assert.throws(
    () => writeCataloguePin(already, { source: 'acme/architecture', version: '2.0.0', path: 'vendor/catalogue/architecture-2.0.0.yaml' }),
    CatalogueError
  );
});

test('writeCataloguePin refuses when catalogue: is present but malformed', () => {
  const malformed = BASE_MANIFEST + 'catalogue: not-a-map\n';
  assert.throws(() => writeCataloguePin(malformed, { source: 'acme/architecture', version: '1.0.0', path: 'x.yaml' }), CatalogueError);
});

test('writeCataloguePin requires all three fields', () => {
  assert.throws(() => writeCataloguePin(BASE_MANIFEST, { source: 'acme/architecture', version: '1.0.0' }), CatalogueError);
});

test('writeCataloguePin is idempotent-detecting: calling it twice on the first result throws (no silent overwrite)', () => {
  const once = writeCataloguePin(BASE_MANIFEST, { source: 'acme/architecture', version: '1.0.0', path: 'x.yaml' });
  assert.throws(() => writeCataloguePin(once, { source: 'acme/architecture', version: '1.0.0', path: 'x.yaml' }), CatalogueError);
});

test('applyCataloguePin writes the pin into transitrix.yaml on disk', async () => {
  const root = tmpOrgRoot();
  writeFileSync(join(root, 'transitrix.yaml'), BASE_MANIFEST, 'utf8');
  const res = await applyCataloguePin(root, { source: 'acme/architecture', version: '1.0.0', path: 'vendor/catalogue/architecture-1.0.0.yaml' });
  assert.equal(res.source, 'acme/architecture');
  const written = readFileSync(join(root, 'transitrix.yaml'), 'utf8');
  const decl = parseCatalogueDecl(written);
  assert.deepEqual(decl, { source: 'acme/architecture', version: '1.0.0', path: 'vendor/catalogue/architecture-1.0.0.yaml' });
});

test('applyCataloguePin errors when transitrix.yaml does not exist', async () => {
  const root = tmpOrgRoot();
  await assert.rejects(
    applyCataloguePin(root, { source: 'acme/architecture', version: '1.0.0', path: 'x.yaml' }),
    CatalogueError
  );
});

test('applyCataloguePin does not touch the manifest when a pin is already declared', async () => {
  const root = tmpOrgRoot();
  const already = BASE_MANIFEST + 'catalogue:\n  source: acme/architecture\n  version: "1.0.0"\n  path: x.yaml\n';
  writeFileSync(join(root, 'transitrix.yaml'), already, 'utf8');
  await assert.rejects(
    applyCataloguePin(root, { source: 'acme/architecture', version: '2.0.0', path: 'y.yaml' }),
    CatalogueError
  );
  const stillThere = readFileSync(join(root, 'transitrix.yaml'), 'utf8');
  assert.equal(stillThere, already);
});
