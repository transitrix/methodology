# FGA diagram

**Driver → Goal → Activity** — a three-column strategy view without the Changes column.
Use this format when you want a direct mapping from goals to activities without intermediate change items.

**File extension:** `*.fga.transitrix.yaml`

See the canonical spec: [`../../views/03-fga.md`](../../views/03-fga.md).

## Minimal structure

```yaml
notation: fga
spec_version: "0.1"

id: FGA-SAMPLE-1
name: "Sample FGA chain"

factors:
  - id: DRIVER-MARKET-1
    name: "Market growth opportunity"
    type: external

goals:
  - id: GOAL-EXPAND-1
    name: "Expand market share"
    factors: [DRIVER-MARKET-1]   # one or more DRIVER-… IDs

activities:
  - id: ACTIVITY-LAUNCH-1
    name: "Launch in two new regions"
    goals: [GOAL-EXPAND-1]       # one or more GOAL-… IDs the activity supports
```

## Optional document-root fields

```yaml
description: "Short description"
period: "2026"
version: "0.1"
date: "2026-05-26"
author: "Your Name"
```

## Difference from FGCA

FGA omits the `changes` section entirely. Activities link directly to goals via `activity.goals: [GOAL-…]`.
Use FGCA (`.fgca.transitrix.yaml`) when you need to track discrete change packages between goals and activities.

## Rules

- All IDs follow the canonical `<TYPE>-[<middle>-]<INTEGER>` grammar per [`../../IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md). IDs are unique within their layer.
- A goal MAY reference multiple drivers via `factors: [DRIVER-…, DRIVER-…]`.
- An activity MAY reference multiple goals via `goals: [GOAL-…, GOAL-…]`.

## Examples in this folder

| File | Description |
|---|---|
| `strategy-2026.fga.transitrix.yaml` | FGA chain (3 drivers, 3 goals, 7 activities) |
