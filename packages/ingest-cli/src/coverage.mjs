// Coverage-profile awareness. Reads the adopter's `coverage_profile` from
// transitrix.yaml (COVERAGE_PROFILES.md) and classifies a candidate's TYPE / REL
// kind as in- or out-of-profile per CP-003.
//
// The authoritative preset membership (§3 / §3.1) ships with the CLI in
// coverage-presets.mjs, so the CLI RESOLVES membership rather than guessing. It
// handles the three declared forms:
//   - short form   `coverage_profile: core`     → a shipped preset (§3.2 / §9.2);
//   - custom map    `extends:` + `layers:`        → preset + per-layer delta (§4);
//   - absent                                      → defaults to `full` (§9.1).
//
// When a profile is PRESENT but cannot be resolved (unknown preset, missing
// `extends:`, malformed), the CLI does NOT silently treat the repo as `full`: it
// resolves permissively (so nothing is wrongly dropped) but carries an explicit
// WARNING that surfaces in both the CLI output and the review queue. Codex artefacts
// and the cross-cutting `ASSERTION` primitive are never bounded by a profile (§2.1).

import { readManifestText } from './intake.mjs';
import { readTopScalar } from './yaml.mjs';
import { PRESETS, PRESET_NAMES, LAYERS } from './coverage-presets.mjs';

// ── Value cleaning ───────────────────────────────────────────────

// Trim, strip a trailing ` # comment`, and unquote a scalar value.
export function clean(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  const h = s.indexOf(' #');
  if (h >= 0) s = s.slice(0, h).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s || null;
}

// Parse a YAML inline list `[A, B]` / `[]` into an array. Returns null if `v` is not
// a bracketed list (so the caller can treat the value as block-style).
export function parseInlineList(v) {
  let s = String(v).trim();
  if (!s.startsWith('[')) return null;
  s = s.replace(/^\[/, '').replace(/\][ \t]*(#.*)?$/, '').trim();
  if (s === '') return [];
  return s.split(',').map((x) => clean(x)).filter(Boolean);
}

// ── Declaration parsing ──────────────────────────────────────────

// Parse the `coverage_profile:` declaration out of manifest text. Returns one of:
//   { kind: 'absent' }
//   { kind: 'short', name }
//   { kind: 'custom', extends, pinned_to, layers: { <id>: { disabled?, elements:{add,remove}, relations:{add,remove} } } }
//   { kind: 'unresolved', reason }
// This is a purpose-built reader for the constrained profile sub-tree — not a general
// YAML parser (the CLI ships zero dependencies; see yaml.mjs).
export function parseProfileDecl(text) {
  if (typeof text !== 'string') return { kind: 'absent' };
  const lines = text.split(/\r?\n/);

  let idx = -1, inline = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^coverage_profile:(.*)$/);
    if (m) { idx = i; inline = m[1]; break; }
  }
  if (idx < 0) return { kind: 'absent' };

  const inlineVal = clean(inline);
  if (inlineVal) return { kind: 'short', name: inlineVal };

  // Map form — gather the indented block under coverage_profile.
  const block = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.trim() === '' || ln.trim().startsWith('#')) continue;
    if (/^\S/.test(ln)) break; // next top-level key ends the block
    block.push(ln);
  }
  if (block.length === 0) {
    return { kind: 'unresolved', reason: 'coverage_profile is present but empty (neither a preset name nor a map)' };
  }

  let extendsName = null, pinnedTo = null;
  const layers = {};
  let curLayer = null, curSection = null, curList = null;
  const ensureLayer = (id) => (layers[id] = layers[id] || {
    elements: { add: [], remove: [] }, relations: { add: [], remove: [] },
  });

  for (const ln of block) {
    const t = ln.trim();
    let m;
    if ((m = t.match(/^extends:[ \t]*(.+)$/))) { extendsName = clean(m[1]); curLayer = curSection = curList = null; continue; }
    if ((m = t.match(/^pinned_to:[ \t]*(.+)$/))) { pinnedTo = clean(m[1]); continue; }
    if (/^layers:[ \t]*$/.test(t)) { curLayer = curSection = curList = null; continue; }
    if ((m = t.match(/^([0-9][0-9]_[a-z_]+):[ \t]*$/))) { curLayer = m[1]; ensureLayer(curLayer); curSection = curList = null; continue; }
    if (/^disabled:[ \t]*true[ \t]*$/.test(t) && curLayer) { ensureLayer(curLayer).disabled = true; continue; }
    if ((m = t.match(/^(elements|relations):[ \t]*(.*)$/)) && curLayer) {
      curSection = m[1]; curList = null;
      const rest = m[2].trim();
      if (rest.startsWith('{')) {
        // Inline flow map, e.g. `elements: { remove: [], add: [STAKEHOLDER] }`.
        const inner = rest.replace(/^\{/, '').replace(/\}[ \t]*$/, '');
        const re = /(add|remove):[ \t]*(\[[^\]]*\])/g;
        let mm;
        while ((mm = re.exec(inner))) ensureLayer(curLayer)[curSection][mm[1]].push(...(parseInlineList(mm[2]) || []));
        curSection = null;
      }
      continue;
    }
    if ((m = t.match(/^(add|remove):[ \t]*(.*)$/)) && curLayer && curSection) {
      curList = m[1];
      const rest = m[2].trim();
      if (rest) {
        const list = parseInlineList(rest);
        if (list) { ensureLayer(curLayer)[curSection][curList].push(...list); curList = null; }
      }
      continue;
    }
    if ((m = t.match(/^-[ \t]*(.+)$/)) && curLayer && curSection && curList) {
      const v = clean(m[1]);
      if (v) ensureLayer(curLayer)[curSection][curList].push(v);
      continue;
    }
    // Anything else inside the block is ignored (best-effort).
  }

  if (!extendsName) {
    return { kind: 'unresolved', reason: 'custom coverage_profile is missing the required `extends:` key (CP-001)' };
  }
  return { kind: 'custom', extends: extendsName, pinned_to: pinnedTo, layers };
}

