---
notation: "Process Blueprint"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-21"
status: "draft"
file_extension: "*.process-blueprint.transitrix.yaml"
dsm_status: "not implemented — render module planned in Transitrix Studio (sibling task)"
---

# Process Blueprint Notation — Reference

**Scope:** A wide, single-page blueprint that maps each stage of a value chain to its supporting aspects — systems, actors, equipment, information entities — together with the stage's goal and result. Authored as YAML, rendered as a horizontal grid of nested boxes (stage boxes containing aspect boxes).
**Renderer:** Transitrix Studio (planned) — uses the same diagram engine as the Goals notation. Not Svgbob.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all twelve Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `process-blueprint` |
| File extension | `*.process-blueprint.transitrix.yaml` |

---

## 1. Overview

A **process blueprint** answers the question: **for each stage of a value chain, what does it take to operate that stage?**

The blueprint is a single, wide diagram. The horizontal axis is the value chain — stages laid out left-to-right in their operating order. The vertical structure inside each stage is its supporting context, grouped into four aspect categories:

- **Systems** — applications and platforms used in the stage.
- **Actors** — roles and people who carry out the stage.
- **Equipment** — physical instruments, devices, or facilities the stage depends on.
- **Information entities** — the data, documents, and records produced or consumed.

Each stage also carries an explicit **goal** (what the stage should achieve) and a **result** (the deliverable that exits the stage).

The blueprint is a **view**, not a flow. It does not describe procedural sequencing within a stage — that is the job of BPMN. It does not decompose strategy — that is the job of FGCA / Goals. It is the operational blueprint of a value chain at a glance.

---

## 2. When to use this notation

| Need | Use |
|---|---|
| Show, on one page, every operational ingredient required to run a value chain end-to-end | **Process Blueprint** |
| Describe the procedural flow inside a single process (lanes, gateways, sequence flows) | BPMN (`*.bpmn.transitrix.yaml`) |
| Catalogue the full set of processes in the organisation | Process landscape map (`*.process-map.transitrix.yaml`) |
| Decompose strategy into factors, goals, changes, and activities | FGCA (`*.fgca.transitrix.yaml`) |
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

This shape matches the blueprint's semantic graph: a single system or actor typically spans several stages (one Order Management application is used in Receive, Validate, and Update Inventory); a nested form would force the same element to be duplicated in every stage it touches. The flat form expresses the M:N relation directly. The family-wide rule "nested for trees, flat for DAGs" — set on 2026-05-20 alongside the FGCA schema — places Process Blueprint on the flat side. See [README.md](README.md) § Family selection.

```yaml
notation: process-blueprint
spec_version: "0.1"

process_blueprint:
  id: PROCESS_BLUEPRINT-FULFIL-1
  name: "Order fulfilment blueprint"
  description: "End-to-end blueprint of the order fulfilment value chain."
  period: "2026"
  version: "0.1"
  date: "2026-05-21"
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

A complete example: [`examples/process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml`](examples/process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml).

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
| `process_blueprint.information_entities` | no | array of information-entity entries — see §5.3 |

The four aspect arrays are each optional individually; a blueprint MAY omit any aspect that does not apply (a fully digital process may have no `equipment:`, for example). At least one aspect array SHOULD be present — a blueprint with stages but no aspects renders as an empty grid and provides no operational context.

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
| `information_entities[]` | `INFORMATION_ENTITY-…` | notation-local in v0.1; promotable to a catalogue (see below) |

For every aspect category, an entry with an `id` MUST use the TYPE prefix listed above. An entry without an `id` is a free-form label — useful for sketches and for elements that have not yet been promoted into a catalogue.

`systems[]` and `actors[]` cross-reference established catalogues: `APPLICATION-…` resolves into the applications catalogue (`*.applications.transitrix.yaml`); `ROLE-…` resolves into the organisation's roles list. A validator MUST resolve these references against the relevant catalogue once cross-document linking is wired up.

`EQUIPMENT` and `INFORMATION_ENTITY` were registered alongside `PROCESS_BLUEPRINT` (see [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.1). No organisation-wide catalogue is mandated for these element TYPEs in v0.1: an entry's `id` is currently a document-local typed label, scoped to the blueprint that declares it. If and when a catalogue is introduced, the IDs already conform to the canonical grammar and can be promoted out of the blueprint without renaming.

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
| `BP-010` | error | for `systems[]`, an entry's `id` (when present) MUST use the `APPLICATION-` prefix. For `actors[]`, the prefix MUST be `ROLE-`. For `equipment[]`, the prefix MUST be `EQUIPMENT-`. For `information_entities[]`, the prefix MUST be `INFORMATION_ENTITY-`. |
| `BP-011` | warn | a stage with no aspect entries pointing at it from any of the four aspect arrays is structurally empty and SHOULD be reviewed. |

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

A renderer SHOULD:

- Use the brand styling shared with the Goals notation (typography, colour ramp, container chrome) so a blueprint and a goals tree look like the same family.
- Support a zoom / overview control for wide blueprints; very large value chains MAY require horizontal scrolling.
- Allow collapsing individual aspect rows to focus on a subset (e.g. systems-only view).

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
- Aspect categories are **fixed at four** (`systems`, `actors`, `equipment`, `information_entities`) in v0.1. Additional categories require a notation revision.
- An aspect entry's `stages: [...]` is the only link between aspects and stages — stages do not list their aspects directly. This keeps the M:N relation single-sided and avoids the consistency burden of double-sided cross-references.

---

## 9. References

- File header contract: [`CONTRACT.md`](CONTRACT.md)
- ID grammar and TYPE registry: [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) — registers `PROCESS_BLUEPRINT` (§3.2) and the aspect element TYPEs `EQUIPMENT` and `INFORMATION_ENTITY` (§3.1).
- Goals notation (uses the same diagram engine): [`04-goals.md`](04-goals.md)
- BPMN notation (procedural flow of one process): [`01-bpmn.md`](01-bpmn.md)
- Process landscape map (catalogue of all processes): [`06-process-map.md`](06-process-map.md)
- Applications catalogue (source for `systems[].id`): [`10-applications.md`](10-applications.md)
- Nested blocks (uses the same diagram engine): [`08-blocks.md`](08-blocks.md)
- Methodology: `method/methodology.md`
