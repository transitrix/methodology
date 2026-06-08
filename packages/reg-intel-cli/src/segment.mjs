// `segment` (SKILL Step 4) — shape the segmentation agent's JSON result into
// `SEGMENT-*` field-zone artefacts (23-segment.md), staged in
// `_intake/processing/segments/` in the `proposed` state. The deterministic
// counterpart to the segment prompt: the agent reads the snapshot and emits
// `{ segments: [...] }`; this assigns canonical ids + the admission record and writes
// the files. It never admits — a human gates them (proposed -> active | rejected).
//
// THE ONE RULE holds: writes only to _intake/, never canon/ or field/.

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, basename, extname } from 'node:path';
import { dump } from './yaml.mjs';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const CONFIDENCE = new Set(['high', 'medium', 'low']);

async function exists(p) { try { await access(p); return true; } catch { return false; } }
function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

// Lower-case a label into a safe ID middle segment (letters/digits/underscore).
function slugSegment(text) {
  const s = String(text || '').normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return s || null;
}

// Derive the source CODEX-ID from a snapshot filename `<CODEX-ID>-<YYYY-MM-DD>.<ext>`.
export function sourceFromSnapshot(snapshotPath) {
  const stem = basename(snapshotPath, extname(snapshotPath));
  return stem.replace(/-\d{4}-\d{2}-\d{2}$/, '') || stem;
}

// A middle slug for SEGMENT ids derived from the source id: drop the leading TYPE and
// the terminal integer, join the rest (REGULATION-GDPR-2016-1 -> gdpr_2016). Falls back
// to the whole id slugged.
function sourceSlug(sourceId) {
  const parts = String(sourceId || '').split('-');
  const middle = parts.length >= 3 ? parts.slice(1, -1) : parts;
  return slugSegment(middle.join('_')) || slugSegment(sourceId) || 'src';
}

// Next free SEGMENT ordinal for a given middle slug in the segments dir.
async function nextOrdinal(dir, slug) {
  if (!(await exists(dir))) return 1;
  let max = 0;
  const re = new RegExp(`^SEGMENT-${slug}-(\\d+)\\.yaml$`);
  for (const name of await readdir(dir)) {
    const m = name.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export async function emitSegments({ orgRoot, snapshotPath, resultPath, source, today }) {
  if (!ISO_RE.test(today || '')) throw new Error('--today must be YYYY-MM-DD');
  if (!resultPath) throw new Error('--from <result.json> is required (the segment agent output)');

  let sourceHash = null;
  if (snapshotPath) {
    const sp = resolve(snapshotPath);
    if (!(await exists(sp))) throw new Error(`snapshot not found: ${snapshotPath}`);
    sourceHash = `sha256:${sha256(await readFile(sp))}`;
    if (!source) source = sourceFromSnapshot(sp);
  }
  if (!source) throw new Error('cannot determine source: pass a <snapshot> path or --source <CODEX-ID>');

  let result;
  try { result = JSON.parse(await readFile(resolve(resultPath), 'utf8')); }
  catch (err) { throw new Error(`--from does not parse as JSON: ${err.message}`); }
  const segments = Array.isArray(result.segments) ? result.segments : [];

  const dir = join(resolve(orgRoot), '_intake', 'processing', 'segments');
  await mkdir(dir, { recursive: true });
  const slug = sourceSlug(source);
  let ordinal = await nextOrdinal(dir, slug);

  const written = [];
  const flags = [];
  for (const seg of segments) {
    const locator = seg.locator ? String(seg.locator) : null;
    const excerpt = typeof seg.text_excerpt === 'string' ? seg.text_excerpt : null;
    const textHash = excerpt ? `sha256:${sha256(Buffer.from(excerpt, 'utf8'))}`
      : (typeof seg.text_hash === 'string' ? seg.text_hash : null);
    if (!locator) { flags.push('a segment is missing locator — skipped'); continue; }
    if (!excerpt && !textHash) { flags.push(`SEGMENT at ${locator} has neither text_excerpt nor text_hash — skipped (SEGMENT-003)`); continue; }
    const conf = CONFIDENCE.has(seg.extraction_confidence) ? seg.extraction_confidence : 'low';

    const id = `SEGMENT-${slug}-${ordinal++}`;
    const artefact = {
      id,
      type: 'SEGMENT',
      name: `${source} ${locator}`,
      source,
      locator,
      ...(excerpt ? { text_excerpt: excerpt } : {}),
      ...(textHash ? { text_hash: textHash } : {}),
      extracted_at: today,
      ...(sourceHash ? { source_hash: sourceHash } : {}),
      // Review flag — "did I find a real, atomic obligation and cite it correctly"
      // (CONTRACT §11.8); separate from source_quality, surfaced in the digest.
      extraction_confidence: conf,
      ...(seg.extraction_notes ? { extraction_notes: String(seg.extraction_notes) } : {}),
      zone: 'field',
      admission_state: 'proposed',
      proposed_at: today,
      proposed_by: 'reg-intel-scanner',
      gate_checks: { provenance: 'pending_review' },
    };
    await writeFile(join(dir, `${id}.yaml`), dump(artefact), 'utf8');
    written.push(id);
  }

  return { dir, source, source_hash: sourceHash, segments: written, flags };
}
