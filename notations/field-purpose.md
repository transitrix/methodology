# Reading fields by purpose

This guide helps model authors and tool implementers distinguish what a field
says from how it is stored, written, or checked. It explains the existing shared
contract and standalone GOAL, ACTION, REQUIREMENT and VERIFICATION records.
The group names below are explanatory: they are **not YAML containers**, new
required fields, an editor layout, or changes to validation.

## Scope and source versions

Read the linked contracts for authoritative shapes, enums and rule severities.
This mapping describes the **7.0.0 compatibility line**, inspected at source revision
`f2c7282229ae7966ce12e26f8d7069ae72b7815e`:

| Source | Version / relevant sections |
|---|---|
| [Shared contract](CONTRACT.md) | Unversioned shared document at the revision above; §§1, 6–7, 9, 11–18 |
| [Element envelope](ELEMENT_PRIMITIVES.md) | §3; applies to standalone elements, not automatically to every canon artefact |
| [GOAL](elements/02-goal.md) | 0.1, §§1–3 |
| [ACTION](elements/24-action.md) | 0.2, §§1–3, 6.1 |
| [REQUIREMENT](elements/15-requirement.md) | 1.4, §§2–4 |
| [VERIFICATION](elements/27-verification.md) | 0.6, §§2–5 |
| [Relations](elements/17-relations.md) | §3 kinds and §5 resolution; draft requirement-chain extensions remain draft |

The manifest's `methodology_version` selects repository compatibility;
`spec_version` declares the individual notation version and is currently accepted
without enforcement (CONTRACT §§1, 10.1). The shared header's future-v1 wording
is not permission to make it mandatory here. In particular, ACTION's numeric
nonnegative restriction starts at methodology 7.0.0, not ACTION spec 0.2.
This guide does not claim that every consumer implements every published rule.

## Purpose and independent dimensions

Each field below has one primary purpose in this guide:

| Purpose | Question answered |
|---|---|
| Identity/type | Which record or notation is this, and how is it classified? |
| Domain content | What intention, obligation, work or observation does it express? |
| Structure | How is the object decomposed or ordered? |
| Domain time/accountability | When does it hold or happen, and who performs or answers for it? |
| Record administration/admission | How was this record admitted, governed or presented? |
| Assertion provenance | What source or evidence supports the statement? |
| Semantic relationships | Which other object does this statement concern or serve? |
| Derived diagnostics | What can a query or check conclude from the current inputs? |

“Assertion provenance” here means the provenance of a statement; it does not
turn GOAL or VERIFICATION into the separate ASSERTION notation.

Keep these dimensions independent of purpose and of one another:

| Dimension | How to read it |
|---|---|
| Canonical / derived | A stored claim is source data; coverage or suspicion is a computation over source data. A canonical claim can still be mistaken. |
| Authored / computed | A person or authorised tool may record a claim, including a test result. A machine-written canonical result is not automatically a derived diagnostic. |
| Editable / read-only | These specs do not define generic UI permissions. Authored source changes follow the applicable admission/governance rules; derived output is recomputed, never edited back as a field. |
| Required / optional | Read the notation and state, not the purpose group. Optional does not mean unimportant; required does not mean read-only. |
| Object / revision scope | IDs and domain facts concern objects; admission records concern gate events; observations concern runs. Git supplies revision history. A date or a stored `pass` alone does not bind a claim to today's content revision. |

Unless qualified below, mapped YAML fields are stored source data, recorded by
an author or authorised tool, and describe the object/claim in that file's
revision. This is not a blanket write permission. Human-only `agreed` and
`expert_confirmed` writes retain their existing restrictions. There is no common
`created_at`, `updated_at`, `revision`, document-maintainer or read-only flag for
these four notations. File modification time is not a substitute.

## Shared fields

The requirement column below describes an admitted record. CONTRACT §6.1
substitutes proposal metadata before admission. GOAL, ACTION and REQUIREMENT
use the element envelope; VERIFICATION uses its own claim envelope, outside
`canon/elements/`. Do not give it an inherited mandatory `name` or `type`.

