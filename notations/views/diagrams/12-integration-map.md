---
notation: "Integration Map"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-09"
status: "draft"
file_extension: "*.integration-map.transitrix.yaml"
---

# Integration Map — Reference

**Version:** 0.1
**Date:** 2026-08-09
**Status:** Draft — first cut of the diagram view projecting admitted `INTEGRATION` elements as a labelled directed graph.
**File extension:** `*.integration-map.transitrix.yaml`
**Scope:** A **rendering / selection / grouping configuration** for the application-cooperation / data-flow picture — what talks to what, and about what — read off admitted canon. The document is a presentation surface; it carries no canonical content of its own. Everything the view displays is **derived** from `APPLICATION` ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7 / [10-applications.md](./10-applications.md)), `INTEGRATION` ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.8 / [10-applications.md](./10-applications.md)), and — when `technology_services.show: true` — the `uses` relation to `TECHNOLOGY_SERVICE` ([elements/17-relations.md](../../elements/17-relations.md) §3).
**Renderer:** Transitrix Studio (planned).
**Class:** diagram view. Form set by the notation, read by whoever reads the model — not a report view.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `integration-map` |
| File extension | `*.integration-map.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `integration-map` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `view` | yes | object | the integration-map view config — see §3 and §4 |

Example header:

```yaml
notation: integration-map
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "4.2.0"
view:
  # ... see §3
