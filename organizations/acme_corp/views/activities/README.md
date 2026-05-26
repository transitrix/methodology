# `views/activities/`

Project schedule as an **Activity-on-Node** precedence network (PSND), with an optional Gantt timeline projection. Activities reference Activity, Goal, and Change elements.

## File convention

`*.activities.transitrix.yaml`

See [`notations/07-activities.md`](../../../../notations/07-activities.md) for the full spec — including PSND semantics, the critical-path computation, and the Gantt projection contract.

## Skeleton

```yaml
notation: activities
spec_version: "0.1"

activities:
  - id: ACTIVITY-DISCOVERY-1
    name: "Discovery & research"
    duration_days: 10
    start_date: "2026-06-01"
    predecessors: []
    goals: [GOAL-CUST-1]

  - id: ACTIVITY-DESIGN-1
    name: "Solution design"
    duration_days: 14
    predecessors: [ACTIVITY-DISCOVERY-1]
    goals: [GOAL-CUST-1]

  - id: ACTIVITY-BUILD-1
    name: "Build & test"
    duration_days: 30
    predecessors: [ACTIVITY-DESIGN-1]
    delivers_changes: [CHANGE-ONBOARD-1]

  - id: ACTIVITY-LAUNCH-1
    name: "Launch"
    duration_days: 5
    predecessors: [ACTIVITY-BUILD-1]
    delivers_changes: [CHANGE-ONBOARD-1]
```

Activities form a DAG via `predecessors:`. The renderer computes Early Start / Late Finish / slack and highlights the critical path in both the PSND view and the Gantt projection. Transitrix Studio renders both views; the toolbar switches between them.

## Cross-references

- `goals: [GOAL-…]` — Goal IDs from the goals tree / FGCA chain.
- `delivers_changes: [CHANGE-…]` — Change IDs from the FGCA chain.
- `predecessors: [ACTIVITY-…]` — other activity IDs in the same file.

All IDs follow the canonical `<TYPE>-[<middle>-]<INTEGER>` grammar from [`notations/IDS_AND_REFERENCES.md`](../../../../notations/IDS_AND_REFERENCES.md).

## See also

- [`notations/07-activities.md`](../../../../notations/07-activities.md) — the notation spec
- [`notations/examples/activities/platform-launch.activities.transitrix.yaml`](../../../../notations/examples/activities/platform-launch.activities.transitrix.yaml) — worked example
- `method/methodology.md` §6 — notation kit
