---
title: Transitrix — Methodology for Enterprise Architecture as Code
status: v1.0_draft
last_reviewed: 2026-05-21
audience: public
license: MIT
tags: [transitrix, methodology, enterprise_architecture, architecture_as_code, archimate, bpmn]
---

# Transitrix — Methodology for Enterprise Architecture as Code

> Transitrix: open methodology and tools to describe an enterprise as text — and let humans and machines run it together.

## 1. What this is

Transitrix is an open methodology for representing and managing enterprise architecture as **text-native, version-controlled artefacts**. Models, processes, capabilities, goals, and architectural relations live as YAML files in Git. Diagrams, reports, and dashboards are derived from those files automatically.

It is built for organisations that want to:

- **Move at the speed of code** — architectural change goes through pull requests, code review, and CI, not through workshops and PowerPoint.
- **Treat architecture as a living model** — strategy, structure, and execution plans share one source of truth that is read and written by both people and automated agents.
- **Reduce ceremony without losing rigour** — the methodology adopts ArchiMate 3.2 semantics where they bring value, and skips heavyweight artefacts that don't earn their cost.

Transitrix is designed for environments where leadership wants tight feedback loops between strategic intent and operational delivery — and is willing to manage their enterprise the way good engineering teams manage their software.

## 2. Four core principles

Transitrix rests on four pillars. Every design decision in the methodology can be traced back to one of them.

### 2.1 Single source of truth

The architectural model lives in Git as YAML files. Every diagram, dashboard, report, and integration is derived from those files. There is one place to change a fact about the enterprise — and one history that records every change.

### 2.2 Scannability

A reader must be able to open any model file in a terminal or text editor and understand what it describes — without specialised software. Files are short, named conventionally, structured predictably, and human-friendly.

### 2.3 Automation and validation

The integrity of the model is a property of the repository, not of any individual reviewer. Linters, schema validators, and fitness-function checks run on every commit. Broken references, missing owners, layer-violation relationships, and policy gaps are flagged automatically.

### 2.4 Atomic decomposition

Objects (elements) and connections (relations) live in separate files. This keeps Git diffs readable, makes graph analysis tractable, and prevents the file structure from leaking implementation details into the methodology. One concept, one file, one place to change it.

## 3. Standards Transitrix builds on

Transitrix does not invent semantics where they already exist. It builds on:

- **ArchiMate 3.2** (The Open Group) — for the architectural element vocabulary across motivation, business, application, and technology layers.
- **BPMN 2.0** (OMG) — for business process diagrams. Compiled from a YAML DSL, not authored on a canvas.
- **Capability Maturity Model (CMM)** — for maturity assessment of capabilities (5 levels: Initial → Repeatable → Defined → Managed → Optimised).

Transitrix adds value at the layer above these standards: how the model is **stored**, **versioned**, **validated**, **rendered**, and **acted upon** by both humans and software agents.

> **Editorial note (2026-05-08):** the ArchiMate vocabulary reference below was ported in from a standalone file. Section numbering is not yet harmonised — to be folded into §3 / §4 in a later pass.

## 3a. ArchiMate vocabulary reference

Transitrix uses ArchiMate 3.2 as the vocabulary for architectural elements. Every YAML element file carries a `type` field drawn from this vocabulary. Relations between elements use ArchiMate relation types. The subset documented here covers what is actively used in the methodology — it is not a replacement for the full Open Group standard.

### 3a.1 Layer mapping

ArchiMate organises elements across four layers. In Transitrix these map directly to the folder structure under `elements/`:

| ArchiMate Layer | Transitrix folder | Contents |
|---|---|---|
| Motivation | `elements/01_motivation/` | Goals, principles, drivers, constraints |
| Business | `elements/02_business/` | Roles, actors, processes, functions, products |
| Application | `elements/03_application/` | Components, services, data objects, interfaces |
| Technology | `elements/04_technology/` | Nodes, system software, artefacts, devices |

### 3a.2 Motivation layer elements

