// Unit tests for canon.mjs's alias-uniqueness gate (ELEM-ALIAS-001) and its TERM
// extension (ELEMENT_PRIMITIVES.md §7.30/§9, transitrix-hq#118).
//
// Run: node --test packages/ingest-cli/src/canon.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCanonIndex } from './canon.mjs';

function tmpOrgRoot() {
  return mkdtempSync(join(tmpdir(), 'canon-test-'));
}

function writeElement(root, layer, folder, id, name, extra = '') {
  const dir = join(root, 'canon', 'elements', layer, folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.yaml`), `id: ${id}\nname: "${name}"\n${extra}`, 'utf8');
}

test('buildCanonIndex: two different elements sharing a plain name is NOT a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '01_motivation', 'stakeholders', 'STAKEHOLDER-1', 'Operations');
  writeElement(root, '02_business', 'actors', 'ACTOR-1', 'Operations');
  const { collisions } = await buildCanonIndex(root);
  assert.deepEqual(collisions, []);
});

test('buildCanonIndex: an alias colliding with another element\'s name IS a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'business-objects', 'BUSINESS_OBJECT-1', 'Customer Order');
  writeElement(root, '02_business', 'roles', 'ROLE-1', 'Order Desk', 'aliases:\n  - "Customer Order"\n');
  const { collisions } = await buildCanonIndex(root);
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].value, 'Customer Order');
});

test('buildCanonIndex: a TERM restating another element\'s plain name IS a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'business-objects', 'BUSINESS_OBJECT-1', 'Customer Order');
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Customer Order');
  const { collisions } = await buildCanonIndex(root);
  assert.equal(collisions.length, 1);
  assert.deepEqual([collisions[0].a, collisions[0].b].sort(), ['BUSINESS_OBJECT-1', 'TERM-1']);
});

test('buildCanonIndex: a TERM admitted first, then a plain-named element reusing it, IS a collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Data Residency');
  writeElement(root, '01_motivation', 'requirements', 'REQUIREMENT-1', 'Data Residency');
  const { collisions } = await buildCanonIndex(root);
  assert.equal(collisions.length, 1);
});

test('buildCanonIndex: two different TERMs is still not a collision when names differ', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Data Residency');
  writeElement(root, '02_business', 'terms', 'TERM-2', 'Data Localisation');
  const { collisions } = await buildCanonIndex(root);
  assert.deepEqual(collisions, []);
});

test('buildCanonIndex: a TERM re-using its own name/alias is not a self-collision', async () => {
  const root = tmpOrgRoot();
  writeElement(root, '02_business', 'terms', 'TERM-1', 'Data Residency', 'aliases:\n  - "Data Residency"\n');
  const { collisions } = await buildCanonIndex(root);
  assert.deepEqual(collisions, []);
});
