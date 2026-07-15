---
notation: "Action — Project Schedule"
version: "2.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-15"
status: "documented"
file_extension: "*.action.transitrix.yaml"
dsm_status: "partially implemented — Actions page; multi-value fields (predecessors, goals, tags) planned in 0.2.5; CPM analysis planned in 0.3.x; Gantt view planned in 0.4.x"
---

# Action Notation — Project Schedule (Network and Timeline)

**Scope:** Text-native form of a project schedule. The view document has two valid authoring forms: inline (`project:` schedule settings and `actions[]` authored directly in the file; default for self-contained documents) and projection (a `view_config` block that selects `ACTION` elements from `canon/elements/05_implementation/actions/`; used after elements are shared across documents). Both forms render as a Project Schedule Network Diagram (PSND / AoN) for the dependency view and as a Gantt chart for the timeline view.
**Renderer:** Transitrix DSM — Actions page (graphical AoN today; Gantt view planned in 0.4.x); Transitrix Studio — preview planned in v0.5.0.

**Deprecated alias.** The former notation key `activities`, file extension `*.activities.transitrix.yaml`, root array field `activities:`, and per-entry field `activity_type` are deprecated as of 2026-06-25. Validators emit `ACT-020` warnings on old names; they remain accepted for backward compatibility until the 2.0 cut.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `action` |
| File extension | `*.action.transitrix.yaml` |
| Deprecated `notation:` alias | `activities` |
| Deprecated file extension alias | `*.activities.transitrix.yaml` |

---

## Source of truth

An Action Schedule document has two valid authoring forms — both use the same YAML field schema:

- **Inline form (default):** `project:` (schedule anchor + calendar) and `actions[]` are authored directly in the view file. The file is self-contained. This is the expected form for a new adopter and for any schedule where elements are not yet shared across documents.
- **Projection form (Full tier — post-promotion):** the file carries only a `view_config` block (scope, schedule anchor, display settings) that selects `ACTION` elements already admitted to `canon/elements/05_implementation/actions/`. No element data is in this file; the renderer reads scheduling fields (`duration`, `predecessors`, `start_date`, `end_date`) from the element files when computing CPM or rendering the Gantt. See [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §4 and [elements/24-action.md](../elements/24-action.md) §2.

The **promotion trigger** is cross-document sharing: an action stays inline until a second document references it; at that point it is promoted to a standalone element file in `canon/elements/05_implementation/actions/` and both documents reference it by ID ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §1). Promotion is optional until it is forced by sharing — do not split elements into per-file form from day one.

The reconstruction invariant applies: `render(Elements, view_config)` → schedule diagram. Deleting `canon/views/action/` loses no model knowledge. See [`CONTRACT.md`](../CONTRACT.md) §14 (view_config contract).

**Where actions are authored.** In the inline form, actions are authored directly in the view file under `actions[]`. In the projection form, new actions are authored as standalone element files in `canon/elements/05_implementation/actions/<ACTION-…>.yaml`, following the canonical element envelope ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §3 and §7.4) and the ACTION schema ([elements/24-action.md](../elements/24-action.md)). The Action Schedule view then projects over them. This is the same pattern as DGCA ([`02-dgca.md`](02-dgca.md)), the Actions Tree ([`23-actions-tree.md`](23-actions-tree.md)), and the Action Card ([`18-action-card.md`](18-action-card.md)).

---

## 1. Overview

An Action Schedule document configures a **schedule rendering** of a scoped set of ACTION elements — those under a root action (e.g. a Project or Programme), or those linked to a specific goal, or the full catalogue filtered by type. The renderer reads the selected elements, resolves the `predecessor` links, and renders two coexisting views:

- **Network view** — Project Schedule Network Diagram in Activity-on-Node (AoN) representation: each action is a node, predecessor relationships are directed edges from predecessor to successor. Always renderable.
- **Gantt view** — horizontal-bar timeline: each action is a bar positioned by computed or pinned dates. Renderable when the schedule is *computable* (durations + predecessors + `view_config.schedule.start_date`) or *pinned* (explicit per-action `start_date`/`end_date` on elements).

