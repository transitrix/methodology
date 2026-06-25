---
notation: "Actions Tree"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-25"
status: "draft"
file_extension: "*.actions-tree.transitrix.yaml"
dsm_status: "planned"
---

# Actions Tree Notation — Reference

**Scope:** Report-config view over the `ACTION` element catalogue — renders the strategic portfolio as a top-down tree from Initiative (level 1) through Programme, Project, to Task (level 4), with the organisation's business as an implicit virtual root (level 0). The hierarchy is derived at render time from the `parent` field on each `ACTION` element in `canon/elements/05_implementation/actions/`. No action data is defined inline in this document — it is a projection configuration, not an authoring surface.
**Renderer:** Transitrix Studio — tree panel (planned); Transitrix DSM — planned.

**Deprecated alias.** The former notation key `activities-tree` and file extension `*.activities-tree.transitrix.yaml` are accepted with an `ATREE-008` warning.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `actions-tree` |
| File extension | `*.actions-tree.transitrix.yaml` |
| Deprecated `notation:` alias | `activities-tree` |
| Deprecated file extension alias | `*.activities-tree.transitrix.yaml` |

---

## 1. Overview

An Actions Tree document configures a **tree rendering of the organisation's action catalogue** — the `ACTION-*` elements stored under `canon/elements/05_implementation/actions/`. The renderer reads those elements, resolves the `parent` links, and builds a top-down tree.

**Scale levels and virtual root:**

| Level | Source | Rendered as |
|---|---|---|
| 0 | Virtual root — not an element | Company name (tree view) or anonymous start node (network/Gantt) |
| 1 | `action_type: Initiative` (alias `Strategic Initiative`) | Tree roots — direct children of the virtual root |
| 2 | `action_type: Programme` | Children of an Initiative |
| 3 | `action_type: Project` | Children of a Programme (or Initiative) |
| 4 | `action_type: Task` | Leaf nodes within a Project |

The `action_type` value labels the **semantic scale**; the `parent` field carries the structural edge. Both are optional on any element — an action without `action_type` is displayed at its inferred level (derived from the `parent` chain depth); an action without `parent` is treated as a root (level 1 if `action_type: Initiative`, otherwise an orphan — see §8).

Mixed-depth trees are valid: an Initiative may have direct Project children (no Programme layer), or a Programme may contain Tasks directly.

**Relationship to other Actions views:**

| Need | View |
|---|---|
| Strategic portfolio overview — what Initiatives exist, how they decompose | **Actions tree** (`*.actions-tree.transitrix.yaml`) |
| Schedule — action dependencies, critical path, network diagram | Action schedule (`*.action.transitrix.yaml`) |
| Timeline — Gantt chart with durations and dates | Action schedule with Gantt rendering |
| Single-project narrative — goals served, milestones, gate decisions | Action Card (`*.action-card.transitrix.yaml`) |

The Actions tree reads from the elements catalogue; the Action schedule is a standalone plan document with its own inline action entries. The two views are complementary — the tree gives the strategic overview, the schedule gives the delivery plan for one project.

**Why a separate notation rather than a tab inside the Action preview.** Transitrix Studio does offer a **Tree** tab when viewing an `action` file — that shows the WBS of the *current file's* actions. The `actions-tree` notation is different in scope: it draws from the **full ACTION catalogue** across all initiatives, applies cross-cutting filters (`scope.goals`, `scope.action_type`, `scope.root_action`), and is a saved, version-controlled configuration — a governance artefact, not a display preference. A CPO reviewing all programmes across the portfolio uses `actions-tree`; a PM navigating their own project plan uses the tree tab inside `action`.

---

## 2. When to use

| Use case | Notation |
|---|---|
| Show all Initiatives and how they decompose into Programmes, Projects, Tasks | Actions tree |
| Navigate the portfolio — which projects belong to which Initiative | Actions tree |
| Filter portfolio to a specific strategic goal | Actions tree with `view_config.scope.goals` |
| Plan delivery — durations, dependencies, critical path | Action schedule (`*.action.transitrix.yaml`) |
| Show a project's strategic context (goals, changes, milestones) | Action Card (`*.action-card.transitrix.yaml`) |
| Show how goals decompose hierarchically | Goals tree (`*.goals.transitrix.yaml`) |

---

## 3. File location and naming

```
organizations/<org>/views/actions-tree/<NAME>.actions-tree.transitrix.yaml
```

