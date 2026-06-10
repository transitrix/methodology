# IDs and cross-references — canonical grammar

This appendix defines the ID grammar used across all Transitrix notations and enumerates the TYPE registry. Every element ID and every cross-reference in any notation file follows this grammar.

Recorded 2026-05-20 as the canonical decision for the methodology.

---

## 1. Grammar

```
<TYPE>-[<middle segment(s)>-]<INTEGER>
```

- **TYPE** — uppercase entity-type prefix from the registry in §3. The prefix names *what kind of thing* the ID refers to. The TYPE segment is composed of uppercase letters `A`–`Z`, digits `0`–`9`, and the underscore `_`; it MUST start with a letter. The underscore allows multi-word TYPE names — `PROCESS_BLUEPRINT` (the first registered TYPE to use one, decided 2026-05-21) and `INFORMATION_ENTITY` (registered alongside it).
- **Middle segments** — optional, notation-specific. Add for disambiguation (a domain code, a period, a programme name). The grammar fixes only the start and the end of an ID; a notation MAY define one or more middle segments where needed. A middle segment may be alphanumeric or purely numeric, and a numeric middle segment **MAY carry leading zeros** where it is a zero-padded date or period component — e.g. the month and day of an ISO date, `INTERVIEW-cfo-onboarding-2026-04-15-1` (`04`, `15`). The no-leading-zeros rule below constrains the **terminal** integer only; middle segments are labels, not the sort key.
- **INTEGER** — terminal positive integer, ≥ 1, **no leading zeros** — this constraint applies to the **terminal** integer only (it is the numeric sort key; numeric middle segments are exempt, see above). Sorting and comparison MUST parse it numerically, never lexically. There is no fixed width and no upper bound.

**Examples:**

| ID | TYPE | Middle | Integer | Notes |
|---|---|---|---|---|
| `FACTOR-1` | FACTOR | — | 1 | minimal form |
| `GOAL-RETENTION-12` | GOAL | RETENTION | 12 | one middle segment |
| `ACTIVITY-Q3-2026-7` | ACTIVITY | Q3, 2026 | 7 | two middle segments |
| `INTERVIEW-cfo-onboarding-2026-04-15-1` | INTERVIEW | cfo, onboarding, 2026, 04, 15 | 1 | zero-padded ISO-date middle segments (`04`, `15`) are valid — the ban is terminal-only |
| `FACTOR-CHURN-001` | — | — | — | **invalid** — leading zero on the *terminal* integer. Use `FACTOR-CHURN-1`. |
| `factor-1` | — | — | — | **invalid** — TYPE must be uppercase. |
| `FACTOR-` | — | — | — | **invalid** — missing terminal integer. |
| `PROCESS_BLUEPRINT-FULFIL-1` | PROCESS_BLUEPRINT | FULFIL | 1 | underscore in TYPE — permitted |
| `BUSINESS_OBJECT-ORDER-3` | BUSINESS_OBJECT | ORDER | 3 | underscore in TYPE — permitted |

---

## 2. Exception — `CAPABILITY`

Capability IDs end with a V/H diagram address instead of a plain integer:

```
CAPABILITY-V<L1[.L2[.L3]]>
CAPABILITY-H<L1[.L2[.L3]]>
```

- `V` = vertical capability (column in the diagram).
- `H` = horizontal capability (row cutting across columns).
- Each address component (`L1`, `L2`, `L3`) is a positive integer ≥ 1, no leading zeros, no upper bound.
- `0` is reserved for the root node and is never used in a capability ID.
- Depth is **capped at three levels** (`L1.L2.L3`). A fourth level (`L1.L2.L3.L4`) is invalid.

**Examples:**

- `CAPABILITY-V1`
- `CAPABILITY-V1.2`
- `CAPABILITY-V1.2.3`
- `CAPABILITY-H1.2`

The diagram address derives from the V/H positional addressing system documented in [`05-capability-map.md`](views/05-capability-map.md) §4–5. Capability IDs are the only place the trailing integer is replaced by a multi-component path; every other TYPE follows §1 unchanged.

---

## 3. TYPE registry

