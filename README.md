# Transitrix

> **Open methodology and tools to describe an enterprise as text — and let humans and machines run it together.**

Transitrix is a lightweight, Git-native methodology for representing and managing enterprise architecture as text. Models, processes, capabilities, goals, and architectural relations live as YAML files in a repository. Diagrams, dashboards, and reports are derived from those files automatically.

It builds on **ArchiMate 3.2**, **BPMN 2.0**, and the **Capability Maturity Model**, and adds value at the layer above: how the model is stored, versioned, validated, rendered, and acted upon by both humans and software agents.

**License:** MIT.

## Quick start

The fastest way in is the **onboarding Skill** — it scaffolds a clean zoned repo and walks you through your first model file. In a Claude Code session:

```
/plugin marketplace add transitrix/methodology
/plugin install transitrix@transitrix-methodology
/transitrix:onboard
```

The skill asks what you want to model first, scaffolds the `canon/` + `field/` + `codex/` layout, and authors a starter file with validation. Your **first artefact is a Goals tree** — the simplest notation to start from.

Prefer to do it by hand, or not working in Claude Code? Follow the manual walkthrough in **[`organizations/acme_corp/GETTING_STARTED.md`](organizations/acme_corp/GETTING_STARTED.md)** — same first artefact, against the worked `acme_corp` example. To validate as you go, install **Transitrix Studio** (VS Code) for live preview, or run `npx @transitrix/cli validate <file>`.

New to the ideas behind it? Read **[`method/methodology.md`](method/methodology.md)** for the *why* — but you don't need it to start.

## Documentation

- **[`method/methodology.md`](method/methodology.md)** — the methodology overview: model, principles, zones, change lifecycle.
- **[`notations/README.md`](notations/README.md)** — the canonical notation index; [`notations/CONTRACT.md`](notations/CONTRACT.md) and the per-notation specs are the authoritative source for the model in detail.
- **[`glossary.md`](glossary.md)** — standardised terminology.
- **[`PROJECT_INDEX.md`](PROJECT_INDEX.md)** — full navigation guide.

Tooling:

- **[`integration/studio.md`](integration/studio.md)** — how to use Transitrix Studio (the reference VS Code extension and CLI for editing all Transitrix custom formats).
- **[`integration/tooling.md`](integration/tooling.md)** — broader tooling and ecosystem notes.
- **[`integration/ci-example.yaml`](integration/ci-example.yaml)** — CI template that gates pull requests on validation.

Per-organisation:

- `organizations/<org>/README.md` — organisation overview.
- `organizations/<org>/GETTING_STARTED.md` — onboarding.
- `organizations/<org>/CONVENTIONS.md` — local naming overrides.
- `organizations/<org>/.templates/EXAMPLES.md` — worked examples.

## Repository structure

The repository has three buckets:

- **Spec** — what adopters consume: [`notations/`](notations/) (CONTRACT, IDS_AND_REFERENCES, ELEMENT_PRIMITIVES, MANIFEST, COVERAGE_PROFILES, plus `views/`, `elements/`, `examples/`), [`method/`](method/), [`glossary.md`](glossary.md), [`migrations/`](migrations/).
- **Worked example** — a sample organisation to learn from: [`organizations/acme_corp/`](organizations/acme_corp/).
- **Tooling** — what you install or run: [`transitrix/skills/`](transitrix/skills/) (Agent Skills — onboard, ingest), [`packages/`](packages/) (CLIs — e.g. `@transitrix/ingest-cli`), [`integration/`](integration/) (Studio / CI), [`scripts/`](scripts/) (doc-lint).

For the full file map, see [`PROJECT_INDEX.md`](PROJECT_INDEX.md) — the single canonical navigation guide.

## How it works in five lines

1. The architecture is YAML files in Git — atomic elements and atomic relations, separated.
2. Linters enforce syntax, atomicity, referential integrity, ArchiMate semantics, and policy on every commit.
3. **Transitrix Studio** is the reference editor — a VS Code extension and CLI that handles every Transitrix custom format.
4. Diagrams are rendered by a shared OSS library (`@transitrix/diagrams`) so the same picture appears in Studio, in DSM, and in any other host.
5. Every change goes through a pull request. Code review = architecture review.

## Notations supported

Transitrix defines text-native notations for the most common enterprise-architecture artefacts — process diagrams (BPMN), goals trees, capability maps, the FGCA / FGA strategy chains, activities networks, process maps, blocks, products and applications catalogues, scenarios, issues, and process blueprints — plus element notations for the codex, requirements, assertions, relations, actors, and stakeholders. Each view notation has a `*.<short-name>.transitrix.yaml` extension and a `notation:` header.

See **[`notations/README.md`](notations/README.md)** for the canonical index of every notation — short names, file extensions, and spec-maturity status (`draft` / `documented` / `stable`) — and [`method/methodology.md` §6](method/methodology.md#6-notation-kit) for the rationale. The catalogue is not duplicated here, to keep a single source of truth.

## Validation in one paragraph

Transitrix separates validation by responsibility — **view notations**, **element primitives**, **relations**, and **repo structure**. As you author, a single view file validates inline in **Transitrix Studio** (on save) or with `npx @transitrix/cli validate <file>`. Across the whole repository, the model-integrity linter `.validators/lint.py` runs the element/relation/structure checks — atomicity (no relations inside element files), referential integrity (every relation endpoint exists), ArchiMate semantics (layer-respecting connections), and policy (Active status requires an owner; deprecated elements reference successors) — over `canon/` and gates pull requests in CI. See [`integration/ci-example.yaml`](integration/ci-example.yaml) for the pipeline.

## Use cases

| Pattern | Structure |
| --- | --- |
| Single organisation | `organizations/my_company/` with full structure |
| Multiple business units | `organizations/group/`, `organizations/bu_a/`, `organizations/bu_b/` |
| Multi-tenant SaaS | `organizations/customer_*/`, `organizations/shared_infrastructure/` |
| Advisory / portfolio | One repo, one organisation per portfolio company |

Each organisation is structurally isolated. They share methodology, validators, and templates; they don't share state.

## Authorship and license

Transitrix — including the FGCA / FGA notations that form part of it — is authored by **Valerii Korobeinikov**. The methodology is published under the **MIT license** as open documentation. Contributions are welcomed — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

**Contact:** [hello@transitrix.com](mailto:hello@transitrix.com)

---

**Methodology status:** pre-1.0 — see [`CHANGELOG.md`](CHANGELOG.md) for the current release and [`notations/CONTRACT.md`](notations/CONTRACT.md) §10 for the compatibility policy.
**Last updated:** 2026-06-11
