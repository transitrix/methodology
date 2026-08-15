// Markdown → PDF, hand-rolled and dependency-free.
//
// Every package in this repository ships with zero runtime dependencies
// (`package.json`'s `dependencies` is `{}` throughout, and `ids.mjs`/
// `syntax.mjs` hand-roll ID grammar and a YAML-front-matter reader for the
// same reason). A full-fidelity Markdown renderer or an HTML-to-PDF pipeline
// would break that posture for one output format. What this module produces
// instead is a plain, paginated PDF: headings, paragraphs (word-wrapped,
// bold/italic markers stripped rather than styled), and figures reduced to a
// text placeholder — never rasterised, since embedding an image is a second,
// larger feature this module deliberately does not take on.
//
// This is named, not silent, scope: a reader comparing the PDF to the
// Markdown will see plainer typography and a placeholder where a figure was.
// What is NOT negotiable is an explicit constraint on this output — the page
// size. **A4, declared explicitly**, because a renderer that omits the
// declaration defaults to US Letter and silently spills the last 18mm onto a
// second page. A4 at 72 dpi is 595 x 842 pt; every page this module emits
// carries that exact `/MediaBox`.
//
// The base-14 font `Helvetica` needs no embedding — every conformant PDF
// reader carries it — so this module ships no font file either.

const PAGE_WIDTH = 595; // A4, 72dpi — an explicit constraint on this output
const PAGE_HEIGHT = 842;
const MARGIN = 56; // ~20mm
const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const BODY_SIZE = 11;
const HEADING_SIZE = { 1: 18, 2: 15, 3: 13 };
const LINE_HEIGHT = 1.4; // multiple of font size
const PARAGRAPH_GAP = BODY_SIZE * 0.9;
const HEADING_GAP_BEFORE = { 1: BODY_SIZE * 1.6, 2: BODY_SIZE * 1.3, 3: BODY_SIZE };

// Helvetica has no fixed width, but every layout decision here only needs to
// avoid overflowing the page, not to justify text — an average glyph width
// of half the font size is close enough for that, and keeps this file free
// of a 256-entry width table.
const AVG_CHAR_WIDTH_FACTOR = 0.52;

// Characters this module's own output can contain (the `«unresolved: …»` /
// `⚑U` markers pass 1 and pass 2 emit) plus common prose punctuation, mapped
// to their nearest WinAnsi/ASCII equivalent. Anything left outside printable
// ASCII after this pass becomes `?` rather than corrupting the byte stream —
// the base-14 fonts are not expected to carry full Unicode.
const CHAR_MAP = {
  '–': '-', // en dash
  '—': '--', // em dash
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...',
  '«': '<<', // «
  '»': '>>', // »
  '⚑': '!', // ⚑
  '☐': '[ ]',
};

function sanitize(text) {
  let out = '';
  for (const ch of text) {
    if (CHAR_MAP[ch] !== undefined) { out += CHAR_MAP[ch]; continue; }
    const code = ch.codePointAt(0);
    out += (code >= 0x20 && code <= 0x7E) ? ch : '?';
  }
  return out;
}

function stripEmphasis(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/`(.+?)`/g, '$1');
}