The complete set of canonical TYPE prefixes. Use exactly the listed form — abbreviations like `ACT`, `CHG`, `FAC`, `CAP`, `SCN` are deprecated and being migrated out (see §6).

### 3.1 Element types

Elements that get referenced across documents.

| TYPE | What it is | Used by |
|---|---|---|
| `FACTOR` | strategic driver — external or internal | FGCA, FGA |
| `GOAL` | strategic or tactical goal | Goals tree, FGCA, FGA, Activities |
| `CHANGE` | business transformation (the BDN change layer) | FGCA, Activities (`delivers_changes:`) |
| `ACTIVITY` | initiative / workstream | FGCA, FGA, Activities |
| `CAPABILITY` | capability — V/H sub-grammar, see §2 | Capability map, Products, Applications, Process map |
| `PROCESS` | business process | Process landscape map, BPMN |
| `STEP` | process-flow step — a single node (task / event / gateway) in a `PROCESS` element's `flow`. Canonical-by-containment within its PROCESS (which carries the admission record); addressable by its `STEP-…` id and promoted to a standalone catalogue record only when a second document first references it — a step-level `CHANGE`, a `RULE.applies_to`, an `ACTIVITY` realising it, or an `ASSERTION` (`subject` / `realised_via`). | `PROCESS.flow` (inline, §7.5); promoted to `elements/02_business/steps/`. Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.21. |
| `PRODUCT` | product or service | Products catalogue |
| `APPLICATION` | application | Applications catalogue |
| `INTEGRATION` | integration between applications | Applications catalogue |
| `ROLE` | business role — a position / responsibility, distinct from the `ACTOR` that fills it | referenced as `owner_role` across notations; `role.unit` references an `ACTOR` of `type: business_unit` |
| `ACTOR` | active-structure identity — `person`, `business_unit`, or `system` (ArchiMate Business Actor). Replaces the former `UNIT` / `EMPLOYEE` TYPEs (removed 2026-05-29). Engagement (employment, candidacy, …) and org hierarchy are first-class `REL` records, not inline fields. | Actors catalogue (`elements/02_business/actors/`); referenced as activity `owner`. Schema: [19-actors.md](elements/19-actors.md). |
| `SCENARIO` | implementation-layer **path** primitive — the ordered set of steps (`ACTIVITY` / `CHANGE`) that moves the enterprise to one `TARGET_STATE` in service of one or more `GOAL`s (ArchiMate Course of Action realised by Work Packages + Gaps). The destination is a separate primitive (`TARGET_STATE`); the scenario references it via `arrives_at` and owns its `steps`. | Scenarios catalogue (`elements/05_implementation/scenarios/`); rendered by [11-scenarios.md](views/11-scenarios.md) as a report-config view. Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.19. |
| `EQUIPMENT` | ArchiMate Physical element — physical instrument, device, or facility a process stage depends on. Catalogued at `canon/elements/04_technology/equipment/` (ADR 2026-06-08; first catalogued TYPE for this layer). | Process Blueprint; Technology layer catalogue. Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.14. |
| `BUSINESS_OBJECT` | ArchiMate Business Object — passive information element at the business grain ("customer order", "customs declaration", "invoice"). Replaces `INFORMATION_ENTITY` (renamed for ArchiMate alignment). Catalogued at `canon/elements/02_business/business-objects/` (ADR 2026-06-08). `INFORMATION_ENTITY` is a deprecated alias for one release (see §6). | Process Blueprint; Business layer catalogue. Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.15. |
| `RULE` | business rule (business layer per ArchiMate 3.2) | Rules catalogue (`elements/02_business/rules/`); referenceable from any notation via `applies_to:` |
| `REGISTRY` | business-layer **operating-configuration** primitive — a curated, org-authored list the organisation maintains to drive an operating activity. Worked example: the regulatory **source registry** (which sources to watch, where, how, how often). Rows are inline, canonical-by-containment, promotable. Distinct from `RULE` (decision logic, not a maintained list), from codex (codex is *given to* the org; a registry is *authored by* it), and from the Field zone (a registry is curated/authoritative, not contradiction-tolerant evidence). | Registries catalogue (`elements/02_business/registries/`). Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.20. |
| `CONSTRAINT` | design / operating constraint (motivation layer per ArchiMate 3.2) — a restriction or prohibition the organisation must not cross | Constraints catalogue (`elements/01_motivation/constraints/`); referenced from FGCA factors via `references_constraint:` |
| `REQUIREMENT` | regulatory or organisational requirement (motivation layer per ArchiMate 3.2) — a positive obligation the organisation must fulfil. Distinct from `CONSTRAINT` by **form of the obligation**: REQUIREMENT = positive action ("must submit", "must register", "must obtain approval"); CONSTRAINT = restriction ("must not", "cannot exceed"). | Requirements catalogue (`elements/01_motivation/requirements/`); cites its source via `derived_from:` (codex `LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD`). Schema: [15-requirement.md](elements/15-requirement.md). |
| `STAKEHOLDER` | motivation-layer interest primitive (ArchiMate Stakeholder) — `internal` / `external`. Carries the stake profile (concern, interest, influence) and **references an `ACTOR` for identity** (`actor:` required); never carries identity itself. | Stakeholders catalogue (`elements/01_motivation/stakeholders/`); stakes in specific objects are `stakeholding` relations. Schema: [20-stakeholders.md](elements/20-stakeholders.md). |
| `ASSESSMENT` | motivation-layer finding (ArchiMate Assessment) — a **dated finding/judgement about the state of a `FACTOR`** (driver), e.g. "support response time 8h, degrading". Carries the finding and its observation date; **no polarity / SWOT field** (polarity lives on the `INFLUENCE` relation). One driver accrues many assessments over time, which is what justifies it as its own element. | Assessments catalogue (`elements/01_motivation/assessments/`); `assesses:` references one `FACTOR`. Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.17. |
| `TARGET_STATE` | implementation-layer **end-state** primitive (ArchiMate Plateau) — a structural snapshot of the `CAPABILITY` / `PROCESS` / `APPLICATION` selection that exists when one or more goals are met. The object an architect varies when presenting solution options; satisfies one or more `GOAL`s and is reached by one or more `SCENARIO` paths. | Target-states catalogue (`elements/05_implementation/target-states/`); composition is inline (`capabilities[]`, `processes[]`, `applications[]`). Schema: [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.18. |
| `REL` | first-class time-aware relation between two canonical primitives — `parent`, `activity_goal`, `goal_parent`, etc. Carries its own `valid_from` / `valid_to` so changes to a relation (a capability re-parenting, a goal re-aimed) are first-class temporal events. | Relations catalogue (`canon/relations/`); one file per relation. Schema: [17-relations.md](elements/17-relations.md). |
| `MILESTONE` | project-narrative milestone — a decision gate, certification date, or programme-level marker that belongs in an Activity Card's narrative. Distinct from a "schedule milestone" (a zero-duration activity inside an Activities document, see [07-activities.md](views/07-activities.md) §5.9), which exists for critical-path computation. | Defined inside an Activity Card document (`*.activity-card.transitrix.yaml`); scope is the parent card document. Schema: [18-activity-card.md](views/18-activity-card.md). |

### 3.2 Document-level types

Each notation file carries its own ID using the same grammar; the TYPE names the notation.

| TYPE | Notation file |
|---|---|
| `FGCA` | `*.fgca.transitrix.yaml` |
| `FGA` | `*.fga.transitrix.yaml` |
| `GOALS_TREE` | `*.goals.transitrix.yaml` |
| `CAPABILITY_MAP` | `*.capability-map.transitrix.yaml` |
| `PROCESS_MAP` | `*.process-map.transitrix.yaml` |
| `ACTIVITIES_NET` | `*.activities.transitrix.yaml` |
| `PRODUCTS_CAT` | `*.products.transitrix.yaml` |
| `APPLICATIONS_CAT` | `*.applications.transitrix.yaml` |
| `SCENARIOS` | `*.scenarios.transitrix.yaml` |
| `BLOCKS` | `*.blocks.transitrix.yaml` |
| `PROCESS_BLUEPRINT` | `*.process-blueprint.transitrix.yaml` |
| `ACTIVITY_CARD` | `*.activity-card.transitrix.yaml` |
| `COMPLIANCE_IMPACT` | `*.compliance-impact.transitrix.yaml` |
| `COVERAGE_METRIC` | `*.coverage-metric.transitrix.yaml` |

BPMN diagrams use their `process.id` as the document identifier; that field is a free-form string defined by the spec, not by this appendix.

### 3.3 File-local labels (standalone BPMN projection only)

In a **standalone `.bpmn.transitrix.yaml` projection** — a generated diagram, not an authored source — the node IDs (`POOL-…`, `GW-…`, `TASK-…`, `SF-…`, `SE-…`, `EE-…`) are local labels, not cross-document references: they identify nodes within that one rendered file and are not part of the TYPE registry above.

This does **not** apply to a process flow authored inside a `PROCESS` element ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.5). There the flow is canon: each `flow.steps[].id` follows the canonical ID grammar (§1) and is **addressable** — unique within its `PROCESS` and referenceable by a step-level `CHANGE`, a `RULE`, an `ACTIVITY`, or an `ASSERTION` — and is promoted to the registered standalone `STEP` TYPE (§3.1; element-file shape and promotion mechanic in [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.20) only if a second document references it (canonical-by-containment + promotion, [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §1). The `STEP` TYPE is the canonical step identity; the file-local `TASK-…` / `SE-…` / `EE-…` labels above are projection labels, never a step's catalogue identity.

### 3.4 Field artefact types

Raw, unprocessed material in the **Field** zone (see [CONTRACT.md](CONTRACT.md) §5). Field artefacts are not authoritative; their value is provenance. A Canon record cites the Field material behind it via `derived_from:` ([CONTRACT.md](CONTRACT.md) §6).

| TYPE | What it is |
|---|---|
| `INTERVIEW` | a recorded interview or its notes |
| `SURVEY` | a survey instrument and/or its responses |
| `OBSERVATION` | a direct observation of work, a system, or an event |
| `DRAFT` | a working draft not yet admitted to canon |
| `AMENDMENT` | a structured record that a watched codex source has been amended — what moved, when it was detected, the source section, hints about likely-impacted canon elements, and (post-adjudication) the canon `CHANGE` / Gap elements it motivates. Distinct from canon `CHANGE` (§3.1, ArchiMate Gap — the *org's planned delta*); AMENDMENT records the *external detection event*. Schema: [22-amendment.md](elements/22-amendment.md). |
| `SEGMENT` | an extracted chunk of a codex source — one article / clause / paragraph / section — with a locator into the source and the chunk text (or its `sha256` fingerprint). The addressable text-level provenance that an `AMENDMENT` (`segment_refs[]`), a `REQUIREMENT` / `ASSERTION`, or the compliance-impact view cites instead of a free-text section string. Schema: [23-segment.md](elements/23-segment.md). |

### 3.5 Codex artefact types

External constraints and internal authority documents in the **Codex** zone — *given to* the organisation, not authored by it. See [CONTRACT.md](CONTRACT.md) §5 and [14-codex.md](elements/14-codex.md).

| TYPE | Sub-zone | What it is |
|---|---|---|
| `LAW` | codex / external | a statute or act binding the organisation |
| `REGULATION` | codex / external | a regulation issued under a law |
| `POLICY` | codex / internal | an internal policy the organisation issues |
| `INTERNAL_STANDARD` | codex / internal | an internal standard or convention |

### 3.6 Assertion type

Compliance claims linking a `REQUIREMENT` to the elements that realise it. Assertions are canonical (canon zone) but live **outside** the `elements/` tree, under `canon/assertions/`. Schema: [16-assertion.md](elements/16-assertion.md).

| TYPE | What it is |
|---|---|
| `ASSERTION` | a claim that a subject (`PRODUCT` / `PROCESS` / `CAPABILITY`) satisfies a `REQUIREMENT`, with status and evidence |

---

## 4. Uniqueness scope

Each TYPE has a scope within which its IDs must be unique. Cross-document references rely on the wider scope holding.

| TYPE | Uniqueness scope |
|---|---|
| `FACTOR`, `GOAL`, `CHANGE`, `ACTIVITY` | within the FGCA / FGA / Goals / Activities document that defines them. When referenced from across documents, IDs must also be unique within the organisation's element catalogue (`elements/01_motivation/`, `elements/02_business/`). |
| `CAPABILITY` | within the capability set (`set_name`, per [`05-capability-map.md`](views/05-capability-map.md) §5). |
| `PROCESS` | within the organisation's element catalogue (`elements/02_business/`). |
| `STEP` | within its `PROCESS` element while inline (canonical-by-containment); once promoted, within the organisation's element catalogue (`elements/02_business/steps/`), one file per promoted STEP. The id is unchanged by promotion (no rename). |
| `PRODUCT`, `APPLICATION` | within the organisation's element catalogue (`elements/02_business/` for `PRODUCT`, `elements/03_application/` for `APPLICATION`), one file per element. Both are `standalone` ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §4), so their IDs are org-wide-unique from creation (not document-scoped) — the §1 promotion rule does not apply (they are first-class catalogue elements, never inline). |
| `INTEGRATION` | within the catalogue document while `view-defined` (nested in an application's `integrations[]`, [`10-applications.md`](views/10-applications.md)); once promoted (§1 promotion rule), within the organisation's element catalogue (`elements/03_application/integrations/`), one file per promoted INTEGRATION. The id is unchanged by promotion (no rename). |
| `ROLE`, `ACTOR` | within the organisation's element catalogue (`elements/02_business/`). |
| `SCENARIO` | within the organisation's element catalogue (`elements/05_implementation/scenarios/`), one file per SCENARIO. |
| `EQUIPMENT` | within the organisation's element catalogue (`elements/04_technology/equipment/`), one file per EQUIPMENT (ADR 2026-06-08). |
| `BUSINESS_OBJECT` | within the organisation's element catalogue (`elements/02_business/business-objects/`), one file per BUSINESS_OBJECT. `INFORMATION_ENTITY` is a deprecated alias for one release — its IDs resolve to the same catalogue; migrate IDs to the `BUSINESS_OBJECT-` prefix. |
| `RULE` | within the organisation's element catalogue (`elements/02_business/rules/`), one file per RULE. |
| `REGISTRY` | within the organisation's element catalogue (`elements/02_business/registries/`), one file per REGISTRY. A registry's **rows** are unique within their REGISTRY (canonical-by-containment); a row is promoted to its own registered standalone TYPE only when a second document references it (§1 promotion rule, [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §1) — the same mechanic as a `PROCESS` flow step (§3.3). |
| `CONSTRAINT` | within the organisation's element catalogue (`elements/01_motivation/constraints/`), one file per CONSTRAINT. |
| `REQUIREMENT` | within the organisation's element catalogue (`elements/01_motivation/requirements/`), one file per REQUIREMENT. |
| `STAKEHOLDER` | within the organisation's element catalogue (`elements/01_motivation/stakeholders/`), one file per STAKEHOLDER. |
| `ASSESSMENT` | within the organisation's element catalogue (`elements/01_motivation/assessments/`), one file per ASSESSMENT. |
| `TARGET_STATE` | within the organisation's element catalogue (`elements/05_implementation/target-states/`), one file per TARGET_STATE. |
| `REL` | within the organisation's `canon/relations/` folder, one file per REL. |
| `MILESTONE` | within the activity-card document that defines it. MILESTONE IDs are not required to be unique across the organisation; they are document-scoped element identifiers (the parent card binds them). |
| `ASSERTION` | within the organisation's `canon/assertions/` folder, one file per ASSERTION. |
| `INTERVIEW`, `SURVEY`, `OBSERVATION`, `DRAFT`, `AMENDMENT`, `SEGMENT` | within the organisation's `field/` zone. Contradictions between Field artefacts are allowed; only the IDs must be unique. |
| `LAW`, `REGULATION` | within the organisation's `codex/external/` zone. |
| `POLICY`, `INTERNAL_STANDARD` | within the organisation's `codex/internal/` zone. |

Document-level IDs (`FGCA-…`, `FGA-…`, etc.) are unique within the organisation.

---

## 5. Cross-references

A cross-reference is a field whose value is an ID (or array of IDs) of another element. The pattern is consistent across notations:

- **Plural field name → array of typed IDs.** Example: `activities[].goals: [GOAL-1, GOAL-2]`.
- **Singular field name → single typed ID.** Example: `activities[].parent: PHASE-DESIGN`.
- **Child references parent.** A Goal references its driving Factors via `factors: [FACTOR-…]`; a Change references its Goals via `goals: [GOAL-…]`; an Activity references its Changes via `changes: [CHANGE-…]`. Any deviations are documented in the relevant notation spec.

A validator MUST check that every cross-reference resolves to a defined element of the correct TYPE. A reference to an undefined ID is an error; a reference whose target has the wrong TYPE prefix is also an error.

---

## 6. Migration checklist

The TYPE registry above was confirmed 2026-05-20. Several notations and example files still carry older, abbreviated, or untyped forms. Each row below is a follow-up migration: rewriting existing files is **out of scope for this appendix** and rolls out per notation as separate tasks.

| Old form | Canonical form | Where it appears | Notes |
|---|---|---|---|
| `ACT-…` | `ACTIVITY-…` | examples under `examples/fga/`, `examples/fgca/`, `examples/activities/`; spec example in `03-fga.md` §4; `07-activities.md` §4 (`delivers_changes: [CHG-001]`). | follow-up |
| `CHG-…` | `CHANGE-…` | spec example in `07-activities.md` §4; FGCA when its schema lands | follow-up |
| `FAC-…` | `FACTOR-…` | scenarios examples (`FAC-MARKET-001`, etc.); some FGA references | follow-up |
| `CAP-…` | `CAPABILITY-V…` / `CAPABILITY-H…` | residual: `11-scenarios.md` spec example + `examples/scenarios/optimistic-2027.scenarios.transitrix.yaml` | capability-map / products / applications / process-map portion **executed 2026-05-28**; scenarios remains as a follow-up |
| `SCN-…` / `SCEN-…` | `SCENARIO-…` | `11-scenarios.md`; scenarios examples; `07-activities.md` (`scenario: SCEN-2026-OPT`) | follow-up — variant `SCEN` vs `SCN` also needs unifying |
| Integer-only IDs (`1`, `2`, …) | typed string IDs (`GOAL-1`, `FACTOR-1`, …) | originally the FGCA example | covered in the in-flight FGCA schema PR — see [transitrix/methodology#7](https://github.com/transitrix/methodology/pull/7) |
| `V1`, `V1.2`, `H1.2` (no `CAPABILITY-` prefix) | `CAPABILITY-V1`, `CAPABILITY-V1.2`, `CAPABILITY-H1.2` | residual: `examples/scenarios/omnichannel-2028.scenarios.transitrix.yaml`; prose mentions in `method/methodology.md`; `integration/studio.md` | capability-map / products / applications / process-map portion **executed 2026-05-28** (capability-map examples + cross-refs in products / applications / process-map specs, examples, and `acme_corp` views); scenarios + supporting docs remain |
| Zero-padded sequences (`001`, `002`, …) | no-leading-zero integers (`1`, `2`, …) | most example files | follow-up — purely a string-form change; sort order is unaffected because comparison is numeric |
| `INFORMATION_ENTITY-…` ids and `information_entities[]` blueprint field | `BUSINESS_OBJECT-…` ids and `business_objects[]` field | any blueprint that carries `information_entities[]` aspect entries with ids | one-release alias window; validator emits `BOBJ-D001` warning; hard error in the following release. Migration recipe in `migrations/0.5-to-0.6/` (additive follow-up). |

**Migration policy:** one follow-up issue per notation (spec + its examples). Do not bundle migrations into a single mega-PR — they touch different files and benefit from independent review.

---

## 7. References

- Notation catalogue and the index of all notations: [`README.md`](README.md).
- Capability addressing (the V/H system that the `CAPABILITY` exception relies on): [`05-capability-map.md`](views/05-capability-map.md) §4–5.
- Methodology: `method/methodology.md`.
