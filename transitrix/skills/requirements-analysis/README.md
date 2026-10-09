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

The supported handoff is the built `@transitrix/cli` 2.12.0 candidate at
`bfc60f81bd0b7fe01dd9fac41ba4b1d4bc447730`, Node >=20,
`requirements-report/1` / `requirement-chain/0.3`. This is not an npm-publication
claim. CLI 2.11.0 is unsupported. See [the invocation and support checks](SKILL.md#1-resolve-scope-and-support)
before use. Missing tools or unsupported versions produce an unavailable result.

The skill retains the exact CLI response, normalized request, invocation and
provenance as a report receipt, then separates computed facts, interpretation
and proposed actions. The receipt is a tooling artifact, not admitted model
data. Known IDs with incomplete totals remain incomplete; absent evidence never
becomes a passed verification. Recommendations do not write the model.

For regulatory obligation matrices and compliance coverage, use the existing
[report skill](../report/README.md). It retains its own CLI and view-config
workflow unchanged.
