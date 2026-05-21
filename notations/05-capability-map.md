---
notation: "Capabilities Map"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-05-19"
status: "documented"
file_extension: "*.capability-map.transitrix.yaml"
dsm_status: "implemented — Capabilities page, Editor (C), BCM tab"
---

# Capabilities Map Notation — Reference

**Version:** 0.3
**Date:** 2026-05-19
**Status:** Implemented in Transitrix DSM
**File extension:** `*.capability-map.transitrix.yaml`
**Scope:** Capability hierarchy with CMMI V2.0 maturity assessment, addressing system, V/H orientation, lifecycle. Aligned to roles, processes, and applications.
**Renderer:** Transitrix DSM — Capabilities table, Editor (C), BCM tab; Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all eleven Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `capability-map` |
| File extension | `*.capability-map.transitrix.yaml` |

---

## 1. Overview

A capabilities map is a hierarchical view that shows what the organisation **can do** and how well it does it. It answers two questions in one artefact:

1. **Structure** — how capabilities decompose from strategic domains down to specific abilities
2. **Maturity** — where each capability sits on the CMM scale and where it is targeted to be

The capabilities map is a **view** over Capability elements stored in `elements/02_business/`. The elements carry the maturity history; the map defines how they are arranged and displayed.

Capabilities maps live in `views/capabilities/`.

---

## 2. Core concept: What vs How vs Who

Capabilities answer **what** the business does — not how it does it, and not who does it.

| Question | Element | Example |
|----------|---------|---------|
| **What** can we do? | **Capability** | "Customer Order Management" |
| **How** do we do it? | **Process** | "Order Fulfilment Process" |
| **Who** does it? | **Organisation unit / Role** | "Sales Department" |

Capabilities are more stable than processes (which change with optimisation), technologies (which evolve), and org structure (which reorganises). This stability makes them ideal for long-term planning, technology investment decisions, and transformation programmes.

---

## 3. CMMI V2.0 maturity levels

Transitrix applies the **CMMI V2.0** standard to measure capability maturity.

| Level | Name | Description | Characteristics |
|-------|------|-------------|-----------------|
| **1** | Initial | Unpredictable, reactive | Poorly controlled; success depends on individual heroics |
| **2** | Managed | Project-level management | Processes planned, performed, measured, and controlled at project level |
| **3** | Defined | Organisation-wide standards | Processes documented and standardised across the organisation |
| **4** | Quantitatively Managed | Measured & controlled | Sub-processes controlled using statistical/quantitative techniques; performance is predictable |
| **5** | Optimising | Continuous improvement | Focus on incremental and innovative process improvement |

**Maturity assessment rules in DSM:**
- Maturity is set **per capability per period** (start date + end date); a planned/future maturity level has a period in the future.
- If the interval is open on the left (no start date) the level is effective from the past without restriction; if open on the right (no end date) it is effective indefinitely into the future.
- Each node in Editor (C) (except the root) shows a **round maturity indicator** in the top-left corner; colours are configured in Settings → Dictionaries → Capability Maturity Levels.

---

## 4. Capability ID conventions (Transitrix Studio — YAML files)

| Axis | Format | Examples |
|------|--------|---------|
| Vertical (domain) | `V[N]`, `V[N].[N]`, `V[N].[N].[N]` | `V1`, `V1.1`, `V1.1.2` |
| Horizontal (cross-cutting) | `H[N]`, `H[N].[N]` | `H1`, `H1.2` |

Vertical capabilities are primary business domains. Horizontal capabilities cut across domains (security, compliance, data governance).

---

## 5. DSM addressing system: `set_name.b.o.L1.L2.L3`

In Transitrix DSM, capabilities use a six-component address that encodes membership, placement, orientation, and position within the three-level hierarchy.

```
set_name . b . o . L1 . L2 . L3
```

| Component | Values | Meaning |
|-----------|--------|---------|
| `set_name` | kebab-case string (e.g. `default`) | Capability set name; Latin characters, no spaces |
| `b` | `0` or `1` | **Placement:** `0` = on diagram, `1` = in backlog |
| `o` | `v` or `h` | **Orientation:** `v` = vertical (column), `h` = horizontal (row) |
| `L1` | `0..N` | Level 1 position; `0` = root node (diagram only, not stored in table) |
| `L2` | `0..N` | Level 2 position within L1; `0` = this is an L1 capability |
| `L3` | `0..N` | Level 3 position within L2; `0` = this is an L1 or L2 capability |

**Constraints:**
- When `b = 0` (on diagram), `L1 ≥ 1`; `L1 = 0` is reserved for the root node which is only rendered on the diagram and is not stored in the table.
- A capability is either `v` or `h` — never both simultaneously.
- An address like `default.0.v.1.0.1` is invalid (L3 item without an L2 intermediate).
- Addresses are unique within a set: no two capabilities in the same set may share the same address.

**Examples:**

| Address | Meaning |
|---------|---------|
| `default.0.v.1.0.0` | First vertical L1 capability in the `default` set, on diagram |
| `default.0.v.1.2.0` | Second L2 capability under L1(1), vertical, on diagram |
| `default.0.v.1.2.3` | Third L3 capability under L2(1.2), vertical, on diagram |
| `default.1.v.0.3.0` | L2 capability in backlog (b=1) |
| `default.0.h.1.0.0` | First horizontal (cross-cutting) L1 capability, on diagram |

**Address recalculation:** addresses are recalculated automatically when elements are reordered on the diagram (drag-and-drop) or when elements are added/deleted, so no gaps exist in the sequence. The backend performs cascade recalculation of all affected descendants in a single transaction.

