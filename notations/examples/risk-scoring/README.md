# Numerical risk scoring — synthetic catalogue

This example accompanies the [numerical risk scoring guide](../../../guides/numerical-risk-scoring.md). Model authors can copy its extension structure and replace the scheme, evidence and judgements with their own. All records, dates, admission gates and evidence are fictional; `example: true` marks the model elements.

The catalogue contains one [RISK](canon/elements/01_motivation/risks/RISK-CHECKOUT-1.yaml), its threatened [DRIVER](canon/elements/01_motivation/factors/DRIVER-CHECKOUT-1.yaml), accountable [ROLE](canon/elements/02_business/roles/ROLE-CHECKOUT-1.yaml), and treatment [REQUIREMENT](canon/elements/01_motivation/requirements/REQUIREMENT-FAILOVER-1.yaml). No external catalogue is needed to resolve those IDs. The relative extension `definition` reference resolves from the RISK file to the guide; update it when copying the example.

Both treatment states belong to one assessment dated 2026-09-20, concerning 2026-10-01 through 2027-09-30. They are counterfactual estimates for the same event and horizon, not two chronological observations. The post-treatment estimate is conditional. The scores are `4 * 5 = 20` and `2 * 4 = 8`; the required qualitative fields remain high/high/medium under the guide's optional mapping.

## Verification

From the repository root, run `node scripts/check-notations.mjs` for documentation invariants. A repository validator can inspect the catalogue with:

```sh
npx @transitrix/cli@2.9.2 validate --scope=repo --root notations/examples/risk-scoring --json
```

Review the exact validator's coverage as well as its result. A successful core validation does not validate the shape, bounds, evidence or arithmetic nested in `extensions.risk_scoring`. The guide defines the separate local checks and report derivation responsibilities. No local scheme checker is bundled with this example.

Bounded evaluation with CLI 2.9.2 produced these results:

| Input | Result |
| --- | --- |
| Catalogue as supplied | Exit 0, `valid: true`, no skipped files; three coverage warnings below |
| Copy with before-treatment `score: 21` | Still passes core validation; fails local recomputation (`4 * 5 = 20`) |
| Copy with `probability_rating: 6` | Still passes core validation; outside the local 1–5 range |
| Copy with `likelihood: extreme` | Exit 1, RISK-002 |
| Copy without `residual` | Exit 1, RISK-001 |
| Copy with an unresolved `treated_by` ID | Exit 1, RISK-004 |

The supplied catalogue emits FGCA-012 (no goal references the driver), GAP-REQ-NO-ASSERT (no assertion targets the requirement) and REQ-VERIF-COVERAGE-001 (no verification targets the requirement). These reflect its limited teaching scope. The example makes no assertion of compliance or verified treatment effectiveness, and does not add unrelated records merely to suppress warnings.

Separate local evaluation checked record envelopes and references, both threshold mappings, qualitative mappings and score arithmetic. Negative controls for an out-of-range rating, fractional rating, incorrect score, mismatched probability mapping, unknown scheme version and missing factor were rejected. These are bounded example checks, not a shipped general-purpose validator or release certification.
