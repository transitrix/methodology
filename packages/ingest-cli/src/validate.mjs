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

// Closed REL `type` enum — notations/elements/17-relations.md §3. The enum is closed
// in v1; adding a kind is a non-backwards-compatible methodology revision. The CLI
// tracks it (like ID_RE) so a rel_kind outside the enum is FLAGGED for review — never
// silently emitted, never dropped. This completes the candidate contract: the bundle's
// candidate.schema.json names "closed REL kinds" among what validation_flags covers.
const CLOSED_REL_KINDS = new Set([
  'parent', 'goal_parent', 'target_state_satisfies_goal', 'assessment_influences_goal',
  'activity_goal', 'unit_parent', 'employment', 'candidacy', 'alumni_membership',
  'community_membership', 'contracting', 'stakeholding',
]);

// ASSERTION contract — notations/elements/16-assertion.md §2/§3. `about` must reference
// a REQUIREMENT (ASSERT-002 resolution is canon-side; the candidate stage checks the
// grammar + TYPE prefix); `subject` TYPE is restricted (ASSERT-003); `status` is a
// closed enum. Cross-document resolution (does `about` resolve to an admitted
// REQUIREMENT) happens at the human admission gate, not here.
const ASSERTION_STATUS = new Set(['compliant', 'partial', 'non_compliant', 'under_review', 'n_a']);
const ASSERTION_SUBJECT_TYPES = new Set(['PRODUCT', 'PROCESS', 'CAPABILITY']);

function typeOf(id) { return typeof id === 'string' ? id.split('-')[0] : null; }

// Validate one candidate against `profile`. Returns
// { validation_flags: [...], coverage_flag, coverage_reason? }.
export function validateCandidate(cand, profile) {
  const flags = [];
  if (!cand || typeof cand !== 'object' || Array.isArray(cand)) {
    return { validation_flags: ['candidate is not a JSON object'], coverage_flag: 'out_of_profile' };
  }

  if (cand.kind !== 'element' && cand.kind !== 'relation' && cand.kind !== 'assertion') {
    flags.push(`kind must be "element", "relation" or "assertion" (got ${JSON.stringify(cand.kind)})`);
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
    else if (!CLOSED_REL_KINDS.has(cand.rel_kind)) flags.push(`rel_kind is not a closed REL kind (17-relations.md §3): ${cand.rel_kind}`);
    if (!isValidId(cand.from)) flags.push(`relation "from" violates the ID grammar: ${cand.from}`);
    if (!isValidId(cand.to)) flags.push(`relation "to" violates the ID grammar: ${cand.to}`);
    type = cand.rel_kind;
  } else if (cand.kind === 'assertion') {
    if (!isValidId(cand.id)) flags.push(`assertion id violates the ID grammar: ${cand.id}`);
    if (!isValidId(cand.about)) flags.push(`assertion "about" violates the ID grammar: ${cand.about}`);
    else if (typeOf(cand.about) !== 'REQUIREMENT') flags.push(`assertion "about" must reference a REQUIREMENT (ASSERT-002): ${cand.about}`);
    if (!isValidId(cand.subject)) flags.push(`assertion "subject" violates the ID grammar: ${cand.subject}`);
    else if (!ASSERTION_SUBJECT_TYPES.has(typeOf(cand.subject))) flags.push(`assertion "subject" TYPE must be PRODUCT|PROCESS|CAPABILITY (ASSERT-003): ${cand.subject}`);
    if (!ASSERTION_STATUS.has(cand.status)) flags.push(`assertion status must be compliant|partial|non_compliant|under_review|n_a (got ${JSON.stringify(cand.status)})`);
    if (cand.realised_via !== undefined) {
      if (!Array.isArray(cand.realised_via)) flags.push('assertion realised_via must be an array of typed IDs');
      else for (const rv of cand.realised_via) if (!isValidId(rv)) flags.push(`assertion realised_via has an invalid ID: ${rv}`);
    }
    type = 'ASSERTION';
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

export { EXTRACTION_CONFIDENCE, CLOSED_REL_KINDS, ASSERTION_STATUS, ASSERTION_SUBJECT_TYPES };
