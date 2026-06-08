// `validate` (SKILL Step 6) — run the staged SEGMENT field artefacts and the
// REQUIREMENT / CONSTRAINT candidates through the canonical contract checks
// (23-segment.md §6 SEGMENT-001..008; ID grammar; the candidate field rules). A
// failing artefact is FLAGGED with an actionable, coded reason and routed to the
// review digest — never silently dropped, never auto-rejected. The same
// flag-not-drop discipline as the ingest CLI's validate.
//
// Coverage-profile awareness (SKILL Step 6) is deferred: it needs the coverage
// resolver that today lives only in the ingest CLI. Sharing it (a common package)
// rather than duplicating it is a separate refactor; until then validate covers the
// contract + grammar checks. THE ONE RULE holds: read-only over _intake/.

import { readFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, basename } from 'node:path';
import { readTopScalar, readScalarList, readBlockScalars } from './yaml.mjs';
import { findCodexFile } from './codex.mjs';

const ID_RE = /^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+)*-[1-9][0-9]*$/;
const HASH_RE = /^sha256:[0-9a-f]{64}$/;
const CODEX_TYPES = new Set(['LAW', 'REGULATION', 'POLICY', 'INTERNAL_STANDARD']);
const CAND_TYPES = new Set(['REQUIREMENT', 'CONSTRAINT']);
const LEVELS = new Set(['SHALL', 'SHALL_NOT', 'SHOULD', 'MAY']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);

function typeOf(id) { return typeof id === 'string' && id.includes('-') ? id.split('-')[0] : null; }
function sha256(s) { return `sha256:${createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex')}`; }
async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function readYamlFiles(dir) {
  const out = [];
  let names;
  try { names = (await readdir(dir)).filter((n) => n.endsWith('.yaml')).sort(); } catch { return out; }
  for (const name of names) out.push({ ref: join(dir, name), name, text: await readFile(join(dir, name), 'utf8') });
  return out;
}

function flag(code, severity, message) { return { code, severity, message }; }

// Validate one SEGMENT. `segIndex` maps SEGMENT id → { source } for parent resolution;
// `codexResolve(id)` returns true if a codex artefact with that id exists.
async function validateSegment(text, segIndex, codexResolve) {
  const flags = [];
  const id = readTopScalar(text, 'id');
  const type = readTopScalar(text, 'type');
  const name = readTopScalar(text, 'name');
  const source = readTopScalar(text, 'source');
  const locator = readTopScalar(text, 'locator');
  const extractedAt = readTopScalar(text, 'extracted_at');
  const zone = readTopScalar(text, 'zone');
  const gate = readBlockScalars(text, 'gate_checks');
  const excerpt = readTopScalar(text, 'text_excerpt');
  const textHash = readTopScalar(text, 'text_hash');
  const sourceHash = readTopScalar(text, 'source_hash');
  const parent = readTopScalar(text, 'parent');

  // SEGMENT-001 — id grammar, required fields, type literal.
  if (!ID_RE.test(id || '') || typeOf(id) !== 'SEGMENT') flags.push(flag('SEGMENT-001', 'error', `id missing or not SEGMENT-grammar: ${JSON.stringify(id)}`));
  if (type !== 'SEGMENT') flags.push(flag('SEGMENT-001', 'error', `type must be the literal "SEGMENT" (got ${JSON.stringify(type)})`));
  for (const [k, v] of [['name', name], ['source', source], ['locator', locator], ['extracted_at', extractedAt], ['zone', zone]]) {
    if (!v) flags.push(flag('SEGMENT-001', 'error', `required field ${k} is missing`));
  }
  if (!gate) flags.push(flag('SEGMENT-001', 'error', 'required field gate_checks is missing'));
  if (zone && zone !== 'field') flags.push(flag('SEGMENT-001', 'error', `zone must be "field" (got ${JSON.stringify(zone)})`));

  // SEGMENT-002 — source resolves to a codex artefact of an allowed TYPE.
  if (!source || !ID_RE.test(source)) flags.push(flag('SEGMENT-002', 'error', `source missing or malformed: ${JSON.stringify(source)}`));
  else if (!CODEX_TYPES.has(typeOf(source))) flags.push(flag('SEGMENT-002', 'error', `source TYPE must be LAW|REGULATION|POLICY|INTERNAL_STANDARD (got ${typeOf(source)})`));
  else if (codexResolve && !(await codexResolve(source))) flags.push(flag('SEGMENT-002', 'error', `source does not resolve to a codex artefact under codex/: ${source}`));

  // SEGMENT-003 — text_excerpt or text_hash.
  if (!excerpt && !textHash) flags.push(flag('SEGMENT-003', 'error', 'neither text_excerpt nor text_hash present'));

  // SEGMENT-006/007 — hash formats (warning).
  if (textHash && !HASH_RE.test(textHash)) flags.push(flag('SEGMENT-006', 'warning', `text_hash not sha256:<64hex>: ${textHash}`));
  if (sourceHash && !HASH_RE.test(sourceHash)) flags.push(flag('SEGMENT-007', 'warning', `source_hash not sha256:<64hex>: ${sourceHash}`));
  // SEGMENT-008 — excerpt vs hash mismatch (warning).
  if (excerpt && textHash && HASH_RE.test(textHash) && sha256(excerpt) !== textHash) {
    flags.push(flag('SEGMENT-008', 'warning', 'text_hash does not match the SHA-256 of text_excerpt'));
  }

  // SEGMENT-004/005 — parent resolution (within the staged batch), same source, acyclic.
  if (parent) {
    if (!ID_RE.test(parent) || typeOf(parent) !== 'SEGMENT') flags.push(flag('SEGMENT-004', 'error', `parent not a SEGMENT id: ${parent}`));
    else if (parent === id) flags.push(flag('SEGMENT-005', 'error', 'parent equals the segment id (self-nesting)'));
    else if (segIndex.has(parent)) {
      if (segIndex.get(parent).source !== source) flags.push(flag('SEGMENT-004', 'error', `parent ${parent} has a different source — nesting must be within one source`));
      // cycle: walk parent chain.
      const seen = new Set([id]); let cur = parent;
      while (cur && segIndex.has(cur)) { if (seen.has(cur)) { flags.push(flag('SEGMENT-005', 'error', `parent chain forms a cycle at ${cur}`)); break; } seen.add(cur); cur = segIndex.get(cur).parent; }
    }
    // (a parent outside the staged batch is left for the cross-catalogue gate, not flagged here)
  }
  return { id, flags };
}