The notation captures **what work is planned** (from the ACTION elements), **for what purpose** (from `action.goals` or `action_goal` REL records), **by whom** (from `action.owner`), **at what cost** (from `action.labor_cost` / `action.resources_cost` / `action.effort`), and **delivering which changes** (from `action.delivers_changes`).

---

## 2. When to use this notation

| Need | Use |
|---|---|
| Plan a project as a network of actions with dependencies | Action Schedule — network view |
| Identify critical path and float | Action Schedule — network view, with CPM render mode |
| Place the same project on a calendar timeline | Action Schedule — Gantt view (requires `view_config.schedule.start_date` and `duration` on elements, or pinned per-action dates) |
| Browse the strategic portfolio — all Initiatives, Programmes, Projects as a hierarchy | Actions tree (`*.actions-tree.transitrix.yaml`) |
| Document the procedural flow of a business process | BPMN (`*.bpmn.transitrix.yaml`) |
| Decompose strategic drivers → goals → changes → actions | DGCA (`*.dgca.transitrix.yaml`) |

---

## 3. File location and naming

Action Schedule view documents live in:

```
canon/views/action/<NAME>.action.transitrix.yaml
```

Examples:
- `canon/views/action/platform-launch-2026.action.transitrix.yaml`
- `canon/views/action/gdpr-remediation.action.transitrix.yaml`

---

## 4. Document structure

### Inline form (default — self-contained)

Actions and schedule settings are authored directly in the view file. This is the standard form for a new adopter and for any schedule where elements are not yet shared across documents.

```yaml
notation: action
spec_version: "0.1"

name: "Platform Launch 2026"
description: |
  Critical path through the customer-facing platform launch.
  Used for Q3 2026 portfolio review.

project:
  start_date: "2026-06-01"            # project zero-time for computed Gantt
  calendar:
    working_days: [mon, tue, wed, thu, fri]
    hours_per_day: 8

actions:
  - id: A-001
    name: Requirements analysis
    duration: 5
    goals: [GOAL-CUST-001]
    owner: ACTOR-PRODUCT-1

  - id: A-002
    name: Architecture design
    duration: 8
    predecessors: [A-001]
    goals: [GOAL-CUST-001]
    owner: ACTOR-ENGINEERING-1
```

Complete examples: [`examples/action/platform-launch.action.transitrix.yaml`](../examples/action/platform-launch.action.transitrix.yaml) and [`examples/action/office-relocation.action.transitrix.yaml`](../examples/action/office-relocation.action.transitrix.yaml).

### Projection form (Full tier — post-promotion)

After actions are promoted to `canon/elements/05_implementation/actions/`, the view becomes a `view_config` projection. No element data is in this file; the renderer loads elements at view time.

```yaml
notation: action
spec_version: "0.1"
methodology_version: "2.0.0"          # required from v2.0 onward

id: ACTION_SCHED-PLATFORM-2026-1      # required — ACTION_SCHED-[<middle>-]<INTEGER>
name: "Platform Launch 2026"          # required per CONTRACT.md §1.1
generated_at: "2026-07-06"            # optional per CONTRACT.md §4
description: |
  Critical path through customer-facing platform launch. Used for
  Q3 2026 portfolio review.

view_config:
  scope:
    root_action: ACTION-PLATFORM-LAUNCH-1  # scope to this action and its descendants
    # goals: [GOAL-CUST-001]          # alternative: scope by goal
    # type_filter: [Project, Task]    # alternative: scope by action type
    valid_at: null                     # ISO 8601 date; null = all lifecycle states
  schedule:
    start_date: "2026-06-01"           # project zero-time for computed Gantt
    calendar:                          # optional; defaults: 7-day week, 24-h day, no holidays
      working_days: [mon, tue, wed, thu, fri]
      hours_per_day: 8
      holidays:
        - "2026-07-04"
        - "2026-12-25"
  display:
    view: both                         # network | gantt | both (default: both)
    depth: null                        # integer; null = unlimited depth
    collapsed: []                      # ACTION-… IDs of collapsed nodes at load time
```

