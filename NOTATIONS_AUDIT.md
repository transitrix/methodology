# Notations / examples validation — audit

**Status:** tracked (was a gitignored local snapshot until 2026-05-30).
**Last full review:** 2026-05-30. **Status check 2026-07-04:** re-verified
every open item against the files on `main`; §2 item 3 resolved, §2 item 2
partially resolved (see below). **Phase 4 freeze pass (2026-07-04, same
day):** a separate PR resolved §2 items 1 and 2 in full, plus the `BP-010`
and stale-notation-count nits in §3/§4. **Only one open item remains**: the
capability-map display-name nit in §3. Close to archivable — one trivial nit
away — but not archiving while anything is still open.
**Scope:** conformance of `notations/examples/**` and the per-notation specs in
`notations/` to the canonical contract. Excludes `0. archive/`.

This file is the **judgement half** of the front-door rot defence. The
**mechanical half** is automated: `scripts/check-notations.mjs` (run in CI by
`.github/workflows/notations-doc-lint.yml`) checks the things a script can
decide — example file extensions, `notation:` headers, internal-link
resolution, and `methodology_version` pin consistency. Keep the two disjoint:
anything a linter can verify belongs in the script, not here; anything needing
human judgement (conceptual drift, an unresolved shape decision) belongs here.

> History: the 2026-05-19/20 snapshot that used to live here (gitignored)
> flagged a list of example-drift items — flat-vs-nested FGA/Goals, the
> capability `type`/ID migration, BPMN extension/header/boolean drift, the
> `order-fulfillment`/`order-processing` duplicate. **Every one of those is now
> resolved** (verified 2026-05-30 against the files on `main`). That snapshot is
> superseded by this audit; do not act on it.

---

## 1. Mechanical conformance — clean (and now CI-guarded)

Re-verified 2026-05-30 by reading the files directly; now also enforced by the
doc-lint so it cannot silently rot:

- **BPMN examples** — all use the canonical `*.bpmn.transitrix.yaml` extension
  and carry a `notation: bpmn` header. Boolean conditions are quoted
  (`condition: "yes"`/`"no"`). No `order-processing` duplicate exists.
- **FGA / Goals** — flat shape, consistent with the strategy-chain form rule.
- **Capability-map** — every node carries `type`; IDs use canonical
  `CAPABILITY-V…` / `CAPABILITY_MAP-…` (the 2026-05-28 migration is in).
- **products / applications** — canonical `PRODUCT-…` / `APP-…` / `ROLE-…` /
  `CAPABILITY-V…` IDs throughout, no display-name-as-ID.
- **Internal links** — the doc-lint's first run surfaced 26 broken relative
  links that had silently rotted: `CONTRACT.md` dropped the `elements/` / `views/`
  path segment for `15-requirement` / `16-assertion` / `05-capability-map` /
  `10-applications`, and seven example READMEs dropped the `views/` segment (and
  one pointed at a never-created `docs/repo-layout.md`). **All repaired in the
  same change that added the lint** — links now resolve and the lint is green.
- **Example extensions, `notation:` headers, version pins** — all consistent
  (the four doc-lint checks pass on a clean checkout).

---

## 2. Open judgement items (a linter cannot decide these)

These are unresolved **decisions**, not regressions. Each needs Valerii's
direction before any file moves.

1. ~~**Catalogue-root prefix — `elements/…` vs `canon/elements/…`.**~~ —
   **resolved (Phase 4 freeze pass, 2026-07-04).** `IDS_AND_REFERENCES.md`
   §3.1/§4 now use `canon/elements/…` / `canon/relations/` /
   `canon/assertions/` throughout, consistent with `CONTRACT.md` §7.1 and
   `notations/README.md`.

2. ~~**ArchiMate element IDs — prefix-IDs vs full-word TYPE-IDs.**~~ —
   **resolved (Phase 4 freeze pass, 2026-07-04).** `method/01-methodology.md`
   §3a.2–§3a.5's legacy abbreviated-prefix columns (`GOAL-`, `APP-`, `ACTR-`,
   …) are replaced by a "Canonical TYPE" column showing the full-word TYPE
   from `IDS_AND_REFERENCES.md` (`—` for ArchiMate types not yet registered).
   §3a.9's naming rule and the §3a.7/§3a.8 YAML examples were already fixed
   to the canonical grammar earlier the same day. Adopters who followed the
   old §3a abbreviated prefixes migrate via the 0.7→1.0 migration recipe.

3. ~~**SCENARIO / ISSUE reclassification**~~ — **resolved**. `SCENARIO` is now
   a standalone content element (`ELEMENT_PRIMITIVES.md` §7.18; view spec
   [`11-scenarios.md`](./notations/views/reports/11-scenarios.md) is a report-config
   surface over it, not a content home). The former model-side `ISSUE`
   notation was retired 2026-06-07 (`method/01-methodology.md` §4.1). No
   non-promotable `view-defined` rows remain (`ELEMENT_PRIMITIVES.md` §4.2).

---

## 3. Minor nits (flagged, not auto-fixed)

Surfaced but left for Valerii — examples are not edited unilaterally.

