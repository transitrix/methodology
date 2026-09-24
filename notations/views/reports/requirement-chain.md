---
title: "Requirement-chain projection and release quality"
version: "0.1"
last_updated: "2026-09-24"
status: "proposal"
---

# Requirement-chain projection and release quality

This proposed contract is for analysts reading a Traceability Matrix and
Requirements by Release, and implementers producing either report. Both consume
one projection, one catalogue snapshot and one as-at date. Deleting either report
loses no model knowledge. This is a proposal for review, not a shipped notation or
a declaration that existing validators accept the extensions below.

The [shared worked example](../../examples/requirement-chain/README.md) specifies
one semantic oracle for both consumers. [Authoring guidance](../../../guides/requirement-chain.md)
explains the proposed additions. No new requirement level, test TYPE, result TYPE,
or mandatory intermediate requirement is introduced.

## 1. Existing contracts retained

| Concern | Source and retained meaning |
|---|---|
| Requirement | [REQUIREMENT](../../elements/15-requirement.md) §§2.4–2.7: singular inline `parent`, singular `serves`, optional `level: stakeholder / system / software`; absent level remains unclassified. |
| Authority source | REQUIREMENT §4: `derived_from` accepts only LAW, REGULATION, STANDARD, POLICY, INTERNAL_STANDARD and PRINCIPLE in codex. It is not widened here. |
| Need and driver | [Primitives](../../ELEMENT_PRIMITIVES.md) §§7.28 and 7.1: NEED has a stakeholder; DRIVER is a standing force, with optional internal/external classification, not a research finding. |
| Project | [ACTION](../../elements/24-action.md) §1: an ACTION with `type: Project`. There is no separate PROJECT TYPE. |
| Release | Primitives §7.29: `RELEASE.of` names PRODUCT or APPLICATION; `predecessor` names an earlier release of the same subject. These reports select PRODUCT releases. |
| Obligation scope | [Relations](../../elements/17-relations.md) §3.2: `required_for`, predecessor inheritance, inclusive windows, nearest attachment, distinct requirement IDs. |
| Verification | [VERIFICATION](../../elements/27-verification.md) §§2–5: `verifies`, required method/protocol/outcome, optional result narrative, evidence, execution date and `verified_on`. A record may reserve a definition before execution. |
| Source documents | [Zones](../../CONTRACT.md) §§5–6 and [Field IDs](../../IDS_AND_REFERENCES.md) §3.4; raw research is Field evidence. [Documents package](../../packages/documents.md) §2.6 citations run package → core; core cannot reference package objects. |
| Verdicts | Existing admission, agreement, lifecycle and validation findings remain visible. Agreement reports and never filters the population. Compliance ASSERTION and need VALIDATION do not count as requirement VERIFICATION. |

The existing repository-wide verification coverage warnings are unchanged. In
particular, an inconclusive record can still produce the existing unresolved
coverage warning while counting as executed in this report. An unqualified pass
can close the existing repository-wide trace but cannot satisfy selected-release
execution applicability. These are different questions, with different scopes.

## 2. Proposed authoring additions

All additions in this section require schema/validator acceptance together. Old
catalogues remain valid; absent new membership is unresolved scope, not an inferred
membership or an empty product. New relation records use the existing REL envelope,
one `from` and one `to`, admission and inclusive lifecycle windows. Nothing is
stored in a view configuration as a substitute for these facts.

