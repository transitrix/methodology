---
notation: "Applications Catalogue"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-08"
status: "draft"
file_extension: "*.applications.transitrix.yaml"
---

# Applications Catalogue Notation — Reference

**Scope:** Structured inventory of an organisation's applications and integrations. A text-and-table catalogue — no diagram. Used to register what software systems exist, who owns them, and what they support.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `applications` |
| File extension | `*.applications.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `applications` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `applications_catalogue` | yes | object | the applications catalogue root — see §4 and §5 |

Example header:

```yaml
notation: applications
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
applications_catalogue:
  # ... see §4
```

---

## Element lifecycle

Every inline entry under `applications[]` — whether `type: application`, `integration`, `platform`, or `data_store` — carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../CONTRACT.md) §7.1, the lifecycle sits on each catalogue entry; the applications-catalogue document itself does not carry a lifecycle field. Per-application `integrations[]` sub-entries (outbound integration descriptors nested inside an application) share their parent application's lifecycle and do not carry their own `valid_from` / `valid_to`. The catalogue's own `status` field (`Active` / `Draft` / `Deprecated` / `Decommissioning`) is a notation-specific operational state, distinct from `valid_from` / `valid_to` which mark the period the application element is asserted to exist.

---

## 1. Overview

The applications catalogue answers the question: **what applications and integrations does the organisation operate?**

It is a catalogue view over Application elements defined in `elements/03_application/`. It aggregates them into a portfolio view with metadata relevant to application lifecycle management and integration governance.

For visual containment and platform groupings, use the Nested Block Diagrams notation (`*.blocks.transitrix.yaml`).

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
      status: "Active"                 # operational state inline: Draft | Active | Deprecated | Decommissioning
      description: "Core system for order lifecycle management"
      capabilities:
        - "CAPABILITY-V1"
      products:
        - "PROD-ECOMM-001"
      integrations:
        - target: "APP-CRM-001"
          direction: "outbound"
          protocol: "REST"
          description: "Sends order events to CRM"
      # owner_role, vendor, maturity are time-varying — they live in
      # APP-OMS-001.history.yaml (CONTRACT.md §9), not inline.

    - app_id: "APP-CRM-001"
      name: "CRM System"
      type: "application"
      domain: "Sales"
      status: "Active"
      description: "Customer relationship and sales pipeline management"

    - app_id: "INT-OMS-CRM-001"
      name: "OMS → CRM Order Events Integration"
      type: "integration"
      domain: "Operations"
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
| `applications[].owner_role` | No | BusinessRole element ID of the technical owner. **Time-varying** — lives in the sidecar `<app_id>.history.yaml` ([CONTRACT.md](../CONTRACT.md) §9), not inline. Inline placement triggers `VERSIONED-004`. |
| `applications[].vendor` | No | Vendor name or `Internal`. **Time-varying** — sidecar, not inline (an organisation may switch vendors mid-life). |
| `applications[].status` | Yes | `Draft` / `Active` / `Deprecated` / `Decommissioning`. Operational state — stays inline; teams wanting status history MAY promote to sidecar voluntarily. |
| `applications[].maturity` | No | CMM level ([CONTRACT.md](../CONTRACT.md) §9.4 shared CMMI V2.0 scale). **Time-varying** — sidecar, not inline. |
| `applications[].description` | No | Short description of the application's purpose. |
| `applications[].capabilities` | No | List of capability IDs this application enables. Stays inline in v1 (relations are Wave 3 territory). |
| `applications[].products` | No | List of Product element IDs this application supports. Stays inline in v1 (relations are Wave 3 territory). |
| `applications[].integrations` | No | List of outbound integration descriptors. Stays inline (a relation list scoped to the parent application). |
| `integrations[].target` | No | Target application element ID |
| `integrations[].direction` | No | `inbound` / `outbound` / `bidirectional` |
| `integrations[].protocol` | No | Integration protocol (REST, Kafka, gRPC, etc.) |
| `integrations[].interface_semantics` | No | `true` — asserts ArchiMate Application Interface semantics on this INTEGRATION. When set, the additional fields below become required. See §5b. |
| `integrations[].payload_class` | Conditional | **Required when `interface_semantics: true`.** Category of data the interface exchanges — e.g. `"domain_event"`, `"command"`, `"query"`, `"bulk_export"`. |
| `integrations[].sensitivity` | Conditional | **Required when `interface_semantics: true`.** `public` / `internal` / `confidential` / `restricted`. |
| `integrations[].directionality` | Conditional | **Required when `interface_semantics: true`.** `producer` / `consumer` / `request_reply` / `bidirectional_stream`. |

---

## 5b. Application Interface semantics for INTEGRATION

ArchiMate defines Application Interface (§8.2.5) as "a point of access where application services are made available to another application." Transitrix expresses this concept via `INTEGRATION` with `interface_semantics: true` rather than a separate primitive.

**When to use.** Set `interface_semantics: true` when an integration represents a named, governed, typed endpoint contract — not just a data pipe. Examples: a Kafka-producer interface for domain events, a REST API endpoint consumed by a partner, a gRPC service.

**Required fields** (`INT-001` — see [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §9): in addition to the standard `source`, `target`, the following must all be present:
- `protocol` — e.g. `"Kafka"`, `"REST"`, `"gRPC"`
- `payload_class` — adopter-defined category: `"domain_event"`, `"command"`, `"query"`, `"bulk_export"`, etc.
- `sensitivity` — `public` | `internal` | `confidential` | `restricted`
- `directionality` — `producer` | `consumer` | `request_reply` | `bidirectional_stream`

**Example — Kafka-producer interface:**

```yaml
applications_catalogue:
  id: "APP-CAT-PLATFORM-1"
  name: "Platform Applications"
  updated_at: "2026-06-28"
  applications:
    - app_id: "APPLICATION-OMS-1"
      name: "Order Management System"
      type: "application"
      status: "Active"
      integrations:
        - target: "APPLICATION-CRM-1"
          direction: "outbound"
          protocol: "Kafka"
          interface_semantics: true
          payload_class: "domain_event"
          sensitivity: internal
          directionality: producer
          description: >
            Kafka producer interface exposing order-state change events.
            Consumers subscribe to the `oms.orders.v1` topic.
            Events follow the CloudEvents 1.0 envelope.
