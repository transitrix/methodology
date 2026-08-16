---
title: Transitrix — notation kit
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, methodology, notations]
---

# Notation kit

> How Transitrix expresses different aspects of an enterprise — the notation set, and the cross-cutting rules that apply to all of them.

## 1. The notation kit

Transitrix supports a set of **notations** for describing different aspects of an enterprise. Each notation has a canonical text-native format — YAML for most, Svgbob ASCII for the nested block diagrams — a defined renderer, and a place in the repository.

Every notation is specified in its own file under `notations/`. The file-header rules common to all of them — the required `notation:` field, the reserved `spec_version:` field, validator behaviour, and the extension/content match guarantee — are defined once in `notations/CONTRACT.md`. The cross-notation ID grammar and TYPE registry live in `notations/IDS_AND_REFERENCES.md`.

The **canonical index of all notations** — view notations and element notations alike, with their short names, file extensions, and spec-maturity status, and where each one lives in the repository — lives in [`notations/README.md`](../notations/README.md). That index is the single source of truth for the notation set and for per-notation file locations; this document does not restate the catalogue (a duplicate would drift). The `Status` column there reflects the maturity of the notation **specification** (`draft`, `documented`, or `stable`), not whether a tool implements it; tool support is tracked per spec in its `dsm_status:` field.

A few cross-cutting notes:

- Diagrams and aggregations live under `canon/views/`. Atomic ArchiMate elements live under `canon/elements/` ([`02-repository.md`](02-repository.md)). The two layers stay separate.
- Every view notation follows the extension convention `*.<short-name>.transitrix.yaml` and begins with a `notation: <short-name>` header (see [`notations/CONTRACT.md`](../notations/CONTRACT.md) §1–3). Element notations are addressed by ID and governed by per-notation file-location rules.
- Gantt is not a separate notation — the calendar-timeline view ships as the Gantt projection of the Activities notation.
- Products and Applications are **catalogue** forms — they render as text and tables rather than as a custom diagram. Every other view notation is a diagram, rendered through Transitrix Studio's shared diagram engine.
- Individual product and application instances are still stored as **atomic elements** in their respective ArchiMate-layer folders — `canon/elements/02_business/<PRODUCT_ID>.yaml` (with `type: Product`) and `canon/elements/03_application/<APP_ID>.yaml` (with `type: ApplicationComponent`). The "view" file in `views/products/` or `views/applications/` defines how to filter, group, and present those elements (e.g., "all active Products grouped by category").
- Inline diagrams (Mermaid blocks in markdown, embedded ASCII block diagrams) are explicitly allowed when the diagram is bound to one specific document and has no independent life. Use stand-alone files in `views/` when the diagram is a first-class artefact of the model.

## 2. DGCA — strategy-to-execution chain

DGCA is the Transitrix notation for translating strategy into coordinated execution. It answers a single management question:

> *How do our day-to-day initiatives directly support strategic intent?*

Four layers, read as a cause-and-delivery chain:

- **Drivers** — external and internal forces that explain why action is needed now.
- **Goals** — strategic outcomes the organisation wants to achieve.
- **Changes** — business transformations required to make goals real.
- **Activities** — concrete initiatives, projects, and workstreams that deliver those changes.

Used in three views:

- **Top-down (strategy → execution)** — confirm every activity has clear strategic purpose.
- **Bottom-up (execution → strategy)** — confirm initiatives aren't disconnected from goals.
- **Portfolio** — identify concentration, overlaps, and gaps in strategic coverage.

The Driver → Goal → Activity (DGA) variant — where the transformation step is implicit or trivial — is expressed as a DGCA document with `view_config.layers.changes: off`. Both full and DGA mode render as visual chains in Transitrix Studio.

See `notations/views/diagrams/02-dgca.md` for the full DGCA notation reference (file format, fields, layer toggle, examples, DSM implementation status).

## 3. Capabilities and maturity

Capabilities are described in two axes:

- **Vertical capabilities (V)** — primary business domains, hierarchical in three levels (V1, V1.1, V1.1.1).
- **Horizontal capabilities (H)** — cross-cutting supporting capabilities (H1, H1.1).

Each capability carries a 5-level CMM maturity score over time — historical assessments and target levels with target dates. The capability is linked to the elements that realise it: BusinessRole owners, BusinessProcess instances, and ApplicationComponent supporters. Maturity assessment becomes traceable to the systems and people that determine it.

Task procedure: [`guides/modelling-capabilities.md`](../guides/modelling-capabilities.md).

## 4. Process diagrams (BPMN) and process landscape maps

Process diagrams (BPMN, `.bpmn.transitrix.yaml`) describe **how** a single process flows: tasks, gateways, lanes, KPIs, data flow.

Process landscape maps (`.process-map.transitrix.yaml`) describe **what** processes exist in the organisation: the catalogue, grouped by Operating / Supporting / Management, with hierarchical decomposition. The landscape map is the inventory; process diagrams are the detailed views.

The two notations are complementary — most organisations need both.

Task procedure for authoring a complex process: [`guides/modelling-complex-processes.md`](../guides/modelling-complex-processes.md).

---

**Next:** [`05-working-the-model.md`](05-working-the-model.md) — how a change flows, and what validates it.

**Last reviewed:** 2026-08-16. Split from the former `01-methodology.md` §6 — see [`method/01-methodology.md`](01-methodology.md) for the redirect. §6.1's per-notation location catalogue is dropped in favour of [`notations/README.md`](../notations/README.md), which already declares itself the single source.
**Status:** Active.