| Proposed REL kind | Stored direction / admissible endpoints | Meaning |
|---|---|---|
| `source_trace` | REQUIREMENT or NEED → DRIVER or Field INTERVIEW/SURVEY/OBSERVATION/DRAFT; DRIVER → those Field types | Explicit motivation/evidence citation. Field targets must carry the document descriptor below to appear as source documents. Does not assert that raw evidence is authoritative. |
| `serves` | REQUIREMENT → NEED | Addressable M:N counterpart to inline `serves`; each pair is separate. |
| `requirement_parent` | REQUIREMENT child → REQUIREMENT parent | Addressable M:N decomposition, using the promotion path already named by REQUIREMENT §2.4. Never a dependency or an implementation order. |
| `product_scope` | REQUIREMENT → PRODUCT | Independent product membership, irrespective of any release assignment. |
| `project_scope` | REQUIREMENT → ACTION with `type: Project` | Independent project membership; membership is not inherited from a requirement parent or action ancestor. |
| `project_product` | ACTION with `type: Project` → PRODUCT | Admissible project/product combination. It does not itself make all that project's requirements members of the product. |

For `serves` and `requirement_parent`, an inline field contributes its ordinary
edge. Active REL records contribute additional edges. An identical endpoint pair
has one logical edge with all contributing record identities; neither source
silently overrides the other. This additive union is deliberate: a REL with a
closed window does not suppress a still-authored inline field. When migrating a
pair, remove the inline field in the same reviewed change. Multiple parents and
multiple needs remain explicit, rather than guessing additional links from prose.

A Field artefact representing a source document gains an optional `source_document`
map: required nonempty strings `title`, `uri`, and `revision` when the map is
present. `revision` is an immutable version or content digest, not a moving label
such as "latest". The artefact retains its existing Field ID, zone and admission
record. Market Research may be captured as an OBSERVATION with this descriptor;
a draft stays a DRAFT. No new research-document taxonomy is introduced. A URI
alone without a captured, addressable Field artefact cannot become a graph edge.
Package document `canon_refs` remain context-only citations; they cannot be
reinterpreted as evidence that the cited obligation originated in that document.

### Validation requirements for consumers of the proposal

Reuse existing endpoint/admission checks, REL endpoint and lifecycle checks, and
requirement/verification/release verdicts. Extend the relation-kind registry for
only the exact endpoint pairs above; verify `type: Project`, not just ACTION ID
syntax. Validate descriptor shape, nonempty protocol, unique catalogue IDs, ISO
dates, endpoint existence and lifecycle containment. Surface missing membership,
inconsistent project/product combinations, cross-product release assignments,
malformed windows, and incomplete source loading distinctly.

Detect cycles on the union of inline/REL decomposition edges, self-links and
release-predecessor cycles. Preserve their records and diagnostic edges; do not
hide them, loop indefinitely, or treat a cycle as a source. A cycle does not erase
a separate valid path to a source. New diagnostic names below are report reason
labels, not newly allocated validator codes. The consumer validator registry and
schema tables must be updated with the accepted additions before advertising
support; this proposal alone does not activate them in existing tooling.

## 3. Projection input and completeness

Input is `{catalogue boundary, snapshot, as_at, product, release, project?}`.
`snapshot` identifies a Git commit or immutable catalogue digest plus the document
revisions read. A working copy uses an explicit dirty-content digest alongside its
base commit. Date and revision answer different questions: do not reconstruct
historical content merely by filtering today's files by date.

The matrix requires a selected project/product/release. A drill-down with no known
project opens the same matrix with **Project: unselected** and the explicit
product/release population preserved, inviting a project selection without
inventing one. The release report permits no project filter; when a project is
explicitly selected, the first five metrics and stage counts use that intersection.
The sixth metric always uses the whole product population, labelled accordingly.

Resolve IDs inside the manifest's catalogue boundary. Display names and IDs,
as-at date, snapshot and completeness in the header. Validate that release `of`
is the selected product, and that an active `project_product` admits the selected
pair. Missing selection, unresolved ID, wrong type, invalid membership and incomplete
catalogue are separate states. Do not fall back to repository-wide scope.

A result contains sorted distinct node IDs, edges with source record/field
identity and both stored and display direction, population ID lists, stage ID
lists, six metric ID lists, diagnostic records, and contextual-node reasons. Every
count is the length of its corresponding complete ID set. On incomplete input,
show known contributing IDs with `incomplete` and affected scope; the total is
unknown, even if the known list is empty. Do not silently render unknown as zero.

