# Architecture standards: evidence and mapping

This review is for model authors, methodology maintainers and semantic-tool
implementers assessing interoperability. It is **non-normative**: recommendations
below do not adopt a standard, change a schema, or establish conformance or
certification. Read it with the [ArchiMate differences register](archimate-differences.md).

## Evidence boundary

The reviewed Transitrix baseline is
[`8ca4eabf7666946ffb7a76eb579c31cb0ae3f327`](https://github.com/transitrix/methodology/tree/8ca4eabf7666946ffb7a76eb579c31cb0ae3f327),
observed on 2026-10-10 and rechecked on 2026-10-11. Main still matched that
revision; no later semantic delta is included. Every repository path and section
below refers to that revision, even when its relative link opens a newer file.
Specification status, implementation coverage and external-standard conformance
are different facts.

Here, **alignment** means a useful conceptual correspondence; **interoperability**
requires a defined transformation and explicit losses. **Formal conformance**
requires evidence against the applicable standard's requirements for a named
subject and edition. **Certification** additionally requires the relevant
certification process. This review establishes neither of the latter two.

### Sources and access

Access date for all sources: **2026-10-11**. No normative text is reproduced or
vendored. Primary documents hosted by another site are identified as such;
publisher abstracts and reference cards are not substitutes for full requirements.

| Key | Edition, source and accessible material | Limit of this review |
|---|---|---|
| S10 | [ISO/IEC/IEEE 42010:2022, edition 2](https://www.iso.org/standard/74393.html); [ISO/IEC/IEEE preview hosted by iTeh](https://cdn.standards.iteh.ai/samples/74393/fc7b7f103d8446a4b87a3261e31370d3/ISO-IEC-IEEE-42010-2022.pdf), terms §3, conformance §4 and beginning of §5 | Definitions and conformance categories are accessible. §§6–8 requirements are listed in the contents but their full text is unavailable here; clause-level compliance is **unevaluated**. |
| S20 | [ISO/IEC/IEEE 42020:2019, edition 1, ISO preview](https://www.iso.org/obp/ui?_escaped_fragment_=iso:std:iso-iec-ieee:42020:ed-1:v1:en), scope, definitions and contents | Architecture processes are relevant; full outcomes, activities and conformance requirements are **unevaluated**. Contents identify §4 conformance, §5 process overview, §6 governance and §7 management; headings alone prove no coverage. |
| S38 | [ISO/IEC 21838-1:2021, edition 1](https://www.iso.org/standard/71954.html), requirements for top-level ontologies | Publisher scope available; complete requirements unavailable. Transitrix is not established as a top-level ontology. |
| SBFO | [ISO/IEC 21838-2:2021, edition 1](https://www.iso.org/standard/74572.html), BFO, including BFO-2020 | Publisher scope available, including OWL 2/Common Logic formalizations; axioms and domain-module requirements not evaluated. |
| SDOLCE | [ISO/IEC 21838-3:2023, edition 1, ISO preview](https://www.iso.org/obp/ui?_escaped_fragment_=iso:std:iso-iec:21838:-3:ed-1:v1:en), DOLCE | Scope/introduction available; full axioms and §4 conformity demonstration unavailable. No equivalence of BFO and DOLCE is presumed. |
| SODM | [OMG ODM 1.1, September 2014](https://www.omg.org/spec/ODM/1.1/), [normative PDF](https://www.omg.org/spec/ODM/1.1/PDF), §§1–2 and Table 2.1 | Public normative specification available. This review assesses applicability and the conformance boundary, not every metamodel package. |
| SAM | ArchiMate **3.2**, the baseline named by Transitrix; [publisher access page](https://www.opengroup.org/archimate-licensed-downloads) and [N221 reference cards](https://barbierdarnal.com/Enterprise_Architect/Clinique/ArchiMate_3.2_Specification_notation.pdf), authored by The Open Group, hosted by a third party | Cards accessible; [full specification](https://pubs.opengroup.org/architecture/archimate32-doc/) required sign-in. Full relationship admissibility/derivation requirements remain **unevaluated**. 3.2 is the comparison edition, not a claim about the latest edition. |
| S79 | ISO/IEC 11179: [Part 1:2023 framework publication record](https://www.iso.org/files/live/sites/isoorg/files/news/magazine/ISOupdate/EN/2023/ISOupdate-February-2023.pdf), [Part 3:2023 common facilities](https://www.iso.org/standard/78915.html), [Part 6:2023 registration preview](https://www.iso.org/obp/ui?_escaped_fragment_=iso:std:iso-iec:11179:-6:ed-4:v1:en), [Part 31:2023 data specification registration](https://www.iso.org/standard/78925.html) | Publication/scope evidence and Part 6 introduction/§§1–3 accessible. Full registry conformance requirements not evaluated. Part 1 edition 4, Part 3 edition 4, Part 6 edition 4, Part 31 edition 1 are the selected comparison set. |

### Transitrix evidence followed beyond the indexes

The starting points were [README](../../README.md), [CONTRIBUTING](../../CONTRIBUTING.md),
[glossary](../../method/00-glossary.md), [modelling](../../method/03-modelling.md),
[notation inventory](../../notations/README.md),
[ID/reference contract](../../notations/IDS_AND_REFERENCES.md) and
[shared contract](../../notations/CONTRACT.md). The evidence chain continues into:

| Evidence | What it establishes, and what it does not |
|---|---|
| [Element primitives](../../notations/ELEMENT_PRIMITIVES.md) §§1–6, 7.18–7.19, 7.30; [relations](../../notations/elements/17-relations.md) §§1–5; [stakeholders](../../notations/elements/20-stakeholders.md) §§1–5 | Authored structure, identity, scope and temporal semantics; these take precedence over a shorthand alignment table for this comparison. |
| [Goals Tree](../../notations/views/diagrams/04-goals.md), “Source of truth” and §§4–6; [report configuration](../../notations/views/REPORT_VIEW_CONFIG.md) §§1–6; [document view engine](../../packages/document-view-engine/README.md), “What this package admits, and what it defers” | Inline models, selected projections and document assembly are different forms. A render configuration alone does not identify all of an architecture description's concerns. |
| [Codex](../../notations/elements/14-codex.md) §§1–3; [TERM](../../notations/ELEMENT_PRIMITIVES.md) §7.30; [glossary report](../../notations/views/reports/32-glossary.md) §§1, 6 | Existing external-standard citation and vocabulary mechanisms can be reused. A STANDARD record or a TERM does not assert that the organisation adopted or conforms to its source. |
| [Requirement chain](../../notations/views/reports/requirement-chain.md) §§1–2; [requirement](../../notations/elements/15-requirement.md) §§1–2; [shared contract](../../notations/CONTRACT.md) §§18.2, 18.7 | The chain contains draft additions with consumer implementation still pending. Stored diagnostics retain versioned meaning. Proposed checks below cannot be counted as implemented coverage. |
| [Linter](../../tools/lint.py), `TransitrixLinter`; [notation checker](../../scripts/check-notations.mjs), documented checks | Model and documentation checks have bounded scopes. Neither is a standards conformance assessor. |
| [Catalogue integration](../../packages/ingest-cli/src/catalogue.mjs), `parseCatalogueDecl` and `loadCatalogueSlice`; [release/propagation](../../method/09-releases-and-propagation.md) §6.4; [manifest](../../notations/MANIFEST.md) §2; [binding](../../notations/CONTRACT.md) §17 | Optional version-pinned catalogue bindings preserve local IDs; missing or mismatched configured input is not a successful lookup. This is not an ISO metadata-registry registration procedure. |
| [Document provenance](../../packages/document-renderer/PROVENANCE.md), API/result contract; [issued-document queries](../../packages/documents-cli/README.md), “Querying retained issuance events” | Retained output can be compared with recipe/run evidence; absent evidence remains unknown. Provenance is reusable for an AD package, but does not prove semantic completeness. |
| [6.0 → 7.0 migration](../../migrations/6.0-to-7.0/README.md); [compatibility](../../notations/CONTRACT.md) §10 | Renaming fields, changing required data or diagnostic meanings needs an explicit consumer/migration treatment. This review supplies none of those changes. |

## Standards coverage and gap register

P1 means resolve before making the affected interoperability claim; P2 means a
bounded design follow-up; P3 means optional research. These are recommendations,
not assigned delivery priorities. IDs remain stable even if a finding is rejected.

| Standard | Relevant Transitrix area | Current status | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| ISO/IEC/IEEE 42010:2022 (S10) | Views, primitives, stakeholders, manifest, issued documents | Partial conceptual alignment; no demonstrated AD/ADF/ADL conformance | **ARC-001–009** below: no complete concern → viewpoint → view evidence contract | Define an optional AD evidence profile using existing model identities; validate against full §§6–8 before any conformance claim | P1 |
| ISO/IEC/IEEE 42020:2019 (S20) | [Admission](../../notations/CONTRACT.md) §6, [decision log](../../method/07-decisions.md), [team operations](../../method/06-team-operations.md), [propagation](../../method/09-releases-and-propagation.md) | Useful governance/process records exist | **ARC-010**: records and Git gates do not demonstrate the standard's process outcomes, roles or tailoring basis | Prepare a process/outcome evidence matrix for one architecture cycle, with unknowns retained; no new lifecycle mandates | P2 |
| ISO/IEC 21838-1:2021 (S38) | TYPE system and [vocabulary](../../notations/vocabulary.yaml) | Optional candidate; not adopted | **ARC-011**: a typed enterprise catalogue is not thereby a top-level ontology or formal theory | Evaluate only against explicit competency questions; full TLO-conformance assessment is presently not applicable to a declared Transitrix TLO because none is declared | P3 |
| ISO/IEC 21838-2:2021 / BFO-2020 (SBFO) | ACTOR, ROLE, PROCESS, ACTION, lifecycle | Optional interpretation candidate | **ARC-012**: identity records, organisational positions and planned actions have no established mapping to BFO categories or axioms | Compare a plan, its execution and the actor's role separately; retain an external mapping without retyping core | P3 |
| ISO/IEC 21838-3:2023 / DOLCE (SDOLCE) | Same areas; TERM and contextual meaning | Optional alternative candidate | **ARC-013**: no demonstrated DOLCE interpretation or equivalence to BFO | Evaluate the same cases under DOLCE independently; reject mappings that collapse plan, event and description; full axiom checks unevaluated | P3 |
| OMG ODM 1.1 (SODM) | YAML primitives, REL, catalogue integration | Conceptual interchange candidate only | **ARC-014**: no selected ODM package conformance target or ODM-conformant XMI contract | If ontology interchange is commissioned, name a package and mapping direction first. §2/Table 2.1 distinguish package compliance and interchange; mapping clauses are informative | P2 |
| ArchiMate 3.2 (SAM) | Element/relation vocabulary and views | Declared foundation, with observed differences | **ARC-015**: simplified names are insufficient to establish equivalence; full matrix checks unknown | Use [AM-001–014](archimate-differences.md) to preserve the modeling benefit and disclose mapping loss | P1 |
| ISO/IEC 11179-1/-3/-6/-31:2023 (S79) | TERM, aliases, IDs, admission and catalogue binding | Registry-like functions, not demonstrated MDR conformance | **ARC-016**: local identity/admission is not international registration; data concepts and value domains have no established mapping | Assess framework/common facilities and registration separately from data specification; keep any registry identifier alongside local IDs | P2 |

For ARC-016, Parts 1 and 3 concern framework/common facilities; Part 6 concerns
registration and its responsible bodies. Part 31 is a candidate only for a data
dictionary profile, not for every architecture element. Part 6 also names concept
systems (Part 32), datasets (Part 33), computable data (Part 34) and models (Part
35). Their detailed requirements are **unevaluated**: no corresponding registry
profile is selected here. Parts 4/5 definition/naming guidance and Part 30 basic
attributes are also deferred to that profile review; no family-wide 11179 claim
is implied by the selected parts. Existing `REGISTRY` rows in Primitives §7.20
track normative sources and scans; their name is not evidence of an MDR.

## Nine architecture concepts

This is a mapping assessment, not nine pass/fail compliance assertions. Clause
references below are to accessible S10 definitions. The requested “Architecture
Model” label needs an edition qualification: **2022 §3.19 defines view component**.
It must not silently inherit a 2011 architecture-model equivalence. Requirements
in §§6–8 remain unevaluated even where the concepts are understandable.

In the table, T → S maps Transitrix evidence to a standards concept; S → T asks
what a standards-oriented description would need to preserve in Transitrix.

| Finding / concept | Source | Exact Transitrix evidence at the baseline | Direction, loss and non-equivalence |
|---|---|---|---|
| **ARC-001 — Entity of Interest** | S10 §3.12 | [Manifest](../../notations/MANIFEST.md) §§1–2; [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §§7.5–7.7; [Actors](../../notations/elements/19-actors.md) §1 | T → S: an organisation, product or application can identify the subject, but the repository boundary alone does not distinguish subject from environment. S → T: preserve an explicit subject and boundary narrative; no universal EoI field is established in these contracts. Loss: multi-entity scope is implicit if only a repo name is retained. |
| **ARC-002 — Architecture** | S10 §3.2 | [Modelling](../../method/03-modelling.md) §1; [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §§1–3; [Codex](../../notations/elements/14-codex.md) §2 | T → S: primitives, relations and principles describe selected properties; they are not the enterprise itself. S → T: important principles and environmental assumptions may require prose as well as model records. Loss: unmodelled properties remain unknown, never false. |
| **ARC-003 — Architecture Description** | S10 §3.3 | [Zones/admission](../../notations/CONTRACT.md) §§5–6; [report config](../../notations/views/REPORT_VIEW_CONFIG.md) §1; [document provenance](../../packages/document-renderer/PROVENANCE.md) | T → S: a selected, revision-bound set of records and views is an AD candidate; an entire Git repository is not automatically an AD. S → T: retain its purpose, scope, selected artifacts and rationale as one identified package. Loss: a live query without its input revision cannot reconstruct an issued description. |
| **ARC-004 — Stakeholder** | S10 §3.17 | [Stakeholders](../../notations/elements/20-stakeholders.md) §§1–3, 5 | T → S: a stake profile plus its actor can identify a stakeholder. S → T: the required `actor` link narrows admission; a role/class described by a standard-oriented AD cannot simply be imported as an actor-free STAKEHOLDER. Loss: flattening several stakes to one identity merges their distinct interests. See AM-002. |
| **ARC-005 — Concern** | S10 §3.10 | [Stakeholders](../../notations/elements/20-stakeholders.md) §§2–3, 6 | T → S: `concern` text gives evidence of an interest; it is recommended, not required. S → T: no addressable concern inventory or concern-to-view coverage relation is specified there. Loss: repeated strings do not provide stable cross-view identity. A missing string is not proof that no concern exists. |
| **ARC-006 — Viewpoint** | S10 §3.8 | [Goals Tree](../../notations/views/diagrams/04-goals.md) §§2, 4–6; [report config](../../notations/views/REPORT_VIEW_CONFIG.md) §§1–6 | T → S: notation purpose, conventions and validation are useful ingredients. S → T: specify whose concerns are framed, conventions used and how results are interpreted. Loss: a filter or diagram type omits that argument; `view_config` is not automatically a viewpoint. |
| **ARC-007 — View** | S10 §3.7 | [Goals Tree](../../notations/views/diagrams/04-goals.md), “Source of truth”; [shared contract](../../notations/CONTRACT.md) §14 | T → S: a rendered selection can contribute to a view addressing stated concerns. S → T: retain the selection, inputs and correspondence to the chosen viewpoint. Loss: treating the YAML configuration as the whole view drops the rendered/content evidence; deleting an inline document can delete model facts. |
| **ARC-008 — Architecture Model** | S10 §3.19 (2022 view-component comparison), §3.15 | [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §§1–2; [Goals Tree](../../notations/views/diagrams/04-goals.md) §4 | T → S: an inline goal hierarchy or resolved canonical graph can supply a view component. S → T: retain its governing model kind or legend and reuse boundaries. Loss: one-file = one-model assumptions fail for projections and shared primitives. The requested label is assessed, not asserted to be a 2022 defined term. |
| **ARC-009 — Model Kind** | S10 §3.15 | [Goals Tree](../../notations/views/diagrams/04-goals.md) §§4–6; [Capability Map](../../notations/views/diagrams/05-capability-map.md) §§2, 4, 13; [notation inventory](../../notations/README.md) | T → S: syntax, conventions and rules describe useful candidate model kinds. S → T: document interpretation and intended use, with explicit edition/form. Loss: a filename extension or `notation` string identifies a format, not complete model-kind evidence. No §8.2 conformance claim follows. |

The nine concepts do not exhaust 2022. Stakeholder perspectives (§3.18), aspects
(§3.9), correspondences (§3.11), decisions and rationale need separate evidence
in any future AD profile. A binary REL between enterprise primitives cannot be
assumed to represent every correspondence between description artifacts.

## Representative cases and proposed acceptance examples

These are **review cases**, not executable schemas or implemented validation rules.
“Positive” means the proposed mapping preserves the stated distinction; “negative”
means a reviewer should reject the interpretation, not that today's CLI rejects it.

| Case | Positive interpretation | Negative interpretation / result | Findings |
|---|---|---|---|
| Shared goal, two audiences | One admitted goal appears in an operational Goals Tree and a change-planning view; each names its audience, concern and input revision in the proposed AD evidence profile | Equating both configurations to one viewpoint merely because both use `goals` loses audience/concern coverage | ARC-003, 005–009 |
| External service owner | An ACTOR supplies identity; two STAKEHOLDER records preserve two different stakes and link to selected goals/actions | Dropping the actor during import fails the documented STAKE-002 condition; merging the stakes loses meaning even if YAML still parses | ARC-004; AM-002 |
| Service moves to another node | End the old `hosts` REL window and start a new one; a dated projection selects the applicable link | Exporting both links as simultaneously current loses temporal truth; relation validity is not a scheduled migration date | AM-008 |
| Requirement applies to a release | Preserve requirement scope, comparison outcome and the selected release separately; reuse the requirement-chain contract | Treating `required_for` as a deadline, or an ASSERTION as executed VERIFICATION, invents execution evidence | AM-010; ARC-015 |
| Architecture report is reissued | Bind selected canon, recipe and retained output using the existing provenance machinery | A successful render is not proof of concern completeness, stakeholder agreement or standards compliance | ARC-003, 006, 010 |
| Same term in two catalogues | Preserve local identity and an accepted catalogue binding; qualify provenance by catalogue revision | Assuming identical labels are the same ISO registry item, or globally renaming local IDs, destroys distinctions | ARC-016; AM-003 |
| Plan and execution | Compare a planned ACTION, actual performance evidence and the actor/role separately when evaluating BFO and DOLCE | Assigning all three to one ontology class solely because their labels match is an unevaluated mapping | ARC-011–014 |

These cases favor semantic precision over nominal fidelity: retaining stakeholder
stakes and temporal relations is useful even when interchange requires extra
metadata. Replacing them with simpler standard names would not by itself improve
the model. Conversely, an optional concern/viewpoint evidence profile could improve
clarity without forcing every small inline model into a new metamodel.

## Candidate recommendations, compatibility and decisions

MUST/SHOULD/MAY below express **proposed priorities for a future decision**. They
are not new Transitrix requirements. None changes an accepted ADR or adoption policy.

| ID | Candidate recommendation and rationale | Exceptions / compatibility / affected consumers |
|---|---|---|
| REC-01 | **MUST** bind a future standards claim to its edition, subject, reviewed revision, evaluated clauses and unknown evidence. Names and green YAML checks are insufficient. | No exception for formal claims; informal comparisons may remain explicitly unevaluated. Additive documentation; affects model reviewers and claim-producing tools. |
| REC-02 | **SHOULD** add an optional AD evidence profile identifying scope, stakeholders, concerns, viewpoints, view components and correspondences. Reuse existing element IDs, model kinds and provenance. | A small exploratory model need not opt in. Optional documentation is backward-compatible; making new fields mandatory or redefining `view_config` is potentially breaking for authors, parsers and renderers. |
| REC-03 | **MUST** disclose direction, unmapped content and losses for any commissioned mapping. See AM-008/009 before translating relation names. | No claim of lossless conversion without a round-trip witness. A report is additive; changing core relation direction or TYPE meaning is breaking and requires consumer review/migration. |
| REC-04 | **SHOULD** retain the existing identity/stake, obligation/scope and model/projection distinctions unless a representative case justifies change. | A concrete counterexample may justify a new design decision. Documentation is additive; collapsing TYPEs or changing admission rules is breaking. |
| REC-05 | **MAY** evaluate BFO, DOLCE and ODM as separate optional mapping profiles. | Defer if no competency question benefits. No core ontology commitment, inference behavior or dependency follows. A required ontology classification would affect every consumer and need migration. |
| REC-06 | **SHOULD** assess ISO 11179 using a bounded vocabulary/catalogue profile; distinguish local IDs, names, registration and data domains. | Local-only catalogues may keep current IDs without external registration. An optional external identifier is additive; replacing IDs or uniqueness scope is breaking. |

Proposed ADR topics and owners:

| Topic | Options and recommended choice | Recommended decision owner / acceptance evidence |
|---|---|---|
| AD evidence profile | Prose-only companion; optional structured profile; mandatory core extension. Start with the companion and evaluate a structured profile against the shared-goal case. | Methodology maintainers, with model-author and renderer review; no accepted ADR identified for this proposal. Require all nine mappings plus explicit treatment of 2022 perspectives/aspects/correspondences. |
| Difference-register authority | Keep the glossary table alone; maintain this detailed register with glossary links; duplicate tables per consumer. Recommend this register plus links. | Methodology maintainers with semantic-tool implementers; see [maintenance proposal](archimate-differences.md#proposed-maintenance-rule). Acceptance would need a recorded decision; none is invented here. |
| Ontology/registry mapping | No profile; optional bounded BFO or DOLCE profile; mandatory upper ontology. Recommend an optional experiment only when competency questions justify it. | Methodology maintainers and ontology/catalogue implementers. Choose each ontology independently, demonstrate counterexamples and disclose loss. |

Bounded backlog proposals (these do not change any implementation):

| Item | Dependency | Acceptance | Priority / compatibility |
|---|---|---|---|
| B-01: qualify broad alignment prose and reconcile introductory REL examples | ARC-015; AM-012/013; authoritative element/relation contracts | Glossary avoids an unqualified “no divergence”; introductory examples clearly identify their form and link to canonical fields. No silent record conversion. | P1; documentation-only |
| B-02: demonstrate one AD evidence package | REC-02 decision; authorized access to full S10 requirements for any compliance assessment | One subject, two audiences, shared model evidence and positive/negative concern coverage; inaccessible clauses stay unknown. | P2; optional, backward-compatible |
| B-03: assess one 42020 architecture cycle | Full S20 requirements and a selected cycle's records | Each selected process outcome has a cited record, gap or explicit non-applicability rationale; no inference from a merge or a gate tick. | P2; evidence-only |
| B-04: specify mapping losses for the register's cases | Full SAM semantics for definitive relationship admissibility; mapping-scope decision | Preserve direction, temporal selection, aliases and unsupported facts; a rejected conversion is visible. Exchange implementation and licensing require a separate decision. | P1; specification-only; core changes require migrations |
| B-05: evaluate ontology and registry candidates | Competency questions; selected S38/SBFO/SDOLCE/SODM/S79 requirements and profile decisions | Compare plan/execution and contextual-term cases; select, reject or defer with rationale and a named conformance target. | P3; optional experiment |

No export implementation or licensing path is selected. Source access gaps are
named above; resolving them enables deeper conformance assessment, not automatic
adoption. The review's findings remain useful as bounded conceptual evidence.