Examples:
- `organizations/acme_corp/views/actions-tree/portfolio-2026.actions-tree.transitrix.yaml`
- `organizations/acme_corp/views/actions-tree/platform-stream.actions-tree.transitrix.yaml`

---

## 4. Document structure

```yaml
notation: actions-tree
spec_version: "0.1"

id: ATREE-PORTFOLIO-2026-1
name: "Strategic Portfolio 2026"
generated_at: "2026-06-25"
description: "Full initiative hierarchy for the 2026 strategic plan."
period: "2026"

view_config:
  scope:
    root: ACTION-PLATFORM-1          # pin any action as the tree root; omit = virtual root
    initiatives: []                  # ACTION-… IDs to include as roots; omit = all roots
    goals: []                        # filter to actions serving these GOAL-… IDs
    valid_at: "2026-06-25"          # show only actions valid at this date; omit = latest
  display:
    collapse_depth: 2                # default expand depth: 1=Initiative, 2=Programme,
                                     # 3=Project, 4=Task (all expanded); omit = 2
    show_dates: true                 # show start_date / end_date per node
    show_owner: true                 # show owner (ACTOR name) per node
    show_action_type_badge: true     # show level badge (Initiative / Programme / etc.)
    show_action_card_link: true      # link Project nodes to their Action Card (if one exists)
    virtual_root_label: ""           # label for level-0 root node; defaults to org name
                                     # from the adopter manifest; set to "" to hide
```

---

## 5. Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `actions-tree` (per [CONTRACT.md](../CONTRACT.md) §3). Deprecated alias: `activities-tree`. |
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
| `root` | no | `ACTION-…` ID of the action to use as the tree root. When set, only that action and its descendants are shown — the rest of the portfolio is hidden. Overrides `initiatives`. Works at any scale level: you can root the tree at an Initiative, a Programme, a Project, or a Task. Omit to show the full portfolio from the virtual root. See §7. |
| `initiatives` | no | list of `ACTION-…` IDs whose subtrees to include. When present and non-empty, only the listed Initiatives and their descendants appear. Ignored when `root` is set. Omit or set to `[]` to include all Initiative-level roots. |
| `goals` | no | list of `GOAL-…` IDs. When present and non-empty, only actions with a matching entry in `goals[]` (inline) or a `REL` of `type: action_goal` pointing to one of the listed goals are included, along with their ancestors up to the root (to preserve tree shape). |
| `valid_at` | no | quoted ISO 8601 date. Renderer includes only actions whose `valid_from ≤ valid_at` and (`valid_to` is null or `valid_to ≥ valid_at`). Omit to include all elements regardless of lifecycle dates. |

### 5.2 `view_config.display`

Display options control what is shown per node and at what default collapse depth.

| Field | Required | Default | Description |
|---|---|---|---|
| `collapse_depth` | no | `2` | Depth to expand by default: `1` = Initiative only; `2` = Initiative + Programme; `3` = + Project; `4` = all (including Tasks). Users can expand/collapse individual nodes at runtime. |
| `show_dates` | no | `true` | Show `start_date` / `end_date` on each node. |
| `show_owner` | no | `true` | Show the resolved `ACTOR` name for `owner`. |
| `show_action_type_badge` | no | `true` | Show the `action_type` level badge per node. |
| `show_action_card_link` | no | `true` | For Project-level nodes, show a link to the Action Card document if one references this action (`action_type: Project`). |
| `virtual_root_label` | no | *(org name from manifest)* | Label for the level-0 virtual root node. Set to `""` to suppress the virtual root node entirely (Initiatives become tree roots). |

---

## 6. Node display

Each tree node displays the following fields from the `ACTION` element:

| Field | Shown when | Source |
|---|---|---|
| `name` | always | `ACTION.name` |
| `action_type` badge | `show_action_type_badge: true` | `ACTION.action_type` |
| `start_date` – `end_date` | `show_dates: true` | `ACTION.start_date`, `ACTION.end_date` |
| Owner | `show_owner: true` | resolved `ACTOR.name` from `ACTION.owner` |
| Action Card link | `show_action_card_link: true` and node is Project-level | scan `canon/views/` for an Action Card referencing this `ACTION-…` as its project anchor |
| `description` tooltip | on hover / expand | `ACTION.description` |

The `id` (`ACTION-…`) is available for drill-down navigation but is not shown as a primary label.

---

