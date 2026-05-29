#!/usr/bin/env node
// Migration codemod — methodology 0.5 → 0.6.
//
// Covers the Actors decision (2026-05-29): the UNIT and EMPLOYEE element TYPEs
// are removed; identity unifies under ACTOR (person | business_unit | system).
//   UNIT-…      → ACTOR-… (type: business_unit)
//   EMPLOYEE-…  → ACTOR-… (type: person) + an `employment` REL (engagement)
// and the activity ownership fields (owner free-text / unit / employee) collapse
// to a single `owner: ACTOR-…`.
//
// TRANSFORMS (each independent):
//
//   A. Activity ownership collapse (notations/views/07-activities.md §5.6).
//      In files with notation: activities | activity, rewrites inline
//      `unit: UNIT-X` and `employee: EMPLOYEE-X | EMP-X` to `owner: ACTOR-<tail>`.
//      Skips (flags) an entry that already carries a sibling `owner:` so the
//      collapse never produces a duplicate key — that case is manual.
//
//   B. ROLE.unit value retarget (notations/ELEMENT_PRIMITIVES.md §7.9).
//      In files with notation: role, rewrites `unit: UNIT-X` → `unit: ACTOR-X`
//      (the field stays; it now points at an ACTOR of type business_unit).
//
//   C. UNIT / EMPLOYEE element files (detection only — UNSAFE to auto-transform).
//      A file whose `id:` is UNIT-… or EMPLOYEE-… needs a manual move + split:
//      UNIT → ACTOR(business_unit); EMPLOYEE → ACTOR(person) + an employment REL
//      (the engagement data can't be synthesised deterministically). Such files
//      are reported and left unchanged; the codemod exits non-zero so the adopter
//      handles them (per the recipe convention).
//
// Conventions (canonical for every migration recipe):
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: a repo already on 0.6 form is a no-op.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.
//   - Per-transform + overall diff-style summary. Exit non-zero on unsafe
//     ambiguity, leaving the offending file unchanged.
//
// Line-based transformation (not js-yaml roundtrip) to preserve comments,
// key order, and formatting on untouched lines.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync } from 'node:fs';
import { join, relative, resolve, basename, dirname } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

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

function notationOf(content) {
  const m = content.match(/^notation\s*:\s*(\S+)/m);
  return m ? m[1] : null;
}

// tail of a typed id: UNIT-FACILITIES -> FACILITIES, EMP-001 -> 001
function tail(id) {
  return id.replace(/^(UNIT|EMPLOYEE|EMP)-/, '');
}

// --- Transform A: activity ownership collapse -------------------------------

function collapseOwnership(content) {
  if (!['activities', 'activity'].includes(notationOf(content))) {
    return { content, modified: 0, failed: 0, notes: [] };
  }
  const lines = content.split('\n');
  const out = [];
  let modified = 0, failed = 0;
  const notes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)(unit|employee)\s*:\s*["']?((?:UNIT|EMPLOYEE|EMP)-[A-Za-z0-9._-]+)["']?\s*(#.*)?$/);
    if (!m) { out.push(line); continue; }
    const [, indent, , id, comment] = m;
    // Guard: don't create a duplicate owner key within the same activity entry.
    const siblingOwner = lines.some((l, j) => {
      if (j === i) return false;
      const om = l.match(/^(\s*)owner\s*:/);
      return om && om[1].length === indent.length && nearSameEntry(lines, i, j, indent.length);
    });
    if (siblingOwner) {
      failed++;
      notes.push(`already has a sibling owner: near "${id}" — collapse manually`);
      out.push(line);
      continue;
    }
    modified++;
    out.push(`${indent}owner: ACTOR-${tail(id)}${comment ? ' ' + comment : ''}`);
  }
  return { content: out.join('\n'), modified, failed, notes };
}

// crude same-entry check: two sibling-indented keys belong to the same list
// item if no shallower-or-equal list marker ("- ") sits between them.
function nearSameEntry(lines, i, j, indent) {
  const [a, b] = i < j ? [i, j] : [j, i];
  for (let k = a + 1; k < b; k++) {
    const lm = lines[k].match(/^(\s*)-\s/);
    if (lm && lm[1].length < indent) return false;
  }
  return true;
}

// --- Transform B: ROLE.unit value retarget ----------------------------------

