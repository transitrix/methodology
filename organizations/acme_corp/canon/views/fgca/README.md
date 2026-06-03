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
    name: "EU regulatory window for market entry"   # neutral driver — findings live on ASSESSMENTs
    type: external
    category: legal               # PESTLE — external only
    references_constraint: [CONSTRAINT-GDPR-RESIDENCY-1]   # → canon/elements/01_motivation/constraints/
    valid_from: "2026-05-26"      # CONTRACT.md §7 — required on every inline element
    valid_to: null

goals:
  - id: GOAL-EU-1
    name: "Operational presence in 3 EU markets by Q4"
    factors: [FACTOR-EU-REG-1]
    valid_from: "2026-05-26"
    valid_to: null

changes:
  - id: CHANGE-EU-CRM-1
    name: "Stand up EU-localised CRM and payment processing"
    goals: [GOAL-EU-1]
    valid_from: "2026-05-26"
    valid_to: null

activities:
  - id: ACTIVITY-CRM-EU-1
    name: "Implement EU-localised CRM rollout"
    changes: [CHANGE-EU-CRM-1]
    valid_from: "2026-05-26"
    valid_to: null
```

`valid_from` / `valid_to` are required on every inline element per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7. The FGCA document itself does not carry a lifecycle field — it is a view, not an element.

## See also

- `method/methodology.md` §6.2 — FGCA notation
- `canon/views/fga/` — simplified 3-layer variant (no Changes layer)
