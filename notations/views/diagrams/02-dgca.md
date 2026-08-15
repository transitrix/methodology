---
notation: "DGCA Strategy-to-Execution Chain"
version: "1.6"
author: "Valerii Korobeinikov"
last_updated: "2026-06-23"
status: "documented"
file_extension: "*.dgca.transitrix.yaml"
dsm_status: "implemented — D, G, C, A layers active; column selection via localStorage"
---

# DGCA Notation Reference

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `dgca` |
| File extension | `*.dgca.transitrix.yaml` |

> **Deprecation note:** `fgca` and `fga` were the pre-2026-06 notation keys. Migrate to `dgca`. The old 3-layer FGA view (Driver → Goal → Activity) is now expressed as a `dgca` document with `view_config.layers.changes: off`.

---

## Source of truth

A DGCA document has two valid authoring forms — both use the same YAML field schema:

- **Inline form (default):** `factors[]`, `goals[]`, `changes[]`, and `actions[]` are authored directly in the view file. The file is self-contained. This is the expected form for a new adopter and for any DGCA chain where elements are not yet shared across documents.
- **Projection form (Full tier — post-promotion):** the file carries only a `view_config` block that selects elements already admitted to `canon/elements/**`. No element data is in this file; the renderer traverses inline cross-reference fields (`goal.factors`, `change.goals`, `action.changes`) on the standalone element files to derive the rendered set. See [`elements/17-relations.md`](../../elements/17-relations.md) §6.

The **promotion trigger** is cross-document sharing: an element stays inline until a second document references it; at that point it is promoted to a standalone file in `canon/elements/` and both documents reference it by ID ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1). Promotion is optional until it is forced by sharing — do not split elements into per-file form from day one.

> **Naming note:** The fourth column in the DGCA chain is called **Actions** (the column label, the YAML key `actions:`). The underlying element type is `ACTION` — element IDs use the `ACTION-[<middle>-]<INTEGER>` grammar (§Fields/ID grammar). An Action in a DGCA file is a reference to an `ACTION` element, optionally typed via `type:` to record its project-domain level (Initiative / Programme / Project / Work Package). The former element type name `ACTIVITY` is a deprecated alias accepted with `ACTION-005` warnings; see [CONTRACT.md](../../CONTRACT.md) §15.

The reconstruction invariant applies: `render(Elements + Relations, view_config)` → DGCA diagram. Deleting `canon/views/dgca/` loses no model knowledge. See [`CONTRACT.md`](../../CONTRACT.md) §14 (view_config contract).

---

## Element lifecycle

Every DRIVER, GOAL, CHANGE, and ACTION element carries the canonical primitive lifecycle (`valid_from`, `valid_to`) in its standalone element file frontmatter. In inline-element DGCA files (where element data is authored directly in the view document) each `actions[]` entry carries lifecycle fields in the same way. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../../CONTRACT.md) §7. The DGCA view document itself does not carry a lifecycle field.

---

## Method Author

This method is authored by **Valerii Korobeinikov**.

## What This Notation Is For

DGCA notation is a business method for translating strategy into coordinated execution.
It helps teams answer a single management question:

**How do our day-to-day initiatives directly support strategic intent?**

DGCA stands for:

- **D**rivers
- **G**oals
- **C**hanges
- **A**ctions

## Business Meaning of Each Layer

- **Drivers**: external and internal drivers that explain why action is needed now.
- **Goals**: strategic outcomes the organization wants to achieve.
- **Changes**: business transformations required to make goals real.
- **Actions**: concrete initiatives, projects, and workstreams that deliver those changes. An Action is a level-agnostic placeholder — it can represent any element of the project domain (Initiative, Programme, Project, or Work Package) depending on the diagram's zoom level.

## Core Management Logic

DGCA is read as a cause-and-delivery chain:

**Drivers → Goals → Changes → Actions**

In practical management communication, this means:

- drivers justify strategic focus,
- goals set direction and expected value,
- changes define what must be transformed in the business,
- actions define who does what to realize that transformation.

## Layer Toggle — Flexible View Configurations

Individual layers can be toggled off via `view_config.layers`. This produces degenerate views that are structurally valid DGCA documents but omit one or more columns.

| Mode | `layers` config | Layers rendered |
|---|---|---|
| Full DGCA (default) | all `on` or omitted | Driver → Goal → Change → Action |
| DGA (no Changes) | `changes: off` | Driver → Goal → Action |
| GA (Goal-Action only) | `drivers: off`, `changes: off` | Goal → Action |
| Goals only | `drivers: off`, `changes: off`, `actions: off` | Goal |

