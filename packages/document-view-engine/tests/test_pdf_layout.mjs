#!/usr/bin/env node
// Unit tests for src/pdf-layout.mjs — the §7 print-layout stylesheet and
// document wrapper (page-size declaration half; PDF conversion itself is a
// separate, dependency-gated slice — see the module header).
//
// Run: node packages/document-view-engine/tests/test_pdf_layout.mjs
// Exit: 0 = all pass; 1 = a check failed.

import { buildStylesheet, wrapDocument, convertToPdf } from '../src/pdf-layout.mjs';
import { renderDocument } from '../src/render.mjs';

// Stand-in print engines. No real one is bundled (see the module header), so
// the seam is exercised with two stubs that differ in exactly the way that
// matters: one reads the `@page` declaration out of the HTML it was handed and
// honours it; the other ignores it and falls back to its own default paper.
// That is the failure §7 exists to catch, and it is only reachable with a
// stub — a conforming engine would never produce it.

function minimalPdf(boxes) {
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    `2 0 obj << /Type /Pages /Count ${boxes.length} /Kids [${boxes.map((_, i) => `${i + 3} 0 R`).join(' ')}] >> endobj`,
    ...boxes.map((box, i) => `${i + 3} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [${box}] >> endobj`),
  ];
  return Buffer.from(`%PDF-1.7\n${objects.join('\n')}\n%%EOF\n`, 'latin1');
}

// Honours `@page { size: A4 }`, and gives any `.dv-fit-page` illustration the
// landscape page the named `@page landscape` rule selects for it.
function honouringEngine(html) {
  if (!/@page\s*\{[^}]*size:\s*A4;/.test(html)) return minimalPdf(['0 0 612 792']);
  // Matched on the class attribute, not the bare name — the stylesheet in the
  // same document mentions the selector too, and that is not a page.
  const landscapePages = (html.match(/class="[^"]*\bdv-fit-page\b/g) ?? []).length;
  return minimalPdf(['0 0 595.276 841.89', ...Array(landscapePages).fill('0 0 841.89 595.276')]);
}

const ignoringEngine = () => minimalPdf(['0 0 612 792']);

const _failures = [];
function check(cond, msg) { if (!cond) _failures.push(msg); return cond; }

