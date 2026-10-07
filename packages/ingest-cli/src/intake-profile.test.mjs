import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkIntakeProfile, selectIntakeProfile } from './intake-profile.mjs';
import { scaffoldIntake } from './intake.mjs';

const cli = fileURLToPath(new URL('../ingest.mjs', import.meta.url));
const profileCli = fileURLToPath(new URL('../intake-profile.mjs', import.meta.url));
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const git = (root, ...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'intake-profile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(git(root, 'init', '-q').status, 0);
  // Isolate test ignore rules from developer machine configuration.
  assert.equal(git(root, 'config', 'core.excludesFile', '/dev/null').status, 0);
  return root;
}
async function put(root, path, text = '') {
  await mkdir(join(root, path, '..'), { recursive: true });
  await writeFile(join(root, path), text);
}
async function snapshot(root) {
  const result = {};
  async function walk(dir) {
    for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const path = join(dir, entry.name);
      result[path] = entry.isDirectory() ? 'directory' : (await readFile(join(root, path))).toString('base64');
      if (entry.isDirectory()) await walk(path);
    }
  }
  await walk('');
  return result;
}
const okf = '---\ntype: source-document\nsource: original.md\n---\nSource summary\n';

test('empty selection is explicit, read-only check stays read-only, scaffold is idempotent', async t => {
  const root = await workspace(t);
  const before = await snapshot(root);
  await checkIntakeProfile(root, 'ingest');
  await checkIntakeProfile(root, 'knowledge-store');
  assert.deepEqual(await snapshot(root), before);
  await scaffoldIntake(root);
  const after = await snapshot(root);
  await scaffoldIntake(root);
  assert.deepEqual(await snapshot(root), after);
  assert.equal(JSON.parse(await readFile(join(root, '_intake/profile.json'))).profile, 'ingest');
  await assert.rejects(selectIntakeProfile(root, 'knowledge-store'), /profile conflict/);
  assert.deepEqual(await snapshot(root), after);
});

test('OKF selection refuses ingest setup and preserves source and original bytes', async t => {
  const root = await workspace(t);
  await selectIntakeProfile(root, 'knowledge-store');
  await put(root, '_intake/processed/source.md', okf);
  await put(root, '_intake/originals/source.txt', 'retained original');
  const before = await snapshot(root);
  await checkIntakeProfile(root, 'knowledge-store');
  const run = spawnSync(process.execPath, [cli, 'scaffold-intake', root], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /separate workspaces/);
  assert.deepEqual(await snapshot(root), before);
});

for (const [path, content, requested] of [
  ['_intake/processed/source.md', okf, 'ingest'],
  ['knowledge/index.md', '# Knowledge', 'ingest'],
  ['_intake/originals/source.txt', 'original', 'ingest'],
  ['_intake/drafts/draft.md', 'draft', 'ingest'],
  ['_intake/log.md', 'log', 'ingest'],
  ['_intake/processing/candidate.yaml', 'pending', 'knowledge-store'],
  ['_intake/snapshots/regulation.txt', 'raw', 'knowledge-store'],
  ['operations/config/scan-sources.yaml', 'sources: []', 'knowledge-store'],
  ['_intake/processed/raw.txt', 'raw', 'knowledge-store'],
  ['_intake/unknown/data', 'unknown', 'ingest'],
]) test(`legacy evidence ${path} refuses ${requested} without writes`, async t => {
  const root = await workspace(t);
  await put(root, path, content);
  const before = await snapshot(root);
  await assert.rejects(selectIntakeProfile(root, requested), /profile conflict/);
  assert.deepEqual(await snapshot(root), before);
});

test('mixed evidence refuses both profiles even with a matching marker', async t => {
  const root = await workspace(t);
  await selectIntakeProfile(root, 'ingest');
  await put(root, '_intake/processed/source.md', okf);
  await put(root, '_intake/processing/raw.txt', 'raw');
  const before = await snapshot(root);
  for (const profile of ['ingest', 'knowledge-store']) {
    await assert.rejects(selectIntakeProfile(root, profile), /profile conflict/);
  }
  assert.deepEqual(await snapshot(root), before);
});