```

---

## 1. What this view is

An integration-map view answers one question: **what applications talk to each other, in which direction, and over what — read off what is actually admitted, not drawn?**

It is the application-cooperation / data-flow picture, projected from canon rather than authored as a diagram. This is the deciding design property: **an edge with no admitted `INTEGRATION` behind it must be impossible to express** — not discouraged, not linted, impossible. A drawing surface cannot guarantee that; a projection gets it for free, because the only way to make an edge appear is to admit the `INTEGRATION` it comes from. §3 states the schema property that makes this true; §7 (`INTMAP-004`) is the defence-in-depth check for an author who tries anyway.

Removing or retiring an admitted `INTEGRATION` changes the render with no edit to the view — the same reconstruction invariant every view in this catalogue obeys ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1).

This view exists because the alternative — a general-purpose drawing notation for integration landscapes — was considered and refused: the data was never missing (`source`, `target`, and the transport contract are already admitted and validated on `INTEGRATION`); the picture was. See `architecture/notations.md` §1.0 for the authored-or-derived question this view is the worked answer to.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Show what talks to what across the application landscape, derived from admitted integrations. | Integration Map view |
| Show platform dependencies alongside application cooperation (which applications use which technology services). | Integration Map view, `technology_services.show: true` |
| Register a new application or integration, or record its transport contract. | **Applications Catalogue** ([10-applications.md](./10-applications.md)) — this view only reads what is already admitted there; it authors nothing. |
| Show containment (an application inside a platform or bounded context). | **Nested Block Diagrams** ([08-blocks.md](./08-blocks.md)) — a different question (what's inside what, not what talks to what). |
| Show how an application is used inside a business process, step by step. | **BPMN** ([01-bpmn.md](./01-bpmn.md)) or a Mermaid sequence diagram if the sequence is illustrative, not governed. |
| Sketch an integration idea that isn't admitted canon yet (a proposal, a whiteboard sketch for a PR). | Mermaid or PlantUML — see `architecture/notations.md` §1.1: Transitrix is not mandatory for diagrams, and an unadmitted idea has nothing for this view to derive from. |

---

## 3. Document structure

An integration-map view file is a short, declarative selection config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: integration-map
spec_version: "0.1"
name: "Enterprise integration landscape"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                  # optional per CONTRACT.md §4
methodology_version: "4.2.0"

view:
  id: INTEGRATION_MAP-ENTERPRISE-1
  name: "Enterprise integration landscape"
  description: "Every admitted integration between the enterprise application set."

  # Which APPLICATION nodes are in scope. At most one of `include` / `filter` is
  # meaningful at a time (see §4 note ¹); omitting both is the zero-config default.
  applications:
    include:
      - APPLICATION-OMS-1
      - APPLICATION-CRM-1
    # filter:
    #   domain: [Operations, Sales]

  # Which admitted INTEGRATION elements to draw as edges. Every entry in `include` /
  # `exclude` is an INTEGRATION element id — a bare string, never an object (§4 note ²).
  integrations:
    # include:
    #   - INTEGRATION-OMS-CRM-1
    filter:
      protocol: [Kafka, REST]
    # exclude:
    #   - INTEGRATION-LEGACY-1

  # Platform dependencies via the `uses` relation. Off by default — this view's base
  # case is application-to-application cooperation.
  technology_services:
    show: false
    # include: [TECHNOLOGY_SERVICE-KAFKA-CLUSTER-1]
    # filter:
    #   platform: [Streaming]

  isolated_applications: "show"   # show | hide — see §5.2 step 4
  edge_label: "protocol"          # protocol | payload_class | directionality | none
  grouping:
    by: "none"                    # none | domain

  order_nodes_by: "id"            # id | name | domain
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../../CONTRACT.md) §10), a `view` object, and presentation fields under it. Nothing under `view` is canonical content — it is all selection / rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`INTEGRATION_MAP-…`) per [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2 (`INTEGRATION_MAP` view-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this view (which applications, which integrations, why). |
| `view.applications.include` | no ¹ | list of strings | unset (use `filter`, or the full set) | Explicit list of `APPLICATION-…` element ids to include as nodes. Each entry MUST be a bare string; an object entry is `INTMAP-004`. |
| `view.applications.filter` | no ¹ | object | **no filter — every admitted `APPLICATION` in canon** | Declarative filter: `domain: […]` (matches `APPLICATION.domain`). Resolved against the applications catalogue at render time. |
| `view.integrations.include` | no ² | list of strings | unset (use `filter`, or the full set) | Explicit list of `INTEGRATION-…` element ids to draw as edges. Each entry MUST be a bare string; an object entry (e.g. carrying `source:` / `target:` / `from:` / `to:` keys) is `INTMAP-004` — this is the schema guarantee named in §1: there is no field shape by which this list can carry an edge that is not a reference to an admitted `INTEGRATION`. |
| `view.integrations.filter` | no ² | object | **no filter — every admitted `INTEGRATION`** | Declarative filter: `protocol: […]`, `payload_class: […]`, `directionality: […]` (matches the named `INTEGRATION` fields, [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.8). |
| `view.integrations.exclude` | no | list of strings | unset (no exclusions) | `INTEGRATION-…` ids to drop from the edge set after `include` / `filter` resolve. Each entry MUST be a bare string; same `INTMAP-004` guarantee as `include`. |
| `view.technology_services.show` | no | bool | `false` | When `true`, also render `TECHNOLOGY_SERVICE` nodes reached from an in-scope `APPLICATION` via the `uses` relation ([elements/17-relations.md](../../elements/17-relations.md) §3), and one edge per `uses` relation. When `false`, `technology_services.include` / `.filter` are ignored. |
| `view.technology_services.include` | no | list of strings | unset (use `filter`, or every reachable service) | Explicit list of `TECHNOLOGY_SERVICE-…` ids to include, narrowing the set reachable via `uses` from in-scope applications. Each entry MUST be a bare string. |
| `view.technology_services.filter` | no | object | **no filter — every service reachable via `uses`** | Declarative filter on the reachable `TECHNOLOGY_SERVICE` set: `platform: […]`. |
| `view.isolated_applications` | no | string | `show` | `show` — an in-scope `APPLICATION` with zero resolved edges still renders as a disconnected node. `hide` — it is dropped from the render entirely. Either way, no edge is invented; this field only controls whether a zero-degree node is visible. |
| `view.edge_label` | no | string | `protocol` | Which admitted `INTEGRATION` field labels each edge: `protocol`, `payload_class`, `directionality`, or `none` (edges rendered unlabelled). The label always comes from the `INTEGRATION` element, never from the view document (§1). |
| `view.grouping.by` | no | string | `none` | Presentation-only clustering hint: `none` (flat layout) or `domain` (nodes visually grouped by `APPLICATION.domain`). Affects layout only — never changes which nodes or edges render. |
| `view.order_nodes_by` | no | string | `id` | Node ordering key (for renderers that lay out deterministically top-to-bottom or left-to-right): `id`, `name`, `domain`. |

¹ **`applications`** — `include` and `filter` are both optional and mutually exclusive in effect: when `include` is set, `filter` is ignored (`INTMAP-006`, warning). Omitting both enumerates every admitted `APPLICATION` in canon.

² **`integrations`** — same precedence rule as `applications`: `include` wins over `filter` when both are present (`INTMAP-006`, warning). `exclude` applies after either resolves, and applies regardless of whether `include` or `filter` was used.

All references in `view.applications.*`, `view.integrations.*`, and `view.technology_services.*` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: integration-map
spec_version: "0.1"
name: "Full integration map"            # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4
methodology_version: "4.2.0"
view:
  id: INTEGRATION_MAP-ALL-1
  name: "Full integration map"
```