## 4. Populations and assignment

Let `P` be the selected product's active requirements with an active valid
`product_scope` to it. Active means inclusive `valid_from ≤ as_at ≤ valid_to`,
with null end unbounded. Malformed or missing required dates are diagnostics,
not an invitation to assume an unbounded interval. Requirements with absent,
invalid or unreadable membership form a separately visible unresolved population;
do not infer their product from `required_for`, sources, verification, names,
directory placement, parents or implementation links. A partial catalogue cannot
prove that all product members have been found.

Let `L` be the valid release-obligation query for the selected release, intersected
with `P`. Follow the same-subject predecessor chain, collect active `required_for`
relations, exclude inactive requirements, deduplicate by requirement and select
the nearest surviving attachment. Retain all contributing relation IDs; break
same-depth display ties by relation ID. A release's own lifecycle is not an
additional as-at filter. Neither version strings nor shipping order defines a
predecessor. Invalid or dangling predecessor stops traversal with incomplete scope;
never traverse into another product's release. A cycle terminates with a finding.

**Temporal compatibility choice:** REQUIREMENT activity here checks both start
and end, matching [the reference query](../../../scripts/release-obligations.mjs).
Relations §3.2's current prose explicitly mentions only requirement retirement.
Acceptance must reconcile that wording with this choice; do not leave two
interpretations for consumers. This proposal does not silently change that page.

For an explicitly selected project `J`, let `S = L ∩ project_scope(J)`; otherwise
`S = L` with project unselected. A requirement can belong to multiple projects
and products through explicit pairs. Missing project membership is unresolved
project scope, never a guessed assignment. Invalid pairs are quarantined with
findings while known-valid contributors stay inspectable. Missing or inconsistent
membership on a release-attached requirement makes the affected scope incomplete.

For each `r` in `P`, query **all modelled releases of that product**, including
other branches, at the same date. Classify its release assignment independently
of the selected release:

- **Assigned here:** `r ∈ L` (direct or inherited).
- **Other-release-only:** effective in another release but not in `L`.
- **Unassigned:** no effective assignment to any such release, with complete data
  and no active invalid/dangling assignment for `r`.
- **Invalid assignment:** an active malformed, dangling or wrong-product
  `required_for` (the target belongs to none of the requirement's valid product
  memberships). Assignments to another explicitly declared product are contextual,
  not invalid, and do not assign the requirement to a release of this product.
  Keep valid assignments too, if any; never call it clean
  unassigned. An expired invalid relation remains a historical finding, not an
  active assignment blocker.
- **Unresolved product population:** membership/catalogue is insufficient to
  enumerate `P`; expose known IDs and the reason instead of a total of zero.

Closing a relation window withdraws that relation, not every earlier attachment.
If an active ancestor attachment survives, the obligation is still inherited.
Retired and not-yet-effective requirements are outside the active populations.
Upstream sources/requirements outside `S` may appear as context with the precise
reason (other project, other release, inactive, unresolved membership). They do
not inflate release counts.

## 5. Graph and stages

Display stages, in fixed order: **Source document, Driver, Need, Stakeholder
requirement, System requirement, Software requirement, Unclassified requirement,
Verification definition, Result**. The unclassified column is a display bucket,
not a new `level`. An invalid level is diagnosed and displayed there without
being converted into a valid level. Same-stage and backward edges remain explicit;
the ordering does not impose a mandatory funnel or alter decomposition semantics.

| Stored link | Downstream display/traversal | Upstream traversal |
|---|---|---|
| REQUIREMENT `derived_from` → permitted codex | source → requirement | requirement → source |
| `source_trace` → Field source / DRIVER | source/driver → citing node | citing node → source/driver |
| inline/REL `serves` → NEED | need → requirement | requirement → need |
| inline `parent` / REL `requirement_parent` → REQUIREMENT | parent → child | child → parent |
| VERIFICATION `verifies` → REQUIREMENT | requirement → its definition | definition → its exact requirement |
| VERIFICATION definition/result in one record | definition → that record's result | result → that record's definition |

