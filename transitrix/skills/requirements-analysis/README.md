# Requirements-analysis skill

Analyse the requirements of a PRODUCT or APPLICATION for a selected release
and date, optionally filtered by project. Invoke `/transitrix:requirements-analysis`
or give any assistant [SKILL.md](SKILL.md); the instructions use the standalone
CLI and do not depend on an editor or a particular assistant runtime.

This is part of the existing [Transitrix plugin](../../README.md). Install or
update that plugin using its normal instructions; hosts discover
`skills/requirements-analysis/SKILL.md` alongside the other skills. There is no
separate skill package or personal installation channel. The shared plugin
version and methodology release process remain authoritative.

## Examples

- “Analyse APPLICATION-ALPHA-1, RELEASE-ALPHA-2, as at 2026-09-24, for
  ACTION-ALPHA-1.” An internal application needs no manufactured product.
- “Analyse internal PRODUCT-ALPHA-1, RELEASE-ALPHA-2, as at 2026-09-24.”
  Internal use does not turn a product into an application.
- “Analyse physical PRODUCT-ALPHA-1 at RELEASE-ALPHA-2 on 2026-09-24.”
  The subject remains a product, independently of its physical form.
- “Analyse SaaS PRODUCT-ALPHA-1 at RELEASE-ALPHA-2 on 2026-09-24.”
  Supporting applications are context, not implicit membership or evidence.

These are independent synthetic selections, not an installed example catalogue.
See the [accepted four-case oracle](https://github.com/transitrix/methodology/blob/a131b1862d86f34be8feb729e1cc6ebc994c3891/notations/examples/requirement-subject-scope/README.md).
Missing essential scope prompts a question; the skill never guesses a release
or date. Omitted project means no project filter.

## Tool and output

Bundle 0.2.0 / methodology floor 8.0.0 prepares CLI 2.13.0 from exact Studio
source `f1d5f1e68df5f3df54ffc4a528e77b327dc60859`, with diagrams 1.17.0,
Node >=20 and `requirements-report/1` / `requirement-chain/0.3`.
See [caller-candidate.json](caller-candidate.json) and the
[isolated CLI qualification receipt](qualification.json). Verify the exact
archive integrity and installed source identity before invocation; missing or
mismatching evidence remains unavailable. Hosted UI parity has its own archive
identity at the same tracked tree, not this local tarball. No release or final
whole-product qualification is claimed. Historical accepted
CLI 2.12.0 evidence stays bound to its original source. See
[the invocation and support checks](SKILL.md#1-resolve-scope-and-support).

The skill retains the exact CLI response, normalized request, invocation and
provenance as a report receipt, then separates computed facts, interpretation
and proposed actions. The receipt is a tooling artifact, not admitted model
data. Known IDs with incomplete totals remain incomplete; absent evidence never
becomes a passed verification. Recommendations do not write the model.

For regulatory obligation matrices and compliance coverage, use the existing
[report skill](../report/README.md). It retains its own CLI and view-config
workflow unchanged.
