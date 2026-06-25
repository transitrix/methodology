---
notation: "Activities Tree"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-25"
status: "draft"
file_extension: "*.activities-tree.transitrix.yaml"
dsm_status: "planned"
---

# Activities Tree Notation — Reference

**Scope:** Report-config view over the `ACTIVITY` element catalogue — renders the strategic portfolio as a top-down tree from Initiative (level 1) through Programme, Project, to Task (level 4), with the organisation's business as an implicit virtual root (level 0). The hierarchy is derived at render time from the `parent` field on each `ACTIVITY` element in `canon/elements/05_implementation/activities/`. No activity data is defined inline in this document — it is a projection configuration, not an authoring surface.
**Renderer:** Transitrix Studio — tree panel (planned); Transitrix DSM — planned.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `activities-tree` |
| File extension | `*.activities-tree.transitrix.yaml` |

---

## 1. Overview

An Activities Tree document configures a **tree rendering of the organisation's activity catalogue** — the `ACTIVITY-*` elements stored under `canon/elements/05_implementation/activities/`. The renderer reads those elements, resolves the `parent` links, and builds a top-down tree.

**Scale levels and virtual root:**

| Level | Source | Rendered as |
|---|---|---|
| 0 | Virtual root — not an element | Company name (tree view) or anonymous start node (network/Gantt) |
| 1 | `activity_type: Initiative` (alias `Strategic Initiative`) | Tree roots — direct children of the virtual root |
| 2 | `activity_type: Programme` | Children of an Initiative |
| 3 | `activity_type: Project` | Children of a Programme (or Initiative) |
| 4 | `activity_type: Task` | Leaf nodes within a Project |

The `activity_type` value labels the **semantic scale**; the `parent` field carries the structural edge. Both are optional on any element — an activity without `activity_type` is displayed at its inferred level (derived from the `parent` chain depth); an activity without `parent` is treated as a root (level 1 if `activity_type: Initiative`, otherwise an orphan — see §8).

Mixed-depth trees are valid: an Initiative may have direct Project children (no Programme layer), or a Programme may contain Tasks directly.

**Relationship to other Activities views:**

| Need | View |
|---|---|
| Strategic portfolio overview — what Initiatives exist, how they decompose | **Activities tree** (`*.activities-tree.transitrix.yaml`) |
| Schedule — activity dependencies, critical path, network diagram | Activities schedule (`*.activities.transitrix.yaml`) |
| Timeline — Gantt chart with durations and dates | Activities schedule with Gantt rendering |
| Single-project narrative — goals served, milestones, gate decisions | Activity Card (`*.activity-card.transitrix.yaml`) |

The Activities tree reads from the elements catalogue; the Activities schedule is a standalone plan document with its own inline activity entries. The two views are complementary — the tree gives the strategic overview, the schedule gives the delivery plan for one project.

---

## 2. When to use

| Use case | Notation |
|---|---|
| Show all Initiatives and how they decompose into Programmes, Projects, Tasks | Activities tree |
| Navigate the portfolio — which projects belong to which Initiative | Activities tree |
| Filter portfolio to a specific strategic goal | Activities tree with `view_config.scope.goals` |
| Plan delivery — durations, dependencies, critical path | Activities schedule (`*.activities.transitrix.yaml`) |
| Show a project's strategic context (goals, changes, milestones) | Activity Card (`*.activity-card.transitrix.yaml`) |
| Show how goals decompose hierarchically | Goals tree (`*.goals.transitrix.yaml`) |

---

## 3. File location and naming

```
organizations/<org>/views/activities-tree/<NAME>.activities-tree.transitrix.yaml
```

Examples:
- `organizations/acme_corp/views/activities-tree/portfolio-2026.activities-tree.transitrix.yaml`
- `organizations/acme_corp/views/activities-tree/platform-stream.activities-tree.transitrix.yaml`

---

## 4. Document structure

```yaml
notation: activities-tree
spec_version: "0.1"

id: ATREE-PORTFOLIO-2026-1
name: "Strategic Portfolio 2026"
generated_at: "2026-06-25"
description: "Full initiative hierarchy for the 2026 strategic plan."
period: "2026"

view_config:
  scope:
    initiatives: []                     # ACTIVITY-… IDs to include as roots; omit = all roots
    goals: []                           # filter to activities serving these GOAL-… IDs
    valid_at: "2026-06-25"             # show only activities valid at this date; omit = latest
  display:
    collapse_depth: 2                   # default expand depth: 1=Initiative, 2=Programme,
                                        # 3=Project, 4=Task (all expanded); omit = 2
    show_dates: true                    # show start_date / end_date per node
    show_owner: true                    # show owner (ACTOR name) per node
    show_activity_type_badge: true      # show level badge (Initiative / Programme / etc.)
    show_activity_card_link: true       # link Project nodes to their Activity Card (if one exists)
    virtual_root_label: ""              # label for level-0 root node; defaults to org name
                                        # from the adopter manifest; set to "" to hide
```

---

## 5. Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `activities-tree` (per [CONTRACT.md](../CONTRACT.md) §3) |
| `spec_version` | no | reserved field per the shared contract |
| `id` | yes | document ID — `ATREE-[<middle>-]<INTEGER>` per the canonical ID grammar ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1) |
| `name` | yes | human-readable name for this tree document |
| `generated_at` | no | date the document was generated or last revised — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4 |
| `description` | no | one-paragraph context |
| `period` | no | time period this portfolio view covers |
| `view_config` | no | rendering configuration — see §5.1 |

