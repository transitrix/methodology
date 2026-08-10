// `repo-check` — read-only "doctor" for a Transitrix adopter repo. Emits a SHORT,
// DATA-FREE health report: methodology version, resolved coverage profile, per-zone +
// per-TYPE counts, an adoption-level indicator, integrity red flags, and a tooling
// check. It reports AGGREGATES and STATUSES only — never object ids, names, or
// contents — so the report is safe to share outside the organisation. Idempotent and
// non-mutating; like the rest of the CLI it never writes a zone.
//
// Data-free guarantee: the per-TYPE breakdown counts only the TYPE prefix of a
// grammar-valid id (methodology vocabulary — GOAL, PROCESS, …); a malformed id
// contributes to `invalid_ids` and its prefix is never emitted, so no org-specific
// string can leak into the report.

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readManifestText } from './intake.mjs';
import { readTopScalar } from './yaml.mjs';
import { readCoverageProfile } from './coverage.mjs';
import { checkCanonPlacement } from './placement.mjs';
import { buildCanonIndex } from './canon.mjs';
import { isUnresolvedPath, checkUnresolved } from './unresolved.mjs';
import { isValidId } from './ids.mjs';
import { PRESETS_VERSION } from './coverage-presets.mjs';
import { catalogueCheck, CatalogueError } from './catalogue.mjs';

const ZONES = ['canon', 'field', 'codex'];

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

// Element TYPEs present under canon/elements/, by ID prefix — independent of
// suggest-profile.mjs (which only sees loaded *candidates*, so a TYPE placed straight
// into canon/elements/ by hand never reaches it) and of checkCanonPlacement (which
// reports folder mismatches, not profile coverage). Scoped to canon/elements/ itself,
// not the whole canon/ zone, so REL / ASSERTION / VERIFICATION — first-class primitives
// that deliberately live outside elements/ (canon.mjs) and are not governed by a
// profile's `elements` set — never appear here.
export async function elementTypesOnDisk(orgRoot) {
  const dir = join(resolve(orgRoot), 'canon', 'elements');
  const types = new Set();
  const unreadable = [];
  if (!(await exists(dir))) return { types, unreadable };
  for (const file of await walkYaml(dir)) {
    let text;
    try { text = await readFile(file, 'utf8'); } catch (err) { unreadable.push({ file, reason: err.message }); continue; }
    const id = readTopScalar(text, 'id');
    if (id && isValidId(id)) types.add(id.split('-')[0]);
  }
  return { types, unreadable };
}

// Finding (methodology review, 2026-08-09): profile completeness is unmeasurable for
// anything placed by hand — suggest-profile.mjs and checkCanonPlacement both miss it.
// This check is independent of both: every element TYPE on disk that the *resolved*
// profile does not cover, read-only, regardless of whether any candidate for that TYPE
// is being validated. Fails loudly (resolvable: false) rather than reporting a clean
// empty list when the profile itself could not be resolved (vocabulary.yaml
// drift-check discipline — an unresolved profile makes "nothing out of profile" a
// non-finding, not a clean bill of health).
export function profileCompleteness(typesOnDisk, profile) {
  if (profile.unresolved) {
    return { resolvable: false, out_of_profile_types: [] };
  }
  const outOfProfile = [];
  for (const type of typesOnDisk) {
    if (profile.isFull) {
      if (profile.removedElements && profile.removedElements.has(type)) outOfProfile.push(type);
    } else if (!profile.elements.has(type)) {
      outOfProfile.push(type);
    }
  }
  outOfProfile.sort();
  return { resolvable: true, out_of_profile_types: outOfProfile };
}

