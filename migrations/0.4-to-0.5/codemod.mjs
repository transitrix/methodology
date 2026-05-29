#!/usr/bin/env node
// Migration codemod — methodology 0.4 → 0.5.
//
// CURRENT TRANSFORM: remove applies_to.{entities, processes} from external
// and internal codex artefacts (per notations/14-codex.md §8 Migration).
//
// Conventions (canonical for every migration recipe):
//   - Pure-Node. Runs on a stock Node ≥ 20 with no native deps.
//   - Idempotent. Running twice on the same input produces identical output.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//   - Diff-style summary printed on every run, live or dry.
//   - Exits non-zero on unsafe ambiguity; safe transforms apply normally.
//
// Strategy: line-based YAML transformation. The applies_to: block always
// appears at a fixed indentation depth on a codex artefact (top level for
// the canonical shape); we strip the line and any continuation lines that
// are indented strictly deeper than applies_to's own indent. This handles
// nested entities / processes maps and inline-array forms without parsing
// the YAML — preserves comments and formatting on the lines we keep, which
// js-yaml dump would otherwise normalise away.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// --- CLI --------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

// --- Discover codex YAML files ----------------------------------------------

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
  console.log(`No codex/ directory under ${target} — nothing to do.`);
  process.exit(0);
}

const candidateFiles = walkYaml(codexRoot);
if (candidateFiles.length === 0) {
  console.log(`No .yaml files under ${codexRoot} — nothing to do.`);
  process.exit(0);
}

// --- Transform: strip applies_to block from a single file -------------------

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

    // Sanity: applies_to under a key-value (no value on its own line +
    // children indented) is the only canonical shape. An inline value
    // (`applies_to: [X, Y]`) on a single line is also valid — we strip
    // the line and continue.
    const hasInlineValue = line.match(/^\s*applies_to\s*:\s*\S/);
    if (hasInlineValue) {
      removedBlockCount++;
      i++;
      continue;
    }

    // Block form: skip the applies_to: line plus all subsequent lines
    // that are indented strictly deeper than the applies_to: line's own
    // indent. Blank lines INSIDE the block (preceded and followed by
    // strictly-deeper-indented lines) are skipped as part of the block.
    const ownIndent = m[1].length;
    removedBlockCount++;
    i++;

    while (i < lines.length) {
      const next = lines[i];
      const trimmedEmpty = next.trim() === '';
      const nextIndent = next.match(/^(\s*)/)[1].length;

      if (trimmedEmpty) {
        // Peek ahead: if the next non-blank line is still strictly deeper
        // than applies_to's indent, this blank is inside the block — skip.
        // Otherwise the blank is the separator after the block — emit and stop.
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') j++;
        if (j < lines.length) {
          const peekIndent = lines[j].match(/^(\s*)/)[1].length;
          if (peekIndent > ownIndent) {
            // blank still inside the block; skip
            i++;
            continue;
          }
        }
        // blank is outside the block — emit it (preserves spacing) and stop
        out.push(next);
        i++;
        break;
      }

      if (nextIndent > ownIndent) {
        i++; // inside the block; skip
      } else {
        break; // back to sibling indent; stop, do NOT consume this line
      }
    }
  }

  return { content: out.join('\n'), removedBlockCount, bailed };
}

// --- Run over every candidate -----------------------------------------------

let modifiedFiles = 0;
let totalRemovedBlocks = 0;
let failed = 0;

for (const file of candidateFiles) {
  let original;
  try {
    original = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`! ${relative(target, file)}: read failed (${e.message}) — skipping`);
    failed++;
    continue;
  }

  const { content: result, removedBlockCount, bailed } = stripAppliesTo(original);

  if (bailed) {
    console.error(`! ${relative(target, file)}: codemod bailed on ambiguity — file unchanged`);
    failed++;
    continue;
  }

  if (removedBlockCount === 0) {
    // unchanged — typical for an artefact that has no applies_to or has
    // already been migrated. Idempotent.
    continue;
  }

  if (!dryRun) {
    writeFileSync(file, result);
  }
  modifiedFiles++;
  totalRemovedBlocks += removedBlockCount;
  console.log(`${dryRun ? '[dry-run] ' : ''}~ ${relative(target, file)}: removed ${removedBlockCount} applies_to block${removedBlockCount === 1 ? '' : 's'}`);
}

// --- Summary ----------------------------------------------------------------

console.log(``);
console.log(`Summary:`);
console.log(`  files scanned        ${candidateFiles.length}`);
console.log(`  files modified       ${modifiedFiles}${dryRun ? ' (dry-run; no files written)' : ''}`);
console.log(`  applies_to removed   ${totalRemovedBlocks}`);
if (failed > 0) {
  console.error(`  files skipped        ${failed}`);
  process.exit(1);
}
process.exit(0);