// ── Resolution ───────────────────────────────────────────────────

function fullProfile(display) {
  return { display, isFull: true, elements: null, relations: null, removedElements: null, removedRelations: null, unresolved: false, warning: null };
}
function unresolvedProfile(display, reason) {
  return {
    display, isFull: true, elements: null, relations: null, removedElements: null, removedRelations: null,
    unresolved: true,
    warning: `coverage_profile ${display} present but could not be resolved (${reason}) — defaulted to full; coverage flags are NOT authoritative. See COVERAGE_PROFILES.md.`,
  };
}

// Materialise a preset into per-layer Sets (so a delta can disable / trim a layer).
function materializeLayers(presetName) {
  const p = PRESETS[presetName];
  const el = {}, rel = {};
  for (const L of LAYERS) {
    el[L] = new Set((p.elements && p.elements[L]) || []);
    rel[L] = new Set((p.relations && p.relations[L]) || []);
  }
  return { el, rel };
}

function applyDeltas(base, deltaLayers) {
  const { el, rel } = materializeLayers(base);
  for (const [L, d] of Object.entries(deltaLayers)) {
    if (!LAYERS.includes(L)) continue; // out-of-set layer name (CP-001) — admission-time concern
    if (!el[L]) { el[L] = new Set(); rel[L] = new Set(); }
    if (d.disabled) { el[L] = new Set(); rel[L] = new Set(); continue; }
    for (const t of d.elements.remove) el[L].delete(t);
    for (const t of d.elements.add) el[L].add(t);
    for (const t of d.relations.remove) rel[L].delete(t);
    for (const t of d.relations.add) rel[L].add(t);
  }
  const elements = new Set(), relations = new Set();
  for (const L of LAYERS) { for (const x of el[L]) elements.add(x); for (const x of rel[L]) relations.add(x); }
  return { elements, relations };
}

// `extends: full` cannot be enumerated (the CLI does not ship the whole registry), so
// resolve it as full MINUS the removed TYPEs — membership is still exact for any TYPE
// the delta names, and permissive (full) for the rest.
function applyDeltasOnFull(deltaLayers) {
  const removedElements = new Set(), removedRelations = new Set();
  let cannotDisable = false;
  for (const [L, d] of Object.entries(deltaLayers)) {
    if (!LAYERS.includes(L)) continue;
    if (d.disabled) { cannotDisable = true; continue; }
    for (const t of d.elements.remove) removedElements.add(t);
    for (const t of d.elements.add) removedElements.delete(t);
    for (const t of d.relations.remove) removedRelations.add(t);
    for (const t of d.relations.add) removedRelations.delete(t);
  }
  return { removedElements, removedRelations, cannotDisable };
}

