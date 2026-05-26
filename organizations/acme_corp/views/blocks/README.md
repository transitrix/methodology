# `views/blocks/`

Nested block diagrams — multi-level container layouts where you want to show *what contains what* (an application landscape, a platform decomposition, an infrastructure zone map). Rendered as nested boxes by Transitrix Studio's native TypeScript renderer.

## File convention

`*.blocks.transitrix.yaml`

The notation is structured YAML: a `nested_blocks:` root with a recursive `block` tree (`id`, `name`, optional `description`, optional `children[]`). See [`notations/08-blocks.md`](../../../../notations/08-blocks.md) for the full spec.

## Skeleton

```yaml
notation: blocks
spec_version: "0.1"

nested_blocks:
  id: BLOCKS-ARCH-1
  name: "Application architecture"
  description: "Top-level container layout."

  blocks:
    - id: APPLICATION_LAYER
      name: "Application Layer"
      children:
        - id: FRONTEND
          name: "Frontend"
        - id: BACKEND
          name: "Backend"
    - id: DATA_LAYER
      name: "Data Layer"
      children:
        - id: POSTGRESQL
          name: "PostgreSQL"
        - id: REDIS_CACHE
          name: "Redis Cache"
```

Multiple independent top-level blocks in `nested_blocks.blocks[]` render as separate diagram sections, stacked in array order.

## Nesting depth

Recommended maximum: **5 levels** (root = level 1). The validator warns at depth 6+ (`BL-008`); inner boxes get too small to read.

## Cross-references

A block's `id` MAY use the canonical `<TYPE>-…-<INTEGER>` form to cross-link into an organisational catalogue (`APPLICATION-OMS-1`, `CAPABILITY-V1.2`). Otherwise it is a document-local label and is accepted as-is. See [`notations/IDS_AND_REFERENCES.md`](../../../../notations/IDS_AND_REFERENCES.md).

## Tooling

Rendered natively by Transitrix Studio — no external binaries required. The previous Python + `svgbob_cli` pipeline was retired in Studio 1.1.0.

## See also

- [`notations/08-blocks.md`](../../../../notations/08-blocks.md) — the notation spec
- [`notations/examples/blocks/architecture.blocks.transitrix.yaml`](../../../../notations/examples/blocks/architecture.blocks.transitrix.yaml) — worked example
- `method/methodology.md` §6 — notation kit
