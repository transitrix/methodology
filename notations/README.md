# Notations

Transitrix is a text-native methodology: every architecture artefact lives in a YAML (or Svgbob) file whose syntax is governed by one of the notations below. This index lists the eleven notations, what each is for, and how the strategy-chain family fits together.

## Catalogue

| Spec | Short name | Purpose | File extension | Status |
|---|---|---|---|---|
| [01-bpmn.md](01-bpmn.md) | `bpmn` | BPMN 2.0 process flow — lanes, gateways, sequence flows. | `*.bpmn.transitrix.yaml` | implemented |
| [02-fgca.md](02-fgca.md) | `fgca` | Four-layer strategy-to-execution chain: Factor → Goal → Change → Activity. | `*.fgca.transitrix.yaml` | documented |
| [03-fga.md](03-fga.md) | `fga` | Simplified strategy-to-execution chain: Factor → Goal → Activity (no Changes layer). | `*.fga.transitrix.yaml` | planned |
| [04-goals.md](04-goals.md) | `goals` | Hierarchy of strategic and tactical goals as a tree. | `*.goals.transitrix.yaml` | implemented |
| [05-capability-map.md](05-capability-map.md) | `capability-map` | Capability hierarchy with CMMI V2.0 maturity, addressing, vertical/horizontal orientation. | `*.capability-map.transitrix.yaml` | implemented |
| [06-process-map.md](06-process-map.md) | `process-map` | Top-level catalogue of processes grouped into Operating, Supporting, and Management. | `*.process-map.transitrix.yaml` | planned |
| [07-activities.md](07-activities.md) | `activities` | Project Schedule Network Diagram in Activity-on-Node (AoN) form — activities and dependencies. | `*.activities.transitrix.yaml` | standard |
| [08-blocks.md](08-blocks.md) | `blocks` | Multi-level container layouts for deep architectural overviews, rendered via Svgbob. | `*.blocks.transitrix.txt` | implemented |
| [09-products.md](09-products.md) | `products` | Inventory of products and services — text-and-table catalogue, no diagram. | `*.products.transitrix.yaml` | planned |
| [10-applications.md](10-applications.md) | `applications` | Inventory of applications and integrations — text-and-table catalogue, no diagram. | `*.applications.transitrix.yaml` | planned |
| [11-scenarios.md](11-scenarios.md) | `scenarios` | Alternative strategic development paths — each scenario scopes its own goals, capabilities, activities, products, processes, applications. | `*.scenarios.transitrix.yaml` | implemented |

All notations share the same file-extension convention `.<short-name>.transitrix.<ext>` (`yaml` for everything except `blocks`, which uses `txt`), and every file begins with a `notation: <short-name>` header — see each spec's "File header" section for the rule.

## Picking between FGCA, FGA, Goals, Activities

Four notations sit on the same strategy-to-execution spectrum and differ in which layers they carry: **FGCA** is the full Factor → Goal → Change → Activity chain (use when the transformation steps between goals and activities are non-trivial); **FGA** is the same chain with the Changes layer collapsed (use when changes need not be tracked as first-class objects); the **Goals tree** carries only Goals (use when the work is about hierarchy and decomposition, not about what drives or executes the goals); the **Activities network** carries only Activities in AoN form (use for delivery planning where the strategic context is already settled). For the full selection matrix mapping input situation to recommended notation, see strategy task [#17](https://github.com/vkgeorgia/strategy/issues/17).

## Examples

Worked example files for every notation live under [`examples/`](examples/); each subfolder has a short README of its own.