// Resolve a parsed declaration against the methodology version into a profile object
// the classifier consumes: { display, isFull, elements:Set|null, relations:Set|null,
// removedElements:Set|null, removedRelations:Set|null, unresolved, warning }.
export function resolveCoverageProfile(decl, methodologyVersion) {
  if (!decl || decl.kind === 'absent') return fullProfile('full (default — coverage_profile omitted)');

  if (decl.kind === 'short') {
    if (decl.name === 'full') return fullProfile('full');
    if (PRESET_NAMES.has(decl.name)) {
      const { el, rel } = materializeLayers(decl.name);
      const elements = new Set(), relations = new Set();
      for (const L of LAYERS) { for (const x of el[L]) elements.add(x); for (const x of rel[L]) relations.add(x); }
      return { display: decl.name, isFull: false, elements, relations, removedElements: null, removedRelations: null, unresolved: false, warning: null };
    }
    return unresolvedProfile(`"${decl.name}"`, `unknown preset — not one of ${[...PRESET_NAMES].join('|')} (CP-001)`);
  }

  if (decl.kind === 'unresolved') return unresolvedProfile('(custom map)', decl.reason);

  if (decl.kind === 'custom') {
    if (!PRESET_NAMES.has(decl.extends)) {
      return unresolvedProfile(`extends:"${decl.extends}"`, `extends an unknown preset — not one of ${[...PRESET_NAMES].join('|')} (CP-001)`);
    }
    let warning = null;
    if (decl.pinned_to && methodologyVersion && decl.pinned_to !== methodologyVersion) {
      warning = `coverage_profile pinned_to "${decl.pinned_to}" != methodology_version "${methodologyVersion}" — profile may be stale (CP-004); resolved best-effort. See COVERAGE_PROFILES.md §7.`;
    }
    const display = `extends:${decl.extends}`;
    if (decl.extends === 'full') {
      const { removedElements, removedRelations, cannotDisable } = applyDeltasOnFull(decl.layers);
      if (cannotDisable) {
        warning = (warning ? warning + ' ' : '') +
          'a `disabled:` layer under `extends: full` cannot be precisely resolved by the CLI (the full registry is not shipped) — that layer is treated as in-scope; confirm at review.';
      }
      return { display, isFull: true, elements: null, relations: null, removedElements, removedRelations, unresolved: false, warning };
    }
    const { elements, relations } = applyDeltas(decl.extends, decl.layers);
    return { display, isFull: false, elements, relations, removedElements: null, removedRelations: null, unresolved: false, warning };
  }

  return fullProfile('full');
}

// Read + resolve the adopter's coverage profile for an org root. Returns the resolved
// profile object (never just a string), so callers get membership + any warning.
export async function readCoverageProfile(orgRoot) {
  const text = await readManifestText(orgRoot);
  const decl = parseProfileDecl(text || '');
  const mv = text ? readTopScalar(text, 'methodology_version') : null;
  return resolveCoverageProfile(decl, mv);
}

// ── Classification ───────────────────────────────────────────────

// Classify a candidate's TYPE / REL kind against the resolved profile. `candKind` is
// the candidate kind ('element' | 'relation' | 'assertion'); `type` is its element
// TYPE, rel kind, or 'ASSERTION'. Returns { flag, reason? }.
export function classifyCoverage(profile, candKind, type) {
  if (!profile) return { flag: 'in_profile' };
  // ASSERTION (and codex) are never bounded by a coverage profile (§2.1).
  if (candKind === 'assertion') return { flag: 'in_profile' };

  if (profile.isFull) {
    if (candKind === 'element' && profile.removedElements && profile.removedElements.has(type)) {
      return { flag: 'out_of_profile', reason: `element TYPE "${type}" was removed from coverage profile ${profile.display} (CP-003).` };
    }
    if (candKind === 'relation' && profile.removedRelations && profile.removedRelations.has(type)) {
      return { flag: 'out_of_profile', reason: `relation kind "${type}" was removed from coverage profile ${profile.display} (CP-003).` };
    }
    return { flag: 'in_profile' };
  }

  if (candKind === 'element') {
    return profile.elements.has(type)
      ? { flag: 'in_profile' }
      : { flag: 'out_of_profile', reason: `element TYPE "${type}" is not in coverage profile ${profile.display} (CP-003).` };
  }
  if (candKind === 'relation') {
    return profile.relations.has(type)
      ? { flag: 'in_profile' }
      : { flag: 'out_of_profile', reason: `relation kind "${type}" is not in coverage profile ${profile.display} (CP-003).` };
  }
  return { flag: 'in_profile' };
}
