// Reference resolution — the document-view engine's four distinguishable
// states (hub epic "Document-view engine: recipe transclusion, reference
// flags, render profiles", §3). Given an ID a recipe wants to transclude,
// classify it against canon as resolved, or one of:
//
//   ⚑U unresolved      — the id does not exist anywhere in canon
//   ⚑A not admitted     — the object exists but admission_state isn't active
//   ⚑V out of validity  — [valid_from, valid_to] doesn't cover the render date
//   ⚑S suspect          — only for a REL/ASSERTION/VERIFICATION/VALIDATION
//                          record: its own endpoint(s) changed since the
//                          record last looked at them
//
// ⚑S reuses the derived-from-git computation CONTRACT.md §16 defines
// (content identity + anchor commit) — a package-local copy of
// scripts/check-link-suspicion.mjs's logic, not an import from it, per this
// package's zero-cross-dependency convention (README "Usage": "own
// hand-rolled parsing, no shared cross-package runtime import").
//
// The anchor for a REL/ASSERTION/VERIFICATION/VALIDATION record is its own
// file's most recent commit (CONTRACT.md §16.2's table) — not the record's
// `performed_at` field. This module follows §16.2 and the already-adopted
// reference implementation exactly; a per-field anchor would diverge from
// the one link-suspicion computation the rest of canon already uses.
//
// Inline reference fields on a plain element (e.g. `REQUIREMENT.parent`) do
// not get ⚑S — CONTRACT.md §16 defines suspicion only for REL/ASSERTION/
// VERIFICATION/VALIDATION records, each with one admission anchor covering
// all of its own references. A recipe's own `{{ ID }}` tag is not a canon
// record and has no anchor of its own, so it never carries ⚑S directly —
// only when the id it names *is* a REL/claim record does §3's ⚑S apply, to
// that record's endpoints.

import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve as resolvePath, relative, sep } from 'node:path';

// ── Content identity (CONTRACT.md §16.1) ────────────────────────────────

const ENVELOPE_FIELDS = [
  'zone', 'admitted_at', 'admitted_by', 'gate_checks', 'derived_from',
  'admission_state', 'proposed_at', 'proposed_by', 'owner_to_confirm',
  'rejected_at', 'rejected_by', 'rejection_reason',
  'reviewer_authority',
  'agreement', 'agreed_by', 'agreed_at',
  'valid_from', 'valid_to',
];

function stripComment(line) {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === '#' && !inQuotes) return line.slice(0, i);
  }
  return line;
}

export function statementLines(text) {
  const kept = [];
  let skipIndent = null;
  for (const raw of text.split('\n')) {
    const stripped = stripComment(raw).replace(/\s+$/, '');
    if (!stripped.trim()) continue;
    const indent = stripped.match(/^ */)[0].length;
    if (skipIndent !== null) {
      if (indent > skipIndent) continue;
      skipIndent = null;
    }
    const keyMatch = stripped.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*):/);
    if (keyMatch && keyMatch[1].length === 0 && ENVELOPE_FIELDS.includes(keyMatch[2])) {
      skipIndent = indent;
      continue;
    }
    kept.push(stripped.trim().replace(/\s+/g, ' '));
  }
  return kept.sort();
}

export function contentIdentity(text) {
  const hash = createHash('sha256').update(statementLines(text).join('\n')).digest('hex');
  return `sha256:${hash}`;
}

function sameLines(a, b) {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

// ── Git plumbing — read-only ─────────────────────────────────────────────

function git(gitArgs, cwd) {
  return execFileSync('git', gitArgs, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'ignore'] });
}