| Type | ID prefix | Description |
|------|-----------|-------------|
| **Goal** | `GOAL-` | A desired outcome or end state the organisation aims to achieve |
| **Principle** | `PRIN-` | A normative statement that guides decision-making |
| **Constraint** | `CONS-` | A restriction that limits available options |
| **Driver** | `DRIV-` | An external or internal condition that motivates change |
| **Outcome** | `OUTC-` | A result produced by a goal or activity |
| **Value** | `VALUE-` | A benefit or importance attributed to an element |
| **Requirement** | `REQ-` | A statement of need that must be satisfied |
| **Assessment** | `ASMNT-` | An appraisal of a driver or situation |

### 3a.3 Business layer elements

| Type | ID prefix | Description |
|------|-----------|-------------|
| **BusinessRole** | `ROLE-` | A named set of responsibilities assigned to an actor |
| **BusinessActor** | `ACTR-` | A person, team, or organisational unit that fulfils roles |
| **BusinessProcess** | `PROC-` | A sequence of activities that produces a result |
| **BusinessFunction** | `FUNC-` | A grouping of behaviour based on expertise or resources |
| **BusinessService** | `SRVC-` | A service that provides value to external actors |
| **BusinessObject** | `BOBJ-` | A concept used in business (contract, order, claim) |
| **Product** | `PROD-` | A coherent collection of services offered to customers |
| **Capability** | `CAP-` | An ability the organisation has or wants to develop |

### 3a.4 Application layer elements

| Type | ID prefix | Description |
|------|-----------|-------------|
| **ApplicationComponent** | `APP-` | An application unit with its own logic, data, and interfaces |
| **ApplicationService** | `SRVC-` | A service exposed by a component to other components or users |
| **ApplicationInterface** | `INTF-` | An access point for a component's service |
| **DataObject** | `DATA-` | A structured body of information used or produced by an application |

### 3a.5 Technology layer elements

| Type | ID prefix | Description |
|------|-----------|-------------|
| **Node** | `NODE-` | A computational or physical resource that hosts components |
| **SystemSoftware** | `SYS-` | Software that provides environment for components (OS, middleware, DB) |
| **Artifact** | `ARTF-` | A physical piece of data — binary, container image, config file |
| **Device** | `DEV-` | A physical hardware unit |
| **CommunicationPath** | `NET-` | A network link between nodes |
| **TechnologyService** | `TSRVC-` | A service exposed at the technology layer |

### 3a.6 Relation types

| Type | Direction | Meaning |
|------|-----------|---------|
| **Serving** | A → B | A exposes a service that B uses |
| **Assignment** | A ↔ B | A (role/actor) is assigned to perform B (process/function) |
| **Realization** | A → B | A implements or realises B |
| **Access** | A → B | A reads, writes, or reads-writes B (data object or artefact) |
| **Composition** | A → B | B is structurally part of A |
| **Aggregation** | A → B | A weakly groups B (B can exist independently) |
| **Triggering** | A → B | A triggers or initiates B |
| **Flow** | A → B | Information, data, or resources flow from A to B |
| **Specialization** | A → B | A is a more specific form of B |
| **Association** | A — B | A generic, undirected relationship |
| **Influence** | A → B | A affects or shapes B (used in motivation layer) |

### 3a.7 Element file shape (YAML)

```yaml
id: "APP-ORD-001"              # TYPE-DOMAIN-SEQ, uppercase, hyphens only
name: "Order API"              # Human-readable name
type: "ApplicationComponent"   # ArchiMate 3.2 type (see tables above)
layer: "Application"           # Motivation | Business | Application | Technology
metadata:
  status: "Active"             # Draft | Active | Deprecated | Archived
  owner: "firstname.lastname"
  created_at: "2026-05-08"
  updated_at: "2026-05-08"
properties:
  description: "REST API for order management"
  criticality: "High"          # Critical | High | Medium | Low
  # Type-specific properties go here
```

### 3a.8 Relation file shape (YAML)

