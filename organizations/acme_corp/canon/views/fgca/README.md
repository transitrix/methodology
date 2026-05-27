# `canon/views/fgca/`

Factor → Goal → Change → Activity chains. Strategy-to-execution scaffold: drivers justify focus, goals set direction, changes define the transformation, activities deliver. Each layer references atomic elements stored elsewhere.

## File convention

`*.fgca.transitrix.yaml`

## Skeleton

```yaml
notation: fgca
spec_version: "0.1"

id: FGCA-EU-1
name: "EU Expansion 2026"
description: "Factor → Goal → Change → Activity chain for EU market entry."
period: "2026"
date: "2026-05-26"
author: "Acme Strategy Office"

factors:
  - id: FACTOR-EU-REG-1           # → canon/elements/01_motivation/factors/FACTOR-EU-REG-1.yaml
    name: "EU regulatory window closing in Q3"
    type: external
    references_constraint: [CONSTRAINT-GDPR-RESIDENCY-1]   # → canon/elements/01_motivation/constraints/

goals:
  - id: GOAL-EU-1
    name: "Operational presence in 3 EU markets by Q4"
    factors: [FACTOR-EU-REG-1]

changes:
  - id: CHANGE-EU-CRM-1
    name: "Stand up EU-localised CRM and payment processing"
    goals: [GOAL-EU-1]

activities:
  - id: ACTIVITY-CRM-EU-1
    name: "Implement EU-localised CRM rollout"
    changes: [CHANGE-EU-CRM-1]
```

## See also

- `method/methodology.md` §6.2 — FGCA notation
- `canon/views/fga/` — simplified 3-layer variant (no Changes layer)
