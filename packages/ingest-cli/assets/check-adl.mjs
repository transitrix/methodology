#!/usr/bin/env node
// Architecture Decision Log (ADL) guard — mechanical invariants for the
// per-repo decision records that feed the enterprise ADL.
//
// Companion to scripts/check-notations.mjs. Where check-notations guards the
// model's front door, this guards the decision-record convention defined in
// method/07-decisions.md §2 (record shape), §6–7 (immutability, CI guard).
//
// Scope: files matching  **/operations/decisions/ADR-YYYY-MM-DD-*.md  (new
// records) or the legacy **/operations/decisions/ADR-NNNN-*.md  (existing
// records; method/07-decisions.md §2.2) — override the decisions sub-path with
// --dir <relpath>. The methodology's own dated design ADRs under
// docs/decisions/ are NOT in scope — different convention on purpose.
//
// Checks:
//   A1  front-matter — required keys (id,title,status,date) present; status ∈
//       {proposed,accepted,superseded}; author (optional, default human-architect)
//       ∈ {human-architect,agent} when present; date is ISO; a `superseded`
//       record names a `superseded_by`.
//   A2  immutability — for each record that is `status: accepted` at the merge
//       base, the PR must not change its body or its non-status front-matter.
//   A3  agent gate — a newly-added `author: agent` record may not be introduced
//       already `status: accepted`; acceptance is a separate, human-reviewed step.
//   A4  filename/id — the filename's id segment equals the `id:` field; for a
//       date-slug record that segment's date must also equal the `date:` field.
//   A5  uniqueness — no two records under a decisions folder may share an
//       `id:`, and a newly-added record may not reuse an `id:` already present
//       on the base branch. Applies across both id forms.
//
// A2/A3 and the base-branch half of A5 are diff-based and need git; they
// degrade to skip (not fail) when no base ref is available (e.g. a fresh
// repo). Override the base with --base <ref> (default: origin/main).
//
// Exit codes:  0 clean · 1 findings · 2 script-internal error

import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');

const args = process.argv.slice(2);
function argVal(flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const DECISIONS_SUBPATH = argVal('--dir', 'operations/decisions');
const BASE_REF = argVal('--base', 'origin/main');

const SKIP_DIRS = new Set(['.git', 'node_modules', '0. archive', '.archive']);
const STATUSES = new Set(['proposed', 'accepted', 'superseded']);
const AUTHORS = new Set(['human-architect', 'agent']);
// Date-slug (new records) — checked first, since it is the more specific shape.
const DATE_FILE_RE = /\/ADR-(\d{4}-\d{2}-\d{2})-[^/]+\.md$/;
// Legacy four-digit sequence (existing records; method/07-decisions.md §2.2).
const LEGACY_FILE_RE = /\/ADR-(\d{4})-[^/]+\.md$/;

// --- helpers ---------------------------------------------------------------

function relPosix(abs) {
  return relative(REPO_ROOT, abs).split('\\').join('/');
}

// Normalise CRLF to LF once at every point text enters the script, so a
// Windows checkout (core.autocrlf=true → \r\n on disk) can't desync the
// front-matter delimiter match or the A2 body/front-matter comparisons,
// which are all written against a bare \n.
function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

function isRecordPath(rel) {
  return DATE_FILE_RE.test(rel) || LEGACY_FILE_RE.test(rel);
}

// The specific decisions-folder instance a record belongs to (e.g. a
// multi-org monorepo has one per org). Uniqueness (A5) is scoped to this —
// "unique within their own folder, not globally" (method/06-team-operations.md §5) — so two
// unrelated decisions folders never collide over the same id.
function decisionsFolderOf(rel) {
  const marker = `${DECISIONS_SUBPATH}/`;
  const idx = rel.indexOf(marker);
  return rel.slice(0, idx + marker.length - 1);
}

async function walk(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

// Split a Markdown file into { fm: rawFrontMatter, body }. fm is null if absent.
function splitFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: text };
  return { fm: m[1], body: m[2] };
}

