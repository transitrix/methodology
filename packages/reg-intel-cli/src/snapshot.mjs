// `fetch-snapshot` (SKILL Step 3) — capture a point-in-time copy of a moved source
// and fingerprint it, so the rest of the pipeline (SEGMENT, AMENDMENT) has stable
// bytes to work against and a later amendment is provable against them.
//
// Network-free, like the rest of this CLI: the agent/scheduler does the actual fetch
// (preferring APIs/feeds over HTML scraping, JS-render where needed) and passes the
// fetched file in via `--from`; this code snapshots the bytes, computes the
// `source_hash`, and decides whether the bytes actually changed.
//
// Snapshots are operational, in-flight artefacts under `_intake/snapshots/` — NOT the
// codex `sources/` copy (that is the human-admitted canonical snapshot, 14-codex.md
// §3.1). THE ONE RULE holds: nothing here writes canon. Bytes-identical detection
// compares to the latest prior _intake snapshot, falling back to the last snapshot
// hash in the committed operations cache so detection survives a fresh clone / CI
// checkout (where _intake/ is gone).
//
// Outcomes: captured (first harvest) · changed (bytes differ from prior) ·
// bytes_identical (signal moved but the publisher re-stamped without changing bytes).
// Content-aware cosmetic-vs-normative diffing is a later increment.

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, extname, basename } from 'node:path';
import { readTopScalar } from './yaml.mjs';
import { readCache, writeCache, getSnapshotEntry, setSnapshotEntry } from './signal-cache.mjs';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

async function exists(p) { try { await access(p); return true; } catch { return false; } }
function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

// Latest prior snapshot file for this source id (by name — the date is embedded, so a
// lexical sort orders by date), excluding `exclude`. Returns the absolute path or null.
async function priorSnapshot(snapDir, id, exclude) {
  if (!(await exists(snapDir))) return null;
  const prefix = `${id}-`;
  const names = (await readdir(snapDir))
    .filter((n) => n.startsWith(prefix) && n !== exclude)
    .sort();
  return names.length ? join(snapDir, names[names.length - 1]) : null;
}

export async function fetchSnapshot(orgRoot, file, { fromPath, today, ext } = {}) {
  if (!ISO_RE.test(today || '')) throw new Error('--today must be YYYY-MM-DD');
  if (!fromPath) throw new Error('--from <fetched-file> is required (this CLI is network-free; the caller fetches)');
  const text = await readFile(file, 'utf8');
  if (readTopScalar(text, 'monitoring_needed') !== true) {
    throw new Error(`${file}: fetch-snapshot only applies to a monitoring_needed: true artefact (14-codex.md §3.4)`);
  }
  const id = readTopScalar(text, 'id');
  if (!id) throw new Error(`${file}: codex artefact has no id`);

  const src = resolve(fromPath);
  if (!(await exists(src))) throw new Error(`--from file not found: ${fromPath}`);
  const bytes = await readFile(src);
  const hash = sha256(bytes);

  const cleanExt = (ext || extname(src).replace(/^\./, '') || 'html').replace(/^\./, '');
  const snapDir = join(resolve(orgRoot), '_intake', 'snapshots');
  const snapName = `${id}-${today}.${cleanExt}`;

  // Determine the prior hash: the latest other _intake snapshot, else the committed
  // operations cache (so detection survives a fresh checkout).
  const cache = await readCache(orgRoot);
  const cachedSnap = getSnapshotEntry(cache, id);
  const prior = await priorSnapshot(snapDir, id, snapName);
  let priorHash = null;
  if (prior) priorHash = sha256(await readFile(prior));
  else if (cachedSnap && cachedSnap.hash) priorHash = cachedSnap.hash;

  await mkdir(snapDir, { recursive: true });
  await writeFile(join(snapDir, snapName), bytes);

  const outcome = priorHash === null ? 'captured' : (priorHash === hash ? 'bytes_identical' : 'changed');
  const rel = ['_intake', 'snapshots', snapName].join('/');
  setSnapshotEntry(cache, id, { hash, file: rel, at: today });
  await writeCache(orgRoot, cache);

  return {
    id,
    outcome,
    proceed: outcome === 'changed' || outcome === 'captured',
    source_hash: `sha256:${hash}`,
    snapshot: rel,
    prior_snapshot: prior ? ['_intake', 'snapshots', basename(prior)].join('/') : (cachedSnap ? cachedSnap.file : null),
  };
}
