---
notation: "Design-Controls Trace Matrix"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-26"
status: "draft"
file_extension: "*.design-controls-trace-matrix.transitrix.yaml"
dsm_status: "not implemented — Studio compliance-views renderer planned (consumer-side, tracked separately)"
---

# Design-Controls Trace Matrix — Report-Configuration View — Reference

**Version:** 0.1
**Date:** 2026-07-26
**Status:** Draft — first cut of the canonical report-config for the design-controls trace matrix. Sibling of [Compliance Impact](21-compliance-impact.md) and [Coverage Metric](22-coverage-metric.md); same "presentation surface over canon, nothing stored twice" posture, adapted to a fixed audit-table shape instead of a configurable pivot matrix (see §1.1).
**File extension:** `*.design-controls-trace-matrix.transitrix.yaml`
**Scope:** A **rendering / filtering configuration** for the design-controls trace matrix — the audit-facing table a QA / Regulatory-Affairs reader points at to confirm the engineering V&V chain (`REQUIREMENT` → `VERIFICATION`) and the ISO 14971 risk chain (`HAZARD` → `RISK_CONTROL` → `REQUIREMENT` → `VERIFICATION`) against the actual model, not a promise. The document is a presentation surface — it carries no canonical content of its own. Everything the view displays is **derived** from `HAZARD` / `RISK_CONTROL` ([28-hazard-risk-control.md](../elements/28-hazard-risk-control.md)), `REQUIREMENT` ([15-requirement.md](../elements/15-requirement.md)), and `VERIFICATION` ([27-verification.md](../elements/27-verification.md)).
**Renderer:** Transitrix Studio — compliance views (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `design-controls-trace-matrix` |
| File extension | `*.design-controls-trace-matrix.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `design-controls-trace-matrix` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `view` | yes | object | the design-controls-trace-matrix view config — see §3 and §4 |

Example header:

```yaml
notation: design-controls-trace-matrix
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "2.0.0"
view:
  # ... see §3
```

---

## 1. What this view is

A design-controls trace matrix answers the question a design-controls audit always starts with: **for the requirements and hazards in scope, does the chain that is supposed to close them actually close — and where doesn't it?** It renders two chains, both already defined as first-class canon by their own element specs (not introduced here):

```
REQUIREMENT ──────────────── verified by ──────────────▶ VERIFICATION            (the "requirement" chain)

HAZARD ── mitigated by ──▶ RISK_CONTROL ── satisfies ──▶ REQUIREMENT ── verified by ──▶ VERIFICATION   (the "risk" chain)
```

The renderer materialises both from canon. Nothing is stored twice:

- The fact that *a control mitigates a hazard* is recorded once — on the `RISK_CONTROL.mitigates` field ([28-hazard-risk-control.md](../elements/28-hazard-risk-control.md) §3).
- The fact that *a control is realised as a design requirement* is recorded once — on `RISK_CONTROL.satisfies` (same spec, §3).
- The fact that *a protocol was run against a requirement, and what it found* is recorded once — on `VERIFICATION.verifies` / `.outcome` ([27-verification.md](../elements/27-verification.md) §2).
- The judgement of whether a link in the chain is *missing* or *unclosed* is recorded nowhere new — it is exactly the reverse-trace completeness rules already defined on the referenced elements: `REQ-VERIF-COVERAGE-001`/`-002` ([15-requirement.md](../elements/15-requirement.md) §4), `HAZ-RISKCTL-COVERAGE-001`/`-002`, and `RISKCTL-VERIF-COVERAGE-001` ([28-hazard-risk-control.md](../elements/28-hazard-risk-control.md) §6). This view's row-level gap annotations are a **rendering of those rules**, not a new judgement.

A design-controls-trace-matrix document declares **which slice of that chain to render** (which requirements, which hazards) and labelling overrides. It does not redeclare any of the four facts above, nor invent a sixth completeness rule. This obeys the reconstruction invariant ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1): the canon is reconstructible from the elements alone; the view document adds no fact.

### 1.1 Why this view's columns are fixed, unlike Compliance Impact / Coverage Metric

Compliance Impact and Coverage Metric are configurable pivot matrices — an adopter chooses the row axis, the column axis, and the grouping grain (§4 of each spec). This view does not offer that. A design-controls / DHF trace matrix has a conventionally fixed shape in every QMS and regulatory-audit context it serves (21 CFR 820.30, ISO 13485, ISO 14971): Hazard–Control–Requirement–Verification, or Requirement–Verification. Making the column set configurable would let two adopters render "the trace matrix" with different columns, undermining the audit-comparability the view exists to provide. `view.report_type` (§4) selects **which of the two fixed chains** to render — not their shape.

### 1.2 Known limitation — no `USER_NEED` or `DESIGN` element TYPE

Both source specs describe this view's aspiration using FDA 21 CFR 820.30 design-controls terminology — "User Need → Requirement → Design → Verification" ([27-verification.md](../elements/27-verification.md) §7, [28-hazard-risk-control.md](../elements/28-hazard-risk-control.md) §7, both prior to this spec). Transitrix does not define standalone `USER_NEED` or `DESIGN` element TYPEs today — only `REQUIREMENT` (the design-input analogue) and `VERIFICATION` exist on the plain chain; `RISK_CONTROL` (the design-output analogue on the risk chain, per ISO 14971) exists only where a hazard motivates it. This view therefore renders exactly the two chains canon supports (§1) — it does not render a literal four-column "User Need / Design" matrix, and it introduces no new element TYPE to backfill one. A report-config view carries no canonical content ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1) and is not the place to add a schema element; if an adopter needs `USER_NEED` / `DESIGN` as first-class canon, that is a separate, cross-notation schema proposal against [15-requirement.md](../elements/15-requirement.md) / [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md), not a change to this view.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Confirm every design requirement has closed V&V (`pass`/`fail`), for an audit or a design review. | Design-Controls Trace Matrix — `report_type: requirement` |
| Confirm every identified hazard has an adequately-controlled, traced-through, verified mitigation, per ISO 14971. | Design-Controls Trace Matrix — `report_type: risk` |
| A single audit-facing report covering both chains at once. | Design-Controls Trace Matrix — `report_type: combined` (default) |
| Author the underlying requirement, hazard, control, or verification records. | The element primitives, not this view — see the table below. |

For the canonical authoring of the chain this view reads, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The design requirement. | `REQUIREMENT` element ([15-requirement.md](../elements/15-requirement.md)) at `canon/elements/01_motivation/requirements/REQUIREMENT-<…>.yaml`. |
| The potential source of harm. | `HAZARD` element ([28-hazard-risk-control.md](../elements/28-hazard-risk-control.md) §2) at `canon/elements/01_motivation/hazards/HAZARD-<…>.yaml`. |
| The measure that mitigates a hazard, optionally realised as a requirement. | `RISK_CONTROL` element (same spec, §3) at `canon/elements/01_motivation/risk-controls/RISK_CONTROL-<…>.yaml`. |
| The V&V protocol run against a requirement, with method and pass/fail outcome. | `VERIFICATION` element ([27-verification.md](../elements/27-verification.md)) at `canon/verifications/VERIFICATION-<…>.yaml`. |

---

## 3. Document structure

A design-controls-trace-matrix view file is a short, declarative report config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: design-controls-trace-matrix
spec_version: "0.1"
name: "Device X — design-controls trace matrix"   # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                        # optional per CONTRACT.md §4
methodology_version: "2.0.0"

view:
  id: DC_TRACE_MATRIX-DEVICE-X-1
  name: "Device X — design-controls trace matrix"
  description: "Full requirement and risk trace for Device X ahead of the design review."
  report_type: combined          # requirement | risk | combined — required; see §1.1 / §4

  # What the view covers. Must match report_type:
  #   requirement → subjects.requirements only (subjects.hazards MUST be absent)
  #   risk        → subjects.hazards only (subjects.requirements MUST be absent)
  #   combined    → both may be present; each renders its own section
  subjects:
    requirements: [REQUIREMENT-DEVICE-ALARM-1]
    # hazards: [HAZARD-BATTERY-DEPLETION-1]     # use with report_type: risk or combined

  # Which VERIFICATION outcomes and RISK_CONTROL residual_risk values to show.
  status_display:
    show_outcomes: ["pass", "fail", "inconclusive", "not_yet_run"]
    show_residual_risk: ["acceptable", "alarp", "unacceptable", "not_recorded"]

  # Gap labels — see §5.3 for the canonical strings and the rules they render.
  gap_labels:
    req_verif_coverage_001: "No verification recorded"

  # Optional ordering knob.
  order_rows_by: "id"            # id | name
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../CONTRACT.md) §10), a `view` object, and presentation fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`, `view.report_type`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`DC_TRACE_MATRIX-…`) per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.2 (`DC_TRACE_MATRIX` document-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this view (which requirements and/or hazards, why). |
| `view.report_type` | yes | string | — (required) | `requirement` — renders only the requirement chain (§1); `subjects.hazards` MUST be absent. `risk` — renders only the risk chain; `subjects.requirements` MUST be absent. `combined` — renders both chains as two sections in one report; a REQUIREMENT named in `subjects.requirements` MAY also be reached via `subjects.hazards`' risk chain — the renderer MUST NOT deduplicate across sections (§5.2). Column shape is fixed per §1.1; this field selects which fixed chain(s), not their columns. |
| `view.subjects.requirements` | no ¹ | list | **all `REQUIREMENT`s in canon**, sorted by id | Explicit list of `REQUIREMENT-…` IDs whose verification trace to render in the requirement-chain section. |
| `view.subjects.hazards` | no ¹ | list | **all `HAZARD`s in canon**, sorted by id | Explicit list of `HAZARD-…` IDs whose risk-chain trace to render in the risk-chain section. |
| `view.status_display.show_outcomes` | no | list | all four (`pass`, `fail`, `inconclusive`, `not_yet_run`) | Which `VERIFICATION.outcome` values to render in full; outcomes excluded from this list still count for gap classification (§5.2) but are shown collapsed as "(hidden by status_display)". |
| `view.status_display.show_residual_risk` | no | list | all four (`acceptable`, `alarp`, `unacceptable`, `not_recorded`) | Which `RISK_CONTROL.residual_risk` values (plus the synthetic `not_recorded` for an absent field) to render in full, same collapsing behaviour as above. |
| `view.gap_labels.req_verif_coverage_001` | no | string | `"No verification recorded"` (§5.3) | Label rendered when `REQ-VERIF-COVERAGE-001` fires for a row. |
| `view.gap_labels.req_verif_coverage_002` | no | string | `"Verification recorded but not yet closed"` (§5.3) | Label rendered when `REQ-VERIF-COVERAGE-002` fires for a row. |
| `view.gap_labels.haz_riskctl_coverage_001` | no | string | `"No risk control recorded"` (§5.3) | Label rendered when `HAZ-RISKCTL-COVERAGE-001` fires for a row. |
| `view.gap_labels.haz_riskctl_coverage_002` | no | string | `"Control recorded but not shown adequate"` (§5.3) | Label rendered when `HAZ-RISKCTL-COVERAGE-002` fires for a row. |
| `view.gap_labels.riskctl_verif_coverage_001` | no | string | `"Risk-mitigating requirement lacks V&V closure"` (§5.3) | Label rendered when `RISKCTL-VERIF-COVERAGE-001` fires for a row. |
| `view.order_rows_by` | no | string | `id` | Row ordering key within each section: `id`, `name`. |

¹ **`subjects`** — behaviour depends on `view.report_type`. `requirement`: `subjects.requirements` is optional (omit → all REQUIREMENTs in canon); `subjects.hazards` MUST be absent. `risk`: `subjects.hazards` is optional (omit → all HAZARDs in canon); `subjects.requirements` MUST be absent. `combined`: both keys are independently optional, each defaulting to its own full catalogue.

All references in `view.subjects.*` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: design-controls-trace-matrix
spec_version: "0.1"
name: "Full design-controls trace matrix"   # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                 # optional per CONTRACT.md §4
methodology_version: "2.0.0"
view:
  id: DC_TRACE_MATRIX-ALL-1
  name: "Full design-controls trace matrix"
  report_type: combined                     # required; requirement | risk | combined
```

— renders **deterministically**: both sections, over every `REQUIREMENT` and every `HAZARD` in canon, all outcomes and residual-risk values shown in full, default gap labels, rows ordered by `id`. This is the fallback the report skill (per the *reports rendered from declarative view-configs* architecture decision, §4) states back to the user as "full trace, no filters". Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](REPORT_VIEW_CONFIG.md).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the view from canon. The contract names its inputs, its derivation steps, and the canonical gap labels.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs, each in **admitted** state (`admission_state: active` / `zone: canon` with a valid admission record):

1. **`REQUIREMENT` catalogue** — every `REQUIREMENT-…` file under `canon/elements/01_motivation/requirements/`. Contributes `id`, `name`.
2. **`VERIFICATION` catalogue** — every `VERIFICATION-…` file under `canon/verifications/`. Contributes `verifies` (the REQUIREMENT it targets), `method`, `outcome`, `result`.
3. **`HAZARD` catalogue** — every `HAZARD-…` file under `canon/elements/01_motivation/hazards/`. Contributes `id`, `name`, `severity`.
4. **`RISK_CONTROL` catalogue** — every `RISK_CONTROL-…` file under `canon/elements/01_motivation/risk-controls/`. Contributes `mitigates` (the HAZARD(s) it addresses), `control_type`, `satisfies` (the REQUIREMENT it realises, if any), `residual_risk`.

The renderer reads **no other input**. In particular: the view document itself contributes only filter / labelling configuration — never a cell value or a gap judgement.

### 5.2 Derivation

**Requirement-chain section** (rendered when `view.report_type` is `requirement` or `combined`):

1. Resolve the row set from `view.subjects.requirements` against the `REQUIREMENT` catalogue.
2. For each `REQUIREMENT`, resolve every admitted `VERIFICATION` with `verifies` equal to that requirement's id.
   - **Zero verifications** — render one row: Verification column carries the `req_verif_coverage_001` gap label (§5.3), reflecting `REQ-VERIF-COVERAGE-001`.
   - **One or more verifications** — render one row per verification (fan-out; a REQUIREMENT with three verifications is three rows sharing the same Requirement cell), each showing `method` and `outcome` per `view.status_display.show_outcomes`. If **none** of the requirement's verifications reached `outcome: pass` or `outcome: fail`, additionally annotate the row group with the `req_verif_coverage_002` gap label, reflecting `REQ-VERIF-COVERAGE-002`.

**Risk-chain section** (rendered when `view.report_type` is `risk` or `combined`):

1. Resolve the row set from `view.subjects.hazards` against the `HAZARD` catalogue.
2. For each `HAZARD`, resolve every admitted `RISK_CONTROL` whose `mitigates[]` contains that hazard's id.
   - **Zero controls** — render one row: Risk Control column carries the `haz_riskctl_coverage_001` gap label, reflecting `HAZ-RISKCTL-COVERAGE-001`.
   - **One or more controls** — render one row per control (fan-out), showing `control_type` and `residual_risk` per `view.status_display.show_residual_risk`. If **none** of the hazard's controls records `residual_risk: acceptable` or `residual_risk: alarp`, additionally annotate the row group with the `haz_riskctl_coverage_002` gap label, reflecting `HAZ-RISKCTL-COVERAGE-002`.
3. For each `RISK_CONTROL` row from step 2, resolve `satisfies`:
   - **Absent** — Requirement and Verification columns render `"Not yet decomposed to a requirement"`. This is **not** a gap — mirrors `RISKCTL-VERIF-COVERAGE-001`'s own precedent that an early-lifecycle control with no `satisfies` is not an orphan ([28-hazard-risk-control.md](../elements/28-hazard-risk-control.md) §6).
   - **Present** — resolve the referenced `REQUIREMENT` and apply the same verification-resolution logic as the requirement-chain section (step 2 above) to render the Requirement and Verification columns for this row. If the referenced requirement is not verification-complete (per `REQ-VERIF-COVERAGE-001`/`-002`), additionally annotate the row with the `riskctl_verif_coverage_001` gap label, reflecting `RISKCTL-VERIF-COVERAGE-001`.

**`combined` independence.** The two sections are derived independently from the same four catalogues. A `REQUIREMENT` reached via a `RISK_CONTROL.satisfies` link in the risk-chain section MAY also appear as its own row in the requirement-chain section if it is within `view.subjects.requirements` scope. The renderer MUST NOT deduplicate or cross-link rows between sections — each section is a complete, independent read, the same posture Compliance Impact's `combined` report type takes for its two column groups ([21-compliance-impact.md](21-compliance-impact.md) §7.1).

The row-fan-out and gap-annotation order above is fixed so two renderers given the same canon produce identical output.

### 5.3 Gap labels

Every gap label rendered by this view is a direct rendering of an existing reverse-trace completeness rule — this view introduces no sixth rule and no new judgement. Adopters changing the label strings (via `view.gap_labels.*`) MUST preserve which underlying rule each label represents; a renderer MUST NOT merge two distinct rules under one label.

| Condition | Canonical label | Underlying rule |
|---|---|---|
| A REQUIREMENT row has no admitted VERIFICATION at all. | **"No verification recorded"** (default) | [`REQ-VERIF-COVERAGE-001`](../elements/15-requirement.md) |
| A REQUIREMENT row has VERIFICATION(s), but none reached `pass`/`fail`. | **"Verification recorded but not yet closed"** (default) | [`REQ-VERIF-COVERAGE-002`](../elements/15-requirement.md) |
| A HAZARD row has no admitted RISK_CONTROL mitigating it. | **"No risk control recorded"** (default) | [`HAZ-RISKCTL-COVERAGE-001`](../elements/28-hazard-risk-control.md) |
| A HAZARD row has RISK_CONTROL(s), but none records `residual_risk` in `{acceptable, alarp}`. | **"Control recorded but not shown adequate"** (default) | [`HAZ-RISKCTL-COVERAGE-002`](../elements/28-hazard-risk-control.md) |
| A RISK_CONTROL row carries `satisfies`, but the referenced REQUIREMENT is not verification-complete. | **"Risk-mitigating requirement lacks V&V closure"** (default) | [`RISKCTL-VERIF-COVERAGE-001`](../elements/28-hazard-risk-control.md) |
| A RISK_CONTROL row has no `satisfies`. | `"Not yet decomposed to a requirement"` (fixed; not overridable via `gap_labels`, because it is not a gap) | — (explicitly not a rule; see §5.2 step 3) |

A conformant renderer MUST NOT collapse the "not yet decomposed" condition (a legitimate early-lifecycle state) into any of the five gap labels above — doing so would misreport a control that simply hasn't reached formal decomposition as an audit finding.

---

## 6. Relationship to other notations and elements

```
Design-Controls Trace Matrix view (this notation — report-config)
  ├── reads   → REQUIREMENT elements       (15-requirement.md; admitted state only)
  ├── reads   → VERIFICATION elements       (27-verification.md §2; admitted state only)
  │     └── verifies    → REQUIREMENT
  ├── reads   → HAZARD elements             (28-hazard-risk-control.md §2; admitted state only)
  └── reads   → RISK_CONTROL elements       (28-hazard-risk-control.md §3; admitted state only)
        ├── mitigates  → HAZARD
        └── satisfies  → REQUIREMENT (optional)
```

Renders the reverse-trace completeness rules already defined on the referenced elements — `REQ-VERIF-COVERAGE-001`/`-002`, `HAZ-RISKCTL-COVERAGE-001`/`-002`, `RISKCTL-VERIF-COVERAGE-001` — rather than defining new ones (§1, §5.3).

Pairs with **Compliance Impact** ([21-compliance-impact.md](21-compliance-impact.md)) and **Coverage Metric** ([22-coverage-metric.md](22-coverage-metric.md)) as the third report-config view over the compliance/design-controls domain — that pair covers regulatory-obligation compliance and coverage; this view covers engineering V&V and ISO 14971 risk-control completeness. The three are independent reads with no shared canonical input (ASSERTION/codex on one side, VERIFICATION/HAZARD/RISK_CONTROL on the other) — an adopter operating in a regulated-product domain (e.g. medical devices) is expected to use all three together.

Pairs with **Transitrix Studio compliance views / export** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `DCTM-001` | error | A required field from §4 is missing, or `id` does not match the canonical grammar `DC_TRACE_MATRIX-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1). |
| `DCTM-002` | error | `view.report_type` is absent or not one of `requirement`, `risk`, `combined`. |
| `DCTM-003` | error | A reference in `view.subjects.requirements` does not resolve to an admitted `REQUIREMENT`, or a reference in `view.subjects.hazards` does not resolve to an admitted `HAZARD`. |
| `DCTM-004` | error | `report_type: requirement` but `view.subjects.hazards` is present; or `report_type: risk` but `view.subjects.requirements` is present. Remove the cross-type subject entry, or change `report_type` to `combined`. |
| `DCTM-005` | warning | The view selects zero rows for a rendered section after applying `subjects.*` — usually indicates a typo in an ID. |
| `DCTM-006` | warning | `view.status_display.show_outcomes` contains a value outside `{pass, fail, inconclusive, not_yet_run}`, or `view.status_display.show_residual_risk` contains a value outside `{acceptable, alarp, unacceptable, not_recorded}`. |
| `DCTM-007` | warning | A `view.gap_labels.*` override collapses the distinction between two of the five gap conditions in §5.3, or between a gap condition and the fixed "Not yet decomposed to a requirement" state (e.g. reusing the same string for two different keys). |

