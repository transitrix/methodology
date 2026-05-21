# Transitrix Studio — examples

One subfolder per diagram format. Open any example file in VS Code with the Transitrix Studio extension installed to see a live preview.

| Folder | File extension | Format | Description |
|---|---|---|---|
| [`bpmn/`](bpmn/) | `*.bpmn.transitrix.yaml` | BPMN | Business process diagrams with lanes, gateways, and flows |
| [`goals/`](goals/) | `*.goals.transitrix.yaml` | Goals tree | Hierarchical goal decomposition (Strategy → Business Goal → Project) |
| [`fgca/`](fgca/) | `*.fgca.transitrix.yaml` | FGCA | Factor → Goal → Change → Activity chain |
| [`fga/`](fga/) | `*.fga.transitrix.yaml` | FGA | Factor → Goal → Activity (FGCA without Changes) |
| [`activities/`](activities/) | `*.activities.transitrix.yaml` | Activity network | AoN / PSND precedence diagram with critical path |
| [`blocks/`](blocks/) | `*.blocks.transitrix.txt` | Nested block diagrams | ASCII art architecture maps rendered via svgbob |
| [`capability-map/`](capability-map/) | `*.capability-map.transitrix.yaml` | Capabilities map | Capability hierarchy with CMMI maturity assessment |
| [`process-map/`](process-map/) | `*.process-map.transitrix.yaml` | Process landscape map | Top-level catalogue of operating, supporting, and management processes |
| [`products/`](products/) | `*.products.transitrix.yaml` | Products catalogue | Portfolio of digital products, services, platforms, and bundles |
| [`applications/`](applications/) | `*.applications.transitrix.yaml` | Applications catalogue | Inventory of applications, integrations, platforms, and data stores |
| [`scenarios/`](scenarios/) | `*.scenarios.transitrix.yaml` | Scenarios | Planning and simulation scenarios |
| [`process-blueprint/`](process-blueprint/) | `*.process-blueprint.transitrix.yaml` | Process Blueprint | Wide blueprint of a value chain — stages with systems, actors, equipment, information entities |

Each folder contains a `README.md` with format documentation and the list of example files.

## Quick start

1. Install the **Transitrix Studio** extension in VS Code.
2. Open any example file — the preview panel opens automatically beside the editor.
3. Edit and save the file to refresh the preview.

For how `examples/` fits into the broader repo layout, see [`docs/repo-layout.md`](../docs/repo-layout.md).
