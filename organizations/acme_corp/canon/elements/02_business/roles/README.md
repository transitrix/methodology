# `canon/elements/02_business/roles/`

Role element primitives — each file is one business role on the ArchiMate 3.2 **business** layer. Roles are the accountable parties referenced as `owner_role: ROLE-…` across the notations (processes, products, capabilities, applications, issues). This folder is their canonical home.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`ROLE`).

## File convention

`<id>.yaml`, where `<id>` follows `ROLE-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `ROLE-OPS-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.9 over the common envelope §3:

- Identity + role fields: `notation: role`, `id`, `name`, `description`, optional `responsibility_area`, `unit: UNIT-…`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

A `ROLE` names a position, not a person; named individuals are `EMPLOYEE` elements (§7.11).

## Examples in this folder

| File | Notes |
|---|---|
| `ROLE-OPS-1.yaml` | Operations Lead |
| `ROLE-SALES-1.yaml` | Sales Lead |
| `ROLE-PROD-1.yaml` | Product Lead |
| `ROLE-TECH-1.yaml` | Technology Lead |
| `ROLE-CS-1.yaml` | Customer Support Lead |
| `ROLE-EXEC-1.yaml` | Executive Sponsor |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.9.
- Cross-reference field `owner_role:` appears across the view notations under [`notations/views/`](../../../../../../notations/views/).
