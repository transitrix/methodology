#!/usr/bin/env node
// Baseline manifest — read-only, git-native.
//
// A `git tag` IS a baseline: the ref names a frozen commit, and this script
// reports the whole admitted canon set exactly as it stood at that ref — via
// `git show <ref>:<path>`, never `git checkout`, so running it never disturbs
// the working tree. See patterns/baseline-audit-trail.md.
//
// Scope is NOT a hardcoded TYPE list. Every `.yaml` file under `canon/`
// (excluding `canon/views/`, which holds view/report/document configs, not
// individually admitted elements) is read; its TYPE is the leading segment of
// its `id` field, per the ID grammar (IDS_AND_REFERENCES.md §1). A TYPE
// registered after this script was last touched — REQUIREMENT, ASSERTION,
// VERIFICATION, NEED, VALIDATION, RISK, METRIC, or whatever lands next —
// appears automatically; nothing here enumerates the registry.
//
// REQUIREMENT additionally gets a reviewer-authority breakdown and its
// REQ-COVERAGE-001 gap status against the ASSERTION set (CONTRACT.md §6.2,
// §8), both exactly as they stood at that ref. Every other admitted TYPE is
// listed in the generic admitted-set-by-type section.
//
// Usage:
//   node scripts/baseline-manifest.mjs <ref> [--root <adopter-repo>] [--out <file.md>]
//
// <ref> is any ref git can resolve to a commit — a tag, a branch, a SHA.
//
// Exit codes: 0 ok · 2 error (bad ref, not a git repo)

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const CANON_DIR = 'canon';
const EXCLUDED_CANON_SUBDIR = 'canon/views';

function git(gitArgs, cwd, { quiet } = {}) {
  return execFileSync('git', gitArgs, {
    encoding: 'utf8',
    cwd,
    stdio: ['ignore', 'pipe', quiet ? 'ignore' : 'pipe'],
  });
}

function argVal(args, flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}

// Recursively lists every `.yaml` file under `canon/` at `ref`, excluding
// `canon/views/` — the whole admitted-set scope, not a per-TYPE directory
// list. A newly registered TYPE, wherever the registry places its catalogue
// under `canon/`, is picked up without touching this function.
function listYamlAt(ref, cwd) {
  let out;
  try {
    out = git(['ls-tree', '-r', '--name-only', ref, '--', CANON_DIR], cwd, { quiet: true });
  } catch {
    return [];
  }
  return out
    .split('\n')
    .map(s => s.trim())
    .filter(f => f.endsWith('.yaml'))
    .filter(f => f !== EXCLUDED_CANON_SUBDIR && !f.startsWith(`${EXCLUDED_CANON_SUBDIR}/`));
}

// Targeted field extraction over flat top-level YAML scalars — the same
// convention scripts/adl-harvest.mjs uses for front-matter, applied here to
// whole-file YAML (canon elements carry no front-matter fence). Not a
// general YAML parser: sufficient for the scalar fields this script reads,
// and adds no new dependency to the root scripts/ toolchain.
function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n#]*?)"?\\s*(?:#.*)?$`, 'm'));
  return m ? m[1].trim() : undefined;
}

// TYPE is the ID's leading segment — uppercase letters/digits/underscore, up
// to (not including) the first hyphen — IDS_AND_REFERENCES.md §1. TYPE names
// never contain a hyphen (multi-word TYPEs use underscore instead), so the
// first hyphen always bounds it correctly, including on capability-style
// addresses (`CAPABILITY-V1.2` → `CAPABILITY`).
export function deriveType(id) {
  const m = id.match(/^([A-Z][A-Z0-9_]*)-/);
  return m ? m[1] : undefined;
}

function loadAt(ref, cwd) {
  const out = [];
  for (const path of listYamlAt(ref, cwd)) {
    // `<rev>:<path>` resolves relative to the repo top; the `./` form makes it
    // relative to cwd instead — needed since `path` came from `ls-tree` run
    // with cwd = the adopter root, which may be a subdirectory of this repo
    // (as with the notations/examples/ worked examples).
    const text = git(['show', `${ref}:./${path}`], cwd);
    const id = field(text, 'id');
    if (!id) continue;
    const type = deriveType(id);
    if (!type) continue;
    out.push({
      id,
      type,
      path,
      // CONTRACT.md §6.1 — absent admission_state means active (back-compat).
      admission_state: field(text, 'admission_state') || 'active',
      // CONTRACT.md §6.2 — absent reviewer_authority means expert_confirmed (back-compat).
      reviewer_authority: field(text, 'reviewer_authority') || 'expert_confirmed',
      about: field(text, 'about'), // ASSERTION only
    });
  }
  return out;
}

