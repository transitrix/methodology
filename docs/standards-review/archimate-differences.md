# ArchiMate differences register

This **non-normative review** records observed Transitrix choices and proposed
follow-ups for model authors and semantic-tool implementers. ArchiMate is the
starting foundation; fidelity is one design consideration alongside useful
modeling, precise meaning, clear authoring and verifiable behavior.

## Comparison basis and status

All Transitrix citations refer to
[`8ca4eabf7666946ffb7a76eb579c31cb0ae3f327`](https://github.com/transitrix/methodology/tree/8ca4eabf7666946ffb7a76eb579c31cb0ae3f327),
observed on 2026-10-10 and rechecked against main on 2026-10-11 without a delta.
The comparison edition is **ArchiMate 3.2**, as named in the baseline README and
glossary. This does not select a newer edition or an exchange format.

The primary conceptual source is The Open Group's **N221, ArchiMate 3.2
Specification Reference Cards (2022)**, [accessible copy hosted by a third
party](https://barbierdarnal.com/Enterprise_Architect/Clinique/ArchiMate_3.2_Specification_notation.pdf).
Card-page references below count the cover as PDF page 1. The cards establish
concept names and short definitions, not the full normative relationship matrix.
The [full 3.2 specification](https://pubs.opengroup.org/architecture/archimate32-doc/)
required sign-in when accessed on **2026-10-11**. Its detailed admissibility,
derivation and conformance requirements are **unevaluated** here. No clause
numbers are inferred from the cards. The
[publisher's access information](https://www.opengroup.org/archimate-licensed-downloads)
and the existing
[Transitrix cheat sheet](https://transitrix.com/library/archimate-cheat-sheet/?utm_source=methodology-standards-review)
remain useful entry points; the cheat sheet is not normative evidence.

“Existing” means observed in the baseline specification, including draft specs;
it does **not** mean implemented in every validator or accepted through a verified
ADR. “Proposed” means a recommendation made here. “Accepted” would require a
decision citation; “deprecated” applies only to the explicitly identified aliases.
There are no newly accepted semantics in this register. Absent public decision
evidence is recorded as **unknown**, rather than reconstructed from old work items.

T → A means Transitrix to ArchiMate; A → T means the reverse. Mapping suggestions
are conceptual, not implemented transforms. No entry establishes lossless
exchange, formal conformance or certification. Read the
[architecture evidence review](architecture-evidence.md) for standards scope,
the nine architecture concepts and compatibility-separated recommendations.

## Existing differences

### AM-001 — Layer placement is a Transitrix organization scheme

- **Reference:** ArchiMate 3.2 N221 pp. 4–5, Meaning, Capability and Course of Action.
  **Evidence:** [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §§6, 7.19, 7.30;
  [glossary](../../method/00-glossary.md), “Layers (ArchiMate)”; [capability map](../../notations/views/diagrams/05-capability-map.md) §§2, 4, 6.
- **Status/class:** existing placement/representation change. CAPABILITY and TERM
  reside in the business layer; SCENARIO resides in implementation. The reference
  cards place Capability/Course of Action under strategy and Meaning under motivation.
- **Benefit/tradeoff:** business authors find capabilities and vocabulary together;
  consumers cannot use a folder number as an ArchiMate layer classifier. Capability
  V/H addresses additionally encode a Transitrix hierarchy, not a standard type.
- **Mapping/loss:** T → A needs an explicit TYPE-to-concept table, independently of
  folder and ID. A → T must select a local location/address; folder round trips are
  not preserved by the standard concept alone. Preserve the original identity.
- **Compatibility/decision:** documenting placement is additive; moving folders or
  renumbering capabilities can break catalogue consumers and links. Governing ADR
  for the combined layer correspondence: **unknown**. Proposed disposition: keep
  storage organization unless a concrete consumer case warrants migration.

### AM-002 — Identity and stakeholder interest are separate records

- **Reference:** ArchiMate 3.2 N221 pp. 3, 6, Stakeholder, Business Actor and Business Role.
  **Evidence:** [Actors](../../notations/elements/19-actors.md) §§1–3;
  [Stakeholders](../../notations/elements/20-stakeholders.md) §§1–3, 5–6.
- **Status/class:** existing extension/restriction of the representation. Every
  STAKEHOLDER requires an ACTOR identity; ACTOR distinguishes `person`,
  `business_unit` and `system`. Stake-specific concern/interest/influence are kept
  separately, and `stakeholding` has a restricted target set.
- **Benefit/tradeoff:** one external service owner can carry several stakes without
  duplicating identity. Import requires more information than a stakeholder label;
  a software `system` actor must not be classified as Business Actor solely by ID.
- **Mapping/loss:** T → A projects a stake to Stakeholder and evaluates identity
  separately; flattening loses the actor/stake linkage and engagement history.
  A → T needs an explicit actor binding and target classification. No general
  lossless mapping of arbitrary stakeholders is demonstrated.
- **Compatibility/decision:** relaxing `actor` or merging TYPEs changes admission
  and downstream joins. The specifications record an identity/stake decision dated
  **2026-05-29**; a separately inspectable accepted ADR is **unknown**. Proposed
  disposition: retain the split; report absent identity instead of inventing one.
  See ARC-004/005 in the [architecture review](architecture-evidence.md).

### AM-003 — TERM is a constrained vocabulary entry

- **Reference:** ArchiMate 3.2 N221 p. 4, Meaning.
  **Evidence:** [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §7.30 and §9
  (`TERM-001/002`, `ELEM-ALIAS-001`); [glossary report](../../notations/views/reports/32-glossary.md) §§1, 6.
- **Status/class:** existing restriction and domain-friendly naming. TERM is a
  standalone name/definition entry with aliases and provenance, prohibited from
  duplicating an already modeled object's vocabulary. Meaning is a broader
  contextual interpretation concept, so the glossary's correspondence is not identity.
- **Benefit/tradeoff:** the glossary can combine definitions from actual objects
  and terms without duplicate masters. Contextual homonyms cannot be imported by
  ignoring the catalogue collision rules.
- **Mapping/loss:** T → A can offer a Meaning candidate, with context and provenance
  made explicit; A → T is partial because not every contextual interpretation is
  a distinct admissible TERM. Standard concept alone loses local uniqueness and
  derived-source constraints.
- **Compatibility/decision:** additive mapping documentation; weakening uniqueness
  or recasting all object names as TERM breaks vocabulary admission and recognition.
  Accepted ADR: **unknown**. Proposed disposition: preserve the existing rule and
  investigate contextual naming only through the bounded ISO 11179 profile (ARC-016).

### AM-004 — ACTION supplies a multi-scale planning vocabulary

- **Reference:** ArchiMate 3.2 N221 p. 12, Work Package and Deliverable.
  **Evidence:** [Action](../../notations/elements/24-action.md) §§1–2;
  [glossary](../../method/00-glossary.md), “ArchiMate 3.2 alignment”.
- **Status/class:** existing extension/profile of the intended Work Package
  correspondence: Initiative, Programme, Project and Task scales, optional `type`
  and `parent`, and a virtual portfolio root. `ACTIVITY` is a **deprecated alias**
  in the baseline; this review does not change its acceptance window.
- **Benefit/tradeoff:** portfolio and project models share one primitive. A broad
  initiative or unclassified action does not automatically supply the bounded work
  evidence a Work Package interpretation needs.
  [Primitives §6.1](../../notations/ELEMENT_PRIMITIVES.md) also absorbs Deliverable
  into ACTION rather than registering it as an independent TYPE. Work and its result
  therefore need separate interpretation even when carried by one local record.
- **Mapping/loss:** T → A is conditional on the action's actual scope and definition;
  preserve scale separately and omit the virtual root as a data primitive. A → T
  can retain a work package as an action but must not infer Project scale. Scale,
  hierarchy conventions and alias diagnostics otherwise disappear. An ArchiMate
  Deliverable cannot be equated to execution work solely because both map toward ACTION.
- **Compatibility/decision:** keep aliases/history versioned under
  [CONTRACT §18.7](../../notations/CONTRACT.md#187-versioned-diagnostic-identity).
  Renaming records or forcing a scale is breaking. Accepted ADR for this mapping:
  **unknown**. Proposed disposition: document conditional mapping, not automatic renaming.

### AM-005 — TARGET_STATE has a narrowed snapshot structure

- **Reference:** ArchiMate 3.2 N221 p. 12, Plateau.
  **Evidence:** [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §7.18;
  [relations](../../notations/elements/17-relations.md) §3, `target_state_satisfies_goal`.
- **Status/class:** existing restriction/extension. The snapshot has capability,
  process and application lists, `base`/`target` classification, one live baseline
  convention and separate goal-satisfaction RELs. An omitted `type` means target.
- **Benefit/tradeoff:** authors compare concrete solution compositions and trace
  standing goals. The listed composition is narrower than an arbitrary architecture
  state; technology detail or intermediate-stage distinctions need other evidence.
- **Mapping/loss:** T → A is a candidate Plateau plus preserved composition and
  satisfaction metadata. A → T cannot assume the imported state fits those lists
  or uniquely identifies the live baseline. Dropping classification or satisfaction
  loses operational-versus-future meaning.
- **Compatibility/decision:** changing the default, uniqueness or lists affects
  scenario readers and impact queries; requires explicit migration. Accepted ADR:
  **unknown**. Proposed disposition: retain the useful restriction and state losses.

### AM-006 — CHANGE does not require a pair of plateaus

- **Reference:** ArchiMate 3.2 N221 p. 12, Gap (a difference between plateaus).
  **Evidence:** [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §§7.3–7.3.1.
- **Status/class:** existing changed semantics relative to the stated Gap mapping.
  CHANGE describes a required delta, may decompose into changes, and may address
  requirements/constraints. Its published fields do not require two TARGET_STATE
  endpoints.
- **Benefit/tradeoff:** an obligation can be tightened before both architecture
  states are modeled. This supports early change analysis but cannot establish the
  two-state interpretation just from a CHANGE ID.
- **Mapping/loss:** T → A requires separately supported baseline/target evidence
  before asserting a Gap correspondence; otherwise mark unmapped. A → T may record
  the delta, but losing the plateau pair prevents reverse reconstruction. No pair
  is inferred from `addresses` or `derived_from`.
- **Compatibility/decision:** a mapping report is additive; making two state
  references mandatory would break existing changes and intake. Accepted ADR:
  **unknown**. Proposed disposition: retain early modeling, qualify the equivalence.

### AM-007 — SCENARIO is a particular path, not any strategy

- **Reference:** ArchiMate 3.2 N221 p. 5, Course of Action.
  **Evidence:** [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §7.19;
  [Scenarios report](../../notations/views/reports/11-scenarios.md).
- **Status/class:** existing restriction/extension. A scenario has non-empty
  `pursues`, exactly one `arrives_at` target state, and ordered ACTION/CHANGE steps.
- **Benefit/tradeoff:** two alternative paths can reach the same state and be
  compared. A broad approach without that destination/step structure is not yet a
  Transitrix scenario, even when it is strategically meaningful.
- **Mapping/loss:** T → A offers a Course of Action interpretation with steps and
  destination preserved separately. A → T needs explicit destination and intent;
  no default is safe. Collapsing the path to one label loses ordering and alternatives.
- **Compatibility/decision:** broadening cardinality changes report and planning
  consumers; no such change is proposed here. Accepted ADR: **unknown**. Proposed
  disposition: explain the narrower path concept rather than remove its precision.

### AM-008 — REL is an admitted, independently time-bounded fact

- **Reference:** ArchiMate 3.2 N221 p. 2, relationships and connectors; compare
  Assignment, Realization, Association and Serving as candidate interpretations.
  Full 3.2 temporal customization/relationship rules remain unevaluated.
  **Evidence:** [Relations](../../notations/elements/17-relations.md) §§1–3, 5;
  [shared lifecycle](../../notations/CONTRACT.md) §7.
- **Status/class:** existing explicit temporal/admission extension and restricted
  local relation vocabulary. `employment`, `stakeholding`, `hosts` and other kinds
  carry their own windows; not all links are RELs, because some stable references
  are inline. There is no blanket name-to-name relation equivalence.
- **Benefit/tradeoff:** service relocation or a person's changing engagement can be
  reconstructed without replacing endpoint identity. Consumers must resolve a date
  and understand inline versus first-class links.
- **Mapping/loss:** T → A selects the applicable slice and maps each kind separately;
  export of only ordinary edges loses admission and temporal history. A → T needs
  provenance/window information or an explicitly incomplete staging representation.
  A generic Association can convey a link but not all of its local meaning.
- **Compatibility/decision:** deleting windows or changing kind endpoints breaks
  temporal queries and validators. Accepted ADR covering a general ArchiMate mapping:
  **unknown**. Proposed disposition: preserve the extension; require explicit loss
  reporting rather than claim that ArchiMate forbids temporal metadata.

### AM-009 — Consumption and need-trace relations cannot share a name mapping

- **Reference:** ArchiMate 3.2 N221 p. 2, Serving and Realization.
  **Evidence:** [Relations](../../notations/elements/17-relations.md) §3 (`uses`,
  `serves`, `realizes`); [requirement](../../notations/elements/15-requirement.md) §2.7.
- **Status/class:** existing direction/profile difference and a draft extended
  meaning. `uses` is APPLICATION → TECHNOLOGY_SERVICE. Requirement-chain `serves`
  is REQUIREMENT → NEED, not functionality supplied to a consumer. `realizes` is
  limited locally to BUSINESS_SERVICE → CAPABILITY.
- **Benefit/tradeoff:** local verbs answer distinct domain questions plainly;
  identical-looking standard names encourage invalid automatic translations.
- **Mapping/loss:** T → A consumption, if represented by Serving, reverses the
  consumer-to-service edge to provider-to-consumer; detailed endpoint admissibility
  must still be checked against the full specification. Requirement `serves` has
  **no established direct equivalent** here. A → T requires endpoint and intent
  classification, not a string substitution. Draft REL `serves` support remains
  pending as stated in the source; the inline field is a separate form.
- **Compatibility/decision:** changing stored direction or reusing one diagnostic
  meaning for another breaks joins and history. Accepted mapping ADR: **unknown**.
  Proposed disposition: use endpoint-aware mapping; never infer implementation from
  the vocabulary table. See REC-03 and the requirement-chain case.

### AM-010 — Obligation and evidence primitives extend motivation modeling

- **Reference:** ArchiMate 3.2 N221 p. 4, Requirement and Constraint.
  **Evidence:** [Requirement](../../notations/elements/15-requirement.md) §§1–2;
  [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §7.13;
  [relations](../../notations/elements/17-relations.md) §§3.1–3.2;
  [requirement chain](../../notations/views/reports/requirement-chain.md) §§1–2.
- **Status/class:** existing semantic classification/extension. Transitrix uses
  positive obligation versus restriction/prohibition, origin taxonomy, evidence,
  agreement and release scope. Draft chain additions are identified by their source,
  not promoted to implemented semantics by this review.
- **Benefit/tradeoff:** “must do” and “must not cross” support regulatory modeling;
  `required_for` records applicability without implying an implementation schedule.
  Merely converting every REQUIREMENT to the same-named standard concept loses
  the source, agreement, verification and release dimensions.
- **Mapping/loss:** T → A offers obligation concepts with an explicit extension
  payload, or reports the discarded dimensions. A → T needs local classification
  and admission evidence. ASSERTION, VERIFICATION and VALIDATION have **no established
  one-to-one equivalent** in this comparison; they cannot be folded into Requirement
  without loss. `depends_on` is neither decomposition nor work ordering.
- **Compatibility/decision:** collapsing types affects coverage and applicability
  queries; required new fields need migrations. Accepted general mapping ADR:
  **unknown**. Proposed disposition: preserve distinctions and report missing traces.

### AM-011 — The canonical TYPE registry is not the whole ArchiMate inventory

- **Reference:** ArchiMate 3.2 N221 pp. 3–5, 8, Outcome, Value, Resource, Value Stream
  and Application Function.
  **Evidence:** [ID registry](../../notations/IDS_AND_REFERENCES.md) §3.1;
  [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §4;
  [machine vocabulary](../../notations/vocabulary.yaml), `element_types`.
- **Status/class:** existing unsupported **first-class canonical TYPEs** in the
  inspected registry. The named concepts above have no dedicated entries there.
  This is not a claim that prose, PlantUML, a package or every external tool cannot
  express them, and it is not an exhaustive inventory of all unmapped concepts.
- **Benefit/tradeoff:** a smaller enterprise catalogue reduces authoring choices;
  importing a model that depends on those distinctions needs a loss report or an
  explicitly designed extension.
- **Mapping/loss:** A → T has no registered one-to-one target for those concepts.
  T → A cannot recover omitted distinctions from a generic description. Mapping
  all of them to APPLICATION, GOAL or TERM would be a semantic collapse.
  Application Interface is a different case: it has an explicit INTEGRATION profile
  despite lacking a separate TYPE (AM-014).
- **Compatibility/decision:** an additive TYPE still requires tool capability
  reporting and unknown-type handling; retyping existing records is potentially
  breaking. Accepted omission-by-omission ADR: **unknown**. Proposed disposition:
  add a concept only for a demonstrated modeling case, not an inventory score.

### AM-012 — Introductory and canonical relation shapes need qualification

- **Reference:** ArchiMate 3.2 N221 p. 2, Access; comparison of representation forms,
  not a claim that YAML syntax is specified by ArchiMate.
  **Evidence:** [Modelling](../../method/03-modelling.md) §1.2 has `source`, `target`,
  `type: Access`; [Relations](../../notations/elements/17-relations.md) §§2–3 has
  `from`, `to`, a closed local enum and admission/lifecycle fields;
  [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §5 documents legacy envelope reconciliation.
- **Status/class:** existing documentation/interface ambiguity. The introductory
  example is not sufficient evidence that `Access` is an admitted canonical REL kind.
- **Benefit/tradeoff:** the introductory shape makes a familiar edge easy to read,
  but readers may mistake it for a canonical authoring contract.
- **Mapping/loss:** no general T → A or A → T adapter between these file forms is
  established. Renaming endpoints alone loses required metadata and does not resolve
  type meaning. Full ArchiMate Access admissibility remains unevaluated.
- **Compatibility/decision:** propose a **documentation-only** qualification first;
  changing parser acceptance needs separate compatibility evidence. Accepted ADR
  resolving this specific discrepancy: **unknown**. See B-01 in the architecture review.

### AM-013 — “Concern” needs an edition-specific explanation

- **Reference:** ArchiMate 3.2 N221 pp. 3–4, motivation inventory and Stakeholder;
  compare ISO/IEC/IEEE 42010:2022 §3.10 in [S10](architecture-evidence.md#sources-and-access).
  Full ArchiMate viewpoint provisions remain unevaluated.
  **Evidence:** [Stakeholders](../../notations/elements/20-stakeholders.md) §6 says
  ArchiMate models concern as its own element, while §2 defines local free text;
  [glossary](../../method/00-glossary.md), “ArchiMate 3.2 alignment”, broadly says
  aligned names need no divergence entry.
- **Status/class:** existing explanatory overstatement. N221's motivation inventory
  does not establish a first-class Concern element. It is therefore not evidence
  that deferring a local CONCERN TYPE departs from such an ArchiMate element. Nor do
  aligned names erase AM-001–010's structural differences.
- **Benefit/tradeoff:** concern text helps authors express interests cheaply; a
  claimed standard equivalence obscures the separate question of stable concern
  identity and cross-view coverage.
- **Mapping/loss:** T → A can preserve text as stakeholder context; A → T has no
  demonstrated standalone Concern target. For the 42010 mapping, see ARC-005.
  Omitting the text loses context, while assigning it a new TYPE invents a contract.
- **Compatibility/decision:** propose a wording correction and explicit separation
  of the two standards, without adding a primitive. Accepted ADR for this correction:
  **unknown**. B-01 should resolve the claims; REC-02 separately evaluates a richer
  concern profile.

### AM-014 — Application Interface is represented through INTEGRATION

- **Reference:** ArchiMate 3.2 N221 p. 8, Application Interface; the local spec
  cites §8.2.5, whose full normative text was not independently accessible here.
  **Evidence:** [Primitives](../../notations/ELEMENT_PRIMITIVES.md) §§7.8–7.8.1;
  [integration map](../../notations/views/diagrams/12-integration-map.md).
- **Status/class:** existing representation change and restriction/extension.
  `interface_semantics: true` selects a profile of INTEGRATION rather than a new
  TYPE. The profile requires known source/target APPLICATIONs, protocol, payload
  class, sensitivity and directionality. An unqualified integration is not thereby
  an Application Interface.
- **Benefit/tradeoff:** authors govern an endpoint without another catalogue kind;
  an interface exposed to an unspecified user or node does not directly fit this
  two-application shape. Interface identity and a connection are easy to conflate.
- **Mapping/loss:** T → A is conditional on the explicit profile and actual point
  of access; retain connection and classification information separately. A → T
  needs a supported application pair and the profile metadata, or remains unmapped.
  A bare Interface concept cannot reconstruct the local payload/security fields.
- **Compatibility/decision:** introducing a separate required TYPE or splitting
  existing records affects views, references and validation. The specification
  records the **2026-06-28 Application Interface representation decision**; an
  independently accessible accepted ADR is **unknown**. Proposed disposition:
  retain the profile while testing a named endpoint and rejecting a data pipe
  without an interface contract. INT-001 is documented enforcement, not evidence
  that every consumer implements it.

## Proposed changes and modeling checks

These entries are **proposed**, not newly accepted semantics. Priority and
compatibility follow the [architecture review](architecture-evidence.md#candidate-recommendations-compatibility-and-decisions).
Each proposal inherits the exact source paths, baseline revision and two-way
mapping/loss assessment of the existing entries it names. It proposes a review
or documentation improvement, not a replacement transformation.

| Proposal | Improvement and representative test | Precision, clarity and validation | Compatibility / decision |
|---|---|---|---|
| **AM-P01** (AM-002/013; ArchiMate 3.2 Stakeholder, N221 p. 3) | Optional concern/viewpoint evidence accompanying two views over a shared goal | Positive: distinguish each audience's concern and answer. Negative: identical `notation` does not imply identical viewpoint. This is a proposed evidence check, not a current validator. | Additive companion first; mandatory concern references would be breaking. Owner: methodology maintainers with model authors. Accepted ADR unknown; options in REC-02. |
| **AM-P02** (AM-006/008/009; ArchiMate 3.2 Gap and relationships, N221 pp. 2, 12) | A mapping specification that records direction, date selection and loss | Positive: distinguish before/after hosting; require supported states for a Gap mapping. Negative: reject direct `serves` string substitution and simultaneous export of ended/current links as current facts. Full relation rules must be accessible before an admissibility claim. | Additive specification; reversing core edges would be breaking. Owner: semantic-tool implementers with methodology maintainers. Accepted ADR unknown; REC-03/B-04. This proposal defines mapping evidence only. |
| **AM-P03** (AM-001/011; ArchiMate 3.2 Capability/Resource, N221 p. 5) | Document storage-layer and supported-TYPE boundaries rather than force fuller inventory coverage | Positive: keep a capability's local V/H identity while distinguishing its comparison concept. Negative: do not silently map Resource to Capability merely to finish an import. | Documentation is additive. New mandatory TYPEs/paths require consumer review. Owner: methodology maintainers. Accepted ADR unknown; retain current modeling benefit until a specific counterexample justifies change. |

A review of these cases favors preserving useful departures. Service history,
stake identity and obligation evidence are valuable even when their faithful
interchange needs extensions. The strongest immediate improvements are explaining
the actual forms and qualifying equivalence claims. A diagram that looks closer
to ArchiMate but drops those facts is not an improvement on these cases.

## Proposed maintenance rule

Recommend **`docs/standards-review/archimate-differences.md` as the authoritative
detailed register**, with the glossary and cheat sheet linking to it after that
maintenance decision is accepted. The glossary remains a vocabulary introduction;
the element/relation specifications remain authoritative for Transitrix semantics.
This location recommendation does not itself adopt a maintenance policy.

Candidate **MUST**: a semantic change affecting a registered mapping updates the
relevant stable ID, comparison edition, source revision, direction/loss and
consumer/migration consequences in the same reviewed delivery. No exception for
claiming lossless interoperability; documentation-only comparisons may explicitly
retain unknown normative evidence.

Candidate **SHOULD**: demonstrate both a preserved modeling case and a rejected
interpretation before changing a mapping. Keep observed and proposed status
separate; mark accepted only with a public decision by name/date or accessible ADR.
If a source or decision is unavailable, keep **unknown**, not an invented citation.

Candidate **MAY**: retire an entry as deprecated while retaining its ID and successor
link. Do not reuse its ID. Reassess later standard editions as a separate comparison
with an explicit source delta; never relabel the 3.2 findings silently.

Maintainers should decide between this single register, the existing brief glossary
table and distributed consumer tables. The recommended single detailed register
reduces conflicting mappings; consumers still own their versioned implementation
coverage. Neither a register entry nor its merge proves that a converter exists.
