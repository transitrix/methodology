---
title: "Named view-config convention — report registry"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-12"
status: "draft"
---

# Named view-config convention

**Scope:** Where saved, named view-configs live in an adopter repository, how they're named, how a reader lists them, and how a reader (or a tool, or the future report skill) re-runs one by name. This document **extends and codifies the existing report-config shape** declared by the three report-config view specs ([`11-scenarios.md`](11-scenarios.md), [`21-compliance-impact.md`](21-compliance-impact.md), [`22-coverage-metric.md`](22-coverage-metric.md)) — it does not introduce a new notation. Companion to [`ADR 2026-06-09 — Reports are rendered from declarative view-configs`](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md), Decision §1, §5, §7 (Step 1).

The convention is also the natural home for **any view document**, not only report-configs: every view notation in the catalogue ([README.md](../README.md) §Views) follows the same location and naming rule.

---

## 1. What is a "named view-config"

A *named view-config* is a committed view document — one file under [§2](#2-location) whose `view.id` matches the canonical TYPE grammar ([`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §3.2) for its notation, and whose contents declare the parameters of one specific render (filters, scope, grouping, ordering, status display).

A named view-config is **the parameter artefact of a report** ([ADR 2026-06-09](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Decision §1):

- versioned in the repository, so the report definition is diffable and attributable;
- re-runnable on demand, so "the same report next quarter" is a re-render against current canon;
- discoverable by name, so a reader (or the report skill — see [ADR §7 Step 3](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md)) can list and select reports without inspecting file contents.

A view file that lives anywhere else — an inline example under [`../examples/`](../examples/), a render-config inside a tool's runtime cache — is not a named view-config, even if its YAML shape is identical. Only files under [§2](#2-location) participate in the registry.

---

## 2. Location

```
<repo-root>/canon/views/<short-name>/<basename>.<short-name>.transitrix.yaml
```

| Path segment | Rule |
|---|---|
| `<repo-root>/canon/views/` | The single root of the registry in an adopter repo. The same root the [`canon/views/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/) example in the acme-corp reference repo uses. The view document lives under `canon/` for storage convenience — but it carries **no canonical content** of its own ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §1.1 reconstruction invariant): everything it displays is reconstructible from the elements alone. A view document is a presentation surface, not a canonical fact. |
| `<short-name>/` | One folder per view notation, named exactly as the notation's short name in [README.md](../README.md) §Views (e.g. `scenarios/`, `compliance-impact/`, `coverage-metric/`, `fgca/`, …). Tools list the registry per notation by walking these folders. |
| `<basename>` | `kebab-case` slug uniquely identifying this saved config within its folder. Typically the slug-form of `view.id`'s middle segment (e.g. `view.id: SCENARIOS-2027-CUT-1` ⇒ basename `2027-cut`), or a `[DOMAIN]-[CONTEXT]` prefix (e.g. `retail-gdpr`, `eu-compliance`). |
| `.<short-name>.transitrix.yaml` | The canonical file extension per [CONTRACT.md](../CONTRACT.md) §3 and the catalogue in [README.md](../README.md) §Views. The doc-lint [`scripts/check-notations.mjs`](../../scripts/check-notations.mjs) (E1) enforces extension + parent-folder match. |

The convention is uniform across **every** view notation, not only the three report-config notations.

---

## 3. Naming

A named view-config carries **two names**:

| Name | Where it lives | Purpose |
|---|---|---|
| **`view.id`** | inside the file | The canonical identifier. Grammar `<DOCUMENT_TYPE>-[<middle>-]<INTEGER>` per [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1; `<DOCUMENT_TYPE>` is the spec's registered document-level TYPE (e.g. `SCENARIOS`, `COMPLIANCE_IMPACT`, `COVERAGE_METRIC` per §3.2). Used in cross-references, validation messages, and renderer output. |
| **File basename** | filesystem | The handle a human (or a tool) types when listing or re-running. Convention: kebab-case slug derived from `view.id`'s middle segment, or a domain-context slug. No grammar enforced beyond filesystem rules + the extension contract in [§2](#2-location). |

The two names are loosely coupled by convention, not by validation. The renderer reads the file by path and trusts `view.id` for cross-reference resolution; a basename mismatch is a readability nit, not a validation error.

`view.name` (the human-readable string under `view.name:`) is a third, free-form label shown in the renderer output — not a registry handle.

---

## 4. Listing

A reader (or a tool, or the future report skill) lists the saved reports a repository carries by walking the registry root:

```
<repo-root>/canon/views/<short-name>/*.<short-name>.transitrix.yaml
```

Per notation, the listing entry for each file is the triple `(basename, view.id, view.name)`. Tools that surface a richer listing MAY also display `view.description` and, for report-configs, the subjects / obligations / regimes the view is scoped to.

The folder itself plays the role of the **small report registry** the [ADR](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Decision §5 names — no separate index file is maintained. The filesystem walk **is** the listing; this keeps the registry diffable, reviewable, and reproducible without an out-of-band catalogue to keep in sync.

A `README.md` per `canon/views/<short-name>/` folder is recommended for human navigation (the [acme-corp](https://github.com/transitrix/acme-corp/tree/main/canon/views/) example repo carries one per folder) but is not part of the listing contract — tooling reads the YAML, not the README.

---

## 5. Re-running by name

Re-running a saved view-config is a deterministic re-render — the renderer reads `(view-config, canon)` and emits the report ([ADR](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Decision §2). Two re-runs against the same canon produce identical output; two re-runs against a *changed* canon surface the canon change as a diff in the report, never as a configuration drift.

The supported invocations:

1. **By file path** (the power-user / CLI escape hatch — [ADR](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Alternative C):

       transitrix-view render canon/views/scenarios/2027-cut.scenarios.transitrix.yaml

2. **By notation + basename** (registry-style lookup):

       transitrix-view render --notation scenarios --name 2027-cut

   The tool resolves the basename to `canon/views/scenarios/2027-cut.scenarios.transitrix.yaml`.

3. **By `view.id`** (cross-reference-style lookup, for tooling that already carries the ID):

       transitrix-view render --id SCENARIOS-2027-CUT-1

   The tool walks `canon/views/scenarios/` and selects the file whose `view.id` matches.

4. **From a conversational front-end** (the thin report skill — [ADR](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Decision §3, Step 2): the skill materialises or selects a named view-config under [§2](#2-location), states the defaults it applied per [§6](#6-zero-configuration-default), and shells out to the same CLI. No render logic in the skill.

The CLI surface above is the convention this document fixes. The CLI implementation itself is tooling, delivered separately ([ADR](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Decision §7 Step 1 / Step 3).

---

## 6. Zero-configuration default

Every report-producing view spec ([`11-scenarios.md`](11-scenarios.md) §4, [`21-compliance-impact.md`](21-compliance-impact.md) §4 + §4.1, [`22-coverage-metric.md`](22-coverage-metric.md) §4 + §4.1) declares **explicit defaults** for every non-required field. A view-config that carries only the required envelope (`notation:`, `spec_version:`, `methodology_version:`, `view.id`, `view.name`) renders deterministically — each omitted field falls back to its spec default.

This is the surface the report skill leans on for its "what I assumed" message ([ADR](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md) Decision §4): given a free-text request without enough parameters, the skill materialises a minimal view-config under [§2](#2-location), renders it, and **states back** which defaults the spec applied ("full matrix, no jurisdiction filter — showing all"). The skill never invents defaults of its own; it never carries render logic.

Re-running a minimal view-config against a richer canon a quarter later picks up the canon delta automatically — the defaults explicitly cover "every `PRODUCT`", "every `REQUIREMENT`", and so on (per each spec's §4 / §4.1), so the report grows with the model without a configuration edit.

---

## 7. What this document does not change

- **No new notation.** This convention extends the three report-config view specs and the wider view-notation catalogue ([README.md](../README.md) §Views); no new `notation:` header, no new file extension, no new validation rule.
- **No new validator gate.** The doc-lint [`scripts/check-notations.mjs`](../../scripts/check-notations.mjs) (E1, E2) already covers the extension + header + parent-folder rules this document leans on. The location convention in [§2](#2-location) is a **deployment** convention — the existing extension rule already lets the lint catch most filesystem drift.
- **No render-logic homing.** The render contract for each view stays in its spec (e.g. [`21-compliance-impact.md`](21-compliance-impact.md) §5). This document is about the registry — where the parameter artefact lives and how it's named, listed, and re-run.

---

## 8. References

- ADR — reports rendered from declarative view-configs, with a thin skill on top: [`docs/decisions/2026-06-09-report-skill-over-declarative-views.md`](../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md).
- Reconstruction invariant — why a view document carries no canonical fact: [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §1.1.
- View-notation catalogue (short names + extensions): [`README.md`](../README.md) §Views.
- Document-level TYPE registry (`SCENARIOS`, `COMPLIANCE_IMPACT`, `COVERAGE_METRIC`, …): [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §3.2.
- File extension + header rules: [`CONTRACT.md`](../CONTRACT.md) §1, §3.
- Worked example registry: [`canon/views/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/) in the acme-corp reference repo.
- Report-config view specs:
  - [`11-scenarios.md`](11-scenarios.md) — Scenarios.
  - [`21-compliance-impact.md`](21-compliance-impact.md) — Compliance Impact.
  - [`22-coverage-metric.md`](22-coverage-metric.md) — Coverage Metric.
