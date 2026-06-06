# Changelog

All notable changes to the Transitrix methodology.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning is SemVer with pre-1.0 caveats — see [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.

The methodology is **pre-1.0**. MINOR releases (`0.x` → `0.(x+1)`) may carry breaking changes per standard pre-1.0 SemVer; the breaking items are called out under **Changed** with a `BREAKING:` prefix. Pin exactly in production adopter repos until the 1.0 cut.

---

## [0.6.0] — Unreleased

The Actors / Stakeholders identity model (epics #98 / #99). Unifies active-structure identity under one `ACTOR` TYPE and adds the `STAKEHOLDER` interest primitive; retires `UNIT` / `EMPLOYEE`. One pre-1.0 breaking change, called out below.

### Added

- **`notations/elements/19-actors.md`** — `ACTOR` element TYPE: the active-structure identity primitive with `type ∈ {person, business_unit, system}`. Identity only; engagement and hierarchy are relations. Validation codes `ACTOR-001..003`. (#98)
- **`notations/elements/20-stakeholders.md`** — `STAKEHOLDER` element TYPE (motivation layer): `internal` / `external`, carries the stake profile and **references an `ACTOR` for identity** (`actor:` required). Validation codes `STAKE-001..003`. (#99)
- **Engagement + stakeholding relations** in `notations/elements/17-relations.md` §3: `employment`, `candidacy`, `alumni_membership`, `community_membership`, `contracting` (person ↔ org), and `stakeholding` (`STAKEHOLDER → GOAL | ACTIVITY | CAPABILITY`). `unit_parent` re-typed to `ACTOR(business_unit)`.
- **New canonical TYPEs in `notations/IDS_AND_REFERENCES.md` §3.1:** `ACTOR`, `STAKEHOLDER`. New folders `canon/elements/02_business/actors/` and `canon/elements/01_motivation/stakeholders/`.
- **acme_corp worked examples** — `ACTOR` (business_unit / external regulator / person), `STAKEHOLDER` (internal + external), and `stakeholding` / `employment` RELs, with folder READMEs. (#98/#99)
- **`migrations/0.5-to-0.6/`** migration recipe — codemod + validate + fixtures for the UNIT/EMPLOYEE retirement.
- **BPMN role / system cross-references** (`notations/views/01-bpmn.md` §7.2): optional `performed_by_role: ROLE-…` and `supported_by_application: APPLICATION-…` on lanes (default) and elements (override), with explicit precedence and validator rule `BPMN-XREF-001`. Inline view→canon cross-reference (not a `REL`); the principle is noted in `17-relations.md` §3. Both `.templates/bpmn/` templates rewritten from the legacy `activities[]` shape to the canonical `process`/`pools`/`lanes`/`elements`/`flows` structure. (#110)
- **`notations/COVERAGE_PROFILES.md`** — Coverage Profile spec. A new per-adopter declaration (`coverage_profile:` in `transitrix.yaml`) that bounds which element TYPEs (per layer) and relation TYPEs (per `from`-endpoint layer) are in scope for a repository. Ships three presets — `minimal` / `core` / `full` (default `full` when omitted); custom profiles extend a preset with per-layer add/remove deltas; the validator enforces a closure rule (a profile rejecting references its own TYPEs require) and an out-of-profile-document rule. Validation codes `CP-001..005`. `MANIFEST.md` §2 picks up the new `coverage_profile:` field row; `acme_corp/transitrix.yaml` declares `coverage_profile: full` to demonstrate the syntax. (#130)
- **`.claude-plugin/marketplace.json`** at repo root — `transitrix/methodology` repo is now a Claude Code plugin marketplace (`transitrix-methodology`). Single-plugin catalog listing the `transitrix` plugin with source `./skills/onboard`, MIT license, brand-consistent description and keywords, author `Transitrix` (no maintainer personal data per acceptance criterion 4). Install UX is `/plugin marketplace add transitrix/methodology` → `/plugin install transitrix@transitrix-methodology` → `/transitrix:onboard`. Publication itself remains gated. (strategy#23)
- **`skills/onboard/.claude-plugin/plugin.json`** — plugin manifest for the onboarding bundle (name `transitrix`, version `0.1.0`, MIT, keywords, repository / homepage pointers). Marketplace consumes this at install time. (strategy#23)
- **`transitrix/skills/ingest/` — Ingest skill skeleton.** The front-door field→canon pipeline as a second skill under the `transitrix` plugin (`/transitrix:ingest`). This increment ships the agent-neutral protocol (`SKILL.md` — a six-step pipeline: scaffold-intake → convert → field-artefact → emit-candidates → validate → review-queue), the three JSON schemas it produces against (`schemas/field-artefact`, `schemas/candidate`, `schemas/review-queue`), and the operational `_intake/{inbox,processing,processed}` convention (skill-local for now, not yet reserved in MANIFEST/CONTRACT). Core invariants are encoded: **propose-never-write-canon** (emits candidates + a human review queue, never writes `canon/`), **two separate trust axes** (`source_quality` on the source vs. `extraction_confidence` as a review flag, never merged, per CONTRACT §11), **coverage-profile-aware** emission, and **relation-conservative** v0 extraction. Deterministic logic is specified as a published Node CLI (`@transitrix/ingest-cli`) and the forked extraction prompts; both land in follow-up increments. Portable across Claude and GitHub Copilot via the converged Agent Skills format. (#114)
- **`packages/ingest-cli/` — `@transitrix/ingest-cli` + forked extraction prompts.** The deterministic Node CLI the ingest skill shells out to, realising all six pipeline steps (`scaffold-intake`, `convert`, `field-artefact`, `emit-candidates`, `validate`, `review-queue`). Pure Node ESM, zero dependencies; MS Markitdown is the only external touchpoint (shelled out from `convert`). It lives at the repo root, outside the skill bundle and plugin payload, because it is consumed as a published package via `npx`. Enforces the skill's invariants mechanically: never writes `canon/` (proposes only); the candidate contract is checked in code (mirrors `candidate.schema.json`, including the two-axes rule that `source_quality` may not appear on a candidate); coverage-profile gating flags out-of-profile candidates rather than dropping or silently emitting them; relation-conservative emission (only high-confidence relations become candidates). The forked per-layer extraction prompts (`transitrix/skills/ingest/prompts/` — motivation / business / application) emit the result-JSON contract `emit-candidates` consumes. Publishing to npm remains gated. (#115)
- **`notations/elements/15-requirement.md` §1.1–§1.2 — authoring guidance for extracted obligations.** New normative subsections under the REQUIREMENT-vs-CONSTRAINT distinction. §1.1 fixes the default classification rule for obligations extracted from a codex source: positive duty → `REQUIREMENT`, pure prohibition → `CONSTRAINT`. Records the practical observation that positive obligations are the dominant form in regulatory text, so scanners / collectors SHOULD default to `REQUIREMENT` for any plausibly action-shaped obligation; modelling a positive obligation as `CONSTRAINT` is a known authoring mistake that strands ASSERTION (which binds via `about:` to REQUIREMENT only). §1.2 sets the explicit test for when to *mirror* a REQUIREMENT with a CONSTRAINT (both forms in source text, or different subject set, or independent enforcement machinery) vs author only one side — guidance, not validator rules. (strategy#152)
- **Ingest skill tests + CI.** `transitrix/skills/ingest/tests/` mirrors the onboarding harness: `test_ingest_integrity.py` (deterministic, no API key) checks bundle integrity and drives the **real CLI end-to-end** on a fixture — asserting a conformant field artefact with a proposed `source_quality`, relation-conservatism, a review queue with the gate closed, the two-axes rule, and that `canon/` is never written; `drive_ingest_e2e.py` is the weekly-cron LLM drive (skips green without a key / the unpublished CLI). `.github/workflows/ingest-skill-test.yml` runs the integrity job on every PR touching `transitrix/skills/ingest/**` or `packages/ingest-cli/**`, plus the weekly cron. (#118)
- **`notations/views/21-compliance-impact.md`** — `compliance-impact` report-config view. Sibling of `scenarios` over the compliance overlay: the (obligation × subject) matrix derived from `ASSERTION` ([`16-assertion.md`](notations/elements/16-assertion.md)) + `PROCESS.flow` / process-blueprint stages + `REQUIREMENT` status. The view document carries no canonical content — every cell value is derived. §5 fixes the **render contract** (inputs, derivation algorithm, deterministic multi-assertion aggregation) so any conformant renderer reproduces the view identically; supersedes the bespoke `tools/render_impact.py` the regulatory-intelligence build shipped. §5.3 codifies the **§9 empty-cell distinction** — the canonical "No mapped obligation (current model)" label (the model is dark here) vs. an admitted `n_a` assertion (the obligation explicitly does not apply). New document-level TYPE `COMPLIANCE_IMPACT` registered in `notations/IDS_AND_REFERENCES.md` §3.2; worked example under `notations/examples/compliance-impact/`. Validation codes `COMPIMP-001..008`. (strategy#154)

### Changed

- **BREAKING: `UNIT` and `EMPLOYEE` element TYPEs removed.** `UNIT` → `ACTOR(type: business_unit)`; `EMPLOYEE` → `ACTOR(type: person)` + an `employment` REL. Both were registered schema-only on 2026-05-29 and removed the same day before any population; the `0.5 → 0.6` migration recipe records the mapping. (#98)
- **BREAKING: activity ownership collapses to one field.** The parallel `owner` (free-text) / `unit` / `employee` fields on activities become a single `owner: ACTOR-…` (`notations/views/07-activities.md` §5.6). `ROLE.unit` now references an `ACTOR(business_unit)`. (#98)
- **BREAKING: `PROJECT_CARD` view renamed to `ACTIVITY_CARD`.** Spec `notations/views/18-project-card.md` → `18-activity-card.md`; TYPE `PROJECT_CARD` → `ACTIVITY_CARD`; extension `*.project-card.transitrix.yaml` → `*.activity-card.transitrix.yaml`; root key `project_card:` → `activity_card:`. Aligns the view name with the ACTIVITY-as-umbrella model (a card renders any execution level — initiative / programme / project / task). Adds an ArchiMate-class rendering convention (`ACTIVITY` → Work Package, `MILESTONE` → Implementation Event). `MILESTONE` TYPE name unchanged. (#112)
- **`skills/onboarding/` → `skills/onboard/`.** Folder renamed so the plugin-mode slash command is `/transitrix:onboard` (always `/<plugin>:<skill>` in plugin mode — there is no shorter alias for plugin-installed skills). All adopter-facing references updated (`organizations/acme_corp/AGENTS.md`, `GETTING_STARTED.md`, `.templates/EXAMPLES.md`), workflow paths updated (`.github/workflows/onboarding-skill-test.yml`, `.github/workflows/skill-cheatsheet-conformance.yml`), and the cheat-sheet / notations linters point at the new path. The README also drops the deprecated standalone `cp -r ~/.claude/skills/transitrix-onboard/` install path; plugin install is now the single canonical path. (strategy#23)
- **`transitrix` plugin promoted to a multi-skill layout.** The plugin was previously a single-skill bundle rooted at `skills/onboard/` (its `.claude-plugin/plugin.json` lived inside the skill directory). It now follows the canonical multi-skill plugin shape: the plugin root is **`transitrix/`** (carrying the shared `.claude-plugin/plugin.json`), with one skill per `transitrix/skills/<name>/` directory. `skills/onboard/` moved to `transitrix/skills/onboard/`; the marketplace `source` changed from `./skills/onboard` to `./transitrix`. Slash command `/transitrix:onboard` is unchanged. CI workflow path filters, the cheat-sheet / notations linters, and the integrity test's manifest assertion were updated to the new paths; the onboard bundle's internal relative links were re-based one level deeper. This unblocks shipping a second skill (`ingest`) under the one `transitrix` plugin. (#114)

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
