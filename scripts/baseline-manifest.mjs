#!/usr/bin/env node
// Baseline manifest — read-only, git-native.
//
// A `git tag` IS a baseline: the ref names a frozen commit,
// and this script reads the admitted REQUIREMENT / ASSERTION set exactly as
// it stood at that ref — via `git show <ref>:<path>`, never `git checkout`,
// so running it never disturbs the working tree. See patterns/baseline-audit-trail.md.
//
// Usage:
//   node scripts/baseline-manifest.mjs <ref> [--root <adopter-repo>] [--out <file.md>]
//
// <ref> is any ref git can resolve to a commit — a tag, a branch, a SHA.
// Requirements are split by `reviewer_authority` (CONTRACT.md §6.2) and each
// carries its REQ-COVERAGE-001 gap status (CONTRACT.md §8) as it stood at
// that ref — not as it stands today.
//
// Exit codes: 0 ok · 2 error (bad ref, not a git repo)

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIREMENTS_DIR = 'canon/elements/01_motivation/requirements';
const ASSERTIONS_DIR = 'canon/assertions';

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

function listYamlAt(ref, dir, cwd) {
  let out;
  try {
    out = git(['ls-tree', '-r', '--name-only', ref, '--', dir], cwd, { quiet: true });
  } catch {
    return [];
  }
  return out.split('\n').map(s => s.trim()).filter(f => f.endsWith('.yaml'));
}

// Targeted field extraction over flat top-level YAML scalars — the same
// convention scripts/adl-harvest.mjs uses for front-matter, applied here to
// whole-file YAML (REQUIREMENT / ASSERTION carry no front-matter fence).
// Not a general YAML parser: sufficient for the scalar fields this script
// reads, and adds no new dependency to the root scripts/ toolchain.
function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n#]*?)"?\\s*(?:#.*)?$`, 'm'));
  return m ? m[1].trim() : undefined;
}

function loadAt(ref, dir, cwd) {
  const out = [];
  for (const path of listYamlAt(ref, dir, cwd)) {
    // `<rev>:<path>` resolves relative to the repo top; the `./` form makes it
    // relative to cwd instead — needed since `path` came from `ls-tree` run
    // with cwd = the adopter root, which may be a subdirectory of this repo
    // (as with the notations/examples/ worked examples).
    const text = git(['show', `${ref}:./${path}`], cwd);
    const id = field(text, 'id');
    if (!id) continue;
    out.push({
      id,
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

function render(ref, requirements, assertions) {
  const assertedAbout = new Set(assertions.map(a => a.about).filter(Boolean));
  const tiers = { expert_confirmed: [], ai_reviewed: [] };
  for (const r of requirements) (tiers[r.reviewer_authority] ??= []).push(r);

  const lines = [];
  lines.push(`# Design-controls baseline manifest — ${ref}`);
  lines.push('');
  lines.push(
    '> Derived by `scripts/baseline-manifest.mjs`, read-only from git history via ' +
    '`git show` — the working tree was never checked out. Regenerate against a ' +
    'different ref for a different baseline.'
  );
  lines.push('');
  lines.push(
    `${requirements.length} admitted REQUIREMENT(s), ${assertions.length} admitted ` +
    `ASSERTION(s) at this baseline.`
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

  const requirements = loadAt(ref, REQUIREMENTS_DIR, root).filter(r => r.admission_state === 'active');
  const assertions = loadAt(ref, ASSERTIONS_DIR, root).filter(a => a.admission_state === 'active');

  const text = render(ref, requirements, assertions);
  if (out) {
    writeFileSync(resolve(out), text, 'utf8');
    console.error(`written: ${out}`);
  } else {
    process.stdout.write(text);
  }
}

main();
