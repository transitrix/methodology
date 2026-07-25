---
notation: "Nested Block Diagrams"
version: "0.6"
author: "Valerii Korobeinikov"
last_updated: "2026-07-25"
status: "documented"
file_extension: "*.blocks.transitrix.yaml"
dsm_status: "not implemented — native TS renderer planned in Transitrix Studio (sibling task); the grid/layer/arbitrary-shape form is additional renderer scope beyond the existing shared tree engine"
---

# Nested Block Diagrams Notation — Reference

**Scope:** A grid canvas with one or more layers, for architectural overviews (*what is inside what*) and matrix views (*what crosses what*) alike. Authored as YAML and rendered as nested / gridded boxes by the shared diagram engine that also renders the Goals tree and Process Blueprint.
**Renderer:** Transitrix Studio (planned native TS renderer). The tree case uses the existing shared diagram engine; the grid case (layers, arbitrary-shape cells) is additional renderer scope — tracked as a Studio sibling task. Not Svgbob.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `blocks` |
| File extension | `*.blocks.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `blocks` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `nested_blocks` | yes | object | the nested blocks root — see §4 and §5 |

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

A `block.id` MAY follow the canonical `<TYPE>-…-<INTEGER>` grammar to cross-link into an organisational catalogue element (e.g. `CAPABILITY-V1.2`, `APPLICATION-OMS-1`), OR it MAY be a document-local label that the block diagram authors solely for layout purposes. The canonical primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) is borne by the **target element's own file** when a block cross-links — the block here is a layout placement, not a separate element. When `block.id` is a document-local label there is no canonical element to bear lifecycle, and none is required. This applies uniformly whether the block sits in the tree form or occupies a grid cell.

The nested_blocks document itself does not carry a `valid_from` / `valid_to` field — it is a view, not an element ([CONTRACT.md](../CONTRACT.md) §7.1).

---

## 1. Overview

A nested block diagram is a **grid canvas with one or more layers**. On a given layer, a block occupies an **arbitrary set of cells** — not restricted to a rectangle; L-shapes and other irregular cell-sets are valid. Between layers, blocks may **partially overlap** (shared cells on different layers, ordered by z-order); within one layer, no two blocks may claim the same cell. Blocks may sit **adjacent** to one another (peer cells on the same grid, not nested), **nested** (a block's own region contains a finer sub-grid), and a file may hold **multiple independent block-groups** — a forest, exactly as in earlier versions of this spec. A block MAY be declared **shared** across group boundaries when it represents one real thing used by more than one group.

Semantics is carried by **discrete spatial placement** — which cells, which layer, which shape — not by freeform drawing. Placement is always expressed in terms of declared column/row identifiers; this keeps the notation data (machine-readable and queryable), not a picture. Arbitrary pixel-level or continuous positioning is explicitly **out of scope** — everything snaps to the cell grid.

**The plain containment tree is the degenerate single-column case of this grid.** A block with `children[]` and no `grid:` of its own behaves exactly as in the pre-2026-07 spec: each child stacks inside its parent, one per implicit row, no columns to address. Every document valid against the prior (tree-only) version of this spec remains valid, unchanged, under this revision — see §4.1. No migration is required.

The notation carries no flow, no sequence, and no relations *between* blocks — containment, adjacency, and layering are the only semantic devices; there are no connecting lines. It is best suited for:

- Application landscape overviews — domains contain platforms contain services. *(tree form)*
- Platform and product decompositions. *(tree form)*
- Infrastructure zone diagrams. *(tree form)*
- Bounded context maps. *(tree form)*
- **Matrix views** — RACI grids, coverage grids, or any view where two axes cross. *(grid form, §4.2)*
- **Layered overlays** — a base landscape with a governance, ownership, or security overlay on top of it. *(grid form with `layers`, §4.3)*

The notation is **structured YAML**, not ASCII art. The previous Svgbob-rendered ASCII form (`*.blocks.transitrix.txt`) is retired; it is replaced by a `nested_blocks:` root that carries a forest of grid-capable block trees.

---

## 2. When to use

| Use case | Use blocks? |
|---|---|
| Show what is inside what (containment) | Yes — tree form |
| Show two crossing axes (e.g. roles × activities, domains × cross-cutting capabilities) | Yes — grid form (§4.2) |
| Show a layered overlay on an existing landscape | Yes — grid form with `layers` (§4.3) |
| Show sequence or flow between elements | No — use BPMN |
| Show strategy-to-execution tracing | No — use DGCA |
| Show layered architecture overview | Yes — tree form |
| Show detailed process steps | No — use BPMN |
| Show a value-chain blueprint with operational context per stage | No — use Process Blueprint |

The blocks notation sits next to BPMN (flow) and Process Blueprint (value chain with operational aspects). It is the only notation in the family whose semantics is purely **spatial placement** — containment, adjacency, and layering, never flow or relation lines.

---

## 3. File location and naming

```
views/blocks/<NAME>.blocks.transitrix.yaml
```

Examples:

- `views/blocks/application-landscape.blocks.transitrix.yaml`
- `views/blocks/infrastructure-zones.blocks.transitrix.yaml`
- `views/blocks/raci-change-governance.blocks.transitrix.yaml`

---

## 4. Top-level structure

A document carries a single `nested_blocks:` root key with the document's identifying fields, an optional `layers:` registry (§4.3), and a `blocks: [...]` array of top-level blocks. A file MAY contain several top-level blocks; each is an independent **group** (§4.5), rendered as its own diagram section in array order.

### 4.1 Tree form — the degenerate single-column grid

Unchanged from the prior version of this spec. Hierarchy is expressed directly by YAML nesting — no id-references between blocks. (The strategy-chain notations DGCA / FGA / Goals / Action schedule use a different shape — flat top-level arrays with `parent`/cross-reference fields — per the family-wide rule in [README.md](../README.md) § Family selection. Blocks pre-dates that family and is not part of it; the nested form is canonical here.)

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

A complete example: [`examples/blocks/architecture.blocks.transitrix.yaml`](../examples/blocks/architecture.blocks.transitrix.yaml).

**Equivalence to the grid form.** A block with `children[]` and no `grid:` is equivalent to a block whose `grid:` has a single unnamed column and one row per child, each child placed `at` its own row. Authors never need to write this out — it is a conceptual definition, not a required transformation — but it is why the tree form needs no separate validation path from the grid form below.

### 4.2 Grid form — matrix views

A block additionally declares `grid: { columns: [...], rows: [...] }`, turning its interior into an addressable cell space. Its children are then **placed** onto that space — by `at` (single cell), `span` (rectangular multi-cell), or `cells` (arbitrary-shape multi-cell) — instead of simply stacking.

```yaml
notation: blocks
spec_version: "0.1"
name: "RACI — Architecture change governance"
generated_at: "2026-07-25"

