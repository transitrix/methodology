#!/usr/bin/env node
// Cheat-sheet conformance check — diffs the onboarding Skill's embedded
// cheat sheet against the canonical notation catalogue.
//
// Ground truth: notations/README.md §"Views" — the canonical index of the
// view notations (short name + file extension + status). Element notations
// live under §"Elements" and are out of scope for the cheat sheet check.
//
// What we check:
//   A. Every notation in the canon catalogue has a row in the Skill's
//      family-selection matrix carrying the canonical file extension.
//   B. Every notation in the canon catalogue has a view-template at the
//      canonical path `templates/<short>.<short>.transitrix.yaml`.
//   C. Every file extension that appears in the Skill's family-selection
//      matrix corresponds to a notation in the canon (no Skill-only rows).
//   D. Every view-template path in the Skill's templates table corresponds
//      to a notation in the canon (no Skill-only templates).
//
// What we do NOT check (out of scope for v1):
//   - The codex zone-primitives section in the cheat sheet (codex is not in
//     the catalogue table; it is a parallel zone-primitive notation).
//   - Root-scaffolding templates (transitrix.yaml, AGENTS.md, copilot-
//     instructions.md) — adopter-shape concerns, not notation-shape concerns.
//   - Intra-spec drift (each spec's front-matter `file_extension` vs its
//     "File header" section) — a separate known issue, not the Skill's fault.
//   - The free-text "Situation" prose in the family-selection matrix.
//
// Exit codes:
//   0 — no drift
//   1 — drift found (one or more checks failed)
//   2 — script-internal error (file missing, parse failure)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');
const CATALOGUE_PATH = join(REPO_ROOT, 'notations', 'README.md');
const SKILL_PATH = join(REPO_ROOT, 'skills', 'onboarding', 'SKILL.md');

// --- Parsers ---------------------------------------------------------------

// Pull the catalogue table from notations/README.md.
// Returns: Map<short_name, { extension, status }>.
async function parseCatalogue() {
  const text = await readFile(CATALOGUE_PATH, 'utf8');
  const lines = text.split('\n');

  // Locate the section heading then the first markdown table after it.
  const headingIdx = lines.findIndex(l => /^##\s+Views\s*$/.test(l));
  if (headingIdx < 0) {
    throw new Error(`notations/README.md: "## Views" section not found`);
  }

  // Find the table header row after the heading.
  let headerIdx = -1;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('| Spec ')) {
      headerIdx = i;
      break;
    }
    if (/^##\s/.test(lines[i])) break; // hit the next section
  }
  if (headerIdx < 0) {
    throw new Error(`notations/README.md: catalogue table header not found`);
  }

  // Data rows start two lines after the header (skip header + separator).
  const out = new Map();
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|')) break;
    const cells = line.split('|').map(c => c.trim());
    // cells: ['', Spec, ShortName, Purpose, FileExtension, Status, '']
    if (cells.length < 7) continue;
    const shortNameCell = cells[2];
    const extCell = cells[4];
    const statusCell = cells[5];
    const shortMatch = shortNameCell.match(/`([^`]+)`/);
    const extMatch = extCell.match(/`([^`]+)`/);
    if (!shortMatch || !extMatch) {
      throw new Error(`notations/README.md: cannot parse catalogue row: ${line}`);
    }
    out.set(shortMatch[1], { extension: extMatch[1], status: statusCell });
  }

  if (out.size === 0) {
    throw new Error(`notations/README.md: catalogue table parsed empty`);
  }
  return out;
}

