---
notation: "SDD"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-04"
status: "draft"
file_extension: "*.sdd.transitrix.yaml"
dsm_status: "not implemented — Studio document-view engine planned (consumer-side, tracked separately)"
---

# SDD — Document-View — Reference

**Version:** 0.1
**Date:** 2026-08-04
**Status:** Draft — third concrete spec of the document-view class ([`views/documents/`](../documents/), per [`README.md`](../../README.md) §Views), following the layout pattern the MRD layout ([29-mrd.md](29-mrd.md)) and SRS layout ([30-srs.md](30-srs.md)) established.
**File extension:** `*.sdd.transitrix.yaml`
**Scope:** A **document-rendering configuration** for the Software Design Description (SDD) layout — a design-oriented document body that groups admitted application/technology elements (`APPLICATION` ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.7), `NODE` ([25-nodes.md](../../elements/25-nodes.md)), `TECHNOLOGY_SERVICE` ([26-technology-services.md](../../elements/26-technology-services.md))) as the document's section structure, and lists under each the `REQUIREMENT`s it realises, traced via the `ASSERTION` catalogue ([16-assertion.md](../../elements/16-assertion.md)). The document is a presentation surface — it carries no canonical content of its own. Everything it displays is **derived** from the `APPLICATION` / `NODE` / `TECHNOLOGY_SERVICE`, `ASSERTION`, and `REQUIREMENT` catalogues.
**Renderer:** Transitrix Studio — document-view engine (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `sdd` |
| File extension | `*.sdd.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `sdd` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `view` | yes | object | the SDD view config — see §3 and §4 |

Example header:

```yaml
notation: sdd
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "3.7.0"
view:
  # ... see §3
```

---

## 1. What this view is

An SDD view answers one question: **for a given slice of the organisation's application/technology design, which requirements does each design element realise?** It renders the combined `APPLICATION` / `NODE` / `TECHNOLOGY_SERVICE` catalogue as the document's section structure, and lists under each design element the admitted `REQUIREMENT`s it realises — traced one hop through the `ASSERTION` catalogue: `ASSERTION.realised_via` names the design element, `ASSERTION.about` names the requirement it helps satisfy.

The renderer materialises that document from canon. Nothing is stored twice:

- The fact that *a design element exists* is recorded once — on the `APPLICATION` ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.7), `NODE` ([25-nodes.md](../../elements/25-nodes.md)), or `TECHNOLOGY_SERVICE` ([26-technology-services.md](../../elements/26-technology-services.md)) element.
- The fact that *a design-input obligation exists* is recorded once — on the `REQUIREMENT` element ([15-requirement.md](../../elements/15-requirement.md)).
- The fact that *a given design element technically realises a given requirement* is recorded once — on `ASSERTION.realised_via` and `ASSERTION.about` ([16-assertion.md](../../elements/16-assertion.md) §2, §2.3).

An SDD document declares **which slice of that catalogue triple to render** (which design elements, which requirements) and **how** (ordering, whether a design element with no requirement trace still gets a section). It does not redeclare any of the three facts above, and it does not add narrative prose of its own — every word a reader sees traces to a `name` / `description` field on an admitted `APPLICATION`, `NODE`, `TECHNOLOGY_SERVICE`, or `REQUIREMENT`.

**Not a compliance view.** `ASSERTION` also carries a `status` (`compliant` / `partial` / `non_compliant` / `under_review` / `n_a`) and a `subject` (`PRODUCT` / `PROCESS` / `CAPABILITY` — the compliance unit that bears the obligation, fixed by `ASSERT-003`). This layout deliberately does not group by, filter on, or foreground either — a renderer MAY show an assertion's `status` next to a traced requirement as display-only context (§5.2), but the compliance judgement itself (which subject satisfies which obligation, and how well) is the Compliance Impact view's job ([21-compliance-impact.md](../reports/21-compliance-impact.md)), not this one. SDD groups by *design*, not by *compliance unit*.

**Not a template.** An SDD view config has no field for hand-authored document prose — no executive summary, no free-text section body, nothing typed directly into the view that isn't already a projection of an `APPLICATION` / `NODE` / `TECHNOLOGY_SERVICE` / `REQUIREMENT` field. A field that exists only to carry prose into the rendered document belongs on the element itself (its `description`), not on the view.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Publish a design-facing document listing what each application / infrastructure element is built to satisfy, organised by the design element itself. | SDD view |
| Audit which design elements carry no requirement trace — a realisation gap, or infrastructure the model has not yet connected to any obligation. | SDD view — with `include_untraced_elements: true` (default, §4) |
| Produce a narrower SDD scoped to one design-element TYPE (e.g. only `NODE`s) or one requirement origin (e.g. only `legislative`-origin requirements). | SDD view — with `scope.design_elements.filter.type` / `scope.requirements.filter.origin` (§4) |
| Hand-pick an explicit set of design elements and/or requirements for a focused document. | SDD view — with `scope.design_elements.include` / `scope.requirements.include` (§4) |

For the canonical authoring of a design element, the obligation it realises, or the trace between them, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The application itself. | `APPLICATION` element ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.7) at `canon/elements/03_application/applications/APPLICATION-<…>.yaml`. |
| The infrastructure substrate it runs on. | `NODE` element ([25-nodes.md](../../elements/25-nodes.md)) at `canon/elements/04_technology/nodes/NODE-<…>.yaml`. |
| The platform service exposed to the application layer. | `TECHNOLOGY_SERVICE` element ([26-technology-services.md](../../elements/26-technology-services.md)) at `canon/elements/04_technology/services/TECHNOLOGY_SERVICE-<…>.yaml`. |
| The design-input obligation a design element realises. | `REQUIREMENT` element ([15-requirement.md](../../elements/15-requirement.md)) at `canon/elements/01_motivation/requirements/REQUIREMENT-<…>.yaml`. |
| The trace from a design element to the requirement(s) it realises. | `ASSERTION.realised_via` / `ASSERTION.about` ([16-assertion.md](../../elements/16-assertion.md) §2, §2.3) at `canon/assertions/ASSERTION-<…>.yaml`. |
| Whether the compliance unit (`PRODUCT` / `PROCESS` / `CAPABILITY`) that bears the obligation actually satisfies it. | `ASSERTION.status` ([16-assertion.md](../../elements/16-assertion.md) §3) — surfaced by the Compliance Impact view ([21-compliance-impact.md](../reports/21-compliance-impact.md)), out of scope for this view. |

---

## 3. Document structure

An SDD view file is a short, declarative document config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: sdd
spec_version: "0.1"
name: "Data export capability — SDD"          # required per CONTRACT.md §1.1
generated_at: "2026-08-04"                    # optional per CONTRACT.md §4
methodology_version: "3.7.0"

view:
  id: SDD-DATA-EXPORT-1
  name: "Data export capability — SDD"
  description: "Design elements realising the data-export obligation, and the requirement each one traces to."

  # Reserved — see §4. Not read by the render contract in this version of the spec.
  standard: null

  # What the document covers. Every key here filters/scopes/orders; none carries prose.
  scope:
    design_elements:
      filter:
        type: [APPLICATION, NODE, TECHNOLOGY_SERVICE]
      # include: [APPLICATION-DATA-EXPORT-SERVICE-1]
    requirements:
      # include: [REQUIREMENT-DATA-EXPORT-SLA-1]
      filter:
        origin: [legislative]

  # Whether a design element with zero traced requirements still gets an (empty) section.
  include_untraced_elements: true
  empty_section_label: "No requirement traces to this design element (current model)"

  # Ordering knobs.
  grouping:
    order_design_elements_by: "id"     # id | name | type
    order_requirements_by: "id"        # id | name | severity
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../../CONTRACT.md) §10), a `view` object, and scoping/ordering fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`SDD-…`) per [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2 (`SDD` view-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this document config (which design elements, which requirement slice, why). Config-level metadata only — surfaced by tooling that lists saved view-configs ([REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) §4); it is **not** rendered into the document body, and carries no obligation on the renderer to display it anywhere in the output. |
| `view.standard` | no | string | unset | Reserved for a future document-structure profile selector. **Inert in this version of the spec — not read by the render contract (§5).** Setting it has no effect on the rendered output. No document-view layout under [`views/documents/`](.) may document, default to, or emit a standard identifier (a named specification number or numbering convention) as a value of this or any other field; see §5 for the corresponding render-contract MUST and [check-notations.mjs](../../../scripts/check-notations.mjs) `DOC1` for the doc-lint guard. |
| `view.scope.design_elements.include` | no ¹ | list | unset (use `filter`, or every admitted `APPLICATION` / `NODE` / `TECHNOLOGY_SERVICE`) | Explicit list of typed IDs (`APPLICATION-…`, `NODE-…`, `TECHNOLOGY_SERVICE-…` — any mix) to render as document sections, in the order given (subject to `grouping.order_design_elements_by`). |
| `view.scope.design_elements.filter.type` | no ¹ | list | unset (all three TYPEs) | Closed vocabulary subset of `APPLICATION \| NODE \| TECHNOLOGY_SERVICE`. When present, only design elements of a listed TYPE are in scope. |
| `view.scope.requirements.include` | no ² | list | unset (use `filter`, or every `REQUIREMENT` reached by an in-scope design element's trace) | Explicit list of `REQUIREMENT-…` IDs. A listed requirement renders only if it also traces to an in-scope design element (§5.2) — this field narrows, it does not add requirements outside the realisation trace the layout is built on. |
| `view.scope.requirements.filter.origin` | no ² | list | unset (no filter — every `origin`) | List of `origin` values from the closed vocabulary `legislative \| process-product \| project-product` ([15-requirement.md](../../elements/15-requirement.md) §2.1). Narrows which traced requirements appear under each design element. |
| `view.include_untraced_elements` | no | boolean | `true` | Whether an in-scope design element with zero traced `REQUIREMENT`s still renders as a section (carrying `empty_section_label`). `false` omits it from the document entirely. |
| `view.empty_section_label` | no | string | `"No requirement traces to this design element (current model)"` | Label rendered under a design-element section that has no matching requirement (§5.3). |
| `view.grouping.order_design_elements_by` | no | string | `id` | Section ordering key: `id`, `name`, `type`. |
| `view.grouping.order_requirements_by` | no | string | `id` | Within-section ordering key for requirements: `id`, `name`, `severity`. |

¹ **`scope.design_elements`** — both keys are optional and only ever *narrow* the section set. Omitting both renders every admitted `APPLICATION`, `NODE`, and `TECHNOLOGY_SERVICE` in canon as a section. If both `include` and `filter` are present, `include` wins and `filter` is ignored.

² **`scope.requirements`** — both keys are optional and only ever *narrow* the requirement set within each in-scope design element's section. Omitting both renders every admitted `REQUIREMENT` reached by an in-scope design element's realisation trace. If both `include` and `filter` are present, `include` wins and `filter` is ignored.

All references in `view.scope.design_elements.include`, `view.scope.requirements.include` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: sdd
spec_version: "0.1"
name: "Full SDD — all design elements"   # required per CONTRACT.md §1.1
generated_at: "2026-08-04"               # optional per CONTRACT.md §4
methodology_version: "3.7.0"
view:
  id: SDD-ALL-1
  name: "Full SDD — all design elements"
```

— renders **deterministically**: one section per admitted `APPLICATION`, `NODE`, and `TECHNOLOGY_SERVICE` in canon (ordered by `id`), each listing every admitted `REQUIREMENT` reached by its realisation trace (ordered by `id`, no origin filter), untraced design elements rendered with the default empty-section label, `view.standard` unset and read by nothing. Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) — the natural home for a document-config too, not only report-configs (§1 there).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the document from canon. The contract names its inputs, its derivation steps, and a normative constraint on what the output may never contain.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs:

