# `canon/views/fga/`

Factor → Goal → Activity chains. Simplified 3-layer variant of FGCA — used when the transformation step is implicit or trivial.

## File convention

`*.fga.transitrix.yaml`

## Skeleton

```yaml
notation: fga
spec_version: "0.1"

id: FGA-OPS-1
name: "Q2 Operational Improvements"
description: "Factor → Goal → Activity chain for support operations."
period: "2026-Q2"
date: "2026-05-26"
author: "Acme Ops"

factors:
  - id: FACTOR-COMP-1              # → canon/elements/01_motivation/factors/FACTOR-COMP-1.yaml
    name: "Support response time degraded over Q1"
    type: internal
    valid_from: "2026-05-26"       # CONTRACT.md §7 — required on every inline element
    valid_to: null

goals:
  - id: GOAL-OPS-1
    name: "Restore P50 response time to under 2 hours by end of Q2"
    factors: [FACTOR-COMP-1]
    valid_from: "2026-05-26"
    valid_to: null

activities:
  - id: ACTIVITY-SUPPORT-1
    name: "Add second-shift coverage in EU timezone"
    goals: [GOAL-OPS-1]
    valid_from: "2026-05-26"
    valid_to: null
```

`valid_from` / `valid_to` are required on every inline element per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7. The FGA document itself does not carry a lifecycle field — it is a view, not an element.

## See also

- `method/methodology.md` §6.2 — FGCA / FGA notations
- `canon/views/fgca/` — full 4-layer variant with explicit Changes
