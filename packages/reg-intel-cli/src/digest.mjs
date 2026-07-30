// `digest` (SKILL Step 9) — assemble the review digest, the human gate. Reads the
// artefacts a run has staged under _intake/processing/ (segments, candidates,
// amendments) and the codex `scan` blocks, groups them by source, and writes
// review-digest.yaml. NOTHING here is admitted: the digest is read by a human who then
// flips `proposed → active | rejected`. This CLI never writes canon and never
// auto-flips an active element (the two rules, SKILL § The two rules).

import { readdir, readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { dump, readTopScalar, readBlockScalars, readScalarList } from './yaml.mjs';
import { discoverCodex } from './codex.mjs';
import { resolveBatchPath } from './batch-path.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function readDir(dir) {
  try { return (await readdir(dir)).filter((n) => n.endsWith('.yaml')).sort(); }
  catch { return []; }
}

// REQUIREMENT-… / CONSTRAINT-… → requirement | constraint (the candidate kind).
function kindOf(id) {
  const t = typeof id === 'string' ? id.split('-')[0] : '';
  if (t === 'REQUIREMENT') return 'requirement';
  if (t === 'CONSTRAINT') return 'constraint';
  return 'unknown';
}

async function readSegments(procDir) {
  const dir = join(procDir, 'segments');
  const out = [];
  for (const name of await readDir(dir)) {
    const text = await readFile(join(dir, name), 'utf8');
    out.push({
      id: readTopScalar(text, 'id') ?? basename(name, '.yaml'),
      source: readTopScalar(text, 'source') ?? null,
      locator: readTopScalar(text, 'locator') ?? null,
      extraction_confidence: readTopScalar(text, 'extraction_confidence') ?? null,
    });
  }
  return out;
}

async function readCandidates(procDir) {
  const dir = join(procDir, 'candidates');
  const out = [];
  for (const name of await readDir(dir)) {
    const text = await readFile(join(dir, name), 'utf8');
    const id = readTopScalar(text, 'id') ?? basename(name, '.yaml');
    out.push({
      id,
      kind: kindOf(id),
      derived_from: readScalarList(text, 'derived_from'),
      extraction_confidence: readTopScalar(text, 'extraction_confidence') ?? null,
    });
  }
  return out;
}

async function readAmendments(procDir) {
  const dir = join(procDir, 'amendments');
  const out = [];
  for (const name of await readDir(dir)) {
    const text = await readFile(join(dir, name), 'utf8');
    out.push({
      id: readTopScalar(text, 'id') ?? basename(name, '.yaml'),
      source: readTopScalar(text, 'source') ?? null,
      change_description: readTopScalar(text, 'change_description') ?? null,
      segment_refs: readScalarList(text, 'segment_refs'),
    });
  }
  return out;
}

// Build the digest object for the run. Groups staged artefacts by their codex source;
// candidates are attached via derived_from → SEGMENT → source. Artefacts whose source
// cannot be resolved are surfaced under an `unassociated` bucket (never dropped).
export async function buildDigest({ orgRoot, asOf, runId }) {
  const procDir = join(resolve(orgRoot), '_intake', 'processing');
  const [segments, candidates, amendments, codex] = await Promise.all([
    readSegments(procDir), readCandidates(procDir), readAmendments(procDir), discoverCodex(orgRoot),
  ]);

  const segSource = new Map(segments.map((s) => [s.id, s.source]));
  const candSource = (c) => {
    for (const d of c.derived_from || []) if (segSource.has(d)) return segSource.get(d);
    return null;
  };

  // Index by source id.
  const bucket = new Map();
  const ensure = (id) => {
    if (!bucket.has(id)) bucket.set(id, { id, scan: null, segments: [], candidates: [], amendments: [] });
    return bucket.get(id);
  };
  for (const a of codex) if (a.monitoring_needed === true) ensure(a.id).scan = a.scan || null;
  for (const s of segments) (s.source ? ensure(s.source) : ensure('(unassociated)')).segments.push(s);
  for (const c of candidates) { const src = candSource(c); (src ? ensure(src) : ensure('(unassociated)')).candidates.push(c); }
  for (const a of amendments) (a.source ? ensure(a.source) : ensure('(unassociated)')).amendments.push(a);

  const sources = [...bucket.values()].sort((x, y) => x.id.localeCompare(y.id)).map((b) => ({
    id: b.id,
    ...(b.scan ? { scan: {
      last_scanned_at: b.scan.last_scanned_at ?? null,
      next_scan_due: b.scan.next_scan_due ?? null,
      change_detected: b.scan.change_detected ?? null,
      review_needed: b.scan.review_needed ?? null,
    } } : {}),
    segments: b.segments.map((s) => ({ id: s.id, locator: s.locator, extraction_confidence: s.extraction_confidence })),
    candidates: b.candidates.map((c) => ({ id: c.id, kind: c.kind, derived_from: c.derived_from, extraction_confidence: c.extraction_confidence })),
    amendments: b.amendments.map((a) => ({ id: a.id, change_description: a.change_description, segment_refs: a.segment_refs })),
  }));

  const requirements = candidates.filter((c) => c.kind === 'requirement').length;
  const constraints = candidates.filter((c) => c.kind === 'constraint').length;

  return {
    generated_by: '@transitrix/reg-intel-cli',
    org_root: resolve(orgRoot),
    ...(runId ? { run_id: String(runId) } : {}),
    as_of: asOf,
    sources,
    tally: {
      sources_touched: sources.length,
      proposed: { SEGMENT: segments.length, REQUIREMENT: requirements, CONSTRAINT: constraints, AMENDMENT: amendments.length },
      review_needed: codex.filter((a) => a.scan && a.scan.review_needed === true).length,
    },
    gate: { admits_to_canon: false },
  };
}

export async function writeDigest(digest, outPath) {
  await mkdir(join(outPath, '..'), { recursive: true }).catch(() => {});
  await writeFile(outPath, dump(digest), 'utf8');
  return outPath;
}

// Non-destructive default: the flat legacy path for
// the first digest of an org; a dated batch directory once that stable path
// is already occupied by an unresolved digest. See src/batch-path.mjs.
export async function defaultDigestPath(orgRoot, { scope, content } = {}) {
  const dir = join(resolve(orgRoot), '_intake', 'processing');
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
  return resolveBatchPath({ processingDir: dir, filename: 'review-digest.yaml', scope, content });
}
