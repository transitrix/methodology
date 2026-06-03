---
notation: "FGA Strategy-to-Execution Chain"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-26"
status: "documented"
file_extension: "*.fga.transitrix.yaml"
---

# FGA Notation — Reference

**Scope:** Simplified strategy-to-execution chain in three layers: Factor → Goal → Activity. Skips the Changes layer present in FGCA.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `fga` |
| File extension | `*.fga.transitrix.yaml` |

---

## Element lifecycle

Every inline element this notation defines — entries in `factors[]`, `goals[]`, `activities[]` — carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../CONTRACT.md) §7.1, the lifecycle sits on each inline element entry; the FGA document itself does not carry a lifecycle field.

---

## 1. Overview

FGA is the simplified variant of FGCA. It is used when the transformation step between goals and activities is implicit or trivial — when activities directly and obviously serve goals without needing an intermediate change layer.

FGA answers the same core management question as FGCA:

> *How do our day-to-day initiatives directly support strategic intent?*

Use FGA when the organisation operates in a fast-moving context where the Changes layer would add overhead without adding clarity. Use FGCA when strategic changes require explicit management attention.

| | FGCA | FGA |
|--|------|-----|
| Layers | Factor → Goal → Change → Activity | Factor → Goal → Activity |
| Use when | Strategy-to-execution needs explicit change management | Activities map directly to goals |
| File extension | `*.fgca.transitrix.yaml` | `*.fga.transitrix.yaml` |

---

## 2. When to use

| Situation | Recommendation |
|-----------|---------------|
| Activities clearly serve goals with no intermediate transformation step | FGA |
| Strategy requires significant organisational change to become reality | FGCA |
| Quick operational planning with known goals and tasks | FGA |
| Multi-quarter transformation programme | FGCA |

---

## 3. File location and naming

```
views/fga/<DOMAIN>.fga.transitrix.yaml
```

Examples:
- `views/fga/Q3_OPERATIONS.fga.transitrix.yaml`
- `views/fga/GROWTH_2026.fga.transitrix.yaml`

---

## 4. Top-level structure — flat form

FGA uses the **flat form**: document metadata and the three layers (`factors`, `goals`, `activities`) live at the document root as parallel arrays. There is no wrapper key. Links between layers are id-references on each item, not nesting.

The same flat-with-references shape applies family-wide across all four strategy-chain notations (FGCA, FGA, Goals, Activities) — see [`README.md`](../README.md) § Family selection for the family-wide rule (decided 2026-05-26).

```yaml
notation: fga
spec_version: "0.1"

id: FGA-STRAT-1
name: "Strategy 2026 — FGA chain"
description: "Factor → Goal → Activity decomposition for the 2026 plan."
period: "2026"
version: "0.1"
date: "2026-05-26"
author: Transitrix

factors:
  - id: FACTOR-1
    name: "Competitive market pressure"
    type: external          # external | internal
    category: economic      # PESTLE — external only

goals:
  - id: GOAL-1
    name: "Grow revenue by 20%"
    factors: [FACTOR-1]     # id-references to factors[]

activities:
  - id: ACTIVITY-1
    name: "Launch new product line"
    goals: [GOAL-1]         # id-references to goals[]
```

A complete example: [`examples/fga/strategy-2026.fga.transitrix.yaml`](../examples/fga/strategy-2026.fga.transitrix.yaml).

---

## 5. Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `fga` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | reserved field per the shared contract |
| `id` | yes | document ID — `FGA-[<middle>-]<INTEGER>` per the canonical grammar |
| `name` | yes | human-readable name |
| `description` | no | one-paragraph context |
| `period` | no | time period the chain covers (e.g. `"2026"`, `"2026-Q3"`) |
| `version` | no | document version |
| `date` | no | document date (YYYY-MM-DD) |
| `author` | no | document author |
| `factors` | yes | array of factor entries — see below |
| `goals` | yes | array of goal entries — see below |
| `activities` | yes | array of activity entries — see below |

### `factors[]`

A factor is a **neutral driver** — a standing force the organisation acts on, not a finding about it. Findings about a driver's current state live on `ASSESSMENT` records that reference the FACTOR. See [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.1 (FACTOR as ArchiMate Driver) and §7.16 (ASSESSMENT).

| Field | Required | Description |
|---|---|---|
| `id` | yes | `FACTOR-[<middle>-]<INTEGER>` |
| `name` | yes | what the factor is — the neutral driver, not a finding about it |
| `type` | no | `external` or `internal` |
| `category` | no | PESTLE sub-classification for external factors — `political` \| `economic` \| `social` \| `technological` \| `legal` \| `environmental`. Omit on internal factors. See [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.1. |
| `description` | no | one-paragraph elaboration of the driver — keep findings out; emit them as `ASSESSMENT` records |

### `goals[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `GOAL-[<middle>-]<INTEGER>` |
| `name` | yes | what the goal is |
| `factors` | no | array of `FACTOR-…` IDs this goal is driven by |
| `description` | no | one-paragraph elaboration |

### `activities[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `ACTIVITY-[<middle>-]<INTEGER>` |
| `name` | yes | what the activity is |
| `goals` | no | array of `GOAL-…` IDs the activity supports |
| `owner` | no | `ROLE-…` ID of the accountable role |
| `status` | no | `Planned` / `In Progress` / `Done` |
| `due_date` | no | target completion date (YYYY-MM-DD) |
| `description` | no | one-paragraph elaboration |

ID grammar follows the canonical rule `<TYPE>-[<middle segment(s)>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md).

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `FGA-001` | error | document root is not an object, or `notation` field missing / does not equal `fga`. |
| `FGA-002` | error | `id` missing or does not match `FGA-[<middle>-]<INTEGER>`. |
| `FGA-003` | error | `name` missing or empty. |
| `FGA-004` | error | any of `factors` / `goals` / `activities` missing or empty. |
| `FGA-005` | error | every entry in the three arrays must have a non-empty `id` and `name`. |
| `FGA-006` | error | IDs unique within their layer (and SHOULD be unique across all three layers within a document). |
| `FGA-007` | error | every ID matches the canonical grammar `<TYPE>-[<middle>-]<INTEGER>` with the right type prefix for its layer. |
| `FGA-008` | error | `goals[].factors[]` IDs must reference defined factors. |
| `FGA-009` | error | `activities[].goals[]` IDs must reference defined goals. |
| `FGA-010` | warn | a factor with no goal referencing it is orphan. |
| `FGA-011` | warn | a goal with no activity referencing it is orphan. |

---

## 7. Difference from FGCA

FGCA adds a `changes` layer between goals and activities:

```
FGCA: Factor → Goal → Change → Activity
FGA:  Factor → Goal →          Activity
```

When converting FGA to FGCA: identify the implicit change each goal demands and make it explicit. This is the right move when a goal requires organisational transformation, not just execution.

Both notations use the same flat-with-references shape — FGA is FGCA minus the `changes[]` array, with `activities[].goals` taking the place of `activities[].changes`.

---

## 8. References

- FGCA notation: [`02-fgca.md`](02-fgca.md)
- Goals tree notation: [`04-goals.md`](04-goals.md)
- Goal elements: `elements/01_motivation/*.yaml` (type: Goal)
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md)
- Family selection across FGCA / FGA / Goals / Activities: `README.md` § Family selection
- Methodology section 6.2: `method/methodology.md`
