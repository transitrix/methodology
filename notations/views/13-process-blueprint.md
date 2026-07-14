---
notation: "Process Blueprint"
version: "0.4"
author: "Valerii Korobeinikov"
last_updated: "2026-07-05"
status: "draft"
file_extension: "*.process-blueprint.transitrix.yaml"
dsm_status: "not implemented — render module planned in Transitrix Studio (sibling task)"
---

# Process Blueprint Notation — Reference

**Scope:** A wide, single-page blueprint that maps each stage of a value chain to its supporting aspects — systems, actors, equipment, information entities — together with the stage's goal and result. Authored as YAML, rendered as a horizontal grid of nested boxes (stage boxes containing aspect boxes).
**Renderer:** Transitrix Studio (planned) — uses the same diagram engine as the Goals notation. Not Svgbob.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all fifteen Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `process-blueprint` |
| File extension | `*.process-blueprint.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `process-blueprint` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `process_blueprint` | yes | object | the process blueprint root — see §4 and §5 |

Example header:

```yaml
notation: process-blueprint
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
process_blueprint:
  # ... see §4
```

---

## Element lifecycle

This notation's inline arrays split into two groups for lifecycle purposes:

- **Document-local arrays** — `stages[]`, `systems[]`, `actors[]`, `equipment[]`. These entries are scoped to the blueprint document and do not carry their own lifecycle. `EQUIPMENT-…` IDs are notation-local in v0.1 (promotable to an org-wide catalogue without renaming — the IDs already conform to the canonical grammar). When a `systems[]` or `actors[]` entry references a registered element (an `APPLICATION-…` or `ROLE-…`), the lifecycle lives on that target's canonical file.
- **Canonical-TYPE entries** — `business_objects[]` (`BUSINESS_OBJECT`). `BUSINESS_OBJECT` has an org-wide catalogue at `canon/elements/02_business/business-objects/` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1, ADR 2026-06-08). Entries with a `BUSINESS_OBJECT-…` `id` reference that catalogue and carry the canonical primitive lifecycle (`valid_from` / `valid_to`) per [CONTRACT.md](../CONTRACT.md) §7. Inline entries without an `id` are free-form labels (document-local only).
- **Deprecated** — `information_entities[]` (`INFORMATION_ENTITY`). Use `business_objects[]` instead (renamed for ArchiMate alignment). See [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §6 and the migration recipe in `migrations/0.5-to-0.6/`. Validators emit `BOBJ-D001` for this field.

The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7. Per [CONTRACT.md](../CONTRACT.md) §7.1, the process-blueprint document itself does not carry a lifecycle field.

---

## 1. Overview

A **process blueprint** answers the question: **for each stage of a value chain, what does it take to operate that stage?**

The blueprint is a single, wide diagram. The horizontal axis is the value chain — stages laid out left-to-right in their operating order. The vertical structure inside each stage is its supporting context, grouped into aspect lanes:

- **Systems** — applications and platforms used in the stage.
- **Actors** — roles and people who carry out the stage.
- **Equipment** — physical instruments, devices, or facilities the stage depends on.
- **Information entities** — the data, documents, and records produced or consumed.
- **Compliance** *(opt-in, derived)* — the regulatory obligations that bind each stage, computed from the assertion + requirement + codex graph. No compliance data is stored in the blueprint; the lane is a read-only projection. See §5.4.

Each stage also carries an explicit **goal** (what the stage should achieve) and a **result** (the deliverable that exits the stage).

The blueprint is a **view**, not a flow. It does not describe procedural sequencing within a stage — that is the job of BPMN. It does not decompose strategy — that is the job of DGCA / Goals. It is the operational blueprint of a value chain at a glance.

---

## 2. When to use this notation

| Need | Use |
|---|---|
| Show, on one page, every operational ingredient required to run a value chain end-to-end | **Process Blueprint** |
| Describe the procedural flow inside a single process (lanes, gateways, sequence flows) | BPMN (`*.bpmn.transitrix.yaml`) |
| Catalogue the full set of processes in the organisation | Process landscape map (`*.process-map.transitrix.yaml`) |
| Decompose strategy into drivers, goals, changes, and activities | DGCA (`*.dgca.transitrix.yaml`) |
| Show a multi-level architectural overview as nested containers (what contains what) | Nested blocks (`*.blocks.transitrix.yaml`) |

A blueprint complements BPMN and the process landscape map. BPMN renders one process's internal flow; the landscape map lists all processes; the blueprint shows, for one value chain, the cross-cutting operational context behind each stage.

---

## 3. File location and naming

```
views/process-blueprint/<DOMAIN>.process-blueprint.transitrix.yaml
```

Examples:
- `views/process-blueprint/ORDER_FULFILMENT.process-blueprint.transitrix.yaml`
- `views/process-blueprint/CUSTOMER_ONBOARDING.process-blueprint.transitrix.yaml`

---

## 4. Top-level structure — flat form

Process Blueprint uses the **flat form**. The document carries a single `process_blueprint:` root key with parallel arrays: `stages[]` and one array per aspect category (`systems[]`, `actors[]`, `equipment[]`, `information_entities[]`). Each aspect entry references the stages it appears in via a `stages: [STAGE-…]` cross-reference field.

This shape matches the blueprint's semantic graph: a single system or actor typically spans several stages (one Order Management application is used in Receive, Validate, and Update Inventory); a nested form would force the same element to be duplicated in every stage it touches. The flat form expresses the M:N relation directly. The family-wide rule "nested for trees, flat for DAGs" — set on 2026-05-20 alongside the DGCA schema — places Process Blueprint on the flat side. See [README.md](../README.md) § Family selection.

```yaml
notation: process-blueprint
spec_version: "0.1"
name: "Order fulfilment blueprint"      # required per CONTRACT.md §1.1
generated_at: "2026-05-21"             # optional per CONTRACT.md §4