| Field | Primary purpose | Requirement and scope |
|---|---|---|
| `notation` | Identity/type | Required; `goal`, `action`, `requirement`, or `verification`. Identifies the schema, not a subtype. |
| `spec_version` | Identity/type | Optional declaration for the file; not the repository's compatibility selector. |
| `id` | Identity/type | Required canonical object ID; [ID grammar](IDS_AND_REFERENCES.md) governs uniqueness and references. |
| `name` | Domain content | Required sole label for GOAL/ACTION/REQUIREMENT; not specified by VERIFICATION's field table. |
| `description` | Domain content | Recommended for GOAL/ACTION; required obligation explanation for REQUIREMENT; not specified by VERIFICATION. |
| `aliases` | Identity/type | Optional non-authoritative matching hints on standalone elements, never second IDs or labels. |
| `former_ids` | Identity/type | Optional temporary migration bridge on elements; live IDs resolve first. Remove after references have been migrated, not as a routine edit. |
| `layer` | Identity/type | Optional element classification; folder placement is authoritative. |
| `status` | Record administration/admission | Optional organisation-defined element workflow; not lifecycle, agreement or verification outcome. |
| `tags` | Identity/type | Optional element classifiers; ACTION also lists them explicitly. |
| `owner_role` | Domain time/accountability | Optional accountable ROLE on elements; ACTION-specific meaning below. No generic document-maintenance interpretation. |
| `zone` | Record administration/admission | Required; `canon` for these admitted records; target zone for a proposal. |
| `admitted_at` | Record administration/admission | Required admission/reaffirmation date; not object birth or file-edit date. |
| `admitted_by` | Record administration/admission | Required person/tool that ran the gate; not automatically accountable for domain work. |
| `gate_checks` | Record administration/admission | Required historical gate outcomes; standard canon keys are `uniqueness`, `consistency`, `completeness`. Extra gate names are allowed. |
| `derived_from` | Assertion provenance | Optional source citations. REQUIREMENT narrows the allowed targets below; never assume all shared citations are legal on every notation. |
| `valid_from` | Domain time/accountability | Required start of the primitive's effective lifetime. |
| `valid_to` | Domain time/accountability | Required end of that lifetime, nullable while open; not a workflow-state string. |
| `admission_state` | Record administration/admission | Optional `proposed` / `active` / `rejected`; absent means active. Only active records enter admitted projections. |
| `reviewer_authority` | Record administration/admission | Optional review tier on active records; absent means expert-confirmed. Tool/human write restrictions in §6.2 apply. |
| `proposed_at`, `proposed_by` | Record administration/admission | Required for proposed/rejected records; date and automated producer of the proposal. |
| `owner_to_confirm` | Record administration/admission | Recommended on proposals; ROLE responsible for the admission decision, not ACTION execution. |
| `rejected_at`, `rejected_by` | Record administration/admission | Required on rejection; decision date and human reviewer. |
| `rejection_reason` | Record administration/admission | Recommended rejection explanation; a rejected record remains auditable. |
| `example` | Record administration/admission | Optional, only `true` is valid; says the record illustrates rather than reports reality (§6.4). |
| `agreement` | Domain time/accountability | Optional commitment axis on REQUIREMENT here, not GOAL/ACTION/VERIFICATION; absent means agreed. Admitted draft/disputed requirements still count in views and coverage. |
| `agreed_by` | Domain time/accountability | Required whenever `agreement` is explicit; who set that value. Only a human may set agreed. |
| `agreed_at` | Domain time/accountability | Optional date the agreement value was set, not the latest content-edit date. |
| `extensions` | Domain content | Optional open attribute bag (§12). Container preserves additional content; each adopter-defined child needs its own meaning. It does not override a defined field. |
| `canon_id` | Semantic relationships | Optional accepted project-to-central binding, resolved against a pinned catalogue (§17); not an alternate local ID. |
| `origin.repository`, `origin.id` (binding map) | Assertion provenance | Optional provenance of a promoted central element (§17). Collides with REQUIREMENT's scalar `origin`; see limits below. |

Shared mechanisms that have **different record scope** are not extra fields to
paste into these four objects:

