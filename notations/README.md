# Notations

Transitrix is a text-native methodology: every architecture artefact lives in a YAML (or Svgbob) file whose syntax is governed by one of the notations below. This index lists the eleven notations, what each is for, and how the strategy-chain family fits together.

## Catalogue

| Spec | Short name | Purpose | File extension | Status |
|---|---|---|---|---|
| [01-bpmn.md](01-bpmn.md) | `bpmn` | BPMN 2.0 process flow — lanes, gateways, sequence flows. | `*.bpmn.transitrix.yaml` | documented |
| [02-fgca.md](02-fgca.md) | `fgca` | Four-layer strategy-to-execution chain: Factor → Goal → Change → Activity. | `*.fgca.transitrix.yaml` | documented |
| [03-fga.md](03-fga.md) | `fga` | Simplified strategy-to-execution chain: Factor → Goal → Activity (no Changes layer). | `*.fga.transitrix.yaml` | draft |
| [04-goals.md](04-goals.md) | `goals` | Hierarchy of strategic and tactical goals as a tree. | `*.goals.transitrix.yaml` | documented |
| [05-capability-map.md](05-capability-map.md) | `capability-map` | Capability hierarchy with CMMI V2.0 maturity, addressing, vertical/horizontal orientation. | `*.capability-map.transitrix.yaml` | documented |
| [06-process-map.md](06-process-map.md) | `process-map` | Top-level catalogue of processes grouped into Operating, Supporting, and Management. | `*.process-map.transitrix.yaml` | draft |
| [07-activities.md](07-activities.md) | `activities` | Project Schedule Network Diagram in Activity-on-Node (AoN) form — activities and dependencies. | `*.activities.transitrix.yaml` | documented |
| [08-blocks.md](08-blocks.md) | `blocks` | Multi-level container layouts for deep architectural overviews, rendered via Svgbob. | `*.blocks.transitrix.txt` | documented |
| [09-products.md](09-products.md) | `products` | Inventory of products and services — text-and-table catalogue, no diagram. | `*.products.transitrix.yaml` | draft |
| [10-applications.md](10-applications.md) | `applications` | Inventory of applications and integrations — text-and-table catalogue, no diagram. | `*.applications.transitrix.yaml` | draft |
| [11-scenarios.md](11-scenarios.md) | `scenarios` | Alternative strategic development paths — each scenario scopes its own goals, capabilities, activities, products, processes, applications. | `*.scenarios.transitrix.yaml` | documented |

All notations share the same file-extension convention `.<short-name>.transitrix.<ext>` (`yaml` for everything except `blocks`, which uses `txt`), and every file begins with a `notation: <short-name>` header — see each spec's "File header" section for the rule.

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
| **FGCA** ([02-fgca.md](02-fgca.md)) | ✓ | ✓ | ✓ | ✓ |
| **FGA** ([03-fga.md](03-fga.md)) | ✓ | ✓ | — | ✓ |
| **Goals tree** ([04-goals.md](04-goals.md)) | — | ✓ | — | — |
| **Activities network** ([07-activities.md](07-activities.md)) | — | — | — | ✓ |

### Selection matrix

| Situation | Recommended notation |
|---|---|
| You need to trace strategic drivers through goals and explicit transformation steps to deliverable initiatives. | **FGCA** |
| You need the same chain, but the transformation step between goals and activities is implicit or trivial. | **FGA** |
| You need to decompose goals hierarchically (strategy → tactical → operational) without naming factors or activities. | **Goals tree** |
| You need to plan delivery — activities, dependencies, durations, Gantt — and the strategic context is already settled elsewhere. | **Activities** |
| You need a quarterly goals review with no factor or activity context. | **Goals tree** |
| You're explaining why a goal-action gap exists and what transformation closes it. | **FGCA** |

### Form rule — nested for trees, flat for DAGs

The four notations split into two structural shapes:

- **Tree-shaped, nested form.** FGA and the Goals tree are trees — each child has exactly one parent. The document nests children under parents directly; the YAML structure carries the hierarchy and no id-references are needed inside the document.
- **DAG-shaped, flat form.** FGCA and the Activities network are DAGs — one Change can deliver many Goals; one Activity can deliver many Changes; activity predecessors fan out the same way. Nesting would require duplicating nodes for every cross-layer link. These notations use a single root key (`fgca:` for FGCA, the top-level `activities:` array for Activities) with parallel layer arrays and id-references between layers.

**Rule of thumb:** if a child element can have multiple parents in the semantic graph, the notation uses the flat form. The rule was set on 2026-05-20 alongside the FGCA schema; see [02-fgca.md](02-fgca.md) "Top-level structure — flat form" for the worked-out FGCA shape and [07-activities.md](07-activities.md) §4 for the Activities shape.

## Examples

Worked example files for every notation live under [`examples/`](examples/); each subfolder has a short README of its own.
