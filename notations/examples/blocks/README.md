# Nested block diagrams

Structured YAML model of a multi-level container layout — a recursive tree of named blocks rendered as nested boxes by the shared diagram engine.

**File extension:** `*.blocks.transitrix.yaml`

See [`../../views/08-blocks.md`](../../views/diagrams/08-blocks.md) for the full notation reference.

## How to model a diagram

Author the diagram as a recursive tree under a `nested_blocks:` root key. Each block has an `id` and a `name`; nest children directly under their parent via `children:`. Containment in the YAML maps one-to-one to spatial containment in the rendered diagram.

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

## Nesting depth

Recommended maximum: **5 levels** (root = level 1). Deeper nesting is permitted but produces inner boxes too small to read; the validator emits `BL-008` at depth 6+.

## Colour fill

The renderer assigns colour fill by nesting depth: the outermost block is the lightest, each deeper level progressively darker — drawn from the family's brand colour ramp. Authors do not need to set colours by hand.

## Examples in this folder

| File | Description |
|---|---|
| `architecture.blocks.transitrix.yaml` | 2-tier software architecture (Application Layer + Data Layer) |
