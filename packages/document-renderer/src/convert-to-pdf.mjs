// Callable boundary for a caller-owned HTML/CSS engine and PDF verifier.
// No engine selection, process execution, retrieval, persistence or attestation.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const PDF_ADAPTER_API = 'caller-html-pdf/1';
export const PDF_ADAPTER_SOURCE_SHA256 = createHash('sha256')
  .update(readFileSync(new URL(import.meta.url))).digest('hex');

export class PdfConversionError extends Error {
  constructor(code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'PdfConversionError';
    this.code = code;
  }
}

const fail = (code, message, cause) => { throw new PdfConversionError(code, message, cause); };
const plain = value => value !== null && typeof value === 'object'
  && Object.getPrototypeOf(value) === Object.prototype;

function jsonCopy(value) {
  const active = new Set();
  function copy(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (!Array.isArray(item) && !plain(item)) {
      fail('PDF-INPUT', 'Options and binding must contain finite JSON values');
    }
    if (active.has(item)) fail('PDF-INPUT', 'Cyclic options or binding');
    active.add(item);
    const array = Array.isArray(item);
    const result = array ? [] : {};
    for (const key of Reflect.ownKeys(item)) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')
        || (array && !/^(0|[1-9][0-9]*)$/.test(key))) {
        fail('PDF-INPUT', 'Only enumerable JSON data properties are supported');
      }
      Object.defineProperty(result, key, { value: copy(descriptor.value), enumerable: true,
        writable: true, configurable: true });
    }
    if (array && (result.length !== item.length || Object.keys(result).length !== item.length)) {
      fail('PDF-INPUT', 'Sparse option arrays are unsupported');
    }
    active.delete(item);
    return result;
  }
  return copy(value);
}

const denseArray = value => Array.isArray(value)
  && Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i)).every(Boolean);

function resources(items, seen) {
  if (!denseArray(items)) fail('PDF-INPUT', 'Assets and fonts must be arrays');
  return items.map(item => {
    if (!plain(item) || typeof item.uri !== 'string' || !item.uri.trim()
      || typeof item.mediaType !== 'string' || !item.mediaType.trim()
      || !(item.bytes instanceof Uint8Array) || seen.has(item.uri)) {
      fail('PDF-INPUT', 'Invalid or duplicate asset/font resource');
    }
    seen.add(item.uri);
    return { uri: item.uri, mediaType: item.mediaType, bytes: Buffer.from(item.bytes) };
  });
}

function geometry(report, required) {
  if (!plain(report) || report.valid !== true || !denseArray(report.pages) || !report.pages.length) {
    fail('PDF-GEOMETRY', 'Caller PDF verification did not establish page geometry');
  }
  const observed = new Set();
  const pages = report.pages.map((page, i) => {
    if (!plain(page) || page.number !== i + 1
      || !Number.isFinite(page.widthPt) || !Number.isFinite(page.heightPt)) {
      fail('PDF-GEOMETRY', 'Missing, nonfinite or nonsequential page geometry');
    }
    const matches = (w, h) => Math.abs(page.widthPt - w) <= 1 && Math.abs(page.heightPt - h) <= 1;
    const orientation = matches(595, 842) ? 'portrait' : matches(842, 595) ? 'landscape' : null;
    if (!orientation) fail('PDF-GEOMETRY', 'Only verified A4 portrait/landscape pages are supported');
    observed.add(orientation);
    return { number: page.number, widthPt: page.widthPt, heightPt: page.heightPt, orientation };
  });
  if (required.some(value => !observed.has(value))) fail('PDF-GEOMETRY', 'A required orientation is absent');
  return pages;
}

/**
 * engine({html, css, assets, fonts, options, binding}) -> Uint8Array/Buffer
 * verifyPdf(pdfBytes) -> {valid:true, pages:[{number,widthPt,heightPt}]}
 * Both callbacks may be asynchronous. Caller authorizes/binds them beforehand.
 * Returned geometry is verifier evidence, not furniture/figure conformance.
 */
export async function convertToPdf(request = {}) {
  if (!plain(request)) fail('PDF-INPUT', 'Conversion request must be an object');
  const { html, css = '', assets = [], fonts = [], options = {}, binding,
    engine, verifyPdf, requiredOrientations = [] } = request;
  if (typeof html !== 'string' || !html.trim() || typeof css !== 'string' || !plain(options)) {
    fail('PDF-INPUT', 'Nonempty HTML, string CSS and object options are required');
  }
  if (!plain(binding)) fail('PDF-INPUT', 'Caller engine binding must be an object');
  const retainedBinding = jsonCopy(binding);
  if (!['owner', 'authority', 'name', 'version', 'environment', 'verifier']
    .every(key => typeof retainedBinding[key] === 'string' && retainedBinding[key].trim())) {
    fail('PDF-INPUT', 'Caller engine owner/authority/name/version/environment/verifier binding is required');
  }
  if (!denseArray(requiredOrientations)
    || requiredOrientations.some(value => !['portrait', 'landscape'].includes(value))) {
    fail('PDF-INPUT', 'Invalid required orientations');
  }
  const required = [...requiredOrientations];
  if (typeof engine !== 'function') fail('PDF-ENGINE-UNAVAILABLE', 'Caller engine callback is unavailable');
  if (typeof verifyPdf !== 'function') fail('PDF-VERIFIER-UNAVAILABLE', 'Caller PDF verifier is unavailable');
  const seen = new Set();
  const input = { html, css, assets: resources(assets, seen), fonts: resources(fonts, seen),
    options: jsonCopy(options), binding: jsonCopy(retainedBinding) };
  let output;
  try { output = await engine(input); }
  catch (cause) { fail('PDF-ENGINE-FAILED', 'Caller engine failed', cause); }
  if (!(output instanceof Uint8Array)) fail('PDF-OUTPUT', 'Engine must return PDF bytes');
  const pdf = Buffer.from(output);
  if (pdf.length < 16 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-'
    || !/%%EOF\s*$/.test(pdf.subarray(-512).toString('latin1'))) {
    fail('PDF-OUTPUT', 'Engine did not return a complete PDF byte envelope');
  }
  const verificationInput = Buffer.from(pdf);
  let report;
  try { report = await verifyPdf(verificationInput); }
  catch (cause) { fail('PDF-VERIFIER-FAILED', 'Caller PDF verifier failed', cause); }
  if (!verificationInput.equals(pdf)) fail('PDF-VERIFIER-FAILED', 'PDF verifier modified its input');
  const pages = geometry(report, required);
  return { pdf, adapter: { api: PDF_ADAPTER_API, source_sha256: PDF_ADAPTER_SOURCE_SHA256 },
    binding: retainedBinding, verification: { pages },
    runtime: { node: process.version, platform: process.platform, arch: process.arch } };
}