| Mechanism and fields | Primary purpose | Scope / constraints |
|---|---|---|
| Field `source_quality` | Assertion provenance | Authored source-trust label, recommended in Field, not meaningful on canon/codex (§6, §11). |
| Candidate `extraction_confidence` | Assertion provenance | Upstream extraction review signal; never persisted into admitted canon (`ADMIT-009`). |
| Field `source_document.title`, `.uri`, `.revision` | Assertion provenance | Optional descriptor; all three required when present, immutable revision. Draft requirement-chain scope (§5.1), not a core REQUIREMENT field. |
| View `name`, `description` | Domain content | Required title and optional explanation of a view document (§1.1), not its elements. |
| View `generated_at` | Record administration/admission | Optional authored formation/substantive-revision date (§1.1); not automatic Git time. |
| View `view_config` | Record administration/admission | Presentation/query settings defined by the selected view (§14), not a second copy of element data. |
| Snapshot `view_id` | Semantic relationships | Required source view reference (§14.6). |
| Snapshot `generated_at`, `methodology_version` | Record administration/admission | Required computed capture timestamp and version on generated snapshots, distinct from view metadata. |
| Sidecar `target`, `attribute_versions` | Domain time/accountability | Required target and histories; each entry has required `valid_from` and `value` (null is a gap). Only notation-declared time-varying attributes qualify (§9). No generic history sidecar is invented for these four types. |
| Unresolved `ingest_status`, `ingest_date` | Record administration/admission | Required unresolved marker and ingestion date (§13); outside the typed catalogue. |
| Unresolved `ingest_source`, `ingest_field` | Assertion provenance | Required source and source location for an untyped payload. |
| Unresolved `related_to` | Semantic relationships | Recommended links to known objects; do not confer a TYPE. |
| Unresolved `data` | Domain content | Required verbatim payload awaiting type resolution. |

## GOAL fields

[GOAL §§1–3](elements/02-goal.md) adds these distinctions to the shared map.
All fields in this table are optional.

| Field | Primary purpose | Meaning |
|---|---|---|
| `type` | Identity/type | Adopter-defined display type matching the rendering vocabulary; not the registry TYPE and not ACTION's scale enum. |
| `level` | Structure | Manually assigned nonnegative hierarchy label, **not computed depth**. Independent of `parent`. |
| `parent` | Structure | Transitional inline GOAL parent; canonical time-aware form is `REL.type: goal_parent`. Omitted/null is a valid root. |
| `factors` | Semantic relationships | Timeless driving DRIVER references; legacy FACTOR references remain accepted. |
| `link` | Domain content | Supplementary documentation URL. Presence is not automatically supporting evidence or a provenance edge. |

A root with `level: 2` is expressible: level does not create a hidden parent.
`GOALS-011` can warn about that positioning without making every root invalid.
A supplied dangling parent is different from an omitted parent; cycles are also
a separate structural error.

## ACTION fields

[ACTION §§1–3, 6.1](elements/24-action.md) defines the following optional fields.
`description` and the common envelope remain as mapped above.

| Field | Primary purpose | Meaning / conditions |
|---|---|---|
| `type` | Identity/type | Work scale: Initiative, Programme, Project or Task; Strategic Initiative is an accepted alias. Independent of parent structure. |
| `activity_type` | Identity/type | Deprecated alias of `type`, with the existing warning; not a second classification. |
| `parent` | Structure | Aggregating ACTION. Omitted/null roots are valid; the virtual business root is a rendering convention, not an element. |
| `predecessors` | Structure | Timeless work-order DAG, not parentage or obligation dependency. |
| `goals` | Semantic relationships | Transitional inline goals served; canonical time-aware form is `REL.type: action_goal`. |
| `delivers_changes` | Semantic relationships | Timeless references to changes delivered. |
| `scenario` | Semantic relationships | Scenario membership. |
| `stakeholders` | Semantic relationships | Stakeholders whose interests are at stake, not the performers. |
| `duration` | Domain time/accountability | Organisation time units; needed for CPM; zero is a milestone, null means unspecified. |
| `duration_days` | Domain time/accountability | Supported legacy alias in days; `duration` takes scheduling precedence, but both supplied values are validated. |
| `start_date`, `end_date` | Domain time/accountability | Planned work dates, not file edits or effective lifetime. |
| `owner` | Domain time/accountability | ACTOR performing the work. |
| `owner_role` | Domain time/accountability | ROLE accountable for the work; independent of performer and admission reviewer. |
| `labor_cost`, `resources_cost`, `effort` | Domain content | Cost/effort signals in organisation-defined units. |
| `score` | Domain content | Authored local prioritisation integer, not a computed quality/completeness score. |
| `sort` | Record administration/admission | Authored display-order integer; not work sequence. |
| `link` | Domain content | Supplementary documentation URL. |

`duration`, `duration_days`, costs, effort and `score` have the existing 7.0.0
nonnegative rule; `sort` does not. A Project can be a root when no parent is
modelled. The typed hierarchy warning applies when parent and child both carry
scale types; Action Card's Project-only anchor is a separate constraint.

## REQUIREMENT fields

[REQUIREMENT §§2–4](elements/15-requirement.md) defines required `name` and
`description` plus the shared envelope. The following fields are optional.

