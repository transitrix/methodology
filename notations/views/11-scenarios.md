---
notation: "Scenarios"
version: "0.5"
author: "Valerii Korobeinikov"
last_updated: "2026-06-12"
status: "draft"
file_extension: "*.scenarios.transitrix.yaml"
dsm_status: "implemented — Scenarios page; selector reclassification (v0.3) planned for next cut"
---

# Scenarios — Report-Configuration View — Reference

**Version:** 0.4
**Date:** 2026-06-12
**Status:** Draft — the v0.2 "scenario document scopes its own goals/capabilities/activities/…" shape was retired by the SCENARIO reclassification; this revision documents the post-reclassification, report-config shape. **v0.4 pins explicit defaults on every non-required field and adds the §4.1 zero-configuration default** (per the *reports rendered from declarative view-configs* architecture decision, §7 Step 1) so the report skill has a well-defined "what I assumed" fallback.
**File extension:** `*.scenarios.transitrix.yaml`
**Scope:** A **rendering / ordering / filtering configuration** for the Scenarios view over the `SCENARIO` content-element catalogue (`canon/elements/05_implementation/scenarios/`). The document is a presentation surface — it carries no canonical content of its own.
**Renderer:** Transitrix DSM — Scenarios page; Transitrix Studio (planned).

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `scenarios` |
| File extension | `*.scenarios.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `scenarios` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `view` | yes | object | the scenario view config — see §3 and §4 |

Example header:

```yaml
notation: scenarios
spec_version: "0.3"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
methodology_version: "3.1.0"
view:
  # ... see §3
```

---

## 1. Reclassification (2026-06-03)

The v0.2 spec made the `scenarios` document the **content home** for a scenario: a single document carried the scenario's vision, its goals, its capabilities, its activities, its products, its processes, its applications, and its per-scenario driver view. That conflated three things — the *path* (the ordered sequence of steps to move the enterprise), the *destination* (the structural end-state the path reaches), and the *intent* (the goals the path serves) — into one container, and put substantial canonical content inside a view document in violation of the reconstruction invariant ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1).

The SCENARIO reclassification split those three concerns into separate primitives:

- **`GOAL`** — the intent. (Pre-existing motivation-layer element.)
- **`TARGET_STATE`** — the structural snapshot of the `CAPABILITY` / `PROCESS` / `APPLICATION` selection that exists when one or more goals are met (ArchiMate **Plateau**). Schema: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.17.
- **`SCENARIO`** — the **path**: the ordered set of steps (`ACTION` / `CHANGE` — Work Packages + Gaps) that moves the enterprise to one target state in service of one or more goals (ArchiMate **Course of Action**). Schema: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.18.

The `scenarios` view document is **demoted to report-config**: rendering, ordering, and filtering knobs over the `SCENARIO` catalogue. It carries no canonical facts; the path/destination/intent live on the three element primitives above.

---

## 2. When to use this view

| Use case | Notation |
|---|---|
| Render one or more `SCENARIO` elements on a Scenarios page with chosen ordering / filtering. | Scenarios view |
| Compare scenarios side-by-side that share a target state or a goal. | Scenarios view |
| Define which scenarios are visible by default for a working session. | Scenarios view |

For the canonical authoring of a path / destination / intent, use the element primitives, not this view:

| Concern | Authored as |
|---|---|
| The ordered steps that *get you there* (the path). | `SCENARIO` element ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.18) at `canon/elements/05_implementation/scenarios/SCENARIO-<…>.yaml`. |
| The structural end-state the path reaches (the destination). | `TARGET_STATE` element ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.17) at `canon/elements/05_implementation/target-states/TARGET_STATE-<…>.yaml`. |
| The intent (which goals the path serves; which goals the end-state satisfies). | `GOAL` elements; plus `SCENARIO.pursues` (inline, the path's intent) and the `target_state_satisfies_goal` REL kind ([elements/17-relations.md](../elements/17-relations.md) §3). |
| Per-driver findings that motivate a scenario. | `ASSESSMENT` elements + the `assessment_influences_goal` REL kind. |
| Per-driver "drivers view" (relevance / impact). | Not modelled in v1 as a per-scenario projection — express via `ASSESSMENT` and the influence REL kind, which are goal-relative rather than scenario-relative. |

---

## 3. Document structure

A scenarios view file is a short, declarative report config. It does not own any canonical content. Two top-level keys:

```yaml
notation: scenarios
spec_version: "0.3"
name: "Optimistic vs Conservative — 2027 cut"   # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"                       # optional per CONTRACT.md §4
methodology_version: "3.1.0"

view:
  id: SCENARIOS-<NAME>-1
  name: "Optimistic vs Conservative — 2027 cut"
  description: "Side-by-side rendering of the two candidate paths for the 2027 strategic horizon."

  # Which SCENARIO elements this view renders. Either an explicit include list,
  # or a filter. If both are present, `include` wins and `filter` is ignored.
  scenarios:
    include: [SCENARIO-OPTIMISTIC-1, SCENARIO-CONSERVATIVE-1]
    # filter:
    #   arrives_at: TARGET_STATE-OMNI-2028-1
    #   pursues_any: [GOAL-REVENUE-3X-2028-1]

  # Optional ordering and presentation knobs.
  order_by: "name"            # name | id | arrives_at | (custom comparator declared elsewhere)
  layout: "side-by-side"      # side-by-side | stacked | summary-table
  show_steps: true            # render the ordered steps of each scenario
  show_target_state: true     # render the arrives_at composition inline
  show_pursues: true          # render the goal list each path pursues
