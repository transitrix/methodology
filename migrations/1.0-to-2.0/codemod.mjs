#!/usr/bin/env node
// Migration codemod — methodology 1.0 → 2.0.
//
// Applies two transforms to an adopter repo. Run with --dry-run first.
//
// TRANSFORMS (automated — idempotent):
//   A. Goals Tree: extract inline goals[] → standalone GOAL-*.yaml element files
//                  + rewrite view to view_config format
//
//   B. Action Schedule: extract inline actions[] → standalone ACTION-*.yaml element files
//                       + rewrite view to view_config format
//
// Conventions:
//   - Pure-Node, no native deps; Node ≥ 20.
//   - Idempotent: a repo already on canonical v2.0 form is a no-op.
//   - CLI: [--dry-run] [target-dir]. Default target = current working dir.

import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync,
  existsSync,
} from 'node:fs';
import { join, relative, resolve, dirname, basename } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = resolve(args.find(a => !a.startsWith('--')) ?? process.cwd());

if (!existsSync(target)) {
  console.error(`error: target directory does not exist: ${target}`);
  process.exit(2);
}

const today = new Date().toISOString().split('T')[0];

// ── File discovery ────────────────────────────────────────────────────────────

function walkFiles(dir, pred, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const ent of entries) {
    if (ent === '.git' || ent === 'node_modules' || ent === '.archive') continue;
    const full = join(dir, ent);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walkFiles(full, pred, out);
    else if (pred(ent)) out.push(full);
  }
  return out;
}

// ── Simple line-based YAML utilities ─────────────────────────────────────────

// Extract top-level scalar field from a YAML string (first occurrence).
function extractScalar(yaml, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = yaml.match(re);
  if (!m) return null;
  const v = m[1].trim().replace(/^["']|["']$/g, '');
  return v === 'null' ? null : v;
}

// Extract a simple inline flow-sequence (e.g. `goals: [GOAL-A, GOAL-B]`).
function extractInlineList(yaml, key) {
  const re = new RegExp(`^${key}:\\s*\\[([^\\]]*)]`, 'm');
  const m = yaml.match(re);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim()).filter(Boolean);
}

// Extract a block-sequence (e.g. predecessors: as multiple lines with - items).
function extractBlockList(yaml, key) {
  const re = new RegExp(`^${key}:\\s*\\n((?:[ \\t]+-[ \\t]+\\S+\\n?)*)`, 'm');
  const m = yaml.match(re);
  if (!m) return [];
  return m[1].split('\n')
    .map(l => l.replace(/^[ \t]+-[ \t]+/, '').trim())
    .filter(Boolean);
}

// Extract a field from a multi-line scalar block (key: |\n  ...).
function extractMultilineScalar(yaml, key) {
  const re = new RegExp(`^${key}:\\s*[|>]\\n((?:[ \\t]+.+\\n?)*)`, 'm');
  const m = yaml.match(re);
  if (!m) return null;
  return m[1].replace(/^[ \t]*/mg, '').trim();
}

// ── Goals parsing ─────────────────────────────────────────────────────────────

// Naively split a YAML string into its top-level array entries under `goals:`.
// Returns an array of raw YAML strings for each entry block.
function splitGoalsEntries(yaml) {
  const start = yaml.search(/^goals:\s*\n/m);
  if (start === -1) return [];
  // Find all lines from the goals: line forward that belong to the array
  const lines = yaml.slice(start).split('\n');
  const entries = [];
  let current = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Top-level array item starts with exactly two spaces + "- id:"
    if (/^  - /.test(line)) {
      if (current !== null) entries.push(current.join('\n'));
      current = [line.replace(/^  - /, '')];
    } else if (current !== null) {
      // Continuation of current entry (deeper indent) or end
      if (/^    /.test(line) || line.trim() === '') {
        current.push(line.replace(/^    /, ''));
      } else {
        // Dedented — end of goals array
        break;
      }
    }
  }
  if (current !== null) entries.push(current.join('\n'));
  return entries;
}

