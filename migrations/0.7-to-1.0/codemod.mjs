#!/usr/bin/env node
// Migration codemod — methodology 0.7 → 1.0.
//
// Applies four transforms to an adopter repo. Run with --dry-run first.
//
// TRANSFORMS (automated — idempotent):
//   A. ACTIVITY → ACTION rename
//      - notation: activity  → notation: action      (element files)
//      - id: ACTIVITY-…     → id: ACTION-…           (element files)
//      - ACTIVITY-*.yaml    → ACTION-*.yaml           (file rename)
//      - ACTIVITY-… values  → ACTION-… values         (cross-refs in any file)
//      - activities: (root array) → actions:
//      - activity_type:     → type:                  (in action element/view files)
//      - notation: activity-card → notation: action-card
//      - activity_card:     → action_card:
//      - *.activities.transitrix.yaml → *.action.transitrix.yaml
//      - *.activity-card.transitrix.yaml → *.action-card.transitrix.yaml
//
//   B. INFORMATION_ENTITY → BUSINESS_OBJECT rename
//      - id: INFORMATION_ENTITY-… → id: BUSINESS_OBJECT-…  (element files)
//      - INFORMATION_ENTITY-*.yaml → BUSINESS_OBJECT-*.yaml (file rename)
//      - INFORMATION_ENTITY-… values → BUSINESS_OBJECT-… values (cross-refs)
//      - information_entities: → business_objects:          (field key)
//
//   C. report_type check (NOT auto-fixed — compliance-impact files only)
//      - Detects *.compliance-impact.transitrix.yaml files missing view.report_type
//      - Prints a list; add report_type manually (product | process | combined)
//
//   D. Deprecated abbreviated prefix IDs (hard errors at 1.0)
//      - ACT-…    → ACTION-…
//      - CHG-…    → CHANGE-…
//      - FAC-…    → DRIVER-…
//      - FACTOR-… → DRIVER-… (grace period from 0.7 closes)
//      - SCEN-…   → SCENARIO-…
//      - SCN-…    → SCENARIO-…
//
// Conventions:
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: a repo already on canonical 1.0 form is a no-op.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//   - Line-based transformation — preserves comments, key order, untouched lines.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync } from 'node:fs';
import { join, relative, resolve, basename, dirname, extname } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

// ── File discovery ────────────────────────────────────────────────────────────

function walkYaml(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    if (ent.startsWith('.')) continue;
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkYaml(full, out);
    else if (st.isFile() && ent.endsWith('.yaml')) out.push(full);
  }
  return out;
}

const files = walkYaml(target);

// ── Transform helpers ─────────────────────────────────────────────────────────

// Replace top-level `notation:` field value (line-anchored).
function replaceNotation(content, oldVal, newVal) {
  const re = new RegExp(`^(notation\\s*:\\s*["']?)${escRe(oldVal)}(["']?)\\s*$`, 'mg');
  let n = 0;
  const result = content.replace(re, (_, pre, suf) => { n++; return `${pre}${newVal}${suf}`; });
  return { content: result, count: n };
}

// Replace top-level `id:` field prefix (line-anchored).
function replaceIdPrefix(content, oldPfx, newPfx) {
  const re = new RegExp(`^(id\\s*:\\s*["']?)${escRe(oldPfx)}`, 'mg');
  let n = 0;
  const result = content.replace(re, (_, pre) => { n++; return `${pre}${newPfx}`; });
  return { content: result, count: n };
}

// Replace all value-position occurrences of a TYPE prefix.
// Requires that the prefix is NOT preceded by a capital letter or underscore
// (i.e. it is the start of an ID token, not embedded in a longer TYPE like IMPACT-).
function replaceTypePrefix(content, oldPfx, newPfx) {
  if (!content.includes(oldPfx)) return { content, count: 0 };
  const re = new RegExp(`(?<![A-Z_])${escRe(oldPfx)}(?=[A-Z0-9])`, 'g');
  let n = 0;
  const result = content.replace(re, () => { n++; return newPfx; });
  return { content: result, count: n };
}

