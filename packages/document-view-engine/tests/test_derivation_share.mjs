#!/usr/bin/env node
// Unit tests for src/derivation-share.mjs — §5's word-counting helpers in
// isolation from render.mjs's AST walk.
//
// Run: node packages/document-view-engine/tests/test_derivation_share.mjs
// Exit: 0 = all pass; 1 = a check failed.

import {
  manualWordCount,
  derivedWordCount,
  derivationShareRatio,
  formatDerivationShare,
  formatIllustrationsLine,
} from '../src/derivation-share.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function checkEqual(actual, expected, msg) {
  if (actual !== expected) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function run() {
  // manualWordCount — plain prose counts, headings and table rows are excluded
  checkEqual(manualWordCount('one two three'), 3, 'manualWordCount: plain prose counts every whitespace-delimited word');
  checkEqual(manualWordCount('# Heading text'), 0, 'manualWordCount: an ATX heading line is structure, excluded entirely');
  checkEqual(manualWordCount('###### Six deep'), 0, 'manualWordCount: heading depth 1-6 all excluded');
  checkEqual(manualWordCount('#no-space is not a heading'), 5, 'manualWordCount: "#" without following whitespace is not a heading — counted as prose');
  checkEqual(manualWordCount('| a | b |'), 0, 'manualWordCount: a markdown table row is structure, excluded');
  checkEqual(manualWordCount('  | a | b |'), 0, 'manualWordCount: a table row is recognised past leading whitespace');
  checkEqual(
    manualWordCount('# Title\nbody one two\n| col |\nmore body'),
    5,
    'manualWordCount: mixed lines — only non-structural lines contribute (body one two = 3, more body = 2)',
  );
  checkEqual(manualWordCount(''), 0, 'manualWordCount: empty text contributes nothing');
  checkEqual(manualWordCount('   '), 0, 'manualWordCount: whitespace-only text contributes nothing');

  // derivedWordCount — resolved content, no structure filtering
  checkEqual(derivedWordCount('two words'), 2, 'derivedWordCount: counts resolved content by whitespace');
  checkEqual(derivedWordCount('# not filtered here'), 4, 'derivedWordCount: a leading "#" in resolved content is never treated as structure — only text nodes carry skeleton markdown');
  checkEqual(derivedWordCount(null), 0, 'derivedWordCount: null content (an unresolved reference) counts as zero words');
  checkEqual(derivedWordCount(undefined), 0, 'derivedWordCount: undefined content counts as zero words');

  // derivationShareRatio
  checkEqual(derivationShareRatio(3, 1), 0.75, 'derivationShareRatio: derived / (derived + manual)');
  checkEqual(derivationShareRatio(0, 0), null, 'derivationShareRatio: no content at all is an undefined share, not zero');
  checkEqual(derivationShareRatio(5, 0), 1, 'derivationShareRatio: all-derived content is a 100% share');
  checkEqual(derivationShareRatio(0, 5), 0, 'derivationShareRatio: all-manual content is a 0% share');

  // formatDerivationShare / formatIllustrationsLine — the printed lines
  checkEqual(formatDerivationShare(3, 1), 'Derivation share: 75% (3 of 4 words)', 'formatDerivationShare: prints percentage and raw counts');
  checkEqual(formatDerivationShare(0, 0), 'Derivation share: n/a (0 of 0 words)', 'formatDerivationShare: an empty document prints n/a, not 0%');
  checkEqual(formatIllustrationsLine(2, 3), 'Illustrations — 2 of 3 rendered from the model', 'formatIllustrationsLine: prints the model-rendered count against the total');
  checkEqual(formatIllustrationsLine(0, 0), 'Illustrations — 0 of 0 rendered from the model', 'formatIllustrationsLine: a document with no illustrations still prints a well-formed line');
}

run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_derivation_share: all checks passed.');
