#!/usr/bin/env node
/**
 * Post-migration validator for the 1.0 → 2.0 view-purity migration.
 *
 * Checks that:
 *   1. No *.goals.transitrix.yaml files contain a root-level `goals:` array.
 *   2. No *.action.transitrix.yaml files contain a root-level `actions:` or
 *      `activities:` array.
 *   3. All goals view files carry a `view_config:` block.
 *   4. All action schedule view files carry a `view_config:` block.
 *   5. All GOAL-* IDs referenced in goals view files have a corresponding
 *      standalone element file under canon/elements/01_motivation/goals/.
 *   6. All ACTION-* IDs referenced in action schedule view files have a
 *      corresponding standalone element file under
 *      canon/elements/05_implementation/actions/.
 *
 * Usage:
 *   node migrations/1.0-to-2.0/validate.mjs <adopter-root>
 *
 * Exits 0 if all checks pass, 1 if any errors are found.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, basename, sep } from "node:path";

const [, , adopterRoot] = process.argv;

if (!adopterRoot) {
  console.error("Usage: node validate.mjs <adopter-root>");
  process.exit(1);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function walkFiles(dir, pred) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, pred));
    } else if (entry.isFile() && pred(entry.name, full)) {
      results.push(full);
    }
  }
  return results;
}

function hasRootKey(yaml, key) {
  // Matches `key:` at column 0 (possibly followed by space, [, or |)
  const re = new RegExp(`^${key}\\s*[:\\[|]`, "m");
  return re.test(yaml);
}

function extractRootSequenceIds(yaml, key) {
  // Collects all id: values that appear after a root-level `key:` block.
  // Works for block sequences and inline flow sequences.
  const ids = [];

  // Inline flow: key: [ID-A, ID-B]
  const inlineRe = new RegExp(`^${key}\\s*:\\s*\\[([^\\]]+)\\]`, "m");
  const inlineMatch = yaml.match(inlineRe);
  if (inlineMatch) {
    for (const tok of inlineMatch[1].split(",")) {
      const id = tok.trim().replace(/^['"]|['"]$/g, "");
      if (id) ids.push(id);
    }
    return ids;
  }

  // Block sequence: collect lines after `key:` until we hit another root key.
  const lines = yaml.split("\n");
  let inBlock = false;
  const rootKeyRe = /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/;
  const thisKeyRe = new RegExp(`^${key}\\s*:`);

  for (const line of lines) {
    if (thisKeyRe.test(line)) { inBlock = true; continue; }
    if (inBlock) {
      if (rootKeyRe.test(line) && !line.startsWith(" ") && !line.startsWith("\t") && !line.startsWith("-")) {
        inBlock = false;
        continue;
      }
      const idMatch = line.match(/^\s+id\s*:\s*(.+)$/);
      if (idMatch) ids.push(idMatch[1].trim().replace(/^['"]|['"]$/g, ""));
    }
  }
  return ids;
}

function extractGoalIdsFromViewConfig(yaml) {
  // After migration, goal IDs live in canon/elements, not in the view file.
  // We extract any GOAL-* tokens from the view_config scope block.
  const ids = [];
  const re = /\b(GOAL-[A-Z0-9][A-Z0-9_-]*\d+)\b/g;
  for (const m of yaml.matchAll(re)) ids.push(m[1]);
  return [...new Set(ids)];
}

function extractActionIdsFromViewConfig(yaml) {
  const ids = [];
  const re = /\b(ACTION-[A-Z0-9][A-Z0-9_-]*\d+)\b/g;
  for (const m of yaml.matchAll(re)) ids.push(m[1]);
  return [...new Set(ids)];
}

function elementPath(base, layer, type, id) {
  return join(base, "canon", "elements", layer, type, `${id}.yaml`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;

function fail(msg) { console.error(`  ERROR  ${msg}`); errors++; }
function warn(msg)  { console.warn( `  WARN   ${msg}`); warnings++; }
function ok(msg)    { console.log(  `  OK     ${msg}`); }

console.log(`\nValidating adopter root: ${adopterRoot}\n`);

// ── 1. Goals Tree files ────────────────────────────────────────────────────────

const goalsFiles = walkFiles(adopterRoot, (name) => name.endsWith(".goals.transitrix.yaml"));

if (goalsFiles.length === 0) {
  console.log("No *.goals.transitrix.yaml files found — skipping Goals Tree checks.");
} else {
  console.log(`Goals Tree files (${goalsFiles.length}):`);
  for (const file of goalsFiles) {
    const rel = file.replace(adopterRoot + sep, "");
    const yaml = readFileSync(file, "utf8");

    // Check 1a: no inline goals[]
    if (hasRootKey(yaml, "goals")) {
      fail(`${rel}: inline \`goals:\` array detected (GOALS-008). Run the codemod.`);
    } else {
      ok(`${rel}: no inline goals[]`);
    }

    // Check 1b: view_config present
    if (!hasRootKey(yaml, "view_config")) {
      fail(`${rel}: missing \`view_config:\` block.`);
    } else {
      ok(`${rel}: view_config present`);
    }

    // Check 1c: methodology_version
    if (!yaml.includes("methodology_version")) {
      warn(`${rel}: missing \`methodology_version\` field — add \`methodology_version: "2.0.0"\`.`);
    }

    // Check 1d: referenced GOAL-* elements exist
    const refs = extractGoalIdsFromViewConfig(yaml);
    for (const id of refs) {
      if (!id.startsWith("GOAL-")) continue;
      const ep = elementPath(adopterRoot, "01_motivation", "goals", id);
      if (!existsSync(ep)) {
        fail(`${rel}: references ${id} but ${ep.replace(adopterRoot + sep, "")} does not exist.`);
      } else {
        ok(`${rel}: element ${id} found`);
      }
    }
  }
}

console.log();

// ── 2. Action Schedule files ───────────────────────────────────────────────────

const actionFiles = walkFiles(adopterRoot, (name) => name.endsWith(".action.transitrix.yaml"));

if (actionFiles.length === 0) {
  console.log("No *.action.transitrix.yaml files found — skipping Action Schedule checks.");
} else {
  console.log(`Action Schedule files (${actionFiles.length}):`);
  for (const file of actionFiles) {
    const rel = file.replace(adopterRoot + sep, "");
    const yaml = readFileSync(file, "utf8");

    // Check 2a: no inline actions[] / activities[]
    if (hasRootKey(yaml, "actions")) {
      fail(`${rel}: inline \`actions:\` array detected (ACT-010). Run the codemod.`);
    } else {
      ok(`${rel}: no inline actions[]`);
    }
    if (hasRootKey(yaml, "activities")) {
      fail(`${rel}: inline \`activities:\` array detected (ACT-010). Run the codemod.`);
    }

    // Check 2b: view_config present
    if (!hasRootKey(yaml, "view_config")) {
      fail(`${rel}: missing \`view_config:\` block.`);
    } else {
      ok(`${rel}: view_config present`);
    }

    // Check 2c: methodology_version
    if (!yaml.includes("methodology_version")) {
      warn(`${rel}: missing \`methodology_version\` field — add \`methodology_version: "2.0.0"\`.`);
    }

    // Check 2d: referenced ACTION-* elements exist
    const refs = extractActionIdsFromViewConfig(yaml);
    for (const id of refs) {
      if (!id.startsWith("ACTION-")) continue;
      const ep = elementPath(adopterRoot, "05_implementation", "actions", id);
      if (!existsSync(ep)) {
        fail(`${rel}: references ${id} but ${ep.replace(adopterRoot + sep, "")} does not exist.`);
      } else {
        ok(`${rel}: element ${id} found`);
      }
    }
  }
}

console.log();

// ── 3. Standalone element coverage check ──────────────────────────────────────
// Warn on any inline element IDs still found in non-view YAML files.

const allYaml = walkFiles(adopterRoot, (name) => name.endsWith(".yaml") &&
  !name.endsWith(".goals.transitrix.yaml") &&
  !name.endsWith(".action.transitrix.yaml") &&
  !name.endsWith(".dgca.transitrix.yaml"));

// (No cross-file checks here beyond what's above — element files are validated
// by the main `transitrix-ingest validate` pipeline.)

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("─".repeat(60));
if (errors === 0 && warnings === 0) {
  console.log(`\n✓ All checks passed. Adopter root is migration-clean.\n`);
  process.exit(0);
} else if (errors === 0) {
  console.log(`\n✓ No errors. ${warnings} warning(s) — review above.\n`);
  process.exit(0);
} else {
  console.log(`\n✗ ${errors} error(s), ${warnings} warning(s). Fix errors before proceeding.\n`);
  process.exit(1);
}
