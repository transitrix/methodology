# Changelog

All notable changes to the Transitrix methodology.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning is SemVer — see [`notations/CONTRACT.md`](notations/CONTRACT.md) §10. Post-1.0: MINOR releases carry only additive changes; breaking changes require a MAJOR bump. Migration recipes live under `migrations/`.

---

## [3.0.0] — 2026-07-29

Bump category: **MAJOR** — two element TYPEs and one view leave the core vocabulary. Migration recipe: [`migrations/2.1-to-3.0/`](migrations/2.1-to-3.0/), with a read-only detector that names the affected files before anything else runs.

**A repository that uses `REQUIREMENT` → `VERIFICATION` and nothing else is unaffected — 3.0 is a no-op for it.**

### Removed

- **`notations/elements/28-hazard-risk-control.md`** — the `HAZARD` and `RISK_CONTROL` element TYPEs, their registry entries, their canon folders (`canon/elements/01_motivation/hazards/`, `.../risk-controls/`), and their rules `HAZ-001..004`, `RISKCTL-001..005`, `HAZ-RISKCTL-COVERAGE-001/-002`, `RISKCTL-VERIF-COVERAGE-001`. A domain-specific risk-management chain is a specialisation of one regulated domain, not general architecture vocabulary, and it does not ship in the core.
- **`notations/views/24-design-controls-trace-matrix.md`** and its reference renderer `tools/render_trace_matrix.py` — the view existed to render the removed chain.
- **`transitrix/skills/onboard/templates/design-controls-trace-matrix.*`** — the onboarding template for that view.
- **`notations/examples/design-controls/`** and **`notations/examples/design-controls-trace-matrix/`** — replaced by `notations/examples/verification/` (below).

### Added

- **`notations/README.md` §"Expressing risk"** — how to say *risk* with the primitives the core already has, following the Open Group's ArchiMate *Risk and Security Overlay* mapping (risk / vulnerability → `ASSESSMENT`, threat → `DRIVER`, control objective → `GOAL`, control measure → `REQUIREMENT` / `CONSTRAINT`), plus an explicit statement of what the mapping does **not** express. No new TYPE, no new folder, no new rule — ArchiMate 3.x has no risk element either.
- **`notations/examples/verification/`** — generic worked example for the `REQUIREMENT` → `VERIFICATION` leg, with a sibling `reverse-trace-gaps/` fixture seeding `REQ-VERIF-COVERAGE-001` and `-002`.
- **`migrations/2.1-to-3.0/detect.mjs`** — read-only detector for removed vocabulary in an adopter repository; exits non-zero with the file list, changes nothing.

### Changed

- **`patterns/design-controls.md` → `patterns/baseline-and-audit-trail.md`** — same three mechanisms (a `git tag` baseline plus `scripts/baseline-manifest.mjs`, git history as the audit trail, the admission record plus `reviewer_authority` as the review/approval record), stated for any adopter under a review obligation instead of one regulated domain. Its guardrail is now the general one: a commit is a strong audit trail and baseline, never an electronic signature.
- **`notations/CONTRACT.md` §8** — retitled "Compliance and verification domain rules"; the aggregated table now covers `REQUIREMENT`, `ASSERTION` and `VERIFICATION`.
- **`notations/elements/27-verification.md`** — method vocabulary cited to IEEE / IEC / ISO-IEC-IEEE 15288; risk-chain cross-references dropped; out-of-scope list names domain-specific risk-management chains explicitly.

### Unchanged, and worth stating

- **`VERIFICATION` stays core** — the generic engineering V&V claim against a `REQUIREMENT`. `REQ-VERIF-COVERAGE-001` / `-002` remain core rules on the core `REQUIREMENT` spec, and `ASSERTION.evidence[]` still cites a verification as an ordinary `canonical_ref`, resolved and checked by core validators.

---

## [2.1.0] — 2026-07-28

Fifty-two commits since `v2.0.0`. Bump category: **MINOR** — additive notation, operations, and CLI surface only; no migration recipe required.

### Added