// Pure — groups already-loaded elements by TYPE. Exported so the fixture
// tests can exercise the grouping/report logic without shelling out to git.
export function groupByType(elements) {
  const byType = new Map();
  for (const el of elements) {
    if (!byType.has(el.type)) byType.set(el.type, []);
    byType.get(el.type).push(el);
  }
  return byType;
}

// Pure — renders the manifest body from a flat list of loaded elements
// (admission-state filtering happens here, same as loadAt's caller used to
// do inline). Exported for the same reason as groupByType.
export function render(ref, elements) {
  const active = elements.filter(e => e.admission_state === 'active');
  const byType = groupByType(active);

  const requirements = byType.get('REQUIREMENT') || [];
  const assertions = byType.get('ASSERTION') || [];
  const assertedAbout = new Set(assertions.map(a => a.about).filter(Boolean));
  const tiers = { expert_confirmed: [], ai_reviewed: [] };
  for (const r of requirements) (tiers[r.reviewer_authority] ??= []).push(r);

  const lines = [];
  lines.push(`# Canon baseline manifest — ${ref}`);
  lines.push('');
  lines.push(
    '> Derived by `scripts/baseline-manifest.mjs`, read-only from git history via ' +
    '`git show` — the working tree was never checked out. Scope is every admitted ' +
    '`id:` found under `canon/` (excluding `canon/views/`), not a fixed TYPE list — ' +
    'regenerate against a different ref for a different baseline.'
  );
  lines.push('');
  lines.push(
    `${active.length} admitted element(s) across ${byType.size} TYPE(s) at this baseline.`
  );
  lines.push('');
  lines.push('## Requirements by reviewer authority');
  lines.push('');
  for (const tier of ['expert_confirmed', 'ai_reviewed']) {
    const rows = (tiers[tier] || []).slice().sort((a, b) => a.id.localeCompare(b.id));
    lines.push(`### ${tier} (${rows.length})`);
    lines.push('');
    if (rows.length === 0) {
      lines.push('_none_');
    } else {
      lines.push('| Requirement | REQ-COVERAGE-001 |');
      lines.push('|---|---|');
      for (const r of rows) {
        const gap = assertedAbout.has(r.id) ? 'covered' : '**gap — no ASSERTION**';
        lines.push(`| \`${r.id}\` | ${gap} |`);
      }
    }
    lines.push('');
  }

  const gapCount = requirements.filter(r => !assertedAbout.has(r.id)).length;
  lines.push('---');
  lines.push('');
  lines.push(
    gapCount
      ? `**${gapCount} REQ-COVERAGE-001 gap(s)** at this baseline.`
      : '**No REQ-COVERAGE-001 gaps** at this baseline.'
  );
  lines.push('');

  lines.push('## Admitted set by type');
  lines.push('');
  const typesSorted = [...byType.keys()].sort();
  if (typesSorted.length === 0) {
    lines.push('_none_');
    lines.push('');
  } else {
    lines.push('| TYPE | Count | expert_confirmed | ai_reviewed |');
    lines.push('|---|---|---|---|');
    for (const type of typesSorted) {
      const rows = byType.get(type);
      const expert = rows.filter(r => r.reviewer_authority === 'expert_confirmed').length;
      const ai = rows.filter(r => r.reviewer_authority === 'ai_reviewed').length;
      lines.push(`| \`${type}\` | ${rows.length} | ${expert} | ${ai} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const ref = args.find(a => !a.startsWith('--'));
  if (!ref) {
    console.error('usage: baseline-manifest.mjs <ref> [--root <adopter-repo>] [--out <file.md>]');
    process.exit(2);
  }
  const root = resolve(argVal(args, '--root', '.'));
  const out = argVal(args, '--out', null);

  try {
    git(['rev-parse', '--verify', `${ref}^{commit}`], root, { quiet: true });
  } catch {
    console.error(`error: ref does not resolve to a commit in ${root}: ${ref}`);
    process.exit(2);
  }

  const elements = loadAt(ref, root);

  const text = render(ref, elements);
  if (out) {
    writeFileSync(resolve(out), text, 'utf8');
    console.error(`written: ${out}`);
  } else {
    process.stdout.write(text);
  }
}

// Guard so `import { render, groupByType, deriveType } from
// './baseline-manifest.mjs'` (the fixture tests in
// baseline-manifest.test.mjs) doesn't also run the CLI.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
