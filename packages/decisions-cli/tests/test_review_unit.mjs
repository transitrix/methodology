#!/usr/bin/env node
// Unit test for `review` — the interactive one-card admission review loop
// (src/review.mjs, epic vkgeorgia/strategy#854, issue #855). The CLI's TTY guard
// makes the real `review` command untestable from a piped subprocess (by design —
// see test_decisions_integrity.py's non-TTY guard check), so this test drives
// runReview() directly with a scripted `ask()` in place of a real terminal.
//
// Covers: one card at a time in order; an unrecognised answer reprompts without
// consuming a card; `stop` exits leaving the rest genuinely undecided (not
// deferred); resume (list-undecided / a second runReview call) picks up only
// what's left; reject requires a non-empty reason, defer's reason is optional;
// an empty --by prompts for one.
//
// Run: node packages/decisions-cli/tests/test_review_unit.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runReview } from '../src/review.mjs';
import { loadDecisions } from '../src/io.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

function scriptedAsk(answers) {
  let i = 0;
  return async () => {
    if (i >= answers.length) throw new Error(`scriptedAsk: ran out of answers (asked ${i + 1} times)`);
    return answers[i++];
  };
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'decisions-review-'));
  const processing = join(dir, '_intake', 'processing');
  await mkdir(processing, { recursive: true });

  const sourceGatePath = join(processing, 'review-queue.yaml');
  await writeFile(sourceGatePath, [
    'generated_by: "@transitrix/ingest-cli"',
    `org_root: "${dir}"`,
    'field_artefacts: []',
    'candidates:',
    '  - ref: "cand-1"',
    '    kind: "element"',
    '    extraction_confidence: "high"',
    '  - ref: "cand-2"',
    '    kind: "element"',
    '  - ref: "cand-3"',
    '    kind: "relation"',
  ].join('\n'), 'utf8');

  const log = [];
  const collect = (m) => log.push(m);

  // ── Round 1: accept cand-1, then an unrecognised answer, then stop ────────
  const r1 = await runReview({
    orgRoot: dir,
    sourceGatePath,
    by: 'j.reviewer',
    asOf: '2026-07-29',
    ask: scriptedAsk(['accept', 'bogus', 'stop']),
    log: collect,
  });

  check(r1.recorded === 1, `round 1: expected recorded=1, got ${r1.recorded}`);
  check(r1.undecided === 2, `round 1: expected undecided=2, got ${r1.undecided}`);
  check(r1.stopped === true, 'round 1: expected stopped=true');
  check(log.some((l) => l.includes('unrecognised answer')), 'round 1: expected a reprompt message for the bogus answer');

  const decisionsPath = join(processing, 'decisions.reviewed.yaml');
  let doc = await loadDecisions(decisionsPath);
  check(doc !== null, 'round 1: decisions.reviewed.yaml was not created');
  check(doc.decisions.length === 1, `round 1: expected 1 decision row on disk, got ${doc.decisions.length}`);
  check(doc.decisions[0].item_ref === 'cand-1' && doc.decisions[0].decision === 'accept',
    `round 1: expected cand-1/accept on disk, got ${JSON.stringify(doc.decisions[0])}`);

  // ── Round 2 (resume): only cand-2/cand-3 should be presented ──────────────
  const log2 = [];
  const r2 = await runReview({
    orgRoot: dir,
    sourceGatePath,
    by: '', // empty --by must prompt
    asOf: '2026-07-29',
    ask: scriptedAsk([
      'j.reviewer',       // --by prompt
      'reject', '',       // reject cand-2, empty reason must re-prompt...
      'duplicate entry',  // ...then a real reason
      'defer', '',        // defer cand-3, empty reason is fine (optional)
    ]),
    log: (m) => log2.push(m),
  });

  check(r2.recorded === 2, `round 2: expected recorded=2, got ${r2.recorded}`);
  check(r2.undecided === 0, `round 2: expected undecided=0, got ${r2.undecided}`);
  check(r2.stopped === false, 'round 2: expected stopped=false (queue exhausted, not stopped)');
  check(!log2.some((l) => l.includes('cand-1')), 'round 2: cand-1 must not be re-presented — it is already decided');

  doc = await loadDecisions(decisionsPath);
  check(doc.decisions.length === 3, `round 2: expected 3 decision rows on disk after resume, got ${doc.decisions.length}`);
  const byRef = Object.fromEntries(doc.decisions.map((d) => [d.item_ref, d]));
  check(byRef['cand-2']?.decision === 'reject' && byRef['cand-2']?.reason === 'duplicate entry',
    `round 2: expected cand-2/reject with reason, got ${JSON.stringify(byRef['cand-2'])}`);
  check(byRef['cand-3']?.decision === 'defer' && byRef['cand-3']?.reason === undefined,
    `round 2: expected cand-3/defer with no reason, got ${JSON.stringify(byRef['cand-3'])}`);

  // ── Round 3: nothing left undecided — the loop must not prompt at all ─────
  const r3 = await runReview({
    orgRoot: dir,
    sourceGatePath,
    by: 'j.reviewer',
    asOf: '2026-07-29',
    ask: scriptedAsk([]), // any ask() call here is a bug — the queue is empty
    log: () => {},
  });
  check(r3.recorded === 0 && r3.undecided === 0 && r3.stopped === false,
    `round 3: expected an immediate clean exit, got ${JSON.stringify(r3)}`);

  await rm(dir, { recursive: true, force: true });

  if (_failures.length) {
    console.log('FAIL - decisions-cli review unit test:');
    for (const f of _failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log('PASS - decisions-cli review (one-card stop/resume) unit test: all checks passed.');
  process.exit(0);
}

main().catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
