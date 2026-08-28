---
title: "Goal — motivation-layer strategic outcome"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-28"
status: "draft"
---

# Goal — Reference

**Scope:** The `GOAL` element type — the motivation-layer **strategic outcome** primitive: *an intended state or end-state that the organisation wants to achieve or maintain*. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3 (`GOAL` field set: §7.2, now superseded by this file); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Goals are **zone primitives**: each goal is a single YAML file under `canon/elements/01_motivation/goals/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the goal-specific frontmatter below.

---

## 1. Hierarchy — the `level` vocabulary and parent chain

Every goal carries an optional `level` value that labels its **position** within the goals hierarchy — from broad strategic ambitions (level 0) down to specific tactical objectives (level 7 or deeper, configured per adopter). The hierarchy is derived at render time from the `parent` field on each GOAL element: a goal whose `parent` is omitted (or null) is a root; a goal whose `parent` is `GOAL-…` is a child of that goal.

The parent relationship is **first-class time-aware** in v1 — its canonical home is a `REL-…` file under `canon/relations/` with `type: goal_parent` ([17-relations.md](17-relations.md) §3). Inline `parent` is v0.x transitional; renderers prefer REL files when both are present.

**`level` assignment:** The level is manually assigned per-goal (not auto-derived from hierarchy depth). A goal may carry `level` without `parent` (the hierarchical position is known but the goal is a root node) or `parent` without `level` (the structural parent is known but the level is unclassified).

---

## 2. Frontmatter — canonical schema

```yaml
notation: goal
id: GOAL-REVENUE-1
name: "Triple revenue in 3 years"
type: "Strategy"                        # Display type — matches a name in the rendering view's goal_types vocabulary
level: 0                                # Hierarchical level (≥ 0); optional
description: >
  Grow annual recurring revenue from current $10M to $30M through
  market expansion and product diversification.

# ── Hierarchy
parent: null                             # GOAL-… of the parent goal, or omit for root

# ── Strategy chain linkage
factors: [DRIVER-MARKET-1]               # DRIVER-… IDs driving this goal (legacy FACTOR-… IDs accepted)

# ── Supporting metadata
link: https://wiki.example.com/goals/revenue

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-06-25"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-01-15"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `goal`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `GOAL-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label — what the goal is. |
| `type` | no | string | Display type — should match a `name` value in the rendering view's `view_config.goal_types[]` vocabulary ([views/04-goals.md](../views/diagrams/04-goals.md) §5.2). Free-form string; adopter-defined. |
| `level` | no | integer | Hierarchical level (0 or greater). Optional; set when the goal's position in the hierarchy is fixed. |
| `parent` | no | string | `GOAL-…` of the parent goal in the hierarchy. **v0.x transitional inline field** — prefer a `REL` file with `type: goal_parent` ([17-relations.md](17-relations.md) §3). Omit for root goals. |
| `factors` | no | list | `DRIVER-…` IDs (or legacy `FACTOR-…` IDs) driving this goal. Timeless inline. |
| `description` | recommended | string | One-paragraph elaboration of the goal — what the organisation wants to achieve. |
| `link` | no | string | URL to supplementary documentation. |
| `zone` | yes | string | Always `canon` — [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | Date the goal took effect — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the goal ended, or `null` if still in effect. |

---

## 3. Time-aware relations

**`parent` — time-aware, inline is transitional.** A goal re-parented to a different goal mid-stream is a temporal event. The canonical home for a `GOAL → GOAL` link is a `REL-…` file under `canon/relations/` with `type: goal_parent` ([17-relations.md](17-relations.md) §3), not the inline `parent` field. The inline field stays available for authoring convenience in v0.x; renderers prefer REL files when both are present.

**`factors` — timeless, stays inline** in v1. The driving relationship is considered stable within the goal's lifecycle.

---

## 4. File location and naming

```
canon/elements/01_motivation/goals/<ID>.yaml
```

One goal per file, named by its canonical ID. Examples: `GOAL-REVENUE-1.yaml`, `GOAL-EU-EXPANSION-1.yaml`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `GOAL-ELEM-002` | error | `id` missing or empty. Warning: `id` does not match `GOAL-[<middle>-]<INTEGER>`. |
| `GOAL-ELEM-003` | error | `name` missing or empty. |
| `GOALS-009` | warning | `parent` is set but does not resolve to a known GOAL (orphan). Non-blocking advisory to surface unreachable parents. |
| `GOALS-010` | error | GOAL `parent` chain contains a cycle — a goal's ancestor chain eventually links back to itself. |
| `GOALS-011` | warning | GOAL has no `parent` field set and `level` ≥ 1. Indicates a backlog/orphan goal that may lack hierarchical positioning. Non-blocking advisory. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to GOAL files in addition to the GOAL-ELEM and GOALS rules above.

---

## 6. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3.
- GOAL element field schema: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.2.
- Layer placement (`01_motivation`): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.1.
- Time-aware parent relation: [elements/17-relations.md](17-relations.md) §3.
- Goals Tree view spec: [views/04-goals.md](../views/diagrams/04-goals.md).
- DGCA notation (strategy-to-execution chain): [views/02-dgca.md](../views/diagrams/02-dgca.md).
