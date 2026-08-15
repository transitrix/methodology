#!/usr/bin/env node
// Unit tests for src/pass2.mjs — the instruction-slot fill pass, against the
// normative rules of the 2026-08-12 decision "an instruction slot specifies
// the outcome, not the procedure" (accepted 2026-08-15):
//
//   * a slot declaring no inputs is not fillable — `not-attempted`, `fill`
//     never called;
//   * omitting `fill` entirely resolves every slot `not-attempted` and pass 2
//     behaves like pass 1 alone;
//   * `sufficient` replaces the slot span with the produced text plus the
//     self-declaration disclosure;
//   * `insufficient` leaves the slot visibly open, never padded;
//   * an attribution outside the slot's own declared `inputs:` is rejected —
//     the one part of the filler's account pass 2 can check mechanically;
//   * pass 2 runs only against the markdown pass 1 produced for the same
//     template — a slot-count or slot-order mismatch is a caller error.
//
// Run: node packages/document-renderer/tests/test_pass2.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { runPass2 } from '../src/pass2.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
async function checkThrows(fn, msg) {
  try {
    await fn();
    _failures.push(`${msg} (expected a throw, got none)`);
  } catch {
    // expected
  }
}

function slot(overrides = {}) {
  return {
    slotId: 'market-size',
    question: 'How large is the addressable market?',
    inputs: [],
    sufficient: 'A number, a currency and a year.',
    ...overrides,
  };
}

function withSlot(s) {
  return {
    markdown: `Before.\n\n{{# instruct ${s.slotId} }}\nquestion: ${s.question}\ninputs: ${s.inputs.join(', ')}\nsufficient: ${s.sufficient}\n{{/ instruct }}\n\nAfter.`,
    instructionSlots: [s],
  };
}

// ── No declared inputs — not fillable, `fill` never called ───────────────

{
  const s = slot({ inputs: [] });
  const { markdown } = withSlot(s);
  let called = false;
  const result = await runPass2({
    markdown,
    instructionSlots: [s],
    fill: async () => { called = true; return { status: 'sufficient', text: 'x' }; },
  });
  check(!called, 'fill is never invoked for a slot with no declared inputs');
  check(result.slotResults[0].verdict === 'not-attempted', 'the slot is reported not-attempted');
  check(result.slotResults[0].reason === 'no declared inputs', 'carrying the §3 reason');
  check(result.markdown.includes('Open — not answered.'), 'and stays visibly open in the markdown');
  check(!result.markdown.includes('{{# instruct'), 'the raw directive syntax does not leak through');
}

// ── No `fill` supplied — every slot not-attempted, pass 2 is inert ───────

{
  const s = slot({ inputs: ['CAP-1'] });
  const { markdown } = withSlot(s);
  const result = await runPass2({ markdown, instructionSlots: [s] });
  check(result.slotResults[0].verdict === 'not-attempted', 'with no filler configured, nothing is attempted');
  check(result.slotResults[0].reason === 'no filler configured', 'reason names why');
  check(result.markdown.includes('Open — not answered.'), 'and the section is left open');
}

// ── Sufficient — text replaces the span, self-declaration attached ───────

{
  const s = slot({ inputs: ['CAP-1', 'REQ-14'] });
  const { markdown } = withSlot(s);
  const result = await runPass2({
    markdown,
    instructionSlots: [s],
    fill: async ({ slotId }) => {
      check(slotId === 'market-size', 'fill receives the slot id');
      return { status: 'sufficient', text: 'The market is $4B, growing 12%/yr (source: CAP-1).', attributions: ['CAP-1'] };
    },
  });
  check(result.slotResults[0].verdict === 'sufficient', 'a sufficient outcome is recorded as such');
  check(result.markdown.includes('The market is $4B'), 'and the produced text replaces the slot');
  check(!result.markdown.includes('{{# instruct'), 'the directive syntax is gone from the rendered output');
  check(
    result.markdown.includes('was produced by an automated pass') && result.markdown.includes('not been admitted through a review gate'),
    'the self-declaration is attached beside the produced text',
  );
  check(result.markdown.includes('Before.') && result.markdown.includes('After.'),
    'text outside the slot is untouched');
  check(result.slotResults[0].attributions.length === 1 && result.slotResults[0].attributions[0] === 'CAP-1',
    "the filler's own attribution account is carried through");
}

