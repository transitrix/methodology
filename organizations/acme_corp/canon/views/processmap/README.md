# `canon/views/processmap/`

Process landscape maps — a top-level catalogue of the organisation's processes, grouped by Operating / Supporting / Management. Each process referenced here resolves to a BusinessProcess element under `canon/elements/02_business/processes/`. Detailed flow diagrams (BPMN) live in `canon/views/bpmn/`.

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

  groups:                               # groups are organisational containers, not elements — no lifecycle on the group itself
    - id: "GRP-OPERATING"
      name: "Operating Processes"
      type: "operating"                 # operating | supporting | management
      processes:
        - process_id: "PROC-ORD-FULFILL-1"   # → canon/elements/02_business/processes/PROC-ORD-FULFILL-1.yaml
          name: "Order Fulfilment"
          owner_role: "ROLE-OPS-1"
          capability: "CAPABILITY-V1"
          maturity: 2
          status: "Active"                    # operational state: Draft | Active | Deprecated
          bpmn_file: "canon/views/bpmn/order-fulfilment.bpmn.transitrix.yaml"
          valid_from: "2026-05-26"            # CONTRACT.md §7 — required on every inline process; distinct from operational `status`
          valid_to: null
        - process_id: "PROC-CUST-ONBOARD-1"
          name: "Customer Onboarding"
          owner_role: "ROLE-SALES-1"
          capability: "CAPABILITY-V2"
          maturity: 1
          status: "Draft"
          valid_from: "2026-05-26"
          valid_to: null

    - id: "GRP-SUPPORTING"
      name: "Supporting Processes"
      type: "supporting"
      processes:
        - process_id: "PROC-CS-RESOLVE-1"
          name: "Customer Support Resolution"
          owner_role: "ROLE-CS-1"
          status: "Active"
          valid_from: "2026-05-26"
          valid_to: null

    - id: "GRP-MANAGEMENT"
      name: "Management Processes"
      type: "management"
      processes:
        - process_id: "PROC-STRAT-PLAN-1"
          name: "Annual Strategy Planning"
          owner_role: "ROLE-EXEC-1"
          status: "Active"
          valid_from: "2026-05-26"
          valid_to: null
```

`process_id`, `owner_role`, and `capability` hold **element / capability IDs**, not display names.

`valid_from` / `valid_to` are required on every inline process entry per [`notations/CONTRACT.md`](../../../../notations/CONTRACT.md) §7 and are distinct from the per-process `status` (`Draft` / `Active` / `Deprecated`) which is an operational state. Process groups (`groups[]`) are organisational containers, not elements, and carry no lifecycle of their own; the process-map document itself carries none either.

## See also

- `notations/06-process-map.md` — process-map notation reference (full field table)
- `canon/views/bpmn/` — detailed flow diagrams for individual processes
- `canon/elements/02_business/processes/` — where individual BusinessProcess elements live
