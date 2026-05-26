---
notation: "Goals Tree"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-05-26"
status: "documented"
file_extension: "*.goals.transitrix.yaml"
dsm_status: "implemented — Goals & Activities section, Visual Editor (G)"
---

# Goals Tree Notation — Reference

**Scope:** Hierarchy of strategic and tactical goals; mono-type tree composed entirely of Goal elements. Authored as a flat document — hierarchy is expressed through `parent` references on each goal.
**Renderer:** Transitrix DSM — Visual Editor (G), Goals table; Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `goals` |
| File extension | `*.goals.transitrix.yaml` |

---

## 1. Overview

A goals tree is a hierarchical view that arranges Goal elements from `elements/01_motivation/` into a top-down tree — from broad strategic ambitions down to specific tactical objectives.

The hierarchy is expressed by `parent` references on each goal: a goal whose `parent` is omitted (or null) is a root; a goal whose `parent` is `GOAL-XYZ` is a child of that goal. The document itself is a flat list — the tree shape is derived from the `parent` references at render time.

Goals trees live in `views/goals/`.

---

## 2. When to use

| Use case | Notation |
|----------|----------|
| Show how strategic goals break into tactical ones | Goals tree |
| Link goals to capabilities or processes | Capabilities map (`*.capability-map.transitrix.yaml`) |
| Show what drives goals | FGCA (`*.fgca.transitrix.yaml`) |
| Track goal delivery through activities | FGCA or FGA |

---

## 3. File location and naming

```
views/goals/<DOMAIN>.goals.transitrix.yaml
```

Examples:
- `views/goals/GROWTH.goals.transitrix.yaml`
- `views/goals/OPERATIONS.goals.transitrix.yaml`

---

## 4. Top-level structure — flat form

The document carries document metadata, a `goal_types[]` array that defines the level vocabulary, and a flat `goals[]` array at the document root. There is no wrapper key. The tree shape is derived from the `parent` field on each goal.

The same flat-with-references shape applies family-wide across all four strategy-chain notations (FGCA, FGA, Goals, Activities) — see [`README.md`](README.md) § Family selection for the family-wide rule (decided 2026-05-26; supersedes the earlier "nested for trees, flat for DAGs" heuristic).

```yaml
notation: goals
spec_version: "0.1"

id: GOALS-STRAT-1
name: "Strategy 2026 — Goals Tree"
description: "Goal hierarchy across Strategy → Strategic Goal → Project Goal levels for the 2026 plan."
period: "2026"
version: "0.1"
date: "2026-05-26"
author: Transitrix

goal_types:
  - { name: "Strategy",         level: 0 }
  - { name: "Strategic Intention", level: 1 }
  - { name: "Strategic Goal",   level: 2 }
  - { name: "Business Goal",    level: 3 }
  - { name: "Project Goal",     level: 4 }

goals:
  - id: GOAL-REVENUE-1
    name: "Triple revenue in 3 years"
    type: "Strategy"
    level: 0
    # No parent — root.

  - id: GOAL-EU-1
    name: "Launch in 3 EU markets"
    type: "Strategic Goal"
    level: 2
    parent: GOAL-REVENUE-1

  - id: GOAL-BERLIN-1
    name: "Open Berlin office"
    type: "Project Goal"
    level: 4
    parent: GOAL-EU-1
```

A complete example: [`examples/goals/strategy-2026.goals.transitrix.yaml`](examples/goals/strategy-2026.goals.transitrix.yaml).

---