// Minimal scalar front-matter parser: `key: value` per line, quotes stripped.
// Sufficient for the flat ADR header; nested lists (relates_to) are ignored.
function parseFm(fmText) {
  const out = {};
  if (!fmText) return out;
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('#') || v === '') v = '';
    v = v.replace(/\s+#.*$/, '').trim();          // strip trailing comment
    v = v.replace(/^["']|["']$/g, '');             // strip surrounding quotes
    out[m[1]] = v;
  }
  return out;
}

// git show <ref>:<relpath> → string, or null if not present / no git.
function gitShow(ref, relpath) {
  try {
    const out = execFileSync('git', ['show', `${ref}:${relpath}`],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return normalizeEol(out);
  } catch { return null; }
}

// git ls-tree -r --name-only <ref> → every path in the ref, or null if unavailable.
function gitLsTree(ref) {
  try {
    const out = execFileSync('git', ['ls-tree', '-r', '--name-only', ref],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean);
  } catch { return null; }
}

function baseRefExists(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', ref],
      { cwd: REPO_ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch { return false; }
}

// Non-status front-matter, normalised for comparison (drops status & pointers).
function stableFm(fmText) {
  const fm = parseFm(fmText);
  delete fm.status; delete fm.superseded_by;
  return JSON.stringify(Object.keys(fm).sort().map(k => [k, fm[k]]));
}

// --- checks ----------------------------------------------------------------

async function main() {
  const failures = [];
  const all = await walk(REPO_ROOT);
  const records = all.filter(p => {
    const rel = relPosix(p);
    return rel.includes(`${DECISIONS_SUBPATH}/`) && isRecordPath(rel);
  });

  const haveBase = baseRefExists(BASE_REF);
  const idLocations = new Map(); // "<folder>::<id>" -> [rel, ...]  (A5, whole working tree)
  const newRecords = [];         // { rel, id, folder }  — files added in this PR (A5, base-branch reuse)

  for (const abs of records) {
    const rel = relPosix(abs);
    const text = normalizeEol(await readFile(abs, 'utf8'));
    const { fm: fmText, body } = splitFrontMatter(text);

    // A1 — front-matter validity
    if (fmText === null) {
      failures.push({ c: 'A1', m: `${rel}: no front-matter block.` });
      continue;
    }
    const fm = parseFm(fmText);
    // `author` is NOT required: a record with no author defaults to
    // human-architect. Only agent authorship must be declared (author: agent).
    // This grandfathers legacy accepted records that predate the field without
    // forcing an (immutability-violating) edit to them.
    for (const key of ['id', 'title', 'status', 'date']) {
      if (!fm[key]) failures.push({ c: 'A1', m: `${rel}: missing required key \`${key}\`.` });
    }
    if (fm.status && !STATUSES.has(fm.status))
      failures.push({ c: 'A1', m: `${rel}: status "${fm.status}" not in {proposed,accepted,superseded}.` });
    if (fm.author && !AUTHORS.has(fm.author))
      failures.push({ c: 'A1', m: `${rel}: author "${fm.author}" not in {human-architect,agent}.` });
    if (fm.date && !/^\d{4}-\d{2}-\d{2}$/.test(fm.date))
      failures.push({ c: 'A1', m: `${rel}: date "${fm.date}" is not ISO YYYY-MM-DD.` });
    if (fm.status === 'superseded' && !fm.superseded_by)
      failures.push({ c: 'A1', m: `${rel}: status superseded but no superseded_by.` });

    // A4 — filename/id agreement (either id form; date-slug also checks the
    // id's date against date:). A date-slug id is the whole filename stem
    // (slug included, per method/07-decisions.md §2); a legacy id is only the four-digit
    // segment (slug excluded, unchanged historical convention).
    const dateMatch = rel.match(DATE_FILE_RE);
    const legacyMatch = !dateMatch && rel.match(LEGACY_FILE_RE);
    let expectedId = null, idDate = null;
    if (dateMatch) {
      idDate = dateMatch[1];
      const base = rel.slice(rel.lastIndexOf('/') + 1);
      expectedId = base.slice(0, -'.md'.length);
    } else if (legacyMatch) {
      expectedId = `ADR-${legacyMatch[1]}`;
    }
    if (fm.id && expectedId && fm.id !== expectedId)
      failures.push({ c: 'A4', m: `${rel}: id "${fm.id}" ≠ filename ${expectedId}.` });
    if (idDate && fm.date && idDate !== fm.date)
      failures.push({ c: 'A4', m: `${rel}: id date "${idDate}" ≠ date: field "${fm.date}".` });

    // A5 — uniqueness within the working tree, scoped per decisions folder
    // (either id form; no allocation step means this guard, not a counter, is
    // what keeps ids collision-free).
    const folder = decisionsFolderOf(rel);
    if (fm.id) {
      const key = `${folder}::${fm.id}`;
      if (!idLocations.has(key)) idLocations.set(key, []);
      idLocations.get(key).push(rel);
    }

    // A2 / A3 / A5(base) — diff-based, need a base ref
    if (!haveBase) continue;
    const baseText = gitShow(BASE_REF, rel);

    if (baseText === null) {
      // Newly added file → A3 agent gate + A5 base-reuse candidate.
      if (fm.author === 'agent' && fm.status === 'accepted')
        failures.push({ c: 'A3', m: `${rel}: new author:agent record may not be introduced as status:accepted — open it as proposed; a human ratifies it in a separate change.` });
      if (fm.id) newRecords.push({ rel, id: fm.id, folder });
      continue;
    }

    // A2 immutability — only enforced if the record was accepted at base.
    const base = splitFrontMatter(baseText);
    const baseFm = parseFm(base.fm);
    if (baseFm.status === 'accepted') {
      if (base.body.trim() !== body.trim())
        failures.push({ c: 'A2', m: `${rel}: body of an accepted record changed — accepted ADRs are immutable; supersede with a new record instead.` });
      if (stableFm(base.fm) !== stableFm(fmText))
        failures.push({ c: 'A2', m: `${rel}: non-status front-matter of an accepted record changed — only status/superseded_by may move.` });
    }
  }

  // A5 — duplicate id within the current (working-tree) folder, either form.
  for (const [key, locs] of idLocations) {
    if (locs.length > 1) {
      const id = key.slice(key.lastIndexOf('::') + 2);
      for (const rel of locs)
        failures.push({ c: 'A5', m: `${rel}: id "${id}" is shared by ${locs.length} records in this folder (${locs.join(', ')}).` });
    }
  }

  // A5 — a newly added record may not reuse an id already present on the base
  // branch, scoped per decisions-folder instance (same scoping as above).
  if (haveBase && newRecords.length) {
    const baseIds = new Set(); // "<folder>::<id>"
    const baseFiles = gitLsTree(BASE_REF) || [];
    for (const p of baseFiles) {
      if (!p.includes(`${DECISIONS_SUBPATH}/`) || !isRecordPath(p)) continue;
      const baseText = gitShow(BASE_REF, p);
      if (baseText === null) continue;
      const { fm: fmText } = splitFrontMatter(baseText);
      const fm = parseFm(fmText);
      if (fm.id) baseIds.add(`${decisionsFolderOf(p)}::${fm.id}`);
    }
    for (const r of newRecords) {
      if (baseIds.has(`${r.folder}::${r.id}`))
        failures.push({ c: 'A5', m: `${r.rel}: id "${r.id}" already exists on the base branch — a newly added record must not reuse an id.` });
    }
  }

  if (failures.length) {
    console.error(`\nADL guard — ${failures.length} finding(s) (decisions sub-path: ${DECISIONS_SUBPATH}/):\n`);
    for (const f of failures.sort((a, b) => a.c.localeCompare(b.c)))
      console.error(`  - [${f.c}] ${f.m}`);
    console.error(`\nSee method/07-decisions.md §6–7 for the rules.\n`);
    process.exit(1);
  }
  console.log(`ADL guard clean — ${records.length} decision record(s) under **/${DECISIONS_SUBPATH}/ valid${haveBase ? '' : ' (A2/A3/A5-base-reuse skipped — no base ref)'}.`);
  process.exit(0);
}

main().catch(e => { console.error(`error: ${e.message}`); process.exit(2); });
