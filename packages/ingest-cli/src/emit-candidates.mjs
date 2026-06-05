// `emit-candidates` — take the agent's extraction RESULT (produced by running the
// prompts/ over a field artefact) and emit typed canon CANDIDATES. The CLI does the
// deterministic part: it reads derived_from from the field artefact itself, shapes
// each element/relation into a candidate (admitted_to: pending, the field ID in
// derived_from, extraction_confidence carried through as a review flag), applies
// relation-conservatism, and writes candidate *.json. It never extracts (that is the
// agent's job) and never writes canon.
//
// Relation-conservatism (v0): only HIGH-confidence relations become candidates;
// medium/low relations are held back as review-queue suggestions. Entities flow
// through regardless of confidence (the flag rides along for the reviewer).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readTopScalar } from './yaml.mjs';

const REL_THRESHOLD = 'high';

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

  return { candidates, suggestions };
}

function candidateFilename(c, index) {
  if (c.kind === 'element' && c.id) return `${safeName(c.id)}.json`;
  if (c.kind === 'relation') return `REL_${safeName(c.rel_kind)}__${safeName(c.from)}__${safeName(c.to)}.json`;
  return `candidate-${index}.json`;
}

export async function emitCandidates({ orgRoot, fieldArtefactPath, resultPath, candidatesDir }) {
  const fieldText = await readFile(fieldArtefactPath, 'utf8');
  const derivedFrom = readTopScalar(fieldText, 'id');
  if (!derivedFrom) throw new Error(`could not read the field artefact id from ${fieldArtefactPath}`);

  let result;
  try { result = JSON.parse(await readFile(resultPath, 'utf8')); }
  catch (err) { throw new Error(`could not read extraction result ${resultPath}: ${err.message}`); }

  const { candidates, suggestions } = shapeCandidates(derivedFrom, result);

  const dir = candidatesDir || join(resolve(orgRoot), '_intake', 'processing', 'candidates');
  await mkdir(dir, { recursive: true });
  let i = 0;
  for (const c of candidates) {
    await writeFile(join(dir, candidateFilename(c, i++)), JSON.stringify(c, null, 2) + '\n', 'utf8');
  }

  // Suggestions feed the review queue (loaded by `review-queue` when present).
  const suggPath = join(resolve(orgRoot), '_intake', 'processing', 'relation-suggestions.json');
  await writeFile(suggPath, JSON.stringify(suggestions, null, 2) + '\n', 'utf8');

  return { derivedFrom, dir, candidates, suggestions, suggPath };
}

export { REL_THRESHOLD };