export function lastCommitTouching(orgRoot, relPath) {
  try {
    const out = git(['log', '-1', '--format=%H', '--', relPath], orgRoot);
    return out.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function readAt(orgRoot, ref, relPath) {
  try {
    return git(['show', `${ref}:${relPath}`], orgRoot);
  } catch {
    return undefined;
  }
}

// ── Mechanical-procedure hatch (CONTRACT.md §16.3) ───────────────────────

function unquote(s) {
  const m = s.match(/^"(.*)"$/);
  return m ? m[1] : s;
}

function normalizeEditLine(s) {
  return unquote(s.trim()).trim().replace(/\s+/g, ' ');
}

export function parseManifest(text) {
  const manifest = { mechanical: false, applies_to: [], line_edits: [] };
  let section = null;
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const topMatch = line.match(/^(\w+):\s*(.*)$/);
    if (topMatch) {
      const [, key, val] = topMatch;
      if (key === 'mechanical') {
        manifest.mechanical = val.trim() === 'true';
        section = null;
      } else if (key === 'applies_to') {
        section = 'applies_to';
      } else if (key === 'line_edits') {
        section = 'line_edits';
      }
      continue;
    }

    if (section === 'applies_to') {
      const m = line.match(/^\s*-\s*(.+)$/);
      if (m) manifest.applies_to.push(unquote(m[1].trim()));
    } else if (section === 'line_edits') {
      const fromMatch = line.match(/^\s*-\s*from:\s*(.+)$/);
      if (fromMatch) {
        current = { from: normalizeEditLine(fromMatch[1]) };
        manifest.line_edits.push(current);
        continue;
      }
      const toMatch = line.match(/^\s*to:\s*(.+)$/);
      if (toMatch && current) current.to = normalizeEditLine(toMatch[1]);
    }
  }
  return manifest;
}

export async function loadMigrationManifests(orgRoot) {
  let entries;
  try {
    entries = await readdir(join(orgRoot, 'migrations'), { withFileTypes: true });
  } catch {
    return [];
  }
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let text;
    try {
      text = await readFile(join(orgRoot, 'migrations', entry.name, 'TRANSFORM.yaml'), 'utf8');
    } catch {
      continue;
    }
    manifests.push({ slug: entry.name, ...parseManifest(text) });
  }
  return manifests;
}

export function replayExplains(beforeLines, afterLines, lineEdits) {
  const working = [...beforeLines];
  for (const edit of lineEdits) {
    const idx = working.indexOf(edit.from);
    if (idx === -1) return false;
    working.splice(idx, 1, edit.to);
  }
  return sameLines(working.sort(), [...afterLines].sort());
}

export async function checkSuspicion({ orgRoot, anchorCommit, targetRelPath, manifests = [] }) {
  if (!anchorCommit) return { suspicious: false, reason: 'no-anchor' };

  const beforeText = readAt(orgRoot, anchorCommit, targetRelPath);
  if (beforeText === undefined) return { suspicious: false, reason: 'target-absent-at-anchor' };

  let afterText;
  try {
    afterText = await readFile(join(orgRoot, ...targetRelPath.split('/')), 'utf8');
  } catch {
    return { suspicious: false, reason: 'target-absent-now' };
  }

  const beforeLines = statementLines(beforeText);
  const afterLines = statementLines(afterText);
  if (sameLines(beforeLines, afterLines)) return { suspicious: false };

  const applicable = manifests.filter((m) => m.applies_to.includes(targetRelPath));
  for (const manifest of applicable) {
    if (replayExplains(beforeLines, afterLines, manifest.line_edits)) {
      return { suspicious: false, mechanical: true, manifest: manifest.slug };
    }
  }
  return { suspicious: true, hatchRefused: applicable.some((m) => m.mechanical) };
}

// ── Canon index ───────────────────────────────────────────────────────────
// A recipe's `canon:` header field names the `canon/` directory directly
// (README example: `canon: ../canon`). Git plumbing and migration manifests
// key off the organisation root one level up — the same layout
// scripts/check-link-suspicion.mjs assumes (`root` = the repo containing
// both `canon/` and `migrations/`).

const LINK_RECORD_KINDS = [
  { dir: 'relations', endpointFields: ['from', 'to'] },
  { dir: 'assertions', endpointFields: ['about'] },
  { dir: 'verifications', endpointFields: ['verifies'] },
  { dir: 'validations', endpointFields: ['validates'] },
];

async function walkYaml(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkYaml(p)));
    else if (entry.isFile() && entry.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

// Targeted top-level scalar extraction — same convention as
// scripts/baseline-manifest.mjs's `field()` / scripts/check-link-suspicion.mjs.
function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n#]*?)"?\\s*(?:#.*)?$`, 'm'));
  return m ? m[1].trim() : undefined;
}

