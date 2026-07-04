# Transitrix Project Index & Navigation

A map of the repository and where to find things. For the methodology itself, start with [`method/01-methodology.md`](method/01-methodology.md); for the notation specs, start with [`notations/README.md`](notations/README.md).

---

## Repository root

| Path | What it is |
|---|---|
| [`README.md`](README.md) | Project overview and quick start. |
| [`method/01-methodology.md`](method/01-methodology.md) | Methodology overview — principles, zones, repository structure, change lifecycle. |
| [`method/02-team-operations.md`](method/02-team-operations.md) | Team Operations convention — `operations/` folder, ADR + Work Item shapes; operational layer alongside the model (not a zone). |
| [`notations/`](notations/) | The canonical model: notation specs, shared contract, ID grammar, examples. |
| [`glossary.md`](glossary.md) | Standardised terminology. |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history (Keep a Changelog; SemVer with pre-1.0 caveats). |
| [`RELEASING.md`](RELEASING.md) | Per-release operational checklist for the maintainer. |
| [`NOTATIONS_VALIDATION.md`](NOTATIONS_VALIDATION.md) | Maintainer audit — open shape decisions a linter can't make, plus flagged nits. |
| [`integration/`](integration/) | Tooling, Studio, and CI integration notes. |
| [`migrations/`](migrations/) | Per-release migration recipes (e.g. `0.5-to-0.6/`). |
| [`transitrix/`](transitrix/) | Claude / Copilot Agent Skills plugin — currently `skills/onboard/` and `skills/ingest/`. |
| [`packages/`](packages/) | Versioned tooling packages — e.g. `@transitrix/ingest-cli`, the shared CLI invoked by the ingest skill. |
| [`scripts/`](scripts/) | Repo-level doc-lint scripts (`check-notations.mjs`, `check-skill-cheatsheet.mjs`). |
| [`docs/`](docs/) | Decision records (`decisions/`) and other maintainer-facing notes. |
| [`organizations/`](organizations/) | Adopter organisations — the worked example `acme_corp/` lives here. |
| [`LICENSE`](LICENSE), [`CONTRIBUTING.md`](CONTRIBUTING.md) | MIT licence; contribution guide. |

---

## `notations/` — the canonical model

| Path | What it is |
|---|---|
| [`notations/README.md`](notations/README.md) | Index of every notation (view + element), with short names, extensions, and spec-maturity status. **Single source of truth for the notation set.** |
| [`notations/CONTRACT.md`](notations/CONTRACT.md) | Shared rules: file header, zones (§5), admission record (§6), primitive lifecycle (§7), compliance-domain rule index (§8), versioned-attribute sidecar (§9), versioning policy (§10). |
| [`notations/IDS_AND_REFERENCES.md`](notations/IDS_AND_REFERENCES.md) | Canonical ID grammar and the full TYPE registry. |
| [`notations/ELEMENT_PRIMITIVES.md`](notations/ELEMENT_PRIMITIVES.md) | The element-primitive file schema common to all standalone elements. |
| [`notations/MANIFEST.md`](notations/MANIFEST.md) | The adopter manifest (`transitrix.yaml`) specification. |
| [`notations/views/`](notations/views/) | View-notation specs — BPMN, FGCA, FGA, goals, capability-map, process-map, activities, blocks, products, applications, scenarios, issues, process-blueprint, activity-card. |
| [`notations/elements/`](notations/elements/) | Element-notation specs — codex, requirement, assertion, relations, actors, stakeholders. |
| [`notations/examples/`](notations/examples/) | Worked example files for each notation. |

---

## An organisation — `organizations/<org>/`

Each organisation splits its content into three parallel **zones** (see `CONTRACT.md` §5): `canon` (validated, authoritative model), `field` (raw source material), and `codex` (externally-given laws and internal policies). Zones are parallel, not stacked.

```
organizations/acme_corp/
├── transitrix.yaml         # Adopter manifest — pinned methodology version, notations, zones
├── README.md               # Organisation overview
├── GETTING_STARTED.md      # Onboarding for the team
├── CONVENTIONS.md          # Local naming overrides
├── AGENTS.md               # Assistant-neutral agent guide
├── canon/                  # Zone: validated model
│   ├── elements/           # Atomic elements by ArchiMate layer (01_motivation … 05_implementation)
│   ├── relations/          # First-class, time-aware relations (1 per file)
│   ├── assertions/         # Compliance assertions (REQUIREMENT ↔ subject)
│   └── views/              # Composite diagrams and aggregations over elements
├── field/                  # Zone: interviews, surveys, observations, drafts
├── codex/                  # Zone: external/<jurisdiction>/ laws + internal/ policies
├── operations/             # Operational layer (NOT a zone) — team's ADRs + Work Items
├── .templates/             # Copy-and-fill templates
└── .validators/            # Lint and schema scripts (lint.py)
```

### Reading order

- **First time:** `organizations/<org>/README.md` → `GETTING_STARTED.md` → `CONVENTIONS.md`.
- **Creating an element:** copy a template from `.templates/elements/` into the right `canon/elements/<layer>/` folder, fill it in, then `python3 .validators/lint.py`.
- **Bootstrapping a new organisation:** `organizations/NEW_ORGANIZATION_TEMPLATE.md`, or copy `acme_corp/` as a starting reference.

---

## Validation

Every change runs through the validator (`.validators/lint.py`) and the CI gate: YAML syntax, atomicity (no relations inside element files), referential integrity, ArchiMate semantics, and policy (Active status requires an owner). A pull request that breaks validation cannot be merged. See `method/01-methodology.md` §8 for the rule categories and `notations/CONTRACT.md` for the shared validation codes.

---

**Status:** maintained alongside the `notations/` specs. This file is the single canonical file map for the repository — `README.md` carries only a three-bucket overview that points back here. The methodology's version is tracked in [`CHANGELOG.md`](CHANGELOG.md); the methodology is **pre-1.0**.
**Last updated:** 2026-06-05
