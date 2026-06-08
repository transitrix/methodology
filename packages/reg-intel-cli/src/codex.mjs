// Codex discovery + parsing. The reg-intel "source registry" is the set of codex
// artefacts the repository already carries (14-codex.md §3.4–3.5) — not a separate
// database. This reads them: monitoring flag, the `scan` block (cadence + due date),
// and `monitor_instead[]` (live counterparts a static source points consumers at).

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { readTopScalar, readBlockScalars, readMapList } from './yaml.mjs';
import { isDue } from './schedule.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Walk upward from a path to the adopter org root (the dir holding transitrix.yaml).
export async function findOrgRoot(fromPath) {
  let dir = resolve(fromPath);
  if (await exists(dir)) {
    try {
      const { stat } = await import('node:fs/promises');
      if ((await stat(dir)).isFile()) dir = dirname(dir);
    } catch { /* fall through */ }
  }
  for (;;) {
    if (await exists(join(dir, 'transitrix.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

async function walkYaml(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walkYaml(p, out);
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

// Parse one codex artefact file into the fields the scheduler reads.
export function parseCodexArtefact(text, file) {
  const id = readTopScalar(text, 'id') ?? basename(file, '.yaml');
  return {
    file,
    id,
    type: readTopScalar(text, 'type') ?? null,
    name: readTopScalar(text, 'name') ?? null,
    source_url: readTopScalar(text, 'source_url') ?? null,
    monitoring_needed: readTopScalar(text, 'monitoring_needed'),
    scan: readBlockScalars(text, 'scan'),
    monitor_instead: readMapList(text, 'monitor_instead'),
  };
}

// Discover every codex artefact under <orgRoot>/codex/ (external + internal).
export async function discoverCodex(orgRoot) {
  const codexDir = join(resolve(orgRoot), 'codex');
  if (!(await exists(codexDir))) return [];
  const out = [];
  for (const file of (await walkYaml(codexDir)).sort()) {
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    out.push(parseCodexArtefact(text, file));
  }
  return out;
}

// The due set for a run as-of a date. A `monitoring_needed: true` artefact is due when
// its `scan.next_scan_due` is missing (never scanned) or on/before `asOf`. A
// `monitoring_needed: false` artefact is skipped, but each of its `monitor_instead[]`
// live counterparts is surfaced as its own scan target (SKILL Step 1). Returns an
// array of { id, type, name, source_url, scan_frequency, next_scan_due, reason, ... }.
export async function listDue(orgRoot, asOf) {
  const arts = await discoverCodex(orgRoot);
  const due = [];
  for (const a of arts) {
    if (a.monitoring_needed === true) {
      const next = (a.scan && a.scan.next_scan_due) || null;
      if (!isDue(next, asOf)) continue;
      due.push({
        id: a.id,
        type: a.type,
        name: a.name,
        source_url: a.source_url,
        scan_frequency: (a.scan && a.scan.scan_frequency) || null,
        next_scan_due: next,
        monitoring_needed: true,
        reason: next ? 'due' : 'never_scanned',
      });
    } else if (a.monitoring_needed === false) {
      for (const mi of a.monitor_instead || []) {
        due.push({
          id: mi.id || null,
          type: a.type,
          name: mi.name || null,
          source_url: mi.url || null,
          scan_frequency: null,
          next_scan_due: null,
          monitoring_needed: false,
          reason: 'monitor_instead',
          via: a.id,
        });
      }
    }
  }
  return due;
}

// Locate a codex artefact file by its ID under <orgRoot>/codex/. Returns the path or null.
export async function findCodexFile(orgRoot, id) {
  const codexDir = join(resolve(orgRoot), 'codex');
  for (const file of await walkYaml(codexDir)) {
    if (basename(file, '.yaml') === id) return file;
    try {
      if (readTopScalar(await readFile(file, 'utf8'), 'id') === id) return file;
    } catch { /* skip */ }
  }
  return null;
}
