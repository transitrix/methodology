---
notation: "FGCA Strategy-to-Execution Chain"
version: "1.4"
author: "Valerii Korobeinikov"
last_updated: "2026-05-26"
status: "documented"
file_extension: "*.fgca.transitrix.yaml"
dsm_status: "implemented — F, G, C, A layers active; column selection via localStorage"
---

# FGCA Notation Reference

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `fgca` |
| File extension | `*.fgca.transitrix.yaml` |

---

## Source of truth

**DRIVER, GOAL, CHANGE, and ACTIVITY elements are standalone primitives in `canon/elements/`** ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §4). The FGCA view document is a **projection** over those elements — it contains only a `view_config` that selects and filters the elements to render. No element data is authored inline in the view document.

The inline cross-reference fields (`goal.factors`, `change.goals`, `activity.changes`) are **timeless inline relations** that stay on the element files themselves ([`elements/17-relations.md`](../elements/17-relations.md) §6). The view derives the rendered set by traversing these inline links from the selected goal set.

The reconstruction invariant applies: `render(Elements + Relations, view_config)` → FGCA diagram. Deleting `canon/views/fgca/` loses no model knowledge. See [`CONTRACT.md`](../CONTRACT.md) §14 (view_config contract).

---

## Element lifecycle

Every DRIVER, GOAL, CHANGE, and ACTIVITY element carries the canonical primitive lifecycle (`valid_from`, `valid_to`) in its standalone element file frontmatter. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7. The FGCA view document itself does not carry a lifecycle field.

---

## Method Author

This method is authored by **Valerii Korobeinikov**.

## What This Notation Is For

FGCA notation is a business method for translating strategy into coordinated execution.
It helps teams answer a single management question:

**How do our day-to-day initiatives directly support strategic intent?**

FGCA stands for:

- **F**actors
- **G**oals
- **C**hanges
- **A**ctivities

## Business Meaning of Each Layer

- **Factors**: external and internal drivers that explain why action is needed now.
- **Goals**: strategic outcomes the organization wants to achieve.
- **Changes**: business transformations required to make goals real.
- **Activities**: concrete initiatives, projects, and workstreams that deliver those changes.

## Core Management Logic

FGCA is read as a cause-and-delivery chain:

**Factors -> Goals -> Changes -> Activities**

In practical management communication, this means:

- drivers justify strategic focus,
- goals set direction and expected value,
- changes define what must be transformed in the business,
- activities define who does what to realize that transformation.

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

FGCA improves strategic coherence across leadership, program management, and operational teams.
It creates a shared language for planning, prioritization, and accountability, reducing the gap between strategy documents and real execution.

---

## DSM Implementation Status

This section is **non-normative**: it records what Transitrix DSM enforces and renders today and introduces no validation rules of its own — the conformance rules live in the §"Validation rules" table above. Transitrix DSM implements the full 4-layer FGCA chain as of release 0.2.2:

| Layer | Status | Notes |
|-------|--------|-------|
| **F** — Drivers | Implemented | Strategic Drivers (PESTLE + internal); PESTLE report; driver–goal linking via `goal_factor` |
| **G** — Goals | Implemented | Goals tree, Visual Editor, FGCA column; goal–activity link via `goal_id` |
| **C** — Changes | Implemented | `bdn_change` entities linked to goals; `activity_change` join table; Activity edit form shows "Delivers changes" |
| **A** — Activities | Implemented | Activities table, Visual Editor, FGCA column; linked to Changes via `activity_change` |

**FGCA Viewer:** The FGCA tab renders all four columns. Column visibility is configurable via F/G/C/A toggle buttons; preference saved in `localStorage["fgca_columns"]`. Valid degenerate views (FGA, GCA, GA, etc.) are supported.

**FGCA Report:** The "FGCA Report" tab renders the full F→G→C→A chain in list format and exports Mermaid/PlantUML diagrams. PNG export saves as `fgca-diagram.png`.

**Design decisions:** see `docs/decisions/2026-05-08-fgca-design.md` in the DSM repository.

---

## File location and naming

```
views/fgca/<DOMAIN>.fgca.transitrix.yaml
```

Examples:
- `views/fgca/STRATEGY_2026.fgca.transitrix.yaml`
- `views/fgca/Q3_OPERATIONS.fgca.transitrix.yaml`