The shared header rules `HDR-001..004` ([CONTRACT.md](../CONTRACT.md) §2) apply in addition.

---

## 8. References

- `REQUIREMENT` element schema and `REQ-VERIF-COVERAGE-*` reverse-trace rules: [15-requirement.md](../elements/15-requirement.md) §4.
- `VERIFICATION` element schema: [27-verification.md](../elements/27-verification.md).
- `HAZARD` / `RISK_CONTROL` element schemas and `HAZ-RISKCTL-COVERAGE-*` / `RISKCTL-VERIF-COVERAGE-001` reverse-trace rules: [28-hazard-risk-control.md](../elements/28-hazard-risk-control.md) §6.
- Worked example (happy-path chain + seeded reverse-trace gaps, rendered by hand against this contract): [`../examples/design-controls-trace-matrix/`](../examples/design-controls-trace-matrix/).
- Compliance Impact — sibling report-config view (regulatory-obligation domain): [21-compliance-impact.md](21-compliance-impact.md).
- Coverage Metric — sibling report-config view (regulatory-obligation domain): [22-coverage-metric.md](22-coverage-metric.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) (`DC_TRACE_MATRIX` registered in §3.2).
- Reconstruction invariant (why view documents are not content homes): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1.
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](REPORT_VIEW_CONFIG.md).
- Architecture decision — reports are rendered from declarative view-configs, with a thin skill on top.
