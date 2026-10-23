---
notation: "Capabilities Map"
version: "0.5"
author: "Valerii Korobeinikov"
last_updated: "2026-10-23"
status: "documented"
file_extension: "*.capability-map.transitrix.yaml"
dsm_status: "implemented — Capabilities page, Editor (C), BCM tab"
---

# Capabilities Map Notation — Reference

**Version:** 0.5
**Date:** 2026-10-23
**Status:** Implemented in Transitrix DSM
**File extension:** `*.capability-map.transitrix.yaml`
**Scope:** Capability hierarchy with CMMI V2.0 maturity assessment, addressing system, V/H orientation, lifecycle. Aligned to roles, processes, and applications.
**Renderer:** Transitrix DSM — Capabilities table, Editor (C), BCM tab; Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `capability-map` |
| File extension | `*.capability-map.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `capability-map` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `capability_map` | yes | object | the capability map root — see §12 and §13 |

Example header:

```yaml
notation: capability-map
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
capability_map:
  # ... see §12
```

---

## Element lifecycle

Every inline element this notation defines — entries in `capabilities[]`, recursively including nested `children[]` — carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../../CONTRACT.md) §7.1, the lifecycle sits on each capability entry; the capability-map document itself does not carry a lifecycle field.

The capability-specific state vocabulary (`Planned` / `Active` / `Retired`) in §7 below is a **derived view** computed by comparing `valid_from` / `valid_to` against today's date — not a separate stored mechanism. The legacy "Start Date" / "End Date" framing in §7 refers to the same canonical `valid_from` / `valid_to` fields; subsequent revisions will unify the field naming.

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

Transitrix applies the **CMMI V2.0** standard (levels 1–5) to measure capability maturity — the scale is defined once, in [CONTRACT.md](../../CONTRACT.md) §9.4, and referenced here rather than restated.

**Maturity assessment rules in DSM:**
- Maturity is a **step function**, not a period ([CONTRACT.md](../../CONTRACT.md) §9.2): each assessment is `{ valid_from, value }`, and the value holds until the next entry's `valid_from`. What reads as an "open-left" assessment is simply the array's first entry — effective from the past without restriction; an "open-right" assessment is simply the last entry — effective indefinitely into the future. A future-dated entry takes effect from that date, not before.
- Each node in Editor (C) (except the root) shows a **round maturity indicator** in the top-left corner; colours are configured in Settings → Dictionaries → Capability Maturity Levels.

---

## 4. Capability ID conventions (Transitrix Studio — YAML files)

Capability IDs follow the canonical `CAPABILITY-<V/H sub-grammar>` form defined in [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §2.

| Axis | Format | Examples |
|------|--------|---------|
| Vertical (domain) | `CAPABILITY-V[N]`, `CAPABILITY-V[N].[N]`, `CAPABILITY-V[N].[N].[N]` | `CAPABILITY-V1`, `CAPABILITY-V1.1`, `CAPABILITY-V1.1.2` |
| Horizontal (cross-cutting) | `CAPABILITY-H[N]`, `CAPABILITY-H[N].[N]` | `CAPABILITY-H1`, `CAPABILITY-H1.2` |

Vertical capabilities are primary business domains. Horizontal capabilities cut across domains (security, compliance, data governance). The bare V/H component (`V1`, `H1.2`) without the `CAPABILITY-` prefix still appears as the address inside the DSM addressing system in §5 (`set_name.b.o.L1.L2.L3`) — the canonical ID prefixes that address with `CAPABILITY-`.

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

## 6a. Management-cycle stage and tags

A capability MAY carry `management_cycle_stage`, an optional classification
independent of architectural `layer`, decomposition, V/H orientation, maturity
and application mappings. It belongs on the canonical capability element, not
inside view configuration or an `extensions` bag. Canonical `layer` remains
`business`. Omitted or null means not classified; it does not imply an absent
ability or an incomplete domain.

The controlled values and display order are:

| Value | PDCA + Learn correspondence | Capability contribution |
| --- | --- | --- |
| `Strategic` | Act and strategic Plan | Choose direction, strategic goals, priorities and significant organisational improvements; strategic planning |
| `Learning` | Learn, the explicit addition to PDCA | Research, reflection, knowledge capture and sharing, learning and competence development |
| `Planning` | Tactical and operational Plan | Budgets, capacity, resources, scheduling and executable operational plans |
| `Execution` | Do | Perform the domain's work, including operational master-data maintenance |
| `Assurance` | Check | Monitor outcomes, quality, deviations, controls and compliance |

Strategic planning belongs to Strategic; tactical/operational planning belongs
to Planning. Classify by decision scope and represented ability, not the word
"planning" or a time horizon alone. The order is a layout convention, not a
process sequence. Local improvement can occur in every domain. A composite L1
can remain unclassified while its children occupy several stages.

Stages MUST NOT inherit from parents, tags, names, maturity or orientation.
Changing a stage requires an explicit source-model change. Dated views must not
apply a later classification retroactively when no historical source is supplied.
This field does not by itself introduce a new sidecar series.

`tags` remains the common free-form classifier array. ESG, MDM and Support are
tag values, never management stages. ESG/MDM describe subject affiliation;
Support describes a supporting role and does not automatically change the
capability's `type`. A tag does not create, remove or imply an H capability or
intersection. Actual horizontal capabilities retain their identity, hierarchy,
maturity and explicit application mappings. Tags MUST NOT inherit.

```yaml
# Fragment of a capability element; admission/lifecycle omitted.
notation: capability
id: CAPABILITY-H1.2.1
name: Customer data quality control
layer: business
management_cycle_stage: Assurance
tags: [MDM, Support]
```

A layer or tag is a source fact; whether/how to show it is view configuration
(§16). Missing classification remains visible as Not specified when grouping;
it is not silently assigned a stage. Unknown authored stage values are invalid.

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
  id: "CAPABILITY_MAP-BUSINESS-1"
  name: "Business Capabilities Map"
  description: "Core business capabilities with current and target maturity"
  assessment_date: "2026-05-08"

  capabilities:
    - id: "CAPABILITY-V1"
      name: "Order Management"
      type: "domain"                       # domain | supporting
      business_process: "PROC-ORD-FULFILL-001"
      applications:
        - "APP-OMS-001"
        - "APP-CRM-001"
      # current_maturity, target_maturity, owner_role, target_date are
      # time-varying — they live in CAPABILITY-V1.history.yaml (CONTRACT.md §9), not inline.
      children:
        - id: "CAPABILITY-V1.1"
          name: "Order Intake"
        - id: "CAPABILITY-V1.2"
          name: "Order Fulfilment"
```

