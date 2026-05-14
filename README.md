# Transitrix

> **Open methodology and tools to describe an enterprise as text — and let humans and machines run it together.**

Transitrix is a lightweight, Git-native methodology for representing and managing enterprise architecture as text. Models, processes, capabilities, goals, and architectural relations live as YAML files in a repository. Diagrams, dashboards, and reports are derived from those files automatically.

It builds on **ArchiMate 3.2**, **BPMN 2.0**, and the **Capability Maturity Model**, and adds value at the layer above: how the model is stored, versioned, validated, rendered, and acted upon by both humans and software agents.

**License:** MIT.

## Documentation

Start here:

- **[`method/methodology.md`](method/methodology.md)** — the canonical methodology specification. Read this first.
- **[`glossary.md`](glossary.md)** — standardised terminology.
- **[`PROJECT_INDEX.md`](PROJECT_INDEX.md)** — navigation guide.

Tooling:

- **[`TOOLING.md`](TOOLING.md)** — how to use Transitrix Studio (the reference VS Code extension and CLI for editing all Transitrix custom formats).

Per-organisation:

- `organizations/<org>/README.md` — organisation overview.
- `organizations/<org>/GETTING_STARTED.md` — onboarding.
- `organizations/<org>/CONVENTIONS.md` — local naming overrides.
- `organizations/<org>/.templates/EXAMPLES.md` — worked examples.

CI:

- **[`.github_workflows_example.yaml`](.github_workflows_example.yaml)** — GitHub Actions template for the validators.

## Repository structure

```
transitrix/methodology/
├── method/                          # Methodology spec
│   ├── methodology.md               # Canonical methodology document
│   ├── notations/                   # ArchiMate / PlantUML reference materials
│   └── bpmn-notation-kit/           # BPMN DSL spec, rules, examples
├── organizations/
│   ├── acme_corp/                   # Worked example organisation
│   │   ├── elements/                # Architecture elements by ArchiMate layer
│   │   │   ├── 01_motivation/
│   │   │   ├── 02_business/
│   │   │   ├── 03_application/
│   │   │   └── 04_technology/
│   │   ├── relations/               # Edges of the architecture graph
│   │   ├── views/                   # Composite diagrams and aggregations over elements
│   │   │   ├── goals/               # Goals trees
│   │   │   ├── capabilities/        # Capability maps + maturity
│   │   │   ├── processmap/          # Process landscape maps
│   │   │   ├── bpmn/                # Process flow diagrams (BPMN)
│   │   │   ├── fgca/                # Factor → Goal → Change → Activity chains
│   │   │   ├── fga/                 # Factor → Goal → Activity chains
│   │   │   ├── blocks/              # Nested block diagrams (Svgbob)
│   │   │   ├── activities/          # Mermaid activity diagrams
│   │   │   ├── products/            # Filtered views over Product elements
│   │   │   └── applications/        # Filtered views over Application elements
│   │   ├── .templates/              # Element / relation / view templates
│   │   ├── .validators/             # Lint scripts (lint.py)
│   │   ├── README.md
│   │   ├── GETTING_STARTED.md
│   │   └── CONVENTIONS.md
│   └── NEW_ORGANIZATION_TEMPLATE.md # How to bootstrap a new organisation
├── glossary.md
├── PROJECT_INDEX.md
├── TOOLING.md
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
   organizations/your_company/elements/03_application/MY_SERVICE.yaml
$EDITOR organizations/your_company/elements/03_application/MY_SERVICE.yaml

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

Transitrix defines text-native notations for the most common enterprise-architecture artefacts. Each has a per-format extension. See [methodology.md §6](method/methodology.md#6-notation-kit) for the full catalogue and rationale.

| Notation | Extension | Purpose | Status |
| --- | --- | --- | --- |
| Process diagram (BPMN 2.0) | `*.bpmn.transitrix.yaml` | Process flow with lanes, KPIs | Implemented |
| Nested block diagrams | `*.blocks.transitrix.txt` | Multi-level container layouts (Svgbob) | Implemented |
| Goals tree | `*.goals.transitrix.yaml` | Hierarchical goals | Planned |
| Capabilities map | `*.capmap.transitrix.yaml` | Capabilities + maturity | Planned |
| Process landscape map | `*.processmap.transitrix.yaml` | Top-level process catalogue | Planned |
| FGCA | `*.fgca.transitrix.yaml` | Strategy-to-execution chain (Factor → Goal → Change → Activity) | Documented |
| FGA | `*.fga.transitrix.yaml` | Simplified strategy chain (Factor → Goal → Activity) | Planned |
| Activities | Mermaid (`.mmd`) | Quick activity / sequence diagrams | External standard |
| Products | YAML element catalogue | Product / service inventory | Planned |
| Applications | YAML element catalogue | Application portfolio | Planned |

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

**Methodology version:** 1.0
**Last updated:** 2026-05-07