1. **`APPLICATION` catalogue** — every `APPLICATION-…` file under `canon/elements/03_application/applications/` in admitted state. Each contributes its `id`, `name`, `type`, `domain`, and `description`.
2. **`NODE` catalogue** — every `NODE-…` file under `canon/elements/04_technology/nodes/` in admitted state. Each contributes its `id`, `name`, `type`, `provider`, `region`, and `description`.
3. **`TECHNOLOGY_SERVICE` catalogue** — every `TECHNOLOGY_SERVICE-…` file under `canon/elements/04_technology/services/` in admitted state. Each contributes its `id`, `name`, `type`, `node`, `endpoint`, and `description`.
4. **`ASSERTION` catalogue** — every `ASSERTION-…` file under `canon/assertions/` in admitted state. Each contributes its `id`, `about`, `subject`, `realised_via`, and `status`.
5. **`REQUIREMENT` catalogue** — every `REQUIREMENT-…` file under `canon/elements/01_motivation/requirements/` in admitted state. Each contributes its `id`, `name`, `description`, `origin`, `severity`, `level`, and `kind`.

The renderer reads **no other input**. In particular: the view document itself contributes only scope / ordering / labelling configuration — it never supplies a body sentence, a section heading beyond a design element's own `name`, or a value not traceable to an admitted element field. `ASSERTION.subject` is read only as an internal step of resolving the `about → REQUIREMENT` trace (§5.2) — it is never rendered, filtered on, or used to select sections; doing so would duplicate the Compliance Impact view (§1).

