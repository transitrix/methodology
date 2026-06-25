---
title: "Activity — implementation-layer work package"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-25"
status: "draft"
---

# Activity — Reference

**Scope:** The `ACTIVITY` element type — the implementation-layer **work package** primitive: *a bounded unit of transformation work the organisation undertakes to move from the current state to a target state* (ArchiMate Work Package). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3 (`ACTIVITY` field set: §7.4, now superseded by this file); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Activities are **zone primitives**: each activity is a single YAML file under `canon/elements/05_implementation/activities/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the activity-specific frontmatter below.

The `ACTIVITY` TYPE is multi-scale and recursive — an `Initiative` aggregates `Programme`s which aggregate `Project`s which aggregate `Task`s, all of the same TYPE, linked via the `parent` field (§1). This is the full extent of the TYPE taxonomy; there is no separate TYPE per scale level.

---

## 1. Scale levels and the `activity_type` vocabulary

Every activity carries an `activity_type` value that labels its **scale** within the initiative hierarchy. This is a controlled string enum — not a reference to a separate element.

| `activity_type` value | Alias | Scale | Typical scope |
|---|---|---|---|
| `Initiative` | `Strategic Initiative` — fully interchangeable | 1 — highest | A multi-year transformation programme driven by one or more strategic goals; the root of an activity hierarchy |
| `Programme` | — | 2 | A coordinated set of projects delivering a related set of changes; child of an Initiative |
| `Project` | — | 3 | A time-boxed, goal-directed effort with a defined start and end; child of a Programme (or directly of an Initiative) |
| `Task` | — | 4 — lowest | An atomic work item within a project; no further decomposition |

**`activity_type` vs `parent`:**
- `parent: ACTIVITY-…` carries the **structural** parent-child relationship — the DAG edge.
- `activity_type` labels the **semantic scale** of the activity itself.

Both are optional on any given element. An activity may carry `parent` without `activity_type` (the hierarchy is known but the scale is unclassified) or `activity_type` without `parent` (the scale is known but the activity is a root node or its parent hasn't been modelled yet). When both are present they should be consistent: a `Task` should not be the parent of a `Project`.

**`Strategic Initiative` alias:** `Strategic Initiative` and `Initiative` are the same level. `Initiative` is the canonical stored value; `Strategic Initiative` is an accepted alias. Tooling should normalise `Strategic Initiative` → `Initiative` on ingest and treat both as equivalent in display.

**Activity Card binding:** An activity rendered as an Activity Card ([views/18-activity-card.md](../views/18-activity-card.md)) must carry `activity_type: Project` (validation rule PC-002). Activity Cards are project-scoped artefacts; using an Initiative or Programme as the card anchor is not supported in v1.

---

## 2. Frontmatter — canonical schema

```yaml
notation: activity
id: ACTIVITY-PLATFORM-LAUNCH-1
name: "Platform Launch 2026"
activity_type: Initiative              # Initiative | Programme | Project | Task (optional)
description: >
  Strategic initiative to launch the customer-facing platform by Q4 2026,
  delivering the self-service onboarding capability.

# ── Hierarchy
parent: null                           # ACTIVITY-… of the aggregating work package, or omit

# ── Strategy chain linkage
goals: [GOAL-ONBOARDING-1]             # v0.x inline; prefer REL type: activity_goal (§3)
delivers_changes: [CHG-ONBOARD-1]      # CHANGE-… IDs — BDN linkage

# ── Scheduling (schedule-doc fields; optional on standalone elements)
duration: null                         # number — in org's time units; required for CPM
start_date: "2026-01-15"               # quoted ISO 8601 (CONTRACT.md §4)
end_date:   "2026-12-31"
predecessors: []                       # ACTIVITY-… IDs that must complete first

# ── Ownership
owner: ACTOR-PRODUCT-TEAM-1           # ACTOR-… performing the work
owner_role: ROLE-PROGRAMME-MGR-1      # ROLE-… accountable for the activity

# ── Scenario and stakeholders
scenario: SCEN-PLATFORM-OPT-A-1       # SCENARIO-… this activity belongs to
stakeholders: [STAKEHOLDER-CFO-1]      # STAKEHOLDER-… whose interests are at stake

# ── Cost / effort
labor_cost: 250000
resources_cost: 50000
effort: 4000                           # person-hours

