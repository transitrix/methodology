---
notation: "Compliance Impact"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-06-06"
status: "draft"
file_extension: "*.compliance-impact.transitrix.yaml"
dsm_status: "not implemented — Studio compliance-views renderer planned (consumer-side, tracked separately)"
---

# Compliance Impact — Report-Configuration View — Reference

**Version:** 0.1
**Date:** 2026-06-06
**Status:** Draft — first cut of the canonical report-config for the compliance / regulatory-impact overlay; supersedes the bespoke per-build renderer the regulatory-intelligence demo shipped (`tools/render_impact.py`).
**File extension:** `*.compliance-impact.transitrix.yaml`
**Scope:** A **rendering / grouping / filtering configuration** for the compliance-impact derived view — the matrix of which obligations hit which `PRODUCT` / process stage / process task, with each cell's compliance status. The document is a presentation surface — it carries no canonical content of its own. Everything the view displays is **derived** from `ASSERTION` ([16-assertion.md](../../elements/16-assertion.md)), the process-blueprint ([13-process-blueprint.md](../diagrams/13-process-blueprint.md)), and the `REQUIREMENT` it points at ([15-requirement.md](../../elements/15-requirement.md)).
**Renderer:** Transitrix Studio — compliance views (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `compliance-impact` |
| File extension | `*.compliance-impact.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `compliance-impact` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `view` | yes | object | the compliance-impact view config — see §3 and §4 |

Example header:

```yaml
notation: compliance-impact
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "3.6.0"
view:
  # ... see §3
```

---

## 1. What this view is

A compliance-impact view answers one question: **for a given set of subjects — a product and the processes that deliver it, or the processes and infrastructure that own a system/data obligation directly — which regulatory obligations bear on each cell, and what is the current compliance status of each (subject, obligation) pair?**

The view handles both **product-compliance** scenarios (a law obliges a PRODUCT, and the matrix columns walk the product's processes) and **system/data/infrastructure-compliance** scenarios (a data-retention or data-residency rule obliges a PROCESS directly, per [elements/16-assertion.md §2.3](../../elements/16-assertion.md)). The column orientation is chosen per §4 `view.grouping.columns`.

The renderer materialises that matrix from canon. Nothing is stored twice:

- The fact that *a subject is obliged by a requirement* is recorded once — on an `ASSERTION` (its `subject` + `about`).
- The fact that *the obligation lands on a specific stage or task* of the subject is recorded once — on the same `ASSERTION` (its `realised_via`, naming a process-flow `STEP` or a process-blueprint stage; see [16-assertion.md](../../elements/16-assertion.md) §2.1, the decided stage/task-level idiom).
- The fact that *the subject is composed of stages and tasks at all* is recorded once — on the process-blueprint and on the `PROCESS` element's flow.
- The compliance status of each pair is recorded once — on the `ASSERTION.status` field.

A compliance-impact document declares **which slice of that matrix to render** (which products, which obligations) and **how** (grouping, ordering, what to label empty cells). It does not redeclare any of the four facts above.

This mirrors how the Scenarios view ([11-scenarios.md](./11-scenarios.md)) is a report-config over the `SCENARIO` catalogue. Both views obey the reconstruction invariant ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1): the canon is reconstructible from the elements alone; the view document adds no fact.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Render the compliance overlay for one product family — which obligations hit which stages / tasks of the processes that deliver it. | Compliance Impact view |
| A regulator-facing or audit-facing report that lists every active obligation against the process(es) that realise it. | Compliance Impact view |
| Compare the impact footprint of two regulatory regimes side-by-side over the same product. | Compliance Impact view |
| Drive harvesting prioritisation — visualise where the model is dark for a given regime. | Compliance Impact view (in conjunction with the coverage metric, see §6) |
| Render data-retention, data-residency, or cybersecurity obligations where the compliance unit is a data-management or infrastructure process (no product subject). | Compliance Impact view — with `subjects.processes` and `process-*` columns (§4) |
| Surface obligations by regulatory domain (data-protection, cybersecurity, data-residency) across all bearing processes. | Compliance Impact view — filtered by `obligations.filter.derived_from_codex` to the relevant regime |

For the canonical authoring of an obligation, the claim that a subject realises it, or the process flow that bears it, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The obligation itself (what the rule requires). | `REQUIREMENT` element ([15-requirement.md](../../elements/15-requirement.md)) at `canon/elements/01_motivation/requirements/REQUIREMENT-<…>.yaml`. |
| The claim that a subject satisfies (or partially / does not satisfy) a requirement. | `ASSERTION` element ([16-assertion.md](../../elements/16-assertion.md) §1) at `canon/assertions/ASSERTION-<…>.yaml`. |
| The specific flow step that bears the obligation. | `ASSERTION.realised_via: [STEP-…]` ([16-assertion.md](../../elements/16-assertion.md) §2.1, the stage/task-level idiom). The named step is promoted to a standalone `STEP` element under the canonical-by-containment + promotion rule. |
| The process whose stages / tasks the view displays. | `PROCESS` element flow ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.5) and/or process-blueprint ([13-process-blueprint.md](../diagrams/13-process-blueprint.md)). |
| The status of a (subject, obligation) pair. | `ASSERTION.status` ([16-assertion.md](../../elements/16-assertion.md) §3). |

---

## 3. Document structure

A compliance-impact view file is a short, declarative report config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: compliance-impact
spec_version: "0.1"
name: "Retail product — GDPR obligations"   # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                  # optional per CONTRACT.md §4
methodology_version: "3.6.0"

view:
  id: COMPLIANCE_IMPACT-RETAIL-GDPR-1
  name: "Retail product — GDPR obligations"
  description: "Compliance overlay for the retail product family against the GDPR slice of canon."
  report_type: product          # product | process | combined — required; enforces subject/column consistency

  # What the view displays. Must match report_type:
  #   product  → subjects.products only (subjects.processes MUST be absent)
  #   process  → subjects.processes only (subjects.products MUST be absent)
  #   combined → both may be present; renderers MUST badge each column with PRODUCT or PROCESS
  subjects:
    products: [PRODUCT-RETAIL-1]
    # processes: [PROCESS-USER-DATA-PURGE-1]   # use with report_type: process or combined

  # Which obligations are in scope. Either an explicit include list, or a filter that
  # selects REQUIREMENTs by codex source / jurisdiction / regime. If both are present,
  # `include` wins and `filter` is ignored.
  obligations:
    filter:
      derived_from_codex: [REGULATION-EU-GDPR-1]
    # include: [REQUIREMENT-DATA-ERASURE-1, REQUIREMENT-DATA-PORTABILITY-1]

  # Grouping (the axes of the matrix). Default: product × stage × task.
  grouping:
    rows: "obligation"           # obligation | stage | task
    columns: "product-stage-task"  # product-*: product-stage-task | product-stage | product
                                   # process-*: process-stage-task | process-stage | process

  # Status display.
  status_display:
    show: ["compliant", "partial", "non_compliant", "under_review", "n_a"]
    treat_proposed_as: "hidden"  # hidden | shown-distinct (default: hidden, per ASSERTION §2.2)
    treat_ai_reviewed_as: "shown-distinct"  # shown-distinct | shown-same | hidden (default: shown-distinct, per CONTRACT §6.2)

  # Empty-cell labels — see §5 for the canonical strings.
  empty_cells:
    no_obligation_label: "No mapped obligation (current model)"

  # Optional ordering knobs.
  order_rows_by: "id"            # id | name | regime | jurisdiction
  order_columns_by: "process-order"  # process-order | id | name
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../../CONTRACT.md) §10), a `view` object, and presentation fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`COMPLIANCE_IMPACT-…`) per [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2 (`COMPLIANCE_IMPACT` view-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this view (which obligations and subjects, why). |
| `view.report_type` | yes | string | — (required) | Declares the subject scope of the report. `product` — the matrix covers products only; `subjects.processes` MUST be absent; `grouping.columns` MUST be a `product-*` value. `process` — the matrix covers processes directly; `subjects.products` MUST be absent; `grouping.columns` MUST be a `process-*` value. `combined` — both subject types allowed; renderers MUST attach explicit PRODUCT/PROCESS badges per §5.2 and §7.1. Makes scope visible in the config file, preventing accidental cross-type bleed at the source rather than at render time. |
| `view.subjects.products` | no ¹ | list | **all `PRODUCT`s in canon**, sorted by id | Explicit list of `PRODUCT-…` IDs whose realising processes the view covers. The renderer derives the set of bearing processes via canon (the `realises` relations from `PROCESS` to `PRODUCT`) and walks each process's flow for stages and tasks. Column headers for product-derived columns MUST carry the PRODUCT identifier or name, not a process label. |
| `view.subjects.processes` | no ¹ | list | processes derived from `products` | Explicit list of `PROCESS-…` IDs to display, in addition to (or instead of) the processes derived from `products`. When this field is the **sole** subject entry point (no `subjects.products`), every column header MUST carry a PROCESS identifier or name — the renderer MUST NOT label process columns as products. A view with only `subjects.processes` and `product-*` columns triggers `COMPIMP-009`. |
| `view.obligations.include` | no ² | list | unset (use `filter`, or the full set) | Explicit list of `REQUIREMENT-…` IDs to render, in row-order. |
| `view.obligations.filter` | no ² | object | **no filter — every `REQUIREMENT` bearing on the subjects** | Declarative filter — `derived_from_codex: [LAW-… \| REGULATION-… \| POLICY-… \| INTERNAL_STANDARD-…]`, `jurisdiction: …`, `regime: …`. The renderer resolves the filter against the `REQUIREMENT` catalogue at render time, following each requirement's `derived_from` to its codex source. |
| `view.grouping.rows` | no | string | `obligation` | Row dimension: `obligation` (one row per `REQUIREMENT`), `stage` (one row per process stage), `task` (one row per task / flow step). |
| `view.grouping.columns` | no | string | `product-stage-task` | Column dimension. **Product-centric** (default): `product-stage-task` (finest grain), `product-stage`, `product`. **Process-centric** (use when `subjects.processes` is the entry point for system/data/infrastructure obligations): `process-stage-task`, `process-stage`, `process`. Use `process-*` to render obligations whose compliance unit is a PROCESS directly rather than a PRODUCT (see [elements/16-assertion.md §2.3](../../elements/16-assertion.md)); mixing `subjects.processes`-only with `product-*` columns triggers `COMPIMP-009`. |
| `view.status_display.show` | no | list | all five (`compliant`, `partial`, `non_compliant`, `under_review`, `n_a`) | Which `ASSERTION.status` values to render. |
| `view.status_display.treat_proposed_as` | no | string | `hidden` | How to handle `ASSERTION`s in `proposed` admission state ([16-assertion.md](../../elements/16-assertion.md) §2.2): `hidden` (the proposed assertion contributes nothing to the cell) or `shown-distinct` (rendered with a distinct marker so a reviewer can see the harvester's draft alongside admitted canon). The default matches the §2.2 rule that proposed assertions are excluded from every derived view until a human admits them. |
| `view.status_display.treat_ai_reviewed_as` | no | string | `shown-distinct` | How to handle admitted `ASSERTION`s carrying `reviewer_authority: ai_reviewed` ([CONTRACT.md](../../CONTRACT.md) §6.2): `shown-distinct` (rendered with a distinct marker so the AI-reviewed tier is visible alongside expert-confirmed canon), `shown-same` (treated identically to `expert_confirmed`), or `hidden` (the AI-reviewed assertion contributes nothing to the cell). Both tiers are admitted canon, so the default surfaces the AI-reviewed tier distinctly rather than hiding it. A cell whose impact rests on an `ai_reviewed` assertion (or a dependency chain containing one) renders at the **weakest-link** authority (§6.2). |
| `view.empty_cells.no_obligation_label` | no | string | `"No mapped obligation (current model)"` (§5) | Label for cells where no admitted ASSERTION binds the (obligation, subject-cell) pair. |
| `view.order_rows_by` | no | string | `id` | Row ordering key: `id`, `name`, `regime`, `jurisdiction`. |
| `view.order_columns_by` | no | string | `process-order` | Column ordering key: `process-order` (each process's stages and tasks in flow order, then the next process), `id`, `name`. |

¹ **`subjects`** — behaviour depends on `view.report_type`. `product`: `subjects.products` is optional (omit → all PRODUCTs in canon); `subjects.processes` MUST be absent. `process`: `subjects.processes` is required; `subjects.products` MUST be absent. `combined`: both keys are present (omitting `subjects.products` falls back to all PRODUCTs). The zero-config default (omitting all of `subjects`) is only valid for `report_type: product` and renders the full product matrix. (This matches the shipped renderer, which auto-fills the product set from canon when `subjects.products` is empty.)

² **`obligations`** — both keys are optional and only ever *narrow* the row set. Omitting them renders every `REQUIREMENT` bearing on the named subjects (the full matrix). If both `include` and `filter` are present, `include` wins and `filter` is ignored.

All references in `view.subjects.*`, `view.obligations.include`, and `view.obligations.filter.derived_from_codex` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: compliance-impact
spec_version: "0.1"
name: "Full compliance matrix"          # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4
methodology_version: "3.6.0"
view:
  id: COMPLIANCE_IMPACT-ALL-1
  name: "Full compliance matrix"
  report_type: product                  # required; product | process | combined
```

— renders **deterministically**: the full obligation × subject matrix over every `PRODUCT` in canon and every `REQUIREMENT` that bears on them, grouped `obligation` × `product-stage-task`, all five statuses shown, proposed assertions hidden, rows ordered by `id`, columns in `process-order`. This is the fallback the report skill (per the *reports rendered from declarative view-configs* architecture decision, §4) states back to the user as "full matrix, no filters". Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the view from canon. The contract names its inputs, its derivation steps, and the canonical empty-cell labels.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs:

1. **`ASSERTION` catalogue** — every `ASSERTION-…` file under `canon/assertions/` in **admitted** state (`admission_state: active`; proposed assertions are excluded unless `view.status_display.treat_proposed_as: shown-distinct`). Each contributes its `about` (the obligation), `subject` (the bearing element), `realised_via[]` (which MAY name a `STEP-…` or process-blueprint stage to localise the impact), and `status`.
2. **Process flows** — the `flow.steps[]` of each `PROCESS-…` element named directly in `view.subjects.processes` or derived from `view.subjects.products`. Each step carries an addressable canonical ID under the canonical-by-containment + promotion rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.3; promotion mechanic [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.20).
3. **Process-blueprint stages** — when a process-blueprint document covers the same processes, its `stages[]` are the canonical stage grain for `view.grouping.columns: product-stage` or `process-stage`. The blueprint is read as supplementary structure; nothing in the view derivation requires it (a renderer without a blueprint falls back to grouping by flow step).
4. **`REQUIREMENT` status** — the `status:` field of each `REQUIREMENT` named in (or selected by) `view.obligations`. The view does not display this field directly; it is used by the renderer to surface obligations whose own status (e.g. `proposed`, `superseded`) modifies how a cell should be displayed (e.g. a row backed by a superseded obligation MAY be rendered with a strikethrough — but the data fact is the obligation's own status, not anything the view document carries).

The renderer reads **no other input**. In particular: the view document itself contributes only filter / grouping / labelling configuration — never a cell value.

### 5.2 Derivation

For each (row, column) cell in the materialised matrix:

1. **Resolve the row's obligation set** from `view.obligations.include` or `view.obligations.filter` against the `REQUIREMENT` catalogue.
2. **Resolve the column's subject-cell set** from `view.subjects.*` and `view.grouping.columns`:
   - **Product-centric** (default — derives the process set from `subjects.products`):
     - `product-stage-task` — the cell key is `(PRODUCT, STAGE, TASK)`; STAGE is a process-blueprint stage or (if absent) a coarse-grain flow grouping, TASK is a flow step.
     - `product-stage` — the cell key is `(PRODUCT, STAGE)`.
     - `product` — the cell key is `(PRODUCT,)`.
   - **Process-centric** (use with `subjects.processes` for system/data/infrastructure obligations, per [elements/16-assertion.md §2.3](../../elements/16-assertion.md)):
     - `process-stage-task` — the cell key is `(PROCESS, STAGE, TASK)`; walks `subjects.processes` directly without deriving from products; STAGE and TASK resolved identically to `product-stage-task`.
     - `process-stage` — the cell key is `(PROCESS, STAGE)`.
     - `process` — the cell key is `(PROCESS,)`.

   **Subject type label invariant.** A conformant renderer MUST preserve the subject type (PRODUCT vs PROCESS) in every column header. Specifically:
   - A column derived from `subjects.products` MUST be headed by the PRODUCT name or ID.
   - A column derived from `subjects.processes` (whether standalone or in addition to products) MUST be headed by the PROCESS name or ID with an explicit PROCESS designation — never by a PRODUCT name or ID.
   - When both `subjects.products` and `subjects.processes` are present (combined view), each column header MUST carry a distinct PRODUCT or PROCESS badge so the reader can distinguish the two subject types at a glance.

   This invariant exists because a config with only `subjects.processes` can produce a visually identical column layout to a product-centric view if labels are not type-explicit, causing users to misread the scope of the compliance report (violation logged as `COMPIMP-010`).

3. **Find the matching `ASSERTION`(s)** — every admitted `ASSERTION` whose `(about, subject)` matches the row's obligation and the column's subject (with the column's subject possibly being a `PRODUCT-…` whose bearing process is the assertion's `subject`), and — when the column is finer-grain than the assertion's `subject` — whose `realised_via[]` contains a step or stage that intersects the cell's `(STAGE, TASK)` tuple.
4. **Cell value** — the resulting status, picked deterministically when multiple assertions bind one cell:
   - If any matching assertion has `status: non_compliant`, the cell renders `non_compliant`.
   - Else if any has `status: partial`, the cell renders `partial`.
   - Else if any has `status: under_review`, the cell renders `under_review`.
   - Else if all matching assertions have `status: n_a`, the cell renders `n_a`.
   - Else the cell renders `compliant`.
5. **Empty cells** are labelled per §5.3.

The aggregation order in step 4 is fixed so two renderers given the same canon produce identical output.

### 5.3 Empty-cell labels

Two distinct empty-cell conditions exist; the view MUST distinguish them in the rendered output. Adopters changing the label strings (via `view.empty_cells.no_obligation_label`) MUST preserve the distinction.

| Condition | Canonical label | Meaning |
|---|---|---|
| No admitted `ASSERTION` binds the cell. | **"No mapped obligation (current model)"** (default) | The model has not yet recorded an obligation for this cell. This is a **modelling gap**, not a regulatory fact — the regime that would impose an obligation here may not yet be harvested; the obligation may exist in canon but not yet have an `ASSERTION` against this subject. |
| The obligation explicitly does not apply (an admitted `ASSERTION` exists with `status: n_a`). | **"No obligation applies"** | A reviewer has determined this obligation is jurisdictionally / categorically excluded for the subject. This is a **modelled fact**. |

The label "**No mapped obligation (current model)**" codifies the modelling-gap vs modelled-fact distinction. The forthcoming Coverage metric view (sibling notation, separately tracked) is the per-jurisdiction / per-regime read of the same empty-cell set. The canonical wording is deliberately not "No direct obligation" — that string was the legacy label in the reg-intel demo's `tools/render_impact.py` and conflated the two conditions.

A conformant renderer MUST NOT collapse the two conditions into a single visual treatment. The visual encoding (colour, hatching, text) is left to the renderer; the data-level distinction is not.

---

## 6. Relationship to other notations and elements

```
Compliance Impact view (this notation — report-config)
  ├── reads   → ASSERTION elements             (16-assertion.md §1; admitted state only by default)
  │     ├── about       → REQUIREMENT
  │     ├── subject     → PRODUCT / PROCESS / CAPABILITY
  │     ├── realised_via → STEP / stage / CAPABILITY / …
  │     └── status      → compliant | partial | non_compliant | under_review | n_a
  ├── reads   → PROCESS.flow.steps[]            (ELEMENT_PRIMITIVES.md §7.5 / §7.20 — the task grain)
  ├── reads   → process-blueprint stages[]      (13-process-blueprint.md — the stage grain, when present)
  └── reads   → REQUIREMENT status              (15-requirement.md — for row-level decoration)
```

Pairs with the forthcoming **Coverage metric** view (sibling report-config notation, separately tracked) — a second read of the same impact mapping that counts the "No mapped obligation (current model)" cells per jurisdiction / regime.

Pairs with **Transitrix Studio compliance views / export** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `COMPIMP-001` | error | A required field from §4 is missing, or `id` does not match the canonical grammar `COMPLIANCE_IMPACT-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1). |
| `COMPIMP-002` | error | `view.subjects` is empty (neither `products` nor `processes` present). |
| `COMPIMP-003` | error | A reference in `view.subjects.products` / `view.subjects.processes` / `view.obligations.include` / `view.obligations.filter.derived_from_codex` does not resolve to an admitted canonical element of the expected TYPE. |
| `COMPIMP-004` | error | `view.grouping.rows` is set to a value outside `{obligation, stage, task}`, or `view.grouping.columns` is set to a value outside `{product-stage-task, product-stage, product, process-stage-task, process-stage, process}`. |
| `COMPIMP-005` | error | `view.status_display.treat_proposed_as` is set to a value outside `{hidden, shown-distinct}`. |
| `COMPIMP-006` | error | `view.status_display.treat_ai_reviewed_as` is set to a value outside `{shown-distinct, shown-same, hidden}` (CONTRACT §6.2). |
| `COMPIMP-010` | warning | `view.empty_cells.no_obligation_label` overrides the default but is one of the legacy strings the §5.3 distinction was introduced to retire (e.g. "No direct obligation", "Not applicable" used for the empty case). |
| `COMPIMP-007` | warning | Both `view.obligations.include` and `view.obligations.filter` are present (the include wins; the filter is silently ignored). |
| `COMPIMP-008` | warning | The view selects zero obligations after applying `include` / `filter` — the rendered matrix will have no rows. Usually indicates a typo in a codex reference. |
| `COMPIMP-009` | warning | `view.grouping.columns` is a `product-*` value (`product-stage-task`, `product-stage`, `product`) but `view.subjects.products` is absent and `view.subjects.processes` is the only entry point. The column labels reference "product" but no products are in scope; consider using `process-stage-task` / `process-stage` / `process` for a process-centric view. |
| `COMPIMP-010` | error | A renderer has applied a PRODUCT-typed column header to a column derived solely from `view.subjects.processes`, or applied a PROCESS-typed header to a column derived from `view.subjects.products`. Subject type (PRODUCT vs PROCESS) MUST be preserved end-to-end from the config fields through to every rendered column header, as required by the subject type label invariant (§5.2 step 2). |
| `COMPIMP-011` | error | `view.report_type` is absent. All compliance-impact view files MUST declare their scope type explicitly. |
| `COMPIMP-012` | error | `report_type: product` but `view.subjects.processes` is present; or `report_type: process` but `view.subjects.products` is present. Remove the cross-type subject entry, or change `report_type` to `combined`. |
| `COMPIMP-013` | error | `report_type: product` but `view.grouping.columns` uses a `process-*` value; or `report_type: process` but `view.grouping.columns` uses a `product-*` value. Column grouping MUST match the declared report type. |

The shared header rules `HDR-001..004` ([CONTRACT.md](../../CONTRACT.md) §2) apply in addition.

### 7.1 Report variants

Three canonical patterns follow from the `view.report_type` field (required, §4). Each also determines the allowed `view.subjects.*` and `view.grouping.columns` values:

| `report_type` | `subjects.*` | `grouping.columns` | Column header type |
|---|---|---|---|
| `product` | `subjects.products: [PRODUCT-…]` (processes MUST be absent) | `product-stage-task` / `product-stage` / `product` | PRODUCT name / ID |
| `process` | `subjects.processes: [PROCESS-…]` (products MUST be absent) | `process-stage-task` / `process-stage` / `process` | PROCESS name / ID |
| `combined` | both `subjects.products` and `subjects.processes` | `product-stage-task` + `process-stage-task` (two column groups) | PRODUCT badge for product columns; PROCESS badge for process columns |

Adopters choosing `combined` render two distinct column groups in one report. Renderers MUST use explicit subject-type badges (e.g. `[PRODUCT]` / `[PROCESS]` prefixes or distinct visual styling) so the reader can always identify which subject type a column represents. `COMPIMP-010` fires when a renderer omits these badges or misapplies them. `COMPIMP-011` fires when `report_type` is absent. `COMPIMP-012` fires when `subjects.*` contradicts the declared `report_type`. `COMPIMP-013` fires when `grouping.columns` contradicts the declared `report_type`.

---

## 8. References

- ASSERTION element schema (the canonical compliance claim): [16-assertion.md](../../elements/16-assertion.md).
- ASSERTION §2.1 — stage/task-level compliance impact idiom (`realised_via` naming a `STEP` or stage): [16-assertion.md](../../elements/16-assertion.md).
- ASSERTION §2.3 — system/data/infrastructure obligation subjects (PROCESS as compliance unit, APPLICATION in `realised_via`): [16-assertion.md](../../elements/16-assertion.md).
- REQUIREMENT element schema (the obligation): [15-requirement.md](../../elements/15-requirement.md).
- Process flow and the STEP grain: [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.5 (process flow), §7.20 (standalone STEP, promotion mechanic).
- Process-blueprint stages: [13-process-blueprint.md](../diagrams/13-process-blueprint.md).
- Scenarios — the sibling report-config view: [11-scenarios.md](./11-scenarios.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) (`COMPLIANCE_IMPACT` registered in §3.2).
- Reconstruction invariant (why view documents are not content homes): [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1.
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
- Architecture decision — reports are rendered from declarative view-configs, with a thin skill on top.
