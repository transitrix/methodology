#!/usr/bin/env node
// Unit + integration tests for src/render.mjs — render profiles (§4) applied
// to the derived content evaluate.mjs resolves.
//
// Run: node packages/document-view-engine/tests/test_render.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { parseGlossaryYaml, glossaryField } from '../src/glossary-view.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderDocument } from '../src/render.mjs';
import { parseRecipe } from '../src/parse-recipe.mjs';
import { createEvaluator } from '../src/evaluate.mjs';

test('CLI policy and presentation are independent, including invalid options', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'render-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'canon'));
  const file = join(root, 'recipe.md');
  const cli = new URL('../src/render.mjs', import.meta.url);
  const { fileURLToPath } = await import('node:url');
  const run = (...args) => spawnSync(process.execPath, [fileURLToPath(cli), file, ...args], { encoding: 'utf8' });
  for (const [body, expected] of [['Manual prose', 0], ['{{ TERM-MISSING-1.name }}', 1], ['{{ figure absent.png as = missing }}\n{{ figref unknown }}', 1]]) {
    await writeFile(file, `---\ndocument: CLI test\ncanon: canon\nprofile: neutral\n---\n${body}\n`);
    const results = ['review', 'clean'].map(profile => run('--profile', profile));
    for (const result of results) {
      assert.equal(result.status, expected, result.stderr);
      assert.match(result.stdout, /<!DOCTYPE html>/);
    }
    const evidence = results.map(result => JSON.parse(result.stderr));
    for (const key of ['document', 'counts', 'diagnostics', 'diagnosticFailed']) assert.deepEqual(evidence[0][key], evidence[1][key]);
    assert.equal(run('--profile', 'clean', '--fail-on', '').status, 0);
    assert.equal(run('--fail-on', 'suspect').status, 0);
  }
  // Exercise suspicion through real history and the subprocess boundary.
  const git = (date, ...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8',
      env: { ...process.env, GIT_AUTHOR_NAME: 'Render test',
        GIT_AUTHOR_EMAIL: 'render@example.invalid', GIT_COMMITTER_NAME: 'Render test',
        GIT_COMMITTER_EMAIL: 'render@example.invalid', GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date } });
    assert.equal(result.status, 0, result.stderr);
  };
  const initialDate = '2020-01-01T12:00:00Z';
  git(initialDate, 'init');
  const lifecycle = 'zone: canon\nadmission_state: active\nvalid_from: "2020-01-01"\nvalid_to: null\n';
  await mkdir(join(root, 'canon', 'elements'));
  await mkdir(join(root, 'canon', 'relations'));
  for (const id of ['REQUIREMENT-1', 'REQUIREMENT-2']) {
    await writeFile(join(root, 'canon', 'elements', `${id}.yaml`), `id: ${id}\nname: Original\n${lifecycle}`);
  }
  await writeFile(join(root, 'canon', 'relations', 'REL-1.yaml'),
    `id: REL-1\ntype: relates_to\nfrom: REQUIREMENT-1\nto: REQUIREMENT-2\nadmitted_at: "2020-01-02"\n${lifecycle}`);
  git(initialDate, 'add', '.');
  git(initialDate, 'commit', '-m', 'Initial admitted relation and endpoints');
  await writeFile(join(root, 'canon', 'elements', 'REQUIREMENT-1.yaml'),
    `id: REQUIREMENT-1\nname: Changed after admission\n${lifecycle}`);
  git('2020-01-03T12:00:00Z', 'add', '.');
  git('2020-01-03T12:00:00Z', 'commit', '-m', 'Change relation endpoint');
  await writeFile(file, '---\ndocument: Suspect CLI test\ncanon: canon\n---\n{{ REL-1 }}\n');
  for (const [policy, status] of [[[], 0], [['--fail-on', 'suspect'], 1], [['--fail-on', ''], 0]]) {
    const evidence = [];
    for (const profile of ['review', 'clean']) {
      const result = run('--profile', profile, ...policy);
      assert.equal(result.status, status, result.stderr);
      const report = JSON.parse(result.stderr);
      assert.equal(report.counts.suspect, 1);
      assert.equal(report.document.find(event => event.type === 'inline').result.state, 'suspect');
      assert.equal(report.diagnosticFailed, status === 1);
      evidence.push(report);
    }
    for (const key of ['document', 'counts', 'diagnostics', 'diagnosticFailed']) {
      assert.deepEqual(evidence[0][key], evidence[1][key]);
    }
  }
  for (const args of [['--profile', 'bogus'], ['--fail-on', 'ok'], ['--profile'], ['--unknown'], ['--profile', 'clean', '--profile', 'review']]) {
    const result = run(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
  }
});

