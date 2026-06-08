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
// Outcomes: captured (first harvest) · changed (normative text differs from prior) ·
// cosmetic_change (bytes differ but the normative text is unchanged — a re-publication
// that touched markup / boilerplate / tracker ids only) · bytes_identical (the
// publisher re-stamped without changing any bytes).

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, extname, basename } from 'node:path';
import { readTopScalar } from './yaml.mjs';
import { readCache, writeCache, getSnapshotEntry, setSnapshotEntry } from './signal-cache.mjs';
import { normativeHash } from './normalize.mjs';

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
  const normHash = normativeHash(bytes, cleanExt); // null for binary/unknown formats
  const snapDir = join(resolve(orgRoot), '_intake', 'snapshots');
  const snapName = `${id}-${today}.${cleanExt}`;

  // Determine the prior raw + normative hashes: the latest other _intake snapshot
  // (recomputed from its bytes), else the committed operations cache (so detection
  // survives a fresh checkout).
  const cache = await readCache(orgRoot);
  const cachedSnap = getSnapshotEntry(cache, id);
  const prior = await priorSnapshot(snapDir, id, snapName);
  let priorHash = null;
  let priorNorm = null;
  if (prior) {
    const pb = await readFile(prior);
    priorHash = sha256(pb);
    priorNorm = normativeHash(pb, extname(prior).replace(/^\./, ''));
  } else if (cachedSnap && cachedSnap.hash) {
    priorHash = cachedSnap.hash;
    priorNorm = cachedSnap.norm_hash || null;
  }

  await mkdir(snapDir, { recursive: true });
  await writeFile(join(snapDir, snapName), bytes);

  // captured → no prior. bytes_identical → same bytes. cosmetic_change → bytes differ
  // but the normative text is unchanged (only meaningful when both sides are textual).
  // changed → the normative text moved (or it can't be normalised, so bytes decide).
  let outcome;
  if (priorHash === null) outcome = 'captured';
  else if (priorHash === hash) outcome = 'bytes_identical';
  else if (normHash !== null && priorNorm !== null && normHash === priorNorm) outcome = 'cosmetic_change';
  else outcome = 'changed';

  const rel = ['_intake', 'snapshots', snapName].join('/');
  setSnapshotEntry(cache, id, { hash, ...(normHash ? { norm_hash: normHash } : {}), file: rel, at: today });
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
