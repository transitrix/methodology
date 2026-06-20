---
title: "Stakeholders — motivation-layer interest primitive"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-29"
status: "draft"
---

# Stakeholders — Reference

**Scope:** The `STAKEHOLDER` element type — the motivation-layer primitive for *whose interests are at stake* (ArchiMate Motivation / Stakeholder). A stakeholder carries the **stake profile** (concern, interest, influence); it never carries identity — identity always lives in an `ACTOR` ([19-actors.md](19-actors.md)) that the stakeholder references. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the common element-primitive envelope is [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3; the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Stakeholders are **zone primitives**: each is a single YAML file under `canon/elements/01_motivation/stakeholders/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the stakeholder-specific frontmatter below.

Recorded 2026-05-29 as the canonical decision (strategy proposal #111, Q2 = B2): `STAKEHOLDER` is its own TYPE and **references an `ACTOR` for identity** (`actor:` REQUIRED) — one identity record, however many stakes / employments / roles sit on top.

---

## 1. STAKEHOLDER vs ACTOR — interest vs identity

| | STAKEHOLDER | ACTOR |
|---|---|---|
| **What it is** | An *interest* in outcomes — a stake profile | An *identity* — who/what exists ([19-actors.md](19-actors.md)) |
| **ArchiMate** | Motivation / Stakeholder | Business Actor |
| **Layer** | Motivation (`01_motivation/stakeholders/`) | Business (`02_business/actors/`) |
| **Carries** | concern, interest, influence; `actor:` (REQUIRED) | name, `type` (person / business_unit / system) |

The same human / organisation can be both an actor (performs work) and a stakeholder (has interest); the relations differ. Identity is recorded **once** as an `ACTOR`; a `STAKEHOLDER` points at it. To model an external regulator as a stakeholder, write a minimal `ACTOR` (`type: business_unit`, ~4 lines) and a `STAKEHOLDER` referencing it.

---

## 2. Frontmatter — canonical schema

```yaml
notation: stakeholder
id: STAKEHOLDER-DPA-1
name: "Data Protection Authority"
type: external                  # internal | external  (required)
actor: ACTOR-DPA-1              # REQUIRED — the identity this stake attaches to
concern: "Lawful processing and timely erasure of personal data."
interest: high                  # high | medium | low — organisation-defined
influence: high                 # high | medium | low — power to affect outcomes
description: "National data-protection regulator; external oversight stakeholder."

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-05-29"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2024-01-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `stakeholder`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `STAKEHOLDER-[<middle>-]<INTEGER>`. |
| `name` | yes | string | Human-readable label for the stake (often mirrors the actor's name). |
| `type` | yes | string | `internal` \| `external`. External explicitly includes regulators, customers, partners, communities. |
| `actor` | **yes** | string | The `ACTOR-…` whose identity this stake attaches to (`STAKE-002`). Identity lives in the actor, never here. |
| `concern` | recommended | string | What this stakeholder cares about — the substance of the stake. |
| `interest` | no | string | `high` \| `medium` \| `low` — organisation-defined level of interest. |
| `influence` | no | string | `high` \| `medium` \| `low` — power to affect outcomes. |
| `description` | no | string | Free-text elaboration. |
| `zone` / `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Admission record — [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | When the stake became relevant — [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | When the stake ended, or `null`. |

`concern` / `interest` / `influence` on the file are the stakeholder's **general** profile. Stake in a *specific* object (a goal, a project, a capability) is a `stakeholding` relation (§3), which may carry its own per-object `concern` / `influence`.

---

## 3. Relations — `stakeholding`

A stakeholder's stake in a specific canonical object is a first-class relation ([17-relations.md](17-relations.md)):

| Relation `type` | From → To | What it records |
|---|---|---|
| `stakeholding` | `STAKEHOLDER` → `GOAL` \| `ACTIVITY` \| `CAPABILITY` | This stakeholder has a stake in the target object. Optional per-stake `concern` / `influence` on the relation. The stakeholder→project link (`ACTIVITY`) drives the Activity Card stakeholders block; the stakeholder→goal link is the methodology form of DSM's existing `goal_stakeholder`. |

v0.1 covers `GOAL`, `ACTIVITY` (project), and `CAPABILITY` targets; stakeholder→change and stakeholder→driver are deferred until a concrete need surfaces.

---

## 4. File location and naming

```
canon/elements/01_motivation/stakeholders/<ID>.yaml
```

One stakeholder per file, named by its canonical ID. Examples: `STAKEHOLDER-DPA-1.yaml`, `STAKEHOLDER-CFO-1.yaml`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `STAKE-001` | error | `id` missing or not matching `STAKEHOLDER-[<middle>-]<INTEGER>`; or a required field (`notation`, `name`, `type`, `actor`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) missing. |
| `STAKE-002` | error | `actor` missing, malformed, or does not resolve to an admitted `ACTOR` in canon. Identity must come from an actor. |
| `STAKE-003` | error | `type` is not one of `internal`, `external`. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to STAKEHOLDER files in addition to the STAKE-* rules above.

---

## 6. Evolution

- **Concern as a separate primitive.** ArchiMate models a stakeholder's *concern* as its own element. v0.1 inlines `concern` as free text; a `CONCERN` primitive is deferred until needed.
- **External-organisation reference.** An external stakeholder often *is* an organisation; v0.1 models it as an `ACTOR(business_unit)` with `external_ref`. A dedicated external-org entity is out of scope.
- **Activity Card stakeholders block.** Once this notation lands, Activity Card v0.2 (#97 follow-up) renders a stakeholders panel from the `stakeholding` relations whose target is the project's activity.
- DSM formalisation (the `stakeholder.type` enum + `activity_stakeholder` join) is a `proj:transitrix-dsm` track; this spec defines only the methodology side.

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Common element-primitive envelope: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3, §7.15.
- Identity primitive the stakeholder references: [19-actors.md](19-actors.md).
- `stakeholding` relation: [17-relations.md](17-relations.md) §3.
