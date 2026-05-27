# `views/goals/`

Hierarchical goals trees. Each tree references Goal elements stored atomically under `elements/01_motivation/`.

## File convention

`*.goals.transitrix.yaml`

## Skeleton

```yaml
notation: goals
spec_version: "0.1"

id: GOALS-STRATEGY-2026
name: "Acme Corp — Strategy 2026 Goals Tree"
description: "Goal hierarchy for the 2026 EU-expansion plan."
period: "2026"
date: "2026-05-26"
author: "Acme Strategy Office"

goal_types:                       # contiguous levels from 0 (GOALS-013)
  - { name: "Strategy",       level: 0 }
  - { name: "Strategic Goal", level: 1 }

goals:
  - id: GOAL-REVENUE-1            # → elements/01_motivation/goals/GOAL-REVENUE-1.yaml
    name: "Triple revenue in 3 years"
    type: "Strategy"
    level: 0
    # root — no parent
  - id: GOAL-EU-1
    name: "Launch in 3 EU markets"
    type: "Strategic Goal"
    level: 1                       # parent is level 0 → strict N+1 (GOALS-012)
    parent: GOAL-REVENUE-1
  - id: GOAL-OPS-1
    name: "Cut support response time by half"
    type: "Strategic Goal"
    level: 1
    parent: GOAL-REVENUE-1
```

## See also

- `method/methodology.md` §6.1 — notation locations
- `method/methodology.md` §9 — naming conventions
- `elements/01_motivation/` — where individual Goal elements live
