# `canon/elements/01_motivation/assessments/`

Assessment element primitives — each file is one **dated finding about the state of a `FACTOR`** (driver) on the ArchiMate 3.2 **motivation** layer (ArchiMate **Assessment**, assessing a Driver). An assessment is a *found fact* ("support response time 8h, degrading"), not a recommendation. It is its own element — rather than a field on the factor — because of **temporality**: one driver accrues many assessments over time, each separately dated and lifecycled.

An assessment carries **no polarity / SWOT field**: whether a finding reads as a strength, weakness, opportunity, or threat is a property of the `INFLUENCE` relation, not of the finding itself.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`ASSESSMENT`).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `ASSESSMENT-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Example: `ASSESSMENT-SUPPORT-RESPONSE-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.16 (per-TYPE fields) over the common envelope §3:

- Identity + assessment fields: `notation: assessment`, `id`, `name`, `assesses: FACTOR-…` (**required**, singular), `description` (the finding, **required**), optional `observed_at`, `method`, `source`. **No `type` / polarity / SWOT field.**
- Admission record per [`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6: `zone: canon`, `admitted_at`, `admitted_by`, `gate_checks`.
- Primitive lifecycle per [`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7: `valid_from`, `valid_to`.

## Examples in this folder

| File | Notes |
|---|---|
| `ASSESSMENT-SUPPORT-RESPONSE-1.yaml` | Finding "8h and degrading" assessing the internal driver `FACTOR-COMP-1` (support response time) |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.16.
- The driver this assesses: [`../factors/`](../factors/).