---

## 5. Fields

### Document root

| Field | Required | Type | Notes |
|---|---|---|---|
| `notation` | yes | string | MUST equal `action`. Deprecated alias: `activities`. |
| `spec_version` | no | string | reserved, see file header |
| `methodology_version` | yes (from v2.0) | string | methodology release this document conforms to |
| `id` | yes | string | document ID — `ACTION_SCHED-[<middle>-]<INTEGER>` per the canonical grammar |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `description` | no | string | optional document-level description |
| `project` | no | object | **Inline form only.** Schedule anchor and calendar settings at document root. Same semantics as `view_config.schedule` (see §5.2). Contains `start_date` (ISO 8601), and optionally `calendar` with `working_days`, `hours_per_day`, and `holidays`. Mutually exclusive with `view_config`. |
| `actions` | no | array | **Inline form only.** Array of action entries authored directly in the view file. Each entry carries `id`, `name`, and optionally `duration`, `predecessors`, `start_date`, `end_date`, `goals`, `delivers_changes`, `owner`, `tags`, `type`, `parent`, `sort`, `description`, `valid_from`, `valid_to`. Mutually exclusive with `view_config`. Deprecated alias: `activities`. |
| `view_config` | no | object | **Projection form only.** Rendering configuration for Full-tier projection over canonical element files — see §5.1. Mutually exclusive with `actions`. |

### 5.1 `view_config.scope`

Scope fields filter which ACTION elements the renderer includes. All are optional; omitting the `scope` block includes all admitted ACTION elements.

| Field | Required | Type | Notes |
|---|---|---|---|
| `root_action` | no | string | `ACTION-…` ID to scope the schedule to this action and its descendants. Omit to include elements from the full catalogue (or use `goals`/`type_filter` for other scoping). |
| `goals` | no | array of string | `GOAL-…` IDs. When non-empty, only actions linked to these goals (via inline `goals[]` or `action_goal` REL) are included. |
| `type_filter` | no | array of string | `Initiative` \| `Programme` \| `Project` \| `Task`. When non-empty, only actions of the listed types are included. |
| `valid_at` | no | string | Quoted ISO 8601 date. Includes only actions valid at this date. Omit to include all regardless of lifecycle. |

### 5.2 `view_config.schedule`

The `schedule` block anchors the view on a calendar for Gantt rendering. Absent = no Gantt anchor; network view still renders.

| Field | Required | Type | Notes |
|---|---|---|---|
| `schedule.start_date` | no | ISO 8601 date | Project zero-time. CPM offsets (early start / early finish) are projected from this date for the Gantt view. |
| `schedule.calendar` | no | object | Working calendar; without it the renderer assumes a 7-day week. |
| `schedule.calendar.working_days` | no | array of weekday names | Days work happens. Defaults to all seven. |
| `schedule.calendar.hours_per_day` | no | number (> 0) | Working hours per working day; used when `duration` units are hours. Defaults to 8. |
| `schedule.calendar.holidays` | no | array of ISO 8601 dates | Non-working dates that fall on otherwise-working days. |

### 5.3 `view_config.display`