nested_blocks:
  id: BLOCKS-RACI-ARCHGOV-1
  name: "RACI — Architecture change governance"
  description: "Who is Responsible / Accountable / Consulted / Informed across the architecture-change lifecycle."
  version: "0.1"
  author: "Valerii Korobeinikov"

  blocks:
    - id: RACI_ARCHGOV
      name: "Architecture change governance"
      grid:
        columns:
          - { id: ROLE-PRODUCT,   name: "Product Owner" }
          - { id: ROLE-LEAD-ARCH, name: "Lead Architect" }
          - { id: ROLE-SECURITY,  name: "Security & Risk" }
        rows:
          - id: ACT-PROPOSE
            name: "Propose a change"
            assign: { ROLE-PRODUCT: "A", ROLE-LEAD-ARCH: "R", ROLE-SECURITY: "C" }
          - id: ACT-ASSESS
            name: "Assess impact"
            assign: { ROLE-LEAD-ARCH: "A", ROLE-SECURITY: "R" }
```

For the common case — one scalar value per cell, such as a RACI letter — a row MAY use the compact `assign:` shorthand shown above instead of listing full child block objects. `assign` is sugar: `{ <col-id>: <value> }` is equivalent to declaring, for each key, a single-cell child block `{ id: "<row-id>.<col-id>", name: <value>, at: { col: <col-id>, row: <row-id> } }`.

For the general case — a cell whose content is a real block (its own `id`, `description`, or a nested sub-grid), or a block spanning more than one cell — declare `children[]` on the grid-bearing block explicitly, using `at` / `span` / `cells` for placement (§5.4):

```yaml
    - id: PLATFORM_OVERVIEW
      name: "Platform × Environment"
      grid:
        columns:
          - { id: ENV-DEV,  name: "Dev" }
          - { id: ENV-PROD, name: "Prod" }
        rows:
          - { id: PLAT-API, name: "API Platform" }
          - { id: PLAT-DATA, name: "Data Platform" }
      children:
        - id: API_DEV
          name: "API — Dev cluster"
          at: { col: ENV-DEV, row: PLAT-API }
        - id: API_SHARED_INFRA
          name: "Shared ingress (Dev + Prod)"
          span: { cols: [ENV-DEV, ENV-PROD], rows: [PLAT-API, PLAT-API] }
