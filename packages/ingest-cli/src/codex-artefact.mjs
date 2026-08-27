// `codex-artefact` — admit a converted external law/regulation/standard or
// internal policy / internal standard / principle into the CODEX zone as a
// FAITHFUL source artefact (14-codex.md §3/§4).
//
// Unlike a FIELD artefact, a codex artefact:
//   - carries NO source_quality — a codex source is authoritative by construction;
//   - embeds NO extracted content — it records the source's identity + admission
//     record + a snapshot pointer to the retained raw bytes (the source text stays in
//     _intake/processing/ for the extraction step).
//
// Obligations are derived downstream as REQUIREMENT (element) + ASSERTION candidates
// via `emit-candidates`, each citing this artefact through derived_from. Admission to
// codex/ is a zone admission (gate_checks.source_authority), parallel to the field
// flow's admission to field/. This command NEVER writes canon/.

import { readFile, writeFile, mkdir, readdir, rename, copyFile, access } from 'node:fs/promises';
import { join, resolve, basename, extname } from 'node:path';
import { isValidId, makeId, slugSegment, parseId } from './ids.mjs';
import { dump } from './yaml.mjs';
import { stageDir } from './intake.mjs';
import { hashFile, findDuplicateSource, DuplicateSourceError } from './source-hash.mjs';

// CODEX TYPE -> sub-zone (14-codex.md §2).
const TYPE_INFO = {
  LAW:               { scope: 'external' },
  REGULATION:        { scope: 'external' },
  STANDARD:          { scope: 'external' },
  POLICY:            { scope: 'internal' },
  INTERNAL_STANDARD: { scope: 'internal' },
  PRINCIPLE:         { scope: 'internal' },
};

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Next free ordinal for IDs sharing a TYPE + middle prefix in a codex folder.
async function nextOrdinal(dir, type, middle) {
  if (!(await exists(dir))) return 1;
  const want = [type, ...middle].join('-');
  let max = 0;
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.yaml')) continue;
    const p = parseId(basename(name, '.yaml'));
    if (!p) continue;
    if ([p.type, ...p.middle].join('-') === want) max = Math.max(max, p.ordinal);
  }
  return max + 1;
}

// Find the raw source matching a converted md by basename stem — in inbox/ (the
// pre-admission location), then in `sourcesDir` (where the first successful admit of
// this same source already snapshotted it, named `snapshot_<id>_<date>_<stem><ext>`).
// Without the sourcesDir fallback, re-running admit-source on an already-admitted
// source finds no raw file at all (it was renamed into sources/ on the first run), so
// no source_hash can be computed and the duplicate check below is silently skipped —
// minting a second artefact for the same source on every retry.
async function findRaw(orgRoot, mdPath, sourcesDir) {
  const stem = basename(mdPath, extname(mdPath));
  const inbox = stageDir(orgRoot, 'inbox');
  if (await exists(inbox)) {
    for (const name of await readdir(inbox)) {
      if (basename(name, extname(name)) === stem) return join(inbox, name);
    }
  }
  if (sourcesDir && (await exists(sourcesDir))) {
    for (const name of await readdir(sourcesDir)) {
      if (name.endsWith(`_${stem}${extname(name)}`)) return join(sourcesDir, name);
    }
  }
  return null;
}

