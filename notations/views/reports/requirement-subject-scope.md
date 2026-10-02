---
title: "PRODUCT and APPLICATION requirements scope"
version: "0.3"
last_updated: "2026-10-02"
status: "accepted"
---

# PRODUCT and APPLICATION requirements scope

**Accepted consumer contract: `requirement-chain/0.3`.** This document defines
application scope without manufacturing a PRODUCT. It extends
[requirement-chain/0.2](requirement-chain.md), whose contract and
[worked oracle](../../examples/requirement-chain/README.md) remain unchanged.
The [subject cases](../../examples/requirement-subject-scope/README.md) specify
the exact expected IDs for this contract. Contract acceptance does not establish
support in a tool version: author the added kinds and values only when the pinned
methodology vocabulary, schema and consumer versions declare support.

## Compatibility and accepted extensions

The source baseline is Methodology commit
`f2f1cfba08b1377ae5c770a56e92aba702afdcdb`. The retained requirement-chain/0.2
contract and oracle originate at `97c9d41819011ead8fe192c266cba32707eae82f`.
Source support, projection implementation, contract acceptance and publication
are separate claims.

| Concern | Source contract at the baseline | Accepted extension / support boundary |
|---|---|---|
| Subject identity | [Primitives §§7.6–7.7](../../ELEMENT_PRIMITIVES.md) define distinct PRODUCT and APPLICATION. Neither has an internal/external usage discriminator. | Select either TYPE explicitly. Internal use, sale and software/physical form do not choose the subject TYPE. No usage field is needed. |
| Physical product | PRODUCT `type` is required: `digital_product`, `service`, `platform`, `bundle`; [Products §5](../diagrams/09-products.md) repeats it. | A standalone physical product has no general type value. P3 below supplies the additive value; do not disguise it as software or a bundle. |
| Release ownership | Primitives §7.29 already admits PRODUCT or APPLICATION in `RELEASE.of`; predecessor must have the same owner. | No endpoint widening needed. Validate exact owner identity, not merely TYPE. |
| Requirement membership | [Relations §3](../../elements/17-relations.md) admits `product_scope`: REQUIREMENT → PRODUCT. `required_for` points to RELEASE. | Independent application membership is missing. P1 adds `application_scope`: REQUIREMENT → APPLICATION. Never infer membership from release assignment. |
| Project selection | `project_scope`: REQUIREMENT → ACTION(Project); `project_product`: ACTION(Project) → PRODUCT. | Keep `project_scope`; P2 adds `project_application`: ACTION(Project) → APPLICATION. No inferred project from implementation links. |
| Product/application connection | PRODUCT `supporting_apps` and APPLICATION `products` describe support. | Context only; neither conveys requirement membership, assignment nor verification. |
| Trace graph and metrics | requirement-chain/0.2 §§5–7 define trace direction, direct verification and six metrics. | Reuse unchanged, substituting explicit subject membership for product membership. Cross-subject trace context never changes counts. |
| Obligation inheritance | Relations §3.2 and [reference query](../../../scripts/release-obligations.mjs) retain active requirements and nearest predecessor attachment. | Same-owner validation and completeness must surround the query; its scalar loader and cycle-safe walk are not a complete report validator. |
| Validation | [Contract §8](../../CONTRACT.md) specifies RELEASE-001–005 and REL endpoint/window rules; requirement-chain/0.2 §9 adds consumer obligations. | Tables are not proof of runtime support. New kinds require coordinated vocabulary, schema, endpoint validation and consumer capability changes before a consumer declares support. |

The accepted extensions are:

- **P1:** add only `application_scope`, REQUIREMENT → APPLICATION, using the
  ordinary admitted REL envelope, one endpoint pair per record, inclusive window,
  M:N membership and existing endpoint/lifecycle validation. Preserve
  `product_scope` without widening its endpoints or migrating existing records.
- **P2:** add only `project_application`, ACTION with `type: Project` → APPLICATION,
  on the same REL machinery. Keep PRODUCT pairing unchanged. A pair admits a
  selection; it does not confer requirement membership on either endpoint.
- **P3:** add `physical_product` to the PRODUCT `type` vocabulary in the primitive,
  product view and corresponding consumer schemas. It classifies a product form,
  not its audience. This is an additive value; it introduces no new physical TYPE
  or internal/external enum.
- **P4:** version the expanded consumer interface as `requirement-chain/0.3`.
  Accept an explicit `{subject: {id, type}, release, project?,
  as_at, catalogue_boundary, snapshot}`. Preserve 0.2 product calls through an
  explicit adapter and reject conflicting product/subject selectors. Do not
  silently advertise 0.3 from a picker change or unknown-field tolerance.

These choices minimize changes to existing product consumers. Generalizing
`product_scope` to accept APPLICATION would contradict its published endpoint
and require a different compatibility contract.

## Population contract