for (const [path, ignore] of [
  ['.gitignore', '_intake/processed/*\n'],
  ['_intake/.gitignore', 'processed/\n'],
  ['_intake/processed/.gitignore', '*.md\n'],
  ['.git/info/exclude', '_intake/processed/**\n'],
]) test(`OKF refuses effective ignore rules in ${path}`, async t => {
  const root = await workspace(t);
  await put(root, path, ignore);
  const before = await snapshot(root);
  await assert.rejects(selectIntakeProfile(root, 'knowledge-store'), /profile conflict/);
  assert.deepEqual(await snapshot(root), before);
});

test('Git negation permits OKF; ignored tracked records are still refused', async t => {
  const root = await workspace(t);
  await put(root, '.gitignore', '_intake/processed/*\n!_intake/processed/*.md\n');
  await put(root, '_intake/processed/source.md', okf);
  assert.equal(git(root, 'add', '_intake/processed/source.md').status, 0);
  await checkIntakeProfile(root, 'knowledge-store');
  await put(root, '.gitignore', '_intake/processed/source.md\n');
  await assert.rejects(checkIntakeProfile(root, 'knowledge-store'), /would be ignored/);
});

test('invalid marker, unknown selection, and symlink fail closed', async t => {
  const root = await workspace(t);
  await assert.rejects(selectIntakeProfile(root, 'unknown'), /Choose --profile/);
  await put(root, '_intake/profile.json', '{broken');
  await assert.rejects(selectIntakeProfile(root, 'ingest'));
  await rm(join(root, '_intake/profile.json'));
  await mkdir(join(root, 'elsewhere'));
  await symlink(join(root, 'elsewhere'), join(root, '_intake/processed'));
  await assert.rejects(scaffoldIntake(root), /symlink/);
  assert.deepEqual(await readdir(join(root, 'elsewhere')), []);
});

for (const profile of ['ingest', 'knowledge-store']) {
  for (const tracked of [false, true]) test(`${profile} refuses an ignored ${tracked ? 'tracked' : 'new'} marker without writes`, async t => {
    const root = await workspace(t);
    await put(root, '_intake/inbox/source.txt', 'retain these bytes');
    if (tracked) {
      await selectIntakeProfile(root, profile);
      assert.equal(git(root, 'add', '_intake/profile.json').status, 0);
    }
    await put(root, '.gitignore', '_intake/profile.json\n');
    const before = await snapshot(root);
    await assert.rejects(checkIntakeProfile(root, profile), /profile marker would be ignored/);
    await assert.rejects(selectIntakeProfile(root, profile), /profile marker would be ignored/);
    assert.deepEqual(await snapshot(root), before);
  });

  test(`${profile} permits an explicitly unignored marker`, async t => {
    const root = await workspace(t);
    await put(root, '.gitignore', '_intake/*.json\n!_intake/profile.json\n');
    await selectIntakeProfile(root, profile);
    assert.equal(JSON.parse(await readFile(join(root, '_intake/profile.json'))).profile, profile);
  });

  test(`${profile} selection requires Git visibility verification`, async t => {
    const root = await workspace(t);
    await rm(join(root, '.git'), { recursive: true });
    await assert.rejects(selectIntakeProfile(root, profile), /Git workspace/);
    assert.deepEqual(await readdir(root), []);
  });
}

