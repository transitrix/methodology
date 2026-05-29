# `canon/elements/01_motivation/stakeholders/`

Stakeholder element primitives — the motivation-layer **interest** primitive (ArchiMate Stakeholder): *whose interests are at stake*. A stakeholder carries the stake profile (`concern` / `interest` / `influence`) and a `type` (`internal` / `external`); it **references an `ACTOR` for identity** (`actor:` REQUIRED) — identity is never duplicated here.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`STAKEHOLDER`). Full spec: [`notations/elements/20-stakeholders.md`](../../../../../../notations/elements/20-stakeholders.md).

## File convention

`<id>.yaml`, where `<id>` follows `STAKEHOLDER-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `STAKEHOLDER-DPA-1.yaml`.

## Schema

Defined in [`notations/elements/20-stakeholders.md`](../../../../../../notations/elements/20-stakeholders.md) §2 + [`ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.15 over the common envelope §3:

- Fields: `notation: stakeholder`, `id`, `name`, `type` (`internal` | `external`, required), `actor: ACTOR-…` (**required**), optional `concern` / `interest` / `influence` / `description`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

Stake in a specific `GOAL` / `ACTIVITY` / `CAPABILITY` is a `stakeholding` `REL` ([`17-relations.md`](../../../../../../notations/elements/17-relations.md) §3), not an inline field.

## Examples in this folder

| File | Notes |
|---|---|
| `STAKEHOLDER-DPA-1.yaml` | `external` — the data-protection regulator; identity `ACTOR-DPA-1`; stakes the EU goal via `REL-STK-DPA-GOAL-EU-1` |
| `STAKEHOLDER-OPS-1.yaml` | `internal` — Operations; identity `ACTOR-OPS-1` (same actor is also a doer) |

## See also

- Stakeholders notation: [`notations/elements/20-stakeholders.md`](../../../../../../notations/elements/20-stakeholders.md).
- Identity primitives referenced here: [`../../02_business/actors/`](../../02_business/actors/).
- `stakeholding` relations: [`../../../relations/`](../../../relations/).
