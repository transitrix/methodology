// L1 — vocabulary catalogue integration (method/09-releases-and-propagation.md §6.4,
// CONTRACT.md §17). Reads the optional `catalogue:` pin off transitrix.yaml, loads
// the vendored catalogue slice it names, and computes the two report-only findings
// (surface-form collision / unbound surface-form match) against a repo's own canon.
//
// FAILS CLOSED, same posture as vocabulary.mjs. `catalogue:` absent is a valid state
// (L0/pre-L1) and returns null from loadCatalogueSlice — no error. Once a pin IS
// present, a missing/unreadable path, unparseable slice content, or a slice `version`
// not matching the pin's `version` are all thrown CatalogueErrors — never a fallback,
// never a partial catalogue. The CLI never fetches the slice at runtime: `path` names
// a file the adopter (or an agent, on their behalf) has already vendored on disk —
// same posture as PACKAGES.md §7.2's `validator:` field.
//
// Report only: findVocabularyDivergence is a pure function, never writes, and is
// idempotent — the same (local, catalogue) input always produces the same findings.

import { readFile, readdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readManifestText } from './intake.mjs';
import { readTopScalar, readTopList } from './yaml.mjs';
import { clean, parseInlineList } from './coverage.mjs';
import { isUnresolvedPath } from './unresolved.mjs';
import { parseId } from './ids.mjs';

