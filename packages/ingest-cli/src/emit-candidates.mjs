// `emit-candidates` — take the agent's extraction RESULT (produced by running the
// prompts/ over a field artefact) and emit typed canon CANDIDATES. The CLI does the
// deterministic part: it reads derived_from from the field artefact itself, shapes
// each element/relation/assertion into a candidate (admitted_to: pending, the field ID
// in derived_from, extraction_confidence carried through as a review flag), applies
// relation-conservatism, and writes candidate *.json. It never extracts (that is the
// agent's job) and never writes canon.
//
// Relation-conservatism (v0): only HIGH-confidence relations become candidates;
// medium/low relations are held back as review-queue suggestions. Entities and
// assertions flow through regardless of confidence (the flag rides along for the
// reviewer) — an ASSERTION is a constrained claim (about a REQUIREMENT, restricted
// subject TYPE, closed status enum), and the human gate adjudicates every one.
//
// Corroboration: when the SAME candidate (same element id / same REL triple / same
// assertion id) is emitted again from a different field source, derived_from is MERGED
// (union), not overwritten — a fact confirmed across two sources must accumulate its
// citations.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readTopScalar } from './yaml.mjs';
import { isValidId } from './ids.mjs';
import { buildCanonIndex } from './canon.mjs';
import { shapeUnresolved, writeUnresolved } from './unresolved.mjs';

// Normalise a name/alias string for case-insensitive entity-match lookup (F8).
function normName(s) { return typeof s === 'string' ? s.trim().toLowerCase() : null; }

const REL_THRESHOLD = 'high';
const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 };

function safeName(s) {
  return String(s).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
}

// Build candidate objects + suggestions from an extraction result. Pure — no I/O.
export function shapeCandidates(derivedFrom, result) {
  const candidates = [];
  const suggestions = [];

  for (const el of result.elements || []) {
    const c = {
      kind: 'element',
      id: el.id,
      name: el.name,
      element_type: el.element_type,
      derived_from: [derivedFrom],
      admitted_to: 'pending',
      extraction_confidence: el.extraction_confidence,
    };
    if (el.extraction_notes) c.extraction_notes = el.extraction_notes;
    if (el.valid_from !== undefined) c.valid_from = el.valid_from;
    if (el.valid_to !== undefined) c.valid_to = el.valid_to;
    // Mechanism 1 (CONTRACT §12): source fields the schema does not define ride along
    // in an open `extensions:` bag, candidate -> admitted entity, verbatim. Carried only
    // when it is a non-empty map; the validator passes it through untouched (EXT-001).
    if (el.extensions && typeof el.extensions === 'object' && !Array.isArray(el.extensions)
        && Object.keys(el.extensions).length) c.extensions = el.extensions;
    candidates.push(c);
  }

  for (const rel of result.relations || []) {
    if (rel.extraction_confidence === REL_THRESHOLD) {
      const c = {
        kind: 'relation',
        rel_kind: rel.rel_kind,
        from: rel.from,
        to: rel.to,
        derived_from: [derivedFrom],
        admitted_to: 'pending',
        extraction_confidence: rel.extraction_confidence,
      };
      if (rel.extraction_notes) c.extraction_notes = rel.extraction_notes;
      candidates.push(c);
    } else {
      suggestions.push({
        rel_kind: rel.rel_kind,
        from: rel.from,
        to: rel.to,
        reason:
          `held back as a suggestion — extraction_confidence "${rel.extraction_confidence}" is below ` +
          `the "${REL_THRESHOLD}" threshold (relation-conservative v0)`,
      });
    }
  }

  for (const a of result.assertions || []) {
    const c = {
      kind: 'assertion',
      id: a.id,
      about: a.about,
      subject: a.subject,
      status: a.status,
      derived_from: [derivedFrom],
      admitted_to: 'pending',
      extraction_confidence: a.extraction_confidence,
    };
    if (a.realised_via !== undefined) c.realised_via = a.realised_via;
    if (a.evidence !== undefined) c.evidence = a.evidence;
    if (a.extraction_notes) c.extraction_notes = a.extraction_notes;
    candidates.push(c);
  }

  return { candidates, suggestions };
}

// Surface ID-grammar violations at emit time (F14): an element/assertion id or a
// relation endpoint that breaks the canonical grammar (IDS_AND_REFERENCES §1) is caught
// here, one step earlier than `validate`, so the agent sees it as soon as candidates are
// shaped. Pure — returns a list of human-readable warnings; nothing is dropped (the
// candidate is still written and the human gate / `validate` still flags it).
export function collectIdWarnings(candidates) {
  const warnings = [];
  for (const c of candidates) {
    if ((c.kind === 'element' || c.kind === 'assertion') && !isValidId(c.id)) {
      warnings.push(`${c.kind} id violates the ID grammar (IDS §1): ${c.id}`);
    }
    if (c.kind === 'relation') {
      if (!isValidId(c.from)) warnings.push(`relation "from" violates the ID grammar (IDS §1): ${c.from}`);
      if (!isValidId(c.to)) warnings.push(`relation "to" violates the ID grammar (IDS §1): ${c.to}`);
    }
  }
  return warnings;
}

