# Goals tree

Visualises a hierarchical goal decomposition: Strategy → Business Goal → Project (or any custom level hierarchy).

**File extension:** `*.goals.transitrix.yaml`

## Minimal structure

```yaml
notation: goals
spec_version: "0.1"

goal_types:
  - { name: "Strategy",      level: 0 }
  - { name: "Business Goal", level: 1 }
  - { name: "Project",       level: 2 }

goals:
  - id: 1
    name: "Top-level goal"
    type: "Strategy"
    level: 0
    parent_id: 0        # 0 = root (no parent)

  - id: 2
    name: "Sub-goal"
    type: "Business Goal"
    level: 1
    parent_id: 1
```

## Optional header fields

```yaml
title: "My Goals Tree"
description: "Short description"
version: "0.1"
date: "2026-05-12"
author: "Your Name"
```

## Rules

- `parent_id: 0` marks a root node.
- `level` in each goal must match the `level` defined in `goal_types`.
- Goal IDs must be unique integers within the file.
- Each goal has exactly one parent (`parent_id`).
- Any number of levels is supported; add entries to `goal_types` and goals accordingly.

## Examples in this folder

| File | Description |
|---|---|
| `strategy-2026.goals.transitrix.yaml` | 3-level goal tree for a 2026 strategy (6 nodes) |