| Field | Primary purpose | Meaning |
|---|---|---|
| `origin` (string) | Identity/type | legislative / process-product / project-product context; omitted means legislative for filtering. Not the shared binding map. |
| `severity` | Domain content | Organisation planning priority: high / medium / low; not regulatory force. |
| `level` | Identity/type | stakeholder / system / software specification tier; not GOAL's numeric level or hierarchy depth. |
| `kind` | Identity/type | functional / quality classification; no generic `type` enum is declared here. |
| `parent` | Structure | Same-TYPE decomposition; absent is a valid root obligation. Does not imply dependency or work sequence. |
| `next_review_at` | Record administration/admission | Review-due date; not the obligation's deadline or validity end. |
| `serves` | Semantic relationships | Upstream NEED trace. |
| `derived_from` | Assertion provenance | Only admitted LAW, REGULATION, STANDARD, POLICY, INTERNAL_STANDARD or PRINCIPLE sources, regardless of origin. Field citations are rejected here. |

`deadline`, `obligation_level` and `requirement_type` appear in the spec's
regulatory discussion/evolution but are not implemented field contracts in its
canonical table. Do not promote them to required or validated attributes.
A requirement is not assigned a new owner, schedule or completion state by a
`required_for` relation: that edge scopes an obligation to a RELEASE.

## VERIFICATION fields

[VERIFICATION §§2–5](elements/27-verification.md) records a claim about checking
a REQUIREMENT; it does not carry the general standalone-element label/subtype
fields by implication.

