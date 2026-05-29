# `canon/views/products/`

Products catalogue — a curated catalogue of the products and services the organisation offers. Each entry references a Product element under `canon/elements/02_business/products/` and carries the display attributes used to render the catalogue.

## File convention

`*.products.transitrix.yaml`

## Skeleton

```yaml
notation: products
spec_version: "0.1"

products_catalogue:
  id: "PROD-CAT-1"
  name: "Acme Corp Products Catalogue"
  description: "Products and services offered by Acme Corp"
  version: "1.0"
  updated_at: "2026-05-26"

  products:
    - product_id: "PROD-ECOMM-1"        # → canon/elements/02_business/products/PROD-ECOMM-1.yaml
      name: "E-Commerce Platform"
      type: "digital_product"           # digital_product | service | platform | bundle
      domain: "Digital"
      owner_role: "ROLE-PROD-1"
      status: "Active"                  # operational state: Draft | Active | Deprecated
      maturity: 3
      description: "Online storefront and order management for end customers"
      capabilities: ["CAPABILITY-V1", "CAPABILITY-V2"]
      processes: ["PROC-ORD-FULFILL-1"]
      supporting_apps: ["APP-OMS-1", "APP-CRM-1"]
      valid_from: "2026-05-26"          # CONTRACT.md §7 — required on every inline product; distinct from operational `status`
      valid_to: null

    - product_id: "SVC-SUPPORT-1"
      name: "Customer Support Service"
      type: "service"
      domain: "Operations"
      owner_role: "ROLE-CS-1"
      status: "Active"
      description: "Tier-1 and Tier-2 support for customers via chat, email, and phone"
      valid_from: "2026-05-26"
      valid_to: null
```

`capabilities`, `processes`, and `supporting_apps` hold **element IDs** (`CAPABILITY-V1`, `PROC-…`, `APP-…`), not display names — the catalogue references the elements, it does not duplicate them.

`valid_from` / `valid_to` are required on every inline product entry per [`notations/CONTRACT.md`](../../../../notations/CONTRACT.md) §7 and are distinct from the per-product `status` field (`Active` / `Deprecated`), which is an operational state. The products-catalogue document itself does not carry a lifecycle field.

## See also

- `notations/views/09-products.md` — products-catalogue notation reference (full field table)
- `canon/elements/02_business/products/` — where individual Product elements live
