---
notation: "MRD"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-04"
status: "draft"
file_extension: "*.mrd.transitrix.yaml"
dsm_status: "not implemented — Studio document-view engine planned (consumer-side, tracked separately)"
---

# MRD — Document-View — Reference

**Version:** 0.1
**Date:** 2026-08-04
**Status:** Draft — first concrete spec of the document-view class ([`views/documents/`](../documents/), per [`README.md`](../../README.md) §Views); establishes the layout pattern later document-view layouts in this class follow.
**File extension:** `*.mrd.transitrix.yaml`
**Scope:** A **document-rendering configuration** for the Marketing Requirements Document (MRD) layout — a stakeholder/user-need-oriented document body that groups admitted `REQUIREMENT` elements ([15-requirement.md](../../elements/15-requirement.md)) under the `NEED` ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.28) each one serves. The document is a presentation surface — it carries no canonical content of its own. Everything it displays is **derived** from the `NEED` and `REQUIREMENT` catalogues.
**Renderer:** Transitrix Studio — document-view engine (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `mrd` |
| File extension | `*.mrd.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `mrd` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `view` | yes | object | the MRD view config — see §3 and §4 |

Example header:

```yaml
notation: mrd
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "4.1.0"
view:
  # ... see §3
```

---

## 1. What this view is

An MRD view answers one question: **for a given slice of the organisation's stakeholder/user needs, what design-input requirements exist to satisfy each one?** It renders the `NEED` catalogue ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.28) as the document's section structure, and lists under each `NEED` the admitted `REQUIREMENT`s ([15-requirement.md](../../elements/15-requirement.md)) that trace back to it via `serves`.

The renderer materialises that document from canon. Nothing is stored twice:

- The fact that *a stakeholder needs something* is recorded once — on the `NEED` element ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.28).
- The fact that *a design-input obligation exists to satisfy that need* is recorded once — on the `REQUIREMENT` element ([15-requirement.md](../../elements/15-requirement.md)).
- The fact that *a given requirement satisfies a given need* is recorded once — on `REQUIREMENT.serves` ([15-requirement.md](../../elements/15-requirement.md) §2.7).

An MRD document declares **which slice of that catalogue pair to render** (which needs, which requirements) and **how** (ordering, whether an unserved need still gets a section). It does not redeclare any of the three facts above, and it does not add narrative prose of its own — every word a reader sees traces to a `name` / `description` field on an admitted `NEED` or `REQUIREMENT`.

This mirrors how the Compliance Impact view ([21-compliance-impact.md](../reports/21-compliance-impact.md)) is a report-config over `ASSERTION` + process flow, and the Actions tree view ([23-actions-tree.md](../reports/23-actions-tree.md)) is a report-config over `ACTION` — MRD is the document-class counterpart, a config over the `NEED` / `REQUIREMENT` motivation-layer pair. Both views obey the reconstruction invariant ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1): the canon is reconstructible from the elements alone; the view document adds no fact.

**Not a template.** An MRD view config has no field for hand-authored document prose — no executive summary, no free-text section body, nothing typed directly into the view that isn't already a projection of a `NEED` or `REQUIREMENT` field. A field that exists only to carry prose into the rendered document belongs on the `NEED` or `REQUIREMENT` element itself (its `description`), not on the view.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Publish a stakeholder-facing document listing what the organisation has committed to build, organised by the need each commitment satisfies. | MRD view |
| Audit which admitted needs still have no requirement written against them — a design-input gap. | MRD view — with `include_unserved_needs: true` (default, §4) |
| Produce a narrower MRD scoped to one stakeholder group or one requirement origin (e.g. only `project-product`-origin requirements for one initiative). | MRD view — with `scope.needs.filter.stakeholder` / `scope.requirements.filter.origin` (§4) |
| Hand-pick an explicit set of needs and/or requirements for a focused document. | MRD view — with `scope.needs.include` / `scope.requirements.include` (§4) |

For the canonical authoring of a need, the obligation that satisfies it, or the trace between them, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The stakeholder/user need itself (what must be true, independent of how it's met). | `NEED` element ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.28) at `canon/elements/01_motivation/needs/NEED-<…>.yaml`. |
| The design-input obligation written to satisfy a need. | `REQUIREMENT` element ([15-requirement.md](../../elements/15-requirement.md)) at `canon/elements/01_motivation/requirements/REQUIREMENT-<…>.yaml`. |
| The trace from a requirement back to the need it satisfies. | `REQUIREMENT.serves: NEED-…` ([15-requirement.md](../../elements/15-requirement.md) §2.7). |
| Whether a need's requirement(s) were actually validated as meeting it. | `VALIDATION` element ([28-validation.md](../../elements/28-validation.md)) — out of scope for this view; a future document-view layout may render it. |

---

## 3. Document structure

An MRD view file is a short, declarative document config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: mrd
spec_version: "0.1"
name: "Incident status communication — MRD"   # required per CONTRACT.md §1.1
generated_at: "2026-08-04"                    # optional per CONTRACT.md §4
methodology_version: "4.1.0"

view:
  id: MRD-INCIDENT-STATUS-1
  name: "Incident status communication — MRD"
  description: "Stakeholder needs and the design-input requirements that satisfy them, for outage / incident status communication."

  # Reserved — see §4. Not read by the render contract in this version of the spec.
  standard: null

  # What the document covers. Every key here filters/scopes/orders; none carries prose.
  scope:
    needs:
      include: [NEED-TIMELY-OUTAGE-STATUS-1]
      # filter:
      #   stakeholder: [STAKEHOLDER-ENTERPRISE-CUSTOMERS-1]
    requirements:
      # include: [REQUIREMENT-OUTAGE-STATUS-PAGE-1]
      filter:
        origin: [project-product]

  # Whether a need with zero matching requirements still gets an (empty) section.
  include_unserved_needs: true
  empty_section_label: "No requirement traces to this need (current model)"

  # Ordering knobs.
  grouping:
    order_needs_by: "id"           # id | name | stakeholder
    order_requirements_by: "id"    # id | name | severity
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../../CONTRACT.md) §10), a `view` object, and scoping/ordering fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`MRD-…`) per [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2 (`MRD` view-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this document config (which needs, which requirement slice, why). Config-level metadata only — surfaced by tooling that lists saved view-configs ([REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) §4); it is **not** rendered into the document body, and carries no obligation on the renderer to display it anywhere in the output. |
| `view.standard` | no | string | unset | Reserved for a future document-structure profile selector. **Inert in this version of the spec — not read by the render contract (§5).** Setting it has no effect on the rendered output. No document-view layout under [`views/documents/`](.) may document, default to, or emit a standard identifier (a named specification number or numbering convention) as a value of this or any other field; see §5 for the corresponding render-contract MUST and [check-notations.mjs](../../../scripts/check-notations.mjs) `DOC1` for the doc-lint guard. |
| `view.scope.needs.include` | no ¹ | list | unset (use `filter`, or all admitted `NEED`s) | Explicit list of `NEED-…` IDs to render as document sections, in the order given (subject to `grouping.order_needs_by`). |
| `view.scope.needs.filter.stakeholder` | no ¹ | list | unset (no filter) | List of `STAKEHOLDER-…` IDs. When present, only `NEED`s whose `stakeholder` field is in this list are in scope. |
| `view.scope.requirements.include` | no ² | list | unset (use `filter`, or every `REQUIREMENT` that serves an in-scope need) | Explicit list of `REQUIREMENT-…` IDs. A listed requirement renders only if it also serves an in-scope `NEED` (§5.2) — this field narrows, it does not add requirements outside the need-trace relationship the layout is built on. |
| `view.scope.requirements.filter.origin` | no ² | list | unset (no filter — every `origin`) | List of `origin` values from the closed vocabulary `legislative \| process-product \| project-product` ([15-requirement.md](../../elements/15-requirement.md) §2.1). Narrows which serving requirements appear under each need. |
| `view.include_unserved_needs` | no | boolean | `true` | Whether an in-scope `NEED` with zero matching `REQUIREMENT`s still renders as a section (carrying `empty_section_label`). `false` omits it from the document entirely. |
| `view.empty_section_label` | no | string | `"No requirement traces to this need (current model)"` | Label rendered under a need section that has no matching requirement (§5.3). |
| `view.grouping.order_needs_by` | no | string | `id` | Section ordering key: `id`, `name`, `stakeholder`. |
| `view.grouping.order_requirements_by` | no | string | `id` | Within-section ordering key for requirements: `id`, `name`, `severity`. |

¹ **`scope.needs`** — both keys are optional and only ever *narrow* the section set. Omitting both renders every admitted `NEED` in canon as a section. If both `include` and `filter` are present, `include` wins and `filter` is ignored.

² **`scope.requirements`** — both keys are optional and only ever *narrow* the requirement set within each in-scope need's section. Omitting both renders every admitted `REQUIREMENT` that serves an in-scope need. If both `include` and `filter` are present, `include` wins and `filter` is ignored.

All references in `view.scope.needs.include`, `view.scope.needs.filter.stakeholder`, and `view.scope.requirements.include` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: mrd
spec_version: "0.1"
name: "Full MRD — all needs"           # required per CONTRACT.md §1.1
generated_at: "2026-08-04"             # optional per CONTRACT.md §4
methodology_version: "4.1.0"
view:
  id: MRD-ALL-1
  name: "Full MRD — all needs"
```

— renders **deterministically**: one section per admitted `NEED` in canon (ordered by `id`), each listing every admitted `REQUIREMENT` that serves it (ordered by `id`, no origin filter), unserved needs rendered with the default empty-section label, `view.standard` unset and read by nothing. Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) — the natural home for a document-config too, not only report-configs (§1 there).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the document from canon. The contract names its inputs, its derivation steps, and a normative constraint on what the output may never contain.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs:

