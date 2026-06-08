---
status: Accepted
date: 2026-06-08
scope: repo
supersedes: []
superseded_by: []
tags: [equipment, business-object, information-entity-rename, process-blueprint, catalogue, technology-layer, business-layer, coverage-profile, notation-schema, migration]
---

# EQUIPMENT and BUSINESS_OBJECT become first-class catalogued elements

## Context

The Process Blueprint notation carries two passive aspect TYPEs that are registered in the canonical grammar (`notations/IDS_AND_REFERENCES.md` §3.1) but have **no organisation-wide catalogue** — they are canonical-by-containment inside a single blueprint document (per `notations/IDS_AND_REFERENCES.md` §4 and `notations/views/13-process-blueprint.md` §5.3), so an entry's id is a *document-local typed label*:

- `EQUIPMENT` — "physical instrument, device, or facility a process stage depends on."
- `INFORMATION_ENTITY` — "data, document, or record produced or consumed by a process stage."

Consequences of the notation-local status (identical for both):

1. **No shared identity or lifecycle.** The same asset (a "Barcode scanner", a "Customs declaration" record) is redefined inline across blueprints with unrelated labels; there is no single record to carry `valid_from`/`valid_to` per `notations/CONTRACT.md` §7, ownership, or attributes.
2. **Cannot be ingested standalone.** The ingest CLI (`emit-candidates`) has no catalogued target to emit these artefacts into.
3. **No cross-blueprint reference.** Two blueprints depending on the same element cannot point at one canonical record.

The methodology already anticipates the promotion — `notations/IDS_AND_REFERENCES.md` §4 states the TYPEs are "registered so the IDs already conform to the canonical grammar and can be promoted to a future catalogue without renaming."

Surfaced 2026-06-08 dogfooding the ingest skill and coverage profiles against a sample repository (finding F4). Within the Transitrix family; no external data involved.

> **History:** an EQUIPMENT-only, `status: Proposed` form of this ADR merged first as PR #142. This revision expands it to both passive TYPEs, renames `INFORMATION_ENTITY → BUSINESS_OBJECT`, and records the decision per Valerii (2026-06-08).

## Decision

Promote **both** passive blueprint TYPEs to first-class **catalogued** elements with organisation-wide ID uniqueness, in one wave (decision: Valerii, 2026-06-08).

1. **`EQUIPMENT` → layer `04_technology`.** `EQUIPMENT` is an ArchiMate **Physical** element; Physical elements belong to the Technology layer. Catalogue path `canon/elements/04_technology/equipment/`, one file per `EQUIPMENT`. `04_technology` already exists in the canonical layer enum (`notations/COVERAGE_PROFILES.md` §2) but has no catalogued TYPEs yet; `EQUIPMENT` becomes the first. The TYPE name is unchanged (it already matches the ArchiMate noun).

