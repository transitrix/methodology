---
title: Transitrix — repository structure
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, methodology, repository, zones]
---

# Repository structure

> How a Transitrix-managed repository is laid out on disk.

## 1. Repository structure

A Transitrix-managed repository organises content per organisation. Multiple organisations can coexist in a single repository (multi-tenant structure). Each organisation's content is split into three parallel **zones** — `canon`, `field`, and `codex` — defined in [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5. The zones are parallel, not stacked: validated truth (`canon`), raw source material (`field`), and externally-given constraints (`codex`) sit side by side.

```
organizations/
├── <org_slug>/
│   ├── README.md                  # Organisation overview
│   ├── GETTING_STARTED.md         # Onboarding for the team
│   ├── CONVENTIONS.md             # Local naming conventions and overrides
│   ├── AGENTS.md                  # Assistant-neutral agent guide
│   ├── transitrix.yaml            # Adopter manifest — pinned methodology version, notations, zones
│   ├── canon/                     # Zone: validated, authoritative model
│   │   ├── elements/              # Atomic elements by ArchiMate layer (1 element = 1 file)
│   │   │   ├── 01_motivation/     # Goals, constraints, requirements, stakeholders
│   │   │   ├── 02_business/       # Roles, actors, processes, products, rules
│   │   │   ├── 03_application/    # Components, services, data objects
│   │   │   ├── 04_technology/     # Nodes, technology services, equipment
│   │   │   └── 05_implementation/ # Activities, changes
│   │   ├── relations/             # First-class, time-aware relations (1 relation = 1 file)
│   │   ├── assertions/            # Compliance assertions (REQUIREMENT ↔ subject)
│   │   └── views/                 # Composite diagrams and aggregations over elements
│   │       ├── goals/  capabilities/  processmap/  bpmn/  dgca/
│   │       └── blocks/  activities/  products/  applications/  scenarios/  …
│   ├── field/                     # Zone: raw material — interviews, surveys, observations, drafts
│   ├── codex/                     # Zone: external laws / regulations + internal policies / standards
│   │   ├── external/<jurisdiction>/
│   │   └── internal/
│   ├── operations/                # Operational layer (NOT a zone) — team's own ADRs + Work Items (§1.1)
│   │   ├── decisions/             #   ADR-YYYY-MM-DD-<slug>.md (or legacy ADR-NNNN-<slug>.md)
│   │   └── work-items/            #   WI-NNNN-<slug>.md
│   ├── .templates/                # Copy-and-fill templates for elements / relations / views
│   └── .validators/                # Lint and schema scripts
```

Two layers stay separate inside `canon/`:

- **`canon/elements/`** holds atomic ArchiMate-typed objects. Each file describes exactly one element — its identity, type, properties, metadata, admission record, and lifecycle. No aggregation, no flow, no list of related items.
- **`canon/views/`** holds compositions over elements. A goals tree is a hierarchy referencing many Goal elements. A BPMN diagram is a detailed flow over a single BusinessProcess element. A products list is a filtered view over all elements of type Product. Views aggregate; elements stay atomic.

Every canonical artefact carries an **admission record** and a **primitive lifecycle** (`valid_from` / `valid_to`) — both defined in [`notations/CONTRACT.md`](../notations/CONTRACT.md) §6–7. Attributes that change over time live in `*.history.yaml` sidecars, not inline.

### 1.1 Operational layer — Team Operations (`operations/`)

Alongside the model zones, an adopter team optionally keeps an **operational layer** — its own decision log and in-flight work — at `organizations/<org>/operations/`. This is the **Team Operations** convention: a sibling folder containing `decisions/` (Architecture Decision Records, `ADR-…`) and `work-items/` (Work Items, `WI-…`), plus a one-screen local README.

`operations/` is **not** a zone. It sits outside `canon` / `field` / `codex`, is not admitted through the zone gates, and its IDs (`ADR-YYYY-MM-DD` or legacy `ADR-NNNN`, `WI-NNNN`) are deliberately outside the canonical TYPE registry. It exists to keep the team's own working artefacts under the same version control and review surface as the model, without leaking into the model.

Team Operations Work Items record what the team itself is doing; a problem, risk, or weakness *about the modelled enterprise* is a model finding, captured as an `ASSESSMENT` in canon. (The former model-side `issues` notation was retired, 2026-06-07.)

Full convention: [`method/06-team-operations.md`](06-team-operations.md). Worked example: [`operations/`](https://github.com/transitrix/acme-corp/tree/main/operations/) in the acme-corp reference repo.

Why multi-tenant: a single repository can hold an entire portfolio of organisations (parent group plus subsidiaries; advisory relationships; multiple business units). Each organisation has full structural isolation while sharing methodology and validators.

---

**Next:** [`03-modelling.md`](03-modelling.md) — how to write elements and relations.

**Last reviewed:** 2026-08-16. Split from the former `01-methodology.md` §4 — see [`method/01-methodology.md`](01-methodology.md) for the redirect. This release restores the `04_technology/` line under `canon/elements/`, missing from the tree since the original was written.
**Status:** Active.
