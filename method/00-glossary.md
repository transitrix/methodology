# Transitrix Glossary

**Purpose:** Plain-language definitions of Transitrix terms and abbreviations, for readers who don't yet know the vocabulary. For anything that changes as the methodology evolves — the full TYPE registry, relation kinds, field names — this glossary links to the authoritative spec rather than repeating it, so it can't drift out of sync the way a duplicated list does.
**Format:** English
**Last updated:** 2026-07-04

---

## Core concepts

| Term | Definition |
|---|---|
| **Transitrix** | Text-native methodology for managing enterprise architecture as code: models, processes, and capabilities stored as YAML files in a Git repository. |
| **Architecture-as-Code (AaC)** | Approach to defining and managing architecture through version-controlled text files rather than a GUI-only modelling tool. |
| **ArchiMate** | The Open Group's open standard for enterprise architecture modelling (current version: 3.2). Transitrix's element and relation vocabulary is grounded in it — see [ArchiMate alignment](#archimate-32-alignment) below. |
| **Element** | An architectural primitive — the atomic unit of modelling (a goal, a role, a process, an application component). One element = one file. |
| **Relation (`REL`)** | A first-class, time-aware, typed link between two canonical primitives (`valid_from` / `valid_to`), stored as its own file under `canon/relations/`. See [`elements/17-relations.md`](notations/elements/17-relations.md) for the closed enum of relation kinds (e.g. `parent`, `action_goal`, `depends_on`, `offers`, `realizes`, `hosts`, `uses`). |
| **Atomicity** | Principle by which an element's description and its relations are stored in separate files — an element file never inlines a first-class relation. |
| **Canon** | The validated, authoritative model — the zone everything else is admitted into. |
| **Field** | The zone for raw, unprocessed source material (interviews, surveys, observations, drafts) — not authoritative; its value is provenance. |
| **Codex** | The zone for externally-given constraints and internally-issued authority documents (laws, regulations, policies, internal standards) — *given to* the organisation, not authored by it. |
| **Zone** | One of the three parallel content areas above (`canon` / `field` / `codex`), defined in [`notations/CONTRACT.md`](notations/CONTRACT.md) §5. Parallel, not stacked. |
| **Operations** | The team's own operational layer (`operations/decisions/`, `operations/work-items/`) — sits outside the three zones, not admitted through zone gates. See [`method/06-team-operations.md`](method/06-team-operations.md). |

## Layers (ArchiMate)

| Term | Definition |
|---|---|
| **Motivation layer** | Goals, drivers, constraints, requirements, stakeholders, assessments — `canon/elements/01_motivation/`. |
| **Business layer** | Roles, actors, processes, capabilities, products, rules, registries — `canon/elements/02_business/`. |
| **Application layer** | Components, services, integrations, data objects — `canon/elements/03_application/`. |
| **Technology layer** | Nodes, technology services, equipment — `canon/elements/04_technology/`. |
| **Implementation layer** | Actions, changes, scenarios, target states — `canon/elements/05_implementation/`. |

## ID grammar

Every element ID and cross-reference follows one grammar: `<TYPE>-[<middle segment(s)>-]<INTEGER>`, where `TYPE` is an uppercase, full-word prefix from the canonical registry (e.g. `DRIVER-1`, `GOAL-RETENTION-12`) — **not** a 3-letter abbreviation. The terminal integer carries no leading zeros. `CAPABILITY` is the one exception, using a V/H diagram address instead of a plain integer (`CAPABILITY-V1.2`).

Full grammar, the exception, and the complete TYPE registry (element types, document-level types, field/codex/assertion types): [`notations/IDS_AND_REFERENCES.md`](notations/IDS_AND_REFERENCES.md). Don't rely on a copy of that registry here — it changes as the methodology grows; the spec is the single source of truth.

## Admission and lifecycle

| Term | Definition |
|---|---|
| **Admission** | The gate a draft passes through to become authoritative canon — a human reviewer completes `gate_checks`, sets `admission_state: active`, and records `admitted_at` / `admitted_by`. |
| **`admission_state`** | `proposed` \| `active` \| `rejected`. Absent ⇒ `active` (human-authored canon is admitted by construction). Orthogonal to `zone`. |
| **`reviewer_authority`** | `ai_reviewed` \| `expert_confirmed` — the authority tier of whoever admitted the artefact. Both tiers are admitted canon; this is a separate axis from `admission_state`. |
| **`status`** | Optional, organisation-defined workflow state (e.g. `active`, `draft`, `deprecated`) — distinct from the Planned/Active/Retired state *derived* from `valid_from` / `valid_to`. Records authoring/governance state, not temporal validity. |
| **`valid_from` / `valid_to`** | The date range an element or relation is in effect. `valid_to: null` means still in effect. Superseding a fact means adding a new record and closing the old one's `valid_to` — never rewriting it in place. |

## Project structure

| Term | Definition |
|---|---|
| **Adopter repository** | A repository following the Transitrix zoned layout (`canon/` + `field/` + `codex/` + optional `operations/`), pinned to a `methodology_version` in `transitrix.yaml`. |
| **Multi-tenant** | An adopter repository convention that nests multiple organisations under `organizations/<org_slug>/`, each with its own zones — for a parent group plus subsidiaries, or multiple business units. Single-tenant repos put the zones at the repo root instead. |
| **Template** | A copy-and-fill starter file for a new element, relation, or view — see `transitrix/skills/onboard/templates/`. |
| **Validator** | The whole-repo model-integrity linter (`.validators/lint.py` in an adopter repo, `tools/lint.py` in this one) or the per-file `@transitrix/cli` validator. See the two-tool validation model in [`notations/README.md`](notations/README.md). |
| **View** | A render-able, presentation-only document over the canon elements — carries no canonical content of its own (the reconstruction invariant, [`ELEMENT_PRIMITIVES.md`](notations/ELEMENT_PRIMITIVES.md) §1.1). |

## File types

| Extension | Purpose |
|---|---|
| `*.<short-name>.transitrix.yaml` | A notation document — the `<short-name>` names which notation (`bpmn`, `dgca`, `goals`, `capability-map`, …). Full catalogue: [`notations/README.md`](notations/README.md). |
| `.yaml` (bare, under `canon/elements/**` or `canon/relations/**`) | A standalone element or relation file. |
| `.md` | Documentation — specs, guides, decision records. |
| `.py` / `.mjs` | Tooling — validators, linters, doc-lint scripts. |

## Abbreviations

| Abbreviation | Full form |
|---|---|
| **AaC** | Architecture-as-Code |
| **ADR** | Architecture Decision Record |
| **ADL** | Architecture Decision Log (the multi-repo ADR aggregation component) |
| **BPMN** | Business Process Model and Notation |
| **API** | Application Programming Interface |
| **DB** | Database |
| **REST** | Representational State Transfer |
| **YAML** | YAML Ain't Markup Language |
| **CI/CD** | Continuous Integration / Continuous Delivery |
| **SLA** | Service Level Agreement |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |

## Documentation terms

| Term | Context |
|---|---|
| **README** | Overview document for a repo or folder. |
| **GETTING_STARTED** | Tutorial for new users of an adopter repo. |
| **CONVENTIONS** | An adopter's local naming standards and overrides. |
| **AGENTS.md** | Assistant-neutral agent guide for an adopter repo. |
| **glossary.md** | This document. |

## ArchiMate 3.2 alignment

Transitrix is grounded in ArchiMate 3.2 but uses deliberately simplified or domain-friendly names in a few places. This table records only the **intentional divergences** — for the full TYPE list see [`notations/IDS_AND_REFERENCES.md`](notations/IDS_AND_REFERENCES.md) §3.

| Transitrix TYPE | ArchiMate 3.2 term | Note |
|---|---|---|
| `TARGET_STATE` | Plateau | "Target State" is more accessible to business stakeholders. |
| `CHANGE` | Gap | "Change" better reflects the transformation concept in practice. |
| `SCENARIO` | Course of Action | "Scenario" is more intuitive for practitioners; realised by `ACTION` / `CHANGE` steps (Work Packages + Gaps). |
| `ACTION` | Work Package | Broader than a single work package — covers initiatives, programmes, projects, and tasks. **Deprecated alias:** `ACTIVITY` (accepted with a warning until the 1.0 cut). |
| `BUSINESS_OBJECT` | Business Object | Renamed from `INFORMATION_ENTITY` for ArchiMate alignment; `INFORMATION_ENTITY` is a deprecated alias. |
| `ACTOR` | Business Actor | A single active-structure identity type (`person` \| `business_unit` \| `system`) replacing the former separate `UNIT` / `EMPLOYEE` TYPEs. |
| `TERM` | Meaning | "Term" is more accessible than ArchiMate's "Meaning" for a business-vocabulary entry (name + definition, no modelled behaviour). |

Everything else in the registry (`GOAL`, `DRIVER`, `CONSTRAINT`, `REQUIREMENT`, `STAKEHOLDER`, `ASSESSMENT`, `EQUIPMENT`, `ROLE`, `PROCESS`, `CAPABILITY`, `APPLICATION`, `NODE`, `TECHNOLOGY_SERVICE`, `BUSINESS_SERVICE`, `LOCATION`, …) uses the ArchiMate term directly or a name aligned with it — no divergence to record.

---

**Consistency:** use terms from this glossary consistently across project documents. When a term's definition would require restating something the canon already defines precisely (a field's semantics, a validation code, an ID grammar detail), link to the spec instead of copying it here.