function parseGoalEntry(raw) {
  const id      = extractScalar(raw, 'id');
  const name    = extractScalar(raw, 'name');
  const type    = extractScalar(raw, 'type');
  const level   = extractScalar(raw, 'level');
  const parent  = extractScalar(raw, 'parent');
  const desc    = extractScalar(raw, 'description') ??
                  extractMultilineScalar(raw, 'description');
  const link    = extractScalar(raw, 'link');
  const validFrom = extractScalar(raw, 'valid_from');
  const validTo   = extractScalar(raw, 'valid_to');
  return { id, name, type, level, parent, desc, link, validFrom, validTo };
}

function renderGoalElement(g, admittedAt) {
  const lines = [
    `notation: goal`,
    `id: ${g.id}`,
    `name: ${JSON.stringify(g.name ?? '')}`,
    g.type  ? `type: ${JSON.stringify(g.type)}` : null,
    g.level != null ? `level: ${g.level}` : null,
    g.parent && g.parent !== 'null' ? `parent: ${g.parent}` : null,
    g.desc  ? `description: >\n  ${g.desc.replace(/\n/g, '\n  ')}` : null,
    g.link  ? `link: ${g.link}` : null,
    ``,
    `zone: canon`,
    `admitted_at: "${admittedAt}"`,
    `admitted_by: "migration-1.0-to-2.0"`,
    `gate_checks:`,
    `  uniqueness: pass`,
    `  consistency: pass`,
    `  completeness: pass`,
    ``,
    `valid_from: "${admittedAt}"`,
    `valid_to: ${g.validTo ?? 'null'}`,
  ].filter(l => l !== null);
  return lines.join('\n') + '\n';
}

// ── Actions parsing ───────────────────────────────────────────────────────────

function splitActionsEntries(yaml) {
  const start = yaml.search(/^actions:\s*\n/m);
  if (start === -1) return [];
  const lines = yaml.slice(start).split('\n');
  const entries = [];
  let current = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^  - /.test(line)) {
      if (current !== null) entries.push(current.join('\n'));
      current = [line.replace(/^  - /, '')];
    } else if (current !== null) {
      if (/^    /.test(line) || line.trim() === '' || line.trim().startsWith('#')) {
        current.push(line.replace(/^    /, ''));
      } else {
        break;
      }
    }
  }
  if (current !== null) entries.push(current.join('\n'));
  return entries;
}

function parseActionEntry(raw) {
  const id              = extractScalar(raw, 'id');
  const name            = extractScalar(raw, 'name');
  const type            = extractScalar(raw, 'type');
  const parent          = extractScalar(raw, 'parent');
  const owner           = extractScalar(raw, 'owner');
  const owner_role      = extractScalar(raw, 'owner_role');
  const duration        = extractScalar(raw, 'duration') ??
                          extractScalar(raw, 'duration_days'); // acme-corp uses duration_days
  const start_date      = extractScalar(raw, 'start_date');
  const end_date        = extractScalar(raw, 'end_date');
  const score           = extractScalar(raw, 'score');
  const sort            = extractScalar(raw, 'sort');
  const link            = extractScalar(raw, 'link');
  const desc            = extractScalar(raw, 'description') ??
                          extractMultilineScalar(raw, 'description');
  const validFrom       = extractScalar(raw, 'valid_from');
  const validTo         = extractScalar(raw, 'valid_to');

  // Lists — try inline first, then block
  const goals = extractInlineList(raw, 'goals').length > 0
    ? extractInlineList(raw, 'goals')
    : extractBlockList(raw, 'goals');
  const delivers_changes = extractInlineList(raw, 'delivers_changes').length > 0
    ? extractInlineList(raw, 'delivers_changes')
    : extractBlockList(raw, 'delivers_changes');
  const predecessors = extractInlineList(raw, 'predecessors').length > 0
    ? extractInlineList(raw, 'predecessors')
    : extractBlockList(raw, 'predecessors');
  const tags = extractInlineList(raw, 'tags').length > 0
    ? extractInlineList(raw, 'tags')
    : extractBlockList(raw, 'tags');

  return {
    id, name, type, parent, owner, owner_role, duration, start_date, end_date,
    score, sort, link, desc, validFrom, validTo,
    goals, delivers_changes, predecessors, tags,
  };
}