**DGA mode** (`view_config.layers.changes: off`) is the direct successor of the former FGA notation. When Changes is off, the `changes[]` array is optional and actions link directly to goals via `actions[].goals`.

## How To Read and Use It

- **Top-down view (strategy to execution):** confirm that each activity has a clear strategic purpose.
- **Bottom-up view (execution to strategy):** confirm that ongoing initiatives are not disconnected from business goals.
- **Portfolio view:** Identify concentration, overlaps, and gaps in strategic coverage.
- **Decision view:** Use the chain to prioritize initiatives that have the strongest strategic contribution.

## Methodical Rules for Business Alignment

- Every strategic goal should be supported by intentional execution.
- Every initiative should have a clearly explainable strategic contribution.
- Strategic discussion should focus on value and outcomes, not only on task completion.
- If a workstream cannot be connected to strategic intent, it should be challenged, reframed, or deprioritized.

## Why This Matters

DGCA improves strategic coherence across leadership, program management, and operational teams.
It creates a shared language for planning, prioritization, and accountability, reducing the gap between strategy documents and real execution.

---

## DSM Implementation Status

This section is **non-normative**: it records what Transitrix DSM enforces and renders today and introduces no validation rules of its own — the conformance rules live in the §"Validation rules" table above. Transitrix DSM implements the full 4-layer DGCA chain as of release 0.2.2:

| Layer | Status | Notes |
|-------|--------|-------|
| **D** — Drivers | Implemented | Strategic Drivers (PESTLE + internal); PESTLE report; driver–goal linking via `goal_factor` |
| **G** — Goals | Implemented | Goals tree, Visual Editor, DGCA column; goal–activity link via `goal_id` |
| **C** — Changes | Implemented | `bdn_change` entities linked to goals; `activity_change` join table; Activity edit form shows "Delivers changes" |
| **A** — Actions | Implemented | Activities table, Visual Editor, DGCA column; linked to Changes via `activity_change` |

**DGCA Viewer:** The DGCA tab renders all four columns. Column visibility is configurable via D/G/C/A toggle buttons; preference saved in `localStorage["dgca_columns"]`. Valid degenerate views (DGA, GCA, GA, etc.) are supported. The fourth column is labelled "Actions" in the UI.

**DGCA Report:** The "DGCA Report" tab renders the full D→G→C→A chain in list format and exports Mermaid/PlantUML diagrams. PNG export saves as `dgca-diagram.png`.

---

## File location and naming

```
views/dgca/<DOMAIN>.dgca.transitrix.yaml
```

Examples:
- `views/dgca/STRATEGY_2026.dgca.transitrix.yaml`
- `views/dgca/Q3_OPERATIONS.dgca.transitrix.yaml`

---

## Structure

A DGCA document opens with a shared header block (`notation:`, `spec_version:`, `methodology_version:`, `id:`, `name:`, `description:`, `period:`, `generated_at:`), followed by the data layers.

**Inline form** (self-contained; the normal starting point):

```yaml
notation: dgca
spec_version: "0.1"
methodology_version: "3.5.0"
id: DGCA-LAUNCH-1
name: "Product launch strategy chain"
period: "2026"

factors:
  - id: DRIVER-MARKET-1
    name: "Growing market demand"
    type: external

goals:
  - id: GOAL-1
    name: "Launch our product to market"
    factors: [DRIVER-MARKET-1]

changes:
  - id: CHANGE-1
    name: "Build and release core features"
    goals: [GOAL-1]

actions:
  - id: ACTION-1
    name: "MVP development"
    type: Project
    changes: [CHANGE-1]
```

**Projection form** (Full-tier post-promotion — `view_config` only, elements in `canon/elements/**`):

```yaml
notation: dgca
spec_version: "0.1"
id: DGCA-RETAIL-1
name: "Retail strategy chain 2026"
methodology_version: "3.5.0"

view_config:
  goals:
    filter: all               # include every active GOAL in canon
  factors:
    surface: derived          # derive from goal.factors inline links on each included GOAL
  changes:
    surface: derived          # derive from change.goals inline links for the included goal set
  actions:
    surface: derived          # derive from action.changes links for the included change set
  layers:
    drivers: on               # on | off — toggle the Drivers column
    goals: on                 # on | off — Goals column (always on recommended)
    changes: on               # on | off — off activates DGA mode (Driver → Goal → Action)
    actions: on               # on | off — toggle the Actions column
  display:
    depth: null               # unlimited depth
    collapsed: []             # no collapsed nodes
```

