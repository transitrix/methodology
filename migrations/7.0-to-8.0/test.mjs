import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const recipe = fileURLToPath(new URL('.', import.meta.url));
const run = (script, root, ...flags) => spawnSync(process.execPath, [join(recipe, script), ...flags, root], { encoding: 'utf8' });
test('dry-run, fixture result, idempotence and opaque model bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'migration-7-8-'));
  try {
    cpSync(join(recipe, 'fixtures/before'), root, { recursive: true });
    const model = Buffer.from([0, 255, 1, 35, 10]);
    writeFileSync(join(root, 'original.bin'), model);
    const before = readFileSync(join(root, 'transitrix.yaml'));
    assert.equal(run('codemod.mjs', root, '--dry-run').status, 0);
    assert.deepEqual(readFileSync(join(root, 'transitrix.yaml')), before);
    assert.equal(run('validate.mjs', root).status, 1);
    assert.equal(run('codemod.mjs', root).status, 0);
    const after = readFileSync(join(root, 'transitrix.yaml'));
    assert.deepEqual(after, readFileSync(join(recipe, 'fixtures/after/transitrix.yaml')));
    assert.equal(run('codemod.mjs', root).status, 0);
    assert.deepEqual(readFileSync(join(root, 'transitrix.yaml')), after);
    assert.deepEqual(readFileSync(join(root, 'original.bin')), model);
    assert.equal(run('validate.mjs', root).status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('ambiguous versions, duplicate pins and symlink manifest never write', () => {
  const root = mkdtempSync(join(tmpdir(), 'migration-7-8-reject-'));
  try {
    for (const text of ['methodology_version: "6.0.0"\n', 'methodology_version: "7.0.0"\n"methodology_version": "6.0.0"\n', 'methodology_version: "7.0.0"\nmethodology_version: "8.0.0"\n']) {
      writeFileSync(join(root, 'transitrix.yaml'), text);
      assert.equal(run('codemod.mjs', root).status, 1);
      assert.equal(readFileSync(join(root, 'transitrix.yaml'), 'utf8'), text);
    }
    rmSync(join(root, 'transitrix.yaml'));
    writeFileSync(join(root, 'original.yaml'), 'methodology_version: "7.0.0"\n');
    symlinkSync('original.yaml', join(root, 'transitrix.yaml'));
    assert.equal(run('codemod.mjs', root).status, 2);
    assert.equal(run('validate.mjs', root).status, 2);
    assert.equal(readFileSync(join(root, 'original.yaml'), 'utf8'), 'methodology_version: "7.0.0"\n');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
