---
notation: "Rules in Force"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-23"
status: "draft"
file_extension: "*.rules-in-force.transitrix.yaml"
dsm_status: "not implemented — Studio compliance-views renderer planned (consumer-side, tracked separately)"
---

# Rules in Force — Report-Configuration View — Reference

**Version:** 0.1
**Date:** 2026-08-23
**Status:** Draft — first cut of the canonical report-config for the codex-catalogue read. Sibling of the Compliance Impact ([21-compliance-impact.md](./21-compliance-impact.md)) and Coverage Metric ([22-coverage-metric.md](./22-coverage-metric.md)) views — shares the same `REQUIREMENT.derived_from` join key, but reads the **codex zone itself** rather than the obligation × subject overlay.
**File extension:** `*.rules-in-force.transitrix.yaml`
**Scope:** A **rendering / grouping / filtering configuration** over the `codex` zone ([14-codex.md](../../elements/14-codex.md)) — every admitted `LAW`, `REGULATION`, `STANDARD`, `POLICY`, and `INTERNAL_STANDARD` artefact currently in force, together with the `REQUIREMENT`s drawn from each via `derived_from`. The document is a presentation surface — it carries no canonical content of its own. Everything the view displays is **derived** from codex artefacts under `codex/external/<jurisdiction>/` and `codex/internal/` ([14-codex.md](../../elements/14-codex.md)), and from `REQUIREMENT` elements under `canon/elements/01_motivation/requirements/` ([15-requirement.md](../../elements/15-requirement.md)).
**Renderer:** Transitrix Studio — compliance views (planned); Transitrix DSM (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `rules-in-force` |
| File extension | `*.rules-in-force.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `rules-in-force` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `view` | yes | object | the rules-in-force view config — see §3 and §4 |

Example header:

```yaml
notation: rules-in-force
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "4.1.0"
view:
  # ... see §3
```

---

## 1. What this view is

A rules-in-force view answers one question: **what binds the organisation today, and what has been drawn from each source?**

Every structural and change-shaped part of a model already has at least one view — the capability map, the process map, the products/applications catalogues. The `codex` zone ([14-codex.md](../../elements/14-codex.md)) has none: "what rules bind us today" was renderable only by reading `codex/external/<jurisdiction>/` and `codex/internal/` directly, file by file. This view closes that gap the same way every other report-config view closes one — a named, re-runnable projection, not a new element TYPE and not a new binding. The view adds no fact; every row is reconstructible from the codex catalogue and the `REQUIREMENT` catalogue alone ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1 reconstruction invariant).

**`PRINCIPLE` is deliberately out of scope.** A `PRINCIPLE` artefact names no issuing authority and no conformance test ([14-codex.md](../../elements/14-codex.md) §2.1) — it is a value the organisation holds itself to, not a rule imposed from outside or checked from within. "In force" names the latter condition; a `PRINCIPLE` fails it by definition, not by a filter an adopter can loosen. `view.scope.codex.filter.codex_type` (§4) is closed to the same five TYPEs the Coverage Metric view already restricts its regime axis to (`COVMET-003`) — `LAW`, `REGULATION`, `STANDARD`, `POLICY`, `INTERNAL_STANDARD`.

This mirrors how the Compliance Impact ([21-compliance-impact.md](./21-compliance-impact.md)) and Coverage Metric ([22-coverage-metric.md](./22-coverage-metric.md)) views are report-configs over the same canonical join (`REQUIREMENT.derived_from` → codex artefact) — those two read the obligation-to-subject overlay; this view reads the source catalogue the overlay is derived from.

The mechanism is regime- and industry-agnostic. No jurisdiction, sector, or issuing authority is baked into this notation.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| List every law, regulation, policy, and internal standard currently binding the organisation, with its effective date and issuing authority or jurisdiction. | Rules in Force view |
| Show, per rule, which `REQUIREMENT`s the organisation has drawn from it — or that none have been drawn yet. | Rules in Force view |
| Answer "what changed in what binds us" between two snapshots — re-run against a later canon and diff the output. | Rules in Force view |
| Render the obligation × subject overlay itself (statuses, compliance state). | **Compliance Impact view** ([21-compliance-impact.md](./21-compliance-impact.md)). |
| Count subjects with zero admitted obligations from a regime. | **Coverage Metric view** ([22-coverage-metric.md](./22-coverage-metric.md)). |

For the canonical authoring of the inputs the view reads, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The codex artefact that defines a rule (a law, a regulation, an externally issued standard, an internal policy or standard). | `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` element ([14-codex.md](../../elements/14-codex.md)) under `codex/external/<jurisdiction>/` or `codex/internal/`. |
| The obligation extracted from a rule. | `REQUIREMENT` element ([15-requirement.md](../../elements/15-requirement.md)), with `derived_from: [LAW-… \| REGULATION-… \| STANDARD-… \| POLICY-… \| INTERNAL_STANDARD-…]`. |

---

## 3. Document structure

A rules-in-force view file is a short, declarative report config. It does not own any canonical content. Two top-level keys plus the shared header:

```yaml
notation: rules-in-force
spec_version: "0.1"
name: "Rules in force"                      # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                  # optional per CONTRACT.md §4
methodology_version: "4.1.0"

view:
  id: RULES_IN_FORCE-ALL-1
  name: "Rules in force"
  description: "Every admitted law, regulation, external standard, policy, and internal standard, with the requirements drawn from each."

  # What the view scopes over. Either an explicit include list of codex artefact
  # IDs, or a filter that narrows by jurisdiction / TYPE. If both are present,
  # `include` wins and `filter` (and `exclude_paths`) are ignored.
  scope:
    codex:
      include:
        - REGULATION-EU-GDPR-1
        - LAW-GE-PERSONAL-DATA-2017-1
      # filter:
      #   jurisdiction: [eu, ge]                                        # optional; default — no jurisdiction narrowing
      #   codex_type: [LAW, REGULATION, STANDARD, POLICY, INTERNAL_STANDARD]  # optional; default — all five (PRINCIPLE is never selectable, §1)
      # exclude_paths:                                                  # optional — globs relative to codex/ root; ignored when include: is set
      #   - "templates/**"
      #   - "service/**"

  # Grouping of the rendered list. Default: no grouping (a flat, ordered list).
  grouping:
    by: "codex_type"          # none | codex_type | jurisdiction

  # Ordering within the (possibly grouped) list.
  order_by: "effective_date"  # id | name | effective_date | jurisdiction

  # Optional summary knobs.
  summary:
    show_requirement_count: true    # per-rule count of REQUIREMENTs drawn from it
    show_grand_total: true          # total rule count across the whole view
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../../CONTRACT.md) §10), a `view` object, and presentation fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`RULES_IN_FORCE-…`) per [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2 (`RULES_IN_FORCE` view-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this view (which rules, why). |
| `view.scope.codex.include` | no ¹ | list | unset (use `filter`, or the full set) | Explicit list of codex artefact IDs. Permitted TYPEs: `LAW`, `REGULATION`, `STANDARD`, `POLICY`, `INTERNAL_STANDARD` ([14-codex.md](../../elements/14-codex.md)) — a `PRINCIPLE` reference here is a validation error (§1, `RIF-002`), not a silent drop. |
| `view.scope.codex.filter` | no ¹ | object | **no filter — every `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` artefact in the `codex/` zone** | Declarative filter — `jurisdiction: […]` (ISO 3166-1 alpha-2, `eu`, or `intl` per [14-codex.md](../../elements/14-codex.md) §1.1), `codex_type: […]` (subset of `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD`; default — all five; `PRINCIPLE` is never a valid member, §1). The renderer resolves the filter against the `codex/` zone at render time. |
| `view.scope.codex.exclude_paths` | no ¹ | list of strings | unset (no path exclusions) | Glob patterns relative to the `codex/` root, same semantics as the Coverage Metric view's `view.regimes.exclude_paths` ([22-coverage-metric.md](./22-coverage-metric.md) §4). **Ignored when `view.scope.codex.include` is set.** |
| `view.grouping.by` | no | string | `none` | `none` (a single flat, ordered list), `codex_type` (one group per `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD`), `jurisdiction` (one group per jurisdiction; internal artefacts collapse into the synthetic bucket `internal`). |
| `view.order_by` | no | string | `id` | Ordering key applied within each group (or across the whole list when `grouping.by: none`): `id`, `name`, `effective_date`, `jurisdiction`. |
| `view.summary.show_requirement_count` | no | bool | `true` | When true, render the count of admitted `REQUIREMENT`s whose `derived_from[]` names this artefact, per rule row. A rule with zero is rendered as a **counted zero**, not an absent row — see §5.3. |
| `view.summary.show_grand_total` | no | bool | `true` | When true, render a grand-total row: total count of rules in scope, and (when `show_requirement_count` is also true) the sum of per-rule requirement counts. |

¹ **`scope.codex`** — all three keys are optional and only ever *narrow* the rule axis. Omitting them enumerates every `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` artefact in the `codex/` zone. **Priority**: `include` wins over everything — when set, `filter` and `exclude_paths` are both ignored. When `include` is absent, `exclude_paths` is applied first (path-based exclusion from the candidate set), then `filter` (type / jurisdiction filter).

All references in `view.scope.codex.include` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: rules-in-force
spec_version: "0.1"
name: "Rules in force"                 # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4
methodology_version: "4.1.0"
view:
  id: RULES_IN_FORCE-ALL-1
  name: "Rules in force"
```

— renders **deterministically**: every `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` artefact admitted anywhere under `codex/`, ungrouped, ordered by `id`, each row carrying its per-rule requirement count and a grand total. This is the fallback the report skill (per the *reports rendered from declarative view-configs* architecture decision, §4) states back to the user. Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).

---

## 5. Render contract

This section is the **render contract**: the deterministic algorithm any conformant renderer (Studio, DSM, a per-build script) MUST follow to reproduce the view from canon.

### 5.1 Inputs

A conformant renderer reads exactly these canonical inputs:

1. **Codex catalogue** — every `LAW-…` / `REGULATION-…` / `STANDARD-…` / `POLICY-…` / `INTERNAL_STANDARD-…` file under `codex/` ([14-codex.md](../../elements/14-codex.md)). Each contributes its `id`, `name`, `type`, `effective_date`, and — depending on sub-zone — `jurisdiction` (external) or `issuing_authority` (internal). `PRINCIPLE` artefacts are never read by this view (§1).
2. **`REQUIREMENT` catalogue** — every `REQUIREMENT-…` file under `canon/elements/01_motivation/requirements/` ([15-requirement.md](../../elements/15-requirement.md)). Each contributes its `derived_from[]` list of codex artefact IDs — the join key back to the rows above.

The renderer reads **no other input**. In particular: the view document itself contributes only scope / grouping / ordering / labelling configuration — never a cell value.

### 5.2 Derivation

For each codex artefact selected per §4 (`view.scope.codex.*`):

1. **Resolve the scoped codex set** — apply in precedence order: (a) if `view.scope.codex.include` is set, use exactly those artefacts and skip steps b–c; (b) otherwise, start from every `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` artefact in the `codex/` zone and exclude any whose file path (relative to `codex/`) matches a pattern in `view.scope.codex.exclude_paths`; (c) then narrow by `view.scope.codex.filter` if present.
2. **Row fields** — for each selected artefact, emit `id`, `name`, `type`, `effective_date`, and either `jurisdiction` (external sub-zone) or `issuing_authority` (internal sub-zone).
3. **Join to REQUIREMENT** — for each selected artefact, the row's `requirements[]` is the sorted (by id) list of every admitted `REQUIREMENT-…` whose `derived_from[]` names this artefact's id. `requirement_count` is the length of that list — **zero is a valid, rendered count**, never an omitted row (§5.3).
4. **Grouping** — apply `view.grouping.by` (§4): `codex_type` groups rows by `type`; `jurisdiction` groups external rows by `jurisdiction` and collapses every internal row into the synthetic group `internal`; `none` emits one flat list.
5. **Ordering** — within each group (or across the flat list), order rows by `view.order_by` (§4).
6. **Summary** — when `view.summary.show_requirement_count`, each row carries its count from step 3. When `view.summary.show_grand_total`, emit one grand-total row: the count of rules in scope, and, when both summary flags are true, the sum of every row's `requirement_count`.

The aggregation order is fixed so two renderers given the same canon produce identical output.

### 5.3 Zero-requirement rows are a counted state, not an absence

A codex artefact with `requirement_count: 0` — no admitted `REQUIREMENT` yet cites it via `derived_from` — is rendered as an ordinary row with a **counted zero**, exactly like every other row. A conformant renderer MUST NOT omit the row, MUST NOT render it as blank, and MUST NOT collapse it into any other row. This mirrors the zero-cell discipline the Coverage Metric view already applies to its matrix ([22-coverage-metric.md](./22-coverage-metric.md) §5.3): an empty count is itself data — a rule admitted into the codex zone with nothing yet drawn from it is a fact worth surfacing, not a gap to hide.

---

## 6. Relationship to other notations and elements

```
Rules in Force view (this notation — report-config)
  ├── reads   → codex artefacts                 (14-codex.md — LAW / REGULATION / STANDARD / POLICY / INTERNAL_STANDARD only; PRINCIPLE excluded, §1)
  └── reads   → REQUIREMENT.derived_from[]      (15-requirement.md — the join key back to each codex artefact)
```

Pairs with the **Compliance Impact view** ([21-compliance-impact.md](./21-compliance-impact.md)) and the **Coverage Metric view** ([22-coverage-metric.md](./22-coverage-metric.md)) — both read the same `REQUIREMENT.derived_from` join key, projected onto the obligation × subject overlay. This view is the source-catalogue read: what rules exist and bind, independent of which subjects they've been asserted against.

Pairs with **Transitrix Studio compliance views / export** (consumer side, tracked separately) — the in-Studio renderer that implements §5.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `RIF-001` | error | A required field from §4 is missing, or `id` does not match the canonical grammar `RULES_IN_FORCE-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1). |
| `RIF-002` | error | A reference in `view.scope.codex.include` does not resolve to an admitted codex artefact of TYPE `LAW`, `REGULATION`, `STANDARD`, `POLICY`, or `INTERNAL_STANDARD`. A `PRINCIPLE` reference is the same error (§1) — it is not a silent drop. |
| `RIF-003` | error | `view.grouping.by` or `view.order_by` is set to a value outside the enumerated set in §4. |
| `RIF-004` | warning | Both `view.scope.codex.include` and `view.scope.codex.filter` are present (the include wins; the filter is silently ignored). |
| `RIF-005` | warning | The view selects zero codex artefacts after applying `include` / `filter` — the rendered list will be empty. Usually indicates a typo or that no artefacts of the requested kind have been admitted. |
| `RIF-006` | warning | `view.scope.codex.filter.jurisdiction` contains a value that is not ISO 3166-1 alpha-2, `eu`, or `intl` (the only values codex external artefacts permit, [14-codex.md](../../elements/14-codex.md) §1.1). |
| `RIF-007` | warning | A pattern in `view.scope.codex.exclude_paths` is not a valid glob string (unbalanced brackets or other malformed syntax). The renderer MUST skip the malformed pattern and emit this warning; it MUST NOT abort the render. |

The shared header rules `HDR-001..004` ([CONTRACT.md](../../CONTRACT.md) §2) apply in addition.

---

## 8. References

- Codex artefacts, TYPE registry, and the PRINCIPLE discriminator: [14-codex.md](../../elements/14-codex.md).
- REQUIREMENT element schema (the obligation; the `derived_from` link to a codex artefact): [15-requirement.md](../../elements/15-requirement.md).
- Compliance Impact — the sibling report-config view over the obligation × subject overlay: [21-compliance-impact.md](./21-compliance-impact.md).
- Coverage Metric — the sibling report-config view over per-regime coverage: [22-coverage-metric.md](./22-coverage-metric.md).
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) (`RULES_IN_FORCE` registered in §3.2).
- Reconstruction invariant (why view documents are not content homes): [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1.
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
- Architecture decision — reports are rendered from declarative view-configs, with a thin skill on top.
