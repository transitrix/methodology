---
status: Proposed
date: 2026-06-08
scope: repo
supersedes: []
superseded_by: []
tags: [equipment, process-blueprint, catalogue, technology-layer, coverage-profile, notation-schema]
---

# EQUIPMENT becomes a first-class catalogued element (technology layer)

## Context

`EQUIPMENT` is a registered TYPE in the canonical grammar (`notations/IDS_AND_REFERENCES.md` §3.1) — "physical instrument, device, or facility a process stage depends on" — but it has **no organisation-wide catalogue**. Today it is canonical-by-containment inside a Process Blueprint document: per `notations/IDS_AND_REFERENCES.md` §4 and `notations/views/13-process-blueprint.md` §5.3, an entry's `EQUIPMENT-…` id is a *document-local typed label*, scoped to the blueprint that declares it. `INFORMATION_ENTITY` sits in exactly the same position.

Consequences of the notation-local status:

1. **No shared identity or lifecycle.** The same physical asset (e.g. "Barcode scanner") is redefined inline across blueprints with unrelated labels; there is no single record to carry `valid_from`/`valid_to` per `notations/CONTRACT.md` §7, ownership, or attributes.
2. **Cannot be ingested standalone.** The ingest CLI (`emit-candidates`) has no catalogued target to emit an `EQUIPMENT` artefact into, so equipment that appears in source material cannot be admitted as a first-class object.
3. **No cross-blueprint reference.** Two blueprints depending on the same equipment cannot point at one canonical element.

Surfaced 2026-06-08 while dogfooding the ingest skill and coverage profiles against a sample repository (finding F4). Within the Transitrix family; no external data involved. The methodology already anticipates this promotion — `notations/IDS_AND_REFERENCES.md` §4 states the TYPEs are "registered so the IDs already conform to the canonical grammar and can be promoted to a future catalogue without renaming."

## Decision

1. **Promote `EQUIPMENT` to a first-class catalogued element** with organisation-wide ID uniqueness, using the promotion mechanic the registry already describes. Catalogue path: `canon/elements/04_technology/equipment/`, one file per `EQUIPMENT`.

2. **Layer = `04_technology`.** `EQUIPMENT` is an ArchiMate **Physical** element, and Physical elements belong to the Technology layer. `04_technology` already exists in the canonical layer enum (`notations/COVERAGE_PROFILES.md` §2) but currently has no catalogued TYPEs; `EQUIPMENT` becomes the first. Record its layer placement in `notations/ELEMENT_PRIMITIVES.md` §6 and give it an element-primitive schema (`id`, `name`, lifecycle per `CONTRACT.md` §7, optional `type`/category, optional `owner`).

3. **Process Blueprint references equipment from the catalogue instead of defining it inline.** An `equipment[]` aspect entry that carries an `id` resolves to an `EQUIPMENT-…` record in `canon/elements/04_technology/equipment/`, mirroring how `systems[]` → `APPLICATION` and `actors[]` → `ROLE` already resolve (`notations/views/13-process-blueprint.md` §5.3). A free-form entry without an `id` stays allowed for sketches (unchanged). The `BP-010` `EQUIPMENT-` prefix rule is retained; a new validation resolves an id-bearing entry against the catalogue once cross-document linking is wired.

4. **Coverage-profile vocabulary.** `EQUIPMENT` becomes available in the `04_technology` layer allowlist. It joins the `full` preset automatically; it is **not** added to `minimal`/`core` (both keep `04_technology` empty), so existing adopters are unaffected unless they opt in via a custom profile (`notations/COVERAGE_PROFILES.md` §4).

5. **Ingest.** Teach `emit-candidates` to shape an `EQUIPMENT` candidate so equipment can be admitted as a standalone artefact (this is the catalogued target finding F1 / the IG-line work needs).

## Alternatives considered

- **A — Keep `EQUIPMENT` notation-local (status quo).** Rejected: the no-identity / redefinition / no-ingest problems persist; F4 is precisely this friction.
- **B — Catalogue under `02_business`.** Rejected: `EQUIPMENT` is an ArchiMate Physical element, not a Business element. Filing it in business would contradict the methodology's ArchiMate-aligned layer scheme — compare `RULE`, which is explicitly placed in `02_business` "per ArchiMate 3.2" (`notations/IDS_AND_REFERENCES.md`). Misplacement would also make the coverage-profile layer toggles semantically wrong.
- **C — A bespoke "physical" layer outside the 01–05 scheme.** Rejected: `04_technology` already exists in the layer enum and ArchiMate treats Physical as an extension of the Technology layer — no new layer is needed.

## Consequences

- **New canon surface:** an `ELEMENT_PRIMITIVES.md` §6 entry + element-primitive schema for `EQUIPMENT`; a catalogue folder (with per-org README) at `canon/elements/04_technology/equipment/`; the `IDS_AND_REFERENCES.md` §4 row updated from "no organisation-wide catalogue mandated yet" to "catalogued at `04_technology/equipment/`."
- **Process Blueprint spec** (`notations/views/13-process-blueprint.md` §5.3) updated so id-bearing equipment entries resolve to the catalogue; the worked example may reference an `EQUIPMENT-…` record.
- **Downstream within-family consumers** — Studio and DSM blueprint rendering should resolve and display the catalogued `name` for an id-bearing equipment aspect. These become referencing tasks once this ADR lands and are tracked locally (a Studio/DSM local ADR cross-references this one). This stays **within-family** — no hub ADR.
- **Migration is non-breaking.** Existing blueprints with inline free-form `equipment[]` entries keep working; promotion to the catalogue is opt-in per asset. The schema change is additive (a TYPE gains a catalogue; no field is removed).
- **Pattern-setting.** `EQUIPMENT` is the first catalogued element in `04_technology`; `INFORMATION_ENTITY` is the parallel candidate for the same promotion.
- This is a notation/schema change, so **this ADR is the decision record**; implementation lands as PRs — methodology canon first (registry/primitives/spec/profiles/ingest), then the Studio/DSM referencing work.

### Open for Valerii (gate at merge)

- Confirm `04_technology` over `02_business` for the catalogue layer.
- Decide whether `INFORMATION_ENTITY` is promoted in the same wave or deferred to a follow-up.
