---
title: "Relations — first-class time-aware links"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-28"
status: "draft"
---

# Relations — Reference

**Scope:** The `REL` element type — first-class **time-aware relations** between two canonical primitives. A relation file records that *primitive A is in relation X with primitive B during a defined window*. The shared header / zone / admission / lifecycle / sidecar contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Relations are canon-zone artefacts that live in a **flat folder** at the canon-zone root: `canon/relations/`. Each relation is a single YAML file named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`), the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7), and the relation-specific frontmatter below.

---

## 1. What a relation is

A relation is a directed link from a `from` primitive to a `to` primitive, tagged with a `type` that names the kind of link. A relation has its **own lifecycle** (`valid_from` / `valid_to`): the link is in effect for the window the relation file declares, independently of the lifecycles of either endpoint.

This is the difference from inline cross-references: an inline reference field (`activity.goals: [GOAL-…]`) is timeless within its host file — it asserts the link exists for the host's entire lifetime. A first-class relation records *when the link itself took effect and when it ended*. A capability re-parented in 2026, an activity re-aimed at a different goal in mid-stream, a CRM application that started supporting a new capability — these are temporal events that lose information when inlined.

The choice between **inline** and **first-class** is per relation-kind, declared in each notation spec. Not every relation needs to be first-class; only those where the temporal dimension matters.

---

## 2. Frontmatter — canonical schema

```yaml
notation: relation
id: REL-CAP-V1-PARENT-1
type: parent                            # required; from the closed enum in §3
from: CAPABILITY-V1.1                   # required; the dependent / child / source primitive
to: CAPABILITY-V1                       # required; the target / parent / destination primitive

# Admission record (CONTRACT.md §6)
zone: canon
admitted_at: "2026-05-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — the relation's own window
valid_from: "2024-01-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `relation`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `REL-[<middle>-]<INTEGER>`. |
| `type` | yes | string | One of the closed enum values in §3. The enum is fixed in this spec; adding a new relation kind requires a methodology revision. |
| `from` | yes | string | Typed canonical ID of the relation's source / dependent / child primitive. Must resolve to an admitted primitive in canon (`REL-002`). |
| `to` | yes | string | Typed canonical ID of the relation's target / parent / destination primitive. Must resolve to an admitted primitive in canon (`REL-002`). |
| `zone` | yes | string | Always `canon` for REL — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`). |
| `valid_from` | yes | string | Date the relation took effect — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the relation ceased to be in effect, or `null` if still in effect — see [CONTRACT.md](../CONTRACT.md) §7. |

---

## 3. Relation `type` enum

The enum is **closed** in v1. Each value names a specific kind of link between two primitive types; the validator enforces both the enum membership and (when the catalogue is loaded) the endpoint TYPE constraints.

| `type` | Direction (from → to) | Endpoint TYPEs | Semantics |
|---|---|---|---|
| `parent` | child → parent | `CAPABILITY` → `CAPABILITY` (V/H sub-grammar applies) | Child capability sits under its parent in the capability hierarchy. Re-parenting a capability — a re-org or a capability split — produces a new relation with its own window. |
| `goal_parent` | child → parent | `GOAL` → `GOAL` | A goal's place under another goal in the Goals tree. A goal re-parented mid-stream (a tactical goal moved to a different strategic goal) produces a new relation. |
| `activity_goal` | activity → goal | `ACTIVITY` → `GOAL` | An activity serves a goal. An activity re-aimed mid-stream produces a new relation. |
| `unit_parent` | child → parent | `ACTOR(business_unit)` → `ACTOR(business_unit)` | Organisational re-parenting — a business-unit actor moved under a different parent unit. (Was `UNIT → UNIT` before the 2026-05-29 Actors decision folded `UNIT` into `ACTOR`.) |
| `employment` | person → org | `ACTOR(person)` → `ACTOR(business_unit)` | Employment of a person by a unit / organisation. Time-aware (the employment window); carries the most attributes of the engagement kinds — `contract_type`, role assignments (`roles: [ROLE-…]`). |
| `candidacy` | person → org | `ACTOR(person)` → `ACTOR(business_unit)` | A person under evaluation (pre-hire). Carries `stage`, `source`. |
| `alumni_membership` | person → org | `ACTOR(person)` → `ACTOR(business_unit)` | A former employee's continuing relationship; may reference the prior `employment`. |
| `community_membership` | person → community | `ACTOR(person)` → `ACTOR(business_unit)` | Membership of a community modelled as a `business_unit` actor (e.g. an open-source community, a user group). |
| `contracting` | contractor → org | `ACTOR(person\|business_unit)` → `ACTOR(business_unit)` | A contracting relationship; carries `contract_terms`. |

Adding a new `type` value is a non-backwards-compatible methodology revision — adopters' validators built against an older enum will reject newer relations.

**Engagement relations (`employment` / `candidacy` / `alumni_membership` / `community_membership` / `contracting`).** Decided 2026-05-29 (Actors): a `person` actor records *identity only*; every kind of engagement with the organisation is its own first-class, time-aware relation, so the same person can be a candidate, then an employee, then an alumnus over time without losing history, and can hold several engagements at once. Each engagement kind carries only the attributes that kind needs; the relation's own `valid_from`/`valid_to` is the engagement window.

**Out of the enum in v1, by deliberate decision:**

- **`applies_to` (Codex → Canon).** Retired entirely in the compliance epic ([14-codex.md](14-codex.md) §8) — bindings now live as REQUIREMENT.`derived_from` plus ASSERTION; no `applies_to` relation kind is needed.
- **Inline relations.** Each notation spec declares which of its relation kinds stay inline (timeless within their host file) versus which become first-class REL files. The per-notation declarations are added in subsequent Wave 3 PRs.

---

## 4. File location and naming

```
canon/relations/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder is flat — relations are not organised by `type` or by endpoint TYPE in the folder structure; the typing lives in the `type` field. Examples:

