#!/usr/bin/env node
// Conformance test — the frozen target.
//
// `fixtures/product.mrd.ttrs` is a worked recipe exercising every construct
// this package admits; `fixtures/product.mrd.expected.md` is its rendered output,
// generated ONCE by this package as the reference implementation of
// notations/views/documents/DIRECTIVE_LANGUAGE.md and committed as the thing an
// INDEPENDENT implementation diffs its own output against.
//
// ── Read this before "fixing" a failure ────────────────────────────────────
//
// This test NEVER regenerates the fixture. That is the entire point of it, not
// an omission, and adding a --update flag or an auto-write-on-mismatch would
// defeat it: a golden file that rewrites itself records whatever the code does
// today and can therefore never detect a regression. It is a frozen target, not
// a snapshot convenience.
//
// So a failure here means one of exactly two things, and they are not the same:
//
//   1. A REGRESSION in pass 1 — the reference implementation stopped producing
//      the specified output. Fix the code. Do not touch the fixture.
//   2. A DELIBERATE change to the specified output — the language or the
//      rendering rules changed on purpose in DIRECTIVE_LANGUAGE.md. Then the
//      fixture is re-frozen as its own reviewable act: regenerate it, and put
//      the new bytes in a commit whose message says which spec change it
//      follows. A reviewer must see the output diff.
//
// If you cannot say which of the two you are in, you are in (1).
//
// Determinism: every input is pinned. `renderDate` is passed explicitly (the
// render date is an input to validity resolution, so an unpinned one makes the
// output a function of the calendar), and fixtures/.gitattributes pins the
// line endings — pass 1 copies fixed text through verbatim, so a CRLF checkout
// would render CRLF and the byte comparison would hold on one OS only.
//
// Run: node packages/document-renderer/tests/test_conformance.mjs
// Exit: 0 = matches; 1 = does not.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPass1 } from '../src/pass1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
const RECIPE_PATH = join(FIXTURES, 'product.mrd.ttrs');
const EXPECTED_PATH = join(FIXTURES, 'product.mrd.expected.md');

// The date the frozen fixture was rendered at. Changing it is a spec-level act,
// not a test tweak — the fixture is only the frozen output at THIS date.
const RENDER_DATE = '2026-08-07';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

// ── The fixture must exist, and a missing one is a failure, never a prompt ──

let expected;
try {
  expected = await readFile(EXPECTED_PATH, 'utf8');
} catch {
  console.error(
    `The conformance fixture is missing:\n  ${EXPECTED_PATH}\n\n`
    + 'It is a committed artefact, not a generated one. Restore it from git\n'
    + 'rather than regenerating it — a regenerated fixture silently adopts\n'
    + "whatever the code does today, which is exactly what it exists to catch.\n",
  );
  process.exit(1);
}

check(!expected.includes('\r'),
  'the frozen fixture contains a CR — it must be LF-only, or the comparison is platform-dependent');

// ── Render, and compare byte for byte ───────────────────────────────────────

const text = await readFile(RECIPE_PATH, 'utf8');
const result = await runPass1({
  text,
  recipePath: RECIPE_PATH,
  renderDate: RENDER_DATE,
  profile: 'strict',
});

check(result.ok,
  `the conformance recipe must render clean under the strict profile: ${JSON.stringify(result.errors)}`);

if (result.markdown !== expected) {
  const a = Buffer.from(result.markdown, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;

  // Enough context to see WHAT diverged without dumping both documents.
  const line = expected.slice(0, i).split('\n').length;
  const window = (s) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 40));

  _failures.push(
    'rendered output does not match the frozen conformance fixture\n'
    + `  first difference at byte ${i} (line ${line})\n`
    + `  expected around: ${window(expected)}\n`
    + `  actual   around: ${window(result.markdown)}\n`
    + `  actual length ${a.length}, expected length ${b.length}\n\n`
    + '  This fixture is NOT auto-updated. See the header of this file: either\n'
    + '  pass 1 regressed (fix the code), or the specified output changed on\n'
    + '  purpose (re-freeze the fixture in its own reviewed commit).',
  );
}

// ── The fixture is only a target if it exercises the constructs ─────────────
//
// A fixture that happened to render nothing interesting would still match
// itself forever. These assert it keeps covering what it was chosen to cover.

check(result.figures.length === 1 && result.figures[0].derived,
  'the conformance recipe must exercise a derived figure');
check(result.instructionSlots.length === 1,
  'the conformance recipe must exercise an instruction slot');
check(expected.includes('{{# instruct market-size }}'),
  'the instruction slot must be copied through untouched — pass 1 does not fill it');
check(expected.includes('Figure 1 shows where'),
  'the conformance recipe must exercise a figref');
check(expected.includes('before it is released to distribution.'),
  'the conformance recipe must exercise a multi-line block scalar');
check(expected.includes('Its parent capability is Batch release.'),
  'the conformance recipe must exercise a field path that walks into another object');

// ── Suspicion: reported, never omitted (DIRECTIVE_LANGUAGE.md §5.1) ─────────

check(result.suspicion !== undefined && result.suspicion !== null,
  'the result must carry a suspicion field — "never checked" must not look like "clean"');
check(result.suspicion?.computed === false && result.suspicion?.state === 'not-computed',
  'this implementation does not compute ⚑S, and must say so rather than stay silent');
check(typeof result.suspicion?.reason === 'string' && result.suspicion.reason.length > 0,
  'the not-computed report must carry its reason');

// ── The profile is named on the result (DIRECTIVE_LANGUAGE.md §6) ───────────

check(result.profile === 'strict',
  'the result must name the profile it ran under, so a rendered document is traceable to it');

// ── Lenient detects exactly what strict fails on (DIRECTIVE_LANGUAGE.md §6) ─
//
// On a clean recipe both are clean; the pair is exercised against a broken one
// so the requirement is actually tested rather than trivially satisfied.

{
  const broken = text.replace('{{ CAP-1.title }}', '{{ CAP-404.title }}');
  const strict = await runPass1({
    text: broken, recipePath: RECIPE_PATH, renderDate: RENDER_DATE, profile: 'strict',
  });
  const lenient = await runPass1({
    text: broken, recipePath: RECIPE_PATH, renderDate: RENDER_DATE, profile: 'review',
  });

  check(!strict.ok, 'strict must fail on an unresolved reference');
  check(lenient.ok, 'lenient must not fail on the same recipe');

  const states = (r) => r.findings.map((f) => `${f.state}:${f.id}`).join(',');
  check(states(strict) === states(lenient) && states(strict).length > 0,
    'lenient must detect exactly what strict fails on — the profiles differ in '
    + `consequence, not in detection (strict: "${states(strict)}", lenient: "${states(lenient)}")`);

  check(!lenient.markdown.includes('CAP-404.title')
    && !/^# \s*$/m.test(lenient.markdown),
    'lenient must not render a non-ok reference as its bare value, and must not render it blank');
}

if (_failures.length > 0) {
  console.error(`${_failures.length} conformance check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('Conformance fixture matches; all conformance checks passed.');
