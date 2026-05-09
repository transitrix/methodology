# `views/fgca/`

Factor → Goal → Change → Activity chains. Strategy-to-execution scaffold: drivers justify focus, goals set direction, changes define the transformation, activities deliver. Each layer references atomic elements stored elsewhere.

## File convention

`*.fgca.transitrix.yaml`

## Skeleton

```yaml
title: "EU Expansion 2026"

factors:
  - id: "FACTOR-EU-001"
    description: "EU regulatory window closing in Q3"

goals:
  - id: "GOAL-EU-001"
    factors: ["FACTOR-EU-001"]
    description: "Operational presence in 3 EU markets by Q4"

changes:
  - id: "CHANGE-EU-001"
    goals: ["GOAL-EU-001"]
    description: "Stand up EU-localised CRM and payment processing"

activities:
  - id: "ACT-CRM-EU-001"
    changes: ["CHANGE-EU-001"]
    description: "Implement EU-localised CRM rollout"
```

## See also

- `method/methodology.md` §6.2 — FGCA notation
- `views/fga/` — simplified 3-layer variant (no Changes layer)
