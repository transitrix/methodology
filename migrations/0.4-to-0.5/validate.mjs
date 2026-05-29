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
