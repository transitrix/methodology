# `canon/views/goals/`

Hierarchical goals trees. Each tree references Goal elements stored atomically under `canon/elements/01_motivation/`.

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

goal_types:                       # contiguous levels from 0 (GOALS-013); static vocabulary, no lifecycle
  - { name: "Strategy",       level: 0 }
  - { name: "Strategic Goal", level: 1 }

goals:
  - id: GOAL-REVENUE-1            # → canon/elements/01_motivation/goals/GOAL-REVENUE-1.yaml
    name: "Triple revenue in 3 years"
    type: "Strategy"
    level: 0
    # root — no parent
    valid_from: "2026-05-26"      # CONTRACT.md §7 — required on every inline goal
    valid_to: null
  - id: GOAL-EU-1
    name: "Launch in 3 EU markets"
    type: "Strategic Goal"
    level: 1                       # parent is level 0 → strict N+1 (GOALS-012)
    parent: GOAL-REVENUE-1
    valid_from: "2026-05-26"
    valid_to: null
  - id: GOAL-OPS-1
    name: "Cut support response time by half"
    type: "Strategic Goal"
    level: 1
    parent: GOAL-REVENUE-1
    valid_from: "2026-05-26"
    valid_to: null
```

`valid_from` / `valid_to` are required on every inline goal entry per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7. The `goal_types[]` entries are a static vocabulary, not elements, and do not carry lifecycle. The goals-tree document itself carries no lifecycle either — it is a view, not an element.

## See also

- `method/methodology.md` §6.1 — notation locations
- `method/methodology.md` §9 — naming conventions
- `canon/elements/01_motivation/` — where individual Goal elements live