- `canon/relations/REL-CAP-V1-PARENT-1.yaml`
- `canon/relations/REL-ACT-Q3-GOAL-EU-1.yaml`
- `canon/relations/REL-GOAL-EU-PARENT-1.yaml`

A typical naming convention encodes the endpoints and kind in the middle segments (`REL-<FROM-HINT>-<KIND>-<N>` or `REL-<FROM-HINT>-<TO-HINT>-<N>`); the canonical grammar imposes only `REL-[<middle>-]<INTEGER>`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `REL-001` | error | `type` is missing or not one of the closed enum values in §3. |
| `REL-002` | error | `from` or `to` is missing, malformed, or does not resolve to an admitted primitive in canon. If the validator has the catalogue loaded, the endpoint's resolved TYPE must also match the `type`-specific endpoint constraints in §3. |
| `REL-003` | error | The relation's `[valid_from, valid_to]` window falls outside the lifecycle of either endpoint — i.e. `valid_from` predates the endpoint's `valid_from`, or `valid_to` postdates the endpoint's `valid_to`. A relation cannot be in effect before either of its endpoints existed or after either retired. |
| `REL-004` | error | A relation kind declared time-aware in its host notation spec is used inline (as an inline cross-reference field) instead of as a first-class REL file. The host notation's spec is the source of truth for which kinds are time-aware. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to REL files in addition to the REL-* rules above. The sidecar rules (`VERSIONED-001..005`, [CONTRACT.md](../CONTRACT.md) §9.3) do not apply to relations — a relation's own state is its endpoints + lifecycle window; if the relation's attributes need versioning, the relation is its own primitive and gets its own sidecar.

---

## 6. Migration — what moves to first-class

Each notation spec declares its relation kinds as either **inline (timeless)** or **first-class (time-aware)** in a follow-up PR per family. v1 first-class candidates (from the temporal-model epic body):

- Capability map ([05-capability-map.md](../views/05-capability-map.md)) — `parent` on capabilities.
- Goals tree ([04-goals.md](../views/04-goals.md)) — `parent` on goals (re-parenting goals); `activity_goal` link from activities to goals.

Inline relations that stay timeless in v1 (per the same per-notation declarations):

- BPMN sequence flows ([01-bpmn.md](../views/01-bpmn.md)) — within one process flow document.
- FGCA / FGA / Activities cross-layer references (`factor.references_constraint`, etc.) where the model captures *what holds today* rather than the history of changes.

Each notation that adopts a first-class relation kind:

1. Removes the inline cross-reference field from the schema.
2. Adds a row to its "Time-aware relations" subsection documenting the kind and the corresponding REL `type` value.
3. Adopters migrate by extracting each inline link into a `REL-…` file under `canon/relations/`, with `valid_from = the host primitive's valid_from` as a sensible epoch.

`REL-004` fires on inline use of a now-first-class kind.

---

## 7. Evolution

Pending design work (separate Wave 3 PRs):

- Per-notation declarations of time-aware vs timeless relation kinds (one PR per family).
- acme_corp worked example — at least one `REL-…` file demonstrating a relation with a non-trivial window (a re-parenting event captured as one ended relation + one new relation).
- Cross-cutting validator rule `REL-COVERAGE-001` (warning) — flag relation kinds declared time-aware that have zero first-class instances in the catalogue (potential incomplete migration). Filed as a follow-up.

Out of scope for v1:

- **Relation-attribute versioning.** Relations have lifecycle but no attributes that vary within their window. If a relation needs versioned attributes (a weight that drifts over time), it gets its own sidecar via [CONTRACT.md](../CONTRACT.md) §9 — same pattern as any other primitive.
- **Many-way relations.** Each REL file has exactly one `from` and one `to`. Many-way relationships are modelled as multiple binary REL files sharing one endpoint.
- **Relation transitivity / inference.** If A `parent` B and B `parent` C, the validator does not infer A `parent` C. Transitive views are query-time renderer concerns.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- Versioned-attribute sidecar (the Wave 2 pattern that REL files do *not* use): [CONTRACT.md](../CONTRACT.md) §9.
- Codex `applies_to` retirement (why it is not in the §3 enum): [14-codex.md](14-codex.md) §8.
