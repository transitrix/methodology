# Numerical risk scoring — synthetic catalogue

This example accompanies the [numerical risk scoring guide](../../../guides/numerical-risk-scoring.md). Model authors can copy its extension structure and replace the scheme, evidence and judgements with their own. All records, dates, admission gates and evidence are fictional; `example: true` marks the model elements.

The original qualitative example is [RISK](canon/elements/01_motivation/risks/RISK-CHECKOUT-1.yaml). The catalogue also contains its threatened [DRIVER](canon/elements/01_motivation/factors/DRIVER-CHECKOUT-1.yaml), accountable [ROLE](canon/elements/02_business/roles/ROLE-CHECKOUT-1.yaml), and treatment [REQUIREMENT](canon/elements/01_motivation/requirements/REQUIREMENT-FAILOVER-1.yaml). No external catalogue is needed to resolve those IDs. The relative extension `definition` reference resolves from the RISK file to the guide; update it when copying the example.

Both treatment states belong to one assessment dated 2026-09-20, concerning 2026-10-01 through 2027-09-30. They are counterfactual estimates for the same event and horizon, not two chronological observations. The post-treatment estimate is conditional. The scores are `4 * 5 = 20` and `2 * 4 = 8`; the required qualitative fields remain high/high/medium under the guide's optional mapping.

## Numeric-degree examples

- [RISK-CHECKOUT-2](canon/elements/01_motivation/risks/RISK-CHECKOUT-2.yaml):
  shared 1–5 default for likelihood/impact, residual-only 1–25 override; supplied
  after-treatment inputs 2 and 4 give the local composite 8.
- [RISK-CHECKOUT-3](canon/elements/01_motivation/risks/RISK-CHECKOUT-3.yaml):
  independent probability, severity and exposure scales with no default; fractional
  inputs 0.25 and 4.5 give 1.125. Zero is allowed by this local scheme's bounds.

Both are complete synthetic records sharing the catalogue's existing role, driver
and treatment requirement. They retain explicit admission/lifecycle context and
scheme/version/formula/input bindings. Their guide-relative definition resolves
from each file. No reference or admission asserts real operational acceptance.
The [guide](../../../guides/numerical-risk-scoring.md#direct-numeric-degrees-and-independent-scales)
distinguishes factor ratings, composites, missing inputs and locally inconsistent
cached scores. No arithmetic checker is shipped.

## Verification

From the repository root, run `node scripts/check-notations.mjs` for documentation invariants. A repository validator can inspect the catalogue with:

```sh
npx @transitrix/cli@2.9.2 validate --scope=repo --root notations/examples/risk-scoring --json
```

The command above is historical tooling guidance, not override-support evidence.
Consumers must support the per-indicator contract before validating the expanded
catalogue; an old consumer ignoring the mapping does not implement it. No package
version is promised by these source examples. Review the exact validator's coverage
as well as its result. A successful core validation does not validate the shape, bounds, evidence or arithmetic nested in `extensions.risk_scoring`. The guide defines the separate local checks and report derivation responsibilities. No local scheme checker is bundled with this example.

Historical evaluation of the original four-record qualitative catalogue with CLI 2.9.2 produced these results (not a run against the added numeric examples):

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