// Tally one zone: { files, with_id, invalid_ids, types: { <TYPE>: n }, unreadable }.
// Only the prefix of a grammar-valid id is recorded as a TYPE; malformed ids count
// toward invalid_ids. A file that cannot be read at all is named in `unreadable`
// rather than silently missing from `files` with no trace (methodology review,
// transitrix-hq#104 item 5).
async function tallyZone(orgRoot, zone) {
  const dir = join(resolve(orgRoot), zone);
  const tally = { files: 0, with_id: 0, invalid_ids: 0, types: {}, unreadable: [] };
  if (!(await exists(dir))) return { present: false, ...tally };
  for (const file of await walkYaml(dir)) {
    // §13: canon/unresolved/ is a NON-admitted holding area, not typed canon — keep it
    // out of the typed tally / adoption count (UNRES-004). It is reported separately.
    if (isUnresolvedPath(file)) continue;
    tally.files++;
    let text;
    try { text = await readFile(file, 'utf8'); } catch (err) { tally.unreadable.push({ file, reason: err.message }); continue; }
    const id = readTopScalar(text, 'id');
    if (!id) continue;
    tally.with_id++;
    if (!isValidId(id)) { tally.invalid_ids++; continue; }
    const type = id.split('-')[0];
    tally.types[type] = (tally.types[type] || 0) + 1;
  }
  // Sort the type map for stable output.
  const sortedTypes = {};
  for (const k of Object.keys(tally.types).sort()) sortedTypes[k] = tally.types[k];
  tally.types = sortedTypes;
  return { present: true, ...tally };
}

// Heuristic adoption level from how populated canon is (counts only, never contents).
function adoptionLevel(canonFiles) {
  if (canonFiles === 0) return 'empty (scaffold only — no canon elements yet)';
  if (canonFiles < 10) return 'seeded';
  if (canonFiles < 50) return 'in use';
  return 'established';
}

