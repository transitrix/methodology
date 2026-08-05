// `field-artefact` — turn a converted Markdown document into a field-zone artefact
// with a complete admission record (CONTRACT.md §6), a PROPOSED source_quality
// (§11.2), and the type-specific body block the extraction step reads. The raw
// source is moved to _intake/processed/ for traceability; the artefact cites it.
//
// The skill PROPOSES source_quality; a human confirms at admission. This command
// never touches canon/. Admission is fail-closed on the privacy pre-admission gate
// (SKILL.md Step 2b, privacy-scan.mjs) unless the adopter has explicitly disabled it.

import { readFile, writeFile, mkdir, readdir, rename, access } from 'node:fs/promises';
import { join, resolve, basename, extname } from 'node:path';
import { isValidId, makeId, slugSegment, parseId } from './ids.mjs';
import { dump } from './yaml.mjs';
import { INTAKE, stageDir, readManifestText } from './intake.mjs';
import { hashFile, shortHash, findDuplicateSource, DuplicateSourceError } from './source-hash.mjs';
import { checkPrivacyGate, parsePrivacyGateConfig } from './privacy-scan.mjs';

// Field TYPE → field/ subfolder and body-block key.
const TYPE_INFO = {
  INTERVIEW:   { sub: 'interviews',   body: 'notes' },
  SURVEY:      { sub: 'surveys',      body: 'responses' },
  OBSERVATION: { sub: 'observations', body: 'observations' },
  DRAFT:       { sub: 'drafts',       body: 'content' },
};

const SOURCE_QUALITY = new Set(['authoritative', 'corroborated', 'single_source', 'unverified']);

// Conservative default proposal — the human revises up where the source warrants.
const DEFAULT_SQ = {
  INTERVIEW: 'single_source', SURVEY: 'single_source',
  OBSERVATION: 'single_source', DRAFT: 'unverified',
};

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Next free ordinal for IDs sharing a TYPE + middle prefix in a field subfolder.
async function nextOrdinal(dir, type, middle) {
  if (!(await exists(dir))) return 1;
  const want = [type, ...middle].join('-');
  let max = 0;
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.yaml')) continue;
    const id = basename(name, '.yaml');
    const p = parseId(id);
    if (!p) continue;
    if ([p.type, ...p.middle].join('-') === want) max = Math.max(max, p.ordinal);
  }
  return max + 1;
}

// Find the raw source file matching a converted md by basename stem — in inbox/ (the
// pre-admission location), then processed/ (where the first successful admit of this
// same source already moved it). Without the processed/ fallback, re-running admit-source
// on an already-admitted source finds no raw file at all (it moved on the first run), so
// no source_hash can be computed and the duplicate check below is silently skipped —
// minting a second artefact for the same source on every retry.
async function findRaw(orgRoot, mdPath) {
  const stem = basename(mdPath, extname(mdPath));
  for (const stage of ['inbox', 'processed']) {
    const dir = stageDir(orgRoot, stage);
    if (!(await exists(dir))) continue;
    for (const name of await readdir(dir)) {
      if (basename(name, extname(name)) === stem) return join(dir, name);
    }
  }
  return null;
}

export async function emitFieldArtefact(opts) {
  const {
    orgRoot, mdPath, type, role, date,
    setting, capturedBy, sourceQuality, slug, admittedAt, name, force = false,
  } = opts;

  const info = TYPE_INFO[type];
  if (!info) throw new Error(`unknown --type ${type}; expected one of ${Object.keys(TYPE_INFO).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('--date must be YYYY-MM-DD');
  if (sourceQuality && !SOURCE_QUALITY.has(sourceQuality)) {
    throw new Error(`--source-quality must be one of ${[...SOURCE_QUALITY].join(', ')}`);
  }

  // Fail-closed privacy pre-admission gate (SKILL.md Step 2b): refuse to admit a
  // document with no passing, content-matching privacy-scan record. Skipped only when
  // an adopter has explicitly disabled the gate (`ingest.privacy_gate.enabled: false`).
  const gateConfig = parsePrivacyGateConfig(await readManifestText(orgRoot));
  if (gateConfig.enabled !== false) await checkPrivacyGate(mdPath);

  // Fingerprint the raw bytes up front and refuse a duplicate re-ingest (same content
  // already admitted to field/) unless --force — before minting an id or moving anything.
  const raw = await findRaw(orgRoot, mdPath);
  let sourceHash = null;
  if (raw) {
    sourceHash = await hashFile(raw);
    if (!force) {
      const dup = await findDuplicateSource(orgRoot, 'field', sourceHash);
      if (dup) throw new DuplicateSourceError(dup.id, sourceHash);
    }
  }

  const seg = slug ? slugSegment(slug) : slugSegment(role);
  if (!seg) throw new Error('could not derive an ID segment from --role/--slug; pass --slug');
  const dateStamp = date.replace(/-/g, '');
  const middle = [seg, dateStamp];

  const fieldDir = join(resolve(orgRoot), 'field', info.sub);
  const ordinal = await nextOrdinal(fieldDir, type, middle);
  const id = makeId(type, middle, ordinal);
  if (!isValidId(id)) throw new Error(`generated an invalid ID: ${id}`);

  const body = await readFile(mdPath, 'utf8');
  const proposedSQ = sourceQuality || DEFAULT_SQ[type];

  // Move the raw source into processed/ and record a traceable pointer. If a file of the
  // same basename is already there (a different source that happens to share a name —
  // a re-ingest of identical content is caught above), disambiguate with the content
  // hash instead of overwriting, so no prior source is silently clobbered. When `raw`
  // was already found sitting in processed/ (findRaw's fallback above — a retry after an
  // earlier successful admit already moved it), it is already in place; nothing to move.
  let rawSource = null;
  if (raw) {
    const processedDir = stageDir(orgRoot, 'processed');
    if (resolve(raw).startsWith(resolve(processedDir))) {
      rawSource = join(INTAKE, 'processed', basename(raw)).replace(/\\/g, '/');
    } else {
      await mkdir(processedDir, { recursive: true });
      let dest = join(processedDir, basename(raw));
      if (await exists(dest)) {
        dest = join(processedDir, `${basename(raw, extname(raw))}__${shortHash(sourceHash)}${extname(raw)}`);
      }
      await rename(raw, dest);
      rawSource = join(INTAKE, 'processed', basename(dest)).replace(/\\/g, '/');
    }
  }

  const artefact = {
    id,
    name: name || `${type} — ${role}, ${date}`,
    type,
    zone: 'field',
    admitted_at: admittedAt,
    admitted_by: capturedBy,
    gate_checks: { provenance: 'recorded' },
    source_quality: proposedSQ,
    source_quality_proposed_by: '@transitrix/ingest-cli',
    provenance: {
      captured_by: capturedBy,
      subject_role: role,
      captured_on: date,
      setting: setting || `ingested via @transitrix/ingest-cli from ${basename(mdPath)}`,
    },
    ...(rawSource ? { raw_source: rawSource } : {}),
    ...(sourceHash ? { source_hash: sourceHash } : {}),
    [info.body]: body,
  };

  await mkdir(fieldDir, { recursive: true });
  const outPath = join(fieldDir, `${id}.yaml`);
  await writeFile(outPath, dump(artefact), 'utf8');

  return { id, outPath, proposedSQ, rawMoved: rawSource, sourceHash };
}

export { TYPE_INFO, SOURCE_QUALITY };
