---
notation: "Coverage Metric"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-07"
status: "draft"
file_extension: "*.coverage-metric.transitrix.yaml"
dsm_status: "not implemented — Studio compliance-views renderer planned (consumer-side, tracked separately)"
---

# Coverage Metric — Report-Configuration View — Reference

**Version:** 0.1
**Date:** 2026-06-07
**Status:** Draft — first cut of the canonical report-config for the coverage-of-canon read of the compliance overlay. Sibling of the Compliance Impact view ([21-compliance-impact.md](21-compliance-impact.md)); shares its canonical inputs and adds a coverage-axis aggregation per **jurisdiction / regulatory regime**.
**File extension:** `*.coverage-metric.transitrix.yaml`
**Scope:** A **rendering / grouping / filtering configuration** for the coverage read of canon — the count of subjects (`PRODUCT` / `PROCESS` / process stage / process task) for which **zero admitted obligations** from a given regime have been recorded, broken down per jurisdiction and per regime. The document is a presentation surface — it carries no canonical content of its own. Everything the view displays is **derived** from `ASSERTION` ([16-assertion.md](../elements/16-assertion.md)), the process-blueprint ([13-process-blueprint.md](13-process-blueprint.md)), the `REQUIREMENT` it points at ([15-requirement.md](../elements/15-requirement.md)), and the codex source the requirement is `derived_from` ([14-codex.md](../elements/14-codex.md)).
**Renderer:** Transitrix Studio — compliance views (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `coverage-metric` |
| File extension | `*.coverage-metric.transitrix.yaml` |

---

## 1. What this view is

A coverage-metric view answers one question: **for a given set of subjects, which of them have zero admitted obligations from each (jurisdiction, regime) the organisation has named — and is the absence a modelled fact or a modelling gap?**

The view's purpose is to make **coverage** — the completeness of the model's regulatory read — a first-class output instead of a silent visual blank. A subject with no admitted obligation against it under a regime is one of two things:

- the regime applies but the model hasn't asserted it yet — a **modelling gap** that needs harvesting; or
- the regime has been considered and excluded — a **modelled fact** (an admitted `ASSERTION` with `status: n_a`).

A flat impact view conflates the two. A coverage-metric view does not: every zero-cell is classified, and the per-regime breakdown surfaces dark stretches that a single-axis impact view would hide. (When only one regime has been harvested, the stages governed by another regime sit empty on the impact matrix — *blank because no one looked*, not blank because nothing applies. The Coverage Metric view names that condition.)

This mirrors how the Compliance Impact view ([21-compliance-impact.md](21-compliance-impact.md)) is a report-config over the same canonical inputs — `ASSERTION` × subject — but rendered as the obligation × subject matrix. Both views obey the reconstruction invariant ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1): the canon is reconstructible from the elements alone; the view document adds no fact.

The mechanism is regime- and industry-agnostic. No jurisdiction, regime, or sector is baked into this notation.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Identify which products / processes / stages / tasks are dark for each regulatory regime the organisation has named. | Coverage Metric view |
| Prioritise the regulatory-intelligence collector — which regimes need to be harvested next, by counting the modelling gaps they would close. | Coverage Metric view |
| Track coverage progress over time — the count of modelling gaps trending towards zero as the model matures. | Coverage Metric view |
| Compare two slices of canon side-by-side (e.g. coverage of `PROCESS-A` vs `PROCESS-B` against the same regimes) to surface uneven harvesting. | Coverage Metric view |
| Render the actual obligation × subject overlay, including statuses. | **Compliance Impact view** ([21-compliance-impact.md](21-compliance-impact.md)). The Coverage Metric view is the *second read* of the same data, not a replacement. |

For the canonical authoring of the inputs the view reads, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The codex artefact that defines a regime (a law, a regulation, an internal standard). | `LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD` element ([14-codex.md](../elements/14-codex.md)) under `codex/external/<jurisdiction>/` or `codex/internal/`. |
| The obligation extracted from a regime. | `REQUIREMENT` element ([15-requirement.md](../elements/15-requirement.md)), with `derived_from: [REGULATION-… \| LAW-… \| POLICY-… \| INTERNAL_STANDARD-…]`. |
| The claim that a subject is bound by an obligation. | `ASSERTION` element ([16-assertion.md](../elements/16-assertion.md)). |
| The modelled fact that an obligation explicitly does not apply to a subject. | `ASSERTION.status: n_a` ([16-assertion.md](../elements/16-assertion.md) §3). |

---