function retargetRoleUnit(content) {
  if (notationOf(content) !== 'role') {
    return { content, modified: 0, failed: 0, notes: [] };
  }
  let modified = 0;
  const result = content.replace(
    /^(\s*unit\s*:\s*["']?)UNIT-([A-Za-z0-9._-]+)(["']?\s*(?:#.*)?)$/gm,
    (_, pre, body, post) => { modified++; return `${pre}ACTOR-${body}${post}`; },
  );
  return { content: result, modified, failed: 0, notes: [] };
}

// --- Detection C: UNIT / EMPLOYEE element files -----------------------------

function isRemovedTypeElement(content) {
  const m = content.match(/^id\s*:\s*["']?(UNIT|EMPLOYEE)-[A-Za-z0-9._-]+/m);
  return m ? m[1] : null;
}

// --- Transform D: PROJECT_CARD → ACTIVITY_CARD rename -----------------------
// Spec-level rename (no data migration). Rewrites a project-card document's
// notation header, root key, and doc-id prefix, and renames the file
// .project-card.transitrix.yaml → .activity-card.transitrix.yaml.

function renameActivityCard(content) {
  if (notationOf(content) !== 'project-card') return { content, modified: 0 };
  let n = 0;
  let c = content
    .replace(/^notation\s*:\s*project-card\b/m, m => (n++, 'notation: activity-card'))
    .replace(/^(\s*)project_card\s*:/m, (m, s) => (n++, `${s}activity_card:`))
    .replace(/\bPROJECT_CARD-/g, m => (n++, 'ACTIVITY_CARD-'));
  return { content: c, modified: n };
}

// --- Run --------------------------------------------------------------------

const transforms = [
  { key: 'A', label: 'activity ownership → owner: ACTOR-…', fn: collapseOwnership },
  { key: 'B', label: 'ROLE.unit → ACTOR(business_unit)', fn: retargetRoleUnit },
];

const files = walkYaml(target);
let totalModified = 0, totalFailed = 0;
const manualFiles = [];

for (const t of transforms) {
  let modified = 0, failed = 0;
  const touched = [];
  for (const f of files) {
    const original = readFileSync(f, 'utf8');
    const r = t.fn(original);
    if (r.notes?.length) r.notes.forEach(n => console.error(`  ! ${relative(target, f)}: ${n}`));
    failed += r.failed;
    if (r.modified > 0 && r.content !== original) {
      modified += r.modified;
      touched.push(`${relative(target, f)} (${r.modified})`);
      if (!dryRun) writeFileSync(f, r.content);
    }
  }
  console.log(`Transform ${t.key} — ${t.label}`);
  touched.forEach(x => console.log(`  ~ ${x}`));
  console.log(`  → ${modified} change(s)${dryRun ? ' (dry-run; no files written)' : ''}`);
  console.log('');
  totalModified += modified; totalFailed += failed;
}

// Transform D — PROJECT_CARD → ACTIVITY_CARD (content rewrite + file rename)
{
  let modified = 0;
  const touched = [];
  for (const f of files) {
    const original = readFileSync(f, 'utf8');
    const r = renameActivityCard(original);
    if (r.modified === 0) continue;
    modified += r.modified;
    let dest = f;
    if (basename(f).includes('project-card')) {
      dest = join(dirname(f), basename(f).replace('project-card', 'activity-card'));
    }
    touched.push(`${relative(target, f)}${dest !== f ? ` → ${relative(target, dest)}` : ''} (${r.modified})`);
    if (!dryRun) {
      writeFileSync(f, r.content);
      if (dest !== f) renameSync(f, dest);
    }
  }
  console.log('Transform D — PROJECT_CARD → ACTIVITY_CARD');
  touched.forEach(x => console.log(`  ~ ${x}`));
  console.log(`  → ${modified} change(s)${dryRun ? ' (dry-run; no files written)' : ''}`);
  console.log('');
  totalModified += modified;
}

// Detection C — UNIT / EMPLOYEE element files (manual)
for (const f of files) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; } // may have been renamed by D
  const kind = isRemovedTypeElement(content);
  if (kind) manualFiles.push({ f: relative(target, f), kind });
}

console.log('Summary:');
console.log(`  files scanned   ${files.length}`);
console.log(`  changes applied ${totalModified}${dryRun ? ' (dry-run)' : ''}`);
if (manualFiles.length) {
  console.error(`  MANUAL — ${manualFiles.length} removed-TYPE element file(s) need a manual move + split:`);
  for (const { f, kind } of manualFiles) {
    const how = kind === 'UNIT'
      ? 'move to canon/elements/02_business/actors/, set notation: actor + type: business_unit, rename UNIT-… → ACTOR-…'
      : 'split into ACTOR(type: person) + an employment REL (canon/relations/, type: employment) carrying the role assignments';
    console.error(`    ✗ ${f}  [${kind}]  → ${how}`);
  }
}
if (totalFailed > 0) console.error(`  flagged (manual collapse) ${totalFailed}`);
process.exit(manualFiles.length > 0 || totalFailed > 0 ? 1 : 0);