The DGCA semantic graph — one Change can deliver many Goals, one Action deliver many Changes — is expressed via the inline cross-reference fields (`goal.factors`, `change.goals`, `action.changes`) on either the inline element entries (inline form) or standalone element files (projection form). The view_config selects which goals to anchor on; the renderer traverses the inline links to derive the full displayed set.

A simple self-contained inline example: [`examples/dgca/startup.dgca.transitrix.yaml`](../../examples/dgca/startup.dgca.transitrix.yaml). A Full-tier projection example (elements in `elements/` subfolder): [`examples/dgca/strategy-2026.dgca.transitrix.yaml`](../../examples/dgca/strategy-2026.dgca.transitrix.yaml).

---

## Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `dgca` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | reserved field per the shared contract |
| `id` | yes | document ID — `DGCA-[<middle>-]<INTEGER>` per the canonical grammar |
| `name` | yes | human-readable name |
| `generated_at` | no | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `description` | no | one-paragraph context |
| `period` | no | time period the chain covers (e.g. `"2026"`, `"2026-Q3"`) |
| `version` | no | document version |
| `author` | no | document author |
| `factors` | yes (inline) / no (projection) | array of driver entries — see below. Required in inline form; absent in projection form. |
| `goals` | yes (inline) / no (projection) | array of goal entries — see below. Required in inline form; absent in projection form. |
| `changes` | yes* (inline) / no (projection) | array of change entries — *optional when `view_config.layers.changes: off`. Required in inline form unless Changes layer is off; absent in projection form. |
| `actions` | yes (inline) / no (projection) | array of action entries — see below. Deprecated alias: `activities:` (accepted with `DEPRECATED_NOTATION` warning; migrate to `actions:`). Required in inline form; absent in projection form. |
| `view_config` | no (inline) / yes (projection) | view configuration block — see §view_config. Optional in inline form (selects a subset of inline elements to render); required in projection form (is the only content of the file). |

### `factors[]`

A DRIVER is a neutral, standing force the organisation acts on, not a finding about it. Findings about a driver's current state (numbers, trends, observations) live on `ASSESSMENT` records that reference the DRIVER; they are not inline on a driver entry. See [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.1 (DRIVER as ArchiMate Driver) and §7.16 (ASSESSMENT).

