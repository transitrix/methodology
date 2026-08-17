---
notation: "Goals Tree"
version: "1.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-15"
status: "documented"
file_extension: "*.goals.transitrix.yaml"
dsm_status: "implemented — Goals & Activities section, Visual Editor (G)"
---

# Goals Tree Notation — Reference

**Scope:** Hierarchy of strategic and tactical goals. The view document has two valid authoring forms: inline (`goal_types[]` and `goals[]` authored directly in the file; default for self-contained documents) and projection (a `view_config` block that selects from `GOAL` elements in `canon/elements/01_motivation/goals/`; used after elements are shared across documents). Both forms use the same field schema.
**Renderer:** Transitrix DSM — Visual Editor (G), Goals table; Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `goals` |
| File extension | `*.goals.transitrix.yaml` |

---

## Source of truth

A Goals Tree document has two valid authoring forms — both use the same YAML field schema:

- **Inline form (default):** `goal_types[]` and `goals[]` are authored directly in the view file. The file is self-contained. This is the expected form for a new adopter and for any goals hierarchy where elements are not yet shared across documents.
- **Projection form (Full tier — post-promotion):** the file carries only a `view_config` block that selects `GOAL` elements already admitted to `canon/elements/01_motivation/goals/`. No element data is in this file; the renderer loads the elements at view time. See [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §4.

The **promotion trigger** is cross-document sharing: a goal stays inline until a second document references it; at that point it is promoted to a standalone element file in `canon/elements/01_motivation/goals/` and both documents reference it by ID ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1). Promotion is optional until it is forced by sharing — do not split elements into per-file form from day one.

The reconstruction invariant applies: `render(Elements, view_config)` → Goals Tree diagram. Deleting `canon/views/goals/` loses no model knowledge. See [`CONTRACT.md`](../../CONTRACT.md) §14 (view_config contract).

**Where goals are authored.** In the inline form, goals are authored directly in the view file under `goals[]`. In the projection form, new goals are authored as standalone element files in `canon/elements/01_motivation/goals/<GOAL-…>.yaml`, following the canonical element envelope ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §3 and §7.2). The Goals Tree view then projects over them. This is the same pattern as DGCA ([`02-dgca.md`](./02-dgca.md)), the Actions Tree ([`23-actions-tree.md`](../reports/23-actions-tree.md)), and the Action Card ([`18-action-card.md`](./18-action-card.md)).

---

## 1. Overview

A goals tree is a hierarchical view that arranges GOAL elements from `canon/elements/01_motivation/goals/` into a top-down tree — from broad strategic ambitions down to specific tactical objectives.

The hierarchy is derived at render time from the `parent` field on each GOAL element: a goal whose `parent` is omitted (or null) is a root; a goal whose `parent` is `GOAL-…` is a child of that goal. The Goals Tree document itself contains only scope and display configuration.

Goals trees live in `canon/views/goals/`.

---

## 2. When to use

| Use case | Notation |
|----------|----------|
| Show how strategic goals break into tactical ones | Goals tree |
| Link goals to capabilities or processes | Capabilities map (`*.capability-map.transitrix.yaml`) |
| Show what drives goals | DGCA (`*.dgca.transitrix.yaml`) |
| Track goal delivery through actions | DGCA (full or DGA mode) |

---

## 3. File location and naming

```
canon/views/goals/<DOMAIN>.goals.transitrix.yaml
```

Examples:
- `canon/views/goals/GROWTH.goals.transitrix.yaml`
- `canon/views/goals/OPERATIONS.goals.transitrix.yaml`

---

## 4. Document structure

### Inline form (default — self-contained)

Goals and their type vocabulary are authored directly in the view file. This is the standard form for a new adopter and for any tree where elements are not yet shared across documents.