### 5.1 `view_config.scope`

Scope fields filter which elements the renderer includes. All are optional; omitting the `scope` block includes the full catalogue.

| Field | Required | Description |
|---|---|---|
| `initiatives` | no | list of `ACTIVITY-…` IDs whose subtrees to include. When present and non-empty, only the listed Initiatives and their descendants appear. Omit or set to `[]` to include all Initiative-level roots. |
| `goals` | no | list of `GOAL-…` IDs. When present and non-empty, only activities with a matching entry in `goals[]` (inline) or a `REL` of `type: activity_goal` pointing to one of the listed goals are included, along with their ancestors up to the Initiative root (to preserve tree shape). |
| `valid_at` | no | quoted ISO 8601 date. Renderer includes only activities whose `valid_from ≤ valid_at` and (`valid_to` is null or `valid_to ≥ valid_at`). Omit to include all elements regardless of lifecycle dates. |

### 5.2 `view_config.display`

Display options control what is shown per node and at what default collapse depth.

| Field | Required | Default | Description |
|---|---|---|---|
| `collapse_depth` | no | `2` | Depth to expand by default: `1` = Initiative only; `2` = Initiative + Programme; `3` = + Project; `4` = all (including Tasks). Users can expand/collapse individual nodes at runtime. |
| `show_dates` | no | `true` | Show `start_date` / `end_date` on each node. |
| `show_owner` | no | `true` | Show the resolved `ACTOR` name for `owner`. |
| `show_activity_type_badge` | no | `true` | Show the `activity_type` level badge per node. |
| `show_activity_card_link` | no | `true` | For Project-level nodes, show a link to the Activity Card document if one references this activity (`activity_type: Project`). |
| `virtual_root_label` | no | *(org name from manifest)* | Label for the level-0 virtual root node. Set to `""` to suppress the virtual root node entirely (Initiatives become tree roots). |

---

## 6. Node display

Each tree node displays the following fields from the `ACTIVITY` element:

| Field | Shown when | Source |
|---|---|---|
| `name` | always | `ACTIVITY.name` |
| `activity_type` badge | `show_activity_type_badge: true` | `ACTIVITY.activity_type` |
| `start_date` – `end_date` | `show_dates: true` | `ACTIVITY.start_date`, `ACTIVITY.end_date` |
| Owner | `show_owner: true` | resolved `ACTOR.name` from `ACTIVITY.owner` |
| Activity Card link | `show_activity_card_link: true` and node is Project-level | scan `canon/views/` for an Activity Card referencing this `ACTIVITY-…` as its project anchor |
| `description` tooltip | on hover / expand | `ACTIVITY.description` |

The `id` (`ACTIVITY-…`) is available for drill-down navigation but is not shown as a primary label.

---

## 7. Virtual root — level 0

The organisation's total activity is represented by an implicit **virtual root** at level 0. It is not modelled as an `ACTIVITY` element; it is a rendering convention only.

- **Tree view:** rendered as a root node labelled with `virtual_root_label` (defaults to the organisation name from the adopter manifest). All Initiative-level activities (`activity_type: Initiative`, or unclassified activities with no `parent`) are direct children.
- **Collapsed view:** if `virtual_root_label: ""`, the virtual root is suppressed and Initiatives appear as top-level nodes.

The virtual root is never exported to YAML and carries no `ACTIVITY-…` ID.

---

## 8. Orphan activities

An activity is an **orphan** if it has no `parent` and is not classified as `activity_type: Initiative`. Orphans are not placed in the main tree.

Renderers SHOULD expose orphans in a separate **backlog** panel (analogous to the Goals tree backlog, §8.4 in [04-goals.md](04-goals.md)). Dragging a backlog activity onto a tree node sets its `parent` in the underlying element file.

---

## 9. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ATREE-001` | error | `notation` missing or not equal to `activities-tree`. |
| `ATREE-002` | error | `id` missing or not matching `ATREE-[<middle>-]<INTEGER>`. |
| `ATREE-003` | error | `name` missing or empty. |
| `ATREE-004` | warn | `view_config.scope.initiatives[]` references an `ACTIVITY-…` ID not found in the catalogue. |
| `ATREE-005` | warn | `view_config.scope.goals[]` references a `GOAL-…` ID not found in the catalogue. |
| `ATREE-006` | error | `view_config.display.collapse_depth` is present and not an integer between 1 and 4. |

The shared header rules (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) apply to activities-tree documents.

Activities tree documents do **not** carry an admission record or primitive lifecycle — they are view configuration, not canon primitives.

---

## 10. References

- Activity element spec and `activity_type` vocabulary: [elements/24-activity.md](../elements/24-activity.md)
- Activities schedule notation (network + Gantt): [07-activities.md](07-activities.md)
- Activity Card notation: [18-activity-card.md](18-activity-card.md)
- Goals tree (analogous view for goals): [04-goals.md](04-goals.md)
- ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1
- Canon zone and element catalogue: [CONTRACT.md](../CONTRACT.md) §5
- Virtual root concept: [elements/24-activity.md](../elements/24-activity.md) §1
