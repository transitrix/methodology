# Requirement-chain worked example

**Illustrative proposal, not an adopter catalogue.** This is the shared semantic
oracle for the [proposed contract](../../views/reports/requirement-chain.md).
Analysts can reproduce its lists; implementers must use the same cases for both
views. Tables specify normalized source records, not a second storage notation.
Materializing them requires the accepted schema and ordinary admission envelopes.
They do not claim that today's validators accept the proposed additions.

## 1. Identities and defaults

Use snapshot `example-1`, as-at **2026-09-24**, project `ACTION-ALPHA-1`, product
`PRODUCT-ALPHA-1`, release `RELEASE-ALPHA-2`. Names are respectively **Alpha
upgrade**, **Alpha**, **Alpha 2**. The other project/product names are **Beta
upgrade** and **Beta**. Each ID has exactly one record.

In tables, `R1` expands to `REQUIREMENT-CHAIN-1`, `V1` to
`VERIFICATION-CHAIN-1` (replace the terminal integer for other numbers), `N1/N2` to `NEED-CHAIN-1/2`, `DI/DE` to
`DRIVER-INTERNAL-1` / `DRIVER-EXTERNAL-1`, and `M` to
`OBSERVATION-MARKET-1`. A1/A2/A3 expand to `RELEASE-ALPHA-1/2/3`, B1/B2 to
`RELEASE-BETA-1/2`. These are document abbreviations only, never stored IDs.

All nonexception records are admitted in their stated zone on 2026-01-01, with
passing gate checks, a nonempty name/description, `valid_from: "2026-01-01"`,
`valid_to: null`, and a nonempty illustrative admission attribution. All dates
are strings. Each membership/source/decomposition/assignment table entry is its
own explicit relation, identified by kind and endpoint pair, with the default
window. An implementation must not infer a relation absent from these tables.
Both projects are ACTIONs with `type: Project`. Author `project_product` for
Alpha project → Alpha and Beta project → Alpha **and** Beta.

A1, A2 and A3 have `of: PRODUCT-ALPHA-1`; A2 has predecessor A1; A3 is a separate
branch with no predecessor. B1 and B2 have `of: PRODUCT-BETA-1`; B2 has predecessor
B1. Release version strings are opaque labels. B2 inherits R12 from B1.

M is a Field OBSERVATION holding the Market Research document descriptor:
`title: Market Research`, `uri: https://example.org/research/market`,
`revision: research-revision-1`. DI has `type: internal`; DE has `type: external`.
Both drivers have `source_trace` to M. N1 has `source_trace` to DI **and** M;
N2 has `source_trace` to DE. Each need references its own admitted stakeholder.
Repeated routes to M must not duplicate M or any requirement.

## 2. Requirement records

All rows have explicit `product_scope` to Alpha and `project_scope` to Alpha
project unless stated otherwise. A dash means absent, not an empty placeholder
requirement. Parent and serves entries use inline fields unless marked REL.

| Requirement | Level | Source/decomposition | `required_for` | Exception |
|---|---|---|---|---|
| R1 | stakeholder | serves N1 | A1 | Inherited by A2; no verification |
| R2 | system | parent R1 | A2 | Planned verification |
| R3 | software | parent R2; REL requirement_parent → R4 | A2 | Convergence; repeated executions |
| R4 | system | serves N2 | A2 | Inconclusive execution |
| R5 | system | — | A2 | Unsourced; other-release/unqualified executions only |
| R6 | stakeholder | source_trace → DI | A2 | Direct verification; system/software stages intentionally skipped |
| R7 | software | serves N1; parent REQUIREMENT-MISSING-1 | A2 | Broken parent; malformed protocol |
| R8 | absent | — | A2 | Unclassified, unsourced, no verification |
| R9 | system | serves N1 | — | Clean unassigned |
| R10 | software | serves N1 | A3 | Only another branch |
| R11 | system | serves N1 | RELEASE-MISSING-1 | Invalid assignment, not clean unassigned |
| R12 | stakeholder | serves N2 | B1 | Product Beta, project Beta only |
| R13 | system | serves N1 | A2 | Product Alpha, project Beta only |
| R14 | system | parent R15 | A2 | Cycle; no accepted source |
| R15 | system | parent R14 | A2 | Cycle; no accepted source |
| R16 | system | serves N1 | A2 | Requirement and assignment end 2026-08-31 |
| R17 | software | serves N1 | A2 | Requirement and assignment start 2026-10-01 |
| R18 | system | serves N1 | A1 and A2 | Nearest attachment is A2; retired failure |
| R20 | software | serves N1 | A2 | Malformed executed evidence |

