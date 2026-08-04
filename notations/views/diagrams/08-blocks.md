---
notation: "Nested Block Diagrams"
version: "0.6"
author: "Valerii Korobeinikov"
last_updated: "2026-07-26"
status: "documented"
file_extension: "*.blocks.transitrix.yaml"
dsm_status: "not implemented — native TS renderer planned in Transitrix Studio (sibling task)"
---

# Nested Block Diagrams Notation — Reference

**Scope:** Multi-level container layouts for architectural overviews where the message is *what is inside what*. Authored as YAML — a recursive tree of named blocks — and rendered as nested boxes by the shared diagram engine that also renders the Goals tree and Process Blueprint.
**Renderer:** Transitrix Studio (planned native TS renderer) — uses the shared diagram engine. Not Svgbob.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all fifteen Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `blocks` |
| File extension | `*.blocks.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `blocks` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `nested_blocks` | one of `nested_blocks` / `grid` | object | the nested (tree) form's root — see §4 and §5 |
| `grid` | one of `nested_blocks` / `grid` | object | the matrix-subset form's root — a rectangular grid of columns/rows instead of a containment tree; see §4a and §5 |

A document declares **exactly one** of `nested_blocks` or `grid` at the root — never both, never neither (`BL-020`).

Example header:

```yaml
notation: blocks
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
nested_blocks:
  # ... see §4
```

---

## Element lifecycle

A `block.id` MAY follow the canonical `<TYPE>-…-<INTEGER>` grammar to cross-link into an organisational catalogue element (e.g. `CAPABILITY-V1.2`, `APPLICATION-OMS-1`), OR it MAY be a document-local label that the block diagram authors solely for layout purposes. The canonical primitive lifecycle ([CONTRACT.md](../../CONTRACT.md) §7) is borne by the **target element's own file** when a block cross-links — the block here is a layout placement, not a separate element. When `block.id` is a document-local label there is no canonical element to bear lifecycle, and none is required.

The nested_blocks document itself does not carry a `valid_from` / `valid_to` field — it is a view, not an element ([CONTRACT.md](../../CONTRACT.md) §7.1).

---

## 1. Overview

A nested block diagram answers the question **what contains what?** It is a tree of named blocks; each block may contain child blocks; the rendered diagram shows containment as spatial nesting (a child block is drawn *inside* its parent's box).

The notation carries no flow, no sequence, no relations between siblings — only containment. It is best suited for:

- Application landscape overviews — domains contain platforms contain services.
- Platform and product decompositions.
- Infrastructure zone diagrams.
- Bounded context maps.

The notation is **structured YAML**, not ASCII art. The previous Svgbob-rendered ASCII form (`*.blocks.transitrix.txt`) is retired in this version of the spec; it is replaced by a recursive `block` tree under a `nested_blocks:` root key.

**Matrix subset (§4a).** The same notation short name also covers a single-layer rectangular matrix — a `grid:` root of `columns[]` / `rows[]` with per-cell `assign:` values (RACI-style matrices, coverage grids). It answers a different question — **who/what maps to what, per cell** — and does not depend on the (still-in-design) general layered-grid superset; see §4a.

---

## 2. When to use

| Use case | Use blocks? |
|---|---|
| Show what is inside what (containment) | Yes |
| Show sequence or flow between elements | No — use BPMN |
| Show strategy-to-execution tracing | No — use DGCA |
| Show layered architecture overview | Yes |
| Show detailed process steps | No — use BPMN |
| Show a value-chain blueprint with operational context per stage | No — use Process Blueprint |

The blocks notation sits next to BPMN (flow) and Process Blueprint (value chain with operational aspects). It is the only notation in the family whose semantics is purely **spatial containment**.

---

## 3. File location and naming

```
views/blocks/<NAME>.blocks.transitrix.yaml
```

Examples:

- `views/blocks/application-landscape.blocks.transitrix.yaml`
- `views/blocks/infrastructure-zones.blocks.transitrix.yaml`

---

## 4. Top-level structure — nested form

The blocks notation is a tree: every child has exactly one parent. Hierarchy is expressed directly by YAML structure — no id-references between blocks. (The strategy-chain notations DGCA / FGA / Goals / Action schedule use a different shape — flat top-level arrays with `parent`/cross-reference fields — per the family-wide rule in [README.md](../../README.md) § Family selection. Blocks pre-dates that family and is not part of it; the YAML-nested form is canonical here.)

A document carries a single `nested_blocks:` root key with the document's identifying fields and a `blocks: [...]` array of top-level blocks. A file MAY contain several top-level blocks; they are rendered as independent diagram sections in array order.

```yaml
notation: blocks
spec_version: "0.1"
name: "Software architecture"           # required per CONTRACT.md §1.1
generated_at: "2026-05-25"             # optional per CONTRACT.md §4

