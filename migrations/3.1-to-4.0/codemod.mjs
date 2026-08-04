#!/usr/bin/env node
// Migration codemod — methodology 3.1 → 4.0.
//
// Covers the FGA → DGCA notation-key retirement (CONTRACT.md §10.6; spec:
// notations/views/diagrams/03-fga.md). FGA was deprecated in 2.0.0 and is
// removed in 4.0.0.
//
//   *.fga.transitrix.yaml   → *.dgca.transitrix.yaml   (file rename)
//   notation: fga           → notation: dgca            (field rewrite)
//   (no view_config)        → view_config.layers.changes: off  (block insert)
//
// The field schema is otherwise unchanged — factors[]/goals[]/actions[] carry
// over as-is; FGA had no changes[] layer, which is exactly what
// view_config.layers.changes: off produces in DGCA (DGA mode).
//
// Conventions (canonical for every migration recipe):
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: a repo already on 4.0 form (no *.fga.transitrix.yaml) is a no-op.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//   - Diff-style summary of changes. Exit 0 on clean run.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync } from 'node:fs';
import { join, relative, resolve, basename, dirname } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

function walkFga(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkFga(full, out);
    else if (st.isFile() && ent.endsWith('.fga.transitrix.yaml')) out.push(full);
  }
  return out;
}

// Rewrites notation: fga → dgca and inserts view_config.layers.changes: off
// directly after the header block (after generated_at:, or after
// methodology_version: if generated_at is absent).
function rewriteFgaDocument(content) {
  let n = 0;
  let result = content.replace(/^(notation\s*:\s*)fga\b/m, (_, pre) => { n++; return `${pre}dgca`; });

  if (/^view_config\s*:/m.test(result)) return { content: result, modified: n };

  const block = '\nview_config:\n  layers:\n    changes: off\n';
  const anchor = result.match(/^generated_at\s*:.*\n/m) ?? result.match(/^methodology_version\s*:.*\n/m);
  if (anchor) {
    const cut = anchor.index + anchor[0].length;
    const rest = result.slice(cut).replace(/^\n+/, '\n');
    result = result.slice(0, cut) + block + rest;
  } else {
    result = `${block.slice(1)}\n${result}`;
  }
  n++;
  return { content: result, modified: n };
}

const files = walkFga(target);
let totalModified = 0;
const touched = [];

for (const f of files) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }

  const r = rewriteFgaDocument(content);
  if (r.modified === 0) continue;

  const dest = join(dirname(f), basename(f).replace(/\.fga\.transitrix\.yaml$/, '.dgca.transitrix.yaml'));
  touched.push(`${relative(target, f)} → ${relative(target, dest)}`);
  totalModified += r.modified;

  if (!dryRun) {
    writeFileSync(f, r.content);
    renameSync(f, dest);
  }
}

console.log('Transform — notation: fga → dgca; insert view_config.layers.changes: off; file rename');
touched.forEach(x => console.log(`  ~ ${x}`));
console.log('');
console.log('Summary:');
console.log(`  files scanned   ${files.length}`);
console.log(`  files changed   ${touched.length}${dryRun ? ' (dry-run; no files written)' : ''}`);
process.exit(0);
