// Adapter tests use a fixture engine, never an installed HTML/CSS renderer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { convertToPdf, PDF_ADAPTER_API, PDF_ADAPTER_SOURCE_SHA256 } from '../src/convert-to-pdf.mjs';
import { renderMarkdownToPdf } from '../src/render-pdf.mjs';
import { wrapHtmlForPrintRendering } from '../src/render-vivliostyle.mjs';

const pdf = renderMarkdownToPdf('# Synthetic fixture\n\nKnown fixture bytes.');
const binding = { owner: 'fixture-owner', authority: 'synthetic-test-only',
  name: 'fixture-engine', version: '1', environment: 'node-test', verifier: 'fixture-verifier/1' };
// Only recognizes the controlled simple writer's direct boxes; not a general
// PDF parser or evidence of HTML rendering, furniture, fonts or figures.
const verifyFixture = bytes => ({ valid: true, pages: [...bytes.toString('latin1')
  .matchAll(/\/MediaBox \[0 0 (\d+) (\d+)\]/g)]
  .map((m, i) => ({ number: i + 1, widthPt: Number(m[1]), heightPt: Number(m[2]) })) });
const input = () => ({ html: '<p>Synthetic HTML</p>', css: 'p { color: black; }',
  binding, engine: async () => pdf, verifyPdf: verifyFixture });
const rejects = (request, code) => assert.rejects(() => convertToPdf(request), error => error.code === code);

test('exports immutable adapter file identity and returns copied PDF with binding', async () => {
  const result = await convertToPdf(input());
  assert.equal(result.adapter.api, PDF_ADAPTER_API);
  assert.equal(result.adapter.source_sha256, PDF_ADAPTER_SOURCE_SHA256);
  assert.equal(PDF_ADAPTER_SOURCE_SHA256, createHash('sha256').update(
    readFileSync(new URL('../src/convert-to-pdf.mjs', import.meta.url))).digest('hex'));
  assert.deepEqual(result.pdf, pdf);
  assert.notEqual(result.pdf, pdf);
  assert.deepEqual(result.binding, binding);
  assert.equal(result.verification.pages[0].orientation, 'portrait');
});

test('passes exact prepared HTML/CSS/resources/options without persisting or mutating caller inputs', async () => {
  const request = input();
  request.html = wrapHtmlForPrintRendering('<h1>Probe</h1><svg id="wide"></svg>', {
    issuer: 'Synthetic issuer', issued_at: '2026-10-01T12:00:00Z',
    document_identity: 'caller supplied identity', views: [{ id: 'wide', width: 1200, height: 600 }] });
  request.assets = [{ uri: 'diagram.svg', mediaType: 'image/svg+xml', bytes: Buffer.from('<svg/>') }];
  request.fonts = [{ uri: 'font.woff2', mediaType: 'font/woff2', bytes: Buffer.from('fixture-font') }];
  request.options = { resolution: 144, nested: { value: true } };
  let calls = 0;
  request.engine = received => {
    calls++;
    assert.equal(received.html, request.html);
    assert.equal(received.css, request.css);
    assert.deepEqual(received.assets, request.assets);
    assert.deepEqual(received.fonts, request.fonts);
    received.assets[0].bytes.fill(0);
    received.options.nested.value = false;
    received.binding.owner = 'modified';
    return pdf;
  };
  const result = await convertToPdf(request);
  assert.equal(calls, 1);
  assert.equal(request.assets[0].bytes.toString(), '<svg/>');
  assert.equal(request.options.nested.value, true);
  assert.equal(result.binding.owner, 'fixture-owner');
});

test('requires engine and verifier before invoking any engine', async () => {
  await rejects({ ...input(), engine: undefined }, 'PDF-ENGINE-UNAVAILABLE');
  let called = false;
  await rejects({ ...input(), verifyPdf: undefined, engine: () => { called = true; } }, 'PDF-VERIFIER-UNAVAILABLE');
  assert.equal(called, false);
});

