# Transitrix

> **Open methodology and tools to describe an enterprise as text — and let humans and machines run it together.**

Transitrix is a lightweight, Git-native methodology for representing and managing enterprise architecture as text. Models, processes, capabilities, goals, and architectural relations live as YAML files in a repository. Diagrams, dashboards, and reports are derived from those files automatically.

It builds on **ArchiMate 3.2**, **BPMN 2.0**, and the **Capability Maturity Model**, and adds value at the layer above: how the model is stored, versioned, validated, rendered, and acted upon by both humans and software agents.

**License:** MIT.

## Documentation

Start here:

- **[`method/methodology.md`](method/methodology.md)** — the methodology overview. Read this first for the model and principles.
- **[`notations/README.md`](notations/README.md)** — the canonical notation index; [`notations/CONTRACT.md`](notations/CONTRACT.md) and the per-notation specs are the authoritative source for the model in detail.
- **[`glossary.md`](glossary.md)** — standardised terminology.
- **[`PROJECT_INDEX.md`](PROJECT_INDEX.md)** — navigation guide.

Tooling:

- **[`integration/studio.md`](integration/studio.md)** — how to use Transitrix Studio (the reference VS Code extension and CLI for editing all Transitrix custom formats).
- **[`integration/tooling.md`](integration/tooling.md)** — broader tooling and ecosystem notes.

Per-organisation:

- `organizations/<org>/README.md` — organisation overview.
- `organizations/<org>/GETTING_STARTED.md` — onboarding.
- `organizations/<org>/CONVENTIONS.md` — local naming overrides.
- `organizations/<org>/.templates/EXAMPLES.md` — worked examples.

CI:

- **[`integration/ci-example.yaml`](integration/ci-example.yaml)** — CI template for the validators.

## Repository structure

```
transitrix/methodology/
├── method/
│   └── methodology.md               # Canonical methodology overview
├── notations/                       # Notation specs — the canonical model
│   ├── README.md                    # Index of all notations (view + element)
│   ├── CONTRACT.md                  # Shared header / zones / lifecycle / versioning
│   ├── IDS_AND_REFERENCES.md        # ID grammar + TYPE registry
│   ├── ELEMENT_PRIMITIVES.md        # Element-primitive file schema
│   ├── MANIFEST.md                  # Adopter manifest (transitrix.yaml) spec
│   ├── views/                       # View-notation specs (BPMN, FGCA, goals, …)
│   ├── elements/                    # Element-notation specs (codex, requirement, …)
│   └── examples/                    # Worked example files per notation
├── organizations/
│   ├── acme_corp/                   # Worked example organisation
│   │   ├── canon/                   # Zone: validated model — elements, relations, assertions, views
│   │   ├── field/                   # Zone: raw material — interviews, surveys, observations
│   │   ├── codex/                   # Zone: external laws + internal policies
│   │   ├── .templates/  .validators/
│   │   ├── transitrix.yaml          # Adopter manifest
│   │   └── README.md  GETTING_STARTED.md  CONVENTIONS.md  AGENTS.md
│   └── NEW_ORGANIZATION_TEMPLATE.md # How to bootstrap a new organisation
├── migrations/                      # Per-release migration recipes (0.4→0.5, 0.5→0.6)
├── integration/                     # Studio / tooling / CI integration notes
├── skills/                          # Onboarding + extraction skills
├── glossary.md  PROJECT_INDEX.md  CHANGELOG.md  RELEASING.md
├── README.md                        # This file
├── LICENSE                          # MIT
└── CONTRIBUTING.md                  # How to contribute
```

## Quick start — for a new organisation

```bash
# 1. Bootstrap from the worked example
cp -r organizations/acme_corp organizations/your_company

# 2. Adapt local naming conventions
$EDITOR organizations/your_company/CONVENTIONS.md

# 3. Create your first element from a template
cp organizations/your_company/.templates/elements/03_application_template.yaml \
   organizations/your_company/canon/elements/03_application/MY_SERVICE.yaml
$EDITOR organizations/your_company/canon/elements/03_application/MY_SERVICE.yaml

# 4. Validate
python3 organizations/your_company/.validators/lint.py

# 5. Commit and open a pull request
git add organizations/your_company/
git commit -m "docs(arch): add MY_SERVICE for your_company"
```

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

Every change runs through five rule categories: syntax (valid YAML, schema-conformant), atomicity (no relations inside element files), referential integrity (every relation endpoint exists), ArchiMate semantics (layer-respecting connections), and policy (Active status requires an owner; deprecated elements reference successors). The linter is a single Python script — `python3 .validators/lint.py`. CI gates pull requests on it.

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
**Last updated:** 2026-05-30
