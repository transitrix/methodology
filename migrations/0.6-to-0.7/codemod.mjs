#!/usr/bin/env node
// Migration codemod — methodology 0.6 → 0.7.
//
// Covers the DRIVER terminology alignment: the FACTOR element TYPE is renamed
// to DRIVER to match ArchiMate 3.2 motivation-layer terminology.
//
//   notation: factor   → notation: driver        (in element files)
//   id: FACTOR-…       → id: DRIVER-…            (in element files)
//   FACTOR-*.yaml      → DRIVER-*.yaml            (file rename)
//   FACTOR-… values    → DRIVER-… values          (cross-refs in any file)
//
// YAML structural keys (factors:, goal.factors) are intentionally NOT renamed —
// the migration is gradual; existing view files stay valid without edits.
// Legacy FACTOR-… IDs remain accepted by validators until the 1.0 cut.
//
// TRANSFORMS:
//   A. Element rewrite: files with notation: factor or id: FACTOR-… get those
//      fields rewritten in-place; FACTOR-*.yaml files are renamed to DRIVER-*.yaml.
//   B. Cross-reference substitution: any remaining FACTOR-… in YAML value positions
//      across all files is replaced with DRIVER-…. The factors: key is lowercase
//      and is unaffected (case-sensitive search).
//
// Conventions (canonical for every migration recipe):
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: a repo already on 0.7 form is a no-op.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//   - Diff-style summary of changes. Exit 0 on clean run.
//
// Line-based transformation (not js-yaml roundtrip) preserves comments, key
// order, and formatting on untouched lines.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync } from 'node:fs';
import { join, relative, resolve, basename, dirname } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

function walkYaml(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkYaml(full, out);
    else if (st.isFile() && ent.endsWith('.yaml')) out.push(full);
  }
  return out;
}

// Transform A: rewrite notation: factor → driver and id: FACTOR-… → DRIVER-…
// Matches only top-level notation and id fields (line anchored with ^).
function rewriteFactorElement(content) {
  const isFactorElement =
    /^notation\s*:\s*factor\b/m.test(content) ||
    /^id\s*:\s*["']?FACTOR-/m.test(content);
  if (!isFactorElement) return { content, modified: 0 };
  let n = 0;
  const result = content
    .replace(/^(notation\s*:\s*)factor\b/m, (_, pre) => { n++; return `${pre}driver`; })
    .replace(/^(id\s*:\s*["']?)FACTOR-/m, (_, pre) => { n++; return `${pre}DRIVER-`; });
  return { content: result, modified: n };
}

// Transform B: replace FACTOR-… IDs in value positions.
// The factors: key is lowercase — no collision with FACTOR- (uppercase).
function substituteFactorRefs(content) {
  if (!content.includes('FACTOR-')) return { content, modified: 0 };
  let n = 0;
  const result = content.replace(/FACTOR-/g, () => { n++; return 'DRIVER-'; });
  return { content: result, modified: n };
}

const files = walkYaml(target);
let totalModifiedA = 0, totalModifiedB = 0;
const touched = [];

for (const f of files) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }

  let changed = false;
  let countA = 0, countB = 0;

  const rA = rewriteFactorElement(content);
  if (rA.modified > 0) {
    content = rA.content;
    countA = rA.modified;
    changed = true;
    totalModifiedA += rA.modified;
  }

  const rB = substituteFactorRefs(content);
  if (rB.modified > 0) {
    content = rB.content;
    countB = rB.modified;
    changed = true;
    totalModifiedB += rB.modified;
  }

  if (!changed) continue;

  let dest = f;
  const bn = basename(f);
  if (bn.startsWith('FACTOR-')) {
    dest = join(dirname(f), bn.replace(/^FACTOR-/, 'DRIVER-'));
  }

  const label = `${relative(target, f)}${dest !== f ? ` → ${relative(target, dest)}` : ''}`;
  const counts = [countA > 0 ? `A:${countA}` : '', countB > 0 ? `B:${countB}` : ''].filter(Boolean).join(' ');
  touched.push(`${label} (${counts})`);

  if (!dryRun) {
    writeFileSync(f, content);
    if (dest !== f) renameSync(f, dest);
  }
}

console.log('Transform A — notation: factor → driver; id: FACTOR-… → DRIVER-…; file rename');
console.log('Transform B — FACTOR-… → DRIVER-… cross-reference values');
touched.forEach(x => console.log(`  ~ ${x}`));
console.log(`  → A: ${totalModifiedA} field(s), B: ${totalModifiedB} ref(s)${dryRun ? ' (dry-run; no files written)' : ''}`);
console.log('');
console.log('Summary:');
console.log(`  files scanned   ${files.length}`);
console.log(`  files changed   ${touched.length}${dryRun ? ' (dry-run)' : ''}`);
process.exit(0);
