# ReqIF package — worked example

A small, generic fixture exercising the [ReqIF domain package](../../../packages/reqif.md) end to end: a mini adopter-repo slice (`transitrix.yaml` + a `canon/` fragment) with a `reqif/` package folder sitting beside it, exactly as [`PACKAGES.md`](../../../PACKAGES.md) §3 describes.

**Pattern, not adopter instance.** The scenario (a print-queue retry requirement) is a generic, invented example chosen to exercise every object kind in the package's model. It names no real product, organisation, or adopter.

## Files in this folder

| File | Kind | Role |
|---|---|---|
| [`transitrix.yaml`](transitrix.yaml) | manifest | Declares `packages: [reqif]` alongside a minimal `core` coverage profile. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-PRINT-QUEUE-RETRY-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-PRINT-QUEUE-RETRY-1.yaml) | core `REQUIREMENT` | The core element the package cites — demonstrates the one permitted package → canon reference direction ([`PACKAGES.md`](../../../PACKAGES.md) §4.1). |
| [`reqif/spec-object-types/sot-requirement-basic-1.yaml`](reqif/spec-object-types/sot-requirement-basic-1.yaml) | `spec-object-type` | Type carrying the citation attribute (`Transitrix.CanonRef`). |
| [`reqif/spec-object-types/sot-rationale-note-1.yaml`](reqif/spec-object-types/sot-rationale-note-1.yaml) | `spec-object-type` | A second, package-internal-only type — no canon citation. |
| [`reqif/spec-objects/so-print-retry-req-1.yaml`](reqif/spec-objects/so-print-retry-req-1.yaml) | `spec-object` | The requirement, expressed in ReqIF-shaped form, citing `REQUIREMENT-PRINT-QUEUE-RETRY-1` via `Transitrix.CanonRef`. |
| [`reqif/spec-objects/so-print-retry-rationale-1.yaml`](reqif/spec-objects/so-print-retry-rationale-1.yaml) | `spec-object` | A rationale note with no canon citation — package-internal content. |
| [`reqif/spec-relations/sr-print-retry-elaborates-1.yaml`](reqif/spec-relations/sr-print-retry-elaborates-1.yaml) | `spec-relation` | First-class, addressable relation: the rationale `elaborates` the requirement. |
| [`reqif/spec-hierarchies/sh-root-1.yaml`](reqif/spec-hierarchies/sh-root-1.yaml) | `spec-hierarchy` | The outline over both `spec-object`s. |

## What it demonstrates

- **Round trip.** `transitrix-reqif roundtrip reqif/` exports this instance to ReqIF XML and re-imports it, asserting an identical object set — the epic's round-trip success signal. Exercised by [`packages/reqif-cli/tests/test_reqif_integrity.py`](../../../../packages/reqif-cli/tests/test_reqif_integrity.py).
- **`SpecRelation` as a first-class object.** The `elaborates` relation is its own addressable file, not an inline field on either `spec-object`.
- **The package → canon direction.** `so-print-retry-req-1` cites the core `REQUIREMENT` by id; nothing in `canon/` references anything under `reqif/`.
- **Removal is clean.** Deleting `reqif/` and the `packages:` line from `transitrix.yaml` leaves `canon/` valid with zero dangling references — run as a test in [`test_reqif_integrity.py`](../../../../packages/reqif-cli/tests/test_reqif_integrity.py), scoped to this instance's own content ([`PACKAGES.md`](../../../PACKAGES.md) §4.3). The general removal *procedure* write-up is separate, sibling package work.

## References

- [`notations/packages/reqif.md`](../../../packages/reqif.md) — the package's own spec: object model, id grammar, validator, converter.
- [`notations/PACKAGES.md`](../../../PACKAGES.md) — the mechanism this package is shipped under.
- [`notations/elements/15-requirement.md`](../../../elements/15-requirement.md) — the core `REQUIREMENT` schema.
