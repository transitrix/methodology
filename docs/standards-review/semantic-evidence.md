# Semantic, terminology and provenance standards evidence

This review is for methodology maintainers, model authors and semantic-tool
implementers. It evaluates candidate interoperability mechanisms; it does not
adopt a standard, change the metamodel, or implement an RDF exporter, ontology,
SHACL validator or query service. All examples and capitalized recommendations
below are **non-normative proposals**.

## Evidence baseline and claim boundaries

Reviewed repository revision: `8ca4eabf7666946ffb7a76eb579c31cb0ae3f327`
(main observed 2026-10-11; identical to the 2026-10-10 review baseline).
Every Transitrix path and section below refers to that revision; no later
implementation is included. The entry points were [README](../../README.md),
[contribution checks](../../CONTRIBUTING.md), [glossary](../../method/00-glossary.md),
[modelling](../../method/03-modelling.md), [notation index](../../notations/README.md),
[identifier contract](../../notations/IDS_AND_REFERENCES.md) and
[shared contract](../../notations/CONTRACT.md). The evidence register follows
those entry points into specifications and consumers rather than treating an
index or scaffold as the metamodel.

Here, **alignment** means a supported conceptual comparison; **interoperability**
requires an explicit mapping and exchange tests; **formal conformance** requires
an identified conformance target and its complete applicable requirements;
**certification** requires a separately identified scheme and evidence. This
review establishes no formal conformance or certification. A similarly named
Transitrix field is not an equivalence axiom.

### Transitrix evidence register

| Key | Exact path and section at the baseline | Evidence and limits |
| --- | --- | --- |
| T1 | [ELEMENT_PRIMITIVES](../../notations/ELEMENT_PRIMITIVES.md) §§1.1, 3, 7.30, 9; [glossary view](../../notations/views/reports/32-glossary.md) §§1–3 | TERM has no additional per-TYPE fields: name, aliases and description use the shared envelope. An enterprise object retains its own definition. A duplicate TERM fails the name/alias gate. A glossary is a projection, not a concept store. |
| T2 | [IDS_AND_REFERENCES](../../notations/IDS_AND_REFERENCES.md) §§1, 4–5; [MANIFEST](../../notations/MANIFEST.md) §4; [CONTRACT](../../notations/CONTRACT.md) §17 | IDs have scoped uniqueness, including contained objects; the nearest manifest defines a catalogue. `canon_id` and central `origin` bind catalogue provenance, not global RDF identity. REQUIREMENT's scalar `origin` is a different taxonomy. |
| T3 | [Relations](../../notations/elements/17-relations.md) §§1–3; [CONTRACT](../../notations/CONTRACT.md) §§6–7, 9, 11–14 | REL identity, direction, closed kind enum, independent validity window; admission, reviewer authority, agreement, confidence, history gaps and view configuration are distinct. |
| T4 | [Codex](../../notations/elements/14-codex.md) §§1–3; [Requirement](../../notations/elements/15-requirement.md) §§2, 4; [Assertion](../../notations/elements/16-assertion.md) §§1–2 | STANDARD represents an external authority document. `derived_from` is a source reference. ASSERTION is specifically a requirement satisfaction claim, not a universal RDF statement container. |
| T5 | [Requirement-chain](../../notations/views/reports/requirement-chain.md) §§3–9; [Relations](../../notations/elements/17-relations.md) §3 | Population completeness, release scope and definition versus execution evidence already have a consumer contract. Six additional relation kinds are specified with implementation limitations; a source delivery is not proof of released support. |
| T6 | [CONTRACT](../../notations/CONTRACT.md) §§18.1–18.7; [diagnostic migration](../../migrations/6.0-to-7.0/README.md) | Coverage and diagnostic identity carry notation/form, methodology and tool versions. Preserve historical codes and meanings; a SHACL result must not silently replace one. |
| T7 | [Document provenance](../../packages/document-renderer/PROVENANCE.md), “Authorization and observation boundary”, “Result contract”; [checker](../../packages/document-renderer/src/provenance.mjs), `checkDocumentProvenance` | Independent authorized observations are separate from recorded claims. `run.generation` remains unverifiable; matching digests do not prove input consumption. |
| T8 | [Catalogue consumer](../../packages/ingest-cli/src/catalogue.mjs), `parseCatalogueDecl`; [name/alias gate](../../packages/ingest-cli/src/canon.mjs), `buildCanonIndex`; [glossary consumer](../../packages/document-view-engine/src/glossary-view.mjs), `parseGlossaryYaml`, `renderGlossaryHtml`; [engine](../../packages/document-view-engine/src/evaluate.mjs) | Concrete YAML consumers exist. They are not evidence of an RDF identity service, SKOS thesaurus or OWL reasoner. Existing glossary output and admission selection must survive any export. |
| T9 | [Domain packages](../../notations/PACKAGES.md) §5; [3.0 migration](../../migrations/2.1-to-3.0/README.md), “What this recipe does”; [catalogue release example](../../integration/catalogue-release-example.yaml) | Optional packages, archival migration and versioned catalogue distribution already exist. Semantic integration should be removable and version-bound, not an implicit core migration. |

