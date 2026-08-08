// Renders a `blocks` notation view (notations/views/diagrams/08-blocks.md) to inline
// SVG for the document-view engine's `{{ view ... }}` form (§2 "Illustrations"). This
// is the first notation this engine can render — a `view` node for any other notation,
// or the `blocks` notation's `grid:` (matrix-subset) root, reports a parse failure
// (§4's "red + flag: file missing or view failed to parse") rather than throwing; wiring
// in the remaining notations is later slices on the same epic, same posture as
// figure/figref and trace shipping ahead of `view` itself.
//
// Own copy, hand-rolled YAML subset reader tailored to exactly the `nested_blocks`
// tree shape — same posture as resolve-references.mjs here and decisions-cli's
// src/yaml.mjs. (The notation's *grammar* is not copied: that comes from
// @transitrix/document-renderer, which owns it. This is a file-format reader.)
// Not a general YAML parser: it reads `notation:`, the `nested_blocks:` vs `grid:`
// root-key choice, and a `blocks:` tree of `{ id, name, children }` — nothing else in
// the document shape is needed to lay the boxes out.

function cleanScalar(raw) {
  let s = String(raw ?? '').trim();
  const h = s.indexOf(' #');
  if (h >= 0) s = s.slice(0, h).trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

// Parses the `- id: X` list starting at `lines[startIndex]`, where every item in the
// list is indented exactly `indent` columns. An item's own scalar fields (`name`, …)
// and its `children:` block sit two columns deeper, per §4's worked example — this
// holds at every nesting depth since each level adds "- " (2 cols) then the item's own
// fields sit 2 further in again. Returns the parsed items and the index of the first
// line that is not part of this list (a dedent back to `indent - 2` or shallower).
function parseBlockList(lines, startIndex, indent) {
  const items = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i += 1; continue; }
    const lineIndent = line.match(/^(\s*)/)[1].length;
    if (lineIndent < indent) break;
    const m = line.match(/^(\s*)-\s+id:\s*(.+)$/);
    if (!(m && m[1].length === indent)) break;
    const block = { id: cleanScalar(m[2]), name: null, children: [] };
    items.push(block);
    i += 1;
    const fieldIndent = indent + 2;
    while (i < lines.length) {
      const l2 = lines[i];
      if (l2.trim() === '') { i += 1; continue; }
      const l2Indent = l2.match(/^(\s*)/)[1].length;
      if (l2Indent < fieldIndent) break;
      if (l2Indent > fieldIndent) { i += 1; continue; } // unrecognised deeper content — skip
      const fm = l2.match(/^\s*([A-Za-z0-9_]+):\s*(.*)$/);
      if (!fm) { i += 1; continue; }
      if (fm[1] === 'children' && fm[2].trim() === '') {
        const { items: childItems, next } = parseBlockList(lines, i + 1, fieldIndent + 2);
        block.children = childItems;
        i = next;
        continue;
      }
      block[fm[1]] = cleanScalar(fm[2]);
      i += 1;
    }
  }
  return { items, next: i };
}

// Parses a `blocks` notation document's text into a forest of `{ id, name, children }`.
// Returns `{ ok: true, blocks }` on success; `{ ok: false, reason }` when the document
// isn't `notation: blocks`, declares `grid:` instead of `nested_blocks:` (matrix
// subset — not yet rendered by this module), or the `blocks:` tree can't be found.
export function parseBlocksYaml(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'not text' };
  if (!/^notation:\s*blocks\s*$/m.test(text)) return { ok: false, reason: 'notation is not "blocks"' };
  if (/^grid:\s*$/m.test(text)) return { ok: false, reason: 'grid (matrix-subset) form is not yet rendered' };
  const lines = text.split(/\r?\n/);
  const rootIdx = lines.findIndex((l) => /^nested_blocks:\s*$/.test(l));
  if (rootIdx < 0) return { ok: false, reason: 'no nested_blocks root' };
  const blocksIdx = lines.findIndex((l, idx) => idx > rootIdx && /^\s{2}blocks:\s*$/.test(l));
  if (blocksIdx < 0) return { ok: false, reason: 'nested_blocks has no blocks list' };
  const { items } = parseBlockList(lines, blocksIdx + 1, 4);
  if (items.length === 0) return { ok: false, reason: 'blocks list is empty or unparseable' };
  return { ok: true, blocks: items };
}

