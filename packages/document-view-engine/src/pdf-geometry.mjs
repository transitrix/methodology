// Page-geometry verification (§7 "Output") — reads the page boxes back out of
// a produced PDF and checks they are the size the stylesheet declared.
//
// Why this exists as its own module: §7's requirement is not "declare A4", it
// is "verify the rendered PDF reports 595 × 842 pt", because a print engine
// that ignores `@page { size: A4 }` silently falls back to its own default —
// US Letter, 612 × 792 pt — and the last centimetres of every page spill onto
// a second one. The declaration and the check are two different things, and
// only the check catches the failure.
//
// This module reads bytes; it never produces them. It carries no dependency
// and works against whatever engine eventually produces the PDF, which is why
// it can land before that engine is chosen.

const PT_TOLERANCE = 1;

// A4 at 72 dpi. A conforming engine writes 595.276 × 841.89; the tolerance
// above covers both that and an engine that rounds to whole points.
export const A4_PORTRAIT_PT = { width: 595, height: 842 };
export const A4_LANDSCAPE_PT = { width: 842, height: 595 };

// The one wrong answer worth naming in words rather than reporting as a bare
// mismatch — it is what "the declaration was ignored" looks like in practice.
const US_LETTER_PT = { width: 612, height: 792 };

const OBJECT_RE = /\b\d+\s+\d+\s+obj\b([\s\S]*?)\bendobj\b/g;
const MEDIABOX_RE = /\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/;
const ROTATE_RE = /\/Rotate\s+(-?\d+)/;
const PAGE_RE = /\/Type\s*\/Page(?![a-zA-Z])/;
const PAGES_RE = /\/Type\s*\/Pages(?![a-zA-Z])/;

function parseBox(body) {
  const m = MEDIABOX_RE.exec(body);
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1, 5).map(Number);
  if ([x1, y1, x2, y2].some((n) => !Number.isFinite(n))) return null;
  return { width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
}

// A landscape page can be written either way — a landscape MediaBox, or a
// portrait MediaBox with `/Rotate 90`. Both measure 842 × 595 pt when the
// reader opens them, so both must be accepted; only the rotated form needs
// the axes swapped to say so.
function applyRotation(box, rotate) {
  if (rotate === null) return box;
  const normalised = ((rotate % 360) + 360) % 360;
  return normalised === 90 || normalised === 270
    ? { width: box.height, height: box.width }
    : box;
}

/**
 * Reads every page's effective size, in points, out of a PDF.
 *
 * Works on PDFs whose page dictionaries are written as plain objects. A PDF
 * that packs them into compressed object streams yields no page objects here;
 * that is reported as a named failure by `verifyPageGeometry`, never as a
 * silent pass — an unreadable PDF and a correctly sized one must not look
 * alike to a build.
 *
 * @param {Uint8Array|Buffer|string} pdf
 * @returns {{ pages: Array<{ width: number, height: number }> }}
 */
export function readPageGeometry(pdf) {
  const text = typeof pdf === 'string' ? pdf : Buffer.from(pdf).toString('latin1');
  const pages = [];
  let inherited = null;

  OBJECT_RE.lastIndex = 0;
  let match;
  const pageObjects = [];
  while ((match = OBJECT_RE.exec(text)) !== null) {
    const body = match[1];
    if (PAGES_RE.test(body)) {
      // A page-tree node. Its MediaBox is the inheritable default for any
      // page below it that declares none of its own (PDF 32000-1, §7.7.3.4).
      const box = parseBox(body);
      if (box && inherited === null) inherited = box;
      continue;
    }
    if (PAGE_RE.test(body)) pageObjects.push(body);
  }

  for (const body of pageObjects) {
    const box = parseBox(body) ?? inherited;
    if (!box) continue;
    const rotateMatch = ROTATE_RE.exec(body);
    pages.push(applyRotation(box, rotateMatch ? Number(rotateMatch[1]) : null));
  }

  return { pages };
}

function matches(box, expected) {
  return Math.abs(box.width - expected.width) <= PT_TOLERANCE
    && Math.abs(box.height - expected.height) <= PT_TOLERANCE;
}

function describe(box) {
  const round = (n) => Math.round(n * 100) / 100;
  const size = `${round(box.width)} × ${round(box.height)} pt`;
  if (matches(box, US_LETTER_PT) || matches(box, { width: US_LETTER_PT.height, height: US_LETTER_PT.width })) {
    return `${size} (US Letter) — the page-size declaration was ignored and the engine used its own default`;
  }
  return `${size} — neither A4 portrait (595 × 842 pt) nor A4 landscape (842 × 595 pt)`;
}

/**
 * Checks every page of a produced PDF against §7's declared geometry.
 *
 * Both A4 orientations pass: a document mixing portrait body text with a
 * landscape page for a wide illustration is exactly what §7 asks for, so
 * "every page is portrait" is not the rule — "every page is one of the two
 * declared sizes" is.
 *
 * @param {Uint8Array|Buffer|string} pdf
 * @param {{ allow?: Array<{width:number,height:number}> }} [options]
 * @returns {{ ok: boolean, pages: Array<{width:number,height:number}>, problems: string[] }}
 */
export function verifyPageGeometry(pdf, { allow = [A4_PORTRAIT_PT, A4_LANDSCAPE_PT] } = {}) {
  const { pages } = readPageGeometry(pdf);
  const problems = [];

  if (pages.length === 0) {
    problems.push(
      'no page geometry could be read from this PDF — it declares no page objects, '
      + 'or writes them into compressed object streams this reader does not open. '
      + 'Treated as a failure: an unverifiable page size is not a verified one.',
    );
    return { ok: false, pages, problems };
  }

  pages.forEach((box, index) => {
    if (allow.some((expected) => matches(box, expected))) return;
    problems.push(`page ${index + 1} measures ${describe(box)}`);
  });

  return { ok: problems.length === 0, pages, problems };
}
