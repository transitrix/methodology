---
title: "Coverage Profile — selective vocabulary for an adopter repository"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-03"
status: "draft"
---

# Coverage Profile

**Scope:** The mechanism an adopter uses to declare *which slice of the methodology's vocabulary is in scope for this repository*. A profile bounds the allowed element TYPEs (per layer) and the allowed relation TYPEs (per layer); tools — Studio, DSM, validators — read it as the single source of truth for what may be written, generated, or validated.

A repository without a profile defaults to **`full`** — the entire vocabulary of the pinned methodology version. A repository with a profile narrows or shapes that vocabulary so the absence of excluded scope reads as a *deliberate choice*, not a gap.

The shape of the profile, the closure rule, and the document-validation behaviour below were settled by methodology canon on 2026-05-31.

This document bounds the **depth** of the *core* vocabulary only. A repository may separately opt into an **optional domain package** — a bounded, removable extension that sits alongside the core registry rather than inside it. That second, orthogonal axis is defined in [`PACKAGES.md`](PACKAGES.md); it does not change anything below.

---

## 1. Where the profile lives

A profile is declared at the repository root in `transitrix.yaml` under the `coverage_profile` key. The manifest schema (the `transitrix.yaml` envelope itself) is defined in [`MANIFEST.md`](MANIFEST.md); this document defines the value side of the `coverage_profile` field.

```yaml
transitrix: 1
methodology_version: "3.5.0"
notations: [dgca, goals, activities, capability-map]
zones: [canon, field]
coverage_profile: core         # short form — name a shipped preset
```

There is **one profile per repository**. Per-folder and per-notation profile overrides are out of scope (same rule as `methodology_version` per [`CONTRACT.md`](CONTRACT.md) §10.1).

---

## 2. What a profile bounds

A profile bounds two things:

1. **Per-layer element TYPEs** — which canonical element TYPEs from the registry ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1) may appear in each layer (`01_motivation`, `02_business`, `03_application`, `04_technology`, `05_implementation`).
2. **Per-layer relation TYPEs** — which `REL` kinds from the closed enum in [`elements/17-relations.md`](elements/17-relations.md) §3 may appear, bucketed by the layer of the relation's `from` endpoint.

The two axes the epic body names — **layer selection** (axis 1) and **type depth within a layer** (axis 2) — are the same mechanism: a layer is *disabled* when its element allowlist is empty. The coarse layer on/off toggle is sugar over the allowlist (§5.3).

Notation files themselves (`notations:` in the manifest) are governed by `MANIFEST.md`; the profile does not also restrict notations. A notation that produces an out-of-profile element is constrained by §6 (document validation), not by removing the notation from the list.

### 2.1 What a profile does NOT bound

- **Attribute-level restrictions within a TYPE.** Out of scope for v1 (see §10).
- **Codex artefacts.** `LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD` live in the `codex/` zone, not `canon/elements/<layer>/`, and are governed by the `codex` notation ([`elements/14-codex.md`](elements/14-codex.md)) and the manifest's `zones:` field — not by this profile.
- **The cross-cutting primitives `ASSERTION`, `VERIFICATION`, and `REL`.** `ASSERTION` lives at `canon/assertions/` and `VERIFICATION` at `canon/verifications/` (neither is layer-placed); `REL` lives at `canon/relations/`. ASSERTION is governed by [`elements/16-assertion.md`](elements/16-assertion.md) directly and VERIFICATION by [`elements/27-verification.md`](elements/27-verification.md) directly — neither is bounded by a profile. The set of permitted REL **kinds** is what the profile bounds (§2 above); the `REL` TYPE itself is always available when at least one relation kind is allowed.
- **Subtype values within a TYPE.** A profile says *which TYPEs are in scope*, not which `type:` subtype values are allowed within a TYPE. ACTOR's `type ∈ {person, business_unit, system}` is fixed by the ACTOR spec.