test('all reference states retain evidence in both profiles and every policy', async () => {
  for (const state of ['suspect', 'unresolved', 'not-admitted', 'out-of-validity']) {
    const ast = [{ type: 'inline', id: 'TERM-1', fields: ['name'] }, {
      type: 'each', entityType: 'TERM', where: [], orderBy: null,
      children: [{ type: 'field-ref', fields: ['name'] }],
    }, { type: 'trace', from: 'TERM', to: 'TERM', via: 'related' }];
    const evaluator = {
      evaluateEach: async () => ['TERM-1'],
      evaluateFieldPath: async () => ({ state, content: 'value' }),
      evaluateTrace: async () => ({ rows: ['TERM-1'], cols: ['TERM-1'], covered: new Set() }),
    };
    for (const failOn of [undefined, [], ['suspect']]) {
      const review = await renderDocument(ast, evaluator, { profile: 'review', failOn });
      const clean = await renderDocument(ast, evaluator, { profile: 'clean', failOn });
      for (const key of ['document', 'counts', 'diagnostics', 'diagnosticFailed']) assert.deepEqual(review[key], clean[key]);
      assert.equal(clean.counts[state], 2);
      assert.equal(clean.diagnosticFailed, (failOn ?? ['unresolved', 'not-admitted', 'out-of-validity']).includes(state));
      assert.doesNotMatch(clean.html, /dv-flag|⚑/);
      assert.match(review.html, /dv-flag/);
    }
  }
});

test('mixed expanded illustrations renumber captions and every reference on insertion', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'numbering-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'source'), 'live source');
  const figure = (as) => ({ type: 'figure', path: 'source', as });
  const ref = (name) => ({ type: 'figref', name });
  const ast = [ref('last'), ref('first'), { type: 'view', path: 'source', as: 'first' }, {
    type: 'each', entityType: 'TERM', where: [], orderBy: null,
    children: [figure(), { type: 'view', path: 'source' }],
  }, figure('last'), ref('first'), ref('last')];
  const options = { recipeDir: root, viewAdapter: async () => ({ html: '<svg><text>Live</text></svg>' }) };
  for (const shift of [0, 1]) {
    const result = await renderDocument(shift ? [figure('inserted'), ...ast] : ast,
      { evaluateEach: async () => ['TERM-1', 'TERM-2'] }, options);
    const numbers = Array.from({ length: 6 + shift }, (_, i) => i + 1);
    assert.deepEqual(result.document.filter(n => ['figure', 'view'].includes(n.type)).map(n => n.number), numbers);
    assert.deepEqual([...result.html.matchAll(/<figcaption>Figure (\d+)<\/figcaption>/g)].map(m => +m[1]), numbers);
    assert.deepEqual([...result.html.matchAll(/<span class="dv-figref">Figure (\d+)<\/span>/g)].map(m => +m[1]), [6 + shift, 1 + shift, 1 + shift, 6 + shift]);
    assert.deepEqual(result.diagnostics, []);
  }
});

test('source and adapter failures preserve causes, flags and clean failOn behavior', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'failures-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'invalid'), 'not a view');
  await mkdir(join(root, 'directory'));
  const cases = [
    ['figure', 'absent', undefined, 'missing-file'],
    ['view', 'absent', undefined, 'missing-file'],
    ['view', 'directory', undefined, 'unreadable-source'],
    ['view', 'invalid', undefined, 'view-parse-failed'],
    ['view', 'invalid', async () => { throw Error('broken'); }, 'view-render-failed'],
    ['view', 'invalid', async () => ({}), 'view-render-failed'],
    ['view', 'invalid', async () => ({ html: 42 }), 'view-render-failed'],
  ];
  for (const [type, path, viewAdapter, code] of cases) {
    for (const profile of ['review', 'clean']) {
      const options = { recipeDir: root, profile, viewAdapter };
      const result = await renderDocument([{ type, path }], {}, options);
      assert.deepEqual(result.diagnostics, [{ code, source: path, number: 1, state: 'unresolved' }]);
      assert.equal(result.failed, profile === 'clean');
      assert.equal(result.html.includes('⚑U'), profile === 'review');
      assert.equal((await renderDocument([{ type, path }], {}, { ...options, failOn: [] })).failed, false);
    }
  }
});

