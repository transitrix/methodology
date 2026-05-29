# `canon/elements/01_motivation/goals/`

Goal element primitives — each file is one strategic or tactical goal on the ArchiMate 3.2 **motivation** layer. Goals are the most cross-referenced strategy-chain element (goals tree, FGCA, FGA, activities). The goals-tree view (`../../../views/goals/`) arranges them into a hierarchy; this folder holds their canonical records.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`GOAL`).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `GOAL-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `GOAL-REVENUE-1.yaml`, `GOAL-EU-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.2 over the common envelope §3:

- Identity + goal fields: `notation: goal`, `id`, `name`, optional `type` (goal-type label), `level`, `factors: [FACTOR-…]`, `description`, `link`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

A goal's **`parent`** (`GOAL → GOAL`) is a first-class time-aware relation (`goal_parent`, [`notations/elements/17-relations.md`](../../../../../../notations/elements/17-relations.md) §3); it is carried inline by the goals-tree view in v0.x and is **not** stored on the element file.

## Examples in this folder

| File | Notes |
|---|---|
| `GOAL-REVENUE-1.yaml` | Root strategy goal (`level: 0`) |
| `GOAL-EU-1.yaml` | Strategic goal driven by `FACTOR-EU-REG-1` |
| `GOAL-OPS-1.yaml` | Strategic goal driven by `FACTOR-COMP-1` |
| `GOAL-CUST-1.yaml` | Strategic goal behind the onboarding activity network |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.2.
- Goals-tree notation: [`notations/views/04-goals.md`](../../../../../../notations/views/04-goals.md).
- Views over these elements: [`../../../views/goals/`](../../../views/goals/), [`../../../views/fgca/`](../../../views/fgca/), [`../../../views/fga/`](../../../views/fga/).
