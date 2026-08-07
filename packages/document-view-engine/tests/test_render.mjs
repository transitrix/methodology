#!/usr/bin/env node
// Unit + integration tests for src/render.mjs — render profiles (§4) applied
// to the derived content evaluate.mjs resolves.
//
// Run: node packages/document-view-engine/tests/test_render.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderDocument } from '../src/render.mjs';
import { parseSkeleton } from '../src/parse-skeleton.mjs';
import { createEvaluator } from '../src/evaluate.mjs';

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
    checkEqual(review.html, '<span class="dv-ok">ROW-1-name</span>;<span class="dv-ok">ROW-2-name</span>;', 'each renders its children once per selected row, in order');
  }

  // a field-ref outside any each is unreachable via parseSkeleton (rejected
  // at parse time) but render.mjs still degrades safely if handed one
  {
    const ast = [{ type: 'field-ref', fields: ['x'] }];
    const evaluator = stubEvaluator({});
    const clean = await renderDocument(ast, evaluator, { profile: 'clean' });
    check(clean.failed, 'a field-ref with no current row renders unresolved rather than throwing');
  }

  // figure / figref — numbering, manual/missing borders, forward references
  {
    const skeletonDir = mkdtempSync(join(tmpdir(), 'render-figs-'));
    writeFileSync(join(skeletonDir, 'device.png'), 'not a real png, existence is all that matters', 'utf8');

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

    const review = await renderDocument(ast, evaluator, { profile: 'review', skeletonDir });
    check(review.html.includes('<span class="dv-figref">Figure 1</span>'), 'figref: forward reference resolves to the correct number');
    check(review.html.includes('Figure 1 — Device, front'), 'figure: caption includes its assigned number and text');
    check(review.html.includes('dv-illus-manual'), 'figure: an existing file gets the manual border class');
    check(review.html.includes('dv-illus-missing'), 'figure: a missing file gets the missing border class');
    check(review.html.includes('Figure 2'), 'figure: numbering is sequential across the whole document, not per-caption');
    check(!review.failed, 'review profile carries no failed flag (only clean fails the build)');
    check(review.html.includes('<span class="dv-unresolved"><sup class="dv-flag">⚑U</sup></span>'), 'figref: an unresolved anchor name renders unresolved, like any other unresolvable reference');

    const clean = await renderDocument(ast, evaluator, { profile: 'clean', skeletonDir });
    check(clean.html.includes('<figure class="dv-clean">'), 'clean profile: figures render without border-class or flag information');
    check(!clean.html.includes('dv-illus'), 'clean profile: no illustration border classes leak through');
    check(clean.failed, 'clean profile: a missing figure file fails the build');

    rmSync(skeletonDir, { recursive: true, force: true });
  }

  // figure: a relative path with no skeletonDir resolves against "."; an
  // absolute path is used as-is regardless of skeletonDir
  {
    const ast = [{ type: 'figure', path: '/definitely/not/here.png', caption: null, as: null }];
    const evaluator = stubEvaluator({});
    const review = await renderDocument(ast, evaluator, { profile: 'review' });
    check(review.html.includes('src="/definitely/not/here.png"'), 'figure: an absolute path is used as-is, ignoring skeletonDir');
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

  // ── Integration — real parseSkeleton + createEvaluator end to end ──
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

    const skeletonText = [
      '---',
      'document: test doc',
      'canon: ../canon',
      '---',
      '{{# each REQUIREMENT where level = system and kind = functional order by id }}',
      '{{ .name }} - {{ REQUIREMENT-GHOST-1.name }}',
      '{{/ each }}',
    ].join('\n');

    const { header, ast, errors } = parseSkeleton(skeletonText);
    checkEqual(errors.length, 0, 'the integration skeleton parses cleanly');
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