Also author `depends_on` R2 → R5 and an ACTION/CHANGE implementation reference
addressing R5. They remain context and never make R5 an ancestor, descendant or
source of R2. No implied membership is obtained through that implementation path.

## 3. Verification records

Every row has `method: test`, nonempty protocol, default lifecycle and
`performed_at: "2026-09-20"` unless the table says otherwise. Executed rows have
a result narrative and a valid note evidence entry unless excepted. IDs are all
independent, including equal protocol text. V31/V32 deliberately have identical
protocol text and retain different definition/result identities.

| Record | verifies | verified_on | outcome | Exception |
|---|---|---|---|---|
| V2 | R2 | A2 | not_yet_run | No performed_at, result or evidence |
| V31 | R3 | A2 | pass | — |
| V32 | R3 | A2 | fail | Performed 2026-09-21, still active |
| V4 | R4 | A2 | inconclusive | Executed, not missing a result |
| V51 | R5 | A1 | pass | Other release, no carry-forward |
| V52 | R5 | absent | pass | Unqualified, no inferred release |
| V6 | R6 | A2 | pass | Evidence absent: warning, still executed |
| V7 | R7 | A2 | not_yet_run | Protocol is null; no performed_at/result/evidence |
| V12 | R12 | B2 | pass | Selected Beta 2 execution |
| V181 | R18 | A2 | fail | Performed 2026-09-01; valid_to 2026-09-23 |
| V182 | R18 | A2 | pass | Active |
| V20 | R20 | A2 | pass | evidence[0] canonical_ref → REQUIREMENT-MISSING-2 |
| V99 | REQUIREMENT-MISSING-3 | A2 | fail | Unattributable broken verifies target |

V181 is historical. V20's definition is valid, but its malformed execution cannot
satisfy the applicable-result metric. V7 does not establish a valid definition.
V99 stays in the diagnostic inventory; it cannot invent its missing requirement.

## 4. Exact release lists and six metrics

Set notation below is exhaustive; ranges expand to individual IDs under §1.
Counts are cardinalities of these lists, never counts of rows or paths.

| Population | Expected IDs | Count |
|---|---|---|
| Active product Alpha P | R1–R11, R13–R15, R18, R20 | 16 |
| Alpha 2, no project filter L | R1–R8, R13–R15, R18, R20 | 13 |
| Alpha project + Alpha 2 S | R1–R8, R14, R15, R18, R20 | 12 |
| Alpha 1, Alpha project | R1, R18 | 2 |
| Alpha 3, Alpha project | R10 | 1 |
| Beta project + Beta 2 | R12 | 1 |
| Clean unassigned product Alpha | R9 | 1 |
| Other-release-only relative to Alpha 2 | R10 | 1 |
| Invalid assignment product Alpha | R11 | 1 |
| Inactive Alpha requirements | R16, R17 | 2 |

R1 is attached at A1, depth 1 in A2. R18 is attached at A2, depth 0, retaining
both assignment records as provenance. R12 is inherited at depth 1 in B2.

| Stage within S | IDs | Count |
|---|---|---|
| Stakeholder | R1, R6 | 2 |
| System | R2, R4, R5, R14, R15, R18 | 6 |
| Software | R3, R7, R20 | 3 |
| Unclassified | R8 | 1 |

Without a project filter, add R13 to System: total 13, System 7. All remaining
stage lists stay identical. Product-unassigned has System `{R9}` and all other
stage lists empty. Those zeros are known, not substitutes for missing membership.

| Metric for selected Alpha project/Alpha 2 | Exact requirement IDs | Count |
|---|---|---|
| Broken references | R7, R14, R15, R20 | 4 |
| No accepted source path | R5, R8, R14, R15 | 4 |
| No valid verification definition | R1, R7, R8, R14, R15 | 5 |
| Verification without applicable executed result | R2, R5, R20 | 3 |
| Applicable failed verification | R3 | 1 |
| No effective release assignment (whole product) | R9 | 1 |

Without a project filter, only the third metric gains R13 (count 6). For Beta
project/Beta 2 all six metrics are empty: R12 has a valid need and applicable pass,
and Beta has no unassigned member. R3's pass never cancels its fail. R4's
inconclusive execution satisfies result presence. V6's missing evidence warning
is visible but R6 is in neither absence metric. R1 remains unverified despite
its descendant R3 having executions.