class CatalogueError extends Error {
  constructor(message) {
    super(`catalogue: ${message}`);
    this.name = 'CatalogueError';
  }
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// ── `catalogue:` field parsing (transitrix.yaml, MANIFEST.md) ──────────────

// Parse the `catalogue:` map declaration out of manifest text. Returns:
//   null                                     — field absent (valid — L0/pre-L1, opt-in)
//   { source, version, path }                — well-formed map
//   { malformed: true, reason }              — present but not a valid map declaration
// Purpose-built reader for this one constrained shape (same posture as
// coverage.mjs's parseProfileDecl / packages.mjs's parsePackagesDecl) — not a
// general YAML parser.
export function parseCatalogueDecl(text) {
  if (typeof text !== 'string') return null;
  const norm = text.replace(/\r\n/g, '\n');
  const lines = norm.split('\n');

  const idx = lines.findIndex((l) => /^catalogue:[ \t]*(#.*)?$/.test(l));
  if (idx < 0) {
    // A same-line scalar/inline value is present but not a valid shape — reported as
    // malformed rather than treated as absent, so a typo'd pin never silently behaves
    // like an L0 repo with no pin at all.
    const inlineIdx = lines.findIndex((l) => /^catalogue:[ \t]*\S/.test(l));
    if (inlineIdx < 0) return null;
    return { malformed: true, reason: '`catalogue:` must be a map with `source`, `version`, `path` (MANIFEST.md) — found a scalar/inline value instead.' };
  }

  const block = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.trim() === '' || ln.trim().startsWith('#')) continue;
    if (/^\S/.test(ln)) break; // next top-level key ends the block
    block.push(ln);
  }

  const fields = {};
  for (const ln of block) {
    const m = ln.trim().match(/^([a-z_]+):[ \t]*(.*)$/);
    if (m) fields[m[1]] = clean(m[2]);
  }

  const required = ['source', 'version', 'path'];
  const missing = required.filter((k) => !fields[k]);
  if (missing.length > 0) {
    return { malformed: true, reason: `\`catalogue:\` is missing required field(s): ${missing.join(', ')} (MANIFEST.md).` };
  }

  return { source: fields.source, version: fields.version, path: fields.path };
}

// ── Catalogue slice parsing (the vendored release artefact) ────────────────

// Parse a vendored catalogue slice's content into { version, elements }.
// Expected shape (method/09-releases-and-propagation.md):
//   version: "X.Y.Z"
//   elements:
//     - id: TERM-042
//       type: TERM
//       name: "..."
//       aliases: [Alias1, Alias2]
//       description: "..."
// Throws CatalogueError on anything outside this narrow shape — no best-effort
// partial read.
export function parseCatalogueSlice(text) {
  if (typeof text !== 'string') throw new CatalogueError('catalogue slice content is not a string');

  const version = readTopScalar(text, 'version');
  if (!version) throw new CatalogueError('catalogue slice is missing a top-level `version:` field');

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const idx = lines.findIndex((l) => /^elements:[ \t]*(#.*)?$/.test(l));
  if (idx < 0) throw new CatalogueError('catalogue slice is missing a top-level `elements:` list');

  const block = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.trim() === '' || ln.trim().startsWith('#')) continue;
    if (/^\S/.test(ln)) break;
    block.push(ln);
  }

  const elements = [];
  let cur = null;
  const flush = () => { if (cur) { elements.push(finalizeSliceElement(cur)); cur = null; } };

  for (const ln of block) {
    const itemM = ln.match(/^[ \t]*-[ \t]*(.*)$/);
    if (itemM) {
      flush();
      cur = {};
      const rest = itemM[1].trim();
      if (rest) {
        const kv = rest.match(/^([a-z_]+):[ \t]*(.*)$/);
        if (kv) cur[kv[1]] = parseSliceFieldValue(kv[1], kv[2]);
      }
      continue;
    }
    const kv = ln.match(/^[ \t]+([a-z_]+):[ \t]*(.*)$/);
    if (kv && cur) cur[kv[1]] = parseSliceFieldValue(kv[1], kv[2]);
  }
  flush();

  return { version, elements };
}

function parseSliceFieldValue(key, raw) {
  if (key === 'aliases') return parseInlineList(raw) || [];
  return clean(raw);
}

function finalizeSliceElement(fields) {
  const missing = ['id', 'type', 'name'].filter((k) => !fields[k]);
  if (missing.length > 0) {
    throw new CatalogueError(`catalogue slice element entry is missing required field(s): ${missing.join(', ')}.`);
  }
  return {
    id: fields.id,
    type: fields.type,
    name: fields.name,
    aliases: fields.aliases || [],
    description: fields.description || null,
  };
}

// ── Writing the pin (L1 join) ────────────────────────────────────────────────

// Append a `catalogue:` block to manifest text. Refuses — never silently
// overwrites — when the manifest already declares `catalogue:`, well-formed or
// malformed alike: a repeat join is either a no-op the caller should notice
// (already pinned to the same slice) or a deliberate re-pin, and either way a
// human edits transitrix.yaml directly rather than this command guessing which.
// Pure function of its inputs — no I/O.
export function writeCataloguePin(text, { source, version, path }) {
  const missing = ['source', 'version', 'path'].filter((k) => !{ source, version, path }[k]);
  if (missing.length > 0) {
    throw new CatalogueError(`writeCataloguePin: missing required field(s): ${missing.join(', ')}.`);
  }
  const existing = parseCatalogueDecl(text || '');
  if (existing !== null) {
    throw new CatalogueError(
      existing.malformed
        ? `transitrix.yaml already declares a \`catalogue:\` field (${existing.reason}) — fix or remove it by hand before pinning.`
        : `transitrix.yaml already pins ${existing.source}@${existing.version} — edit or remove the existing \`catalogue:\` block by hand to change it.`
    );
  }
  const block = [
    'catalogue:                          # optional — pins a central catalogue this repo consumes (L1); see method/09-releases-and-propagation.md §6.4',
    `  source: ${source}`,
    `  version: "${version}"`,
    `  path: ${path}`,
  ].join('\n');
  const base = text || '';
  const sep = base.length === 0 ? '' : base.endsWith('\n') ? '' : '\n';
  return `${base}${sep}${block}\n`;
}

// Read transitrix.yaml at orgRoot, append the pin, write it back. Throws
// CatalogueError (via writeCataloguePin) rather than touching the file when a
// `catalogue:` field is already present.
export async function applyCataloguePin(orgRoot, { source, version, path }) {
  const { writeFile } = await import('node:fs/promises');
  const manifestPath = join(resolve(orgRoot), 'transitrix.yaml');
  const text = await readManifestText(orgRoot);
  if (text === null) {
    throw new CatalogueError(`no transitrix.yaml found at ${resolve(orgRoot)} — a repository joins at L1 only once its manifest exists.`);
  }
  const next = writeCataloguePin(text, { source, version, path });
  await writeFile(manifestPath, next, 'utf8');
  return { path: manifestPath, source, version, pinPath: path };
}

// ── Fails-closed loader ─────────────────────────────────────────────────────

// Load, parse, and version-match the pinned catalogue slice for an org root.
// Returns null when `catalogue:` is absent — a valid, unaffected L0/pre-L1 state.
// Once a pin IS present: a missing/unreadable path, unparseable content, or a
// version mismatch between the slice's own declared `version` and the manifest's
// `catalogue.version` all throw CatalogueError — no fallback, no partial catalogue
// (method/09-releases-and-propagation.md — "fails closed").
export async function loadCatalogueSlice(orgRoot) {
  const manifestText = await readManifestText(orgRoot);
  const decl = parseCatalogueDecl(manifestText || '');
  if (decl === null) return null;
  if (decl.malformed) throw new CatalogueError(`transitrix.yaml: ${decl.reason}`);

  const abspath = resolve(orgRoot, decl.path);
  let text;
  try {
    text = await readFile(abspath, 'utf8');
  } catch {
    throw new CatalogueError(
      `pinned catalogue slice not found/readable at "${decl.path}" (transitrix.yaml catalogue.path, resolved to ${abspath}). ` +
      'The CLI never fetches the slice at runtime — vendor it at this path or correct the pin.'
    );
  }

  const slice = parseCatalogueSlice(text);
  if (slice.version !== decl.version) {
    throw new CatalogueError(
      `pinned catalogue slice at "${decl.path}" declares version "${slice.version}", which does not match ` +
      `transitrix.yaml catalogue.version "${decl.version}" — re-vendor the slice at the pinned version or update the pin.`
    );
  }

  return { source: decl.source, version: decl.version, path: decl.path, elements: slice.elements };
}

// ── Local canon elements (name / aliases / canon_id) ────────────────────────

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

// A block-map key's presence, independent of its value shape (`origin` is a map,
// never a scalar, so readTopScalar — which requires a same-line value — cannot see
// it at all: absent and present-as-a-block are otherwise indistinguishable to it).
function hasTopKey(text, key) {
  return typeof text === 'string' && new RegExp(`^${key}:`, 'm').test(text);
}

// Read { id, type, name, aliases, description, canon_id, origin } off every admitted
// canon file — the surface forms, TYPE, and (optional) binding fields the L1 diff and
// the BIND-001..005 envelope rules (CONTRACT.md §17.2) need. `type` is the catalogue
// TYPE (the id's own prefix, IDS_AND_REFERENCES §1 — repo-check.mjs's
// elementTypesOnDisk derives it the same way), NOT a per-TYPE subtype field some
// element schemas separately carry under their own `type:` key. `origin` is read as
// presence-only (BIND-005 only needs to know whether it is there, never its content —
// a project repository's own element should never carry it at all). `description` is
// read as a single-line scalar only — a multi-line block-scalar description reads
// back as null here, same tiny-parser posture as everywhere else in this file.
// canon/unresolved/ is excluded (CONTRACT.md §13 — a holding area, not admitted typed
// canon, same exclusion canon.mjs's buildCanonIndex and repo-check.mjs's tallyZone
// already apply).
export async function collectLocalElements(orgRoot) {
  const canonDir = join(resolve(orgRoot), 'canon');
  const out = [];
  if (!(await exists(canonDir))) return out;
  for (const file of await walkYaml(canonDir)) {
    if (isUnresolvedPath(file)) continue;
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    const id = readTopScalar(text, 'id');
    if (!id) continue;
    const parsed = parseId(id);
    out.push({
      id,
      type: parsed ? parsed.type : null,
      name: readTopScalar(text, 'name'),
      aliases: readTopList(text, 'aliases'),
      description: readTopScalar(text, 'description'),
      canon_id: readTopScalar(text, 'canon_id'),
      origin: hasTopKey(text, 'origin'),
    });
  }
  return out;
}

// ── The two L1 findings — pure, idempotent, report-only ─────────────────────

function normSurface(s) { return typeof s === 'string' ? s.trim().toLowerCase() : null; }

// Diff local canon elements against a loaded catalogue slice's elements, per
// method/09-releases-and-propagation.md §6.4.5's L1 check:
//   collisions       — a BOUND local element (canon_id set) whose name/alias surface
//                       form also matches a DIFFERENT central element (an id other
//                       than its own canon_id) — an ambiguous or conflicting binding.
//   unbound_matches   — an UNBOUND local element (no canon_id) whose name/alias
//                       surface form matches one or more central elements — a term
//                       that may want a binding but does not carry one. Reported even
//                       when the central side itself is ambiguous (more than one
//                       central id shares the surface form) — the acceptance case
//                       "unambiguous locally, ambiguous centrally" still surfaces.
// Data-free in the repo-check.mjs sense (see canon.mjs's ELEM-ALIAS-001 collisions,
// which count only and never emit the colliding value): a finding names the local id
// and the central id(s) it matched — enough for a human to open both sides and act —
// but never the surface-form string itself. One entry per local element (surface
// forms that match are merged into one `central_ids` set), not one per form.
// Pure function of its inputs — no I/O — so it is trivially idempotent: the same
// (localElements, catalogueElements) pair always returns the same findings.
export function findVocabularyDivergence(localElements, catalogueElements) {
  const centralByForm = new Map(); // normalised surface form -> Set(central id)
  for (const ce of catalogueElements || []) {
    for (const f of [ce.name, ...(ce.aliases || [])]) {
      const key = normSurface(f);
      if (!key) continue;
      if (!centralByForm.has(key)) centralByForm.set(key, new Set());
      centralByForm.get(key).add(ce.id);
    }
  }

  const collisions = [];
  const unbound_matches = [];

  for (const le of localElements || []) {
    const matched = new Set();
    for (const value of [le.name, ...(le.aliases || [])]) {
      const key = normSurface(value);
      if (!key) continue;
      const centralIds = centralByForm.get(key);
      if (!centralIds) continue;
      for (const id of centralIds) matched.add(id);
    }
    if (matched.size === 0) continue;

    if (le.canon_id) {
      const others = [...matched].filter((id) => id !== le.canon_id).sort();
      if (others.length > 0) collisions.push({ local_id: le.id, central_ids: others });
    } else {
      unbound_matches.push({ local_id: le.id, central_ids: [...matched].sort() });
    }
  }

  collisions.sort((a, b) => a.local_id.localeCompare(b.local_id));
  unbound_matches.sort((a, b) => a.local_id.localeCompare(b.local_id));

  return { collisions, unbound_matches };
}

// ── Binding envelope validation — BIND-001..005 (CONTRACT.md §17.2) ────────

// Check every local element's `canon_id` / `origin` fields against the binding
// envelope's five rules. Pure function of its inputs (no I/O) — the same
// (localElements, catalogueSlice) pair always returns the same findings.
//
//   unresolved       — BIND-001: `canon_id` does not resolve to any element in the
//                       pinned catalogue.
//   type_mismatch     — BIND-002: `canon_id` resolves, but the resolved central
//                       element's TYPE differs from this element's own TYPE.
//   duplicate_target — BIND-003: two or more local elements carry the same
//                       `canon_id` — a cross-catalogue check, reported once per
//                       central id with every claiming local id attached.
//   missing_pin       — BIND-004: `canon_id` is present but `catalogueSlice` is
//                       null — no pin declared (or a declared pin that failed to
//                       load; a binding cannot be validated without a working
//                       catalogue either way).
//   origin_present     — BIND-005: `origin` is present on a local element. Every
//                       element this function sees is, by construction, a
//                       *project* repository's own canon — `origin` records
//                       provenance for a *central* repository's admitted element,
//                       so its presence here is always a violation, regardless of
//                       pin state.
// Data-free posture matches findVocabularyDivergence: findings name ids (the
// minimum needed to act), never a surface-form string.
export function checkBindings(localElements, catalogueSlice) {
  const centralById = new Map();
  for (const ce of (catalogueSlice && catalogueSlice.elements) || []) centralById.set(ce.id, ce);

  const unresolved = [];
  const type_mismatch = [];
  const missing_pin = [];
  const origin_present = [];
  const byCanonId = new Map(); // canon_id -> [local_id...] (bound + resolved + type-matched only)

  for (const le of localElements || []) {
    if (le.origin) origin_present.push({ local_id: le.id });
    if (!le.canon_id) continue;

    if (!catalogueSlice) { missing_pin.push({ local_id: le.id }); continue; }

    const ce = centralById.get(le.canon_id);
    if (!ce) { unresolved.push({ local_id: le.id, canon_id: le.canon_id }); continue; }
    if (ce.type !== le.type) {
      type_mismatch.push({ local_id: le.id, canon_id: le.canon_id, local_type: le.type, central_type: ce.type });
      continue;
    }
    if (!byCanonId.has(le.canon_id)) byCanonId.set(le.canon_id, []);
    byCanonId.get(le.canon_id).push(le.id);
  }

  const duplicate_target = [];
  for (const [canonId, ids] of byCanonId) {
    if (ids.length > 1) duplicate_target.push({ canon_id: canonId, local_ids: ids.sort() });
  }

  unresolved.sort((a, b) => a.local_id.localeCompare(b.local_id));
  type_mismatch.sort((a, b) => a.local_id.localeCompare(b.local_id));
  duplicate_target.sort((a, b) => a.canon_id.localeCompare(b.canon_id));
  missing_pin.sort((a, b) => a.local_id.localeCompare(b.local_id));
  origin_present.sort((a, b) => a.local_id.localeCompare(b.local_id));

  return { unresolved, type_mismatch, duplicate_target, missing_pin, origin_present };
}

// ── Orchestrator ─────────────────────────────────────────────────────────

// Run the full L1 check for an org root. Returns null when no `catalogue:` pin is
// declared (nothing to report — L0/pre-L1 is unaffected, MANIFEST.md). Throws
// CatalogueError when a pin IS present but fails closed (missing/unreadable path,
// unparseable content, version mismatch) — the caller decides whether to propagate
// that as a hard failure or surface it as a report-line (repo-check.mjs does the
// latter, consistent with how it already degrades an unresolved coverage_profile to
// a warning rather than crashing the whole report).
export async function catalogueCheck(orgRoot) {
  const slice = await loadCatalogueSlice(orgRoot);
  if (!slice) return null;
  const localElements = await collectLocalElements(orgRoot);
  const { collisions, unbound_matches } = findVocabularyDivergence(localElements, slice.elements);
  return {
    pin: { source: slice.source, version: slice.version },
    collisions,
    unbound_matches,
  };
}

export { CatalogueError };