process_blueprint:
  id: PROCESS_BLUEPRINT-FULFIL-1
  name: "Order fulfilment blueprint"
  description: "End-to-end blueprint of the order fulfilment value chain."
  period: "2026"
  version: "0.1"
  author: "Valerii Korobeinikov"

  stages:
    - id: STAGE-1
      name: "Receive order"
      goal: "Capture a validated customer order."
      result: "Validated order record in OMS."
    - id: STAGE-2
      name: "Pick & pack"
      goal: "Assemble the physical order from inventory."
      result: "Packed shipment ready for carrier handover."
    - id: STAGE-3
      name: "Ship"
      goal: "Hand the shipment to the carrier and notify the customer."
      result: "In-transit shipment with tracking number sent to the customer."

  systems:
    - id: APPLICATION-OMS-1
      name: "Order Management"
      stages: [STAGE-1, STAGE-2, STAGE-3]
    - name: "Legacy CRM"
      stages: [STAGE-1]

  actors:
    - id: ROLE-CUSTOMER-SVC-1
      name: "Customer service"
      stages: [STAGE-1]
    - id: ROLE-WAREHOUSE-OP-1
      name: "Warehouse operator"
      stages: [STAGE-2, STAGE-3]

  equipment:
    - name: "Barcode scanner"
      stages: [STAGE-2, STAGE-3]

  information_entities:
    - name: "Customer order"
      stages: [STAGE-1, STAGE-2, STAGE-3]
    - name: "Shipment manifest"
      stages: [STAGE-3]
