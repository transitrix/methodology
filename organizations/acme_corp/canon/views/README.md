# `canon/views/`

Composite diagrams and aggregations over architecture elements. Atomic ArchiMate elements live in `canon/elements/<layer>/`; everything that aggregates, filters, or visualises elements lives here.

See [`method/methodology.md` §6](../../../method/methodology.md) for the full notation kit and rationale.

## Subfolder map

| Folder | Notation | File extension | What it holds |
| --- | --- | --- | --- |
| [`goals/`](goals/) | Goals tree | `*.goals.transitrix.yaml` | Hierarchical goals trees |
| [`capabilities/`](capabilities/) | Capabilities map | `*.capability-map.transitrix.yaml` | Capability hierarchies with maturity overlay |
| [`processmap/`](processmap/) | Process landscape map | `*.process-map.transitrix.yaml` | Top-level process catalogues |
| [`bpmn/`](bpmn/) | Process diagram (BPMN) | `*.bpmn.transitrix.yaml` | Detailed process flows |
| [`fgca/`](fgca/) | FGCA chain | `*.fgca.transitrix.yaml` | Factor → Goal → Change → Activity |
| [`fga/`](fga/) | FGA chain | `*.fga.transitrix.yaml` | Factor → Goal → Activity |
| [`blocks/`](blocks/) | Nested block diagrams | `*.blocks.transitrix.yaml` | Recursive `block` tree rendered as nested containers |
| [`activities/`](activities/) | Activity network | `*.activities.transitrix.yaml` | PSND (Activity-on-Node) with Gantt projection and critical path |
| [`products/`](products/) | Products view | `*.products.transitrix.yaml` | Filtered views over Product elements |
| [`applications/`](applications/) | Applications view | `*.applications.transitrix.yaml` | Filtered views over Application elements |
| [`scenarios/`](scenarios/) | Scenarios | `*.scenarios.transitrix.yaml` | Alternative strategic development paths |
| [`process-blueprint/`](process-blueprint/) | Process Blueprint | `*.process-blueprint.transitrix.yaml` | Wide value-chain blueprint with stage aspects |
| [`issues/`](issues/) | Issues register | `*.issues.transitrix.yaml` | Issue register with parent/child nesting |

## Naming

File names use `kebab-case` or descriptive `[DOMAIN]-[CONTEXT]` prefixes. Examples:

```
canon/views/goals/strategy-2026.goals.transitrix.yaml
canon/views/capabilities/customer-domain.capability-map.transitrix.yaml
canon/views/bpmn/order-fulfillment.bpmn.transitrix.yaml
canon/views/fgca/eu-expansion.fgca.transitrix.yaml
canon/views/products/active-portfolio.products.transitrix.yaml
```

## What does NOT go here

Atomic elements — Goals, Capabilities, BusinessProcesses (thin metadata files), Products, ApplicationComponents, etc. — stay in `canon/elements/<layer>/`. The view in `canon/views/products/` is a *filter expression* over many Product elements, each of which lives in `canon/elements/02_business/<id>.yaml`.
