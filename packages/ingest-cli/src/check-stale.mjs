// `check-stale` — read-only report of REQUIREMENT / CONSTRAINT elements whose
// `next_review_at` is set and has passed. Mirrors the check-placement idiom:
// walks canon/ (never writes it), reports by ID + review date so the author can
// act. Not data-free (it names IDs) — the caller is the author, not an external
// audience.
//
// Sources of truth:
//   - notations/elements/15-requirement.md §2.3, §4 (REQ-STALE-001)
//   - notations/ELEMENT_PRIMITIVES.md §7.13 (CONSTRAINT peers)
//
// The staleness rule is intentionally lightweight and orthogonal to codex
// change-monitoring (which stays legislative-only): today ≥ next_review_at
// means the obligation is due for human review, regardless of `origin`.

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readTopScalar } from './yaml.mjs';

// ISO 8601 date (YYYY-MM-DD, no timestamp — CONTRACT.md §7.5 "sub-day precision"
// is out of scope for canon dates). A value that does not match this shape is
// treated as unparseable (surfaced separately from the stale list, per §4).
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The two motivation-obligation folders §7.13 / §2.2 park artefacts under.
// Suffix-matched so a canon-root prefix change (open item, ELEMENT_PRIMITIVES §4)
// does not need this file updated in lockstep.
const OBLIGATION_FOLDERS = [
  '01_motivation/requirements',
  '01_motivation/constraints',
];

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function walkYaml(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walkYaml(p));
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

// Today as an ISO 8601 date string (YYYY-MM-DD). Injectable via `today` for
// deterministic callers.
function isoToday() { return new Date().toISOString().slice(0, 10); }

// Scan canon/ for obligation files carrying `next_review_at`. Returns
// { scanned, stale: [{ id, file, next_review_at }], malformed: [{ id, file, next_review_at }] }.
// A file with no `next_review_at` is scanned but contributes to neither list.
// `today` defaults to the current UTC date; pass a string to override in tests.
export async function checkStale(orgRoot, today = isoToday()) {
  const canonDir = join(resolve(orgRoot), 'canon');
  const stale = [];
  const malformed = [];
  let scanned = 0;
  if (!(await exists(canonDir))) return { scanned, stale, malformed, today };

  for (const folder of OBLIGATION_FOLDERS) {
    const dir = join(canonDir, 'elements', folder);
    if (!(await exists(dir))) continue;
    for (const file of await walkYaml(dir)) {
      scanned++;
      let text;
      try { text = await readFile(file, 'utf8'); } catch { continue; }
      const nra = readTopScalar(text, 'next_review_at');
      if (!nra || nra === 'null') continue;
      const id = readTopScalar(text, 'id') || file.split(/[\\/]/).pop().replace(/\.yaml$/, '');
      if (!ISO_DATE.test(nra)) { malformed.push({ id, file, next_review_at: nra }); continue; }
      // Lexicographic compare is correct for YYYY-MM-DD.
      if (nra <= today) stale.push({ id, file, next_review_at: nra });
    }
  }

  stale.sort((a, b) => a.next_review_at.localeCompare(b.next_review_at) || a.id.localeCompare(b.id));
  malformed.sort((a, b) => a.id.localeCompare(b.id));
  return { scanned, stale, malformed, today };
}
