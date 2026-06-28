---
title: "Locations — physical and virtual place primitive"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-26"
status: "draft"
---

# Locations — Reference

**Scope:** The `LOCATION` element type — the place primitive for *where* actors operate. A location is a physical or virtual place; it never carries identity — identity lives in an `ACTOR` ([19-actors.md](19-actors.md)) that references the location via a `located_at` relation. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3; the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Locations are **zone primitives**: each is a single YAML file under `canon/elements/02_business/locations/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the location-specific frontmatter below.

---

## 1. What LOCATION is — and is not

A `LOCATION` is a **place** — a physical or conceptual site where actors perform work or where a unit is registered. It is not:

> **ArchiMate note.** ArchiMate 3.2 distinguishes two related concepts: `Location` (cross-layer — a geographic or conceptual area: country, city, region) and `Facility` (Technology & Physical layer §9.3.2 — a concrete physical structure: building, factory, office). This primitive pragmatically **merges both** into one element: geographic areas (`country`, `region`, `city`, `virtual`) map to ArchiMate `Location`; physical structures (`site`, `office`) map to ArchiMate `Facility`. A future `FACILITY` primitive will separate these two concepts cleanly and resolve the ambiguity — see §7.

- A property of an `ACTOR` — actors reference locations via `located_at` relations; the location is a first-class element that can be pointed to by many actors.
- A substitute for an address field on the actor — `LOCATION` is a named, addressable catalogue entry so that "Tbilisi Office" can be referenced by N business units and M persons without repeating the address.
- A `CONSTRAINT` or a `RULE` — a location has no normative force; its regulatory implications (data residency, tax nexus) are expressed as `REQUIREMENT` or `CONSTRAINT` elements derived from the organisation's codex.

---

## 2. Frontmatter — canonical schema

```yaml
notation: location
id: LOCATION-TBILISI-1
name: "Tbilisi Office"
type: office                        # country | region | city | site | office | virtual
address: "14 Rustaveli Ave, Tbilisi 0108, Georgia"   # optional
country_code: "GE"                  # optional — ISO 3166-1 alpha-2
timezone: "Asia/Tbilisi"           # optional — IANA timezone string
parent: LOCATION-GE-1              # optional — enclosing LOCATION (city, country, …)
description: "Main office in Tbilisi, Rustaveli Avenue."

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-06-26"
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
| `notation` | yes | string | Fixed value `location`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `LOCATION-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label for the place. |
| `type` | yes | string | `country` \| `region` \| `city` \| `site` \| `office` \| `virtual`. See §2.1. |
| `address` | no | string | Postal address — free-text. |
| `country_code` | no | string | ISO 3166-1 alpha-2 (e.g. `"GE"`, `"US"`, `"DE"`). |
| `timezone` | no | string | IANA timezone string (e.g. `"Asia/Tbilisi"`, `"Europe/Berlin"`). |
| `parent` | no | string | `LOCATION-…` — the enclosing location (an office within a site, a city within a country). Inline reference; not time-aware (location hierarchy is stable — changes warrant a new element or an updated `parent`). |
| `description` | no | string | Free-text elaboration. |
| `zone` / `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | When this location became relevant — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | When the location closed, or `null`. |

### 2.1 `type` vocabulary

| Value | Meaning |
|---|---|
| `country` | A nation state or sovereign territory. |
| `region` | A state, province, autonomous area, or equivalent sub-national unit. |
| `city` | A city, town, or metropolitan area. |
| `site` | A physical campus or multi-building site. |
| `office` | A specific office space, floor, or building within a site. |
| `virtual` | No fixed physical address — distributed or fully remote. |

---

## 3. Hierarchy — `parent`

Locations nest naturally: an office is in a city, a city is in a country. Express nesting with an inline `parent:` reference:

```yaml
# country
id: LOCATION-GE-1
name: "Georgia"
type: country
country_code: "GE"

# city — parent points at the country
id: LOCATION-TBILISI-CITY-1
name: "Tbilisi"
type: city
country_code: "GE"
timezone: "Asia/Tbilisi"
parent: LOCATION-GE-1

# office — parent points at the city
id: LOCATION-TBILISI-1
name: "Tbilisi Office"
type: office
address: "14 Rustaveli Ave, Tbilisi 0108, Georgia"
parent: LOCATION-TBILISI-CITY-1
```

`parent` is not time-aware. If a location physically moves to a different enclosing site, update `parent:` in place (or close the element with `valid_to:` and open a new one).

---

## 4. Relations — `located_at`

An actor's location is a first-class relation ([17-relations.md](17-relations.md)):

| Relation `type` | From → To | What it records |
|---|---|---|
| `located_at` | `ACTOR(person\|business_unit)` → `LOCATION` | This actor's primary work location. For a `business_unit`, the primary registered location; for a `person`, the primary work base. Time-aware — moves produce a new REL file with the appropriate `valid_to` on the old one. |

`located_at` is **always a REL file** — never an inline field on the actor. This preserves the move history (each location change is a dated event, not a field overwrite).

---

## 5. File location and naming

```
canon/elements/02_business/locations/<ID>.yaml
```

One location per file, named by its canonical ID. Examples: `LOCATION-GE-1.yaml`, `LOCATION-TBILISI-1.yaml`, `LOCATION-VIRTUAL-1.yaml`.

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `LOC-001` | error | `id` missing or not matching `LOCATION-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `type`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) missing. |
| `LOC-002` | error | `type` is not one of `country`, `region`, `city`, `site`, `office`, `virtual`. |
| `LOC-003` | error | `parent` present but does not resolve to an admitted `LOCATION` in canon. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to LOCATION files in addition to the LOC-* rules above.

---

## 7. Evolution

- **Secondary locations.** v0.1 models only a primary location per actor via `located_at`. If an actor has multiple locations (e.g. a business unit with offices in two cities), write two REL files — one per location. A `primary: true` attribute on the REL may be introduced to distinguish primary from satellite in a future revision.
- **`person_located_at` / `unit_located_at` aliases.** Studio may emit `unit_located_at` as a relation type; the methodology canonical name is `located_at`. If a second semantically distinct relation kind for persons vs units is ever needed, it will be filed as a separate revision — for v0.1 a single `located_at` kind covers both.
- **`country_code` validation.** The validator currently checks only that `country_code` is a two-uppercase-letter string; a future revision may validate it against the ISO 3166-1 register.
- **`FACILITY` primitive.** ArchiMate 3.2 §9.3.2 defines `Facility` as a first-class Technology & Physical layer element for concrete physical structures (buildings, factories, offices) — distinct from `Location` (geographic / conceptual areas). v0.1 merges both into `LOCATION` for simplicity. A dedicated `FACILITY` primitive will be introduced when the Technology layer is populated, at which point `type: office` and `type: site` will be deprecated in `LOCATION` and migrated to `FACILITY`, while `country` / `region` / `city` / `virtual` stay in `LOCATION`.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3, §7.22.
- Active-structure identity the location is attached to via relations: [19-actors.md](19-actors.md).
- `located_at` relation: [17-relations.md](17-relations.md) §3.
