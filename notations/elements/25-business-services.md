---
title: "Business Services — externally-visible behaviour primitive"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-28"
status: "draft"
---

# Business Services — Reference

**Scope:** The `BUSINESS_SERVICE` element type — the business-layer service primitive: *the externally visible behaviour a business unit or role makes available to its environment* (ArchiMate Business Service). A business service is not a process — it is the named capability the organisation offers; the underlying process or capability that delivers it is linked via the `realizes` relation ([17-relations.md](17-relations.md)). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3; the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Business services are **zone primitives**: each is a single YAML file under `canon/elements/02_business/business-services/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the service-specific frontmatter below.

---

## 1. What BUSINESS_SERVICE is — and is not

A `BUSINESS_SERVICE` is a **named, externally visible behaviour** offered by the organisation to its consumers — whether those consumers are internal teams, external customers, or partners. It is the *what is offered*, not the *how it is delivered*.

> **ArchiMate note.** ArchiMate 3.2 §8.3.4 defines Business Service as "a service that fulfils a business need for an internal or external customer, performed by a business actor or role." Transitrix maps this concept directly to `BUSINESS_SERVICE`. The offering unit (who provides it) is linked via the `offers` relation ([17-relations.md](17-relations.md) §3); the capability it exposes is linked via the `realizes` relation.

It is **not**:

- A `PROCESS` — a process is the *internal execution flow* that delivers the service. A service is the face shown to the consumer; the process is the machine behind it. One process may partially or fully deliver several services; one service may involve multiple processes.
- A `CAPABILITY` — a capability is the *ability to perform* something. A service is the *act of performing it for a consumer*. A `BUSINESS_SERVICE` realizes one or more `CAPABILITY` elements.
- A `PRODUCT` — a product is a packaged, versioned, and priced offering. A service is the ongoing behaviour available to the consumer; it may be bundled into one or more products.
- A `ROLE` — a role is the position that performs or is accountable for something. The role *offers* a service; it does not *become* the service.

---

## 2. Frontmatter — canonical schema

```yaml
notation: business-service
id: BUSINESS_SERVICE-CRM-1
name: "CRM Service"
type: internal
description: >
  Customer relationship management service offering contact management,
  deal tracking, and activity reporting to internal sales and
  account-management teams.
offering_unit: ACTOR-SALES-OPS-1       # optional — ACTOR(business_unit) or ROLE-…
capability: CAPABILITY-V2.1            # optional — the CAPABILITY this service realizes

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-06-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2024-01-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `business-service`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `BUSINESS_SERVICE-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label for the service. |
| `type` | yes | string | `internal` \| `external` \| `shared`. See §2.1. |
| `description` | recommended | string | One-paragraph elaboration of what the service offers and to whom. |
| `offering_unit` | recommended | string | `ACTOR(business_unit)-…` or `ROLE-…` — the primary unit or role that offers this service. Inline for the common stable case; use the `offers` REL kind ([17-relations.md](17-relations.md) §3) when ownership changes over time (org restructure). |
| `capability` | optional | string | `CAPABILITY-…` — the capability this service realizes. Inline for stable realizations; use the `realizes` REL kind ([17-relations.md](17-relations.md) §3) for time-aware tracking. |
| `owner_role` | optional | string | `ROLE-…` accountable for the service governance. |
| `status` | optional | string | Authoring/governance state (e.g. `active`, `draft`, `deprecated`) — see [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3. Distinct from the temporal validity derived from `valid_from`/`valid_to`. |
| `zone` / `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | When this service became effective — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | When the service was discontinued, or `null`. |

### 2.1 `type` vocabulary

| Value | Meaning |
|---|---|
| `internal` | Offered to consumers *within* the organisation — other business units, internal teams, shared-service consumers. |
| `external` | Offered to consumers *outside* the organisation — customers, clients, partners, regulators. |
| `shared` | A cross-cutting service provided by one unit (a shared-service centre, a platform team) to multiple other units inside the organisation, with a service-level agreement. Distinct from `internal` in that it is explicitly shared and governed with an SLA; `internal` covers point-to-point services without formal sharing agreements. |