test('rejects malformed request/options/binding/resources before rendering', async () => {
  const cyclic = {}; cyclic.self = cyclic;
  const resource = { uri: 'same', mediaType: 'image/svg+xml', bytes: Buffer.from('x') };
  for (const patch of [{ html: '' }, { css: null }, { options: [] }, { options: { value: NaN } },
    { options: cyclic }, { options: { values: new Array(2) } }, { binding: {} },
    { assets: null }, { assets: new Array(1) }, { requiredOrientations: new Array(1) }, { assets: [{ ...resource, bytes: 'wrong' }] },
    { assets: [resource], fonts: [resource] }, { requiredOrientations: ['Letter'] }]) {
    let called = false;
    await rejects({ ...input(), ...patch, engine: () => { called = true; } }, 'PDF-INPUT');
    assert.equal(called, false);
  }
});

test('preserves synchronous and asynchronous engine errors without a fallback', async () => {
  const cause = new Error('fixture engine refused');
  for (const engine of [() => { throw cause; }, async () => { throw cause; }]) {
    await assert.rejects(() => convertToPdf({ ...input(), engine }),
      error => error.code === 'PDF-ENGINE-FAILED' && error.cause === cause);
  }
});

test('rejects nonbytes, empty, non-PDF and truncated output before verification', async () => {
  for (const output of ['not bytes', Buffer.alloc(0), Buffer.from('not a PDF document'), pdf.subarray(0, 50)]) {
    let verified = false;
    await rejects({ ...input(), engine: () => output, verifyPdf: () => { verified = true; } }, 'PDF-OUTPUT');
    assert.equal(verified, false);
  }
});

test('retains verifier failure and refuses verifier mutation', async () => {
  const cause = new Error('fixture PDF parser failed');
  await assert.rejects(() => convertToPdf({ ...input(), verifyPdf: () => { throw cause; } }),
    error => error.code === 'PDF-VERIFIER-FAILED' && error.cause === cause);
  await rejects({ ...input(), verifyPdf: bytes => { bytes.fill(0); return verifyFixture(pdf); } }, 'PDF-VERIFIER-FAILED');
});

test('refuses failed/missing/nonfinite/nonsequential or non-A4 geometry', async () => {
  for (const report of [null, { valid: false }, { valid: true, pages: [] }, { valid: true, pages: new Array(1) },
    { valid: true, pages: [{ number: 1, widthPt: NaN, heightPt: 842 }] },
    { valid: true, pages: [{ number: 2, widthPt: 595, heightPt: 842 }] },
    { valid: true, pages: [{ number: 1, widthPt: 612, heightPt: 792 }] }]) {
    await rejects({ ...input(), verifyPdf: () => report }, 'PDF-GEOMETRY');
  }
});

test('requires requested orientations and retains their snapshot across async rendering', async () => {
  await rejects({ ...input(), requiredOrientations: ['landscape'] }, 'PDF-GEOMETRY');
  const required = ['landscape'];
  await rejects({ ...input(), requiredOrientations: required, engine: async () => {
    required.length = 0; return pdf;
  } }, 'PDF-GEOMETRY');
});

test('accepts actual mixed A4 boxes from controlled fixture bytes', async () => {
  const manyPages = renderMarkdownToPdf('Synthetic fixture paragraph.\n\n'.repeat(70));
  // Equal-length replacement leaves the simple writer's byte offsets intact.
  const mixed = Buffer.from(manyPages.toString('latin1').replace('/MediaBox [0 0 595 842]', '/MediaBox [0 0 842 595]'), 'latin1');
  const result = await convertToPdf({ ...input(), engine: () => mixed,
    requiredOrientations: ['portrait', 'landscape'] });
  assert.deepEqual(new Set(result.verification.pages.map(p => p.orientation)), new Set(['portrait', 'landscape']));
});