---

## Structure — projection over canon elements

An FGCA view document projects over DRIVER, GOAL, CHANGE, and ACTIVITY elements already admitted to `canon/elements/**`. The document carries a header, a view identity block, and a `view_config` block. It does not inline element data.

```yaml
notation: fgca
spec_version: "0.1"
methodology_version: "0.5.0"

view:
  id: FGCA-RETAIL-1
  name: "Retail strategy chain 2026"
  description: "FGCA projection for the 2026 retail strategy."

view_config:
  goals:
    filter: all               # include every active GOAL in canon
  factors:
    surface: derived          # derive from goal.factors inline links on each included GOAL
  changes:
    surface: derived          # derive from change.goals inline links for the included goal set
  activities:
    surface: derived          # derive from activity.changes links for the included change set
  display:
    depth: null               # unlimited depth
    collapsed: []             # no collapsed nodes
```

The FGCA semantic graph — one Change can deliver many Goals, one Activity deliver many Changes — is expressed via the inline cross-reference fields (`goal.factors`, `change.goals`, `activity.changes`) on the element files themselves. The view_config selects which goals to anchor on; the renderer traverses the inline links to derive the full displayed set.

A complete example of standalone element files for this notation: [`examples/fgca/strategy-2026.fgca.transitrix.yaml`](../examples/fgca/strategy-2026.fgca.transitrix.yaml).

---

## Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `fgca` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | reserved field per the shared contract |
| `id` | yes | document ID — `FGCA-[<middle>-]<INTEGER>` per the canonical grammar |
| `name` | yes | human-readable name |
| `description` | no | one-paragraph context |
| `period` | no | time period the chain covers (e.g. `"2026"`, `"2026-Q3"`) |
| `version` | no | document version |
| `date` | no | document date (YYYY-MM-DD) |
| `author` | no | document author |
| `factors` | yes | array of driver entries — see below |
| `goals` | yes | array of goal entries — see below |
| `changes` | yes | array of change entries — see below |
| `activities` | yes | array of activity entries — see below |

### `factors[]`

A DRIVER is a neutral, standing force the organisation acts on, not a finding about it. Findings about a driver's current state (numbers, trends, observations) live on `ASSESSMENT` records that reference the DRIVER; they are not inline on a driver entry. See [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.1 (DRIVER as ArchiMate Driver) and §7.16 (ASSESSMENT).

