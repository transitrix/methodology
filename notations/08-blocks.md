---
notation: "Nested Block Diagrams"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-19"
status: "implemented"
file_extension: "*.blocks.transitrix.txt"
---

# Nested Block Diagrams Notation — Reference

**Scope:** Multi-level container layouts for architectural overviews that exceed the depth limits of Mermaid, PlantUML, or D2. Rendered via Svgbob.
**Renderer:** Transitrix Studio (Svgbob backend) — implemented

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all eleven Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `blocks` |
| File extension | `*.blocks.transitrix.txt` |

---

## 1. Overview

Nested block diagrams represent architectural containment: systems inside platforms, platforms inside domains, domains inside the enterprise. They are best suited for:

- Application landscape overviews
- Platform and product decompositions
- Infrastructure zone diagrams
- Bounded context maps

The notation uses plain ASCII art with a strict structure that Transitrix Studio compiles to clean SVG via the Svgbob renderer.

---

## 2. When to use

| Use case | Use blocks? |
|----------|-------------|
| Show what is inside what (containment) | Yes |
| Show sequence or flow between elements | No — use BPMN or Mermaid |
| Show strategy-to-execution tracing | No — use FGCA/FGA |
| Show layered architecture overview | Yes |
| Show detailed process steps | No — use BPMN |

---

## 3. File location and naming

Stand-alone diagrams:
```
views/blocks/<NAME>.blocks.transitrix.txt
```

Inline (embedded in a Markdown document):
- Use a fenced code block labelled `blocks` inside any `.md` file

---

## 4. Notation format

Blocks are drawn with box-drawing characters. The renderer recognises a fixed set of structural cues:

```
+----------------------------------+
|  Domain: Order Management        |
|                                  |
|  +------------+  +------------+  |
|  | APP-OMS    |  | APP-CRM    |  |
|  | Order Mgmt |  | Customer   |  |
|  | Service    |  | Relations  |  |
|  +------------+  +------------+  |
|                                  |
|  +----------------------------+  |
|  | DB-POSTGRES-001            |  |
|  | Orders Database            |  |
|  +----------------------------+  |
+----------------------------------+
```

---

## 5. Labels and identifiers

Each box may include an optional identifier line (first line) and a name line:

```
+--------------------+
| APP-OMS-001        |   ← element ID (optional)
| Order Mgmt Service |   ← display name
+--------------------+
```

The ID line, if present, is used by Transitrix Studio to cross-link the block to the corresponding element in `elements/`.

---

## 6. Nesting depth

Nesting is limited only by readability. Recommended maximum: **4 levels**.

```
Enterprise
└── Domain
    └── Platform
        └── Service
```

---

## 7. Inline usage in Markdown

```markdown
## Application Landscape

\`\`\`blocks
+----------------------------------+
|  Platform: E-Commerce            |
|  +------------+  +------------+  |
|  | APP-OMS    |  | APP-CRM    |  |
|  | Orders     |  | Customers  |  |
|  +------------+  +------------+  |
+----------------------------------+
\`\`\`
```

---

## 8. References

- Svgbob renderer: [https://github.com/ivanceras/svgbob](https://github.com/ivanceras/svgbob)
- Application elements: `elements/03_application/*.yaml`
- Applications view: `notations/10-applications.md`
- Methodology section 6 (notation #5): `method/methodology.md`
