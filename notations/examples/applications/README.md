# Applications notation — examples

File extension: **`.applications.transitrix.yaml`**

## Format overview

An applications catalogue inventories the software systems an organisation operates — applications, integrations, platforms, and data stores. Each entry records its type, lifecycle status, vendor, maturity, and cross-references to capabilities, products, and integration endpoints.

## Files in this folder

| File | Description |
|---|---|
| [`portfolio-2026.applications.transitrix.yaml`](portfolio-2026.applications.transitrix.yaml) | Seven-entry portfolio covering all types and statuses including Decommissioning |

## Notation header

Every file must start with:

```yaml
notation: applications
```

## Required fields

| Field | Description |
|---|---|
| `applications_catalogue.id` | Unique identifier for the catalogue |
| `applications_catalogue.name` | Display name |
| `applications_catalogue.updated_at` | Date in `YYYY-MM-DD` format |
| `applications[].app_id` | Unique identifier within the catalogue |
| `applications[].name` | Application name |
| `applications[].type` | One of: `application`, `integration`, `platform`, `data_store` |
| `applications[].status` | One of: `Draft`, `Active`, `Deprecated`, `Decommissioning` |

## Optional fields per application

| Field | Description |
|---|---|
| `domain` | Business domain |
| `owner_role` | Responsible role or team |
| `vendor` | Vendor name or `Internal` |
| `maturity` | Integer 1–5 (CMM level, displayed as ●●●○○ dots) |
| `description` | Short description |
| `capabilities` | List of capability names |
| `products` | List of product IDs this application supports |
| `integrations` | List of integration descriptors (target, direction, protocol, description) |
| `source` / `target` / `protocol` | Top-level fields for type `integration` entries |

## Integration direction values

`inbound` · `outbound` · `bidirectional`

## Status badge colours

| Status | Colour |
|---|---|
| Active | Green (success) |
| Draft | Blue (info) |
| Deprecated | Amber (warning) |
| Decommissioning | Red (error) |

## Preview

Open any `.applications.transitrix.yaml` file in VS Code with Transitrix Studio installed — the preview panel opens automatically showing a catalogue table.
