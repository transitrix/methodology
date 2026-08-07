#!/usr/bin/env node
// Unit + fixture tests for src/evaluate.mjs — the document-view engine's
// derived-content evaluation: inline field access with traversal, `each`
// selection (§2's "Inline" and "Selection" forms), and the `trace` matrix
// (§2's "Trace matrix").
//
// Run: node packages/document-view-engine/tests/test_evaluate.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEvaluator, typeOfId } from '../src/evaluate.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function checkEqual(actual, expected, msg) {
  if (actual !== expected) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// ── Pure ──────────────────────────────────────────────────────────────────

checkEqual(typeOfId('REQUIREMENT-BACKUP-POWER-1'), 'REQUIREMENT', 'typeOfId splits at the first hyphen');
checkEqual(typeOfId('TECHNOLOGY_SERVICE-1'), 'TECHNOLOGY_SERVICE', 'typeOfId keeps an underscore-joined TYPE intact');
checkEqual(typeOfId('CAPABILITY-V1.2'), 'CAPABILITY', 'typeOfId recognises the CAPABILITY V/H diagram-address form');

// ── Fixture — a small canon exercising traversal + selection ──────────────

function writeYaml(dir, name, lines) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), lines.join('\n') + '\n', 'utf8');
}

async function run() {
  const orgRoot = mkdtempSync(join(tmpdir(), 'evaluate-'));
  const canonRoot = join(orgRoot, 'canon');
  const reqDir = join(canonRoot, 'elements', '01_motivation', 'requirements');

  writeYaml(reqDir, 'REQUIREMENT-PARENT-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-PARENT-1',
    'name: "Parent requirement"', 'level: system', 'kind: functional',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-CHILD-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-CHILD-1',
    'name: "Child requirement"', 'parent: REQUIREMENT-PARENT-1',
    'level: system', 'kind: functional',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-BROKEN-PARENT-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-BROKEN-PARENT-1',
    'name: "Points at nothing"', 'parent: REQUIREMENT-GHOST-1',
    'level: system', 'kind: functional',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-DRAFT-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-DRAFT-1',
    'name: "Still a draft"', 'level: system', 'kind: functional',
    'admission_state: proposed', 'zone: canon', 'valid_from: "2026-01-01"', 'valid_to: null',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-EXPIRED-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-EXPIRED-1',
    'name: "Retired"', 'level: system', 'kind: functional',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: "2021-01-01"',
  ]);
  writeYaml(reqDir, 'REQUIREMENT-HARDWARE-1.yaml', [
    'notation: requirement', 'id: REQUIREMENT-HARDWARE-1',
    'name: "Wrong kind for the each fixture"', 'level: system', 'kind: hardware',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);

  // ── Trace matrix fixtures ──
  // Claim-record path: VERIFICATION.verifies → REQUIREMENT, the epic's own
  // example. REQUIREMENT-PARENT-1 gets a verification; REQUIREMENT-CHILD-1,
  // -BROKEN-PARENT-1 and -HARDWARE-1 (all still 'ok' at renderDate) stay
  // uncovered rows on purpose.
  writeYaml(join(canonRoot, 'verifications'), 'VERIFICATION-PARENT-CHECK-1.yaml', [
    'notation: verification', 'id: VERIFICATION-PARENT-CHECK-1',
    'verifies: REQUIREMENT-PARENT-1', 'method: test', 'outcome: pass',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);

  // First-class REL path: a `parent` relation between two CAPABILITY
  // elements — also exercises typeOfId()'s CAPABILITY V/H prefix case.
  // CAPABILITY-V2 carries no relation, an uncovered row on purpose.
  const capDir = join(canonRoot, 'elements', '03_capabilities');
  writeYaml(capDir, 'CAPABILITY-V1.yaml', [
    'notation: capability', 'id: CAPABILITY-V1', 'name: "Root capability"',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(capDir, 'CAPABILITY-V1.1.yaml', [
    'notation: capability', 'id: CAPABILITY-V1.1', 'name: "Child capability"',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(capDir, 'CAPABILITY-V2.yaml', [
    'notation: capability', 'id: CAPABILITY-V2', 'name: "Unrelated capability"',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);
  writeYaml(join(canonRoot, 'relations'), 'REL-CAP-V1-PARENT-1.yaml', [
    'notation: relation', 'id: REL-CAP-V1-PARENT-1', 'type: parent',
    'from: CAPABILITY-V1.1', 'to: CAPABILITY-V1',
    'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
  ]);

  const evaluator = await createEvaluator(canonRoot);
  const renderDate = '2026-08-06';

  // ── Inline field access ──
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-PARENT-1', ['name'], { renderDate });
    checkEqual(r.state, 'ok', 'a plain field access on an in-effect element resolves ok');
    checkEqual(r.content, 'Parent requirement', 'the field value is unquoted and returned');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-CHILD-1', [], { renderDate });
    checkEqual(r.state, 'ok', 'a bare id (fields.length===0) resolves ok when the id itself resolves');
    checkEqual(r.content, 'REQUIREMENT-CHILD-1', 'a bare id renders its own id as a neutral placeholder (no per-type default rendering, out of scope)');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-CHILD-1', ['parent', 'name'], { renderDate });
    checkEqual(r.state, 'ok', 'traversal through a reference field resolves ok when every hop resolves ok');
    checkEqual(r.content, 'Parent requirement', 'traversal renders the terminal field on the final hop');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-BROKEN-PARENT-1', ['parent', 'name'], { renderDate });
    checkEqual(r.state, 'unresolved', 'a traversal hop pointing at a nonexistent id flags the whole chain unresolved');
    checkEqual(r.flag, '⚑U', 'the unresolved flag glyph is ⚑U');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-DOES-NOT-EXIST-1', ['name'], { renderDate });
    checkEqual(r.state, 'unresolved', 'a nonexistent base id is unresolved');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-DRAFT-1', ['name'], { renderDate });
    checkEqual(r.state, 'not-admitted', 'a proposed draft is not-admitted, per §3');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-EXPIRED-1', ['name'], { renderDate });
    checkEqual(r.state, 'out-of-validity', 'a render date past valid_to is out-of-validity, per §3');
  }
  {
    const r = await evaluator.evaluateFieldPath('REQUIREMENT-PARENT-1', ['nonexistent_field'], { renderDate });
    checkEqual(r.state, 'ok', 'a missing terminal field is not a §3 state — the reference itself still resolves');
    checkEqual(r.content, '', 'a missing terminal field renders empty content');
  }

  // ── Each selection ──
  {
    const rows = await evaluator.evaluateEach(
      { entityType: 'REQUIREMENT', where: [{ field: 'level', op: '=', value: 'system' }, { field: 'kind', op: '=', value: 'functional' }], orderBy: 'id' },
      { renderDate },
    );
    checkEqual(
      JSON.stringify(rows),
      JSON.stringify(['REQUIREMENT-BROKEN-PARENT-1', 'REQUIREMENT-CHILD-1', 'REQUIREMENT-PARENT-1']),
      'each selects matching, admitted, in-effect rows, ordered by id — excludes wrong kind, draft, and expired',
    );
  }
  {
    const rows = await evaluator.evaluateEach(
      { entityType: 'REQUIREMENT', where: [{ field: 'kind', op: '!=', value: 'functional' }], orderBy: null },
      { renderDate },
    );
    checkEqual(JSON.stringify(rows), JSON.stringify(['REQUIREMENT-HARDWARE-1']), '"!=" excludes the matching value and selects the rest');
  }

  // ── Trace matrix ──
  {
    const matrix = await evaluator.evaluateTrace({ from: 'REQUIREMENT', to: 'VERIFICATION', via: 'verifies' }, { renderDate });
    checkEqual(
      JSON.stringify(matrix.rows),
      JSON.stringify(['REQUIREMENT-BROKEN-PARENT-1', 'REQUIREMENT-CHILD-1', 'REQUIREMENT-HARDWARE-1', 'REQUIREMENT-PARENT-1']),
      'trace: rows are every "ok" REQUIREMENT, verified or not — draft/expired excluded like everywhere else in §3',
    );
    checkEqual(JSON.stringify(matrix.cols), JSON.stringify(['VERIFICATION-PARENT-CHECK-1']), 'trace: cols are every "ok" VERIFICATION');
    check(matrix.covered.has('REQUIREMENT-PARENT-1|VERIFICATION-PARENT-CHECK-1'), 'trace: a claim record\'s named endpoint field (verifies) marks its cell covered');
    check(!matrix.covered.has('REQUIREMENT-CHILD-1|VERIFICATION-PARENT-CHECK-1'), 'trace: an unverified requirement\'s row has no covered cell — the empty row renders, not dropped');
  }
  {
    const matrix = await evaluator.evaluateTrace({ from: 'CAPABILITY', to: 'CAPABILITY', via: 'parent' }, { renderDate });
    checkEqual(JSON.stringify(matrix.rows), JSON.stringify(['CAPABILITY-V1', 'CAPABILITY-V1.1', 'CAPABILITY-V2']), 'trace: CAPABILITY V/H ids are recognised as rows via typeOfId()');
    check(matrix.covered.has('CAPABILITY-V1.1|CAPABILITY-V1'), 'trace: a first-class REL kind (type: parent) marks its (from, to) cell covered, oriented as the REL record states');
    check(!matrix.covered.has('CAPABILITY-V1|CAPABILITY-V1.1'), 'trace: REL orientation is not symmetric — the reverse pair is not covered');
    check(!matrix.covered.has('CAPABILITY-V2|CAPABILITY-V1'), 'trace: an object with no matching relation contributes only an empty row/column');
  }
  {
    const matrix = await evaluator.evaluateTrace({ from: 'REQUIREMENT', to: 'VERIFICATION', via: 'no-such-kind' }, { renderDate });
    checkEqual(matrix.covered.size, 0, 'trace: a via matching neither mechanism produces an all-empty matrix, not an error');
    check(matrix.rows.length > 0 && matrix.cols.length > 0, 'trace: rows/cols still populate even when nothing is covered');
  }

  rmSync(orgRoot, { recursive: true, force: true });
}

await run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_evaluate: all checks passed.');
