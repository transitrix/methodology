#!/usr/bin/env node
// Unit tests for src/pass1.mjs — the deterministic resolver, against the
// acceptance criteria of the epic's pass-1 task:
//
//   * runs with a repository and no agent: references resolved, derived figures
//     rendered, instruction slots left visibly unresolved;
//   * runs with NO repository at all for a recipe that names none — succeeds;
//   * a recipe that DOES name one with no repository configured fails by a
//     distinct name (TTRS-011), not folded into unresolved-reference handling;
//   * an unresolvable reference fails by name (TTRS-010), never renders empty;
//   * deleting a cited element is a named failure, not a silent gap;
//   * re-running on unchanged inputs is byte-identical.
//
// Run: node packages/document-renderer/tests/test_pass1.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runPass1 } from '../src/pass1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');
const CANON = join(FIXTURES, 'canon');
const RECIPE_PATH = join(FIXTURES, 'product.mrd.ttrs');

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function checkEqual(actual, expected, msg) {
  if (!deepEqual(actual, expected)) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function codes(result) { return result.errors.map((e) => e.code); }

const HEADER = 'document: Market Requirements Document\nkind: mrd\nrecipe_id: product.mrd\nrecipe_version: "1.0"\n';
function tpl(body, headerExtra = '') {
  return `---\n${HEADER}${headerExtra}---\n${body}`;
}

// ── Criterion: pass 1 runs against a repository with no agent available ──

{
  const body = [
    '# Requirements',
    '',
    'The lead requirement is {{ REQ-14.title }}, owned by {{ CAP-1 }}.',
    '',
    '{{ view diagrams/context.blocks.transitrix.yaml as = context }}',
    '',
    'See {{ figref context }} above.',
    '',
    '{{# instruct market-size }}',
    'question: How large is the addressable market?',
    'inputs: CAP-1',
    'sufficient: A number, a currency, a year and the method.',
    '{{/ instruct }}',
  ].join('\n');

  const result = await runPass1({
    text: tpl(body),
    recipePath: RECIPE_PATH,
    repositoryRoot: CANON,
  });

  check(result.ok, `full pass should succeed, got: ${JSON.stringify(result.errors)}`);
  check(result.markdown.includes('Batch release confirmation'),
    'a field reference resolves to that field');
  check(result.markdown.includes('Batch release,') || result.markdown.includes('Batch release'),
    'a bare reference resolves to the object name');
  check(!result.markdown.includes('{{ REQ-14'), 'no reference syntax survives into the output');
  check(result.markdown.includes('![Figure 1]'), 'a derived figure renders as an embed');
  check(result.markdown.includes('See Figure 1 above.'), 'figref resolves to the figure number');

  // Instruction slots are pass 2's job — untouched, and visibly so.
  check(result.markdown.includes('{{# instruct market-size }}'),
    'the instruction slot is left in the output verbatim');
  check(result.markdown.includes('{{/ instruct }}'), 'including its closing directive');
  check(result.instructionSlots.length === 1, 'the slot is reported for the run record');
  checkEqual(result.instructionSlots[0], {
    slotId: 'market-size',
    question: 'How large is the addressable market?',
    inputs: ['CAP-1'],
    sufficient: 'A number, a currency, a year and the method.',
  }, 'the reported slot carries its instruction in full');

  check(result.figures.length === 1 && result.figures[0].derived === true,
    'a `view` figure is recorded as derived from the model');
}

// ── Criterion: runs with no repository at all ────────────────────────────

{
  const result = await runPass1({
    text: tpl('Plain prose, no model objects and no derived figures.'),
    repositoryRoot: null,
  });
  check(result.ok, `no-repository recipe should succeed trivially, got: ${JSON.stringify(result.errors)}`);
  check(result.markdown === 'Plain prose, no model objects and no derived figures.',
    'fixed text is copied verbatim');
}

{
  // A recipe with only an instruction slot still needs no repository.
  const result = await runPass1({
    text: tpl('{{# instruct scope }}\nquestion: Q?\nsufficient: S.\n{{/ instruct }}'),
    repositoryRoot: null,
  });
  check(result.ok, 'an instruction-only recipe needs no repository');
  check(result.instructionSlots.length === 1, 'and its slot is still reported');
}

{
  // A supplied asset is not derived from the model, so it needs no repository either.
  const result = await runPass1({
    text: tpl('{{ figure assets/rig.svg caption = "The rig" as = rig }}'),
    recipePath: RECIPE_PATH,
    repositoryRoot: null,
  });
  check(result.ok, `a supplied figure needs no repository, got: ${JSON.stringify(result.errors)}`);
  check(result.markdown === '![The rig](assets/rig.svg)', 'a supplied figure embeds its own caption');
  check(result.figures[0].derived === false, 'and is recorded as not derived');
}

// ── Criterion: needs a repository, none configured — distinct failure ────

{
  const result = await runPass1({ text: tpl('{{ REQ-14 }}'), repositoryRoot: null });
  check(!result.ok, 'a reference with no repository fails');
  check(codes(result).includes('TTRS-011'),
    `missing-repository is its own code, got: ${JSON.stringify(result.errors)}`);
  check(!codes(result).includes('TTRS-010'),
    'and is NOT folded into ordinary unresolved-reference handling');
  check(result.markdown.includes('«unresolved: REQ-14»'), 'it never renders as empty text');
}

{
  const result = await runPass1({
    text: tpl('{{ view diagrams/context.blocks.transitrix.yaml }}'),
    recipePath: RECIPE_PATH,
    repositoryRoot: null,
  });
  check(codes(result).includes('TTRS-011'),
    'a derived figure with no repository is the same distinct failure');
}

// ── Criterion: an unresolvable reference fails by name ───────────────────

{
  const result = await runPass1({ text: tpl('{{ REQ-999 }}'), repositoryRoot: CANON });
  check(!result.ok, 'an unknown id fails the run');
  check(codes(result).includes('TTRS-010'), 'with the unresolved-reference code');
  check(result.errors[0].message.includes('REQ-999'), 'and names the reference');
  check(result.markdown.includes('«unresolved: REQ-999»'), 'it never renders as empty text');
}

{
  const result = await runPass1({ text: tpl('{{ REQ-14.nonesuch }}'), repositoryRoot: CANON });
  check(codes(result).includes('TTRS-010'), 'an unknown field on a known object also fails');
  check(result.errors[0].message.includes('REQ-14.nonesuch'), 'and names the full path');
}

{
  const result = await runPass1({ text: tpl('{{ REQ-14.parent.name }}'), repositoryRoot: CANON });
  check(result.ok, `a field path traverses to another object: ${JSON.stringify(result.errors)}`);
  check(result.markdown === 'Batch release', 'and yields that object\'s field');
}

// ── Criterion: deleting a cited element is a named failure ───────────────

{
  const tmp = await mkdtemp(join(tmpdir(), 'ttrs-'));
  try {
    await mkdir(join(tmp, 'elements'), { recursive: true });
    await writeFile(join(tmp, 'elements', 'REQ-14.yaml'), 'id: REQ-14\nname: Present for now\n');

    const text = tpl('Cites {{ REQ-14 }}.');
    const before = await runPass1({ text, repositoryRoot: tmp });
    check(before.ok, `cited element present — run is clean: ${JSON.stringify(before.errors)}`);

    await rm(join(tmp, 'elements', 'REQ-14.yaml'));
    const after = await runPass1({ text, repositoryRoot: tmp });
    check(!after.ok, 'deleting the cited element fails the run');
    check(codes(after).includes('TTRS-010'), 'by name, not as a silent gap');
    check(!after.markdown.includes('Cites .'), 'and the citation does not quietly vanish');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// ── The four distinguishable reference states ───────────────────────────
//
// unresolved / not-admitted / out-of-validity are @transitrix/document-view-
// engine's own three (⚑U / ⚑A / ⚑V); no-repository-configured is the fourth,
// about configuration rather than canon. The strict profile fails on all four
// and names the file, the id and the state. The defect being guarded against
// is not the missing reference — it is the one that renders as correct text
// when the object behind it was never admitted, or has stopped being valid.

async function withCanon(files, fn) {
  const tmp = await mkdtemp(join(tmpdir(), 'ttrs-state-'));
  try {
    await mkdir(join(tmp, 'elements'), { recursive: true });
    for (const [name, body] of Object.entries(files)) {
      await writeFile(join(tmp, 'elements', name), body);
    }
    return await fn(tmp);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

const PROPOSED = 'id: REQ-20\nname: Draft requirement\nadmission_state: proposed\n';
const RETIRED = 'id: REQ-21\nname: Retired requirement\nvalid_from: "2020-01-01"\nvalid_to: "2021-01-01"\n';
const FUTURE = 'id: REQ-22\nname: Future requirement\nvalid_from: "2999-01-01"\n';
const ACTIVE = 'id: REQ-23\nname: Active requirement\nvalid_from: "2020-01-01"\nvalid_to: null\n';

await withCanon({ 'REQ-20.yaml': PROPOSED }, async (canon) => {
  const result = await runPass1({
    text: tpl('Cites {{ REQ-20 }}.'),
    recipePath: RECIPE_PATH,
    repositoryRoot: canon,
    renderDate: '2026-08-07',
  });
  check(!result.ok, 'a not-admitted object fails the strict profile');
  check(codes(result).includes('TTRS-014'), 'with its own code, not the unresolved one');
  check(!codes(result).includes('TTRS-010'), 'not-admitted is not folded into unresolved');
  check(result.findings[0].state === 'not-admitted', 'and is reported as that state');
  check(result.findings[0].flag === '⚑A', "reusing document-view-engine's flag");
  const msg = result.errors[0].message;
  check(msg.includes('product.mrd.ttrs') && msg.includes('REQ-20') && msg.includes('not admitted'),
    `the failure names file, id and state, got: ${msg}`);
  check(!result.markdown.includes('Draft requirement'),
    'and it never renders as its plain, plausible-looking value');
});

await withCanon({ 'REQ-21.yaml': RETIRED }, async (canon) => {
  const result = await runPass1({
    text: tpl('Cites {{ REQ-21 }}.'),
    repositoryRoot: canon,
    renderDate: '2026-08-07',
  });
  check(codes(result).includes('TTRS-015'), 'an object past its valid_to is out of validity');
  check(result.findings[0].flag === '⚑V', 'flagged ⚑V');
  check(!result.markdown.includes('Retired requirement'), 'and does not render as correct text');
});

await withCanon({ 'REQ-22.yaml': FUTURE }, async (canon) => {
  const result = await runPass1({
    text: tpl('Cites {{ REQ-22 }}.'),
    repositoryRoot: canon,
    renderDate: '2026-08-07',
  });
  check(codes(result).includes('TTRS-015'), 'an object not yet valid is out of validity too');
});

await withCanon({ 'REQ-23.yaml': ACTIVE }, async (canon) => {
  const result = await runPass1({
    text: tpl('Cites {{ REQ-23 }}.'),
    repositoryRoot: canon,
    renderDate: '2026-08-07',
  });
  check(result.ok, `an active object inside its validity resolves: ${JSON.stringify(result.errors)}`);
  check(result.markdown.includes('Active requirement'), 'and renders its value');
  check(result.states.ok === 1, 'counted as ok');
});

await withCanon({ 'REQ-23.yaml': ACTIVE }, async (canon) => {
  // `valid_to: null` is an open interval, not the string "null".
  const result = await runPass1({
    text: tpl('{{ REQ-23 }}'),
    repositoryRoot: canon,
    renderDate: '2999-12-31',
  });
  check(result.ok, 'an open validity interval has no end');
});

// The fourth state is reported alongside the other three, not somewhere else.
{
  const result = await runPass1({
    text: tpl('{{ REQ-14 }}'),
    recipePath: RECIPE_PATH,
    repositoryRoot: null,
  });
  check(result.findings.some((f) => f.state === 'no-repository'),
    'no-repository-configured is one of the four reported states');
  check(result.errors[0].message.includes('product.mrd.ttrs'),
    'and names the file like the others');
}

// ── The review profile reports what strict fails on ─────────────────────

await withCanon({ 'REQ-20.yaml': PROPOSED }, async (canon) => {
  const result = await runPass1({
    text: tpl('Cites {{ REQ-20 }}.'),
    repositoryRoot: canon,
    renderDate: '2026-08-07',
    profile: 'review',
  });
  check(result.ok, `review does not fail on a flagged state: ${JSON.stringify(result.errors)}`);
  check(result.findings.length === 1, 'but it still reports it');
  check(result.findings[0].state === 'not-admitted', 'as the same state strict fails on');
  check(result.markdown.includes('⚑A'), 'and the flag is visible in the output');
});

{
  let threw = false;
  try {
    await runPass1({ text: tpl('x'), repositoryRoot: null, profile: 'nonsense' });
  } catch { threw = true; }
  check(threw, 'an unknown profile is rejected rather than silently treated as strict');
}

// ── Suspicion is "not computed", never simply absent ────────────────────
// A clean render must be distinguishable from one that never checked.

{
  const result = await runPass1({ text: tpl('Prose only.'), repositoryRoot: null });
  check(result.suspicion !== undefined, 'the result always carries a suspicion field');
  check(result.suspicion.computed === false, 'pass 1 does not compute ⚑S');
  check(result.suspicion.state === 'not-computed', 'and says so by name');
  check(typeof result.suspicion.reason === 'string' && result.suspicion.reason.length > 0,
    'with the standing reason, so absence is never mistaken for cleanliness');
}

// ── Criterion: re-running on unchanged inputs is byte-identical ──────────

{
  const body = 'A {{ REQ-14.title }} and {{ CAP-1 }} and '
    + '{{ view diagrams/context.blocks.transitrix.yaml as = ctx }} and {{ figref ctx }}.';
  const opts = { text: tpl(body), recipePath: RECIPE_PATH, repositoryRoot: CANON };
  const first = await runPass1(opts);
  const second = await runPass1(opts);
  check(first.ok && second.ok, 'both runs succeed');
  check(first.markdown === second.markdown, 're-running on unchanged inputs is byte-identical');
}

// ── Figure sources and the rasterise hook ───────────────────────────────

{
  const result = await runPass1({
    text: tpl('{{ view diagrams/missing.transitrix.yaml }}'),
    recipePath: RECIPE_PATH,
    repositoryRoot: CANON,
  });
  check(codes(result).includes('TTRS-012'), 'a figure source that does not exist fails by name');
}

{
  const result = await runPass1({ text: tpl('{{ figref nobody }}'), repositoryRoot: null });
  check(codes(result).includes('TTRS-012'), 'a figref naming no declared figure fails by name');
}

{
  // Rasterisation is the output layer's job, reached through this hook — pass 1
  // itself pulls in no renderer.
  const seen = [];
  const result = await runPass1({
    text: tpl('{{ view diagrams/context.blocks.transitrix.yaml as = ctx }}'),
    recipePath: RECIPE_PATH,
    repositoryRoot: CANON,
    rasterise: ({ kind, name, number }) => { seen.push({ kind, name, number }); return `build/${name}.png`; },
  });
  check(result.ok, `rasterise hook run is clean: ${JSON.stringify(result.errors)}`);
  checkEqual(seen, [{ kind: 'view', name: 'ctx', number: 1 }], 'the hook is handed the resolved figure');
  check(result.markdown === '![Figure 1](build/ctx.png)', 'and its return value is what gets embedded');
}

// ── The file-driven path: `canon:` resolved relative to the recipe ────

{
  // No `repositoryRoot` argument at all — the header's `canon:` is the repository,
  // resolved relative to the recipe's own directory. This is the ordinary route.
  const text = await readFile(RECIPE_PATH, 'utf8');
  const result = await runPass1({ text, recipePath: RECIPE_PATH });

  check(result.ok, `the committed example recipe renders clean: ${JSON.stringify(result.errors)}`);
  check(result.header.canon === 'canon', 'the header carries the repository path');
  check(result.markdown.startsWith('# Batch release capability'),
    'the heading resolved from the model');
  check(result.markdown.includes('authorised operator'), 'a block scalar resolves to its prose');
  check(result.markdown.includes('Figure 1 shows where'), 'figref resolved');
  check(result.instructionSlots.length === 1 && result.instructionSlots[0].slotId === 'market-size',
    'the example exercises exactly one instruction slot');
  check(result.markdown.includes('{{# instruct market-size }}'),
    'which pass 1 leaves untouched');
}

// ── Filename / header kind cross-check ──────────────────────────────────

{
  const result = await runPass1({
    text: tpl('x'),
    recipePath: join(FIXTURES, 'product.srs.ttrs'),
    repositoryRoot: null,
  });
  check(codes(result).includes('TTRS-013'), 'filename kind disagreeing with the header is flagged');
}

{
  const result = await runPass1({
    text: tpl('x'),
    recipePath: join(FIXTURES, 'product.mrd.trs'),
    repositoryRoot: null,
  });
  check(codes(result).includes('TTRS-013'), 'a .trs near-miss filename is not accepted as a recipe');
}

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('All pass1 checks passed.');
