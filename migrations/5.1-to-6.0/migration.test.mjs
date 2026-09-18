import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
function run(script, root, ...args) {
  return spawnSync(process.execPath, [join(here, script), ...args, root], { encoding: 'utf8' });
}
function snapshot(root) {
  return Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile()).map(e => {
      const path = join(e.parentPath ?? e.path, e.name);
      return [path.slice(root.length), readFileSync(path, 'utf8')];
    }));
}

test('migration preserves knowledge bytes, previews, and is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'migration-6-'));
  try {
    cpSync(join(here, 'fixtures/before'), root, { recursive: true });
    const before = snapshot(root);
    assert.equal(run('validate.mjs', root).status, 1);
    assert.equal(run('codemod.mjs', root, '--dry-run').status, 0);
    assert.deepEqual(snapshot(root), before);
    assert.equal(run('codemod.mjs', root).status, 0);
    assert.deepEqual(snapshot(root), snapshot(join(here, 'fixtures/after')));
    const after = snapshot(root);
    assert.equal(run('codemod.mjs', root).status, 0);
    assert.deepEqual(snapshot(root), after);
    const valid = run('validate.mjs', root);
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    const predecessor = join(root, 'knowledge/order-fulfilment-bottleneck.md');
    writeFileSync(predecessor, readFileSync(predecessor, 'utf8').replace(/^superseded_by:.*\n/m, ''));
    const invalid = run('validate.mjs', root);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /KS-019/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('unsupported and duplicate pins are refused without mutation; CRLF is preserved', () => {
  const root = mkdtempSync(join(tmpdir(), 'migration-6-'));
  try {
    const file = join(root, 'transitrix.yaml');
    for (const text of ['methodology_version: "5.0.0"\n', 'methodology_version: "5.1.0"\nmethodology_version: "5.1.0"\n']) {
      writeFileSync(file, text);
      assert.equal(run('codemod.mjs', root).status, 1);
      assert.equal(readFileSync(file, 'utf8'), text);
    }
    const text = "# preserve\r\nmethodology_version: '5.1.0' # pin\r\nzones: [canon]\r\n";
    writeFileSync(file, text);
    assert.equal(run('codemod.mjs', root).status, 0);
    assert.equal(readFileSync(file, 'utf8'), text.replace('5.1.0', '6.0.0'));
    assert.equal(run('codemod.mjs', join(root, 'missing')).status, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
