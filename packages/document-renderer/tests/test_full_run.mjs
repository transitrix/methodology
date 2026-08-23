#!/usr/bin/env node
// End-to-end test: the whole loop a full run must complete, run against the
// package's own committed recipe — pass 1, pass 2, the run record, and PDF —
// composed exactly as an adopter's CLI would compose them. This package ships
// none of that composition as a product (README: "reference implementation,
// not a product"); this test exists so the loop is exercised at least once,
// the way `product.mrd.ttrs` was chosen ("one instruction slot is enough to
// exercise the whole loop").
//
// Acceptance criterion exercised: a full run emits all three artefacts, and
// the PDF reports A4.
//
// Run: node packages/document-renderer/tests/test_full_run.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPass1 } from '../src/pass1.mjs';
import { runPass2 } from '../src/pass2.mjs';
import { buildRunRecord, serializeRunRecord } from '../src/run-record.mjs';
import { renderMarkdownToPdf } from '../src/render-pdf.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RECIPE_PATH = join(HERE, 'fixtures', 'product.mrd.ttrs');
const RENDER_DATE = '2026-08-07';
const RUN_TIMESTAMP = '2026-08-07T12:00:00Z';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

// A reference filler, standing in for "an agent, executing the instruction
// the slot carries". It answers only from the ids the slot
// itself declared in `inputs:` — CAP-1 and REQ-14, both read from this same
// fixture canon above — so the attribution obligation
// (2026-08-12-instruction-slots-specify-the-outcome-not-the-procedure.md §4)
// is demonstrated, not merely asserted: every fact in the produced text traces
// to one of those two records.
async function referenceFill({ slotId, inputs }) {
  if (slotId === 'market-size' && inputs.includes('CAP-1') && inputs.includes('REQ-14')) {
    return {
      status: 'sufficient',
      text: 'No market-sizing data is recorded against CAP-1 (Batch release) or REQ-14 '
        + '(Operator confirms a batch before release) in the current model.',
      attributions: ['CAP-1', 'REQ-14'],
    };
  }
  return { status: 'insufficient' };
}

const { header, markdown: pass1Markdown, instructionSlots, ok: pass1Ok, errors } = await runPass1({
  text: await (await import('node:fs/promises')).readFile(RECIPE_PATH, 'utf8'),
  recipePath: RECIPE_PATH,
  renderDate: RENDER_DATE,
  profile: 'strict',
});

check(pass1Ok, `pass 1 renders the committed recipe clean: ${JSON.stringify(errors)}`);
check(instructionSlots.length === 1 && instructionSlots[0].slotId === 'market-size',
  'the recipe exercises exactly the one instruction slot the epic asked for');

const { markdown, slotResults } = await runPass2({
  markdown: pass1Markdown, instructionSlots, fill: referenceFill,
});

check(slotResults[0].verdict === 'sufficient', 'the reference filler answers the one slot');
check(markdown.includes('No market-sizing data is recorded'), 'and its text lands in the final markdown');
check(!markdown.includes('{{# instruct'), 'with no directive syntax left in the deliverable');
check(markdown.includes('produced by an automated pass'), 'self-disclosing that the section is machine-produced');

// ── The run record ──────────────────────────────────────────────────────
// `repositoryCommit` and `modelId` are facts about this run's environment,
// not something run-record.mjs discovers on its own (it is a pure function
// over its inputs) — the caller (here, a stand-in for the CLI) supplies both.

const repositoryCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const record = buildRunRecord({
  header,
  repositoryCommit,
  modelId: 'reference-filler-test',
  renderDate: RENDER_DATE,
  runTimestamp: RUN_TIMESTAMP,
  profile: 'strict',
  slotResults,
});

check(record.recipe_id === 'product.mrd' && record.recipe_version === '1.0',
  'the run record names the recipe and its version');
check(record.repository_commit === repositoryCommit, 'and the repository commit it was read at');
check(record.slots.length === 1, 'and every slot the recipe declared, here the one');
check(record.slots[0].verdict === 'sufficient' && record.slots[0].produced_text.length > 0,
  'carrying the verdict and the produced text');

const recordJson = serializeRunRecord(record);
check(JSON.parse(recordJson).recipe_id === 'product.mrd', 'the serialised run record round-trips');

// ── PDF — A4, declared explicitly ─────────────────────────────────────────

const pdfBytes = renderMarkdownToPdf(markdown);
const pdfText = pdfBytes.toString('latin1');
check(pdfText.includes('/MediaBox [0 0 595 842]'),
  `the PDF must report A4 — 595 x 842pt, got: ${pdfText.match(/\/MediaBox \[[^\]]*\]/)}`);
check(pdfText.includes('No market-sizing data is recorded'),
  'the filled section\'s text reaches the PDF, not only the Markdown');

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('Full-run check passed: pass 1, pass 2, the run record, and the PDF, end to end.');