1. **`NEED` catalogue** — every `NEED-…` file under `canon/elements/01_motivation/needs/` in admitted state. Each contributes its `id`, `name`, `description`, and `stakeholder`.
2. **`REQUIREMENT` catalogue** — every `REQUIREMENT-…` file under `canon/elements/01_motivation/requirements/` in admitted state. Each contributes its `id`, `name`, `description`, `origin`, `severity`, `level`, `kind`, and `serves`.
3. **`STAKEHOLDER` catalogue** (optional, display-only) — a renderer MAY resolve a `NEED.stakeholder` reference to the `STAKEHOLDER.name` for display; if it does not (or the reference is absent from the input set the renderer was given), the raw `STAKEHOLDER-…` ID is shown instead. Either choice is deterministic and reproducible from canon; this input does not affect which needs or requirements are selected.

The renderer reads **no other input**. In particular: the view document itself contributes only scope / ordering / labelling configuration — it never supplies a body sentence, a section heading beyond a `NEED`'s own `name`, or a value not traceable to an admitted element field.

**Normative constraint — no standard identifiers.** A conformant renderer MUST NOT emit a standard identifier (a named specification number or numbering convention) anywhere in the rendered output of this layout — not as a section label, not as a default value, not as a value substituted for an unset field. `view.standard` (§4) is reserved and inert: no current or future revision of this layout may read it to select or emit such an identifier without a new, explicitly reviewed spec revision that lifts this constraint. This is checked at spec-authoring time by the `DOC1` doc-lint rule in [check-notations.mjs](../../../scripts/check-notations.mjs), which fails the build if this file (or any sibling document-view spec) ever documents one as a supported or default field value.

