// `review-queue` — assemble the human gate for a batch. Lists the field artefacts
// referenced by the candidates (with their PROPOSED source_quality, for the human to
// confirm), every candidate with its derived_from / extraction_confidence / coverage
// + validation flags, and any below-threshold relation suggestions. Emitted as YAML
// (write-only via the dumper). NOTHING here is admitted to canon.

import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dump, readTopScalar } from './yaml.mjs';
import { validateCandidate, loadCandidates } from './validate.mjs';
import { buildCanonIndex, admittedMatch } from './canon.mjs';
import { resolvePlacement } from './placement.mjs';
import { parseId } from './ids.mjs';
import { TYPE_INFO as FIELD_TYPE_INFO } from './field-artefact.mjs';
import { TYPE_INFO as CODEX_TYPE_INFO } from './codex-artefact.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Locate a codex artefact file by id. Internal codex (POLICY / INTERNAL_STANDARD) is
// flat under codex/internal/; external codex (LAW / REGULATION) lives under
// codex/external/<jurisdiction>/ and the jurisdiction is not derivable from the id, so
// scan the jurisdiction subfolders.
async function findCodexFile(orgRoot, id, scope) {
  const root = resolve(orgRoot);
  if (scope === 'internal') {
    const f = join(root, 'codex', 'internal', `${id}.yaml`);
    return (await exists(f)) ? f : null;
  }
  const extDir = join(root, 'codex', 'external');
  let entries;
  try { entries = await readdir(extDir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const f = join(extDir, e.name, `${id}.yaml`);
    if (await exists(f)) return f;
  }
  return null;
}

// Resolve a derived_from id to its source artefact and read what the human gate needs.
// A FIELD artefact (interview/survey/…) carries a PROPOSED source_quality to confirm.
// A CODEX artefact (law/regulation/policy/standard) is authoritative by construction —
// it carries no source_quality, so it is surfaced as such rather than as a missing field
// artefact (F13).
async function readSourceArtefact(orgRoot, id) {
  const p = parseId(id);
  const type = p && p.type;

  const codex = type && CODEX_TYPE_INFO[type];
  if (codex) {
    const file = await findCodexFile(orgRoot, id, codex.scope);
    if (!file) return { id, zone: 'codex', found: false };
    const text = await readFile(file, 'utf8');
    return {
      id,
      zone: 'codex',
      found: true,
      authoritative: true,   // codex is authoritative by construction — no source_quality to confirm
      effective_date: readTopScalar(text, 'effective_date') || undefined,
      source_hash: readTopScalar(text, 'source_hash') || undefined,
    };
  }

  const info = type && FIELD_TYPE_INFO[type];
  if (!info) return { id, proposed_source_quality: null, found: false };
  const file = join(resolve(orgRoot), 'field', info.sub, `${id}.yaml`);
  if (!(await exists(file))) return { id, proposed_source_quality: null, found: false };
  const text = await readFile(file, 'utf8');
  return {
    id,
    proposed_source_quality: readTopScalar(text, 'source_quality'),
    raw_source: readTopScalar(text, 'raw_source') || undefined,
    source_hash: readTopScalar(text, 'source_hash') || undefined,
  };
}

export async function buildReviewQueue({ orgRoot, candidatesDir, profile, suggestions = [] }) {
  const loaded = await loadCandidates(candidatesDir);
  // Read (never write) canon so the queue is idempotent against it: a candidate that
  // already passed the human gate is excluded, not re-listed for re-approval.
  const canon = await buildCanonIndex(orgRoot);

  const candidates = [];
  const excluded_admitted = [];
  const fieldIds = new Set();
  for (const { ref, candidate, parseError } of loaded) {
    if (parseError || !candidate) {
      candidates.push({ ref, kind: 'unknown', extraction_confidence: null,
        coverage_flag: 'out_of_profile', validation_flags: [`does not parse: ${parseError || 'null'}`] });
      continue;
    }
    const already = admittedMatch(candidate, canon);
    if (already) { excluded_admitted.push({ ref, matched: already }); continue; }
    const v = validateCandidate(candidate, profile);
    for (const d of candidate.derived_from || []) fieldIds.add(d);
    // Surface the deterministic §4 placement (mode + layer + folder) for an element
    // candidate, so the human gate places it consistently instead of by judgement.
    const place = candidate.kind === 'element' ? resolvePlacement(candidate.element_type) : null;
    candidates.push({
      ref,
      kind: candidate.kind,
      extraction_confidence: candidate.extraction_confidence ?? null,
      coverage_flag: v.coverage_flag,
      ...(v.coverage_reason ? { coverage_reason: v.coverage_reason } : {}),
      ...(place ? { placement: { mode: place.mode, layer: place.layer, folder: place.folder, ...(place.promotable ? { promotable: true } : {}) } } : {}),
      validation_flags: v.validation_flags,
    });
  }

  const field_artefacts = [];
  for (const id of [...fieldIds].sort()) field_artefacts.push(await readSourceArtefact(orgRoot, id));

  return {
    generated_by: '@transitrix/ingest-cli',
    org_root: resolve(orgRoot),
    coverage_profile: (profile && profile.display) || 'full',
    ...(profile && profile.warning ? { coverage_warning: profile.warning } : {}),
    field_artefacts,
    candidates,
    excluded_admitted,
    relation_suggestions: suggestions,
    gate: { admits_to_canon: false },
  };
}

export async function writeReviewQueue(queue, outPath) {
  await writeFile(outPath, dump(queue), 'utf8');
  return outPath;
}
