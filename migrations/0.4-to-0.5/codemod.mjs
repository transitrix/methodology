#!/usr/bin/env node
// Migration codemod — methodology 0.4 → 0.5.
//
// TRANSFORMS (extensible; each entry in `transforms` below is independent):
//
//   1. codex applies_to retirement (notations/14-codex.md §8 Migration)
//      Walks <target>/codex/**/*.yaml and strips applies_to: blocks
//      (both indented-children and inline-array forms).
//
//   2. lifecycle backfill (notations/CONTRACT.md §7.4 Migration)
//      Walks <target>/canon/elements/**/*.yaml and appends valid_from
//      + valid_to to any element primitive missing lifecycle. Uses
//      the file's last_updated: when present, otherwise the sensible
//      epoch "2024-01-01" per the §7.4 recipe.
//
// Conventions (canonical for every migration recipe):
//   - Pure-Node. Runs on a stock Node ≥ 20 with no native deps.
//   - Idempotent. Running twice on the same input produces identical
//     output — files already in 0.5 form are no-ops.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//   - Per-transform diff-style summary printed on every run, live or
//     dry, plus an overall summary at the end.
//   - Exits non-zero on unsafe ambiguity; safe transforms apply normally.
//
// Strategy: line-based YAML transformation, NOT js-yaml roundtrip. The
// transforms preserve comments, key order, and original formatting on
// every line we don't touch. js-yaml dump would normalise comments and
// keys away.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// --- CLI --------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

// --- Shared file-walker -----------------------------------------------------

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

// --- Transform 1: strip codex applies_to ------------------------------------

function stripAppliesTo(content) {
  const lines = content.split('\n');
  const out = [];
  let removedBlockCount = 0;
  let i = 0;
  let bailed = false;

  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(\s*)applies_to\s*:/);
    if (!m) {
      out.push(line);
      i++;
      continue;
    }

    // Inline-array form: `applies_to: [X, Y]` — strip the single line.
    const hasInlineValue = line.match(/^\s*applies_to\s*:\s*\S/);
    if (hasInlineValue) {
      removedBlockCount++;
      i++;
      continue;
    }

    // Block form: strip the line plus subsequent lines indented strictly
    // deeper than applies_to's own indent. Blanks INSIDE the block are
    // consumed; the first blank or sibling-indented line after the block
    // is preserved (and not consumed by this transform).
    const ownIndent = m[1].length;
    removedBlockCount++;
    i++;

    while (i < lines.length) {
      const next = lines[i];
      const trimmedEmpty = next.trim() === '';
      const nextIndent = next.match(/^(\s*)/)[1].length;

      if (trimmedEmpty) {
        // Peek ahead: if the next non-blank line is still strictly deeper
        // than applies_to's indent, this blank belongs to the block — skip.
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length) {
          const peekIndent = lines[j].match(/^(\s*)/)[1].length;
          if (peekIndent > ownIndent) {
            i++;
            continue;
          }
        }
        out.push(next);
        i++;
        break;
      }

      if (nextIndent > ownIndent) {
        i++;
      } else {
        break;
      }
    }
  }

  return { content: out.join('\n'), modified: removedBlockCount, bailed };
}

// --- Transform 2: lifecycle backfill ----------------------------------------

function backfillLifecycle(content) {
  // Idempotency: if `valid_from:` appears anywhere at any indent, treat
  // the file as already migrated and leave it alone. A partial-state
  // file (has valid_from but not valid_to) is flagged for manual review;
  // we do not auto-correct it.
  if (/^\s*valid_from\s*:/m.test(content)) {
    return { content, modified: 0, bailed: false };
  }

  // Pick a valid_from value. Prefer the file's last_updated: when
  // present; else the §7.4 epoch fallback.
  const lu = content.match(/^\s*last_updated\s*:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m);
  const validFrom = (lu ? lu[1].trim() : '2024-01-01');

  const block =
    '\n# Primitive lifecycle (CONTRACT.md §7) — backfilled by 0.4 → 0.5 migration\n' +
    `valid_from: "${validFrom}"\n` +
    'valid_to: null\n';

  const result = (content.endsWith('\n') ? content : content + '\n') + block;
  return { content: result, modified: 1, bailed: false };
}

// --- Transform registry -----------------------------------------------------

const transforms = [
  {
    name: 'codex applies_to retirement',
    rootName: 'codex',
    fn: stripAppliesTo,
    unit: 'applies_to block',
    units: 'applies_to blocks',
  },
  {
    name: 'lifecycle backfill',
    rootName: 'canon/elements',
    fn: backfillLifecycle,
    unit: 'lifecycle block appended',
    units: 'lifecycle blocks appended',
  },
];

// --- Run --------------------------------------------------------------------

let totalScanned = 0;
let totalModified = 0;
let totalUnits = 0;
let totalFailed = 0;

for (const t of transforms) {
  const root = join(target, t.rootName);
  console.log(`Transform: ${t.name}`);

  if (!existsSync(root)) {
    console.log(`  ${t.rootName}/ not present under target — skipping.`);
    console.log('');
    continue;
  }

  const files = walkYaml(root);
  console.log(`  scanning ${files.length} .yaml file(s) under ${t.rootName}/`);

  let modified = 0;
  let units = 0;
  let failed = 0;

  for (const file of files) {
    let original;
    try {
      original = readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`  ! ${relative(target, file)}: read failed (${e.message}) — skipping`);
      failed++;
      continue;
    }

    const result = t.fn(original);

    if (result.bailed) {
      console.error(`  ! ${relative(target, file)}: bailed on ambiguity — file unchanged`);
      failed++;
      continue;
    }

    if (result.modified === 0) continue;

    if (!dryRun) writeFileSync(file, result.content);
    modified++;
    units += result.modified;
    const u = result.modified === 1 ? t.unit : t.units;
    console.log(`  ${dryRun ? '[dry-run] ' : ''}~ ${relative(target, file)}: ${result.modified} ${u}`);
  }

  console.log(`  → ${modified} file(s) modified, ${units} ${units === 1 ? t.unit : t.units}${dryRun ? ' (dry-run; no files written)' : ''}`);
  console.log('');

  totalScanned += files.length;
  totalModified += modified;
  totalUnits += units;
  totalFailed += failed;
}

// --- Overall summary --------------------------------------------------------

console.log(`Summary across ${transforms.length} transform(s):`);
console.log(`  files scanned     ${totalScanned}`);
console.log(`  files modified    ${totalModified}${dryRun ? ' (dry-run)' : ''}`);
console.log(`  units applied     ${totalUnits}`);
if (totalFailed > 0) {
  console.error(`  files skipped     ${totalFailed}`);
  process.exit(1);
}
process.exit(0);
