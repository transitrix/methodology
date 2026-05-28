# `canon/views/capabilities/`

Capability maps — a hierarchical view of business capabilities with a CMM maturity overlay. Each capability addressed here resolves to a Capability element under `canon/elements/02_business/capabilities/`.

## File convention

`*.capability-map.transitrix.yaml`

## Skeleton

```yaml
notation: capability-map
spec_version: "0.1"

capability_map:
  id: "CAPABILITY_MAP-CUSTOMER-1"
  name: "Customer-Domain Capabilities"
  description: "Customer-facing capabilities with current and target maturity"
  assessment_date: "2026-05-26"

  capabilities:
    - id: "CAPABILITY-V1"               # → canon/elements/02_business/capabilities/CAPABILITY-V1.yaml
      name: "Order Management"
      type: "domain"                    # domain | supporting
      current_maturity: 2
      target_maturity: 3
      target_date: "2026-12-31"
      owner_role: "ROLE-OPS-1"
      business_process: "PROC-ORD-FULFILL-1"
      applications:
        - "APP-OMS-1"
        - "APP-CRM-1"
      children:
        - id: "CAPABILITY-V1.1"
          name: "Order Intake"
          type: "domain"
          current_maturity: 3
          target_maturity: 3
        - id: "CAPABILITY-V1.2"
          name: "Order Fulfilment"
          type: "domain"
          current_maturity: 2
          target_maturity: 3
          target_date: "2026-09-30"
    - id: "CAPABILITY-V2"
      name: "Customer Relationship"
      type: "domain"
      current_maturity: 2
      target_maturity: 3
      owner_role: "ROLE-SALES-1"
      applications:
        - "APP-CRM-1"
```

`CAPABILITY-V1` / `CAPABILITY-V1.1` are canonical capability IDs (V/H sub-grammar per [`notations/IDS_AND_REFERENCES.md`](../../../../notations/IDS_AND_REFERENCES.md) §2); **every** capability, including children, carries `type` (required). The maturity history of an individual capability lives on its element file, not here.

## See also

- `notations/05-capability-map.md` — capability-map notation reference (CMM maturity, V/H addressing, full field table)
- `.templates/capability-map_template.yaml` — copy-and-fill template
- `canon/elements/02_business/capabilities/` — where individual Capability elements live