**Normative constraint — no standard identifiers.** A conformant renderer MUST NOT emit a standard identifier (a named specification number or numbering convention) anywhere in the rendered output of this layout — not as a section label, not as a default value, not as a value substituted for an unset field. `view.standard` (§4) is reserved and inert: no current or future revision of this layout may read it to select or emit such an identifier without a new, explicitly reviewed spec revision that lifts this constraint. This is checked at spec-authoring time by the `DOC1` doc-lint rule in [check-notations.mjs](../../../scripts/check-notations.mjs), which fails the build if this file (or any sibling document-view spec) ever documents one as a supported or default field value.

### 5.2 Derivation

1. **Resolve the design-element scope** from `view.scope.design_elements.include` or `view.scope.design_elements.filter.type` against the combined `APPLICATION` + `NODE` + `TECHNOLOGY_SERVICE` catalogues; omitting both selects every admitted element of all three TYPEs. Sort the result per `view.grouping.order_design_elements_by`.
2. **For each in-scope design element**, resolve its requirement set: every admitted `REQUIREMENT` reached by walking, for every admitted `ASSERTION` whose `realised_via` contains the design element's `id`, that assertion's `about` field to the `REQUIREMENT` it names — further narrowed by `view.scope.requirements.include` and/or `view.scope.requirements.filter.origin` (same include-wins-over-filter rule as step 1). Where two or more assertions independently realise the same requirement via the same design element, the requirement appears **once** in the section (deduplicated by `REQUIREMENT` id). Sort the result per `view.grouping.order_requirements_by`.
3. **Render one section per in-scope design element**, in the step-1 order: the element's `name` (and TYPE) as the section heading, its `description` (if present) as the section's sole introductory text, followed by one entry per requirement from step 2 (its `id`, `name`, `description`, and any of `origin` / `severity` / `level` / `kind` it carries). A renderer MAY additionally display, alongside each requirement entry, the `status` of the assertion(s) that produced the trace — this is display-only context; it never determines whether a requirement appears in the section (§5.1).
4. **Untraced design elements.** A design element whose step-2 requirement set is empty renders as a section carrying `view.empty_section_label` (§5.3) when `view.include_untraced_elements` is `true` (the default); otherwise the element is omitted from the document entirely.
5. **A requirement reached only through an assertion whose `realised_via` names no in-scope design element, or whose own `id` lies outside `view.scope.requirements`, is never rendered under that element's section.** An `ASSERTION` with an empty or absent `realised_via` contributes no design-element trace at all. This is expected layout behaviour, not an error condition — an assertion recording only a compliance judgement with no named realising element is out of scope for a design-oriented document by construction.

