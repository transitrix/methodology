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
import { isValidId } from './ids.mjs';
import { PRESETS_VERSION } from './coverage-presets.mjs';

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

// Tally one zone: { files, with_id, invalid_ids, types: { <TYPE>: n } }. Only the prefix
// of a grammar-valid id is recorded as a TYPE; malformed ids count toward invalid_ids.
async function tallyZone(orgRoot, zone) {
  const dir = join(resolve(orgRoot), zone);
  const tally = { files: 0, with_id: 0, invalid_ids: 0, types: {} };
  if (!(await exists(dir))) return { present: false, ...tally };
  for (const file of await walkYaml(dir)) {
    tally.files++;
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
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
  for (const z of ZONES) {
    zones[z] = await tallyZone(root, z);
    totalInvalid += zones[z].invalid_ids || 0;
  }

  const placement = await checkCanonPlacement(root);

  const declaredVersion = manifestText ? (readTopScalar(manifestText, 'methodology_version') || null) : null;
  // Version-currency check (F11.2): flag when the CLI's built-in presets were built for a
  // different methodology version than the one declared in transitrix.yaml. A mismatch means
  // the CLI binary is stale and needs to be reinstalled after a methodology upgrade.
  const versionMatch = !declaredVersion || declaredVersion === PRESETS_VERSION;

  const red_flags = [];
  if (totalInvalid > 0) red_flags.push(`${totalInvalid} artefact(s) with an id that violates the canonical grammar (IDS_AND_REFERENCES §1)`);
  if (placement.findings.length > 0) red_flags.push(`${placement.findings.length} canon element(s) outside their ELEMENT_PRIMITIVES §4 folder`);
  if (profile.unresolved) red_flags.push('coverage_profile is present but could not be resolved — coverage flags are not authoritative');
  if (!manifestText) red_flags.push('no transitrix.yaml manifest at the repo root — not a recognised adopter repo');
  if (!versionMatch) red_flags.push(`methodology_version in transitrix.yaml (${declaredVersion}) does not match the CLI built-in presets version (${PRESETS_VERSION}) — reinstall @transitrix/ingest-cli after a methodology upgrade`);

  return {
    generated_by: '@transitrix/ingest-cli',
    manifest_present: Boolean(manifestText),
    methodology_version: declaredVersion,
    coverage_profile: profile.display,
    ...(profile.warning ? { coverage_warning: profile.warning } : {}),
    zones,
    adoption_level: adoptionLevel(zones.canon.present ? zones.canon.files : 0),
    integrity: {
      invalid_ids: totalInvalid,
      misplaced_canon_elements: placement.findings.length,
      canon_elements_scanned: placement.scanned,
      red_flags,
    },
    tooling: {
      cli_presets_version: PRESETS_VERSION,
      methodology_version_match: versionMatch,
      ok: versionMatch,
    },
    note: 'Data-free — aggregate counts and statuses only; no object ids, names, or contents. Safe to share externally. Read-only: repo-check never writes a zone.',
  };
}
