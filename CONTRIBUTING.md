# Contributing to Transitrix

Thanks for considering a contribution. This document describes how to get involved, what to expect from the review process, and the legal and provenance expectations the project carries.

## What kinds of contributions are welcome

- **Methodology refinements** — edits to the files under `method/`, the glossary, or the project rules. Substantive changes (new notation, schema change, validation rule) need an issue first; phrasing and documentation fixes can land directly as a pull request.
- **Worked examples** — contribute directly to the [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) reference repo (its own PR flow), or propose a new sibling worked-example repo for a pattern not yet covered.
- **Validators and templates** — new validation rules in `tools/lint.py` (the canonical whole-repo linter; adopter repos vendor a copy as `.validators/lint.py` at scaffold time), or new view templates under `transitrix/skills/onboard/templates/`.
- **Skills** — adding or changing a Claude Code Skill under `transitrix/skills/<name>/`. See "Adding or changing a Skill" below.
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
4. **Run the relevant validators locally, before opening the PR.** This repo's own gate is not a single command — `.validators/lint.py` is what an *adopter* repo runs against its `canon/`; this repo has no `canon/` of its own to validate. What CI actually runs here, by what you touched:
   - Any `notations/**` spec or example, or `transitrix/skills/onboard/templates/**` — `node scripts/check-notations.mjs` (mechanical invariants: example extensions, `notation:` headers, internal link resolution, version-pin consistency).
   - A single view notation file (`*.transitrix.yaml`) — `npx @transitrix/cli validate <file>` (`npx.cmd` on Windows PowerShell with a restricted execution policy).
   - `tools/lint.py` itself — the encoding regression test in `.github/workflows/lint-encoding-test.yml`.
   - A Claude Code Skill under `transitrix/skills/<name>/` — see "Adding or changing a Skill" below.
   - Anything else — check `.github/workflows/` for a job whose `paths:` trigger matches the files you touched; most packages and skills carry their own targeted test workflow.
5. **Update related docs.** If your change affects naming, layout, or rules, update the relevant file(s) under `method/` (naming: `method/03-modelling.md`; layout: `method/02-repository.md`), `method/00-glossary.md`, and `README.md` as needed.
6. **Open a pull request.** Describe what changed and how it works (not why it was wanted), and link the issue. Sign off your commits (see DCO below); the PR template asks for the same "what changed" / "how it is verified" structure.

## Adding or changing a Skill

A Skill is a packaged Claude Code capability under `transitrix/skills/<name>/`, one directory per skill, inside the `transitrix` plugin (plugin root `transitrix/`, shared manifest `transitrix/.claude-plugin/plugin.json`). The existing skills — `adr`, `feedback`, `ingest`, `knowledge-store`, `onboard`, `reg-intel`, `repo-check`, `report`, `status` — are the precedent to follow; `repo-check` is a short, self-contained example worth reading first.

**Every skill pairs two files at its root:**

- `SKILL.md` — the agent-facing protocol. Front matter carries `name`, `description`, `when_to_use`, `min_version`, and `allowed-tools`; the body is the step-by-step procedure the agent follows. `description` and `when_to_use` are what a host uses to decide when to invoke the skill, so write them as trigger phrases and concrete scenarios, not summary prose.
- `README.md` — the human-facing overview: what the skill does, why it exists, what it deliberately does not do, and how to invoke it (`/transitrix:<name>`).

Add supporting material only as the skill needs it, following existing precedent: `templates/` for scaffolded files (`onboard/templates/`), `prompts/` for multi-step prompt sequences (`ingest/prompts/`, `reg-intel/prompts/`), `schemas/` for JSON Schema the skill validates against, `tests/` for a deterministic integrity test (`onboard/tests/`, `knowledge-store/tests/`).

**Changing an existing skill:**

1. Read the skill's `SKILL.md` and `README.md` in full before editing — the two must stay consistent with each other and with the skill's actual behaviour.
2. If the skill ships a `tests/` directory, run its test(s) locally before committing (see the validation-gate table below).
3. If your change touches the `onboard` skill's family-selection matrix or `templates/`, run `node scripts/check-skill-cheatsheet.mjs` — it diffs the cheat sheet against `notations/README.md`'s notation catalogue and fails the build on drift.

**Adding a new skill:**

1. Open an issue first (see "Submitting changes" above) — a new skill is substantive.
2. Create `transitrix/skills/<name>/SKILL.md` and `README.md` following the pairing above; model the front matter on an existing skill of similar shape.
3. If the skill needs a deterministic CI check, add `tests/` and a workflow under `.github/workflows/` following the naming of the existing skill-test workflows (`onboarding-skill-test.yml`, `knowledge-store-lint-test.yml`), gated on `pull_request: paths: ['transitrix/skills/<name>/**']` so it runs only when that skill changes.
4. A new skill does not need to be registered anywhere else — `transitrix/.claude-plugin/plugin.json` declares the plugin as a whole, not each skill individually; a host that loads the plugin discovers every `skills/<name>/SKILL.md` under it.

**Validation gate for Skills:**

| Touching | Run |
|---|---|
| Any skill's `SKILL.md`/`README.md` prose | No dedicated linter for this tree — `node scripts/check-notations.mjs`'s link check is scoped to `notations/**/*.md` only, so check relative links by hand. |
| `onboard`'s family-selection matrix or `templates/` | `node scripts/check-skill-cheatsheet.mjs` |
| `onboard`'s scaffold logic | `python transitrix/skills/onboard/tests/test_skill_integrity.py` |
| `knowledge-store`'s linter or pattern doc | the test(s) under `transitrix/skills/knowledge-store/tests/` |
| Any skill with its own `tests/` | the test(s) in that directory — check `.github/workflows/` for the matching `paths:`-gated job before assuming there isn't one |

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
- **File naming:** see `method/03-modelling.md` §2.
- **Element ids:** canonical grammar in [`notations/IDS_AND_REFERENCES.md`](notations/IDS_AND_REFERENCES.md) §1. See `method/03-modelling.md` §2.
- **Tags and metadata in repository files: English.**
- **Outbound links to a site we own** (currently `transitrix.com`) carry a `?utm_source=<surface-slug>` query parameter identifying which surface in this repository the link lives on — e.g. `methodology-readme` for a link in `README.md`, `methodology-plugin-manifest` for the plugin manifests' `homepage` field. This uses attribution the destination site already collects; it adds no new tracking dependency. A link to a page we don't operate (GitHub, npm, third-party docs) does not need one. When you add a new outbound link to a site we own, give it a slug following this pattern.

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
- An adopter running the Team Operations convention (`method/06-team-operations.md`) raises a methodology-directed finding in their own repo's `operations/feedback.md`, not as a GitHub issue here. Sending an entry on to the project is opt-in and manual — the same [hello@transitrix.com](mailto:hello@transitrix.com) address above.
- Keep tone professional. The project is a working tool, not a debate club.

## Code of conduct

Treat other contributors with respect. The project follows the spirit of common open-source codes of conduct: be welcoming, be patient, criticise ideas not people, assume good intent, escalate to maintainers when in doubt.

A formal code of conduct may be adopted as the project grows. In the interim, the maintainer reserves the right to ask contributors to revise or withdraw behaviour that disrupts the work.

## License

By contributing, you agree that your contribution is licensed under the project's [MIT License](LICENSE).
