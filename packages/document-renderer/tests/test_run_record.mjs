#!/usr/bin/env node
// Unit tests for src/run-record.mjs, against transitrix-hq#53's "Outputs"
// requirement: the run record names template id and version, repository
// commit, model id, run timestamp (ISO 8601), and — per slot, including one
// that produced nothing — the instruction and the text it produced. The
// 2026-08-12 ADR adds a verdict per slot.
//
// Run: node packages/document-renderer/tests/test_run_record.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { buildRunRecord, serializeRunRecord } from '../src/run-record.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

const HEADER = {
  document: 'Market Requirements Document',
  kind: 'mrd',
  template_id: 'product.mrd',
  template_version: '1.0',
  canon: 'canon',
};

const SUFFICIENT_SLOT = {
  slotId: 'market-size',
  question: 'How large is the addressable market?',
  inputs: ['CAP-1', 'REQ-14'],
  sufficient: 'A number, a currency and a year.',
  verdict: 'sufficient',
  reason: null,
  text: 'The market is $4B, growing 12%/yr.',
  attributions: ['CAP-1'],
};

const NOT_ATTEMPTED_SLOT = {
  slotId: 'risk-profile',
  question: 'What is the principal adoption risk?',
  inputs: [],
  sufficient: 'A named risk and its mitigation.',
  verdict: 'not-attempted',
  reason: 'no declared inputs',
  text: null,
};

// ── Required fields, named exactly as the epic states them ───────────────

{
  const record = buildRunRecord({
    header: HEADER,
    repositoryCommit: 'abc1234',
    modelId: 'claude-sonnet-5',
    runTimestamp: '2026-08-15T12:00:00.000Z',
    renderDate: '2026-08-15',
    profile: 'strict',
    slotResults: [SUFFICIENT_SLOT, NOT_ATTEMPTED_SLOT],
  });

  check(record.template_id === 'product.mrd', 'template id is carried from the header');
  check(record.template_version === '1.0', 'template version is carried from the header');
  check(record.repository_commit === 'abc1234', 'repository commit is named');
  check(record.model_id === 'claude-sonnet-5', 'model id is named');
  check(record.run_timestamp === '2026-08-15T12:00:00.000Z', 'run timestamp is carried through, not recomputed');
  check(record.render_date === '2026-08-15', 'render date is carried from pass 1');
  check(record.profile === 'strict', 'the profile a run used is named');
  check(record.slots.length === 2, 'every slot present in the template is named — including the empty one');
}

// ── Every slot, including one that produced nothing ───────────────────────

{
  const record = buildRunRecord({
    header: HEADER,
    renderDate: '2026-08-15',
    profile: 'strict',
    slotResults: [NOT_ATTEMPTED_SLOT],
  });
  const slot = record.slots[0];
  check(slot.slot_id === 'risk-profile', 'the slot id is present');
  check(slot.question === NOT_ATTEMPTED_SLOT.question, 'the instruction text is present in full');
  check(slot.verdict === 'not-attempted', 'the verdict is carried through');
  check(slot.reason === 'no declared inputs', 'and its reason');
  check(slot.produced_text === null, 'a slot that produced nothing is recorded as such, not omitted');
  check(Array.isArray(slot.attributions) && slot.attributions.length === 0,
    'a slot with no attributions still carries an (empty) attributions list, never undefined');
}

{
  const record = buildRunRecord({
    header: HEADER,
    renderDate: '2026-08-15',
    profile: 'strict',
    slotResults: [SUFFICIENT_SLOT],
  });
  const slot = record.slots[0];
  check(slot.produced_text === SUFFICIENT_SLOT.text, 'the produced text is carried through in full');
  check(slot.verdict === 'sufficient', 'and its verdict');
  check(slot.attributions.length === 1 && slot.attributions[0] === 'CAP-1',
    'the filler\'s attribution account is carried through');
}

// ── No slots — still a valid, empty-list record ───────────────────────────

{
  const record = buildRunRecord({ header: HEADER, renderDate: '2026-08-15', profile: 'strict' });
  check(Array.isArray(record.slots) && record.slots.length === 0,
    'a template with no instruction slots still gets a well-formed record');
}

// ── Repository commit / model id are null, not omitted, when absent ──────

{
  const record = buildRunRecord({ header: HEADER, renderDate: '2026-08-15', profile: 'strict' });
  check('repository_commit' in record && record.repository_commit === null,
    'no repository configured for this run is still a named field, not a missing key');
  check('model_id' in record && record.model_id === null,
    'no model used (nothing to fill) is still a named field, not a missing key');
}

// ── Timestamp defaults to now when the caller does not pin one ───────────

{
  const record = buildRunRecord({ header: HEADER, renderDate: '2026-08-15', profile: 'strict' });
  check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(record.run_timestamp),
    `an unpinned run timestamp still defaults to a real ISO 8601 value, got: ${record.run_timestamp}`);
}

// ── A missing header is a caller error, not a half-built record ──────────

{
  let threw = false;
  try { buildRunRecord({ renderDate: '2026-08-15', profile: 'strict' }); } catch { threw = true; }
  check(threw, 'building a run record with no header throws rather than emitting a partial one');
}

// ── Serialisation — stable, parseable, newline-terminated ────────────────

{
  const record = buildRunRecord({
    header: HEADER,
    runTimestamp: '2026-08-15T12:00:00.000Z',
    renderDate: '2026-08-15',
    profile: 'strict',
    slotResults: [SUFFICIENT_SLOT],
  });
  const text = serializeRunRecord(record);
  check(text.endsWith('\n'), 'the serialised record is newline-terminated');
  const roundTripped = JSON.parse(text);
  check(JSON.stringify(roundTripped) === JSON.stringify(record), 'it round-trips through JSON exactly');
}

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('All run-record checks passed.');