// ── Insufficient — declared, not padded; stays visibly open ──────────────

{
  const s = slot({ inputs: ['CAP-1'] });
  const { markdown } = withSlot(s);
  const result = await runPass2({
    markdown,
    instructionSlots: [s],
    fill: async () => ({ status: 'insufficient' }),
  });
  check(result.slotResults[0].verdict === 'insufficient', 'an insufficient outcome is recorded as such');
  check(result.slotResults[0].text === null, 'and carries no text — nothing padded in');
  check(result.markdown.includes('Open — not answered.'), 'the section stays visibly open');
  check(!result.markdown.includes('{{# instruct'), 'not left as raw directive syntax either');
}

// ── Attribution outside the declared inputs — a closed-list violation ────

{
  const s = slot({ inputs: ['CAP-1'] });
  const { markdown } = withSlot(s);
  await checkThrows(
    () => runPass2({
      markdown,
      instructionSlots: [s],
      fill: async () => ({ status: 'sufficient', text: 'x', attributions: ['REQ-99'] }),
    }),
    'an attribution outside the declared inputs is rejected',
  );
}

// ── Malformed filler outcomes ─────────────────────────────────────────────

{
  const s = slot({ inputs: ['CAP-1'] });
  const { markdown } = withSlot(s);
  await checkThrows(
    () => runPass2({ markdown, instructionSlots: [s], fill: async () => ({ status: 'maybe' }) }),
    'an unrecognised status is rejected',
  );
}

{
  const s = slot({ inputs: ['CAP-1'] });
  const { markdown } = withSlot(s);
  await checkThrows(
    () => runPass2({ markdown, instructionSlots: [s], fill: async () => ({ status: 'sufficient', text: '  ' }) }),
    '"sufficient" with blank text is rejected',
  );
}

// ── Multiple slots resolve independently, in document order ──────────────

{
  const a = slot({ slotId: 'market-size', inputs: ['CAP-1'] });
  const b = slot({ slotId: 'risk-profile', inputs: [] });
  const markdown = `${withSlot(a).markdown}\n\n${withSlot(b).markdown}`;
  const result = await runPass2({
    markdown,
    instructionSlots: [a, b],
    fill: async ({ slotId }) => (slotId === 'market-size'
      ? { status: 'sufficient', text: 'Filled market text.', attributions: ['CAP-1'] }
      : { status: 'sufficient', text: 'should never be reached' }),
  });
  check(result.slotResults.length === 2, 'both slots are reported');
  check(result.slotResults[0].verdict === 'sufficient' && result.slotResults[1].verdict === 'not-attempted',
    'each slot resolves on its own — declared inputs gate fill() per slot, not per run');
  check(result.markdown.includes('Filled market text.'), 'the fillable slot is filled');
  check(result.markdown.includes('Open — not answered.'), 'the unfillable one stays open');
}

// ── Caller error: pass 2 run against markdown that is not pass 1's own ───

{
  const s = slot({ inputs: ['CAP-1'] });
  await checkThrows(
    () => runPass2({ markdown: 'No instruction slot here at all.', instructionSlots: [s] }),
    'a slot-count mismatch between markdown and instructionSlots is rejected',
  );
}

{
  const a = slot({ slotId: 'market-size', inputs: [] });
  const b = slot({ slotId: 'risk-profile', inputs: [] });
  // Markdown carries the slots in one order; instructionSlots claims another.
  const markdown = `${withSlot(a).markdown}\n\n${withSlot(b).markdown}`;
  await checkThrows(
    () => runPass2({ markdown, instructionSlots: [b, a] }),
    'a slot-order mismatch between markdown and instructionSlots is rejected',
  );
}

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('All pass2 checks passed.');
