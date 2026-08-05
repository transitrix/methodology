# Notations

Transitrix is a text-native methodology: every architecture artefact lives in a YAML (or Svgbob) file whose syntax is governed by one of the notations below. The folder splits the notations by kind: **view notations** describe render-able diagrams (`*.transitrix.yaml` files that a tool can lay out into a picture); **element notations** describe canon-zone primitives (standalone elements that other notations reference). This index lists both, what each is for, and how the strategy-chain family fits together.

## Views

The view notations live under [`views/`](views/), split by class into a folder per class — [`diagrams/`](views/diagrams/), [`reports/`](views/reports/), and [`documents/`](views/documents/) — so a spec's class is a filesystem fact, not a table position. Studio also renders **PlantUML** (`.puml`/`.plantuml`) natively — no separate Transitrix notation is needed for it.

### Diagram views (A = 11)

Each renders a visual diagram.

| Spec | Short name | Purpose | File extension | Status |
|---|---|---|---|---|
| [01-bpmn.md](./views/diagrams/01-bpmn.md) | `bpmn` | BPMN 2.0 process flow — lanes, gateways, sequence flows. | `*.bpmn.transitrix.yaml` | documented |
| [02-dgca.md](./views/diagrams/02-dgca.md) | `dgca` | Strategy-to-execution chain: Driver → Goal → Change → Activity. Layer toggle via `view_config.layers` (DGA mode when `changes: off`). | `*.dgca.transitrix.yaml` | documented |
| [04-goals.md](./views/diagrams/04-goals.md) | `goals` | Hierarchy of strategic and tactical goals as a tree. | `*.goals.transitrix.yaml` | documented |
| [05-capability-map.md](./views/diagrams/05-capability-map.md) | `capability-map` | Capability hierarchy with CMMI V2.0 maturity, addressing, vertical/horizontal orientation. | `*.capability-map.transitrix.yaml` | documented |
| [06-process-map.md](./views/diagrams/06-process-map.md) | `process-map` | Top-level catalogue of processes grouped into Operating, Supporting, and Management. | `*.process-map.transitrix.yaml` | draft |
| [07-action.md](./views/diagrams/07-action.md) | `action` | Project Schedule Network Diagram in Activity-on-Node (AoN) form — actions and dependencies. | `*.action.transitrix.yaml` | documented |
| [08-blocks.md](./views/diagrams/08-blocks.md) | `blocks` | Multi-level container layouts for deep architectural overviews (recursive `block` tree), or a single-layer rectangular matrix (RACI, coverage grids) — see §4 / §4a. | `*.blocks.transitrix.yaml` | documented |
| [09-products.md](./views/diagrams/09-products.md) | `products` | Inventory of products and services — text-and-table catalogue, no diagram. | `*.products.transitrix.yaml` | draft |
| [10-applications.md](./views/diagrams/10-applications.md) | `applications` | Inventory of applications and integrations — text-and-table catalogue, no diagram. | `*.applications.transitrix.yaml` | draft |
| [13-process-blueprint.md](./views/diagrams/13-process-blueprint.md) | `process-blueprint` | Wide blueprint of a value chain — stages laid out left-to-right, each carrying its goal, result, and supporting systems / actors / equipment / information entities. | `*.process-blueprint.transitrix.yaml` | draft |
| [18-action-card.md](./views/diagrams/18-action-card.md) | `action-card` | Single-project narrative view — DGCA chain, dates, milestones, gate decisions. | `*.action-card.transitrix.yaml` | draft |

### Report views (C = 4)

Each produces a derived report or table from a declarative view-config, per [`REPORT_VIEW_CONFIG.md`](views/REPORT_VIEW_CONFIG.md).

| Spec | Short name | Purpose | File extension | Status |
|---|---|---|---|---|
| [11-scenarios.md](./views/reports/11-scenarios.md) | `scenarios` | Report-config view over the `SCENARIO` element catalogue — rendering / ordering / filtering of alternative paths, each pointing at a `TARGET_STATE` and serving one or more `GOAL`s. | `*.scenarios.transitrix.yaml` | draft |
| [21-compliance-impact.md](./views/reports/21-compliance-impact.md) | `compliance-impact` | Report-config view over the compliance overlay — derives the (obligation × subject) matrix from `ASSERTION` + process flow + `REQUIREMENT` status; distinguishes "No mapped obligation (current model)" from `n_a`. | `*.compliance-impact.transitrix.yaml` | draft |
| [22-coverage-metric.md](./views/reports/22-coverage-metric.md) | `coverage-metric` | Report-config view over coverage of canon — counts subjects with zero admitted obligations from each regime, broken down per jurisdiction; distinguishes "Not yet modelled" (modelling gap) from "No obligation asserted (modelled fact)". | `*.coverage-metric.transitrix.yaml` | draft |
| [23-actions-tree.md](./views/reports/23-actions-tree.md) | `actions-tree` | Report-config view over the `ACTION` element catalogue — renders the strategic portfolio as a top-down tree from Initiative through Programme, Project, to Task. | `*.actions-tree.transitrix.yaml` | draft |

