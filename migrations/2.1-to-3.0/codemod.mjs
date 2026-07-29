#!/usr/bin/env node
// Migration codemod — methodology 2.1 → 3.0.
//
// TRIGGER: the ISO 14971 risk-management chain (HAZARD, RISK_CONTROL, the
// design-controls trace-matrix view) is removed from the public core in 3.0.
// Core tooling no longer knows these TYPEs, so an unmigrated repo fails
// referential-integrity checks with an obscure error rather than a clear one
// (see notations/CONTRACT.md §10.4, PACKAGES.md §5). This codemod finds the
// affected content and gets it out of `canon/` so the repo validates again.
//
// This is NOT a schema transform — nothing is renamed or reshaped. `VERIFICATION`
// is unaffected and this codemod never touches it. The affected content is
// quarantined, never deleted: it is moved, byte-for-byte, to
// `_archived/design-controls-3.0-migration/<original path>` at the repo root,
// preserving the relative path it had under `canon/`. What the adopter does with
// it next (drop it, keep it as a historical record, feed it into whatever tool
// now owns their design-controls process) is their call, not this script's.
//
// Conventions:
//   - Pure Node, no native deps; Node >= 20.
//   - Idempotent: a file already under `_archived/design-controls-3.0-migration/`
//     is not moved again; re-running after a clean migration is a no-op.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync,
  existsSync, unlinkSync,
} from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

const ARCHIVE_ROOT = join(target, '_archived', 'design-controls-3.0-migration');

// ── File discovery ──────────────────────────────────────────────────────────

function walkFiles(dir, pred, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    if (ent === '.git' || ent === 'node_modules' || ent === '.archive' || ent === '_archived') continue;
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkFiles(full, pred, out);
    else if (pred(ent, full)) out.push(full);
  }
  return out;
}

function isAffected(name, full) {
  const rel = '/' + relative(target, full).split('\\').join('/');
  if (rel.includes('/canon/elements/01_motivation/hazards/') && name.endsWith('.yaml')) return true;
  if (rel.includes('/canon/elements/01_motivation/risk-controls/') && name.endsWith('.yaml')) return true;
  if (name.endsWith('.design-controls-trace-matrix.transitrix.yaml')) return true;
  return false;
}

const affected = walkFiles(target, isAffected);

if (affected.length === 0) {
  console.log('No HAZARD, RISK_CONTROL, or design-controls-trace-matrix files found. Nothing to do.');
  process.exit(0);
}

console.log(`${dryRun ? '[dry-run] ' : ''}Migrating ${affected.length} file(s) to ${relative(target, ARCHIVE_ROOT)}/\n`);

let moved = 0;
let skipped = 0;

for (const src of affected) {
  const relPath = relative(target, src);
  const dest = join(ARCHIVE_ROOT, relPath);

  if (existsSync(dest)) {
    console.log(`  SKIP    ${relPath} (already archived)`);
    skipped++;
    continue;
  }

  console.log(`  MOVE    ${relPath} -> ${relative(target, dest)}`);
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(src));
    unlinkSync(src);
  }
  moved++;
}

console.log(`\n${dryRun ? '[dry-run] would move' : 'Moved'} ${moved} file(s); ${skipped} already archived.`);
if (!dryRun && moved > 0) {
  console.log('Empty hazards/ risk-controls/ directories and any now-empty view folders are left in place — remove them by hand if you want a tidy tree; git does not track empty directories either way.');
}
process.exit(0);
