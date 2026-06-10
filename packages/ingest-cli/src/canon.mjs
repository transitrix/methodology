// `canon` -- read-only index of what is already admitted, so the review queue can be
// idempotent against canon. THE ONE RULE still holds: nothing here writes to canon/;
// we only READ it to recognise candidates that have already passed the human gate.
//
// Identity keys (match candidate -> admitted artefact):
//   - element / assertion: the canonical `id` (1:1 with the candidate's `id`).
//   - relation: the (kind, from, to) triple. Note the field rename across zones --
//     a candidate carries `rel_kind`, an admitted REL file carries `type`
//     (17-relations.md A2) -- so we normalise both to the same triple key.
//
// Entity-match map (F8):
//   - nameMap: normalised(name|alias) -> { id, matched_on: 'name'|'alias' }
//     Built from every canon element's `name` + `aliases[]` (Option A ADR).
//     Used by emit-candidates to propose linking a new candidate to an existing
//     element (propose, never auto-merge -- the human gate decides).
//
// Alias-uniqueness gate (ELEM-ALIAS-001, ELEMENT_PRIMITIVES §9):
//   - collisions: [{ value, a, b }] -- a normalised name/alias that two DIFFERENT
//     element ids both claim. Cross-catalogue check (needs the whole catalogue, not
//     one file), so it is collected here as the nameMap is built. A value shared
//     within a single element's own name/aliases is NOT a collision. repo-check
//     surfaces the count (data-free) as an integrity red flag.

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readTopScalar, readTopList } from './yaml.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Stable separator for the relation triple key -- a space never appears in an ID or a
// closed REL kind (both are [A-Za-z0-9_-] only), so the key is unambiguous.
const SEP = ' ';
export function relKey(kind, from, to) { return `${kind}${SEP}${from}${SEP}${to}`; }

// Recursively collect every *.yaml file path under dir.
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

// Normalise a name/alias string for case-insensitive matching (F8).
function normName(s) { return typeof s === 'string' ? s.trim().toLowerCase() : null; }

// Build a read-only index of canon/ for one org root.
// Returns { ids: Set, rels: Set, nameMap: Map, collisions: [] }.
//   ids        -- admitted element/assertion IDs (for review-queue idempotency).
//   rels       -- admitted relation triple keys (for review-queue idempotency).
//   nameMap    -- normalised(name|alias) -> { id, matched_on: 'name'|'alias' }.
//                 Used by emit-candidates for cross-source entity-match proposals (F8).
//   collisions -- [{ value, a, b }] for the ELEM-ALIAS-001 uniqueness gate (§9):
//                 a normalised name/alias claimed by two DIFFERENT ids.
//              An absent canon/ yields an empty index (no exclusions, no proposals) --
//              the common case on a fresh adopter, unaffecting existing tests.
export async function buildCanonIndex(orgRoot) {
  const ids = new Set();
  const rels = new Set();
  const nameMap = new Map();
  const collisions = [];
  const canonDir = join(resolve(orgRoot), 'canon');
  if (!(await exists(canonDir))) return { ids, rels, nameMap, collisions };

  // Record one surface form for `id`. First writer wins the nameMap slot (F8 match
  // target). ELEM-ALIAS-001 fires when a DIFFERENT id claims the same value AND an
  // alias is on at least one side: an alias must not collide with another element's
  // name or alias. Two different elements legitimately sharing a `name` is NOT a
  // collision — names are unique only within a TYPE catalogue (§8), so a Stakeholder
  // and an Actor both named "Operations" is allowed. The same id re-using a value
  // (an alias equal to its own name) is benign and recorded once.
  const claim = (value, id, matched_on) => {
    const key = normName(value);
    if (!key) return;
    const prev = nameMap.get(key);
    if (!prev) { nameMap.set(key, { id, matched_on }); return; }
    if (prev.id === id) return;
    if (matched_on === 'alias' || prev.matched_on === 'alias') collisions.push({ value, a: prev.id, b: id });
  };

  for (const file of await walkYaml(canonDir)) {
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }

    const id = readTopScalar(text, 'id');
    if (id) {
      ids.add(id);
      // Entity-match map (F8) + alias-uniqueness gate (ELEM-ALIAS-001): index name +
      // aliases. Only element-like files (those with both id and name) produce entries.
      claim(readTopScalar(text, 'name'), id, 'name');
      for (const alias of readTopList(text, 'aliases')) claim(alias, id, 'alias');
    }

    // A first-class relation is identified by its endpoints + kind, not its id --
    // re-admitting the same triple under a new REL id must still be recognised.
    const from = readTopScalar(text, 'from');
    const to = readTopScalar(text, 'to');
    const kind = readTopScalar(text, 'type');
    if (from && to && kind) rels.add(relKey(kind, from, to));
  }
  return { ids, rels, nameMap, collisions };
}

// Is this candidate already admitted to canon, per the index? Returns the matched
// identity string (for reporting) or null. Only decides for candidates whose identity
// is determinable; a malformed candidate (no id / no endpoints) returns null and is
// left in the queue for the human to see.
export function admittedMatch(cand, index) {
  if (!cand || typeof cand !== 'object') return null;
  if (cand.kind === 'element' || cand.kind === 'assertion') {
    return typeof cand.id === 'string' && index.ids.has(cand.id) ? cand.id : null;
  }
  if (cand.kind === 'relation') {
    if (typeof cand.rel_kind !== 'string' || typeof cand.from !== 'string' || typeof cand.to !== 'string') return null;
    const key = relKey(cand.rel_kind, cand.from, cand.to);
    return index.rels.has(key) ? `${cand.rel_kind} ${cand.from} -> ${cand.to}` : null;
  }
  return null;
}
