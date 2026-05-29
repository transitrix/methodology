# `canon/elements/03_application/applications/`

Application element primitives — each file is one application on the ArchiMate 3.2 **application** layer. The applications-catalogue view (`../../../views/applications/`) renders them and their integrations; this folder holds their canonical records.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`APPLICATION`, `INTEGRATION`).

## File convention

`<id>.yaml`, where `<id>` follows `APPLICATION-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `APPLICATION-OMS-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.7 over the common envelope §3:

- Identity + application fields: `notation: application`, `id`, `name`, `type` (`application` | `integration` | `platform` | `data_store`, required), `domain`, `description`, `capabilities: [CAPABILITY-…]`, `products: [PRODUCT-…]`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

**Time-varying** fields — `owner_role`, `vendor`, `lifecycle_stage`, `maturity` — are sidecar-bound ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §9), **not** inline (inline placement triggers `VERSIONED-004`). `INTEGRATION` is view-defined (nested under its source application in the catalogue) in v1 and promotable to a standalone `../integrations/` file — see [`ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.8.

## Examples in this folder

| File | Notes |
|---|---|
| `APPLICATION-OMS-1.yaml` | Order Management System — supports `CAPABILITY-V1`, used by `PRODUCT-ECOMM-1` |
| `APPLICATION-CRM-1.yaml` | CRM System — supports `CAPABILITY-V2` |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.7–§7.8.
- Applications notation: [`notations/views/10-applications.md`](../../../../../../notations/views/10-applications.md).
- View over these elements: [`../../../views/applications/`](../../../views/applications/).