### 5.2 Derivation

1. **Resolve the need scope** from `view.scope.needs.include` or `view.scope.needs.filter.stakeholder` against the `NEED` catalogue; omitting both selects every admitted `NEED`. Sort the result per `view.grouping.order_needs_by`.
2. **For each in-scope need**, resolve its requirement set: every admitted `REQUIREMENT` whose `serves` field equals the need's `id`, further narrowed by `view.scope.requirements.include` and/or `view.scope.requirements.filter.origin` (same include-wins-over-filter rule as step 1). Sort the result per `view.grouping.order_requirements_by`.
3. **Render one section per in-scope need**, in the step-1 order: the need's `name` as the section heading, its `description` (if present) as the section's sole introductory text, followed by one entry per requirement from step 2 (its `id`, `name`, `description`, and any of `origin` / `severity` / `level` / `kind` it carries).
4. **Unserved needs.** A need whose step-2 requirement set is empty renders as a section carrying `view.empty_section_label` (§5.3) when `view.include_unserved_needs` is `true` (the default); otherwise the need is omitted from the document entirely.
5. **Requirements with no `serves` value, or whose `serves` value names a need outside scope, are never rendered** — they simply do not appear anywhere in an MRD document. This is expected layout behaviour, not an error condition; a `REQUIREMENT` with no need to trace to is out of scope for a need-oriented document by construction.