test('adapter preserves SVG and fit; duplicate expanded anchors fail', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'adapter-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'source'), 'live source');
  const svg = '<svg><text>Live label</text></svg>';
  for (const fit of [undefined, 'page', 'none']) {
    let calls = 0;
    const viewAdapter = async ({ text }) => { assert.equal(text, 'live source'); calls++; return { html: svg, suspect: true }; };
    const result = await renderDocument([{ type: 'view', path: 'source', fit }], {}, { recipeDir: root, viewAdapter });
    assert.equal(calls, 1);
    assert.ok(result.html.includes(svg));
    assert.ok(result.html.includes(`dv-fit-${fit ?? 'width'}`));
    assert.equal(result.diagnostics[0].code, 'suspect-objects');
  }
  const ast = [{ type: 'figref', name: 'absent' }, { type: 'each', entityType: 'TERM', where: [], children: [{ type: 'figure', path: 'source', as: 'dup' }] }, { type: 'figref', name: 'dup' }];
  const result = await renderDocument(ast, { evaluateEach: async () => ['TERM-1', 'TERM-2'] }, { recipeDir: root, profile: 'clean' });
  assert.equal(result.failed, true);
  assert.deepEqual(result.diagnostics.map(d => d.code), ['duplicate-anchor', 'unknown-anchor', 'ambiguous-anchor']);
  assert.equal(result.document.find(d => d.type === 'figure').provenance, 'manual');
});

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function checkEqual(actual, expected, msg) {
  if (actual !== expected) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// ── Unit — a stub evaluator isolates render.mjs's own logic from canon I/O ─

function stubEvaluator(byId, byRow) {
  return {
    async evaluateFieldPath(id, fields) {
      const key = `${id}::${fields.join('.')}`;
      return byId[key] ?? { id, state: 'unresolved', flag: '⚑U', content: null };
    },
    async evaluateEach() {
      return Object.keys(byRow ?? {});
    },
  };
}

async function run() {
  // ok, suspect, not-admitted, out-of-validity, unresolved — one inline each
  {
    const ast = [
      { type: 'inline', id: 'A-1', fields: ['x'] },
      { type: 'text', value: ' ' },
      { type: 'inline', id: 'B-1', fields: ['x'] },
      { type: 'text', value: ' ' },
      { type: 'inline', id: 'C-1', fields: ['x'] },
      { type: 'text', value: ' ' },
      { type: 'inline', id: 'D-1', fields: ['x'] },
      { type: 'text', value: ' ' },
      { type: 'inline', id: 'E-1', fields: ['x'] },
    ];
    const evaluator = stubEvaluator({
      'A-1::x': { id: 'A-1', state: 'ok', flag: null, content: 'clean value' },
      'B-1::x': { id: 'B-1', state: 'suspect', flag: '⚑S', content: 'suspect value' },
      'C-1::x': { id: 'C-1', state: 'not-admitted', flag: '⚑A', content: null },
      'D-1::x': { id: 'D-1', state: 'out-of-validity', flag: '⚑V', content: null },
      'E-1::x': { id: 'E-1', state: 'unresolved', flag: '⚑U', content: null },
    });

    const review = await renderDocument(ast, evaluator, { profile: 'review' });
    check(review.html.includes('<span class="dv-ok">clean value</span>'), 'review: ok renders plain, no flag');
    check(review.html.includes('<span class="dv-suspect">suspect value<sup class="dv-flag">⚑S</sup></span>'), 'review: suspect carries colour + margin-mark flag');
    check(review.html.includes('<span class="dv-unresolved"><sup class="dv-flag">⚑A</sup></span>'), 'review: not-admitted renders red with ⚑A');
    check(review.html.includes('<span class="dv-unresolved"><sup class="dv-flag">⚑V</sup></span>'), 'review: out-of-validity renders red with ⚑V');
    check(review.html.includes('<span class="dv-unresolved"><sup class="dv-flag">⚑U</sup></span>'), 'review: unresolved renders red with ⚑U (flag glyph + margin mark)');
    checkEqual(review.counts.ok, 1, 'review: counts tally by state (ok)');
    checkEqual(review.counts.suspect, 1, 'review: counts tally by state (suspect)');

    const clean = await renderDocument(ast, evaluator, { profile: 'clean' });
    check(clean.html.includes('<span class="dv-clean">clean value</span>'), 'clean: content renders, no colour class name leaks the state');
    check(!clean.html.includes('⚑'), 'clean: no flag glyphs anywhere');
    check(clean.failed, 'clean: fails when unresolved/not-admitted/out-of-validity occurred (default failOn)');
  }

  // clean profile: suspect-only does not fail by default, but does with a custom failOn
  {
    const ast = [{ type: 'inline', id: 'B-1', fields: ['x'] }];
    const evaluator = stubEvaluator({ 'B-1::x': { id: 'B-1', state: 'suspect', flag: '⚑S', content: 'v' } });
    const defaultFailOn = await renderDocument(ast, evaluator, { profile: 'clean' });
    check(!defaultFailOn.failed, 'clean: suspect alone warns, does not fail, under the default failOn set');
    const customFailOn = await renderDocument(ast, evaluator, { profile: 'clean', failOn: ['suspect'] });
    check(customFailOn.failed, 'clean: --fail-on can be configured to fail on suspect too');
  }

  // clean profile: an all-ok render exits clean
  {
    const ast = [{ type: 'inline', id: 'A-1', fields: ['x'] }];
    const evaluator = stubEvaluator({ 'A-1::x': { id: 'A-1', state: 'ok', flag: null, content: 'v' } });
    const clean = await renderDocument(ast, evaluator, { profile: 'clean' });
    check(!clean.failed, 'clean: an all-ok render does not fail');
  }

  // each / field-ref
  {
    const ast = [{
      type: 'each',
      entityType: 'REQUIREMENT',
      where: [],
      orderBy: null,
      children: [
        { type: 'field-ref', fields: ['name'] },
        { type: 'text', value: ';' },
      ],
    }];
    const evaluator = {
      async evaluateEach() { return ['ROW-1', 'ROW-2']; },
      async evaluateFieldPath(id, fields) {
        checkEqual(fields.join('.'), 'name', 'field-ref inside each passes its own field path through');
        return { id, state: 'ok', flag: null, content: `${id}-name` };
      },
    };
    const review = await renderDocument(ast, evaluator, { profile: 'review' });
    checkEqual(review.document[0].rowIds.length, 2, 'selection event retains row IDs');
    checkEqual(review.document[1].id, 'ROW-1', 'current-object event retains binding');
    checkEqual(review.document[1].result.state, 'ok', 'current-object event retains state');
    checkEqual(review.html, '<span class="dv-ok">ROW-1-name</span>;<span class="dv-ok">ROW-2-name</span>;', 'each renders its children once per selected row, in order');
  }

  // a field-ref outside any each is unreachable via parseRecipe (rejected
  // at parse time) but render.mjs still degrades safely if handed one
  {
    const ast = [{ type: 'field-ref', fields: ['x'] }];
    const evaluator = stubEvaluator({});
    const clean = await renderDocument(ast, evaluator, { profile: 'clean' });
    check(clean.failed, 'a field-ref with no current row renders unresolved rather than throwing');
    const review = await renderDocument(ast, evaluator, { profile: 'review' });
    for (const result of [review, clean]) {
      assert.deepEqual(result.document, [{
        type: 'field-ref', fields: ['x'], id: null,
        result: { id: null, state: 'unresolved', flag: '⚑U', content: null },
        usage: { type: null, fields: ['x'] },
      }]);
      checkEqual(result.counts.unresolved, 1, 'unbound field retains unresolved count');
    }
    check(!review.failed, 'unbound field does not fail review profile');
    checkEqual(review.html, '<span class="dv-unresolved"><sup class="dv-flag">⚑U</sup></span>', 'unbound field retains review flag');
    checkEqual(clean.html, '<span class="dv-clean"></span>', 'unbound field retains clean output');
    check(clean.document[0].fields !== ast[0].fields, 'unbound field provenance copies requested fields');
  }

  // figure / figref — numbering, manual/missing borders, forward references
  {
    const recipeDir = mkdtempSync(join(tmpdir(), 'render-figs-'));
    writeFileSync(join(recipeDir, 'device.png'), 'not a real png, existence is all that matters', 'utf8');

    // a figref before its target (forward reference) still resolves, and
    // numbering is shared across the whole document, not just the ref's own scope
    const ast = [
      { type: 'figref', name: 'fig-device' },
      { type: 'text', value: ' ' },
      { type: 'figure', path: 'device.png', caption: 'Device, front', as: 'fig-device' },
      { type: 'text', value: ' ' },
      { type: 'figure', path: 'missing.png', caption: null, as: 'fig-missing' },
      { type: 'text', value: ' ' },
      { type: 'figref', name: 'fig-missing' },
      { type: 'text', value: ' ' },
      { type: 'figref', name: 'no-such-anchor' },
    ];
    const evaluator = stubEvaluator({});

    const review = await renderDocument(ast, evaluator, { profile: 'review', recipeDir });
    check(review.html.includes('<span class="dv-figref">Figure 1</span>'), 'figref: forward reference resolves to the correct number');
    check(review.html.includes('Figure 1 — Device, front'), 'figure: caption includes its assigned number and text');
    check(review.html.includes('dv-illus-manual'), 'figure: an existing file gets the manual border class');
    check(review.html.includes('dv-illus-missing'), 'figure: a missing file gets the missing border class');
    check(review.html.includes('Figure 2'), 'figure: numbering is sequential across the whole document, not per-caption');
    check(!review.failed, 'review profile carries no failed flag (only clean fails the build)');
    check(review.html.includes('<span class="dv-unresolved"><sup class="dv-flag">⚑U</sup></span>'), 'figref: an unresolved anchor name renders unresolved, like any other unresolvable reference');

    const clean = await renderDocument(ast, evaluator, { profile: 'clean', recipeDir });
    check(clean.html.includes('<figure class="dv-clean">'), 'clean profile: figures render without border-class or flag information');
    check(!clean.html.includes('dv-illus'), 'clean profile: no illustration border classes leak through');
    check(clean.failed, 'clean profile: a missing figure file fails the build');

    rmSync(recipeDir, { recursive: true, force: true });
  }

  // figure: a relative path with no recipeDir resolves against "."; an
  // absolute path is used as-is regardless of recipeDir
  {
    const ast = [{ type: 'figure', path: '/definitely/not/here.png', caption: null, as: null }];
    const evaluator = stubEvaluator({});
    const review = await renderDocument(ast, evaluator, { profile: 'review' });
    check(review.html.includes('src="/definitely/not/here.png"'), 'figure: an absolute path is used as-is, ignoring recipeDir');
    check(review.html.includes('dv-illus-missing'), 'figure: a nonexistent absolute path still renders as missing');
  }

  // unknown profile value rejected
  {
    let threw = false;
    try {
      await renderDocument([], stubEvaluator({}), { profile: 'bogus' });
    } catch {
      threw = true;
    }
    check(threw, 'an unknown profile value is rejected rather than silently rendering something');
  }

  // trace matrix — every row/column renders, covered cells get their own class
  {
    const matrix = {
      rows: ['REQUIREMENT-A-1', 'REQUIREMENT-B-1'],
      cols: ['VERIFICATION-1'],
      covered: new Set(['REQUIREMENT-A-1|VERIFICATION-1']),
    };
    const evaluator = { async evaluateTrace() { return matrix; } };
    const ast = [{ type: 'trace', from: 'REQUIREMENT', to: 'VERIFICATION', via: 'verifies' }];

    const review = await renderDocument(ast, evaluator, { profile: 'review' });
    checkEqual(review.document[0].usage.relation, 'verifies', 'trace retains requested relation');
    checkEqual(review.document[0].usage.pairs.length, 2, 'trace retains every matrix pair');
    checkEqual(review.document[0].usage.pairs[1].covered, false, 'uncovered pair remains explicit');
    check(review.html.includes('<table class="dv-trace">'), 'trace: renders as a table');
    check(review.html.includes('<th>REQUIREMENT-A-1</th>'), 'trace: every row id is a header cell');
    check(review.html.includes('<th>REQUIREMENT-B-1</th>'), 'trace: an uncovered row still renders, not dropped');
    check(review.html.includes('<th>VERIFICATION-1</th>'), 'trace: every col id is a header cell');
    check(review.html.includes('<td class="dv-trace-cell dv-ok">✓</td>'), 'trace: a covered cell renders ok-coloured with a checkmark');
    check(review.html.includes('<td class="dv-trace-cell dv-unresolved"><sup class="dv-flag">⚑U</sup></td>'), 'trace: an uncovered cell renders unresolved-coloured with the ⚑U flag');
    check(!review.failed, 'trace: an uncovered cell never fails the clean-profile build — it is a coverage gap, not a §3 state');

    const clean = await renderDocument(ast, evaluator, { profile: 'clean' });
    check(clean.html.includes('<td class="dv-clean">✓</td>'), 'trace clean: a covered cell renders plain with a checkmark, no colour class');
    check(clean.html.includes('<td class="dv-clean"></td>'), 'trace clean: an uncovered cell renders plain and empty, no flag');
    check(!clean.failed, 'trace clean: coverage gaps never fail the clean-profile build');
  }

  // view (blocks notation) — rendered SVG, missing file, unparseable file,
  // suspect border, and shared numbering with figure
  {
    const recipeDir = mkdtempSync(join(tmpdir(), 'render-views-'));
    const blocksYaml = [
      'notation: blocks',
      'name: "Test architecture"',
      '',
      'nested_blocks:',
      '  id: BLOCKS-TEST-1',
      '  name: "Test architecture"',
      '  blocks:',
      '    - id: APPLICATION-1',
      '      name: "Application"',
      '      children:',
      '        - id: FRONTEND',
      '          name: "Frontend"',
    ].join('\n');
    writeFileSync(join(recipeDir, 'arch.blocks.transitrix.yaml'), blocksYaml, 'utf8');
    writeFileSync(join(recipeDir, 'not-blocks.yaml'), 'notation: capability-map\nname: "Not blocks"\n', 'utf8');
    writeFileSync(join(recipeDir, 'ignored.png'), 'not a real png, existence is all that matters', 'utf8');

    const evaluator = {
      ...stubEvaluator({}),
      async resolveReference(id) {
        return id === 'APPLICATION-1' ? { id, state: 'suspect', flag: '⚑S' } : { id, state: 'ok', flag: null };
      },
    };

    const ast = [
      { type: 'figure', path: 'ignored.png', caption: null, as: null },
      { type: 'text', value: ' ' },
      { type: 'view', path: 'arch.blocks.transitrix.yaml', as: 'fig-arch', fit: 'width' },
      { type: 'text', value: ' ' },
      { type: 'view', path: 'missing.blocks.transitrix.yaml', as: null, fit: 'width' },
      { type: 'text', value: ' ' },
      { type: 'view', path: 'not-blocks.yaml', as: null, fit: 'width' },
    ];

    const review = await renderDocument(ast, evaluator, { profile: 'review', recipeDir });
    check(review.html.includes('<svg'), 'view: a valid blocks document renders inline SVG');
    check(review.html.includes('dv-illus-suspect'), 'view: a block id resolving suspect gets the suspect border class');
    check(review.html.includes('⚑S'), 'view: the suspect border carries the ⚑S flag as a second channel');
    check(review.html.includes('Figure 2'), 'view: numbering continues the sequence figure started (figure was Figure 1)');
    check((review.html.match(/dv-illus-missing/g) ?? []).length === 2, 'view: a missing file and an unparseable (wrong-notation) file both get the missing border class');

    const clean = await renderDocument(ast, evaluator, { profile: 'clean', recipeDir });
    check(clean.html.includes('<figure class="dv-clean'), 'view clean: renders without border-class or flag information');
    check(!clean.html.includes('dv-illus'), 'view clean: no illustration border classes leak through');
    check(clean.failed, 'view clean: a missing/unparseable view file fails the build');

    rmSync(recipeDir, { recursive: true, force: true });
  }

  // ── Integration — real parseRecipe + createEvaluator end to end ──
  {
    function writeYaml(dir, name, lines) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, name), lines.join('\n') + '\n', 'utf8');
    }
    const orgRoot = mkdtempSync(join(tmpdir(), 'render-'));
    const canonRoot = join(orgRoot, 'canon');
    const reqDir = join(canonRoot, 'elements', '01_motivation', 'requirements');

    writeYaml(reqDir, 'REQUIREMENT-ALPHA-1.yaml', [
      'notation: requirement', 'id: REQUIREMENT-ALPHA-1', 'name: "Alpha"', 'level: system', 'kind: functional',
      'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
    ]);
    writeYaml(reqDir, 'REQUIREMENT-BETA-1.yaml', [
      'notation: requirement', 'id: REQUIREMENT-BETA-1', 'name: "Beta"', 'level: system', 'kind: functional',
      'zone: canon', 'valid_from: "2020-01-01"', 'valid_to: null',
    ]);

    const recipeText = [
      '---',
      'document: test doc',
      'canon: ../canon',
      '---',
      '{{# each REQUIREMENT where level = system and kind = functional order by id }}',
      '{{ .name }} - {{ REQUIREMENT-GHOST-1.name }}',
      '{{/ each }}',
    ].join('\n');

    const { header, ast, errors } = parseRecipe(recipeText);
    checkEqual(errors.length, 0, 'the integration recipe parses cleanly');
    checkEqual(header.canon, '../canon', 'header canon path parsed');

    const evaluator = await createEvaluator(canonRoot);
    const review = await renderDocument(ast, evaluator, { profile: 'review', renderDate: '2026-08-06' });
    check(review.html.includes('<span class="dv-ok">Alpha</span>'), 'integration: real field access renders through the each loop');
    check(review.html.includes('<span class="dv-ok">Beta</span>'), 'integration: both selected rows render, in id order');
    check(review.html.includes('⚑U'), 'integration: the unresolved reference inside the loop still flags');

    const clean = await renderDocument(ast, evaluator, { profile: 'clean', renderDate: '2026-08-06' });
    check(clean.failed, 'integration: clean profile fails the build on the unresolved reference');

    rmSync(orgRoot, { recursive: true, force: true });
  }
}