| Field | Required | Default | Notes |
|---|---|---|---|
| `view` | no | `both` | `network` — render only the PSND; `gantt` — render only the timeline; `both` — render both views side-by-side or as tabs. |
| `depth` | no | `null` | Maximum action hierarchy depth to include; `null` = unlimited. |
| `collapsed` | no | `[]` | `ACTION-…` IDs whose subtrees are collapsed at load time. Interactive renderers may allow runtime expand/collapse. |

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ACT-001` | error | `notation` must equal `action` (deprecated alias `activities` accepted with `ACT-020` warning) |
| `ACT-002` | error | `id` missing or does not match `ACTION_SCHED-[<middle>-]<INTEGER>` |
| `ACT-003` | error | `name` missing or empty |
| `ACT-004` | error | `view_config.scope.root_action` set and does not resolve to an admitted `ACTION-…` element |
| `ACT-005` | error | `view_config.scope.goals` contains an ID that does not resolve to an admitted `GOAL-…` element |
| `ACT-006` | error | `view_config.scope.type_filter` contains a value outside `{Initiative, Programme, Project, Task}` |
| `ACT-007` | error | `view_config.schedule.calendar.working_days` values outside `{mon, tue, wed, thu, fri, sat, sun}` or duplicate |
| `ACT-008` | error | `view_config.schedule.calendar.holidays` entries not valid ISO 8601 dates |
| `ACT-009` | warn | `view_config.schedule.start_date` absent and no selected action has pinned dates → Gantt view will not render; the network view still does |
| `ACT-020` | warn | Deprecated alias detected: `notation: activities`, `activities:` root array, or field `activity_type`. Migrate to `action` / `actions:` / `type`. |

Element-level validation (predecessor cycles, duration non-negativity, date consistency, ID grammar) lives in the ACTION element rules applied when the canonical element files are validated; see [elements/24-action.md](../elements/24-action.md) §6.

---

## 7. Network view — render contract

The network view (Project Schedule Network Diagram) is always renderable from the selected ACTION elements and their `predecessors[]`. Timing data on the elements is irrelevant for the network view; an action without a `duration` simply renders without one.

A renderer that consumes this notation for the network view MUST:

- Draw each action as a rectangular node containing at minimum `id`, `name`, and `duration` (if present on the element).
- Draw a directed edge from each `predecessor` to its successor.
- Compute the critical path via forward / backward pass over the network (see §8).
- Highlight critical-path nodes and edges visually distinct from non-critical (Transitrix Studio uses `--ts-brand-orange` for critical, neutral for non-critical).
- Lay out nodes in topological columns (predecessors strictly to the left of successors).

A renderer SHOULD:

- Expose CPM details (ES / EF / LS / LF / slack) on hover or in an optional expanded mode, without crowding the default node display.
- Support a `compact` mode for large networks (truncate names, smaller fonts).
- Surface validation errors and warnings inline.

A renderer MAY:

- Group actions by `parent` (WBS-style) into visual swimlanes or collapsible groups.
- Filter visible actions by `tags`, `goals`, or `scenario`.
- Export the network to image formats (SVG / PNG).

---

## 8. Critical Path Method — computation reference

Renderers compute the critical path via the standard forward / backward pass:

**Forward pass** (compute earliest possible schedule):
- For each activity in topological order:
  - `ES[a] = max(EF[p]) over all predecessors p`, or `0` if no predecessors
  - `EF[a] = ES[a] + duration[a]`

**Backward pass** (compute latest possible schedule without delaying the project):
- Project finish = `max(EF[a]) over all activities a`
- For each activity in reverse topological order:
  - `LF[a] = min(LS[s]) over all successors s`, or project finish if no successors
  - `LS[a] = LF[a] - duration[a]`

**Slack (float):**
- `slack[a] = LS[a] - ES[a]` (equivalently `LF[a] - EF[a]`)

**Critical path:**
- All activities with `slack[a] == 0`. Multiple critical paths are possible.

ES / EF / LS / LF / slack are **not stored** in element files or the view document — they are render-time values.

---

## 9. Gantt view — render contract and renderability

The Gantt view projects the same actions onto a calendar timeline as horizontal bars. The network view and the Gantt view always coexist; they are two projections of the same underlying schedule.

### 9.1 When the Gantt view renders

The Gantt view is renderable in either of two modes:

1. **Computed.** Every leaf action (i.e. non-phase) has a `duration` field, predecessors form a DAG, and `view_config.schedule.start_date` is present. The renderer projects CPM offsets (ES / EF) onto the calendar starting at `start_date`, advancing only on working days per `schedule.calendar` if provided.
2. **Pinned.** Every leaf action has both `start_date` and `end_date` set on its element file. The renderer places bars at the pinned positions.

A document MAY mix both modes: pinned dates on some actions override computed positions for those actions.

When neither mode applies (e.g. no `schedule.start_date` and no pinned dates on elements), the Gantt view does not render. The network view is unaffected. Renderers SHOULD surface a non-blocking notice explaining what is missing.

### 9.2 Bar placement and calendar projection

For a computed Gantt:

- The start of the timeline is `view_config.schedule.start_date` (working-day-aligned per `schedule.calendar.working_days` if present).
- Each action bar starts at `start_date + ES[a]` working units and spans `duration[a]` working units, advancing only on working days and skipping `schedule.calendar.holidays`.
- When `duration` units are hours, the renderer uses `schedule.calendar.hours_per_day` to convert hours into calendar time.
- Without a `schedule.calendar`, the renderer assumes a 7-day week, 24-hour day, no holidays.

For a pinned Gantt:

- Bars use `start_date` and `end_date` from the element file directly. The calendar is irrelevant for bar placement.

### 9.3 Renderer contract for Gantt

A Gantt-capable renderer MUST:

- Draw one horizontal bar per leaf action at its computed or pinned position, labelled with `id` and `name`.
- Draw milestones (`duration: 0` on the element) as point markers, not bars.
- Draw phases (parent actions — actions referenced as `parent` by at least one child) as summary bars spanning from earliest child start to latest child finish, visually distinct from leaf bars.
- Render predecessor relationships as link lines between bars (Finish-to-Start with zero lag).
- Highlight critical-path bars consistently with the network view.
- Render a non-blocking notice when the Gantt cannot draw because timing data is insufficient.

A Gantt-capable renderer SHOULD:

- Show today's date as a vertical "now" line when the project's date range straddles the current date.
- Support a zoom / time-scale control (day / week / month / quarter).
- Expose CPM details (ES / EF / LS / LF / slack) on hover, consistently with the network view.

A Gantt-capable renderer MAY:

- Filter bars by `tags`, `goals`, `scenario`, or `parent` — the same filters the network view exposes.
- Group bars by `parent` into collapsible WBS rows.
- Export the Gantt to image formats (SVG / PNG).

### 9.4 View renderability — summary rule

- **Network view:** always renderable from the selected ACTION elements and their `predecessors[]`.
- **Gantt view:** renderable when the schedule is *computable* (durations on elements + DAG + `view_config.schedule.start_date`) or *pinned* (per-element `start_date` and `end_date`). Both modes MAY coexist within one scoped set.

Both views are projections of the same underlying schedule. A document never "becomes" a network or a Gantt — it is both, with the Gantt simply unrendered when timing data is insufficient.

---

## 10. Example file shape (minimal)

```yaml
notation: action
spec_version: "0.1"
methodology_version: "2.0.0"
id: ACTION_SCHED-MINIMAL-1
name: "Minimal schedule example"           # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                # optional per CONTRACT.md §4

view_config:
  scope:
    root_action: ACTION-PLATFORM-LAUNCH-1  # scope to this project and its children
  schedule:
    start_date: "2026-06-01"
```

The matching ACTION elements live in `canon/elements/05_implementation/actions/`, each as a standalone YAML file.

---

## 11. References

- ACTION element schema: [elements/24-action.md](../elements/24-action.md)
- PMBoK Guide — Project Schedule Network Diagram, Activity-on-Node representation
- Critical Path Method (CPM) — forward / backward pass standard reference
- Henry L. Gantt — Gantt chart conventions (summary bars, milestones, calendar projection) as carried forward by MS Project and Primavera P6
- Transitrix BPMN notation: `notations/01-bpmn.md` (for procedural-flow processes)
- Transitrix DGCA notation: `notations/02-dgca.md` (for Driver → Goal → Change → Action decomposition)
- Transitrix Goals notation: `notations/04-goals.md` (goal elements this notation's actions serve)
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Family selection across DGCA / FGA / Goals / Actions: `notations/README.md` § Family selection
