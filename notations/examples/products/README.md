# Products notation — examples

File extension: **`.products.transitrix.yaml`**

## Format overview

A products catalogue lists the digital products, services, platforms, and bundles an organisation maintains. Each product entry captures its type, lifecycle status, maturity level, and cross-references to capabilities, processes, and supporting applications.

## Files in this folder

| File | Description |
|---|---|
| [`portfolio-2026.products.transitrix.yaml`](portfolio-2026.products.transitrix.yaml) | Six-product portfolio showing all product types and statuses |

## Notation header

Every file must start with:

```yaml
notation: products
```

## Required fields

| Field | Description |
|---|---|
| `products_catalogue.id` | Unique identifier for the catalogue |
| `products_catalogue.name` | Display name |
| `products_catalogue.updated_at` | Date in `YYYY-MM-DD` format |
| `products[].product_id` | Unique identifier within the catalogue |
| `products[].name` | Product name |
| `products[].type` | One of: `digital_product`, `service`, `platform`, `bundle` |
| `products[].status` | One of: `Draft`, `Active`, `Deprecated` |

## Optional fields per product

| Field | Description |
|---|---|
| `domain` | Business domain |
| `owner_role` | Responsible role or team |
| `maturity` | Integer 1–5 (displayed as ●●●○○ dots) |
| `description` | Short description |
| `capabilities` | List of capability names |
| `processes` | List of process names |
| `supporting_apps` | List of application names |

## Preview

Open any `.products.transitrix.yaml` file in VS Code with Transitrix Studio installed — the preview panel opens automatically showing a filterable HTML table.
