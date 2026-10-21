# Semantic and architecture standards review

This review helps model authors, methodology maintainers and integration
implementers distinguish Transitrix's existing contracts from possible semantic
interchange profiles. It is **non-normative**. Recommendations below do not adopt
standards, change authoring rules, provide an exporter or establish conformance
or certification. YAML/Git authoring remains unchanged.

For the bounded normative documentation contract and actual candidate dispositions,
see the [Semantic Standards Profile](../../method/semantic-standards-profile.md).
The findings and proposals below retain their reviewed baseline and are not
retroactively relabeled as implemented capabilities or adopted ontology choices.

Read the [semantic evidence](semantic-evidence.md) for terminology, identity,
representation, validation and provenance; the [architecture evidence](architecture-evidence.md)
for architecture concepts and optional ontology/registry comparisons; and the
[ArchiMate differences register](archimate-differences.md) for individual mappings,
their benefits, restrictions and losses. Those documents retain their detailed
source registers and findings; this entry point reconciles their scope and proposals.

## Revision and evidence boundary

Both domain reviews assess **the same source baseline**:
[`8ca4eabf7666946ffb7a76eb579c31cb0ae3f327`](https://github.com/transitrix/methodology/tree/8ca4eabf7666946ffb7a76eb579c31cb0ae3f327),
observed October 10–11, 2026. Source section references in those reviews mean
that revision, even when a relative link opens a newer document. The semantic
review was delivered in [PR #647](https://github.com/transitrix/methodology/pull/647),
merge `e7002bcbf68329cb270e44158bcd2a486910fca9`; the architecture review and
differences register in [PR #646](https://github.com/transitrix/methodology/pull/646),
merge `165900cc4ce2abccdd63a850d404f63059aa4432`.

Integration was checked against main
`087374122f72122f2d6d0a3b8db427091f748263` on October 21. The three review
documents are unchanged from their respective merges. This is not a claim that
every finding reassesses current implementation. The following relevant source
deltas remain outside the original comparison:

| Changed area since the baseline | Integration consequence |
|---|---|
| `notations/CONTRACT.md` §7, `ELEMENT_PRIMITIVES.md`, `elements/17-relations.md`, `elements/19-actors.md`, `vocabulary.yaml` and the reports-to example | Main clarifies first-class temporal relations and adds person-to-person `reports_to`, evidence references and recurrence. SE-03 and AM-008/009 must be revisited for a future current-version mapping; the review does not claim an exhaustive current relation inventory. The source now states inclusive day windows; the older query example remains explicitly illustrative. |
| `packages/ingest-cli/src/canon.mjs` | Reporting records preserve identity, pair and window rather than deduplicating every relationship solely by kind/from/to. A future representation/round-trip test must include recurring reporting records and their evidence. |
| `packages/document-view-engine/src/evaluate.mjs` | Resolution follows canonical IDs, active relation selection and read failures more precisely. This does not implement SHACL, SPARQL or RDF interchange. Claims about a future adapter still need its own evidence. |

Other entry points in the domain evidence registers retain the cited baseline;
later source additions do not silently become reviewed standards coverage.
No public namespace, ontology, shape suite or semantic endpoint is delivered by
these documents. The illustrative `https://example.org/review/` vocabulary is
an example, not a maintained Transitrix namespace.

**Alignment** is a supported conceptual comparison. **Interoperability** needs
a defined transformation and tested losses. **Formal conformance** needs a named
subject, edition, target and all applicable requirements. **Certification** needs
its own scheme and evidence. Neither terminology nor passing repository checks
establishes the latter two.

## Integrated standards matrix

References prefixed **semantic** or **architecture** belong to the corresponding
document's source register; similarly named source keys are not interchangeable.
P1 means resolve before the affected interoperability claim, P2 a bounded follow-up,
and P3 optional research. These are recommendations, not delivery commitments.

| Standard / edition and authoritative locator | Relevant area | Current status | Gap | Recommendation | Priority |
|---|---|---|---|---|---|
| RDF 1.1 Concepts (2014), semantic S1 §§3–4 | Identity, REL and dataset context | Graph-like source model, no reviewed RDF contract | Scoped IDs and qualified relations cannot become bare triples without loss | SE-02/03: persistent scoped identities and identified relation records | P1 |
| Turtle (2014), semantic S2 §§2, 5–6 | Graph serialization | YAML is not Turtle | One graph does not describe an entire dataset envelope | SE-03: optional graph serialization plus explicit dataset selection | P2 |
| JSON-LD 1.1 (2020), semantic S3 context and RDF relationship | Interchange | No reviewed versioned context | Coercion, lists, nulls and default values need a mapping | SE-03: version the context and test semantic reconstruction | P2 |
| SKOS (2009), semantic S4 §§3–5, 7–8, 10 | TERM, taxonomy and retrieval | Partial conceptual alignment, no declared thesaurus | Concept scheme, multilingual designation and mapping rules are absent | SE-01/07: optional concept projection; preserve enterprise identity | P1 |
| OWL 2 / OWL 2 RL (2012), semantic S5 Structural §§5, 9; Profiles §§4.2–4.3 | Ontology and inference | No reviewed ontology or RL conformance target | TYPE names do not define class extensions or entailment | SE-01/04: no inference by default; optional separately tested profile | P2 |
| SHACL 1.0 (2017), semantic S6 §§2–5 | Graph constraints | Existing validators are not SHACL engines | Targets, closure and diagnostic mapping are unspecified | SE-04: isolate shapes, inference and admission | P1 |
| SPARQL 1.1 Query (2013), semantic S7 §§8–9, 13, 16–17 | Scoped questions and reports | Illustrative queries, no query-service contract | Dataset completeness, time and entailment affect answers | SE-05: explicit datasets and positive/negative/unknown results; Update/Protocol remain unevaluated | P1 |
| ISO 704:2022, semantic S8 catalogue scope | Definitions/designations | Partial local editorial support; clauses unevaluated | Full normative text unavailable | SE-07: original local guidance, without an ISO conformance claim | P1 |
| ISO 1087:2019, semantic S9 catalogue scope | Terminology vocabulary | Normative correspondence unevaluated | Full definitions unavailable; matching names are insufficient | SE-07: defer clause correspondence pending authorized access | P2 |
| ISO 25964-1:2011, semantic S10 catalogue scope | Retrieval thesaurus | Conditional applicability; clauses unevaluated | No reviewed thesaurus profile or full normative text | SE-07: optional retrieval profile, not a prerequisite for every glossary | P2 |
| ISO 25964-2:2013, semantic S11 catalogue scope | Cross-vocabulary mapping | Conditional applicability; clauses unevaluated | Catalogue bindings do not establish thesaurus equivalence | SE-02/07: curated, versioned mappings with explicit strength | P2 |
| PROV-O (2013), semantic S12 §§3–4 | Assertion origins and activities | Local evidence fields and a document checker exist | Per-fact provenance is not uniform or verified by its presence | SE-06: distinguish declared, observed, inferred and proposed evidence | P1 |
| Dublin Core Terms (2020), semantic S13 property entries | Resource/document metadata | Optional descriptive mapping | Resource identity and field crosswalk need scope | SE-06: descriptive metadata without certification assertions | P2 |
| DCAT 3 (2024), semantic S14 §6 | Actual dataset publication | Conditional, no reviewed publication profile | Dataset/distribution/service semantics are not defined by having a catalogue ID | SE-08: use only for an actual dataset consumer; do not invent a service | P3 |
| ISO/IEC/IEEE 42010:2022, architecture S10 §§3–5 | Architecture descriptions and views | Nine conceptual mappings; §§6–8 conformance unevaluated | Full AD/ADF/ADL requirements unavailable | ARC-001–009: optional evidence package, explicit non-equivalences | P1 |
| ISO/IEC/IEEE 42020:2019, architecture S20 scope/contents | Architecture processes | Relevant local process records, no demonstrated standard outcomes | Full activities/outcomes unavailable | ARC-010: one process/outcome evidence assessment before claims | P2 |
| ISO/IEC 21838-1:2021, architecture S38 scope | Top-level ontology requirements | No Transitrix TLO declared; full requirements unevaluated | Typed enterprise records are not a formal TLO | ARC-011: defer adoption; select a use case first | P3 |
| ISO/IEC 21838-2:2021 / BFO-2020, architecture SBFO scope | Plan, execution, actor and role | Optional candidate; axioms unevaluated | No established category/axiom mapping | ARC-012: compare cases without retyping core | P3 |
| ISO/IEC 21838-3:2023 / DOLCE, architecture SDOLCE introduction | Same areas and contextual meaning | Optional alternative; axioms/conformity unevaluated | No interpretation or BFO equivalence established | ARC-013: assess independently, preserve counterexamples | P3 |
| OMG ODM 1.1 (2014), architecture SODM §§1–2, Table 2.1 | Ontology interchange | Applicability assessed from public normative text; no package conformance target | No selected package or conformant XMI mapping | ARC-014: choose direction/package before an interchange claim | P2 |
| ArchiMate 3.2 (2022), architecture SAM / N221 | Elements, relations and views | Starting foundation with source-identified differences | Full relation admissibility/derivation inaccessible in this review | ARC-015 and AM-001–014: retain useful differences and disclose loss | P1 |
| ISO/IEC 11179-1/-3/-6/-31:2023, architecture S79 scope/accessible registration introduction | Catalogue/metadata registry | Registry-like functions, no demonstrated MDR conformance | Full selected-part requirements unevaluated; other parts explicitly deferred | ARC-016: bounded profile; preserve local IDs alongside external registration | P2 |

The complete authoritative source URLs, editions and access limits are retained
in the [semantic source register](semantic-evidence.md#authoritative-source-register)
and [architecture source register](architecture-evidence.md#sources-and-access).
Access was recorded October 11. ISO abstracts, previews and ArchiMate reference
cards are not substitutes for inaccessible full requirements. No purchase or
reconstructed clause is required to retain a named unknown.

## Coverage of the requested semantic questions

| Question | Finding and evidence | Preserved boundary |
|---|---|---|
| 1. Concept, class and individual | SE-01; semantic T1/T8, S4/S5; AM-003 | `skos:Concept`, `owl:Class` and an instance play distinct roles. Labels do not establish identity; deliberate metamodeling needs its own interpretation/tests. |
| 2. Stable identity, IRIs and catalogue scope | SE-02; semantic T2/T8; ARC-016 | Persistent resource identity differs from file path, snapshot, local ID and central binding. Namespace ownership is an unresolved design choice. |
| 3. Faithful graph representation | SE-03; semantic T2/T3/T9; AM-008/009 | Preserve relation identity, lifecycle, admission, history, context and missing/null/default distinctions. No lossless converter is claimed. |
| 4. Constraints versus inference | SE-04, shapes H1/H2; semantic T3/T6 | Structural shape success is not inference, admission or complete existing-validator coverage. |
| 5. Competency questions | SE-05, Q1–Q3 and explicit QD dataset | Check time/provenance/label cases and counterexamples; denied or incomplete scope remains unknown, not an empty successful answer. |
| 6. Architecture-description concepts | ARC-001–009, table below | Assess each direction and loss; do not equate names or editions. |
| 7. Fact provenance | SE-06; semantic T4/T7; ARC-003 | Source/agent/time/version and fact basis remain distinct from admission and document-generation evidence. |
| 8. Terminology discipline | SE-07; semantic T1; AM-003 | Concept/context, definition, designation, relations and examples/non-examples are explicit editorial candidates; ISO clauses remain unevaluated. |

The [nine-concept mapping](architecture-evidence.md#nine-architecture-concepts)
provides exact baseline paths, standard locators and direction/loss for every row:

| Required concept | Finding | Material non-equivalence |
|---|---|---|
| Entity of Interest | ARC-001, 2022 §3.12 | Repository boundary alone does not identify subject/environment. |
| Architecture | ARC-002, §3.2 | Stored descriptions are not the enterprise itself. |
| Architecture Description | ARC-003, §3.3 | A repository or render alone is not a scoped, revision-bound AD. |
| Stakeholder | ARC-004, §3.17 | Identity and stake profile remain distinct. |
| Concern | ARC-005, §3.10 | Free text is not addressable concern-to-view coverage. |
| Viewpoint | ARC-006, §3.8 | A notation/filter is not a complete concern-framing argument. |
| View | ARC-007, §3.7 | Configuration, selected model and rendered evidence differ. |
| Architecture Model | ARC-008, §3.19 view-component comparison | The requested label is not asserted to be the 2022 defined term; no silent 2011 equivalence. |
| Model Kind | ARC-009, §3.15 | Filename/notation alone does not establish interpretation and conventions. |

## Recommended dispositions for a subsequent profile

Every row below is a **recommendation awaiting a recorded decision**. Retain,
change, defer and reject describe the proposed disposition of a candidate, not
standards adoption. C1–C6 are the semantic review's candidates; REC-01–06 are the
architecture review's. Their detailed exceptions remain in those documents.

| Candidate area | Proposed disposition and rationale | Proposed obligation, scope and exception |
|---|---|---|
| RDF 1.1 / stable IRIs / named graphs | **Change** universal RDF adoption to an optional, versioned exchange profile; **retain** identity preservation within that profile (SE-02/03, C1/C2) | Candidate MUST preserve IDs/scopes and declare loss; SHOULD use named graphs when context/provenance needs them. No requirement to replace canonical YAML/Git. Namespace policy needs a decision. |
| Turtle and JSON-LD | **Change** universal format mandates to declared exchange targets (SE-03, C2) | Candidate MUST test the selected mapping/context; a lossy projection MAY omit content only with an explicit loss report. Turtle alone cannot carry a whole dataset envelope. |
| SKOS / ISO 25964 | **Change** blanket taxonomy requirements to an opt-in retrieval concept profile (SE-01/07, C1/C5) | Candidate MUST separate concept/class/object identity; SHOULD review definition/designation/examples. ISO normative claims remain deferred pending full evidence. Do not duplicate enterprise definitions as TERM. |
| OWL 2 / RL | **Defer** mandatory ontology/RL adoption (SE-04, A3; REC-05) | Candidate MAY evaluate bounded inference separately, with rejected non-RL axioms and a declared regime. No inference by default; labels/parent links never justify class or identity equivalence. |
| SHACL 1.0 | **Change** universal tool adoption to optional exchange constraints (SE-04, C3) | Candidate MUST distinguish shape, inference and admission; SHOULD retain versioned diagnostic identity. No exception permits claiming an unevaluated check passed. |
| SPARQL 1.1 | **Change** blanket support to scoped competency questions (SE-05, C3) | Candidate MUST state dataset/time/entailment and report incomplete scope as unknown. Query examples do not commission an endpoint, Update or Protocol support. |
| ISO 704 / ISO 1087 | **Change** ISO MUST/SHOULD wording to original terminology guidance; **defer** normative correspondence (SE-07, C5) | Candidate SHOULD document concept, definition, designation and counterexamples. MAY keep this editorial until a schema is approved. No inaccessible clause is reconstructed. |
| ISO 42010 / ISO 42020 | **Retain** explicit conceptual alignment with edition/loss limits; **defer** conformance/process mandates (ARC-001–010, REC-01/02) | Candidate MUST bound any standards claim; SHOULD try an optional AD evidence companion. A small exploratory model need not opt in; mandatory new fields need migration. |
| PROV-O | **Change** generic SHOULD to an optional fact-provenance mapping with explicit trust limits (SE-06, C4) | Candidate MUST distinguish declaration/observation/inference/proposal and admission. Legacy unknowns MAY remain unknown. Hash matches cannot establish generation. |
| Dublin Core / DCAT 3 | **Retain conditionally**, only for actual described documents/datasets (SE-06/08, C6) | Candidate MAY add metadata; SHOULD omit unsupported service/conformance claims. Non-publishing adopters have no dataset-metadata requirement. |
| ISO 21838 / specific upper ontology | **Defer** the preliminary SHOULD; **reject automatic core adoption** (ARC-011–013, REC-05) | Candidate MAY evaluate BFO and DOLCE independently only for useful competency questions. A specific adoption requires a dedicated decision; neither is selected here. |
| ArchiMate / ODM mappings | **Retain** optional mapping, **reject** blanket equivalence (ARC-014/015, REC-03/04) | Candidate MUST disclose direction, unmapped content and loss. Preserve useful departures unless a modeling case justifies change; no lossless claim without a round-trip witness. |
| ISO 11179 applicability | **Defer** family-wide adoption; assess a bounded registry profile (ARC-016, REC-06) | Candidate SHOULD distinguish registration, concepts, names and data domains. Local-only catalogues MAY keep current IDs; no external registration is required. |

The detailed differences register is the recommended single authoritative mapping
home. Its [proposed maintenance rule](archimate-differences.md#proposed-maintenance-rule)
would require a changed difference to update its stable ID entry, edition, source,
rationale, status, direction/loss and compatibility in the same delivery. It would
keep deprecated IDs and distinguish existing observations from accepted changes.
This review recommends that rule; a merge alone does not adopt it. ArchiMate is
the starting foundation, not a reason to discard useful identity, time or evidence.

## Decisions, compatibility and bounded follow-up

Decision topics below consolidate the domain proposals rather than create accepted
ADRs. Each needs a recorded choice by the applicable methodology decision owner,
with the named consumer reviewers. No agent or tool is assigned new authority.

| Topic / source | Options and recommendation | Proposed decision owner / required evidence |
|---|---|---|
| Resource identity, semantic A1 | Shared IDs, catalogue-scoped persistent IRIs, or snapshot-only identity. Recommend persistent scoped resources plus separate snapshots. | Methodology governance with catalogue maintainers; demonstrate collisions, relocation, contained-object promotion and namespace ownership/deprecation. |
| Relation/time representation, A2 | Bare edges, identified records, or records plus shortcuts. Recommend records with explicit time/null/default/loss policy. | Metamodel maintainers with report/export implementers; preserve parallel/recurring relations and endpoint validity. |
| Inference/validation, A3 | None, optional bounded RL, or unrestricted OWL. Recommend no inference by default and separately tested opt-in RL. | Semantic-tool/validator maintainers; syntax/entailment counterexamples, separated graphs and unchanged diagnostic meanings. |
| Terminology, A4 | Expand core TERM, add an optional package/projection, or editorial guidance. Recommend guidance first. | Methodology governance with terminology reviewers; definition/examples and multilingual/duplicate-TERM cases; authorized ISO evidence or explicit unknowns. |
| Fact evidence, A5 | Artifact-only, per-fact or graph-level provenance. Recommend per-fact evidence when sources differ, homogeneous graph evidence otherwise. | Evidence/document maintainers with methodology governance; four fact bases, authorization and missing/denied evidence; preserve document-checker boundaries. |
| AD evidence companion, architecture decision table | Prose-only, optional structured profile, or mandatory core. Recommend companion first, then a representative structured case. | Methodology maintainers with authors/renderers; nine concepts and 2022 perspectives/aspects/correspondences. |
| Register authority/maintenance, architecture decision table | Glossary-only, one detailed register plus links, or duplicated consumer tables. Recommend the single detailed register and same-change updates. | Methodology maintainers with semantic-tool implementers; existing/proposed states, known losses and stable-ID lifecycle. |
| Ontology/registry, architecture decision table | No profile, optional bounded mappings, or mandatory upper ontology. Recommend defer until a competency question needs one. | Methodology governance with ontology/catalogue implementers; independent BFO/DOLCE cases, selected ODM/11179 target and rejected collapses. |

Existing source contracts and consumers remain authoritative. Optional documentation
and separately described outputs can be additive. Changed identity minting, required
fields, relation direction, TYPE meaning, alias policy or diagnostic meanings can
break resolvers, ingest, diagrams, reports and historical queries. Such changes need
consumer tests, a methodology-version decision and an explicit migration under
[the compatibility contract](../../notations/CONTRACT.md#10-versioning-and-compatibility).
This review neither selects that version nor changes a schema.

| Consolidated proposal and scope | Existing findings / dependency | Acceptance evidence | Compatibility / recommended priority |
|---|---|---|---|
| Qualify introductory relation and broad alignment wording | Architecture B-01; AM-012/013; canonical element/REL contracts | Distinguish introductory and canonical forms, qualify Concern/edition claims and link the detailed register without claiming adoption. | Documentation-only / P1 |
| Define identity and faithful exchange contract | Semantic B1/B2, A1/A2; architecture B-04 and applicable source/license decisions | Two identical local IDs remain distinct; preserve recurring/parallel RELs, history, lifecycle, admission, ordering and null/default/unknown extensions; explicit loss for each format. | Optional specification additive; identity/storage changes breaking / P1 |
| Define validation, query and evidence adapters | Semantic B3/B4, A3/A5; preceding identity/representation contract | H1/H2 and Q1–Q3 positives/negatives; endpoint time, complete/partial/denied population, four fact bases and inference isolation; versioned diagnostics. | Optional adapters additive; new mandatory gates breaking / P1 |
| Demonstrate one AD package and one architecture cycle | Architecture B-02/B-03; companion decision, full applicable 42010/42020 requirements for conformance claims | One subject, two audiences and concern coverage; process outcomes backed by records, gaps or explicit non-applicability. | Optional evidence companion / P2 |
| Review terminology/schema correspondence | Semantic B5, A4; authorized evidence or named limits | Multilingual labels, non-circular definitions, examples/non-examples, duplicate-TERM rejection and non-equivalent mappings. | Editorial additive; mandatory schema/labels need migration / P2 |
| Evaluate ontology/registry and dataset metadata only for consumers | Architecture B-05; semantic B6; approved use case and selected profile | Plan/execution/context counterexamples; named target and losses; one real Dataset/Distribution without invented services. | Optional research/metadata / P3 |

These are bounded proposals, not executable implementation commissions. The domain
reviews retain their stable gap/backlog IDs and detailed examples. Proposed shape
and query cases assess only the stated hypothetical profile; passing them cannot
prove current product support, standards conformance, admission or publication.

Review acceptance can confirm evidence coverage while leaving the named design
decisions and inaccessible requirements unresolved. A subsequent normative profile
must record each candidate's actual disposition, scope, edition, exception and
evaluation method. It must not promote the recommendations here to implemented
RDF/OWL/SHACL/SPARQL capabilities or finalize unresolved compatibility choices.