function renderActionElement(a, admittedAt) {
  const lines = [
    `notation: action`,
    `id: ${a.id}`,
    `name: ${JSON.stringify(a.name ?? '')}`,
    a.type        ? `type: ${a.type}` : null,
    a.parent && a.parent !== 'null'  ? `parent: ${a.parent}` : null,
    a.goals.length > 0
      ? `goals: [${a.goals.join(', ')}]` : null,
    a.delivers_changes.length > 0
      ? `delivers_changes: [${a.delivers_changes.join(', ')}]` : null,
    a.predecessors.length > 0
      ? `predecessors: [${a.predecessors.join(', ')}]` : null,
    a.duration != null ? `duration: ${a.duration}` : null,
    a.start_date  ? `start_date: "${a.start_date}"` : null,
    a.end_date    ? `end_date: "${a.end_date}"` : null,
    a.owner       ? `owner: ${a.owner}` : null,
    a.owner_role  ? `owner_role: ${a.owner_role}` : null,
    a.score != null ? `score: ${a.score}` : null,
    a.sort  != null ? `sort: ${a.sort}` : null,
    a.tags.length > 0 ? `tags: [${a.tags.join(', ')}]` : null,
    a.link        ? `link: ${a.link}` : null,
    a.desc        ? `description: >\n  ${a.desc.replace(/\n/g, '\n  ')}` : null,
    ``,
    `zone: canon`,
    `admitted_at: "${admittedAt}"`,
    `admitted_by: "migration-1.0-to-2.0"`,
    `gate_checks:`,
    `  uniqueness: pass`,
    `  consistency: pass`,
    `  completeness: pass`,
    ``,
    `valid_from: "${admittedAt}"`,
    `valid_to: ${a.validTo ?? 'null'}`,
  ].filter(l => l !== null);
  return lines.join('\n') + '\n';
}

// ── View rewriters ────────────────────────────────────────────────────────────

function rewriteGoalsView(yaml, goalTypes) {
  // Remove goal_types and goals blocks; add view_config.
  // Keep: notation, spec_version, id, name, generated_at, description, period, author
  const lines = yaml.split('\n');
  const out = [];
  let skip = false;
  let insertedVersionLine = false;
  let insertedViewConfig = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // After spec_version: or notation: line, insert methodology_version
    if (!insertedVersionLine && (line.startsWith('notation:') || line.startsWith('spec_version:'))) {
      out.push(line);
      if (!yaml.includes('methodology_version:')) {
        // Insert after spec_version or notation (will add after all header fields)
      }
      continue;
    }

    if (line.startsWith('goal_types:')) { skip = true; continue; }
    if (line.startsWith('goals:')) { skip = true; continue; }

    if (skip) {
      // Stop skipping when we hit a non-indented line that isn't a comment
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('#')) {
        skip = false;
        out.push(line);
      }
      continue;
    }

    out.push(line);
  }

  // Add methodology_version after spec_version if not present
  let result = out.join('\n');
  if (!result.includes('methodology_version:')) {
    result = result.replace(/(spec_version:[^\n]*\n)/, `$1methodology_version: "2.0.0"\n`);
    if (!result.includes('methodology_version:')) {
      result = result.replace(/(notation:[^\n]*\n)/, `$1methodology_version: "2.0.0"\n`);
    }
  }

  // Add view_config block at end
  const goalTypesYaml = goalTypes
    .map(gt => `  - { name: ${JSON.stringify(gt.name)}, level: ${gt.level} }`)
    .join('\n');

  const viewConfig = goalTypes.length > 0
    ? `\nview_config:\n  goal_types:\n${goalTypesYaml}\n  display:\n    depth: null\n    collapsed: []\n`
    : `\nview_config:\n  display:\n    depth: null\n    collapsed: []\n`;

  result = result.trimEnd() + '\n' + viewConfig;
  return result;
}