Let `P` be the selected subject's active requirements with an active valid explicit
membership: `product_scope` for PRODUCT, `application_scope` for
APPLICATION. Keep the existing `P` output name for compatibility; label it
**subject population**. A requirement may explicitly belong to both subjects,
but the subjects remain distinct. Missing, malformed or unreadable membership
is unresolved, not evidence of exclusion, assignment, or a zero population.
Expose the catalogue's unresolved membership IDs separately; absent membership
cannot tell which subject they would belong to.

Validate release `of == subject.id` before calculating release totals. Follow
only same-owner predecessors; stop on wrong-owner, dangling, malformed or cyclic
links with an incomplete-scope diagnostic. Never use version sorting. The release
record's lifecycle is not an extra report-date filter. Apply requirement and
relation lifecycle windows inclusively, requiring valid dates; a malformed window
cannot become an unbounded active relation.

`L = releaseObligations(selected release, as_at) ∩ P`. Deduplicate requirements,
retain every contributing attachment identity, select the nearest surviving
attachment, and use REL ID for same-depth display ties. Ending a newer attachment
does not cancel an active ancestor attachment. Predecessors carry obligations,
never execution results.

With no project selected, `S = L`. With project `J`, validate the appropriate
explicit project/subject pair and use `S = L ∩ project_scope(J)`. Missing pairing
makes that filtered scope unavailable. Missing project membership exposes known
IDs with incomplete filtered totals. Never infer project membership from a parent,
an ACTION ancestor, product support, or implementation work.

For every member of `P`, inspect all modelled releases owned by that subject,
including branches, at the same date:

| Classification | Exact condition |
|---|---|
| Assigned here | Member of `L`, whether direct or inherited. |
| Other-release-only | Effective assignment to another same-owner release, absent from `L`. |
| Clean unassigned | No effective same-owner assignment, with complete data and no active invalid assignment. |
| Invalid assignment | Active malformed/dangling `required_for`, or target release owner belongs to none of the requirement's valid explicit subject memberships. Retain any valid assignments too; this flag can overlap assigned here. |
| Contextual assignment | Assignment to a different explicitly declared subject; does not assign this subject's release. |
| Unresolved membership | Insufficient membership/catalogue data; retain known IDs and diagnostics, total unknown. |

Retired and future requirements are outside active populations. Expired invalid
relations remain history rather than active assignment blockers. Missing input,
missing selection, wrong TYPE, invalid ownership and a proven empty set are
separate states. Known empty IDs under incomplete data have `total: null`, not 0.

## Trace and evidence contract

Use exactly the trace kinds and independent upstream/downstream walks from 0.2
§5. A cross-subject requirement reached by an explicit source/decomposition edge
may appear as labelled context. Do not walk sideways through a shared ancestor.
Membership, supporting applications, release assignment, `depends_on`, project
pairing and assembly links do not expand trace traversal or add members to `S`.
The unfocused graph includes only necessary upstream context and direct
verification records, not every requirement of a related subject.

Definitions attach directly to their `verifies` requirement. Execution requires
`verified_on` equal to the selected release, a valid definition and active valid
execution fields under 0.2 §6. Other-release and unqualified evidence remain
context. A child pass never covers its parent; no predecessor, product/application
support link or shared protocol text transfers a result. Active pass and fail
coexist; inconclusive is executed, and `not_yet_run` is not. Preserve malformed,
historical and future execution findings and their source navigation.

## Six metrics and consumer result

Let `V(r)` and `E(r)` retain the 0.2 definitions. No Phase 2 metric or overall
quality score is added. Each metric is a distinct requirement-ID set:

| Metric | Population and predicate |
|---|---|
| Broken references | `r ∈ S`, with a defective reference attributed under 0.2 §7; retain reference-slot and unattributable inventories separately. |
| No accepted source path | `r ∈ S`, no valid upstream path to NEED, DRIVER, permitted codex or descriptor-bearing Field document. |
| No valid verification definition | `r ∈ S`, `V(r)` empty. |
| Verification without applicable executed result | `r ∈ S`, `V(r)` nonempty and `E(r)` empty. |
| Applicable failed verification | `r ∈ S`, at least one fail in `E(r)`. |
| No effective release assignment | Clean unassigned subset of whole `P`, across all same-owner releases, independent of project filter. |

The result retains scope and immutable source provenance, sorted distinct
`P/L/S`, assignment/stage/metric IDs, all contributing edges and attachment
identities, context reasons, and attributable/unattributable diagnostics. Each
set carries completeness and a nullable total. Broken population inputs do not
fabricate complete metric totals. A valid empty population can have six zero
counts; an unavailable population cannot.

Both reports, exports and a supported headless interface must consume one
projection. Focus, full/adjacent-pair mode, scrolling and navigation operate on
that graph and never recalculate populations. Cache keys include explicit subject
TYPE/ID, release, optional project, date, catalogue and content provenance. Refresh
publishes one new projection atomically; failed reads retain an explicitly stale
snapshot or unavailable state. Consumer support requires exact contract/oracle
revision binding and automated positive/negative evidence against all four subject
cases and their independent controls. A consumer must declare its supported
contract version separately from the version of this document.
