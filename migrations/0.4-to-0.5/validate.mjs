#!/usr/bin/env node
// Migration validator — methodology 0.4 → 0.5.
//
// CURRENT CHECK: assert no codex artefact under <target>/codex/**/*.yaml
// still carries an applies_to: field. The codemod (codemod.mjs) is
// responsible for the removal; this script confirms the result.
//
// Run AFTER the codemod. Exits 0 if clean, 1 if any residue, 2 on
// script-internal error.
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

const codexRoot = join(target, 'codex');
if (!existsSync(codexRoot)) {
  console.log(`No codex/ directory under ${target} — nothing to validate.`);
  process.exit(0);
}

const files = walkYaml(codexRoot);
if (files.length === 0) {
  console.log(`No .yaml files under ${codexRoot} — nothing to validate.`);
  process.exit(0);
}

let offenders = 0;
for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`! ${relative(target, file)}: read failed (${e.message})`);
    offenders++;
    continue;
  }

  if (/^\s*applies_to\s*:/m.test(content)) {
    console.error(`✗ ${relative(target, file)}: still carries applies_to`);
    offenders++;
  }
}

console.log(``);
if (offenders > 0) {
  console.error(`FAIL: ${offenders} codex file${offenders === 1 ? '' : 's'} still carry applies_to. Re-run the codemod, then re-validate.`);
  process.exit(1);
}
console.log(`OK: ${files.length} codex file${files.length === 1 ? '' : 's'} validated; no applies_to present.`);
process.exit(0);
