#!/usr/bin/env node
/**
 * Post-migration validator for the 2.1 → 3.0 design-controls removal.
 *
 * Checks that no HAZARD, RISK_CONTROL, or design-controls-trace-matrix file
 * remains under `canon/` — the locations core validators (and referential
 * integrity) still scan. Content parked under `_archived/` is not an error;
 * that is exactly where the codemod puts it.
 *
 * Usage:
 *   node migrations/2.1-to-3.0/validate.mjs <adopter-root>
 *
 * Exits 0 if clean, 1 if any offending file remains under canon/.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const [, , adopterRoot] = process.argv;

if (!adopterRoot) {
  console.error("Usage: node validate.mjs <adopter-root>");
  process.exit(1);
}

if (!existsSync(adopterRoot)) {
  console.error(`error: adopter root does not exist: ${adopterRoot}`);
  process.exit(1);
}

function walkFiles(dir, pred, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    if (ent === ".git" || ent === "node_modules" || ent === "_archived") continue;
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkFiles(full, pred, out);
    else if (pred(ent, full)) out.push(full);
  }
  return out;
}

function isOffending(name, full) {
  const rel = "/" + relative(adopterRoot, full).split(sep).join("/");
  if (rel.includes("/canon/elements/01_motivation/hazards/") && name.endsWith(".yaml")) return true;
  if (rel.includes("/canon/elements/01_motivation/risk-controls/") && name.endsWith(".yaml")) return true;
  if (name.endsWith(".design-controls-trace-matrix.transitrix.yaml")) return true;
  return false;
}

console.log(`\nValidating adopter root: ${adopterRoot}\n`);

const offending = walkFiles(adopterRoot, isOffending);

if (offending.length === 0) {
  console.log("✓ No HAZARD, RISK_CONTROL, or design-controls-trace-matrix files remain under canon/.\n");
  process.exit(0);
}

for (const f of offending) {
  console.error(`  ERROR  ${relative(adopterRoot, f)}: still under canon/ — run codemod.mjs, or move it out by hand.`);
}
console.error(`\n✗ ${offending.length} offending file(s). Run codemod.mjs, or move the content out of canon/ by hand.\n`);
process.exit(1);