```

A complete example: [`examples/process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml`](../examples/process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml).

---

## 5. Fields

### 5.1 `process_blueprint` root

| Field | Required | Description |
|---|---|---|
| `process_blueprint.id` | yes | document ID — `PROCESS_BLUEPRINT-[<middle>-]<INTEGER>` per the canonical grammar |
| `process_blueprint.name` | yes | human-readable name |
| `process_blueprint.description` | no | one-paragraph context |
| `process_blueprint.period` | no | time period the blueprint reflects (e.g. `"2026"`, `"2026-Q3"`) |
| `process_blueprint.version` | no | document version |
| `process_blueprint.date` | no | document date (YYYY-MM-DD) |
| `process_blueprint.author` | no | document author |
| `process_blueprint.process` | no | cross-reference to a `PROCESS-…` element in the process catalogue, when the blueprint corresponds to one named process |
| `process_blueprint.scenario` | no | cross-reference to a `SCENARIO-…` element, when the blueprint is scoped to a planning scenario |
| `process_blueprint.stages` | yes | array of stage entries — see §5.2 |
| `process_blueprint.systems` | no | array of system entries — see §5.3 |
| `process_blueprint.actors` | no | array of actor entries — see §5.3 |
| `process_blueprint.equipment` | no | array of equipment entries — see §5.3 |
| `process_blueprint.business_objects` | no | array of business-object entries — see §5.3 |
| `process_blueprint.information_entities` | no *(deprecated)* | **Deprecated** — use `business_objects` instead. [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §6; validator emits `BOBJ-D001`. |
| `lane_config` | no | optional rendering-config block controlling which lanes are visible — see §5.4 |

The four authored aspect arrays are each optional individually; a blueprint MAY omit any aspect that does not apply (a fully digital process may have no `equipment:`, for example). At least one aspect array SHOULD be present — a blueprint with stages but no aspects renders as an empty grid and provides no operational context. The compliance lane (§5.4) is a fifth, opt-in, derived lane; it requires no authored array.

### 5.2 `stages[]`

A stage is a column in the rendered blueprint. The array order defines the left-to-right rendering order. A stage MUST NOT reference predecessor stages — blueprints are not flow diagrams; sequencing comes from array order alone.

| Field | Required | Description |
|---|---|---|
| `id` | yes | `STAGE-[<middle>-]<INTEGER>`; unique within the document |
| `name` | yes | stage name as shown in the rendered box header |
| `goal` | yes | what this stage should achieve, in one short sentence |
| `result` | yes | the deliverable that exits this stage, in one short sentence |
| `description` | no | one-paragraph elaboration |

### 5.3 Aspect entries — `systems[]`, `actors[]`, `equipment[]`, `information_entities[]`

All four aspect arrays share the same entry shape. Each entry is an object with at least a `name`; an `id` is optional and recommended whenever the element exists in an organisational catalogue.

| Field | Required | Description |
|---|---|---|
| `id` | no | cross-reference to an element in an organisational catalogue. When present, MUST follow the canonical grammar `<TYPE>-[<middle>-]<INTEGER>`. The TYPE prefix is fixed per aspect category — see the table below. |
| `name` | yes | label as shown in the rendered aspect box |
| `stages` | yes | non-empty array of `STAGE-…` IDs naming every stage this aspect appears in. The renderer draws the entry inside each listed stage's aspect box. |
| `description` | no | one-paragraph elaboration |

#### TYPE prefix per aspect category

| Aspect | Canonical TYPE prefix | Catalogue source |
|---|---|---|
| `systems[]` | `APPLICATION-…` | applications catalogue (`*.applications.transitrix.yaml`) |
| `actors[]` | `ROLE-…` | roles in the organisation's element catalogue |
| `equipment[]` | `EQUIPMENT-…` | notation-local in v0.1; promotable to a catalogue (see below) |
| `business_objects[]` | `BUSINESS_OBJECT-…` | org-wide catalogue at `canon/elements/02_business/business-objects/` (ADR 2026-06-08); entries may be inline (no `id`) or catalogue-referenced (with `BUSINESS_OBJECT-…` `id`) |
| `information_entities[]` *(deprecated)* | `INFORMATION_ENTITY-…` | **Deprecated** — use `business_objects[]`; see [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §6 |

For every aspect category, an entry with an `id` MUST use the TYPE prefix listed above. An entry without an `id` is a free-form label — useful for sketches and for elements that have not yet been promoted into a catalogue.

`systems[]` and `actors[]` cross-reference established catalogues: `APPLICATION-…` resolves into the applications catalogue (`*.applications.transitrix.yaml`); `ROLE-…` resolves into the organisation's roles list. A validator MUST resolve these references against the relevant catalogue once cross-document linking is wired up.

`EQUIPMENT` was registered alongside `PROCESS_BLUEPRINT` (see [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1). No organisation-wide catalogue is mandated for `EQUIPMENT` in v0.1: an entry's `id` is currently a document-local typed label, scoped to the blueprint that declares it. If and when a catalogue is introduced, the IDs already conform to the canonical grammar and can be promoted out of the blueprint without renaming.

`BUSINESS_OBJECT` replaces the deprecated `INFORMATION_ENTITY` (renamed for ArchiMate alignment, ADR 2026-06-08). `BUSINESS_OBJECT` has a canonical catalogue at `canon/elements/02_business/business-objects/`; migrate any remaining `INFORMATION_ENTITY-…` IDs and `information_entities[]` fields per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §6.

### 5.4 Compliance lane

The compliance lane is an **optional, derived lane** of the Process Blueprint. When enabled via `lane_config.compliance: true`, the renderer computes — for each stage — which regulatory obligations bind that stage and what compliance status each carries. **No compliance data is written into the blueprint canon**; the lane is a read-only projection of the assertion + requirement + codex graph.

Decision record: the compliance-impact-as-blueprint-lane architecture decision.

#### Derivation formula

For each stage the compliance lane is computed as follows:

1. Collect every `ASSERTION` whose `realised_via` resolves to the stage (or a `STEP` within that stage's corresponding process).
2. Lift each `ASSERTION` to its `REQUIREMENT` via `ASSERTION.about`.
3. Lift each `REQUIREMENT` to its source law / regulation via `REQUIREMENT.derived_from` → codex artefact.
4. Group the impacting law IDs under the stage.

The lane therefore shows **which laws bear on each stage**, derived entirely from existing canon. Jurisdiction filtering (via `REQUIREMENT.derived_from` → codex `jurisdiction` field) narrows the lane to one or more regimes.

#### Cell decoration — three orthogonal signals

Each law chip in a cell carries up to three stacking decorations, each computed independently:

| Signal | Source in canon | Decoration |
|---|---|---|
| **New** | The law's impact on this stage appeared since the previous generated snapshot of this report | Dashed border |
| **Known gap** | `ASSERTION.status` is `non_compliant` or `partial` | Gap fill / status colour |
| **Gap with deadline** | Known gap **and** `REQUIREMENT.deadline` is approaching or past (`past_due` / `in_force` / `upcoming`) | Urgent badge |

The three decorations are **orthogonal and stack** — a law chip may simultaneously be *new*, a *gap*, and approaching a *deadline*.

Notes:
- **Deadline source.** The deadline is the external regulatory date on `REQUIREMENT.deadline`, not an internal `ASSERTION` remediation target; an internal remediation date is a separate, optional overlay.
- **"New" baseline.** "New since last snapshot" is well-defined because the report is a versioned, deterministically re-rendered view-config; the previous generated snapshot serves as its reference.
- **Temporal obligation status** (`past_due` / `in_force` / `upcoming`) is derived from `REQUIREMENT.deadline` and the report date; it is not stored on the element.

#### Drill-down on demand

A compliance cell expands on request to show the underlying `ASSERTION`s (status, evidence links) and their `REQUIREMENT` / codex source. The full audit chain (down to verbatim source segments and snapshots) is noted as a backlog surface and is not specced here.

#### Config layering

Two kinds of configuration are kept strictly separate:

| Kind | Covers | Lives in | Shared? |
|---|---|---|---|
| **Report definition** | Scope, jurisdiction filter, obligation / stage selection, pinned lane-set | Versioned view-config (report-skill mechanism) | Yes — shared, versioned, reproducible |
| **Display preferences** | Which lanes a person toggles on; decoration preferences | Per-user local files in a `.gitkeep`-tracked, `.gitignore`d-contents folder | No — local, never committed |

The report definition is audit-relevant: it makes a compliance blueprint reproducible and diffable, and it is what makes the "new since last snapshot" signal well-defined. A named report may pin its lane-set in the report definition. Display preferences are individual ergonomics; they stay local and are never committed.

#### `lane_config:` field

An optional `lane_config:` block in the blueprint document (or view-config) selects which lanes render:

```yaml
lane_config:
  systems: true             # default: true
  actors: true              # default: true
  equipment: true           # default: true
  information_entities: true  # default: true
  compliance: false         # default: false — opt-in
  compliance_filter:
    jurisdictions: []       # [] = all; list of codex jurisdiction codes to narrow the lane
