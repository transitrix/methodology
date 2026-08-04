---
notation: "SRS"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-04"
status: "draft"
file_extension: "*.srs.transitrix.yaml"
dsm_status: "not implemented — Studio document-view engine planned (consumer-side, tracked separately)"
---

# SRS — Document-View — Reference

**Version:** 0.1
**Date:** 2026-08-04
**Status:** Draft — second concrete spec of the document-view class ([`views/documents/`](../documents/), per [`README.md`](../../README.md) §Views), following the layout pattern the MRD spec ([29-mrd.md](29-mrd.md)) established.
**File extension:** `*.srs.transitrix.yaml`
**Scope:** A **document-rendering configuration** for the software requirements specification (SRS) layout — the most granular tier of the requirements-specification ladder ([15-requirement.md](../../elements/15-requirement.md) §2.5). It groups admitted `REQUIREMENT` elements ([15-requirement.md](../../elements/15-requirement.md)) that carry the software tier into a document, sectioned by whether each obligation is a behaviour or a quality attribute. The document is a presentation surface — it carries no canonical content of its own. Everything it displays is **derived** from the `REQUIREMENT` catalogue.
**Renderer:** Transitrix Studio — document-view engine (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `srs` |
| File extension | `*.srs.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `srs` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `view` | yes | object | the SRS view config — see §3 and §4 |

Example header:

```yaml
notation: srs
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "3.1.0"
view:
  # ... see §3
```

---

## 1. What this view is

An SRS view answers one question: **for the software tier of the requirements-specification ladder, what functional behaviours and quality attributes has the organisation committed to?** It renders admitted `REQUIREMENT`s ([15-requirement.md](../../elements/15-requirement.md)) whose `level` field carries the software tier, sectioned by `kind` — one section for `functional` obligations, one for `quality` obligations, and (optionally) one for requirements that carry no `kind`.

The renderer materialises that document from canon. Nothing is stored twice:

- The fact that *a requirement belongs to the software specification tier* is recorded once — on `REQUIREMENT.level` ([15-requirement.md](../../elements/15-requirement.md) §2.5).
- The fact that *an obligation is a behaviour rather than a quality attribute* is recorded once — on `REQUIREMENT.kind` ([15-requirement.md](../../elements/15-requirement.md) §2.6).

An SRS document declares **which slice of the `REQUIREMENT` catalogue to render** (which tier, which explicit set) and **how** (ordering, whether an empty section still renders). It does not redeclare either fact above, and it does not add narrative prose of its own — every word a reader sees traces to a `name` / `description` field on an admitted `REQUIREMENT`.

This mirrors how the MRD view ([29-mrd.md](29-mrd.md)) is a document-config over the `NEED` / `REQUIREMENT` pair — SRS is the document-class counterpart over `REQUIREMENT` alone, sectioned by its own `kind` field rather than by a separate catalogue. Both views obey the reconstruction invariant ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1): the canon is reconstructible from the elements alone; the view document adds no fact.

**Not a template.** An SRS view config has no field for hand-authored document prose — no executive summary, no free-text section body, nothing typed directly into the view that isn't already a projection of a `REQUIREMENT` field. A field that exists only to carry prose into the rendered document belongs on the `REQUIREMENT` element itself (its `description`), not on the view.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Publish a software requirements specification listing the functional behaviours and quality attributes a software component must satisfy. | SRS view |
| Produce a narrower SRS scoped to an explicit set of requirements. | SRS view — with `scope.requirements.include` (§4) |
| Audit whether the software-tier requirement set is empty for a given slice of canon. | SRS view — `SRS-005` warns when the view selects zero requirements (§7) |

For the canonical authoring of a requirement or its specification tier, use the element primitive, not this view:

| Concern | Authored as |
|---|---|
| The obligation itself, and the tier it belongs to. | `REQUIREMENT.level: software` ([15-requirement.md](../../elements/15-requirement.md) §2.5). |
| Whether the obligation is a behaviour or a quality attribute. | `REQUIREMENT.kind: functional \| quality` ([15-requirement.md](../../elements/15-requirement.md) §2.6). |
| The stakeholder- or system-tier ancestor a software requirement decomposes from. | `REQUIREMENT.parent` ([15-requirement.md](../../elements/15-requirement.md) §2.4) — out of scope for this view; a future document-view layout may render the decomposition chain. |
| Software design over application/technology elements and the requirement trace. | SDD document view (planned, [views/documents/](.)) — out of scope for this view. |

---

## 3. Document structure

An SRS view file is a short, declarative document config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: srs
spec_version: "0.1"
name: "Backup-power controller — SRS"          # required per CONTRACT.md §1.1
generated_at: "2026-08-04"                     # optional per CONTRACT.md §4
methodology_version: "3.1.0"

view:
  id: SRS-BACKUP-POWER-1
  name: "Backup-power controller — SRS"
  description: "Software-tier functional and quality requirements for the backup-power controller."

  # Reserved — see §4. Not read by the render contract in this version of the spec.
  standard: null

  # What the document covers. Every key here filters/scopes/orders; none carries prose.
  scope:
    requirements:
      # include: [REQUIREMENT-BACKUP-POWER-1]
      filter:
        level: [software]

  # Whether a kind section with zero matching requirements still gets a section.
  include_unclassified_kind: true
  include_empty_sections: true
  empty_section_label: "No admitted software-tier requirement of this kind (current model)"

  # Ordering knob for requirements within each section.
  grouping:
    order_requirements_by: "id"    # id | name | severity
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../../CONTRACT.md) §10), a `view` object, and scoping/ordering fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`SRS-…`) per [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2 (`SRS` view-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this document config. Config-level metadata only — surfaced by tooling that lists saved view-configs ([REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) §4); it is **not** rendered into the document body, and carries no obligation on the renderer to display it anywhere in the output. |
| `view.standard` | no | string | unset | Reserved for a future document-structure profile selector. **Inert in this version of the spec — not read by the render contract (§5).** Setting it has no effect on the rendered output. No document-view layout under [`views/documents/`](.) may document, default to, or emit a standard identifier (a named specification number or numbering convention) as a value of this or any other field; see §5 for the corresponding render-contract MUST and [check-notations.mjs](../../../scripts/check-notations.mjs) `DOC1` for the doc-lint guard. |
| `view.scope.requirements.include` | no ¹ | list | unset (use `filter`, or every admitted `REQUIREMENT` at the software tier) | Explicit list of `REQUIREMENT-…` IDs to render, in the order given (subject to `grouping.order_requirements_by`). A listed requirement renders only if it also matches `view.scope.requirements.filter.level` (§5.2) — this field narrows, it does not add requirements outside the tier the layout is built on. |
| `view.scope.requirements.filter.level` | no ¹ | list | `[software]` | List of `level` values from the closed vocabulary `stakeholder \| system \| software` ([15-requirement.md](../../elements/15-requirement.md) §2.5). Narrows the requirement population to the listed tier(s). A `REQUIREMENT` with no `level` set does not match any value in this list and is never selected — same non-error posture as an unset `serves` in the MRD layout ([29-mrd.md](29-mrd.md) §5.2). |
| `view.include_unclassified_kind` | no | boolean | `true` | Whether an in-scope `REQUIREMENT` carrying no `kind` still renders, grouped into a third "unclassified" section. `false` omits it from the document entirely. |
| `view.include_empty_sections` | no | boolean | `true` | Whether the `functional` / `quality` / (if enabled) unclassified section still renders, carrying `empty_section_label`, when it has zero matching requirements. `false` omits an empty section from the document entirely. |
| `view.empty_section_label` | no | string | `"No admitted software-tier requirement of this kind (current model)"` | Label rendered under a section that has no matching requirement (§5.3). |
| `view.grouping.order_requirements_by` | no | string | `id` | Within-section ordering key for requirements: `id`, `name`, `severity`. |

¹ **`scope.requirements`** — both keys are optional and only ever *narrow* the requirement set. Omitting both renders every admitted `REQUIREMENT` at the software tier. If both `include` and `filter` are present, `include` wins and `filter` is ignored.

All references in `view.scope.requirements.include` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: srs
spec_version: "0.1"
name: "Full SRS — all software-tier requirements"    # required per CONTRACT.md §1.1
generated_at: "2026-08-04"                           # optional per CONTRACT.md §4
methodology_version: "3.1.0"
view:
  id: SRS-ALL-1
  name: "Full SRS — all software-tier requirements"
```

— renders **deterministically**: the `functional` section, then the `quality` section, then an "unclassified" section, each listing every admitted `REQUIREMENT` whose `level` is `software` and matching that section's `kind` (ordered by `id`), any section with zero matches still rendered with the default empty-section label, `view.standard` unset and read by nothing. Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) — the natural home for a document-config too, not only report-configs (§1 there).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the document from canon. The contract names its inputs, its derivation steps, and a normative constraint on what the output may never contain.

### 5.1 Inputs

A conformant renderer reads exactly this canonical input:

1. **`REQUIREMENT` catalogue** — every `REQUIREMENT-…` file under `canon/elements/01_motivation/requirements/` in admitted state. Each contributes its `id`, `name`, `description`, `level`, `kind`, and (display-only, if present) `origin` and `severity`.

The renderer reads **no other input**. In particular: the view document itself contributes only scope / ordering / labelling configuration — it never supplies a body sentence, a section heading beyond the fixed `Functional` / `Quality` / `Unclassified` labels, or a value not traceable to an admitted element field.

**Normative constraint — no standard identifiers.** A conformant renderer MUST NOT emit a standard identifier (a named specification number or numbering convention) anywhere in the rendered output of this layout — not as a section label, not as a default value, not as a value substituted for an unset field. `view.standard` (§4) is reserved and inert: no current or future revision of this layout may read it to select or emit such an identifier without a new, explicitly reviewed spec revision that lifts this constraint. This is checked at spec-authoring time by the `DOC1` doc-lint rule in [check-notations.mjs](../../../scripts/check-notations.mjs), which fails the build if this file (or any sibling document-view spec) ever documents one as a supported or default field value.

### 5.2 Derivation

1. **Resolve the requirement scope** from `view.scope.requirements.include` or `view.scope.requirements.filter.level` against the `REQUIREMENT` catalogue; omitting both selects every admitted `REQUIREMENT` whose `level` is `software`. A candidate from `include` renders only if its `level` also matches `filter.level` (or the `[software]` default when `filter.level` is unset) — same include-narrows rule as the MRD layout ([29-mrd.md](29-mrd.md) §5.2).
2. **Partition the in-scope requirements into three buckets by `kind`:** `functional`, `quality`, and — when `view.include_unclassified_kind` is `true` (the default) — a third bucket for requirements carrying no `kind`. When `view.include_unclassified_kind` is `false`, a requirement with no `kind` is dropped from the document entirely.
3. **Sort each bucket** per `view.grouping.order_requirements_by`.
4. **Render one section per bucket**, in the fixed order `Functional`, `Quality`, `Unclassified` (the last only when enabled per step 2): the fixed section label, followed by one entry per requirement from step 3 (its `id`, `name`, `description`, and any of `level` / `origin` / `severity` it carries).
5. **Empty sections.** A bucket with zero requirements renders as a section carrying `view.empty_section_label` (§5.3) when `view.include_empty_sections` is `true` (the default); otherwise the section is omitted from the document entirely.

### 5.3 Determinism

Two renders of the same view-config against the same canon state produce **byte-identical** output: the selection in step 1, the partition in step 2, and the sort order in step 3 are fully specified by this contract and the config's own fields; the renderer introduces no timestamp, environment value, or non-canonical data into the body. `generated_at` (§1.1) is document metadata, not a rendered body field, and does not affect section content.

---

## 6. Relationship to other notations and elements

```
SRS view (this notation — document-config)
  └── reads   → REQUIREMENT elements            (15-requirement.md; admitted only)
        ├── level   → software-tier scope         (the selection filter, §5.2)
        └── kind     → functional | quality       (the sectioning key, §5.2)
```

Sibling of the MRD view ([29-mrd.md](29-mrd.md)) in the document-view class — both are config-over-catalogue, no canonical content of their own ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1). Distinct from the planned SDD document view (design views over application/technology elements plus the requirement trace, out of scope here).

