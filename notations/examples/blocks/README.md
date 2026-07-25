# Nested block diagrams

Structured YAML model of a **grid canvas with one or more layers** — a forest of named blocks, each either a plain containment tree or a matrix laid out on declared columns/rows, rendered by the shared diagram engine.

**File extension:** `*.blocks.transitrix.yaml`

See [`../../views/08-blocks.md`](../../views/08-blocks.md) for the full notation reference.

## How to model a diagram

### Tree form (containment)

Author the diagram as a recursive tree under a `nested_blocks:` root key. Each block has an `id` and a `name`; nest children directly under their parent via `children:`. Containment in the YAML maps one-to-one to spatial containment in the rendered diagram. This is the degenerate single-column case of the general grid form (08-blocks.md §4.1).

```yaml
notation: blocks
spec_version: "0.1"

nested_blocks:
  id: BLOCKS-SAMPLE-1
  name: "Sample"
  blocks:
    - id: OUTER
      name: "Outer Group"
      children:
        - id: INNER_A
          name: "Inner Box A"
        - id: INNER_B
          name: "Inner Box B"
```

Multiple independent top-level entries in `nested_blocks.blocks[]` are rendered as separate diagram sections.

### Grid form (matrix views)

A block MAY declare `grid: { columns, rows }`, turning its interior into an addressable cell space; children are placed with `at` (single cell), `span` (rectangle), or `cells` (arbitrary shape) instead of simply stacking. See 08-blocks.md §4.2.

### Layers

A document MAY declare an ordered `layers:` registry; a block's `layer:` field places it in z-order. Two blocks may occupy the same cell only when they sit on different layers. See 08-blocks.md §4.3.

## Nesting depth

Recommended maximum: **5 levels** (root = level 1), counting both tree containment and grid sub-nesting. Deeper nesting is permitted but produces inner boxes too small to read; the validator emits `BL-008` at depth 6+.

## Colour fill

The renderer assigns colour fill by nesting depth: the outermost block is the lightest, each deeper level progressively darker — drawn from the family's brand colour ramp. Authors do not need to set colours by hand.

## Examples in this folder

| File | Description |
|---|---|
| `architecture.blocks.transitrix.yaml` | 2-tier software architecture (Application Layer + Data Layer) — tree form |
| `raci-matrix.blocks.transitrix.yaml` | RACI matrix — grid form, single layer, `assign:` shorthand |
| `layered-overlay.blocks.transitrix.yaml` | Application landscape + ownership overlay — two layers with partial overlap, plus a nested sub-grid |