function candidateFilename(c, index) {
  if ((c.kind === 'element' || c.kind === 'assertion') && c.id) return `${safeName(c.id)}.json`;
  if (c.kind === 'relation') return `REL_${safeName(c.rel_kind)}__${safeName(c.from)}__${safeName(c.to)}.json`;
  return `candidate-${index}.json`;
}

async function fileExists(p) { try { await access(p); return true; } catch { return false; } }

// Merge a freshly-shaped candidate with one already on disk for the same key:
// union derived_from (dedup, order-preserving), keep the STRONGER extraction_confidence
// (corroboration raises confidence), and concatenate distinct extraction_notes.
export function mergeCandidates(existing, fresh) {
  const derived_from = Array.isArray(existing.derived_from) ? [...existing.derived_from] : [];
  for (const d of fresh.derived_from || []) if (!derived_from.includes(d)) derived_from.push(d);

  const rank = (v) => (v in CONFIDENCE_RANK ? CONFIDENCE_RANK[v] : -1);
  const extraction_confidence =
    rank(fresh.extraction_confidence) >= rank(existing.extraction_confidence)
      ? fresh.extraction_confidence : existing.extraction_confidence;

  const merged = { ...existing, ...fresh, derived_from, extraction_confidence };

  const notes = [];
  for (const n of [existing.extraction_notes, fresh.extraction_notes]) {
    if (n && !notes.includes(n)) notes.push(n);
  }
  if (notes.length) merged.extraction_notes = notes.join(' | ');
  else delete merged.extraction_notes;

  return merged;
}

export async function emitCandidates({ orgRoot, fieldArtefactPath, resultPath, candidatesDir, ingestDate }) {
  const fieldText = await readFile(fieldArtefactPath, 'utf8');
  const derivedFrom = readTopScalar(fieldText, 'id');
  if (!derivedFrom) throw new Error(`could not read the field artefact id from ${fieldArtefactPath}`);

  let result;
  try { result = JSON.parse(await readFile(resultPath, 'utf8')); }
  catch (err) { throw new Error(`could not read extraction result ${resultPath}: ${err.message}`); }

  const { candidates, suggestions } = shapeCandidates(derivedFrom, result);
  const warnings = collectIdWarnings(candidates);

  // Entity-match proposals (F8): for each element candidate whose name matches an
  // existing canon element (by name or alias), attach a proposal — propose, NEVER
  // auto-merge. The human gate in the review queue decides whether it is a duplicate
  // (→ reference the existing id) or genuinely new (→ admit with a fresh id).
  const canonIndex = await buildCanonIndex(resolve(orgRoot));
  for (const c of candidates) {
    if (c.kind !== 'element' || !c.name) continue;
    const match = canonIndex.nameMap.get(normName(c.name));
    // Exclude corroboration: if the candidate's own id matches the existing id, the
    // candidate IS the same element being emitted again — no match proposal needed.
    if (match && match.id !== c.id) {
      c.entity_match = { proposed_existing_id: match.id, matched_on: match.matched_on };
    }
  }

  const dir = candidatesDir || join(resolve(orgRoot), '_intake', 'processing', 'candidates');
  await mkdir(dir, { recursive: true });
  let i = 0;
  for (const c of candidates) {
    const out = join(dir, candidateFilename(c, i++));
    let toWrite = c;
    if (await fileExists(out)) {
      try {
        const existing = JSON.parse(await readFile(out, 'utf8'));
        toWrite = mergeCandidates(existing, c);   // corroboration — accumulate derived_from
      } catch { /* unparseable existing file — overwrite with the fresh candidate */ }
    }
    await writeFile(out, JSON.stringify(toWrite, null, 2) + '\n', 'utf8');
  }

  // Suggestions feed the review queue (loaded by `review-queue` when present).
  const suggPath = join(resolve(orgRoot), '_intake', 'processing', 'relation-suggestions.json');
  await writeFile(suggPath, JSON.stringify(suggestions, null, 2) + '\n', 'utf8');

  // Mechanism 2 (CONTRACT §13): standalone objects ingestion could not TYPE are parked,
  // non-admitted, in the shared canon/unresolved/ holding area — never dropped, never
  // guessed. The CLI emits `proposed`-untyped records (no admission record); a human
  // resolves each (promote / fold / discard). This is the only path that writes under
  // canon/, and it writes NON-admitted holding entries only — THE ONE RULE holds.
  const { records, skipped } = shapeUnresolved(result.unresolved, {
    ingestSource: derivedFrom,
    ingestDate: ingestDate || readTopScalar(fieldText, 'admitted_at') || null,
  });
  const unresolved = await writeUnresolved(orgRoot, records);

  return { derivedFrom, dir, candidates, suggestions, suggPath, warnings,
           unresolved: { ...unresolved, skipped: skipped.length } };
}

export { REL_THRESHOLD };