// Greedy word wrap at a given font size, using the average-width estimate.
function wrap(text, size) {
  const maxChars = Math.max(1, Math.floor(USABLE_WIDTH / (size * AVG_CHAR_WIDTH_FACTOR)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (candidate.length > maxChars && current !== '') {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') lines.push(current);
  return lines.length > 0 ? lines : [''];
}

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const IMAGE_RE = /^!\[(.*?)\]\((.*?)\)$/;

// Blocks: 'heading' | 'paragraph' | 'figure'. Blank lines separate
// paragraphs; a heading or a figure line is always its own block.
function toBlocks(markdown) {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length > 0) { blocks.push({ type: 'paragraph', text: paragraph.join(' ') }); paragraph = []; }
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') { flush(); continue; }
    const heading = HEADING_RE.exec(line);
    if (heading) { flush(); blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); continue; }
    const image = IMAGE_RE.exec(line);
    if (image) { flush(); blocks.push({ type: 'figure', caption: image[1] }); continue; }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

// Blocks → laid-out lines, each carrying its own font size and the vertical
// gap to leave before it. Pagination (render-pdf.mjs's other half) only
// needs to walk this list and break pages on overflow — it does not need to
// know it came from Markdown at all.
function layout(markdown) {
  const lines = [];
  for (const block of toBlocks(markdown)) {
    if (block.type === 'heading') {
      const size = HEADING_SIZE[block.level] ?? HEADING_SIZE[3];
      const wrapped = wrap(sanitize(stripEmphasis(block.text)), size);
      wrapped.forEach((text, i) => {
        lines.push({ text, size, gapBefore: i === 0 ? HEADING_GAP_BEFORE[block.level] ?? HEADING_GAP_BEFORE[3] : 0 });
      });
    } else if (block.type === 'figure') {
      // Rasterising a figure into the PDF is out of scope (module header) —
      // named here as a placeholder rather than silently dropped.
      const text = sanitize(`[Figure: ${block.caption || 'untitled'}]`);
      lines.push({ text, size: BODY_SIZE, gapBefore: PARAGRAPH_GAP });
    } else {
      const wrapped = wrap(sanitize(stripEmphasis(block.text)), BODY_SIZE);
      wrapped.forEach((text, i) => {
        lines.push({ text, size: BODY_SIZE, gapBefore: i === 0 ? PARAGRAPH_GAP : 0 });
      });
    }
  }
  return lines;
}

// Lines → pages, each page a list of { text, size, x, y } ready to place in
// a content stream. A line whose own gap plus height would cross the bottom
// margin starts a new page instead.
function paginate(lines) {
  const pages = [];
  let page = [];
  let cursorY = PAGE_HEIGHT - MARGIN;
  const newPage = () => { pages.push(page); page = []; cursorY = PAGE_HEIGHT - MARGIN; };
  for (const line of lines) {
    const advance = line.gapBefore + line.size * LINE_HEIGHT;
    if (cursorY - advance < MARGIN && page.length > 0) newPage();
    cursorY -= line.gapBefore + line.size;
    page.push({ text: line.text, size: line.size, x: MARGIN, y: cursorY });
    cursorY -= line.size * (LINE_HEIGHT - 1);
  }
  pages.push(page); // always at least one page, even for an empty document
  return pages;
}

function escapePdfString(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function contentStreamFor(page) {
  const ops = ['BT'];
  for (const line of page) {
    ops.push(`/F1 ${line.size} Tf`);
    ops.push(`1 0 0 1 ${line.x} ${line.y} Tm`);
    ops.push(`(${escapePdfString(line.text)}) Tj`);
  }
  ops.push('ET');
  return ops.join('\n');
}

// Assembles a minimal, valid PDF: a Catalog, a Pages tree, one Type1
// Helvetica font shared by every page, and one Page + one Contents object
// per page. Byte offsets for the xref table are tracked as each object is
// appended, in the same pass — there is no second pass over the buffer.
function assemblePdf(pages) {
  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>'); // 1
  const pageObjNums = pages.map((_, i) => 4 + 2 * i);
  const contentObjNums = pages.map((_, i) => 5 + 2 * i);
  objects.push(`<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`); // 2
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'); // 3
  pages.forEach((page, i) => {
    const contentNum = contentObjNums[i];
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] `
      + `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`,
    ); // page object
    const stream = contentStreamFor(page);
    objects.push({ stream }); // content object, marked so we know to wrap it as a stream
  });

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(out.length);
    const num = i + 1;
    if (typeof obj === 'object' && obj.stream !== undefined) {
      const length = Buffer.byteLength(obj.stream, 'latin1');
      out += `${num} 0 obj\n<< /Length ${length} >>\nstream\n${obj.stream}\nendstream\nendobj\n`;
    } else {
      out += `${num} 0 obj\n${obj}\nendobj\n`;
    }
  });

  const xrefOffset = out.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  out += xref;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, 'latin1');
}

/**
 * Render Markdown to a PDF, A4, one Helvetica text stream per page.
 *
 * @param {string} markdown
 * @returns {Buffer} PDF bytes
 */
export function renderMarkdownToPdf(markdown) {
  const pages = paginate(layout(String(markdown ?? '')));
  return assemblePdf(pages);
}