A definition is a projection node keyed by `(VERIFICATION id, definition)`; a
result node is keyed by `(VERIFICATION id, result)`. These are addressable display
parts, not synthetic canonical elements. Inline protocol text is displayed as
text with a pointer to its record/field; identical text on separate records does
not establish shared test identity. Existing evidence `canonical_ref` entries
are navigable contextual references, not protocol identities or inferred source
edges. No string is parsed as a reference merely because it resembles an ID.

For focus `f`, compute `U(f)` by following only upstream trace edges, and `D(f)`
by following only downstream trace edges. **Both = `{f} ∪ U(f) ∪ D(f)`**, with
only the edges visited by those walks. Never expand descendants of `U(f)` or
ancestors of `D(f)`. That would introduce unrelated siblings or co-parents through
shared sources. Use visited identities to terminate cycles. Retain malformed
edge stubs and finding identities without traversing unresolved targets.

With no focus, seed with `S`, include its source ancestors and its directly linked
verification definitions/results; decomposition between population requirements
is retained. Other requirements are introduced only as necessary upstream
context. A search selects an explicit ID/name match; it never changes membership.
Focus outside `S` is labelled context and does not move it into the counts.

`depends_on`, CHANGE/ACTION implementation links, ASSERTION, VALIDATION, package
citations, membership, release qualifiers and predecessors are context/scope links,
not trace/decomposition edges. Context links can be inspected but do not expand
focus traversal. A child's verification never verifies its parent.

Full matrix and adjacent-pair presentation use this same graph. Pair mode shows
two consecutive columns; arrows move exactly one column and disable at ends.
Empty columns remain. Direct edges spanning hidden stages retain a continuation
indicator with original endpoints; never manufacture an intervening requirement.
Mode, pair position, viewport and filtering do not recompute metric populations.
Preserve scope, focus, direction and filters across navigation; reset clears focus
and presentation filters while retaining explicit scope. Sort nodes by stage then
ID, edges by endpoint IDs and record identity. Use scrolling/virtualisation with
visible totals and no silent truncation, not graph pruning.

## 6. Definition and applicable execution evidence

A valid definition has an admitted VERIFICATION, a resolvable direct `verifies`
link, a recognised method and nonempty protocol, with valid envelope and lifecycle
at the as-at date. Errors confined to result/outcome/evidence/`verified_on` do not
erase an otherwise valid definition. A malformed definition cannot satisfy
verification coverage simply because its ID exists.

An applicable executed record for requirement `r` must have a valid definition
for `r`, `verified_on` equal to the **selected release ID**, outcome `pass`, `fail`
or `inconclusive`, a valid active lifecycle and no malformed execution fields.
If `performed_at` is present it must parse and be no later than `as_at`; if absent,
retain that absence as an execution-date warning without inventing a date. The
snapshot and lifecycle establish what was recorded as effective at the query date.
`result` narrative and evidence remain optional under the existing schema.
Absence is displayed; an absent evidence list on a pass retains the existing
warning but does not mean the recorded protocol was never executed.

A present malformed evidence entry, unresolved canonical evidence reference,
invalid outcome, malformed/future execution date or invalid release qualifier
excludes that record from the applicable execution set, with its reason visible.
Other-release and unqualified records remain separate contextual evidence. No
release-predecessor, assembly or version comparison carries their outcome forward.
`not_yet_run` is a definition/reservation, never an executed result; display its
state without creating an executed-result node. Inconclusive is executed.

Preserve each VERIFICATION ID. Repeated active executions all contribute their
individual outcomes: a later pass does not erase an earlier active failure, and
any-pass-wins and latest-result-wins are forbidden. Supersession uses the existing
record lifecycle (`valid_to`); there is no new `supersedes` inference. A withdrawn
record remains available as history, outside current applicability; it is still
applicable on the inclusive end date. The superseded-state warning about a release
having a successor does not itself withdraw the verification record.

