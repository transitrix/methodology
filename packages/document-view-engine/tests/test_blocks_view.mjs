#!/usr/bin/env node
// Unit tests for src/blocks-view.mjs — parsing a `blocks` notation (nested_blocks
// form) document and rendering it to inline SVG for the document-view engine's
// `{{ view ... }}` form.
//
// Run: node packages/document-view-engine/tests/test_blocks_view.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { parseBlocksYaml, collectBlockIds, renderBlocksSvg } from '../src/blocks-view.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }
function checkEqual(actual, expected, msg) {
  if (actual !== expected) {
    _failures.push(`${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function run() {
  // a two-level nested tree, matching 08-blocks.md §4's worked example
  {
    const text = [
      'notation: blocks',
      'name: "Software architecture"',
      '',
      'nested_blocks:',
      '  id: BLOCKS-ARCH-1',
      '  name: "Software architecture"',
      '  blocks:',
      '    - id: APPLICATION_LAYER',
      '      name: "Application Layer"',
      '      children:',
      '        - id: FRONTEND',
      '          name: "Frontend"',
      '        - id: BACKEND',
      '          name: "Backend"',
      '    - id: DATA_LAYER',
      '      name: "Data Layer"',
    ].join('\n');

    const parsed = parseBlocksYaml(text);
    check(parsed.ok, 'a well-formed nested_blocks document parses');
    checkEqual(parsed.blocks.length, 2, 'two top-level blocks parsed, in document order');
    checkEqual(parsed.blocks[0].id, 'APPLICATION_LAYER', 'first top-level block id');
    checkEqual(parsed.blocks[0].children.length, 2, 'nested children parsed');
    checkEqual(parsed.blocks[0].children[0].id, 'FRONTEND', 'first-level child id');
    checkEqual(parsed.blocks[1].children.length, 0, 'a childless block parses with an empty children array');

    const ids = collectBlockIds(parsed.blocks);
    checkEqual(ids.join(','), 'APPLICATION_LAYER,FRONTEND,BACKEND,DATA_LAYER', 'collectBlockIds walks depth-first, document order');

    const svg = renderBlocksSvg(parsed.blocks);
    check(svg.startsWith('<svg'), 'renderBlocksSvg produces an <svg> root element');
    check(svg.includes('Application Layer'), 'a container block\'s label is rendered');
    check(svg.includes('Frontend') && svg.includes('Backend'), 'leaf labels are rendered');
    check(svg.includes('<rect'), 'blocks render as rects');
  }

  // not the `blocks` notation
  {
    const parsed = parseBlocksYaml('notation: capability-map\nname: "x"\n');
    check(!parsed.ok, 'a non-blocks notation document is rejected');
  }

  // the grid (matrix-subset) root is not yet rendered
  {
    const text = [
      'notation: blocks',
      'name: "x"',
      'grid:',
      '  columns:',
      '    - { id: c1, name: "C1" }',
      '  rows:',
      '    - id: r1',
      '      name: "R1"',
      '      assign: { c1: "A" }',
    ].join('\n');
    const parsed = parseBlocksYaml(text);
    check(!parsed.ok, 'a grid-root blocks document is reported as not-yet-supported, not thrown');
  }

  // structurally broken input degrades to a parse failure, not a throw
  {
    check(!parseBlocksYaml('').ok, 'empty text does not parse');
    check(!parseBlocksYaml('notation: blocks\n').ok, 'a document with no nested_blocks root does not parse');
    check(!parseBlocksYaml('notation: blocks\nnested_blocks:\n  id: X\n').ok, 'a nested_blocks root with no blocks list does not parse');
  }

  // a single top-level block (no siblings) still renders
  {
    const text = [
      'notation: blocks',
      'name: "x"',
      'nested_blocks:',
      '  id: BLOCKS-X-1',
      '  blocks:',
      '    - id: SOLO',
      '      name: "Solo"',
    ].join('\n');
    const parsed = parseBlocksYaml(text);
    check(parsed.ok, 'a single top-level, childless block parses');
    const svg = renderBlocksSvg(parsed.blocks);
    check(svg.includes('Solo'), 'a lone leaf block still renders its label');
  }

  // a block whose name is omitted falls back to its id as the label
  {
    const text = [
      'notation: blocks',
      'name: "x"',
      'nested_blocks:',
      '  id: BLOCKS-Y-1',
      '  blocks:',
      '    - id: NO_NAME_BLOCK',
    ].join('\n');
    const parsed = parseBlocksYaml(text);
    check(parsed.ok, 'a block with no name field still parses');
    checkEqual(parsed.blocks[0].name, null, 'name is null when omitted');
    const svg = renderBlocksSvg(parsed.blocks);
    check(svg.includes('NO_NAME_BLOCK'), 'a block with no name renders its id as the label');
  }
}

run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_blocks_view: all checks passed.');
