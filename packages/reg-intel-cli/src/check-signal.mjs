// `check-signal` (SKILL Step 2, the "whether") — the cheap change-signal gate that
// runs before any expensive fetch + SEGMENT + CLASSIFY pass. It compares a freshly
// observed cheap signal (HTTP ETag / Last-Modified, an API updated/version field, a
// source "last amended" date, or a cheap-fragment hash) against the last-seen value in
// the operations signal-cache, and decides whether the source moved.
//
// Deterministic + network-free: the caller supplies the observed value (`observed` +
// `method`) — the same split the ingest CLI uses (the agent/scheduler does the cheap
// fetch; the CLI does the comparison + state). With no observed value the gate either
// degrades to "proceed" (`acceptNoSignal`) or refuses.
//
// Outcomes:
//   - unchanged : observed == cached. Terminal for this source — bump the scan block
//                 (last_scanned_at + next_scan_due), no SEGMENT/CLASSIFY. proceed=false.
//   - moved     : no cached baseline yet, or observed != cached. proceed=true; the
//                 baseline advances to the observed value so the NEXT run compares
//                 against it. The scan block is NOT bumped here — that is the full
//                 pass's Step 8 (update-scan) once the move is processed.
//   - no_signal : the source exposes no cheap signal. proceed=true; cache untouched.
//
// THE ONE RULE holds: nothing here writes canon. The only writes are the codex scan
// block (operating state, on `unchanged`) and the operations signal-cache.

import { readFile } from 'node:fs/promises';
import { readTopScalar, readBlockScalars } from './yaml.mjs';
import { readCache, writeCache, getEntry, setEntry } from './signal-cache.mjs';
import { updateScan } from './update-scan.mjs';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const METHODS = new Set(['etag', 'last_modified', 'api_version', 'amended_date', 'fragment_hash']);

export { METHODS };

// Run the gate for one codex source file. Returns { id, outcome, proceed, method,
// observed, previous, scan? }.
export async function checkSignal(orgRoot, file, { observed = null, method = null, acceptNoSignal = false, today } = {}) {
  if (!ISO_RE.test(today || '')) throw new Error('--today must be YYYY-MM-DD');
  const text = await readFile(file, 'utf8');
  if (readTopScalar(text, 'monitoring_needed') !== true) {
    throw new Error(`${file}: check-signal only applies to a monitoring_needed: true artefact (14-codex.md §3.4)`);
  }
  const id = readTopScalar(text, 'id');
  if (!id) throw new Error(`${file}: codex artefact has no id`);

  if (method && !METHODS.has(method)) {
    throw new Error(`--method must be one of ${[...METHODS].join('|')} (got ${JSON.stringify(method)})`);
  }

  // No observed signal: degrade to proceed (only with explicit opt-in) — never guess.
  if (observed === null || observed === undefined || observed === '') {
    if (!acceptNoSignal) {
      throw new Error('no observed signal: pass --observed <value> [--method <m>], or --accept-no-signal for a source with no cheap signal');
    }
    return { id, outcome: 'no_signal', proceed: true, method: method || 'none', observed: null, previous: null };
  }

  const cache = await readCache(orgRoot);
  const prev = getEntry(cache, id);
  const previous = prev ? prev.value : null;
  const moved = previous === null || String(previous) !== String(observed);

  if (!moved) {
    // Unchanged — refresh the baseline timestamp and bump the scan cadence. This is the
    // terminal action for an unchanged source (SKILL Step 2).
    setEntry(cache, id, { method: method || (prev && prev.method) || 'unknown', value: String(observed), observed_at: today });
    await writeCache(orgRoot, cache);
    const scanBlock = readBlockScalars(text, 'scan') || {};
    const res = await updateScan(file, { today, frequency: scanBlock.scan_frequency, changeDescription: null, reviewNeeded: false });
    return { id, outcome: 'unchanged', proceed: false, method: method || (prev && prev.method) || 'unknown', observed: String(observed), previous, scan: res.scan };
  }

  // Moved — advance the baseline so the next run detects the next move; the full pass
  // (and its Step 8 update-scan) handles the scan block + extraction downstream.
  setEntry(cache, id, { method: method || 'unknown', value: String(observed), observed_at: today });
  await writeCache(orgRoot, cache);
  return { id, outcome: 'moved', proceed: true, method: method || 'unknown', observed: String(observed), previous };
}
