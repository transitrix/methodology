# FGCA diagram

**Factor → Goal → Change → Activity** — a four-column strategy decomposition chain.
Shows how external factors drive goals, which require changes, which are delivered through activities.

**File extension:** `*.fgca.transitrix.yaml`

See the canonical spec: [`../../02-fgca.md`](../../02-fgca.md).

## Minimal structure

```yaml
notation: fgca
spec_version: "0.1"

id: FGCA-SAMPLE-1
name: "Sample FGCA chain"

factors:
  - id: FACTOR-1
    name: "External factor driving change"
    type: external

goals:
  - id: GOAL-1
    name: "Strategic goal"
    factors: [FACTOR-1]            # one or more FACTOR-… IDs

changes:
  - id: CHANGE-1
    name: "Transformation programme"
    goals: [GOAL-1]                # one or more GOAL-… IDs this change delivers

activities:
  - id: ACTIVITY-1
    name: "Research phase"
    changes: [CHANGE-1]            # one or more CHANGE-… IDs this activity delivers
  - id: ACTIVITY-2
    name: "Rollout phase"
    changes: [CHANGE-1]
```

## Optional document-root fields

```yaml
description: "Short description"
period: "2026"
version: "0.1"
date: "2026-05-26"
author: "Your Name"
```

## Rules

- All IDs follow the canonical `<TYPE>-[<middle>-]<INTEGER>` grammar per [`../../IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md). IDs are unique within their layer.
- A goal MAY reference multiple factors via `factors: [FACTOR-…, FACTOR-…]`.
- A change MAY reference multiple goals via `goals: [GOAL-…, GOAL-…]`.
- An activity MAY reference multiple changes via `changes: [CHANGE-…, CHANGE-…]`.
- For degenerate paths where a change layer adds no information, an activity MAY link directly via `goals: [GOAL-…]` — see [`../../02-fgca.md`](../../02-fgca.md) §Fields.

## Examples in this folder

| File | Description |
|---|---|
| `strategy-2026.fgca.transitrix.yaml` | Full FGCA chain (2 factors, 3 goals, 3 changes, 5 activities) |
