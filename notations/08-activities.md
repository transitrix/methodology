---
notation: "Activities (PSND / AoN)"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-11"
status: "standard"
file_extension: "*.activities.transitrix.yaml"
dsm_status: "partially implemented — Activities page; multi-value fields (predecessors, goals, tags) planned in 0.2.5; CPM analysis planned in 0.3.x"
---

# Activities Notation — Project Schedule Network Diagram (PSND / AoN)

**Scope:** Text-native form of a Project Schedule Network Diagram in Activity-on-Node (AoN) representation. Each activity is a node carrying its name and duration; dependencies between activities are directed edges. The PMBoK / Primavera / MS Project standard for activity networks.
**Renderer:** Transitrix DSM — Activities page (graphical AoN today; multi-value field reform in progress); Transitrix Studio — preview planned in v0.5.0.

---

## File header

Every `*.activities.transitrix.yaml` file MUST start with the following header:

```yaml
notation: activities    # required; this notation's short name
spec_version: 0.1       # optional today; reserved field; will be required when this notation reaches v1.0
# … rest of the document
```

Validator behaviour:
- Missing `notation` → hard error.
- `notation` value not equal to `activities` → hard error (the file might be the wrong format for this extension).
- File extension not equal to `.activities.transitrix.yaml` while `notation: activities` → hard error (extension/content mismatch).
- `spec_version` accepted but not enforced until this notation hits v1.0.

---

## 1. Overview

An **Activities** document describes a directed acyclic graph (DAG) of activities and the dependencies between them. It is the text-native form of a Project Schedule Network Diagram in Activity-on-Node (AoN) representation: each activity is a node, and predecessor relationships are directed edges from predecessor to successor.

The notation captures **what work is planned** (activities, durations, dependencies), **for what purpose** (goals served), **by whom** (owner / unit / employee), **at what cost** (labor / resources / effort), and **delivering which changes** (BDN linkage). It does **not** track real-time progress against the plan — that is the job of an execution / tracking system.

Critical-path values (early start / early finish / late start / late finish / slack) are **not stored** in the document. They are derived at render time by a forward and backward pass over the network. Renderers MUST compute them and SHOULD highlight the critical path visually.

---

## 2. When to use this notation

| Need | Use |
|---|---|
| Plan a project as a network of activities with dependencies | Activities (PSND / AoN) |
| Identify critical path and float | Activities (PSND / AoN), with CPM render mode |
| Bind activities to strategic goals | Activities (PSND / AoN) — `goals: []` |
| Show what changes activities deliver (BDN linkage) | Activities (PSND / AoN) — `delivers_changes: []` |
| Document the procedural flow of a business process | BPMN (`*.bpmn.transitrix.yaml`) |
| Decompose strategic factors → goals → changes → activities | FGCA (`*.fgca.transitrix.yaml`) |

---

## 3. File location and naming

Stand-alone activity documents live in:

```
organizations/<org>/views/activities/<NAME>.activities.transitrix.yaml
```

Activities defined here MAY reference other elements by ID (goals, changes, scenarios, units, employees, activity types) declared elsewhere in the organisation's repository.

---

## 4. Document structure

```yaml
notation: activities
spec_version: 0.1

title: Platform Launch 2026
description: |
  Critical path through customer-facing platform launch. Used for
  Q3 2026 portfolio review.
version: "0.1"
date: "2026-05-11"
author: "Valerii Korobeinikov"

activities:
  - id: A-001
    name: Requirements analysis
    duration: 5                       # required for CPM; integer or float in time units (see §5.4)
    activity_type: ANTYPE-ANALYSIS    # optional, reference to ActivityType element
    goals: [GOAL-CUST-001]            # optional, array of Goal IDs (an activity can serve multiple goals)
    scenario: SCEN-2026-OPT           # optional, reference to a Scenario element
    parent: A-000                     # optional, hierarchical parent activity (WBS-style)
    predecessors: []                  # optional, array of activity IDs that must complete first
    owner: alice                      # optional, free-text or reference (see §5.6)
    unit: UNIT-PRODUCT                # optional, reference to a Unit element
    employee: EMP-001                 # optional, reference to an Employee element
    score: 5                          # optional, integer — local prioritisation signal
    sort: 10                          # optional, integer — manual display ordering
    tags: [q3-priority, customer]     # optional, array of free-text tags
    start_date: 2026-06-01            # optional, planned start (ISO 8601 date)
    end_date: 2026-06-15              # optional, planned end (ISO 8601 date)
    labor_cost: 5000.00               # optional, decimal — labour cost (currency in metadata or implicit org-default)
    resources_cost: 2000.00           # optional, decimal — non-labour resource cost
    effort: 80                        # optional, decimal — effort in person-hours (or org-defined unit)
    link: https://wiki.example.com/A001  # optional, single URL
    description: |
      Optional multi-line description.
      Anything the team needs to remember about this activity.
    delivers_changes: [CHG-001]       # optional, array of Change IDs this activity contributes to (BDN linkage)

  - id: A-002
    name: Architecture design
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
```

---

## 5. Field reference

### 5.1 Top-level fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `notation` | yes | string | MUST equal `activities` |
| `spec_version` | no | string | reserved, see file header |
| `title` | no | string | document title — surfaces in renderer caption |
| `description` | no | string | optional document-level description |
| `version` | no | string | document version (semantic versioning recommended) |
| `date` | no | ISO 8601 date | document date |
| `author` | no | string | document author |
| `activities` | yes | array | one or more activity entries; see §5.2 |

