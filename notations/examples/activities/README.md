# Activity network diagram (AoN / PSND)

Precedence diagram (Activity-on-Node) showing activities, durations, dependencies, and the computed critical path.
The critical path is highlighted automatically in the preview.

**File extension:** `*.activities.transitrix.yaml`

## Minimal structure

```yaml
notation: activities
spec_version: "0.1"

activities:
  - id: A-001
    name: "Requirements analysis"
    duration: 5                # duration in any consistent unit (days, weeks, sprints)

  - id: A-002
    name: "Architecture design"
    duration: 8
    predecessors: [A-001]      # IDs of activities that must finish before this one starts

  - id: A-003
    name: "Implementation"
    duration: 15
    predecessors: [A-002]
```

## Optional header fields

```yaml
title: "My Project"
description: "Short description"
version: "0.1"
date: "2026-05-12"
author: "Your Name"
```

## Optional fields per activity

| Field | Type | Description |
|---|---|---|
| `sort` | integer | Display order hint |
| `description` | string | Free-text note |
| `goals` | string[] | Goal IDs this activity contributes to |
| `tags` | string[] | Labels for grouping or highlighting |
| `unit` | string | Organisational unit responsible |
| `delivers_changes` | string[] | Change IDs delivered by this activity |

## Rules

- Activity IDs must be unique strings within the file (e.g. `A-001`, `TASK-5`).
- Activities without `predecessors` are treated as start nodes.
- Multiple predecessors create a merge point (all must finish before the activity starts).
- The critical path is computed automatically using the PMBoK forward/backward pass (ES, EF, LS, LF, float).
- Duration unit is not enforced — use the same unit consistently throughout the file.

## Examples in this folder

| File | Description |
|---|---|
| `platform-launch.activities.transitrix.yaml` | 10-activity platform launch; two parallel paths merge at integration testing; 3-activity critical path tail |
