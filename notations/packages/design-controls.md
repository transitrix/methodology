---
title: "Design Controls — engineering V&V + ISO 14971 risk chain — domain package"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-29"
status: "draft"
---

# Design-Controls Package — Reference

**Scope:** The `design-controls` domain package shipped under the [`PACKAGES.md`](../PACKAGES.md) mechanism — the engineering verification-and-validation (V&V) chain and the ISO 14971 risk-management chain (hazard → control → requirement → verification) for a regulated-product adopter (e.g. medical devices). This document is the package's own spec per [`PACKAGES.md`](../PACKAGES.md) §6.

This is a package, not a core notation: nothing here changes [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md)'s core TYPE registry, and none of it is admitted, validated, or rendered by core tooling. An adopter repository that does not declare `packages: [design-controls]` is unaffected by everything in this document — see [`PACKAGES.md`](../PACKAGES.md) §5.

**Origin.** This capability shipped as **core** in methodology 2.1.0, then moved here as a MAJOR-bump decision — the first package the mechanism has carried that was core first. Full context, the four core references severed, and the reasoning: ADR `methodology/2026-07-29-design-controls-as-a-package` (`vkgeorgia/strategy` architecture hub) and epic [`vkgeorgia/strategy#852`](https://github.com/vkgeorgia/strategy/issues/852).

---

## 1. Name and folder

- **Package name** (the `packages:` entry): `design-controls`.
- **Folder:** a top-level `design-controls/` folder in the adopter repository, at the same level as `canon/`, `field/`, `codex/` ([`PACKAGES.md`](../PACKAGES.md) §3) — **not** nested inside `canon/`, even though the three TYPEs below carry the same admission-record/lifecycle shape as core canon primitives (§2.4).

```yaml
transitrix: 1
methodology_version: "3.0.0"
packages: [design-controls]
```

Version note — an adopter upgrading from a methodology release where these TYPEs shipped as core must run the migration recipe before the `packages:` line above takes effect; see §7.

---

## 2. Object types and ID grammar

### 2.1 The three object kinds

Full schemas live in their own files, moved unchanged (as full specs, not summaries) from their former core location:

| Kind | File | What it holds |
|---|---|---|
| `VERIFICATION` | [`design-controls/verification.md`](design-controls/verification.md) | A first-class engineering V&V claim — protocol, method, result, pass/fail outcome — against a core `REQUIREMENT`. |
| `HAZARD` | [`design-controls/hazard-risk-control.md`](design-controls/hazard-risk-control.md) §2 | A potential source of harm — ISO 14971 severity/probability/initial-risk classification. |
| `RISK_CONTROL` | [`design-controls/hazard-risk-control.md`](design-controls/hazard-risk-control.md) §3 | A measure that mitigates one or more `HAZARD`s, optionally realised as a core `REQUIREMENT` via `satisfies`. |

Plus one report-config view, also package content:

| Kind | File | What it holds |
|---|---|---|
| `DC_TRACE_MATRIX` | [`design-controls/trace-matrix-view.md`](design-controls/trace-matrix-view.md) | The design-controls trace-matrix report-config — a rendering/filtering surface over the three TYPEs above plus the core `REQUIREMENT`; carries no canonical content of its own. |

### 2.2 ID grammar — unchanged from core, disjointness by TYPE-name removal

Unlike the [`reqif`](reqif.md) package (§2.2 there), this package's IDs are **not** reshaped into a new lowercase grammar. `VERIFICATION-…`, `HAZARD-…`, `RISK_CONTROL-…`, and `DC_TRACE_MATRIX-…` keep the exact `TYPE-NAME-<integer>` grammar they carried as core TYPEs ([`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1) — this is a deliberate choice, not an oversight, made explicit here because it departs from the reqif precedent:

- [`PACKAGES.md`](../PACKAGES.md) §4.1's disjointness requirement exists so that a reference to a package object cannot be mistaken for a resolvable core reference, and is rejected by *existing* referential-integrity checking with no package-aware code added to core. That guarantee holds here **by TYPE-name removal**, not by grammar reshaping: once `VERIFICATION`, `HAZARD`, and `RISK_CONTROL` are removed from the core registry (§2.3), a core validator encountering an id with one of these TYPE prefixes has no registry entry to resolve it against — it is rejected exactly as any other unknown TYPE reference would be. No visual-shape ambiguity survives in practice, because the ambiguity `PACKAGES.md` §4.1 guards against is resolution against a *closed core registry*, not resolution by a human eye.
- Reshaping these IDs was considered and rejected for this package: the TYPEs shipped as core in 2.1.0 with real adopter-authored content already using this grammar (`acme-corp` among them). Rewriting every existing id would multiply the migration's blast radius (§7) for no reversibility gain the TYPE-name-removal argument above does not already provide. The ADR's "what moves" and "core references severed" sections name every change this decision required, and an ID-grammar change is not among them.
- This is exactly the kind of contract question [`PACKAGES.md`](../PACKAGES.md) did not anticipate, surfaced by the first package built from a core capability rather than authored fresh (per the ADR's closing note). It is recorded here, resolved for this package, rather than silently worked around.

### 2.3 Core registry entries removed

`VERIFICATION` (formerly [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §3.7), `HAZARD` and `RISK_CONTROL` (formerly §3.1), and `DC_TRACE_MATRIX` (formerly §3.2) no longer appear in the core registry. A core validator has no entry to resolve an id with these TYPE prefixes against — see §2.2.

### 2.4 Admission record and lifecycle — unchanged from core

Each of the three element TYPEs carries the same admission-record fields ([`CONTRACT.md`](../CONTRACT.md) §6 — `zone: canon`, `admitted_at`, `admitted_by`, `gate_checks`) and primitive-lifecycle fields (§7 — `valid_from`, `valid_to`) they carried as core primitives. This is unchanged by the move — see the per-type spec files (§2.1) for the full frontmatter. Whether a package object should still literally carry `zone: canon`, given [`PACKAGES.md`](../PACKAGES.md) §3 states a package "is not a zone", is a nuance the ADR does not resolve; it is flagged here rather than silently decided, and is not a blocking question for this package's validity — the field is inert now that `canon` no longer governs where these files live.

### 2.5 File layout

```
design-controls/
  hazards/<ID>.yaml
  risk-controls/<ID>.yaml
  verifications/<ID>.yaml
```

Plus, wherever an adopter keeps its report-config views (per [`REPORT_VIEW_CONFIG.md`](../views/REPORT_VIEW_CONFIG.md)'s registry convention), zero or more `*.design-controls-trace-matrix.transitrix.yaml` documents.

---

## 3. The one permitted cross-reference — into core `REQUIREMENT`

Per [`PACKAGES.md`](../PACKAGES.md) §4.1, a package object may reference a core element by id; no core element may reference a package object. This package has **two** such one-way references, both ordinary typed-ID fields (not a special citation shape, unlike reqif's `Transitrix.CanonRef` — the design-controls chain already targets `REQUIREMENT` directly by construction):

- `VERIFICATION.verifies` — the core `REQUIREMENT-…` a verification protocol was run against.
- `RISK_CONTROL.satisfies` — the core `REQUIREMENT-…` a risk control is realised as (optional).

The package's own validator (§5) resolves both when the package is declared; when it is absent, no core validator reads either field (they are TYPE-unknown, per §2.2), and the reference is simply inert.

### 3.1 The compliance ↔ V&V bridge — opaque citation on `ASSERTION`

The reverse direction — a compliance `ASSERTION.evidence[]` citing a `VERIFICATION` as supporting evidence — is a **core → package reference as written before this move** (an `evidence[]` entry with `kind: canonical_ref` resolved by `ASSERT-005` against any admitted canonical element, `VERIFICATION` included). Severing it outright would remove a capability adopters in this domain actually use, so it survives reshaped, per the ADR §2.1:

`ASSERTION.evidence[]` now supports a dedicated `verification_ref` kind — see [`../elements/16-assertion.md`](../elements/16-assertion.md) §4. Its `ref` value is an **opaque string**, never resolved by `ASSERT-005` or any other core validator. When this package is declared, its own validator (§5) MAY resolve `ref` and check the cited verification's outcome; when the package is absent, the citation carries **no integrity guarantee** — nothing confirms the cited id exists or ever existed. This asymmetry is deliberate (ADR §2.1, §2.5) and is stated here in the terms an adopter reading such an assertion needs: a `verification_ref` citation is documentary only unless `design-controls` is declared.

---

## 4. The trace-matrix view

[`design-controls/trace-matrix-view.md`](design-controls/trace-matrix-view.md) is the package's report-config view — `DC_TRACE_MATRIX`, file extension `*.design-controls-trace-matrix.transitrix.yaml`. It renders the requirement chain (`REQUIREMENT` → `VERIFICATION`) and the risk chain (`HAZARD` → `RISK_CONTROL` → `REQUIREMENT` → `VERIFICATION`) from canon plus the package folder, annotating gaps with the reverse-trace completeness rules in §5. See that file for the full render contract, field reference, and gap-label table.

---

## 5. Validation rules — the package's own validator

| Rule | Severity | Description |
|---|---|---|
| `VERIF-001`..`006` | error / warning | `VERIFICATION` schema and reference validity — see [`design-controls/verification.md`](design-controls/verification.md) §5. |
| `HAZ-001`..`004` | error | `HAZARD` schema validity — see [`design-controls/hazard-risk-control.md`](design-controls/hazard-risk-control.md) §6. |
| `RISKCTL-001`..`005` | error | `RISK_CONTROL` schema and reference validity — same spec, §6. |
| `HAZ-RISKCTL-COVERAGE-001` / `-002` | warning | Hazard has no / no adequately-controlled `RISK_CONTROL` — same spec, §6. |
| `REQ-VERIF-COVERAGE-001` / `-002` | warning | Requirement has no / no closed `VERIFICATION` — [`design-controls/verification.md`](design-controls/verification.md) §5. |
| `RISKCTL-VERIF-COVERAGE-001` | warning | A `RISK_CONTROL`'s `satisfies` requirement lacks V&V closure — [`design-controls/hazard-risk-control.md`](design-controls/hazard-risk-control.md) §6. |
| `DCTM-001`..`007` | error / warning | Trace-matrix view-config validity — [`design-controls/trace-matrix-view.md`](design-controls/trace-matrix-view.md) §7. |

**Status note.** These rules were specified against core tooling while the capability shipped as core, but — confirmed while moving this package — were never wired into `scripts/check-notations.mjs` or any other core validator as executable code; they existed as spec-only obligations. No core validator code is removed by this move (§4.2 of the mechanism is satisfied vacuously: there was nothing in core to un-wire). **Shipping these rules as the package's own executable validator (a `packages/design-controls-cli` in the shape `packages/reqif-cli` established) is deferred to a follow-up task**, tracked against epic [`vkgeorgia/strategy#852`](https://github.com/vkgeorgia/strategy/issues/852) alongside the ISO 14971 §3 "enforcement lives in the package" authoring-time surfacing the ADR's decision 1 calls for. Until that lands, an adopter declaring this package validates these rules by reading the spec, the same posture core validation had before this move — the package's spec files remain the authoritative source (per [`PACKAGES.md`](../PACKAGES.md) §6, "Validator: what the package's own tooling checks, and where that tooling lives" — today, "not yet built" is an honest answer to "where", not a gap silently left unstated).

The reference renderer, [`packages/design-controls-cli/render_trace_matrix.py`](../../packages/design-controls-cli/render_trace_matrix.py) (moved from `tools/render_trace_matrix.py`, with its canon-loading paths repointed at the package's `design-controls/hazards|risk-controls|verifications` folders per §2.5 — everything else unchanged), already computes the coverage-rule logic for rendering purposes (§4) — it is a renderer, not a validator: it annotates gaps in its output rather than failing a validation pass.

---

## 6. Removal procedure

Per [`PACKAGES.md`](../PACKAGES.md) §4.3, removal is the baseline two-step procedure — this package adds no package-specific step:

1. Delete the `design-controls/` folder from the adopter repository root.
2. Remove `design-controls` from the `packages:` list in `transitrix.yaml` (or delete the whole `packages:` line, if `design-controls` was the only entry).

After removal: no `HAZARD` / `RISK_CONTROL` / `VERIFICATION` / `DC_TRACE_MATRIX` id is admitted anywhere in `canon/`, no rule in §5 runs, no view renders, and a `verification_ref` citation on any surviving `ASSERTION` reverts to fully inert (§3.1) — the repository is valid and carries no trace of the package having existed.

**Demonstrated as a test, not asserted in prose** ([`PACKAGES.md`](../PACKAGES.md) §4.3): the worked examples at [`../examples/packages/design-controls/`](../examples/packages/design-controls/) (happy-path chain) and its sibling [`reverse-trace-gaps/`](../examples/packages/design-controls/reverse-trace-gaps/) (seeded reverse-trace gaps) are the package's own worked instances per §6 of this document. **A removal test against these fixtures, exercising the same shape as [`packages/reqif-cli/tests/test_reqif_integrity.py`](../../packages/reqif-cli/tests/test_reqif_integrity.py) Part F, is deferred alongside the validator in §5** — both land together, since the test's assertions (steps b/c) depend on the validator existing to confirm "every remaining `canon/` file still parses" after removal. Reversibility rule 1 (package → canon only, never the reverse) is already true of the fixtures as authored: `canon/elements/01_motivation/requirements/REQUIREMENT-DEVICE-ALARM-1.yaml` in the happy-path fixture carries no reference into `design-controls/`.

---

## 7. Migration — MAJOR bump

Per the ADR §5, moving TYPEs that shipped as core in 2.1.0 out to a package is **not additive** — it requires a MAJOR methodology-version bump and a migration recipe under `migrations/`, because core tooling has no message for a TYPE it no longer knows ([`PACKAGES.md`](../PACKAGES.md) §5): an adopter who upgrades without declaring the package would otherwise see their existing `HAZARD` / `RISK_CONTROL` / `VERIFICATION` files fail as unresolvable references with no diagnostic pointing at the actual cause.

**Deferred to a follow-up task** (epic [`vkgeorgia/strategy#852`](https://github.com/vkgeorgia/strategy/issues/852)): the recipe must **detect** existing `canon/elements/01_motivation/hazards/`, `canon/elements/01_motivation/risk-controls/`, and `canon/verifications/` content in an upgrading repository (rather than relying on release notes being read), and mechanically (a) add `design-controls` to `packages:`, (b) relocate the three folders' contents to `design-controls/hazards/`, `design-controls/risk-controls/`, `design-controls/verifications/` respectively, with **no id rewrite** (§2.2). `acme-corp`'s own migration (moving its worked design-controls content into this package, per ADR §6) is the recipe's first real run and is tracked as its own task in the same epic, alongside `organizations/acme_corp/` submodule considerations noted in this repo's `CLAUDE.md`.

This package spec, the severed core references (§2.3, and [`CONTRACT.md`](../CONTRACT.md) §8 / [`COVERAGE_PROFILES.md`](../COVERAGE_PROFILES.md) §2.1 / [`elements/15-requirement.md`](../elements/15-requirement.md) §4), and the three moved spec files constitute the methodology-repo-side of this decision. The version pin above (§1) anticipates the bump landing with the migration recipe, not with this document alone — this document does not itself claim the MAJOR release has shipped.

---

## 8. Experimental status and review date

This package is **experimental**, in full. Landed (as a package) 2026-07-29. Reviewed by **2027-01-28** (six months out, matching the [`reqif`](reqif.md) package's review cadence), or sooner once the validator (§5), the removal test (§6), and the migration recipe (§7) land and real adopter usage — starting with `acme-corp`'s own migration — surfaces a shape problem before then.

Per [`PACKAGES.md`](../PACKAGES.md) §6, core specs are never refactored to accommodate this package's experimental surface while it carries this status. The four core references severed by this move ([`CONTRACT.md`](../CONTRACT.md) §8, [`COVERAGE_PROFILES.md`](../COVERAGE_PROFILES.md) §2.1, [`elements/15-requirement.md`](../elements/15-requirement.md) §4, [`elements/16-assertion.md`](../elements/16-assertion.md) §4) are a one-time cost of the move itself, not an ongoing accommodation of this package's rough edges.

---

## 9. Evolution

**Landed (v0.1, 2026-07-29):** package spec, moved element/view specs ([`design-controls/verification.md`](design-controls/verification.md), [`design-controls/hazard-risk-control.md`](design-controls/hazard-risk-control.md), [`design-controls/trace-matrix-view.md`](design-controls/trace-matrix-view.md)), moved reference renderer ([`packages/design-controls-cli/render_trace_matrix.py`](../../packages/design-controls-cli/render_trace_matrix.py)), moved worked examples ([`../examples/packages/design-controls/`](../examples/packages/design-controls/), [`../examples/packages/design-controls-trace-matrix/`](../examples/packages/design-controls-trace-matrix/)), and the four core references severed. Per ADR `methodology/2026-07-29-design-controls-as-a-package` and epic `vkgeorgia/strategy#852`.

**Not yet landed** (tracked as follow-up tasks against the same epic): the package's own executable validator (§5), the removal test (§6), the migration recipe and MAJOR version bump (§7), and the `acme-corp` content scrub (ADR §6).

---

## 10. References

- [`PACKAGES.md`](../PACKAGES.md) — the mechanism this package is shipped under.
- [`reqif.md`](reqif.md) — the sibling package this one departs from on ID-grammar reshaping (§2.2) — read together, the two packages are the mechanism's first two real tests.
- [`design-controls/verification.md`](design-controls/verification.md), [`design-controls/hazard-risk-control.md`](design-controls/hazard-risk-control.md), [`design-controls/trace-matrix-view.md`](design-controls/trace-matrix-view.md) — the full per-type specs.
- [`../elements/15-requirement.md`](../elements/15-requirement.md) — the core `REQUIREMENT` TYPE this package's two forward references target.
- [`../elements/16-assertion.md`](../elements/16-assertion.md) §4 — the `verification_ref` opaque-citation evidence kind (§3.1 above).
- [`../CONTRACT.md`](../CONTRACT.md) §8, [`../COVERAGE_PROFILES.md`](../COVERAGE_PROFILES.md) §2.1 — the core specs edited to sever their design-controls references.
- ADR `methodology/2026-07-29-design-controls-as-a-package` (`vkgeorgia/strategy` architecture hub) — the decision record.
