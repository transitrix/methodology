---
title: "Project Card — single-project narrative view"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-28"
status: "draft"
file_extension: "*.project-card.transitrix.yaml"
---

# Project Card Notation — Reference

**Version:** 0.1
**Status:** Draft
**File extension:** `*.project-card.transitrix.yaml`
**Scope:** A single-project narrative view that answers *"what is this project, why does it exist, and what does it deliver"* on one page. The card binds a project-typed Activity to the FGCA chain it sits in plus its own narrative milestones.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `project-card` |
| File extension | `*.project-card.transitrix.yaml` |

---

## 1. What a Project Card is

A Project Card is a **view** over an existing project Activity. It does not duplicate the activity's data; it references the activity by ID and adds card-specific narrative content — project-level milestones — that does not naturally belong on the activity itself.

A "project" is an Activity with `activity_type: Project` (per the Activities notation, [07-activities.md](07-activities.md) §5.2). No new top-level entity is introduced for projects — the activity hierarchy already expresses what a project is. The Project Card is the **narrative surface** on top of the project activity: dates, motivation chain pulled from FGCA, child activities pulled from the activities document, and narrative milestones that live on the card itself.

The renderer assembles the card from three sources:

1. The card document itself — `notation: project-card` — references the project Activity by ID and declares its narrative milestones.
2. The sibling Activities document(s) in the same view directory — provide the project's `valid_from`, `start_date`, `end_date`, `goals`, `delivers_changes`, and child activities (any activity with `parent` = the project activity's ID).
3. The sibling FGCA document(s) — provide the motivation chain (Factors → Goals → Changes) scoped to the project's declared `goals: []` and `delivers_changes: []`.

The card does not vendor copies of any of this data; the renderer pulls by reference at view time.

---

## 2. When to use this notation

| Use case | Notation |
|---|---|
| Single-page summary of a project for an executive review | Project Card |
| Project network with dates + dependencies + critical path | Activities ([07-activities.md](07-activities.md)) |
| Project's strategic context — factors driving its goals — | FGCA ([02-fgca.md](02-fgca.md)) |
| Programme / portfolio overview across many projects | Out of scope for v0.1 (future) |

The card is **specifically** a single-project view. A multi-project programme deck or a portfolio dashboard would be a separate notation.

---

## 3. Top-level structure

```yaml
notation: project-card
spec_version: "0.1"

project_card:
  id: PROJECT_CARD-EU-PROGRAMME-1                # canonical PROJECT_CARD document ID
  project: ACTIVITY-EU-PROGRAMME-1               # existing project Activity ID; must resolve

  description: >
    A narrative summary of the project's purpose, intended for an
    executive audience. Concise; the activity's full description is
    on the Activity itself.

  milestones:
    - id: MILESTONE-EU-CONFORMITY-CERT-1
      name: "EU MDR conformity-assessment certification obtained"
      date: "2027-01-31"
      description: >
        First product line certified by a notified body; market-access
        gate cleared.
      delivers_changes:
        - CHANGE-EU-COMPLIANCE-1
    - id: MILESTONE-EU-MARKET-LAUNCH-1
      name: "First product line live in EU post-certification"
      date: "2027-03-15"
      description: >
        Sales channel opens to EU customers under the new compliance
        regime.
      delivers_changes:
        - CHANGE-EU-COMPLIANCE-1
```

---

## 4. Fields

### 4.1 Card document

| Field | Required | Description |
|---|---|---|
| `project_card.id` | Yes | Canonical PROJECT_CARD document ID per IDS §1 (`PROJECT_CARD-<DOMAIN>-<INTEGER>`). |
| `project_card.project` | Yes | Canonical ID of the project Activity this card is about. The referenced Activity MUST exist (`PC-001`) and MUST have `activity_type: Project` (`PC-002`). |
| `project_card.description` | No | One-paragraph narrative summary for an executive audience. The full description lives on the referenced Activity. |
| `project_card.milestones` | No | Array of milestone entries (see §4.2). May be empty for cards that have no narrative milestones yet. |

### 4.2 Milestones

Each entry in `milestones[]` is a MILESTONE element. Per IDS §3.1 + §4, MILESTONE IDs are scoped to the parent card document (not the organisation as a whole).

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Document-scoped MILESTONE ID per IDS §1 (`MILESTONE-<MIDDLE>-<INTEGER>`). |
| `name` | Yes | One-line milestone label. |
| `date` | Yes | Date the milestone is reached — quoted ISO 8601 per [CONTRACT.md](CONTRACT.md) §4. |
| `description` | No | Longer-form context for the milestone. |
| `delivers_changes` | No | Array of `CHANGE-…` IDs the milestone delivers. Each entry MUST resolve to a CHANGE that appears in the project Activity's `delivers_changes:` (`PC-003`). |

---

## 5. What the card renders, by source

