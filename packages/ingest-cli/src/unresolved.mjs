// `unresolved` — the §13 holding area for objects ingestion could not TYPE.
//
// CONTRACT §13: a standalone object whose TYPE is unknown is parked in
// `canon/unresolved/` with its ingestion provenance, never force-fitted to a TYPE
// and never dropped. Type resolution is a SECOND axis, orthogonal to admission
// (§13.1): an entry may be `proposed`-untyped (what this CLI emits) or, later,
// admitted-but-untyped (the human gate's act). The CLI only ever emits the former
// — it writes a non-admitted holding record (no admission record), so THE ONE RULE
// ("never write *admitted* canon") still holds.
//
// `canon/unresolved/` is shared, committed canon-adjacent storage — NOT the private
// `_intake/` workspace — because an unresolved object carries real model knowledge
// (§13.1). It is segregated from typed canon only because the canon machinery is
// TYPE-keyed, so every typed canon walker MUST skip it (UNRES-004) via isUnresolvedPath.

import { readdir, readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dump, readTopScalar } from './yaml.mjs';
import { isValidId } from './ids.mjs';
import { PLACEMENT, typeOfId } from './placement.mjs';

export const UNRESOLVED_REL = 'canon/unresolved';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// True for any path inside a `canon/unresolved/` holding area. Matched by path so the
// exclusion is uniform across every typed canon walker (canon index, coverage,
// placement, renderers) — the mechanical enforcement of UNRES-004 / §13.1.
export function isUnresolvedPath(p) {
  return String(p).replace(/\\/g, '/').includes('/canon/unresolved/');
}

// Shape extraction-result `unresolved[]` items into §13.2 holding records. Pure — no I/O.
// Each item: { ingest_field (req), data (req), related_to?, ingest_source? }.
// `ingestSource` (the field-artefact id) and `ingestDate` (CONTRACT §4 date) are the
// defaults; an item may override ingest_source. Items missing a required field are
// dropped from the shaped set and reported in `skipped` so nothing is silently emitted
// malformed (the caller surfaces the count).
export function shapeUnresolved(items, { ingestSource, ingestDate }) {
  const records = [];
  const skipped = [];
  for (const u of items || []) {
    if (!u || typeof u !== 'object' || Array.isArray(u) || !u.ingest_field || u.data === undefined) {
      skipped.push(u);
      continue;
    }
    const rec = {
      ingest_status: 'unresolved',
      ingest_source: u.ingest_source || ingestSource,
      ingest_field: u.ingest_field,
      ingest_date: ingestDate,
    };
    if (Array.isArray(u.related_to) && u.related_to.length) rec.related_to = u.related_to;
    rec.data = u.data;
    records.push(rec);
  }
  return { records, skipped };
}

// Next free UNRES-<NNN> ordinal in a holding dir (1-based; zero-padded to 3 to match
// the CONTRACT §13 example — note UNRES is NOT a registered TYPE, so UNRES-001 is a
// filename slug, not a canonical id, and never collides with typed canon).
async function nextOrdinal(dir) {
  let names = [];
  try { names = await readdir(dir); } catch { return 1; }
  let max = 0;
  for (const n of names) {
    const m = /^UNRES-(\d+)\.yaml$/.exec(n);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

// Write shaped holding records to <orgRoot>/canon/unresolved/UNRES-<NNN>.yaml.
// Returns { dir, written: [relPaths], ids: [UNRES-NNN] }. Only ever writes non-admitted
// holding records (no admission record) — THE ONE RULE holds.
export async function writeUnresolved(orgRoot, records) {
  const dir = join(resolve(orgRoot), 'canon', 'unresolved');
  if (!records.length) return { dir, written: [], ids: [] };
  await mkdir(dir, { recursive: true });
  let n = await nextOrdinal(dir);
  const written = [];
  const ids = [];
  for (const rec of records) {
    const id = `UNRES-${String(n).padStart(3, '0')}`;
    await writeFile(join(dir, `${id}.yaml`), dump(rec), 'utf8');
    written.push(join(UNRESOLVED_REL, `${id}.yaml`));
    ids.push(id);
    n++;
  }
  return { dir, written, ids };
}

const REQUIRED = ['ingest_status', 'ingest_source', 'ingest_field', 'ingest_date', 'data'];

// Data-free integrity scan of canon/unresolved/ for repo-check. Returns aggregate
// counts only — never a filename, id, or payload — so the report stays shareable.
// Enforces UNRES-001 (missing required field), UNRES-002 (a TYPE-resolved registered
// id lingering in the holding area), and UNRES-003 (a related_to ref that does not
// resolve to an admitted canon id — needs the canon id set, passed in).
export async function checkUnresolved(orgRoot, canonIds) {
  const dir = join(resolve(orgRoot), 'canon', 'unresolved');
  const out = { count: 0, 'UNRES-001': 0, 'UNRES-002': 0, 'UNRES-003': 0 };
  if (!(await exists(dir))) return out;
  let names = [];
  try { names = await readdir(dir); } catch { return out; }
  for (const name of names) {
    if (!name.endsWith('.yaml')) continue;
    out.count++;
    let text;
    try { text = await readFile(join(dir, name), 'utf8'); } catch { continue; }
    for (const f of REQUIRED) {
      // `data` may be a block/map (no top-level scalar) — accept the key's presence.
      const present = readTopScalar(text, f) !== null || new RegExp(`^${f}:`, 'm').test(text);
      if (!present) { out['UNRES-001']++; break; }
    }
    const id = readTopScalar(text, 'id');
    if (id && isValidId(id) && PLACEMENT[typeOfId(id)]) out['UNRES-002']++;
    if (canonIds && canonIds.size >= 0) {
      const refs = text.replace(/\r\n/g, '\n').match(/^related_to:[ \t]*\n((?:[ \t]+-[^\n]*\n?)*)/m);
      if (refs) {
        for (const line of refs[1].split('\n')) {
          const ref = line.replace(/^\s*-\s*/, '').replace(/["']/g, '').trim();
          if (ref && isValidId(ref) && !canonIds.has(ref)) { out['UNRES-003']++; }
        }
      }
    }
  }
  return out;
}
