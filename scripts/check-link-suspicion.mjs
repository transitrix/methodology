#!/usr/bin/env node
// Link suspicion, content identity, and the mechanical-procedure hatch —
// CONTRACT.md §16, reference implementation.
//
// Nothing here is stored: every check re-derives its answer from git and the
// current working tree. Three applications share one computation:
//   - suspicion on a relation      REL (from/to) / ASSERTION (about)
//   - staleness on a comparison    VERIFICATION (verifies) / VALIDATION (validates)
//   - agreement lapse on an element  REQUIREMENT/CONSTRAINT/NEED with agreement: agreed
//
// Content identity (§16.1) is a line-oriented normalisation, not a general
// YAML parser — the same posture scripts/baseline-manifest.mjs and
// scripts/check-agreement.mjs already take: sufficient for the flat/shallow
// canon shape, no new parsing dependency added to the root scripts/ toolchain.
//
// Usage:
//   node scripts/check-link-suspicion.mjs [--root <adopter-repo>]
//
// Exit codes: 0 always on a normal run (informational — §16.2 "reports,
// never filters") · 2 script-internal error.

import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// The administrative envelope (§16.1) — field names already defined by name
// in CONTRACT.md §6 / §6.1 / §6.2 / §6.3 (when present) / §7. One list,
// defined once; a spec revision that adds an envelope field extends this
// list in the same revision rather than inventing a second mechanism.
const ENVELOPE_FIELDS = [
  'zone', 'admitted_at', 'admitted_by', 'gate_checks', 'derived_from',
  'admission_state', 'proposed_at', 'proposed_by', 'owner_to_confirm',
  'rejected_at', 'rejected_by', 'rejection_reason',
  'reviewer_authority',
  'agreement', 'agreed_by', 'agreed_at',
  'valid_from', 'valid_to',
];

// --- content identity (§16.1) -------------------------------------------

function stripComment(line) {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === '#' && !inQuotes) return line.slice(0, i);
  }
  return line;
}

// Every non-blank, non-comment line of the file, except those belonging to
// an ENVELOPE_FIELDS block (the key line and its more-indented continuation
// lines), whitespace-normalised and sorted — order-independent,
// formatting-independent, comment-independent.
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

// --- git plumbing — read-only, mirrors scripts/baseline-manifest.mjs ----

function git(gitArgs, cwd, { quiet } = {}) {
  return execFileSync('git', gitArgs, {
    encoding: 'utf8',
    cwd,
    stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'pipe'],
  });
}

// The last commit that touched `relPath` at all, or — when `pattern` is
// given — the last commit whose diff added/removed a line matching it
// (git's pickaxe, `-G`). Used to anchor "agreement lapse" on the commit that
// actually set the agreement fields, not the file's last edit for any reason.
export function lastCommitTouching(root, relPath, pattern) {
  const args = ['log', '-1', '--format=%H'];
  if (pattern) args.push(`-G${pattern}`);
  args.push('--', relPath);
  let out;
  try {
    out = git(args, root, { quiet: true });
  } catch {
    return undefined;
  }
  const sha = out.trim();
  return sha || undefined;
}

export function readAt(root, ref, relPath) {
  try {
    return git(['show', `${ref}:${relPath}`], root, { quiet: true });
  } catch {
    return undefined;
  }
}

// --- the mechanical-procedure hatch (§16.3) ------------------------------

function unquote(s) {
  const m = s.match(/^"(.*)"$/);
  return m ? m[1] : s;
}

function normalizeEditLine(s) {
  return unquote(s.trim()).trim().replace(/\s+/g, ' ');
}

// Minimal parse of the fixed `migrations/<slug>/TRANSFORM.yaml` shape —
// `mechanical: true`, `applies_to: [exact relative paths]`,
// `line_edits: [{from, to}]`. Not a general YAML parser, same posture as
// statementLines above.
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

export async function loadMigrationManifests(root) {
  let entries;
  try {
    entries = await readdir(join(root, 'migrations'), { withFileTypes: true });
  } catch {
    return [];
  }
  const manifests = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let text;
    try {
      text = await readFile(join(root, 'migrations', entry.name, 'TRANSFORM.yaml'), 'utf8');
    } catch {
      continue;
    }
    manifests.push({ slug: entry.name, ...parseManifest(text) });
  }
  return manifests;
}

// Replay a manifest's declared line_edits against the before-state and check
// the result matches the after-state exactly. This is the independent
// verification: the tool's `mechanical: true` declaration is never trusted
// on its own — only a replay that reproduces the after-state suppresses
// suspicion (§16.3, "the editing tool cannot self-grant it").
export function replayExplains(beforeLines, afterLines, lineEdits) {
  const working = [...beforeLines];
  for (const edit of lineEdits) {
    const idx = working.indexOf(edit.from);
    if (idx === -1) return false;
    working.splice(idx, 1, edit.to);
  }
  return sameLines(working.sort(), [...afterLines].sort());
}

// --- link suspicion (§16.2) ----------------------------------------------

