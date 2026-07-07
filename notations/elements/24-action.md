---
title: "Action — implementation-layer work package"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-25"
status: "draft"
---

# Action — Reference

**Scope:** The `ACTION` element type — the implementation-layer **work package** primitive: *a bounded unit of transformation work the organisation undertakes to move from the current state to a target state* (ArchiMate Work Package). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3 (`ACTION` field set: §7.4, now superseded by this file); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Actions are **zone primitives**: each action is a single YAML file under `canon/elements/05_implementation/actions/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the action-specific frontmatter below.

**Naming note — Action vs Activity.** `Action` is the project-domain term for a bounded, goal-directed work package (Initiative / Programme / Project / Task). `Activity` is reserved for the **process domain** — a single step in a recurring business process (BPMN Task). The distinction keeps project work items separate from operational process steps; see [CONTRACT.md](../CONTRACT.md) §9.

**Deprecated alias.** The former primitive name `ACTIVITY` (and the notation key `activity`, file extension `*.activity.*`, path prefix `activities/`, field name `activity_type`) are deprecated as of 2026-06-25. Validators emit `ACTION-005` warnings on old names; they remain accepted for backward compatibility until the 1.0 cut.

The `ACTION` TYPE is multi-scale and recursive — an `Initiative` aggregates `Programme`s which aggregate `Project`s which aggregate `Task`s, all of the same TYPE, linked via the `parent` field (§1). This is the full extent of the TYPE taxonomy; there is no separate TYPE per scale level.

---

## 1. Scale levels — the `type` vocabulary

Every action carries a `type` value that labels its **scale** within the initiative hierarchy. This is a controlled string enum — not a reference to a separate element.

| `type` value | Alias | Scale | Typical scope |
|---|---|---|---|
| `Initiative` | `Strategic Initiative` — fully interchangeable | 1 | A transformation programme driven by one or more strategic goals; the root of an action hierarchy |
| `Programme` | — | 2 | A coordinated set of projects delivering a related set of changes; child of an Initiative |
| `Project` | — | 3 | A time-boxed, goal-directed effort with a defined start and end; child of a Programme (or directly of an Initiative) |
| `Task` | — | 4 | An atomic work item within a project; no further decomposition |

**Deprecated alias.** The field name `activity_type` is accepted with an `ACTION-005` warning; validators normalise it to `type` on ingest.

**Virtual root — level 0.** Above the Initiative level sits an implicit anchor: the totality of the organisation's action — the business itself. This root is not modelled as an `ACTION` element and carries no `type` value. In renderings it appears in two forms depending on context:
- **Network / Gantt diagrams** — a single anonymous start node (a dot or arrow origin) from which all Initiative nodes fan out.
- **Tree view** — the company name at the root of the tree, with all Initiatives as its direct children.

The virtual root is a rendering convention, not a data primitive. It never needs a `parent` field pointing to it; Initiatives with no `parent` are implicitly its children.

**`type` vs `parent`:**
- `parent: ACTION-…` carries the **structural** parent-child relationship — the DAG edge.
- `type` labels the **semantic scale** of the action itself.

Both are optional on any given element. An action may carry `parent` without `type` (the hierarchy is known but the scale is unclassified) or `type` without `parent` (the scale is known but the action is a root node or its parent hasn't been modelled yet). When both are present they should be consistent: a `Task` should not be the parent of a `Project`.

**`Strategic Initiative` alias:** `Strategic Initiative` and `Initiative` are the same level. `Initiative` is the canonical stored value; `Strategic Initiative` is an accepted alias. Tooling should normalise `Strategic Initiative` → `Initiative` on ingest and treat both as equivalent in display.

**Action Card binding:** An action rendered as an Action Card ([views/18-action-card.md](../views/18-action-card.md)) must carry `type: Project` (validation rule PC-002). Action Cards are project-scoped artefacts; using an Initiative or Programme as the card anchor is not supported in v1.

---

## 2. Frontmatter — canonical schema

```yaml
notation: action
id: ACTION-PLATFORM-LAUNCH-1
name: "Platform Launch 2026"
type: Initiative                     # Initiative | Programme | Project | Task (optional)
description: >
  Strategic initiative to launch the customer-facing platform by Q4 2026,
  delivering the self-service onboarding capability.