# ── Display
score: 10
sort: 1
tags: [q3-priority, platform]
link: https://wiki.example.com/platform-launch

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-06-25"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-01-15"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `activity`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `ACTIVITY-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label. |
| `activity_type` | no | string | Scale level — one of `Initiative`, `Programme`, `Project`, `Task`. `Strategic Initiative` is accepted as an alias for `Initiative`. See §1. |
| `description` | recommended | string | One-paragraph elaboration of the work package's purpose. |
| `parent` | no | string | `ACTIVITY-…` of the aggregating work package one level up in the hierarchy. Omit for root activities (Initiatives with no parent). |
| `goals` | no | list | `GOAL-…` IDs the activity serves. **v0.x transitional inline field** — prefer a `REL` file with `type: activity_goal` (§3). |
| `delivers_changes` | no | list | `CHANGE-…` IDs the activity delivers (BDN linkage). Timeless inline. |
| `predecessors` | no | list | `ACTIVITY-…` IDs that must complete before this activity can start. Timeless inline; used by schedule docs for CPM. |
| `duration` | no | number | Duration in the organisation's time units (days by default). Required for CPM analysis; recommended for Gantt rendering. `0` marks a milestone. |
| `start_date` / `end_date` | no | string | Planned dates — quoted ISO 8601 ([CONTRACT.md](../CONTRACT.md) §4). Describe *when work is planned*, distinct from `valid_from` / `valid_to` which describe *when the element is in effect*. |
| `scenario` | no | string | `SCENARIO-…` this activity belongs to. |
| `owner` | no | string | `ACTOR-…` responsible for performing the work (`person` / `business_unit` / `system`). Replaces legacy free-text `owner` / `unit` / `employee` fields (Actors decision 2026-05-29). |
| `owner_role` | no | string | `ROLE-…` accountable for the activity (positional accountability). Distinct from `owner` (ACTOR = who performs; ROLE = what position is accountable). Both are optional and independent. |
| `stakeholders` | no | list | `STAKEHOLDER-…` IDs whose interests are at stake in this activity. Each STAKEHOLDER carries its concern/influence profile and an ACTOR reference for identity ([20-stakeholders.md](20-stakeholders.md)). |
| `labor_cost` / `resources_cost` / `effort` | no | number | Cost and effort signals. Units are org-defined. |
| `score` / `sort` | no | integer | `score` — local prioritisation signal; `sort` — manual display ordering. |
| `tags` | no | list | Free-text classifier strings. |
| `link` | no | string | URL to supplementary documentation. |
| `zone` | yes | string | Always `canon` — [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | Date the activity took effect — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the activity ended, or `null` if still in effect. |

---

## 3. Time-aware relations

**`goals` — time-aware, inline is transitional.** An activity re-aimed at a different goal mid-stream is a temporal event. The canonical home for an `ACTIVITY → GOAL` link is a `REL-…` file under `canon/relations/` with `type: activity_goal` ([17-relations.md](17-relations.md) §3), not the inline `goals` array. The inline field stays available for authoring convenience in v0.x; renderers prefer REL files when both are present. Adopters extracting links to REL files use `valid_from = activity.valid_from` as a sensible epoch for the initial relation.

**`predecessors` — timeless, stays inline.** The predecessor DAG within a plan is a structural property of the plan as a whole, not a temporal event — a changed dependency structure is a new plan version. `predecessors` is not declared time-aware.

**`delivers_changes` — timeless, stays inline** in v1. The BDN linkage is considered stable within the activity's lifecycle.

---

## 4. Inline authoring before promotion

An `ACTIVITY` entry authored **inline inside a view document** (a schedule document `*.activities.transitrix.yaml` or a DGCA `*.dgca.transitrix.yaml`) uses the same field set as the standalone element but without the admission record and lifecycle block — those belong on the view document itself. Inline `id` values (e.g. `A-001`, `PHASE-DESIGN`) are document-local and do not resolve to canonical `ACTIVITY-…` IDs.

**Promotion** to a standalone element file happens when the activity is **first referenced from a second document** (§1 promotion rule, [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1). At promotion: assign a canonical `ACTIVITY-…` ID, move the fields to the standalone envelope (this schema), update the view document's entry to reference the canonical ID. The document-local ID retires.

Inline shape: [views/07-activities.md](../views/07-activities.md) §5.2 (schedule document), [views/02-dgca.md](../views/02-dgca.md) §5.5 (DGCA).

---

## 5. File location and naming

```
canon/elements/05_implementation/activities/<ID>.yaml
```

One activity per file, named by its canonical ID. Examples: `ACTIVITY-PLATFORM-LAUNCH-1.yaml`, `ACTIVITY-DATA-MIGRATION-PROG-1.yaml`.

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ACTIVITY-001` | error | `id` missing or not matching `ACTIVITY-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) is missing. |
| `ACTIVITY-002` | error | `activity_type` is present and not one of `Initiative`, `Strategic Initiative`, `Programme`, `Project`, `Task`. |
| `ACTIVITY-003` | warning | `parent` is present and both the parent and child have `activity_type` values, but the child's level is not lower than the parent's (e.g. an `Initiative` whose `parent` is a `Project`). |
| `ACTIVITY-004` | error | `activity_type` is not `Project` and the activity is referenced as the project anchor in an Activity Card ([views/18-activity-card.md](../views/18-activity-card.md)) — activity-card binding rule PC-002. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to ACTIVITY files in addition to the ACTIVITY-* rules above.

---

## 7. Evolution

- **Activities tree view** — a tree rendering of the `parent`-linked Initiative → Programme → Project → Task hierarchy, analogous to the Goals tree ([views/04-goals.md](../views/04-goals.md)). Specified in `views/23-activities-tree.md` (forthcoming); Studio implementation tracked separately.
- **`activity_type` normalisation** — tooling should normalise `Strategic Initiative` → `Initiative` on ingest. A validator `ACTIVITY-005` warning for `Strategic Initiative` (use canonical `Initiative`) may be added once migration tooling is in place.
- **Milestone** — a zero-duration activity (`duration: 0`) marks a milestone within the current model. A dedicated `MILESTONE` TYPE (`05_implementation/milestones/`) is reserved in [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.2 for a future first-class milestone element.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3.
- Layer placement (`05_implementation`): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6, §6.1.
- Materialisation mode and promotion rule: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1, §4 (row: `ACTIVITY`).
- Schedule document inline shape: [views/07-activities.md](../views/07-activities.md) §5.2.
- DGCA inline shape: [views/02-dgca.md](../views/02-dgca.md) §5.5.
- Activity Card binding: [views/18-activity-card.md](../views/18-activity-card.md) §1, PC-002.
- Time-aware goal relation: [17-relations.md](17-relations.md) §3 (`activity_goal` kind).
- Actor ownership: [19-actors.md](19-actors.md).
- Stakeholder interests: [20-stakeholders.md](20-stakeholders.md).
- BDN change linkage: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.3 (`CHANGE`).