| Field | Required | Description |
|---|---|---|
| `id` | yes | `DRIVER-[<middle>-]<INTEGER>`. Legacy `FACTOR-…` IDs remain valid. |
| `name` | yes | what the driver is — the neutral standing force, not a finding about it |
| `type` | no | `external` or `internal` |
| `category` | no | PESTLE sub-classification for external drivers — `political` \| `economic` \| `social` \| `technological` \| `legal` \| `environmental`. Omit on internal drivers. See [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.1. |
| `references_constraint` | no | array of `CONSTRAINT-…` IDs the driver reflects. Cross-document reference into the organisation's constraints catalogue (`elements/01_motivation/constraints/`). Rationale: the existence of a constraint is itself a strategic driver for the organisation — the DRIVER is the DGCA strategic driver, the constraint is the binding rule. (Decision recorded 2026-05-26.) |
| `description` | no | one-paragraph elaboration of the driver — keep findings out; emit them as `ASSESSMENT` records |

### `goals[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `GOAL-[<middle>-]<INTEGER>` |
| `name` | yes | what the goal is |
| `factors` | no | array of `DRIVER-…` IDs this goal is driven by. Legacy `FACTOR-…` IDs remain valid. |
| `description` | no | one-paragraph elaboration |

### `changes[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `CHANGE-[<middle>-]<INTEGER>` |
| `name` | yes | what the change is |
| `goals` | no | array of `GOAL-…` IDs this change delivers |
| `addresses` | no | array of `REQUIREMENT-…` / `CONSTRAINT-…` IDs this change responds to — the motivation-layer obligations whose gap the change closes. Origin-agnostic; see [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.3.1. |
| `description` | no | one-paragraph elaboration |

### `actions[]`

Each entry in `actions[]` is an **Action** — a project-domain work item at whatever abstraction level the diagram uses. The underlying element is an `ACTION` primitive (id prefix `ACTION-`); the optional `type:` field records its project-domain level within the DGCA view.

| Field | Required | Description |
|---|---|---|
| `id` | yes | `ACTION-[<middle>-]<INTEGER>` (deprecated alias: `ACTIVITY-[<middle>-]<INTEGER>`) |
| `name` | yes | what the action is |
| `type` | no | project-domain level: `Initiative` \| `Programme` \| `Project` \| `Task`. Deprecated alias: `work_package` = `Task`. Defaults to `Initiative` when omitted (backward compat). See §"Project domain elements" below. |
| `changes` | no | array of `CHANGE-…` IDs this action delivers |
| `goals` | no | array of `GOAL-…` IDs the action supports directly — used in DGA mode (`view_config.layers.changes: off`) or when the Change layer adds no information for that action |
| `owner` | no | `ROLE-…` ID of the accountable role |
| `status` | no | `Planned` / `In Progress` / `Done` |
| `due_date` | no | target completion date (YYYY-MM-DD) |
| `description` | no | one-paragraph elaboration |

ID grammar follows the canonical rule `<TYPE>-[<middle segment(s)>-]<INTEGER>`. Middle segments are optional and notation-specific. The terminal integer is positive (≥ 1) with no leading zeros. `ACTION-` is the canonical element-type prefix; `CHANGE-` is the DGCA change-layer prefix. The full grammar and TYPE registry live in [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md).

---

## Project domain elements

The fourth column of a DGCA chart ("Actions") represents **project-domain elements** — temporary, goal-directed investments that exist to deliver a Change. The same `actions[]` entry can represent any level of the project hierarchy depending on the diagram's zoom level. The `type:` field on each action entry makes the level explicit.

| `type` value | Name | Description | ArchiMate analogue |
|---|---|---|---|
| `Initiative` | Strategic Initiative | Top-level strategic investment decision; tied to a Goal or Capability. A container for related Programmes and Projects. | Course of Action / Work Package L1 |
| `Programme` | Programme | A coordinated group of Projects that together pursue a shared Outcome. Typically spans multiple years and owns a budget line. | Work Package L2 |
| `Project` | Project | A temporary endeavour with defined scope, schedule, and budget that delivers a specific Deliverable or Capability change. | Work Package L3 |
| `Task` | Task | An atomic unit of work; assigned to a person or team; produces a Deliverable. The leaf node of the project hierarchy. Deprecated alias: `work_package`. | Work Package (leaf) |

**All four types are temporary and goal-directed** (project domain). They are distinct from the process domain (Process → Activity), which is recurring and operational.

**Zoom-level convention:**

| Diagram zoom | Typical `type` in `actions[]` |
|---|---|
| Portfolio / board view | `Initiative` |
| Programme-level view | `Programme` |
| Project delivery view | `Project` |
| Work-item view | `Task` |

When `type:` is omitted, the validator treats the action as `Initiative` for backward compatibility. Adopters are encouraged to populate `type:` on new and updated entries.

---

## view_config for DGCA

The `view_config` block (see [`CONTRACT.md`](../../CONTRACT.md) §14) defines which elements to include and how to display them. All fields are optional; omitted fields fall back to the defaults below.

### view_config defaults

```yaml
# Canonical defaults — a view_config that omits any of these falls back to the value shown.
view_config:
  goals:
    filter: all          # include every active GOAL in canon
    ids: []              # when filter is "ids": the explicit GOAL-… list to include
    tags: []             # when filter is "tags": include GOALs whose tags[] match any entry
  factors:
    surface: derived     # derive DRIVER set from goal.factors inline links on the included goal set
  changes:
    surface: derived     # derive CHANGE set from change.goals inline links for the included goals
  actions:
    surface: derived     # derive ACTION set from action.changes links for the included changes
  layers:
    drivers: on          # show the Drivers column
    goals: on            # show the Goals column
    changes: on          # show the Changes column; off = DGA mode
    actions: on          # show the Actions column
  display:
    depth: null          # maximum depth in the rendered chain; null = unlimited
    collapsed: []        # list of element IDs to render as collapsed nodes
```

> **Deprecated aliases:** `view_config.activities:` is accepted in place of `view_config.actions:`, and `view_config.layers.activities:` is accepted in place of `view_config.layers.actions:`. Both emit a `DEPRECATED_NOTATION` warning. Migrate to the canonical keys.

### view_config keys

| Key | Type | Default | Semantics |
|---|---|---|---|
| `goals.filter` | string | `all` | `all` — include every active GOAL; `ids` — include only the GOALs listed in `goals.ids`; `tags` — include GOALs whose `tags[]` match any entry in `goals.tags`. |
| `goals.ids` | list | `[]` | `GOAL-…` IDs to include explicitly. Used when `goals.filter: ids`. |
| `goals.tags` | list | `[]` | Tag strings. Used when `goals.filter: tags`. |
| `factors.surface` | string | `derived` | `derived` — derive the DRIVER set by following `goal.factors` inline links on the included goals. `all` — include every active DRIVER in canon. |
| `changes.surface` | string | `derived` | `derived` — derive the CHANGE set by following `change.goals` inline links for the included goal set. `all` — include every active CHANGE in canon. |
| `actions.surface` | string | `derived` | `derived` — derive the ACTION set by following `action.changes` links for the included change set. `all` — include every active ACTION in canon. Deprecated alias: `activities.surface`. |
| `layers.drivers` | `on` \| `off` | `on` | Toggle the Drivers column in the rendered view. |
| `layers.goals` | `on` \| `off` | `on` | Toggle the Goals column. Toggling off produces a degenerate view; `on` recommended. |
| `layers.changes` | `on` \| `off` | `on` | Toggle the Changes column. `off` activates DGA mode: `changes[]` becomes optional, actions link directly to goals via `actions[].goals`. |
| `layers.actions` | `on` \| `off` | `on` | Toggle the Actions column in the rendered view. Deprecated alias: `layers.activities`. |
| `display.depth` | integer \| null | `null` | Maximum depth of the rendered D→G→C→A chain. `null` renders all levels. |
| `display.collapsed` | list | `[]` | IDs of elements to render as collapsed (children hidden). |

The `goal.factors`, `change.goals`, and `activity.changes` inline cross-reference fields are timeless inline relations on the element files — they are not view configuration. The view_config does not re-define or override these links; it only selects which goal set to anchor the projection on.

---

## Validation rules

| Rule | Severity | Description |
|---|---|---|
| `DGCA-001` | error | document root is not an object, or `notation` field missing / does not equal `dgca`. |
| `DGCA-002` | error | `id` missing or empty. |
| `DGCA-003` | error | `name` missing or empty. |
| `DGCA-004` | error | In **inline form**: any of `factors` / `goals` / `actions` (or deprecated `activities`) missing or empty. `changes` is also required unless `view_config.layers.changes: off`. In **projection form** (document has `view_config:` and no element arrays): `view_config` must be a valid object. |
| `DGCA-005` | error | every entry in the arrays must have a non-empty `id` and `name`. |
| `DGCA-006` | error | IDs unique within their layer (and SHOULD be unique across all layers within a document). |
| `DGCA-007` | error | every ID matches the canonical grammar `<TYPE>-[<middle>-]<INTEGER>` with the right type prefix for its layer. |
| `DGCA-008` | error | `goals[].factors[]` IDs must reference defined drivers. |
| `DGCA-009` | error | `changes[].goals[]` IDs must reference defined goals. |
| `DGCA-010` | error | `actions[].changes[]` (or deprecated `activities[].changes[]`) IDs must reference defined changes (when changes layer is on). |
| `DGCA-011` | error | `actions[].goals[]` (or deprecated `activities[].goals[]`) IDs must reference defined goals. |
| `DGCA-012` | warning | a driver with no goal referencing it is orphan. |
| `DGCA-013` | warning | a goal with no change (and no direct action) referencing it is orphan. |
| `DGCA-014` | warning | a change with no action referencing it is orphan. |
| `DGCA-015` | error | every `factors[].references_constraint[]` entry MUST match `CONSTRAINT-[<middle>-]<INTEGER>`. Cross-document resolution of the reference (existence of the catalogue file) is out of scope for in-file validation, consistent with the rest of the family. |
| `DGCA-016` | warning | `activities:` key used at document root or in `view_config` — deprecated; migrate to `actions:`. |
| `DGCA-017` | warning | `view_config.layers.activities:` used — deprecated; migrate to `view_config.layers.actions:`. |
| `DGCA-018` | warning | `actions[].type` is not one of `Initiative` \| `Programme` \| `Project` \| `Task` (or deprecated alias `work_package` for `Task`). The validator treats the entry as `Initiative` for backward compat. |

---

## References

- View-config contract (selection / filter / grouping / display options): [`CONTRACT.md`](../../CONTRACT.md) §14 (VP-2)
- Reconstruction invariant — `render(Elements + Relations, view_config)`: [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1.1
- DRIVER, GOAL, CHANGE, ACTION element primitive schemas: [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.1–§7.4
- Timeless inline relations (`goal.factors`, `change.goals`, `action.changes`): [`elements/17-relations.md`](../../elements/17-relations.md) §6
- Goals tree notation: [`04-goals.md`](./04-goals.md)
- Action schedule notation: [`07-action.md`](./07-action.md) — uses `delivers_changes:` to link into the DGCA chain
- Canonical ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md)
- Family selection across DGCA / Goals / Actions: `notations/README.md` § Family selection
- Methodology section 6.2: `method/01-methodology.md`
