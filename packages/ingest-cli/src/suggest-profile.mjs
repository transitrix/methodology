// `suggest-profile` — discovery mode. Scans candidate TYPEs against the adopter's
// active coverage profile and PROPOSES a profile delta covering the out-of-profile TYPEs
// it finds. Read-only and non-mutating: it never widens the profile itself — the profile
// is the guardrail, and widening it is a human decision (COVERAGE_PROFILES.md CP-001 /
// CP-003). The output is a paste-ready `coverage_profile:` map plus a per-TYPE breakdown.

import { classifyCoverage } from './coverage.mjs';
import { resolvePlacement } from './placement.mjs';
import { PRESETS } from './coverage-presets.mjs';

// rel kind -> layer, learned from the shipped presets (best-effort). A kind that appears
// in no preset has no layer the CLI can derive; it is reported as `unplaceable` for the
// human to site, never guessed.
function relLayerIndex() {
  const idx = {};
  for (const name of Object.keys(PRESETS)) {
    const p = PRESETS[name];
    if (!p || p === 'ALL' || !p.relations) continue;
    for (const [layer, kinds] of Object.entries(p.relations)) {
      for (const k of kinds) if (!(k in idx)) idx[k] = layer;
    }
  }
  return idx;
}

// Build a profile-suggestion report from loaded candidates (the [{candidate}] shape
// loadCandidates returns), the resolved `profile`, and the base preset name the delta
// should `extends:`. Pure — no I/O.
export function buildProfileSuggestion(loaded, profile, baseName) {
  const relLayer = relLayerIndex();
  const elements = new Map();   // element TYPE -> { layer, count }
  const relations = new Map();  // rel kind    -> { layer, count }

  for (const { candidate } of loaded) {
    if (!candidate || typeof candidate !== 'object') continue;
    if (candidate.kind === 'element' && candidate.element_type) {
      if (classifyCoverage(profile, 'element', candidate.element_type).flag === 'out_of_profile') {
        const cur = elements.get(candidate.element_type)
          || { layer: (resolvePlacement(candidate.element_type) || {}).layer || null, count: 0 };
        cur.count++;
        elements.set(candidate.element_type, cur);
      }
    } else if (candidate.kind === 'relation' && candidate.rel_kind) {
      if (classifyCoverage(profile, 'relation', candidate.rel_kind).flag === 'out_of_profile') {
        const cur = relations.get(candidate.rel_kind) || { layer: relLayer[candidate.rel_kind] || null, count: 0 };
        cur.count++;
        relations.set(candidate.rel_kind, cur);
      }
    }
    // ASSERTION (and codex) are never coverage-bounded (§2.1) — skipped.
  }

  // Group the placeable TYPEs into a layer-keyed delta; collect the rest as unplaceable.
  const layers = {};
  const ensure = (L) => (layers[L] = layers[L] || {});
  const unplaceable = { elements: [], relations: [] };

  for (const type of [...elements.keys()].sort()) {
    const layer = elements.get(type).layer;
    if (layer) { const e = ensure(layer); (e.elements = e.elements || { add: [] }).add.push(type); }
    else unplaceable.elements.push(type);
  }
  for (const kind of [...relations.keys()].sort()) {
    const layer = relations.get(kind).layer;
    if (layer) { const e = ensure(layer); (e.relations = e.relations || { add: [] }).add.push(kind); }
    else unplaceable.relations.push(kind);
  }

  const oopElements = [...elements.keys()].sort().map((type) => ({ type, layer: elements.get(type).layer, count: elements.get(type).count }));
  const oopRelations = [...relations.keys()].sort().map((kind) => ({ kind, layer: relations.get(kind).layer, count: relations.get(kind).count }));

  const report = {
    generated_by: '@transitrix/ingest-cli',
    active_profile: profile.display,
    ...(profile.warning ? { coverage_warning: profile.warning } : {}),
    scanned_candidates: loaded.length,
    out_of_profile: { elements: oopElements, relations: oopRelations },
  };

  if (!oopElements.length && !oopRelations.length) {
    report.note = `No out-of-profile candidates under "${profile.display}" — no profile change needed.`;
    return report;
  }

  report.proposed_delta = { extends: baseName, layers };
  if (unplaceable.elements.length || unplaceable.relations.length) report.unplaceable = unplaceable;
  report.note =
    'PROPOSED ONLY — never auto-applied; the coverage profile is the guardrail. Review these out-of-profile ' +
    'TYPEs and, if they belong in the model, set `coverage_profile:` in transitrix.yaml to `proposed_delta` ' +
    '(CP-001 / CP-003). If you already use a custom coverage_profile map, merge the `add:` lists into your ' +
    'existing `layers` and keep your current `extends:`. Anything under `unplaceable` has no layer the CLI ' +
    'could derive — site it by hand.';
  return report;
}
