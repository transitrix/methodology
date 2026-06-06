# Notations

Transitrix is a text-native methodology: every architecture artefact lives in a YAML (or Svgbob) file whose syntax is governed by one of the notations below. The folder splits the notations by kind: **view notations** describe render-able diagrams (`*.transitrix.yaml` files that a tool can lay out into a picture); **element notations** describe canon-zone primitives (standalone elements that other notations reference). This index lists both, what each is for, and how the strategy-chain family fits together.

## Views

The 15 view notations live under [`views/`](views/) — each describes a render-able artefact with its own YAML schema and file extension.

| Spec | Short name | Purpose | File extension | Status |
|---|---|---|---|---|
| [01-bpmn.md](views/01-bpmn.md) | `bpmn` | BPMN 2.0 process flow — lanes, gateways, sequence flows. | `*.bpmn.transitrix.yaml` | documented |
| [02-fgca.md](views/02-fgca.md) | `fgca` | Four-layer strategy-to-execution chain: Factor → Goal → Change → Activity. | `*.fgca.transitrix.yaml` | documented |
| [03-fga.md](views/03-fga.md) | `fga` | Simplified strategy-to-execution chain: Factor → Goal → Activity (no Changes layer). | `*.fga.transitrix.yaml` | draft |
| [04-goals.md](views/04-goals.md) | `goals` | Hierarchy of strategic and tactical goals as a tree. | `*.goals.transitrix.yaml` | documented |
| [05-capability-map.md](views/05-capability-map.md) | `capability-map` | Capability hierarchy with CMMI V2.0 maturity, addressing, vertical/horizontal orientation. | `*.capability-map.transitrix.yaml` | documented |
| [06-process-map.md](views/06-process-map.md) | `process-map` | Top-level catalogue of processes grouped into Operating, Supporting, and Management. | `*.process-map.transitrix.yaml` | draft |
| [07-activities.md](views/07-activities.md) | `activities` | Project Schedule Network Diagram in Activity-on-Node (AoN) form — activities and dependencies. | `*.activities.transitrix.yaml` | documented |
| [08-blocks.md](views/08-blocks.md) | `blocks` | Multi-level container layouts for deep architectural overviews — recursive `block` tree rendered as nested boxes. | `*.blocks.transitrix.yaml` | documented |
| [09-products.md](views/09-products.md) | `products` | Inventory of products and services — text-and-table catalogue, no diagram. | `*.products.transitrix.yaml` | draft |
| [10-applications.md](views/10-applications.md) | `applications` | Inventory of applications and integrations — text-and-table catalogue, no diagram. | `*.applications.transitrix.yaml` | draft |
| [11-scenarios.md](views/11-scenarios.md) | `scenarios` | Report-config view over the `SCENARIO` element catalogue — rendering / ordering / filtering of alternative paths, each pointing at a `TARGET_STATE` and serving one or more `GOAL`s. | `*.scenarios.transitrix.yaml` | draft |
| [12-issues.md](views/12-issues.md) | `issues` | Register of issues — problems, defects, open questions — in a parent/child tree, complementing the activities plan. | `*.issues.transitrix.yaml` | draft |
| [13-process-blueprint.md](views/13-process-blueprint.md) | `process-blueprint` | Wide blueprint of a value chain — stages laid out left-to-right, each carrying its goal, result, and supporting systems / actors / equipment / information entities. | `*.process-blueprint.transitrix.yaml` | draft |
| [18-activity-card.md](views/18-activity-card.md) | `activity-card` | Single-project narrative view — FGCA chain, dates, milestones, gate decisions. | `*.activity-card.transitrix.yaml` | documented |
| [21-compliance-impact.md](views/21-compliance-impact.md) | `compliance-impact` | Report-config view over the compliance overlay — derives the (obligation × subject) matrix from `ASSERTION` + process flow + `REQUIREMENT` status; distinguishes "No mapped obligation (current model)" from `n_a`. | `*.compliance-impact.transitrix.yaml` | draft |

All view notations share the same file-extension convention `.<short-name>.transitrix.yaml`, and every file begins with a `notation: <short-name>` header — see each spec's "File header" section for the rule.

## Elements

The 6 element notations live under [`elements/`](elements/) — each defines a canon-zone primitive: standalone YAML files admitted to canon and referenced (by ID) from views and other elements. Element primitives carry their own admission record + primitive lifecycle per [`CONTRACT.md`](CONTRACT.md) §6–7.

| Spec | Short name | Purpose | File location | Status |
|---|---|---|---|---|
| [14-codex.md](elements/14-codex.md) | `codex` | External laws / regulations and internal policies / standards in the codex zone. | `codex/external/<jurisdiction>/<ID>.yaml`, `codex/internal/<ID>.yaml` | documented |
| [15-requirement.md](elements/15-requirement.md) | `requirement` | Motivation-layer element capturing a positive obligation derived from a codex source. | `canon/elements/01_motivation/requirements/REQUIREMENT-<…>.yaml` | documented |
| [16-assertion.md](elements/16-assertion.md) | `assertion` | Canon-zone primitive linking a REQUIREMENT to a subject (PRODUCT / PROCESS / CAPABILITY). | `canon/assertions/ASSERTION-<…>.yaml` | documented |
| [17-relations.md](elements/17-relations.md) | `relation` | First-class, time-aware relation between two canonical primitives — `parent` / `goal_parent` / `activity_goal` / `unit_parent` / engagement kinds. | `canon/relations/REL-<…>.yaml` | documented |
| [19-actors.md](elements/19-actors.md) | `actor` | Active-structure identity primitive — `person` / `business_unit` / `system` (replaces the former UNIT / EMPLOYEE TYPEs). | `canon/elements/02_business/actors/ACTOR-<…>.yaml` | draft |
| [20-stakeholders.md](elements/20-stakeholders.md) | `stakeholder` | Motivation-layer interest primitive — `internal` / `external`; carries the stake profile and references an `ACTOR` for identity. | `canon/elements/01_motivation/stakeholders/STAKEHOLDER-<…>.yaml` | draft |

