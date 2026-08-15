#!/usr/bin/env node
// Unit tests for src/render-pdf.mjs, against its own PDF constraint: page
// size is A4, declared explicitly — a renderer that omits the declaration
// defaults to US Letter and silently spills the last 18 mm onto a second
// page. Verify the rendered output reports 595 x 842 pt.
//
// This module ships no PDF parser (zero-dependency posture, see
// render-pdf.mjs's own header) — these checks read the structure directly:
// the magic header/footer, the explicit `/MediaBox`, and that the xref
// table's byte offsets actually land on the object they claim to.
//
// Run: node packages/document-renderer/tests/test_render_pdf.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { renderMarkdownToPdf } from '../src/render-pdf.mjs';

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

function asLatin1(buf) { return buf.toString('latin1'); }

// Parses the xref table this module writes and asserts every offset in it
// lands exactly on "<n> 0 obj" for object n — i.e. the table is not just
// present, it is correct.
function checkXrefOffsets(buf, text) {
  const startxrefMatch = /startxref\n(\d+)\n%%EOF/.exec(text);
  if (!check(startxrefMatch, 'startxref points to an offset, and %%EOF follows it')) return;
  const xrefOffset = Number(startxrefMatch[1]);
  check(text.slice(xrefOffset, xrefOffset + 4) === 'xref', 'startxref\'s own offset lands exactly on the xref table');

  const xrefBlock = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(text);
  if (!check(xrefBlock, 'the xref table is well-formed')) return;
  const count = Number(xrefBlock[1]);
  // Split on the line terminator only, filtering the one empty trailing
  // element `\n`-splitting leaves behind — NOT `.trim()` first: every real
  // entry (including the last) ends "n \n", and trimming the block strips
  // that final entry's own significant trailing space along with the
  // newline, which would fail it as malformed when it is not.
  const entries = xrefBlock[2].split('\n').filter((line) => line.length > 0);
  check(entries.length === count, `xref declares ${count} entries and carries that many`);

  // Entry 0 is the free-list head; objects are numbered from 1.
  for (let i = 1; i < entries.length; i++) {
    const m = /^(\d{10}) 00000 n/.exec(entries[i]);
    if (!check(m, `xref entry ${i} is well-formed`)) continue;
    const offset = Number(m[1]);
    const objNum = i;
    check(
      text.slice(offset, offset + `${objNum} 0 obj`.length) === `${objNum} 0 obj`,
      `xref entry for object ${objNum} points at byte ${offset}, which is where "${objNum} 0 obj" actually starts`,
    );
  }
}

// ── The A4 constraint — the one requirement the epic names by exact value ─

{
  const buf = renderMarkdownToPdf('# Title\n\nA short paragraph.');
  const text = asLatin1(buf);
  check(text.startsWith('%PDF-1.4'), 'the file starts with a PDF magic header');
  check(text.trimEnd().endsWith('%%EOF'), 'the file ends with %%EOF');
  check(text.includes('/MediaBox [0 0 595 842]'), 'every page declares A4 explicitly — 595 x 842 pt at 72dpi');
  checkXrefOffsets(buf, text);
}

// ── Content actually reaches the page ─────────────────────────────────────

{
  const buf = renderMarkdownToPdf('# Batch release capability\n\nThe lead requirement is present.');
  const text = asLatin1(buf);
  check(text.includes('(Batch release capability) Tj'), 'a heading is placed in a content stream');
  check(text.includes('The lead requirement is present.') || /\(.*lead requirement.*\) Tj/.test(text),
    'paragraph text reaches a content stream');
  check(text.includes('/BaseFont /Helvetica'), 'the base-14 Helvetica font needs no embedding, and carries none');
}

// ── Multi-page pagination — a long document produces more than one /Page ─

{
  const longBody = Array.from({ length: 200 }, (_, i) => `Paragraph number ${i} of a long document, long enough to force a page break somewhere in the middle of this run.`).join('\n\n');
  const buf = renderMarkdownToPdf(longBody);
  const text = asLatin1(buf);
  const pageCount = (text.match(/\/Type \/Page(?!s)/g) ?? []).length;
  check(pageCount > 1, `a long document paginates — got ${pageCount} page object(s)`);
  const kidsMatch = /\/Kids \[([^\]]*)\]/.exec(text);
  check(kidsMatch, '/Pages carries a /Kids array');
  if (kidsMatch) {
    const kidsCount = kidsMatch[1].trim().split(/\s+0\s+R\s*/).filter(Boolean).length;
    check(kidsCount === pageCount, `/Kids lists exactly as many pages as were emitted (${kidsCount} vs ${pageCount})`);
  }
  check(/\/Count (\d+)/.exec(text)[1] === String(pageCount), '/Pages /Count agrees with the number of pages emitted');
  checkXrefOffsets(buf, text);
}

// ── Figures become a named placeholder, never a silently dropped line ────

{
  const buf = renderMarkdownToPdf('Before figure.\n\n![Context diagram](diagrams/context.png)\n\nAfter figure.');
  const text = asLatin1(buf);
  check(text.includes('[Figure: Context diagram]'), 'a figure is placed as a named, visible placeholder');
}

// ── Special characters this module\'s own markers use are never corrupted ─

{
  const buf = renderMarkdownToPdf('Unresolved: «unresolved: REQ-999» flagged ⚑U — an em dash, too.');
  const text = asLatin1(buf);
  check(!/[^\x00-\xFF]/.test(text), 'the emitted bytes never fall outside a single byte per character');
  check(text.includes('<<unresolved: REQ-999>>') || text.includes('unresolved: REQ-999'),
    'the unresolved-reference marker text survives sanitisation in recognisable form');
  check(text.trimEnd().endsWith('%%EOF'), 'the file is still well-formed after non-ASCII input');
}

// ── Escaping — parens and backslashes in text never break the content stream

{
  const buf = renderMarkdownToPdf('A line with (parens) and a backslash \\ in it.');
  const text = asLatin1(buf);
  check(text.includes('\\(parens\\)'), 'parentheses in text are escaped for the PDF string literal');
  checkXrefOffsets(buf, text);
}

// ── Empty input still produces a well-formed, single-page PDF ────────────

{
  const buf = renderMarkdownToPdf('');
  const text = asLatin1(buf);
  check(text.includes('/MediaBox [0 0 595 842]'), 'even an empty document gets one well-formed A4 page');
  check((text.match(/\/Type \/Page(?!s)/g) ?? []).length === 1, 'exactly one page, not zero');
}

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('All render-pdf checks passed.');
