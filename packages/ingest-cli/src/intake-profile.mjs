// Skill-local deployment compatibility. Read-only checks precede every setup write.
import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROFILES = ['ingest', 'knowledge-store'];
const MARKER = '_intake/profile.json';
const fail = message => { throw new Error(`Intake profile conflict: ${message}. Use separate workspaces; existing data was not changed.`); };

async function inspect(path) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) fail(`cannot establish ownership through symlink ${path}`);
    return stat;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function files(path) {
  const stat = await inspect(path);
  if (!stat) return [];
  if (!stat.isDirectory()) return [path];
  const result = [];
  for (const name of await readdir(path)) {
    if (name === '.gitkeep' || name === '.gitignore') {
      await inspect(join(path, name));
      continue;
    }
    result.push(...await files(join(path, name)));
  }
  return result;
}

async function sourceRecordType(path, legacy = false) {
  const text = path.endsWith('.md') ? await readFile(path, 'utf8') : '';
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1] || '';
  const match = /^(?:type|["']type["']):[ \t]*(["']?)(source-document|source-redirect)\1[ \t]*(?:#.*)?$/m.exec(frontmatter);
  if (legacy && !match && /source-(?:document|redirect)/.test(frontmatter)) {
    fail(`ambiguous source record at ${path}`);
  }
  return match?.[2] ?? null;
}

export async function checkIntakeProfile(orgRoot, profile) {
  if (!PROFILES.includes(profile)) throw new Error('Choose --profile ingest or --profile knowledge-store');
  const root = resolve(orgRoot);
  await inspect(root);
  const intake = await inspect(join(root, '_intake'));
  if (intake && !intake.isDirectory()) fail('_intake is not a directory');
  const evidence = { ingest: [], 'knowledge-store': [] };
  let declared = null;
  if (await inspect(join(root, MARKER))) {
    const marker = JSON.parse(await readFile(join(root, MARKER), 'utf8'));
    if (marker.version !== 1 || !PROFILES.includes(marker.profile)) fail('invalid profile marker');
    declared = marker.profile;
    evidence[declared].push(MARKER);
  }
  for (const [owner, paths] of Object.entries({
    ingest: ['_intake/processing', '_intake/snapshots', 'operations/config/scan-sources.yaml'],
    'knowledge-store': ['knowledge', '_intake/originals', '_intake/drafts', '_intake/log.md'],
  })) {
    for (const path of paths) if (await inspect(join(root, path))) evidence[owner].push(path);
  }
  for (const name of ['inbox', 'processing', 'processed', 'snapshots', 'originals', 'drafts']) {
    const stat = await inspect(join(root, '_intake', name));
    if (stat && !stat.isDirectory()) fail(`_intake/${name} is not a directory`);
  }
  const processed = await files(join(root, '_intake/processed'));
  const sourceDir = join(root, 'sources');
  const sourceDirStat = await inspect(sourceDir);
  if (profile === 'knowledge-store' && sourceDirStat && !sourceDirStat.isDirectory()) fail('sources is not a directory');
  const sourceFiles = sourceDirStat?.isDirectory() ? await files(sourceDir) : [];
  const sourceMarkdown = sourceFiles.filter(path => path.endsWith('.md') && !['index.md', 'log.md'].includes(basename(path)));
  const uploadedOriginals = sourceFiles.filter(path => {
    const name = basename(path);
    return name.endsWith('.original') || name.includes('.original.');
  });
  for (const path of sourceMarkdown) {
    if (await sourceRecordType(path) === 'source-document') {
      evidence['knowledge-store'].push(relative(root, path));
    }
  }
  for (const path of processed) {
    const type = await sourceRecordType(path, true);
    evidence[type ? 'knowledge-store' : 'ingest'].push(relative(root, path));
  }
  // Unknown workspace entries must be classified by the adopter, never guessed.
  if (intake) {
    const known = new Set(['profile.json', '.gitkeep', '.gitignore', 'README.md', 'inbox', 'processed', 'processing', 'snapshots', 'originals', 'drafts', 'log.md']);
    for (const name of await readdir(join(root, '_intake'))) {
      if (!known.has(name)) fail(`unrecognised _intake/${name}`);
      await inspect(join(root, '_intake', name));
    }
  }
  const other = profile === 'ingest' ? 'knowledge-store' : 'ingest';
  if (evidence[other].length) fail(`${profile} requested; ${other} evidence at ${evidence[other].join(', ')}`);

  // Both profiles require a marker that survives a normal commit and clone.
  const markerVisibility = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '--', MARKER], {
    encoding: 'utf8',
  });
  if (markerVisibility.status === 0) fail(`profile marker would be ignored: ${MARKER}`);
  if (markerVisibility.status !== 1) fail('cannot verify profile marker visibility; use a Git workspace and retry the check');

  if (profile === 'knowledge-store') {
    // Git evaluates nested/global ignores and negations, including tracked files.
    const sourcePaths = new Set([...sourceMarkdown, ...uploadedOriginals, ...processed]);
    const paths = ['sources/profile-check.md', ...Array.from(sourcePaths, path => relative(root, path))];
    const result = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '--stdin'], {
      input: paths.join('\n') + '\n', encoding: 'utf8',
    });
    if (result.status === 0) fail(`OKF source records or uploaded originals would be ignored: ${result.stdout.trim()}`);
    if (result.status !== 1) fail('cannot verify OKF record visibility; use a Git workspace and retry the check');
  }
  return { profile, declared, evidence: evidence[profile] };
}

export async function selectIntakeProfile(orgRoot, profile) {
  const result = await checkIntakeProfile(orgRoot, profile);
  if (!result.declared) {
    await mkdir(join(resolve(orgRoot), '_intake'), { recursive: true });
    // Exclusive creation prevents replacing a concurrent or existing selection.
    await writeFile(join(resolve(orgRoot), MARKER), JSON.stringify({ version: 1, profile }, null, 2) + '\n', { flag: 'wx' });
  }
  return result;
}