---

## 3. Relations — `offers` and `realizes`

Two first-class relation kinds link business services to their owners and to the capabilities they expose ([17-relations.md](17-relations.md) §3):

| Relation `type` | From → To | What it records |
|---|---|---|
| `offers` | `ACTOR(business_unit)` or `ROLE` → `BUSINESS_SERVICE` | A unit or role offers this service to its consumers. Time-aware — use a `REL-…` file when the offering unit changes (e.g. a service transferred between teams during a reorganisation). For a stable offering unit, the inline `offering_unit` field (§2) is sufficient. |
| `realizes` | `BUSINESS_SERVICE` → `CAPABILITY` | This service is the externally visible realisation of a capability. Time-aware — use a `REL-…` file when the capability realised by the service changes (e.g. the service scope expands to cover a new capability after a technology uplift). For a stable capability link, the inline `capability` field (§2) is sufficient. |

**Inline vs first-class.** The inline `offering_unit` and `capability` fields on the element are the right choice when the link is stable for the service's full lifetime. Move to first-class `REL-…` files when either:

- The service changes offering unit (an org restructure transfers ownership) — the old REL gets `valid_to`, a new one is created.
- The service begins to realize a different or additional capability — the old REL gets `valid_to`, a new one starts.

The `offers` relation is directional: **from the provider to the service** (`ACTOR → BUSINESS_SERVICE`), so that a unit or role entry point carries all the services it offers without changing the service element itself.

---

## 4. File location and naming

```
canon/elements/02_business/business-services/<ID>.yaml
```

One service per file, named by its canonical ID. Examples: `BUSINESS_SERVICE-CRM-1.yaml`, `BUSINESS_SERVICE-ONBOARDING-1.yaml`, `BUSINESS_SERVICE-COMPLIANCE-REPORTING-1.yaml`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `BSV-001` | error | `id` missing or not matching `BUSINESS_SERVICE-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `type`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) missing. |
| `BSV-002` | error | `type` is not one of `internal`, `external`, `shared`. |
| `BSV-003` | error | `offering_unit` is present but does not resolve to an admitted `ACTOR(business_unit)` or `ROLE` in canon. |
| `BSV-004` | error | `capability` is present but does not resolve to an admitted `CAPABILITY` in canon. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to BUSINESS_SERVICE files in addition to the BSV-* rules above.

---

## 6. Evolution

- **Service SLA fields.** v0.1 does not model service-level agreements (availability, response time, SLA tier). If a service catalogue requires these, they are an additive enhancement — new optional fields (`sla_tier`, `availability_target`) — not a structural change.
- **Multiple offering units.** v0.1 models the primary offering unit via the inline `offering_unit` field and supports additional or time-varying units via the `offers` REL kind. If a service is co-owned by multiple concurrent units without a primary, write two concurrent `offers` REL files.
- **Service hierarchy.** ArchiMate permits a Business Service to compose or decompose into other services. v0.1 does not define a `parent` relation between `BUSINESS_SERVICE` elements. If needed, this is an additive REL kind in a future revision — do not use the inline `offering_unit` field to express hierarchy.
- **`BUSINESS_SERVICE` as a `PRODUCT` component.** A product (`PRODUCT` element) may bundle one or more business services. v0.1 does not add a `services[]` field to `PRODUCT`; the link, if needed, is expressed as a `service_component` REL kind (a future revision) or informally via `description`.

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3, §7.23.
- First-class time-aware relations (`offers`, `realizes`): [17-relations.md](17-relations.md) §3.
- Business layer placement: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.
- Offering actor identity: [19-actors.md](19-actors.md).
- Realized capability: [views/05-capability-map.md](../views/05-capability-map.md).