---

## 3. Shipped presets

The methodology ships three presets. Each is defined at the version pinned in `methodology_version`; the same preset name may resolve to a different vocabulary in a different methodology release.

| Preset | Intent | Element TYPEs (in scope) |
|---|---|---|
| **`minimal`** | Bare strategy-to-execution chain. A small product or programme team that talks in drivers, goals, and work — no capabilities, applications, target states, or actors. | 01_motivation: `DRIVER`, `GOAL` · 05_implementation: `ACTION` |
| **`core`** | Typical EA repository. ArchiMate-aligned baseline modelling — motivation chain through capabilities, processes, applications, and a delivery plan. No advanced motivation analysis (assessment/influence) and no planning model (target states / scenarios). | 01_motivation: `DRIVER`, `GOAL`, `CONSTRAINT`, `REQUIREMENT`, `STAKEHOLDER` · 02_business: `CAPABILITY`, `PROCESS`, `ACTOR`, `ROLE`, `RULE` · 03_application: `APPLICATION`, `INTEGRATION` · 05_implementation: `ACTION`, `CHANGE`, `MILESTONE` |
| **`full`** | The complete vocabulary of the pinned methodology version. The default when `coverage_profile` is omitted. | Every TYPE in [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1. |

### 3.1 Per-preset relation allowlists

| Preset | Allowed relation kinds (per `from` layer) |
|---|---|
| **`minimal`** | 01_motivation: `goal_parent` · 05_implementation: `action_goal` |
| **`core`** | 01_motivation: `goal_parent`, `stakeholding`, `depends_on` · 02_business: `parent`, `unit_parent`, `employment` · 05_implementation: `action_goal` |
| **`full`** | Every relation kind in [`elements/17-relations.md`](elements/17-relations.md) §3. |

The presets compose by subset — every TYPE in `minimal` is in `core`; every TYPE in `core` is in `full`. This is a property of the v1 presets, not a general rule: a future preset may slice the vocabulary along a different axis (e.g. a `compliance` preset that adds `REQUIREMENT`/`ASSERTION` to `minimal` without adding `CAPABILITY`).

---

## 4. Custom profiles

A custom profile **extends a shipped preset by adding and/or removing TYPEs**. The hard boundary is the vocabulary of the pinned methodology version — a custom profile cannot reach outside the registry.

```yaml
coverage_profile:
  extends: core                # required — the preset this profile starts from
  pinned_to: "0.5.0"           # optional — see §7
  layers:
    01_motivation:
      elements:
        add: [ASSESSMENT]
        remove: []
      relations:
        add: [assessment_influences_goal]
        remove: []
    02_business:
      elements:
        remove: [RULE]
    04_technology:
      elements:
        add: []                # explicitly empty — layer stays disabled
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `extends` | yes | enum | Name of a shipped preset (§3) or another named profile. Custom profiles always extend something — never start from nothing. |
| `pinned_to` | no | string (SemVer) | Methodology version this profile was authored against. When present, must equal `methodology_version`; otherwise the profile is rejected as stale. See §7. |
| `layers` | no | map | Per-layer delta. A layer key omitted from the delta inherits the preset's allowlist for that layer unchanged. |
| `layers.<id>.elements.add` | no | list | Element TYPEs added to the preset's allowlist for this layer. Must exist in the registry; must belong to this layer per [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §6. |
| `layers.<id>.elements.remove` | no | list | Element TYPEs removed from the preset's allowlist for this layer. |
| `layers.<id>.relations.add` | no | list | Relation kinds added to the preset's allowlist for this layer (bucket = `from`-endpoint layer per [`elements/17-relations.md`](elements/17-relations.md) §3). |
| `layers.<id>.relations.remove` | no | list | Relation kinds removed from the preset's allowlist for this layer. |

### 4.1 Resolution order

The validator resolves a custom profile in three steps:

1. **Materialise the preset.** Expand `extends:` into the full per-layer allowlists (elements + relations) for the pinned version.
2. **Apply the delta.** For each layer in `layers:`, apply `remove` then `add` to the preset's allowlists.
3. **Check closure.** Run the closure rule (§5) against the resolved profile. A profile that fails closure is rejected.

A delta that `add`s a TYPE already in the preset is a no-op (warning, not error). A delta that `remove`s a TYPE not in the preset is a no-op (warning).

---

## 5. Closure — internal consistency of a profile

A profile is **closed** when every TYPE in its final allowlist can be used without referencing a TYPE that is *not* in the allowlist. Closure is required: the validator rejects an inconsistent profile at admission, **not** at the first document that hits the inconsistency.

### 5.1 Closure rule

For every element TYPE `T` in the final allowlist:

- For every **required** cross-reference field on `T` whose declared target TYPE is `U`, if `U` is not in the final allowlist, the profile fails closure.
- For every **first-class relation kind** declared time-aware on `T` ([`elements/17-relations.md`](elements/17-relations.md) §6), if the relation kind is not in the allowlist, the profile fails closure.

For every relation kind `R` in the final allowlist:

- Each endpoint TYPE in the §3 enum for `R` must be in the final allowlist. (For relation kinds with disjunctive endpoint TYPEs — e.g. `stakeholding`'s `to` is `GOAL | ACTION | CAPABILITY` — **at least one** of the alternatives must be in the allowlist; otherwise the relation has no valid endpoints.)

### 5.2 Rejection message (required form)

A closure failure MUST name the offending TYPE, the required-but-excluded TYPE, and what to do. Example:

```
COVERAGE-CLOSURE: STAKEHOLDER is in this profile (layer 01_motivation) but
ACTOR is not in any layer's allowlist. STAKEHOLDER.actor is a required
reference to an ACTOR per notations/elements/20-stakeholders.md.

Fix: either
  - add ACTOR to layer 02_business.elements, or
  - remove STAKEHOLDER from layer 01_motivation.elements.
```

The same template applies to a relation-kind failure:

```
COVERAGE-CLOSURE: assessment_influences_goal is in this profile (layer
01_motivation.relations) but ASSESSMENT is not in layer 01_motivation.elements.

Fix: either
  - add ASSESSMENT to layer 01_motivation.elements, or
  - remove assessment_influences_goal from layer 01_motivation.relations.
```

### 5.3 Cross-layer closure — one rule

Cross-layer references and within-layer references are governed by the same closure rule. A reference from `ACTION` (layer 05_implementation) to `GOAL` (layer 01_motivation) is in scope iff both endpoints are in the final allowlist, regardless of layer. There is no separate "cross-layer permission" — closure is uniform.

### 5.4 Disabling a layer

A layer with an empty element allowlist *and* an empty relation allowlist is **disabled**. This is the special case the epic body calls out. Two equivalent forms:

```yaml
# Explicit empty allowlists (canonical):
layers:
  04_technology:
    elements: { remove: [], add: [] }   # nothing in core for this layer to begin with
    relations: { remove: [], add: [] }
```

```yaml
# Sugar shorthand (optional alias; resolves to the above):
layers:
  04_technology:
    disabled: true
```

When a layer is disabled, the closure rule above still applies — any other TYPE that requires a reference into the disabled layer fails closure. There is no "soft" disable.

---

## 6. Document validation — out-of-profile objects

A canon document whose top-level element TYPE is **not** in the active profile is an **error**. The validator emits an actionable message naming the offending file, the offending TYPE, and what to do.

```
COVERAGE-SCOPE: canon/elements/01_motivation/assessments/ASSESSMENT-CHURN-1.yaml
declares notation: assessment (TYPE ASSESSMENT). This TYPE is not in the
active coverage profile (extends: core, no additions for 01_motivation).

Fix: either
  - extend the profile to add ASSESSMENT to layer 01_motivation.elements, or
  - remove this file.
```

The same rule applies to REL files: a `REL` file whose `type:` is not in the active profile's relation allowlist for the `from`-endpoint's layer is rejected with the same message form.

### 6.1 What document validation does NOT do

- It does **not** check inline cross-reference fields. Closure (§5) already guarantees that a TYPE in the profile can be referenced safely — there is no in-document case where an inline reference points at an out-of-profile TYPE that closure missed.
- It does **not** validate notation files (the views). A view document is governed by its per-notation spec; the elements it inlines or references are governed by this profile via the per-element rule above.
- It does **not** treat *absence* of an out-of-profile TYPE as a finding. The whole point of a profile is that excluded scope is silent — not a gap.

---

## 7. Version pinning

A profile is authored against a specific methodology vocabulary. When the methodology version changes (a release shipping a new TYPE, a renamed TYPE, a removed TYPE), the profile may need updating.

The `pinned_to:` field on a custom profile records the methodology version the profile was authored against. The validator enforces equality:

| Validator state | Behaviour |
|---|---|
| `pinned_to:` present and equals `methodology_version` | Profile is valid for this version. |
| `pinned_to:` present and differs from `methodology_version` | Profile is rejected as stale. Adopter must re-resolve the profile against the current methodology vocabulary (a TYPE in the delta may no longer exist) and update `pinned_to`. |
| `pinned_to:` absent | No version check. Profile resolves against `methodology_version`. Recommended only for short-form profiles (`coverage_profile: core`) and for profiles that an adopter is willing to silently re-resolve at every methodology bump. |

The shipped presets (`minimal`, `core`, `full`) are *re-defined per methodology release* — a methodology MAJOR or MINOR bump that adds a new TYPE re-states whether that TYPE joins each preset, with the rationale in `CHANGELOG.md`. A short-form `coverage_profile: core` therefore tracks the moving definition of `core`; a custom profile with `pinned_to:` does not.

---

## 8. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `CP-001` | error | `coverage_profile` is malformed (not a string, not a map with `extends:`); or names an unknown preset; or `extends:` is missing on a custom profile; or `layers.<id>` names a layer outside `{01_motivation, 02_business, 03_application, 04_technology, 05_implementation}`; or `layers.<id>.elements.add` references a TYPE outside the registry; or `layers.<id>.elements.add` places a TYPE in the wrong layer per [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §6; or `layers.<id>.relations.add` references a kind outside the [`elements/17-relations.md`](elements/17-relations.md) §3 enum. |
| `CP-002` | error | Closure failure (§5). Message must follow the form in §5.2. |
| `CP-003` | error | Document validation failure (§6) — a canon document declares a TYPE not in the active profile. Message must follow the form in §6. |
| `CP-004` | error | `pinned_to:` differs from `methodology_version` (§7). |
| `CP-005` | warning | `layers.<id>.elements.add` (or `.remove`) is a no-op against the preset (the TYPE is already present, or already absent). |

`CP-001..004` are admission-time rules — they run when the validator loads the manifest. `CP-003` runs whenever a canon document is loaded. `CP-005` is a hygiene warning, not a blocker.

---

## 9. Worked examples

### 9.1 The default — no profile declared

```yaml
# transitrix.yaml
transitrix: 1
methodology_version: "3.5.0"
notations: [dgca, goals, activities, capability-map, applications]
zones: [canon, field]
# coverage_profile omitted → defaults to `full`
```

Every TYPE in the registry is in scope. The default for adopters who haven't yet thought about profiling.

### 9.2 A short-form profile

```yaml
coverage_profile: minimal
```

A small product team using only `DRIVER`, `GOAL`, `ACTION` plus `goal_parent` and `action_goal` RELs. The team's `notations:` list narrows accordingly — `dgca`, `goals`, `action`. Adding a `CAPABILITY-…` file to canon would fail `CP-003`.

### 9.3 A custom profile — core + the planning model

```yaml
coverage_profile:
  extends: core
  pinned_to: "0.5.0"
  layers:
    05_implementation:
      elements:
        add: [TARGET_STATE, SCENARIO]
      relations:
        add: [target_state_satisfies_goal]
```

An EA team that uses `core` plus the planning-model primitives (Target State + Scenario). Closure passes: `TARGET_STATE.satisfies` is a `target_state_satisfies_goal` REL whose endpoints are `TARGET_STATE` (in scope) and `GOAL` (in scope via `core`); `SCENARIO.arrives_at` is an inline reference to `TARGET_STATE` (in scope); `SCENARIO.steps` references `ACTION` (in scope) and `CHANGE` (in scope).

### 9.4 A custom profile — core minus the engagement RELs

```yaml
coverage_profile:
  extends: core
  pinned_to: "0.5.0"
  layers:
    02_business:
      relations:
        remove: [employment]
```

The team uses `ACTOR` for identity but does not track employment as a first-class temporal relation. Action owners reference `ACTOR-…` directly (the `owner` inline field per [`views/07-action.md`](./views/diagrams/07-action.md) §5.6 is unchanged). Closure passes — no other in-scope TYPE requires `employment`.

### 9.5 A profile that fails closure

```yaml
coverage_profile:
  extends: minimal
  layers:
    01_motivation:
      elements: { add: [STAKEHOLDER] }
```

Result: `CP-002` (closure). `STAKEHOLDER.actor` is a required reference to `ACTOR`; `ACTOR` is in 02_business, which is not in scope under `minimal`. Validator rejects the manifest with the message form in §5.2 and the profile is not active. Fix: also `add: [ACTOR]` under `02_business.elements`.

---

## 10. Out of scope (v1)

- **Attribute-level restrictions within a TYPE.** A profile is type-grain; it does not constrain individual fields on an in-scope TYPE. ("Allow `CAPABILITY` but forbid the `responsible_role` attribute" is not expressible.)
- **Notation-level restrictions.** The set of *notations* (view extensions) the repo uses is governed by the manifest's `notations:` field, not by this profile. A profile that excludes every TYPE a notation produces simply means that notation has nothing in scope to render; the manifest is the place to drop unused notations.
- **Per-folder / per-notation profile overrides.** One profile per repository (§1).
- **Profile inheritance across repositories.** Holdings with `_shared/` (per [`MANIFEST.md`](MANIFEST.md) §1) do not currently allow a group-level profile that per-entity manifests narrow further. Each entity declares its own.
- **A "deprecated" preset slot.** When a preset is retired, the methodology release that drops it ships a migration note; there is no transitional `deprecated` value.

---

## 11. Relation to the Coverage Variants exploration

The Coverage Profile is the canonical realisation of the *Coverage Variants* exploration that preceded it (a slide deck recording the early thinking about layer-restriction patterns and notation subsets a typical adopter actually uses). The exploration motivated this notation; the notation supersedes the exploration as the single source of truth for selective coverage. Future Coverage Variants material — pictures, decision aids, adopter walkthroughs — should treat this document as canon and itself as commentary.

---

## 12. References

- [`MANIFEST.md`](MANIFEST.md) — the `transitrix.yaml` manifest envelope (where `coverage_profile:` lives).
- [`PACKAGES.md`](PACKAGES.md) — the orthogonal breadth axis (optional domain packages), not bounded by this document.
- [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3 — TYPE registry the profile draws from.
- [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §6 — per-TYPE layer placement (which layer each TYPE belongs to).
- [`elements/17-relations.md`](elements/17-relations.md) §3 — relation `type` enum the profile draws from.
- [`CONTRACT.md`](CONTRACT.md) §10 — versioning and compatibility policy (the same `methodology_version` pin governs the profile's vocabulary).
- [`README.md`](README.md) — notation catalogue.
