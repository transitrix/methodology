// `validate` — enforce the candidate contract in code. The bundle's
// candidate.schema.json is the documented contract; this mirrors its invariants
// (the same pattern as the onboard integrity test, which reimplements its checks
// rather than loading a schema — so the published CLI needs no schema-file or
// JSON-Schema-validator dependency).
//
// Candidates are read as JSON (the intermediate pipeline representation). A
// candidate that does not validate is FLAGGED with an actionable reason and routed
// to the review queue — never silently dropped, never written to canon.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidId, isValidType } from './ids.mjs';
import { classifyCoverage } from './coverage.mjs';

const EXTRACTION_CONFIDENCE = new Set(['high', 'medium', 'low']);

// Validate one candidate against `profile`. Returns
// { validation_flags: [...], coverage_flag, coverage_reason? }.
export function validateCandidate(cand, profile) {
  const flags = [];
  if (!cand || typeof cand !== 'object' || Array.isArray(cand)) {
    return { validation_flags: ['candidate is not a JSON object'], coverage_flag: 'out_of_profile' };
  }

  if (cand.kind !== 'element' && cand.kind !== 'relation') {
    flags.push(`kind must be "element" or "relation" (got ${JSON.stringify(cand.kind)})`);
  }
  if (!Array.isArray(cand.derived_from) || cand.derived_from.length < 1) {
    flags.push('derived_from must cite at least one field artefact ID');
  } else {
    for (const d of cand.derived_from) if (!isValidId(d)) flags.push(`derived_from has an invalid ID: ${d}`);
  }
  if (cand.admitted_to !== 'pending') {
    flags.push('admitted_to must be "pending" — the CLI proposes, it never admits to canon');
  }
  if (!EXTRACTION_CONFIDENCE.has(cand.extraction_confidence)) {
    flags.push(`extraction_confidence must be high|medium|low (got ${JSON.stringify(cand.extraction_confidence)})`);
  }
  // Two-axes separation: source trust lives on the FIELD artefact, never on a candidate.
  if ('source_quality' in cand) {
    flags.push('source_quality must not appear on a candidate — it belongs on the field artefact (CONTRACT §11)');
  }

  let type = null;
  if (cand.kind === 'element') {
    if (!isValidId(cand.id)) flags.push(`element id violates the ID grammar: ${cand.id}`);
    if (!cand.name) flags.push('element is missing name');
    if (!isValidType(cand.element_type)) flags.push(`element_type is not a valid TYPE: ${cand.element_type}`);
    type = cand.element_type;
  } else if (cand.kind === 'relation') {
    if (!cand.rel_kind) flags.push('relation is missing rel_kind');
    if (!isValidId(cand.from)) flags.push(`relation "from" violates the ID grammar: ${cand.from}`);
    if (!isValidId(cand.to)) flags.push(`relation "to" violates the ID grammar: ${cand.to}`);
    type = cand.rel_kind;
  }

  const cov = classifyCoverage(profile, type);
  return { validation_flags: flags, coverage_flag: cov.flag, coverage_reason: cov.reason };
}

// Load every *.json candidate from a directory. Returns [{ ref, candidate }].
// A file that does not parse is surfaced as a candidate-shaped error entry.
export async function loadCandidates(dir) {
  const out = [];
  let names;
  try { names = await readdir(dir); } catch { return out; }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const ref = join(dir, name);
    try {
      out.push({ ref, candidate: JSON.parse(await readFile(ref, 'utf8')) });
    } catch (err) {
      out.push({ ref, candidate: null, parseError: err.message });
    }
  }
  return out;
}

export { EXTRACTION_CONFIDENCE };