function validateCandidate(text) {
  const flags = [];
  const id = readTopScalar(text, 'id');
  const notation = readTopScalar(text, 'notation');
  const name = readTopScalar(text, 'name');
  const description = readTopScalar(text, 'description');
  const zone = readTopScalar(text, 'zone');
  const admissionState = readTopScalar(text, 'admission_state');
  const proposedAt = readTopScalar(text, 'proposed_at');
  const level = readTopScalar(text, 'obligation_level');
  const conf = readTopScalar(text, 'extraction_confidence');
  const derivedFrom = readScalarList(text, 'derived_from');
  const t = typeOf(id);

  if (!ID_RE.test(id || '') || !CAND_TYPES.has(t)) flags.push(flag('CAND-001', 'error', `id missing or not a REQUIREMENT/CONSTRAINT id: ${JSON.stringify(id)}`));
  if (notation && t && notation !== t.toLowerCase()) flags.push(flag('CAND-001', 'error', `notation ${JSON.stringify(notation)} does not match id TYPE ${t}`));
  if (!name) flags.push(flag('CAND-001', 'error', 'name is missing'));
  if (!description) flags.push(flag('CAND-001', 'error', 'description is missing'));
  if (zone && zone !== 'canon') flags.push(flag('CAND-001', 'error', `zone must be "canon" (got ${JSON.stringify(zone)})`));
  if (!derivedFrom.length) flags.push(flag('CAND-002', 'error', 'derived_from must cite at least one SEGMENT'));
  else for (const d of derivedFrom) if (!ID_RE.test(d)) flags.push(flag('CAND-002', 'error', `derived_from has an invalid ID: ${d}`));
  if (admissionState === 'proposed' && !proposedAt) flags.push(flag('CAND-003', 'error', 'admission_state proposed requires proposed_at'));
  if (level && !LEVELS.has(level)) flags.push(flag('CAND-004', 'warning', `obligation_level not RFC-2119 (SHALL|SHALL_NOT|SHOULD|MAY): ${level}`));
  if (conf && !CONFIDENCE.has(conf)) flags.push(flag('CAND-005', 'warning', `extraction_confidence not high|medium|low: ${conf}`));
  return { id, flags };
}

// Validate everything staged under _intake/processing/. Returns
// { items: [{ ref, kind, id, flags }], errors, warnings, reviewed }.
export async function validateStaged(orgRoot) {
  const procDir = join(resolve(orgRoot), '_intake', 'processing');
  const segFiles = await readYamlFiles(join(procDir, 'segments'));
  const candFiles = await readYamlFiles(join(procDir, 'candidates'));

  const segIndex = new Map();
  for (const f of segFiles) {
    const id = readTopScalar(f.text, 'id');
    if (id) segIndex.set(id, { source: readTopScalar(f.text, 'source'), parent: readTopScalar(f.text, 'parent') });
  }
  const codexResolve = async (sid) => !!(await findCodexFile(orgRoot, sid));

  const items = [];
  for (const f of segFiles) {
    const r = await validateSegment(f.text, segIndex, codexResolve);
    items.push({ ref: f.ref, kind: 'segment', id: r.id ?? basename(f.name, '.yaml'), flags: r.flags });
  }
  for (const f of candFiles) {
    const r = validateCandidate(f.text);
    items.push({ ref: f.ref, kind: 'candidate', id: r.id ?? basename(f.name, '.yaml'), flags: r.flags });
  }

  let errors = 0, warnings = 0, reviewed = 0;
  for (const it of items) {
    if (it.flags.length) reviewed++;
    for (const fl of it.flags) (fl.severity === 'error' ? errors++ : warnings++);
  }
  return { items, errors, warnings, reviewed, total: items.length };
}
