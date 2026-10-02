# Requirements subject scope — synthetic oracle

**Normalized records for the accepted `requirement-chain/0.3` contract.** These
cases accompany the [subject-scope contract](../../views/reports/requirement-subject-scope.md).
They extend the [unchanged 0.2 oracle](../requirement-chain/README.md) by explicit
substitution, not by reconstructing its records or introducing a storage format.
Analysts use the exact lists to interpret report scope. These normalized examples
specify consumer behavior; they are not directly loadable catalogue files. Tool
support for the added kinds and values must be declared by the pinned versions.

## Four independent cases

Each case starts with **every record, absence, window, finding, expected list and
independent control in the 0.2 oracle**, including its listed R and V records
(abbreviations expand exactly as there). Cases are separate catalogue snapshots;
IDs reused between cases never coexist. Date remains 2026-09-24. All record
admission and lifecycle defaults remain unchanged. Apply these substitutions
simultaneously to every record and expected result, including controls:

| Case / snapshot | Alpha subject replacing PRODUCT-ALPHA-1 | Beta subject replacing PRODUCT-BETA-1 | Membership and pair kinds |
|---|---|---|---|
| Internal application / subject-app-1 | APPLICATION-ALPHA-1, `type: application`, name Internal planning application | APPLICATION-BETA-1, `type: application` | Replace `product_scope` with `application_scope`; `project_product` with `project_application`. |
| Internal product / subject-internal-1 | PRODUCT-ALPHA-1, `type: service`, name Internal records service | PRODUCT-BETA-1, `type: service` | Keep both existing kinds. |
| Physical product / subject-physical-1 | PRODUCT-ALPHA-1, `type: physical_product`, name Sample sensor | PRODUCT-BETA-1, `type: physical_product` | Keep both existing kinds; use the additive PRODUCT value from P3. |
| SaaS / subject-saas-1 | PRODUCT-ALPHA-1, `type: digital_product`, name Sample hosted planning product | PRODUCT-BETA-1, `type: digital_product` | Keep both existing kinds. |

Names describe use, not additional authored fields. Release IDs A1–A3/B1–B2,
project IDs and all requirement/verification/source IDs stay unchanged. `of`
follows the substituted subject exactly. All memberships remain explicit. For
SaaS only, also add admitted APPLICATION-SAAS-1 (`type: application`), listed
in Alpha's `supporting_apps`, with `products: [PRODUCT-ALPHA-1]`, and
RELEASE-SAAS-1 with `of: APPLICATION-SAAS-1`, no predecessor and version `1`.
Give these records the oracle's ordinary envelope. No requirement memberships,
assignments or verifications for that application are implied.

For synthetic REL source identity, use a stable tuple `(kind, from, to)` as the
baseline tables do. An extra duplicate is distinguished by suffix `duplicate-1`.
Materialized REL files must receive ordinary unique REL IDs and preserve that
mapping in provenance. Tuple shorthand never becomes an authored field or TYPE.

## Exact baseline results for each case

These expected sets apply separately to all four cases for a consumer implementing
0.3. A consumer that does not support a subject, kind or value must expose unsupported
scope rather than return these numbers or silently reinterpret the records.

| Population | Exhaustive IDs |
|---|---|
| P | R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11,R13,R14,R15,R18,R20 |
| L, Alpha 2, no project | R1,R2,R3,R4,R5,R6,R7,R8,R13,R14,R15,R18,R20 |
| S, Alpha project, Alpha 2 | R1,R2,R3,R4,R5,R6,R7,R8,R14,R15,R18,R20 |
| Clean unassigned | R9 |
| Other-release-only | R10 |
| Invalid assignment | R11 |
| Unresolved membership | Empty, given this complete synthetic baseline |
| Inactive | R16,R17 |
| Alpha 1, Alpha project | R1,R18 |
| Alpha 3, Alpha project | R10 |
| Beta 2, Beta project | R12 |

| Stage in S | Exhaustive IDs |
|---|---|
| Stakeholder | R1,R6 |
| System | R2,R4,R5,R14,R15,R18 |
| Software | R3,R7,R20 |
| Unclassified | R8 |

| Metric in contract order | Exact IDs for Alpha project / Alpha 2 |
|---|---|
| Broken references | R7,R14,R15,R20 |
| No accepted source path | R5,R8,R14,R15 |
| No valid verification definition | R1,R7,R8,R14,R15 |
| Verification without applicable executed result | R2,R5,R20 |
| Applicable failed verification | R3 |
| No effective release assignment, whole subject | R9 |