```yaml
notation: goals
spec_version: "0.1"

id: GOALS-STRATEGY-2026                # GOALS-[<middle>-]<INTEGER>
name: "Strategy 2026 — Goals Tree"
description: "Goal hierarchy for the 2026 plan."
period: "2026"
author: Transitrix

goal_types:                            # display vocabulary
  - { name: "Strategy",       level: 0 }
  - { name: "Strategic Goal", level: 1 }
  - { name: "Project Goal",   level: 2 }

goals:
  - id: GOAL-REVENUE-1
    name: "Triple revenue in 3 years"
    type: "Strategy"
    level: 0

  - id: GOAL-EU-1
    name: "Launch in 3 EU markets"
    type: "Strategic Goal"
    level: 1
    parent: GOAL-REVENUE-1
```

A complete example: [`examples/goals/strategy-2026.goals.transitrix.yaml`](../../examples/goals/strategy-2026.goals.transitrix.yaml).

### Projection form (Full tier — post-promotion)

After goals are promoted to `canon/elements/01_motivation/goals/`, the view becomes a `view_config` projection. No element data is in this file; the renderer loads elements at view time.

```yaml
notation: goals
spec_version: "0.1"
methodology_version: "3.6.0"          # required from v2.0 onward

id: GOALS-STRAT-2026-1                 # required — GOALS-[<middle>-]<INTEGER>
name: "Strategy 2026 — Goals Tree"    # required per CONTRACT.md §1.1
generated_at: "2026-07-06"            # optional per CONTRACT.md §4
description: "Goal hierarchy for the 2026 plan."
period: "2026"                         # optional — time period this view covers
author: Transitrix

view_config:
  scope:
    root_goal: null                    # GOAL-… to anchor as tree root; null = show all roots
    period: null                       # optional string filter on goal period metadata
    type_filter: null                  # list of type names to include; null = all types
    valid_at: null                     # ISO 8601 date; null = show all regardless of lifecycle
  goal_types:                          # display vocabulary — configures level labels
    - { name: "Strategy",       level: 0 }
    - { name: "Strategic Goal", level: 1 }
    - { name: "Project Goal",   level: 2 }
  display:
    depth: null                        # integer; null = unlimited depth
    collapsed: []                      # GOAL-… IDs of collapsed nodes at load time
```

---

## 5. Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `goals` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | reserved field per the shared contract |
| `methodology_version` | yes (from v2.0) | methodology release this document conforms to |
| `id` | yes | document ID — `GOALS-[<middle>-]<INTEGER>` per the canonical grammar |
| `name` | yes | human-readable name |
| `generated_at` | no | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `description` | no | one-paragraph context |
| `period` | no | time period the tree covers |
| `author` | no | document author |
| `goal_types` | no | **Inline form only.** Display vocabulary at document root — same semantics as `view_config.goal_types` (see §5.2). Mutually exclusive with `view_config.goal_types`. |
| `goals` | no | **Inline form only.** Array of goal entries authored directly in the view file. Each entry carries `id`, `name`, `type`, `level`, and optionally `parent`, `description`, `link`, `valid_from`, `valid_to`. Mutually exclusive with `view_config`. |
| `view_config` | no | **Projection form only.** Rendering configuration for Full-tier projection over canonical element files — see §5.1. Mutually exclusive with `goals`. |

### 5.1 `view_config.scope`

Scope fields filter which GOAL elements the renderer includes. All are optional; omitting the `scope` block (or the `view_config` block entirely) includes all active GOAL elements.

| Field | Required | Description |
|---|---|---|
| `root_goal` | no | `GOAL-…` ID to use as the tree root. When set, only that goal and its descendants are shown. Omit to show all root goals. |
| `period` | no | String to match against goal metadata. When set, the renderer includes only goals tagged with this period. |
| `type_filter` | no | Array of goal type names (must match names in `goal_types[]`). When non-empty, only goals of the listed types are shown. |
| `valid_at` | no | Quoted ISO 8601 date. Renderer includes only goals whose `valid_from ≤ valid_at` and (`valid_to` is null or `valid_to ≥ valid_at`). Omit to include all goals regardless of lifecycle dates. |

### 5.2 `view_config.goal_types`

Display vocabulary configuring how the renderer labels and levels the goal hierarchy. Each entry has:

| Field | Required | Description |
|---|---|---|
| `name` | yes | human-readable level name — must match `type` values on GOAL elements |
| `level` | yes | non-negative integer; `0` is the root level |

