# `canon/relations/`

First-class time-aware relations between canonical primitives — each file is one `REL` artefact recording that *primitive A is in relation X with primitive B during a defined window*. The folder is **flat**: relations are organised by their canonical IDs, not by `type` or by endpoint TYPE.

Schema and validation rules are defined in [`notations/17-relations.md`](../../../notations/17-relations.md). TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../notations/IDS_AND_REFERENCES.md) §3.1 (`REL`), §4 (uniqueness scope).

## File convention

`<id>.yaml`, where `<id>` follows the canonical `REL-[<middle>-]<INTEGER>` grammar. A typical convention encodes the endpoints + kind in the middle segments (`REL-<FROM-HINT>-<KIND>-<N>`); teams may pick a different middle-segment scheme.

## The (`type`, `from`, `to`) triple

Every relation declares its kind via `type` (drawn from the closed enum in [`17-relations.md`](../../../notations/17-relations.md) §3) and its endpoints via `from` / `to`. The relation has its **own lifecycle** (`valid_from` / `valid_to`) — distinct from the lifecycles of either endpoint. A re-parenting / re-aiming event is captured as **two** REL files: the old relation ends (`valid_to` set), and a new one starts (`valid_from` = same date) pointing at the new endpoint.

## Examples in this folder

| File | `type` | `from` → `to` | Window | Notes |
|---|---|---|---|---|
| `REL-CAP-V11-PARENT-1.yaml` | `parent` | `CAPABILITY-V1.1` → `CAPABILITY-V2` | 2024-01-01 → 2026-04-01 | initial parent — Order Intake was modelled under Customer Relationship Management until the 2026-04 operational review |
| `REL-CAP-V11-PARENT-2.yaml` | `parent` | `CAPABILITY-V1.1` → `CAPABILITY-V1` | 2026-04-01 → null | new parent — re-parented to Order Management after the review; still in effect |

The two together encode the **re-parenting event**: Order Intake moved from Customer Relationship Management (V2) to Order Management (V1) on 2026-04-01. The history is preserved in `REL-…-PARENT-1.yaml`; the current state is in `REL-…-PARENT-2.yaml`.

## See also

- Relations spec: [`notations/17-relations.md`](../../../notations/17-relations.md).
- Per-notation time-aware declarations: [`notations/05-capability-map.md`](../../../notations/05-capability-map.md) §13a (capability `parent`); [`notations/04-goals.md`](../../../notations/04-goals.md) (goal `parent`); [`notations/07-activities.md`](../../../notations/07-activities.md) (activity `goals`).
- Endpoints in this example: [`../elements/02_business/capabilities/`](../elements/02_business/capabilities/).
- Sidecar contract (versioned attributes — distinct from REL): [`notations/CONTRACT.md`](../../../notations/CONTRACT.md) §9.