function dateField(text, name) {
  const raw = field(text, name);
  if (raw === undefined || raw === 'null') return null;
  return raw;
}

function toOrgRelPath(canonRoot, absPath) {
  return join('canon', relative(canonRoot, absPath)).split(sep).join('/');
}

async function indexFile(canonRoot, absPath, index, endpointFields) {
  const text = await readFile(absPath, 'utf8');
  const id = field(text, 'id');
  if (!id) return;
  const endpoints = endpointFields
    ? Object.fromEntries(endpointFields.map((f) => [f, field(text, f)]).filter(([, v]) => v !== undefined))
    : null;
  index.set(id, {
    orgRelPath: toOrgRelPath(canonRoot, absPath),
    admissionState: field(text, 'admission_state') ?? 'active',
    validFrom: dateField(text, 'valid_from'),
    validTo: dateField(text, 'valid_to'),
    endpoints,
  });
}

// Scans every element and every REL/ASSERTION/VERIFICATION/VALIDATION
// record under `canonRoot` into an id → entry index. Proposed and rejected
// drafts are indexed too (not skipped) — §3's ⚑U/⚑A distinction depends on
// telling "doesn't exist" apart from "exists, not admitted".
export async function buildCanonIndex(canonRoot) {
  const index = new Map();
  for (const file of await walkYaml(join(canonRoot, 'elements'))) {
    await indexFile(canonRoot, file, index, null);
  }
  for (const { dir, endpointFields } of LINK_RECORD_KINDS) {
    for (const file of await walkYaml(join(canonRoot, dir))) {
      await indexFile(canonRoot, file, index, endpointFields);
    }
  }
  return index;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function coversDate(validFrom, validTo, renderDate) {
  if (validFrom === null) return true; // nothing to check against
  if (renderDate < validFrom) return false;
  if (validTo !== null && renderDate > validTo) return false;
  return true;
}

async function endpointsSuspicious(entry, index, orgRoot, manifests) {
  if (!entry.endpoints) return false;
  const anchor = lastCommitTouching(orgRoot, entry.orgRelPath);
  for (const targetId of Object.values(entry.endpoints)) {
    const targetEntry = index.get(targetId);
    if (!targetEntry) continue; // unresolved endpoint — a validator's concern (REL-002 etc.), not §3's
    const result = await checkSuspicion({
      orgRoot,
      anchorCommit: anchor,
      targetRelPath: targetEntry.orgRelPath,
      manifests,
    });
    if (result.suspicious) return true;
  }
  return false;
}

// Resolves one id against an index already built by buildCanonIndex(),
// returning `{ id, state, flag }` — flag is null when state is 'ok'.
export async function resolveReference(id, index, { canonRoot, renderDate, manifests } = {}) {
  const entry = index.get(id);
  if (!entry) return { id, state: 'unresolved', flag: '⚑U' };

  if (entry.admissionState !== 'active') return { id, state: 'not-admitted', flag: '⚑A' };

  const date = renderDate ?? todayIso();
  if (!coversDate(entry.validFrom, entry.validTo, date)) {
    return { id, state: 'out-of-validity', flag: '⚑V' };
  }

  if (entry.endpoints) {
    const orgRoot = resolvePath(canonRoot, '..');
    const loadedManifests = manifests ?? (await loadMigrationManifests(orgRoot));
    if (await endpointsSuspicious(entry, index, orgRoot, loadedManifests)) {
      return { id, state: 'suspect', flag: '⚑S' };
    }
  }

  return { id, state: 'ok', flag: null };
}

// Builds an index once and returns a bound `resolveReference(id, opts)` —
// the shape a renderer resolving many references in one pass wants, so the
// canon walk and the migration-manifest load each happen exactly once.
export async function createResolver(canonRoot) {
  const orgRoot = resolvePath(canonRoot, '..');
  const [index, manifests] = await Promise.all([
    buildCanonIndex(canonRoot),
    loadMigrationManifests(orgRoot),
  ]);
  return {
    index,
    resolveReference: (id, opts = {}) => resolveReference(id, index, { canonRoot, manifests, ...opts }),
  };
}
