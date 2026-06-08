// `review-queue` — assemble the human gate for a batch. Lists the field artefacts
// referenced by the candidates (with their PROPOSED source_quality, for the human to
// confirm), every candidate with its derived_from / extraction_confidence / coverage
// + validation flags, and any below-threshold relation suggestions. Emitted as YAML
// (write-only via the dumper). NOTHING here is admitted to canon.

import { readFile, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dump, readTopScalar } from './yaml.mjs';
import { validateCandidate, loadCandidates } from './validate.mjs';
import { buildCanonIndex, admittedMatch } from './canon.mjs';
import { parseId } from './ids.mjs';
import { TYPE_INFO } from './field-artefact.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Resolve a field artefact file from its ID and read its proposed source_quality.
async function readFieldArtefact(orgRoot, id) {
  const p = parseId(id);
  const info = p && TYPE_INFO[p.type];
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
    candidates.push({
      ref,
      kind: candidate.kind,
      extraction_confidence: candidate.extraction_confidence ?? null,
      coverage_flag: v.coverage_flag,
      ...(v.coverage_reason ? { coverage_reason: v.coverage_reason } : {}),
      validation_flags: v.validation_flags,
    });
  }

  const field_artefacts = [];
  for (const id of [...fieldIds].sort()) field_artefacts.push(await readFieldArtefact(orgRoot, id));

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
