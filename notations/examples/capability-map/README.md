# Capability Map notation — examples

File extension: **`.capability-map.transitrix.yaml`**

## Format overview

A capability map is a hierarchical view of what an organisation can do (its capabilities) and how mature each capability is on the CMMI V2.0 1–5 scale. Vertical capabilities (`CAPABILITY-V1`, `CAPABILITY-V1.1`, …) are core business domains; horizontal capabilities (`CAPABILITY-H1`, `CAPABILITY-H1.2`, …) cut across domains (master data management, compliance, ESG).

## Files in this folder

| File | Description |
|---|---|
| [`business.capability-map.transitrix.yaml`](business.capability-map.transitrix.yaml) | Compact three-domain business map with cross-cutting H capabilities and nested levels |
| [`northbay-retail.capability-map.transitrix.yaml`](northbay-retail.capability-map.transitrix.yaml) | Realistic 31-capability map for a mid-size retailer (three verticals × three levels, three horizontals) |

## Notation header

Every file must start with:

```yaml
notation: capability-map
```

## Required fields

| Field | Description |
|---|---|
| `capability_map.id` | Unique identifier for this map |
| `capability_map.name` | Display name |
| `capability_map.assessment_date` | Date in `YYYY-MM-DD` format |
| `capabilities[].id` | Canonical form `CAPABILITY-V[n]` or `CAPABILITY-H[n]` with optional `.n` segments — unique across the tree (see [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §2) |
| `capabilities[].name` | Capability name |
| `capabilities[].current_maturity` | Integer 1–5 (CMMI level) |

## Optional fields per capability

| Field | Description |
|---|---|
| `type` | `domain` or `supporting` |
| `description` | Short description |
| `target_maturity` | Integer 1–5 |
| `target_date` | Date in `YYYY-MM-DD` |
| `owner_role` | Responsible role |
| `business_process` | Process ID this capability is realised by |
| `applications` | List of supporting application IDs |
| `children` | List of sub-capabilities (same shape, recursive) |

## CMMI maturity levels

| Level | Name | Colour |
|---|---|---|
| 1 | Initial | red |
| 2 | Managed | orange |
| 3 | Defined | yellow |
| 4 | Quantitatively Managed | light green |
| 5 | Optimising | green |

## Preview

Open any `.capability-map.transitrix.yaml` file in VS Code with Transitrix Studio installed — the preview panel opens automatically showing the capability tree, vertical and horizontal axes separated, with current → target maturity pills on each node.
