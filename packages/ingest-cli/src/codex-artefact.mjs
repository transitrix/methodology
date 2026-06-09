// `codex-artefact` — admit a converted external law/regulation or internal policy /
// standard into the CODEX zone as a FAITHFUL source artefact (14-codex.md §3/§4).
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

import { readFile, writeFile, mkdir, readdir, rename, access } from 'node:fs/promises';
import { join, resolve, basename, extname } from 'node:path';
import { isValidId, makeId, slugSegment, parseId } from './ids.mjs';
import { dump } from './yaml.mjs';
import { stageDir } from './intake.mjs';
import { hashFile, findDuplicateSource, DuplicateSourceError } from './source-hash.mjs';

// CODEX TYPE -> sub-zone (14-codex.md §2).
const TYPE_INFO = {
  LAW:               { scope: 'external' },
  REGULATION:        { scope: 'external' },
  POLICY:            { scope: 'internal' },
  INTERNAL_STANDARD: { scope: 'internal' },
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

// Find the raw source in inbox/ matching a converted md by basename stem.
async function findRaw(orgRoot, mdPath) {
  const inbox = stageDir(orgRoot, 'inbox');
  if (!(await exists(inbox))) return null;
  const stem = basename(mdPath, extname(mdPath));
  for (const name of await readdir(inbox)) {
    if (basename(name, extname(name)) === stem) return join(inbox, name);
  }
  return null;
}

export async function emitCodexArtefact(opts) {
  const {
    orgRoot, mdPath, type, jurisdiction, effectiveDate, sourceAuthority,
    issuingAuthority, admittedAt, admittedBy, monitoring, slug, name, force = false,
  } = opts;

  const info = TYPE_INFO[type];
  if (!info) throw new Error(`unknown --type ${type}; expected one of ${Object.keys(TYPE_INFO).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate || '')) throw new Error('--effective-date must be YYYY-MM-DD');

  let codexDir;
  let frontJurisdiction = null;
  if (info.scope === 'external') {
    if (!jurisdiction) throw new Error(`--jurisdiction is required for ${type} (codex/external/<jurisdiction>/, CODEX-001)`);
    frontJurisdiction = String(jurisdiction).toLowerCase();
    codexDir = join(resolve(orgRoot), 'codex', 'external', frontJurisdiction);
  } else {
    if (!issuingAuthority) throw new Error(`--issuing-authority is required for ${type} (codex/internal/)`);
    codexDir = join(resolve(orgRoot), 'codex', 'internal');
  }

  // Fingerprint the raw bytes up front and refuse a duplicate re-ingest (same content
  // already admitted to codex/) unless --force — before minting an id or snapshotting.
  const raw = await findRaw(orgRoot, mdPath);
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
  // name is keyed by the unique id, so it never collides across distinct sources.
  let snapshotFile = null;
  let snapshotDate = null;
  if (raw) {
    snapshotDate = admittedAt;
    const sourcesDir = join(codexDir, 'sources');
    await mkdir(sourcesDir, { recursive: true });
    const snapName = `snapshot_${id}_${snapshotDate}${extname(raw)}`;
    await rename(raw, join(sourcesDir, snapName));
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
        ...snapshot,
        monitoring_needed: Boolean(monitoring),
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
