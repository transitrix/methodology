---
title: "Transitrix Implementation Tiers"
version: "0.1"
last_updated: "2026-06-26"
status: "documented"
---

# Transitrix Implementation Tiers

Transitrix offers two implementation tiers: **Simple** and **Full**. The split reflects how much of the methodology's vocabulary and tooling a team needs to adopt upfront.

**Simple is self-contained — not a demo of Full.** A team that adopts Simple and gets lasting value from it is a success, whether or not they ever move to Full. The upgrade trigger is an organic ceiling: a set of questions that Simple artefacts genuinely cannot answer, not an artificial limitation built in to push adoption.

The formal vocabulary boundary is the **coverage profile** declared in `transitrix.yaml` (see [`notations/COVERAGE_PROFILES.md`](notations/COVERAGE_PROFILES.md)). Simple maps to the `core` preset; Full maps to the `full` preset.

---

## At a glance

| | **Simple** | **Full** |
|---|---|---|
| **Target** | Small teams, startups, greenfield pilots, single-domain adopters | Mature EA practices, compliance-driven organisations, regulated industries |
| **Scope** | Processes, goals, work tracking, basic catalogues | + Capability maturity, compliance management, regulatory monitoring, governance chains |
| **Delivery** | Self-service via the onboard skill | Initial model build typically consulting-assisted; ongoing maintenance team-led |
| **Coverage profile** | `core` | `full` |
| **Outcome** | A version-controlled, validated operating model | A measurable, compliance-trackable architecture with a continuous-improvement loop |

---

## Simple tier

### Who it's for

Small teams, startups, and first-time adopters who want to model their operating reality — processes, goals, projects, people — without the overhead of formal compliance tracking or capability maturity scoring.

Also appropriate as the starting point for any new organisational domain, even inside a large enterprise, before its compliance and governance requirements are fully known.

### Coverage profile

Declare `coverage_profile: core` in `transitrix.yaml`. The `core` preset provides: `DRIVER`, `GOAL`, `CONSTRAINT`, `REQUIREMENT`, `STAKEHOLDER` (motivation layer); `CAPABILITY`, `PROCESS`, `ACTOR`, `ROLE`, `RULE` (business layer); `APPLICATION`, `INTEGRATION` (application layer); `ACTION`, `CHANGE`, `MILESTONE` (implementation layer). The `codex` zone and its dependent elements (`ASSERTION`, `AMENDMENT`, `SEGMENT`) are not in scope at this tier.

### Notations

| Notation | Short name | File extension | What it documents |
|---|---|---|---|
| BPMN Process Diagram | `bpmn` | `*.bpmn.transitrix.yaml` | Individual processes — lanes, gateways, sequence flows |
| Goals Tree | `goals` | `*.goals.transitrix.yaml` | Strategic and tactical objectives in a hierarchy |
| Process Map | `process-map` | `*.process-map.transitrix.yaml` | Landscape of all processes (operating / supporting / management) |
| Action Schedule | `action` | `*.action.transitrix.yaml` | Project schedule — actions and their dependencies |
| Actions Tree | `actions-tree` | `*.actions-tree.transitrix.yaml` | Strategic portfolio tree: Initiative → Programme → Project → Task |
| Action Card | `action-card` | `*.action-card.transitrix.yaml` | Single-project narrative with DGCA chain, milestones, gates |
| Products Catalogue | `products` | `*.products.transitrix.yaml` | Inventory of products and services |
| Applications Catalogue | `applications` | `*.applications.transitrix.yaml` | Inventory of applications and integrations |
| Nested Blocks | `blocks` | `*.blocks.transitrix.yaml` | Structural / zoning overviews — recursive nested containers |

### Skills

| Skill | Invocation | Purpose |
|---|---|---|
| Onboard | `/transitrix:onboard` | Scaffold a clean zoned repo and author the first model file |
| Ingest | `/transitrix:ingest` | Bring in raw organisational material — interviews, policies, documents — as field artefacts and typed canon candidates |
| Repo-check | `/transitrix:repo-check` | Read-only health check: methodology version, zone counts, adoption indicator, integrity flags |

### Adoption pattern

**Transitrix Alone** — a single repository as the EA source of truth. See [`patterns/transitrix-alone.md`](patterns/transitrix-alone.md).

### What "done" looks like

A Git repository where:

- Every key business process is a `.bpmn.transitrix.yaml` file, version-controlled and passing `npx @transitrix/cli validate`.
- Strategic goals are a Goals Tree, linked to the processes that deliver them.
- Projects and work packages are tracked as Action elements in an Actions Tree.
- People and their roles are modelled as Actor elements.
- The whole repo passes the standard CI lint (schema validity, referential integrity, ArchiMate-layer rules).

---

## Full tier

### Who it's for

Organisations with active compliance obligations (regulated industries, government, larger enterprises with security or data-governance requirements), teams running formal capability-improvement programmes, or EA practices that need a governance chain connecting strategic intent to delivery.

### Coverage profile

Declare `coverage_profile: full` in `transitrix.yaml` (or omit `coverage_profile` — `full` is the default). This adds to the `core` vocabulary: `ASSERTION` (compliance claims), and the field-zone primitives `AMENDMENT` (regulatory change records) and `SEGMENT` (extracted codex chunks). The `codex` zone is also required (`zones:` must include `codex`).