// Pull the family-selection matrix from skills/onboarding/SKILL.md.
// Returns: Set<file_extension>. The matrix has one row per notation; we use
// the file-extension column as the join key against the canon catalogue.
async function parseSkillMatrix() {
  const text = await readFile(SKILL_PATH, 'utf8');
  const lines = text.split('\n');

  const headingIdx = lines.findIndex(l => /^###\s+Family selection\s*$/.test(l));
  if (headingIdx < 0) {
    throw new Error(`SKILL.md: "### Family selection" section not found`);
  }

  // The first markdown table after the heading is the matrix.
  let headerIdx = -1;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('| Situation ')) {
      headerIdx = i;
      break;
    }
    if (/^##\s|^###\s/.test(lines[i])) break;
  }
  if (headerIdx < 0) {
    throw new Error(`SKILL.md: family-selection matrix header not found`);
  }

  const out = new Set();
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|')) break;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 5) continue;
    const extCell = cells[3];
    const extMatch = extCell.match(/`([^`]+)`/);
    if (!extMatch) {
      throw new Error(`SKILL.md: cannot parse matrix row: ${line}`);
    }
    out.add(extMatch[1]);
  }

  if (out.size === 0) {
    throw new Error(`SKILL.md: family-selection matrix parsed empty`);
  }
  return out;
}

// Pull the view-notation template paths from skills/onboarding/SKILL.md.
// Returns: Set<short_name>, extracted from `templates/<short>.<short>.transitrix.yaml`.
// Other template categories (root scaffolding, codex) do not match the
// `<short>.<short>.transitrix.yaml` shape and are naturally filtered out.
async function parseSkillTemplates() {
  const text = await readFile(SKILL_PATH, 'utf8');
  // Match every `templates/<x>.<y>.transitrix.yaml` mention; we collect the
  // short name when x === y.
  const re = /`templates\/([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)\.transitrix\.yaml`/g;
  const out = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] === m[2]) out.add(m[1]);
  }
  if (out.size === 0) {
    throw new Error(`SKILL.md: no view-notation template paths found`);
  }
  return out;
}

// --- Reporter --------------------------------------------------------------

function reportFailure(failures) {
  console.error(`\nSkill cheat-sheet drifted from the canon — ${failures.length} finding(s):\n`);
  for (const f of failures) {
    console.error(`  - [${f.check}] ${f.message}`);
  }
  console.error(
    `\nFix the Skill (skills/onboarding/SKILL.md) to match the canon ` +
    `(notations/README.md), or — if the canon is wrong — update both ` +
    `together in the same PR.\n`
  );
}

// --- Main ------------------------------------------------------------------

async function main() {
  let catalogue, skillMatrixExts, skillTemplateShorts;
  try {
    [catalogue, skillMatrixExts, skillTemplateShorts] = await Promise.all([
      parseCatalogue(),
      parseSkillMatrix(),
      parseSkillTemplates(),
    ]);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }

  const failures = [];

  // Build the canonical extension set + per-extension short-name lookup.
  const canonExts = new Set();
  const extToShort = new Map();
  for (const [shortName, { extension }] of catalogue) {
    canonExts.add(extension);
    extToShort.set(extension, shortName);
  }

  // Check A: every catalogue notation has a matching row in the matrix.
  for (const [shortName, { extension }] of catalogue) {
    if (!skillMatrixExts.has(extension)) {
      failures.push({
        check: 'A',
        message:
          `notation "${shortName}" (extension \`${extension}\`) is in the canon catalogue ` +
          `(notations/README.md) but has no row in the Skill's family-selection matrix ` +
          `(SKILL.md §"Family selection") carrying that extension.`,
      });
    }
  }

  // Check B: every catalogue notation has a matching template at the canonical path.
  for (const [shortName] of catalogue) {
    if (!skillTemplateShorts.has(shortName)) {
      failures.push({
        check: 'B',
        message:
          `notation "${shortName}" is in the canon catalogue but has no view-template ` +
          `entry at \`templates/${shortName}.${shortName}.transitrix.yaml\` in the ` +
          `Skill's templates table.`,
      });
    }
  }

  // Check C: every extension in the matrix is in the canon catalogue.
  for (const ext of skillMatrixExts) {
    if (!canonExts.has(ext)) {
      failures.push({
        check: 'C',
        message:
          `extension \`${ext}\` appears in the Skill's family-selection matrix but is ` +
          `not in the canon catalogue (notations/README.md). Either the cheat-sheet has ` +
          `a stray row or the catalogue is missing the notation.`,
      });
    }
  }

  // Check D: every view-template short name in the Skill is in the catalogue.
  for (const shortName of skillTemplateShorts) {
    if (!catalogue.has(shortName)) {
      failures.push({
        check: 'D',
        message:
          `view-template \`templates/${shortName}.${shortName}.transitrix.yaml\` is ` +
          `listed in the Skill's templates table but "${shortName}" is not a notation ` +
          `in the canon catalogue (notations/README.md).`,
      });
    }
  }

  if (failures.length > 0) {
    reportFailure(failures);
    process.exit(1);
  }

  console.log(
    `Skill cheat-sheet conforms to the canon — ${catalogue.size} notations ` +
    `checked across the family-selection matrix and the view-templates table.`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(`error: ${e.message}`);
  process.exit(2);
});