| Field | Required | Description |
|---|---|---|
| `id` | yes | `DRIVER-[<middle>-]<INTEGER>`. Legacy `FACTOR-…` IDs remain valid. |
| `name` | yes | what the driver is — the neutral standing force, not a finding about it |
| `type` | no | `external` or `internal` |
| `category` | no | PESTLE sub-classification for external drivers — `political` \| `economic` \| `social` \| `technological` \| `legal` \| `environmental`. Omit on internal drivers. See [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.1. |
| `references_constraint` | no | array of `CONSTRAINT-…` IDs the driver reflects. Cross-document reference into the organisation's constraints catalogue (`elements/01_motivation/constraints/`). Rationale: the existence of a constraint is itself a strategic driver for the organisation — the DRIVER is the FGCA strategic driver, the constraint is the binding rule. (Decision recorded 2026-05-26.) |
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
| `description` | no | one-paragraph elaboration |

### `activities[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `ACTIVITY-[<middle>-]<INTEGER>` |
| `name` | yes | what the activity is |
| `changes` | no | array of `CHANGE-…` IDs this activity delivers |
| `goals` | no | array of `GOAL-…` IDs the activity supports directly (degenerate FGA-style link, used when the Change layer adds no information for that activity) |
| `description` | no | one-paragraph elaboration |

ID grammar follows the canonical rule `<TYPE>-[<middle segment(s)>-]<INTEGER>`. Middle segments are optional and notation-specific. The terminal integer is positive (≥ 1) with no leading zeros. `ACTIVITY-` is the canonical activity prefix (replacing the older `ACT-` form); `CHANGE-` is the FGCA change-layer prefix. The full grammar and TYPE registry live in [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md).

---

## view_config for FGCA

The `view_config` block (see [`CONTRACT.md`](../CONTRACT.md) §14) defines which elements to include and how to display them. All fields are optional; omitted fields fall back to the defaults below.

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
  activities:
    surface: derived     # derive ACTIVITY set from activity.changes links for the included changes
  display:
    depth: null          # maximum depth in the rendered chain; null = unlimited
    collapsed: []        # list of element IDs to render as collapsed nodes
```

### view_config keys

| Key | Type | Default | Semantics |
|---|---|---|---|
| `goals.filter` | string | `all` | `all` — include every active GOAL; `ids` — include only the GOALs listed in `goals.ids`; `tags` — include GOALs whose `tags[]` match any entry in `goals.tags`. |
| `goals.ids` | list | `[]` | `GOAL-…` IDs to include explicitly. Used when `goals.filter: ids`. |
| `goals.tags` | list | `[]` | Tag strings. Used when `goals.filter: tags`. |
| `factors.surface` | string | `derived` | `derived` — derive the DRIVER set by following `goal.factors` inline links on the included goals. `all` — include every active DRIVER in canon. |
| `changes.surface` | string | `derived` | `derived` — derive the CHANGE set by following `change.goals` inline links for the included goal set. `all` — include every active CHANGE in canon. |
| `activities.surface` | string | `derived` | `derived` — derive the ACTIVITY set by following `activity.changes` links for the included change set. `all` — include every active ACTIVITY in canon. |
| `display.depth` | integer \| null | `null` | Maximum depth of the rendered F→G→C→A chain. `null` renders all levels. |
| `display.collapsed` | list | `[]` | IDs of elements to render as collapsed (children hidden). |

The `goal.factors`, `change.goals`, and `activity.changes` inline cross-reference fields are timeless inline relations on the element files — they are not view configuration. The view_config does not re-define or override these links; it only selects which goal set to anchor the projection on.

---

## Validation rules

| Rule | Severity | Description |
|---|---|---|
| `FGCA-001` | error | document root is not an object, or `notation` field missing / does not equal `fgca`. |
| `FGCA-002` | error | `id` missing or empty. |
| `FGCA-003` | error | `name` missing or empty. |
| `FGCA-004` | error | any of `factors` / `goals` / `changes` / `activities` missing or empty. |
| `FGCA-005` | error | every entry in the four arrays must have a non-empty `id` and `name`. |
| `FGCA-006` | error | IDs unique within their layer (and SHOULD be unique across all four layers within a document). |
| `FGCA-007` | error | every ID matches the canonical grammar `<TYPE>-[<middle>-]<INTEGER>` with the right type prefix for its layer. |
| `FGCA-008` | error | `goals[].factors[]` IDs must reference defined drivers. |
| `FGCA-009` | error | `changes[].goals[]` IDs must reference defined goals. |
| `FGCA-010` | error | `activities[].changes[]` IDs must reference defined changes. |
| `FGCA-011` | error | `activities[].goals[]` IDs must reference defined goals. |
| `FGCA-012` | warn | a driver with no goal referencing it is orphan. |
| `FGCA-013` | warn | a goal with no change (and no direct activity) referencing it is orphan. |
| `FGCA-014` | warn | a change with no activity referencing it is orphan. |
| `FGCA-015` | error | every `factors[].references_constraint[]` entry MUST match `CONSTRAINT-[<middle>-]<INTEGER>`. Cross-document resolution of the reference (existence of the catalogue file) is out of scope for in-file validation, consistent with the rest of the family. |

---

## References

- View-config contract (selection / filter / grouping / display options): [`CONTRACT.md`](../CONTRACT.md) §14 (VP-2)
- Reconstruction invariant — `render(Elements + Relations, view_config)`: [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §1.1
- DRIVER, GOAL, CHANGE, ACTIVITY element primitive schemas: [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.1–§7.4
- Timeless inline relations (`goal.factors`, `change.goals`, `activity.changes`): [`elements/17-relations.md`](../elements/17-relations.md) §6
- FGA notation (3-layer simplified variant): [`03-fga.md`](03-fga.md)
- Goals tree notation: [`04-goals.md`](04-goals.md)
- Activities notation: [`07-activities.md`](07-activities.md) — uses `delivers_changes:` to link into the FGCA chain
- Canonical ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md)
- Family selection across FGCA / FGA / Goals / Activities: `notations/README.md` § Family selection
- Methodology section 6.2: `method/methodology.md`
