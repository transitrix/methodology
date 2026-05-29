# `canon/elements/02_business/products/`

Product element primitives — each file is one product or service on the ArchiMate 3.2 **business** layer. Services are products with `type: service` (there is no separate `SVC` TYPE). The products-catalogue view (`../../../views/products/`) renders them; this folder holds their canonical records.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`PRODUCT`).

## File convention

`<id>.yaml`, where `<id>` follows `PRODUCT-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `PRODUCT-ECOMM-1.yaml`, `PRODUCT-SUPPORT-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.6 over the common envelope §3:

- Identity + product fields: `notation: product`, `id`, `name`, `type` (`digital_product` | `service` | `platform` | `bundle`, required), `domain`, `owner_role: ROLE-…`, `maturity`, `description`, `capabilities: [CAPABILITY-…]`, `processes: [PROCESS-…]`, `supporting_apps: [APPLICATION-…]`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

## Examples in this folder

| File | Notes |
|---|---|
| `PRODUCT-ECOMM-1.yaml` | `digital_product` — references capabilities, a process, and supporting apps |
| `PRODUCT-SUPPORT-1.yaml` | `service` — a support offering |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.6.
- Products notation: [`notations/views/09-products.md`](../../../../../../notations/views/09-products.md).
- View over these elements: [`../../../views/products/`](../../../views/products/).