### 5.3 Determinism

Two renders of the same view-config against the same canon state produce **byte-identical** output: the selection in step 1, the per-section selection in step 2, and both sort orders in step 3 are fully specified by this contract and the config's own fields; the renderer introduces no timestamp, environment value, or non-canonical data into the body. `generated_at` (§1.1) is document metadata, not a rendered body field, and does not affect section content.

---

## 6. Relationship to other notations and elements

```
SDD view (this notation — document-config)
  ├── reads   → APPLICATION elements            (ELEMENT_PRIMITIVES.md §7.7; admitted only)
  ├── reads   → NODE elements                   (25-nodes.md; admitted only)
  ├── reads   → TECHNOLOGY_SERVICE elements      (26-technology-services.md; admitted only)
  ├── reads   → ASSERTION elements               (16-assertion.md; admitted only)
  │     ├── realised_via → design element          (APPLICATION / NODE / TECHNOLOGY_SERVICE — the grouping key, §5.2)
  │     └── about        → REQUIREMENT             (the traced obligation, §5.2)
  ├── reads   → REQUIREMENT elements             (15-requirement.md; admitted only)
  └── carries no canonical content of its own    (ELEMENT_PRIMITIVES.md §1.1)
```

Distinct from the Compliance Impact view ([21-compliance-impact.md](../reports/21-compliance-impact.md)), which groups the same `ASSERTION` catalogue by *compliance unit* (`ASSERTION.subject` — `PRODUCT` / `PROCESS` / `CAPABILITY`) and foregrounds `status`; SDD groups by *design element* (`ASSERTION.realised_via`) and treats `status` as optional display context only (§1, §5.1). The two views read the same `ASSERTION` catalogue from opposite ends of the same trace.

