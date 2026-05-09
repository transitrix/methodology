# `views/blocks/`

Nested block diagrams — multi-level container layouts where Mermaid / PlantUML / D2 fail to control horizontal layout beyond two levels of nesting. Rendered to SVG via **Svgbob** (Rust CLI).

## File convention

`*.blocks.transitrix.txt`

The format is plain text (ASCII), not YAML, because the input *is* a hand-shaped diagram. Svgbob compiles it to SVG.

## Skeleton

```
+-----------------------------+
| Operating: Order Fulfilment |
| +---------+   +-----------+ |
| | Receive |-->| Validate  | |
| +---------+   +-----------+ |
+-----------------------------+
```

## Tooling

- Compile via Transitrix Studio (uses the in-tree Python+Svgbob backend).
- Or directly: `svgbob input.blocks.transitrix.txt -o output.svg`.

## See also

- `method/methodology.md` §6 — notation kit
- Inline `*.txt` blocks may also live alongside the markdown they document, if the diagram is bound to a single document.
