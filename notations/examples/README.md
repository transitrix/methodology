# Transitrix Studio — examples

One subfolder per diagram format. Open any example file in VS Code with the Transitrix Studio extension installed to see a live preview.

| Folder | File extension | Format | Description |
|---|---|---|---|
| [`bpmn/`](bpmn/) | `*.bpmn.transitrix.yaml` | BPMN | Business process diagrams with lanes, gateways, and flows |
| [`goals/`](goals/) | `*.goals.transitrix.yaml` | Goals tree | Hierarchical goal decomposition (Strategy → Business Goal → Project) |
| [`dgca/`](dgca/) | `*.dgca.transitrix.yaml` | DGCA | Driver → Goal → Change → Action chain; DGA mode via `view_config.layers.changes: off` |
| [`action/`](action/) | `*.action.transitrix.yaml` | Action schedule | AoN / PSND precedence diagram with critical path |
| [`blocks/`](blocks/) | `*.blocks.transitrix.yaml` | Nested block diagrams | Recursive `block` tree rendered as nested boxes |
| [`capability-map/`](capability-map/) | `*.capability-map.transitrix.yaml` | Capabilities map | Capability hierarchy with CMMI maturity assessment |
| [`process-map/`](process-map/) | `*.process-map.transitrix.yaml` | Process landscape map | Top-level catalogue of operating, supporting, and management processes |
| [`products/`](products/) | `*.products.transitrix.yaml` | Products catalogue | Portfolio of digital products, services, platforms, and bundles |
| [`applications/`](applications/) | `*.applications.transitrix.yaml` | Applications catalogue | Inventory of applications, integrations, platforms, and data stores |
| [`integration-map/`](integration-map/) | `*.integration-map.transitrix.yaml` | Integration Map | Application-cooperation graph projected from admitted `INTEGRATION` — includes a rule-violation fixture showing an inline-authored edge is rejected |
| [`scenarios/`](scenarios/) | `*.scenarios.transitrix.yaml` | Scenarios | Planning and simulation scenarios |
| [`process-blueprint/`](process-blueprint/) | `*.process-blueprint.transitrix.yaml` | Process Blueprint | Wide blueprint of a value chain — stages with systems, actors, equipment, information entities |
| [`compliance-impact/`](compliance-impact/) | `*.compliance-impact.transitrix.yaml` | Compliance Impact | Report-config view over the compliance overlay — (obligation × subject) matrix derived from `ASSERTION` + process flow + `REQUIREMENT` status |

Each folder contains a `README.md` with format documentation and the list of example files.

## Quick start

1. Install the **Transitrix Studio** extension in VS Code.
2. Open any example file — the preview panel opens automatically beside the editor.
3. Edit and save the file to refresh the preview.