async function run() {
  const css = buildStylesheet();

  // §7 "page size, declared, never inherited" — A4 in both orientations.
  check(/@page\s*\{[^}]*size:\s*A4;/.test(css), 'default @page declares A4 portrait');
  check(/@page\s*\{[^}]*margin:\s*20mm;/.test(css), 'default @page declares the 20mm margin');
  check(/@page\s+landscape\s*\{[^}]*size:\s*A4 landscape;/.test(css), 'named landscape @page declares A4 landscape');
  check(/@page\s+landscape\s*\{[^}]*margin:\s*15mm;/.test(css), 'named landscape @page declares the 15mm margin');

  // `fit = page` is the only skeleton-level trigger for a landscape page —
  // it must select the named page and force it onto its own page.
  check(/\.dv-fit-page\s*\{[^}]*page:\s*landscape;/.test(css), 'dv-fit-page selects the named landscape page');
  check(/\.dv-fit-page\s*\{[^}]*break-before:\s*page;/.test(css), 'dv-fit-page breaks before its own page');
  check(/\.dv-fit-page\s*\{[^}]*break-after:\s*page;/.test(css), 'dv-fit-page breaks after its own page');

  // Every class render.mjs actually emits must carry visual meaning here —
  // an un-styled class is a §4/§7 gap (colour or border silently missing).
  const mustStyle = [
    '.dv-ok', '.dv-suspect', '.dv-unresolved', '.dv-clean', '.dv-flag',
    '.dv-illus-view', '.dv-illus-suspect', '.dv-illus-manual', '.dv-illus-missing',
    '.dv-fit-width', '.dv-fit-none', '.dv-fit-page',
    '.dv-trace', '.dv-trace-cell', '.dv-figref',
    '.dv-derivation-share', '.dv-illustrations',
  ];
  for (const selector of mustStyle) {
    check(css.includes(selector), `stylesheet styles every class render.mjs emits: missing ${selector}`);
  }

  // §4 "colour is never the only channel" — the flag glyph is the margin
  // mark, so a screen reader / b&w print still distinguishes state without
  // colour; this only asserts the colour classes stay distinct from it.
  check(!/\.dv-flag\s*\{[^}]*color:/.test(css), 'dv-flag carries no colour of its own — it is the non-colour channel');

  // §7 "Diagrams embed as SVG ... vector survives print and zoom" — the
  // illustration classes must not force a raster-style fixed box that would
  // clip or distort the embedded <svg>.
  check(/\.dv-illus-view svg[^{]*\{[^}]*max-width:\s*100%;/.test(css), 'embedded SVG scales within its illustration box rather than overflowing');

  // ── wrapDocument ─────────────────────────────────────────────────────
  const doc = wrapDocument('<p>hello</p>', { title: 'Design Description' });
  check(doc.startsWith('<!DOCTYPE html>'), 'wrapDocument emits a standalone HTML document');
  check(doc.includes('<title>Design Description</title>'), 'wrapDocument sets the document title');
  check(doc.includes('<p>hello</p>'), 'wrapDocument carries the rendered body through unchanged');
  check(doc.includes('<style>'), 'wrapDocument embeds the stylesheet');
  check(doc.includes('@page'), 'wrapDocument\'s embedded stylesheet declares page size');

  // No document layout ships with this deliverable — the wrapper must not
  // invent a table of contents or any per-document chrome beyond the shell.
  check(!/table of contents/i.test(doc), 'wrapDocument adds no table of contents (out of scope, per epic)');

  const escaped = wrapDocument('<p>x</p>', { title: '<script>alert(1)</script>' });
  check(!escaped.includes('<script>alert(1)</script>'), 'wrapDocument escapes an untrusted title rather than injecting it verbatim');
  check(escaped.includes('&lt;script&gt;'), 'wrapDocument HTML-escapes the title');

  const untitled = wrapDocument('<p>x</p>');
  check(untitled.includes('<title>Untitled</title>'), 'wrapDocument defaults the title when none is given');

  // ── convertToPdf ─────────────────────────────────────────────────────
  {
    const result = await convertToPdf('<p>body</p>', { convert: honouringEngine, title: 'T' });
    check(result.html.includes('<title>T</title>'), 'convertToPdf wraps the body before handing it to the engine');
    check(result.pdf.length > 0, 'convertToPdf returns the engine\'s bytes');
    check(result.geometry.ok, 'convertToPdf verifies the produced geometry');
    check(Math.round(result.geometry.pages[0].height) === 842, 'the produced page measures 595 × 842 pt');
  }

  // The whole reason the check exists: an engine that drops the declaration
  // produces a plausible PDF at the wrong size, and must not pass silently.
  {
    let thrown = null;
    await convertToPdf('<p>body</p>', { convert: ignoringEngine }).catch((e) => { thrown = e; });
    check(thrown !== null, 'convertToPdf throws when the produced PDF is the wrong size');
    check(/US Letter/.test(thrown?.message ?? ''), 'the throw names what the engine actually produced');
  }

  // `verify: false` is the only way past it, and has to be asked for.
  {
    const skipped = await convertToPdf('<p>body</p>', { convert: ignoringEngine, verify: false });
    check(skipped.geometry === null, 'verify: false skips the check and says so by returning no geometry');
  }

  {
    let thrown = null;
    await convertToPdf('<p>body</p>', {}).catch((e) => { thrown = e; });
    check(/no print engine supplied/.test(thrown?.message ?? ''),
      'convertToPdf with no engine fails by name rather than by TypeError');
  }

  // ── End to end: renderDocument → wrap → engine → geometry ────────────
  // Both profiles, since §4's two profiles must both reach PDF.
  {
    const ast = [
      { type: 'text', value: '# Heading\n\n' },
      { type: 'inline', id: 'A-1', fields: ['name'] },
      { type: 'text', value: '\n\n' },
      { type: 'view', path: 'nowhere.blocks.transitrix.yaml', fit: 'page' },
    ];
    const evaluator = {
      async evaluateFieldPath() { return { id: 'A-1', state: 'ok', flag: null, content: 'value' }; },
      async evaluateEach() { return []; },
      async resolveReference() { return { state: 'ok' }; },
    };

    for (const profile of ['review', 'clean']) {
      // eslint-disable-next-line no-await-in-loop -- two profiles, read in order
      const { html } = await renderDocument(ast, evaluator, { profile });
      // eslint-disable-next-line no-await-in-loop -- ditto
      const out = await convertToPdf(html, { convert: honouringEngine, title: 'Doc' });
      check(out.geometry.ok, `${profile}: a rendered document converts and verifies`);
      check(out.geometry.pages.length === 2, `${profile}: the fit = page illustration gets a page of its own`);
      check(Math.round(out.geometry.pages[1].width) === 842,
        `${profile}: that page measures 842 × 595 pt — a wide diagram gets a landscape page, not a shrunken font`);
    }
  }
}

await run();

if (_failures.length > 0) {
  console.error(`${_failures.length} check(s) failed:\n`);
  for (const f of _failures) console.error(`- ${f}\n`);
  process.exit(1);
}
console.log('test_pdf_layout: all checks passed.');