## 7. Focus mode — rooting the tree at any node

Any action in the tree can become the **root** of the displayed diagram. This works at any scale level — you can focus on a single Initiative, drill into a Programme, or zoom in on one Project and see only its Tasks.

### 7.1 Document-level root (`view_config.scope.root`)

Set `root: ACTION-…` in the document's `view_config.scope` to save a specific action as the persistent root. The renderer shows only that action and its descendants; ancestors and siblings are hidden. Use this to publish a focused view — e.g. a Programme board that shows only one Programme's Projects and Tasks.

When `root` is set:
- `initiatives` is ignored.
- The virtual root (§8) is suppressed — the pinned action is the top-most visible node.
- A **breadcrumb trail** (the pinned node's ancestors up to the virtual root) SHOULD be displayed above the tree as context, even though the ancestors are not part of the tree body.

### 7.2 Runtime focus (interactive)

Renderers SHOULD allow the user to **focus from any node at runtime** without modifying the document:

- **Trigger:** right-click a node → "Focus from here", or a dedicated focus icon on the node.
- **Effect:** the tree re-renders with the selected node as root; its subtree fills the viewport; ancestors and siblings are hidden from the diagram.
- **Navigation:** a **breadcrumb** above the tree shows the path from the virtual root to the focused node (`Company › Initiative › Programme › [focused]`). Each breadcrumb segment is clickable and restores the tree rooted at that ancestor.
- **Scope:** runtime focus is session-local — it does not modify the document's `view_config.scope.root`. To persist a focus, the user explicitly saves the document after setting the focus (which writes `root` into the YAML).

The runtime focus and the document-level `root` use the same rendering logic — they differ only in persistence.

---

## 8. Virtual root — level 0

The organisation's total action is represented by an implicit **virtual root** at level 0. It is not modelled as an `ACTION` element; it is a rendering convention only.

- **Tree view:** rendered as a root node labelled with `virtual_root_label` (defaults to the organisation name from the adopter manifest). All Initiative-level actions (`action_type: Initiative`, or unclassified actions with no `parent`) are direct children.
- **Collapsed view:** if `virtual_root_label: ""`, the virtual root is suppressed and Initiatives appear as top-level nodes.

The virtual root is never exported to YAML and carries no `ACTION-…` ID.

---

## 9. Orphan actions

An action is an **orphan** if it has no `parent` and is not classified as `action_type: Initiative`. Orphans are not placed in the main tree.

Renderers SHOULD expose orphans in a separate **backlog** panel (analogous to the Goals tree backlog, §8.4 in [04-goals.md](04-goals.md)). Dragging a backlog action onto a tree node sets its `parent` in the underlying element file. Orphans are not reachable via focus mode (§7.2) until attached to the tree.

---

## 10. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ATREE-001` | error | `notation` missing or not equal to `actions-tree` (or deprecated alias `activities-tree`). |
| `ATREE-002` | error | `id` missing or not matching `ATREE-[<middle>-]<INTEGER>`. |
| `ATREE-003` | error | `name` missing or empty. |
| `ATREE-004` | warn | `view_config.scope.root` references an `ACTION-…` ID not found in the catalogue. |
| `ATREE-005` | warn | `view_config.scope.initiatives[]` references an `ACTION-…` ID not found in the catalogue. |
| `ATREE-006` | warn | `view_config.scope.goals[]` references a `GOAL-…` ID not found in the catalogue. |
| `ATREE-007` | error | `view_config.display.collapse_depth` is present and not an integer between 1 and 4. |
| `ATREE-008` | warn | Deprecated alias detected: `notation: activities-tree` or file extension `*.activities-tree.transitrix.yaml`. Migrate to `actions-tree` / `*.actions-tree.transitrix.yaml`. |

The shared header rules (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) apply to actions-tree documents.

Actions tree documents do **not** carry an admission record or primitive lifecycle — they are view configuration, not canon primitives.

---

## 11. References

- Action element spec and `action_type` vocabulary: [elements/24-action.md](../elements/24-action.md)
- Action schedule notation (network + Gantt): [07-action.md](07-action.md)
- Action Card notation: [18-action-card.md](18-action-card.md)
- Goals tree (analogous view for goals): [04-goals.md](04-goals.md)
- ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1
- Canon zone and element catalogue: [CONTRACT.md](../CONTRACT.md) §5
- Virtual root concept: [elements/24-action.md](../elements/24-action.md) §1