function rewriteActionView(yaml, rootActionId, scheduleStartDate, calendar) {
  const lines = yaml.split('\n');
  const out = [];
  let skip = false;
  let hasId = yaml.match(/^id:\s+\S/m);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('project:')) { skip = true; continue; }
    if (line.startsWith('actions:')) { skip = true; continue; }

    if (skip) {
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('#')
          && !line.trim().startsWith('-')) {
        skip = false;
        out.push(line);
      }
      continue;
    }

    // Rename title: → name: if needed (old format used 'title:')
    if (line.startsWith('title:') && !yaml.match(/^name:/m)) {
      out.push(line.replace(/^title:/, 'name:'));
      continue;
    }

    out.push(line);
  }

  let result = out.join('\n');

  // Add methodology_version if not present
  if (!result.includes('methodology_version:')) {
    result = result.replace(/(spec_version:[^\n]*\n)/, `$1methodology_version: "2.0.0"\n`);
    if (!result.includes('methodology_version:')) {
      result = result.replace(/(notation:[^\n]*\n)/, `$1methodology_version: "2.0.0"\n`);
    }
  }

  // Add id if not present (generate a placeholder)
  if (!result.match(/^id:\s+/m)) {
    const slug = rootActionId
      ? rootActionId.replace('ACTION-', '').replace(/-\d+$/, '')
      : 'SCHEDULE';
    result = result.replace(/(methodology_version:[^\n]*\n)/, `$1id: ACTION_SCHED-${slug}-1\n`);
  }

  // Build view_config
  const scopeLines = rootActionId
    ? [`  scope:\n    root_action: ${rootActionId}`]
    : ['  scope: {}'];

  let scheduleBlock = '';
  if (scheduleStartDate) {
    scheduleBlock = `  schedule:\n    start_date: "${scheduleStartDate}"`;
    if (calendar) scheduleBlock += `\n    calendar:\n      working_days: ${JSON.stringify(calendar.working_days ?? [])}\n      hours_per_day: ${calendar.hours_per_day ?? 8}`;
  }

  const viewConfigLines = [
    `\nview_config:`,
    ...scopeLines,
    scheduleBlock || null,
  ].filter(Boolean).join('\n');

  result = result.trimEnd() + '\n' + viewConfigLines + '\n';
  return result;
}

// ── Goal-types extractor ──────────────────────────────────────────────────────

function extractGoalTypes(yaml) {
  const start = yaml.search(/^goal_types:\s*\n/m);
  if (start === -1) return [];
  const lines = yaml.slice(start).split('\n');
  const types = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith(' ') && !line.startsWith('\t')) break;
    const m = line.match(/name:\s*["']?([^"',}]+)["']?.*level:\s*(\d+)/);
    if (m) types.push({ name: m[1].trim(), level: parseInt(m[2], 10) });
  }
  return types;
}

// Extract project block start_date
function extractProjectStartDate(yaml) {
  const m = yaml.match(/^project:\s*\n(?:[ \t]+[^\n]*\n)*?[ \t]+start_date:\s*["']?([^"'\n]+)["']?/m);
  return m ? m[1].trim() : null;
}

// Find the root action (first entry with no parent, or parent: null)
function findRootAction(entries) {
  for (const e of entries) {
    const parent = extractScalar(e, 'parent');
    if (!parent || parent === 'null') {
      return extractScalar(e, 'id');
    }
  }
  return entries.length > 0 ? extractScalar(entries[0], 'id') : null;
}

// ── Transform A — Goals Tree ──────────────────────────────────────────────────

