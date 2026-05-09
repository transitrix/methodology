# `views/fga/`

Factor → Goal → Activity chains. Simplified 3-layer variant of FGCA — used when the transformation step is implicit or trivial.

## File convention

`*.fga.transitrix.yaml`

## Skeleton

```yaml
title: "Q2 Operational Improvements"

factors:
  - id: "FACTOR-OPS-001"
    description: "Customer-support response time degraded over Q1"

goals:
  - id: "GOAL-OPS-001"
    factors: ["FACTOR-OPS-001"]
    description: "Restore P50 response time to under 2 hours by end of Q2"

activities:
  - id: "ACT-OPS-001"
    goals: ["GOAL-OPS-001"]
    description: "Add second-shift coverage in EU timezone"
```

## See also

- `method/methodology.md` §6.2 — FGCA / FGA notations
- `views/fgca/` — full 4-layer variant with explicit Changes
