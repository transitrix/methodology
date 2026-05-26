# Activity network diagram (AoN / PSND) and Gantt projection

Activity-on-Node precedence diagram showing activities, durations, dependencies, and the computed critical path. Activities also project to a Gantt timeline when the schedule is anchored on a calendar — see §9 of the [Activities spec](../../07-activities.md).

The critical path is highlighted automatically in both views.

**File extension:** `*.activities.transitrix.yaml`

## Minimal structure

```yaml
notation: activities
spec_version: "0.1"

activities:
  - id: A-001
    name: "Requirements analysis"
    duration: 5                # duration in any consistent unit (days, weeks, sprints)

  - id: A-002
    name: "Architecture design"
    duration: 8
    predecessors: [A-001]      # IDs of activities that must finish before this one starts

  - id: A-003
    name: "Implementation"
    duration: 15
    predecessors: [A-002]
```

## Optional header fields

```yaml
title: "My Project"
description: "Short description"
version: "0.1"
date: "2026-05-12"
author: "Your Name"
```

## Optional fields per activity

| Field | Type | Description |
|---|---|---|
| `sort` | integer | Display order hint |
| `description` | string | Free-text note |
| `goals` | string[] | Goal IDs this activity contributes to |
| `tags` | string[] | Labels for grouping or highlighting |
| `unit` | string | Organisational unit responsible |
| `delivers_changes` | string[] | Change IDs delivered by this activity |

## Rules

- Activity IDs must be unique strings within the file (e.g. `A-001`, `TASK-5`).
- Activities without `predecessors` are treated as start nodes.
- Multiple predecessors create a merge point (all must finish before the activity starts).
- The critical path is computed automatically using the PMBoK forward/backward pass (ES, EF, LS, LF, float).
- Duration unit is not enforced — use the same unit consistently throughout the file.

## Gantt projection — when it renders

A document renders as a Gantt chart when **either** (per [07-activities.md §9](../../07-activities.md)):

- **Computed mode** — every leaf activity has a `duration`, predecessors form a DAG, and a top-level `project.start_date` is present (an optional `project.calendar` controls working-day projection). CPM offsets project onto the calendar.
- **Pinned mode** — every leaf activity carries both `start_date` and `end_date`.

Without one of these, the network view still renders but the Gantt view is skipped.

```yaml
project:
  start_date: 2026-06-01
  calendar:
    working_days: [mon, tue, wed, thu, fri]
    hours_per_day: 8
    holidays:
      - "2026-07-04"
```

`parent:` groups activities into phases (WBS summary bars); `duration: 0` marks a milestone (point on the timeline, not a bar). Both are spec features; the `office-relocation` example below uses them.

## Examples in this folder

| File | Description |
|---|---|
| `platform-launch.activities.transitrix.yaml` | 10-activity platform launch; two parallel paths merge at integration testing; 3-activity critical path tail. Network view only — no `project:` block, so the Gantt view does not render. |
| `office-relocation.activities.transitrix.yaml` | 16-activity HQ relocation across three phases (`PHASE-PLANNING`, `PHASE-FITOUT`, `PHASE-MOVE`) with two milestones (`M-LEASE-SIGNED`, `M-OPEN-DAY`) and a `project.start_date` + working-day calendar. Renders in both network and Gantt views; 105 working-day critical path. |