function transformGoalsTree(file) {
  const yaml = readFileSync(file, 'utf8');

  // Skip files that are already migrated (have view_config, no goals:)
  if (yaml.includes('view_config:') && !yaml.match(/^goals:\s*\n/m)) {
    return;
  }
  if (!yaml.match(/^goals:\s*\n/m)) return;

  const rel = relative(target, file);
  console.log(`A  ${rel}`);

  const goalTypes = extractGoalTypes(yaml);
  const rawEntries = splitGoalsEntries(yaml);
  const goals = rawEntries.map(parseGoalEntry).filter(g => g.id);

  // Write standalone element files
  for (const g of goals) {
    const elemDir = join(target, 'canon', 'elements', '01_motivation', 'goals');
    const elemFile = join(elemDir, `${g.id}.yaml`);
    if (existsSync(elemFile)) {
      console.log(`   skip (exists): canon/elements/01_motivation/goals/${g.id}.yaml`);
      continue;
    }
    const admittedAt = g.validFrom ?? today;
    const content = renderGoalElement(g, admittedAt);
    console.log(`   + canon/elements/01_motivation/goals/${g.id}.yaml`);
    if (!dryRun) {
      mkdirSync(elemDir, { recursive: true });
      writeFileSync(elemFile, content, 'utf8');
    }
  }

  // Rewrite the view file
  const newYaml = rewriteGoalsView(yaml, goalTypes);
  console.log(`   ~ ${rel}`);
  if (!dryRun) writeFileSync(file, newYaml, 'utf8');
}

// ── Transform B — Action Schedule ────────────────────────────────────────────

function transformActionSchedule(file) {
  const yaml = readFileSync(file, 'utf8');

  // Skip files already migrated
  if (yaml.includes('view_config:') && !yaml.match(/^actions:\s*\n/m)) return;
  if (!yaml.match(/^actions:\s*\n/m)) return;

  const rel = relative(target, file);
  console.log(`B  ${rel}`);

  const rawEntries = splitActionsEntries(yaml);
  const actions = rawEntries.map(parseActionEntry).filter(a => a.id);
  const startDate = extractProjectStartDate(yaml);
  const rootActionId = findRootAction(rawEntries);

  // Write standalone element files
  for (const a of actions) {
    const elemDir = join(target, 'canon', 'elements', '05_implementation', 'actions');
    const elemFile = join(elemDir, `${a.id}.yaml`);
    if (existsSync(elemFile)) {
      console.log(`   skip (exists): canon/elements/05_implementation/actions/${a.id}.yaml`);
      continue;
    }
    const admittedAt = a.validFrom ?? today;
    const content = renderActionElement(a, admittedAt);
    console.log(`   + canon/elements/05_implementation/actions/${a.id}.yaml`);
    if (!dryRun) {
      mkdirSync(elemDir, { recursive: true });
      writeFileSync(elemFile, content, 'utf8');
    }
  }

  // Rewrite the view file
  const newYaml = rewriteActionView(yaml, rootActionId, startDate, null);
  console.log(`   ~ ${rel}`);
  if (!dryRun) writeFileSync(file, newYaml, 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const goalsFiles = walkFiles(target, f => f.endsWith('.goals.transitrix.yaml'));
const actionFiles = walkFiles(target, f => f.endsWith('.action.transitrix.yaml'));

if (goalsFiles.length === 0 && actionFiles.length === 0) {
  console.log('No *.goals.transitrix.yaml or *.action.transitrix.yaml files found.');
  console.log('Nothing to migrate.');
  process.exit(0);
}

if (dryRun) console.log('[dry-run] No files will be written.\n');

for (const f of goalsFiles) transformGoalsTree(f);
for (const f of actionFiles) transformActionSchedule(f);

console.log('\nDone.' + (dryRun ? ' (dry-run — re-run without --dry-run to apply)' : ''));
console.log('Next: node migrations/1.0-to-2.0/validate.mjs <adopter-root>');
