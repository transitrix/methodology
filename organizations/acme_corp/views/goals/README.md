# `views/goals/`

Hierarchical goals trees. Each tree references Goal elements stored atomically under `elements/01_motivation/`.

## File convention

`*.goals.transitrix.yaml`

## Skeleton

```yaml
title: "Strategy 2026"
description: "Top-level strategic goals for FY2026"

goal_types:
  - { name: "Strategy", level: 0 }
  - { name: "Business Goal", level: 1 }
  - { name: "Project", level: 2 }

goals:
  - id: "GOAL-FIN-001"           # references elements/01_motivation/GOAL-FIN-001.yaml
    parent_id: 0
  - id: "GOAL-MKT-002"
    parent_id: "GOAL-FIN-001"
```

## See also

- `method/methodology.md` §6.1 — notation locations
- `method/methodology.md` §9 — naming conventions
- `elements/01_motivation/` — where individual Goal elements live