### 5.2 Per-activity fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | yes | string | unique within the document; follows organisation naming convention (typically `A-NNN`) |
| `name` | yes | string | activity name |
| `duration` | no | number (≥ 0) | duration in time units; see §5.4. Recommended for any activity participating in CPM analysis. |
| `activity_type` | no | string (ID ref) | reference to an ActivityType element |
| `goals` | no | array of string (ID refs) | array of Goal IDs (M:M) — an activity may serve multiple goals |
| `scenario` | no | string (ID ref) | reference to a Scenario element |
| `parent` | no | string (ID ref to activity) | hierarchical parent activity (WBS-style, **single** parent only) |
| `predecessors` | no | array of string (ID refs to activities) | activities that must complete before this one can start |
| `owner` | no | string | free-text owner identifier (see §5.6) |
| `unit` | no | string (ID ref) | reference to a Unit element |
| `employee` | no | string (ID ref) | reference to an Employee element |
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
| `delivers_changes` | no | array of string (ID refs to changes) | Change IDs this activity contributes to (BDN linkage) |

### 5.3 Multi-value fields — explicit

Three fields are **arrays** by design, even where the equivalent fields in current Transitrix DSM are single scalars (DSM migration is tracked separately):

- `goals: []` — an activity can serve multiple goals. Array form is canonical.
- `predecessors: []` — an activity can have multiple predecessors. Array form is required for PSND/AoN.
- `tags: []` — an activity can carry multiple tags. Array form is canonical.

A single-value form (e.g., `goal: GOAL-X`) is **not accepted** and SHOULD be reported by the validator as an error with a suggestion to convert to the array form.

### 5.4 Duration units

`duration` is a unit-less number in the document. The organisation MUST declare its time unit in `CONVENTIONS.md` (`days`, `weeks`, `hours`, etc.). All documents within an organisation use the same unit.

Activities with `start_date` AND `end_date` AND `duration` MUST have `duration` consistent with the date range (validator MAY warn on inconsistency, depending on calendar conventions).

### 5.5 Dependencies — v0.1 simplification

`predecessors: []` carries only IDs. The notation does **not** support typed dependencies (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish) or lag/lead values in v0.1.

All dependencies are interpreted as **Finish-to-Start with zero lag** by renderers and CPM computation. Typed dependencies and lag are reserved for a future version and will be additive (existing documents without these fields will remain valid).

### 5.6 Owner — three optional fields

DSM today exposes three parallel ownership fields, all optional:
- `owner` — free-text label (most permissive)
- `unit` — reference to an organisational unit
- `employee` — reference to a named employee

An activity MAY populate any combination. The free-text `owner` is the default surface; `unit` and `employee` are structured alternatives for organisations that want enforced references.

### 5.7 BDN linkage

`delivers_changes: []` references Changes from BDN (Benefits Dependency Network) — see notation 03-fgca. This is the same M:M relation that exists today in DSM's `activity_change` join. It allows reading an FGCA chain end-to-end from text: a Factor leads to Goals; Goals motivate Changes; Activities deliver Changes.

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ACT-001` | error | `notation` must equal `activities` |
| `ACT-002` | error | every activity must have a non-empty `id` |
| `ACT-003` | error | every activity must have a non-empty `name` |
| `ACT-004` | error | activity IDs must be unique within the document |
| `ACT-005` | error | `predecessors` must reference existing activity IDs (within or outside the document, depending on linker mode) |
| `ACT-006` | error | the dependency graph defined by `predecessors` must be acyclic (no loops) |
| `ACT-007` | error | an activity cannot list itself as a predecessor |
| `ACT-008` | error | `end_date` MUST be ≥ `start_date` if both present |
| `ACT-009` | error | numeric fields (`duration`, `labor_cost`, `resources_cost`, `effort`, `score`, `sort`) must be ≥ 0 (or 0-allowed where semantically valid) |
| `ACT-010` | error | single-value forms `goal: …`, `predecessor: …`, `tag: …` rejected — use the plural array form |
| `ACT-011` | warn | activity with no `duration` cannot participate in CPM analysis; renderer SHOULD highlight it |
| `ACT-012` | warn | activity with `start_date` AND `end_date` AND `duration` whose values are inconsistent |
| `ACT-013` | warn | an activity that is not a predecessor of any other and is not referenced as a goal-supporting activity is structurally orphan |

---

## 7. Render contract

A renderer that consumes this notation MUST:

- Draw each activity as a rectangular node containing at minimum `id`, `name`, and `duration` (if present).
- Draw a directed edge from each `predecessor` to its successor.
- Compute the critical path via forward / backward pass over the network (see §8).
- Highlight critical-path nodes and edges visually distinct from non-critical (Transitrix Studio uses `--ts-brand-orange` for critical, neutral for non-critical).
- Lay out nodes in topological columns (predecessors strictly to the left of successors).

A renderer SHOULD:

- Expose CPM details (ES / EF / LS / LF / slack) on hover or in an optional expanded mode, without crowding the default node display.
- Support a `compact` mode for large networks (truncate names, smaller fonts).
- Surface validation errors and warnings inline.

A renderer MAY:

- Group activities by `parent` (WBS-style) into visual swimlanes or collapsible groups.
- Filter visible activities by `tags`, `goals`, or `scenario`.
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

## 9. Example file shape (minimal)

```yaml
notation: activities
title: Minimal example
activities:
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

## 10. References

- PMBoK Guide — Project Schedule Network Diagram, Activity-on-Node representation
- Critical Path Method (CPM) — forward / backward pass standard reference
- Transitrix BPMN notation: `notations/02-bpmn.md` (for procedural-flow processes)
- Transitrix FGCA notation: `notations/03-fgca.md` (for Factor → Goal → Change → Activity decomposition; this notation's `delivers_changes` field links into FGCA)
- Transitrix Goals notation: `notations/05-goals.md` (this notation's `goals` field references Goal IDs)