```

A complete example: [`examples/blocks/raci-matrix.blocks.transitrix.yaml`](../examples/blocks/raci-matrix.blocks.transitrix.yaml).

### 4.3 Layers

A document MAY declare an ordered `layers:` registry under `nested_blocks`. Declaration order is z-order — the first layer is the bottom. Any block MAY declare a `layer:` naming one of these ids; a block with no `layer:` sits on the sole implicit layer (or the first-declared layer, when `layers:` is present but the block omits `layer:`).

```yaml
nested_blocks:
  id: BLOCKS-LAYERED-OVERLAY-1
  name: "Application landscape with ownership overlay"
  layers:
    - { id: LAYER-LANDSCAPE, name: "Application landscape" }
    - { id: LAYER-OWNERSHIP, name: "Ownership overlay" }
  blocks:
    - id: LANDSCAPE
      name: "Application landscape"
      layer: LAYER-LANDSCAPE
      grid:
        columns: [ { id: COL-1, name: "Frontend" }, { id: COL-2, name: "Backend" } ]
        rows:    [ { id: ROW-1, name: "Layer" } ]
      children:
        - id: FRONTEND_APP
          name: "Frontend"
          at: { col: COL-1, row: ROW-1 }
        - id: BACKEND_APP
          name: "Backend"
          at: { col: COL-2, row: ROW-1 }
    - id: OWNERSHIP
      name: "Platform team ownership"
      layer: LAYER-OWNERSHIP
      grid:
        columns: [ { id: COL-1, name: "Frontend" }, { id: COL-2, name: "Backend" } ]
        rows:    [ { id: ROW-1, name: "Layer" } ]
      children:
        - id: PLATFORM_OWNS_BOTH
          name: "Owned by Platform Team"
          span: { cols: [COL-1, COL-2], rows: [ROW-1, ROW-1] }
```

Here `PLATFORM_OWNS_BOTH` (ownership layer) partially overlaps both `FRONTEND_APP` and `BACKEND_APP` (landscape layer) — legal, because they sit on different layers. Two blocks on the *same* layer claiming the same cell is a validation error (`BL-012`, §6).

A complete example: [`examples/blocks/layered-overlay.blocks.transitrix.yaml`](../examples/blocks/layered-overlay.blocks.transitrix.yaml).

### 4.4 Nesting — a finer sub-grid inside a cell

Any block placed via `at` / `span` / `cells` MAY itself declare its own `grid:` and `children:`, recursively — "a block's region contains a finer sub-grid." Nesting depth is counted the same way as tree-form depth (§6, `BL-008`).

```yaml
        - id: BACKEND_APP
          name: "Backend"
          at: { col: COL-2, row: ROW-1 }
          grid:
            columns: [ { id: SUB-SVC, name: "Service" }, { id: SUB-DATA, name: "Datastore" } ]
            rows:    [ { id: SUB-ROW, name: "" } ]
          children:
            - id: BACKEND_SVC
              name: "REST API"
              at: { col: SUB-SVC, row: SUB-ROW }
            - id: BACKEND_DB
              name: "PostgreSQL"
              at: { col: SUB-DATA, row: SUB-ROW }
```

### 4.5 Groups, the forest, and shared blocks

Each top-level entry in `nested_blocks.blocks[]` is an independent **group**. A group's `grid:` (if any) is local to that group — column and row ids are scoped to the group that declares them, not shared globally across groups. A file MAY hold multiple, unrelated groups (a forest), exactly as multiple top-level blocks could always coexist.

A block MAY declare `shared_by: [<group-id>, ...]`, naming sibling top-level group ids it also belongs to conceptually — a rendering hint that the block represents one real thing used by more than one group (e.g. a shared datastore referenced from both a "Frontend" group and a "Backend" group), and MAY be drawn straddling the visual boundary between those groups. `shared_by` is descriptive metadata, not an additional structural placement: the block still has exactly one physical placement, in the group where it is declared.

```yaml
  blocks:
    - id: FRONTEND_GROUP
      name: "Frontend platform"
      children:
        - id: FRONTEND_APP
          name: "Frontend App"
    - id: SHARED_DB
      name: "Shared customer database"
      shared_by: [FRONTEND_GROUP, BACKEND_GROUP]
    - id: BACKEND_GROUP
      name: "Backend platform"
      children:
        - id: BACKEND_APP
          name: "Backend App"
