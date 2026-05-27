# `views/processmap/`

Process landscape maps — a top-level catalogue of the organisation's processes, grouped by Operating / Supporting / Management. Each process referenced here resolves to a BusinessProcess element under `elements/02_business/processes/`. Detailed flow diagrams (BPMN) live in `views/bpmn/`.

## File convention

`*.process-map.transitrix.yaml`

## Skeleton

```yaml
notation: process-map
spec_version: "0.1"

process_map:
  id: "PM-ACME-1"
  name: "Acme Corp — Process Landscape"
  description: "Top-level catalogue of operating, supporting, and management processes"
  version: "1.0"
  updated_at: "2026-05-26"

  groups:
    - id: "GRP-OPERATING"
      name: "Operating Processes"
      type: "operating"                 # operating | supporting | management
      processes:
        - process_id: "PROC-ORD-FULFILL-1"   # → elements/02_business/processes/PROC-ORD-FULFILL-1.yaml
          name: "Order Fulfilment"
          owner_role: "ROLE-OPS-1"
          capability: "V1"
          maturity: 2
          status: "Active"                    # Draft | Active | Deprecated
          bpmn_file: "views/bpmn/order-fulfilment.bpmn.transitrix.yaml"
        - process_id: "PROC-CUST-ONBOARD-1"
          name: "Customer Onboarding"
          owner_role: "ROLE-SALES-1"
          capability: "V2"
          maturity: 1
          status: "Draft"

    - id: "GRP-SUPPORTING"
      name: "Supporting Processes"
      type: "supporting"
      processes:
        - process_id: "PROC-CS-RESOLVE-1"
          name: "Customer Support Resolution"
          owner_role: "ROLE-CS-1"
          status: "Active"

    - id: "GRP-MANAGEMENT"
      name: "Management Processes"
      type: "management"
      processes:
        - process_id: "PROC-STRAT-PLAN-1"
          name: "Annual Strategy Planning"
          owner_role: "ROLE-EXEC-1"
          status: "Active"
```

`process_id`, `owner_role`, and `capability` hold **element / capability IDs**, not display names.

## See also

- `notations/06-process-map.md` — process-map notation reference (full field table)
- `views/bpmn/` — detailed flow diagrams for individual processes
- `elements/02_business/processes/` — where individual BusinessProcess elements live
