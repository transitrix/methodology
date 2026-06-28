---
title: "Technology Services — platform-level service primitive"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-28"
status: "draft"
---

# Technology Services — Reference

**Scope:** The `TECHNOLOGY_SERVICE` element type — the technology-layer service primitive: *a platform-level service exposed by a NODE or group of NODEs* (ArchiMate Technology Service). A technology service is the *what the infrastructure offers to the application layer*, not the node that runs it — that is a `NODE` ([25-nodes.md](25-nodes.md)). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3; the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Technology services are **zone primitives**: each is a single YAML file under `canon/elements/04_technology/services/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the service-specific frontmatter below.

---

## 1. What TECHNOLOGY_SERVICE is — and is not

A `TECHNOLOGY_SERVICE` is a **platform capability exposed to the application layer** — an infrastructure service that applications and integrations consume without needing to know the underlying NODE topology. Examples: a Kafka cluster (event streaming), an S3-compatible object-storage endpoint, a managed database, an API gateway, a container registry.

> **ArchiMate note.** ArchiMate 3.2 §9.3.3 defines Technology Service as "a technology behaviour element that exposes the functionality of a node to its environment." Transitrix maps this concept directly to `TECHNOLOGY_SERVICE`. Applications (`APPLICATION`) *use* technology services; nodes (`NODE`) *host* them. The `uses` and `hosts` relation kinds ([17-relations.md](17-relations.md) §3) express these links.

It is **not**:

- A `NODE` — a node is the substrate (compute, network, storage). A technology service is the usable, named capability exposed by one or more nodes.
- An `APPLICATION` — applications are at the application layer and represent business software. A technology service is infrastructure — it is consumed by applications (via `uses`), but is not itself an application.
- An `INTEGRATION` — an integration is a point-to-point data exchange between applications. A technology service is the platform that may carry those exchanges (e.g. a Kafka cluster on which integration topics live), not the individual exchange itself.
- A `BUSINESS_SERVICE` — a business service exposes externally visible business behaviour to consumers. A technology service is an internal infrastructure capability consumed by software, not by business users or external parties directly.

---

## 2. Frontmatter — canonical schema

```yaml
notation: technology-service
id: TECHNOLOGY_SERVICE-KAFKA-1
name: "Kafka Event Bus"
type: messaging
description: >
  Managed Kafka cluster providing durable, partitioned event streaming
  for asynchronous communication between platform services. Topics
  partitioned by domain; retention 7 days.
node: NODE-KAFKA-HOST-1                # optional — primary NODE hosting this service
endpoint: "kafka.internal:9092"        # optional — connection endpoint or base URL

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
| `notation` | yes | string | Fixed value `technology-service`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `TECHNOLOGY_SERVICE-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label for the technology service. |
| `type` | yes | string | `messaging` \| `storage` \| `api_gateway` \| `database` \| `compute`. See §2.1. |
| `description` | recommended | string | One-paragraph elaboration of what the service offers and how it is used. |
| `node` | recommended | string | `NODE-…` — the primary node (or cluster representative) that hosts this service. Inline for the common stable case; use the `hosts` REL kind ([17-relations.md](17-relations.md) §3, from the NODE side) when tracking migration history. |
| `endpoint` | no | string | Connection string, base URL, or address (e.g. `"kafka.internal:9092"`, `"s3.eu-central-1.amazonaws.com/bucket"`). Useful for integration modelling and dependency tracing. |
| `zone` / `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | When this technology service became available — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | When the service was decommissioned, or `null`. |

### 2.1 `type` vocabulary

| Value | Meaning | Examples |
|---|---|---|
| `messaging` | Asynchronous message / event streaming platform. | Kafka, RabbitMQ, AWS SQS/SNS, Azure Service Bus. |
| `storage` | Persistent object, block, or file storage. | S3-compatible object store, Azure Blob Storage, NFS mount. |
| `api_gateway` | HTTP/API ingress, routing, and policy enforcement gateway. | AWS API Gateway, Kong, NGINX API Gateway. |
| `database` | Managed or self-hosted database engine (relational or NoSQL). | PostgreSQL, MongoDB Atlas, Azure SQL, DynamoDB. |
| `compute` | General-purpose compute platform consumed as a service (container registry, serverless, container scheduler). | AWS Lambda, Azure Container Apps, Docker Registry. |

