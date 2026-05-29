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
//   3. capability ID canonical form (notations/IDS_AND_REFERENCES.md §6)
//      Walks <target>/canon/views/**/*.yaml and rewrites bare capability
//      IDs (V1 / V1.2 / H1) to canonical form (CAPABILITY-V1 etc.) plus
//      capability-map document IDs (CM-…) to CAPABILITY_MAP-…. Per-file
//      notation: header gate keeps the transform context-safe: only
//      capability-map / process-map / products / applications /
//      scenarios documents are touched.
//
//   4. goal `parent` → REL goal_parent extraction (notations/17-relations.md §6,
//      notations/04-goals.md "Time-aware relations")
//      Walks <target>/canon/views/**/*.yaml with notation: goals, finds
//      inline `parent: GOAL-…` on goal entries, drops the inline line,
//      and emits a `canon/relations/REL-GOAL-<from-hint>-PARENT-1.yaml`
//      REL primitive per dropped parent. valid_from / admitted_at on the
//      emitted REL inherit the host doc's date: (fallback "2024-01-01").
//
//   5. activity `goals: [GOAL-…]` → REL activity_goal extraction
//      (notations/17-relations.md §6, notations/07-activities.md "Time-aware
//      relations") Walks <target>/canon/views/**/*.yaml with notation:
//      activities, finds inline `goals: [GOAL-A, GOAL-B]` arrays on activity
//      entries, drops the inline line, and emits N REL files (one per goal)
//      under canon/relations/ with `type: activity_goal`. valid_from /
//      admitted_at on each emitted REL inherit the host doc's date:.
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

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

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

    const hasInlineValue = line.match(/^\s*applies_to\s*:\s*\S/);
    if (hasInlineValue) {
      removedBlockCount++;
      i++;
      continue;
    }

    const ownIndent = m[1].length;
    removedBlockCount++;
    i++;

    while (i < lines.length) {
      const next = lines[i];
      const trimmedEmpty = next.trim() === '';
      const nextIndent = next.match(/^(\s*)/)[1].length;

      if (trimmedEmpty) {
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
  if (/^\s*valid_from\s*:/m.test(content)) {
    return { content, modified: 0, bailed: false };
  }

  const lu = content.match(/^\s*last_updated\s*:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m);
  const validFrom = (lu ? lu[1].trim() : '2024-01-01');

  const block =
    '\n# Primitive lifecycle (CONTRACT.md §7) — backfilled by 0.4 → 0.5 migration\n' +
    `valid_from: "${validFrom}"\n` +
    'valid_to: null\n';

  const result = (content.endsWith('\n') ? content : content + '\n') + block;
  return { content: result, modified: 1, bailed: false };
}

// --- Transform 3: capability ID canonical form ------------------------------

const CAPABILITY_NOTATIONS = new Set([
  'capability-map',
  'process-map',
  'products',
  'applications',
  'scenarios',
]);

function capabilityIdCanonical(content) {
  // Per-file gate: only act on view documents that reference capabilities.
  // Outside these notations the bare V/H pattern would be a false positive.
  const notationMatch = content.match(/^notation\s*:\s*(\S+)/m);
  if (!notationMatch) return { content, modified: 0, bailed: false };
  if (!CAPABILITY_NOTATIONS.has(notationMatch[1])) return { content, modified: 0, bailed: false };

  const lines = content.split('\n');
  const out = [];
  let modified = 0;
  let inCapabilitiesBlock = null; // indent of the `capabilities:` line, or null

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineIndent = line.match(/^(\s*)/)[1].length;

    // Exit capabilities: block when indent returns to <= block-line indent.
    if (inCapabilitiesBlock !== null && line.trim() !== '' && lineIndent <= inCapabilitiesBlock) {
      inCapabilitiesBlock = null;
    }

    // Inside capabilities: block — rewrite bare V/H array entries.
    if (inCapabilitiesBlock !== null) {
      const arrEntry = line.match(/^(\s*-\s*)(["']?)([VH]\d+(?:\.\d+)*)\2(\s*(?:#.*)?)$/);
      if (arrEntry) {
        out.push(`${arrEntry[1]}${arrEntry[2]}CAPABILITY-${arrEntry[3]}${arrEntry[2]}${arrEntry[4]}`);
        modified++;
        continue;
      }
    }

    // Enter block-form `capabilities:` block.
    const capArrayHead = line.match(/^(\s*)capabilities\s*:\s*(?:#.*)?$/);
    if (capArrayHead) {
      inCapabilitiesBlock = capArrayHead[1].length;
      out.push(line);
      continue;
    }

    // Inline-array form: `capabilities: ["V1", "V2"]` → rewrite scalars inside.
    const capInlineArray = line.match(/^(\s*capabilities\s*:\s*\[)([^\]]*)(\]\s*(?:#.*)?)$/);
    if (capInlineArray) {
      const items = capInlineArray[2].split(',').map(s => s.trim()).filter(Boolean);
      let lineModified = 0;
      const rewritten = items.map(item => {
        const qm = item.match(/^(["']?)([VH]\d+(?:\.\d+)*)\1$/);
        if (qm) {
          lineModified++;
          return `${qm[1]}CAPABILITY-${qm[2]}${qm[1]}`;
        }
        return item;
      });
      if (lineModified > 0) {
        out.push(`${capInlineArray[1]}${rewritten.join(', ')}${capInlineArray[3]}`);
        modified += lineModified;
        continue;
      }
    }

    // Single-value: `id: V1` / `id: H1.2` / `id: "V1"` → CAPABILITY-…
    const idCH = line.match(/^(\s*-?\s*id\s*:\s*)(["']?)([VH]\d+(?:\.\d+)*)\2(\s*(?:#.*)?)$/);
    if (idCH) {
      out.push(`${idCH[1]}${idCH[2]}CAPABILITY-${idCH[3]}${idCH[2]}${idCH[4]}`);
      modified++;
      continue;
    }

    // Single-value: `id: CM-DOMAIN-NNN` → `CAPABILITY_MAP-DOMAIN-N`
    // The non-greedy middle capture pulls in multi-segment domains
    // (NB-RETAIL); the `-0*(\d+)` tail drops any zero-padding per IDS §1.
    const idCM = line.match(/^(\s*-?\s*id\s*:\s*)(["']?)CM-([A-Z][A-Z0-9_-]*?)-0*(\d+)\2(\s*(?:#.*)?)$/);
    if (idCM) {
      out.push(`${idCM[1]}${idCM[2]}CAPABILITY_MAP-${idCM[3]}-${idCM[4]}${idCM[2]}${idCM[5]}`);
      modified++;
      continue;
    }

    // Single-value: `capability: V1` (process-map cross-reference)
    const capCH = line.match(/^(\s*capability\s*:\s*)(["']?)([VH]\d+(?:\.\d+)*)\2(\s*(?:#.*)?)$/);
    if (capCH) {
      out.push(`${capCH[1]}${capCH[2]}CAPABILITY-${capCH[3]}${capCH[2]}${capCH[4]}`);
      modified++;
      continue;
    }

    out.push(line);
  }

  return { content: out.join('\n'), modified, bailed: false };
}

// --- Transform 4: goal `parent` → REL goal_parent extraction ----------------

const GOALS_NOTATIONS = new Set(['goals']);

function relGoalParentBody(relId, fromId, toId, validFrom) {
  return [
    'notation: relation',
    `id: ${relId}`,
    'type: goal_parent',
    `from: ${fromId}`,
    `to: ${toId}`,
    '',
    '# Admission record (CONTRACT.md §6) — emitted by 0.4 → 0.5 migration codemod.',
    '# admitted_by is a placeholder marker — adopters should replace with the',
    '# operator handle once the REL has been reviewed in their canon.',
    'zone: canon',
    `admitted_at: "${validFrom}"`,
    'admitted_by: "migration-codemod-0.4-to-0.5"',
    'gate_checks:',
    '  uniqueness: pass',
    '  consistency: pass',
    '  completeness: pass',
    '',
    '# Primitive lifecycle (CONTRACT.md §7) — inherits the host doc date as a',
    '# sensible epoch. Adopters should adjust if the parent link in fact took',
    '# effect on a different date than the host doc.',
    `valid_from: "${validFrom}"`,
    'valid_to: null',
    '',
  ].join('\n');
}

function goalParentToRel(content) {
  const notationMatch = content.match(/^notation\s*:\s*(\S+)/m);
  if (!notationMatch) return { content, modified: 0, bailed: false };
  if (!GOALS_NOTATIONS.has(notationMatch[1])) return { content, modified: 0, bailed: false };

  // Host doc's date: drives the emitted REL's valid_from / admitted_at.
  // Falls back to the same epoch as Transform 2 when the doc has no date.
  const dateMatch = content.match(/^date\s*:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m);
  const validFrom = dateMatch ? dateMatch[1].trim() : '2024-01-01';

  const lines = content.split('\n');
  const out = [];
  const emits = [];
  let modified = 0;
  let inGoalsBlock = null;     // indent of the document-root `goals:` line, or null
  let currentGoalId = null;    // most recently seen goal entry id inside the block

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.match(/^(\s*)/)[1].length;

    // Exit the goals: block when indent returns to <= block-line indent.
    if (inGoalsBlock !== null && trimmed !== '' && indent <= inGoalsBlock) {
      inGoalsBlock = null;
      currentGoalId = null;
    }

    // Outside any goals: block — only watch for the head and pass everything through.
    if (inGoalsBlock === null) {
      const head = line.match(/^(\s*)goals\s*:\s*(?:#.*)?$/);
      if (head) inGoalsBlock = head[1].length;
      out.push(line);
      continue;
    }

    // Inside the goals: block. A new entry starts with `- id: GOAL-…`.
    const dashId = line.match(/^\s*-\s+id\s*:\s*["']?(GOAL-\S+?)["']?\s*(?:#.*)?$/);
    if (dashId) {
      currentGoalId = dashId[1];
      out.push(line);
      continue;
    }

    // Inline parent on the current goal entry — drop the line, queue a REL emit.
    if (currentGoalId !== null) {
      const parentMatch = line.match(/^\s*parent\s*:\s*["']?(GOAL-\S+?)["']?\s*(?:#.*)?$/);
      if (parentMatch) {
        const fromId = currentGoalId;
        const toId = parentMatch[1];
        const fromHint = fromId.replace(/^GOAL-/, '');
        const relId = `REL-GOAL-${fromHint}-PARENT-1`;
        const relPath = `canon/relations/${relId}.yaml`;
        emits.push({ path: relPath, content: relGoalParentBody(relId, fromId, toId, validFrom) });
        modified++;
        continue; // drop the inline parent: line
      }
    }

    out.push(line);
  }

  return { content: out.join('\n'), modified, bailed: false, emits };
}

// --- Transform 5: activity `goals[]` → REL activity_goal extraction ---------

const ACTIVITIES_NOTATIONS = new Set(['activities']);

function relActivityGoalBody(relId, fromId, toId, validFrom) {
  return [
    'notation: relation',
    `id: ${relId}`,
    'type: activity_goal',
    `from: ${fromId}`,
    `to: ${toId}`,
    '',
    '# Admission record (CONTRACT.md §6) — emitted by 0.4 → 0.5 migration codemod.',
    '# admitted_by is a placeholder marker — adopters should replace with the',
    '# operator handle once the REL has been reviewed in their canon.',
    'zone: canon',
    `admitted_at: "${validFrom}"`,
    'admitted_by: "migration-codemod-0.4-to-0.5"',
    'gate_checks:',
    '  uniqueness: pass',
    '  consistency: pass',
    '  completeness: pass',
    '',
    '# Primitive lifecycle (CONTRACT.md §7) — inherits the host doc date as a',
    '# sensible epoch. Adopters should adjust if the link in fact took effect',
    '# on a different date than the host doc.',
    `valid_from: "${validFrom}"`,
    'valid_to: null',
    '',
  ].join('\n');
}

function activityGoalsToRel(content) {
  const notationMatch = content.match(/^notation\s*:\s*(\S+)/m);
  if (!notationMatch) return { content, modified: 0, bailed: false };
  if (!ACTIVITIES_NOTATIONS.has(notationMatch[1])) return { content, modified: 0, bailed: false };

  const dateMatch = content.match(/^date\s*:\s*["']?([^"'\n#]+?)["']?\s*(?:#.*)?$/m);
  const validFrom = dateMatch ? dateMatch[1].trim() : '2024-01-01';

  const lines = content.split('\n');
  const out = [];
  const emits = [];
  let modified = 0;
  let inActivitiesBlock = null;
  let currentActivityId = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.match(/^(\s*)/)[1].length;

    if (inActivitiesBlock !== null && trimmed !== '' && indent <= inActivitiesBlock) {
      inActivitiesBlock = null;
      currentActivityId = null;
    }

    if (inActivitiesBlock === null) {
      const head = line.match(/^(\s*)activities\s*:\s*(?:#.*)?$/);
      if (head) inActivitiesBlock = head[1].length;
      out.push(line);
      continue;
    }

    // New activity entry — `- id: <X>` (activity IDs may carry any prefix:
    // A-001, PHASE-DESIGN, M-LAUNCH; opaque token, preserved as-is).
    const dashId = line.match(/^\s*-\s+id\s*:\s*["']?(\S+?)["']?\s*(?:#.*)?$/);
    if (dashId) {
      currentActivityId = dashId[1];
      out.push(line);
      continue;
    }

    // Inline `goals: [GOAL-A, GOAL-B]` on the current activity entry — extract.
    if (currentActivityId !== null) {
      const goalsInline = line.match(/^\s*goals\s*:\s*\[([^\]]*)\]\s*(?:#.*)?$/);
      if (goalsInline) {
        const items = goalsInline[1]
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        const goalIds = items.filter(it => /^GOAL-\S+$/.test(it));
        if (goalIds.length === 0) {
          // No GOAL- IDs in the array — leave line alone.
          out.push(line);
          continue;
        }
        for (const toId of goalIds) {
          const goalTail = toId.replace(/^GOAL-/, '');
          const relId = `REL-${currentActivityId}-GOAL-${goalTail}-1`;
          const relPath = `canon/relations/${relId}.yaml`;
          emits.push({ path: relPath, content: relActivityGoalBody(relId, currentActivityId, toId, validFrom) });
        }
        modified += goalIds.length;
        continue; // drop the inline goals: line
      }
    }

    out.push(line);
  }

  return { content: out.join('\n'), modified, bailed: false, emits };
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
  {
    name: 'capability ID canonical form',
    rootName: 'canon/views',
    fn: capabilityIdCanonical,
    unit: 'capability id rewritten',
    units: 'capability ids rewritten',
  },
  {
    name: 'goal parent → REL goal_parent extraction',
    rootName: 'canon/views',
    fn: goalParentToRel,
    unit: 'inline parent extracted',
    units: 'inline parents extracted',
  },
  {
    name: 'activity goals → REL activity_goal extraction',
    rootName: 'canon/views',
    fn: activityGoalsToRel,
    unit: 'inline goal link extracted',
    units: 'inline goal links extracted',
  },
];

// --- Run --------------------------------------------------------------------

let totalScanned = 0;
let totalModified = 0;
let totalEmitted = 0;
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
  let emitted = 0;
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

    // Emit any auxiliary files the transform produced (e.g. REL primitives).
    // Skip silently on byte-equal existing files (idempotency); bail loudly
    // on byte-different existing files (adopter manually edited — codemod
    // refuses to overwrite).
    const emits = result.emits ?? [];
    let conflict = false;
    for (const e of emits) {
      const abs = join(target, e.path);
      if (existsSync(abs)) {
        const existing = readFileSync(abs, 'utf8');
        if (existing !== e.content) {
          console.error(`  ! ${relative(target, file)}: would emit ${e.path} but a different version already exists — bailing`);
          conflict = true;
          break;
        }
      }
    }
    if (conflict) { failed++; continue; }

    if (!dryRun) {
      writeFileSync(file, result.content);
      for (const e of emits) {
        const abs = join(target, e.path);
        if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, e.content);
      }
    }
    modified++;
    emitted += emits.length;
    units += result.modified;
    const u = result.modified === 1 ? t.unit : t.units;
    const emitNote = emits.length > 0 ? `, emitted ${emits.length} file(s)` : '';
    console.log(`  ${dryRun ? '[dry-run] ' : ''}~ ${relative(target, file)}: ${result.modified} ${u}${emitNote}`);
  }

  const emitSummary = emitted > 0 ? `, ${emitted} file(s) emitted` : '';
  console.log(`  → ${modified} file(s) modified${emitSummary}, ${units} ${units === 1 ? t.unit : t.units}${dryRun ? ' (dry-run; no files written)' : ''}`);
  console.log('');

  totalScanned += files.length;
  totalModified += modified;
  totalEmitted += emitted;
  totalUnits += units;
  totalFailed += failed;
}

// --- Overall summary --------------------------------------------------------

console.log(`Summary across ${transforms.length} transform(s):`);
console.log(`  files scanned     ${totalScanned}`);
console.log(`  files modified    ${totalModified}${dryRun ? ' (dry-run)' : ''}`);
if (totalEmitted > 0) console.log(`  files emitted     ${totalEmitted}${dryRun ? ' (dry-run)' : ''}`);
console.log(`  units applied     ${totalUnits}`);
if (totalFailed > 0) {
  console.error(`  files skipped     ${totalFailed}`);
  process.exit(1);
}
process.exit(0);