Pairs with the document-view class's own reverse-trace posture — a design element with no realising `ASSERTION` is exactly the case `view.include_untraced_elements` / `view.empty_section_label` surface to a reader, the same modelling-gap distinction the MRD layout draws for an unserved `NEED` ([29-mrd.md](29-mrd.md) §6).

Pairs with **Transitrix Studio's document-view engine** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `SDD-001` | error | A required field from §4 is missing (`view.id`, `view.name`), or `id` does not match the canonical grammar `SDD-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1). |
| `SDD-002` | error | A value in `view.scope.design_elements.include` does not resolve to an admitted canonical element of TYPE `APPLICATION`, `NODE`, or `TECHNOLOGY_SERVICE`, or a value in `view.scope.requirements.include` does not resolve to an admitted `REQUIREMENT`. |
| `SDD-003` | error | `view.scope.design_elements.filter.type` contains a value outside the closed vocabulary `APPLICATION \| NODE \| TECHNOLOGY_SERVICE`. |
| `SDD-004` | error | `view.scope.requirements.filter.origin` contains a value outside the closed vocabulary `legislative \| process-product \| project-product` ([15-requirement.md](../../elements/15-requirement.md) §2.1). |
| `SDD-005` | warning | Both `include` and `filter` are present within the same scope block (`view.scope.design_elements` or `view.scope.requirements`) — `include` wins, `filter` is silently ignored. |
| `SDD-006` | warning | The view selects zero design elements after applying `view.scope.design_elements`, or every selected design element resolves to zero traced requirements and `view.include_untraced_elements` is `false` — the rendered document will be empty. Usually indicates an over-narrow filter. |
| `SDD-007` | error | A shipped document-view layout under [`views/documents/`](.) documents, defaults to, or would render a standard identifier as a value of `view.standard` or any other field, violating the §5.1 normative constraint. Guarded at spec-authoring time by the `DOC1` doc-lint rule ([check-notations.mjs](../../../scripts/check-notations.mjs)); at render time no conformant renderer may emit one regardless of what `view.standard` is set to. |

The shared header rules `HDR-001..004` ([CONTRACT.md](../../CONTRACT.md) §2) apply in addition.

---

## 8. References

- `APPLICATION` element schema: [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.7.
- `NODE` element schema: [25-nodes.md](../../elements/25-nodes.md).
- `TECHNOLOGY_SERVICE` element schema: [26-technology-services.md](../../elements/26-technology-services.md).
- `ASSERTION` element schema and the `realised_via` / `about` trace (including the system/infrastructure realisation idiom): [16-assertion.md](../../elements/16-assertion.md) §2, §2.3.
- `REQUIREMENT` element schema: [15-requirement.md](../../elements/15-requirement.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) (`SDD` registered in §3.2).
- Reconstruction invariant (why view documents are not content homes): [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1.1.
- Sibling views this document-config mirrors in shape or pairs with: [29-mrd.md](29-mrd.md) (the document-view class precedent), [21-compliance-impact.md](../reports/21-compliance-impact.md) (the compliance-judgement view over the same `ASSERTION` catalogue).
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
