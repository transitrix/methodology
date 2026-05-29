---
title: "Actors — active-structure identity primitive"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-29"
status: "draft"
---

# Actors — Reference

**Scope:** The `ACTOR` element type — the active-structure **identity** primitive: *who or what exists and performs work* (ArchiMate Business Actor). One TYPE with a `type` discriminator covers a `person`, a `business_unit`, or a `system`. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3 (`ACTOR` field set: §7.10); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Actors are **zone primitives**: each actor is a single YAML file under `canon/elements/02_business/actors/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the actor-specific frontmatter below.

Recorded 2026-05-29 as the canonical decision (strategy proposal): `ACTOR` is the single identity primitive; it replaces the briefly-registered `UNIT` and `EMPLOYEE` TYPEs (removed the same day, before population). Engagement and org hierarchy are first-class relations, not fields here.

---

## 1. ACTOR vs ROLE — identity vs position

The business layer carries two active-structure types with a clean split:

| | ACTOR | ROLE |
|---|---|---|
| **What it is** | An identity — who/what exists | A position — a responsibility that can be filled |
| **ArchiMate** | Business Actor | Business Role |
| **Examples** | "Acme GmbH" (business_unit), "Jane Doe" (person), "Order Management System" (system) | "Operations Lead", "Data Protection Officer" |
| **Folder** | `canon/elements/02_business/actors/` | `canon/elements/02_business/roles/` |

The same actor can fill many roles over time; the same role can be filled by different actors. Which actor fills which role is carried on the relevant engagement relation (e.g. `employment` carries role assignments — §3), not inline on either primitive.

### 1.1 Identity vs engagement — why a `person` is not an `employee`

A `person` actor records *identity*, independent of how the organisation engages them. The same person may be a candidate, then an employee, then an alumnus — and may be a contractor or community member alongside. Conflating identity with employment loses that history and forces a person to be re-created per engagement. So engagement is modelled as separate, time-aware `REL` records pointing at the one identity (§3); the `ACTOR` file itself is engagement-free.

This is why the former `EMPLOYEE` TYPE was removed: `EMPLOYEE` = `ACTOR(person)` **+** an `employment` relation.

---

## 2. Frontmatter — canonical schema

```yaml
notation: actor
id: ACTOR-OPS-TEAM-1
name: "Operations Team"
type: business_unit             # person | business_unit | system  (required)
description: "The operations organisation responsible for order fulfilment."
contact: "ops@acme.example"     # optional

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-05-29"
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
| `notation` | yes | string | Fixed value `actor`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `ACTOR-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable identity label. |
| `type` | yes | string | One of `person`, `business_unit`, `system` — the identity discriminator. |
| `description` | recommended | string | Who / what this actor is. |
| `contact` | no | string | Contact handle (for `person` / `business_unit`). |
| `external_ref` | no | string | External identifier or URL — e.g. a `system`'s endpoint, or an external organisation's reference. |
| `zone` | yes | string | Always `canon` for ACTOR — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | Date the actor became known to the organisation's scope — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the actor left scope, or `null`. |

No engagement, role, ownership, or org-hierarchy fields appear on the actor — those are relations (§3).

> **Note:** `person` actors name real people; adopters apply their own data-protection rules (and the worked-example org redacts real names). See [CONTRACT.md](../CONTRACT.md) §5.

---

## 3. Relations on an actor

All of an actor's links are first-class, time-aware `REL` records ([17-relations.md](17-relations.md)), never inline fields:

| Relation `type` | From → To | What it records |
|---|---|---|
| `unit_parent` | `ACTOR(business_unit)` → `ACTOR(business_unit)` | Org hierarchy — a unit's parent unit. Re-parenting = one ended relation + one new. |
| `employment` | `ACTOR(person)` → `ACTOR(business_unit)` | Employment window; carries `contract_type` and role assignments (`roles: [ROLE-…]`). |
| `candidacy` | `ACTOR(person)` → `ACTOR(business_unit)` | Pre-hire evaluation; carries `stage`, `source`. |
| `alumni_membership` | `ACTOR(person)` → `ACTOR(business_unit)` | Former-employee relationship; may reference the prior `employment`. |
| `community_membership` | `ACTOR(person)` → `ACTOR(business_unit)` | Membership of a community modelled as a `business_unit` actor. |
| `contracting` | `ACTOR(person\|business_unit)` → `ACTOR(business_unit)` | Contracting relationship; carries `contract_terms`. |

Activity ownership references an actor by ID: an activity's `owner: ACTOR-…` ([07-activities.md](../views/07-activities.md) §5.6). The Stakeholders notation references an actor for identity (`STAKEHOLDER.actor: ACTOR-…`, REQUIRED) — a stakeholder carries the stake, never the identity.

---

## 4. File location and naming

```
canon/elements/02_business/actors/<ID>.yaml
```

One actor per file, named by its canonical ID. Examples: `ACTOR-OPS-TEAM-1.yaml`, `ACTOR-JANE-DOE-1.yaml`, `ACTOR-ORDER-MGMT-SYS-1.yaml`.

A flat catalogue listing (`*.actors.transitrix.yaml`) is an optional **view** over these element files for tooling that wants a single-file roster; the element files are authoritative. A dedicated catalogue-view notation is deferred (not needed for v0.1).

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ACTOR-001` | error | `id` missing or not matching `ACTOR-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1); or a required field (`notation`, `name`, `type`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) is missing. |
| `ACTOR-002` | error | `type` is not one of `person`, `business_unit`, `system`. |
| `ACTOR-003` | error | An engagement / hierarchy field (`employment`, `unit_parent`, `roles`, `owner`, …) is present inline on the actor file — these belong in `REL-…` files (`REL-004`), not on the identity primitive. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to ACTOR files in addition to the ACTOR-* rules above.

---

## 6. Evolution

- A dedicated `*.actors.transitrix.yaml` catalogue-view notation, if tooling demand emerges (v0.1 ships the element files only).
- `system` actors may grow structured `external_ref` sub-fields (endpoint, protocol) once an integration register needs them.
- DSM ownership migration (the `owner` / `unit` / `employee` → `owner_actor_id` collapse) is a `proj:transitrix-dsm` track; this spec defines only the methodology side.

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope + `ACTOR` field set: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3, §7.10.
- Engagement / hierarchy relations: [17-relations.md](17-relations.md) §3.
- Activity ownership (`owner: ACTOR-…`): [07-activities.md](../views/07-activities.md) §5.6.
- Stakeholder identity binding (`STAKEHOLDER.actor`): [20-stakeholders.md](20-stakeholders.md).
