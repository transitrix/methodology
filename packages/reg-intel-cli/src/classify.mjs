// `classify` (SKILL Step 5) — shape the classification agent's JSON result into
// proposed REQUIREMENT / CONSTRAINT canon CANDIDATES, staged in
// `_intake/processing/candidates/`. The deterministic counterpart to the classify
// prompt: the agent applies the decision tree (positive obligation -> REQUIREMENT by
// default) and emits `{ candidates: [...] }`; this assigns canonical ids + the
// pre-admission record and writes the files. It never admits — a human gates them
// (proposed -> active | rejected).
//
// A candidate is a pre-admission DRAFT shaped by the extraction contract (SKILL
// Step 5): it carries `derived_from: [SEGMENT-…]` (the human resolves it to the codex
// source at admission per 15-requirement.md), and `obligation_level` as extraction
// metadata (REQUIREMENT v1 defers obligation_level, 15-requirement.md §5 — the human
// maps/drops it at admission). CONSTRAINT has no dedicated spec yet; it mirrors the
// REQUIREMENT draft shape. THE ONE RULE holds: writes only to _intake/.

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dump } from './yaml.mjs';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const LEVELS = new Set(['SHALL', 'SHALL_NOT', 'SHOULD', 'MAY']);
const KIND_TO_TYPE = { requirement: 'REQUIREMENT', constraint: 'CONSTRAINT' };

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// The middle slug of a candidate is taken from the SEGMENT it derives from
// (SEGMENT-<slug>-<n> -> <slug>), so candidates group under their source the same way.
function slugFromSegment(segId) {
  const m = String(segId || '').match(/^SEGMENT-(.+)-\d+$/);
  return m ? m[1] : 'src';
}

function oneLine(text, max = 80) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

async function nextOrdinal(dir, type, slug) {
  if (!(await exists(dir))) return 1;
  let max = 0;
  const re = new RegExp(`^${type}-${slug}-(\\d+)\\.yaml$`);
  for (const name of await readdir(dir)) {
    const m = name.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export async function emitCandidates({ orgRoot, resultPath, segmentsDir, today }) {
  if (!ISO_RE.test(today || '')) throw new Error('--today must be YYYY-MM-DD');
  if (!resultPath) throw new Error('--from <result.json> is required (the classify agent output)');

  let result;
  try { result = JSON.parse(await readFile(resolve(resultPath), 'utf8')); }
  catch (err) { throw new Error(`--from does not parse as JSON: ${err.message}`); }
  const candidates = Array.isArray(result.candidates) ? result.candidates : [];

  // Optional: the set of staged SEGMENT ids, to flag a dangling derived_from.
  let known = null;
  if (segmentsDir && (await exists(segmentsDir))) {
    known = new Set((await readdir(segmentsDir)).filter((n) => n.endsWith('.yaml')).map((n) => n.replace(/\.yaml$/, '')));
  }

  const dir = join(resolve(orgRoot), '_intake', 'processing', 'candidates');
  await mkdir(dir, { recursive: true });

  const written = [];
  const flags = [];
  const ordinals = {};
  for (const c of candidates) {
    const type = KIND_TO_TYPE[c.kind];
    if (!type) { flags.push(`candidate has unknown kind ${JSON.stringify(c.kind)} (expected requirement|constraint) — skipped`); continue; }
    const derivedFrom = Array.isArray(c.derived_from) ? c.derived_from.filter((x) => typeof x === 'string') : [];
    if (derivedFrom.length === 0) { flags.push(`${type} candidate has no derived_from SEGMENT — skipped`); continue; }
    const text = typeof c.source_text === 'string' ? c.source_text : null;
    if (!text) { flags.push(`${type} candidate (from ${derivedFrom[0]}) has no source_text — skipped`); continue; }
    if (known) for (const d of derivedFrom) if (!known.has(d)) flags.push(`${type} candidate cites a SEGMENT not staged in this run: ${d}`);

    const level = c.obligation_level;
    if (level && !LEVELS.has(level)) flags.push(`${type} candidate has a non-RFC2119 obligation_level ${JSON.stringify(level)}`);
    const conf = CONFIDENCE.has(c.extraction_confidence) ? c.extraction_confidence : 'low';

    const slug = slugFromSegment(derivedFrom[0]);
    const key = `${type}|${slug}`;
    if (ordinals[key] === undefined) ordinals[key] = await nextOrdinal(dir, type, slug);
    const id = `${type}-${slug}-${ordinals[key]++}`;

    const artefact = {
      notation: c.kind,
      id,
      name: oneLine(text),
      description: text,
      derived_from: derivedFrom,
      ...(level ? { obligation_level: level } : {}),
      ...(c.category ? { category: String(c.category) } : {}),
      extraction_confidence: conf,
      ...(c.extraction_notes ? { extraction_notes: String(c.extraction_notes) } : {}),
      ...(conf === 'low' && c.ambiguous_alt && typeof c.ambiguous_alt === 'object'
        ? { ambiguous_alt: { kind: c.ambiguous_alt.kind ?? null, category: c.ambiguous_alt.category ?? null } }
        : {}),
      zone: 'canon',
      admission_state: 'proposed',
      proposed_at: today,
      proposed_by: 'reg-intel-scanner',
      gate_checks: { uniqueness: 'pending', consistency: 'pending', completeness: 'pending' },
    };
    await writeFile(join(dir, `${id}.yaml`), dump(artefact), 'utf8');
    written.push(id);
  }

  return {
    dir,
    candidates: written,
    requirements: written.filter((id) => id.startsWith('REQUIREMENT-')).length,
    constraints: written.filter((id) => id.startsWith('CONSTRAINT-')).length,
    flags,
  };
}