## 5. Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `goals` (per [CONTRACT.md](CONTRACT.md)) |
| `spec_version` | no | reserved field per the shared contract |
| `id` | yes | document ID — `GOALS-[<middle>-]<INTEGER>` per the canonical grammar (the document-level TYPE `GOALS_TREE` in [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.2 is the historical label; document IDs use the short `GOALS-…` form for filenames and references) |
| `name` | yes | human-readable name |
| `description` | no | one-paragraph context |
| `period` | no | time period the tree covers |
| `version` | no | document version |
| `date` | no | document date (YYYY-MM-DD) |
| `author` | no | document author |
| `goal_types` | yes | array of `{name, level}` entries defining the level vocabulary — see §5.1 |
| `goals` | yes | flat array of goal entries — see §5.2 |

### 5.1 `goal_types[]`

| Field | Required | Description |
|---|---|---|
| `name` | yes | human-readable level name (`"Strategy"`, `"Strategic Goal"`, …) |
| `level` | yes | non-negative integer; `0` is the root level |

Organisations choose their own level vocabulary; the canonical 8-level default is listed in §9.1.

### 5.2 `goals[]`

| Field | Required | Description |
|---|---|---|
| `id` | yes | `GOAL-[<middle>-]<INTEGER>` per the canonical grammar |
| `name` | yes | what the goal is |
| `type` | yes | one of the `name` values from `goal_types[]` |
| `level` | yes | non-negative integer matching the `level` of the named `type` |
| `parent` | no | `GOAL-…` ID of the parent goal. Omit for a root (`level = 0`). |
| `description` | no | one-paragraph elaboration |
| `link` | no | URL pointing at supplementary documentation |
| `tag` | no | free-form classifier string |

ID grammar follows the canonical rule `<TYPE>-[<middle segment(s)>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md).

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `GOALS-001` | error | document root is not an object, or `notation` field missing / does not equal `goals`. |
| `GOALS-002` | error | `id` missing or does not match `GOALS-[<middle>-]<INTEGER>`. |
| `GOALS-003` | error | `name` missing or empty. |
| `GOALS-004` | error | `goal_types` missing or empty; `goals` missing or empty. |
| `GOALS-005` | error | every entry in `goal_types[]` must have a non-empty `name` and a non-negative integer `level`. |
| `GOALS-006` | error | every entry in `goals[]` must have a non-empty `id`, `name`, `type`, and a non-negative integer `level`. |
| `GOALS-007` | error | every `goals[].id` matches the canonical grammar and is unique within the document. |
| `GOALS-008` | error | `goals[].type` references a `name` defined in `goal_types[]`; `goals[].level` equals the level associated with that type. |
| `GOALS-009` | warn | `goals[].parent` references an `id` not defined in `goals[]` — the goal is treated as an orphan / backlog item. |
| `GOALS-010` | error | the `parent` chain contains a cycle (a goal is its own ancestor). |
| `GOALS-011` | warn | a non-root goal (`level ≥ 1`) has no `parent` set; either declare it as a root by promoting it to `level: 0`, or attach it to a parent. |

---

## 7. References

- Goal elements: `elements/01_motivation/*.yaml` (type: Goal)
- FGCA notation: [`02-fgca.md`](02-fgca.md)
- FGA notation: [`03-fga.md`](03-fga.md)
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md)
- Family selection across FGCA / FGA / Goals / Activities: [`README.md`](README.md) § Family selection
- Methodology section 6.1: `method/methodology.md`

---

## 8. DSM Implementation Rules

This section describes how Transitrix DSM implements the Goals Tree. These rules govern the API, Visual Editor (G), and table view.

### 8.1 Hierarchy depth

The hierarchy depth is **not hardcoded** — it is configured in the `goal_types` table per organisation. The default configuration uses **8 levels**:

| Level | Name | Scope |
|:---:|---|---|
| **0** | Strategy | Single root — the organisation's overall vision |
| **1** | Strategic Intention | Broad areas of focus (e.g., "Market Expansion") |
| **2** | Strategic Goal | Measurable strategic milestones |
| **3** | Business Goal | Department / unit level outcomes |
| **4** | Business Objective | Specific targets for teams |
| **5** | Project Goal | Goals tied to specific projects |
| **6** | Sprint Goal | Short-term iteration targets |
| **7** | Task Goal | Granular executable items |

All validation and visualisation logic adapts dynamically to the currently active `goal_types` configuration — organisations can rename or resize the hierarchy.

### 8.2 Structural constraints

**Rule 1 — Strict N+1 hierarchy:** A child goal must always be exactly one level deeper than its parent.

```
Constraint: child.level = parent.level + 1
```

Attaching a Level 4 goal directly to a Level 2 parent is rejected.

**Rule 2 — Single parent:** Every goal (except the root) must have exactly one parent. Goals with a missing or invalid `parent` are treated as **Orphans** (backlog) and are not shown in the main tree until attached.

**Rule 3 — Single root:** Only one goal with `level = 0` (type = Strategy) may exist. The API rejects creation of a second root.

### 8.3 Editing and cascade updates

When a goal is moved to a new parent:

1. **Level update:** the goal's level is immediately set to `new_parent.level + 1`.
2. **Cascade update:** all descendants are updated recursively so that each child remains at `parent.level + 1`.

**Max-depth protection:** if moving a branch would push its deepest descendant beyond the configured maximum level, the operation is blocked.

### 8.4 Backlog

Goals without a valid parent (orphans) live in the **backlog**. They are visible in the Goals table but not rendered in the Visual Editor (G) tree. Dragging a backlog goal onto a tree node attaches it and triggers the cascade level update.

### 8.5 Relationship to FGCA

In DSM the Goals Tree is the G layer of FGCA. Goals are linked to Activities via the `goals: [GOAL-…]` field on Activity records. The FGCA diagram (Strategy-to-Action) visualises this cross-layer chain. See [`02-fgca.md`](02-fgca.md).
