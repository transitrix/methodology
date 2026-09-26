---
title: Numerical risk scoring with an extension
status: active
last_reviewed: 2026-09-20
audience: public
license: MIT
---

# Numerical risk scoring with an extension

Keep the required qualitative `RISK` fields and store a local scoring scheme under `extensions.risk_scoring`. This guide demonstrates one optional convention using a [complete synthetic catalogue](../notations/examples/risk-scoring/README.md). It introduces no primitive fields, mandatory formula, or core arithmetic validator.

[RISK](../notations/ELEMENT_PRIMITIVES.md#726-risk--01_motivationrisks) requires `likelihood`, `impact`, `residual`, `owner_role` and nonempty `threatens`. Treatment obligations belong in `treated_by`. The [open extensions contract](../notations/CONTRACT.md#12-extensions--open-attribute-bag) accepts arbitrary nested YAML values, while defined fields retain their normal positions and constraints. The extension shares its host's admission and lifecycle.

## Define the scheme before recording scores

The example's scheme is **`checkout-ps`, version `1.0`**, defined by this section. It concerns at least one checkout interruption during the stated twelve-month horizon. The probability estimate is a fraction from 0 to 1; the probability rating is an integer from 1 to 5. Severity is the estimated interruption duration if the event occurs, expressed as nonnegative hours and mapped to an integer rating from 1 to 5. Higher ratings mean more exposure.

| Rating | Probability estimate `p` in the horizon | Interruption duration `h` if the event occurs |
| --- | --- | --- |
| 1 | `0 <= p <= 0.01` | `0 <= h <= 0.25` |
| 2 | `0.01 < p <= 0.10` | `0.25 < h <= 0.50` |
| 3 | `0.10 < p <= 0.30` | `0.50 < h <= 1` |
| 4 | `0.30 < p <= 0.60` | `1 < h <= 4` |
| 5 | `0.60 < p <= 1` | `h > 4` |

`score = probability_rating * severity_rating`, with integer inputs, no rounding, and a range of 1–25. These are ordinal ratings: a score of 20 does not mean twice the expected loss of a score of 10. A zero probability estimate still maps to rating 1 in this example; zero is not a rating or a score. Missing or unknown factors remain unknown and prevent calculation; never substitute zero.

Call the result a **local priority score**. Probability × Severity is not a universal definition of RPN. A scheme using a detectability factor, another time horizon, or different thresholds has different semantics. Do not compare or aggregate its scores as though they used this scheme. Changing the formula, factor meanings, ranges or mapping requires a new local scheme version and reassessment; retain the old record for historical reports.

## Record both treatment states and their evidence

The [RISK record](../notations/examples/risk-scoring/canon/elements/01_motivation/risks/RISK-CHECKOUT-1.yaml) stores the scheme/version, definition reference, formula, assessment date, assessor, event and horizon, plus both factor sets and cached scores. Its evidence notes are explicitly fictional assumptions and observations, not real test results.

| State | Probability estimate → rating | Duration → severity rating | Recomputed score | Evidence basis |
| --- | --- | --- | --- | --- |
| Before treatment | 0.40 → 4 | 6 hours → 5 | `4 * 5 = 20` | Synthetic baseline planning estimate and recovery walkthrough |
| After treatment, conditional | 0.08 → 2 | 2 hours → 4 | `2 * 4 = 8` | Synthetic failover exercise and separately stated annual probability assumption |

The numerical reduction is 12 score units. It is not evidence of a 60% reduction in real-world harm. The fictional exercise supports a duration estimate; it does not establish the annual event probability. The residual values are conditional on `REQUIREMENT-FAILOVER-1` being in effect. Merely referencing that requirement proves neither implementation nor effectiveness; its agreement remains `draft` in this teaching catalogue.

For a real assessment, record traceable evidence references, dates, assumptions, assessor and the treatment configuration assessed. Keep planned residual estimates distinguishable from observations after implementation. If evidence is unavailable or treatment changes, the risk owner reviews the estimate instead of letting an old score silently become current.

## Optional qualitative mapping

This example chooses a local mapping; core defines no numerical mapping. Map **before-treatment probability rating** to `likelihood` and **before-treatment severity rating** to `impact`: ratings 1–2 → `low`, 3 → `medium`, 4–5 → `high`. Map the **after-treatment score** to `residual`: 1–4 → `low`, 5–9 → `medium`, 10–25 → `high`.

Thus the required fields stay `likelihood: high`, `impact: high`, `residual: medium`. `impact` is untreated severity, whereas `residual` is remaining exposure; they are different quantities. Adopters may keep independent qualitative judgements instead, provided they explain any difference from their numerical scheme. Never relocate these fields into the extension or replace their enum strings with numbers.

## Validation, recomputation and reporting responsibilities

| Layer | Responsibility | What a pass establishes |
| --- | --- | --- |
| Core shape and references | The model validator checks its supported RISK/envelope rules, qualitative enums and references. CONTRACT §12 permits nested extension values without constraining their shape. | Core conformance within that validator's coverage; no scoring assurance. Check coverage and skipped files for the exact tool/version used. |
| Local scheme checks | The adopter's scheme owner defines checks; the risk owner supplies evidence. Check the exact scheme/version, finite estimates, bounds, integer ratings, threshold mappings, identical event/horizon across states, treatment references and evidence. Recompute both scores and reject mismatched caches. | Consistency with the local scheme, not truth of the estimates or treatment effectiveness. |
| Report derivation | The report author selects an effective RISK version and assessment, resolves the scheme definition, runs local checks and recomputes each displayed score from factors. Include scheme/version, treatment basis and evidence references in the output. | A traceable projection of the selected model inputs. Core does not generate this risk table automatically. |

A local checker should reject `probability_rating: 6`, a fractional rating, a missing factor, an unknown scheme version, a mismatched threshold mapping, or `score: 21` beside factors 4 and 5. Core pass-through of any of those extension values is not a local-check pass. A report should mark a record invalid or unscored when these checks fail, rather than silently repair the admitted record.

Treat stored scores as caches. Recompute on factor, scheme, horizon, evidence or treatment changes; have the accountable owner review and admit the revised assessment. Preserve lifecycle history under the [existing contract](../notations/CONTRACT.md#7-primitive-lifecycle). Reports record the source revision, assessment date and scheme version so later recalculation does not rewrite an earlier issued result.

## Compatibility and limits

The open bag is sufficient for this bounded example: it retains both assessments and evidence without changing RISK semantics. No new core field or normative scoring rule is proposed. Standardizing a shared scoring contract, changing qualitative requirements, or requiring arithmetic validation would need a separate methodology decision.

The guide and catalogue are documentation/source examples. Their fictional admission and evidence records do not certify an operating system. Arithmetic checks, schema checks, implementation support and a published release are separate claims; passing one does not establish the others. See the [example's verification notes](../notations/examples/risk-scoring/README.md#verification) for the concrete evaluation.
