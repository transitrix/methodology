---
title: "Nodes — infrastructure node primitive"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-28"
status: "draft"
---

# Nodes — Reference

**Scope:** The `NODE` element type — the technology-layer infrastructure node primitive: *the physical or virtual compute, network, or storage substrate* (ArchiMate Technology Node). A node is the *where things run*, not the service running on it — that is a `TECHNOLOGY_SERVICE` ([26-technology-services.md](26-technology-services.md)). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3; the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Nodes are **zone primitives**: each is a single YAML file under `canon/elements/04_technology/nodes/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the node-specific frontmatter below.

---

## 1. What NODE is — and is not

A `NODE` is an **infrastructure substrate** — the physical or virtual compute, network, or storage resource that hosts technology services. It is the *hardware or virtualisation layer*, not the software or service layer.

> **ArchiMate note.** ArchiMate 3.2 §9.3.1 defines Node as "a computational resource upon which artefacts may be stored or deployed for execution." Transitrix maps this concept directly to `NODE`. Application-layer software (`APPLICATION`) is deployed *on* a NODE; platform-level services (`TECHNOLOGY_SERVICE`) are *hosted* by a NODE. The `hosts` relation ([17-relations.md](17-relations.md) §3) expresses this link.

It is **not**:

- A `TECHNOLOGY_SERVICE` — a service is what runs on the node and exposes platform-level behaviour (a Kafka cluster, an object-storage endpoint). The node is the substrate; the service is the running platform capability.
- An `APPLICATION` — applications are at the application layer and model business software. A node is infrastructure below the application layer.
- A `LOCATION` — a location is a place (country, city, office, virtual zone). A node may be *at* a location but is not a location.

---

## 2. Frontmatter — canonical schema

```yaml
notation: node
id: NODE-KAFKA-HOST-1
name: "Kafka Cluster Host"
type: cloud_instance
description: >
  AWS EC2 auto-scaling group hosting the Kafka broker cluster for
  asynchronous event streaming between platform services.
provider: "AWS"                        # optional — cloud/hosting provider
region: "eu-central-1"                 # optional — data-centre region or cloud region

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
| `notation` | yes | string | Fixed value `node`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `NODE-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label for the node. |
| `type` | yes | string | `server` \| `cloud_instance` \| `container_platform` \| `database_server` \| `network_device`. See §2.1. |
| `description` | recommended | string | One-paragraph elaboration of what the node is and what it hosts. |
| `provider` | no | string | Cloud or hosting provider name (e.g. `"AWS"`, `"Azure"`, `"GCP"`, `"on-premises"`). |
| `region` | no | string | Data-centre or cloud-region identifier (e.g. `"eu-central-1"`, `"westeurope"`). |
| `zone` / `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | When this node became part of the infrastructure — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | When the node was decommissioned, or `null`. |

### 2.1 `type` vocabulary

| Value | Meaning |
|---|---|
| `server` | A physical server or virtual machine — a general-purpose compute substrate. |
| `cloud_instance` | A cloud-provider managed compute resource (EC2 instance, Azure VM, GCP Compute Engine). |
| `container_platform` | A container orchestration platform (Kubernetes cluster, ECS, Cloud Run) that hosts containerised workloads. |
| `database_server` | A managed or self-hosted database-engine substrate (RDS instance, Azure SQL, a bare-metal DB host). |
| `network_device` | A network appliance (firewall, load balancer, API gateway infrastructure, CDN edge node). |

---

## 3. Relations — `hosts`

The primary relation from a node is `hosts`, linking the node to the platform-level services it exposes ([17-relations.md](17-relations.md) §3):

| Relation `type` | From → To | What it records |
|---|---|---|
| `hosts` | `NODE` → `TECHNOLOGY_SERVICE` | This node (or cluster of nodes) hosts the given technology service. Time-aware — a service migrated to a new node produces a new REL file with `valid_to` on the old one. For a stable, one-to-one hosting relationship, the inline `node` field on the `TECHNOLOGY_SERVICE` element (see [26-technology-services.md](26-technology-services.md) §2) is sufficient; use the REL kind when tracking migration history. |

A node may host multiple technology services (one `hosts` REL per service). Multiple nodes co-hosting one service (a cluster) each carry their own `hosts` REL to the same `TECHNOLOGY_SERVICE`.

---

## 4. File location and naming

```
canon/elements/04_technology/nodes/<ID>.yaml
```

One node per file, named by its canonical ID. Examples: `NODE-KAFKA-HOST-1.yaml`, `NODE-K8S-CLUSTER-1.yaml`, `NODE-DB-PRIMARY-1.yaml`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `NOD-001` | error | `id` missing or not matching `NODE-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `type`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) missing. |
| `NOD-002` | error | `type` is not one of `server`, `cloud_instance`, `container_platform`, `database_server`, `network_device`. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to NODE files in addition to the NOD-* rules above.

---

## 6. Evolution

- **Node clustering.** v0.1 models one `hosts` REL per (node, service) pair. A cluster of nodes hosting the same service is expressed as multiple REL files from each node to the service. A `cluster_of: [NODE-…]` field or a first-class `CLUSTER` TYPE is deferred — not needed until adopters need to distinguish individual cluster members.
- **Node hierarchy.** A container platform (Kubernetes cluster) hosts containerised services; an individual EC2 instance may be a node inside that cluster. v0.1 does not model node-to-node containment; a future `node_part_of` REL kind may be added when this level of infrastructure detail is needed.
- **`FACILITY` convergence.** The planned `FACILITY` primitive (see [elements/21-locations.md](21-locations.md) §7) will cover the *physical structure* a node lives in (a server room, a data centre building). `NODE` covers the *compute substrate*; `FACILITY` will cover its physical location. These are distinct concepts — a node references a `LOCATION` or (future) `FACILITY` for its physical address, not the other way around.
- **Time-varying fields.** `provider` and `region` are expected to be stable for most nodes. If a node migrates (cloud region change, re-provider) the recommended approach is `valid_to` the old node element and admit a new one, rather than versioning these fields on a sidecar. A `VERSIONED` sidecar approach may be specified in a future revision if migration history becomes a common auditing need.

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3, §7.24.
- Hosted technology services: [26-technology-services.md](26-technology-services.md).
- `hosts` relation: [17-relations.md](17-relations.md) §3.
- Technology layer placement: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §6.
