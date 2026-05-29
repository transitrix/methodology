# `canon/views/process-blueprint/`

Wide value-chain blueprint — stages laid out left-to-right, each carrying its goal, result, and supporting aspects (systems, actors, equipment, information entities).

## File convention

`*.process-blueprint.transitrix.yaml`

See [`notations/views/13-process-blueprint.md`](../../../../../notations/views/13-process-blueprint.md) for the full spec.

## Lifecycle

The blueprint's per-aspect arrays split for lifecycle purposes:

- **Canonical-TYPE arrays** — `equipment[]` (`EQUIPMENT`) and `information_entities[]` (`INFORMATION_ENTITY`), both registered in [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1. Each entry carries `valid_from` and `valid_to` per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7.
- **Document-local arrays** — `stages[]`, `systems[]`, `actors[]`. These use document-local identifiers (e.g. `STAGE-1`) that are not registered as canonical TYPEs and so carry no lifecycle of their own. When a `systems[]` or `actors[]` entry is intended to reference a registered element (an `APPLICATION-…` or `ROLE-…`), the lifecycle lives on that target's canonical file.

The process-blueprint document itself carries no lifecycle.

## See also

- [`notations/examples/process-blueprint/`](../../../../../notations/examples/process-blueprint/) — worked example
- `method/methodology.md` §6 — notation kit
