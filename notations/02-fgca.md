---
notation: "FGCA Strategy-to-Execution Chain"
version: "1.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-08"
status: "documented"
file_extension: "*.fgca.transitrix.yaml"
dsm_status: "implemented — F, G, C, A layers active; column selection via localStorage"
---

# FGCA Notation Reference

## File header

Every `*.fgca.transitrix.yaml` file MUST start with the following header:

```yaml
notation: fgca          # required; this notation's short name
spec_version: 0.1       # optional today; reserved field; will be required when this notation reaches v1.0
# … rest of the document
```

Validator behaviour:
- Missing `notation` → hard error.
- `notation` value not equal to `fgca` → hard error (the file might be the wrong format for this extension).
- File extension not equal to `.fgca.transitrix.yaml` while `notation: fgca` → hard error (extension/content mismatch).
- `spec_version` accepted but not enforced until this notation hits v1.0.

---

## Method Author

This method is authored by **Valerii Korobeinikov**.

## What This Notation Is For

FGCA notation is a business method for translating strategy into coordinated execution.
It helps teams answer a single management question:

**How do our day-to-day initiatives directly support strategic intent?**

FGCA stands for:

- **F**actors
- **G**oals
- **C**hanges
- **A**ctivities

## Business Meaning of Each Layer

- **Factors**: external and internal drivers that explain why action is needed now.
- **Goals**: strategic outcomes the organization wants to achieve.
- **Changes**: business transformations required to make goals real.
- **Activities**: concrete initiatives, projects, and workstreams that deliver those changes.

## Core Management Logic

FGCA is read as a cause-and-delivery chain:

**Factors -> Goals -> Changes -> Activities**

In practical management communication, this means:

- factors justify strategic focus,
- goals set direction and expected value,
- changes define what must be transformed in the business,
- activities define who does what to realize that transformation.

## How To Read and Use It

- **Top-down view (strategy to execution):** confirm that each activity has a clear strategic purpose.
- **Bottom-up view (execution to strategy):** confirm that ongoing initiatives are not disconnected from business goals.
- **Portfolio view:** Identify concentration, overlaps, and gaps in strategic coverage.
- **Decision view:** Use the chain to prioritize initiatives that have the strongest strategic contribution.

## Methodical Rules for Business Alignment

- Every strategic goal should be supported by intentional execution.
- Every initiative should have a clearly explainable strategic contribution.
- Strategic discussion should focus on value and outcomes, not only on task completion.
- If a workstream cannot be connected to strategic intent, it should be challenged, reframed, or deprioritized.

## Why This Matters

FGCA improves strategic coherence across leadership, program management, and operational teams.
It creates a shared language for planning, prioritization, and accountability, reducing the gap between strategy documents and real execution.

---

## DSM Implementation Status

Transitrix DSM implements the full 4-layer FGCA chain as of release 0.2.2:

| Layer | Status | Notes |
|-------|--------|-------|
| **F** — Factors | Implemented | Strategic Factors (PESTLE + internal); PESTLE report; factor–goal linking via `goal_factor` |
| **G** — Goals | Implemented | Goals tree, Visual Editor, FGCA column; goal–activity link via `goal_id` |
| **C** — Changes | Implemented | `bdn_change` entities linked to goals; `activity_change` join table; Activity edit form shows "Delivers changes" |
| **A** — Activities | Implemented | Activities table, Visual Editor, FGCA column; linked to Changes via `activity_change` |

**FGCA Viewer:** The FGCA tab renders all four columns. Column visibility is configurable via F/G/C/A toggle buttons; preference saved in `localStorage["fgca_columns"]`. Valid degenerate views (FGA, GCA, GA, etc.) are supported.

**FGCA Report:** The "FGCA Report" tab renders the full F→G→C→A chain in list format and exports Mermaid/PlantUML diagrams. PNG export saves as `fgca-diagram.png`.

**Design decisions:** see `docs/decisions/2026-05-08-fgca-design.md` in the DSM repository.

