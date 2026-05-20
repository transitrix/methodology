# Nested block diagrams

ASCII art block diagrams converted to styled SVG via [svgbob_cli](https://github.com/ivanceras/svgbob).
Best for architecture landscapes, application maps, and any diagram that needs precise spatial containment.

**File extension:** `*.blocks.transitrix.txt`

## How to create a diagram

Draw nested rectangles using `+`, `-`, and `|`. Text on the first line inside a box becomes its label.
Boxes can be nested to any depth; colour fill is assigned automatically by nesting level (outermost = lightest).

```
+--------------------------------------------------+
|  Outer Group                                     |
|                                                  |
|  +---------------------+  +------------------+  |
|  |  Inner Box A        |  |  Inner Box B     |  |
|  +---------------------+  +------------------+  |
|                                                  |
+--------------------------------------------------+
```

Multiple independent top-level blocks in one file are each rendered as a separate diagram section.

## Nesting depth

Up to 5 levels render well. Deeper nesting may produce very small inner boxes.

## Known issue: hyphens in label text

**Do not use hyphen-minus (`-`, U+002D) inside box label text.**
Svgbob interprets sequences of `-` as horizontal line segments, which corrupts the text.

Use a non-breaking hyphen (`‐`, U+2010) or an en-dash (`–`, U+2013) as a substitute:

| Instead of | Use |
|---|---|
| `APP-WEB-001` | `APP–WEB–001` |
| `back-end service` | `back‐end service` |

This only affects text *content* inside boxes. The `-` characters that form the box borders themselves are fine.

## Dependencies

Both tools must be installed to use the preview:

1. **Python 3** — used by the backend to invoke svgbob and post-process the SVG.
   Use `python3` from PATH, or set `transitrix.pythonPath` in VS Code settings to the full executable path.
2. **svgbob_cli** — converts ASCII art to SVG. Install with:
   ```
   cargo install svgbob_cli
   ```
   Requires [Rust](https://rustup.rs/). Set `transitrix.svgbobPath` in VS Code settings if installed to a non-standard path.

## Examples in this folder

| File | Description |
|---|---|
| `architecture.blocks.transitrix.txt` | 2-tier software architecture (Application Layer + Data Layer) |
