// Read/write decisions.reviewed.yaml — the shared human-gate decision package
// (hub ADR architecture/methodology/2026-07-28-ingest-admission-decision-contract.md).
// This file is never canon; `apply` is the one step that writes admitted canon.

import { readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { dump, readTopScalar, readBlockScalars, readMapList } from './yaml.mjs';

export const DECISIONS_FILENAME = 'decisions.reviewed.yaml';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// The decision package lives beside its source gate's stable presentation file
// (same batch directory) — ADR §5. `sourceGatePath` is the resolved path to the
// review-queue.yaml / review-digest.yaml this package answers.
export function defaultDecisionsPath(sourceGatePath) {
  return join(dirname(resolve(sourceGatePath)), DECISIONS_FILENAME);
}

// Auto-detect the source gate for an org: prefer an existing review-queue.yaml,
// then review-digest.yaml, at the flat legacy path. Batch-directory discovery
// (dated dirs) is left to the caller via --source-gate for now — v1 targets the
// common single-batch case; multi-batch orgs should pass --source-gate explicitly.
export async function findSourceGate(orgRoot) {
  const dir = join(resolve(orgRoot), '_intake', 'processing');
  for (const filename of ['review-queue.yaml', 'review-digest.yaml']) {
    const p = join(dir, filename);
    if (await exists(p)) return p;
  }
  return null;
}

export function emptyDecisions({ generatedBy, orgRoot, asOf, sourceGate }) {
  return {
    generated_by: generatedBy,
    org_root: resolve(orgRoot),
    as_of: asOf,
    source_gate: sourceGate,
    gate: { admits_to_canon: false },
    decisions: [],
  };
}

// Parse a decisions.reviewed.yaml file's text into { generated_by, org_root, as_of,
// source_gate, gate: { admits_to_canon }, decisions: [...] }.
export function parseDecisions(text) {
  return {
    generated_by: readTopScalar(text, 'generated_by') ?? null,
    org_root: readTopScalar(text, 'org_root') ?? null,
    as_of: readTopScalar(text, 'as_of') ?? null,
    source_gate: readTopScalar(text, 'source_gate') ?? null,
    gate: readBlockScalars(text, 'gate') || { admits_to_canon: false },
    decisions: readMapList(text, 'decisions'),
  };
}

export async function loadDecisions(path) {
  if (!(await exists(path))) return null;
  return parseDecisions(await readFile(path, 'utf8'));
}

export async function saveDecisions(doc, path) {
  await writeFile(path, dump(doc), 'utf8');
  return path;
}