Without project, add R13 to S/System and the third metric only. All Beta 2 / Beta
project metrics are empty. Definition/result stage IDs, the 37-node unfocused
matrix, exact focus selections and all six defective-reference slots remain the
0.2 lists unchanged. R1 inherits at depth 1; R18 selects its depth-0 attachment
while retaining both source relations. V31 pass and V32 fail coexist; V4 is
executed inconclusive; V51/V52 are contextual; R1 has no definition despite R3's
executions. These assertions apply to the application case as well as products.

## Additional independent controls

Each row starts afresh from its named case; inherited 0.2 controls also run after
substitution. Unmentioned results are derived by the same contract; the exact
effects below do not license ignoring diagnostics outside the selected scope.

| Control | Expected result |
|---|---|
| Application: remove R9 application_scope | Known P = baseline P minus R9; unresolved membership = {R9}; known clean-unassigned = {}; its total null, not 0. Known S and first five sets unchanged, with affected completeness exposed. Restoring the relation restores {R9} and complete total 1. |
| Application: duplicate R1 membership, project membership and A1 assignment | P/L/S and all metric IDs unchanged; retain duplicate source identities; R1 still depth 1. Removing duplicates restores baseline provenance without changing counts. |
| Application: select Beta 2 with Alpha subject | Wrong owner; scope unavailable, all six totals null. Selecting Alpha 2 restores baseline. |
| Application: remove Alpha project's project_application to Alpha | Filtered scope unavailable. Unfiltered L remains the listed 13 IDs; no guessed project. Restoring pair restores S. |
| Application: replace R11's missing release target with B2 | Invalid assignment remains {R11}; unassigned remains {R9}; S and six sets unchanged. B2's owner is not R11's membership. Adding explicit R11 membership to Beta makes this a contextual assignment for Alpha; Alpha clean-unassigned becomes {R9,R11}, invalid becomes {}. |
| Application: give R11 an additional A2 assignment, retain missing target | S gains R11; broken gains R11; no-definition gains R11. Invalid remains {R11}, unassigned remains {R9}; no-source, no-result and fail unchanged. |
| Application: set R1 A1 attachment valid_to to query date | R1 remains in L/S on 2026-09-24; at 2026-09-25 it leaves L/S and becomes unassigned alongside R9. R1 leaves no-definition; other first-five IDs unchanged. Restore null to recover baseline. |
| Application: end R18 A2 attachment 2026-09-23 | R18 stays in S through A1 at depth 1. All six metric sets unchanged; V182 still explicitly verifies A2. Ending A1 attachment too removes R18 from S and adds R18 to unassigned. |
| Application: A2 predecessor becomes B1 | Stop before B1; R12 never enters known L. Known L = baseline L minus R1; known S = baseline S minus R1; totals affected by the invalid chain are null. R18 remains direct at depth 0. Restore A1 for complete baseline. |
| Application: R9 assignment has valid_from `not-a-date` | Known clean-unassigned excludes R9; invalid-assignment flag includes R9, window activity unresolved, diagnostic retained, unassigned total null. Do not turn malformed dates into an active or absent obligation. Removing malformed relation restores baseline. |
| Application: add valid V53 verifying R5 on A2 with pass, ordinary execution defaults | No-result becomes {R2,R20}; definition/result nodes gain V53. Changing only verified_on to A1 or removing it restores no-result {R2,R5,R20}; V53 stays contextual. |
| Application: set V32 performed_at to 2026-10-01 | Applicable fail = {}; R3 remains executed via V31; all other metric sets unchanged. Future-date finding retained. Restore 2026-09-21 to recover fail {R3}. |
| SaaS: select APPLICATION-SAAS-1 / RELEASE-SAAS-1 | Proven complete empty application membership gives P=L=S={}, all six empty, complete totals 0. Product support links do not transfer Alpha requirements. A failed membership-file read instead makes scope incomplete and totals null. |
| SaaS: add explicit application_scope R3 → APPLICATION-SAAS-1 and required_for R3 → RELEASE-SAAS-1 | Application P=L=S={R3}, stage Software={R3}. Metrics: broken={}, no-source={}, no-definition={}, no-result={R3}, fail={}, unassigned={}. V31/V32 remain product-release evidence. Parent context R2,R4,R1 and their sources is traversable, never included in S. Product baseline unchanged. |
| Previous SaaS control plus valid V301 verifying R3 on RELEASE-SAAS-1 with pass | Application no-result becomes {}; other five sets unchanged. Product fail remains {R3}; no result crosses subjects. R1 still lacks its own definition. |

Consumers must expose known contributing IDs alongside null totals when reads,
membership or predecessor validation are incomplete. A loader returning an empty
array after an error fails these controls. Equivalent headless, matrix and release
views must compare IDs and diagnostics, not just cardinalities.
