# FGCA diagram

**Factor → Goal → Change → Activity** — a four-column strategy decomposition chain.
Shows how external factors drive goals, which require changes, which are delivered through activities.

**File extension:** `*.fgca.transitrix.yaml`

## Minimal structure

```yaml
notation: fgca
spec_version: "0.1"

factors:
  - id: 1
    name: "External factor driving change"

goals:
  - id: 1
    name: "Strategic goal"
    factor: [{ id: 1 }]      # one or more factor IDs

changes:
  - id: 1
    name: "Transformation programme"
    goal_id: 1               # which goal this change addresses
    activity_ids: [1, 2]     # activities that deliver this change

activities:
  - id: 1
    name: "Research phase"
    goal_id: 1
  - id: 2
    name: "Rollout phase"
    goal_id: 1
```

## Optional header fields

```yaml
title: "My FGCA Chain"
description: "Short description"
version: "0.1"
date: "2026-05-12"
author: "Your Name"
```

## Rules

- All IDs (`factors`, `goals`, `changes`, `activities`) must be unique integers within their section.
- A goal can reference multiple factors: `factor: [{ id: 1 }, { id: 2 }]`.
- A change belongs to exactly one goal (`goal_id`) but can list multiple delivering activities.
- An activity belongs to exactly one goal (`goal_id`).

## Examples in this folder

| File | Description |
|---|---|
| `strategy-2026.fgca.transitrix.yaml` | Full FGCA chain (2 factors, 3 goals, 3 changes, 5 activities) |