await run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_render: all checks passed.');


const minimal = 'notation: glossary\nid: GLOSSARY-FULL-1\nname: Full glossary\n';

test('glossary config defaults, scoped lists, and invalid inputs', () => {
  assert.deepEqual(parseGlossaryYaml(minimal), { ok: true, name: 'Full glossary', types: [], groupBy: 'first_letter', showTypeBadge: true });
  const config = parseGlossaryYaml(minimal + 'view_config:\n  scope:\n    types:\n      - TERM\n      - BUSINESS_OBJECT\n  display:\n    group_by: none\n    show_type_badge: false\n');
  assert.deepEqual(config.types, ['TERM', 'BUSINESS_OBJECT']);
  assert.equal(config.groupBy, 'none');
  assert.equal(config.showTypeBadge, false);
  assert.equal(parseGlossaryYaml(minimal + 'view_config: {scope: {types: [TERM]}}').ok, false);
  for (const invalid of [minimal.replace('GLOSSARY-FULL-1', 'GLOSSARY-01'), minimal.replace('glossary\n', 'blocks\n'), minimal.replace('Full glossary', ''), minimal + 'view_config:\n  scope:\n    types: TERM\n', minimal + 'view_config:\n  display:\n    group_by: type\n']) assert.equal(parseGlossaryYaml(invalid).ok, false);
  assert.deepEqual(glossaryField('aliases: ["A, B", \'C # D\'] # comment', 'aliases'), ['A, B', 'C # D']);
  assert.equal(glossaryField('description: |\n  First line.\n  Second line.\nname: X', 'description'), 'First line.\nSecond line.\n');
  assert.equal(glossaryField('description: >-\n  First line.\n  Second line.\n', 'description'), 'First line. Second line.');
  assert.equal(parseGlossaryYaml(minimal + 'description: |\n  view_config:\n    display:\n      group_by: none\n').groupBy, 'first_letter');
});

