#!/usr/bin/env node
// Migration validator — methodology 0.4 → 0.5.
//
// CHECKS (each entry runs independently; failures are aggregated):
//
//   1. codex applies_to retirement
//      No .yaml under <target>/codex/** may still carry an applies_to: field.
//
//   2. lifecycle backfill
//      Every .yaml under <target>/canon/elements/** must carry both
//      valid_from: and valid_to: keys.
//
//   3. capability ID canonical form
//      No .yaml under <target>/canon/views/** (whose notation: is one of
//      capability-map / process-map / products / applications / scenarios)
//      may carry bare V/H capability IDs, CM- document IDs, or bare
//      V/H entries inside a capabilities[] cross-reference.
//
//   4. goal parent first-class form
//      No .yaml under <target>/canon/views/** (whose notation: is goals)
//      may carry an inline `parent: GOAL-…` line inside its goals[] block.
//      The canonical home is a `REL-…` file with `type: goal_parent`
//      under canon/relations/.
//
// Run AFTER the codemod. Exits 0 if clean, 1 if any check fails,
// 2 on script-internal error.
//
// Usage: node validate.mjs [target-dir]
//   Default target-dir = current working directory

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const target = resolve(process.argv[2] ?? process.cwd());

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

const CAPABILITY_NOTATIONS = new Set([
  'capability-map',
  'process-map',
  'products',
  'applications',
  'scenarios',
]);

const checks = [
  {
    name: 'codex applies_to retirement',
    rootName: 'codex',
    fn: (text) => /^\s*applies_to\s*:/m.test(text) ? 'still carries applies_to' : null,
  },
  {
    name: 'lifecycle backfill',
    rootName: 'canon/elements',
    fn: (text) => {
      const hasFrom = /^\s*valid_from\s*:/m.test(text);
      const hasTo = /^\s*valid_to\s*:/m.test(text);
      if (!hasFrom && !hasTo) return 'missing valid_from and valid_to';
      if (!hasFrom) return 'missing valid_from';
      if (!hasTo) return 'missing valid_to';
      return null;
    },
  },
  {
    name: 'capability ID canonical form',
    rootName: 'canon/views',
    fn: (text) => {
      // Per-file gate — only inspect view documents that reference capabilities.
      const nm = text.match(/^notation\s*:\s*(\S+)/m);
      if (!nm || !CAPABILITY_NOTATIONS.has(nm[1])) return null;

      // Single-value bare V/H in id: position.
      if (/^\s*-?\s*id\s*:\s*["']?[VH]\d+(?:\.\d+)*["']?\s*(?:#.*)?$/m.test(text)) {
        return 'has bare V/H capability id (should be CAPABILITY-V/H)';
      }
      // Single-value bare V/H in capability: position.
      if (/^\s*capability\s*:\s*["']?[VH]\d+(?:\.\d+)*["']?\s*(?:#.*)?$/m.test(text)) {
        return 'has bare V/H capability cross-reference';
      }
      // CM- document id.
      if (/^\s*-?\s*id\s*:\s*["']?CM-/m.test(text)) {
        return 'has CM- document id (should be CAPABILITY_MAP-)';
      }
      // Inline-array form: capabilities: [V1, V2]. Parse the line to test each
      // item — a naive `\b[VH]\d` regex false-positives on `CAPABILITY-V1`
      // because `-` is a word boundary.
      const inlineArr = text.match(/^\s*capabilities\s*:\s*\[([^\]]*)\]/m);
      if (inlineArr) {
        const items = inlineArr[1].split(',').map((s) => s.trim()).filter(Boolean);
        if (items.some((it) => /^["']?[VH]\d+(?:\.\d+)*["']?$/.test(it))) {
          return 'has bare V/H in capabilities inline array';
        }
      }
      // Block-form: scan for `- V1` style entries under a capabilities: parent.
      const lines = text.split('\n');
      let inCap = null;
      for (const line of lines) {
        const indent = line.match(/^(\s*)/)[1].length;
        if (inCap !== null && line.trim() !== '' && indent <= inCap) inCap = null;
        if (inCap !== null && /^\s*-\s*["']?[VH]\d+(?:\.\d+)*["']?\s*(?:#.*)?$/.test(line)) {
          return 'has bare V/H in capabilities block array';
        }
        const h = line.match(/^(\s*)capabilities\s*:\s*(?:#.*)?$/);
        if (h) inCap = h[1].length;
      }
      return null;
    },
  },
  {
    name: 'goal parent first-class form',
    rootName: 'canon/views',
    fn: (text) => {
      const nm = text.match(/^notation\s*:\s*(\S+)/m);
      if (!nm || nm[1] !== 'goals') return null;
      const lines = text.split('\n');
      let inGoals = null;
      for (const line of lines) {
        const trimmed = line.trim();
        const indent = line.match(/^(\s*)/)[1].length;
        if (inGoals !== null && trimmed !== '' && indent <= inGoals) inGoals = null;
        if (inGoals !== null && /^\s*parent\s*:\s*["']?GOAL-\S+/.test(line)) {
          return 'has inline parent: GOAL-… on goal entry (use REL goal_parent instead)';
        }
        const h = line.match(/^(\s*)goals\s*:\s*(?:#.*)?$/);
        if (h) inGoals = h[1].length;
      }
      return null;
    },
  },
];

let totalChecked = 0;
let totalOffenders = 0;

for (const c of checks) {
  const root = join(target, c.rootName);
  console.log(`Check: ${c.name}`);

  if (!existsSync(root)) {
    console.log(`  ${c.rootName}/ not present under target — skipping.`);
    console.log('');
    continue;
  }

  const files = walkYaml(root);
  console.log(`  scanning ${files.length} .yaml file(s) under ${c.rootName}/`);

  let offenders = 0;

  for (const file of files) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`  ! ${relative(target, file)}: read failed (${e.message})`);
      offenders++;
      continue;
    }

    const issue = c.fn(content);
    if (issue) {
      console.error(`  ✗ ${relative(target, file)}: ${issue}`);
      offenders++;
    }
  }

  if (offenders === 0) {
    console.log(`  ✓ all ${files.length} file(s) OK`);
  } else {
    console.error(`  ✗ ${offenders} file(s) failed this check`);
  }
  console.log('');

  totalChecked += files.length;
  totalOffenders += offenders;
}

console.log(`Summary across ${checks.length} check(s):`);
console.log(`  files checked     ${totalChecked}`);
console.log(`  offenders         ${totalOffenders}`);

if (totalOffenders > 0) {
  console.error(``);
  console.error(`FAIL: ${totalOffenders} file(s) failed validation. Re-run the codemod, review any '! ... bailed' messages, then re-validate.`);
  process.exit(1);
}
console.log(`OK: all checks passed.`);
process.exit(0);