```yaml
id: "REL-001"
source: "APP-ORD-001"          # ID of the source element
target: "DATA-ORDER-001"       # ID of the target element
type: "Access"                 # ArchiMate relation type (see §3a.6)
properties:
  access_type: "ReadWrite"     # Optional: Read | Write | ReadWrite
  description: "Reads and writes order records"
```

### 3a.9 Naming rules (ArchiMate-typed elements)

- IDs: `[TYPE_PREFIX]-[DOMAIN]-[SEQ]` — uppercase, hyphens only, globally unique within the organisation.
- Domain codes: 3-letter abbreviation (`ORD`, `PAY`, `USR`, etc.) — see `glossary.md`.
- Sequence: three-digit zero-padded number (`001`, `002`, …).
- File name: matches the element ID — `APP-ORD-001.yaml`.

### 3a.10 References

- The Open Group — ArchiMate 3.2 specification: <https://pubs.opengroup.org/architecture/archimate3-doc/>
- Transitrix element templates: `organizations/<org>/.templates/elements/`
- Transitrix glossary: `glossary.md`

## 4. Repository structure

A Transitrix-managed repository organises content in a predictable, ArchiMate-aligned hierarchy. Multiple organisations can coexist in a single repository (multi-tenant structure).

```
organizations/
├── <org_slug>/
│   ├── README.md                  # Organisation overview
│   ├── GETTING_STARTED.md         # Onboarding for the team
│   ├── CONVENTIONS.md             # Local naming conventions and overrides
│   ├── elements/                  # Atomic ArchiMate elements (1 element = 1 file)
│   │   ├── 01_motivation/         # Goals, principles, drivers, constraints
│   │   ├── 02_business/           # Roles, actors, processes, functions, products
│   │   ├── 03_application/        # Components, services, data objects
│   │   └── 04_technology/         # Nodes, system software, artefacts
│   ├── relations/                 # Edges of the architecture graph (1 relation = 1 file)
│   ├── views/                     # Composite diagrams and aggregations over elements
│   │   ├── goals/                 # Goals trees
│   │   ├── capabilities/          # Capability maps + maturity
│   │   ├── processmap/            # Process landscape maps
│   │   ├── bpmn/                  # Process flow diagrams (BPMN)
│   │   ├── fgca/                  # Factor → Goal → Change → Activity chains
│   │   ├── fga/                   # Factor → Goal → Activity chains
│   │   ├── blocks/                # Nested block diagrams (ASCII / Svgbob)
│   │   ├── activities/            # Activity schedule networks
│   │   ├── products/              # Filtered views over Product elements
│   │   └── applications/          # Filtered views over Application elements
│   ├── .templates/                # Copy-and-fill templates for elements / relations / views
│   ├── .validators/               # Lint and schema scripts
└── NEW_ORGANIZATION_TEMPLATE.md   # How to bootstrap a new organisation
```

Two-layer separation matters:

- **`elements/`** holds atomic ArchiMate-typed objects. Each file describes exactly one element — its identity, type, properties, and metadata. No aggregation, no flow, no list of related items.
- **`views/`** holds compositions over elements. A goals tree is a hierarchy referencing many Goal elements. A BPMN diagram is a detailed flow over a single BusinessProcess element. A products list is a filtered view over all elements of type Product. Views aggregate; elements stay atomic.

Why multi-tenant: a single repository can hold an entire portfolio of organisations (parent group plus subsidiaries; advisory relationships; multiple business units). Each organisation has full structural isolation while sharing methodology and validators.

## 5. The YAML DSL

Two file shapes do most of the work: **elements** (objects) and **relations** (connections).

### 5.1 Element template

```yaml
id: "APP-TRX-001"
name: "Product Orchestrator"
type: "ApplicationComponent"        # ArchiMate 3.2 element type
layer: "Application"
metadata:
  status: "Active"                   # Draft | Active | Deprecated
  owner: "v.korobeinikov"
  updated_at: "2026-05-03"
properties:
  tech_stack: "FastAPI, Python 3.12"
  criticality: "High"
  description: "Orchestrates product transactions"
```

