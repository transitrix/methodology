# Direct person reporting — synthetic specification example

This catalogue illustrates [`reports_to`](../../../elements/17-relations.md#34-reports_to--direct-person-reporting).
Every person, admission and relationship is synthetic. Consumers can load the
six YAML records under `canon/` without reconstructing a model from prose.
The oracle below is also the expected-result contract for consumer tests.
It specifies behavior; it does **not** claim an available reporting query CLI,
released validator support, or that the current generic listing and trace
implementations enforce this contract. The existing `7.0.0` manifest pin is
unchanged; use the vocabulary at the specification revision containing this
example. An older artifact at that pin can reject the added kind. Record the
exact specification revision and consumer version when testing conformance.

## Records and dated oracle

A, B and C abbreviate `ACTOR-SYN-A-1`, `ACTOR-SYN-B-1` and `ACTOR-SYN-C-1`.
R1, R2 and R3 abbreviate `REL-SYN-REPORTING-1`, `REL-SYN-REPORTING-2` and
`REL-SYN-REPORTING-3`. All actors are admitted persons effective from January 1,
2026 with no end. Each relation is independently admitted.

| REL | Pair | Inclusive window |
|---|---|---|
| R1 | A → B | 2026-01-01 through 2026-06-30 |
| R2 | A → C | 2026-06-01 through unbounded |
| R3 | A → B | 2026-08-01 through unbounded |

Reproduce each row by selecting admitted, resolved `reports_to` records whose
window contains D and fits both active endpoint lifecycles. Group by resolved
person identity, keep all contributing REL IDs, and sort identities and IDs.
Reverse lookup selects the same records by `to`; it stores no inverse REL.
These are direct queries, with no inferred or transitive management links.

| D | managers(A), with evidence | directReports(B), with evidence | directReports(C), with evidence | Health |
|---|---|---|---|---|
| 2026-05-31 | B: [R1] | A: [R1] | empty | No reporting warning |
| 2026-06-01 | B: [R1], C: [R2] | A: [R1] | A: [R2] | REL-013 warning |
| 2026-06-15 | B: [R1], C: [R2] | A: [R1] | A: [R2] | REL-013 warning |
| 2026-06-30 | B: [R1], C: [R2] | A: [R1] | A: [R2] | REL-013 warning |
| 2026-07-01 | C: [R2] | empty | A: [R2] | No reporting warning |
| 2026-08-01 | B: [R3], C: [R2] | A: [R3] | A: [R2] | REL-013 warning |

`managers(B)`, `managers(C)` and `directReports(A)` are empty on these dates.
Empty means no reporting relationship recorded. The matrix remains valid when
REL-013 fires. An all-history health scan finds overlap windows June 1–30 and
August 1 onward. R3 is recurrence, not a duplicate to discard during ingestion.

For the duplicate-evidence control, copy R1 to a distinct R4 with the same pair
and window. On May 31, managers(A) is B with [R1, R4] and **no REL-013**. On June
15 it is B with [R1, R4] and C with [R2], with REL-013 for two people, not three
records. Reverse evidence agrees. Supported aliases of B still count as B.

## Acceptance vectors

Apply each mutation independently to the base catalogue, retaining full
admission and lifecycle records unless the vector explicitly changes them.
Diagnostics retain field/endpoint context; graph failures retain incident
records. These are normative expectations for dependent mechanical tests,
not results from a runtime validator supplied by this example.

| Vector | Expected result |
|---|---|
| Base matrix; optionally B→C while A→B and A→C hold | Valid matrix DAG. Multiple managers alone is not a cycle; health emits REL-013 for A. |
| Each endpoint separately changed to an admitted ACTOR(business_unit), ACTOR(system), or ROLE | REL-002 error with REL ID, endpoint field, referenced ID and expected/actual TYPE/subtype. ACTOR ID grammar alone is insufficient. |
| Each endpoint separately unknown or unadmitted | REL-002 error with unresolved/unadmitted reason. No valid pair may use it. |
| Unreadable file or incomplete catalogue | Explicit incomplete result and diagnostics, never clean health or a definitive empty report. Preserve any partial-result qualification. |
| `to: [B, C]` (using full IDs), or another wrong field shape | SCHEMA_INVALID with field context; use separate binary records for a matrix. |
| Missing/malformed `from` or `to`; missing/unknown `type` | REL-002 for endpoint defects; REL-001 for missing/unknown kind. Structural schema errors retain field context. |
| A→A; A→supported alias resolving to A | REL-011 error, naming relation and resolved person. No self-link disguised by aliases. |
| Add B→C and C→A during June | REL-012 error for A→B→C→A, with ordered actor path, incident REL IDs and an effective witness date/window. |
| Isolate A→B ending June 30 and B→A starting July 1 | Valid disjoint history; no REL-012. Historical union alone must not trigger a cycle. |
| Same two edges, second starts June 30 | REL-012 error with June 30 witness. Both boundaries are inclusive. |
| Relation start=end June 15 | Valid one-day link, present June 15 and absent June 14/16. |
| Future start with null end; expired end | Excluded before start or after end; null does not override start. Historical query inside the window includes the link. |
| Missing/invalid start; invalid end; end before start | LIFECYCLE-001/002/003 retain their respective meanings. Missing required `valid_to` produces SCHEMA_INVALID with field context. Equal dates remain valid. |
| Relation starts before either endpoint, ends after either endpoint, or null end with finite endpoint end | REL-003 error identifying endpoint and out-of-bounds interval. No clipping. Repeat for each endpoint independently. |
| Relation bounds exactly equal to both endpoint bounds | Valid containment, including both boundary days. |
| Draft/unadmitted REL between admitted actors | No reporting claim. Endpoint admission does not admit the relation; admission diagnostics remain applicable. |
| Admitted REL to a draft actor; future/expired actor at D | Unadmitted endpoint is REL-002; an inactive endpoint contributes no pair. Containment violations remain REL-003. |
| Same pair in disjoint windows, including R1 and R3 | Preserve both identities and windows. Ingestion must retain recurrence; no evidence from an inactive window contributes at D. |
| Overlapping same-pair evidence, including aliases of one manager | One logical pair with every contributing REL ID; no multi-manager warning from duplicates alone. |
| Canonical inline `manager` or `reports_to` on ACTOR | ACTOR-003/REL-004 with field context and instruction to author a REL. Arbitrary `extensions:` retain EXT-001 pass-through and confer no reporting authority. |
| Existing employment person→unit with roles; unit_parent unit→unit | Existing meaning, validation and temporal queries unchanged; no reporting inferred. Person→person employment and person endpoints on unit_parent remain invalid. |
| No employment, same-unit, or shared-employer record | Valid person→person reporting; these are not prerequisites. |
| Draft, future, expired, malformed or unresolved records in views | No fabricated valid reporting claim. Listing and trace agree at the same date; errors and incomplete populations remain visible. |

`REL-011` (self-link error), `REL-012` (temporal-cycle error), and `REL-013`
(multi-manager warning) are newly allocated identities. Existing diagnostics
keep their meanings/severities and stored history under
[CONTRACT §18.7](../../../CONTRACT.md#187-versioned-diagnostic-identity).
The additive vocabulary/specification change requires a MINOR release when
packaged; this example does not release, install or certify a consumer. Older
pinned validators may reject `reports_to`; token recognition alone does not
satisfy these acceptance vectors. Core ingestion coverage is unchanged.
