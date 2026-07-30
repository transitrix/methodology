# Transitrix

> **Open methodology and tools to describe an enterprise as text — and let humans and machines run it together.**

## Two ways in

**Just want to see a diagram render from text?**
You don't need the methodology for that. Install Transitrix Studio, write a few
lines of text, and watch it draw — about 5 minutes, no repository, no setup.
→ **[Draw a diagram → Transitrix Studio](https://github.com/transitrix/transitrix-studio#quickstart)**

**Setting up an architecture repository for a team or company?**
You're in the right place. Start with the [Quick start](#quick-start) below.

Transitrix is a lightweight, Git-native methodology for representing and managing enterprise architecture as text. Models, processes, capabilities, goals, and architectural relations live as YAML files in a repository. Diagrams, dashboards, and reports are derived from those files automatically.

It builds on **ArchiMate 3.2**, **BPMN 2.0**, and the **Capability Maturity Model**, and adds value at the layer above: how the model is stored, versioned, validated, rendered, and acted upon by both humans and software agents.

**License:** MIT.

## Enterprise Memory

Transitrix is the foundation for an **Enterprise Memory** — a durable, EA-grounded
store of organisational knowledge that humans and AI agents share and reason over,
built on a formal model rather than free-form notes or opaque embeddings.
→ **[Enterprise Memory deployment guide](patterns/enterprise-memory.md)** (personal-scale
second brain and enterprise-scale Knowledge Store).

## Quick start

The fastest way in is the **onboarding Skill** — it scaffolds a clean zoned repo and walks you through your first model file. Paste this into any coding agent — Claude Code, Cursor, Copilot Chat, Gemini CLI:

```
Fetch and follow
https://raw.githubusercontent.com/transitrix/methodology/main/transitrix/skills/onboard/SKILL.md
— for any templates/<file> path it references (incl. ${CLAUDE_SKILL_DIR}/templates/<file>),
fetch it instead from
https://raw.githubusercontent.com/transitrix/methodology/main/transitrix/skills/onboard/templates/<file>
```

The skill asks what you want to model first, scaffolds the `canon/` + `field/` + `codex/` layout, and authors a starter file with validation for whichever notation fits — a **Goals tree** is a common starting point, the simplest notation to start from, but any notation is a valid first artefact.

Using the Claude Code plugin workflow instead? Same result, from the terminal `claude` CLI:

```
/plugin marketplace add transitrix/methodology
/plugin install transitrix@transitrix-methodology
/transitrix:onboard
```

Prefer to do it by hand, or not working with a coding agent? Follow the manual walkthrough in **[`GETTING_STARTED.md`](GETTING_STARTED.md)** — same approach, illustrated against the worked [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) example. To validate as you go, install **Transitrix Studio** (VS Code) for live preview, or run `npx @transitrix/cli validate <file>` (on Windows PowerShell, use `npx.cmd` — see [Validation](#validation-in-one-paragraph)).

New to the ideas behind it? Read **[`method/01-methodology.md`](method/01-methodology.md)** for the *why* — but you don't need it to start.

## Documentation

- **[`GETTING_STARTED.md`](GETTING_STARTED.md)** — a first modelling session, step by step, illustrated against the `acme-corp` worked example.
- **[`WALKTHROUGH.md`](WALKTHROUGH.md)** — a guided tour of the `acme-corp` worked example, read as one story.
- **[`notations/CONVENTIONS.md`](notations/CONVENTIONS.md)** — ID grammar, naming, and best-practice checklist for authoring canon content.
- **[`patterns/implementation-tiers.md`](patterns/implementation-tiers.md)** — two implementation tiers (Simple / Full): what belongs in each, where the boundary sits, and how the upgrade path works.
- **[`method/01-methodology.md`](method/01-methodology.md)** — the methodology overview: model, principles, zones, change lifecycle.
- **[`notations/README.md`](notations/README.md)** — the canonical notation index; [`notations/CONTRACT.md`](notations/CONTRACT.md) and the per-notation specs are the authoritative source for the model in detail.
- **[`method/00-glossary.md`](method/00-glossary.md)** — standardised terminology.
- **[`method/03-architecture-decision-log.md`](method/03-architecture-decision-log.md)** — architecture decision records per repo and the harvested enterprise log across repos; §10 is the setup path, from an empty folder to a scheduled harvest.
- **[`transitrix/templates`](https://github.com/transitrix/templates)** — forkable starter templates (RACI, …): fork, edit for your own organisation, validate.

Process & releases:

- **[`CHANGELOG.md`](CHANGELOG.md)** — release history (Keep a Changelog; SemVer per [`notations/CONTRACT.md`](notations/CONTRACT.md) §10).
- **[`RELEASING.md`](RELEASING.md)** — per-release operational checklist for the maintainer.
- **[`NOTATIONS_AUDIT.md`](NOTATIONS_AUDIT.md)** — maintainer audit of open shape decisions a linter can't make.
- **[`migrations/`](migrations/)** — per-release migration recipes.

Tooling:

- **[`integration/studio.md`](integration/studio.md)** — how to use Transitrix Studio (the reference VS Code extension and CLI for editing all Transitrix custom formats).
- **[`integration/plantuml.md`](integration/plantuml.md)** — adopter guide for the supplementary `.puml` diagram workflow (sequence, component, deployment, …).
- **[`integration/tooling.md`](integration/tooling.md)** — broader tooling and ecosystem notes.
- **[`integration/ci-example.yaml`](integration/ci-example.yaml)** — CI template that gates pull requests on validation.
- **[`transitrix/`](transitrix/)** — the Claude / Copilot Agent Skills plugin (`skills/onboard/`, `skills/ingest/`, …).
- **[`packages/`](packages/)** — versioned tooling packages, e.g. `@transitrix/ingest-cli`.
- **[`scripts/`](scripts/)** — repo-level doc-lint scripts.

Per-organisation:

- `organizations/<org>/README.md` — organisation overview.
- `organizations/<org>/GETTING_STARTED.md` — onboarding.
- `organizations/<org>/CONVENTIONS.md` — local naming overrides.
- `organizations/<org>/.templates/EXAMPLES.md` — worked examples.

## Repository structure

The repository has three buckets:

- **Spec** — what adopters consume: [`notations/`](notations/) (CONTRACT, IDS_AND_REFERENCES, ELEMENT_PRIMITIVES, MANIFEST, COVERAGE_PROFILES, plus `views/`, `elements/`, `examples/`), [`method/`](method/) (including [`method/00-glossary.md`](method/00-glossary.md)), [`migrations/`](migrations/).
- **Worked example** — a sample organisation to learn from, maintained as a standalone reference repo: [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp). Path references elsewhere in this repo of the form `organizations/acme_corp/...` point into that repo — clone it to `organizations/acme_corp/` locally to follow them verbatim, or browse it directly on GitHub.
- **Tooling** — what you install or run: [`transitrix/skills/`](transitrix/skills/) (Agent Skills — onboard, ingest), [`packages/`](packages/) (CLIs — e.g. `@transitrix/ingest-cli`), [`integration/`](integration/) (Studio / CI), [`scripts/`](scripts/) (doc-lint).

See [Documentation](#documentation) above for the full list of root-level files and what each is for.

## How it works in five lines

1. The architecture is YAML files in Git — atomic elements and atomic relations, separated.
2. Linters enforce syntax, atomicity, referential integrity, ArchiMate semantics, and policy on every commit.
3. **Transitrix Studio** is the reference editor — a VS Code extension and CLI that handles every Transitrix custom format.
4. Diagrams are rendered by a shared OSS library (`@transitrix/diagrams`) so the same picture appears in Studio, in DSM, and in any other host.
5. Every change goes through a pull request. Code review = architecture review.

## Notations supported

Transitrix defines text-native notations for the most common enterprise-architecture artefacts — process diagrams (BPMN), goals trees, capability maps, the DGCA / FGA strategy chains, action networks, process maps, blocks, products and applications catalogues, scenarios, issues, and process blueprints — plus element notations for the codex, requirements, assertions, relations, actors, and stakeholders. Each view notation has a `*.<short-name>.transitrix.yaml` extension and a `notation:` header.

See **[`notations/README.md`](notations/README.md)** for the canonical index of every notation — short names, file extensions, and spec-maturity status (`draft` / `documented` / `stable`) — and [`method/01-methodology.md` §6](method/01-methodology.md#6-notation-kit) for the rationale. The catalogue is not duplicated here, to keep a single source of truth.

## Validation in one paragraph

Transitrix separates validation by responsibility — **view notations**, **element primitives**, **relations**, and **repo structure**. As you author, a single view file validates inline in **Transitrix Studio** (on save) or with `npx @transitrix/cli validate <file>`. All canonical `*.<short-name>.transitrix.yaml` extensions are accepted without `--ext`; pass `--ext <notation-name>` only for a non-canonical extension outside the built-in registry. **On Windows PowerShell** with a restricted execution policy (the default on many workstations), invoke as `npx.cmd @transitrix/cli validate <file>` — the unsuffixed `npx` resolves to a `.ps1` wrapper that the policy refuses to launch. Across the whole repository, the model-integrity linter `.validators/lint.py` runs the element/relation/structure checks — atomicity (no relations inside element files), referential integrity (every relation endpoint exists), ArchiMate semantics (layer-respecting connections), and policy (Active status requires an owner; deprecated elements reference successors) — over `canon/` and gates pull requests in CI. See [`integration/ci-example.yaml`](integration/ci-example.yaml) for the pipeline.

## Use cases

| Pattern | Structure |
| --- | --- |
| Single organisation | `organizations/my_company/` with full structure |
| Multiple business units | `organizations/group/`, `organizations/bu_a/`, `organizations/bu_b/` |
| Multi-tenant SaaS | `organizations/customer_*/`, `organizations/shared_infrastructure/` |
| Advisory / portfolio | One repo, one organisation per portfolio company |

Each organisation is structurally isolated. They share methodology, validators, and templates; they don't share state.

## Authorship and license

Transitrix — including the DGCA / FGA notations that form part of it — is authored by **Valerii Korobeinikov**. The methodology is published under the **MIT license** as open documentation. Contributions are welcomed — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

**Contact:** [hello@transitrix.com](mailto:hello@transitrix.com)

---

**Methodology status:** 1.0 (stable) — see [`CHANGELOG.md`](CHANGELOG.md) for the current release and [`notations/CONTRACT.md`](notations/CONTRACT.md) §10 for the compatibility policy.
**Last updated:** 2026-07-05
