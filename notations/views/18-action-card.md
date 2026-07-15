---
notation: "Action Card"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-06-25"
status: "draft"
file_extension: "*.action-card.transitrix.yaml"
---

# Action Card Notation — Reference

**Version:** 0.1
**Status:** Draft
**File extension:** `*.action-card.transitrix.yaml`
**Scope:** A single-project narrative view that answers *"what is this project, why does it exist, and what does it deliver"* on one page. The card binds a project-typed Action to the DGCA chain it sits in plus its own narrative milestones.
**Renderer:** Transitrix Studio (planned)

**Deprecated alias.** The former notation key `activity-card` and file extension `*.activity-card.transitrix.yaml` are accepted with a `PC-005` warning.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `action-card` |
| File extension | `*.action-card.transitrix.yaml` |
| Deprecated `notation:` alias | `activity-card` |
| Deprecated file extension alias | `*.activity-card.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `action-card` (per [CONTRACT.md](../CONTRACT.md)). Deprecated alias: `activity-card`. |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `action_card` | yes | object | the action card root — see §3 and §4. Deprecated alias: `activity_card`. |

Example header:

```yaml
notation: action-card
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
action_card:
  # ... see §3
```

---

## 1. What an Action Card is

An Action Card is a **view** over an existing project Action. It does not duplicate the action's data; it references the action by ID and adds card-specific narrative content — project-level milestones — that does not naturally belong on the action itself.

A "project" is an Action at the project scale of the recursive ACTION hierarchy (initiative → programme → project → task, all one TYPE per [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.1/§7.4). No new top-level entity is introduced for projects — the action hierarchy already expresses what a project is. The Action Card is the **narrative surface** on top of the project action: dates, motivation chain, child actions, and narrative milestones that live on the card itself.

**View-purity.** Like every other view, the Action Card is a *projection over the canonical elements and relations* ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1) — it never reads from other view documents (`*.action.*`, `*.dgca.*`). The renderer assembles the card from two canonical sources plus the card itself:

1. The card document itself — `notation: action-card` — references the project Action by ID and declares its narrative milestones.
2. The **canon element store** (`canon/elements/**`) — the project ACTION element (`valid_from`, `start_date`, `end_date`, `delivers_changes`) and its child ACTION elements (any action with `parent` = the project's ID); the DRIVER / GOAL / CHANGE elements the motivation chain expands (`goal.factors`, `change.goals` carried inline on the elements).
3. The **canon relation store** (`canon/relations/**`) — the project's goals come from the first-class `action_goal` relations (`from` = the project ID); see [17-relations.md](../elements/17-relations.md) §3. The action element's transitional inline `goals: []` is used only as a fallback when no such relation exists.

The card does not vendor copies of any of this data; the renderer pulls by reference at view time.

---

## 2. When to use this notation

| Use case | Notation |
|---|---|
| Single-page summary of a project for an executive review | Action Card |
| Project network with dates + dependencies + critical path | Action schedule ([07-action.md](07-action.md)) |
| Project's strategic context — drivers underlying its goals | DGCA ([02-dgca.md](02-dgca.md)) |
| Programme / portfolio overview across many projects | Out of scope for v0.1 (future) |

The card is **specifically** a single-project view. A multi-project programme deck or a portfolio dashboard would be a separate notation.

---

## 3. Top-level structure

```yaml
notation: action-card
spec_version: "0.1"
name: "EU Programme Action Card"        # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4

action_card:
  id: ACTION_CARD-EU-PROGRAMME-1                # canonical ACTION_CARD document ID
  project: ACTION-EU-PROGRAMME-1               # existing project Action ID; must resolve

  description: >
    A narrative summary of the project's purpose, intended for an
    executive audience. Concise; the action's full description is
    on the Action itself.

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
| `action_card.id` | Yes | Canonical ACTION_CARD document ID per IDS §1 (`ACTION_CARD-<DOMAIN>-<INTEGER>`). |
| `action_card.project` | Yes | Canonical ID of the project Action this card is about. The referenced Action MUST exist (`PC-001`) and MUST have `type: Project` (`PC-002`). |
| `action_card.description` | No | One-paragraph narrative summary for an executive audience. The full description lives on the referenced Action. |
| `action_card.milestones` | No | Array of milestone entries (see §4.2). May be empty for cards that have no narrative milestones yet. |

### 4.2 Milestones

Each entry in `milestones[]` is a MILESTONE element. Per IDS §3.1 + §4, MILESTONE IDs are scoped to the parent card document (not the organisation as a whole).

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Document-scoped MILESTONE ID per IDS §1 (`MILESTONE-<MIDDLE>-<INTEGER>`). |
| `name` | Yes | One-line milestone label. |
| `date` | Yes | Date the milestone is reached — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `description` | No | Longer-form context for the milestone. |
| `delivers_changes` | No | Array of `CHANGE-…` IDs the milestone delivers. Each entry MUST resolve to a CHANGE that appears in the project Action's `delivers_changes:` (`PC-003`). |

---

## 5. What the card renders, by source

The renderer assembles the card from references into the canon element + relation store — it does not pull the data from the card YAML itself except for the card-specific milestones.

| Card section | Source |
|---|---|
| **Project name** | `ACTION.name` (the project ACTION element in `canon/elements/`) |
| **Dates: initiation** | `ACTION.valid_from` ([CONTRACT.md](../CONTRACT.md) §7 — the decision-to-initiate date) |
| **Dates: planned work** | `ACTION.start_date` / `ACTION.end_date` (the scheduled work window, distinct from `valid_from`) |
| **Milestones (timeline)** | `action_card.milestones[]` in this document |
| **Motivation chain — Goals** | The goals the project serves, read from the `action_goal` relations in `canon/relations/` (`from` = the project ID); falls back to the project ACTION's transitional inline `goals: []` when no relation exists |
| **Motivation chain — Changes** | The changes the project delivers (`ACTION.delivers_changes: [CHANGE-…]`), expanded to their CHANGE element definitions in `canon/elements/` |
| **Motivation chain — Drivers** | The DRIVER elements referenced by the in-scope goals (`GOAL.factors: [DRIVER-…]`, carried inline on the GOAL element) |
| **Child actions** | ACTION elements in `canon/elements/` whose inline `parent` = the project's ID |

The card document itself stays small. Adopters editing a card only touch the card-specific narrative (description + milestones); changes to the project Action, its goals, its changes, or its children happen in their own canonical element / relation files.

### 5.1 ArchiMate-class rendering convention

When a renderer displays `ACTION` and `MILESTONE` nodes on the card, it **SHOULD** append the node's ArchiMate class in parentheses after the name. This reinforces the methodology ↔ ArchiMate alignment and helps a reader map a card back to standard vocabulary.

| TYPE | ArchiMate class |
|---|---|
| `ACTION` | Work Package |
| `MILESTONE` | Implementation Event |

Rendered example:

- Action node label: `Launch new product (Work Package)`
- Milestone node label: `Beta release (Implementation Event)`

This is a **renderer-side convention, not a data field** — the class is derived from the node's TYPE. Adopters do **not** add an `archimate_class:` key to the YAML. (The `ACTION` → Work Package mapping is the recursive Implementation & Migration model settled in the Actors decision; see [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §6.1.) Scope of this convention is the Action Card; extending it to other view notations is a separate proposal.

---

## 6. File location and naming

```
views/action-cards/<DOMAIN>.action-card.transitrix.yaml
```

One card per file, under the org's `canon/views/`. The card resolves its references against the canon element and relation store (`canon/elements/**`, `canon/relations/**`) of the same organisation, located by walking up to the `canon/` root above the card — not against sibling documents in the card's own directory.

### 6.1 Canonical reference resolution scope

When resolving `action_card.project`, a conformant validator MUST search `canon/elements/` **recursively** — every `.yaml` file under the full `canon/elements/**` tree reached by walking up to the `canon/` root from the card file. The validator MUST NOT stop at a fixed subfolder (e.g. `canon/elements/actions/` only) — the ACTION element may live under any implementation-layer subfolder such as `canon/elements/05_implementation/actions/`.

Resolution lookup order:

1. **`canon/elements/**`** (recursive, primary) — the canonical element store. An ACTION-* file found here is the authoritative source.
2. **`canon/views/actions/**`** (secondary fallback) — when the ACTION ID appears in an action view file rather than a standalone element file, the validator MAY surface it here. A validator using this fallback SHOULD warn that the element is referenced via a view rather than the element store.

A validator that cannot find the ID after exhausting both paths MUST raise `PC-001`.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `PC-001` | error | `action_card.project` is missing, malformed, or does not resolve to an admitted ACTION element after exhausting the canonical resolution scope (§6.1). The validator MUST search `canon/elements/**` recursively and then `canon/views/actions/**` before raising this error. The diagnostic MUST disclose the paths searched (e.g. `canon/elements/`, `canon/views/actions/`) and include an actionable hint naming the expected file pattern (`canon/elements/05_implementation/actions/ACTION-<DOMAIN>-<INTEGER>.yaml`). |
| `PC-002` | error | The ACTION referenced by `action_card.project` carries an explicit non-project scale marker. In the element model all action scales share one ACTION TYPE (§1), so a missing/unmarked value is accepted; only an explicit non-project marker is flagged. The canonical project-identification rule is under revision (tracked separately). |
| `PC-003` | error | A `milestone.delivers_changes[]` entry references a `CHANGE-…` that is not in the project Action's own `delivers_changes:`. The milestone cannot deliver a change the project isn't committed to. |
| `PC-004` | warning | A `milestone.date` falls outside `[Action.valid_from, Action.valid_to]`. A milestone before the project initiated or after it ended is suspicious. |
| `PC-005` | warning | Deprecated alias detected: `notation: activity-card`, `activity_card:` root field, or file extension `*.activity-card.transitrix.yaml`. Migrate to `action-card` / `action_card:` / `*.action-card.transitrix.yaml`. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to action-card files in addition to PC-001..005. The card document itself carries `valid_from` / `valid_to` per the lifecycle contract — the card's window is when the narrative artefact is in effect; the project Action has its own independent lifecycle.

---

## 8. Reconciliation with 07-action §5.9 schedule milestones

The Action schedule notation already defines a "milestone" — a zero-duration action used for critical-path computation ([07-action.md](07-action.md) §5.9). The Action Card introduces a **separate** MILESTONE element for narrative gates.

The two are deliberately distinct:

| Aspect | Schedule milestone ([07-action.md](07-action.md) §5.9) | Action-card milestone (this notation) |
|---|---|---|
| What it is | An Action with `duration: 0` | A MILESTONE element inside an Action Card |
| Where it lives | Action schedule document | Action Card document |
| Why it exists | To anchor a date on the critical-path computation | To anchor a date in the project narrative (decision gate, certification, programme-level marker) |
| Renderer | Action schedule Network view (diamond on the timeline) | Action Card view (milestone in the card's timeline section) |

Both may coexist for the same calendar date: an Action Card milestone "EU MDR certification obtained 2027-01-31" can live alongside a zero-duration Action `M-EU-CERT-2027` with the same date in the scheduling document. The two are linked at the renderer level through their common date and the action's parent project, not via a stored cross-reference.

---

## 9. Evolution (v0.1 → future)

Pending design work (separate epics):

- **Stakeholders / Actors block on the card.** v0.1 ships without a stakeholders section. A future epic introduces an Actors or Stakeholders notation and extends the Action Card with a stakeholders block referencing those elements.
- **Programme card.** A multi-project view (a programme of related projects) is a separate notation, not a generalisation of this single-action card.
- **Card status field.** The card itself currently has no explicit status (e.g. "draft" / "active" / "archived"). The project Action's lifecycle (`valid_to: null` vs a set date) already encodes whether the project is active; if the card needs its own status separate from the project's, a future revision can add it.

---

## 10. References

- TYPE registry: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (`MILESTONE`), §3.2 (`ACTION_CARD` document type), §4 (uniqueness scope — both document-scoped).
- The project Action TYPE this card binds: [07-action.md](07-action.md) §5.2 (`type: Project`).
- Schedule milestones — distinct from action-card milestones: [07-action.md](07-action.md) §5.9.
- Motivation chain the card pulls: [02-dgca.md](02-dgca.md) (DGCA).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5–7.