- **`notations/elements/27-verification.md`** and **`notations/elements/28-hazard-risk-control.md`** — `VERIFICATION`, `HAZARD`, and `RISK_CONTROL` element families for design-controls traceability. (#361)
- **`notations/views/24-design-controls-trace-matrix.md`** — design-controls trace-matrix report-config view; reverse-trace completeness validator rules for the design-controls chain. (#372, #368)
- **`notations/views/08-blocks.md`** — blocks matrix subset (grid root) plus a forkable RACI template. (#366)
- **`notations/PACKAGES.md`** — optional removable domain-package mechanism (`packages:` in `transitrix.yaml`), orthogonal to `coverage_profile`. (#381)
- **Feedback Record convention** — `FB-…` entries in `operations/feedback.md` (`type`, `status`, `upstream` vocabularies); wired into `escalate-methodology`. (#380)
- **ADR date-slug ids** — new records use `ADR-YYYY-MM-DD-<slug>` (legacy `ADR-NNNN` retained); `check-adl.mjs` gains A5 uniqueness check and extends A4 for date-slug/date agreement. (#382)
- **`transitrix-ingest privacy-scan`** — fail-closed PII pre-admission gate for field-zone `admit-source` (`CLEAN` / `STRIPPED` / `REJECTED`, stale-scan refusal, `enabled: false` opt-out). (#379)
- **`transitrix-ingest workflow-status`** — one on-demand report across every human gate (ADR/WI/canon element/REQUIREMENT-CONSTRAINT overdue/ingest batch); `--data-free` and `--format yaml`. (#383, #384)
- **`transitrix/skills/adr/`** — ADR authoring skill: formulate a decision and land it in the ADL. (#356)
- **`tools/render_trace_matrix.py`** — reference renderer for design-controls trace-matrix views; ADR/ADL adoption guide. (#375)
- **`TARGET_STATE.type` base/target classification.** (#354)
- **Operating-model composite starter template** under `transitrix/templates/`. (#369)
- **Composite notation count lint (C1)** — mechanical count check in `scripts/check-notations.mjs`. (#349)
- **Onboard role-model refinements** — Ingest promoted to a first-class adopter role; Analyst gains named impact/blast-radius capability; cross-cutting raise-a-finding protocol; Modeler no longer creates repos. (#350, #352, #353, #351)
- **UTF-8 stdio guard** for `tools/lint.py` and `render_trace_matrix.py` on Windows. (#385)

### Changed

- **`method/03-architecture-decision-log.md`** — setup path folded into §10 (single document for ADR/ADL). (#376)
- **`method/02-team-operations.md`** — `workflow-status` wired as §6.7 reporting command; Feedback vocabularies §6.4–6.6. (#384, #380)
- **`method/04-methodology-update-propagation.md`** — §7.3 names `workflow-status` as the on-demand visibility mechanism for stale proposed ADRs. (#384)
- **ADR/ADL discoverability** reconciled across `patterns/`, `AGENTS.md`, and the onboarding skill. (#355)
- **Repo-local `templates/` retired** — forkable templates now live under `transitrix/templates/`. (#377)
- **`method/01-methodology.md`** — two-input to-be synthesis stance stated. (#365)
- **Onboarding docs** — two-track README fork; Quick start leads with the self-hosted onboarding prompt; `SKILL.md` instructions made LLM-agnostic. (#343, #342, #341)
- **`RELEASING.md`** — ingest-cli reinstall step clarified for local (pre-npm-publish) installs.

### Fixed

- **Goals Tree, Action Schedule, and DGCA** — inline authoring restored alongside the v2.0 pure-projection form; `1.0-to-2.0` codemod preserves inline data. (#348, #344)
- **`AGENTS.md` §3** — ADR location corrected to the retired single-hub state. (#374)
- **Onboard templates** — goals/action templates rewritten as v2.0 pure projections; `methodology_version` scaffold example no longer pins `0.4.x`. (#339, #340)
- **PlantUML scaffold** — dropped `jebbs.plantuml` recommendation; Studio 3.0.6 renders `.puml` natively. (#347)
- **Public-surface hygiene** — gitignore gaps closed; `CLAUDE.md`/`AGENTS.md` leak-channel guard in CI. (#371, #370)
- **Cheat-sheet lint** — skip README table separator row. (#349)

---

## [2.0.0] — 2026-07-12

### Breaking changes

- **BREAKING: Goals Tree — inline `goals[]` removed.** `*.goals.transitrix.yaml` files may no longer carry a root-level `goals:` array. All `GOAL-*` elements must be standalone files under `canon/elements/01_motivation/goals/`. View files carry only `view_config` (scope + goal_types + display). Validator emits `GOALS-008` error on inline `goals[]`. Migration recipe: [`migrations/1.0-to-2.0/`](migrations/1.0-to-2.0/) Transform A. (#514)
- **BREAKING: Action Schedule — inline `actions[]` removed.** `*.action.transitrix.yaml` files may no longer carry a root-level `actions:` or `activities:` array. All `ACTION-*` elements must be standalone files under `canon/elements/05_implementation/actions/`. View files carry only `view_config` (scope + schedule + display). Validator emits `ACT-010` error on inline `actions[]`. Migration recipe: [`migrations/1.0-to-2.0/`](migrations/1.0-to-2.0/) Transform B. (#514)
- **BREAKING: Action Schedule document ID format.** The document root must carry an `id: ACTION_SCHED-[<middle>-]<INTEGER>` field. The old `title:` field is replaced by `name:`. (#514)

### Added

- **`migrations/1.0-to-2.0/`** — migration recipe: codemod (`codemod.mjs`), validator (`validate.mjs`), fixtures (`fixtures/before/`, `fixtures/after/`), and README. Automates extraction of inline `goals[]` and `actions[]` to standalone element files and rewrites view files to `view_config` format. (#514)
- **`notations/views/04-goals.md` v1.0** — Goals Tree respecified as a pure projection. New fields: `id` (`GOALS-…`), `view_config.scope` (root_goal, period, type_filter, valid_at), `view_config.goal_types[]`, `view_config.display` (depth, collapsed). Validation codes `GOALS-001..008`. (#514)
- **`notations/views/07-action.md` v2.0** — Action Schedule respecified as a pure projection. New fields: `id` (`ACTION_SCHED-…`), `view_config.scope` (root_action, goals, type_filter, valid_at), `view_config.schedule` (start_date, calendar), `view_config.display` (view, depth, collapsed). Validation codes `ACT-001..010`, `ACT-020`. (#514)
- **`deprecated` status value** added to the notation `status:` frontmatter enum, applied to FGA's spec (previously unrepresentable — FGA was already retired in substance with no valid enum value to say so). (#512)
- **`notations/NOTATION_SELECTION_GUIDE.md`** — cross-family notation selection reference: every Mermaid diagram type, every PlantUML diagram type (incl. C4), and every Transitrix view/element notation side by side, with when-to-use guidance, a cross-family equivalence map, and a phrase-to-recommendation lookup table. Indexed from `notations/README.md`. (#532)
- **`transitrix/skills/onboard/templates/VALIDATOR.md`** — the Validator role skill guide (structural validity, whole-repo referential integrity, blast-radius review before a commit/PR lands), completing the Analyst/Modeler/Validator role set shipped by `/transitrix:onboard`. (#532)

### Changed

- **`notations/ELEMENT_PRIMITIVES.md` §4.1** — strategy-chain view-purity prose updated to reflect that all five strategy-chain notations are now pure projections (DGCA, Actions Tree, Action Card, Goals Tree, Action Schedule). (#514)
- **`notations/elements/24-action.md` §4** — inline authoring section replaced with "standalone files only (v2.0)" note; inline form documented as historical v1 behaviour. (#514)
- **`integration/tooling.md`** gains a validator ownership matrix and a "what to run when" quick-reference, so adopters can tell what `tools/lint.py`, `@transitrix/cli`, `tools/check_views_compliance.py`, and `tools/knowledge_store_lint.py` each cover. `tools/check_views_compliance.py` marked deprecated (docstring notice, kept for migration reference); `tools/knowledge_store_lint.py` documented as still-alive. (#512)
- **`AGENTS.md` §2 / `SKILL.md`** — reference reads updated to fetch `notations/NOTATION_SELECTION_GUIDE.md` on demand (link-and-fetch, not inlined) when a diagram/view request's notation isn't obvious. (#532)
- **`AGENTS.md`'s role-split table and `ANALYST.md`'s cross-reference** updated now that the Validator role has shipped (was listed as `(coming)`). (#532)

### Fixed

- Post-1.0 tail cleanup: `README.md`, `RELEASING.md`, `method/01-methodology.md`, and `notations/CONTRACT.md` §10.3 no longer assert "pre-1.0"; completed the remaining stragglers of the 2026-06-25 `activities`→`action` rename (`CONTRACT.md` HDR-003 + §3 + historical note, `notations/MANIFEST.md` example, `notations/README.md` wording); softened `README.md`'s "first artefact is a Goals tree" absolute claim to match `onboard/SKILL.md`'s "any notation is a valid first artefact". (PR #325)

---

## [1.0.0] — 2026-07-05

The first stable release. Schema is frozen; all pre-1.0 deprecation-window
aliases are now hard errors. A migration recipe covers every breaking change
since 0.7: [`migrations/0.7-to-1.0/`](migrations/0.7-to-1.0/).

### Added

- **`notations/elements/24-action.md`** — `ACTION` element TYPE (ArchiMate Work Package). Implementation-layer work package at Initiative / Programme / Project / Task scale. Replaces the former `ACTIVITY` TYPE (now a hard-error alias). Validation codes `ACTION-001..020`. (#261, #265)
- **`notations/views/23-actions-tree.md`** — Actions tree view notation (`*.actions-tree.transitrix.yaml`). Hierarchical rendering of `ACTION` elements with focus-mode and root-node selection. Validation codes `ATREE-001..008`. (#262)
- **`notations/elements/21-locations.md`** — `LOCATION` element TYPE (ArchiMate Location): `country`, `region`, `city`, `site`, `office`, `virtual`. Shared addressable place element; attached to `ACTOR` nodes via `located_at` REL. (#275)
- **`notations/elements/25-business-services.md`** — `BUSINESS_SERVICE` element TYPE (ArchiMate Business Service): externally visible behaviour offered to consumers. Linked to offering unit via `offers` REL and to capability via `realizes` REL. (#278)
- **`notations/elements/25-nodes.md`** — `NODE` element TYPE (ArchiMate Technology Node): physical or virtual compute/network/storage substrate. Hosts `TECHNOLOGY_SERVICE` via the `hosts` REL kind. (#279)
- **`notations/elements/26-technology-services.md`** — `TECHNOLOGY_SERVICE` element TYPE (ArchiMate Technology Service): platform-level service exposed by a `NODE`. Consumed by `APPLICATION` via the `uses` REL kind. (#279)
- **`requirement.parent`** — optional field linking a `REQUIREMENT` to its parent requirement; enables hierarchy and trace-chain audits across obligation families. Validation code `REQ-PARENT-001`. (#299)
- **`requirement.next_review_at`** — optional ISO 8601 date for scheduled requirement review; `check-stale` CLI command emits `REQ-STALE-001` warning on overdue non-codex requirements. (#298)
- **`requirement.origin`** — optional closed enum: `legislative`, `process-product`, `project-product`. Classification for the obligation source taxonomy; carried through the ingest pipeline. (#290)
- **`change.addresses`** — optional field linking a `CHANGE` to the `REQUIREMENT` or `CONSTRAINT` it resolves; origin-agnostic subject reference. (#297)
- **`coverage-metric` `view.regimes[].exclude_paths`** — optional list of glob patterns for non-catalogue folders to exclude from coverage computation. (#269)
- **`former_ids`** — optional array on every element type carrying superseded IDs for migration bridging (cross-reference resolution grace period). (#268)
- **`integration/` Application Interface mapping contract (Path B)** — defines the `APPLICATION_INTERFACE` mapping layer for integrations that do not map cleanly to a canonical `INTEGRATION` element. (#281)
- **`method/04-methodology-update-propagation.md` Discovery** — scheduled discovery trigger, 14-day stale-proposed reminder, and downstream-consumer registry contract. Companion to the adopters registry. (#292, #295)
- **`adopters.yaml`** — downstream-consumer registry file; enables the scheduled discovery job to emit bounded upgrade PRs. (#293, #295)
- **`transitrix/skills/knowledge-store/`** — Knowledge Store agent skill (OKF templates + SKILL.md). Packages the knowledge-store operation pattern. (#286)
- **Ingest privacy pre-admission gate** — Step 2b of the ingest pipeline: privacy-classification check before field artefacts are promoted to canon candidates. (#302)
- **Ingest origin classification** — `origin` field wired through emit-candidates, validate, and extraction prompts. (#291)
- **`patterns/enterprise-memory-pattern.md`** — Enterprise Memory pattern guide. Frames the field→canon pipeline and knowledge-store as the Transitrix Enterprise Memory model. (#300)
- **`notations/CONTRACT.md` §10.4** — migration recipe format specification (README + codemod + validate + fixtures). (#274)
- **`method/00-glossary.md`** — canonical glossary, rewritten for current element vocabulary. Supersedes the former inline glossary. (#308)
- **`method/` reading-order numbering** — all `method/` files now carry a reading-order prefix (`00-`, `01-`, `02-`, …). (#304)
- **Implementation tiers** — Simple and Full implementation tiers defined in `method/` and `patterns/implementation-tiers.md`. (#272)
- **Windows CLI guidance** — `docs/windows-cli.md` documents `npx.cmd` invocation and canonical extension acceptance. (#284, #287)
- **`tools/check_views_compliance.py`** — notation-aware view validator Python tool. (#258)
- **Workflow-script integrity check** — CI job validates YAML + script integrity on every PR. (#260)

### Changed

- **BREAKING: `ACTIVITY` → `ACTION` rename (complete).** The `ACTIVITY-*` prefix, `notation: activity`, `activities:` root array, `activity_type:` field, `*.activities.transitrix.yaml` extension, `activity-card` notation alias, and `*.activity-card.transitrix.yaml` extension are all removed. Validators formerly emitting `ACTION-005` warnings now emit errors. Migration recipe: [`migrations/0.7-to-1.0/`](migrations/0.7-to-1.0/) Transform A. (#265 and related)
- **BREAKING: `INFORMATION_ENTITY` → `BUSINESS_OBJECT` alias closed.** `INFORMATION_ENTITY-*` IDs and the `information_entities:` field in process-blueprint are hard errors. Migrate to `BUSINESS_OBJECT-*` and `business_objects:`. Migration recipe Transform B. (#257)
- **BREAKING: `report_type` required on compliance-impact views.** All `*.compliance-impact.transitrix.yaml` files must declare `view.report_type: product | process | combined`. Validation code `COMPIMP-011` is now an error (was absent). Migration recipe Transform C. (#255)
- **BREAKING: Deprecated abbreviated prefix IDs are hard errors.** The following abbreviated-ID forms are no longer accepted: `ACT-`, `CHG-`, `FAC-`, `SCEN-`, `SCN-`. The `FACTOR-*` grace period from the 0.7.0 release also closes — all remaining `FACTOR-*` values must become `DRIVER-*`. Migration recipe Transform D. (#313)
- **BREAKING: Canonical element catalogue paths use `canon/` zone prefix.** `IDS_AND_REFERENCES.md` §3.1/§4 now consistently use `canon/elements/…`, `canon/relations/`, `canon/assertions/`. Adopters who authored element catalogue paths without the `canon/` prefix must add it. (#313)
- **BREAKING: ArchiMate element IDs use full-word TYPE (canonical).** `method/01-methodology.md` §3a now shows the canonical full-word TYPE column (e.g. `ACTOR`, `PROCESS`, `APPLICATION`) and drops the legacy abbreviated-prefix tables (`ACTR-`, `PROC-`, `APP-`). This is a documentation fix — adopters who followed the old abbreviated forms must rename their IDs to the full-word form. Migration recipe Transform D. (#313)
- **DGCA: Activities column renamed to Actions; project domain hierarchy added.** `*.dgca.transitrix.yaml` files that reference the old column key must update to `actions`. (#264)
- **`BP-010` validation rule now covers `business_objects[]`.** Blueprint entries under `business_objects[]` must use the `BUSINESS_OBJECT-` prefix. (#313)
- **`notations/NOTATIONS_VALIDATION.md` renamed to `NOTATIONS_AUDIT.md`.** Update any internal links. (#312)
- **Pre-1.0 disclaimer removed from CHANGELOG header.** The methodology is now stable. Post-1.0 MINOR releases carry no breaking changes per CONTRACT §10. (#316)

### Fixed

- Stale notation counts in `08-blocks.md` and `13-process-blueprint.md` spec intros corrected to "fifteen". (#313)
- `COMPIMP-006` duplicate validation code, severity inconsistency, and grammar errors in spec. (#253)
- `PC-001` recursive resolver scope and diagnostic contract clarified in action-card spec. (#251)
- Deprecated `FAC-`/`CAP-` IDs in scenarios examples migrated to canonical `DRIVER-`/`CAPABILITY-` form. (#256)
- Onboard skill updated for FGCA→DGCA and Activity→Action notation renames. (#276, #271, #273)
- Ingest CLI built-in presets aligned to methodology 0.7.0 vocabulary. (#289)
- Example conformance bugs in `blocks` and `process-blueprint` notation examples. (#282)

### Removed

- **`ISSUE` element TYPE retired.** `method/01-methodology.md` §4.1 de-listed the model-side `ISSUE` notation (retired 2026-06-07). `SCENARIO` is now the canonical implementation-path primitive.
- **`organizations/acme_corp/` embedded submodule retired.** The worked example lives at `transitrix/acme-corp` (standalone repo). (#306)
- **`docs/decisions/` ADR tree tombstoned.** Architecture Decision Records are now maintained centrally; the `docs/decisions/` path is no longer active. (#307)
- **`PROJECT_INDEX.md`** retired; content folded into `README.md`. (#311)

---

## [0.7.0] — 2026-06-24

ArchiMate 3.2 terminology alignment: `FACTOR` → `DRIVER`. Renames the element TYPE, canonical ID prefix, and `notation:` field value across all specs, skills, and templates. **YAML structural keys (`factors:`, `goal.factors`) are intentionally unchanged** — existing adopter view files remain valid without edits. Legacy `FACTOR-*` IDs are accepted by validators until the 1.0 cut. Migration recipe: [`migrations/0.6-to-0.7/`](migrations/0.6-to-0.7/).

### Changed

- **BREAKING (gradual): `FACTOR` element TYPE renamed to `DRIVER`.** Aligns with ArchiMate 3.2 motivation layer, which uses "Driver" for external/internal forces. Changes:
  - Element TYPE name: `FACTOR` → `DRIVER`.
  - Canonical ID prefix: `FACTOR-*` → `DRIVER-*`.
  - `notation:` field value in element files: `factor` → `driver`.
  - Folder path: `canon/elements/01_motivation/factors/` is unchanged; only file names change.
  - YAML structural keys (`factors:`, `goal.factors[]`) are **not renamed** — backward-compat; existing view files need no edits.
  - Legacy `FACTOR-*` IDs remain valid in all structural key values (e.g. `factors: [FACTOR-EU-REG-1]`) until the 1.0 cut; validators accept both forms.
  - Affected specs: `notations/ELEMENT_PRIMITIVES.md`, `IDS_AND_REFERENCES.md`, `COVERAGE_PROFILES.md`, `README.md`, `views/02-dgca.md` (PR #230); remaining notation views, skills, and templates in follow-on PRs.

---

## [0.6.0] — 2026-06-24

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
- **`.claude-plugin/marketplace.json`** at repo root — `transitrix/methodology` repo is now a Claude Code plugin marketplace (`transitrix-methodology`). Single-plugin catalog listing the `transitrix` plugin with source `./skills/onboard`, MIT license, brand-consistent description and keywords, author `Transitrix` (no maintainer personal data per acceptance criterion 4). Install UX is `/plugin marketplace add transitrix/methodology` → `/plugin install transitrix@transitrix-methodology` → `/transitrix:onboard`. Publication itself remains gated.
- **`skills/onboard/.claude-plugin/plugin.json`** — plugin manifest for the onboarding bundle (name `transitrix`, version `0.1.0`, MIT, keywords, repository / homepage pointers). Marketplace consumes this at install time.
- **`transitrix/skills/ingest/` — Ingest skill skeleton.** The front-door field→canon pipeline as a second skill under the `transitrix` plugin (`/transitrix:ingest`). This increment ships the agent-neutral protocol (`SKILL.md` — a six-step pipeline: scaffold-intake → convert → field-artefact → emit-candidates → validate → review-queue), the three JSON schemas it produces against (`schemas/field-artefact`, `schemas/candidate`, `schemas/review-queue`), and the operational `_intake/{inbox,processing,processed}` convention (skill-local for now, not yet reserved in MANIFEST/CONTRACT). Core invariants are encoded: **propose-never-write-canon** (emits candidates + a human review queue, never writes `canon/`), **two separate trust axes** (`source_quality` on the source vs. `extraction_confidence` as a review flag, never merged, per CONTRACT §11), **coverage-profile-aware** emission, and **relation-conservative** v0 extraction. Deterministic logic is specified as a published Node CLI (`@transitrix/ingest-cli`) and the forked extraction prompts; both land in follow-up increments. Portable across Claude and GitHub Copilot via the converged Agent Skills format. (#114)
- **`packages/ingest-cli/` — `@transitrix/ingest-cli` + forked extraction prompts.** The deterministic Node CLI the ingest skill shells out to, realising all six pipeline steps (`scaffold-intake`, `convert`, `field-artefact`, `emit-candidates`, `validate`, `review-queue`). Pure Node ESM, zero dependencies; MS Markitdown is the only external touchpoint (shelled out from `convert`). It lives at the repo root, outside the skill bundle and plugin payload, because it is consumed as a published package via `npx`. Enforces the skill's invariants mechanically: never writes `canon/` (proposes only); the candidate contract is checked in code (mirrors `candidate.schema.json`, including the two-axes rule that `source_quality` may not appear on a candidate); coverage-profile gating flags out-of-profile candidates rather than dropping or silently emitting them; relation-conservative emission (only high-confidence relations become candidates). The forked per-layer extraction prompts (`transitrix/skills/ingest/prompts/` — motivation / business / application) emit the result-JSON contract `emit-candidates` consumes. Publishing to npm remains gated. (#115)
- **`notations/elements/15-requirement.md` §1.1–§1.2 — authoring guidance for extracted obligations.** New normative subsections under the REQUIREMENT-vs-CONSTRAINT distinction. §1.1 fixes the default classification rule for obligations extracted from a codex source: positive duty → `REQUIREMENT`, pure prohibition → `CONSTRAINT`. Records the practical observation that positive obligations are the dominant form in regulatory text, so scanners / collectors SHOULD default to `REQUIREMENT` for any plausibly action-shaped obligation; modelling a positive obligation as `CONSTRAINT` is a known authoring mistake that strands ASSERTION (which binds via `about:` to REQUIREMENT only). §1.2 sets the explicit test for when to *mirror* a REQUIREMENT with a CONSTRAINT (both forms in source text, or different subject set, or independent enforcement machinery) vs author only one side — guidance, not validator rules.
- **Ingest skill tests + CI.** `transitrix/skills/ingest/tests/` mirrors the onboarding harness: `test_ingest_integrity.py` (deterministic, no API key) checks bundle integrity and drives the **real CLI end-to-end** on a fixture — asserting a conformant field artefact with a proposed `source_quality`, relation-conservatism, a review queue with the gate closed, the two-axes rule, and that `canon/` is never written; `drive_ingest_e2e.py` is the weekly-cron LLM drive (skips green without a key / the unpublished CLI). `.github/workflows/ingest-skill-test.yml` runs the integrity job on every PR touching `transitrix/skills/ingest/**` or `packages/ingest-cli/**`, plus the weekly cron. (#118)
- **`notations/CONTRACT.md` §12–§13 — zero-information-loss ingestion contract.** Two new shared shapes so ingestion never silently drops source data. §12 defines `extensions:` — a reserved **open key-value bag** on every entity type for source fields the schema does not define; the validator passes it through untouched (`EXT-001`), and a defined field must not be relocated into it to dodge a rule (`EXT-002`, warning). §13 defines `canon/unresolved/` — a reserved **holding area** for a standalone object whose TYPE is unknown; entries carry ingestion provenance (`ingest_status` / `ingest_source` / `ingest_field` / `ingest_date` / `related_to` / `data`). **Type resolution is a second axis, orthogonal to admission** (like §6.2 reviewer-authority vs §6.1 admission-state): an unresolved entry MAY be `proposed`-untyped or **admitted-but-untyped** — its content can be authoritative and gate-passed, with only the TYPE open — so it may carry a full admission record / `source_quality` / lifecycle. It is segregated from typed canon only because the canon machinery is TYPE-keyed (`<TYPE>-N` ids, per-TYPE placement, TYPE-keyed views); every typed canon walker MUST skip it (`UNRES-004`). Because it is real model knowledge it lives in **shared, committed** `canon/unresolved/`, never in the per-user private `_intake/`. Resolution is promote / fold-into-`extensions:` / discard (`UNRES-001..004`). The ingest candidate schema names `extensions:` explicitly; the ingest skill documents both mechanisms as Step 7 (`transitrix/skills/ingest/SKILL.md`); the onboarding scaffold documents `_intake/` privacy and `.gitkeep`, and `scaffold-intake` now seeds a `.gitkeep` per stage. CLI emission of `canon/unresolved/` files is a tracked follow-up. Additive (MINOR) — no existing file is invalidated.
- **`@transitrix/ingest-cli` — `extensions:` carry-through + `canon/unresolved/` emission.** Wires CONTRACT §12/§13 into the pipeline. `emit-candidates` now carries each extraction-result element's `extensions:` onto its candidate verbatim (`EXT-001`), and shapes the result's new top-level `unresolved[]` items into `canon/unresolved/UNRES-NNN.yaml` holding files (the §13.2 fields; **non-admitted** — no admission record, so THE ONE RULE "never write *admitted* canon" holds; an item missing `ingest_field` / `data` is dropped with a warning, never emitted malformed). `validate` enforces `EXT-002` (an `extensions:` key shadowing a defined field) and rejects a non-map `extensions:`. Every typed canon walker — `buildCanonIndex`, `check-placement`, and `repo-check`'s typed tally — skips `canon/unresolved/` (`UNRES-004`) so an untyped entry is never counted as a typed element; `repo-check` reports `integrity.unresolved_holding` and flags malformed entries (`UNRES-001..003`). The extraction-prompt result contract (`transitrix/skills/ingest/prompts/README.md`) and SKILL.md Step 7 document the `extensions` / `unresolved[]` outputs. New `src/unresolved.mjs`; covered by Part O of the ingest integrity test.
- **`method/methodology-update-propagation.md`** — methodology / catalog **update propagation mechanism**. Binds the existing version pin (`methodology_version`), tagged-release transport, migration recipe, [`RELEASING.md`](RELEASING.md) §"Adopter upgrade procedure" steps, and ADL ratification gate ([`method/architecture-decision-log.md`](method/architecture-decision-log.md) §6) into a single named operation: *upgrade adopter to vX.Y.Z*. Specifies the transport — versioned release primary, agent-driven vendored sync as fallback for restricted environments; submodule and subtree explicitly rejected. The four guarantees (declared / bounded / reproducible / traceable) are stated and traced to the component that enforces each. An autonomous agent that prepares an upgrade MUST file an `author: agent`, `status: proposed` ADR; `transitrix.yaml` may change in the same PR but the pin is not in force until a human ratifies the record — the mechanism that bounds an unattended agent to *proposing* a reviewable migration rather than silently applying one. Forward-references the reference-catalog distribution layer the ADL §9 defers. [`RELEASING.md`](RELEASING.md) §"Adopter upgrade procedure" and [`method/architecture-decision-log.md`](method/architecture-decision-log.md) §9 pick up reciprocal links to the new document. Doc-only, additive.
- **`notations/views/21-compliance-impact.md`** — `compliance-impact` report-config view. Sibling of `scenarios` over the compliance overlay: the (obligation × subject) matrix derived from `ASSERTION` ([`16-assertion.md`](notations/elements/16-assertion.md)) + `PROCESS.flow` / process-blueprint stages + `REQUIREMENT` status. The view document carries no canonical content — every cell value is derived. §5 fixes the **render contract** (inputs, derivation algorithm, deterministic multi-assertion aggregation) so any conformant renderer reproduces the view identically; supersedes the bespoke `tools/render_impact.py` the regulatory-intelligence build shipped. §5.3 codifies the **§9 empty-cell distinction** — the canonical "No mapped obligation (current model)" label (the model is dark here) vs. an admitted `n_a` assertion (the obligation explicitly does not apply). New document-level TYPE `COMPLIANCE_IMPACT` registered in `notations/IDS_AND_REFERENCES.md` §3.2; worked example under `notations/examples/compliance-impact/`. Validation codes `COMPIMP-001..008`.

### Changed

- **BREAKING: `UNIT` and `EMPLOYEE` element TYPEs removed.** `UNIT` → `ACTOR(type: business_unit)`; `EMPLOYEE` → `ACTOR(type: person)` + an `employment` REL. Both were registered schema-only on 2026-05-29 and removed the same day before any population; the `0.5 → 0.6` migration recipe records the mapping. (#98)
- **BREAKING: activity ownership collapses to one field.** The parallel `owner` (free-text) / `unit` / `employee` fields on activities become a single `owner: ACTOR-…` (`notations/views/07-activities.md` §5.6). `ROLE.unit` now references an `ACTOR(business_unit)`. (#98)
- **BREAKING: `PROJECT_CARD` view renamed to `ACTIVITY_CARD`.** Spec `notations/views/18-project-card.md` → `18-activity-card.md`; TYPE `PROJECT_CARD` → `ACTIVITY_CARD`; extension `*.project-card.transitrix.yaml` → `*.activity-card.transitrix.yaml`; root key `project_card:` → `activity_card:`. Aligns the view name with the ACTIVITY-as-umbrella model (a card renders any execution level — initiative / programme / project / task). Adds an ArchiMate-class rendering convention (`ACTIVITY` → Work Package, `MILESTONE` → Implementation Event). `MILESTONE` TYPE name unchanged. (#112)
- **`skills/onboarding/` → `skills/onboard/`.** Folder renamed so the plugin-mode slash command is `/transitrix:onboard` (always `/<plugin>:<skill>` in plugin mode — there is no shorter alias for plugin-installed skills). All adopter-facing references updated (`organizations/acme_corp/AGENTS.md`, `GETTING_STARTED.md`, `.templates/EXAMPLES.md`), workflow paths updated (`.github/workflows/onboarding-skill-test.yml`, `.github/workflows/skill-cheatsheet-conformance.yml`), and the cheat-sheet / notations linters point at the new path. The README also drops the deprecated standalone `cp -r ~/.claude/skills/transitrix-onboard/` install path; plugin install is now the single canonical path.
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

- **Migration recipe codemod for 0.4 → 0.5** — the methodology-upgrade-path work. The Deprecated and Changed items above are mechanical migrations; a codemod ships under [`migrations/`](migrations/).
- **`transitrix migrate` CLI** in Studio — methodology-upgrade-path epic Phase 3.
- **The 1.0 cut decision** — methodology-upgrade-path epic Phase 4.
- **Hard removal of deprecated inline fields** — gated on the migration codemod landing.
- **`notations/` folder restructure** (view vs element separation) — filed as a separate task.
- **Scanner-and-monitoring story** for Codex (regulatory intelligence) — future epic.

---

## [0.4.x] and earlier

No `CHANGELOG.md` was maintained before 0.5.0. Earlier history is in the git log.
