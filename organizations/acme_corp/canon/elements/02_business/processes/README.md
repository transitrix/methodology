# `canon/elements/02_business/processes/`

Process element primitives — each file is one business process on the ArchiMate 3.2 **business** layer. The process-map view (`../../../views/processmap/`) catalogues them by Operating / Supporting / Management; detailed flows live in `../../../views/bpmn/`.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`PROCESS`).

## File convention

`<id>.yaml`, where `<id>` follows `PROCESS-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `PROCESS-ORD-FULFILL-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.5 over the common envelope §3:

- Identity + process fields: `notation: process`, `id`, `name`, `owner_role: ROLE-…`, `capability: CAPABILITY-…`, `maturity` (CMM 1–5), `bpmn_file`, `description`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

## Examples in this folder

| File | Notes |
|---|---|
| `PROCESS-ORD-FULFILL-1.yaml` | Operating — realises `CAPABILITY-V1`, owned by `ROLE-OPS-1` |
| `PROCESS-CUST-ONBOARD-1.yaml` | Operating — realises `CAPABILITY-V2` |
| `PROCESS-CS-RESOLVE-1.yaml` | Supporting |
| `PROCESS-STRAT-PLAN-1.yaml` | Management |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.5.
- Process-map notation: [`notations/views/06-process-map.md`](../../../../../../notations/views/06-process-map.md).
- Views over these elements: [`../../../views/processmap/`](../../../views/processmap/), [`../../../views/bpmn/`](../../../views/bpmn/).
