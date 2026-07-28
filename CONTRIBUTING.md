# Contributing to Transitrix

Thanks for considering a contribution. This document describes how to get involved, what to expect from the review process, and the legal and provenance expectations the project carries.

## What kinds of contributions are welcome

- **Methodology refinements** — edits to `method/01-methodology.md`, the glossary, or the project rules. Substantive changes (new notation, schema change, validation rule) need an issue first; phrasing and documentation fixes can land directly as a pull request.
- **Worked examples** — contribute directly to the [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) reference repo (its own PR flow), or propose a new sibling worked-example repo for a pattern not yet covered.
- **Validators and templates** — new validation rules in `.validators/lint.py`, new YAML templates in `.templates/`, or new view templates in `views/`.
- **Tooling integrations** — patches that make Transitrix easier to use with editors, CI systems, or downstream consumers (renderers, exporters, etc.).
- **Translations** — translations of `methodology.md` into other languages, placed under `translations/<lang>/`. The English version remains canonical; translations are derivative.

If you want to add a new notation to the methodology, please open an issue first to discuss the scope and the boundary with existing notations.

## Reporting issues

Use GitHub Issues for:

- Methodology questions or ambiguities.
- Validator false positives or false negatives.
- Documentation bugs.
- Proposals for new notations, rules, or examples.

For each issue, include the file path or section reference, what you observed, and what you expected. Minimal reproductions help.

## Submitting changes

1. **Open or claim an issue** for non-trivial work. This avoids parallel effort and gives you context before you write.
2. **Branch from `main`.** Use a descriptive branch name (`docs/methodology-bpmn-clarifications`, `feat/validator-rule-policy-archive`).
3. **Keep pull requests focused.** One concern per PR.
4. **Run validators locally.** `python3 organizations/<org>/.validators/lint.py` for any organisation you touch.
5. **Update related docs.** If your change affects naming, layout, or rules, update `method/01-methodology.md`, `method/00-glossary.md`, and `README.md` as needed.
6. **Open a pull request.** Describe what changed, why, and link the issue.

## Review process

A maintainer will review pull requests within a reasonable time. Expect:

- Comments on substance and structure first, then style.
- Requests for tests or examples for non-trivial changes.
- Follow-up rounds — reviews are conversations, not gates.

Maintainer decisions on methodology-level changes (new notations, schema changes) are final but explained.

## Style and conventions

- **Language:** English for all canonical content. Other languages live under `translations/<lang>/`, marked clearly as derivatives.
- **Markdown:** short paragraphs, descriptive headings, lower-case file names except `README.md`, `CONTRIBUTING.md`, `LICENSE`.
- **YAML:** two-space indentation; lower-case keys; quoted ids; explicit types.
- **File naming:** see `methodology.md` §9.
- **Element ids:** `[TYPE]-[DOMAIN]-[SEQUENCE]`. See `methodology.md` §9.
- **Tags and metadata in repository files: English.**

## Authorship and IP

- Transitrix — including the DGCA notation that forms part of it — is authored by **Valerii Korobeinikov**. The methodology is published under the **MIT license**.
- The project's history, including all branding decisions, was developed on personal equipment, on personal time, separately from any employer's work. Contributions accepted into the project inherit the same provenance expectation.
- Contributors confirm — by submitting a pull request — that they have the right to license their contribution under the project's MIT license, and that the contribution is their original work.

This is a lightweight statement of provenance. The project does not require a Contributor License Agreement (CLA). It does honour the **Developer Certificate of Origin** (DCO) — see below — implicitly through the act of submitting a pull request.

## Developer Certificate of Origin (DCO)

By making a contribution to this project, you certify that:

1. The contribution was created in whole or in part by you and you have the right to submit it under the open-source license indicated in the file; or
2. The contribution is based upon previous work that, to the best of your knowledge, is covered under an appropriate open-source license and you have the right under that license to submit that work with modifications, whether created in whole or in part by you, under the same open-source license (unless you are permitted to submit under a different license), as indicated in the file; or
3. The contribution was provided directly to you by some other person who certified (1), (2), or (3) and you have not modified it.
4. You understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information you submit with it) is maintained indefinitely and may be redistributed consistent with this project or the open-source license(s) involved.

Sign-off your commits to confirm DCO acceptance:

```
git commit -s -m "your message"
```

This adds a `Signed-off-by: Your Name <you@example.com>` trailer to the commit.

## Communication

- Pull requests and issues are the primary channels.
- For broader strategic discussion, use Discussions on the GitHub repository (when enabled).
- For other enquiries — [hello@transitrix.com](mailto:hello@transitrix.com).
- An adopter running the Team Operations convention (`method/02-team-operations.md`) raises a methodology-directed finding in their own repo's `operations/feedback.md`, not as a GitHub issue here. Sending an entry on to the project is opt-in and manual — the same [hello@transitrix.com](mailto:hello@transitrix.com) address above.
- Keep tone professional. The project is a working tool, not a debate club.

## Code of conduct

Treat other contributors with respect. The project follows the spirit of common open-source codes of conduct: be welcoming, be patient, criticise ideas not people, assume good intent, escalate to maintainers when in doubt.

A formal code of conduct may be adopted as the project grows. In the interim, the maintainer reserves the right to ask contributors to revise or withdraw behaviour that disrupts the work.

## License

By contributing, you agree that your contribution is licensed under the project's [MIT License](LICENSE).