```

Full field semantics and vocabulary: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.8.1.

---

## 5a. Time-varying attributes — sidecar history

An application's `owner_role`, `vendor`, and `maturity` evolve within the application's overall lifetime. Per [CONTRACT.md](../CONTRACT.md) §9, these fields are stored in a sidecar file co-located with the application's element file, **not inline** on the catalogue view or on the element file:

```
canon/elements/03_application/applications/APP-OMS-1.yaml          # stable fields
canon/elements/03_application/applications/APP-OMS-1.history.yaml  # time-varying fields
```

Sidecar shape:

```yaml
target: APP-OMS-1
attribute_versions:
  owner_role:
    - { valid_from: "2024-01-01", value: ROLE-TECH-1 }
    - { valid_from: "2026-04-01", value: ROLE-PLATFORM-1 }
  vendor:
    - { valid_from: "2024-01-01", value: "Internal" }
    - { valid_from: "2026-06-01", value: "Acme Cloud Inc" }
  maturity:
    - { valid_from: "2024-01-01", value: 2 }
    - { valid_from: "2025-09-01", value: 3 }
```

Current-value resolution: pick the entry with the largest `valid_from <= today`. See [CONTRACT.md](../CONTRACT.md) §9.2.

Migration: adopters with existing inline values move each value into a single-entry sidecar with `valid_from = application.valid_from`. The `VERSIONED-001..005` rules apply ([CONTRACT.md](../CONTRACT.md) §9.3).

`status`, `type`, `domain`, `description` are **not** time-varying in v1 and stay inline. Cross-reference lists (`capabilities`, `products`, `integrations`) are relations — Wave 3 territory.

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
- ArchiMate vocabulary: `method/01-methodology.md` §3a
- Products catalogue: `notations/09-products.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6: `method/01-methodology.md`
