#!/usr/bin/env node
// Post-migration validation — methodology 0.5 → 0.6 (Actors decision).
//
// Asserts the target repo carries no residue of the removed UNIT / EMPLOYEE
// TYPEs:
//   - no element file whose id is UNIT-… or EMPLOYEE-…
//   - no activity `unit:` / `employee:` field referencing UNIT-/EMPLOYEE-/EMP-
//   - no ROLE `unit:` still pointing at a UNIT-… value
//
// Exit 0 = clean (on 0.6 form); exit 1 = residue found (per-file report).

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
for (const f of walk(target)) {
  const c = readFileSync(f, 'utf8');
  const rel = relative(target, f);
  const idm = c.match(/^id\s*:\s*["']?(UNIT|EMPLOYEE)-[A-Za-z0-9._-]+/m);
  if (idm) problems.push(`${rel}: still a ${idm[1]} element file (should be ACTOR)`);
  const notation = (c.match(/^notation\s*:\s*(\S+)/m) || [])[1];
  if (['activities', 'activity'].includes(notation)) {
    if (/^\s*(unit|employee)\s*:\s*["']?(UNIT|EMPLOYEE|EMP)-/m.test(c))
      problems.push(`${rel}: activity still has unit:/employee: → should be owner: ACTOR-…`);
  }
  if (notation === 'role' && /^\s*unit\s*:\s*["']?UNIT-/m.test(c))
    problems.push(`${rel}: ROLE.unit still references a UNIT-… (should be ACTOR-…)`);
  if (notation === 'project-card' || /\bPROJECT_CARD-/.test(c) || /^\s*project_card\s*:/m.test(c))
    problems.push(`${rel}: PROJECT_CARD residue — rename to ACTIVITY_CARD / activity_card / activity-card`);
}

if (problems.length) {
  console.error(`FAIL — ${problems.length} 0.5→0.6 residue(s):`);
  problems.forEach(p => console.error(`  ✗ ${p}`));
  process.exit(1);
}
console.log('PASS — no UNIT / EMPLOYEE residue; repo is on 0.6 form.');
process.exit(0);
