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
      business_process: "PROCESS-ORD-FULFILL-1"
      applications:
        - "APPLICATION-OMS-1"
        - "APPLICATION-CRM-1"
      valid_from: "2026-05-26"          # CONTRACT.md §7 — required on every inline capability, recursively
      valid_to: null
      children:
        - id: "CAPABILITY-V1.1"
          name: "Order Intake"
          type: "domain"
          current_maturity: 3
          target_maturity: 3
          valid_from: "2026-05-26"
          valid_to: null
        - id: "CAPABILITY-V1.2"
          name: "Order Fulfilment"
          type: "domain"
          current_maturity: 2
          target_maturity: 3
          target_date: "2026-09-30"
          valid_from: "2026-05-26"
          valid_to: null
    - id: "CAPABILITY-V2"
      name: "Customer Relationship"
      type: "domain"
      current_maturity: 2
      target_maturity: 3
      owner_role: "ROLE-SALES-1"
      applications:
        - "APPLICATION-CRM-1"
      valid_from: "2026-05-26"
      valid_to: null
```

`CAPABILITY-V1` / `CAPABILITY-V1.1` are canonical capability IDs (V/H sub-grammar per [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §2); **every** capability, including children, carries `type` (required). The maturity history of an individual capability lives on its element file, not here.

`valid_from` / `valid_to` are required on every inline capability (recursively, including nested `children[]`) per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7. The capability-map document itself does not carry a lifecycle field. The notation-spec's "Planned" / "Active" / "Retired" state vocabulary ([`notations/views/05-capability-map.md`](../../../../../notations/views/05-capability-map.md) §7) is a *derived view* over `valid_from` / `valid_to` + today's date — not a separate stored mechanism.

## See also

- `notations/views/05-capability-map.md` — capability-map notation reference (CMM maturity, V/H addressing, full field table)
- `.templates/capability-map_template.yaml` — copy-and-fill template
- `canon/elements/02_business/capabilities/` — where individual Capability elements live
