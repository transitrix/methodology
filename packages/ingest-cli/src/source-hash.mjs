// Source-content hashing + duplicate detection. A source artefact (field or codex)
// fingerprints its raw bytes as `source_hash: sha256:<hex>` — the same fingerprint that
// gives tamper-evidence (CONTRACT §6) doubles as a duplicate key: an identical re-ingest
// produces the same hash, so we can recognise it instead of silently minting a second
// artefact. This module is the one place that hash is computed and compared. Read-only
// over the zones — like the rest of the CLI, it never writes canon.

import { readdir, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { readTopScalar } from './yaml.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

export function hashBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export async function hashFile(path) {
  return hashBytes(await readFile(path));
}

// The 8-hex-char short form of a source_hash, for disambiguating filenames.
export function shortHash(hash) {
  return String(hash).replace(/^sha256:/, '').slice(0, 8);
}

// Recursively collect every *.yaml path under dir.
async function walkYaml(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walkYaml(p));
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

// Scan a zone ('field' | 'codex') for an already-admitted artefact whose source_hash
// equals `hash`. Returns { id, file } for the first match, or null. An absent zone (the
// common case on the first ingest) yields null — no match, nothing skipped.
export async function findDuplicateSource(orgRoot, zone, hash) {
  if (!hash) return null;
  const dir = join(resolve(orgRoot), zone);
  if (!(await exists(dir))) return null;
  for (const file of await walkYaml(dir)) {
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    if (readTopScalar(text, 'source_hash') === hash) {
      return { id: readTopScalar(text, 'id'), file };
    }
  }
  return null;
}

// Thrown by the emit paths when an identical source is already admitted and --force was
// not given. The CLI recognises `duplicate` to warn-and-skip instead of erroring.
export class DuplicateSourceError extends Error {
  constructor(existingId, hash) {
    super(`source already admitted as ${existingId} (same source_hash ${hash}) — pass --force to admit a duplicate`);
    this.name = 'DuplicateSourceError';
    this.existingId = existingId;
    this.sourceHash = hash;
    this.duplicate = true;
  }
}