// Build the data-free health report for an org root. Read-only.
export async function repoCheck(orgRoot) {
  const root = resolve(orgRoot);
  const manifestText = await readManifestText(root);
  const profile = await readCoverageProfile(root);

  const zones = {};
  let totalInvalid = 0;
  let totalUnreadable = 0;
  for (const z of ZONES) {
    zones[z] = await tallyZone(root, z);
    totalInvalid += zones[z].invalid_ids || 0;
    totalUnreadable += zones[z].unreadable.length;
  }

  const placement = await checkCanonPlacement(root);
  totalUnreadable += placement.unreadable.length;

  // ELEM-ALIAS-001 (ELEMENT_PRIMITIVES §9) — a name/alias claimed by two different
  // elements makes F8 entity resolution ambiguous. Count only (data-free); the colliding
  // values themselves are org content and never emitted in this report.
  const canonIndex = await buildCanonIndex(root);
  const aliasCollisions = canonIndex.collisions.length;
  totalUnreadable += canonIndex.unreadable.length;

  // §13 holding area — count entries and flag malformed ones (UNRES-001..003). Data-free:
  // aggregate counts only, never a filename, id, or payload.
  const unresolved = await checkUnresolved(root, canonIndex.ids);
  const unresolvedMalformed = unresolved['UNRES-001'] + unresolved['UNRES-002'] + unresolved['UNRES-003'];
  totalUnreadable += unresolved.unreadable;

  const declaredVersion = manifestText ? (readTopScalar(manifestText, 'methodology_version') || null) : null;
  // Version-currency check (F11.2): flag when the CLI's built-in presets were built for a
  // different methodology version than the one declared in transitrix.yaml. A mismatch means
  // the CLI binary is stale and needs to be reinstalled after a methodology upgrade.
  const versionMatch = !declaredVersion || declaredVersion === PRESETS_VERSION;

  const diskTypes = await elementTypesOnDisk(root);
  totalUnreadable += diskTypes.unreadable.length;
  const completeness = profileCompleteness(diskTypes.types, profile);

  // L1 vocabulary check (method/05-catalogue-integration.md §4.5, CONTRACT.md §17) —
  // only present in the report when a `catalogue:` pin exists (MANIFEST.md); an L0
  // repo with no pin gets no catalogue section at all, not an empty one. The loader
  // fails closed (missing/unreadable path, unparseable slice, version mismatch) —
  // repo-check does not let that crash the rest of this data-free report; it
  // degrades to a red flag instead, the same way an unresolved coverage_profile
  // degrades to a warning rather than aborting the whole check.
  let catalogue = null;
  let catalogueError = null;
  try {
    catalogue = await catalogueCheck(root);
  } catch (err) {
    if (!(err instanceof CatalogueError)) throw err;
    catalogueError = err.message;
  }

  const red_flags = [];
  if (totalInvalid > 0) red_flags.push(`${totalInvalid} artefact(s) with an id that violates the canonical grammar (IDS_AND_REFERENCES §1)`);
  if (placement.findings.length > 0) red_flags.push(`${placement.findings.length} canon element(s) outside their ELEMENT_PRIMITIVES §4 folder`);
  if (aliasCollisions > 0) red_flags.push(`${aliasCollisions} name/alias collision(s) across canon (ELEM-ALIAS-001) — a surface form is claimed by two elements, making entity resolution ambiguous`);
  if (unresolvedMalformed > 0) red_flags.push(`${unresolvedMalformed} malformed canon/unresolved/ holding entr(y/ies) (CONTRACT §13 — UNRES-001 missing field / UNRES-002 typed id should move / UNRES-003 dangling related_to)`);
  if (profile.unresolved) red_flags.push('coverage_profile is present but could not be resolved — coverage flags are not authoritative');
  if (completeness.out_of_profile_types.length > 0) red_flags.push(`${completeness.out_of_profile_types.length} element TYPE(s) present in canon/elements/ but outside the active coverage profile (${completeness.out_of_profile_types.join(', ')}) — placed by hand, never seen by suggest-profile.mjs, not validated against the profile's per-TYPE fields`);
  if (!manifestText) red_flags.push('no transitrix.yaml manifest at the repo root — not a recognised adopter repo');
  if (!versionMatch) red_flags.push(`methodology_version in transitrix.yaml (${declaredVersion}) does not match the CLI built-in presets version (${PRESETS_VERSION}) — reinstall @transitrix/ingest-cli after a methodology upgrade`);
  if (catalogueError) red_flags.push(`pinned catalogue (transitrix.yaml \`catalogue:\`) failed to load — ${catalogueError}`);
  if (catalogue && catalogue.collisions.length > 0) red_flags.push(`${catalogue.collisions.length} local element(s) bound to the pinned catalogue whose name/alias also matches a different central element (L1 vocabulary check, method/05-catalogue-integration.md §4.5)`);
  if (catalogue && catalogue.unbound_matches.length > 0) red_flags.push(`${catalogue.unbound_matches.length} local element(s) whose name/alias matches a pinned-catalogue term but carry no \`canon_id\` binding (L1 vocabulary check, method/05-catalogue-integration.md §4.5)`);
  // Diagnostics (transitrix-hq#104 item 5): a per-file read failure is counted, never
  // silently absorbed into a lower zone/scanned count with no trace. Data-free — a
  // count, not the file path; `check-placement` / `check-stale` name the file for an
  // adopter investigating (those tools already name ids/paths by design).
  if (totalUnreadable > 0) red_flags.push(`${totalUnreadable} file(s) under canon/ could not be read and were excluded from every count above — run check-placement / check-stale to see which`);

  // zones is embedded in this data-free report as-is; strip the per-file `unreadable`
  // detail (file paths) before emission — it is aggregated into totalUnreadable above.
  const reportZones = {};
  for (const z of ZONES) {
    const { unreadable, ...rest } = zones[z];
    reportZones[z] = rest;
  }

  return {
    generated_by: '@transitrix/ingest-cli',
    manifest_present: Boolean(manifestText),
    methodology_version: declaredVersion,
    coverage_profile: profile.display,
    ...(profile.warning ? { coverage_warning: profile.warning } : {}),
    zones: reportZones,
    adoption_level: adoptionLevel(zones.canon.present ? zones.canon.files : 0),
    integrity: {
      invalid_ids: totalInvalid,
      misplaced_canon_elements: placement.findings.length,
      canon_elements_scanned: placement.scanned,
      alias_collisions: aliasCollisions,
      unresolved_holding: unresolved.count,
      unresolved_malformed: unresolvedMalformed,
      unreadable_files: totalUnreadable,
      red_flags,
    },
    profile_completeness: {
      resolvable: completeness.resolvable,
      out_of_profile_types: completeness.out_of_profile_types,
    },
    tooling: {
      cli_presets_version: PRESETS_VERSION,
      methodology_version_match: versionMatch,
      ok: versionMatch,
    },
    ...(catalogueError
      ? { catalogue: { pin_present: true, error: catalogueError } }
      : catalogue
        ? { catalogue: { pin_present: true, pin: catalogue.pin, collisions: catalogue.collisions, unbound_matches: catalogue.unbound_matches } }
        : {}),
    note: 'Data-free (aggregate counts and statuses only, no names/aliases/free text) except the `catalogue` section, present only when a `catalogue:` pin is declared, which names local and central element ids — the minimum needed to act on an L1 finding (method/05-catalogue-integration.md §4.5). Read-only: repo-check never writes a zone.',
  };
}
