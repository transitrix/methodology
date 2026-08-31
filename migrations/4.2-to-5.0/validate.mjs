#!/usr/bin/env node
// Post-migration validation — methodology 4.2 → 5.0 (ReqIF lifecycle
// retirement + FGCA-008..014 rule-code retirement).
//
// Asserts no adopter automation still invokes a removed transitrix-reqif
// command. There is nothing else to check: neither breaking change in this
// release alters a file's shape (see codemod.mjs's header for why), so no
// residue is possible in `reqif/`, `canon/`, `field/`, or `codex/` content
// itself — only in scripts/CI that named the four now-deleted commands.
//
// Exit 0 = clean; Exit 1 = residue found (fix by hand, per README.md).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules']);
const target = resolve(process.argv.slice(2).find(a => !a.startsWith('--')) ?? process.cwd());
if (!existsSync(target)) { console.error(`error: no such dir: ${target}`); process.exit(2); }

function walk(dir, out = []) {
  let ents; try { ents = readdirSync(dir); } catch { return out; }
  for (const e of ents) {
    if (SKIP_DIRS.has(e)) continue;
    const f = join(dir, e);
    let st; try { st = statSync(f); } catch { continue; }
    if (st.isDirectory()) walk(f, out);
    else if (st.isFile()) out.push(f);
  }
  return out;
}

const problems = [];

for (const f of walk(target)) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/transitrix-reqif\s+(transition|revise|history|suspect)\b/);
    if (m) problems.push(`${relative(target, f)}:${i + 1}: still invokes 'transitrix-reqif ${m[1]}' — this command no longer exists in v5.0.0`);
  }
}

if (problems.length) {
  console.error(`FAIL — ${problems.length} residue(s):`);
  problems.forEach(p => console.error(`  ✗ ${p}`));
  process.exit(1);
}

console.log('PASS — no reference to a removed transitrix-reqif command found.');
process.exit(0);
