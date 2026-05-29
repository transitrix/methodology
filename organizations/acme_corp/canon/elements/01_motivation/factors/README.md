# `canon/elements/01_motivation/factors/`

Factor element primitives — each file is one strategic driver (external or internal) on the ArchiMate 3.2 **motivation** layer. Factors open the strategy chain: they justify the goals that follow. The FGCA / FGA views (`../../../views/fgca/`, `../../../views/fga/`) are the authoring surface; a factor shared across documents is materialised here as its canonical record.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`FACTOR`).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `FACTOR-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `FACTOR-EU-REG-1.yaml`, `FACTOR-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.1 (per-TYPE fields) over the common envelope §3:

- Identity + factor fields: `notation: factor`, `id`, `name`, optional `type` (`external` | `internal`), `description`, `references_constraint: [CONSTRAINT-…]`.
- Admission record per [`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6: `zone: canon`, `admitted_at`, `admitted_by`, `gate_checks`.
- Primitive lifecycle per [`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7: `valid_from`, `valid_to`.

## Examples in this folder

| File | Notes |
|---|---|
| `FACTOR-EU-REG-1.yaml` | External driver — closing EU regulatory window; references `CONSTRAINT-GDPR-RESIDENCY-1` |
| `FACTOR-COMP-1.yaml` | Internal driver — degraded support response time |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.1.
- FGCA / FGA notations: [`notations/views/02-fgca.md`](../../../../../../notations/views/02-fgca.md), [`notations/views/03-fga.md`](../../../../../../notations/views/03-fga.md).
- Views over these elements: [`../../../views/fgca/`](../../../views/fgca/), [`../../../views/fga/`](../../../views/fga/).