- `notations/examples/capability-map/northbay-retail.capability-map.transitrix.yaml`:
  capability `V1.2.1` (In-store Retail) has `owner_role: Director of Retail
  Operations` (a display name) where every other node uses a `ROLE-…` ID.
  One-line inconsistency, not structural drift.

- ~~`organizations/NEW_ORGANIZATION_TEMPLATE.md` is stale~~ — **resolved**: the
  file described a pre-zone layout superseded by the onboarding Skill's own
  scaffolding, and has been retired.

---

## 4. Coverage honesty

The 2026-05-30 pass verified: `bpmn`, `dgca`, `goals`, `capability-map`,
`products`, `applications`, `process-map`.

**Second pass — 2026-06-29** walked the remaining five notations
(`blocks`, `action`, `process-blueprint`, `action-card`, `actions-tree`;
note: `activities` → `action` and `activity-card` → `action-card` were
renamed since the first pass). Findings below; two conformance bugs fixed
in the same PR that updated this file.

### blocks (`notations/views/diagrams/08-blocks.md`)

Required fields: `notation`, `name` (doc root), `nested_blocks.id`,
`nested_blocks.name`, `nested_blocks.blocks[]` (each entry: `id`, `name`).

- All required document-root fields present in the spec examples. ✅
- **Example file bug fixed:** `examples/blocks/architecture.blocks.transitrix.yaml`
  was missing `nested_blocks.name` (required, `BL-003` error severity). Fixed
  by adding `name: "Software architecture"` inside `nested_blocks:`.
- All block entries carry `id` and `name` at every depth. ✅
- Free-form IDs (no canonical-grammar prefix) used for all blocks — this is
  explicitly allowed by the spec (§5.2). ✅
- ~~Nit: spec intro refers to "thirteen Transitrix notations"~~ — **resolved
  (Phase 4 freeze pass, 2026-07-04):** now says "fifteen" (the actual count).

### action (`notations/views/diagrams/07-action.md`)

Required fields: `notation`, `name` (doc root), `actions[]` (each entry: `id`,
`name`). Deprecated aliases: `activities`, `activity_type`.

Both example files (`office-relocation.action.transitrix.yaml`,
`platform-launch.action.transitrix.yaml`) walk clean:
- All required fields present. ✅
- Multi-value fields (`goals`, `predecessors`, `tags`, `delivers_changes`) all
  use array form — single-value forms (`goal:`) absent. ✅
- Milestone actions (`duration: 0`) have `start_date == end_date` per `ACT-016`. ✅
- No deprecated `activities` / `activity_type` aliases in examples. ✅
- `owner` references use `ACTOR-…` prefix. ✅

### process-blueprint (`notations/views/diagrams/13-process-blueprint.md`)

Required fields: `notation`, `name` (doc root), `process_blueprint.id`,
`process_blueprint.name`, `process_blueprint.stages[]` (each entry: `id`,
`name`, `goal`, `result`). Each aspect entry: `name`, `stages[]` (non-empty).

- **Example file bug fixed:** `examples/process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml`
  was missing `process_blueprint.name` (required, `BP-003` error severity).
  Fixed by adding `name: "Order fulfilment — operational blueprint"` inside
  `process_blueprint:`.
- All stage entries carry `id`, `name`, `goal`, `result`. ✅
- `systems[]` entries with `id` use `APPLICATION-` prefix. ✅
- `actors[]` entries with `id` use `ROLE-` prefix. ✅
- `equipment[]` entries use free-form names (no `id`). ✅
- Example uses `business_objects[]` (not deprecated `information_entities[]`). ✅
- ~~Nit (spec): `BP-010` validation rule omits `business_objects[]`~~ —
  **resolved (Phase 4 freeze pass, 2026-07-04):** `BP-010` now explicitly
  requires the `BUSINESS_OBJECT-` prefix for `business_objects[]` entries.
- ~~Nit: spec intro refers to "twelve Transitrix notations"~~ — **resolved
  (Phase 4 freeze pass, 2026-07-04):** now says "fifteen".

### action-card (`notations/views/diagrams/18-action-card.md`)

Required fields: `notation`, `name` (doc root), `action_card.id`,
`action_card.project`. Milestone entries: `id`, `name`, `date`. Deprecated
aliases: `activity-card`, `activity_card:`.

Example file (`examples/action-card/eu-programme.action-card.transitrix.yaml`)
walks clean:
- All required fields present. ✅
- `action_card.id` matches `ACTION_CARD-<DOMAIN>-<INTEGER>`. ✅
- Milestone `id`s match `MILESTONE-<MIDDLE>-<INTEGER>`. ✅
- Milestone `delivers_changes[]` uses array form. ✅
- No deprecated `activity-card` aliases in example. ✅
- `generated_at` absent — optional, acceptable. ✅

### actions-tree (`notations/views/reports/23-actions-tree.md`)

Status: `draft`. No example file yet — by design for a newly drafted
notation. The spec is internally consistent; validation rules
(`ATREE-001..008`) follow the shared contract pattern. No example to walk.

---

**Coverage after second pass (2026-06-29):** all 15 view-notation specs have
now been walked at least once. The doc-lint covers mechanical invariants
continuously. The two example bugs found by the manual walk are fixed. The
stale notation counts and the `BP-010` gap were resolved in the Phase 4
freeze pass (2026-07-04) — see §2 and §3 above.
