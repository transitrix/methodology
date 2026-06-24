#!/usr/bin/env node
// Post-migration validation — methodology 0.6 → 0.7 (DRIVER rename).
//
// Asserts that no element files carry the retired FACTOR TYPE:
//   - no file with notation: factor
//   - no file with id: FACTOR-… (in element position)
//
// Cross-references that still use FACTOR-… IDs in value positions are NOT
// treated as errors — legacy FACTOR-… IDs are accepted by validators until
// the 1.0 cut (producing a DRIVER-TYPE-LEGACY-001 warning, not a failure).
// They are reported as informational notices.
//
// Exit 0 = element files clean (migration complete for required steps);
// Exit 1 = FACTOR element residue found (run codemod again).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const target = resolve(process.argv.slice(2).find(a => !a.startsWith('--')) ?? process.cwd());
if (!existsSync(target)) { console.error(`error: no such dir: ${target}`); process.exit(2); }

function walk(dir, out = []) {
  let ents; try { ents = readdirSync(dir); } catch { return out; }
  for (const e of ents) {
    const f = join(dir, e);
    let st; try { st = statSync(f); } catch { continue; }
    if (st.isDirectory()) walk(f, out);
    else if (st.isFile() && e.endsWith('.yaml')) out.push(f);
  }
  return out;
}

const problems = [];
const legacyRefs = [];

for (const f of walk(target)) {
  const c = readFileSync(f, 'utf8');
  const rel = relative(target, f);

  const hasFactorNotation = /^notation\s*:\s*factor\b/m.test(c);
  const hasFactorId = /^id\s*:\s*["']?FACTOR-/m.test(c);

  if (hasFactorNotation)
    problems.push(`${rel}: notation: factor — run codemod to migrate to notation: driver`);
  if (hasFactorId)
    problems.push(`${rel}: id: FACTOR-… — run codemod to rename to DRIVER-…`);

  if (!hasFactorNotation && !hasFactorId && c.includes('FACTOR-'))
    legacyRefs.push(rel);
}

if (problems.length) {
  console.error(`FAIL — ${problems.length} FACTOR element residue(s):`);
  problems.forEach(p => console.error(`  ✗ ${p}`));
  if (legacyRefs.length) {
    console.error('');
    console.error(`Note — ${legacyRefs.length} file(s) still have FACTOR-… cross-references (valid until 1.0 cut; produces DRIVER-TYPE-LEGACY-001 warning):`);
    legacyRefs.forEach(r => console.error(`  ⚠ ${r}`));
  }
  process.exit(1);
}

if (legacyRefs.length) {
  console.log('PASS — no FACTOR element files remain.');
  console.log(`Note — ${legacyRefs.length} file(s) still have FACTOR-… cross-references (valid until 1.0 cut):`);
  legacyRefs.forEach(r => console.log(`  ⚠ ${r}`));
} else {
  console.log('PASS — no FACTOR residue; repo is fully on 0.7 form.');
}
process.exit(0);
