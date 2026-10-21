# Transitrix Semantic Standards Profile

**Profile version: 1.0.** This is the normative documentation contract for an
explicit claim of conformity to this profile. It does not assert that existing
Transitrix tools implement RDF exchange, OWL reasoning, SHACL validation or a
SPARQL endpoint. Canonical authoring remains Git/YAML under the
[notation contract](../notations/CONTRACT.md); existing file schemas, identifiers,
admission rules and diagnostic meanings are unchanged.

Architects can read a [concise interoperability explanation](https://transitrix.com/semantic-standards/?utm_source=methodology-semantic-profile).
The [standards review](../docs/standards-review/README.md) supplies the evidence,
editions, findings and access limitations behind this profile. The
[ArchiMate differences register](../docs/standards-review/archimate-differences.md)
is the single detailed home for comparisons, including partial and lossy mappings.
Neither this profile nor that register establishes standards certification.

## Scope, language and conformance

**MUST** identifies an obligation for the explicitly claimed scope. **SHOULD**
identifies a recommendation: a departure needs a stated reason, assessed effect
and evidence. **MAY** identifies a permitted option. These words express this
Transitrix contract, not a reproduction of inaccessible standards requirements.

There are three independently declared scopes:

- **A — authoring and interpretation:** definitions, original local identities,
  source authority and truthful capability/mapping claims. This adds no required
  YAML fields or new automated admission gate.
- **X — a described semantic interchange:** an optional mapping contract and its
  selected formats, identity, context, loss, evidence and compatibility. Choosing
  X does not commission an exporter or replace source storage.
- **T — a tool's claim of profile support:** the exact implemented subset, versions,
  test evidence, limitations and unsupported behavior. A documentation proposal
  is not an implementation claim.

A conformity declaration MUST identify profile version, subject/source revision,
selected scopes and formats, satisfied rule IDs, evidence and explicit deviations.
It MUST NOT use a partial scope as a claim that all Transitrix software conforms,
or treat conformity to this local profile as conformity to an external standard.
There is no default claim for an existing model or tool merely because it uses
Transitrix terminology. A diagram, valid YAML, successful render or approved
assertion alone is insufficient evidence.

For a SHOULD deviation or permitted exception, record the rule, scope, reason,
alternative, responsible maintainer, affected versions and evidence. An exception
cannot authorize a false implementation/conformance claim, label unknown evidence
as verified, or hide semantic loss. An incompatible core/schema change, a concrete
ontology adoption or a new service requires its own recorded architecture decision
and compatibility work; this profile supplies none of those decisions.

## Concepts, identity and authority

A **taxonomy** is an organized concept scheme for classification or retrieval,
with explicitly interpreted broader/narrower/related links. An **ontology** defines
classes, properties and their formal interpretation or axioms. A **knowledge graph**
is a selected graph or dataset of identified resources and assertions, with declared
context and evidence; being graph-shaped alone does not establish an ontology or
entailment regime. A taxonomy can index resources in a knowledge graph; an optional
ontology can describe their classes. None of these roles implies another.

`skos:Concept`, `owl:Class` and an individual have distinct semantic roles. A
retrieval concept about applications is not the class of applications, and neither
is a particular application. Sharing a label does not justify identity or class
equivalence. Deliberate metamodeling must name its interpretation and test its
consequences; it cannot silently reinterpret a canonical TYPE or TERM. Existing
[TERM and glossary semantics](../notations/ELEMENT_PRIMITIVES.md) remain
authoritative; an enterprise object's definition is not duplicated as a TERM.

ArchiMate 3.2 is a starting foundation, not an overriding fidelity constraint.
Preserve useful distinctions in identity/stake, history, obligations and evidence.
Compare actual meanings, direction and applicability rather than substitute
similarly named types or relations. The element/relation specifications remain
authoritative for Transitrix behavior; the differences register explains comparisons.

## Applicable rules and evaluation

All rule evidence is bound to the declared subject, source/methodology/profile
revision and selected scope. Standards locators and known access limits are in
the [semantic](../docs/standards-review/semantic-evidence.md#authoritative-source-register)
and [architecture](../docs/standards-review/architecture-evidence.md#sources-and-access)
source registers. A source field's presence establishes a declaration, not its truth.

| Rule / scope | Standard and finding | Transitrix obligation | How satisfaction is evaluated |
|---|---|---|---|
| **SSP-01 — roles and interpretation; A/X/T** | SKOS 2009 §§3–5, OWL 2 Structural 2012 §§5/9; SE-01/07 | MUST distinguish concept, class and individual; MUST NOT infer identity from labels or `subClassOf` from organizational parentage. A deliberate metamodeling option MUST state its separate interpretations. | Three-role example and a rejected same-label merge; preserve existing duplicate-TERM behavior. No unreviewed TYPE reinterpretation. |
| **SSP-02 — persistent identifiers; X/T** | RDF 1.1 Concepts 2014 §3.2; SE-02 | MUST preserve local ID, catalogue identity and containment scope separately from the resource IRI. MUST document namespace controller, minting rule, collision policy, persistence and successor/redirect policy. A branch/path/repository basename alone MUST NOT define identity. | Two catalogues with the same local ID produce distinct resources; relocation retains identity; contained-object promotion has an explicit mapping. No specific production namespace or registry service is selected here. |
| **SSP-03 — reuse and mappings; A/X/T** | SKOS 2009 §10, RDF 1.1; SE-01/02/07, REC-03 | SHOULD reuse an applicable published vocabulary with pinned edition/context; MUST state a mapping's direction, strength, source/version, provenance and loss. MUST NOT turn label similarity into `owl:sameAs`, exactMatch or class equivalence. | Distinguish exact, broader/narrower, related and unmapped cases. A partial or lossy projection is labeled as such; no lossless claim without evidence. |
| **SSP-04 — graph and formats; X/T** | RDF 1.1 Concepts 2014 §§3–4, Turtle 2014, JSON-LD 1.1 2020; SE-03 | MUST declare graph/dataset selection and selected exchange formats. RDF claims MUST use RDF 1.1 semantics. A Turtle target MUST state how a dataset is packaged; a JSON-LD target MUST pin its context and coercion/list/null rules. MUST preserve relation identity and supported fields or explicitly report loss. | Reconstruct parallel/recurring RELs, endpoint/window selection, admission, history, missing/null/default values, ordered occurrences and unknown extensions. Byte-identical YAML round trip is not promised without retained source bytes. |
| **SSP-05 — assertion provenance; A/X/T** | PROV-O 2013 §§3–4; SE-06, C4 | MUST distinguish declared, observed/imported, inferred and AI-proposed evidence where such a claim is made. MUST identify source/locator, source and record versions, responsible agent and time, or explicitly retain unknowns. SHOULD map to PROV-O where exchanging that evidence. | Demonstrate all four bases, missing/denied evidence and differing assertion sources. Inference retains input/rule versions; an import proves source presence, not enterprise truth. Admission/approval and document generation remain separate. No retrospective fabricated evidence. |
| **SSP-06 — validation and queries; X/T** | SHACL 1.0 2017 §§2–5, SPARQL 1.1 Query 2013 §§8–9/13/16–17, OWL 2 Profiles 2012 §§4.2–4.3; SE-04/05 | MUST separate structural constraints, inference and admission. A SHACL claim MUST identify shapes/data graphs and engine/version; a SPARQL claim MUST identify dataset/time/entailment and completeness. Denied/incomplete scope MUST remain unknown at the adapter boundary. SHOULD preserve original diagnostic identities and versions. | Positive and negative H/Q cases, time boundaries, endpoint lifecycles and graph isolation. An OWL/RL claim needs its own syntax/entailment tests. No engine, endpoint or inference is required merely to author YAML. |
| **SSP-07 — vocabulary lifecycle; A/X/T** | RDF/SKOS identity, DCAT 3 2024 version metadata; SE-02/03/07/08 | MUST distinguish resource identity, description snapshot, vocabulary/profile version and source-methodology version. MUST retain deprecated IDs with successor and compatibility notes; MUST NOT reuse an ID for a different meaning. SHOULD publish mappings for renamed or retired terms. | Existing references remain interpretable after rename/deprecation; new versions identify changed meanings/contexts and losses. No automatic deletion, redirect service or tool behavior is assumed. |
| **SSP-08 — compatibility; A/X/T** | Local compatibility contract §10; SE-02–07, REC-03/04 | MUST assess changed identity, meaning, required fields, relation direction, context expansion and diagnostics against consumers. MUST document migration/version implications before an incompatible implementation. Optional outputs MAY be additive; no automatic major/minor classification overrides the existing contract. | Compare before/after interpretations and affected parsers, resolvers, views/reports, catalogue bindings and historical queries. Keep unsupported/unknown distinct from success. |
| **SSP-09 — terminology; A** | ISO 704:2022 / 1087:2019 scope, SKOS 2009; SE-07, C5 | SHOULD describe concept/context, definition, preferred designation, other designations, relations and examples/non-examples. MUST label ISO clause correspondence unevaluated where full evidence is unavailable. | Review non-circular definitions, language-specific labels and non-equivalent mappings without duplicating canonical enterprise definitions. No new mandatory terminology fields or unsupported ISO compliance claim. |
| **SSP-10 — architecture and mapping register; A/X/T** | ISO 42010:2022 conceptual mapping, ArchiMate 3.2; ARC-001–009/015, AM-001–014 | MUST identify comparison edition and subject; MUST preserve partial/non-equivalent mappings. A change introducing, changing or removing an ArchiMate difference MUST update its stable register entry in the same change. SHOULD use an optional AD evidence companion where stakeholder/concern coverage matters. | Entry contains edition/concept, exact Transitrix path/revision, difference, benefit/tradeoff, status, direction/loss, consumers/compatibility and decision reference or explicit unknown. Retain deprecated IDs; do not promote proposals to accepted semantics without a recorded decision. |
| **SSP-11 — claim boundaries and optional metadata; A/X/T** | PROV-O/DCMI Terms 2020/DCAT 3 2024; REC-01/05/06 | MUST state implemented versus specified/proposed/unevaluated capability. MAY use Dublin Core for actual described resources and DCAT for real datasets/distributions. MUST NOT invent a service, selected upper ontology, external registration, conformance or certification. | Inspect claim, named resource/consumer, exact implementation/test evidence and remaining unknowns. No specific BFO/DOLCE/ODM/11179 profile or external system follows from this document. |

## Disposition of the reviewed candidates

The review's preliminary stack is not a universal replacement for current authoring.
This version specifies the following bounded documentation contract; an unimplemented
selected target still needs separate source, decision, compatibility and release evidence.

| Candidate | Disposition and rationale | Scope / findings |
|---|---|---|
| RDF 1.1, stable IRIs, named graphs | Change universal adoption to explicit X/T claims. Retain scoped persistent identity and declared context; named graphs are recommended where context/provenance requires them. | SSP-02/04; SE-02/03. No mandatory RDF storage. |
| Turtle and JSON-LD 1.1 | Change universal format mandates to requirements for each selected target. A claimed format must preserve its stated contract; neither format alone supplies a Transitrix mapping. | SSP-04; SE-03. No exporter is delivered. |
| SKOS / ISO 25964-1:2011 and -2:2013 | Retain SKOS as a selected concept-scheme mapping; defer ISO normative correspondence without full evidence. A glossary is not automatically a thesaurus. | SSP-01/03/09; SE-01/07. Optional retrieval profile. |
| OWL 2 / RL | Defer mandatory ontology/inference adoption. A selected optional ontology must declare interpretation and regime; no inference by default is introduced into existing tools. | SSP-01/06; SE-04/A3. Concrete ontology choice requires a separate decision. |
| SHACL 1.0 | Change universal validator requirement to explicit X/T graph-constraint claims, separated from current validators and admission. | SSP-06; SE-04. H1/H2 remain illustrative shapes. |
| SPARQL 1.1 | Change blanket support to explicit query claims with dataset/completeness evidence. Query examples do not implement Update, Protocol or an endpoint. | SSP-06; SE-05. Q1–Q3 are examples. |
| ISO 704:2022 / ISO 1087:2019 | Use original concept-oriented guidance; defer clause-level normative correspondence. Full text was unavailable in the review. | SSP-09; SE-07. No certification or new core schema. |
| ISO/IEC/IEEE 42010:2022 / 42020:2019 | Retain edition-specific conceptual alignment; defer conformance and new process mandates pending complete evidence. | SSP-10/11; ARC-001–010. Architecture Model has the review's 2022 qualification. |
| PROV-O | Retain optional provenance interchange, with required truthful source/basis distinctions for evidence claims. | SSP-05; SE-06. Existing document provenance remains separate. |
| Dublin Core Terms / DCAT 3 | Retain conditionally for actual resources/datasets and consumers, not every catalogued element. | SSP-11; SE-08. No invented service or registry. |
| ISO/IEC 21838-1:2021 / BFO / DOLCE | Defer upper-ontology adoption; neither a specific ontology nor its axioms are selected. A concrete choice needs a dedicated architecture decision and representative cases. | SSP-11; ARC-011–013. No required core classification. |
| ArchiMate 3.2 / OMG ODM 1.1 | Retain optional mappings with explicit edition, direction and losses; reject blanket equivalence. Adopt one detailed differences-register home and same-change maintenance for comparisons. | SSP-03/10; ARC-014/015, AM-001–014. No exchange implementation or license path selected. |
| ISO/IEC 11179 selected 2023 parts | Defer general adoption; a bounded registry profile must select its parts, target and evidence independently. | SSP-11; ARC-016. Catalogue binding does not establish external registration. |

Remaining architecture choices—production namespace ownership/minting, concrete
exchange mapping and time/default policy, inference regime, terminology schema,
provenance capture implementation, structured AD companion and ontology/registry
selection—are not decided here. The rules require them to be declared/evidenced
before the corresponding implementation or conformance claim. Deferral is explicit,
not an implementation backlog automatically commissioned by this profile.

## Worked interpretation: concept, class and instance

This fictional example demonstrates SSP-01–05/07; all namespaces are illustrative,
not published Transitrix vocabulary. Assume a publisher controls the immutable
catalogue identity `example-catalogue-1` and its `https://example.org/catalogue/one/`
namespace. Its policy keeps resource IRIs stable across repository moves and gives
description snapshots separate versioned IRIs. A second catalogue uses another
namespace even if its YAML also contains `APPLICATION-PAYMENTS-1`.

```turtle
@prefix res: <https://example.org/catalogue/one/objects/> .
@prefix concept: <https://example.org/catalogue/one/concepts/> .
@prefix onto: <https://example.org/catalogue/one/ontology/> .
@prefix record: <https://example.org/catalogue/one/evidence/> .
@prefix external: <https://example.org/external/vocabulary/v1/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

concept:topics a skos:ConceptScheme .
concept:payment-processing a skos:Concept ;
  skos:inScheme concept:topics ; skos:prefLabel "Payment processing"@en ;
  skos:relatedMatch external:payment-processing .
onto:Application a owl:Class .
res:APPLICATION-PAYMENTS-1 a onto:Application ;
  dct:identifier "APPLICATION-PAYMENTS-1" ;
  dct:subject concept:payment-processing .

record:subject-assertion-1 a prov:Entity ;
  record:subject res:APPLICATION-PAYMENTS-1 ;
  record:predicate dct:subject ; record:object concept:payment-processing ;
  record:basis "declared" ; record:version "1" ;
  prov:wasDerivedFrom record:source-snapshot-1 ;
  prov:wasAttributedTo record:author-1 ;
  prov:generatedAtTime "2026-10-21T00:00:00Z"^^xsd:dateTime .
record:source-snapshot-1 a prov:Entity ; record:sourceVersion "source-revision-1" .
record:author-1 a prov:Agent .
record:mapping-1 a prov:Entity ;
  record:subject concept:payment-processing ;
  record:predicate skos:relatedMatch ; record:object external:payment-processing ;
  record:direction "local-to-external" ; record:loss "related, not equivalent" ;
  record:basis "declared" ; record:version "1" ;
  prov:generatedAtTime "2026-10-21T00:00:00Z"^^xsd:dateTime ;
  prov:wasDerivedFrom external:scheme ;
  prov:wasAttributedTo record:author-1 .
external:scheme record:sourceVersion "1" .
```

The concept supports retrieval, the class describes an optional ontology
interpretation, and the application is an instance. `relatedMatch` deliberately
does not promise equivalence. The source-backed assertion is declared, not proved;
its admission and any document-generation evidence are separate. Mapping direction
and source version are recorded rather than inferred from the edge alone.

For a revision that deprecates the concept, retain its IRI, old snapshot and a
replacement/compatibility note. A new preferred label does not change instance
identity. Changing the class meaning or upgrading relatedMatch to exactMatch is
a semantic change requiring evidence and compatibility review, not cosmetic editing.

Reject these interpretations: one shared label means all three resources are
`owl:sameAs`; moving a repository requires minting all object IRIs again; a missing
provenance timestamp may be invented; a shape pass admits a fact; or the example
proves a production exporter exists. For concrete graph-constraint/query examples
and counterexamples, reuse [the review's H/Q cases](../docs/standards-review/semantic-evidence.md#non-normative-shacl-examples).

## Maintenance and compatibility

The [differences register](../docs/standards-review/archimate-differences.md) remains
the one detailed comparison source; glossary and guidance link to it. SSP-10 applies
to future accepted changes introducing, changing or removing a difference in the
same delivery. Existing baseline observations do not become accepted semantic
changes merely because this profile names the register.

Profile versions are separate from methodology, vocabulary, context, shape/query
and tool versions. A changed mandatory interpretation or incompatible profile claim
requires a major profile version; additive optional guidance can use a minor version;
editorial corrections can use a patch. Core methodology compatibility and migration
remain governed by [CONTRACT §10](../notations/CONTRACT.md#10-versioning-and-compatibility).
Tool support and release propagation require their own evidence; prose does not
silently migrate stored models or upgrade installed consumers.