The element file describes the object itself. It does **not** describe its relations. Putting relations in their own files (§5.2) keeps files small, diffs clean, and graph analysis straightforward.

### 5.2 Relation template

```yaml
id: "REL-ORD-001"
source: "APP-TRX-001"
target: "SRV-POSTGRES-01"
type: "Access"                      # ArchiMate relation type
properties:
  protocol: "TCP/IP"
  description: "Stores transactional data"
```

A relation is a typed edge between two elements. The methodology refuses to mix elements and relations in the same file — that constraint is enforced by the linter (§9).

## 6. Notation kit

Transitrix supports a set of **notations** for describing different aspects of an enterprise. Each notation has a canonical text-native format — YAML for most, Svgbob ASCII for the nested block diagrams — a defined renderer, and a place in the repository.

Every notation is specified in its own file under `notations/`. The file-header rules common to all of them — the required `notation:` field, the reserved `spec_version:` field, validator behaviour, and the extension/content match guarantee — are defined once in `notations/CONTRACT.md`. The cross-notation ID grammar and TYPE registry live in `notations/IDS_AND_REFERENCES.md`.

The table below is the canonical Transitrix notation set. Every notation file follows the extension convention `*.<short-name>.transitrix.<ext>` — `yaml` for every notation except `blocks`, which uses `txt` — and begins with a `notation: <short-name>` header. The `Status` column reflects the maturity of the notation **specification** (`draft`, `documented`, or `stable`), not whether a tool implements it; tool support is tracked per spec in its `dsm_status:` field.

| # | Notation | File extension | Purpose | Status |
| --- | --- | --- | --- | --- |
| 01 | **BPMN process diagram** | `*.bpmn.transitrix.yaml` | BPMN 2.0 process flow — lanes, gateways, sequence flows. | documented |
| 02 | **FGCA** | `*.fgca.transitrix.yaml` | Four-layer strategy-to-execution chain: Factor → Goal → Change → Activity. | documented |
| 03 | **FGA** | `*.fga.transitrix.yaml` | Simplified strategy-to-execution chain: Factor → Goal → Activity (no Changes layer). | draft |
| 04 | **Goals tree** | `*.goals.transitrix.yaml` | Hierarchy of strategic and tactical goals as a tree. | documented |
| 05 | **Capabilities map** | `*.capability-map.transitrix.yaml` | Capability hierarchy with CMMI V2.0 maturity, addressing, and vertical / horizontal orientation. | documented |
| 06 | **Process landscape map** | `*.process-map.transitrix.yaml` | Top-level catalogue of processes grouped into Operating, Supporting, and Management. | draft |
| 07 | **Activities** | `*.activities.transitrix.yaml` | Project schedule as an Activity-on-Node network, with an optional Gantt timeline projection. | documented |
| 08 | **Nested block diagrams** | `*.blocks.transitrix.txt` | Multi-level container layouts for deep architectural overviews, rendered via Svgbob. | documented |
| 09 | **Products** | `*.products.transitrix.yaml` | Inventory of products and services — text-and-table catalogue, no diagram. | draft |
| 10 | **Applications** | `*.applications.transitrix.yaml` | Inventory of applications and integrations — text-and-table catalogue, no diagram. | draft |
| 11 | **Scenarios** | `*.scenarios.transitrix.yaml` | Alternative strategic development paths — each scenario scopes its own goals, capabilities, activities, products, processes, and applications. | documented |
| 13 | **Process Blueprint** | `*.process-blueprint.transitrix.yaml` | Wide blueprint of a value chain — stages laid out left-to-right, each carrying its goal, result, and supporting systems / actors / equipment / information entities. | draft |

The number `12` is intentionally reserved for a forthcoming **Gantt** notation; the gap between `11` and `13` is deliberate. Until that notation lands, the calendar-timeline view ships as the Gantt projection of the Activities notation (07).