nested_blocks:
  id: BLOCKS-ARCH-1
  name: "Software architecture"
  description: "Two-tier overview of the application and data layers."
  version: "0.1"
  author: "Valerii Korobeinikov"

  blocks:
    - id: APPLICATION_LAYER
      name: "Application Layer"
      children:
        - id: FRONTEND
          name: "Frontend"
          children:
            - id: REACT_APP
              name: "React App"
            - id: REDUX_STORE
              name: "Redux Store"
        - id: BACKEND
          name: "Backend"
          children:
            - id: REST_API
              name: "REST API"
            - id: BUSINESS_LOGIC
              name: "Business Logic"

    - id: DATA_LAYER
      name: "Data Layer"
      children:
        - id: POSTGRESQL
          name: "PostgreSQL"
        - id: REDIS_CACHE
          name: "Redis Cache"
```

A complete example: [`examples/blocks/architecture.blocks.transitrix.yaml`](../../examples/blocks/architecture.blocks.transitrix.yaml).

---

## 4a. Top-level structure — matrix subset (`grid:` root)

**Scope of this subset.** A single **layer**, **rectangular** grid: columns × rows, addressed by `(row-id, col-id)`. No layers, no cell overlap, no arbitrary (non-rectangular) cell sets, no sub-grids — those stay with the general layered-grid superset, which is still in design and out of scope here. This subset is forward-compatible with that superset: a `grid:` root document is a valid degenerate case of the eventual general form.

A document in this subset carries a top-level `grid:` key **instead of** `nested_blocks:` (§4a header rule above). `grid.columns` declares the X axis; `grid.rows` declares the Y axis and, per row, the row's cell values via `assign:`.

```yaml
notation: blocks
spec_version: "0.1"                    # matrix subset
name: "Human-readable title"           # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4

grid:
  columns:
    - { id: <col-id>, name: "<column label>" }
    # ... one entry per column

  rows:
    - id: <row-id>
      name: "<row label>"
      assign:
        <col-id>: <value>              # one entry per non-blank cell in this row
      # ... a key omitted for a column means that cell is blank