The renderer assembles the card from references — it does not pull the data from the card YAML itself except for the card-specific milestones.

| Card section | Source |
|---|---|
| **Project name** | `Activity.name` (from the referenced project Activity) |
| **Dates: initiation** | `Activity.valid_from` ([CONTRACT.md](CONTRACT.md) §7 — the decision-to-initiate date) |
| **Dates: planned work** | `Activity.start_date` / `Activity.end_date` (the scheduled work window, distinct from `valid_from` per [07-activities.md](07-activities.md) Element lifecycle) |
| **Milestones (timeline)** | `project_card.milestones[]` in this document |
| **Motivation chain — Factors** | FGCA documents in the same view directory; included when the Factor's downstream goals include any goal the project activity references via `Activity.goals` |
| **Motivation chain — Goals** | The goals the project activity declares (`Activity.goals: [GOAL-…]`), expanded to their definitions in the FGCA document(s) |
| **Motivation chain — Changes** | The changes the project activity declares it delivers (`Activity.delivers_changes: [CHANGE-…]`), expanded to their definitions in the FGCA document(s) |
| **Child activities** | Activities documents in the same view directory; any activity where `parent` = the project activity's ID |

The card document itself stays small. Adopters editing a card only touch the card-specific narrative (description + milestones); changes to the project Activity, its goals, its changes, or its children happen in their own canonical documents.

---

## 6. File location and naming

```
views/project-cards/<DOMAIN>.project-card.transitrix.yaml
```

One card per file. The card lives alongside the FGCA / Activities documents it draws from; a card and the activities document holding its referenced project Activity are typically in the same view directory so renderers can resolve references without searching the full tree.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `PC-001` | error | `project_card.project` is missing, malformed, or does not resolve to an admitted Activity in canon. |
| `PC-002` | error | The Activity referenced by `project_card.project` has `activity_type` other than `Project` (per [07-activities.md](07-activities.md) §5.2). |
| `PC-003` | error | A `milestone.delivers_changes[]` entry references a `CHANGE-…` that is not in the project Activity's own `delivers_changes:`. The milestone cannot deliver a change the project isn't committed to. |
| `PC-004` | warning | A `milestone.date` falls outside `[Activity.valid_from, Activity.valid_to]`. A milestone before the project initiated or after it ended is suspicious. |

The shared header (`HDR-001..004`, [CONTRACT.md](CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](CONTRACT.md) §7.3) rules apply to project-card files in addition to PC-001..004. The card document itself carries `valid_from` / `valid_to` per the lifecycle contract — the card's window is when the narrative artefact is in effect; the project Activity has its own independent lifecycle.

---

## 8. Reconciliation with 07-activities §5.9 schedule milestones

The Activities notation already defines a "milestone" — a zero-duration activity used for critical-path computation ([07-activities.md](07-activities.md) §5.9). The Project Card introduces a **separate** MILESTONE element for narrative gates.

The two are deliberately distinct:

| Aspect | Schedule milestone ([07-activities.md](07-activities.md) §5.9) | Project-card milestone (this notation) |
|---|---|---|
| What it is | An Activity with `duration: 0` | A MILESTONE element inside a Project Card |
| Where it lives | Activities document | Project Card document |
| Why it exists | To anchor a date on the critical-path computation | To anchor a date in the project narrative (decision gate, certification, programme-level marker) |
| Renderer | Activities Network view (diamond on the timeline) | Project Card view (milestone in the card's timeline section) |

Both may coexist for the same calendar date: a Project Card milestone "EU MDR certification obtained 2027-01-31" can live alongside a zero-duration Activity `M-EU-CERT-2027` with the same date in the scheduling document. The two are linked at the renderer level through their common date and the activity's parent project, not via a stored cross-reference.

---

## 9. Evolution (v0.1 → future)

Pending design work (separate epics):

- **Stakeholders / Actors block on the card.** v0.1 ships without a stakeholders section. A future epic introduces an Actors or Stakeholders notation and extends the Project Card with a stakeholders block referencing those elements.
- **Programme card.** A multi-project view (a programme of related projects) is a separate notation, not a generalisation of this single-project card.
- **Card status field.** The card itself currently has no explicit status (e.g. "draft" / "active" / "archived"). The project Activity's lifecycle (`valid_to: null` vs a set date) already encodes whether the project is active; if the card needs its own status separate from the project's, a future revision can add it.

---

## 10. References

- TYPE registry: [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.1 (`MILESTONE`), §3.2 (`PROJECT_CARD` document type), §4 (uniqueness scope — both document-scoped).
- The project Activity TYPE this card binds: [07-activities.md](07-activities.md) §5.2 (`activity_type: Project`).
- Schedule milestones — distinct from project-card milestones: [07-activities.md](07-activities.md) §5.9.
- Motivation chain the card pulls: [02-fgca.md](02-fgca.md) (FGCA).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](CONTRACT.md) §5–7.