Notations 09 (Products) and 10 (Applications) are **catalogue** forms — they render as text and tables rather than as a custom diagram. Every other notation is a diagram: notation 08 is rendered through Transitrix Studio's Svgbob backend, the rest through Studio's shared diagram engine.

### 6.1 Where each notation lives in the repository

Diagrams and aggregations live under `views/`. Atomic ArchiMate elements live under `elements/`. The two layers stay separate (see §4).

| Notation | Typical location | What it is |
| --- | --- | --- |
| BPMN process diagram | `views/bpmn/<PROCESS_CODE>_process.bpmn.transitrix.yaml` | Detailed flow describing one BusinessProcess element |
| FGCA | `views/fgca/<DOMAIN>.fgca.transitrix.yaml` | Chain referencing Factor + Goal + Change + Activity elements |
| FGA | `views/fga/<DOMAIN>.fga.transitrix.yaml` | Chain referencing Factor + Goal + Activity elements |
| Goals tree | `views/goals/<DOMAIN>.goals.transitrix.yaml` | Hierarchy referencing Goal elements |
| Capabilities map | `views/capabilities/<DOMAIN>.capability-map.transitrix.yaml` | Hierarchy referencing Capability elements + maturity overlay |
| Process landscape map | `views/processmap/<DOMAIN>.process-map.transitrix.yaml` | Catalogue referencing BusinessProcess elements |
| Activities | `views/activities/<NAME>.activities.transitrix.yaml` | Activity-on-Node schedule network referencing Activity, Goal, and Change elements |
| Nested block diagrams | `views/blocks/<NAME>.blocks.transitrix.txt`, or inline alongside markdown documentation | Multi-level block layouts (Svgbob) |
| Products view | `views/products/<DOMAIN>.products.transitrix.yaml` | Filtered view over Product elements |
| Applications view | `views/applications/<DOMAIN>.applications.transitrix.yaml` | Filtered view over Application elements |
| Scenarios | `views/scenarios/<NAME>.scenarios.transitrix.yaml` | Alternative strategic development paths, each scoping its own goals, capabilities, activities, products, processes, and applications |
| Process Blueprint | `views/process-blueprint/<DOMAIN>.process-blueprint.transitrix.yaml` | Wide value-chain blueprint referencing stage aspects (systems, actors, equipment, information entities) |

Individual product and application instances are still stored as **atomic elements** in their respective ArchiMate-layer folders — `elements/02_business/<PRODUCT_ID>.yaml` (with `type: Product`) and `elements/03_application/<APP_ID>.yaml` (with `type: ApplicationComponent`). The "view" file in `views/products/` or `views/applications/` defines how to filter, group, and present those elements (e.g., "all active Products grouped by category").

Inline diagrams (Mermaid blocks in markdown, embedded ASCII block diagrams) are explicitly allowed when the diagram is bound to one specific document and has no independent life. Use stand-alone files in `views/` when the diagram is a first-class artefact of the model.

### 6.2 FGCA — strategy-to-execution chain

FGCA is the Transitrix notation for translating strategy into coordinated execution. It answers a single management question:

> *How do our day-to-day initiatives directly support strategic intent?*

Four layers, read as a cause-and-delivery chain:

- **Factors** — external and internal drivers that explain why action is needed now.
- **Goals** — strategic outcomes the organisation wants to achieve.
- **Changes** — business transformations required to make goals real.
- **Activities** — concrete initiatives, projects, and workstreams that deliver those changes.

Used in three views:

- **Top-down (strategy → execution)** — confirm every activity has clear strategic purpose.
- **Bottom-up (execution → strategy)** — confirm initiatives aren't disconnected from goals.
- **Portfolio** — identify concentration, overlaps, and gaps in strategic coverage.

FGA is the same chain without the Changes layer — used when the transformation step is implicit or trivial. Both notations render as visual chains in Transitrix Studio.

See `notations/02-fgca.md` for the full FGCA notation reference (file format, fields, examples, DSM implementation status). See `notations/03-fga.md` for the FGA variant.

### 6.3 Capabilities and maturity