### Document views (D = 2)

Each renders a standard document (MRD, SRS, SDD, …) from canon.

| Spec | Short name | Purpose | File extension | Status |
|---|---|---|---|---|
| [29-mrd.md](./views/documents/29-mrd.md) | `mrd` | Marketing Requirements Document — groups admitted `REQUIREMENT`s under the `NEED` each one serves. | `*.mrd.transitrix.yaml` | draft |
| [30-srs.md](./views/documents/30-srs.md) | `srs` | Software Requirements Specification — sections admitted software-tier `REQUIREMENT`s by `kind` (functional / quality). | `*.srs.transitrix.yaml` | draft |

Every view notation follows the convention `*.<short-name>.transitrix.yaml`. Every file begins with a `notation: <short-name>` header — see each spec's "File header" section and [CONTRACT.md](CONTRACT.md) §3 for the rule.

## Elements

The **15** element notations live under [`elements/`](elements/) — each defines a zone primitive: standalone YAML files admitted to a zone and referenced (by ID) from views and other elements. Canon and codex element primitives carry their own admission record + primitive lifecycle per [`CONTRACT.md`](CONTRACT.md) §6–7; field-zone primitives carry the admission record without a primitive lifecycle (a field artefact records an event, not a temporal element of the organisation).

| Spec | Short name | Purpose | File location | Status |
|---|---|---|---|---|
| [14-codex.md](elements/14-codex.md) | `codex` | External laws / regulations and internal policies / standards in the codex zone. | `codex/external/<jurisdiction>/<ID>.yaml`, `codex/internal/<ID>.yaml` | documented |
| [15-requirement.md](elements/15-requirement.md) | `requirement` | Motivation-layer element capturing a positive obligation derived from a codex source. | `canon/elements/01_motivation/requirements/REQUIREMENT-<…>.yaml` | documented |
| [16-assertion.md](elements/16-assertion.md) | `assertion` | Canon-zone primitive linking a REQUIREMENT to a subject (PRODUCT / PROCESS / CAPABILITY). | `canon/assertions/ASSERTION-<…>.yaml` | documented |
| [17-relations.md](elements/17-relations.md) | `relation` | First-class, time-aware relation between two canonical primitives — `parent` / `goal_parent` / `action_goal` / `unit_parent` / engagement kinds. | `canon/relations/REL-<…>.yaml` | documented |
| [19-actors.md](elements/19-actors.md) | `actor` | Active-structure identity primitive — `person` / `business_unit` / `system` (replaces the former UNIT / EMPLOYEE TYPEs). | `canon/elements/02_business/actors/ACTOR-<…>.yaml` | draft |
| [20-stakeholders.md](elements/20-stakeholders.md) | `stakeholder` | Motivation-layer interest primitive — `internal` / `external`; carries the stake profile and references an `ACTOR` for identity. | `canon/elements/01_motivation/stakeholders/STAKEHOLDER-<…>.yaml` | draft |
| [21-locations.md](elements/21-locations.md) | `location` | Physical or virtual place primitive — where actors operate; linked to `ACTOR` via a `located_at` relation. | `canon/elements/02_business/locations/LOCATION-<…>.yaml` | draft |
| [22-amendment.md](elements/22-amendment.md) | `amendment` | Field-zone primitive — structured detection record that a watched codex source has been amended; cites the source and (post-adjudication) the canon `CHANGE` / Gap elements it motivates. | `field/amendments/AMENDMENT-<…>.yaml` | draft |
| [23-segment.md](elements/23-segment.md) | `segment` | Field-zone primitive — extracted chunk of a codex source (article / clause / paragraph) with a locator and the chunk text or its `sha256` fingerprint; the text-level provenance an `AMENDMENT` / `REQUIREMENT` / `ASSERTION` cites. | `field/segments/SEGMENT-<…>.yaml` | draft |
| [24-action.md](elements/24-action.md) | `action` | Implementation-layer work package — Initiative / Programme / Project / Task hierarchy (supersedes the former ACTIVITY primitive). | `canon/elements/05_implementation/actions/ACTION-<…>.yaml` | draft |
| [25-business-services.md](elements/25-business-services.md) | `business-service` | Externally visible business behaviour the organisation makes available to its environment (ArchiMate Business Service). | `canon/elements/02_business/business-services/BUSINESS_SERVICE-<…>.yaml` | draft |
| [25-nodes.md](elements/25-nodes.md) | `node` | Technology-layer infrastructure node primitive — physical or virtual compute, network, or storage substrate (ArchiMate Technology Node). | `canon/elements/04_technology/nodes/NODE-<…>.yaml` | draft |
| [26-technology-services.md](elements/26-technology-services.md) | `technology-service` | Platform-level service exposed by a NODE to the application layer (ArchiMate Technology Service). | `canon/elements/04_technology/services/TECHNOLOGY_SERVICE-<…>.yaml` | draft |
| [27-verification.md](elements/27-verification.md) | `verification` | Canon-zone primitive linking a REQUIREMENT to a verification protocol, method, and pass/fail outcome — the engineering counterpart to ASSERTION. | `canon/verifications/VERIFICATION-<…>.yaml` | draft |
| [28-validation.md](elements/28-validation.md) | `validation` | Canon-zone primitive linking a NEED to a validation protocol, method, and pass/fail outcome — the validation-domain counterpart to VERIFICATION. | `canon/validations/VALIDATION-<…>.yaml` | draft |

