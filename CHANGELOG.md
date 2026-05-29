# Changelog

All notable changes to the Transitrix methodology.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning is SemVer with pre-1.0 caveats — see [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.

The methodology is **pre-1.0**. MINOR releases (`0.x` → `0.(x+1)`) may carry breaking changes per standard pre-1.0 SemVer; the breaking items are called out under **Changed** with a `BREAKING:` prefix. Pin exactly in production adopter repos until the 1.0 cut.

---

## [0.5.0] — 2026-05-28

A large release covering three completed epics (Compliance & regulation tracking, Temporal model, Per-layer extraction prompts) plus the methodology-upgrade-path policy and the Project Card notation. Adds three shared contracts (primitive lifecycle, compliance-domain rule index, versioned-attribute sidecar) plus a versioning policy. Adds five new notations and seven new element / document TYPEs. Several pre-1.0 breaking changes are called out under Changed.

### Added

- **`notations/CONTRACT.md` §7 — Primitive lifecycle.** Every canonical element MUST carry `valid_from` and `valid_to` in its frontmatter; `valid_to: null` indicates currently in effect. Adds shared validation codes `LIFECYCLE-001..004`. (Temporal model Wave 1; #42, #48–#56)
- **`notations/CONTRACT.md` §8 — Compliance-domain rules.** Aggregated index of all `REQ-*` and `ASSERT-*` validation rules — discoverability for the compliance domain; per-notation specs remain authoritative for the definitions. (Compliance epic Phase 5; #47)
- **`notations/CONTRACT.md` §9 — Versioned-attribute sidecar.** Time-varying attributes live in `<primitive_id>.history.yaml` sidecars; not inline. Shared validation codes `VERSIONED-001..005`. (Temporal model Wave 2; #57–#60)
- **`notations/CONTRACT.md` §10 — Versioning and compatibility.** SemVer semantics for the methodology, pre-1.0 disclaimer, release promise, scope boundaries. (#65)
- **`RELEASING.md`** at repo root — per-release operational checklist for the maintainer; companion to CONTRACT §10. (#65)
- **`notations/elements/15-requirement.md`** — REQUIREMENT element-type spec (motivation layer; positive obligation). Validation codes `REQ-001..003`. (Compliance epic Phase 1; #43)
- **`notations/elements/16-assertion.md`** — ASSERTION notation spec (canon-zone primitive linking REQUIREMENT to subject). Validation codes `ASSERT-001..008`. (Compliance epic Phase 2; #44)
- **`notations/elements/17-relations.md`** — REL spec for first-class time-aware relations between canonical primitives (`canon/relations/<ID>.yaml`). Closed enum: `parent` / `goal_parent` / `activity_goal` / `unit_parent` (reserved). Validation codes `REL-001..004`. (Temporal model Wave 3; #61)
- **`notations/views/18-project-card.md`** — Project Card spec for the single-project narrative view (`*.project-card.transitrix.yaml`). Document-scoped MILESTONE element for narrative gates. Validation codes `PC-001..004`. (Project Card epic Phase 1; #70)
- **Cross-cutting compliance rules** `REQ-COVERAGE-001` (warning — REQUIREMENT has no ASSERTION) and `ASSERT-DEAD-LINK-001` (warning — assertion bound to retired element). (Compliance epic Phase 5; #47)
- **New canonical TYPEs registered in `notations/IDS_AND_REFERENCES.md` §3.1:** `REQUIREMENT`, `ASSERTION` (via §3.6), `REL`, `MILESTONE`. New document-level TYPE: `PROJECT_CARD`.
- **`skills/onboarding/extraction/`** — Three per-layer extraction prompts (`01_motivation.md` / `02_business.md` / `03_application.md`) for initial Canon population from Field artefacts, plus a README and a smoke-test INTERVIEW fixture. (Extraction prompts epic; #66–#69)
- **acme_corp worked examples** for the new notations: REQUIREMENT + ASSERTION compliance chain (#46), Capability + sidecar demonstrating versioned attributes (#60), re-parenting REL pair demonstrating time-aware relations (#64), folder READMEs throughout.
- **GitHub Actions workflow** `Skill cheat-sheet conformance` running `scripts/check-skill-cheatsheet.mjs` on every PR plus a weekly Monday cron (added prior to 0.5.0 cycle; referenced for completeness).

### Changed

- **BREAKING (pre-1.0):** Codex `applies_to.{entities, processes}` retired from external and internal codex frontmatter. Bindings move to `REQUIREMENT.derived_from` plus ASSERTION. `CODEX-002` updated to drop `applies_to` from required fields; `CODEX-003` retired (code reserved); new `CODEX-004` (warning) fires on legacy `applies_to` presence. Migration documented in `notations/elements/14-codex.md` §8. (Compliance epic Phase 3; #45)
- **BREAKING (pre-1.0):** Three of the catalogued notations declare specific cross-reference fields as **time-aware** (REL-required, not inline): capability `parent` (05-capability-map §13a, #62), goal `parent` (04-goals §"Time-aware relations", #63), activity `goals` (07-activities §"Time-aware relations", #63). Adopters with inline `children[]` / `parent: GOAL-…` / `goals: [GOAL-…]` keep them as a v0.x transitional form; `REL-004` fires once their validator enforces post-migration. Hard-removal is a future PR aligned with the migration tooling.
- **BREAKING (pre-1.0):** Capability-map and applications notations declare specific fields as **time-varying** (sidecar-required, not inline): `current_maturity` / `owner_role` / `target_date` on capability-map (#58); `owner_role` / `vendor` / `maturity` on applications (#59). Migration documented in each spec.
- **`notations/views/07-activities.md` §5.9** renamed "Milestones" → "Schedule milestones" + explicit distinction from project-card milestones (the two coexist). Behaviour unchanged. (#70)
- **`notations/IDS_AND_REFERENCES.md`** capability ID canonical form fully migrated across spec, examples, and acme_corp surface (no remaining `V1` / `CM-…` bare forms in scope). Canonical: `CAPABILITY-V1`, `CAPABILITY_MAP-…`. Residual scope (scenarios spec + examples; supporting prose in `method/methodology.md` + `integration/studio.md`) called out in IDS §6. (#39)
- **`organizations/acme_corp/AGENTS.md`** "Reconciliation note" updated to record that the onboarding Skill now scaffolds the zoned + assistant-neutral shape (open item closed by #40).
- **`skills/onboarding/SKILL.md`** scaffolds the zoned `canon/` + `field/` + `codex/` layout, drops `AGENTS.md` (not `CLAUDE.md`) + `.github/copilot-instructions.md` pointer + `transitrix.yaml` manifest. Templates expanded with codex external + internal + transitrix manifest + agent guide + copilot pointer. (#40)
- **`organizations/acme_corp/transitrix.yaml`** `methodology_version` bumped from `0.4.x` to `0.5.0`. Notations list expanded to include `requirement`, `assertion`, `relation`, `project-card` now in use within acme_corp.

### Deprecated

- Inline `children[]` on capability-map view documents (use `REL-…-PARENT-…` files instead; both forms coexist in 0.5.0).
- Inline `parent: GOAL-…` on goal entries (use REL `goal_parent` files instead; both coexist).
- Inline `goals: [GOAL-…]` on activity entries (use REL `activity_goal` files instead; both coexist).
- Inline `current_maturity` / `owner_role` / `target_date` on capability-map view documents (use the sidecar `<id>.history.yaml` instead).
- Inline `owner_role` / `vendor` / `maturity` on applications catalogue entries (sidecar).
- Codex `applies_to.{entities, processes}` on external and internal codex artefacts (retired entirely; `CODEX-004` warning).

### Fixed

- Capability ID canonical form drift across spec, examples, and acme_corp surface — capability-map portion executed; residual narrowed in IDS §6. (#39)
- Onboarding Skill scaffold mismatch with `acme_corp` shape — Skill now scaffolds the zoned layout + assistant-neutral `AGENTS.md` + `transitrix.yaml` manifest + codex zone primitives. (#40)
- Skill cheat-sheet drift from canon catalogue — CI workflow runs `scripts/check-skill-cheatsheet.mjs` on every PR; failure is red. (#41)

### Out of scope / deferred

- **Migration recipe codemod for 0.4 → 0.5** — methodology-upgrade-path epic Phase 2. The Deprecated and Changed items above are mechanical migrations; a codemod ships with epic #78 Phase 2.
- **`transitrix migrate` CLI** in Studio — methodology-upgrade-path epic Phase 3.
- **The 1.0 cut decision** — methodology-upgrade-path epic Phase 4.
- **Hard removal of deprecated inline fields** — gated on the migration codemod landing.
- **`notations/` folder restructure** (view vs element separation) — filed as a separate task in the strategy hub.
- **Scanner-and-monitoring story** for Codex (regulatory intelligence) — future epic.

---

## [0.4.x] and earlier

No `CHANGELOG.md` was maintained before 0.5.0. Earlier history is in the git log.