## 7. Six quality metrics

For `r ∈ S`, let `V(r)` be valid direct definitions and `E(r)` their applicable
executed records. All sets contain distinct requirement IDs; categories overlap
and must not be summed into a defect total.

| Metric | Exact contributing set |
|---|---|
| Broken references | Requirements in `S` affected by at least one defective reference under the attribution rule below. |
| No accepted source path | `{r ∈ S : no valid upstream trace path reaches a NEED, DRIVER, permitted codex source, or descriptor-bearing Field document}`. A valid need is sufficient without a document behind it. Optional skipped stages are not defects. |
| No valid verification definition | `{r ∈ S : V(r) is empty}`. |
| Verification without applicable executed result | `{r ∈ S : V(r) is nonempty and E(r) is empty}`. One executed definition suffices for this bounded absence metric; this does not claim every protocol has run. |
| Applicable failed verification | `{r ∈ S : some e ∈ E(r) has outcome fail}`. Preserve conflicting outcomes in detail. |
| No effective release assignment | The clean **unassigned** subset of `P` in §4, across all product releases at `as_at`, without a project filter. |

A defective reference is one authored edge/field slot with an invalid endpoint,
wrong endpoint type, forbidden endpoint, invalid lifecycle reference or a cycle
edge. Identity is `(source record id or source path, field path/index or REL id)`.
Several verdicts on that slot count once. Duplicate authored slots count separately;
repeated traversal paths do not. Scalar errors such as an invalid outcome remain
visible findings but are not defective-reference counts.

Attribute a defect to `r` when its owner lies on `r`'s upstream source/decomposition
trace, its direct definitions/results, or its own membership/assignment records.
Include an invalid outgoing reference on such an owner, without traversing it.
For cycle edges, use cycle-safe diagnostic reachability to all incident cycle
members. Do not traverse downward to a child's tests or sideways through shared
ancestors for attribution. Scope/predecessor defects that prevent a complete
population are scope diagnostics rather than invented requirement attribution.
Findings whose owner cannot reach any known requirement (for example a verification
with a missing `verifies` target) form a separate unattributable list.

Show three units: distinct affected requirements, distinct attributable defective
references, and unattributable defective references/findings. Distinguish known
but out-of-scope affected requirements from truly unattributable findings. Expose
both the complete known reference inventory and the subset attributed to `S`.
Every requirement metric opens exactly its contributing IDs; reference/finding
metrics open those records. Each requirement drill-down opens the same matrix
with snapshot, date, scope and selected reason preserved.

## 8. Refresh and compatibility

Cache keys include catalogue boundary, content snapshot, document revisions,
as-at and selected scope. A source edit, deletion, membership/assignment change,
result change or validation change invalidates both reports. Publish both reports
from one complete new projection; do not mix a fresh count with stale drill-down
IDs. If loading fails, retain the previous snapshot explicitly as stale or show
unavailable; never substitute empty data. Content revisions are provenance, not
proof that prior verification is invalid.

This is additive authoring vocabulary but requires updated consumers: old tools
must not claim support merely because they ignore unknown fields or REL kinds.
There is no automatic migration from release assignment or package citations to
membership/source facts. Legacy views and coverage warnings retain their existing
meaning. Existing release-obligation, link-suspicion and admission checks remain
at their current homes; none is removed or relocated by this proposal.

Acceptance needs one agreed endpoint/membership contract, the temporal choice in
§4, and a consumer comparison against this same worked example. Schema tables,
validator implementation and consumer capability declarations must then agree
before the proposed additions are used as a supported model contract. A merged
document alone does not establish view implementation or installed UI acceptance.
Expected-chain gaps, continuation percentages, aggregate success/conflict scoring
and changed-after-verification reassessment are outside this contract.