### 5.3 Determinism

Two renders of the same view-config against the same canon state produce **byte-identical** output: the selection in step 1, the per-section selection in step 2, and both sort orders in step 3 are fully specified by this contract and the config's own fields; the renderer introduces no timestamp, environment value, or non-canonical data into the body. `generated_at` (§1.1) is document metadata, not a rendered body field, and does not affect section content.

---

## 6. Relationship to other notations and elements

```
MRD view (this notation — document-config)
  ├── reads   → NEED elements                  (ELEMENT_PRIMITIVES.md §7.28; admitted only)
  │     └── stakeholder → STAKEHOLDER            (optional display-name resolution, §5.1)
  ├── reads   → REQUIREMENT elements            (15-requirement.md; admitted only)
  │     └── serves      → NEED                   (the grouping key, §5.2)
  └── carries no canonical content of its own    (ELEMENT_PRIMITIVES.md §1.1)
```

Pairs with the `NEED`-side reverse-trace completeness rules (`NEED-COVERAGE-001` and the `NEED-VALIDATION-COVERAGE-…` family, [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §9) — a `NEED` with no serving `REQUIREMENT` is exactly the case `view.include_unserved_needs` / `view.empty_section_label` surface to a reader, the document-view analogue of the Compliance Impact view's modelling-gap distinction ([21-compliance-impact.md](../reports/21-compliance-impact.md) §5.3).

Pairs with **Transitrix Studio's document-view engine** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `MRD-001` | error | A required field from §4 is missing (`view.id`, `view.name`), or `id` does not match the canonical grammar `MRD-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1). |
| `MRD-002` | error | A value in `view.scope.needs.include`, `view.scope.needs.filter.stakeholder`, or `view.scope.requirements.include` does not resolve to an admitted canonical element of the expected TYPE (`NEED`, `STAKEHOLDER`, `REQUIREMENT` respectively). |
| `MRD-003` | error | `view.scope.requirements.filter.origin` contains a value outside the closed vocabulary `legislative \| process-product \| project-product` ([15-requirement.md](../../elements/15-requirement.md) §2.1). |
| `MRD-004` | warning | Both `include` and `filter` are present within the same scope block (`view.scope.needs` or `view.scope.requirements`) — `include` wins, `filter` is silently ignored. |
| `MRD-005` | warning | The view selects zero needs after applying `view.scope.needs`, or every selected need resolves to zero requirements and `view.include_unserved_needs` is `false` — the rendered document will be empty. Usually indicates an over-narrow filter. |
| `MRD-006` | error | A shipped document-view layout under [`views/documents/`](.) documents, defaults to, or would render a standard identifier as a value of `view.standard` or any other field, violating the §5.1 normative constraint. Guarded at spec-authoring time by the `DOC1` doc-lint rule ([check-notations.mjs](../../../scripts/check-notations.mjs)); at render time no conformant renderer may emit one regardless of what `view.standard` is set to. |

The shared header rules `HDR-001..004` ([CONTRACT.md](../../CONTRACT.md) §2) apply in addition.

---

## 8. References

- `NEED` element schema (the stakeholder/user need): [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.28.
- `REQUIREMENT` element schema and the `serves` back-reference: [15-requirement.md](../../elements/15-requirement.md) §2.7.
- `STAKEHOLDER` element schema (optional display-name resolution): [20-stakeholders.md](../../elements/20-stakeholders.md).
- `VALIDATION` — the claim type checking whether a need was actually met (not rendered by this layout): [28-validation.md](../../elements/28-validation.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) (`MRD` registered in §3.2).
- Reconstruction invariant (why view documents are not content homes): [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1.1.
- Sibling report-config views this document-config mirrors in shape: [21-compliance-impact.md](../reports/21-compliance-impact.md), [23-actions-tree.md](../reports/23-actions-tree.md).
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
