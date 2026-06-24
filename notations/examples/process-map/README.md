# Process Map notation — examples

File extension: **`.process-map.transitrix.yaml`**

## Format overview

A process landscape map is a top-level catalogue of an organisation's processes, grouped into Operating, Supporting, and Management categories. It sits above individual BPMN process diagrams and answers the question **"what processes does the organisation have?"** — not how each one flows.

## Files in this folder

| File | Description |
|---|---|
| [`enterprise.process-map.transitrix.yaml`](enterprise.process-map.transitrix.yaml) | Compact three-group landscape with nine processes |
| [`northbay-retail.process-map.transitrix.yaml`](northbay-retail.process-map.transitrix.yaml) | Realistic 25-process landscape for a mid-size retailer; capability IDs cross-reference [`northbay-retail.capability-map.transitrix.yaml`](../capability-map/northbay-retail.capability-map.transitrix.yaml) |

## Notation header

Every file must start with:

```yaml
notation: process-map
```

## Required fields

| Field | Description |
|---|---|
| `process_map.id` | Unique identifier for the map |
| `process_map.name` | Display name |
| `process_map.updated_at` | Date in `YYYY-MM-DD` format |
| `groups[].id` | Group identifier |
| `groups[].name` | Group display name |
| `groups[].type` | One of: `operating`, `supporting`, `management` |
| `processes[].process_id` | Unique within the map |
| `processes[].name` | Process name |
| `processes[].status` | One of: `Draft`, `Active`, `Deprecated` |

## Optional fields per process

| Field | Description |
|---|---|
| `owner_role` | Responsible role |
| `capability` | Capability ID this process realises (canonical form, e.g. `CAPABILITY-V1`, `CAPABILITY-H1`) |
| `maturity` | **Time-varying** — resolved from `<process_id>.history.yaml` sidecar ([CONTRACT.md](../../CONTRACT.md) §9), not inline on the view. |
| `description` | Short description |

## Preview

Open any `.process-map.transitrix.yaml` file in VS Code with Transitrix Studio installed — the preview panel opens automatically showing each group as a separate section with a table of processes.
