// Unit tests for canon.mjs's alias-uniqueness gate (ELEM-ALIAS-001) and its TERM
// extension (ELEMENT_PRIMITIVES.md §7.30/§9, transitrix-hq#118).
//
// Run: node --test packages/ingest-cli/src/canon.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCanonIndex } from './canon.mjs';
// The list reader is shared by canon indexing and catalogue surface matching.
import { readTopList, dump } from './yaml.mjs';
import { collectLocalElements } from './catalogue.mjs';
import { spawnSync } from 'node:child_process';
import { PRESETS_VERSION } from './coverage-presets.mjs';
import { fileURLToPath } from 'node:url';

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

for (const indent of ['', '  ', '    ']) {
  for (const newline of ['\n', '\r\n']) {
    test(`alias lists: indent ${indent.length}, ${JSON.stringify(newline)}`, async (t) => {
      const list = (value) => [
        'aliases: # surface forms', '# comment before first item',
        `${indent}- "${value}" # comment`, '', `${indent}# comment between items`,
        `${indent}- "Other"`, 'tags:', '- unrelated', 'name: Next', '',
      ].join(newline);
      assert.deepEqual(readTopList(list('Alpha'), 'aliases'), ['Alpha', 'Other']);
      const root = tmpOrgRoot();
      t.after(() => rmSync(root, { recursive: true, force: true }));
      writeElement(root, '02_business', 'actors', 'ACTOR-1', 'First', list('Alpha'));
      writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', `aliases:${newline}${indent}- Alpha${newline}`);
      const index = await buildCanonIndex(root);
      assert.equal(index.nameMap.get('alpha').matched_on, 'alias');
      assert.equal(index.nameMap.has('unrelated'), false);
      assert.equal(index.collisions.length, 1);
      assert.deepEqual((await collectLocalElements(root)).map(e => e.aliases), [['Alpha', 'Other'], ['Alpha']]);
      writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', `aliases:${newline}${indent}- Unique${newline}`);
      assert.deepEqual((await buildCanonIndex(root)).collisions, []);
    });
  }
}

test('alias lists: empty, absent, quotes, comments and emitter round trip', () => {
  assert.deepEqual(readTopList('tags:\n- unrelated\n', 'aliases'), []);
  assert.deepEqual(readTopList('aliases: [] # empty\ntags:\n- unrelated\n', 'aliases'), []);
  const aliases = ['Alpha', 'A "quote"', 'C:\\data', "Owner's name", 'A # B', 'null', '123'];
  assert.deepEqual(readTopList(dump({ aliases }), 'aliases'), aliases);
  assert.deepEqual(readTopList("aliases:\n- 'Owner''s name' # comment\n- Alpha#Beta\n- nullify\n", 'aliases'), ["Owner's name", 'Alpha#Beta', 'nullify']);
  assert.deepEqual(readTopList('aliases:\n- 3D model\n', 'aliases'), ['3D model']);
});

const unsupportedAliases = [
  'aliases : [Alpha]', '"aliases": [Alpha]', 'aliases: [Alpha]', 'aliases: Alpha', 'aliases: {}', 'aliases: null',
  'aliases:\n', 'aliases:\n- Alpha\n  - Beta', 'aliases:\n\t- Alpha',
  'aliases:\n- Alpha\n- key: value', 'aliases:\n- Alpha\n- [Beta]',
  'aliases:\n- Alpha\n- |\n  Beta', 'aliases:\n- Alpha\n  continuation',
  'aliases:\n- Alpha\n- *ref', 'aliases:\n- &ref Alpha', 'aliases:\n- !str Alpha',
  'aliases:\n- "unclosed', "aliases:\n- 'unclosed", 'aliases:\n- "Alpha" trailing',
  'aliases:\n- "bad\\q"', 'aliases:\n-', 'aliases:\n- null', 'aliases:\n- 123',
  'aliases:\n- true', 'aliases: []\n- Alpha', 'aliases:\n- Alpha\naliases: []',
];
for (const text of unsupportedAliases) {
  test(`alias lists reject unsupported input: ${JSON.stringify(text)}`, async (t) => {
    assert.throws(() => readTopList(text, 'aliases'), /Unsupported YAML list for aliases/);
    const root = tmpOrgRoot();
    t.after(() => rmSync(root, { recursive: true, force: true }));
    writeElement(root, '02_business', 'actors', 'ACTOR-1', 'First', `${text}\n`);
    await assert.rejects(buildCanonIndex(root), /Unsupported YAML list for aliases/);
    await assert.rejects(collectLocalElements(root), /Unsupported YAML list for aliases/);
  });
}

test('repo-check CLI: layout parity, unique negative control and unsupported non-success', (t) => {
  const root = tmpOrgRoot();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'transitrix.yaml'), `methodology_version: "${PRESETS_VERSION}"\ncoverage_profile: core\n`);
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('../ingest.mjs', import.meta.url)), 'repo-check', root], { encoding: 'utf8' });
  for (const indent of ['', '  ']) {
    for (const [alias, count] of [['Alpha', 1], ['Unique', 0]]) {
      writeElement(root, '02_business', 'actors', 'ACTOR-1', 'First', `aliases:\n${indent}- Alpha\n`);
      writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', `aliases:\n${indent}- ${alias}\n`);
      const result = run();
      assert.equal(result.status, 0, result.stderr); // report-only collision contract
      assert.match(result.stdout, new RegExp(`alias_collisions: ${count}`));
    }
  }
  writeElement(root, '02_business', 'actors', 'ACTOR-2', 'Second', 'aliases: [Alpha]\n');
  const result = run();
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Unsupported YAML list for aliases/);
});
