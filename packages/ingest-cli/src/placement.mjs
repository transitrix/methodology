// Materialisation / placement resolver — the deterministic TYPE → {mode, layer,
// folder} map the ingest pipeline needs to decide where an admitted element lands
// (its own per-TYPE catalogue file vs inline in a catalogue/view document) and to
// flag an admitted element sitting in the wrong place.
//
// SOURCE OF TRUTH: ELEMENT_PRIMITIVES.md §4 (the mode table) — mode, layer, plural
// folder. This table mirrors §4 verbatim and MUST track it: when §4 changes (a TYPE
// promoted, a folder renamed), update this file in lockstep, the same discipline as
// coverage-presets.mjs against COVERAGE_PROFILES §3.
//
// Modes (ELEMENT_PRIMITIVES §1):
//   - standalone   — own element file in its per-TYPE folder; org-wide-unique id.
//   - view-defined — authored inline in a view/catalogue document; promotable.
//   - contained    — inline in a host element (e.g. STEP in PROCESS.flow); promotable.
// `promotable: true` means the TYPE starts inline and gains its own standalone file
// only when a SECOND document references it (§1 promotion rule) — the id never changes.
//
// THE ONE RULE still holds: this module only READS canon to check placement; it never
// writes a zone.

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';

// TYPE → placement. `folder` is relative to the elements root, exactly as §4 prints it
// (no `elements/` or `canon/` prefix — the catalogue-root prefix is a separate open
// item, so we match on the folder SUFFIX and stay prefix-agnostic). `folder: null`
// means the TYPE has no own catalogue folder (view-defined, document-local).
export const PLACEMENT = {
  // 01_motivation
  DRIVER:             { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/factors/' },
  FACTOR:             { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/factors/' }, // grandfathered IDs; canonical name is DRIVER
  GOAL:               { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/goals/' },
  CONSTRAINT:         { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/constraints/' },
  REQUIREMENT:        { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/requirements/' },
  STAKEHOLDER:        { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/stakeholders/' },
  ASSESSMENT:         { mode: 'standalone',   layer: '01_motivation',    folder: '01_motivation/assessments/' },
  // 02_business
  CAPABILITY:         { mode: 'standalone',   layer: '02_business',      folder: '02_business/capabilities/' },
  PROCESS:            { mode: 'standalone',   layer: '02_business',      folder: '02_business/processes/' },
  STEP:               { mode: 'contained',    layer: '02_business',      folder: '02_business/steps/', promotable: true },
  PRODUCT:            { mode: 'standalone',   layer: '02_business',      folder: '02_business/products/' },
  ROLE:               { mode: 'standalone',   layer: '02_business',      folder: '02_business/roles/' },
  ACTOR:              { mode: 'standalone',   layer: '02_business',      folder: '02_business/actors/' },
  RULE:               { mode: 'standalone',   layer: '02_business',      folder: '02_business/rules/' },
  REGISTRY:           { mode: 'standalone',   layer: '02_business',      folder: '02_business/registries/', promotable: true },
  // 03_application
  APPLICATION:        { mode: 'standalone',   layer: '03_application',   folder: '03_application/applications/' },
  INTEGRATION:        { mode: 'view-defined', layer: '03_application',   folder: '03_application/integrations/', promotable: true },
  // 05_implementation
  ACTION:             { mode: 'standalone',   layer: '05_implementation', folder: '05_implementation/actions/' },
  ACTIVITY:           { mode: 'standalone',   layer: '05_implementation', folder: '05_implementation/activities/', deprecated: true, replacedBy: 'ACTION' },
  CHANGE:             { mode: 'standalone',   layer: '05_implementation', folder: '05_implementation/changes/' },
  TARGET_STATE:       { mode: 'standalone',   layer: '05_implementation', folder: '05_implementation/target-states/' },
  SCENARIO:           { mode: 'standalone',   layer: '05_implementation', folder: '05_implementation/scenarios/' },
  // 04_technology — first catalogued TYPE in this layer (ADR 2026-06-08)
  EQUIPMENT:          { mode: 'standalone',   layer: '04_technology',    folder: '04_technology/equipment/' },
  // 02_business (ADR 2026-06-08 — replaces INFORMATION_ENTITY)
  BUSINESS_OBJECT:    { mode: 'standalone',   layer: '02_business',      folder: '02_business/business-objects/' },
  // Deprecated alias — one release only; resolved to BUSINESS_OBJECT placement.
  // BOBJ-D001 warning is emitted at emit-candidates and validate when this alias is encountered.
  INFORMATION_ENTITY: { mode: 'standalone',   layer: '02_business',      folder: '02_business/business-objects/', deprecated: true, replacedBy: 'BUSINESS_OBJECT' },
};

// TYPE prefix of an id (the segment before the first '-'). Capability V/H addresses
// (CAPABILITY-V1.2) still split on '-' to 'CAPABILITY', so this is safe for them too.
export function typeOfId(id) {
  return typeof id === 'string' && id.includes('-') ? id.split('-')[0] : null;
}

// Resolve placement for an element TYPE. Returns the §4 entry (with `type` echoed) or
// null for an unknown / non-element TYPE (e.g. a field or codex TYPE has no §4 row).
export function resolvePlacement(type) {
  const p = type && PLACEMENT[type];
  if (!p) return null;
  return { type, mode: p.mode, layer: p.layer, folder: p.folder, promotable: !!p.promotable };
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Recursively collect every *.yaml under dir (relative paths, posix separators).
async function walkYaml(root, dir = root, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) await walkYaml(root, abs, out);
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(abs);
  }
  return out;
}

// Scan canon/ (read-only) and flag any admitted element file sitting in the wrong §4
// place. Returns { scanned, findings: [{ id, type, file, expected, reason }] }.
// A finding is raised when a `standalone` TYPE's file is NOT under its §4 folder, or a
// `view-defined` TYPE that has no catalogue folder appears as its own canon file.
// Folder match is by SUFFIX so it is agnostic to the canon-root prefix (open item).
export async function checkCanonPlacement(orgRoot) {
  const canonDir = join(resolve(orgRoot), 'canon');
  const findings = [];
  let scanned = 0;
  if (!(await exists(canonDir))) return { scanned, findings };

  for (const file of await walkYaml(canonDir)) {
    // §13: the canon/unresolved/ holding area is NOT typed canon — skip it (UNRES-004).
    // Inlined (not imported from unresolved.mjs) to avoid a placement <-> unresolved cycle.
    if (file.replace(/\\/g, '/').includes('/canon/unresolved/')) continue;
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    // id is the basename without extension, or the top-level `id:` scalar.
    const idLine = text.match(/^id:[ \t]*["']?([A-Za-z0-9_.\-]+)/m);
    const id = idLine ? idLine[1] : file.split(/[\\/]/).pop().replace(/\.yaml$/, '');
    const type = typeOfId(id);
    const place = type && PLACEMENT[type];
    if (!place) continue; // not a §4 element TYPE (REL/ASSERTION have fixed homes) — skip
    scanned++;
    const dirPosix = dirname(file).replace(/\\/g, '/');

    if (place.folder) {
      const want = place.folder.replace(/\/$/, '');
      if (!dirPosix.endsWith(want)) {
        findings.push({
          id, type, file,
          expected: place.folder,
          reason: `${place.mode} TYPE ${type} must live in its §4 folder ${place.folder}; found at ${dirPosix}/`,
        });
      }
    } else {
      // view-defined, document-local: no own catalogue file expected.
      findings.push({
        id, type, file,
        expected: '(inline — view-defined, no catalogue folder)',
        reason: `${type} is view-defined (ELEMENT_PRIMITIVES §4) — it has no catalogue folder; found as a standalone canon file at ${dirPosix}/`,
      });
    }
  }
  return { scanned, findings };
}
