---
notation: "FGCA Strategy-to-Execution Chain"
version: "1.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-21"
status: "documented"
file_extension: "*.fgca.transitrix.yaml"
dsm_status: "implemented — F, G, C, A layers active; column selection via localStorage"
---

# FGCA Notation Reference

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all eleven Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `fgca` |
| File extension | `*.fgca.transitrix.yaml` |

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

- factors justify strategic focus,
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

Transitrix DSM implements the full 4-layer FGCA chain as of release 0.2.2:

| Layer | Status | Notes |
|-------|--------|-------|
| **F** — Factors | Implemented | Strategic Factors (PESTLE + internal); PESTLE report; factor–goal linking via `goal_factor` |
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

## Top-level structure — flat form

FGCA uses the **flat form**: a single `fgca:` root key carries document metadata, and the four layers (`factors`, `goals`, `changes`, `activities`) are parallel arrays under that key. Links between layers are id-references on each item, not nesting.

This shape matches the FGCA semantic graph: one Change can deliver many Goals, one Activity can deliver many Changes (the `activity_change` join in DSM). A nested form would require duplicating nodes for every cross-layer link. The flat form expresses the DAG directly.

For comparison: FGA and the Goals tree are tree-shaped (each child has a single parent) and use a nested form — see [`03-fga.md`](03-fga.md) and [`04-goals.md`](04-goals.md). The flat-vs-nested choice across the family follows the rule "nested for trees, flat for DAGs" — the family-selection guide will document this once the cross-notation relationship doc lands.

```yaml
notation: fgca
spec_version: "0.1"

fgca:
  id: FGCA-STRAT-1
  name: "Strategy 2026 — FGCA chain"
  description: "Factor → Goal → Change → Activity decomposition for the 2026 plan."
  period: "2026"
  version: "0.1"
  date: "2026-05-21"
  author: Transitrix

  factors:
    - id: FACTOR-1
      name: "Competitive market pressure"
      type: external          # external | internal

  goals:
    - id: GOAL-1
      name: "Grow revenue by 20%"
      factors: [FACTOR-1]     # id-references to factors[]

  changes:
    - id: CHANGE-1
      name: "Launch new product line"
      goals: [GOAL-1]         # id-references to goals[]

  activities:
    - id: ACTIVITY-1
      name: "Market research"
      changes: [CHANGE-1]     # id-references to changes[]
```

A complete example: [`examples/fgca/strategy-2026.fgca.transitrix.yaml`](examples/fgca/strategy-2026.fgca.transitrix.yaml).

---

## Fields

### `fgca` root

| Field | Required | Description |
|---|---|---|
| `fgca.id` | yes | document ID — `FGCA-[<middle>-]<INTEGER>` per the canonical grammar |
| `fgca.name` | yes | human-readable name |
| `fgca.description` | no | one-paragraph context |
| `fgca.period` | no | time period the chain covers (e.g. `"2026"`, `"2026-Q3"`) |
| `fgca.version` | no | document version |
| `fgca.date` | no | document date (YYYY-MM-DD) |
| `fgca.author` | no | document author |
| `fgca.factors` | yes | array of factor entries — see below |
| `fgca.goals` | yes | array of goal entries — see below |
| `fgca.changes` | yes | array of change entries — see below |
| `fgca.activities` | yes | array of activity entries — see below |

### `factors[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `FACTOR-[<middle>-]<INTEGER>` |
| `name` | yes | what the factor is |
| `type` | no | `external` or `internal` |
| `description` | no | one-paragraph elaboration |

### `goals[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `GOAL-[<middle>-]<INTEGER>` |
| `name` | yes | what the goal is |
| `factors` | no | array of `FACTOR-…` IDs this goal is driven by |
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

ID grammar follows the canonical rule `<TYPE>-[<middle segment(s)>-]<INTEGER>`. Middle segments are optional and notation-specific. The terminal integer is positive (≥ 1) with no leading zeros. `ACTIVITY-` is the canonical activity prefix (replacing the older `ACT-` form); `CHANGE-` is the FGCA change-layer prefix. The full grammar and TYPE registry will live in a forthcoming `IDS_AND_REFERENCES.md` appendix.

---

## Validation rules

| Rule | Severity | Description |
|---|---|---|
| `FGCA-001` | error | `fgca` root key missing. |
| `FGCA-002` | error | `fgca.id` missing or empty. |
| `FGCA-003` | error | `fgca.name` missing or empty. |
| `FGCA-004` | error | any of `fgca.factors` / `fgca.goals` / `fgca.changes` / `fgca.activities` missing or empty. |
| `FGCA-005` | error | every entry in the four arrays must have a non-empty `id` and `name`. |
| `FGCA-006` | error | IDs unique within their layer (and SHOULD be unique across all four layers within a document). |
| `FGCA-007` | error | every ID matches the canonical grammar `<TYPE>-[<middle>-]<INTEGER>` with the right type prefix for its layer. |
| `FGCA-008` | error | `goals[].factors[]` IDs must reference defined factors. |
| `FGCA-009` | error | `changes[].goals[]` IDs must reference defined goals. |
| `FGCA-010` | error | `activities[].changes[]` IDs must reference defined changes. |
| `FGCA-011` | error | `activities[].goals[]` IDs must reference defined goals. |
| `FGCA-012` | warn | a factor with no goal referencing it is orphan. |
| `FGCA-013` | warn | a goal with no change (and no direct activity) referencing it is orphan. |
| `FGCA-014` | warn | a change with no activity referencing it is orphan. |

---

## References

- FGA notation (3-layer simplified variant, nested form): [`03-fga.md`](03-fga.md)
- Goals tree notation: [`04-goals.md`](04-goals.md)
- Activities notation: [`07-activities.md`](07-activities.md) — uses `delivers_changes:` to link into the FGCA chain
- Canonical ID grammar and TYPE registry: forthcoming `IDS_AND_REFERENCES.md` appendix
- Family selection across FGCA / FGA / Goals / Activities: `notations/README.md` § Family selection
- Methodology section 6.2: `method/methodology.md`
