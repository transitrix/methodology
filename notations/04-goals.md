---
notation: "Goals Tree"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-08"
status: "implemented"
file_extension: "*.goals.transitrix.yaml"
dsm_status: "implemented — Goals & Activities section, Visual Editor (G)"
---

# Goals Tree Notation — Reference

**Version:** 0.2
**Date:** 2026-05-08
**Status:** Implemented in Transitrix DSM
**File extension:** `*.goals.transitrix.yaml`
**Scope:** Hierarchy of strategic and tactical goals; mono-type tree composed entirely of Goal elements.
**Renderer:** Transitrix DSM — Visual Editor (G), Goals table; Transitrix Studio (planned)

---

## File header

Every `*.goals.transitrix.yaml` file MUST start with the following header:

```yaml
notation: goals         # required; this notation's short name
spec_version: 0.1       # optional today; reserved field; will be required when this notation reaches v1.0
# … rest of the document
```

Validator behaviour:
- Missing `notation` → hard error.
- `notation` value not equal to `goals` → hard error (the file might be the wrong format for this extension).
- File extension not equal to `.goals.transitrix.yaml` while `notation: goals` → hard error (extension/content mismatch).
- `spec_version` accepted but not enforced until this notation hits v1.0.

---

## 1. Overview

A goals tree is a hierarchical view that arranges Goal elements from `elements/01_motivation/` into a top-down tree — from broad strategic ambitions down to specific tactical objectives.

Unlike a flat list of goals, the tree makes the logical decomposition explicit: a parent goal is achieved through the combined delivery of its child goals. The tree is a **view** over atomic Goal elements — the elements themselves remain unchanged in `elements/01_motivation/`.

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

## 4. Top-level structure

```yaml
goals_tree:
  id: "GT-GROWTH-001"
  name: "Growth Strategy Goals"
  description: "Strategic and tactical goals for the 2026 growth programme"
  root:
    goal_id: "GOAL-REV-001"          # References an existing Goal element
    children:
      - goal_id: "GOAL-MARKET-001"
        children:
          - goal_id: "GOAL-ACQ-001"
          - goal_id: "GOAL-RET-001"
      - goal_id: "GOAL-PRODUCT-001"
        children:
          - goal_id: "GOAL-NPS-001"
```

---

## 5. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `goals_tree.id` | Yes | Unique identifier for this view (`GT-DOMAIN-SEQ`) |
| `goals_tree.name` | Yes | Human-readable name of the goals tree |
| `goals_tree.description` | No | What this goals tree represents |
| `root` | Yes | The top-most goal in the hierarchy |
| `goal_id` | Yes | Reference to an existing Goal element ID |
| `children` | No | List of child goals; omit for leaf goals |

---

## 6. Constraints

- Every `goal_id` must reference an existing element of `type: Goal` in `elements/01_motivation/`
- A Goal element may appear in multiple trees but only once per tree
- Cycles are not allowed
- Maximum recommended depth: 4 levels

---

## 7. Example

```yaml
goals_tree:
  id: "GT-OPS-001"
  name: "Operational Excellence Goals"
  description: "Delivery reliability and quality goals for 2026"
  root:
    goal_id: "GOAL-RELIABILITY-001"
    children:
      - goal_id: "GOAL-UPTIME-001"
      - goal_id: "GOAL-INCIDENT-001"
        children:
          - goal_id: "GOAL-MTTR-001"
          - goal_id: "GOAL-MTTA-001"
      - goal_id: "GOAL-QUALITY-001"
```

---

## 8. References

- Goal elements: `elements/01_motivation/*.yaml` (type: Goal)
- FGCA notation: `notations/02-fgca.md`
- FGA notation: `notations/03-fga.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6.1: `method/methodology.md`

---

## 9. DSM Implementation Rules

This section describes how Transitrix DSM implements the Goals Tree. These rules govern the API, Visual Editor (G), and table view.

### 9.1 Hierarchy depth

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

### 9.2 Structural constraints

**Rule 1 — Strict N+1 hierarchy:** A child goal must always be exactly one level deeper than its parent.

```
Constraint: child.level = parent.level + 1
```

Attaching a Level 4 goal directly to a Level 2 parent is rejected.

**Rule 2 — Single parent:** Every goal (except the root) must have exactly one parent. Goals with a missing or invalid `parent_id` are treated as **Orphans** (backlog) and are not shown in the main tree until attached.

**Rule 3 — Single root:** Only one goal with `level = 0` (type = Strategy) may exist. The API rejects creation of a second root.

### 9.3 Editing and cascade updates

When a goal is moved to a new parent:

1. **Level update:** the goal's level is immediately set to `new_parent.level + 1`.
2. **Cascade update:** all descendants are updated recursively so that each child remains at `parent.level + 1`.

**Max-depth protection:** if moving a branch would push its deepest descendant beyond the configured maximum level, the operation is blocked.

### 9.4 Backlog

Goals without a valid parent (orphans) live in the **backlog**. They are visible in the Goals table but not rendered in the Visual Editor (G) tree. Dragging a backlog goal onto a tree node attaches it and triggers the cascade level update.

### 9.5 Relationship to FGCA

In DSM the Goals Tree is the G layer of FGCA. Goals are linked to Activities via the `goal_id` field on Activity records. The FGCA diagram (Strategy-to-Action) visualises this cross-layer chain. See `notations/02-fgca.md`.
