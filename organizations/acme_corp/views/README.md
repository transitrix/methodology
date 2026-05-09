# `views/`

Composite diagrams and aggregations over architecture elements. Atomic ArchiMate elements live in `elements/<layer>/`; everything that aggregates, filters, or visualises elements lives here.

See [`method/methodology.md` §6](../../../method/methodology.md) for the full notation kit and rationale.

## Subfolder map

| Folder | Notation | File extension | What it holds |
| --- | --- | --- | --- |
| [`goals/`](goals/) | Goals tree | `*.goals.transitrix.yaml` | Hierarchical goals trees |
| [`capabilities/`](capabilities/) | Capabilities map | `*.capmap.transitrix.yaml` | Capability hierarchies with maturity overlay |
| [`processmap/`](processmap/) | Process landscape map | `*.processmap.transitrix.yaml` | Top-level process catalogues |
| [`bpmn/`](bpmn/) | Process diagram (BPMN) | `*.bpmn.transitrix.yaml` | Detailed process flows |
| [`fgca/`](fgca/) | FGCA chain | `*.fgca.transitrix.yaml` | Factor → Goal → Change → Activity |
| [`fga/`](fga/) | FGA chain | `*.fga.transitrix.yaml` | Factor → Goal → Activity |
| [`blocks/`](blocks/) | Nested block diagrams | `*.blocks.transitrix.txt` | ASCII / Svgbob block layouts |
| [`activities/`](activities/) | Activities (Mermaid) | `*.mmd` | Mermaid activity / sequence / flow diagrams |
| [`products/`](products/) | Products view | `*.products.transitrix.yaml` | Filtered views over Product elements |
| [`applications/`](applications/) | Applications view | `*.applications.transitrix.yaml` | Filtered views over Application elements |

## Naming

File names use `kebab-case` or descriptive `[DOMAIN]-[CONTEXT]` prefixes. Examples:

```
views/goals/strategy-2026.goals.transitrix.yaml
views/capabilities/customer-domain.capmap.transitrix.yaml
views/bpmn/order-fulfillment.bpmn.transitrix.yaml
views/fgca/eu-expansion.fgca.transitrix.yaml
views/products/active-portfolio.products.transitrix.yaml
```

## What does NOT go here

Atomic elements — Goals, Capabilities, BusinessProcesses (thin metadata files), Products, ApplicationComponents, etc. — stay in `elements/<layer>/`. The view in `views/products/` is a *filter expression* over many Product elements, each of which lives in `elements/02_business/<id>.yaml`.