Element notations don't carry the `*.transitrix.yaml` extension convention — they're addressed by ID, and their file location is governed by the per-notation rule above.

The cross-cutting **element-primitive file schema** — the common envelope every standalone element file carries, which TYPEs get a standalone file vs. live only inline in a view, and where each lives on disk — is defined once in [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md). The element notations above are specialised instances of that envelope.

The cross-cutting **Coverage Profile** — the mechanism an adopter uses to declare which slice of the methodology's vocabulary (per-layer element TYPEs + relation TYPEs) is in scope for their repository — is defined in [`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md). Adopters declare a profile in [`transitrix.yaml`](MANIFEST.md); the default when omitted is `full`.

The cross-cutting **Domain Packages** mechanism — the orthogonal `packages:` field an adopter uses to opt into a bounded, removable domain extension (e.g. a requirements-interchange layer) on top of the core vocabulary — is defined in [`PACKAGES.md`](PACKAGES.md). Absent ⇒ no package active, silently. The first shipped package — a ReqIF-shaped requirements-interchange layer — is [`packages/reqif.md`](packages/reqif.md).

The cross-cutting **Named view-config convention** — where saved view-configs live in an adopter repo, how they're named, listed, and re-run — is defined in [`views/REPORT_VIEW_CONFIG.md`](views/REPORT_VIEW_CONFIG.md). The convention applies uniformly across every view notation, and is the registry the report-config view specs ([`11-scenarios.md`](./views/reports/11-scenarios.md), [`21-compliance-impact.md`](./views/reports/21-compliance-impact.md), [`22-coverage-metric.md`](./views/reports/22-coverage-metric.md)) and the future report skill (per the *reports rendered from declarative view-configs* architecture decision) lean on.

## Status vocabulary

The `status:` field in each spec's front-matter describes the **spec's maturity** — how stable and complete the notation specification is. It does **not** describe whether a tool implements the notation; tool implementation is tracked separately in the `dsm_status:` field on the same spec.

| Value | Meaning |
|---|---|
| `draft` | The spec is incomplete or has known open structural questions; content may change in non-backwards-compatible ways. |
| `documented` | The spec is complete and internally consistent. No open structural questions. Minor additive revisions are expected. |
| `stable` | The schema is locked. Future changes must be backwards-compatible (additive only). |
| `deprecated` | The notation is retired. No new artefacts should use it; existing adopters must migrate. The spec file is kept for migration reference only. |

The vocabulary is intentionally small.

## Front-matter conventions

Every notation spec opens with a YAML front-matter block. The schema differs by kind.

**View notations** (`views/`) — name key is `notation:`, includes `file_extension:`:

