#!/usr/bin/env node
// Post-migration validator — methodology 0.7 → 1.0.
//
// Checks that the adopter repo is free of all deprecated forms that were
// accepted in pre-1.0 releases but are hard errors at 1.0.
//
// Usage:
//   node migrations/0.7-to-1.0/validate.mjs <adopter-root>
//
// Exit 0 = clean (no deprecated forms found).
// Exit 1 = one or more violations found; list printed to stdout.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';

const target = resolve(process.argv[2] ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

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
const errors = [];

function err(filepath, msg) {
  errors.push(`  ${relative(target, filepath)}: ${msg}`);
}

for (const filepath of files) {
  const bn = basename(filepath);
  let content;
  try { content = readFileSync(filepath, 'utf8'); } catch { continue; }

  // ── A: ACTIVITY → ACTION must be complete ──────────────────────────────────

  if (bn.startsWith('ACTIVITY-') && bn.endsWith('.yaml')) {
    err(filepath, 'file name still uses ACTIVITY- prefix; rename to ACTION-*.yaml');
  }
  if (bn.endsWith('.activities.transitrix.yaml')) {
    err(filepath, 'file still uses .activities.transitrix.yaml extension; rename to .action.transitrix.yaml');
  }
  if (bn.endsWith('.activity-card.transitrix.yaml')) {
    err(filepath, 'file still uses .activity-card.transitrix.yaml extension; rename to .action-card.transitrix.yaml');
  }
  if (/^notation\s*:\s*["']?activity["']?\s*$/m.test(content)) {
    err(filepath, '`notation: activity` found; update to `notation: action`');
  }
  if (/^notation\s*:\s*["']?activity-card["']?\s*$/m.test(content)) {
    err(filepath, '`notation: activity-card` found; update to `notation: action-card`');
  }
  if (/\bACTIVITY-[A-Z0-9]/g.test(content)) {
    err(filepath, 'ACTIVITY-* ID values found; replace with ACTION-*');
  }
  if (/^\s*activities\s*:/m.test(content)) {
    err(filepath, '`activities:` key found; rename to `actions:`');
  }
  if (/^\s*activity_type\s*:/m.test(content)) {
    err(filepath, '`activity_type:` key found; rename to `type:`');
  }
  if (/^\s*activity_card\s*:/m.test(content)) {
    err(filepath, '`activity_card:` key found; rename to `action_card:`');
  }

  // ── B: INFORMATION_ENTITY → BUSINESS_OBJECT must be complete ───────────────

  if (bn.startsWith('INFORMATION_ENTITY-') && bn.endsWith('.yaml')) {
    err(filepath, 'file name still uses INFORMATION_ENTITY- prefix; rename to BUSINESS_OBJECT-*.yaml');
  }
  if (/\bINFORMATION_ENTITY-[A-Z0-9]/g.test(content)) {
    err(filepath, 'INFORMATION_ENTITY-* ID values found; replace with BUSINESS_OBJECT-*');
  }
  if (/^\s*information_entities\s*:/m.test(content)) {
    err(filepath, '`information_entities:` key found; rename to `business_objects:`');
  }

  // ── C: compliance-impact must carry report_type ────────────────────────────

  if (bn.endsWith('.compliance-impact.transitrix.yaml')) {
    if (!/^\s*report_type\s*:/m.test(content)) {
      err(filepath, 'compliance-impact file missing `view.report_type` (required at 1.0); add `report_type: product | process | combined`');
    }
  }

  // ── D: Deprecated abbreviated prefix IDs must be gone ─────────────────────

  const abbrev = [
    [/\bFACTOR-[A-Z0-9]/g, 'FACTOR-* (grace period closed; replace with DRIVER-*)'],
    [/\bACT-[A-Z0-9]/g,    'ACT-* abbreviated ID (replace with ACTION-*)'],
    [/\bCHG-[A-Z0-9]/g,    'CHG-* abbreviated ID (replace with CHANGE-*)'],
    [/\bFAC-[A-Z0-9]/g,    'FAC-* abbreviated ID (replace with DRIVER-*)'],
    [/\bSCEN-[A-Z0-9]/g,   'SCEN-* abbreviated ID (replace with SCENARIO-*)'],
    [/\bSCN-[A-Z0-9]/g,    'SCN-* abbreviated ID (replace with SCENARIO-*)'],
  ];

  for (const [re, msg] of abbrev) {
    if (re.test(content)) err(filepath, msg);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (errors.length === 0) {
  console.log(`=== 0.7 → 1.0 post-migration validation: CLEAN ===`);
  console.log(`Scanned ${files.length} YAML file(s) — no deprecated forms found.`);
  process.exit(0);
} else {
  console.log(`=== 0.7 → 1.0 post-migration validation: ${errors.length} VIOLATION(S) ===`);
  console.log(`Scanned ${files.length} YAML file(s). Run codemod.mjs first, then fix the remainder manually.\n`);
  errors.forEach(e => console.log(e));
  process.exit(1);
}