---

## 13. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `capability_map.id` | Yes | Unique ID for this map view, canonical TYPE `CAPABILITY_MAP` (`CAPABILITY_MAP-<DOMAIN>-<SEQ>`) |
| `capability_map.name` | Yes | Human-readable name |
| `capability_map.assessment_date` | Yes | Date of the maturity assessment (YYYY-MM-DD) |
| `id` | Yes | Capability ID — canonical form `CAPABILITY-V1`, `CAPABILITY-V1.1`, `CAPABILITY-H1` (see [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §2) |
| `name` | Yes | Capability name |
| `type` | Yes | `domain` or `supporting` |
| `current_maturity` | Yes | Current CMM level ([CONTRACT.md](../../CONTRACT.md) §9.4 scale). **Time-varying** — lives in the sidecar `<capability_id>.history.yaml` ([CONTRACT.md](../../CONTRACT.md) §9), not inline. Inline placement triggers `VERSIONED-004`. |
| `target_maturity` | No | Target CMM level ([CONTRACT.md](../../CONTRACT.md) §9.4 scale). **Time-varying** — a target is a statement made on a date and may be revised on a later date; lives in the sidecar, not inline. Inline placement triggers `VERSIONED-004`. |
| `target_date` | No | When the target should be reached (YYYY-MM-DD). **Time-varying** — sidecar, not inline. |
| `owner_role` | No | Reference to BusinessRole element ID. **Time-varying** — sidecar, not inline. |
| `business_process` | No | Reference to BusinessProcess element ID. Stays inline in v1 (relations are Wave 3 territory). |
| `applications` | No | List of ApplicationComponent element IDs. Stays inline in v1 (relations are Wave 3 territory). |
| `management_cycle_stage` | No | One of the five values in §6a, or null; canonical capability attribute, no inheritance. |
| `tags` | No | Common element tags; ESG/MDM/Support are independent classifier values, not stages (§6a). |
| `children` | No | List of child capabilities. |

---

## 13a. Time-aware relations

A capability's **`parent`** relationship — its position under another capability in the hierarchy — is declared **time-aware** per the temporal model. The canonical home for a parent link is a `REL-…` file under `canon/relations/` with `type: parent`; see [17-relations.md](../../elements/17-relations.md) §3 for the enum and §2 for the file shape.

```
canon/relations/REL-CAP-V11-PARENT-1.yaml   # links CAPABILITY-V1.1 → CAPABILITY-V1
```

Sample REL file:

```yaml
notation: relation
id: REL-CAP-V11-PARENT-1
type: parent
from: CAPABILITY-V1.1
to: CAPABILITY-V1
zone: canon
admitted_at: "2026-05-28"
admitted_by: "v.korobeinikov"
gate_checks: { uniqueness: pass, consistency: pass, completeness: pass }
valid_from: "2024-01-01"
valid_to: null
```

A re-parenting event — a capability moved under a different parent in a re-org — produces **two** REL files: the old relation ends (`valid_to` set), and a new one starts (`valid_from` set to the same date, `to:` the new parent). The two REL files together capture the temporal event.

**Inline `children[]` — v0.x transitional.** The existing inline `children[]` field on capability entries (§12, §13) is the timeless inverse of `parent`. v0.x adopters MAY continue using `children[]` for authoring convenience while the relation files coexist for history; the renderer prefers REL files when both are present. `REL-004` will begin firing on inline `children[]` once an adopter's validator is configured to enforce post-migration. Adopters extracting hierarchy to REL files use `valid_from = capability.valid_from` as a sensible epoch for the initial relation.

A `relates_to` field on capabilities — if any adopter has added one — stays **timeless** in v1.

---

## 14. Time-varying attributes — sidecar history

A capability's `current_maturity`, `target_maturity`, `owner_role`, and `target_date` evolve within the capability's overall lifetime. Per [CONTRACT.md](../../CONTRACT.md) §9, these fields are stored in a sidecar file co-located with the capability's element file, **not inline** on the capability-map view or on the element file:

```
canon/elements/02_business/capabilities/CAPABILITY-V1.yaml          # stable fields
canon/elements/02_business/capabilities/CAPABILITY-V1.history.yaml  # time-varying fields
```

Sidecar shape:

```yaml
target: CAPABILITY-V1
attribute_versions:
  current_maturity:
    - { valid_from: "2024-01-01", value: 1 }
    - { valid_from: "2025-06-01", value: 2 }
    - { valid_from: "2026-09-15", value: 3 }
  target_maturity:
    - { valid_from: "2024-01-01", value: 3 }
    - { valid_from: "2026-09-15", value: 4 }
  owner_role:
    - { valid_from: "2024-01-01", value: ROLE-OPS-1 }
    - { valid_from: "2026-07-01", value: ROLE-OPS-2 }
  target_date:
    - { valid_from: "2024-01-01", value: "2027-06-30" }
    - { valid_from: "2026-04-01", value: "2026-12-31" }
```

Current-value resolution: pick the entry with the largest `valid_from <= today`. See [CONTRACT.md](../../CONTRACT.md) §9.2.

Migration: adopters with existing inline values move each value into a single-entry sidecar with `valid_from = capability.valid_from`. The `VERSIONED-001..005` rules apply ([CONTRACT.md](../../CONTRACT.md) §9.3).

`target_maturity` is time-varying, alongside `current_maturity` and `target_date` — a target is a statement made on a date and may be revised on a later date, so both the level and its date live in the sidecar. `current_maturity` (what was observed) and `target_maturity` (what was undertaken) remain **two separate attribute series**, never merged into one: a future-dated entry never appears in `current_maturity`, since that would assert as fact something nobody has assessed.

---

## 15. References

- Capability elements: `elements/02_business/*.yaml` (type: Capability)
- Element template: `organizations/acme_corp/.templates/elements/02_business_template.yaml`
- Capability template: `organizations/acme_corp/.templates/capability-map_template.yaml`
- ID grammar (including the `CAPABILITY-V`/`H` exception) and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology, notation kit §3 (capabilities and maturity): `method/04-notations.md`
- DSM: `docs/docs/concepts/bcm-explained.md` — BCM concept and addressing rules
- DSM assignment: `assignments/06_0_1_capabilities.md` — detailed requirements (addressing, validation, sets)


## Validation rules

| Rule | Severity | Description |
|---|---|---|
| `CMAP-002` | error | In the supported inline map form, `capability_map` is absent or not an object, its required `id`, `name`, or `assessment_date` is absent or empty, or `capability_map.capabilities` is absent or not an array. An empty array is valid; item type/shape failures use `SCHEMA_INVALID`. |

Schema shape/type failures follow [CONTRACT.md](../../CONTRACT.md) §18.6.
Positive/rejecting cases and version compatibility are in the
[diagnostic migration contract](../../../migrations/6.0-to-7.0/).

---

## 16. System coverage, dated views and presentation defaults

### 16.1 Explicit coverage

An application's direct `capabilities` list and its technical inventory's
explicit capability lists ([applications catalogue §6a](10-applications.md#6a-technical-capabilities-and-business-coverage))
are separate evidence paths to business capabilities. A projection MUST declare
its direct-link source and retain both paths in provenance. Conflicting inverse
lists require reconciliation, not union by assumption. Parent/child, tag and
stage classifications do not imply support. Missing mappings mean not specified,
not unsupported, absent or zero coverage. Several links from one application
count once when collecting that application's target set.

A system polygon encloses its selected visible targets. Connecting empty space,
shape and area do not add mappings or express a coverage percentage. Colored
polygons may mask unrelated boxes. Shape is either an axis-aligned bounding
rectangle or an angled enclosing hull; rounding is independent. Small margins
must not create decorative overlap between neighboring domains.

Red overlap outlines the boundary of the region inside **at least two selected
outer system polygons**: `R = union over i < j of (P_i intersection P_j)`.
Use the selected rounded/rectangular/angled shape. Ignore box cut-out masks for
this boundary; they must not introduce steps around nested capability boxes.
A triple overlap has no internal pairwise seams; disjoint components have
separate closed contours. Point/edge contact with zero area is not a region.
This is a geometric diagnostic, not proof of equivalent functions, unnecessary
duplication, measured adequacy or a recommendation to retire a system.

### 16.2 State on a date

Keep selected model-validity date, evidence/snapshot date, source revision and
observed-versus-planned intent distinct. Resolve capability/parent lifetimes and
current/target maturity from the canonical lifecycle, relation and sidecar
contracts; do not replace them with a renderer's date conventions. A target
state is planned composition, never an observed outcome because its date passed.

A renderer using full snapshot inputs must identify them as projections and
preserve source revision and evidence date. Dated snapshot windows must have
explicit boundaries; overlapping alternatives require separate scenario
selection. Gaps mean unknown/no supplied state and must not retain a stale map
for export. Missing history cannot be reconstructed by interpolation or copying
current support into a future target. If a source has no dated coverage history,
disclose snapshot-based coverage instead of asserting historical accuracy.

The standalone HTML adapter uses exclusive snapshot-period ends and inclusive
record lifetime ends. An adapter MUST state and test its conversion from the
source contract; no universal reinterpretation of canonical `valid_to` is made.
Future targets, snapshot projections and date gaps must remain visible in the
rendered context. A descriptive horizon is never parsed into a calendar date.

### 16.3 view_config defaults

These keys are declared by this notation under the shared view-config contract.
They contain presentation choices only; all stages, tags, mappings and dated
assessments stay in source elements/relations/sidecars.

```yaml
view_config:
  valid_at: null                 # use capability_map.assessment_date
  scenario: null                 # optional explicit TARGET_STATE reference; null is no target selection
  management_cycle:
    group: false
    order: [Strategic, Learning, Planning, Execution, Assurance]
  tags:
    filter: []                   # all tags; nonempty values select direct matches (OR)
    show: true
  display:
    depth: 3                     # 1, 2 or 3
    backlog: false
    maturity: false
    legend: true
  systems:
    highlight: null              # optional APPLICATION reference
    labels: false
    coverage: false
    selected: []                 # explicit APPLICATION references; empty means no polygons
    shape: angled                # angled or rectangular
    rounded: false
    overlap: false               # effective only with coverage and two selected systems
```

Stage order is fixed to §6a. Tag filters retain direct matches and the muted
parent/domain/lane context required to read them; context does not inherit tags.
Grouping creates only occupied stage zones behind elements, plus missing-value
diagnostics. It must preserve L1/L2/L3 containment and explicit H/V intersections.
Visibility of a layer never depends on the existence of an H capability.

The maturity legend uses samples matching actual rendered box styles and the
canonical 1–5 scale in CONTRACT §9.4. A legacy adapter may additionally show an
explicit 0 No capability absence diagnostic, clearly distinguished from the
canonical scale; missing maturity is not 0. Hiding Maturity or Legend removes
that key and its reserved space. A general legend explains only enabled modes.
SVG exports the exact selected view, its legend and provenance. Zoom and hiding
controls affect the HTML viewport, not the model or native SVG coordinates.
Display filters are not access controls or redaction.

### 16.4 Compatibility and implementation status

The §6a/§16 additions and APPLICATION technical inventory are a core-methodology
correction prepared for review, not an optional extension profile. Existing
architectural layer, common tags, lifecycle and maturity contracts are retained.
No new globally addressable technical-capability TYPE is introduced.

The standalone renderer currently consumes adapter JSON, not canonical YAML.
It maps management_cycle_stage to its legacy JSON layer field. Its HTML pilot
selection and direct-SVG backlog/all-system defaults must be overridden when
projecting the canonical defaults above. Its bounded ESG/MDM/Support tag menu
is a subset of the common free-form tags, which must remain in the source.

This specification change does not prove validator, CLI, DSM or Studio adoption.
Native consumer/schema updates, migrations and a methodology release must be
verified separately before claiming product support. Until that adoption, a
consumer must report unsupported fields/settings rather than silently dropping
them. Existing `extensions.management_cycle_stage` proposals migrate explicitly
to the defined field; conflicting values require reconciliation, and history is
preserved. Core view keys are no longer to be documented as arbitrary extension
keys. The methodology version pin changes only through the release procedure.

---

