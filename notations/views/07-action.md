---
notation: "Action — Project Schedule"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-06-25"
status: "documented"
file_extension: "*.action.transitrix.yaml"
dsm_status: "partially implemented — Actions page; multi-value fields (predecessors, goals, tags) planned in 0.2.5; CPM analysis planned in 0.3.x; Gantt view planned in 0.4.x"
---

# Action Notation — Project Schedule (Network and Timeline)

**Scope:** Text-native form of a project schedule. Actions are nodes carrying optional duration, dependencies, and dates; the same document renders as a Project Schedule Network Diagram (PSND / AoN) for the dependency view and as a Gantt chart for the timeline view. The two views are projections of one schedule, in the MS Project / Primavera tradition. All timing data is optional: a document without dates renders only as a network; with sufficient timing data, it also renders as a Gantt.
**Renderer:** Transitrix DSM — Actions page (graphical AoN today; Gantt view planned in 0.4.x); Transitrix Studio — preview planned in v0.5.0.

**Deprecated alias.** The former notation key `activities`, file extension `*.activities.transitrix.yaml`, root array field `activities:`, and per-entry field `activity_type` are deprecated as of 2026-06-25. Validators emit `ACT-020` warnings on old names; they remain accepted for backward compatibility until the 1.0 cut.

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

## Element lifecycle

Every inline element this notation defines — entries in `actions[]` — carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../CONTRACT.md) §7.1, the lifecycle sits on each inline element entry; the action document itself does not carry a lifecycle field. Per-action scheduling fields (`start_date`, `end_date`) describe *when work is planned to happen*, distinct from `valid_from`/`valid_to` which describe *when the action element itself is considered in effect*; both coexist.

---

## Time-aware relations

An action's **`goals: [GOAL-…]`** cross-reference — the goals an action serves — is declared **time-aware** per the temporal model. An action re-aimed mid-stream (a build action originally serving GOAL-A pivoted to serve GOAL-B as priorities shift) is a temporal event that loses information when inlined. The canonical home for an Action → Goal link is a `REL-…` file under `canon/relations/` with `type: action_goal` (see [17-relations.md](../elements/17-relations.md) §3).

**Inline `goals: [GOAL-…]` — v0.x transitional.** The inline `goals` array on action entries (§5.2 Per-action fields) stays available for authoring convenience while the relation files coexist for history; the renderer prefers REL files when both are present. `REL-004` will begin firing on inline `goals` once an adopter's validator is configured to enforce post-migration. Adopters extracting links to REL files use `valid_from = action.valid_from` as a sensible epoch for the initial relation.

**`predecessors: [ACTION-…]` stays timeless.** The predecessor DAG within a project plan is a structural property of the plan as a whole, not a temporal event — re-jiggering predecessors mid-stream is a new plan version, not a re-aiming of a single relation. `predecessors` is **not** declared time-aware; it stays inline.