```yaml
notation: "Human-readable diagram name"
version: "X.Y"
author: "..."
last_updated: "YYYY-MM-DD"
status: draft | documented | stable | deprecated
file_extension: "*.short-name.transitrix.yaml"
dsm_status: "..."          # see rule below
```

**Element notations** (`elements/`) — name key is `title:`, no `file_extension:` (elements are addressed by ID, not by extension):

```yaml
title: "Element Name — one-line summary"
version: "X.Y"
author: "..."
last_updated: "YYYY-MM-DD"
status: draft | documented | stable | deprecated
```

**`dsm_status:` rule:** required for all view notations with `status: documented`. Optional for `draft` views — add when there is something specific to say about Studio implementation. Describes Transitrix Studio implementation state, not spec completeness.

---

## Family selection

Three notations — DGCA, the Goals tree, and the Action schedule — sit on the same strategy-to-execution spectrum. They differ in which layers they carry; the right one for a given task is the one that names exactly the layers you need to talk about, no more.

### Layer composition

DGCA supports toggling individual layers off via `view_config.layers`. The table shows common configurations:

| Mode | Driver | Goal | Change | Activity | How |
|---|:---:|:---:|:---:|:---:|---|
| **DGCA** full ([02-dgca.md](./views/diagrams/02-dgca.md)) | ✓ | ✓ | ✓ | ✓ | default |
| **DGA** (DGCA, Changes off) | ✓ | ✓ | — | ✓ | `view_config.layers.changes: off` |
| **Goals tree** ([04-goals.md](./views/diagrams/04-goals.md)) | — | ✓ | — | — | separate notation |
| **Action schedule** ([07-action.md](./views/diagrams/07-action.md)) | — | — | — | ✓ | separate notation |

### Selection matrix

| Situation | Recommended |
|---|---|
| Trace strategic drivers through goals and explicit transformation steps to deliverable initiatives. | **DGCA** (full) |
| Same chain, but the transformation step between goals and actions is implicit or trivial. | **DGCA** with `layers.changes: off` (DGA mode) |
| Decompose goals hierarchically (strategy → tactical → operational) without naming drivers or actions. | **Goals tree** |
| Plan delivery — actions, dependencies, durations, Gantt — strategic context already settled elsewhere. | **Action schedule** |
| Quarterly goals review with no driver or action context. | **Goals tree** |
| Explaining why a goal-action gap exists and what transformation closes it. | **DGCA** (full) |

### Form rule — flat top-level arrays with reference-based hierarchy

**All three strategy-chain notations — DGCA, Goals, Action schedule — use the flat form.** Document metadata and the layer arrays live at the document root as parallel top-level arrays. There is no wrapper root key. Where a notation is tree-shaped (Goals, Action schedule), hierarchy is expressed by `parent` references on each element inside the flat array. Where a notation is DAG-shaped (DGCA), cross-layer links are id-references on each element in the canonical downstream direction.

| Notation | Top-level arrays | Hierarchy / cross-link |
|---|---|---|
| **Goals** | `goal_types[]`, `goals[]` | `goal.parent: GOAL-…` (omitted at root) |
| **DGCA** (DGA mode) | `factors[]`, `goals[]`, `actions[]` | `goal.factors: [DRIVER-…]`; `action.goals: [GOAL-…]` |
| **DGCA** (full) | `factors[]`, `goals[]`, `changes[]`, `actions[]` | `goal.factors: [DRIVER-…]`; `change.goals: [GOAL-…]`; `action.changes: [CHANGE-…]` |
| **Action schedule** | `actions[]` | `action.predecessors: [ACTION-…]`; optional `parent: ACTION-…` for WBS groupings |

**Decision (2026-05-26)** — flat form across all strategy-chain notations (supersedes the earlier "nested for trees, flat for DAGs" heuristic). Reasoning: a single shape removes the spec-vs-implementation gap; tree-shape semantics survive as `parent`-references inside a flat array.

**Decision (2026-06-23)** — FGA merged into DGCA as DGA mode. `fga` / `fgca` are deprecated pre-2026-06 keys; migrate to `dgca` with `view_config.layers.changes: off` for the 3-layer variant.

## Examples

Worked example files for every notation live under [`examples/`](examples/); each subfolder has a short README of its own.

## Notation selection guide

[`NOTATION_SELECTION_GUIDE.md`](NOTATION_SELECTION_GUIDE.md) catalogues every Mermaid and PlantUML diagram type alongside the Transitrix notations above, with use-cases for when to recommend each — the reference an agent uses to pick the right notation for a user's request.
