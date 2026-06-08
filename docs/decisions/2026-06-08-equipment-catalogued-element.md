---
status: Accepted
date: 2026-06-08
scope: repo
supersedes: []
superseded_by: []
tags: [equipment, information-entity, process-blueprint, catalogue, technology-layer, business-layer, coverage-profile, notation-schema]
---

# EQUIPMENT and INFORMATION_ENTITY become first-class catalogued elements

## Context

`EQUIPMENT` and `INFORMATION_ENTITY` are registered TYPEs in the canonical grammar (`notations/IDS_AND_REFERENCES.md` §3.1) but neither has an **organisation-wide catalogue**. Today both are canonical-by-containment inside a Process Blueprint document: per `notations/IDS_AND_REFERENCES.md` §4 and `notations/views/13-process-blueprint.md` §5.3, an entry's `EQUIPMENT-…` / `INFORMATION_ENTITY-…` id is a *document-local typed label*, scoped to the blueprint that declares it.

- `EQUIPMENT` — "physical instrument, device, or facility a process stage depends on."
- `INFORMATION_ENTITY` — "data, document, or record produced or consumed by a process stage."

Consequences of the notation-local status (identical for both TYPEs):

1. **No shared identity or lifecycle.** The same asset (e.g. "Barcode scanner", or a "Customs declaration" record) is redefined inline across blueprints with unrelated labels; there is no single record to carry `valid_from`/`valid_to` per `notations/CONTRACT.md` §7, ownership, or attributes.
2. **Cannot be ingested standalone.** The ingest CLI (`emit-candidates`) has no catalogued target to emit these artefacts into.
3. **No cross-blueprint reference.** Two blueprints depending on the same equipment or information entity cannot point at one canonical element.

The methodology already anticipates this — `notations/IDS_AND_REFERENCES.md` §4 states the TYPEs are "registered so the IDs already conform to the canonical grammar and can be promoted to a future catalogue without renaming."

Surfaced 2026-06-08 dogfooding the ingest skill and coverage profiles against a sample repository (finding F4). Within the Transitrix family; no external data involved.

> **History:** an EQUIPMENT-only, `status: Proposed` form of this ADR merged first as PR #142. This revision expands it to both TYPEs and records the decision per Valerii (2026-06-08).

## Decision

Promote **both** `EQUIPMENT` and `INFORMATION_ENTITY` to first-class **catalogued** elements with organisation-wide ID uniqueness, in one wave (decision: Valerii, 2026-06-08).

1. **`EQUIPMENT` → layer `04_technology`.** `EQUIPMENT` is an ArchiMate **Physical** element, and Physical elements belong to the Technology layer. Catalogue path: `canon/elements/04_technology/equipment/`, one file per `EQUIPMENT`. `04_technology` already exists in the canonical layer enum (`notations/COVERAGE_PROFILES.md` §2) but has no catalogued TYPEs yet; `EQUIPMENT` becomes the first. *(Confirmed by Valerii 2026-06-08.)*

2. **`INFORMATION_ENTITY` → layer `02_business`** (recommended). As "data, document, or record" at the business value-chain level it maps to an ArchiMate **Business Object**, a passive business-layer element. Catalogue path: `canon/elements/02_business/information-entities/`, one file per `INFORMATION_ENTITY`. *(Alternative: ArchiMate Data Object → `03_application`, if the team intends these as application-layer data structures rather than business information. Flagged for confirmation at merge.)*

3. **Element-primitive schemas + layer placement.** Record both TYPEs in `notations/ELEMENT_PRIMITIVES.md` §6 with their layer, and give each an element-primitive schema (`id`, `name`, lifecycle per `CONTRACT.md` §7, optional `type`/category, optional `owner`).

4. **Process Blueprint references from the catalogue instead of defining inline.** An `equipment[]` / `information_entities[]` aspect entry that carries an `id` resolves to the matching catalogue record, mirroring how `systems[]` → `APPLICATION` and `actors[]` → `ROLE` already resolve (`notations/views/13-process-blueprint.md` §5.3). A free-form entry without an `id` stays allowed for sketches (unchanged). The `BP-010` prefix rules are retained; a new validation resolves an id-bearing entry against its catalogue once cross-document linking is wired.

5. **Coverage-profile vocabulary.** `EQUIPMENT` becomes available in the `04_technology` allowlist; `INFORMATION_ENTITY` in the `02_business` allowlist. Both join the `full` preset automatically; neither is added to `minimal`/`core`, so existing adopters are unaffected unless they opt in via a custom profile (`notations/COVERAGE_PROFILES.md` §4).

6. **Ingest.** Teach `emit-candidates` to shape `EQUIPMENT` and `INFORMATION_ENTITY` candidates so both can be admitted as standalone artefacts.

## Alternatives considered

- **A — Keep both notation-local (status quo).** Rejected: the no-identity / redefinition / no-ingest problems persist; F4 is precisely this friction.
- **B — Catalogue `EQUIPMENT` under `02_business`.** Rejected: `EQUIPMENT` is an ArchiMate Physical element, not Business; filing it in business contradicts the ArchiMate-aligned layer scheme (compare `RULE`, explicitly placed in `02_business` "per ArchiMate 3.2"). It would also make the coverage-profile layer toggles semantically wrong.
- **C — A bespoke "physical" layer outside the 01–05 scheme.** Rejected: `04_technology` already exists and ArchiMate treats Physical as an extension of the Technology layer.
- **D — Promote `EQUIPMENT` only, defer `INFORMATION_ENTITY`.** Rejected by Valerii (2026-06-08): both are in the identical position; do them in one wave to avoid a second migration.
- **E — `INFORMATION_ENTITY` → `03_application` (Data Object).** Held as the alternative to Decision 2; `02_business` (Business Object) is recommended because the Process Blueprint is a business value-chain view, not an application-data view.

## Consequences

- **New canon surface:** `ELEMENT_PRIMITIVES.md` §6 entries + schemas for both TYPEs; catalogue folders (with per-org README) at `canon/elements/04_technology/equipment/` and `canon/elements/02_business/information-entities/`; the `IDS_AND_REFERENCES.md` §4 rows updated from "no organisation-wide catalogue mandated yet" to the catalogued paths.
- **Process Blueprint spec** (`notations/views/13-process-blueprint.md` §5.3) updated so id-bearing `equipment[]` / `information_entities[]` entries resolve to their catalogues; the worked example may reference catalogued records.
- **Downstream within-family consumers** — Studio and DSM blueprint rendering should resolve and display the catalogued `name` for an id-bearing equipment/information aspect. These become referencing tasks once this ADR lands and are tracked locally (a Studio/DSM local ADR cross-references this one). Stays **within-family** — no hub ADR.
- **Migration is non-breaking.** Existing blueprints with inline free-form entries keep working; promotion to a catalogue is opt-in per asset. The schema change is additive (TYPEs gain catalogues; no field removed).
- **Pattern-setting.** `EQUIPMENT` is the first catalogued element in `04_technology`; `INFORMATION_ENTITY` is the first non-actor/role passive object catalogued for blueprints in `02_business`.
- This is a notation/schema change, so **this ADR is the decision record**; implementation lands as PRs — methodology canon first (registry/primitives/spec/profiles/ingest, one concern per PR), then the Studio/DSM referencing work.

### Decision record

- **Valerii, 2026-06-08:** `EQUIPMENT` → `04_technology`; promote `INFORMATION_ENTITY` in the same wave.
- **Open at merge (single remaining point):** confirm `INFORMATION_ENTITY` → `02_business` (Business Object) over `03_application` (Data Object).