```

The document carries the canonical envelope (`notation:` header, `spec_version:`, `methodology_version:` pin per [CONTRACT.md](../CONTRACT.md) §10), a `view` object, and presentation fields under it. Nothing under `view` is canonical content — it is all rendering configuration.

---

## 4. Fields

Every field carries an explicit default, so a view with only the required envelope (`view.id`, `view.name`) renders deterministically — see §4.1.

| Field | Required | Type | Default | Semantics |
|---|---|---|---|---|
| `view.id` | yes | string | — (required) | View identifier, canonical-grammar (`SCENARIOS-…`) per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.2 (`SCENARIOS` document-level TYPE). |
| `view.name` | yes | string | — (required) | Human-readable name shown in the renderer. |
| `view.description` | no | string | empty | Short description of the purpose of this view (which scenarios it groups, why). |
| `view.scenarios.include` | no ¹ | list | unset (use `filter`, or the full set) | Explicit list of `SCENARIO-…` IDs to render, in display order. |
| `view.scenarios.filter` | no ¹ | object | **no filter — every admitted `SCENARIO` in canon** | Declarative filter — `arrives_at: TARGET_STATE-…`, `pursues_any: [GOAL-…]`, `pursues_all: [GOAL-…]`. The renderer resolves the filter against the `SCENARIO` catalogue at render time. |
| `view.order_by` | no | string | `name` | Ordering key: `name`, `id`, `arrives_at`, or a custom comparator declared elsewhere. |
| `view.layout` | no | string | `side-by-side` | Render layout: `side-by-side`, `stacked`, or `summary-table`. |
| `view.show_steps` | no | bool | `true` | Whether to render each scenario's ordered `steps` inline. |
| `view.show_target_state` | no | bool | `true` | Whether to render each scenario's `arrives_at` target-state composition inline. |
| `view.show_pursues` | no | bool | `true` | Whether to render each scenario's `pursues` goal list inline. |

¹ **`scenarios`** — both keys are optional and only ever *narrow* the rendered set. Omitting them is the zero-config default: the renderer renders **every admitted `SCENARIO`** in canon (sorted by the default `order_by: name`). Name `include` or `filter` to narrow to a specific cut. If both `include` and `filter` are present, `include` wins and `filter` is silently ignored — same precedence as the obligation axis in [`21-compliance-impact.md`](21-compliance-impact.md) §4.

All references in `view.scenarios.include`, `view.scenarios.filter.arrives_at`, and `view.scenarios.filter.pursues_*` resolve to canon primitives via the usual cross-reference rule ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §5).

### 4.1 Zero-configuration default

A view that carries only the required envelope —

```yaml
notation: scenarios
spec_version: "0.3"
name: "All scenarios"                   # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"             # optional per CONTRACT.md §4
methodology_version: "3.1.0"
view:
  id: SCENARIOS-ALL-1
  name: "All scenarios"
```

— renders **deterministically**: every admitted `SCENARIO` in canon, side-by-side, with each scenario's `steps`, `arrives_at`, and `pursues` rendered inline, ordered by `name`. This is the fallback the report skill (per the *reports rendered from declarative view-configs* architecture decision, §4) states back to the user as "all scenarios, no filter". Each field a caller omits falls back to its §4 default; the result is reproducible from canon alone.

Where a named, saved view-config of this notation lives in an adopter repo, and how a reader lists or re-runs it by name, is the registry convention in [`REPORT_VIEW_CONFIG.md`](REPORT_VIEW_CONFIG.md).

---

## 5. Relationship to other notations and elements

```
Scenarios view (this notation — report-config)
  ├── renders → SCENARIO elements              (ELEMENT_PRIMITIVES.md §7.18 — the path)
  ├── (each scenario)
  │     ├── pursues  → GOAL elements           (inline list — the intent)
  │     ├── arrives_at → TARGET_STATE element  (ELEMENT_PRIMITIVES.md §7.17 — the destination)
  │     └── steps    → ACTION / CHANGE          (inline ordered list — the execution sequence)
  └── (each target state, via the path's arrives_at)
        ├── composition → CAPABILITY / PROCESS / APPLICATION (inline)
        └── satisfies   → GOAL                 (target_state_satisfies_goal REL kind)
```

---

## 6. Existing examples (pending migration)

The example files under [`../examples/scenarios/`](../examples/scenarios/) (`optimistic-2027.scenarios.transitrix.yaml`, `omnichannel-2028.scenarios.transitrix.yaml`) reflect the **v0.2 content-document shape** — they carry the now-reclassified `scenario.vision` / `scenario.goals` / `scenario.capabilities` / `scenario.activities` / `scenario.products` / `scenario.processes` / `scenario.applications` / `scenario.factors_view` fields inline. They predate the reclassification and are scheduled for migration in a follow-up sub-task. They remain valid YAML and continue to carry the `notation: scenarios` header.

---

## 7. References

- SCENARIO element schema (the path): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.18.
- TARGET_STATE element schema (the destination): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.17.
- `target_state_satisfies_goal` REL kind (which goals an end-state satisfies): [elements/17-relations.md](../elements/17-relations.md) §3.
- ID grammar and TYPE registry: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md).
- Reconstruction invariant (why view documents are not content homes): [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1.
- Named view-config convention (where this view's saved configs live, how they're named, listed, and re-run): [REPORT_VIEW_CONFIG.md](REPORT_VIEW_CONFIG.md).
- Architecture decision — reports are rendered from declarative view-configs, with a thin skill on top.
