# `canon/elements/02_business/actors/`

Actor element primitives — the active-structure **identity** primitive on the ArchiMate 3.2 **business** layer: *who or what exists and performs work*. One TYPE with a `type` discriminator covers a `person`, a `business_unit`, or a `system`. Actors are the single home for identity — activity ownership, stakeholders, employment, and org hierarchy all *reference* an actor rather than re-declaring who someone is.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`ACTOR`). Full spec: [`notations/elements/19-actors.md`](../../../../../../notations/elements/19-actors.md). `ACTOR` replaced the briefly-registered `UNIT` / `EMPLOYEE` TYPEs (2026-05-29).

## File convention

`<id>.yaml`, where `<id>` follows `ACTOR-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `ACTOR-OPS-1.yaml`.

## Schema

Defined in [`notations/elements/19-actors.md`](../../../../../../notations/elements/19-actors.md) §2 + [`ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.10 over the common envelope §3:

- Identity fields: `notation: actor`, `id`, `name`, `type` (`person` | `business_unit` | `system`, required), `description`, optional `contact` / `external_ref`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

**Identity only.** No engagement / role / ownership / hierarchy fields on the actor — those are first-class `REL` records ([`17-relations.md`](../../../../../../notations/elements/17-relations.md) §3): `employment`, `candidacy`, `alumni_membership`, `community_membership`, `contracting`, `unit_parent`. A `person` actor names a real person in a live repo; this worked-example org uses synthetic names ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §5).

## Examples in this folder

| File | Notes |
|---|---|
| `ACTOR-OPS-1.yaml` | `business_unit` — the Operations organisation |
| `ACTOR-DPA-1.yaml` | `business_unit` — an external regulator (its external standing is on `STAKEHOLDER-DPA-1`) |
| `ACTOR-PERSON-1.yaml` | `person` — synthetic identity; employed via `REL-EMP-PERSON-OPS-1` (employment ≠ identity) |

## See also

- Actors notation: [`notations/elements/19-actors.md`](../../../../../../notations/elements/19-actors.md).
- Engagement / hierarchy relations: [`../../../relations/`](../../../relations/) and [`notations/elements/17-relations.md`](../../../../../../notations/elements/17-relations.md) §3.
- Stakeholders that reference these actors: [`../../01_motivation/stakeholders/`](../../01_motivation/stakeholders/).