```

---

## 5. Fields

### 5.1 `nested_blocks` root

| Field | Required | Description |
|---|---|---|
| `nested_blocks.id` | yes | document ID — `BLOCKS-[<middle>-]<INTEGER>` per the canonical grammar in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md). |
| `nested_blocks.name` | yes | human-readable name of the diagram. |
| `nested_blocks.description` | no | one-paragraph context. |
| `nested_blocks.version` | no | document version. |
| `nested_blocks.date` | no | document date (YYYY-MM-DD). |
| `nested_blocks.author` | no | document author. |
| `nested_blocks.layers` | no | ordered array of `{ id, name }` — the layer registry; declaration order is z-order (first = bottom). Omit for a single-implicit-layer document. See §4.3. |
| `nested_blocks.blocks` | yes | non-empty array of top-level block entries (groups) — see §5.2. |

### 5.2 `blocks[]` and `children[]` — block entry

A block entry is the same shape at every level: top-level (a group, under `nested_blocks.blocks`) and at any depth (under `children`, in tree form or as a grid cell). A block is a tree-form leaf when `children` is omitted or empty and it declares no `grid:`.

| Field | Required | Description |
|---|---|---|
| `id` | yes | block identifier; unique within the document (§6, `BL-007`). MAY follow the canonical grammar `<TYPE>-[<middle>-]<INTEGER>` when the block cross-links to an existing element in an organisational catalogue (e.g. `APPLICATION-OMS-1`, `CAPABILITY-V1.2`); otherwise it is a notation-local label (any non-empty string, no whitespace). |
| `name` | yes | display label rendered inside the block. |
| `description` | no | one-paragraph elaboration; renderers MAY surface it as a tooltip or detail panel. |
| `layer` | no | id of a `nested_blocks.layers[]` entry (§4.3, §5.5); defaults to the sole/first layer. Meaningful only when a document declares `layers:`. |
| `children` | no | array of child block entries — plain containment (§4.1) when the parent has no `grid:`; grid cell content (§4.2, placed via `at`/`span`/`cells`) when the parent has `grid:`. Omit or use an empty array for a leaf. |
| `grid` | no | `{ columns: [...], rows: [...] }` — turns this block's interior into an addressable cell space for its `children[]`. See §5.3. |
| `at` / `span` / `cells` | exactly one, when the block is a child of a `grid`-bearing parent | placement of this block within the parent's grid. See §5.4. Not used on a block with no `grid`-bearing parent (tree-form children carry none of these). |
| `shared_by` | no | array of sibling top-level group ids (§4.5) this block also conceptually belongs to. |

Cross-reference semantics: when a block's `id` matches a canonical TYPE prefix from the registry (`APPLICATION-…`, `CAPABILITY-…`, `PROCESS-…`, `ROLE-…`, …), a renderer SHOULD treat the block as a cross-reference into the corresponding catalogue and MAY enrich the rendered box with information from that element (e.g. status, owner). When the `id` does not match a canonical prefix, the block is a free, notation-local label and no cross-document lookup is performed. The same rule applies to `grid.columns[].id` and `grid.rows[].id` — a column labelled `ROLE-…` SHOULD cross-link into the roles catalogue.

### 5.3 `grid` — columns and rows

| Field | Required | Description |
|---|---|---|
| `grid.columns` | yes, when `grid` present | non-empty array of `{ id, name }`. `id` addresses the column in `at` / `span` / `cells`; unique within this `grid` (§6, `BL-007`). |
| `grid.rows` | yes, when `grid` present | non-empty array of `{ id, name, assign? }`. `id` addresses the row; unique within this `grid`. `assign` is the compact single-value-per-cell shorthand (§4.2, §5.5). |

Declared order of `columns[]` and `rows[]` is significant: it fixes reading order for rendering and is the ordering `span` ranges are resolved against (§5.4).

### 5.4 Cell placement — `at`, `span`, `cells`

A block that is a child of a `grid`-bearing parent MUST carry **exactly one** of the following (`BL-010`):

| Field | Shape | Meaning |
|---|---|---|
| `at` | `{ col: <col-id>, row: <row-id> }` | single-cell placement — the common case. |
| `span` | `{ cols: [<from-id>, <to-id>], rows: [<from-id>, <to-id>] }` | rectangular multi-cell placement. `from`/`to` name the first and last column (and row) in the parent's declared order (§5.3); the block claims every cell in the inclusive range. `from` MUST be at or before `to` in declared order (`BL-014`). |
| `cells` | `[ { col: <col-id>, row: <row-id> }, ... ]` | explicit arbitrary-shape cell-set — the general form. Any combination of cells, including non-rectangular (L-shaped) sets. |

Every `col` / `row` id referenced by `at`, `span`, or `cells` MUST resolve to an id declared in the immediate parent's `grid.columns[]` / `grid.rows[]` (`BL-011`).

### 5.5 `assign` — compact matrix shorthand

`grid.rows[].assign` is an optional map `{ <col-id>: <value> }` for the common single-scalar-per-cell case (RACI letters, status codes, etc.). For each key, it is equivalent to a single-cell child block `{ id: "<row-id>.<col-id>", name: <value>, at: { col: <col-id>, row: <row-id> } }` on the enclosing block's `children[]`. `assign` and an explicit `children[]` entry addressing the same row's cells SHOULD NOT both be used for the same row (`BL-015`).

### 5.6 `layers`

See §4.3 for the full description.

| Field | Required | Description |
|---|---|---|
| `nested_blocks.layers[].id` | yes, when `layers` present | layer identifier; unique within the document. |
| `nested_blocks.layers[].name` | yes, when `layers` present | display label for the layer (e.g. for a layer-visibility toggle). |
| `block.layer` | no | references a `layers[].id`. A block with no `layer` sits on the sole/first layer. |

### 5.7 `shared_by`

See §4.5. An array of sibling top-level group ids (`nested_blocks.blocks[].id` at the top level); every entry MUST resolve to an existing top-level group id (`BL-016`, warning).

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `BL-001` | error | `nested_blocks` root key missing. |
| `BL-002` | error | `nested_blocks.id` missing or does not match `BLOCKS-[<middle>-]<INTEGER>`. |
| `BL-003` | error | `nested_blocks.name` missing or empty. |
| `BL-004` | error | `nested_blocks.blocks` missing or empty. |
| `BL-005` | error | every block entry (at any depth, tree or grid form) and every `grid.columns[]` / `grid.rows[]` entry must have a non-empty `id`; every block entry must also have a non-empty `name`. |
| `BL-006` | error | a block, column, or row `id` that matches the canonical grammar `<TYPE>-…-<INTEGER>` MUST use a TYPE registered in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md); an unknown TYPE prefix is rejected. A free-form local label (any non-empty string with no whitespace) is accepted unchanged. |
| `BL-007` | error | block `id`s must be unique within the document; no block `id` may appear twice anywhere in the tree/forest. `grid.columns[]` ids and `grid.rows[]` ids must each be unique within their own `grid` (columns and rows are separate namespaces from each other and from block ids; a column id and a row id MAY coincide). |
| `BL-008` | warn | nesting depth exceeds the recommended maximum of **5 levels** (root = level 1), counting both tree-form containment and grid sub-nesting (§4.4). Renderers MAY still produce output; very deep nesting tends to produce inner boxes too small to read. |
| `BL-009` | warn | a `children` array is present but empty; remove the empty array or add child blocks. |
| `BL-010` | error | a block whose immediate parent declares `grid:` carries none of `at` / `span` / `cells`, or carries more than one of them — placement must be exactly one. |
| `BL-011` | error | `at.col` / `at.row`, any `span.cols[]` / `span.rows[]` entry, or any `cells[].col` / `cells[].row` does not resolve to an id declared in the immediate parent's `grid.columns[]` / `grid.rows[]`. |
| `BL-012` | error | two blocks on the same layer (or the sole implicit layer) claim the same cell within the same parent `grid` — cell occupancy is exclusive per layer. |
| `BL-013` | error | a block's `layer` value does not match any `id` in `nested_blocks.layers[]`, when `layers[]` is declared. |
| `BL-014` | error | `span.cols` or `span.rows` does not name exactly two ids, or the first does not appear at or before the second in the parent grid's declared column/row order. |
| `BL-015` | warn | both `assign` and one or more `children[]` entries target the same row's cells — prefer one placement mechanism per row. |
| `BL-016` | warn | `shared_by` names a group id that does not match any top-level `nested_blocks.blocks[].id`. |

L1 (format), L2 (per-element), L3 (relations) map onto the rules above as:

- **L1 — format:** the shared header rules from [CONTRACT.md](../CONTRACT.md) (`HDR-001` … `HDR-004`) plus `BL-001`.
- **L2 — per-element:** `BL-002` … `BL-006`, `BL-013`.
- **L3 — relations across the tree / grid / layers:** `BL-007` … `BL-012`, `BL-014`, `BL-015`, `BL-016`.

**Matrix-level semantic invariants are out of scope here.** A pattern like RACI's "exactly one Accountable per row" is not a base-notation rule — it is specific to a template built on top of the grid form. Such invariants are routed to the repo-scope validator work (#719) as semantic rules layered on top of a valid `blocks` document, not encoded as `BL-*` codes.

---

## 7. Render contract — shared diagram engine, not Svgbob

The diagram renders via the **shared diagram engine** that also renders the Goals tree and the Process Blueprint. Svgbob is not used by this notation: blocks of meaningful size proved unwieldy to author as ASCII, and the engine's vector output integrates cleanly with the other notations in the family.

A renderer that consumes this notation MUST:

- Render each top-level entry in `nested_blocks.blocks[]` as an independent block (group), laid out in array order; multiple top-level groups appear as independent diagram sections (vertically stacked or horizontally tiled at the renderer's discretion).
- Render a block with no `grid:` using plain containment layout (§4.1): each child spatially inside its parent's box, nesting in the YAML mapping directly to spatial containment.
- Render a block that declares `grid:` as a coordinate grid sized to `columns.length × rows.length`; place each child at the cell(s) named by its `at` / `span` / `cells`.
- Render a `span` or a multi-cell `cells` placement as one merged region spanning exactly the named cells — including non-rectangular shapes when `cells` names a non-rectangular set; never force a bounding-box rectangle over an L-shaped placement.
- Stack layers in declared order (z-order, first = bottom); where two layers' blocks occupy overlapping cells, render the higher layer's block visually in front of the lower one (e.g. offset chrome or partial transparency) — never merge their content into one box.
- Expand `assign:` shorthand rows to the single-cell placements they denote (§5.5) before layout.
- Apply colour fill by nesting depth: the **outermost block is the lightest**; each deeper level (tree containment or grid sub-nesting) is rendered with a progressively darker fill drawn from the family's brand colour ramp. Depth 1 (top-level) is lightest; the maximum recommended depth (5) is the darkest.
- Surface validation errors and warnings inline.

A renderer SHOULD:

- Use the brand styling shared with the Goals tree and Process Blueprint (typography, colour ramp, container chrome) so a blocks diagram looks like the same family, in both the tree and grid case.
- Lay siblings out automatically (rows / columns / grid) in the tree case so the author does not need to control geometry — the YAML carries containment, the renderer handles layout. In the grid case, geometry is explicit (declared columns/rows) and the renderer sizes cells to fit, rather than auto-flowing.
- Render `assign`-shorthand cells as compact single-value labels (e.g. a RACI letter) rather than full block chrome, to keep dense matrices legible.
- Provide a layer-visibility toggle when `nested_blocks.layers.length > 1`.
- Expose `description` as a tooltip or detail panel when present.
- Cross-link block, column, or row `id`s into their source catalogues when the `id` matches a canonical TYPE prefix (e.g. `APPLICATION-…` into the applications catalogue).

A renderer MAY:

- Export the diagram to image formats (SVG / PNG).
- Highlight a single block on selection, dimming the rest.
- Support collapsing a subtree (tree form) or a sub-grid (grid form) to focus on the upper levels.
- Provide a coordinate-picker authoring aid (a row/column dropdown) rather than requiring hand-authored `at:` objects.

What the renderer MUST NOT do:

- Reach for Svgbob / ASCII rendering. The structured YAML form is canonical; legacy `.blocks.transitrix.txt` files are not part of this spec.
- Re-order siblings, columns, or rows; declared array order is significant and is preserved in the rendered output.
- Render a placement at continuous, pixel-level coordinates disconnected from the declared cell grid — every block placement snaps to a named column/row (or column/row range).

**Renderer note.** A layered grid with arbitrary-shape cell-sets requires explicit geometry — cell membership, z-order, and non-rectangular boundary tracing — beyond what the shared auto-layout tree engine (used today by Goals and Process Blueprint) provides. A single-layer rectangular grid (the common matrix case, e.g. RACI) MAY be rendered today with a straightforward CSS/HTML grid; full arbitrary-shape and multi-layer support is scoped as a Transitrix Studio renderer task, filed alongside this spec revision. It does not block authoring or validating grid-form documents.

---

## 8. Constraints and conventions

- **Placement only — no relations.** The notation carries no sequence, flow, or peer-to-peer relation lines between blocks; containment, adjacency, and layering are the only semantic devices. For flow inside one process, use BPMN; for value-chain operational context per stage, use Process Blueprint.
- **Discrete cells, not pixels.** All placement resolves to named columns/rows; continuous or pixel-level positioning is out of scope (§7).
- **One file, one purpose.** A document may carry multiple top-level groups, but they should belong to one architectural or matrix narrative. Unrelated landscapes belong in separate files.
- **Recommended max depth: 5.** Deeper nesting — tree containment or grid sub-nesting — is permitted but produces inner boxes too small for most outputs. `BL-008` warns at depth 6+.
- **Block IDs are document-local by default.** Cross-references to organisational catalogues are opt-in: declare a block's, column's, or row's `id` using a canonical TYPE prefix when (and only when) it represents a real catalogued element.
- **Grid coordinate spaces are local per group.** Column and row ids declared in one top-level group's `grid:` (or a nested sub-grid's `grid:`) are meaningful only within that grid; they are not a global document-wide coordinate system.

---

## 9. Relationship to Capability Map

The [Capability Map](05-capability-map.md) is a **kin diagram** of the blocks grid form: conceptually the same idea — a grid canvas whose cells carry a business meaning — specialised with domain-specific constraints:

- **Constrained axes.** Where a blocks `grid:` declares arbitrary `columns[]` / `rows[]`, the Capability Map fixes its two axes to **Vertical** (business domain) and **Horizontal** (cross-cutting capability) and never a third — see [05-capability-map.md](05-capability-map.md) §6.
- **Own addressing.** Where a blocks cell is addressed by a free-form `{col, row}` pair, the Capability Map addresses each capability by its own hierarchical `CAPABILITY-V[N].[N].[N]` / `CAPABILITY-H[N].[N]` grammar and, in Transitrix DSM, the structured `set_name.b.o.L1.L2.L3` scheme — see [05-capability-map.md](05-capability-map.md) §4–§5.
- **Own leveling constraint.** Capability nesting is bounded to three levels (L1/L2/L3) with the granularity discipline defined in [05-capability-map.md](05-capability-map.md) §9 — a domain-specific constraint the generic blocks grid does not impose.

This is a **conceptual relationship, not a schema unification**. The Capability Map keeps its own extension (`*.capability-map.transitrix.yaml`), its own schema, and its own DSM implementation; it does not become a `blocks` document, and `blocks` documents do not gain capability-specific fields. The kinship is recorded here, and cross-referenced from [05-capability-map.md](05-capability-map.md), so the family relationship is discoverable without merging the two notations' schemas.

---

## 10. References

- File header contract: [`CONTRACT.md`](../CONTRACT.md)
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) — the `BLOCKS` document-level TYPE is registered there.
- Goals notation (uses the same diagram engine): [`04-goals.md`](04-goals.md)
- Process Blueprint (uses the same diagram engine): [`13-process-blueprint.md`](13-process-blueprint.md)
- Applications catalogue (source for cross-linked `APPLICATION-…` block IDs): [`10-applications.md`](10-applications.md)
- Capabilities map (kin diagram — see §9; source for cross-linked `CAPABILITY-…` block IDs): [`05-capability-map.md`](05-capability-map.md)
- Methodology section 6 (Notation kit): `method/01-methodology.md`