Capabilities are described in two axes:

- **Vertical capabilities (V)** — primary business domains, hierarchical in three levels (V1, V1.1, V1.1.1).
- **Horizontal capabilities (H)** — cross-cutting supporting capabilities (H1, H1.1).

Each capability carries a 5-level CMM maturity score over time — historical assessments and target levels with target dates. The capability is linked to the elements that realise it: BusinessRole owners, BusinessProcess instances, and ApplicationComponent supporters. Maturity assessment becomes traceable to the systems and people that determine it.

### 6.4 Process diagrams (BPMN) and process landscape maps

Process diagrams (BPMN, `.bpmn.transitrix.yaml`) describe **how** a single process flows: tasks, gateways, lanes, KPIs, data flow.

Process landscape maps (`.process-map.transitrix.yaml`) describe **what** processes exist in the organisation: the catalogue, grouped by Operating / Supporting / Management, with hierarchical decomposition. The landscape map is the inventory; process diagrams are the detailed views.

The two notations are complementary — most organisations need both.

## 7. Change lifecycle

Working with the Transitrix repository is structurally identical to working with a software codebase:

1. **Create.** Copy a template from `.templates/` into the appropriate `elements/` or `relations/` folder.
2. **Describe.** Fill in the YAML — element attributes or relation endpoints. Add metadata (owner, status, dates).
3. **Validate.** Run the linter (`.validators/lint.py`) locally. Fix syntax, integrity, and policy errors.
4. **Review.** Open a pull request. Reviewers see the change as a Git diff — the same review surface as for code.
5. **Publish.** Merge triggers CI: diagrams are regenerated, the architecture portal updates, downstream integrations refresh.

The implication for governance: every change to the enterprise model is observable, reviewable, and reversible. There is no shadow architecture maintained outside the repository.

## 8. Validation matrix

The linter applies five categories of rules. Each category has progressively-deeper checks; this is the v1 baseline.

| Category | Check |
| --- | --- |
| **Syntax** | The file is valid YAML; required fields are present; types match the schema. |
| **Atomicity** | Element files contain no relations section; relation files contain no element fields beyond endpoints. |
| **Referential integrity** | Every `source` and `target` in a relation refers to an existing element id. |
| **Semantics** | Relations conform to ArchiMate 3.2 layer rules (e.g., a BusinessRole cannot be served by an ApplicationComponent without an intermediate ApplicationService). |
| **Policy** | Active / Production status requires an `owner` field; recent updates require an `updated_at` date; deprecated elements must reference a successor. |

Validators run locally on save and as a CI gate on every pull request. A pull request that breaks the validation matrix cannot be merged.

## 9. Naming conventions

Consistency in names is a small thing that pays back daily during diff review and search.

| Item | Format | Examples |
| --- | --- | --- |
| YAML element files | `UPPER_SNAKE_CASE.yaml` | `ORDER_API.yaml`, `CUSTOMER_DATABASE.yaml` |
| Documentation | `kebab-case.md` | `getting-started.md`, `project-rules.md` |
| Organisation folders | `snake_case` | `acme_corp`, `tech_innovations` |
| Element ids | `[TYPE]-[DOMAIN]-[SEQUENCE]` | `ROLE-SALES-001`, `PROC-ORD-FULFILL-001`, `APP-CRM-001` |
| Relation ids | `REL-[CONTEXT]-[SEQUENCE]` | `REL-ORD-001` |

### 9.1 Element id type prefixes

| Prefix | ArchiMate type |
| --- | --- |
| `ROLE` | BusinessRole |
| `ACTOR` | BusinessActor |
| `PROC` | BusinessProcess |
| `FUNC` | BusinessFunction |
| `CAP` | Capability |
| `APP` | ApplicationComponent |
| `SVC` | ApplicationService |
| `DATA` | DataObject |
| `NODE` | Node (infrastructure) |
| `SYS` | SystemSoftware |
| `EXT` | External system |

### 9.2 Mandatory metadata

Every element carries:

```yaml
metadata:
  status: "Draft"                # Draft | Active | Deprecated
  owner: "firstname.lastname"
  created_at: "2026-05-03"
  updated_at: "2026-05-03"
  tags: ["tag1", "tag2"]
```

`owner` is mandatory for any element with status `Active` or `Production`. Without an owner, the linter blocks the change.

## 10. Documentation hierarchy

A Transitrix repository carries documentation at three levels:

**Repository root:**

- `README.md` — overview and quick start
- `methodology.md` (this document) — canonical methodology spec
- `glossary.md` — standard terminology
- `LICENSE`, `CONTRIBUTING.md` — open-source artefacts

**Per-organisation root (`organizations/<org>/`):**

- `README.md` — organisation overview
- `GETTING_STARTED.md` — onboarding for that organisation's team
- `CONVENTIONS.md` — local naming overrides and conventions

**Per-template folder (`organizations/<org>/.templates/`):**

- `EXAMPLES.md` — worked example scenarios

All documentation is Markdown. Default language is English; translations live in `translations/` subfolders, never as canonical sources.

## 11. Tooling

Transitrix Studio is the reference implementation of this methodology — a unified VS Code extension and CLI that handles every Transitrix-specific format (BPMN, goals, capabilities, blocks, FGCA, FGA, process landscape map). Studio renders diagrams, validates files against schema, and applies pure data mutations.

Other tools in the ecosystem will use the same shared library (`@transitrix/diagrams`) so renders are identical wherever Transitrix files are viewed — Studio in VS Code, web browsers, embedded previews on documentation sites.

For organisations integrating Transitrix into existing pipelines, the linter (`.validators/lint.py`) is a standalone Python script that runs without Studio. Diagrams can also be rendered headlessly through the Studio CLI for CI artefacts.

## 12. Getting started

### 13.1 For a new organisation

1. Read `organizations/NEW_ORGANIZATION_TEMPLATE.md`.
2. Create `organizations/<your_org_slug>/`.
3. Copy structure from `organizations/acme_corp/` as a starting reference.
4. Adapt `.templates/` to local conventions and overrides.
5. Add the first elements to `elements/`.
6. Open a pull request to introduce the organisation; the validators check the structure.

### 13.2 For modelling capabilities

1. Open `<org>/.templates/capability-map_template.yaml`.
2. Define vertical (V) and horizontal (H) capabilities.
3. Score current maturity (CMM 1–5) per capability.
4. Link each capability to its owning role, supporting processes, and realising applications.
5. Set target maturity and a target date.
6. Commit and open a PR.

### 13.3 For modelling complex processes

Use Transitrix Studio for BPMN authoring with lanes, stages, and KPIs.

1. Open `<org>/.templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml`.
2. Define lanes (one per organisational role or actor).
3. Decompose the process into stages.
4. Describe steps with explicit data flow (`required_data`, `output_data`).
5. Add quality gates and decision gateways.
6. Define KPIs with calculation references to step ids.
7. Render with Studio; export SVG / PNG for documentation.

## 13. Versioning

This methodology document follows semantic versioning at the methodology level:

- **Major** — breaking changes to the YAML DSL, file layout, or naming convention.
- **Minor** — new notations, new validation rules, additive schema changes.
- **Patch** — wording, examples, clarifications.

Current methodology version: **1.0**. Tooling versions (Transitrix Studio, etc.) advance independently and declare their compatible methodology version range.

## 14. License and contributing

Transitrix is open source under the **MIT license**. See `LICENSE` at the repository root.

To contribute, see `CONTRIBUTING.md`. Contributions are accepted as pull requests under the standard developer-certificate-of-origin pattern.

## 15. Authorship

Transitrix is authored by **Valerii Korobeinikov**. The methodology — including the FGCA / FGA notations and all other notations specified in §6 — forms a single authored work published as open documentation. The specification is freely reusable under the published license.

---

**Document version:** 1.0 (initial English canonical, 2026-05-07).
**Status:** Active.