export async function checkSuspicion({ root, anchorCommit, targetRelPath, manifests = [] }) {
  if (!anchorCommit) return { suspicious: false, reason: 'no-anchor' };

  const beforeText = readAt(root, anchorCommit, targetRelPath);
  if (beforeText === undefined) return { suspicious: false, reason: 'target-absent-at-anchor' };

  let afterText;
  try {
    afterText = await readFile(join(root, ...targetRelPath.split('/')), 'utf8');
  } catch {
    return { suspicious: false, reason: 'target-absent-now' };
  }

  const beforeLines = statementLines(beforeText);
  const afterLines = statementLines(afterText);
  if (sameLines(beforeLines, afterLines)) return { suspicious: false };

  const applicable = manifests.filter(m => m.applies_to.includes(targetRelPath));
  for (const manifest of applicable) {
    if (replayExplains(beforeLines, afterLines, manifest.line_edits)) {
      return { suspicious: false, mechanical: true, manifest: manifest.slug };
    }
  }
  return { suspicious: true, hatchRefused: applicable.some(m => m.mechanical) };
}

// --- repo scan — the three applications ----------------------------------

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
// scripts/baseline-manifest.mjs's `field()`.
function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n#]*?)"?\\s*(?:#.*)?$`, 'm'));
  return m ? m[1].trim() : undefined;
}

function toRel(root, absPath) {
  return relative(root, absPath).split(sep).join('/');
}

async function buildIdIndex(root) {
  const index = new Map();
  for (const file of await walkYaml(join(root, 'canon'))) {
    const text = await readFile(file, 'utf8');
    const id = field(text, 'id');
    if (id) index.set(id, toRel(root, file));
  }
  return index;
}

const LINK_FOLDERS = [
  { dir: 'canon/relations', endpointFields: ['from', 'to'] },
  { dir: 'canon/assertions', endpointFields: ['about'] },
  { dir: 'canon/verifications', endpointFields: ['verifies'] },
  { dir: 'canon/validations', endpointFields: ['validates'] },
];

export async function checkAll(rootArg) {
  const root = resolve(rootArg);
  const manifests = await loadMigrationManifests(root);
  const index = await buildIdIndex(root);
  const findings = [];

  // Applications 1 & 2: suspicion on a relation / staleness on a comparison.
  for (const { dir, endpointFields } of LINK_FOLDERS) {
    for (const file of await walkYaml(join(root, dir))) {
      const text = await readFile(file, 'utf8');
      const recordRelPath = toRel(root, file);
      const recordId = field(text, 'id');
      const anchor = lastCommitTouching(root, recordRelPath);
      for (const ef of endpointFields) {
        const targetId = field(text, ef);
        const targetRelPath = targetId && index.get(targetId);
        if (!targetRelPath) continue; // unresolved — REL-002 / ASSERT-002 / etc's concern, not this one
        const result = await checkSuspicion({ root, anchorCommit: anchor, targetRelPath, manifests });
        if (result.suspicious) {
          findings.push({
            application: 'link',
            record: recordRelPath, recordId,
            target: targetRelPath, targetId,
            anchor, hatchRefused: result.hatchRefused === true,
          });
        }
      }
    }
  }

  // Application 3: agreement lapse — REQUIREMENT/CONSTRAINT/NEED with agreement: agreed.
  for (const file of await walkYaml(join(root, 'canon', 'elements'))) {
    const text = await readFile(file, 'utf8');
    if (field(text, 'agreement') !== 'agreed') continue;
    const relPath = toRel(root, file);
    const id = field(text, 'id');
    const anchor = lastCommitTouching(root, relPath, '^(agreement|agreed_by|agreed_at):');
    const result = await checkSuspicion({ root, anchorCommit: anchor, targetRelPath: relPath, manifests });
    if (result.suspicious) {
      findings.push({
        application: 'agreement-lapse',
        record: relPath, recordId: id,
        target: relPath, targetId: id,
        anchor, hatchRefused: result.hatchRefused === true,
      });
    }
  }

  return findings;
}

async function main() {
  const args = process.argv.slice(2);
  const rootFlagIndex = args.indexOf('--root');
  const root = rootFlagIndex >= 0 && args[rootFlagIndex + 1] ? args[rootFlagIndex + 1] : '.';

  const findings = await checkAll(root);
  if (findings.length === 0) {
    console.log('check-link-suspicion: clean — no suspicious links found.');
    return;
  }
  for (const f of findings) {
    const tag = f.application === 'agreement-lapse' ? 'AGREEMENT-LAPSE' : 'SUSPECT';
    const hatchNote = f.hatchRefused ? '  [MECH-001: hatch declared but not verified]' : '';
    console.log(`${tag}  ${f.record} (${f.recordId})  ->  ${f.target} (${f.targetId})  anchor=${f.anchor}${hatchNote}`);
  }
  console.log(`\n${findings.length} suspicious link(s). Informational — see CONTRACT.md §16.2.`);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 2;
  });
}