— renders **deterministically**: every admitted `APPLICATION` in canon as a node, every admitted `INTEGRATION` whose `source` and `target` both resolve within that node set as a labelled directed edge (label = `protocol`), no technology-service nodes, isolated applications shown, flat layout, nodes ordered by id. Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) — the convention is uniform across every view notation, not only report-configs (§1 there).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, a per-build script) MUST follow to reproduce the view from canon. The contract names its inputs, its derivation steps, and the schema guarantee that makes an unadmitted edge unrepresentable.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs:

1. **`APPLICATION` catalogue** — every admitted `APPLICATION` element, whether nested inside the applications catalogue (`type: application`, [10-applications.md](./10-applications.md) §4) or standalone under `canon/elements/03_application/applications/` (promoted form, [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §4.1). Each contributes its id, `name`, and `domain`.
2. **`INTEGRATION` catalogue** — every admitted `INTEGRATION` element, nested (`type: integration` inside an application's `integrations[]`, [10-applications.md](./10-applications.md) §4–§5) or standalone under `canon/elements/03_application/integrations/` (promoted form, [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.8). Each contributes its id, `source`, `target`, `protocol`, and — where `interface_semantics: true` — `payload_class`, `sensitivity`, `directionality` ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.8.1).
3. **`uses` relations** — every admitted `REL` of kind `uses`, `APPLICATION` → `TECHNOLOGY_SERVICE` ([elements/17-relations.md](../../elements/17-relations.md) §3). Read only when `view.technology_services.show: true`.
4. **`TECHNOLOGY_SERVICE` catalogue** — every admitted `TECHNOLOGY_SERVICE` element ([26-technology-services.md](../../elements/26-technology-services.md)) reachable via a `uses` relation read in step 3. Read only when `view.technology_services.show: true`.

The renderer reads **no other input**. In particular: the view document itself contributes only selection / grouping / labelling configuration — never a node or an edge.

### 5.2 Derivation

1. **Resolve the application node scope.** Apply in precedence order: (a) if `view.applications.include` is set, use exactly those ids and skip (b); (b) otherwise, start from every admitted `APPLICATION` and narrow by `view.applications.filter` if present. Each id in `include` MUST resolve to an admitted `APPLICATION` — an unresolved or wrong-TYPE id is `INTMAP-003`.
2. **Resolve the integration edge candidate set.** Apply in precedence order: (a) if `view.integrations.include` is set, use exactly those ids and skip (b); (b) otherwise, start from every admitted `INTEGRATION` and narrow by `view.integrations.filter` if present. Then drop any id present in `view.integrations.exclude`. Each surviving id MUST resolve to an admitted `INTEGRATION` — an unresolved or wrong-TYPE id is `INTMAP-003`.
3. **Intersect edges with node scope.** For each candidate `INTEGRATION` from step 2, render it as a directed edge `source → target` **only if both `source` and `target` resolve to a node in the step-1 scope**. An `INTEGRATION` whose `source` or `target` falls outside the node scope is silently dropped from the render — not an error — and the renderer emits `INTMAP-007` (warning) naming the dropped id. This is the mechanism that makes an edge to something the view never named simply not appear, rather than appearing unlabelled or dangling.
4. **Apply `view.isolated_applications`.** After step 3, an application node with zero incident edges is either kept (`show`, default) or dropped (`hide`).
5. **Technology-service extension**, only when `view.technology_services.show: true`: for every application node surviving step 4, follow its admitted `uses` relations to `TECHNOLOGY_SERVICE`. Narrow the resulting service set by `view.technology_services.include` / `.filter` (same precedence rule as step 1). Add each surviving service as a node and each `uses` relation as an edge, visually distinct from an `INTEGRATION` edge (a `uses` edge is a different relation kind, not a different reading of the same one).
6. **Label each `INTEGRATION` edge** per `view.edge_label` — reading the named field directly off the `INTEGRATION` element (never off the view document). `none` renders the edge unlabelled. A `uses` edge is unaffected by `edge_label` (§4 — it labels `INTEGRATION` edges only) and MAY be labelled by the renderer with the relation kind (`uses`) for legibility.
7. **Grouping and ordering** are presentation-only per `view.grouping.by` and `view.order_nodes_by` (§4) — they never change which nodes or edges are in the render, only their visual arrangement.

The derivation order is fixed so two renderers given the same canon produce identical output.

### 5.3 The schema guarantee — why an unadmitted edge cannot be authored

Steps 2–3 above are the render-time enforcement; the guarantee starts one level earlier, in the schema itself. `view.integrations.include` and `view.integrations.exclude` (§4) are typed as **lists of strings** — a reference to something already admitted. Neither this notation nor any other field on this document defines an `edges:` / `links:` key, and neither list accepts a mapping with `source:` / `target:` / `from:` / `to:` keys. There is consequently no field on an integration-map view document into which an author can place a `(source, target)` pair directly: the only way to make an edge appear is to admit an `INTEGRATION` element that carries it. `INTMAP-004` (§7) is the validator's defence-in-depth check for an author who tries anyway (e.g. hand-edits `include:` to carry an object) — it is not the primary guarantee, which is structural.

---

## 6. Relationship to other notations and elements

```
Integration Map view (this notation — diagram view, canon-projecting)
  ├── reads   → APPLICATION elements          (10-applications.md §4–§5; ELEMENT_PRIMITIVES.md §4.1 — the node set)
  ├── reads   → INTEGRATION elements           (10-applications.md §4–§5b; ELEMENT_PRIMITIVES.md §7.8 — the edge set)
  │     ├── source / target  → APPLICATION
  │     └── protocol / payload_class / directionality → edge label (view.edge_label)
  └── reads   → uses relations                 (elements/17-relations.md §3 — optional TECHNOLOGY_SERVICE extension)
        └── TECHNOLOGY_SERVICE elements         (26-technology-services.md)
```

Distinct from **Applications Catalogue** ([10-applications.md](./10-applications.md)) — the catalogue is where `APPLICATION` and `INTEGRATION` are authored (text-and-table, no diagram); this view only reads what the catalogue already admits, rendered as a graph.

Distinct from **Nested Block Diagrams** ([08-blocks.md](./08-blocks.md)) — containment (what's inside what), not cooperation (what talks to what). The two compose: a blocks diagram can show platform groupings, an integration-map view can show the edges between the applications inside them.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `INTMAP-001` | error | A required field from §4 is missing, or `id` does not match the canonical grammar `INTEGRATION_MAP-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1). |
| `INTMAP-002` | warning | `view.applications` resolves to zero applications after `include` / `filter` — the rendered graph will have no nodes. Usually a typo or an over-narrow filter. |
| `INTMAP-003` | error | A reference in `view.applications.include`, `view.integrations.include`, `view.integrations.exclude`, or `view.technology_services.include` does not resolve to an admitted canonical element of the expected TYPE. |
| `INTMAP-004` | error | An entry in `view.applications.include`, `view.integrations.include`, `view.integrations.exclude`, or `view.technology_services.include` is a mapping/object instead of a bare string id — most commonly an attempt to author an edge directly (e.g. an object carrying `source:` / `target:` / `from:` / `to:` keys). No such field shape is defined by this notation (§5.3); this rule exists to name the violation when an author tries anyway. |
| `INTMAP-005` | error | `view.isolated_applications`, `view.edge_label`, or `view.grouping.by` is set to a value outside the enumerated set in §4. |
| `INTMAP-006` | warning | Both `include` and `filter` are present on the same selector (`view.applications`, `view.integrations`, or `view.technology_services`) — `include` wins; `filter` is silently ignored. |
| `INTMAP-007` | warning | An admitted `INTEGRATION` in the edge candidate set has a `source` or `target` outside the resolved application node scope — the edge is dropped from the render (§5.2 step 3), not an error. Rule names the dropped `INTEGRATION` id so a reader can widen `view.applications` if the omission is unintended. |

The shared header rules `HDR-001..004` ([CONTRACT.md](../../CONTRACT.md) §2) apply in addition.

---

## 8. References

- `APPLICATION` element (nested and promoted forms): [10-applications.md](./10-applications.md), [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §4.1.
- `INTEGRATION` element schema, including Application Interface semantics: [10-applications.md](./10-applications.md) §5–§5b, [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.8.
- `uses` relation (`APPLICATION` → `TECHNOLOGY_SERVICE`): [elements/17-relations.md](../../elements/17-relations.md) §3.
- `TECHNOLOGY_SERVICE` element: [26-technology-services.md](../../elements/26-technology-services.md).
- Reconstruction invariant (why view documents are not content homes): [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1.
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) (`INTEGRATION_MAP` registered in §3.2).
- Applications Catalogue — the authoring surface this view projects: [10-applications.md](./10-applications.md).
- Nested Block Diagrams — the containment view this pairs with: [08-blocks.md](./08-blocks.md).