---

## 3. Relations — `hosts` and `uses`

Two first-class relation kinds connect a technology service to its infrastructure and consumers ([17-relations.md](17-relations.md) §3):

| Relation `type` | From → To | What it records |
|---|---|---|
| `hosts` | `NODE` → `TECHNOLOGY_SERVICE` | A node hosts this technology service. Declared on the NODE side — the node file carries the `hosts` relations. Time-aware: use a `REL-…` file when a service migrates to a new node. The inline `node` field on the technology service is a back-reference for simple stable cases. |
| `uses` | `APPLICATION` → `TECHNOLOGY_SERVICE` | An application consumes this technology service. Time-aware — use a `REL-…` file when an application starts or stops using a service (a dependency change after a migration or re-architecture). For stable, long-running dependencies, the inline `uses[]` field on the `APPLICATION` element ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.7) is sufficient. |

**Inline vs first-class.** The inline `node` field on `TECHNOLOGY_SERVICE` and the inline `applications[]` field on `APPLICATION` are the right choice for stable links. Move to `REL-…` files when:

- A technology service migrates to a new node (the `hosts` REL on the old NODE ends with `valid_to`; a new `hosts` REL is admitted on the new NODE).
- An application starts consuming a new technology service mid-stream, or stops consuming one — the dependency change is a temporal event worth auditing.

---

## 4. File location and naming

```
canon/elements/04_technology/services/<ID>.yaml
```

One technology service per file, named by its canonical ID. Examples: `TECHNOLOGY_SERVICE-KAFKA-1.yaml`, `TECHNOLOGY_SERVICE-S3-1.yaml`, `TECHNOLOGY_SERVICE-DB-POSTGRES-1.yaml`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `TSVC-001` | error | `id` missing or not matching `TECHNOLOGY_SERVICE-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `type`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) missing. |
| `TSVC-002` | error | `type` is not one of `messaging`, `storage`, `api_gateway`, `database`, `compute`. |
| `TSVC-003` | error | `node` is present but does not resolve to an admitted `NODE` in canon. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to TECHNOLOGY_SERVICE files in addition to the TSVC-* rules above.

---

## 6. Evolution

- **`uses` inline on APPLICATION.** v0.1 records the `APPLICATION → TECHNOLOGY_SERVICE` dependency via the `uses` REL kind. A future additive enhancement could add a `technology_services[]` inline field to the APPLICATION element schema (§7.7), analogous to `capabilities[]` and `products[]`, for adopters who only need a point-in-time dependency list. Until that field is added, all dependencies go through the `uses` REL.
- **Additional `type` values.** The vocabulary is open for extension (e.g. `event_streaming` as a more granular alias for `messaging`, or `cache` for Redis / Memcached). New values are additive (MINOR bump) and do not break adopters on an older vocabulary.
- **INTEGRATION and TECHNOLOGY_SERVICE.** An `INTEGRATION` element represents a point-to-point data exchange between applications; it may use a `TECHNOLOGY_SERVICE` (e.g. a Kafka topic as the carrier). v0.1 does not model the `INTEGRATION → TECHNOLOGY_SERVICE` link explicitly. If adopters need to trace which integration runs over which platform service, a `carried_by` REL kind is a candidate for a future revision.
- **SLA and operational fields.** v0.1 does not model service-level agreements, availability, or latency targets on `TECHNOLOGY_SERVICE`. If needed, these are additive optional fields in a future revision.

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3, §7.25.
- Hosting node: [25-nodes.md](25-nodes.md).
- `hosts` and `uses` relations: [17-relations.md](17-relations.md) §3.
- Technology layer placement: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.
- Application element schema (consumer side): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.7.
