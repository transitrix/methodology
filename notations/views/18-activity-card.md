---
notation: "Activity Card"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-11"
status: "draft"
file_extension: "*.activity-card.transitrix.yaml"
---

# Activity Card Notation — Reference

**Version:** 0.1
**Status:** Draft
**File extension:** `*.activity-card.transitrix.yaml`
**Scope:** A single-project narrative view that answers *"what is this project, why does it exist, and what does it deliver"* on one page. The card binds a project-typed Activity to the FGCA chain it sits in plus its own narrative milestones.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `activity-card` |
| File extension | `*.activity-card.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `activity-card` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `activity_card` | yes | object | the activity card root — see §3 and §4 |

Example header:

```yaml
notation: activity-card
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
activity_card:
  # ... see §3
```

---

## 1. What an Activity Card is

An Activity Card is a **view** over an existing project Activity. It does not duplicate the activity's data; it references the activity by ID and adds card-specific narrative content — project-level milestones — that does not naturally belong on the activity itself.

A "project" is an Activity at the project scale of the recursive ACTIVITY hierarchy (initiative → programme → project → task, all one TYPE per [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.1/§7.4). No new top-level entity is introduced for projects — the activity hierarchy already expresses what a project is. The Activity Card is the **narrative surface** on top of the project activity: dates, motivation chain, child activities, and narrative milestones that live on the card itself.

**View-purity.** Like every other view, the Activity Card is a *projection over the canonical elements and relations* ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1) — it never reads from other view documents (`*.activities.*`, `*.dgca.*`). The renderer assembles the card from two canonical sources plus the card itself:

1. The card document itself — `notation: activity-card` — references the project Activity by ID and declares its narrative milestones.
2. The **canon element store** (`canon/elements/**`) — the project ACTIVITY element (`valid_from`, `start_date`, `end_date`, `delivers_changes`) and its child ACTIVITY elements (any activity with `parent` = the project's ID); the DRIVER / GOAL / CHANGE elements the motivation chain expands (`goal.factors`, `change.goals` carried inline on the elements).
3. The **canon relation store** (`canon/relations/**`) — the project's goals come from the first-class `activity_goal` relations (`from` = the project ID); see [17-relations.md](../elements/17-relations.md) §3. The activity element's transitional inline `goals: []` is used only as a fallback when no such relation exists.

The card does not vendor copies of any of this data; the renderer pulls by reference at view time.

---

## 2. When to use this notation

| Use case | Notation |
|---|---|
| Single-page summary of a project for an executive review | Activity Card |
| Project network with dates + dependencies + critical path | Activities ([07-activities.md](07-activities.md)) |
| Project's strategic context — drivers underlying its goals — | DGCA ([02-dgca.md](02-dgca.md)) |
| Programme / portfolio overview across many projects | Out of scope for v0.1 (future) |

The card is **specifically** a single-project view. A multi-project programme deck or a portfolio dashboard would be a separate notation.

---

## 3. Top-level structure

```yaml
notation: activity-card
spec_version: "0.1"
name: "EU Programme Activity Card"      # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4

activity_card:
  id: ACTIVITY_CARD-EU-PROGRAMME-1                # canonical ACTIVITY_CARD document ID
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
| `activity_card.id` | Yes | Canonical ACTIVITY_CARD document ID per IDS §1 (`ACTIVITY_CARD-<DOMAIN>-<INTEGER>`). |
| `activity_card.project` | Yes | Canonical ID of the project Activity this card is about. The referenced Activity MUST exist (`PC-001`) and MUST have `activity_type: Project` (`PC-002`). |
| `activity_card.description` | No | One-paragraph narrative summary for an executive audience. The full description lives on the referenced Activity. |
| `activity_card.milestones` | No | Array of milestone entries (see §4.2). May be empty for cards that have no narrative milestones yet. |

### 4.2 Milestones

Each entry in `milestones[]` is a MILESTONE element. Per IDS §3.1 + §4, MILESTONE IDs are scoped to the parent card document (not the organisation as a whole).

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Document-scoped MILESTONE ID per IDS §1 (`MILESTONE-<MIDDLE>-<INTEGER>`). |
| `name` | Yes | One-line milestone label. |
| `date` | Yes | Date the milestone is reached — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `description` | No | Longer-form context for the milestone. |
| `delivers_changes` | No | Array of `CHANGE-…` IDs the milestone delivers. Each entry MUST resolve to a CHANGE that appears in the project Activity's `delivers_changes:` (`PC-003`). |

---

## 5. What the card renders, by source

The renderer assembles the card from references into the canon element + relation store — it does not pull the data from the card YAML itself except for the card-specific milestones.

| Card section | Source |
|---|---|
| **Project name** | `ACTIVITY.name` (the project ACTIVITY element in `canon/elements/`) |
| **Dates: initiation** | `ACTIVITY.valid_from` ([CONTRACT.md](../CONTRACT.md) §7 — the decision-to-initiate date) |
| **Dates: planned work** | `ACTIVITY.start_date` / `ACTIVITY.end_date` (the scheduled work window, distinct from `valid_from`) |
| **Milestones (timeline)** | `activity_card.milestones[]` in this document |
| **Motivation chain — Goals** | The goals the project serves, read from the `activity_goal` relations in `canon/relations/` (`from` = the project ID); falls back to the project ACTIVITY's transitional inline `goals: []` when no relation exists |
| **Motivation chain — Changes** | The changes the project delivers (`ACTIVITY.delivers_changes: [CHANGE-…]`), expanded to their CHANGE element definitions in `canon/elements/` |
| **Motivation chain — Drivers** | The DRIVER elements referenced by the in-scope goals (`GOAL.factors: [DRIVER-…]`, carried inline on the GOAL element) |
| **Child activities** | ACTIVITY elements in `canon/elements/` whose inline `parent` = the project's ID |

The card document itself stays small. Adopters editing a card only touch the card-specific narrative (description + milestones); changes to the project Activity, its goals, its changes, or its children happen in their own canonical element / relation files.

### 5.1 ArchiMate-class rendering convention

When a renderer displays `ACTIVITY` and `MILESTONE` nodes on the card, it **SHOULD** append the node's ArchiMate class in parentheses after the name. This reinforces the methodology ↔ ArchiMate alignment and helps a reader map a card back to standard vocabulary.

| TYPE | ArchiMate class |
|---|---|
| `ACTIVITY` | Work Package |
| `MILESTONE` | Implementation Event |

Rendered example:

- Activity node label: `Launch new product (Work Package)`
- Milestone node label: `Beta release (Implementation Event)`

This is a **renderer-side convention, not a data field** — the class is derived from the node's TYPE. Adopters do **not** add an `archimate_class:` key to the YAML. (The `ACTIVITY` → Work Package mapping is the recursive Implementation & Migration model settled in the Actors decision; see [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §6.1.) Scope of this convention is the Activity Card; extending it to other view notations is a separate proposal.

---

## 6. File location and naming

```
views/activity-cards/<DOMAIN>.activity-card.transitrix.yaml
```

One card per file, under the org's `canon/views/`. The card resolves its references against the canon element and relation store (`canon/elements/**`, `canon/relations/**`) of the same organisation, located by walking up to the `canon/` root above the card — not against sibling documents in the card's own directory.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `PC-001` | error | `activity_card.project` is missing, malformed, or does not resolve to an admitted ACTIVITY element in canon. |
| `PC-002` | error | The ACTIVITY referenced by `activity_card.project` carries an explicit non-project scale marker. In the element model all activity scales share one ACTIVITY TYPE (§1), so a missing/unmarked value is accepted; only an explicit non-project marker is flagged. The canonical project-identification rule is under revision (tracked separately). |
| `PC-003` | error | A `milestone.delivers_changes[]` entry references a `CHANGE-…` that is not in the project Activity's own `delivers_changes:`. The milestone cannot deliver a change the project isn't committed to. |
| `PC-004` | warning | A `milestone.date` falls outside `[Activity.valid_from, Activity.valid_to]`. A milestone before the project initiated or after it ended is suspicious. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to activity-card files in addition to PC-001..004. The card document itself carries `valid_from` / `valid_to` per the lifecycle contract — the card's window is when the narrative artefact is in effect; the project Activity has its own independent lifecycle.

---

## 8. Reconciliation with 07-activities §5.9 schedule milestones

The Activities notation already defines a "milestone" — a zero-duration activity used for critical-path computation ([07-activities.md](07-activities.md) §5.9). The Activity Card introduces a **separate** MILESTONE element for narrative gates.

The two are deliberately distinct:

| Aspect | Schedule milestone ([07-activities.md](07-activities.md) §5.9) | Activity-card milestone (this notation) |
|---|---|---|
| What it is | An Activity with `duration: 0` | A MILESTONE element inside an Activity Card |
| Where it lives | Activities document | Activity Card document |
| Why it exists | To anchor a date on the critical-path computation | To anchor a date in the project narrative (decision gate, certification, programme-level marker) |
| Renderer | Activities Network view (diamond on the timeline) | Activity Card view (milestone in the card's timeline section) |

Both may coexist for the same calendar date: an Activity Card milestone "EU MDR certification obtained 2027-01-31" can live alongside a zero-duration Activity `M-EU-CERT-2027` with the same date in the scheduling document. The two are linked at the renderer level through their common date and the activity's parent project, not via a stored cross-reference.

---

## 9. Evolution (v0.1 → future)

Pending design work (separate epics):

- **Stakeholders / Actors block on the card.** v0.1 ships without a stakeholders section. A future epic introduces an Actors or Stakeholders notation and extends the Activity Card with a stakeholders block referencing those elements.
- **Programme card.** A multi-project view (a programme of related projects) is a separate notation, not a generalisation of this single-activity card.
- **Card status field.** The card itself currently has no explicit status (e.g. "draft" / "active" / "archived"). The project Activity's lifecycle (`valid_to: null` vs a set date) already encodes whether the project is active; if the card needs its own status separate from the project's, a future revision can add it.

---

## 10. References

- TYPE registry: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (`MILESTONE`), §3.2 (`ACTIVITY_CARD` document type), §4 (uniqueness scope — both document-scoped).
- The project Activity TYPE this card binds: [07-activities.md](07-activities.md) §5.2 (`activity_type: Project`).
- Schedule milestones — distinct from activity-card milestones: [07-activities.md](07-activities.md) §5.9.
- Motivation chain the card pulls: [02-dgca.md](02-dgca.md) (DGCA).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5–7.