export async function emitCodexArtefact(opts) {
  const {
    orgRoot, mdPath, type, jurisdiction, effectiveDate, sourceAuthority,
    issuingAuthority, statement, rationale, establishedBy,
    admittedAt, admittedBy, monitoring, slug, name, force = false,
  } = opts;

  const info = TYPE_INFO[type];
  if (!info) throw new Error(`unknown --type ${type}; expected one of ${Object.keys(TYPE_INFO).join(', ')}`);
  const isPrinciple = type === 'PRINCIPLE';
  const isStandard = type === 'STANDARD';
  // effective_date is required on every codex TYPE except PRINCIPLE (14-codex.md §4.1,
  // optional there); PRINCIPLE's format is still checked when the caller supplies one.
  if (!isPrinciple || effectiveDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate || '')) throw new Error('--effective-date must be YYYY-MM-DD');
  }

  let codexDir;
  let frontJurisdiction = null;
  if (info.scope === 'external') {
    if (!jurisdiction) throw new Error(`--jurisdiction is required for ${type} (codex/external/<jurisdiction>/, CODEX-001)`);
    if (isStandard && !issuingAuthority) {
      throw new Error('--issuing-authority is required for STANDARD (the issuing body, 14-codex.md §2.2)');
    }
    frontJurisdiction = String(jurisdiction).toLowerCase();
    codexDir = join(resolve(orgRoot), 'codex', 'external', frontJurisdiction);
  } else if (isPrinciple) {
    if (!statement) throw new Error(`--statement is required for ${type} (14-codex.md §4.1)`);
    if (!rationale) throw new Error(`--rationale is required for ${type} (14-codex.md §4.1)`);
    codexDir = join(resolve(orgRoot), 'codex', 'internal');
  } else {
    if (!issuingAuthority) throw new Error(`--issuing-authority is required for ${type} (codex/internal/)`);
    codexDir = join(resolve(orgRoot), 'codex', 'internal');
  }

  // Fingerprint the raw bytes up front and refuse a duplicate re-ingest (same content
  // already admitted to codex/) unless --force — before minting an id or snapshotting.
  const sourcesDir = join(codexDir, 'sources');
  const raw = await findRaw(orgRoot, mdPath, sourcesDir);
  let sourceHash = null;
  if (raw) {
    sourceHash = await hashFile(raw);
    if (!force) {
      const dup = await findDuplicateSource(orgRoot, 'codex', sourceHash);
      if (dup) throw new DuplicateSourceError(dup.id, sourceHash);
    }
  }

  const seg = slug ? slugSegment(slug) : slugSegment(name);
  if (!seg) throw new Error('could not derive an ID segment from --slug/--name; pass --slug');
  const middle = [seg];
  const ordinal = await nextOrdinal(codexDir, type, middle);
  const id = makeId(type, middle, ordinal);
  if (!isValidId(id)) throw new Error(`generated an invalid ID: ${id}`);

  // Snapshot the raw bytes into the codex sources/ subfolder (audit trail). The snapshot
  // name is keyed by the unique id plus the original stem (the stem is what lets a later
  // retry of admit-source on the same converted md find this snapshot via findRaw's
  // fallback, once the raw is no longer sitting in inbox/). When `raw` was already found
  // inside sourcesDir (a --force re-admit of an already-snapshotted source), the original
  // bytes are copied under this id's own name rather than moved, so the earlier snapshot
  // is left in place for the artefact that already cites it.
  let snapshotFile = null;
  let snapshotDate = null;
  if (raw) {
    snapshotDate = admittedAt;
    await mkdir(sourcesDir, { recursive: true });
    const stem = basename(mdPath, extname(mdPath));
    const snapName = `snapshot_${id}_${snapshotDate}_${stem}${extname(raw)}`;
    const dest = join(sourcesDir, snapName);
    if (resolve(raw).startsWith(resolve(sourcesDir))) await copyFile(raw, dest);
    else await rename(raw, dest);
    snapshotFile = `sources/${snapName}`;
  }

  const common = {
    id,
    name: name || `${type} — ${seg}`,
    type,
    zone: 'codex',
    admitted_at: admittedAt,
    admitted_by: admittedBy,
  };
  const snapshot = {
    ...(snapshotFile ? { snapshot_file: snapshotFile, snapshot_date: snapshotDate } : {}),
    ...(sourceHash ? { source_hash: sourceHash } : {}),
  };

  const artefact = info.scope === 'external'
    ? {
        ...common,
        gate_checks: { source_authority: sourceAuthority || 'recorded' },
        jurisdiction: frontJurisdiction,
        effective_date: effectiveDate,
        ...(isStandard ? { issuing_authority: issuingAuthority } : {}),
        ...snapshot,
        monitoring_needed: Boolean(monitoring),
      }
    : isPrinciple
    ? {
        ...common,
        gate_checks: { source_authority: sourceAuthority || issuingAuthority || 'recorded' },
        statement,
        rationale,
        ...(issuingAuthority ? { issuing_authority: issuingAuthority } : {}),
        ...(effectiveDate ? { effective_date: effectiveDate } : {}),
        ...(establishedBy ? { established_by: establishedBy } : {}),
        ...snapshot,
      }
    : {
        ...common,
        gate_checks: { source_authority: issuingAuthority },
        issuing_authority: issuingAuthority,
        effective_date: effectiveDate,
        ...snapshot,
      };

  await mkdir(codexDir, { recursive: true });
  const outPath = join(codexDir, `${id}.yaml`);
  await writeFile(outPath, dump(artefact), 'utf8');

  return { id, outPath, snapshotFile, sourceHash, scope: info.scope };
}

export { TYPE_INFO };
