#!/usr/bin/env node
// Unit tests for src/telemetry.mjs — §6's counters in isolation from
// render.mjs's AST walk.
//
// Run: node packages/document-view-engine/tests/test_telemetry.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { createTelemetryCollector } from '../src/telemetry.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function checkEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    _failures.push(`${msg}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

function run() {
  // types — counted by name, repeats tally
  {
    const t = createTelemetryCollector();
    t.recordType('REQUIREMENT');
    t.recordType('REQUIREMENT');
    t.recordType('VERIFICATION');
    checkEqual(t.snapshot().types, { REQUIREMENT: 2, VERIFICATION: 1 }, 'types: counted by name, repeats tally');
  }

  // fields — keyed as TYPE.field, dotted paths preserved, empty/absent path ignored
  {
    const t = createTelemetryCollector();
    t.recordField('REQUIREMENT', ['text']);
    t.recordField('REQUIREMENT', ['text']);
    t.recordField('REQUIREMENT', ['parent', 'title']);
    t.recordField('REQUIREMENT', []);
    t.recordField(null, ['x']);
    checkEqual(
      t.snapshot().fields,
      { 'REQUIREMENT.parent.title': 1, 'REQUIREMENT.text': 2 },
      'fields: TYPE.field(.field...) keys, a bare-id (no field path) or missing type records nothing',
    );
  }

  // relations — the trace `via` name
  {
    const t = createTelemetryCollector();
    t.recordRelation('verifies');
    t.recordRelation('verifies');
    t.recordRelation('parent');
    checkEqual(t.snapshot().relations, { parent: 1, verifies: 2 }, 'relations: counted by via name');
  }

  // matrix pairs — from|to|via triple, distinct triples counted separately
  {
    const t = createTelemetryCollector();
    t.recordMatrixPair('REQUIREMENT', 'VERIFICATION', 'verifies');
    t.recordMatrixPair('REQUIREMENT', 'VERIFICATION', 'verifies');
    t.recordMatrixPair('REQUIREMENT', 'REQUIREMENT', 'parent');
    checkEqual(
      t.snapshot().matrixPairs,
      { 'REQUIREMENT|REQUIREMENT|parent': 1, 'REQUIREMENT|VERIFICATION|verifies': 2 },
      'matrixPairs: distinct from|to|via triples counted separately',
    );
    const t2 = createTelemetryCollector();
    t2.recordMatrixPair(null, 'VERIFICATION', 'verifies');
    checkEqual(t2.snapshot().matrixPairs, {}, 'matrixPairs: an incomplete triple (missing from/to/via) records nothing');
  }

  // failure states — 'ok' is never counted; the four §3 failure states tally independently
  {
    const t = createTelemetryCollector();
    t.recordFailureState('ok');
    t.recordFailureState('suspect');
    t.recordFailureState('not-admitted');
    t.recordFailureState('not-admitted');
    t.recordFailureState('out-of-validity');
    t.recordFailureState('unresolved');
    checkEqual(
      t.snapshot().failureStates,
      { 'not-admitted': 2, 'out-of-validity': 1, suspect: 1, unresolved: 1 },
      'failureStates: ok is excluded, the four failure states tally independently',
    );
  }

  // an empty collector snapshots to well-formed empty objects, not undefined
  {
    const t = createTelemetryCollector();
    checkEqual(
      t.snapshot(),
      { types: {}, fields: {}, relations: {}, matrixPairs: {}, failureStates: {} },
      'snapshot: an untouched collector returns empty objects for every category',
    );
  }
}

run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_telemetry: all checks passed.');
