// Materialisation / placement resolver — the deterministic TYPE → {mode, layer,
// folder} map the ingest pipeline needs to decide where an admitted element lands
// (its own per-TYPE catalogue file vs inline in a catalogue/view document) and to
// flag an admitted element sitting in the wrong place.
//
// SOURCE OF TRUTH: notations/vocabulary.yaml (`element_types`). This file holds no
// literal TYPE list — it derives one. Adding a TYPE to the artefact is all it takes
// for the CLI to place it; ELEMENT_PRIMITIVES.md §4 is the prose that describes the
// same registry and is checked against the artefact by scripts/check-notations.mjs
// (VOC1), so the two cannot drift apart unnoticed.
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
import { elementPlacement } from './vocabulary.mjs';

// TYPE → placement, derived from the artefact. `folder` is relative to the elements
// root (no `elements/` or `canon/` prefix — the catalogue-root prefix is a separate
// open item, so we match on the folder SUFFIX and stay prefix-agnostic).
// `folder: null` means the TYPE has no own catalogue folder (document-local).
// A deprecated TYPE name resolves to its replacement's placement and carries
// `deprecated` / `replacedBy`.
//
// Derived at module init: a missing or corrupt artefact throws here rather than
// leaving an empty map that would silently place nothing.
export const PLACEMENT = elementPlacement();

// TYPE prefix of an id (the segment before the first '-'). Capability V/H addresses
// (CAPABILITY-V1.2) still split on '-' to 'CAPABILITY', so this is safe for them too.
export function typeOfId(id) {
  return typeof id === 'string' && id.includes('-') ? id.split('-')[0] : null;
}

// Resolve placement for an element TYPE. Returns the artefact's registry entry (with
// `type` echoed, and `deprecated` / `replacedBy` for a retired name) or null for an
// unknown / non-element TYPE (e.g. a field or codex TYPE is not in the registry).
export function resolvePlacement(type) {
  const p = type && PLACEMENT[type];
  if (!p) return null;
  return { ...p, type, promotable: !!p.promotable };
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
// place. Returns { scanned, findings: [{ id, type, file, expected, reason }],
// unreadable: [{ file, reason }] }. A finding is raised when a `standalone` TYPE's
// file is NOT under its §4 folder, or a `view-defined` TYPE that has no catalogue
// folder appears as its own canon file. Folder match is by SUFFIX so it is agnostic
// to the canon-root prefix (open item). A file that cannot be read at all is named in
// `unreadable` rather than silently dropped from `scanned` with no trace (methodology
// review, transitrix-hq#104 item 5 — a swallowed per-file error must name the file).
export async function checkCanonPlacement(orgRoot) {
  const canonDir = join(resolve(orgRoot), 'canon');
  const findings = [];
  const unreadable = [];
  let scanned = 0;
  if (!(await exists(canonDir))) return { scanned, findings, unreadable };

  for (const file of await walkYaml(canonDir)) {
    // §13: the canon/unresolved/ holding area is NOT typed canon — skip it (UNRES-004).
    // Inlined (not imported from unresolved.mjs) to avoid a placement <-> unresolved cycle.
    if (file.replace(/\\/g, '/').includes('/canon/unresolved/')) continue;
    let text;
    try { text = await readFile(file, 'utf8'); } catch (err) { unreadable.push({ file, reason: err.message }); continue; }
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
  return { scanned, findings, unreadable };
}
