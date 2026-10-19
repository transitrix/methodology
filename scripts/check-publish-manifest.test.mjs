import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { undeclaredPaths, validateManifest } from './check-publish-manifest.mjs';

const manifest = JSON.parse(readFileSync(new URL('../publish-manifest.json', import.meta.url)));
const historicalPaths = ['scripts/README.md', 'scripts/generate-action-progress.py'];

test('current tracked repository surface is declared', () => {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  assert.deepEqual(undeclaredPaths(paths, manifest), []);
});
test('historical added paths are refused without their removed contents', () => {
  assert.deepEqual(undeclaredPaths(historicalPaths, manifest), [...historicalPaths].sort());
});
test('new ordinary file and similarly named sibling are denied by default', () => {
  assert.deepEqual(undeclaredPaths(['README.md', 'README.md.extra', 'scripts/new-file.mjs'], manifest), ['README.md.extra', 'scripts/new-file.mjs']);
});
test('malformed, wildcard, directory, duplicate and traversing declarations fail closed', () => {
  for (const files of [[], ['*'], ['scripts/**'], ['scripts/'], ['../README.md'], ['/README.md'], ['a/./b'], ['a\\b'], ['README.md', 'README.md'], ['a\nb']]) {
    assert.throws(() => validateManifest({ schema: 'publish-manifest/v1', files }));
  }
  assert.throws(() => validateManifest({ schema: 'unknown', files: ['README.md'] }));
});
test('CLI returns failure for exact historical additions and missing manifest', () => {
  const root = mkdtempSync(join(tmpdir(), 'publish-manifest-'));
  const script = fileURLToPath(new URL('./check-publish-manifest.mjs', import.meta.url));
  const run = () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    writeFileSync(join(root, 'README.md'), 'fixture');
    writeFileSync(join(root, 'publish-manifest.json'), JSON.stringify({ schema: 'publish-manifest/v1', files: ['README.md', 'publish-manifest.json'] }));
    execFileSync('git', ['add', '.'], { cwd: root });
    assert.equal(run().status, 0);
    mkdirSync(join(root, 'scripts'));
    for (const path of historicalPaths) writeFileSync(join(root, path), 'fixture');
    execFileSync('git', ['add', '.'], { cwd: root });
    const denied = run();
    assert.equal(denied.status, 1);
    for (const path of historicalPaths) assert.ok(denied.stderr.includes(path));
    rmSync(join(root, 'publish-manifest.json'));
    assert.equal(run().status, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
