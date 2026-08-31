#!/usr/bin/env node
// Migration codemod — methodology 4.2 → 5.0.
//
// Neither breaking change in this release touches file shape:
//
//   - ReqIF package lifecycle retirement (CONTRACT.md §10.6; spec:
//     notations/packages/reqif.md §2.9, §10). The `transition`, `revise`,
//     `history`, `suspect` commands and validation rules REQIF-008/REQIF-009
//     are removed from `@transitrix/reqif-cli`. `spec-object.workflow_state`,
//     `.revision`, `.revisions`, and `spec-relation.recorded_target_revision`
//     are unaffected — they round-trip as inert foreign metadata exactly as
//     before. Nothing in `reqif/` needs rewriting.
//   - `FGCA-008..014` rule-code retirement (notations/vocabulary.yaml
//     `deprecated_rule_codes`). These are validator-output codes, never
//     authored fields in a DGCA document — no file carries them to rewrite.
//
// What actually breaks on upgrade is an adopter's own automation invoking one
// of the four removed commands (CI config, npm scripts, shell wrappers) — a
// generic line-based rewrite across arbitrary script/CI syntax has no safe,
// universal form, so this codemod does not attempt one. It only scans and
// reports; the fix is a manual one-line removal per occurrence (see README).
//
// Conventions (canonical for every migration recipe, CONTRACT.md §10.4):
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: scanning is read-only, so re-running is always a no-op on
//     disk; the finding itself only disappears once you've edited the file.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//     --dry-run has no distinct effect here (the codemod never writes) but is
//     accepted for interface consistency with every other recipe.
//   - Exit 0 — no occurrences found (nothing to migrate).
//   - Exit 1 — occurrences found (unsafe ambiguity; manual intervention).
//   - Exit 2 — script-internal error (missing target directory).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REMOVED_COMMANDS = ['transition', 'revise', 'history', 'suspect'];
const SKIP_DIRS = new Set(['.git', 'node_modules']);

const args = process.argv.slice(2);
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent)) continue;
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile()) out.push(full);
  }
  return out;
}

function findOccurrences(content) {
  const hits = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/transitrix-reqif\s+(transition|revise|history|suspect)\b/);
    if (m && REMOVED_COMMANDS.includes(m[1])) hits.push({ line: i + 1, command: m[1], text: lines[i].trim() });
  }
  return hits;
}

const files = walk(target);
const findings = [];

for (const f of files) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; } // skip unreadable/binary files
  const hits = findOccurrences(content);
  for (const h of hits) findings.push({ file: relative(target, f), ...h });
}

if (findings.length === 0) {
  console.log('No references to the removed transitrix-reqif commands (transition, revise, history, suspect) found.');
  console.log('');
  console.log('Summary:');
  console.log(`  files scanned    ${files.length}`);
  console.log('  occurrences      0');
  console.log('  nothing to migrate — see README.md for the (data-shape-free) breaking changes in this release.');
  process.exit(0);
}

console.log(`Found ${findings.length} reference(s) to a removed transitrix-reqif command:`);
for (const f of findings) {
  console.log(`  ${f.file}:${f.line}  [${f.command}]  ${f.text}`);
}
console.log('');
console.log('Summary:');
console.log(`  files scanned    ${files.length}`);
console.log(`  occurrences      ${findings.length}`);
console.log('');
console.log('No automated rewrite is offered for these — remove or replace each line by hand (README.md § Manual steps),');
console.log('then re-run validate.mjs to confirm.');
process.exit(1);