test('reg-intel daily driver refuses OKF before invoking hooks or its CLI', async t => {
  const root = await workspace(t);
  await selectIntakeProfile(root, 'knowledge-store');
  const bin = join(root, 'bin');
  await mkdir(bin);
  const launcher = join(bin, 'transitrix-intake-profile');
  const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  await writeFile(launcher, `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(profileCli)} \"$@\"\n`);
  await chmod(launcher, 0o755);
  const before = await snapshot(root);
  const run = spawnSync('bash', [join(repo, 'transitrix/skills/reg-intel/templates/reg-intel-daily.sh'), root], {
    encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /profile conflict/);
  assert.deepEqual(await snapshot(root), before);
});

for (const conflict of [null, 'ignored-marker', 'OKF-record']) {
  test(`legacy daily driver selects before its CLI or refuses unchanged: ${conflict || 'compatible'}`, async t => {
    const root = await workspace(t);
    await put(root, 'operations/config/scan-sources.yaml', 'sources: []\n');
    await put(root, '_intake/inbox/raw.txt', 'retained input');
    if (conflict === 'ignored-marker') await put(root, '.gitignore', '_intake/profile.json\n');
    if (conflict === 'OKF-record') await put(root, '_intake/processed/source.md', okf);
    const bin = join(root, 'bin');
    const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
    await put(root, 'bin/transitrix-intake-profile', `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(profileCli)} "$@"\n`);
    // Replace npx so the real driver is exercised without network access. Every
    // downstream command must observe the selection, including the first read.
    await put(root, 'bin/npx', `#!/bin/sh
set -eu
cd ${quote(root)}
${quote(process.execPath)} -e 'const p = require("./_intake/profile.json"); if (p.version !== 1 || p.profile !== "ingest") process.exit(91)'
echo "$2" >> cli-calls
if [ "$2" = list-due ]; then echo '[{"id":"REGULATION-1","monitoring_needed":false}]'; fi
if [ "$2" = check-signal ]; then echo '{"proceed":false}'; fi
`);
    for (const name of ['npx', 'transitrix-intake-profile']) await chmod(join(bin, name), 0o755);
    const before = await snapshot(root);
    const run = () => spawnSync('bash', [join(repo, 'transitrix/skills/reg-intel/templates/reg-intel-daily.sh'), root], {
      encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
    const first = run();
    if (conflict) {
      assert.equal(first.status, 2, first.stderr);
      assert.match(first.stderr, /profile conflict/);
      assert.deepEqual(await snapshot(root), before);
    } else {
      assert.equal(first.status, 0, first.stderr);
      assert.match(await readFile(join(root, 'cli-calls'), 'utf8'), /^list-due\n/);
      // Preserve even noncanonical formatting on an existing matching marker.
      const marker = '{ "version": 1, "profile": "ingest" }\n';
      await put(root, '_intake/profile.json', marker);
      assert.equal(run().status, 0);
      assert.equal(await readFile(join(root, '_intake/profile.json'), 'utf8'), marker);
      assert.equal(await readFile(join(root, '_intake/inbox/raw.txt'), 'utf8'), 'retained input');
    }
  });
}

test('packed preflight works without a methodology checkout or vocabulary', async t => {
  const root = await workspace(t);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const cache = join(root, 'cache');
  const packed = spawnSync(npm, ['pack', fileURLToPath(new URL('../', import.meta.url)),
    '--pack-destination', root, '--cache', cache, '--ignore-scripts', '--json'], { encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const archive = join(root, JSON.parse(packed.stdout)[0].filename);
  const installed = spawnSync(npm, ['install', '--prefix', join(root, 'installed'), '--cache', cache,
    '--ignore-scripts', '--no-audit', '--no-fund', '--offline', archive], { encoding: 'utf8' });
  assert.equal(installed.status, 0, installed.stderr);
  const binary = join(root, 'installed/node_modules/@transitrix/ingest-cli/intake-profile.mjs');
  const before = await readFile(join(root, '.git/config'), 'utf8');
  for (const profile of ['ingest', 'knowledge-store']) {
    const check = spawnSync(process.execPath, [binary, 'check', root, '--profile', profile], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
  }
  const selected = spawnSync(process.execPath, [binary, 'select', root, '--profile', 'knowledge-store'], { encoding: 'utf8' });
  assert.equal(selected.status, 0, selected.stderr);
  const refused = spawnSync(process.execPath, [binary, 'select', root, '--profile', 'ingest'], { encoding: 'utf8' });
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /separate workspaces/);
  assert.equal(await readFile(join(root, '.git/config'), 'utf8'), before);
});

for (const type of ['type: source-document # retained', '"type": "source-document"', "type: 'source-document'"]) {
  test(`legacy OKF scalar ${type} refuses ingest`, async t => {
    const root = await workspace(t);
    await put(root, '_intake/processed/source.md', `---\n${type}\n---\nSummary\n`);
    await assert.rejects(scaffoldIntake(root), /profile conflict/);
    assert.deepEqual(await readdir(join(root, '_intake')), ['processed']);
  });
}

test('invalid stage shape refuses before recording selection', async t => {
  const root = await workspace(t);
  await put(root, '_intake/inbox', 'not a directory');
  const before = await snapshot(root);
  await assert.rejects(scaffoldIntake(root), /not a directory/);
  assert.deepEqual(await snapshot(root), before);
});