The selected-scope defective-reference list is exactly:
`R7.parent`, `R14.parent`, `R15.parent`, `V20.evidence[0].ref` (4 slots).
The complete known inventory additionally includes R11's `required_for.to`
(known affected requirement outside S) and `V99.verifies` (unattributable).
Thus there are 6 defective references in the catalogue: 4 selected-scope,
1 attributable outside scope, 1 unattributable. V7.protocol is a malformed scalar
finding, not a seventh reference. R14 and R15 are each affected by both cycle
edges; neither repeated reachability nor two owners doubles the slot count.

## 5. Exact trace selections

Use `.definition` and `.result` for the two display parts of a VERIFICATION ID.
A not-yet-run record has no executed-result node. Invalid and historical records
stay inspectable with their reasons, independently of metric eligibility.

| Focus/direction | Exact nodes |
|---|---|
| R2 downstream | R2, R3, V2.definition, V31.definition, V31.result, V32.definition, V32.result |
| R2 upstream | R2, R1, N1, DI, M |
| R2 both | Union of the previous two lists, distinct identities (11 nodes) |
| V32.result upstream | V32.result, V32.definition, R3, R2, R4, R1, N1, N2, DI, DE, M |
| R6 downstream | R6, V6.definition, V6.result |
| R14 both | R14, R15, both explicit cycle edges and their findings |

R2 both excludes R4, N2, DE, R5, R6, R7, R9 and all other siblings through R1/N1/M;
it also excludes V31/V32's other ancestors through R4. Upstream from V32 does
include R4, but excludes V31 and its result. No fake pair R2 → V4 is created by
convergence. The R7 broken reference is a visible edge stub, not a real requirement.

The unfocused selected matrix has the 12 requirements in S, plus sources
`{M, DI, DE, N1, N2}`; definitions
`{V2, V31, V32, V4, V51, V52, V6, V7, V181, V182, V20}.definition`;
and results `{V31, V32, V4, V51, V52, V6, V181, V182, V20}.result`.
That is 37 addressable nodes plus diagnostic stubs. V7 is marked invalid;
V181 historical; V51 other-release; V52 unqualified; V20 malformed evidence.
V99 and R11's records are available in the separate diagnostic inventory.

## 6. Independent control variants

Each variant starts from example-1; mutations do not accumulate. Unmentioned
lists remain as in §4. Use both full and pair modes against the same projection.
These positive and negative cases are part of the oracle, not optional examples.