test('glossary recipe renders canon definitions without writing canon', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'glossary-view-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const canon = join(root, 'canon');
  const elements = join(canon, 'elements', '02_business');
  await mkdir(elements, { recursive: true });
  const sources = new Map();
  for (const [id, fields] of [
    ['TERM-1', 'name: zebra\ndescription: |\n  A <script>definition</script>.\n  Second line.\naliases:\n  - "A, B"\n  - \'C # D\'\n'],
    ['BUSINESS_OBJECT-1', 'name: Alpha\ndescription: A modelled object.\n'],
    ['TERM-2', 'name: Proposed\ndescription: Not admitted.\nadmission_state: proposed\n'],
    ['TERM-3', 'name: Expired\ndescription: No longer valid.\nvalid_from: "2010-01-01"\nvalid_to: "2020-01-01"\n'],
    ['TERM-4', 'name: Undefined\n'],
    ['TERM-5', 'name: Future\ndescription: Not yet valid.\nvalid_from: "2099-01-01"\n'],
    ['TERM-7', 'name: Rejected\ndescription: Not admitted.\nadmission_state: rejected\n'],
  ]) {
    const path = join(elements, `${id}.yaml`);
    const lifecycle = `${fields.includes('valid_from:') ? '' : 'valid_from: "2020-01-01"\n'}${fields.includes('valid_to:') ? '' : 'valid_to: null\n'}`;
    const text = `id: ${id}\nzone: canon\n${lifecycle}${fields}`;
    sources.set(path, text);
    await writeFile(path, text);
  }
  await mkdir(join(elements, 'unresolved'));
  await writeFile(join(elements, 'unresolved', 'TERM-6.yaml'), 'id: TERM-6\nname: Unresolved\ndescription: Draft.\n');
  await mkdir(join(canon, 'relations'));
  await writeFile(join(canon, 'relations', 'REL-1.yaml'), 'id: REL-1\nname: Relation\ndescription: Not an element.\n');
  const view = join(root, 'full.glossary.transitrix.yaml');
  await writeFile(view, minimal);
  const { ast, errors } = parseRecipe('---\ndocument: glossary\ncanon: canon\n---\n{{ view full.glossary.transitrix.yaml }}');
  assert.deepEqual(errors, []);
  const evaluator = await createEvaluator(canon);
  const options = { recipeDir: root, renderDate: '2026-09-11', profile: 'clean' };
  const result = await renderDocument(ast, evaluator, options);
  assert.equal(result.failed, false);
  assert.match(result.html, /<section class="dv-glossary">/);
  assert.ok(result.html.indexOf('Alpha') < result.html.indexOf('zebra'));
  assert.match(result.html, /<h3>A<\/h3>/);
  assert.match(result.html, /<small>TERM<\/small>/);
  assert.match(result.html, /Also known as: A, B, C # D/);
  assert.match(result.html, /&lt;script&gt;definition&lt;\/script&gt;\.\nSecond line/);
  assert.doesNotMatch(result.html, /Proposed|Rejected|Expired|Undefined|Future|Unresolved|Relation|<script>/i);
  await writeFile(view, minimal + 'view_config:\n  scope:\n    types: [TERM]\n  display:\n    group_by: none\n    show_type_badge: false\n');
  const filtered = await renderDocument(ast, evaluator, options);
  assert.equal(filtered.failed, false);
  assert.match(filtered.html, /zebra/);
  assert.doesNotMatch(filtered.html, /Alpha|<small>|<h3>/);
  await writeFile(view, minimal + 'view_config:\n  display:\n    group_by: invalid\n');
  assert.equal((await renderDocument(ast, evaluator, options)).failed, true);
  for (const [path, text] of sources) assert.equal(await readFile(path, 'utf8'), text);
});
