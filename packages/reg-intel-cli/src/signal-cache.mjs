// Last-seen change-signal cache — committed operational STATE, per the operations
// config/state convention (method/02-team-operations.md §3.3, decided in strategy#169).
// It lives at `operations/state/reg-intel/signal-cache.json` — NOT on the codex
// artefact (the §3.5 scan block stays closed) and NOT in transient _intake/ (the cache
// must survive a fresh clone / CI checkout for the gate to pay off).
//
// The shape is owned by this tool (the convention fixes only the location + the
// committed-but-disposable contract): the cache is correctness-non-critical — a miss
// or a delete simply degrades the gate to "treat as moved / always fetch", never wrong
// model truth.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';

export function cachePath(orgRoot) {
  return join(resolve(orgRoot), 'operations', 'state', 'reg-intel', 'signal-cache.json');
}

// Read the cache. A missing or unparseable file yields an empty cache (safe default —
// the gate then treats every source as moved).
export async function readCache(orgRoot) {
  try {
    const obj = JSON.parse(await readFile(cachePath(orgRoot), 'utf8'));
    if (obj && typeof obj === 'object' && obj.sources && typeof obj.sources === 'object') return obj;
  } catch { /* absent / malformed → empty */ }
  return { version: 1, sources: {} };
}

export async function writeCache(orgRoot, cache) {
  const p = cachePath(orgRoot);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  return p;
}

export function getEntry(cache, sourceId) {
  return (cache.sources && cache.sources[sourceId]) || null;
}

export function setEntry(cache, sourceId, entry) {
  cache.sources = cache.sources || {};
  cache.sources[sourceId] = entry;
  return cache;
}

// Snapshot state is kept in a separate `snapshots` map (the last captured snapshot
// hash per source), so the signal gate (`sources`) and the snapshot step
// (`snapshots`) never overwrite each other's entry. It lets bytes-identical detection
// survive a fresh clone / CI checkout where the prior _intake/ snapshot is gone.
export function getSnapshotEntry(cache, sourceId) {
  return (cache.snapshots && cache.snapshots[sourceId]) || null;
}

export function setSnapshotEntry(cache, sourceId, entry) {
  cache.snapshots = cache.snapshots || {};
  cache.snapshots[sourceId] = entry;
  return cache;
}