2. **Rename `INFORMATION_ENTITY → BUSINESS_OBJECT`, catalogued at layer `02_business`.** At the business value-chain grain the passive information element is an ArchiMate **Business Object** (a concept used within a business domain), so the TYPE is named for the ArchiMate element it maps to — matching how `EQUIPMENT`, `ACTOR`, `ROLE`, `RULE` already use their ArchiMate nouns. Catalogue path `canon/elements/02_business/business-objects/`, one file per `BUSINESS_OBJECT`; ID prefix `BUSINESS_OBJECT-`; the blueprint aspect array `information_entities[]` is renamed `business_objects[]`.

   **Scope note (deliberate narrowing).** `BUSINESS_OBJECT` is the ArchiMate Business Object *concept* only. ArchiMate splits this from **Representation** (a document's perceptible form) and **Data Object** (data structured for automated processing, application layer). The former `INFORMATION_ENTITY` umbrella ("data, document, or record") collapses all three; under this decision a *document* is the Business Object's Representation and *application data* is a Data Object. Those sub-senses become separate TYPEs only if a future need arises; for the blueprint grain `BUSINESS_OBJECT` is correct and sufficient.

3. **Element-primitive schemas + layer placement.** Record both TYPEs in `notations/ELEMENT_PRIMITIVES.md` §6 with their layer, each with an element-primitive schema (`id`, `name`, lifecycle per `CONTRACT.md` §7, optional `type`/category, optional `owner`).

4. **Process Blueprint references from the catalogue instead of defining inline.** An `equipment[]` / `business_objects[]` aspect entry that carries an `id` resolves to the matching catalogue record, mirroring how `systems[]` → `APPLICATION` and `actors[]` → `ROLE` already resolve (`notations/views/13-process-blueprint.md` §5.3). A free-form entry without an `id` stays allowed for sketches (unchanged). The `BP-010` prefix rules are updated (`BUSINESS_OBJECT-` replaces `INFORMATION_ENTITY-`); a new validation resolves an id-bearing entry against its catalogue once cross-document linking is wired.

5. **Coverage-profile vocabulary.** `EQUIPMENT` becomes available in the `04_technology` allowlist; `BUSINESS_OBJECT` in the `02_business` allowlist. Both join the `full` preset automatically; neither is added to `minimal`/`core`, so existing adopters are unaffected unless they opt in via a custom profile (`notations/COVERAGE_PROFILES.md` §4).

6. **Ingest.** Teach `emit-candidates` to shape `EQUIPMENT` and `BUSINESS_OBJECT` candidates so both can be admitted as standalone artefacts.

7. **Migration (the rename is breaking).** Renaming a registered TYPE + blueprint aspect field + ID prefix is a breaking change. Ship it as a versioned migration: keep `information_entities[]` and the `INFORMATION_ENTITY-` prefix as a **deprecated alias for one release** (validator warns and rewrites on read), with a migration recipe under `migrations/`, then remove the alias. Existing blueprints keep validating through the alias window.

## Alternatives considered

- **A — Keep both notation-local (status quo).** Rejected: the no-identity / redefinition / no-ingest problems persist; F4 is precisely this friction.
- **B — Catalogue `EQUIPMENT` under `02_business`.** Rejected: `EQUIPMENT` is an ArchiMate Physical element, not Business; filing it in business contradicts the ArchiMate-aligned layer scheme (compare `RULE`, explicitly placed in `02_business` "per ArchiMate 3.2") and would make the coverage-profile layer toggles semantically wrong.
- **C — A bespoke "physical" layer outside the 01–05 scheme.** Rejected: `04_technology` already exists and ArchiMate treats Physical as an extension of the Technology layer.
- **D — Promote `EQUIPMENT` only, defer the second TYPE.** Rejected by Valerii (2026-06-08): both are in the identical position; do them in one wave to avoid a second migration.
- **E — Keep the name `INFORMATION_ENTITY`, record only the Business-Object mapping (no rename).** Rejected by Valerii (2026-06-08): the methodology names passive TYPEs for their ArchiMate element where a clean 1:1 holds (`EQUIPMENT`, `ACTOR`, `ROLE`, `RULE`); keeping a non-ArchiMate umbrella name on a business-layer Business Object is the inconsistency. The one-release alias covers the migration cost.
- **F — `BUSINESS_OBJECT` → `03_application` (Data Object).** Rejected: the Process Blueprint is a business value-chain view, not an application-data view; the passive element there is a business concept (Business Object), not machine data.

## Consequences

- **New canon surface:** `ELEMENT_PRIMITIVES.md` §6 entries + schemas for both TYPEs; catalogue folders (with per-org README) at `canon/elements/04_technology/equipment/` and `canon/elements/02_business/business-objects/`; the `IDS_AND_REFERENCES.md` §3.1/§4 rows updated — `EQUIPMENT` catalogued path, and the `INFORMATION_ENTITY` row replaced by `BUSINESS_OBJECT` with its catalogued path.
- **Breaking rename cascade (BUSINESS_OBJECT):** the blueprint aspect array (`information_entities[]` → `business_objects[]`), the ID prefix, the `BP-010` rule, the worked examples, and the Studio + DSM blueprint renderers all move from `INFORMATION_ENTITY` to `BUSINESS_OBJECT`. Mitigated by the one-release deprecated alias (Decision 7).
- **Downstream within-family consumers** — Studio and DSM blueprint rendering should resolve and display the catalogued `name` for an id-bearing aspect, and accept the renamed field/prefix (alias for one release). Tracked locally; a Studio/DSM local ADR cross-references this one. Stays **within-family** — no hub ADR.
- **Migration is bounded, not free.** Unlike `EQUIPMENT` (promoted in place, no rename), `BUSINESS_OBJECT` carries the rename. Inline free-form entries keep working; catalogue promotion is opt-in per asset; the alias window keeps existing blueprints valid.
- **Pattern-setting.** `EQUIPMENT` is the first catalogued element in `04_technology`; `BUSINESS_OBJECT` is the first passive business object catalogued for blueprints in `02_business`. The pair now uses ArchiMate nouns consistently.
- This is a notation/schema change, so **this ADR is the decision record**; implementation lands as PRs — methodology canon first (registry/primitives/spec/profiles/ingest/migration, one concern per PR), then the Studio/DSM referencing + rename work.

### Decision record

- **Valerii, 2026-06-08:** `EQUIPMENT` → `04_technology` (name unchanged); promote the second passive TYPE in the same wave and **rename `INFORMATION_ENTITY → BUSINESS_OBJECT`**, catalogued at `02_business` (ArchiMate Business Object). Ship the rename with a one-release deprecated alias.
- No open points remain; implementation PRs follow.