Pairs with **Transitrix Studio's document-view engine** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `SRS-001` | error | A required field from §4 is missing (`view.id`, `view.name`), or `id` does not match the canonical grammar `SRS-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1). |
| `SRS-002` | error | A value in `view.scope.requirements.include` does not resolve to an admitted `REQUIREMENT`. |
| `SRS-003` | error | `view.scope.requirements.filter.level` contains a value outside the closed vocabulary `stakeholder \| system \| software` ([15-requirement.md](../../elements/15-requirement.md) §2.5). |
| `SRS-004` | warning | Both `include` and `filter` are present within `view.scope.requirements` — `include` wins, `filter` is silently ignored. |
| `SRS-005` | warning | The view selects zero requirements after applying `view.scope.requirements`, or every section resolves to zero requirements and `view.include_empty_sections` is `false` — the rendered document will be empty. Usually indicates an over-narrow filter, or a canon with no software-tier requirements yet. |
| `SRS-006` | error | A shipped document-view layout under [`views/documents/`](.) documents, defaults to, or would render a standard identifier as a value of `view.standard` or any other field, violating the §5.1 normative constraint. Guarded at spec-authoring time by the `DOC1` doc-lint rule ([check-notations.mjs](../../../scripts/check-notations.mjs)); at render time no conformant renderer may emit one regardless of what `view.standard` is set to. |

The shared header rules `HDR-001..004` ([CONTRACT.md](../../CONTRACT.md) §2) apply in addition.

---

## 8. References

- `REQUIREMENT` element schema, `level` (§2.5), and `kind` (§2.6): [15-requirement.md](../../elements/15-requirement.md).
- Reconstruction invariant (why view documents are not content homes): [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1.1.
- Sibling document-config view this layout mirrors in shape: [29-mrd.md](29-mrd.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) (`SRS` registered in §3.2).
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