| Control / change | Expected effect |
|---|---|
| Valid scope vs select Alpha project + Beta product/B2 | Base resolves; changed pair is invalid (no project_product pair). Totals unavailable, not zero. |
| Select Alpha product + B2 | Wrong release subject; no valid scope or fabricated empty counts. |
| No project supplied | L has 13 IDs; project shows unselected; no inferred Alpha project. Product or release absent gives unselected scope, not repository-wide fallback. |
| Remove R9 product_scope | R9 unresolved membership; known P drops to 15, total completeness unknown; unassigned total unknown, not 0. |
| Break R13 project_scope target | No guessing from the action implementation path; L stays 13 known product members, project-filtered completeness is unresolved. |
| Delete Alpha project → Alpha project_product | Selected pair becomes unmodelled; no valid project-filtered total. |
| Give R11 a valid A2 assignment as well | Invalid-assignment flag remains; R11 joins S and no-verification, not unassigned; broken-reference requirements gain R11. |
| Repair R11's assignment target to A3 | Invalid assignment clears; other-release-only becomes {R10,R11}; no selected-scope metric change. |
| Delete R10's A3 assignment | Clean unassigned becomes {R9,R10}; S unchanged. |
| Close R1's A1 assignment on 2026-09-24 / on 2026-09-23 | Equal end remains active; earlier end excludes R1 from L/S but retains it as upstream context for R2/R3. No-verification loses R1; product-unassigned gains R1. |
| Close only R18's A2 assignment on 2026-09-23 | R18 remains via A1 at depth 1; counts unchanged. |
| Shift as-at to 2026-10-01 | R17 joins S, Software, no-verification. R17 is sourced via N1. Other baseline contributors stay. |
| Shift as-at to 2026-08-31 | S gains R16 (13). Broken and no-source lists unchanged; no-verification gains R16 (6); no-result is {R2,R3,R4,R5,R6,R18,R20} (7); failed is empty; unassigned remains {R9}. All recorded executions are still future. On 2026-09-01 R16 drops and V181 becomes applicable. |
| Duplicate R18's A2 assignment / duplicate N1 → M citation | Requirement and source counts unchanged; retain both authored relation identities; nearest remains depth 0. |
| Make A1 predecessor A2 | Cycle visible, walk terminates; known obligations remain inspectable with incomplete release-chain status. |
| Make A2 predecessor B1 / missing release | Invalid predecessor, no cross-product traversal or guessed missing ancestry; scope incomplete. |
| Add REL parent R2 → R1 alongside inline parent | One logical decomposition edge, two record identities. Closing REL alone leaves inline trace intact. |
| Remove R3 → R4 REL parent | R3 remains via R2; V32 upstream loses R4,N2,DE, with all other listed nodes retained. |
| Add serves N1 to R14 | Both R14 and R15 gain an accepted source path; no-source becomes {R5,R8}; cycle remains a defect for both. |
| Repair R7.parent to R1 and protocol to nonempty text | R7 leaves broken-reference and no-verification sets; enters no-result because its record is still not_yet_run. |
| Put M in R5.derived_from | Forbidden endpoint, not a source path: R5 stays unsourced and joins broken-reference requirements. |
| Add an admitted POLICY with valid envelope and R5.derived_from pointing to it | Permitted codex source: no-source becomes {R8,R14,R15}; unlike the Field-target negative case, no broken-reference finding is added. |
| Add valid R5 source_trace → M | No-source becomes {R8,R14,R15}; release/evidence metrics unchanged. |
| Replace M descriptor with a URI only / delete M | Descriptor error / dangling source links stay visible. N1 and the drivers still provide accepted sources, so known no-source IDs do not gain their descendants. |
| Change R8.level to an unknown string | Still unclassified for display; invalid-level finding; no invented stage or omission. |
| Change V2 to inconclusive with a valid execution | No-result loses R2; no failed metric gained; optional absent result narrative alone does not block execution. |
| Change V51.verified_on from A1 to A2 | No-result loses R5; V52 alone never qualifies. This is a fixture mutation, not an authoring shortcut for moving old evidence. |
| Close V32 on 2026-09-23 | Failed metric becomes empty; V31 remains applicable. A later pass alone, without lifecycle withdrawal, has no such effect. |
| Extend V181.valid_to to 2026-09-24 | Applicable failed set becomes {R3,R18}; inclusive end matters. |
| Repair V20.evidence[0] to valid note / remove evidence | R20 leaves broken-reference and no-result lists in both variants; absent evidence leaves a warning. |
| Set V31 and V32 outcomes to invalid strings | Both definitions remain; R3 enters no-result and leaves failed metric; malformed outcomes remain visible. |
| Give V6 performed_at tomorrow / malformed date | R6 enters no-result; a future or malformed execution cannot qualify. Absent date instead preserves execution with the absence warning. |
| Repair V99.verifies to R8 | Unattributable reference clears; R8 leaves no-verification and joins failed; source absence remains. |
| Add a second product_scope R9 → Beta and required_for R9 → B2 | Alpha unassigned stays {R9}; Beta population gains R9 with a valid assignment. This is not a wrong-product assignment because membership in both products is explicit. |
| Duplicate a catalogue ID / corrupt an assignment window | Diagnostic and affected scope incomplete; never choose an arbitrary duplicate or assume an unbounded valid window. A well-formed inclusive window preserves the base result. |
| Rewrite a name without changing an ID | Lists and graph identities unchanged; labels refresh. No name-based link appears. |
| Switch full → pair; advance Source/Driver → Driver/Need | Exactly one column advance; focus, direction, S and all metric lists unchanged. Final pair disables right; first pair disables left. Empty stages stay selectable. |
| Focus R6 in pair mode on System/Software | Empty pair remains visible; direct stakeholder-to-definition link stays identifiable as crossing the hidden columns. Never create filler nodes or jump columns. |
| Refresh snapshot to example-2: add R8 serves N1 | No-source becomes {R5,R14,R15}; other metric lists unchanged. Matrix adds the real edge in the same snapshot as the counts. |
| Change M revision to research-revision-2 only | Both report provenance values refresh; ID sets unchanged. No changed-after-verification verdict is invented. |
| Fail source loading after refresh | Previous snapshot explicitly stale or unavailable; never show fresh zero totals or mixed-snapshot lists. |
| Paginate/virtualise the full 37-node matrix | Same 37-node inventory and all edge IDs; viewport changes do not truncate the population or change drill-down lists. |

A consumer's test evidence must distinguish this oracle's exact semantic assertions
from UI navigation and installed-package observations. Passing one does not prove
the others. No expected-stage completeness score or aggregate pass percentage is
implied by this example.
