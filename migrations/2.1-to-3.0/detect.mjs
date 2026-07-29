#!/usr/bin/env node
// Migration detector — methodology 2.1 → 3.0.
//
// 3.0 removes HAZARD, RISK_CONTROL and the design-controls trace-matrix view from
// the core vocabulary. Core tooling has no message for a TYPE it does not know
// (notations/PACKAGES.md §5), so a repository upgraded with that content still in
// place fails later with an obscure referential-integrity error instead of a
// sentence anyone can act on. This detector is that sentence.
//
// Read-only. It never edits, moves or deletes anything — the decision about what
// happens to the content it finds belongs to the adopter (see README.md step 2).
//
// Usage:
//   node migrations/2.1-to-3.0/detect.mjs <adopter-root>
//
// Exit 0 — nothing to migrate.
// Exit 1 — removed vocabulary found; the file list is printed.
// Exit 2 — bad usage or unreadable root.

import { readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const REMOVED_DIRS = [
  { path: ['canon', 'elements', '01_motivation', 'hazards'], type: 'HAZARD' },
  { path: ['canon', 'elements', '01_motivation', 'risk-controls'], type: 'RISK_CONTROL' },
];
const REMOVED_VIEW_SUFFIX = '.design-controls-trace-matrix.transitrix.yaml';
const SKIP_DIRS = new Set(['.git', 'node_modules', '0. archive']);

async function listYaml(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter(e => e.isFile() && (e.name.endsWith('.yaml') || e.name.endsWith('.yml')))
    .map(e => join(dir, e.name));
}

async function walkForViews(dir, out) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walkForViews(join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith(REMOVED_VIEW_SUFFIX)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

async function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('usage: node migrations/2.1-to-3.0/detect.mjs <adopter-root>');
    return 2;
  }
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`cannot read <adopter-root>: ${root}`);
    return 2;
  }

  const findings = [];
  for (const { path, type } of REMOVED_DIRS) {
    for (const file of await listYaml(join(root, ...path))) {
      findings.push({ type, file });
    }
  }
  for (const file of await walkForViews(root, [])) {
    findings.push({ type: 'design-controls trace-matrix view-config', file });
  }

  if (findings.length === 0) {
    console.log('nothing to migrate — no removed vocabulary found. Bump methodology_version to 3.0.0.');
    return 0;
  }

  const byType = new Map();
  for (const f of findings) {
    if (!byType.has(f.type)) byType.set(f.type, []);
    byType.get(f.type).push(relative(root, f.file).split(sep).join('/'));
  }

  console.log(`Found ${findings.length} artefact(s) whose TYPE or view no longer exists in methodology 3.0:\n`);
  for (const [type, files] of byType) {
    console.log(`  ${type} — ${files.length} file(s)`);
    for (const f of files.sort()) console.log(`    ${f}`);
    console.log('');
  }
  console.log('These will NOT validate under 3.0, and core tooling has no message for a TYPE');
  console.log('it does not know — the error you would otherwise see is a referential-integrity');
  console.log('failure that names none of this.');
  console.log('');
  console.log('Decide what happens to them before bumping: see migrations/2.1-to-3.0/README.md');
  console.log('step 2 (retire / freeze / keep live under a package). Nothing has been changed.');
  return 1;
}

process.exit(await main());
