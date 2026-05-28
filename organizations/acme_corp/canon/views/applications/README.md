# `canon/views/applications/`

Applications catalogue — a curated catalogue of the applications and integrations in operation. Each entry references an Application element under `canon/elements/03_application/applications/` and carries the display attributes used to render the catalogue.

## File convention

`*.applications.transitrix.yaml`

## Skeleton

```yaml
notation: applications
spec_version: "0.1"

applications_catalogue:
  id: "APP-CAT-1"
  name: "Acme Corp Applications Catalogue"
  description: "Applications and integrations in operation at Acme Corp"
  version: "1.0"
  updated_at: "2026-05-26"

  applications:
    - app_id: "APP-OMS-1"               # → canon/elements/03_application/applications/APP-OMS-1.yaml
      name: "Order Management System"
      type: "application"               # application | integration | platform | data_store
      domain: "Operations"
      owner_role: "ROLE-TECH-1"
      vendor: "Internal"
      status: "Active"                  # Draft | Active | Deprecated | Decommissioning
      maturity: 3
      description: "Core system for order lifecycle management"
      capabilities: ["CAPABILITY-V1"]
      products: ["PROD-ECOMM-1"]
      integrations:
        - target: "APP-CRM-1"
          direction: "outbound"
          protocol: "REST"
          description: "Sends order events to CRM"

    - app_id: "APP-CRM-1"
      name: "CRM System"
      type: "application"
      domain: "Sales"
      owner_role: "ROLE-SALES-1"
      vendor: "Salesforce"
      status: "Active"
      description: "Customer relationship and sales pipeline management"
```

`capabilities` and `products` hold **element IDs**, not display names. Integrations may be inlined (as above) or modelled as their own `type: integration` entries.

## See also

- `notations/10-applications.md` — applications-catalogue notation reference (full field table)
- `canon/elements/03_application/applications/` — where individual Application elements live
