# Transitrix worked examples

Concrete, canon-valid examples of every element TYPE and view notation already live **in this repository** under `canon/` — they are the single source of truth, kept in sync with the published schema. This file is an index into them (it used to carry a parallel, hand-written example set on the pre-canonical ArchiMate model; that has been removed in favour of pointing at the real artefacts).

## Element primitives — `canon/elements/<NN>_<layer>/<plural-type>/`

| Layer | TYPE | Example file |
|---|---|---|
| 01_motivation | `FACTOR` | `01_motivation/factors/FACTOR-EU-REG-1.yaml`, `FACTOR-COMP-1.yaml` |
| 01_motivation | `GOAL` | `01_motivation/goals/GOAL-REVENUE-1.yaml`, `GOAL-EU-1.yaml`, … |
| 01_motivation | `CONSTRAINT` | `01_motivation/constraints/CONSTRAINT-GDPR-RESIDENCY-1.yaml` |
| 01_motivation | `REQUIREMENT` | `01_motivation/requirements/REQUIREMENT-DATA-ERASURE-1.yaml`, … |
| 02_business | `CAPABILITY` | `02_business/capabilities/CAPABILITY-V1.yaml` (+ `.history.yaml` sidecar) |
| 02_business | `PROCESS` | `02_business/processes/PROCESS-ORD-FULFILL-1.yaml`, … |
| 02_business | `PRODUCT` | `02_business/products/PRODUCT-ECOMM-1.yaml`, `PRODUCT-SUPPORT-1.yaml` |
| 02_business | `ROLE` | `02_business/roles/ROLE-OPS-1.yaml`, … |
| 02_business | `RULE` | `02_business/rules/RULE-DUAL-APPROVAL-1.yaml` |
| 03_application | `APPLICATION` | `03_application/applications/APPLICATION-OMS-1.yaml`, `APPLICATION-CRM-1.yaml` |
| 05_implementation | `CHANGE` | `05_implementation/changes/CHANGE-EU-CRM-1.yaml`, … |
| 05_implementation | `ACTIVITY` | `05_implementation/activities/ACTIVITY-CRM-EU-1.yaml`, … |

Each carries the canonical envelope ([`notations/ELEMENT_PRIMITIVES.md`](../../../notations/ELEMENT_PRIMITIVES.md) §3): `notation:` header, identity, admission record ([`CONTRACT.md`](../../../notations/CONTRACT.md) §6), and lifecycle (§7). Per-folder READMEs document each folder's schema.

## Relations — `canon/relations/`

First-class time-aware relations, one file each: `REL-CAP-V11-PARENT-1.yaml` / `-2.yaml` demonstrate a re-parenting (one relation ended, one new). Schema + closed `type` enum: [`notations/elements/17-relations.md`](../../../notations/elements/17-relations.md). Most links, though, are **inline cross-references** on the elements/views themselves (`owner_role:`, `goals: [...]`, `applies_to: [...]`), not REL files.

## Compliance — `canon/assertions/`

`ASSERTION-…yaml` files link a `REQUIREMENT` to a subject (`PRODUCT`/`PROCESS`/`CAPABILITY`) with status + evidence. Schema: [`notations/elements/16-assertion.md`](../../../notations/elements/16-assertion.md).

## Codex — `codex/`

External authority (`codex/external/<jurisdiction>/LAW-…`, `REGULATION-…`) and internal (`codex/internal/POLICY-…`, `INTERNAL_STANDARD-…`). Schema: [`notations/elements/14-codex.md`](../../../notations/elements/14-codex.md).

## View documents — `canon/views/<notation>/`

One worked skeleton per notation under `canon/views/` (fgca, fga, goals, capabilities, processmap, products, applications, activities, issues, blocks, scenarios, bpmn, process-blueprint). Each references the element primitives above by canonical ID.

## Copy-and-fill templates — `.templates/`

To start a new artefact, copy the matching template: `.templates/elements/<NN>_<layer>_template.yaml` for element primitives, `.templates/relations/relation_template.yaml` for a REL, `.templates/capability-map_template.yaml` for a capability map. The onboarding Skill (`/transitrix:onboard`) automates this for a fresh repo.

---

**Read the real files** — they validate against the current schema. This index just tells you where they are.
