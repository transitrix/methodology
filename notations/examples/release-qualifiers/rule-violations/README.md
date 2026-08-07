# Release qualifiers — rule-violation fixture

A sibling fixture to [`../`](../) (the valid case, where both qualifiers resolve correctly and nothing is flagged). This one deliberately breaks each qualifier so the two new rules have something to catch.

> **Every claim file in this folder is invalid on purpose. Do not copy one as a starting point** — copy from [`../`](../) instead. The element files the claims point at (`PRODUCT-…`, `RELEASE-…`, `REQUIREMENT-…`) are valid; only the four `ASSERTION` / `VERIFICATION` files are seeded.

This differs from the sibling [`verification/reverse-trace-gaps/`](../../verification/reverse-trace-gaps/) fixture, whose files are all structurally valid and trip only cross-cutting *warnings*. `ASSERT-010` and `VERIF-007` are **errors**, so demonstrating them requires files that genuinely fail validation. Keeping them behind their own folder and this banner is what stops the valid fixture next door from being contaminated by them.

Same posture as the parent otherwise: generic, invented scenario; no real product, organisation, or adopter named.

## Seeded violations

| File | Seeded violation | Rule it trips |
|---|---|---|
| [`.../assertions/ASSERTION-TELEMETRY-PLATFORM-AUDIT-TRAIL-1.yaml`](canon/assertions/ASSERTION-TELEMETRY-PLATFORM-AUDIT-TRAIL-1.yaml) | `subject_release` resolves to an admitted `RELEASE`, but that release's `of` is `PRODUCT-EDGE-COLLECTOR-1` while the assertion's `subject` is `PRODUCT-TELEMETRY-PLATFORM-1` — a claim naming a release of something other than the thing it is a claim about. | `ASSERT-010` (mismatched `of`) |
| [`.../assertions/ASSERTION-TELEMETRY-PLATFORM-DATA-SEGREGATION-1.yaml`](canon/assertions/ASSERTION-TELEMETRY-PLATFORM-DATA-SEGREGATION-1.yaml) | `subject_release: RELEASE-TELEMETRY-PLATFORM-9` resolves to nothing in this catalogue. | `ASSERT-010` (unresolvable) |
| [`.../verifications/VERIFICATION-INGEST-AUDIT-TRAIL-TEST-1.yaml`](canon/verifications/VERIFICATION-INGEST-AUDIT-TRAIL-TEST-1.yaml) | `verified_on: RELEASE-TELEMETRY-PLATFORM-9` resolves to nothing in this catalogue. | `VERIF-007` (unresolvable) |
| [`.../verifications/VERIFICATION-OPERATOR-DATA-SEGREGATION-TEST-1.yaml`](canon/verifications/VERIFICATION-OPERATOR-DATA-SEGREGATION-TEST-1.yaml) | `verified_on: PRODUCT-TELEMETRY-PLATFORM-1` resolves to an admitted element that is not a `RELEASE`. | `VERIF-007` (wrong TYPE) |

Each rule gets both of its halves. `ASSERT-010` fires on an unresolvable reference as well as a mismatched `of`, because the mismatch check cannot run until the reference resolves and a mistyped release id would otherwise pass silently ([`16-assertion.md`](../../../elements/16-assertion.md) §5). `VERIF-007` covers non-resolution and wrong-TYPE resolution for the same reason.

## Supporting elements — valid

| File | Role |
|---|---|
| [`.../products/PRODUCT-TELEMETRY-PLATFORM-1.yaml`](canon/elements/02_business/products/PRODUCT-TELEMETRY-PLATFORM-1.yaml) | The assertions' `subject`; also the wrong-TYPE target of the fourth row above. |
| [`.../products/PRODUCT-EDGE-COLLECTOR-1.yaml`](canon/elements/02_business/products/PRODUCT-EDGE-COLLECTOR-1.yaml) | A second, unrelated product — present only so a release belonging to the *wrong* subject exists. |
| [`.../releases/RELEASE-EDGE-COLLECTOR-1.yaml`](canon/elements/05_implementation/releases/RELEASE-EDGE-COLLECTOR-1.yaml) | A valid release of that second product. Valid in itself; it is the assertion pointing at it that is wrong. |
| [`.../requirements/REQUIREMENT-INGEST-AUDIT-TRAIL-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-INGEST-AUDIT-TRAIL-1.yaml) · [`.../requirements/REQUIREMENT-OPERATOR-DATA-SEGREGATION-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-OPERATOR-DATA-SEGREGATION-1.yaml) | Carried over from the parent fixture so `about` / `verifies` resolve and the seeded rule is the only one firing. |

## What is deliberately *not* seeded

- **A single claim carrying both halves of its rule at once.** One violation per file keeps each row above attributable to exactly one condition.
- **Any second rule firing alongside the seeded one.** Each seeded file carries evidence so `ASSERT-007` / `VERIF-006` stay quiet, and every other reference resolves. If a file here trips anything beyond the rule in its row, that is a defect in the fixture.
- **A missing-qualifier case.** Omitting `subject_release` or `verified_on` is valid and fires nothing — that case belongs in the parent fixture, and it is there.

## References

- [`../README.md`](../README.md) — the valid fixture this one is a sibling to.
- [`../../../elements/16-assertion.md`](../../../elements/16-assertion.md) §2.4, §5 — `subject_release` and `ASSERT-010`.
- [`../../../elements/27-verification.md`](../../../elements/27-verification.md) §2.1, §5 — `verified_on` and `VERIF-007`.
- [`../../../CONTRACT.md`](../../../CONTRACT.md) §8 — aggregated compliance and verification domain rules.