### Authoritative source register

Access date for all sources: **2026-10-11**. W3C and DCMI full specification
pages were accessible. Section references identify the reviewed concepts, not a
claim that every clause was audited. ISO catalogue pages were accessible;
ISO's browser previews for 704 and 1087 returned a JavaScript-only shell.
No licensed full ISO text was available in this review. No standard was
purchased or reproduced. ISO recommendations below are local design candidates,
not reconstructed normative clauses. Undated assignments are pinned here.

| Key | Edition / part and authoritative source | Reviewed locator / access limitation |
| --- | --- | --- |
| S1 | [RDF 1.1 Concepts, 25 February 2014](https://www.w3.org/TR/2014/REC-rdf11-concepts-20140225/) | §§3.1–3.6 triples, IRIs, literals and graph comparison; §4 datasets. |
| S2 | [RDF 1.1 Turtle, 25 February 2014](https://www.w3.org/TR/2014/REC-turtle-20140225/) | §§2.1–2.5 syntax, §6 grammar, §5 conformance. |
| S3 | [JSON-LD 1.1, 16 July 2020](https://www.w3.org/TR/2020/REC-json-ld11-20200716/) | “The Context”, “Advanced Concepts”: typed values, language, lists/sets, named graphs; “Relationship to RDF”. |
| S4 | [SKOS Reference, 18 August 2009](https://www.w3.org/TR/2009/REC-skos-reference-20090818/) | §§3–4 concepts/schemes; §5 S13–S14 labels; §§7–8 semantic relations/documentation; §10 mappings. |
| S5 | [OWL 2 Structural Specification, second edition, 11 December 2012](https://www.w3.org/TR/2012/REC-owl2-syntax-20121211/) and [OWL 2 Profiles, same edition/date](https://www.w3.org/TR/2012/REC-owl2-profiles-20121211/) | Structural §§5, 5.9, 9; Profiles §§4.2–4.3 distinguish RL syntax from RDF rule processing. |
| S6 | [SHACL 1.0, 20 July 2017](https://www.w3.org/TR/2017/REC-shacl-20170720/) | §§2–3 targets, data/shapes graphs and reports; §§4.1–4.5 cardinality, types and pair constraints; §5 SPARQL constraints. |
| S7 | [SPARQL 1.1 Query, 21 March 2013](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/) | §§8 negation, 9 property paths, 13 datasets, 16 query forms, 17 expressions. Query proposals only; Update, Protocol and remote endpoint conformance are unevaluated, since no service is proposed. |
| S8 | [ISO 704:2022, edition 4](https://www.iso.org/standard/79077.html) | Catalogue scope: terminology principles/methods. Clause-level requirements unevaluated: full normative text unavailable. |
| S9 | [ISO 1087:2019, edition 2](https://www.iso.org/standard/62330.html) | Catalogue scope: terminology vocabulary. Definitions/clauses unevaluated without full text. |
| S10 | [ISO 25964-1:2011, edition 1](https://www.iso.org/standard/53657.html) | Part 1, thesauri for information retrieval; full normative requirements unevaluated. The accessible catalogue also lists revision activity, not an adopted replacement here. |
| S11 | [ISO 25964-2:2013, edition 1](https://www.iso.org/standard/53658.html) | Part 2, interoperability with other vocabularies; full normative requirements unevaluated. |
| S12 | [PROV-O, 30 April 2013](https://www.w3.org/TR/2013/REC-prov-o-20130430/) | §§3.1–3.3 starting-point, expanded and qualified terms; §4 cross-reference for Entity, Activity, Agent and provenance properties. |
| S13 | [DCMI Metadata Terms, 20 January 2020](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/2020-01-20/) | Individual entries `identifier`, `source`, `creator`, `created`, `modified`, `hasVersion`, `isVersionOf`, `conformsTo`. |
| S14 | [DCAT 3, 22 August 2024](https://www.w3.org/TR/2024/REC-vocab-dcat-3-20240822/) | §6 vocabulary entries for Catalog, Dataset, Distribution and DataService; versioning properties. Applicable to published datasets, not every enterprise element. |

## Standards matrix

P1 means a prerequisite for a credible semantic exchange proposal; P2 means a
useful optional extension after that contract; P3 means defer until a consumer
exists. These are proposed priorities, not an implementation schedule.

| Standard | Relevant Transitrix area | Current status | Gap | Recommendation | Priority |
| --- | --- | --- | --- | --- | --- |
| RDF 1.1 (S1) | T2–T3 identity, relations, context | Graph-like model; no reviewed RDF mapping contract | Local IDs and metadata cannot be reduced to unqualified triples | SE-02/03: scoped persistent identities and identified relation records | P1 |
| Turtle (S2) | T3, T8 serialization | YAML is not Turtle | A Turtle file represents one graph, not the entire dataset envelope | SE-03: optional graph serialization; preserve named-graph selection separately or use a dataset syntax | P2 |
| JSON-LD 1.1 (S3) | T2–T3, T8 exchange | No pinned JSON-LD context in the reviewed contracts | JSON-shaped YAML is not JSON-LD; coercion can erase nulls, ordering or reference types | SE-03: version a context and loss manifest; require round-trip examples before claiming interoperability | P2 |
| SKOS (S4) | T1 terminology and taxonomy | Partial conceptual alignment only | TERM does not declare a concept scheme, multilingual labels or thesaurus mappings | SE-01/07: opt-in concept projection, distinct from enterprise-object identity | P1 |
| OWL 2 / OWL 2 RL (S5) | T1, T3 TYPEs and relations | No reviewed ontology or RL profile declaration | Type names do not define class extensions or allowed axioms | SE-01/04: a small optional ontology with explicit RL checks; no automatic hierarchy conversion | P2 |
| SHACL 1.0 (S6) | T3, T6 validation | Existing validators are not SHACL engines | Shape targets, graph completeness and diagnostic mapping undefined | SE-04: separate graph constraints from inference and admission | P1 |
| SPARQL 1.1 (S7) | T5 graph reports | Existing report contracts, no semantic query contract | Query answers depend on graph selection, time and entailment | SE-05: competency questions with counterexamples and unknown states | P1 |
| ISO 704:2022 (S8) | T1 definitions/designations | Local fields offer partial terminology support; ISO conformance unknown | Concept characteristics, definition review and examples lack structured profile | SE-07: editorial concept record proposal; clause audit remains unevaluated | P1 |
| ISO 1087:2019 (S9) | T1 glossary language | Terminology vocabulary correspondence unevaluated | “TERM”, “Meaning”, concept and designation cannot be presumed identical | SE-07: maintain a reviewed correspondence table after normative access | P2 |
| ISO 25964-1:2011 (S10) | T1 glossary and retrieval | Glossary is not a declared thesaurus; requirements unevaluated | No reviewed thesaurus exchange or multilingual relationship profile | SE-07: optional retrieval vocabulary, preserving existing definitions | P2 |
| ISO 25964-2:2013 (S11) | T2 catalogue integration | Bindings do not establish thesaurus equivalence; requirements unevaluated | Mapping scope, provenance and equivalence strength unspecified | SE-02/07: curated mappings with source/version, never inferred from labels | P2 |
| PROV-O (S12) | T3–T4, T7 fact and document evidence | Local provenance fields and a document checker exist | Generic assertion evidence is not uniformly modeled | SE-06: separate fact, admission and generation records | P1 |
| Dublin Core Terms (S13) | T4 source documents, T7 outputs | Descriptive metadata can align | Field-level crosswalk and resource being described are unspecified | SE-06: optional document metadata mapping; `conformsTo` is not certification | P2 |
| DCAT 3 (S14) | T2, T9 distributed catalogues | Conditional applicability to dataset publication | No reviewed dataset/distribution/service publication contract | SE-08: evaluate on an exported catalogue dataset; inapplicable to individual ACTORs or RELs merely because they are catalogued | P3 |

## Semantic gap register

### SE-01 — concepts, classes and individuals

A taxonomy entry may be a `skos:Concept`; an enterprise occurrence may be an
individual; a TYPE may become an `owl:Class` only under a defined interpretation.
These are different modeling decisions (S4 §§3, 8; S5 Structural §§5, 5.9).
For example, a retrieval concept “payment service” can index the individual
`APPLICATION-PAYMENTS-1`; it does not make that application a class. A
capability's `parent` relation is not automatically `rdfs:subClassOf`, nor is
`skos:broader` a generic organizational containment relation.

Candidate default: distinct IRIs for the concept, ontology class and enterprise
object, connected by an explicitly defined annotation. Deliberate metamodeling
is a separate option: OWL 2 punning uses independent class and individual
interpretations under Direct Semantics; it does not license arbitrary
cross-level entailment. Any such option needs a profile-specific test.

Positive: `ex:paymentConcept a skos:Concept` and `ex:app a ex:Application` with
an explicit indexing link. Negative: transform every TERM and application
with the same label into one `owl:sameAs` identity. Labels alone prove neither
identity nor class equivalence. T1's existing no-duplicate-TERM rule remains.

**Compatibility:** an optional projection is additive. Reclassifying existing
IDs, merging by labels or changing `parent` semantics is potentially breaking
for catalogue resolvers, diagrams and report consumers. Depends on SE-02/07.

### SE-02 — persistent IRIs and catalogue boundaries

T2's identifiers are locally scoped, not globally persistent IRIs. Candidate
export identity is an immutable catalogue identity plus the applicable local
scope and ID. Include a parent scope for contained identifiers. A pathname,
repository basename, branch name or today's remote URL is not a persistence
policy. Keep the original ID and scope in export metadata and retain an
explicit registry mapping if a contained object is promoted without renaming.

Two unrelated catalogues may both contain `GOAL-1`: positive export produces
two IRIs. Negative export produces one IRI by concatenating only a shared
namespace and `GOAL-1`. Catalogue central binding does not imply `owl:sameAs`:
preserve `canon_id`, origin source/version and the local incarnation (T2, T8).
IRIs identify resources; versioned snapshots identify descriptions of them.
S1 §3.2 supplies RDF identity syntax, not an operational persistence service.

**Compatibility:** optional mapping is additive. Replacing local IDs or changing
IRI minting after publication is breaking for links and consumers; require a
migration/redirect mapping, collision tests and an ownership decision first.

### SE-03 — representation and loss accounting

An identified n-ary relation resource is the candidate default for REL (T3).
A shortcut edge may be derived for one declared as-of projection, but cannot
replace the relation's identity or history. RDF 1.1 datasets do not themselves
define what a graph name means (S1 §4); specify that policy explicitly.

| Source information | Candidate representation | Loss or extension risk |
| --- | --- | --- |
| REL id, kind, from, to | IRI for the record with explicit kind/source/target properties | A single binary edge collapses parallel records and loses record identity. |
| REL and endpoint validity | Separate typed dates for each resource, explicit open-end marker | Filtering by relation date alone can include retired endpoints. No asserted temporal inference from RDF itself. |
| Admission, reviewer authority, agreement, workflow status | Separate properties/decision records | `active` admission is not temporal validity, truth, agreement or human approval. Preserve absent-field defaults and their derivation. |
| History sidecars | Identified attribute-version entries with date and value/gap marker | Latest-value-only export loses past queries; absent value is not a recorded null gap. |
| Lists, duplicate entries, null versus absent, extension fields | Ordered collections/occurrence records and explicit null markers where needed | RDF sets erase duplicate triples; JSON-LD ordinary arrays need not retain order; unhandled fields require an explicit loss report. |
| Catalogue, source revision, package/profile, selection, as-of date | Dataset manifest plus graph identities | A union of all graphs mixes versions, proposed and admitted facts. Missing selection closure is unknown. |
| Views | Derived output linked to source selection and configuration | Views cannot become a second authoritative fact home (T1, T3). |

Candidate round-trip acceptance is semantic reconstruction of all supported
fields, including distinction between missing/defaulted/explicit values and
ordered occurrences. Byte-for-byte YAML restoration additionally needs retained
source bytes: comments, anchors, formatting and lexical forms are not an RDF
promise. Unknown extension fields must be retained opaquely with version and
loss status, or the export declared incomplete. No lossless claim is made here.

Turtle (S2) can carry a selected graph; a dataset needs a manifest plus graph
files or a suitable dataset serialization. JSON-LD (S3) needs versioned term
expansion, IRI/datatype/language coercion and list/null rules. Neither syntax
alone supplies the Transitrix mapping. Changing existing storage is potentially
breaking; an optional export is additive. Dependencies: SE-02, SE-06.

### SE-04 — validation, inference and rules

The shapes below illustrate a closed validation boundary over one supplied graph.
They do not implement T3's admission judgment or T6's existing diagnostics.
Required fields, types, enumerations, endpoint presence, date order and local
language-label uniqueness can become graph constraints. Cross-catalogue alias
normalization, population completeness and source authorization additionally
need a declared dataset and adapter behavior. Human consistency/completeness
gates cannot be inferred from a shape passing.

Inference is a separate step over a separate graph. A future OWL 2 RL candidate
must pass the Profiles §4.2 syntax restrictions and declare the §4.3 rule regime;
running some RL/RDF rules is not proof of profile conformance. A rule deriving
class membership cannot manufacture admission. Avoid automatic equivalence,
functional properties and cardinalities that unintentionally merge identities.
Positive candidate: named classes, subclass axioms and named-individual types.
Negative RL candidate: an existential restriction in a superclass position
requiring a newly existing filler; do not accept arbitrary OWL 2 DL as RL.

**Compatibility:** optional validation adds evidence. Making shapes a new core
gate, altering defaults, or rewriting diagnostic codes is potentially breaking;
retain T6's original tool/version/form/code beside a separately versioned shape
result. Dependencies: SE-02/03 and approved constraint coverage.

### SE-05 — query answers are scoped evidence

The competency questions below use an explicit named graph, a fixed date and
no entailment. This makes absence meaningful only within that supplied complete
selection. Missing graphs, denied inputs and incomplete populations produce
**unknown**, not a zero-count success. T5 already separates requirement
populations, release scope and execution evidence; reuse that contract rather
than treating any assertion as proof of every release's compliance.

**Compatibility:** read-only query proposals are additive. A union default graph,
changed end-date comparison, or different entailment regime changes answers and
must version the query contract. Consumers: reports, search and semantic APIs.
Dependencies: SE-03/04/06.

### SE-06 — fact provenance is not approval or generation evidence

Use a generic **fact record** or assertion occurrence in an optional export,
not a new meaning for Transitrix's requirement-specific `ASSERTION` (T4).
Candidate fields are source resource and locator, source version/digest,
responsible agent/author, assertion/capture timestamp and record version.
Unknown historical evidence stays explicitly unknown; a migration must not
invent timestamps or label author-supplied data as observed.

| Fact basis | Candidate evidence | Interpretation boundary |
| --- | --- | --- |
| Declared | Author, declaration time, versioned source/locator | Records who said it; does not prove it. |
| Observed/imported | Observer/import activity, observed snapshot, source version, capture time | Importing a declaration proves its presence, not the underlying enterprise fact. |
| Inferred | Input fact IDs/versions, rule/ontology version, inference activity and time | Keep derived graph separate; reproducibility depends on input closure and regime. |
| AI-proposed | Proposal activity, tool/model identity, input references and time | Proposal basis remains after later admission; admission state and reviewer authority stay separate. |

PROV-O (S12) offers Entity/Activity/Agent and attribution, derivation, generation
and qualified links. A local fact-basis vocabulary is still needed; provenance
properties alone do not enforce trust. Dublin Core (S13) can describe document
creator, dates, identifiers and source/version links. Describe the fact record,
source document and output artifact separately; their timestamps are not
interchangeable. Missing evidence is not a negative observation.

Reuse T7 unchanged for generated documents: `model_id` denotes the model used
for generated prose. Repository/snapshot identity belongs in its separate
claims/observations interface. A supplied commit, timestamp or matching checksum
does not prove generation; `run.generation` remains unverifiable. Authorization
precedes loading, and a hidden subset must not leak through counts or findings.
An approved assertion does not certify the artifact's generation chain.

**Compatibility:** additive records are possible without rewriting canon.
Mandatory retrospective provenance and repurposed `model_id` would be breaking.
Consumers include evidence viewers, document adapters and audit exports.
Dependencies: SE-02/03; T7 remains the document evidence boundary.

### SE-07 — terminology and definition quality

T1 already prevents a glossary from duplicating enterprise objects. Preserve
that behavior while evaluating a concept-oriented optional record. S8–S11
justify the relevance of terminology/thesaurus work by scope only; the following
is a Transitrix proposal, not a claim to implement an unavailable ISO clause.

| Editorial concern | Current support | Candidate addition / example |
| --- | --- | --- |
| Concept and context | TERM sense or enterprise object's own description | Identify subject field and discriminating characteristics without a duplicate TERM. |
| Definition | `description` | Review for scope and circularity: “A retained copy from which specified data can be restored” is a useful candidate definition of backup; “a backup is backed-up data” is circular. |
| Preferred designation | `name` | Explicit language and preferred designation per language; do not infer language solely from script. |
| Other designations | `aliases[]` | Distinguish alternative, hidden, deprecated and abbreviated forms; preserve the current normalized collision gate. |
| Concept relations | Typed enterprise RELs exist | Propose broader/narrower/associative concept relations separately; organizational parentage is not concept subsumption. |
| Examples/non-examples | Free prose | Example: a retained restorable snapshot. Non-example: an unretained live replica by itself. Attach rationale and source, not just labels. |
| Cross-vocabulary mapping | Catalogue bindings | Specify mapping strength, scheme/version and reviewer; label match does not imply exact equivalence. |

SKOS's language-specific preferred-label condition is not T1's catalogue-wide
name/alias collision policy (S4 §5). Keep both distinct. A proposed multilingual
profile must decide how legacy untagged strings migrate; assigning every legacy
name English without evidence is not acceptable. ISO 25964 Parts 1 and 2 are
conditional candidates when a retrieval thesaurus/mapping service is needed,
not prerequisites for every glossary report.

**Compatibility:** optional editorial metadata is additive. Relaxing collision
rules, mandating language tags, adding new canonical relation kinds or replacing
TERM's semantics requires a versioned migration for glossary and ingest
consumers. Depends on SE-01/02; ISO clause correspondence remains unevaluated
until authorized normative evidence is available.

### SE-08 — publish dataset metadata only where applicable

A released catalogue export could be a DCAT Dataset with separate Distributions
for exchange formats, inside a Catalog (S14 §6). Describe an actual DataService
only if one exists; a repository URL alone does not establish one. Keep dataset
version, source methodology/profile version and resource identity distinct.
An individual enterprise object is not a Dataset because it has a catalogue ID.

**Compatibility:** optional metadata is additive; no current core adoption or
migration is proposed. Consumers: dataset discovery and exchange clients.
Dependencies: a real publication use case and SE-02/03/06.

## Non-normative SHACL examples

All `ex:` terms below are illustrative, using `https://example.org/review/`;
they are not a published Transitrix vocabulary. Validate the following Turtle
as one data graph, with the shapes in a separate graph, inference disabled.
The shapes intentionally cover only the listed properties. Passing them is
not complete Transitrix validation, SKOS conformance or approval.

Positive data D1:

```turtle
@prefix ex: <https://example.org/review/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
ex:app a ex:Element ; ex:admission "active" .
ex:cap a ex:Element ; ex:admission "active" .
ex:r1 a ex:Relation ; ex:from ex:app ; ex:to ex:cap ;
  ex:kind ex:supports ; ex:admission "active" ;
  ex:validFrom "2026-01-01"^^xsd:date ;
  ex:validTo "2026-12-31"^^xsd:date .
ex:backup a skos:Concept ; skos:prefLabel "backup"@en .
```

Shapes H1 (relation structure/date order) and H2 (preferred-label proposal):

```turtle
@prefix ex: <https://example.org/review/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
ex:RelationShape a sh:NodeShape ; sh:targetClass ex:Relation ;
  sh:property [ sh:path ex:from ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:nodeKind sh:IRI ; sh:class ex:Element ] ;
  sh:property [ sh:path ex:to ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:nodeKind sh:IRI ; sh:class ex:Element ] ;
  sh:property [ sh:path ex:kind ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:in ( ex:supports ) ] ;
  sh:property [ sh:path ex:admission ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:in ( "active" "proposed" "rejected" ) ] ;
  sh:property [ sh:path ex:validFrom ; sh:minCount 1 ; sh:maxCount 1 ;
    sh:datatype xsd:date ; sh:lessThanOrEquals ex:validTo ] ;
  sh:property [ sh:path ex:validTo ; sh:maxCount 1 ; sh:datatype xsd:date ] .
ex:ConceptShape a sh:NodeShape ; sh:targetClass skos:Concept ;
  sh:property [ sh:path skos:prefLabel ; sh:minCount 1 ;
    sh:datatype <http://www.w3.org/1999/02/22-rdf-syntax-ns#langString> ;
    sh:uniqueLang true ; sh:disjoint skos:altLabel ] .
```

The illustrative closed enum contains only `ex:supports`; it is not a copy of
the Transitrix relation registry. Requiring a language-tagged label is a proposed
profile restriction, stronger than merely checking SKOS's per-language maximum.
For these examples only, absent `validTo` means an open end. A production mapping
must distinguish source null, missing and unknown per SE-03 before validation.

Each negative case starts afresh from D1; mutations are independent.

| Case | Mutation | Expected result |
| --- | --- | --- |
| H-P | D1 unchanged | Conforms to H1 and H2 only. |
| H-N1 | Remove `ex:r1 ex:from ex:app` | H1 violation: minimum source count. |
| H-N2 | Replace `ex:cap` in `ex:to` with a literal `"cap"` | H1 violation: IRI/class constraint. |
| H-N3 | Change validTo to `"2025-12-31"^^xsd:date` | H1 violation: start exceeds end. |
| H-N4 | Add `ex:backup skos:prefLabel "reserve copy"@en` | H2 violation: two preferred labels in one language. |
| H-N5 | Add `ex:backup skos:altLabel "backup"@en` | H2 violation: same preferred and alternative label. |
| H-P2 | Change relation admission to `"proposed"` | H1 still passes structure; admitted-only query below excludes it. |
| H-P3 | Add `ex:backup skos:prefLabel "sauvegarde"@fr` | H2 passes; different language. |

These cases demonstrate S6 cardinality/type/pair constraints; they do not check
all endpoint kinds, date windows, alias collisions or admission obligations.

## Non-normative SPARQL competency questions

Dataset QD contains exactly D1 in named graph `ex:admitted`, the following
metadata in named graph `ex:evidence`, and an empty default graph. The graph
name describes this fixture, not a proof that all its contents are admitted.
The query adapter must establish dataset completeness before answering.
For Q1, the fixture's endpoints are assumed valid for the queried date; a real
adapter must also select endpoint lifecycle and history values (SE-03).

Evidence graph E1:

```turtle
@prefix ex: <https://example.org/review/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
ex:r1 ex:basis ex:Declared ; prov:wasDerivedFrom ex:sourceV1 ;
  prov:wasAttributedTo ex:author ;
  prov:generatedAtTime "2026-01-02T10:00:00Z"^^xsd:dateTime ;
  ex:recordVersion "1" .
ex:sourceV1 ex:sourceVersion "1" .
```

### Q1 — Which admitted relation records connect app to capability at a date?

For the fixture, end dates are inclusive; changing this is a query-contract
decision. RDF and SPARQL do not decide that business convention.

```sparql
PREFIX ex: <https://example.org/review/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?r WHERE {
  GRAPH ex:admitted {
    ?r a ex:Relation ; ex:from ex:app ; ex:to ex:cap ;
       ex:kind ex:supports ; ex:admission "active" ; ex:validFrom ?start .
    ex:app ex:admission "active" . ex:cap ex:admission "active" .
    OPTIONAL { ?r ex:validTo ?end }
    FILTER (?start <= "2026-06-01"^^xsd:date &&
      (!BOUND(?end) || ?end >= "2026-06-01"^^xsd:date))
  }
} ORDER BY ?r
```

Expected: exactly `ex:r1`. Negative: set its admission to proposed, or its end
to 2026-05-31, and expect no rows. Boundary: an end of 2026-06-01 still returns
r1. Put an otherwise matching r2 only in `ex:proposed`: it never appears.
A missing/denied `ex:admitted` graph must be reported unknown by the adapter,
even though the raw SPARQL engine would return no rows.

### Q2 — Which relation records lack a complete recorded provenance tuple?

This tests evidence presence, not its authenticity or approval.

```sparql
PREFIX ex: <https://example.org/review/>
PREFIX prov: <http://www.w3.org/ns/prov#>
SELECT ?r WHERE {
  GRAPH ex:admitted { ?r a ex:Relation }
  FILTER NOT EXISTS {
    GRAPH ex:evidence {
      ?r ex:basis ?basis ; prov:wasDerivedFrom ?source ;
         prov:wasAttributedTo ?agent ; prov:generatedAtTime ?time ;
         ex:recordVersion ?version .
      ?source ex:sourceVersion ?sourceVersion .
    }
  }
} ORDER BY ?r
```

Expected on QD: no rows. Negative: remove sourceVersion or attributed agent
from E1 and expect exactly r1. An invented complete tuple also produces no rows;
it remains an unverified declaration. Denied evidence is unknown, not a missing
fact report. Inferred/AI-proposed cases additionally need their activity and
input/rule/model records from SE-06; Q2 alone does not cover those requirements.

### Q3 — Are preferred labels ambiguous within a language?

```sparql
PREFIX ex: <https://example.org/review/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?concept WHERE {
  GRAPH ex:admitted {
    ?concept skos:prefLabel ?a, ?b .
    FILTER (LANG(?a) = LANG(?b) && ?a != ?b)
  }
} ORDER BY ?concept
```

Expected on QD: no rows. H-N4 returns exactly `ex:backup`; H-P3 returns no rows.
This is not the existing cross-element alias gate, a semantic definition check,
or a complete SKOS integrity suite. No same-label-to-same-identity inference is
permitted. These questions use S7 graph matching/negation and explicit datasets;
no result is claimed for an unspecified union graph or entailment regime.

## Candidate requirements and decision topics

The following MUST/SHOULD/MAY language is scoped to a **future optional semantic
exchange profile**, never to current adopters. Each item is a recommendation
for later synthesis and approval.

| Candidate | Recommendation, rationale and exception | Compatibility |
| --- | --- | --- |
| C1 (SE-01/02) | MUST preserve source IDs/scopes and distinguish concepts/classes/individuals. No identity merge based solely on labels. Exception: an explicitly reviewed identity mapping with retained provenance. | Additive export; changed identity mapping needs migration. |
| C2 (SE-03) | MUST declare supported fields, context, time policy and loss status; MUST retain REL identity and source defaults. A deliberately lossy view MAY omit fields only when labeled a projection, never a round trip. | Additive; replacing canonical storage is breaking. |
| C3 (SE-04/05) | MUST separate shape validation, inference and admission; MUST report incomplete/denied query scope as unknown. SHOULD retain versioned diagnostic provenance. Exception: none to presenting unknown as success. | Optional results additive; new mandatory gates require versioned migration. |
| C4 (SE-06) | MUST distinguish declaration, observation, inference and proposal, with source/agent/time/version or explicit unknowns. MUST NOT infer generation from hashes. Legacy records MAY remain unknown rather than fabricated. | Additive evidence; retrospective mandatory fields breaking. |
| C5 (SE-07) | SHOULD document concept context, definition, preferred designation, relations, examples and non-examples. MAY keep these in editorial review until a package schema is approved. Do not duplicate enterprise definitions as TERM. | Additive editorial practice; terminology schema changes need consumer review. |
| C6 (SE-08) | MAY describe actual published datasets with DCAT and documents with Dublin Core. SHOULD omit unsupported service/conformance claims. No metadata requirement for non-publishing adopters. | Additive opt-in. |

| ADR topic | Options and recommendation | Recommended decision owner |
| --- | --- | --- |
| A1: resource identity | Shared ID namespace; catalogue-scoped persistent IRIs; per-snapshot-only identities. Recommend persistent scoped resource IRIs plus separate snapshots (SE-02). | Methodology governance, with catalogue consumer maintainers. |
| A2: representation and time | Bare edges; identified relation records; both with derived shortcuts. Recommend records plus scoped shortcuts and an explicit end-date/null policy (SE-03). | Metamodel maintainers, with report/export implementers. |
| A3: entailment and validation | No inference; bounded OWL 2 RL; unrestricted OWL 2. Recommend no inference by default, separately tested RL as opt-in; shapes never grant admission (SE-04). | Semantic-tool and validator maintainers. |
| A4: terminology | Expand core TERM; optional terminology package/projection; editorial guidance only. Recommend guidance first, optional profile after source/consumer review (SE-07). | Methodology governance with terminology reviewers. |
| A5: provenance | Artifact-only evidence; per-fact occurrences; graph-level provenance only. Recommend fact occurrences where sources differ, graph provenance for homogeneous captures, T7 separately for documents (SE-06). | Evidence/document consumer maintainers with methodology governance. |

These are proposed ADR topics, not adopted decisions. Their answers are needed
before implementation, not to complete this evidence review.

## Backlog proposals and acceptance boundaries

| Proposal | Acceptance evidence | Dependency | Compatibility / priority |
| --- | --- | --- | --- |
| B1: identity mapping contract | Two catalogues with identical local IDs remain distinct; contained-object promotion retains identity; relocation and central binding have explicit mappings. | A1; SE-02 | Optional additive exporter; identity changes require migration / P1. |
| B2: representation contract and round trip | Preserve parallel RELs, lifecycle, null/missing/default distinctions, history gaps, list order, admission and unknown extensions; publish supported/lossy cases for both Turtle graph bundles and JSON-LD context. | B1, A2; SE-03 | Additive exchange; no core migration assumed / P1. |
| B3: validation and query profile | H/Q cases pass expected outcomes; add endpoint-time, complete/partial/denied population and inference-isolation cases; bind shape/query/tool versions and preserve original diagnostics. An RL option needs syntax and entailment tests, including a rejected non-RL axiom. | B2, A3, T5–T6 | Additive optional checks; mandatory gate is breaking / P1. |
| B4: fact provenance crosswalk | Demonstrate all four fact bases, missing evidence and authorized/denied bundles; preserve admission separately; replay input/rule versions for inference; demonstrate that matching digests still do not prove document generation. | B1–B2, A5, T7 | Additive, no `model_id` change / P1. |
| B5: terminology evidence/profile | Obtain authorized normative access or retain named unknowns; review concept/definition/designation correspondence against exact ISO clauses; test multilingual labels, circular definitions, examples/non-examples, existing duplicate-TERM rejection and non-equivalent mappings. | A4, B1; S8–S11 | Optional profile additive; schema/gate changes need migration / P2. |
| B6: dataset publication metadata | Identify a consumer; describe one real Dataset and its Distributions, version and source; do not invent a service or certification assertion. | B2, B4; SE-08 | Optional metadata / P3. |

No backlog item is commissioned or implemented by this review. ISO 704:2022,
ISO 1087:2019 and both assigned ISO 25964 parts retain a named normative-access
limitation. OWL/RL profile approval, IRI ownership, temporal boundary semantics,
provenance capture and optional terminology/DCAT adoption remain explicit design
decisions. None is silently resolved by a source merge or by a passing example.