Values must form a **contiguous** integer sequence starting at `0` (no gaps). Organisations choose their own vocabulary; the canonical 8-level default is listed in §7.

If `goal_types` is absent, the renderer infers levels from the `parent` chain depth (root goals at 0, each step deeper adds 1). Level labels fall back to the `type` string on the GOAL element.

### 5.3 `view_config.display`

| Field | Required | Default | Description |
|---|---|---|---|
| `depth` | no | `null` | Maximum depth to show; `null` = unlimited. |
| `collapsed` | no | `[]` | `GOAL-…` IDs of subtrees collapsed at load time. Interactive renderers may allow runtime expand/collapse. |

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `GOALS-001` | error | `notation` missing or does not equal `goals`. |
| `GOALS-002` | error | `id` missing or does not match `GOALS-[<middle>-]<INTEGER>`. |
| `GOALS-003` | error | `name` missing or empty. |
| `GOALS-004` | error | `goal_types[]` or `view_config.goal_types[]` present but any entry lacks `name` or has a non-integer `level`. |
| `GOALS-005` | error | `goal_types[].level` or `view_config.goal_types[].level` values are not contiguous integers starting at `0`. |
| `GOALS-006` | error | `view_config.scope.root_goal` is set but the referenced `GOAL-…` ID does not resolve to an admitted GOAL element in canon. |
| `GOALS-007` | error | `view_config.scope.type_filter` contains a value not present in `goal_types[].name`. |

Element-level validation (parent cycles, type/level consistency, ID grammar) lives in the GOAL element rules applied when the canonical element files are validated, not here.

---

## 7. DSM rendering & editor behaviour (non-normative)

This section describes how Transitrix DSM renders and edits the Goals Tree. It is **non-normative**: the conformance rules live in §6.

### 7.1 Hierarchy depth

The hierarchy depth is **not hardcoded** — it is configured in the `view_config.goal_types` table. The default configuration uses **8 levels**:

| Level | Name | Scope |
|:---:|---|---|
| **0** | Strategy | Single root — the organisation's overall vision |
| **1** | Strategic Intention | Broad areas of focus |
| **2** | Strategic Goal | Measurable strategic milestones |
| **3** | Business Goal | Department / unit level outcomes |
| **4** | Business Objective | Specific targets for teams |
| **5** | Project Goal | Goals tied to specific projects |
| **6** | Sprint Goal | Short-term iteration targets |
| **7** | Task Goal | Granular executable items |

All validation and visualisation logic adapts dynamically to the active `goal_types` configuration.

### 7.2 Editor constraints

- **Single parent:** `parent` is a single reference per GOAL element.
- **Single root:** DSM keeps one root (`level: 0`) per tree and will not create a second. This is an editor convention.

### 7.3 Editing and cascade updates

When a goal is moved to a new parent:

1. **Level update:** the goal's level is set to `new_parent.level + 1`.
2. **Cascade update:** all descendants are updated recursively.

**Max-depth protection:** if moving a branch would push its deepest descendant beyond the configured maximum level, the operation is blocked.

### 7.4 Backlog

Goals without a valid parent (orphans) live in the **backlog**. They are visible in the Goals table but not rendered in the Visual Editor (G) tree. Dragging a backlog goal onto a tree node attaches it.

### 7.5 Relationship to DGCA

In DSM the Goals Tree is the G layer of DGCA. Goals are linked to Actions via `action_goal` REL records ([elements/17-relations.md](../../elements/17-relations.md) §3), or transitionally via the inline `goals: [GOAL-…]` field on ACTION elements. The DGCA diagram (Strategy-to-Action) visualises this cross-layer chain. See [`02-dgca.md`](./02-dgca.md).

---

## 8. References

- Goal elements: `canon/elements/01_motivation/goals/*.yaml` (notation: goal)
- DGCA notation: [`02-dgca.md`](./02-dgca.md)
- GOAL element field schema: [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.2
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md)
- Family selection across DGCA / FGA / Goals / Actions: [`README.md`](../../README.md) § Family selection
- Per-notation file location catalogue: [`README.md`](../../README.md); notation kit overview: `method/04-notations.md`