// Replace a YAML field key (line-anchored, leading whitespace preserved).
function replaceKey(content, oldKey, newKey) {
  const re = new RegExp(`^(\\s*)${escRe(oldKey)}(\\s*:)`, 'mg');
  let n = 0;
  const result = content.replace(re, (_, indent, colon) => { n++; return `${indent}${newKey}${colon}`; });
  return { content: result, count: n };
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Transform A — ACTIVITY → ACTION ──────────────────────────────────────────

function transformA(content, filename) {
  let total = 0;
  let c = content;

  // A1: notation: activity → notation: action
  { const r = replaceNotation(c, 'activity', 'action'); c = r.content; total += r.count; }
  // A2: id: ACTIVITY-… → id: ACTION-…
  { const r = replaceIdPrefix(c, 'ACTIVITY-', 'ACTION-'); c = r.content; total += r.count; }
  // A3: ACTIVITY-… cross-refs
  { const r = replaceTypePrefix(c, 'ACTIVITY-', 'ACTION-'); c = r.content; total += r.count; }
  // A4: activities: root key → actions:
  { const r = replaceKey(c, 'activities', 'actions'); c = r.content; total += r.count; }
  // A5: activity_type: → type: (only in action / element context — safe because
  //     activity_type was defined only on the ACTIVITY/ACTION element type)
  { const r = replaceKey(c, 'activity_type', 'type'); c = r.content; total += r.count; }
  // A6: notation: activity-card → notation: action-card
  { const r = replaceNotation(c, 'activity-card', 'action-card'); c = r.content; total += r.count; }
  // A7: activity_card: → action_card:
  { const r = replaceKey(c, 'activity_card', 'action_card'); c = r.content; total += r.count; }

  return { content: c, count: total };
}

function fileRenameA(filepath) {
  const bn = basename(filepath);
  const dir = dirname(filepath);
  // ACTIVITY-*.yaml → ACTION-*.yaml
  if (bn.startsWith('ACTIVITY-')) {
    return join(dir, bn.replace(/^ACTIVITY-/, 'ACTION-'));
  }
  // *.activities.transitrix.yaml → *.action.transitrix.yaml
  if (bn.endsWith('.activities.transitrix.yaml')) {
    return join(dir, bn.replace(/\.activities\.transitrix\.yaml$/, '.action.transitrix.yaml'));
  }
  // *.activity-card.transitrix.yaml → *.action-card.transitrix.yaml
  if (bn.endsWith('.activity-card.transitrix.yaml')) {
    return join(dir, bn.replace(/\.activity-card\.transitrix\.yaml$/, '.action-card.transitrix.yaml'));
  }
  return filepath;
}

// ── Transform B — INFORMATION_ENTITY → BUSINESS_OBJECT ───────────────────────

function transformB(content) {
  let total = 0;
  let c = content;

  // B1: id: INFORMATION_ENTITY-… → id: BUSINESS_OBJECT-…
  { const r = replaceIdPrefix(c, 'INFORMATION_ENTITY-', 'BUSINESS_OBJECT-'); c = r.content; total += r.count; }
  // B2: INFORMATION_ENTITY-… cross-refs
  { const r = replaceTypePrefix(c, 'INFORMATION_ENTITY-', 'BUSINESS_OBJECT-'); c = r.content; total += r.count; }
  // B3: information_entities: → business_objects:
  { const r = replaceKey(c, 'information_entities', 'business_objects'); c = r.content; total += r.count; }

  return { content: c, count: total };
}

function fileRenameB(filepath) {
  const bn = basename(filepath);
  const dir = dirname(filepath);
  if (bn.startsWith('INFORMATION_ENTITY-')) {
    return join(dir, bn.replace(/^INFORMATION_ENTITY-/, 'BUSINESS_OBJECT-'));
  }
  return filepath;
}

// ── Transform D — Deprecated abbreviated prefix IDs ───────────────────────────

function transformD(content) {
  let total = 0;
  let c = content;

  // Order matters: longer/more-specific prefixes first to avoid double-hit.
  // FACTOR- before FAC- (FAC- ⊂ FACTOR- by prefix but FACTOR has no sub-risk).
  const subs = [
    ['ACTIVITY-', 'ACTION-'],    // covered by A; included here for safety
    ['INFORMATION_ENTITY-', 'BUSINESS_OBJECT-'],  // covered by B; included for safety
    ['FACTOR-', 'DRIVER-'],
    ['ACT-', 'ACTION-'],
    ['CHG-', 'CHANGE-'],
    ['FAC-', 'DRIVER-'],
    ['SCEN-', 'SCENARIO-'],
    ['SCN-', 'SCENARIO-'],
  ];

  for (const [old, neo] of subs) {
    const r = replaceTypePrefix(c, old, neo);
    c = r.content;
    total += r.count;
  }

  return { content: c, count: total };
}

// ── Transform C — compliance-impact report_type check ────────────────────────

const ciMissing = [];

function checkC(filepath, content) {
  const bn = basename(filepath);
  if (!bn.endsWith('.compliance-impact.transitrix.yaml')) return;
  if (!/^\s*report_type\s*:/m.test(content)) {
    ciMissing.push(relative(target, filepath));
  }
}

// ── Main pass ─────────────────────────────────────────────────────────────────

const touched = [];

for (const filepath of files) {
  let content;
  try { content = readFileSync(filepath, 'utf8'); } catch { continue; }

  const original = content;

  checkC(filepath, content);

  const rA = transformA(content, filepath);
  content = rA.content;

  const rB = transformB(content);
  content = rB.content;

  const rD = transformD(content);
  content = rD.content;

  const totalCount = rA.count + rB.count + rD.count;
  const contentChanged = content !== original;

  // Determine new file path (file renames take lowest-priority rename wins;
  // A-rename has priority over B-rename since a file can only match one prefix).
  let dest = filepath;
  const destA = fileRenameA(filepath);
  const destB = fileRenameB(filepath);
  if (destA !== filepath) dest = destA;
  else if (destB !== filepath) dest = destB;

  const pathChanged = dest !== filepath;

  if (!contentChanged && !pathChanged) continue;

  const label = `${relative(target, filepath)}${pathChanged ? ` → ${relative(target, dest)}` : ''}`;
  touched.push({ label, count: totalCount });

  if (!dryRun) {
    writeFileSync(filepath, content);
    if (pathChanged) renameSync(filepath, dest);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log('=== methodology 0.7 → 1.0 codemod ===');
console.log('');

if (touched.length > 0) {
  console.log(`Transforms A/B/D — ${dryRun ? 'would change' : 'changed'} ${touched.length} file(s):`);
  touched.forEach(({ label, count }) => console.log(`  ~ ${label} (${count} substitution(s))`));
} else {
  console.log('Transforms A/B/D — no files to change (repo already on canonical form).');
}

console.log('');

if (ciMissing.length > 0) {
  console.log(`Transform C — ${ciMissing.length} compliance-impact file(s) missing \`report_type\` (manual fix required):`);
  ciMissing.forEach(f => console.log(`  ! ${f}`));
  console.log('  Add `view.report_type: product | process | combined` to each file.');
} else {
  console.log('Transform C — all compliance-impact files carry `report_type`. ✓');
}

console.log('');
console.log(`files scanned   ${files.length}`);
console.log(`files changed   ${touched.length}${dryRun ? ' (dry-run; no files written)' : ''}`);
console.log(`CI missing      ${ciMissing.length} compliance-impact file(s) need manual report_type`);
if (dryRun) console.log('(dry-run — no files written)');

process.exit(0);
