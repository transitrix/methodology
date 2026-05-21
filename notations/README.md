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

## Picking between FGCA, FGA, Goals, Activities

Four notations sit on the same strategy-to-execution spectrum and differ in which layers they carry: **FGCA** is the full Factor → Goal → Change → Activity chain (use when the transformation steps between goals and activities are non-trivial); **FGA** is the same chain with the Changes layer collapsed (use when changes need not be tracked as first-class objects); the **Goals tree** carries only Goals (use when the work is about hierarchy and decomposition, not about what drives or executes the goals); the **Activities network** carries only Activities in AoN form (use for delivery planning where the strategic context is already settled). A dedicated selection matrix — mapping each input situation to the recommended notation — will be added to this index as a separate section.

## Examples

Worked example files for every notation live under [`examples/`](examples/); each subfolder has a short README of its own.
