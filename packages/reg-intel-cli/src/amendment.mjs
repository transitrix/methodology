// `amendment` (SKILL Step 7) — emit an AMENDMENT field artefact (22-amendment.md) when
// a watched codex source has drifted. The AMENDMENT records the detection EVENT (what
// moved), not the response: the authoritative impact set is the canon CHANGE / Gap
// elements a human authors later and links via `motivates[]`. Emitted in the `proposed`
// state; a human gates it. THE ONE RULE holds: writes only to _intake/.

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dump, readTopScalar } from './yaml.mjs';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const CODEX_TYPES = new Set(['LAW', 'REGULATION', 'STANDARD', 'POLICY', 'INTERNAL_STANDARD']);

async function exists(p) { try { await access(p); return true; } catch { return false; } }

function slugSegment(text) {
  const s = String(text || '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return s || null;
}
function sourceSlug(sourceId) {
  const parts = String(sourceId || '').split('-');
  const middle = parts.length >= 3 ? parts.slice(1, -1) : parts;
  return slugSegment(middle.join('_')) || slugSegment(sourceId) || 'src';
}

async function nextOrdinal(dir, slug) {
  if (!(await exists(dir))) return 1;
  let max = 0;
  const re = new RegExp(`^AMENDMENT-${slug}-(\\d+)\\.yaml$`);
  for (const name of await readdir(dir)) {
    const m = name.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function oneLine(text, max = 80) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

// Collect the staged SEGMENT ids whose `source` is this amendment's source — the
// structured replacement for the free-text source_section (22-amendment.md §2).
async function stagedSegmentRefs(orgRoot, source) {
  const dir = join(resolve(orgRoot), '_intake', 'processing', 'segments');
  const refs = [];
  let names;
  try { names = (await readdir(dir)).filter((n) => n.endsWith('.yaml')); } catch { return refs; }
  for (const name of names.sort()) {
    const text = await readFile(join(dir, name), 'utf8');
    if (readTopScalar(text, 'source') === source) refs.push(readTopScalar(text, 'id') || name.replace(/\.yaml$/, ''));
  }
  return refs;
}

export async function emitAmendment(orgRoot, file, { changeDescription, name, amendedAt, likelyImpacted, segmentRefs, fromResult, today } = {}) {
  if (!ISO_RE.test(today || '')) throw new Error('--today must be YYYY-MM-DD');
  const text = await readFile(file, 'utf8');
  const source = readTopScalar(text, 'id');
  const stype = readTopScalar(text, 'type');
  if (!source) throw new Error(`${file}: codex artefact has no id`);
  if (!CODEX_TYPES.has(stype)) throw new Error(`${file}: amendment source TYPE must be LAW|REGULATION|STANDARD|POLICY|INTERNAL_STANDARD (got ${JSON.stringify(stype)}) (AMENDMENT-002)`);
  if (readTopScalar(text, 'monitoring_needed') !== true) {
    throw new Error(`${file}: amendment applies to a monitoring_needed: true source (14-codex.md §3.4)`);
  }

  // Merge --from result with explicit flags (flags win).
  const r = fromResult || {};
  const desc = changeDescription ?? (typeof r.change_description === 'string' ? r.change_description : null);
  if (!desc) throw new Error('change_description is required: pass --change "<what moved>" or --from <result.json> (AMENDMENT-001)');
  const amended = amendedAt ?? (typeof r.amended_at === 'string' ? r.amended_at : null);
  if (amended && !ISO_RE.test(amended)) throw new Error('--amended-at must be YYYY-MM-DD');
  const impacted = (likelyImpacted && likelyImpacted.length) ? likelyImpacted
    : (Array.isArray(r.likely_impacted) ? r.likely_impacted.filter((x) => typeof x === 'string') : []);
  const refs = (segmentRefs && segmentRefs.length) ? segmentRefs
    : (Array.isArray(r.segment_refs) ? r.segment_refs.filter((x) => typeof x === 'string') : await stagedSegmentRefs(orgRoot, source));

  const dir = join(resolve(orgRoot), '_intake', 'processing', 'amendments');
  await mkdir(dir, { recursive: true });
  const slug = sourceSlug(source);
  const id = `AMENDMENT-${slug}-${await nextOrdinal(dir, slug)}`;

  const warnings = [];
  if (amended && amended > today) warnings.push('amended_at is later than detected_at (AMENDMENT-005)');

  const artefact = {
    id,
    type: 'AMENDMENT',
    name: name || oneLine(`${source} — ${desc}`),
    change_description: desc,
    source,
    ...(amended ? { amended_at: amended } : {}),
    detected_at: today,
    segment_refs: refs,
    likely_impacted: impacted,
    motivates: [],
    zone: 'field',
    admission_state: 'proposed',
    proposed_at: today,
    proposed_by: 'reg-intel-scanner',
    gate_checks: { provenance: 'pending_review' },
  };
  await writeFile(join(dir, `${id}.yaml`), dump(artefact), 'utf8');
  return { id, source, file: join(dir, `${id}.yaml`), segment_refs: refs, likely_impacted: impacted, warnings };
}
