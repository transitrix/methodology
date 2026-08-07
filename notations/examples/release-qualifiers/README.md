# Release qualifiers on claims — worked example

A small, generic fixture exercising the two optional release qualifiers a compliance or verification claim can carry — `ASSERTION.subject_release` ([`16-assertion.md`](../../elements/16-assertion.md) §2.4) and `VERIFICATION.verified_on` ([`27-verification.md`](../../elements/27-verification.md) §2.1) — against a subject with two releases in a `predecessor` chain.

Like the [`verification/`](../verification/) and [`validation/`](../validation/) folders, and unlike the diagram/report-view folders elsewhere under `notations/examples/`, these are **standalone canon-zone element files** (per [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1) laid out under a `canon/` tree fragment exactly as they would sit in an adopter repository. There is no previewable diagram file for this leg.

**Pattern, not adopter instance.** The scenario — a telemetry platform that gains an enforced audit trail in its second release — is a generic, invented example chosen to exercise both qualifiers and the release chain they hang off. It names no real product, organisation, or adopter.

## Files in this folder

| File | TYPE | Role |
|---|---|---|
| [`.../products/PRODUCT-TELEMETRY-PLATFORM-1.yaml`](canon/elements/02_business/products/PRODUCT-TELEMETRY-PLATFORM-1.yaml) | `PRODUCT` | The compliance-unit `subject` (`ASSERT-003`). A `PRODUCT` because that is the only subject TYPE a `subject_release` can ever qualify — see below. |
| [`.../releases/RELEASE-TELEMETRY-PLATFORM-1.yaml`](canon/elements/05_implementation/releases/RELEASE-TELEMETRY-PLATFORM-1.yaml) | `RELEASE` | Version 1.3.0 — the earlier release, with no `predecessor` of its own. |
| [`.../releases/RELEASE-TELEMETRY-PLATFORM-2.yaml`](canon/elements/05_implementation/releases/RELEASE-TELEMETRY-PLATFORM-2.yaml) | `RELEASE` | Version 1.4.0, `predecessor: RELEASE-TELEMETRY-PLATFORM-1` — the two-release chain the superseded-state read needs. |
| [`.../requirements/REQUIREMENT-INGEST-AUDIT-TRAIL-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-INGEST-AUDIT-TRAIL-1.yaml) | `REQUIREMENT` | The obligation whose satisfaction differs between the two releases. |
| [`.../requirements/REQUIREMENT-OPERATOR-DATA-SEGREGATION-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-OPERATOR-DATA-SEGREGATION-1.yaml) | `REQUIREMENT` | An obligation that has held identically in every release — the claim about it names none. |
| [`.../assertions/ASSERTION-TELEMETRY-PLATFORM-AUDIT-TRAIL-1.yaml`](canon/assertions/ASSERTION-TELEMETRY-PLATFORM-AUDIT-TRAIL-1.yaml) | `ASSERTION` | Carries `subject_release: RELEASE-TELEMETRY-PLATFORM-2`, whose `of` equals `subject` — the positive case for `ASSERT-010`. |
| [`.../assertions/ASSERTION-TELEMETRY-PLATFORM-DATA-SEGREGATION-1.yaml`](canon/assertions/ASSERTION-TELEMETRY-PLATFORM-DATA-SEGREGATION-1.yaml) | `ASSERTION` | Carries **no** `subject_release` — a claim about the subject as such, exactly as before the field existed. |
| [`.../verifications/VERIFICATION-INGEST-AUDIT-TRAIL-TEST-1.yaml`](canon/verifications/VERIFICATION-INGEST-AUDIT-TRAIL-TEST-1.yaml) | `VERIFICATION` | `verified_on: RELEASE-TELEMETRY-PLATFORM-1`, `outcome: fail` — run against the release that has since been superseded. |
| [`.../verifications/VERIFICATION-INGEST-AUDIT-TRAIL-TEST-2.yaml`](canon/verifications/VERIFICATION-INGEST-AUDIT-TRAIL-TEST-2.yaml) | `VERIFICATION` | The same protocol re-run on `RELEASE-TELEMETRY-PLATFORM-2`, `outcome: pass` — the positive case for `VERIF-007`, and the head-of-chain contrast to the one above. |

Every file here is **structurally valid**: every notation-local rule passes and every reference resolves. The deliberately invalid counterparts live in the sibling [`rule-violations/`](rule-violations/) fixture.

## The shape

```
PRODUCT-TELEMETRY-PLATFORM-1
   ├── RELEASE-…-1 (1.3.0) ◀── predecessor ── RELEASE-…-2 (1.4.0)
   │        ▲                                        ▲
   │        │ verified_on                            │ verified_on
   │   VERIFICATION-…-TEST-1 (fail)          VERIFICATION-…-TEST-2 (pass)
   │                                                 ▲
   │                                                 │ subject_release
   └───────────── subject ──── ASSERTION-…-AUDIT-TRAIL-1 (compliant)

   └───────────── subject ──── ASSERTION-…-DATA-SEGREGATION-1  (no release qualifier)
```

The same obligation is `fail` on 1.3.0 and `pass` on 1.4.0. That is the whole point of the qualifiers: without them the second result would have to overwrite the first, and the model would lose the fact that the obligation was once unmet.

## What this fixture demonstrates

**Two claims, two grains.** `ASSERTION-…-AUDIT-TRAIL-1` is release-scoped; `ASSERTION-…-DATA-SEGREGATION-1` is not, and nothing flags it for that. No coverage rule requires a claim to name a release — see [`16-assertion.md`](../../elements/16-assertion.md) §2.4.

**The superseded-state read.** `VERIFICATION-…-TEST-1` names a release that some other admitted `RELEASE` of the same `of` lists as its `predecessor`. It was therefore run against a state the product has moved past — a derived observation with no rule code, no severity, and nothing stored on any file, computed by the `predecessor` walk the release catalogue already supports and governed by [`CONTRACT.md`](../../CONTRACT.md) §16.2's reports-never-filters guardrail. `VERIFICATION-…-TEST-2` names the head of the chain and is not flagged. See [`27-verification.md`](../../elements/27-verification.md) §2.1.1.

Note that the superseded verification is **not** an error and **not** something to clean up: its `outcome: fail` remains a true and useful record of 1.3.0. The read surfaces it to a reviewer; it removes it from nothing.

**Why the subject is a `PRODUCT`.** `RELEASE.of` resolves to a `PRODUCT` or an `APPLICATION` (`RELEASE-002`), and `ASSERT-010` requires the named release's `of` to equal `subject`, whose enum is `{PRODUCT, PROCESS, CAPABILITY}` (`ASSERT-003`). The two intersect at `PRODUCT` alone, so a `PROCESS` or `CAPABILITY` subject can never carry a valid `subject_release`. `VERIFICATION.verified_on` has no such constraint — a `VERIFICATION` carries no subject for the release to have to match.

## References

- [`rule-violations/`](rule-violations/) — sibling fixture seeding each negative case for `ASSERT-010` and `VERIF-007`.
- [`../../elements/16-assertion.md`](../../elements/16-assertion.md) §2.4, §5 — `subject_release` and `ASSERT-010`.
- [`../../elements/27-verification.md`](../../elements/27-verification.md) §2.1, §2.1.1, §5 — `verified_on`, the superseded-state read, and `VERIF-007`.
- [`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.29 — the `RELEASE` element TYPE and its `predecessor` chain.
- [`../../CONTRACT.md`](../../CONTRACT.md) §8 — aggregated compliance and verification domain rules; §16.2 — the derived-never-stored discipline the superseded-state read inherits.
