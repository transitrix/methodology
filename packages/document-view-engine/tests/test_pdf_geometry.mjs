#!/usr/bin/env node
// Unit tests for src/pdf-geometry.mjs — reading page sizes back out of a
// produced PDF and checking them against §7's declared geometry.
//
// The fixtures below are hand-written minimal PDFs rather than engine output:
// the point of the check is what it does with bytes it is handed, and a
// hand-written fixture is the only way to exercise the failing cases (US
// Letter, an unreadable page tree) deterministically and with no engine
// installed.
//
// Run: node packages/document-view-engine/tests/test_pdf_geometry.mjs
// Exit: 0 = all pass; 1 = a check failed.

import {
  readPageGeometry,
  verifyPageGeometry,
  A4_PORTRAIT_PT,
  A4_LANDSCAPE_PT,
} from '../src/pdf-geometry.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

// Builds a minimal PDF body: one /Pages node plus one object per page spec.
// `box` and `rotate` are per page; `inheritedBox` goes on the /Pages node.
function pdf(pages, { inheritedBox = null } = {}) {
  const kids = pages.map((_, i) => `${i + 3} 0 R`).join(' ');
  const inherited = inheritedBox ? ` /MediaBox [${inheritedBox}]` : '';
  const objects = [
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Count ${pages.length} /Kids [${kids}]${inherited} >> endobj`,
    ...pages.map((p, i) => {
      const box = p.box ? ` /MediaBox [${p.box}]` : '';
      const rotate = p.rotate === undefined ? '' : ` /Rotate ${p.rotate}`;
      return `${i + 3} 0 obj << /Type /Page /Parent 2 0 R${box}${rotate} >> endobj`;
    }),
  ];
  return `%PDF-1.7\n${objects.join('\n')}\n%%EOF\n`;
}

const A4 = '0 0 595.276 841.89';
const A4_LAND = '0 0 841.89 595.276';
const LETTER = '0 0 612 792';

function run() {
  // ── readPageGeometry ─────────────────────────────────────────────────
  const twoUp = readPageGeometry(pdf([{ box: A4 }, { box: A4 }]));
  check(twoUp.pages.length === 2, 'reads one entry per page object');
  check(Math.round(twoUp.pages[0].width) === 595 && Math.round(twoUp.pages[0].height) === 842,
    'reads A4 portrait as 595 × 842 pt');

  const landscape = readPageGeometry(pdf([{ box: A4_LAND }]));
  check(Math.round(landscape.pages[0].width) === 842 && Math.round(landscape.pages[0].height) === 595,
    'reads a landscape MediaBox as 842 × 595 pt');

  // A landscape page written the other legal way: portrait box + /Rotate 90.
  // It opens at 842 × 595, so it must read that way too.
  const rotated = readPageGeometry(pdf([{ box: A4, rotate: 90 }]));
  check(Math.round(rotated.pages[0].width) === 842 && Math.round(rotated.pages[0].height) === 595,
    '/Rotate 90 on a portrait box reads as landscape');
  const rotated270 = readPageGeometry(pdf([{ box: A4, rotate: 270 }]));
  check(Math.round(rotated270.pages[0].width) === 842, '/Rotate 270 also swaps the axes');
  const rotated180 = readPageGeometry(pdf([{ box: A4, rotate: 180 }]));
  check(Math.round(rotated180.pages[0].width) === 595, '/Rotate 180 leaves the axes alone');

  // MediaBox is inheritable — a page declaring none takes the page-tree
  // node's. Missing that fallback would report zero pages on a perfectly
  // ordinary PDF.
  const inherited = readPageGeometry(pdf([{}], { inheritedBox: A4 }));
  check(inherited.pages.length === 1, 'a page with no MediaBox of its own is still a page');
  check(Math.round(inherited.pages[0].height) === 842, 'MediaBox is inherited from the page-tree node');

  // A page's own box wins over the inherited one — that is how the single
  // landscape page in an otherwise-portrait document is expressed.
  const mixed = readPageGeometry(pdf([{}, { box: A4_LAND }], { inheritedBox: A4 }));
  check(Math.round(mixed.pages[0].width) === 595 && Math.round(mixed.pages[1].width) === 842,
    "a page's own MediaBox overrides the inherited one");

  // /Type /Pages must not be mistaken for /Type /Page — the prefix match
  // would otherwise count the tree node itself as a page.
  check(readPageGeometry(pdf([{ box: A4 }])).pages.length === 1,
    'the /Pages tree node is not counted as a page');

  // ── verifyPageGeometry ───────────────────────────────────────────────
  check(verifyPageGeometry(pdf([{ box: A4 }, { box: A4 }])).ok,
    'an all-A4-portrait document passes');
  check(verifyPageGeometry(pdf([{ box: A4 }, { box: A4_LAND }, { box: A4 }])).ok,
    'a portrait document with one landscape page passes — §7 asks for exactly that');
  check(verifyPageGeometry(pdf([{ box: A4, rotate: 90 }])).ok,
    'a rotated landscape page passes');

  // The failure §7 names outright.
  const letter = verifyPageGeometry(pdf([{ box: LETTER }]));
  check(!letter.ok, 'a US Letter page fails');
  check(/US Letter/.test(letter.problems[0]), 'the US Letter failure is named as US Letter, not as a bare mismatch');
  check(/declaration was ignored/.test(letter.problems[0]),
    'the US Letter failure says what actually went wrong — the declaration was ignored');
  check(/612/.test(letter.problems[0]) && /792/.test(letter.problems[0]),
    'the failure reports the size it actually measured');

  const oneBad = verifyPageGeometry(pdf([{ box: A4 }, { box: LETTER }, { box: A4 }]));
  check(!oneBad.ok, 'one wrong page fails the whole document');
  check(oneBad.problems.length === 1 && /page 2\b/.test(oneBad.problems[0]),
    'the failure names which page, by 1-based number');

  // An unreadable PDF must not look like a correct one.
  const opaque = verifyPageGeometry('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n');
  check(!opaque.ok, 'a PDF with no readable page objects fails rather than passing vacuously');
  check(/not a verified one/.test(opaque.problems[0]),
    'the unreadable case says why it is a failure and not a pass');
  check(verifyPageGeometry('').ok === false, 'empty input fails');

  // Whole-point output from an engine that rounds must pass too.
  check(verifyPageGeometry(pdf([{ box: '0 0 595 842' }])).ok, 'whole-point A4 passes within tolerance');
  check(!verifyPageGeometry(pdf([{ box: '0 0 595 850' }])).ok, 'a size outside tolerance fails');

  // A caller can narrow the allowed set — a portrait-only deliverable.
  const narrowed = verifyPageGeometry(pdf([{ box: A4_LAND }]), { allow: [A4_PORTRAIT_PT] });
  check(!narrowed.ok, 'a caller can require portrait only');
  check(verifyPageGeometry(pdf([{ box: A4_LAND }]), { allow: [A4_LANDSCAPE_PT] }).ok,
    'a caller can require landscape only');

  // Bytes, not just strings — this is what an engine actually returns.
  check(verifyPageGeometry(Buffer.from(pdf([{ box: A4 }]), 'latin1')).ok,
    'accepts PDF bytes, not only a string');
  check(verifyPageGeometry(new Uint8Array(Buffer.from(pdf([{ box: A4 }]), 'latin1'))).ok,
    'accepts a Uint8Array');
}

run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_pdf_geometry: all checks passed.');
