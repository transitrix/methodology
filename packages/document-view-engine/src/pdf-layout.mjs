// Print layout (§7 "Output", page-size + stylesheet half) — wraps
// renderDocument()'s HTML body in a standalone document a print engine can
// turn into a PDF that measures 595 × 842 pt (A4 portrait) or 842 × 595 pt
// (A4 landscape), and gives every class render.mjs already emits its visual
// meaning: §4's colour + margin-mark pair for the four §3 states, and the
// four illustration border classes.
//
// Scope of this module: the HTML + CSS layer, plus the seam a print engine
// plugs into. It bundles no engine of its own — turning this document into
// PDF bytes needs a rendering engine (headless browser or equivalent), which
// is a dependency this repo does not carry today (every package here ships
// with `"dependencies": {}`); which engine to add is an open architecture
// question, filed separately rather than decided inside this slice. So the
// engine is a parameter (`convertToPdf`'s `convert`), not an import: the
// whole §7 path — declare, wrap, convert, verify the produced geometry — is
// implemented and tested here, and adopting an engine later is supplying one
// function rather than rewriting this half.
//
// `@page` is the only mechanism that fixes PDF page geometry independent of
// whatever the print engine's own default paper size is — CSS Paged Media
// Level 3, §2.2. A named page (`@page landscape { … }`) plus the `page`
// property on an element (here, `.dv-fit-page`) is how a single document
// mixes portrait body text with a landscape page for one wide illustration,
// per §7's "a wide diagram gets a landscape page ... not a shrunken font."
// `fit = page` is the skeleton author's own signal that an illustration
// needs that treatment — `fit = width` (default) and `fit = none` both stay
// in the portrait flow.

import { verifyPageGeometry } from './pdf-geometry.mjs';

const PAGE_CSS = `
@page {
  size: A4;
  margin: 20mm;
}

@page landscape {
  size: A4 landscape;
  margin: 15mm;
}
`;

// §4 review profile: colour is never the only channel. The flag glyph
// (⚑U/⚑A/⚑V/⚑S, already emitted inline by render.mjs) is the margin-mark
// channel — legible in black-and-white print — so this stylesheet only
// needs to add the colour half.
const STATE_CSS = `
.dv-ok { color: #1a7f37; }
.dv-suspect { color: #9a6700; }
.dv-unresolved { color: #cf222e; }
.dv-clean { color: #1f2328; }
.dv-flag { font-size: 0.75em; }
`;

const ILLUSTRATION_CSS = `
.dv-illus-view, .dv-illus-suspect, .dv-illus-manual, .dv-illus-missing {
  border-width: 2px;
  border-style: solid;
  padding: 4mm;
  margin: 4mm 0;
}
.dv-illus-view { border-color: #1a7f37; }
.dv-illus-suspect { border-color: #9a6700; }
.dv-illus-manual { border-color: #1f2328; }
.dv-illus-missing { border-color: #cf222e; }

.dv-fit-width { max-width: 100%; }
.dv-fit-none { }
.dv-fit-page {
  page: landscape;
  break-before: page;
  break-after: page;
  max-width: 100%;
}

/* §7 "Diagrams embed as SVG, not raster" — vector must stay selectable and
   scale with its box rather than overflow it. */
.dv-illus-view svg, .dv-illus-suspect svg, .dv-illus-missing svg {
  max-width: 100%;
  height: auto;
}
`;

const TRACE_CSS = `
.dv-trace { border-collapse: collapse; width: 100%; }
.dv-trace th, .dv-trace td { border: 1px solid #1f2328; padding: 2mm; text-align: center; }
.dv-trace-cell.dv-unresolved { color: #cf222e; }
`;

const MISC_CSS = `
.dv-figref { font-weight: bold; }
.dv-derivation-share, .dv-illustrations { font-size: 0.85em; color: #57606a; margin-top: 4mm; }
`;

export function buildStylesheet() {
  return [PAGE_CSS, STATE_CSS, ILLUSTRATION_CSS, TRACE_CSS, MISC_CSS].join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Wraps a renderDocument() `html` body into a standalone document: full
// `<html>`, the stylesheet above, and nothing else — no table of contents,
// no layout chrome (the epic's own "no document layout ships").
export function wrapDocument(bodyHtml, { title = 'Untitled' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${buildStylesheet()}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

/**
 * Wraps a rendered body, hands it to a supplied print engine, and verifies
 * the geometry of what comes back (§7).
 *
 * The verification is not optional decoration: an engine that ignores
 * `@page { size: A4 }` produces a plausible-looking PDF at its own default
 * paper size, and nothing downstream notices until the last centimetres of
 * every page have spilled onto a second one. So a size mismatch throws by
 * name here rather than being returned for a caller to ignore.
 *
 * @param {string} bodyHtml - `renderDocument()`'s `html`.
 * @param {object} options
 * @param {(html: string) => Promise<Uint8Array>|Uint8Array} options.convert -
 *   The print engine. Takes a standalone HTML document, returns PDF bytes.
 * @param {string} [options.title]
 * @param {boolean} [options.verify=true] - Skips the geometry check. Only for
 *   a caller that has already verified the bytes by other means.
 * @returns {Promise<{ html: string, pdf: Uint8Array, geometry: object|null }>}
 */
export async function convertToPdf(bodyHtml, { convert, title, verify = true } = {}) {
  if (typeof convert !== 'function') {
    throw new Error(
      'convertToPdf: no print engine supplied. Pass `convert(html) => PDF bytes` — '
      + 'this package deliberately bundles no rendering engine of its own.',
    );
  }
  const html = wrapDocument(bodyHtml, title === undefined ? {} : { title });
  const pdf = await convert(html);
  if (!verify) return { html, pdf, geometry: null };

  const geometry = verifyPageGeometry(pdf);
  if (!geometry.ok) {
    throw new Error(`convertToPdf: produced PDF fails §7 page geometry — ${geometry.problems.join('; ')}`);
  }
  return { html, pdf, geometry };
}
