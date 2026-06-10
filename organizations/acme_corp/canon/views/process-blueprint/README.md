# `canon/views/process-blueprint/`

Wide value-chain blueprint — stages laid out left-to-right, each carrying its goal, result, and supporting aspects (systems, actors, equipment, information entities).

## File convention

`*.process-blueprint.transitrix.yaml`

See [`notations/views/13-process-blueprint.md`](../../../../../notations/views/13-process-blueprint.md) for the full spec.

## Lifecycle

The blueprint's per-aspect arrays split for lifecycle purposes:

- **Canonical-TYPE arrays** — `equipment[]` (`EQUIPMENT`, catalogued at `canon/elements/04_technology/equipment/`) and `business_objects[]` (`BUSINESS_OBJECT`, catalogued at `canon/elements/02_business/business-objects/`), both registered in [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1 and promoted to standalone elements (ADR 2026-06-08). An entry that carries an `id` resolves to the matching catalogue record; a free-form entry without an `id` stays document-local. Each entry carries `valid_from` and `valid_to` per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7. Note: the field was previously named `information_entities[]` (`INFORMATION_ENTITY`) — the deprecated alias is accepted for one release (validator emits `BOBJ-D001`).
- **Document-local arrays** — `stages[]`, `systems[]`, `actors[]`. These use document-local identifiers (e.g. `STAGE-1`) that are not registered as canonical TYPEs and so carry no lifecycle of their own. When a `systems[]` or `actors[]` entry is intended to reference a registered element (an `APPLICATION-…` or `ROLE-…`), the lifecycle lives on that target's canonical file.

The process-blueprint document itself carries no lifecycle.

## See also

- [`notations/examples/process-blueprint/`](../../../../../notations/examples/process-blueprint/) — worked example
- `method/methodology.md` §6 — notation kit
