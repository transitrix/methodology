#!/usr/bin/env node
// Post-migration validation — methodology 3.1 → 4.0 (FGA retirement +
// recipe-file header rename).
//
// Asserts no residue of either transform remains:
//   - no *.fga.transitrix.yaml file
//   - no file with notation: fga
//   - no *.ttrs file with a template_id or template_version header field
//
// Exit 0 = clean (fully on 4.0 form); Exit 1 = residue found (run codemod again).

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
    else if (st.isFile() && (e.endsWith('.yaml') || e.endsWith('.ttrs'))) out.push(f);
  }
  return out;
}

const problems = [];

for (const f of walk(target)) {
  const rel = relative(target, f);

  if (f.endsWith('.fga.transitrix.yaml'))
    problems.push(`${rel}: *.fga.transitrix.yaml — run codemod to rename to *.dgca.transitrix.yaml`);

  const c = readFileSync(f, 'utf8');
  if (/^notation\s*:\s*fga\b/m.test(c))
    problems.push(`${rel}: notation: fga — run codemod to migrate to notation: dgca`);

  if (f.endsWith('.ttrs')) {
    if (/^template_id\s*:/m.test(c))
      problems.push(`${rel}: template_id — run codemod to migrate to recipe_id`);
    if (/^template_version\s*:/m.test(c))
      problems.push(`${rel}: template_version — run codemod to migrate to recipe_version`);
  }
}

if (problems.length) {
  console.error(`FAIL — ${problems.length} residue(s):`);
  problems.forEach(p => console.error(`  ✗ ${p}`));
  process.exit(1);
}

console.log('PASS — no FGA or recipe-header residue; repo is fully on 4.0 form.');
process.exit(0);