| Field | Primary purpose | Requirement and meaning |
|---|---|---|
| `verifies` | Semantic relationships | Required REQUIREMENT target. A GOAL or NEED is not accepted. |
| `verified_on` | Semantic relationships | Optional admitted RELEASE tested; no subject/`of` constraint. Absence leaves state unspecified. |
| `method` | Domain content | Required test / analysis / inspection / demonstration. |
| `protocol` | Domain content | Required procedure, conditions and acceptance criteria. |
| `result` | Domain content | Optional narrative observations. |
| `outcome` | Domain content | Required pass / fail / inconclusive / not_yet_run judgement; stored claim, not current coverage. |
| `evidence` | Assertion provenance | Optional support; empty with pass produces the existing warning. |
| `evidence[].kind` | Assertion provenance | Discriminator: canonical_ref / external_doc / note, following [ASSERTION §4](elements/16-assertion.md#4-evidence--three-kinds). |
| `evidence[].ref` | Assertion provenance | Required for canonical_ref; resolves to a canonical artefact. |
| `evidence[].title`, `evidence[].url` | Assertion provenance | Required for external_doc; title and external location. |
| `evidence[].text` | Assertion provenance | Required for note; recorded observation. |
| `performed_at` | Domain time/accountability | Optional, recommended execution date, separate from admission and effective lifetime. |
| `performed_by` | Domain time/accountability | Optional ROLE or free-text handle recording the performer, not the admitting reviewer. |

VERIFICATION has no `subject` or `agreement` contract. ASSERTION compliance
claims and VALIDATION of NEEDs remain separate notations.

## Relationships and one count per edge

Resolve within the declared catalogue and the selected as-at window. For GOAL
`parent` and ACTION `goals`, use the canonical REL representation when present,
with inline references as the transitional fallback. A REL and its inline copy
are **one semantic edge**, not two contributions to a count. REL `type` names a
relationship kind, `from`/`to` its endpoints, and `valid_from`/`valid_to` the
relationship's own lifetime; those fields do not become properties of the target.

Do not generalise replacement precedence to every kind. The draft
[requirement-chain](views/reports/requirement-chain.md) extension uses an
**additive union** for inline REQUIREMENT `parent`/`serves` and their REL forms:
different endpoint pairs survive; an identical pair counts once while preserving
both provenance carriers ([Relations §5](elements/17-relations.md#5-validation-rules)).
Closing a REL does not remove an inline copy; migrating that pair requires
explicitly removing the inline field.
`source_trace` is an explicit provenance relation, not an inference from any URL.
Keep those draft semantics scoped to that extension, without claiming consumer
implementation. ACTION predecessors and REQUIREMENT decomposition retain their
own contracts; neither becomes a generic time-aware REL by this explanation.

## Computed observations are not new editable fields

All rows here have the primary purpose **derived diagnostics**. They are
computed, read-only outputs scoped to the input catalogue/revisions, evaluation
date and any query parameters. Their field-like names in reports are not keys
to add to GOAL, ACTION, REQUIREMENT or VERIFICATION YAML.

| Observation | Source and limits |
|---|---|
| Planned / Active / Retired | Effective lifecycle derived from `valid_from`/`valid_to` (CONTRACT §7), not stored `status`. |
| Hierarchy depth / resolved parents | Computed structure; never overwrite authored GOAL `level`. |
| Requirement assertion or verification coverage | Catalogue scans under REQUIREMENT §4; existence of a claim, closure of a trace, and successful verification are different predicates. |
| Staleness / freshness | CONTRACT §11 and `next_review_at` checks use their specified anchors; time passing can change the result without editing an object. |
| Source trust / confidence | Existing CONTRACT §11 computations over provenance and freshness; reviewer authority and extraction confidence are independent. No new composite score is introduced here. |
| Link suspicion / agreement lapse | CONTRACT §16 compares target content identity with its specified Git anchor, not file timestamp alone. Derived, never stored, reports rather than filters. |
| Superseded tested release | VERIFICATION §2.1.1 walks RELEASE predecessors; separate from target-content edits. Never invalidates or hides the historical claim. |
| Validator findings and coverage of validation | CONTRACT §18 distinguishes validated, failed, skipped and exempt files. Historical `gate_checks: pass` is not an exact-current-revision validation receipt. |

## Worked readings

1. **Effective before admission.** A GOAL has `valid_from: "2026-01-01"`,
   `valid_to: null`, and `admitted_at: "2026-03-01"`. Its recorded effective
   lifetime starts in January; the gate ran in March. An April spelling edit is
   neither a new effective start nor a reaffirmation. A real gate reaffirmation
   can update `admitted_at` under CONTRACT §11.3. The old gate outcomes alone
   do not establish that the April revision passes today's checks.

2. **Work dates and responsibility.** An ACTION has
   `start_date: "2026-10-10"`, `end_date: "2026-11-20"`,
   `valid_from: "2026-09-01"`, `owner: ACTOR-DELIVERY-1` and
   `owner_role: ROLE-PROJECT-LEAD-1`. It is an effective plan in September for
   work scheduled in October–November. A document editor changing wording on
   October 2 does not become its performer or accountable role. `admitted_by`
   names the gate operator; `owner_to_confirm` would route a proposal's review.
   None of those fields is a document-maintainer assignment.

3. **Structure without invented evidence.** A GOAL with `level: 2` and no
   `parent` is a root with an authored level, possibly carrying `GOALS-011`.
   Adding a supplementary `link` does not verify it. If an ACTION's `goals`
   cites that GOAL and an applicable `action_goal` REL records the same pair,
   the rendered semantic graph contains one action-to-goal edge, not two.

4. **Historical pass and today's coverage.** A VERIFICATION targets
   `REQUIREMENT-RESPONSE-1`, has `outcome: pass`, and names
   `verified_on: RELEASE-SERVICE-1`. Its protocol ran on September 10 and was
   admitted September 11. A September 20 requirement edit does not rewrite the
   stored pass: content-identity suspicion may now flag its link. A successor
   `RELEASE-SERVICE-2` does not inherit proof of passing that protocol. Existing
   `REQ-VERIF-COVERAGE-001` counts admitted targeting records and `-002` asks
   whether at least one has pass **or fail**; even fail closes that trace.
   Inconclusive means the protocol ran but does not close this particular
   coverage predicate. An unqualified verification can also close the existing
   trace; the rules do not silently acquire a release filter. The draft
   requirement-chain selected-release metric is a different, explicitly scoped
   query, not a replacement for those rules or proof that today's requirement
   content has been tested. `verifies: GOAL-RESPONSE-1` would fail target typing.

## Limits and ambiguous surfaces

The shared binding `origin` map and REQUIREMENT's `origin` string cannot occupy
the same YAML key simultaneously. The sources provide no combined encoding or
precedence for that case. Use the requirement-specific scalar contract when
reading requirements; do not silently coerce it to binding provenance or invent
a second key. A consumer needing both needs a separate contract decision.

The shared envelope does not grant every field to every record kind: in
particular VERIFICATION is a claim outside the standalone-element tree. Likewise,
source descriptors, unresolved records, view snapshots and versioned attributes
have their own scopes. Extensions preserve unknown content but do not turn it
into a standard relationship, evidence, permission, or validation guarantee.

This mapping preserves existing schemas, aliases, optionality and diagnostics.
It supplies a reading guide, not a migration, permission model, UI design or
promise of downstream propagation.
