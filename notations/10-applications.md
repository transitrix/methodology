---
notation: "Applications Catalogue"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-08"
status: "planned"
file_extension: "*.applications.transitrix.yaml"
---

# Applications Catalogue Notation — Reference

**Scope:** Structured inventory of an organisation's applications and integrations. A text-and-table catalogue — no diagram. Used to register what software systems exist, who owns them, and what they support.
**Renderer:** Transitrix Studio (planned)

---

## File header

Every `*.applications.transitrix.yaml` file MUST start with the following header:

```yaml
notation: applications  # required; this notation's short name
spec_version: 0.1       # optional today; reserved field; will be required when this notation reaches v1.0
# … rest of the document
```

Validator behaviour:
- Missing `notation` → hard error.
- `notation` value not equal to `applications` → hard error (the file might be the wrong format for this extension).
- File extension not equal to `.applications.transitrix.yaml` while `notation: applications` → hard error (extension/content mismatch).
- `spec_version` accepted but not enforced until this notation hits v1.0.

---

## 1. Overview

The applications catalogue answers the question: **what applications and integrations does the organisation operate?**

It is a catalogue view over Application elements defined in `elements/03_application/`. It aggregates them into a portfolio view with metadata relevant to application lifecycle management and integration governance.

For visual containment and platform groupings, use the Nested Block Diagrams notation (`*.blocks.transitrix.txt`).

---

## 2. When to use

| Use case | Use applications catalogue? |
|----------|-----------------------------|
| Register an application or integration | Yes |
| Show containment (app inside platform) | No — use Nested Block Diagrams |
| Show how an application is used in a process | No — use BPMN or Mermaid sequence diagram |
| Show which capabilities an app supports | Yes (via capability field) |
| Track app lifecycle and ownership | Yes |

---

## 3. File location and naming

```
views/applications/<DOMAIN>.applications.transitrix.yaml
```

Examples:
- `views/applications/ENTERPRISE.applications.transitrix.yaml`
- `views/applications/ORDER_MANAGEMENT.applications.transitrix.yaml`

---

## 4. Top-level structure

```yaml
applications_catalogue:
  id: "APP-CAT-001"
  name: "Enterprise Applications Catalogue"
  description: "Full inventory of applications and integrations in operation"
  version: "1.0"
  updated_at: "2026-05-08"

  applications:
    - app_id: "APP-OMS-001"
      name: "Order Management System"
      type: "application"              # application | integration | platform | data_store
      domain: "Operations"
      owner_role: "ROLE-TECH-001"
      vendor: "Internal"
      status: "Active"                 # Draft | Active | Deprecated | Decommissioning
      maturity: 3                      # CMM level 1–5
      description: "Core system for order lifecycle management"
      capabilities:
        - "V1"
      products:
        - "PROD-ECOMM-001"
      integrations:
        - target: "APP-CRM-001"
          direction: "outbound"
          protocol: "REST"
          description: "Sends order events to CRM"

    - app_id: "APP-CRM-001"
      name: "CRM System"
      type: "application"
      domain: "Sales"
      owner_role: "ROLE-SALES-001"
      vendor: "Salesforce"
      status: "Active"
      description: "Customer relationship and sales pipeline management"

    - app_id: "INT-OMS-CRM-001"
      name: "OMS → CRM Order Events Integration"
      type: "integration"
      domain: "Operations"
      owner_role: "ROLE-TECH-001"
      status: "Active"
      description: "Event-driven integration forwarding order state changes from OMS to CRM"
      source: "APP-OMS-001"
      target: "APP-CRM-001"
      protocol: "Kafka"
```

---

## 5. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `applications_catalogue.id` | Yes | Unique catalogue ID (`APP-CAT-DOMAIN-SEQ`) |
| `applications_catalogue.name` | Yes | Human-readable name |
| `applications_catalogue.updated_at` | Yes | Last update date (YYYY-MM-DD) |
| `applications[].app_id` | Yes | Unique application ID — references element in `elements/03_application/` |
| `applications[].name` | Yes | Application name (should match the element) |
| `applications[].type` | Yes | `application` / `integration` / `platform` / `data_store` |
| `applications[].domain` | No | Business domain this application belongs to |
| `applications[].owner_role` | No | BusinessRole element ID of the technical owner |
| `applications[].vendor` | No | Vendor name or `Internal` |
| `applications[].status` | Yes | `Draft` / `Active` / `Deprecated` / `Decommissioning` |
| `applications[].maturity` | No | CMM level 1–5 |
| `applications[].description` | No | Short description of the application's purpose |
| `applications[].capabilities` | No | List of capability IDs this application enables |
| `applications[].products` | No | List of Product element IDs this application supports |
| `applications[].integrations` | No | List of outbound integration descriptors |
| `integrations[].target` | No | Target application element ID |
| `integrations[].direction` | No | `inbound` / `outbound` / `bidirectional` |
| `integrations[].protocol` | No | Integration protocol (REST, Kafka, gRPC, etc.) |

---

## 6. Relationship to other notations

```
Applications Catalogue   →  what systems exist and what they support
        ↓
Nested Block Diagrams    →  how systems are grouped into platforms and domains
        ↓
BPMN / Mermaid           →  how systems interact in a process or sequence
        ↓
ArchiMate                →  formal model of application layer elements and relations
```

---

## 7. References

- Application elements: `elements/03_application/*.yaml`
- Nested block diagrams: `notations/08-blocks.md`
- ArchiMate vocabulary: `method/methodology.md` §3a
- Products catalogue: `notations/09-products.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6: `method/methodology.md`