**`delivers_changes: [CHANGE-…]`** (BDN linkage) stays inline in v1 (timeless within the activity's lifecycle).

---

## 1. Overview

An **Action** document describes a directed acyclic graph (DAG) of actions and the dependencies between them, optionally placed in calendar time. It is the text-native form of a project schedule with two coexisting renderings:

- **Network view** — Project Schedule Network Diagram in Activity-on-Node (AoN) representation: each action is a node, predecessor relationships are directed edges from predecessor to successor. Always renderable from `actions[]` + `predecessors[]`.
- **Gantt view** — horizontal-bar timeline: each action is a bar positioned by computed or pinned dates. Renderable when the schedule is *computable* (durations + predecessors + a project `start_date`) or *pinned* (explicit per-action dates).

The notation captures **what work is planned** (actions, durations, dependencies), **for what purpose** (goals served), **by whom** (owner — an `ACTOR`), **at what cost** (labor / resources / effort), and **delivering which changes** (BDN linkage). It does **not** track real-time progress against the plan — no `progress` / `% complete` field is part of this notation. Execution tracking is the job of an execution system.

Critical-path values (early start / early finish / late start / late finish / slack) and computed Gantt dates are **not stored** in the document. They are derived at render time by a forward and backward pass over the network (CPM) and by projecting CPM offsets onto the working calendar (Gantt). Renderers MUST compute them and SHOULD highlight the critical path visually.

**Practical usage note.** In production schedules every action typically carries `duration` and `predecessors[]`, and the project carries `start_date`; together they make the Gantt computable. Timing data is marked optional in the schema because a nascent plan may not have it yet — but the expected steady-state is a fully-scheduled network. The hierarchy (`parent:`) and the dependency DAG (`predecessors[]`) coexist: `parent` groups actions into phases/work-packages for WBS rollup, `predecessors` drives the critical-path calculation.

**Tree rendering in Studio.** When an `action` file is open in Transitrix Studio, the preview panel offers a **Tree** tab alongside Network and Gantt. That tab shows the same actions in a parent-child tree without timing or dependency arrows — useful for navigating the WBS of the current project. This is a Studio display mode, not a separate notation. For a portfolio-level tree across all initiatives, use `actions-tree` (see §2).

---

## 2. When to use this notation

| Need | Use |
|---|---|
| Plan a project as a network of actions with dependencies | Action — network view |
| Identify critical path and float | Action — network view, with CPM render mode |
| Place the same project on a calendar timeline | Action — Gantt view (requires `project.start_date` and durations, or pinned per-action dates) |
| Mark a deliverable date with no work attached | Action — milestone (zero-duration action) |
| Group actions into phases / summary bars | Action — parent actions (WBS-style via `parent`) |
| Bind actions to strategic goals | Action — `goals: []` |
| Show what changes actions deliver (BDN linkage) | Action — `delivers_changes: []` |
| Document the procedural flow of a business process | BPMN (`*.bpmn.transitrix.yaml`) |
| Decompose strategic drivers → goals → changes → actions | DGCA (`*.dgca.transitrix.yaml`) |
| Browse the strategic portfolio — all Initiatives, Programmes, Projects as a hierarchy | Actions tree (`*.actions-tree.transitrix.yaml`) |

---

## 3. File location and naming

Stand-alone action documents live in:

```
organizations/<org>/views/actions/<NAME>.action.transitrix.yaml
```

Actions defined here MAY reference other elements by ID (goals, changes, scenarios, actors, action types) declared elsewhere in the organisation's repository.

---

## 4. Document structure

```yaml
notation: action
spec_version: "0.1"
name: "Platform Launch 2026"            # required per CONTRACT.md §1.1
generated_at: "2026-05-11"             # optional per CONTRACT.md §4

title: Platform Launch 2026
description: |
  Critical path through customer-facing platform launch. Used for
  Q3 2026 portfolio review.
version: "0.1"
author: "Valerii Korobeinikov"

project:                              # optional; enables Gantt rendering
  start_date: "2026-06-01"            # optional; project zero-time for computed Gantt
  calendar:                           # optional; working calendar (see §5.8)
    working_days: [mon, tue, wed, thu, fri]
    hours_per_day: 8
    holidays:
      - "2026-07-04"
      - "2026-12-25"

actions:
  - id: PHASE-DESIGN
    name: Design phase
    # parent (summary) action — see §5.10. No duration of its own; dates roll up from children.

  - id: A-001
    name: Requirements analysis
    parent: PHASE-DESIGN              # optional; WBS-style parent
    duration: 5                       # optional; integer or float in time units (see §5.4). Required for CPM; recommended for Gantt.
    type: Project                      # optional — Initiative | Programme | Project | Task
    goals: [GOAL-CUST-001]            # optional, array of Goal IDs (an action can serve multiple goals)
    scenario: SCEN-2026-OPT           # optional, reference to a Scenario element
    parent: A-000                     # optional, hierarchical parent action (WBS-style)
    predecessors: []                  # optional, array of action IDs that must complete first
    owner: ACTOR-PRODUCT-TEAM-1       # optional, reference to the accountable ACTOR (see §5.6)
    score: 5                          # optional, integer — local prioritisation signal
    sort: 10                          # optional, integer — manual display ordering
    tags: [q3-priority, customer]     # optional, array of free-text tags
    start_date: "2026-06-01"          # optional, planned start (ISO 8601 date)
    end_date: "2026-06-15"            # optional, planned end (ISO 8601 date)
    labor_cost: 5000.00               # optional, decimal — labour cost (currency in metadata or implicit org-default)
    resources_cost: 2000.00           # optional, decimal — non-labour resource cost
    effort: 80                        # optional, decimal — effort in person-hours (or org-defined unit)
    link: https://wiki.example.com/A001  # optional, single URL
    description: |
      Optional multi-line description.
      Anything the team needs to remember about this action.
    delivers_changes: [CHG-001]       # optional, array of Change IDs this action contributes to (BDN linkage)

  - id: A-002
    name: Architecture design
    parent: PHASE-DESIGN
    duration: 8
    predecessors: [A-001]
    goals: [GOAL-CUST-001, GOAL-PLATFORM-002]

  - id: A-003
    name: Backend implementation
    duration: 15
    predecessors: [A-002]
    goals: [GOAL-PLATFORM-002]

  - id: A-004
    name: Frontend implementation
    duration: 12
    predecessors: [A-002]
    goals: [GOAL-CUST-001]

  - id: A-005
    name: Integration testing
    duration: 7
    predecessors: [A-003, A-004]      # successor of both backend and frontend
    goals: [GOAL-CUST-001, GOAL-PLATFORM-002]

  - id: M-LAUNCH
    name: Public launch
    duration: 0                       # zero-duration → milestone (see §5.9)
    predecessors: [A-005]
```

---

## 5. Field reference

### 5.1 Top-level fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `notation` | yes | string | MUST equal `action`. Deprecated alias: `activities`. |
| `spec_version` | no | string | reserved, see file header |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `title` | no | string | document title — surfaces in renderer caption |
| `description` | no | string | optional document-level description |
| `version` | no | string | document version (semantic versioning recommended) |
| `author` | no | string | document author |
| `project` | no | object | optional schedule anchor for Gantt rendering — `start_date` and `calendar`; see §5.8 |
| `actions` | yes | array | one or more action entries; see §5.2. Deprecated alias: `activities`. |

### 5.2 Per-action fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | yes | string | unique within the document; follows organisation naming convention (typically `A-NNN`) |
| `name` | yes | string | action name |
| `duration` | no | number (≥ 0) | duration in time units; see §5.4. Required for CPM analysis and recommended for Gantt rendering. `0` is the milestone marker — see §5.9. |
| `type` | no | string | scale level — one of `Initiative`, `Programme`, `Project`, `Task` (`Strategic Initiative` accepted as alias for `Initiative`); see [elements/24-action.md](../elements/24-action.md) §1. Deprecated alias: `activity_type`. |
| `goals` | no | array of string (ID refs) | array of Goal IDs (M:M) — an action may serve multiple goals |
| `scenario` | no | string (ID ref) | reference to a Scenario element |
| `parent` | no | string (ID ref to action) | hierarchical parent action (WBS-style, **single** parent only) |
| `predecessors` | no | array of string (ID refs to actions) | actions that must complete before this one can start |
| `owner` | no | string (ID ref) | reference to the accountable `ACTOR-…` (`person` / `business_unit` / `system`); see §5.6 |
| `owner_role` | no | string (ID ref) | reference to the accountable `ROLE-…` (positional accountability); see §5.6 |
| `stakeholders` | no | array of string (ID refs) | `STAKEHOLDER-…` IDs whose interests are at stake in this action; see §5.11 |
| `score` | no | integer | local prioritisation signal |
| `sort` | no | integer | manual display ordering |
| `tags` | no | array of string | free-text tags (M:M) |
| `start_date` | no | ISO 8601 date | planned start |
| `end_date` | no | ISO 8601 date | planned end (MUST be ≥ `start_date` if both present) |
| `labor_cost` | no | decimal (≥ 0) | labour cost |
| `resources_cost` | no | decimal (≥ 0) | non-labour resource cost |
| `effort` | no | decimal (≥ 0) | effort estimate (typically person-hours) |
| `link` | no | URL string | single related URL |
| `description` | no | string (multi-line) | free-text description |
| `delivers_changes` | no | array of string (ID refs to changes) | Change IDs this action contributes to (BDN linkage) |

### 5.3 Multi-value fields — explicit

Four fields are **arrays** by design, even where the equivalent fields in current Transitrix DSM are single scalars (DSM migration is tracked separately):

- `goals: []` — an action can serve multiple goals. Array form is canonical.
- `predecessors: []` — an action can have multiple predecessors. Array form is required for PSND/AoN.
- `tags: []` — an action can carry multiple tags. Array form is canonical.
- `stakeholders: []` — an action can have multiple stakeholders. Array form is canonical (see §5.11).

A single-value form (e.g., `goal: GOAL-X`) is **not accepted** and SHOULD be reported by the validator as an error with a suggestion to convert to the array form.

### 5.4 Duration units

`duration` is a unit-less number in the document. The organisation MUST declare its time unit in `CONVENTIONS.md` (`days`, `weeks`, `hours`, etc.). All documents within an organisation use the same unit.

Activities with `start_date` AND `end_date` AND `duration` MUST have `duration` consistent with the date range (validator MAY warn on inconsistency, depending on calendar conventions).

### 5.5 Dependencies — v0.1 simplification

`predecessors: []` carries only IDs. The notation does **not** support typed dependencies (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish) or lag/lead values in v0.1.

All dependencies are interpreted as **Finish-to-Start with zero lag** by renderers and CPM computation. Typed dependencies and lag are reserved for a future version and will be additive (existing documents without these fields will remain valid).

### 5.6 Owner fields — Actor and Role

Two complementary fields express different dimensions of ownership:

- **`owner: ACTOR-…`** — *who performs the work* (an identity). Optional reference to the `ACTOR` responsible for the action — `ACTOR-…` of `type` `person`, `business_unit`, or `system` (see [elements/19-actors.md](../elements/19-actors.md)). This collapses the three parallel ownership fields DSM historically exposed (`owner` free-text, `unit` → org unit, `employee` → named employee) into one typed reference, per the 2026-05-29 Actors decision. Legacy free-text `owner` values migrate to an `ACTOR(type: person)` (or `system`) record; the `unit` / `employee` fields are removed (mapping in the `0.5 → 0.6` migration recipe).
- **`owner_role: ROLE-…`** — *who is accountable* (a position). Optional reference to the `ROLE` that carries positional accountability for the action. Distinct from `owner`: an `ACTOR` is an identity; a `ROLE` is a position. Both are optional and independent — an action may carry either, both, or neither. Uses the shared envelope field defined in [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3.

### 5.7 BDN linkage

`delivers_changes: []` references Changes from BDN (Benefits Dependency Network) — see notation 03-fgca. This is the same M:M relation that exists today in DSM's `action_change` join. It allows reading an FGCA chain end-to-end from text: a Driver leads to Goals; Goals motivate Changes; Actions deliver Changes.

### 5.8 Project block — `start_date` and `calendar`

The optional `project:` block anchors the schedule on a calendar for Gantt rendering. Both child fields are optional; an absent block means no Gantt anchor (the document still renders as a network).

```yaml
project:
  start_date: "2026-06-01"            # optional; project zero-time
  calendar:                           # optional; defaults: 7-day week, 24-h day, no holidays
    working_days: [mon, tue, wed, thu, fri]
    hours_per_day: 8
    holidays:
      - "2026-07-04"
```

| Field | Required | Type | Notes |
|---|---|---|---|
| `project.start_date` | no | ISO 8601 date | project zero-time. CPM offsets (early start / early finish) are projected from this date when rendering the Gantt view. |
| `project.calendar` | no | object | working calendar; without it the renderer assumes a 7-day week. |
| `project.calendar.working_days` | no | array of weekday names (`mon`–`sun`) | days the work happens. Defaults to all seven. |
| `project.calendar.hours_per_day` | no | number (> 0) | working hours per working day; used only when `duration` units are hours. Defaults to 8 when applicable. |
| `project.calendar.holidays` | no | array of ISO 8601 dates | non-working dates that fall on otherwise-working days. |

The project block does **not** define the duration unit — that lives in `CONVENTIONS.md` per §5.4. The calendar describes when work happens, not how `duration` is measured.

### 5.9 Schedule milestones — zero-duration actions

A **schedule milestone** is an action with `duration: 0`. It marks a deliverable, gate, or significant date on the project's timeline with no work attached. No new entity is introduced *for scheduling*; schedule milestones are first-class actions that happen to be instantaneous.

```yaml
- id: M-LAUNCH
  name: Public launch
  duration: 0
  predecessors: [A-005]
```

Renderer behaviour:
- Network view: schedule milestones render as diamonds (or a distinct shape) rather than rectangles.
- Gantt view: schedule milestones render as a point marker (typically a diamond on the timeline) rather than a bar.
- CPM: schedule milestones participate normally — `EF == ES`, slack and critical-path membership follow the standard rules.

Schedule milestones MAY have `start_date` / `end_date` pinned; if both are present they MUST be equal (validator MAY enforce — see §6).

**Distinct from action-card milestones.** The Action Card notation ([18-action-card.md](18-action-card.md)) introduces a separate `MILESTONE` element type for **project-narrative** milestones — decision gates, certification dates, programme-level markers that belong in the card's narrative but are not part of the schedule's critical-path computation. The two coexist: a `MILESTONE-…` element in an action card may *also* reference a zero-duration action here when the same date appears on both the card and the schedule. Use a schedule milestone (zero-duration action, this section) for timeline computation; use an action-card milestone ([18-action-card.md](18-action-card.md) §3) for narrative gates.

### 5.10 Phases / summary actions — `parent`

A **phase** (also called a summary action in MS Project terminology) groups child actions under one heading. It is an action that other actions reference via `parent: <PHASE-ID>`. The phase itself MAY omit `duration`, `predecessors`, and dates — those values are derived from its children at render time (earliest start of any child, latest finish of any child).

```yaml
- id: PHASE-DESIGN
  name: Design phase
  # no own duration / dates — rolled up from children

- id: A-001
  name: Requirements analysis
  parent: PHASE-DESIGN
  duration: 5

- id: A-002
  name: Architecture design
  parent: PHASE-DESIGN
  duration: 8
  predecessors: [A-001]
```

Renderer behaviour:
- Network view: phases MAY render as collapsible groups or visual containers around their children (see §7 render contract for details).
- Gantt view: phases render as a summary bar spanning from earliest child start to latest child finish, visually distinct from leaf bars.
- The `parent` relation is **single-valued** (an action has at most one parent), aligning with WBS conventions.

A phase with no children is structurally orphan (validator MAY warn).

### 5.11 Stakeholders

`stakeholders: []` is an optional array of `STAKEHOLDER-…` IDs whose interests are at stake in this action. Each `STAKEHOLDER` element is a first-class canonical primitive (see [elements/20-stakeholders.md](../elements/20-stakeholders.md)) that carries its concern, interest, and influence profile, plus an `ACTOR` reference for identity. Using `STAKEHOLDER-…` IDs (rather than inline `ACTOR-…` or `ROLE-…` IDs) keeps the stake profile in one place — the `STAKEHOLDER` catalogue — and allows a single stakeholder to appear across multiple actions without repeating the profile.

Array form is canonical (`stakeholders: [STAKEHOLDER-X, STAKEHOLDER-Y]`). An empty array is equivalent to omission.

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ACT-001` | error | `notation` must equal `action` (deprecated alias `activities` accepted with `ACT-020` warning) |
| `ACT-002` | error | every action must have a non-empty `id` |
| `ACT-003` | error | every action must have a non-empty `name` |
| `ACT-004` | error | action IDs must be unique within the document |
| `ACT-005` | error | `predecessors` must reference existing action IDs (within or outside the document, depending on linker mode) |
| `ACT-006` | error | the dependency graph defined by `predecessors` must be acyclic (no loops) |
| `ACT-007` | error | an action cannot list itself as a predecessor |
| `ACT-008` | error | `end_date` MUST be ≥ `start_date` if both present |
| `ACT-009` | error | numeric fields (`duration`, `labor_cost`, `resources_cost`, `effort`, `score`, `sort`) must be ≥ 0 (or 0-allowed where semantically valid) |
| `ACT-010` | error | single-value forms `goal: …`, `predecessor: …`, `tag: …` rejected — use the plural array form |
| `ACT-011` | warn | action with no `duration` cannot participate in CPM analysis; renderer SHOULD highlight it |
| `ACT-012` | warn | action with `start_date` AND `end_date` AND `duration` whose values are inconsistent |
| `ACT-013` | warn | an action that is not a predecessor of any other and is not referenced as a goal-supporting action is structurally orphan |
| `ACT-014` | error | `project.calendar.working_days` values must be from the set `{mon, tue, wed, thu, fri, sat, sun}` (case-insensitive) and unique |
| `ACT-015` | error | `project.calendar.holidays` entries must be valid ISO 8601 dates |
| `ACT-016` | error | a milestone (`duration: 0`) with both `start_date` and `end_date` MUST have `start_date == end_date` |
| `ACT-017` | warn | a phase (an action referenced as `parent` by at least one child) SHOULD omit its own `duration` and dates — those values roll up from children |
| `ACT-018` | warn | a phase with no children is structurally orphan |
| `ACT-019` | warn | `project.start_date` absent AND no action has pinned dates → Gantt view will not render; the network view still does |
| `ACT-020` | warn | Deprecated alias detected: `notation: activities`, `activities:` root array, or field `activity_type`. Migrate to `action` / `actions:` / `type`. |

---

## 7. Network view — render contract

The network view (Project Schedule Network Diagram) is always renderable from `actions[]` and their `predecessors[]`. Timing data is irrelevant for the network view; an action without a `duration` simply renders without one.

A renderer that consumes this notation for the network view MUST:

- Draw each action as a rectangular node containing at minimum `id`, `name`, and `duration` (if present).
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

ES / EF / LS / LF / slack are **not stored** in the document — they are render-time values.

---

## 9. Gantt view — render contract and renderability

The Gantt view projects the same activities onto a calendar timeline as horizontal bars. The network view and the Gantt view always coexist; they are two projections of one schedule. What varies between documents is whether the Gantt view has enough data to draw.

### 9.1 When the Gantt view renders

The Gantt view is renderable in either of two modes:

1. **Computed.** Every leaf activity (i.e. non-phase) has a `duration`, predecessors form a DAG, and `project.start_date` is present. The renderer projects CPM offsets (ES / EF) onto the calendar starting at `project.start_date`, advancing only on working days per `project.calendar` if provided. This is the typical mode.
2. **Pinned.** Every leaf activity has both `start_date` and `end_date` filled in. The renderer places bars at the pinned positions and ignores CPM offsets. Useful for plans imported from external scheduling tools or for fixed-date commitments.

A document MAY mix both modes: pinned dates on some activities override computed positions for those activities. Where both are present and consistent, the computed view and the pinned view agree (validator MAY check — `ACT-012`).

When neither mode applies (e.g. no `project.start_date` and no pinned dates), the Gantt view does not render. The network view is unaffected. Renderers SHOULD surface a non-blocking notice explaining what is missing.

### 9.2 Bar placement and calendar projection

For a computed Gantt:

- The start of the timeline is `project.start_date` (working-day-aligned per `project.calendar.working_days` if present).
- Each activity bar starts at `project.start_date + ES[a]` working units and spans `duration[a]` working units, advancing only on working days and skipping `project.calendar.holidays`.
- When `duration` units are hours, the renderer uses `project.calendar.hours_per_day` to convert hours into calendar time.
- Without a `project.calendar`, the renderer assumes a 7-day week, 24-hour day, no holidays.

For a pinned Gantt:

- Bars use `start_date` and `end_date` directly. The calendar is irrelevant for bar placement (it MAY still be drawn as a visual reference).

### 9.3 Renderer contract for Gantt

A Gantt-capable renderer MUST:

- Draw one horizontal bar per leaf activity at its computed or pinned position, labelled with `id` and `name`.
- Draw milestones (`duration: 0`) as point markers, not bars (see §5.9).
- Draw phases (parent activities — see §5.10) as summary bars spanning from earliest child start to latest child finish, visually distinct from leaf bars.
- Render predecessor relationships as link lines between bars (Finish-to-Start with zero lag per §5.5).
- Highlight critical-path bars consistently with the network view (Transitrix Studio uses `--ts-brand-orange` for critical, neutral for non-critical).
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

- **Network view:** always renderable from `activities[]` + `predecessors[]`.
- **Gantt view:** renderable when the schedule is *computable* (durations + DAG + `project.start_date`) or *pinned* (per-activity `start_date` and `end_date`). Both modes MAY coexist within one document.

Both views are projections of the same underlying schedule. A document never "becomes" a network or a Gantt — it is both, with the Gantt simply unrendered when timing data is insufficient.

---

## 10. Example file shape (minimal)

```yaml
notation: action
spec_version: "0.1"
name: "Minimal example"                 # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4
title: Minimal example
actions:
  - id: A
    name: Start
    duration: 3
  - id: B
    name: Middle
    duration: 5
    predecessors: [A]
  - id: C
    name: End
    duration: 2
    predecessors: [B]
```

---

## 11. References

- PMBoK Guide — Project Schedule Network Diagram, Activity-on-Node representation
- Critical Path Method (CPM) — forward / backward pass standard reference
- Henry L. Gantt — Gantt chart conventions (summary bars, milestones, calendar projection) as carried forward by MS Project and Primavera P6
- Transitrix BPMN notation: `notations/01-bpmn.md` (for procedural-flow processes)
- Transitrix FGCA notation: `notations/02-fgca.md` (for Driver → Goal → Change → Action decomposition; this notation's `delivers_changes` field links into FGCA)
- Transitrix Goals notation: `notations/04-goals.md` (this notation's `goals` field references Goal IDs)
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Family selection across FGCA / FGA / Goals / Actions: `notations/README.md` § Family selection