# ── Hierarchy
parent: null                           # ACTION-… of the aggregating work package, or omit

# ── Strategy chain linkage
goals: [GOAL-ONBOARDING-1]             # v0.x inline; prefer REL type: action_goal (§3)
delivers_changes: [CHG-ONBOARD-1]      # CHANGE-… IDs — BDN linkage

# ── Scheduling (schedule-doc fields; optional on standalone elements)
duration: null                         # number — in org's time units; required for CPM
start_date: "2026-01-15"               # quoted ISO 8601 (CONTRACT.md §4)
end_date:   "2026-12-31"
predecessors: []                       # ACTION-… IDs that must complete first

# ── Ownership
owner: ACTOR-PRODUCT-TEAM-1           # ACTOR-… performing the work
owner_role: ROLE-PROGRAMME-MGR-1      # ROLE-… accountable for the action

# ── Scenario and stakeholders
scenario: SCEN-PLATFORM-OPT-A-1       # SCENARIO-… this action belongs to
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
| `notation` | yes | string | Fixed value `action`. Deprecated alias: `activity`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `ACTION-[<middle>-]<INTEGER>`. Deprecated alias prefix: `ACTIVITY-`. |
| `name` | yes | string | Human-readable label. |
| `type` | no | string | Scale level — one of `Initiative`, `Programme`, `Project`, `Task`. `Strategic Initiative` is accepted as an alias for `Initiative`. Deprecated alias: `activity_type`. See §1. |
| `description` | recommended | string | One-paragraph elaboration of the work package's purpose. |
| `parent` | no | string | `ACTION-…` of the aggregating work package one level up in the hierarchy. Omit for root actions (Initiatives with no parent). |
| `goals` | no | list | `GOAL-…` IDs the action serves. **v0.x transitional inline field** — prefer a `REL` file with `type: action_goal` (§3). |
| `delivers_changes` | no | list | `CHANGE-…` IDs the action delivers (BDN linkage). Timeless inline. |
| `predecessors` | no | list | `ACTION-…` IDs that must complete before this action can start. Timeless inline; used by schedule docs for CPM. |
| `duration` | no | number | Duration in the organisation's time units (days by default). Required for CPM analysis; recommended for Gantt rendering. `0` marks a milestone. |
| `start_date` / `end_date` | no | string | Planned dates — quoted ISO 8601 ([CONTRACT.md](../CONTRACT.md) §4). Describe *when work is planned*, distinct from `valid_from` / `valid_to` which describe *when the element is in effect*. |
| `scenario` | no | string | `SCENARIO-…` this action belongs to. |
| `owner` | no | string | `ACTOR-…` responsible for performing the work (`person` / `business_unit` / `system`). Replaces legacy free-text `owner` / `unit` / `employee` fields (Actors decision 2026-05-29). |
| `owner_role` | no | string | `ROLE-…` accountable for the action (positional accountability). Distinct from `owner` (ACTOR = who performs; ROLE = what position is accountable). Both are optional and independent. |
| `stakeholders` | no | list | `STAKEHOLDER-…` IDs whose interests are at stake in this action. Each STAKEHOLDER carries its concern/influence profile and an ACTOR reference for identity ([20-stakeholders.md](20-stakeholders.md)). |
| `labor_cost` / `resources_cost` / `effort` | no | number | Cost and effort signals. Units are org-defined. |
| `score` / `sort` | no | integer | `score` — local prioritisation signal; `sort` — manual display ordering. |
| `tags` | no | list | Free-text classifier strings. |
| `link` | no | string | URL to supplementary documentation. |
| `zone` | yes | string | Always `canon` — [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | Date the action took effect — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the action ended, or `null` if still in effect. |

---

## 3. Time-aware relations

**`goals` — time-aware, inline is transitional.** An action re-aimed at a different goal mid-stream is a temporal event. The canonical home for an `ACTION → GOAL` link is a `REL-…` file under `canon/relations/` with `type: action_goal` ([17-relations.md](17-relations.md) §3), not the inline `goals` array. The inline field stays available for authoring convenience in v0.x; renderers prefer REL files when both are present. Adopters extracting links to REL files use `valid_from = action.valid_from` as a sensible epoch for the initial relation.

**Deprecated alias.** The relation kind `activity_goal` is accepted with an `ACTION-005` warning; canonical kind is `action_goal`.

**`predecessors` — timeless, stays inline.** The predecessor DAG within a plan is a structural property of the plan as a whole, not a temporal event — a changed dependency structure is a new plan version. `predecessors` is not declared time-aware.

**`delivers_changes` — timeless, stays inline** in v1. The BDN linkage is considered stable within the action's lifecycle.

---

## 4. Authoring — standalone files only (v2.0)

From methodology v2.0, ACTION elements are authored exclusively as standalone files in `canon/elements/05_implementation/actions/`, following the canonical envelope (§2). View documents (`*.action.transitrix.yaml`, `*.dgca.transitrix.yaml`) are pure projections over these files — they carry only `view_config` and never inline element data.

**v1 inline form (historical).** In v1, an `ACTION` entry could be authored inline inside a schedule document. Document-local IDs (e.g. `A-001`, `PHASE-DESIGN`) were valid inline — they did not resolve to canonical `ACTION-…` IDs. The migration recipe (`migrations/1.0-to-2.0/`) automates extraction of inline entries to standalone element files.

View spec: [views/07-action.md](../views/07-action.md) (pure projection, v2.0).

---

## 5. File location and naming

```
canon/elements/05_implementation/actions/<ID>.yaml
```

One action per file, named by its canonical ID. Examples: `ACTION-PLATFORM-LAUNCH-1.yaml`, `ACTION-DATA-MIGRATION-PROG-1.yaml`.

**Deprecated path.** The path prefix `canon/elements/05_implementation/activities/` is accepted with an `ACTION-005` warning.

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ACTION-001` | error | `id` missing or not matching `ACTION-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) is missing. |
| `ACTION-002` | error | `type` is present and not one of `Initiative`, `Strategic Initiative`, `Programme`, `Project`, `Task`. |
| `ACTION-003` | warning | `parent` is present and both the parent and child have `type` values, but the child's level is not lower than the parent's (e.g. an `Initiative` whose `parent` is a `Project`). |
| `ACTION-004` | error | `type` is not `Project` and the action is referenced as the project anchor in an Action Card ([views/18-action-card.md](../views/18-action-card.md)) — action-card binding rule PC-002. |
| `ACTION-005` | warning | Deprecated alias detected: `notation: activity`, `id` matching `ACTIVITY-…`, field `activity_type`, or path prefix `activities/`. Migrate to `action` / `ACTION-…` / `type` / `actions/`. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to ACTION files in addition to the ACTION-* rules above.

