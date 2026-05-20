# FGA diagram

**Factor → Goal → Activity** — a three-column strategy view without the Changes column.
Use this format when you want a direct mapping from goals to activities without intermediate change items.

**File extension:** `*.fga.transitrix.yaml`

## Minimal structure

```yaml
notation: fga

factors:
  - id: 1
    name: "Market growth"

goals:
  - id: 1
    name: "Expand market share"
    factor: [{ id: 1 }]      # one or more factor IDs

activities:
  - id: 1
    name: "Launch in two new regions"
    goal_id: 1               # which goal this activity delivers
```

## Optional header fields

```yaml
title: "My FGA"
description: "Short description"
version: "0.1"
date: "2026-05-12"
author: "Your Name"
```

## Difference from FGCA

FGA omits the `changes` section entirely. Activities link directly to goals via `goal_id`.
Use FGCA (`.fgca.transitrix.yaml`) when you need to track discrete change packages between goals and activities.

## Rules

- All IDs must be unique integers within their section.
- A goal can reference multiple factors: `factor: [{ id: 1 }, { id: 2 }]`.
- Each activity belongs to exactly one goal.

## Examples in this folder

| File | Description |
|---|---|
| `strategy-2026.fga.transitrix.yaml` | FGA chain (3 factors, 3 goals, 6 activities) |