// Every `id` in the tree, depth-first — used to check each against canon for §4's
// "amber: rendered, but resting on suspect objects" border class. A block's `id` MAY be
// a document-local layout label rather than a canonical cross-link (08-blocks.md
// "Element lifecycle"), so the caller filters through ids.mjs's `isValidId()` before
// resolving any of these against canon.
export function collectBlockIds(blocks) {
  const out = [];
  const walk = (list) => {
    for (const b of list) {
      out.push(b.id);
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  return out;
}

// ── Layout ─────────────────────────────────────────────────────────────
// A schematic box-in-box layout, not a design tool: a leaf is a box sized to its
// label; a container is its title plus its children laid out left to right beneath
// it, wide enough to hold them. Good enough to make containment legible on a page;
// not a general graph-layout algorithm.

const CHAR_WIDTH = 7;
const MIN_WIDTH = 110;
const LEAF_HEIGHT = 46;
const TITLE_HEIGHT = 26;
const PADDING = 14;
const GAP = 14;

function labelWidth(label) {
  return Math.max(MIN_WIDTH, String(label ?? '').length * CHAR_WIDTH + 28);
}

function layoutBlock(block) {
  const label = block.name || block.id;
  if (!block.children || block.children.length === 0) {
    return { id: block.id, label, width: labelWidth(label), height: LEAF_HEIGHT, isLeaf: true, children: [] };
  }
  const childLayouts = block.children.map(layoutBlock);
  const childrenWidth = childLayouts.reduce((sum, c) => sum + c.width, 0) + GAP * (childLayouts.length - 1);
  const childrenHeight = Math.max(...childLayouts.map((c) => c.height));
  const width = Math.max(labelWidth(label), childrenWidth + PADDING * 2);
  const height = TITLE_HEIGHT + PADDING + childrenHeight + PADDING;
  let x = (width - childrenWidth) / 2;
  const positioned = childLayouts.map((c) => {
    const placed = { ...c, x, y: TITLE_HEIGHT + PADDING };
    x += c.width + GAP;
    return placed;
  });
  return { id: block.id, label, width, height, isLeaf: false, children: positioned };
}

// Lays out every top-level block left to right — §3's "A file MAY contain several
// top-level blocks; they are rendered as independent diagram sections in array order."
function layoutForest(blocks) {
  const layouts = blocks.map(layoutBlock);
  const width = layouts.reduce((sum, l) => sum + l.width, 0) + GAP * (layouts.length - 1);
  const height = Math.max(...layouts.map((l) => l.height));
  let x = 0;
  const positioned = layouts.map((l) => {
    const placed = { ...l, x, y: 0 };
    x += l.width + GAP;
    return placed;
  });
  return { width, height, blocks: positioned };
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBox(box, offsetX, offsetY, out) {
  const x = offsetX + box.x;
  const y = offsetY + box.y;
  const fill = box.isLeaf ? '#ffffff' : '#f5f5f5';
  out.push(`<rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" fill="${fill}" stroke="#333333" stroke-width="1" />`);
  const labelY = box.isLeaf ? y + box.height / 2 + 4 : y + TITLE_HEIGHT / 2 + 4;
  const labelX = x + box.width / 2;
  out.push(`<text x="${labelX}" y="${labelY}" font-size="12" font-family="sans-serif" text-anchor="middle">${escapeXml(box.label)}</text>`);
  for (const child of box.children) renderBox(child, x, y, out);
}

// Renders a parsed `blocks` forest (from `parseBlocksYaml().blocks`) as a standalone
// inline `<svg>` — no external stylesheet, no script, safe to embed directly in the
// render.mjs HTML output.
export function renderBlocksSvg(blocks) {
  const forest = layoutForest(blocks);
  const margin = 4;
  const w = forest.width + margin * 2;
  const h = forest.height + margin * 2;
  const body = [];
  for (const box of forest.blocks) renderBox(box, margin, margin, body);
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" class="dv-view-svg">${body.join('')}</svg>`;
}