---

## 7. Evolution

- **Actions tree view** — a tree rendering of the `parent`-linked Initiative → Programme → Project → Task hierarchy, analogous to the Goals tree ([views/04-goals.md](../views/04-goals.md)). Specified in `views/23-actions-tree.md`; Studio implementation tracked separately.
- **`type` normalisation** — tooling should normalise `Strategic Initiative` → `Initiative` on ingest. A validator `ACTION-006` warning for `Strategic Initiative` (use canonical `Initiative`) may be added once migration tooling is in place.
- **Milestone** — a zero-duration action (`duration: 0`) marks a milestone within the current model. A dedicated `MILESTONE` TYPE (`05_implementation/milestones/`) is reserved in [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.2 for a future first-class milestone element.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3.
- Layer placement (`05_implementation`): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6, §6.1.
- Materialisation mode and promotion rule: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1, §4 (row: `ACTION`).
- Schedule document inline shape: [views/07-action.md](../views/07-action.md) §5.2.
- DGCA inline shape: [views/02-dgca.md](../views/02-dgca.md) §5.5.
- Action Card binding: [views/18-action-card.md](../views/18-action-card.md) §1, PC-002.
- Time-aware goal relation: [17-relations.md](17-relations.md) §3 (`action_goal` kind).
- Actor ownership: [19-actors.md](19-actors.md).
- Stakeholder interests: [20-stakeholders.md](20-stakeholders.md).
- BDN change linkage: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.3 (`CHANGE`).
- Process-domain Activity (distinct concept): [CONTRACT.md](../CONTRACT.md) §9.
