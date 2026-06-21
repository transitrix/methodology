---
notation: "Process Landscape Map"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-19"
status: "draft"
file_extension: "*.process-map.transitrix.yaml"
---

# Process Landscape Map Notation — Reference

**Scope:** Top-level catalogue of an organisation's processes grouped into Operating, Supporting, and Management categories. The inventory above individual process diagrams.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `process-map` |
| File extension | `*.process-map.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `process-map` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `process_map` | yes | object | the process map root — see §4 and §5 |

Example header:

```yaml
notation: process-map
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
process_map:
  # ... see §4
```

---

## Element lifecycle

Every inline process entry under `groups[].processes[]` carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../CONTRACT.md) §7.1, the lifecycle sits on each process entry; neither the process-map document nor the process groups carry a lifecycle field — groups are organisational containers, not elements.

---

## 1. Overview

The process landscape map answers the question: **what processes does the organisation have?**

It is a structured catalogue — not a flow diagram. Individual process flows are defined on each `PROCESS` element itself (its `participants` + `flow`, [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5); a BPMN file (`*.bpmn.transitrix.yaml`) is a **derived projection** of that flow, not its source ([views/01-bpmn.md](01-bpmn.md)). The landscape map is the inventory that sits above the elements: it shows the full set of processes, how they are grouped, and their relationships to capabilities and organisational units. It references each process by `process_id`; the element is the definition home.

The two notations are complementary:

| Notation | Answers | Extension |
|----------|---------|-----------|
| Process landscape map | What processes exist? How are they grouped? | `*.process-map.transitrix.yaml` |
| BPMN process diagram | How does a single process flow? | `*.bpmn.transitrix.yaml` |

---

## 2. Process groups

The standard grouping follows the APQC-inspired three-category model:

| Group | Description | Examples |
|-------|-------------|---------|
| **Operating** | Core business processes that directly deliver value to customers | Order Fulfilment, Customer Onboarding, Product Delivery |
| **Supporting** | Internal processes that enable operating processes | HR, Finance, IT Support, Procurement |
| **Management** | Governance and planning processes | Strategy Planning, Risk Management, Performance Review |

---

## 3. File location and naming

```
views/processmap/<DOMAIN>.process-map.transitrix.yaml
```

Examples:
- `views/processmap/ENTERPRISE.process-map.transitrix.yaml`
- `views/processmap/OPERATIONS.process-map.transitrix.yaml`

---

## 4. Top-level structure

```yaml
process_map:
  id: "PM-ENT-001"
  name: "Enterprise Process Landscape"
  description: "Top-level catalogue of all organisational processes"
  version: "1.0"
  updated_at: "2026-05-08"

  groups:
    - id: "GRP-OPERATING"
      name: "Operating Processes"
      type: "operating"
      processes:
        - process_id: "PROC-ORD-FULFILL-001"
          name: "Order Fulfilment"
          owner_role: "ROLE-OPS-001"
          capability: "CAPABILITY-V1"
          maturity: 2
          status: "Active"

        - process_id: "PROC-CUST-ONBOARD-001"
          name: "Customer Onboarding"
          owner_role: "ROLE-SALES-001"
          capability: "CAPABILITY-V2"
          maturity: 1
          status: "Draft"

    - id: "GRP-SUPPORTING"
      name: "Supporting Processes"
      type: "supporting"
      processes:
        - process_id: "PROC-HR-RECRUIT-001"
          name: "Recruitment"
          owner_role: "ROLE-HR-001"
          status: "Active"

    - id: "GRP-MANAGEMENT"
      name: "Management Processes"
      type: "management"
      processes:
        - process_id: "PROC-STRAT-PLAN-001"
          name: "Annual Strategy Planning"
          owner_role: "ROLE-EXEC-001"
          status: "Active"
```

---

## 5. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `process_map.id` | Yes | Unique ID (`PM-DOMAIN-SEQ`) |
| `process_map.name` | Yes | Human-readable name |
| `process_map.updated_at` | Yes | Last update date (YYYY-MM-DD) |
| `groups[].id` | Yes | Group identifier |
| `groups[].type` | Yes | `operating` / `supporting` / `management` |
| `processes[].process_id` | Yes | References a BusinessProcess element ID |
| `processes[].name` | Yes | Process name (should match the element) |
| `processes[].owner_role` | No | Reference to BusinessRole element ID |
| `processes[].capability` | No | Capability ID this process realises (V1, H1, etc.) |
| `processes[].maturity` | No | Current CMM level (1–5) |
| `processes[].status` | Yes | `Draft` / `Active` / `Deprecated` |

> **No `bpmn_file` pointer.** Earlier revisions carried an optional `processes[].bpmn_file` path to "the detailed BPMN diagram." It is **removed**: a BPMN file is a *derived projection* of the referenced `PROCESS` element's `flow` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5, [views/01-bpmn.md](01-bpmn.md)), not a source artefact. Storing a path to generated output in the inventory would violate the view-purity corollary ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1). The map references the process by `process_id`; the diagram is regenerated from that element's `flow` and located by convention, so no separate pointer is held here.

---

## 6. Relationship to other notations

```
Process Landscape Map    →  lists all processes
         ↓
  BPMN Process Diagram   →  details one process flow
         ↓
  Capabilities Map       →  shows the capability each process realises
```

---

## 7. References

- BusinessProcess elements: `elements/02_business/*.yaml` (type: BusinessProcess)
- BPMN notation: `notations/01-bpmn.md`
- Capabilities map: `notations/05-capability-map.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6.4: `method/methodology.md`
