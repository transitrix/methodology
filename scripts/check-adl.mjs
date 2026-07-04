#!/usr/bin/env node
// Architecture Decision Log (ADL) guard — mechanical invariants for the
// per-repo decision records that feed the enterprise ADL.
//
// Companion to scripts/check-notations.mjs. Where check-notations guards the
// model's front door, this guards the decision-record convention defined in
// method/02-team-operations.md §3.1 and method/03-architecture-decision-log.md.
//
// Scope: files matching  **/operations/decisions/ADR-NNNN-*.md  (override the
// decisions sub-path with --dir <relpath>). The methodology's own dated design
// ADRs under docs/decisions/ are NOT in scope — different convention on purpose.
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
//   A4  filename/id — ADR-NNNN in the filename equals the `id:` field.
//
// A2/A3 are diff-based and need git; they degrade to skip (not fail) when no
// base ref is available (e.g. a fresh repo). Override the base with --base <ref>
// (default: origin/main).
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
const FILE_RE = /\/ADR-(\d{4})-[^/]+\.md$/;

// --- helpers ---------------------------------------------------------------

function relPosix(abs) {
  return relative(REPO_ROOT, abs).split('\\').join('/');
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
    return execFileSync('git', ['show', `${ref}:${relpath}`],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
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
  const records = all.filter(p => relPosix(p).includes(`${DECISIONS_SUBPATH}/`) && FILE_RE.test(p));

  const haveBase = baseRefExists(BASE_REF);

  for (const abs of records) {
    const rel = relPosix(abs);
    const text = await readFile(abs, 'utf8');
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

    // A4 — filename/id agreement
    const fileNum = rel.match(FILE_RE)[1];
    if (fm.id && fm.id !== `ADR-${fileNum}`)
      failures.push({ c: 'A4', m: `${rel}: id "${fm.id}" ≠ filename ADR-${fileNum}.` });

    // A2 / A3 — diff-based, need a base ref
    if (!haveBase) continue;
    const baseText = gitShow(BASE_REF, rel);

    if (baseText === null) {
      // Newly added file → A3 agent gate.
      if (fm.author === 'agent' && fm.status === 'accepted')
        failures.push({ c: 'A3', m: `${rel}: new author:agent record may not be introduced as status:accepted — open it as proposed; a human ratifies it in a separate change.` });
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

  if (failures.length) {
    console.error(`\nADL guard — ${failures.length} finding(s) (decisions sub-path: ${DECISIONS_SUBPATH}/):\n`);
    for (const f of failures.sort((a, b) => a.c.localeCompare(b.c)))
      console.error(`  - [${f.c}] ${f.m}`);
    console.error(`\nSee method/03-architecture-decision-log.md §7–8 for the rules.\n`);
    process.exit(1);
  }
  console.log(`ADL guard clean — ${records.length} decision record(s) under **/${DECISIONS_SUBPATH}/ valid${haveBase ? '' : ' (A2/A3 skipped — no base ref)'}.`);
  process.exit(0);
}

main().catch(e => { console.error(`error: ${e.message}`); process.exit(2); });
