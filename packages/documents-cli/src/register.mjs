import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { inspectEvent, issueHash, localPointer } from './events.mjs';

export function parseRecord(bytes) {
  const parsed = parseDocument(String(bytes), { uniqueKeys: true });
  if (parsed.errors.length) throw new Error(parsed.errors.map(e => e.message).join('; '));
  return parsed.toJS({ maxAliasCount: 100 });
}

export function localLoader(folder) {
  return async ({ uri }) => {
    if (!localPointer(uri)) return null;
    const root = await realpath(folder);
    const path = await realpath(resolve(root, uri));
    const rel = relative(root, path);
    if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) return null;
    return readFile(path);
  };
}

async function exists(path) {
  try { await lstat(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export async function createEvent(folder, supplied) {
  const row = structuredClone(supplied);
  if (row && typeof row === 'object' && !Array.isArray(row) && !Object.hasOwn(row, 'issue_hash')) row.issue_hash = issueHash(row);
  const report = await inspectEvent(row, { load: localLoader(folder) });
  if (report.status === 'invalid' || report.status === 'conflict') throw new Error(JSON.stringify(report));
  const root = await realpath(folder);
  const dir = resolve(root, 'events');
  await mkdir(dir, { recursive: true });
  if (await realpath(dir) !== dir) throw new Error('events must be a local directory, not a symlink.');
  if (await exists(resolve(dir, `${row.id}.yml`))) throw new Error('Event already exists as .yml.');
  // Exclusive creation is intentional: another act gets another ID. Nothing
  // updates historical rows or writes their referenced evidence.
  await writeFile(resolve(dir, `${row.id}.yaml`), `${JSON.stringify(row, null, 2)}\n`, { flag: 'wx' });
  return { row, ...report };
}

export async function readEvent(folder, id) {
  if (!/^issue-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$/.test(id)) throw new Error('Invalid issue ID.');
  const yamlExists = await exists(resolve(folder, 'events', `${id}.yaml`));
  const ymlExists = await exists(resolve(folder, 'events', `${id}.yml`));
  if (yamlExists && ymlExists) throw new Error('Duplicate event files.');
  const bytes = await localLoader(folder)({ uri: `events/${id}.${ymlExists ? 'yml' : 'yaml'}` });
  if (!bytes) throw new Error('Event unavailable.');
  const row = parseRecord(bytes);
  const report = await inspectEvent(row, { load: localLoader(folder) });
  if (row?.id !== id) report.findings.push({ code: 'INPUT', severity: 'error', file: `events/${id}.yaml`, message: 'Filename must match id.' });
  if (report.findings.length) report.status = 'invalid';
  return { row, ...report };
}