### What it adds on top of Simple

**Additional notations:**

| Notation | Short name | File extension | What it documents |
|---|---|---|---|
| DGCA Strategy-to-Execution Chain | `dgca` | `*.dgca.transitrix.yaml` | Driver → Goal → Change → Activity governance chain; layer toggle for DGA mode |
| Capability Map | `capability-map` | `*.capability-map.transitrix.yaml` | Capability hierarchy with CMMI V2.0 maturity scoring, addressing, and orientation |
| Process Blueprint | `process-blueprint` | `*.process-blueprint.transitrix.yaml` | Wide value-chain blueprint — stages, goals, results, supporting systems, actors |
| Scenarios | `scenarios` | `*.scenarios.transitrix.yaml` | Report-config view over the Scenario catalogue — alternative paths, target states |
| Compliance Impact | `compliance-impact` | `*.compliance-impact.transitrix.yaml` | Obligation × subject coverage matrix derived from Assertions, Requirements, processes |
| Coverage Metric | `coverage-metric` | `*.coverage-metric.transitrix.yaml` | Regulatory obligation coverage by jurisdiction — distinguishes "not modelled" from "asserted n/a" |

**Additional element notations:**

| Element | Short name | What it represents |
|---|---|---|
| Codex | `codex` | External authority documents (laws, regulations) and internal policies / standards |
| Requirement | `requirement` | Motivation-layer positive obligation derived from a Codex source |
| Assertion | `assertion` | Claim that a Requirement is satisfied by a specific product, process, or capability |
| Relations | `relation` | First-class, time-aware links between canonical primitives — full set of twelve relation kinds |
| Amendment | `amendment` | Field-zone record of a detected change to a watched Codex source |
| Segment | `segment` | Field-zone extracted chunk of a Codex source — the text-level provenance an Amendment or Requirement cites |

**Additional skills:**

| Skill | Invocation | Purpose |
|---|---|---|
| Reg-intel | `/transitrix:reg-intel` | Monitors Codex sources for changes; emits Amendment records and Requirement candidates; stages results in a human review digest |
| Report | `/transitrix:report` | Conversational compliance reporting — resolves a plain-language request to a declarative view-config, renders via CLI to Markdown or PDF |

**Additional adoption patterns:**

| Pattern | File | When to use |
|---|---|---|
| Transitrix + Knowledge Store | [`patterns/knowledge-store.md`](patterns/knowledge-store.md) | Multiple raw-source repositories feed a curated knowledge repo that feeds Transitrix canon |
| Transitrix + Enterprise ADR Registry | [`patterns/enterprise-adr-registry.md`](patterns/enterprise-adr-registry.md) | Transitrix repo aggregates cross-project architectural decisions as the enterprise ADL |

---

## Upgrade trigger

Move from Simple to Full when you hit one of these organic ceilings — a question your Simple model cannot answer:

| Question | Full capability that answers it |
|---|---|
| "Are we compliant with GDPR / SOC 2 / ISO 27001?" | Codex → Requirement → Assertion → Compliance Impact view |
| "Which obligations are not yet covered by any assertion?" | Coverage Metric view |
| "How does this regulation change affect our products and processes?" | reg-intel skill → Amendment element → Compliance Impact |
| "Which of our capabilities are below target maturity?" | Capability Map with CMMI scoring |
| "How does our strategy connect to the work we're actually doing?" | DGCA chain |
| "Which regulatory sources have changed since our last review?" | reg-intel skill → Amendment records in the review digest |

If any of these questions arise regularly, the Simple ceiling has been reached.

---

## Upgrade path

The upgrade is **additive** — Simple artefacts continue to work unchanged.

1. Update `transitrix.yaml`: change `coverage_profile: core` to `coverage_profile: full` (or omit the field entirely) and add `codex` to the `zones:` list.
2. Add a `codex/` folder. Introduce your first Codex documents — the laws, regulations, or policies your organisation must comply with.
3. Run the ingest skill against existing policy documents to surface Requirement candidates, or author Requirements directly from your Codex sources.
4. Author Assertions: link each Requirement to the products, processes, or capabilities that satisfy it.
5. Add the Compliance Impact view to see the coverage matrix.
6. Optionally, add the reg-intel skill to a CI schedule to monitor sources for amendments.

The DGCA chain and Capability Map can be added in any order — they depend only on your existing Goal and Capability elements from the `core` profile.

For methodology version upgrades (migrating from one spec release to another), see [`migrations/`](migrations/) and [`RELEASING.md`](RELEASING.md). A tier upgrade is a model-scope decision, not a version change — no migration recipe applies.

---

## Relation to coverage profiles and notations

The tier model is a **decision aid for adoption**, not a separate technical mechanism. The formal controls are:

- **`coverage_profile`** in `transitrix.yaml` — the vocabulary gate (which element TYPEs and relation kinds are in scope). Simple uses `core`; Full uses `full`. See [`notations/COVERAGE_PROFILES.md`](notations/COVERAGE_PROFILES.md).
- **`notations:`** in `transitrix.yaml` — the list of view notations the repo uses. A Simple adopter typically lists a subset of Simple notations; a Full adopter adds the Full notations as needed.

A repository that declares `coverage_profile: core` cannot accidentally admit Assertion or Amendment elements (the validator enforces the boundary). This means the tier boundary is machine-checked, not just advisory.