---

## 6. Orientation: Vertical (V) and Horizontal (H) capabilities

| | Vertical (V) | Horizontal (H) |
|--|---|---|
| Visual representation | Column | Row cutting across columns |
| Role | Core business domain or function | Cross-cutting capability (MDM, ESG, Digital Transformation) |
| Examples | "Finance Management", "Store Management" | "Master Data Management", "ESG" |

**Intersections:** where a horizontal capability crosses a vertical column, an **Intersection Capability** represents the minimal capability required to support the horizontal function within that vertical domain. Example: "Retail Master Data Management" = intersection of "Store Management" (V) and "Master Data Management" (H).

*Current DSM implementation:* intersections are recorded via a `lane` field (vertical column ID). Target model: a `capability_intersection` junction table (`capability_id`, `vertical_capability_id`) supporting multiple intersections per capability. Migration from `lane` is planned for a future release.

---

## 7. Lifecycle states

Each capability has **Start Date** and **End Date** attributes reflecting the period during which it is valid:

| State | Condition |
|-------|-----------|
| **Planned** | Start date in the future |
| **Active** | Current date falls within start–end range |
| **Retired** | End date in the past |

---

## 8. Criticality

Three levels: **Critical**, **Important**, **Supporting**. Used to prioritise investment and transformation planning.

---

## 9. Naming conventions

**Good names** — stable, business-oriented:
- "Customer Relationship Management"
- "Financial Planning and Analysis"
- "Product Lifecycle Management"

**Avoid:**
- Technology names: "SAP CRM", "Oracle Financials"
- Department names: "Sales Team", "Finance Department"
- Process names: "Monthly Closing Process"

**Granularity guidelines:**

| Level | Count | Audience | Stability |
|-------|-------|----------|-----------|
| L1 | 10–20 | Executives | Stable over years |
| L2 | 3–7 per L1 | Managers | Stable over months |
| L3 | 3–10 per L2 | Practitioners | May change quarterly |

---

## 10. Capability Sets

Capabilities belong to a named **Capability Set** (`set_name`). A capability belongs to exactly one set; reuse in another set requires copying (a new record with a different ID).

Each organisation gets a `default` capability set created automatically. The BCM editor always operates in the context of the selected set; the root node of the tree diagram is the set name.

---

## 11. File location and naming (YAML)

```
views/capabilities/<DOMAIN>.capability-map.transitrix.yaml
```

Examples:
- `views/capabilities/BUSINESS.capability-map.transitrix.yaml`
- `views/capabilities/TECHNOLOGY.capability-map.transitrix.yaml`

---

## 12. Top-level structure (YAML)

```yaml
capability_map:
  id: "CM-BUSINESS-001"
  name: "Business Capabilities Map"
  description: "Core business capabilities with current and target maturity"
  assessment_date: "2026-05-08"

  capabilities:
    - id: "V1"
      name: "Order Management"
      type: "domain"                       # domain | supporting
      current_maturity: 2
      target_maturity: 3
      target_date: "2026-12-31"
      owner_role: "ROLE-OPS-001"
      business_process: "PROC-ORD-FULFILL-001"
      applications:
        - "APP-OMS-001"
        - "APP-CRM-001"
      children:
        - id: "V1.1"
          name: "Order Intake"
          current_maturity: 3
          target_maturity: 3
        - id: "V1.2"
          name: "Order Fulfilment"
          current_maturity: 2
          target_maturity: 3
          target_date: "2026-09-30"
```

---

## 13. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `capability_map.id` | Yes | Unique ID for this map view (`CM-DOMAIN-SEQ`) |
| `capability_map.name` | Yes | Human-readable name |
| `capability_map.assessment_date` | Yes | Date of the maturity assessment (YYYY-MM-DD) |
| `id` | Yes | Capability ID (V1, V1.1, H1 format) |
| `name` | Yes | Capability name |
| `type` | Yes | `domain` or `supporting` |
| `current_maturity` | Yes | Current CMM level (1–5) |
| `target_maturity` | No | Target CMM level |
| `target_date` | No | When the target should be reached (YYYY-MM-DD) |
| `owner_role` | No | Reference to BusinessRole element ID |
| `business_process` | No | Reference to BusinessProcess element ID |
| `applications` | No | List of ApplicationComponent element IDs |
| `children` | No | List of child capabilities |

---

## 14. Maturity history on the element

Individual capability elements in `elements/02_business/` carry the full maturity history:

```yaml
id: "CAP-ORD-001"
name: "Order Management"
type: "Capability"
layer: "Business"
metadata:
  status: "Active"
  owner: "firstname.lastname"
  updated_at: "2026-05-08"
properties:
  capability_id: "V1"
  maturity_levels:
    - level: 1
      effective_from: "2024-01-01"
    - level: 2
      effective_from: "2025-06-01"
      status: "Current"
  target_maturity: 3
  target_date: "2026-12-31"
```

---

## 15. References

- Capability elements: `elements/02_business/*.yaml` (type: Capability)
- Element template: `organizations/acme_corp/.templates/elements/02_business_template.yaml`
- Capability template: `organizations/acme_corp/.templates/capability-map_template.yaml`
- ID grammar (including the `CAPABILITY-V`/`H` exception) and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6.3: `method/methodology.md`
- DSM: `docs/docs/concepts/bcm-explained.md` — BCM concept and addressing rules
- DSM assignment: `assignments/06_0_1_capabilities.md` — detailed requirements (addressing, validation, sets)