```

`compliance: false` is the default — the compliance lane is opt-in and does not render unless explicitly enabled. `compliance_filter.jurisdictions` accepts codex jurisdiction codes (`REQUIREMENT.derived_from` → codex `jurisdiction` field); an empty list means all jurisdictions. A display-preference toggle (local, never committed) may override `compliance:` for a specific user without touching the shared report definition.

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `BP-001` | error | `process_blueprint` root key missing. |
| `BP-002` | error | `process_blueprint.id` missing or does not match `PROCESS_BLUEPRINT-[<middle>-]<INTEGER>`. |
| `BP-003` | error | `process_blueprint.name` missing or empty. |
| `BP-004` | error | `process_blueprint.stages` missing or empty. |
| `BP-005` | error | every entry in `stages[]` must have non-empty `id`, `name`, `goal`, and `result`. |
| `BP-006` | error | stage IDs must be unique within the document and must match `STAGE-[<middle>-]<INTEGER>`. |
| `BP-007` | error | every aspect entry (`systems[]`, `actors[]`, `equipment[]`, `information_entities[]`) must have a non-empty `name` and a non-empty `stages: [STAGE-…]` array. |
| `BP-008` | error | every ID in any aspect entry's `stages: [...]` must reference a stage declared in `stages[]`. |
| `BP-009` | error | if an aspect entry has an `id`, the ID must match the canonical grammar `<TYPE>-[<middle>-]<INTEGER>`. |
| `BP-010` | error | for `systems[]`, an entry's `id` (when present) MUST use the `APPLICATION-` prefix. For `actors[]`, the prefix MUST be `ROLE-`. For `equipment[]`, the prefix MUST be `EQUIPMENT-`. For `business_objects[]`, the prefix MUST be `BUSINESS_OBJECT-`. For `information_entities[]` *(deprecated)*, the prefix MUST be `INFORMATION_ENTITY-`. |
| `BP-011` | warn | a stage with no aspect entries pointing at it from any of the four aspect arrays is structurally empty and SHOULD be reviewed. |
| `JURISDICTION-CONSISTENCY-001` | warning | a jurisdiction code listed in `lane_config.compliance_filter.jurisdictions` does not match the `jurisdiction` field of any codex source resolved in scope for this blueprint — the filter references an unrecognised or out-of-scope jurisdiction code, so the compliance lane will silently return no obligations for that code. Cross-cutting — requires the codex catalogue to evaluate. Indexed in [CONTRACT.md](../CONTRACT.md) §8. |

---

## 7. Render contract — diagram engine, not Svgbob

The blueprint renders to a wide grid of nested boxes via the **shared diagram engine** that also renders the Goals tree and Nested Block Diagrams. This is a deliberate architectural decision: the stack converges on one diagram renderer for the whole structured-tree family (Goals, blocks, blueprint) so the artefacts share typography, colour ramp, and container chrome.

A renderer that consumes this notation MUST:

- Lay out `stages[]` as a horizontal sequence of stage boxes in array order, left to right.
- Render each stage box with a header showing the stage's `name`, and a body containing two fixed labelled rows for `goal` and `result`.
- Under each stage's goal/result rows, render one labelled sub-box per non-empty aspect category present anywhere in the document, in the order `systems`, `actors`, `equipment`, `information_entities`. The same set of aspect rows MUST appear in every stage box, so that aspects align horizontally across stages — empty rows render as empty placeholders.
- Render each aspect entry inside every stage's matching aspect sub-box whenever that stage's ID appears in the entry's `stages: [...]` list. An entry that spans `N` consecutive stages MAY render as a single horizontal pill that visually spans those stages; an entry that spans non-consecutive stages MUST render as one separate label per listed stage.
- Show each aspect entry's `name` as the visible label. When `id` is present, the renderer SHOULD expose it on hover or in a secondary detail line.
- Surface validation errors and warnings inline.
- When `lane_config.compliance: true`, render a **compliance lane** row aligned with the other aspect rows. For each stage cell, display the law IDs derived by the formula in §5.4. Apply the three orthogonal decorations: dashed border for *new*, gap fill for *known gap*, urgent badge for *gap with deadline* — derived from canon, not authored in the document.
- When `lane_config.compliance: true`, support **cell expansion on demand**: an expanded compliance cell shows the underlying `ASSERTION`s (status, evidence) and their `REQUIREMENT` / codex.
- Honour `lane_config.compliance_filter.jurisdictions` when set, restricting the compliance lane to the listed jurisdiction codes.
- Apply `lane_config` defaults as specified in §5.4 when the field is absent.

A renderer SHOULD:

- Use the brand styling shared with the Goals notation (typography, colour ramp, container chrome) so a blueprint and a goals tree look like the same family.
- Support a zoom / overview control for wide blueprints; very large value chains MAY require horizontal scrolling.
- Allow collapsing individual aspect rows to focus on a subset (e.g. systems-only view).
- Read per-user display preferences (lane toggle overrides) from the local settings folder and apply them without modifying the shared report definition.

A renderer MAY:

- Export the blueprint to image formats (SVG / PNG).
- Highlight a single stage on selection, dimming the rest.
- Cross-link aspect IDs into their source catalogues (`APPLICATION-…` into the applications catalogue, `ROLE-…` into the roles list).

What the renderer MUST NOT do:

- Reach for Svgbob / ASCII rendering. The structured-tree family (Goals, blocks, blueprint) all renders through the same shared diagram engine; see §7 opening paragraph.

---

## 8. Constraints and conventions

- The horizontal axis is **operational order**, not strict procedural sequence. A blueprint is not a flowchart; for procedural detail of any one stage, link to a BPMN file via the organisation's process catalogue.
- A blueprint corresponds to **one value chain at a time**. Multiple unrelated value chains belong in separate blueprint files.
- **Authored aspect categories** are `systems`, `actors`, `equipment`, and `information_entities`. The **compliance lane** (§5.4) is a fifth, opt-in, derived lane that carries no authored data. Additional authored categories require a notation revision.
- An aspect entry's `stages: [...]` is the only link between aspects and stages — stages do not list their aspects directly. This keeps the M:N relation single-sided and avoids the consistency burden of double-sided cross-references.

---

## 9. References

- File header contract: [`CONTRACT.md`](../CONTRACT.md)
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) — registers `PROCESS_BLUEPRINT` (§3.2) and the aspect element TYPEs `EQUIPMENT` and `INFORMATION_ENTITY` (§3.1).
- Goals notation (uses the same diagram engine): [`04-goals.md`](04-goals.md)
- BPMN notation (procedural flow of one process): [`01-bpmn.md`](01-bpmn.md)
- Process landscape map (catalogue of all processes): [`06-process-map.md`](06-process-map.md)
- Applications catalogue (source for `systems[].id`): [`10-applications.md`](10-applications.md)
- Nested blocks (uses the same diagram engine): [`08-blocks.md`](08-blocks.md)
- Compliance impact view (flat obligation matrix; compliance lane is the blueprint-shaped realisation): [`21-compliance-impact.md`](21-compliance-impact.md)
- Architecture decision — compliance lane decision.
- Methodology: `method/01-methodology.md`