```

- **Addressing.** A cell is `rows[r].assign[<col-id>]`; the pair `(row-id, col-id)` addresses it uniquely. An absent key in `assign` means the cell is blank — it is not an error to omit one.
- **Cell values are template-defined.** The notation does not fix a vocabulary for `assign` values (`"A"`, `"done"`, `42`, …) — a template built on this subset defines its own vocabulary and, optionally, its own per-row or per-column invariant (e.g. the RACI template's "exactly one `A` per row", §6a).
- **No document-level `id`.** Unlike the nested form's `nested_blocks.id` (§5.1), a matrix-subset document carries no `BLOCKS-…` document ID — the matrix-subset is scoped to a single grid, not a catalogue-linkable tree.

A complete example: [`raci.blocks.transitrix.yaml`](https://github.com/transitrix/templates/blob/main/raci/raci.blocks.transitrix.yaml) — the RACI-as-matrix template (see its [fork-and-go guide](https://github.com/transitrix/templates/tree/main/raci)).

---

## 5. Fields

### 5.1 `nested_blocks` root

| Field | Required | Description |
|---|---|---|
| `nested_blocks.id` | yes | document ID — `BLOCKS-[<middle>-]<INTEGER>` per the canonical grammar in [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md). |
| `nested_blocks.name` | yes | human-readable name of the diagram. |
| `nested_blocks.description` | no | one-paragraph context. |
| `nested_blocks.version` | no | document version. |
| `nested_blocks.date` | no | document date (YYYY-MM-DD). |
| `nested_blocks.author` | no | document author. |
| `nested_blocks.blocks` | yes | non-empty array of top-level block entries — see §5.2. |

### 5.2 `blocks[]` and `children[]` — block entry

A block entry is the same shape at every level: top-level (under `nested_blocks.blocks`) and at any depth (under `children`). A block is a leaf when `children` is omitted or empty.

| Field | Required | Description |
|---|---|---|
| `id` | yes | block identifier; unique within the document. MAY follow the canonical grammar `<TYPE>-[<middle>-]<INTEGER>` when the block cross-links to an existing element in an organisational catalogue (e.g. `APPLICATION-OMS-1`, `CAPABILITY-V1.2`); otherwise it is a notation-local label (any non-empty string, no whitespace). |
| `name` | yes | display label rendered inside the block. |
| `description` | no | one-paragraph elaboration; renderers MAY surface it as a tooltip or detail panel. |
| `children` | no | array of child block entries. Omit or use an empty array for a leaf block. |

Cross-reference semantics: when a block's `id` matches a canonical TYPE prefix from the registry (`APPLICATION-…`, `CAPABILITY-…`, `PROCESS-…`, `ROLE-…`, …), a renderer SHOULD treat the block as a cross-reference into the corresponding catalogue and MAY enrich the rendered box with information from that element (e.g. status, owner). When the `id` does not match a canonical prefix, the block is a free, notation-local label and no cross-document lookup is performed.

### 5.3 `grid` root (matrix subset)

| Field | Required | Description |
|---|---|---|
| `grid.columns` | yes | non-empty array of column entries — see §5.4. Declares the X axis. |
| `grid.rows` | yes | non-empty array of row entries — see §5.4. Declares the Y axis and, via `assign`, the body cells. |

### 5.4 `columns[]` / `rows[]` entries (matrix subset)

| Field | Required | Description |
|---|---|---|
| `columns[].id` | yes | column identifier; unique among all column ids in the document. Notation-local label (any non-empty string, no whitespace) — the matrix subset does not apply the canonical `<TYPE>-…-<INTEGER>` cross-reference grammar. |
| `columns[].name` | yes | column header label. |
| `rows[].id` | yes | row identifier; unique among all row ids in the document (columns and rows share no namespace — a column and a row MAY reuse the same id string without conflict). |
| `rows[].name` | yes | row label. |
| `rows[].assign` | no | map of `<col-id>: <value>`; each key MUST match a declared `grid.columns[].id`. Omit the key entirely for a blank cell; omit `assign` entirely for an all-blank row. |

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `BL-001` | error | `nested_blocks` root key missing. |
| `BL-002` | error | `nested_blocks.id` missing or does not match `BLOCKS-[<middle>-]<INTEGER>`. |
| `BL-003` | error | `nested_blocks.name` missing or empty. |
| `BL-004` | error | `nested_blocks.blocks` missing or empty. |
| `BL-005` | error | every block entry (at any depth) must have non-empty `id` and `name`. |
| `BL-006` | error | a block `id` that matches the canonical grammar `<TYPE>-…-<INTEGER>` MUST use a TYPE registered in [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md); an unknown TYPE prefix is rejected. A free-form local label (any non-empty string with no whitespace) is accepted unchanged. |
| `BL-007` | error | block IDs must be unique within the document; no `id` may appear twice anywhere in the tree. |
| `BL-008` | warn | nesting depth exceeds the recommended maximum of **5 levels** (root = level 1). Renderers MAY still produce output; very deep nesting tends to produce inner boxes too small to read. |
| `BL-009` | warn | a `children` array is present but empty; remove the empty array or add child blocks. |
| `BL-020` | error | document root must declare **exactly one** of `nested_blocks` or `grid` (§4a); both present or neither present is rejected. |
| `BL-021` | error | `grid.columns` missing, not an array, or empty. |
| `BL-022` | error | `grid.rows` missing, not an array, or empty. |
| `BL-023` | error | every `grid.columns[]` / `grid.rows[]` entry must have non-empty `id` and `name`. |
| `BL-024` | error | column ids must be unique among `grid.columns[]`; row ids must be unique among `grid.rows[]` (columns and rows are separate namespaces — see §5.4). |
| `BL-025` | error | a `rows[].assign` key that does not match any declared `grid.columns[].id` ("unknown column reference"). |

L1 (format), L2 (per-element), L3 (relations) map onto the rules above as:

- **L1 — format:** the shared header rules from [CONTRACT.md](../../CONTRACT.md) (`HDR-001` … `HDR-004`) plus `BL-001` / `BL-020`.
- **L2 — per-element:** `BL-002` … `BL-006`, `BL-021` … `BL-023`.
- **L3 — relations across the tree/grid:** `BL-007`, `BL-008`, `BL-009`, `BL-024`, `BL-025`.

### 6a. Template-level invariants (matrix subset)

`BL-020`–`BL-025` are the base notation's well-formedness rules — they hold for **every** `grid:` document regardless of what its cells mean. They do **not** constrain `assign` cell *values*, because the base notation deliberately does not fix a cell-value vocabulary (§4a).

A **template** built on this subset MAY define a stricter invariant over that vocabulary — e.g. the RACI template's rule that exactly one column per row carries the value `"A"` (zero or two is invalid). This is a template-level concern, not a base-notation rule: it is documented and validated by the template itself (see [`transitrix/templates`'s RACI README](https://github.com/transitrix/templates/tree/main/raci) for the RACI case), not by a `BL-0xx` code here. The base notation intentionally leaves this extensible rather than special-casing one template's vocabulary into the shared spec.

**Implementation status.** `BL-020`–`BL-025` (the `grid:` root form) and template-level cell invariants via a `--template` flag are implemented as of `@transitrix/cli` 2.2.0 — `npx @transitrix/cli validate <file> --template raci` enforces the RACI template's "exactly one `A` per row" rule; the base `grid:` well-formedness rules apply without the flag.

---

## 7. Render contract — shared diagram engine, not Svgbob

The diagram renders to nested boxes via the **shared diagram engine** that also renders the Goals tree and the Process Blueprint. Svgbob is no longer used by this notation: blocks of meaningful size proved unwieldy to author as ASCII, and the engine's vector output integrates cleanly with the other notations in the family.

A renderer that consumes this notation MUST:

- Render each top-level entry in `nested_blocks.blocks[]` as an independent block, laid out in array order; multiple top-level blocks appear as independent diagram sections (vertically stacked or horizontally tiled at the renderer's discretion).
- Render each block as a rectangular container with the block's `name` as a header label.
- Render each child block **spatially inside** its parent's box; nesting in the YAML maps directly to spatial containment in the diagram.
- Apply colour fill by nesting depth: the **outermost block is the lightest**; each deeper level is rendered with a progressively darker fill drawn from the family's brand colour ramp. Depth 1 (top-level) is lightest; the maximum recommended depth (5) is the darkest.
- Surface validation errors and warnings inline.

A renderer SHOULD:

- Use the brand styling shared with the Goals tree and Process Blueprint (typography, colour ramp, container chrome) so a blocks diagram looks like the same family.
- Lay siblings out automatically (rows / columns / grid) so the author does not need to control geometry — the YAML carries containment, the renderer handles layout.
- Expose `description` as a tooltip or detail panel when present.
- Cross-link block `id`s into their source catalogues when the `id` matches a canonical TYPE prefix (e.g. `APPLICATION-…` into the applications catalogue).

A renderer MAY:

- Export the diagram to image formats (SVG / PNG).
- Highlight a single block on selection, dimming the rest.
- Support collapsing a subtree to focus on the upper levels.

What the renderer MUST NOT do:

- Reach for Svgbob / ASCII rendering. The structured YAML form is canonical; legacy `.blocks.transitrix.txt` files are not part of this spec.
- Re-order siblings; array order is significant and is preserved in the rendered output.

**Scope note.** This render contract covers the nested (tree) form only. Rendering the matrix subset (§4a) as a laid-out grid/table is not yet specified — out of scope for the §4a addition, which covers schema and validation only.

---

## 8. Constraints and conventions

- **Containment only.** The notation carries no sequence, flow, or peer-to-peer relations between siblings. For flow inside one process, use BPMN; for value-chain operational context per stage, use Process Blueprint.
- **One file, one purpose.** A document may carry multiple top-level blocks, but they should belong to one architectural narrative. Unrelated landscapes belong in separate files.
- **Recommended max depth: 5.** Deeper nesting is permitted but produces inner boxes too small for most outputs. `BL-008` warns at depth 6+.
- **Block IDs are document-local by default.** Cross-references to organisational catalogues are opt-in: declare a block's `id` using a canonical TYPE prefix when (and only when) the block represents a real catalogued element.
- **Matrix subset is single-layer and rectangular (§4a).** Layers, cell overlap, arbitrary cell shapes, and sub-grids belong to the general layered-grid superset, which is still in design and out of scope for this subset.

---

## 9. References

- File header contract: [`CONTRACT.md`](../../CONTRACT.md)
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) — the `BLOCKS` document-level TYPE is registered there.
- Goals notation (uses the same diagram engine): [`04-goals.md`](./04-goals.md)
- Process Blueprint (uses the same diagram engine): [`13-process-blueprint.md`](./13-process-blueprint.md)
- Applications catalogue (source for cross-linked `APPLICATION-…` block IDs): [`10-applications.md`](./10-applications.md)
- Capabilities map (source for cross-linked `CAPABILITY-…` block IDs): [`05-capability-map.md`](./05-capability-map.md)
- Methodology section 6 (Notation kit): `method/01-methodology.md`
- RACI-as-matrix template (matrix subset, §4a): [`transitrix/templates`](https://github.com/transitrix/templates/tree/main/raci)