## 3. Document structure

A coverage-metric view file is a short, declarative report config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: coverage-metric
spec_version: "0.1"
methodology_version: "0.5.0"

view:
  id: COVERAGE_METRIC-RETAIL-1
  name: "Retail product — regime coverage"
  description: "Per-regime coverage of the retail product family across the regimes the organisation has named in scope."

  # What the view counts over. At least one of `subjects.products` / `subjects.processes`
  # MUST be present (the renderer derives the stage / task grain from the named subjects).
  subjects:
    products: [PRODUCT-RETAIL-1]
    # processes: [PROCESS-USER-DATA-PURGE-1]   # optional; in addition to or instead of products

  # Which regimes the coverage axis enumerates. Either an explicit include list of codex
  # artefacts (each is one regime column), or a filter that selects codex artefacts by
  # jurisdiction. If both are present, `include` wins and `filter` is ignored.
  regimes:
    include:
      - REGULATION-EU-GDPR-1
      - LAW-GE-CONSUMER-RIGHTS-1
    # filter:
    #   jurisdiction: [eu, ge]
    #   codex_type: [LAW, REGULATION]   # optional; default — all four codex TYPEs

  # Grouping (the axes of the matrix). Default: subject × regime.
  grouping:
    rows: "subject"             # subject | regime
    subject_grain: "task"       # product | product-stage | task
    columns: "regime"           # regime | jurisdiction

  # What counts as "covered" for a (subject, regime) pair (see §5.2 for the algorithm).
  coverage_rule:
    counts_as_covered: "any-active-assertion"   # any-active-assertion (default) | any-non-na-assertion
    treat_proposed_as: "hidden"                 # hidden | shown-distinct (default: hidden, per ASSERTION §2.2)
    treat_ai_reviewed_as: "shown-distinct"      # shown-distinct | shown-same | hidden (default: shown-distinct — counts toward coverage, per CONTRACT §6.2)

  # Empty-cell labels — see §5.3 for the canonical strings.
  empty_cells:
    not_yet_modelled_label: "Not yet modelled"
    no_obligation_asserted_label: "No obligation asserted (modelled fact)"

  # Optional ordering and aggregation knobs.
  order_rows_by: "id"           # id | name | gap-count-desc | gap-count-asc
  order_columns_by: "id"        # id | name | jurisdiction
  summary:
    show_per_regime_total: true
    show_per_subject_total: true
    show_grand_total: true
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../CONTRACT.md) §10), a `view` object, and presentation fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`COVERAGE_METRIC-…`) per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.2 (`COVERAGE_METRIC` document-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this view (which subjects, which regimes, why). |
| `view.subjects.products` | no ¹ | list | **all `PRODUCT`s in canon**, sorted by id | Explicit list of `PRODUCT-…` IDs whose realising processes the view covers. The renderer derives the set of bearing processes via canon (the `realises` relations from `PROCESS` to `PRODUCT`) and walks each process's flow for stages and tasks. |
| `view.subjects.processes` | no ¹ | list | processes derived from `products` | Explicit list of `PROCESS-…` IDs to count over, in addition to (or instead of) the processes derived from `products`. |
| `view.regimes.include` | no ² | list | unset (use `filter`, or the full set) | Explicit list of codex artefact IDs — each is one regime. Permitted TYPEs: `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD` ([14-codex.md](../elements/14-codex.md)). |
| `view.regimes.filter` | no ² | object | **no filter — every codex artefact in the `codex/` zone** | Declarative filter — `jurisdiction: […]` (ISO 3166-1 alpha-2, `eu`, or `intl` per [14-codex.md](../elements/14-codex.md) §3), `codex_type: […]` (subset of `LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD`; default — all four). The renderer resolves the filter against the `codex/` zone at render time. |
| `view.grouping.rows` | no | string | `subject` | Row dimension: `subject` (one row per subject at `subject_grain`), `regime` (one row per regime). |
| `view.grouping.subject_grain` | no | string | `task` | Subject grain when `rows: subject` or when the matrix is per-subject: `product` (one row per `PRODUCT`), `product-stage` (one row per stage of each process), `task` (one row per flow step). |
| `view.grouping.columns` | no | string | `regime` | Column dimension: `regime` (one column per codex artefact), `jurisdiction` (one column per jurisdiction; collapses all regimes from the same jurisdiction). |
| `view.coverage_rule.counts_as_covered` | no | string | `any-active-assertion` | Defines which admitted `ASSERTION`s count a (subject, regime) pair as **covered**: `any-active-assertion` (an admitted assertion with any `status` value, including `n_a`; means *the model has considered the regime against the subject*) or `any-non-na-assertion` (only admitted assertions with `status` in `{compliant, partial, non_compliant, under_review}`; means *the model carries a substantive obligation, not just an n/a exclusion*). |
| `view.coverage_rule.treat_proposed_as` | no | string | `hidden` | How to handle `ASSERTION`s in `proposed` admission state ([16-assertion.md](../elements/16-assertion.md) §2.2): `hidden` (the proposed assertion contributes nothing to coverage) or `shown-distinct` (rendered as a distinct partial-coverage marker so a reviewer sees the harvester's draft alongside admitted canon). The default matches the §2.2 rule that proposed assertions are excluded from every derived view until a human admits them. |
| `view.coverage_rule.treat_ai_reviewed_as` | no | string | `shown-distinct` | How to count admitted `ASSERTION`s carrying `reviewer_authority: ai_reviewed` ([CONTRACT.md](../CONTRACT.md) §6.2): `shown-distinct` (**counts toward coverage**, rendered as a distinct AI-reviewed marker), `shown-same` (counts identically to `expert_confirmed`), or `hidden` (does not count toward coverage). Both tiers are admitted canon, so by **default `ai_reviewed` counts toward coverage**, shown distinct — an adopter who wants an expert-only coverage figure sets `hidden`. Coverage resting on a dependency chain containing an `ai_reviewed` node is reported at the **weakest-link** authority (§6.2). |
| `view.empty_cells.not_yet_modelled_label` | no | string | `"Not yet modelled"` (§5.3) | Label for cells where coverage is zero **and** no admitted `ASSERTION` with `status: n_a` exists from the regime against the subject. |
| `view.empty_cells.no_obligation_asserted_label` | no | string | `"No obligation asserted (modelled fact)"` (§5.3) | Label for cells where coverage is zero **and** every admitted `ASSERTION` from the regime against the subject has `status: n_a` (a modelled exclusion). |
| `view.order_rows_by` | no | string | `id` | Row ordering key: `id`, `name`, `gap-count-desc` (largest modelling gap first — drives harvesting prioritisation), `gap-count-asc`. |
| `view.order_columns_by` | no | string | `id` | Column ordering key: `id`, `name`, `jurisdiction`. |
| `view.summary.show_per_regime_total` | no | bool | `true` | When true, render a per-regime total row: total gap count, total covered count, gap rate. |
| `view.summary.show_per_subject_total` | no | bool | `true` | When true, render a per-subject total column with the same totals. |
| `view.summary.show_grand_total` | no | bool | `true` | When true, render a grand-total cell (sum across all subjects × regimes). |

¹ **`subjects`** — both keys are optional. Omitting them is the zero-config default: the renderer counts coverage over **every `PRODUCT` in canon** (sorted by id). Name `products` and/or `processes` to narrow the scope.

² **`regimes`** — both keys are optional and only ever *narrow* the regime axis. Omitting them enumerates every codex artefact in the `codex/` zone as a regime column. If both `include` and `filter` are present, `include` wins and `filter` is ignored.

All references in `view.subjects.*` and `view.regimes.include` / `view.regimes.filter` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: coverage-metric
spec_version: "0.1"
methodology_version: "0.5.0"
view:
  id: COVERAGE_METRIC-ALL-1
  name: "Full coverage metric"
```

— renders **deterministically**: per-regime coverage over **every `PRODUCT` in canon** against **every codex artefact** in the `codex/` zone, rows `subject` at `task` grain, columns by `regime`, `any-active-assertion` coverage rule, proposed assertions hidden, all three summary totals shown, rows and columns ordered by `id`. This is the fallback the report skill ([ADR 2026-06-09](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md), §4) states back to the user. Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the view from canon. The contract names its inputs, its derivation steps, and the canonical cell labels.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs:

1. **`ASSERTION` catalogue** — every `ASSERTION-…` file under `canon/assertions/` in **admitted** state (`admission_state: active`; proposed assertions are excluded unless `view.coverage_rule.treat_proposed_as: shown-distinct`). Each contributes its `about` (the obligation), `subject` (the bearing element), `realised_via[]` (which MAY name a `STEP-…` or process-blueprint stage to localise the impact), and `status`.
2. **`REQUIREMENT` catalogue** — every `REQUIREMENT-…` file under `canon/elements/01_motivation/requirements/`. Each contributes its `derived_from[]` list of codex artefact IDs. The renderer joins each admitted `ASSERTION`'s `about` to a `REQUIREMENT`, and the `REQUIREMENT`'s `derived_from[]` to the regime axis.
3. **Codex catalogue** — every `LAW-…` / `REGULATION-…` / `POLICY-…` / `INTERNAL_STANDARD-…` file under `codex/` ([14-codex.md](../elements/14-codex.md)). Each contributes its `jurisdiction:` (external artefacts) — the regime-to-jurisdiction lookup used for the `columns: jurisdiction` grouping. Internal codex artefacts have no `jurisdiction` ([14-codex.md](../elements/14-codex.md) §3); when grouped by jurisdiction they collapse into the synthetic bucket `internal`.
4. **Process flows** — the `flow.steps[]` of each `PROCESS-…` element named directly in `view.subjects.processes` or derived from `view.subjects.products`. Each step carries an addressable canonical ID under the canonical-by-containment + promotion rule ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.3; promotion mechanic [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20).
5. **Process-blueprint stages** — when a process-blueprint document covers the same processes, its `stages[]` are the canonical stage grain for `subject_grain: product-stage`. The blueprint is read as supplementary structure; nothing in the view derivation requires it (a renderer without a blueprint falls back to `subject_grain: task`).

The renderer reads **no other input**. In particular: the view document itself contributes only filter / grouping / labelling configuration — never a cell value.

### 5.2 Derivation

For each (row, column) cell in the materialised matrix:

1. **Resolve the column's regime set** from `view.regimes.include` or `view.regimes.filter` against the codex catalogue. When `view.grouping.columns: jurisdiction`, regimes are bucketed by their `jurisdiction:` field (internal codex artefacts → bucket `internal`).
2. **Resolve the row's subject set** from `view.subjects.*` and `view.grouping.subject_grain`:
   - `product` — one row per `PRODUCT-…`.
   - `product-stage` — one row per (`PRODUCT-…`, stage). Stages come from process-blueprints; absent a blueprint, a coarse-grain flow grouping is used.
   - `task` — one row per (`PRODUCT-…`, `STEP-…`) flow step.
3. **Count covered (row, column) pairs.** For each cell:
   - Find every admitted `ASSERTION` whose `subject` (or, when finer-grain than `subject_grain`, whose `realised_via[]`) intersects the row's subject set, and whose `about` resolves to a `REQUIREMENT` whose `derived_from[]` intersects the column's regime set.
   - Apply `view.coverage_rule.counts_as_covered`:
     - `any-active-assertion` — every admitted assertion counts, including those with `status: n_a`. A non-zero count means *the model has considered this regime against this subject*.
     - `any-non-na-assertion` — only admitted assertions with `status ∈ {compliant, partial, non_compliant, under_review}` count. A non-zero count means *the model carries a substantive obligation*.
4. **Cell value** — the count of qualifying assertions (an integer ≥ 0). When the cell is zero, classify it per §5.3.
5. **Summary rows / columns / grand total** — computed per §4 (`view.summary.*`). Totals always count distinct (row, column) pairs, never raw assertion records.

The aggregation order is fixed so two renderers given the same canon produce identical output.

### 5.3 Zero-cell classification

Two distinct zero-cell conditions exist; the view MUST distinguish them in the rendered output. Adopters changing the label strings (via `view.empty_cells.*`) MUST preserve the distinction. The distinction mirrors §5.3 of the Compliance Impact view ([21-compliance-impact.md](21-compliance-impact.md)) and codifies it as a first-class coverage axis.

| Condition | Canonical label | Meaning |
|---|---|---|
| Zero qualifying assertions for the (subject, regime) cell, **and** no admitted `ASSERTION` from the regime against the subject has `status: n_a`. | **"Not yet modelled"** (default) | The model has not considered this regime against this subject. This is a **modelling gap** — harvesting may yet light it up. Drives the gap-count metric and the harvesting-prioritisation ordering. |
| Zero qualifying assertions, **and** at least one admitted `ASSERTION` from the regime against the subject has `status: n_a`. | **"No obligation asserted (modelled fact)"** | A reviewer has determined no obligation from this regime applies to this subject. This is a **modelled fact**, not a gap; it does not count towards the gap metric. |

These two zero-cell conditions are exclusive: an admitted `ASSERTION` with `status: n_a` counts under `any-active-assertion` (so the cell would not be zero under the default rule) but does not count under `any-non-na-assertion`. The classification above applies whichever rule is in effect, by inspecting the admitted-`n_a` set independently of the coverage count.

A conformant renderer MUST NOT collapse the two conditions into a single visual treatment. The visual encoding (colour, hatching, text) is left to the renderer; the data-level distinction is not. The **gap-count metric** (the rendered total of "Not yet modelled" cells, per `view.summary.*`) counts only the first row above — modelling gaps. "No obligation asserted (modelled fact)" cells are zero by virtue of a deliberate exclusion and are not gaps.

---

## 6. Relationship to other notations and elements

```
Coverage Metric view (this notation — report-config)
  ├── reads   → ASSERTION elements             (16-assertion.md §1; admitted state only by default)
  │     ├── about       → REQUIREMENT
  │     ├── subject     → PRODUCT / PROCESS / CAPABILITY
  │     ├── realised_via → STEP / stage / CAPABILITY / …
  │     └── status      → compliant | partial | non_compliant | under_review | n_a
  ├── reads   → REQUIREMENT.derived_from[]      (15-requirement.md — the regime-join key)
  ├── reads   → codex artefacts                 (14-codex.md — the regime axis; jurisdiction grouping)
  ├── reads   → PROCESS.flow.steps[]            (ELEMENT_PRIMITIVES.md §7.5 / §7.20 — the task grain)
  └── reads   → process-blueprint stages[]      (13-process-blueprint.md — the stage grain, when present)
```

Pairs with the **Compliance Impact view** ([21-compliance-impact.md](21-compliance-impact.md)) — the first read of the same canonical inputs, rendered as the obligation × subject matrix with cell statuses. The Coverage Metric view is the second read: the per-regime count of dark cells, classified into modelling gaps and modelled facts.

Pairs with **Transitrix Studio compliance views / export** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `COVMET-001` | error | A required field from §4 is missing, or `id` does not match the canonical grammar `COVERAGE_METRIC-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1). |
| `COVMET-002` | error | `view.subjects` is empty (neither `products` nor `processes` present). |
| `COVMET-003` | error | A reference in `view.subjects.products` / `view.subjects.processes` / `view.regimes.include` does not resolve to an admitted canonical element of the expected TYPE. A value in `view.regimes.include` whose TYPE is not one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD` is the same error. |
| `COVMET-004` | error | `view.grouping.rows`, `view.grouping.subject_grain`, or `view.grouping.columns` is set to a value outside the enumerated set in §4. |
| `COVMET-005` | error | `view.coverage_rule.counts_as_covered`, `view.coverage_rule.treat_proposed_as`, or `view.coverage_rule.treat_ai_reviewed_as` is set to a value outside its enumeration (the last per CONTRACT §6.2: `shown-distinct` \| `shown-same` \| `hidden`). |
| `COVMET-006` | warning | `view.regimes.filter.jurisdiction` contains a value that is not ISO 3166-1 alpha-2, `eu`, or `intl` (the only values codex external artefacts permit, [14-codex.md](../elements/14-codex.md) §3). |
| `COVMET-007` | warning | Both `view.regimes.include` and `view.regimes.filter` are present (the include wins; the filter is silently ignored). |
| `COVMET-008` | warning | The view selects zero regimes after applying `include` / `filter` — the rendered matrix will have no columns. Usually indicates a typo or that no codex artefacts of the requested kind have been admitted. |
| `COVMET-009` | warning | `view.empty_cells.not_yet_modelled_label` or `view.empty_cells.no_obligation_asserted_label` overrides the default but is a string the §5.3 distinction was introduced to retire (e.g. "No direct obligation", "Not applicable", "Out of scope" used ambiguously). |

The shared header rules `HDR-001..004` ([CONTRACT.md](../CONTRACT.md) §2) apply in addition.

---

## 8. References

- ASSERTION element schema (the canonical compliance claim): [16-assertion.md](../elements/16-assertion.md).
- REQUIREMENT element schema (the obligation; the `derived_from` link to a codex regime): [15-requirement.md](../elements/15-requirement.md).
- Codex artefacts and the `jurisdiction:` field: [14-codex.md](../elements/14-codex.md).
- Process flow and the STEP grain: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5 (process flow), §7.20 (standalone STEP, promotion mechanic).
- Process-blueprint stages: [13-process-blueprint.md](13-process-blueprint.md).
- Compliance Impact — the sibling report-config view (same canonical inputs, different read): [21-compliance-impact.md](21-compliance-impact.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) (`COVERAGE_METRIC` registered in §3.2).
- Reconstruction invariant (why view documents are not content homes): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1.