Element notations don't carry the `*.transitrix.yaml` extension convention — they're addressed by ID, and their file location is governed by the per-notation rule above.

The cross-cutting **element-primitive file schema** — the common envelope every standalone element file carries, which TYPEs get a standalone file vs. live only inline in a view, and where each lives on disk — is defined once in [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md). The element notations above are specialised instances of that envelope.

The cross-cutting **Coverage Profile** — the mechanism an adopter uses to declare which slice of the methodology's vocabulary (per-layer element TYPEs + relation TYPEs) is in scope for their repository — is defined in [`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md). Adopters declare a profile in [`transitrix.yaml`](MANIFEST.md); the default when omitted is `full`.

## Status vocabulary

The `status:` field in each spec's front-matter describes the **spec's maturity** — how stable and complete the notation specification is. It does **not** describe whether a tool implements the notation; tool implementation is tracked separately in the `dsm_status:` field on the same spec.

| Value | Meaning |
|---|---|
| `draft` | The spec is incomplete or has known open structural questions; content may change in non-backwards-compatible ways. |
| `documented` | The spec is complete and internally consistent. No open structural questions. Minor additive revisions are expected. |
| `stable` | The schema is locked. Future changes must be backwards-compatible (additive only). |

The vocabulary is intentionally small. A future `deprecated` value will be added when a notation is retired.

## Family selection

Four notations — FGCA, FGA, the Goals tree, and the Activities network — sit on the same strategy-to-execution spectrum. They differ in which layers they carry; the right one for a given task is the one that names exactly the layers you need to talk about, no more.

### Layer composition

| Notation | Factor | Goal | Change | Activity |
|---|:---:|:---:|:---:|:---:|
| **FGCA** ([02-fgca.md](views/02-fgca.md)) | ✓ | ✓ | ✓ | ✓ |
| **FGA** ([03-fga.md](views/03-fga.md)) | ✓ | ✓ | — | ✓ |
| **Goals tree** ([04-goals.md](views/04-goals.md)) | — | ✓ | — | — |
| **Activities network** ([07-activities.md](views/07-activities.md)) | — | — | — | ✓ |

### Selection matrix

| Situation | Recommended notation |
|---|---|
| You need to trace strategic drivers through goals and explicit transformation steps to deliverable initiatives. | **FGCA** |
| You need the same chain, but the transformation step between goals and activities is implicit or trivial. | **FGA** |
| You need to decompose goals hierarchically (strategy → tactical → operational) without naming factors or activities. | **Goals tree** |
| You need to plan delivery — activities, dependencies, durations, Gantt — and the strategic context is already settled elsewhere. | **Activities** |
| You need a quarterly goals review with no factor or activity context. | **Goals tree** |
| You're explaining why a goal-action gap exists and what transformation closes it. | **FGCA** |

### Form rule — flat top-level arrays with reference-based hierarchy

**All four strategy-chain notations — FGCA, FGA, Goals, Activities — use the flat form.** Document metadata and the layer arrays live at the document root as parallel top-level arrays. There is no wrapper root key. Where a notation is tree-shaped (Goals, Activities), hierarchy is expressed by `parent` references on each element inside the flat array. Where a notation is DAG-shaped (FGCA, FGA), cross-layer links are id-references on each element in the canonical downstream direction.

| Notation | Top-level arrays | Hierarchy / cross-link |
|---|---|---|
| **Goals** | `goal_types[]`, `goals[]` | `goal.parent: GOAL-…` (omitted at root) |
| **FGA** | `factors[]`, `goals[]`, `activities[]` | `goal.factors: [FACTOR-…]`; `activity.goals: [GOAL-…]` |
| **FGCA** | `factors[]`, `goals[]`, `changes[]`, `activities[]` | `goal.factors: [FACTOR-…]`; `change.goals: [GOAL-…]`; `activity.changes: [CHANGE-…]` |
| **Activities** | `activities[]` | `activity.predecessors: [ACTIVITY-…]`; optional `parent: ACTIVITY-…` for WBS groupings |

**Decision (2026-05-26)** — this supersedes the earlier "nested for trees, flat for DAGs" heuristic. Reasoning: a single shape across the family removes the spec-vs-implementation gap that the heuristic produced (downstream tools have to handle both forms), and tree-shape semantics survive perfectly well as `parent`-references inside a flat array. The earlier rule was a 2026-05-20 working position alongside the original FGCA schema decision; this entry replaces it.

## Examples

Worked example files for every notation live under [`examples/`](examples/); each subfolder has a short README of its own.
