#!/usr/bin/env node
// Migration codemod — methodology 3.1 → 4.0.
//
// Transform A — FGA → DGCA notation-key retirement (CONTRACT.md §10.6; spec:
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
// Transform B — recipe-file header rename (recipe-naming decision, 2026-08-23).
//
//   template_id: <id>        → recipe_id: <id>         (header field rewrite)
//   template_version: <ver>  → recipe_version: <ver>   (header field rewrite)
//
// Applies to any *.ttrs file's front matter. No other field and no part of the
// document body changes.
//
// Conventions (canonical for every migration recipe):
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: a repo already on 4.0 form (no *.fga.transitrix.yaml, no
//     template_id/template_version header field) is a no-op.
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

function walkTtrs(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkTtrs(full, out);
    else if (st.isFile() && ent.endsWith('.ttrs')) out.push(full);
  }
  return out;
}

// Rewrites the two header fields inside the front-matter block only (between
// the opening and first closing `---`) — a body transclusion tag never
// contains a bare `template_id:`/`template_version:` line, but scoping to the
// header avoids relying on that.
function rewriteTtrsHeader(content) {
  const end = content.indexOf('\n---', content.indexOf('---') + 3);
  if (end === -1) return { content, modified: 0 };
  const headerEnd = end + 4;
  let n = 0;
  const header = content
    .slice(0, headerEnd)
    .replace(/^(template_id\s*:)/m, (_, pre) => { n++; return pre.replace('template_id', 'recipe_id'); })
    .replace(/^(template_version\s*:)/m, (_, pre) => { n++; return pre.replace('template_version', 'recipe_version'); });
  return { content: header + content.slice(headerEnd), modified: n };
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

const fgaFiles = walkFga(target);
const fgaTouched = [];

for (const f of fgaFiles) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }

  const r = rewriteFgaDocument(content);
  if (r.modified === 0) continue;

  const dest = join(dirname(f), basename(f).replace(/\.fga\.transitrix\.yaml$/, '.dgca.transitrix.yaml'));
  fgaTouched.push(`${relative(target, f)} → ${relative(target, dest)}`);

  if (!dryRun) {
    writeFileSync(f, r.content);
    renameSync(f, dest);
  }
}

const ttrsFiles = walkTtrs(target);
const ttrsTouched = [];

for (const f of ttrsFiles) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }

  const r = rewriteTtrsHeader(content);
  if (r.modified === 0) continue;

  ttrsTouched.push(relative(target, f));
  if (!dryRun) writeFileSync(f, r.content);
}

console.log('Transform A — notation: fga → dgca; insert view_config.layers.changes: off; file rename');
fgaTouched.forEach(x => console.log(`  ~ ${x}`));
console.log('');
console.log('Transform B — template_id/template_version → recipe_id/recipe_version');
ttrsTouched.forEach(x => console.log(`  ~ ${x}`));
console.log('');
console.log('Summary:');
console.log(`  fga files scanned    ${fgaFiles.length}`);
console.log(`  fga files changed    ${fgaTouched.length}${dryRun ? ' (dry-run; no files written)' : ''}`);
console.log(`  ttrs files scanned   ${ttrsFiles.length}`);
console.log(`  ttrs files changed   ${ttrsTouched.length}${dryRun ? ' (dry-run; no files written)' : ''}`);
process.exit(0);
