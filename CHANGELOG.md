# Changelog

All notable changes to the Transitrix methodology.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning is SemVer — see [`notations/CONTRACT.md`](notations/CONTRACT.md) §10. Post-1.0: MINOR releases carry only additive changes; breaking changes require a MAJOR bump. Migration recipes live under `migrations/`.

---

## [4.3.0] — 2026-08-30

Bump category: **MINOR** — all changes are additive; the renamed rule codes are backward-compatible with aliases accepted through 4.x. No migration recipe: existing validators accept both the old codes and the new ones through 5.0.0.

### Added

- **`DGCA-REPO-008..011` — renamed repo-scope rules, formerly `FGCA-008..011`.** The codes print DGCA-REPO-008 (GOAL's missing DRIVER), DGCA-REPO-009 (CHANGE's missing GOAL), DGCA-REPO-010 (ACTION's missing CHANGE), DGCA-REPO-011 (ACTION's missing GOAL). Accepted aliases: `FGCA-008..011` resolve to the new codes through 5.0.0 (`notations/vocabulary.yaml`, `notations/views/diagrams/02-dgca.md` § Cross-element validation rules).

### Deprecated

- **`FGCA-008..011` — accepted aliases for `DGCA-REPO-008..011`, deprecated in favor of the renamed codes. Removal release: 5.0.0.** A tooling finding naming `FGCA-008` and the adopter's own validator accepting it read as the same finding; at 5.0.0 the old codes stop being recognized.
- **`FGCA-012..014` — deprecated without replacement. Removal release: 5.0.0.** These three warnings (unreferenced driver, unreferenced goal, unreferenced change) are becoming a coverage observation rather than a per-element finding; the per-element codes are being retired. The observation lands under a separate code.

---

## [Unreleased]

### Added

- **Products Catalogue projection form** — `notations/views/diagrams/09-products.md` adds full support for projection-form authoring alongside the existing inline form. A products catalogue can now be authored with a `view_config` block that selects PRODUCT elements from `canon/elements/02_business/products/`, allowing filtering by type, domain, owner_role, and custom extensions (e.g., pricing models). The inline form remains valid; promotion to projection form is optional until cross-document sharing requires it. New validation rules `PROD-001..010` and view_config defaults documented. Notation version bumped to 0.2, status to documented. Purely additive — a repository with products-catalogues in inline form validates as before. (transitrix-hq#436)
- **`ORGANIZATION` — a motivation-layer element type for the organisation's own statement of itself** — its name, mission, vision, and background. Carries the organisation's stated intent (`mission`, `vision`) as canonical elements rather than product configuration. At most one valid `ORGANIZATION` may exist in a catalogue at any point in time (time-aware: a mission restatement is a new element with a new `valid_from` date). Placement: `canon/elements/01_motivation/organizations/ORGANIZATION-<SLUG>-1.yaml`. Schema: `ELEMENT_PRIMITIVES.md` §7.31. Validation: `ORG-001` (at most one valid per date), `ORG-002` (must have mission or vision). Purely additive — a repository without an `ORGANIZATION` element validates as before. (transitrix-hq#410, #444)
- **`guides/adoption-health-profile.md` — a framework to measure how effectively a Transitrix adoption is working in practice.** The profile defines five instrumental indicators (validity, coverage, freshness, assertion-queue age/drain, connectedness) calculated from two independent records each — the measure cannot be faked without doing the work. Denominator rule makes the blind spot explicit: every file is classified as read/out-of-scope/unread-marker/foreign, qualifying every coverage number that follows. Three properties: the adopter measures themselves and we do not collect; no norm from us beyond their declared scope; every result is a reconciliation of two independently produced records. Specification closes or defers each of four design questions (phase detection, survey questions, computation home, cross-adopter benchmarking). Purely additive — a repository without adoption-health measurement infrastructure validates as before. (#391)
- **`transitrix/skills/health-profile/` — the Skill implementation of the adoption-health profile's instrumental layer** (computation home: Skill / Claude Code agent procedure). Runs `node scan.mjs` to scan a repository's model files, computes five indicators with precision and diagnosis readings from two independent sources each, and produces a markdown report showing file classification (denominator), indicator values, and actionable findings. Proof-of-concept scan of `transitrix/methodology` shows 201 read files, zero unread-marker files (no actionable gaps), 40 foreign files, and 100% file freshness. Deferred items from the spec remain: phase detection (workflow-dependent), full queue/connectedness computation, survey instrument, cross-adopter benchmarking. Report does not fail the build; validator treats it as informational only.
- **DGCA chain-view action-scoped selector** (`notations/views/diagrams/02-dgca.md`): `view_config` can now anchor the projection on **actions** (work-package subtrees) in addition to goals. Goal-scoped mode (default, top-down) selects goals and derives changes and drivers downward; action-scoped mode (new, bottom-up) selects actions and derives goals and drivers upward from the change links. Symmetrical interface: `actions.filter` / `actions.ids` / `actions.tags` parallel `goals.filter` / `goals.ids` / `goals.tags`; modes are mutually exclusive. Enables the "delivery chain of an initiative" view (what drives it, what it changes, what it contains) without goal approximation. Validation rules `DGCA-019..020` enforce mode exclusivity. Worked example added. (transitrix-hq#456)

### Fixed

- **Feedback register restructured as a directory.** `method/06-team-operations.md` §3.2 now specifies the feedback register as `operations/feedback/` (a directory) containing the journal `feedback.md` and optional dated attachment folders for findings with images. Single-file journal remains the default for single-writer teams; multi-writer variants (per-author files or gitignored journals) are permitted with documented ID-allocation schemes. Scrub gate expanded to cover images: screenshots are model content and must be anonymised before attachment. Skills (onboard, feedback) updated to handle both old (`operations/feedback.md`) and new (`operations/feedback/feedback.md`) layouts without creating parallel registers. (transitrix-hq#461)
- **Products Catalogue ID grammar unified with registry.** `notations/views/diagrams/09-products.md` now references the canonical TYPE `PRODUCTS_CAT` in the field table (matching `IDS_AND_REFERENCES.md` registry and the pattern used by Capability Map), and the worked example corrects the catalogue ID from `PROD-CAT-001` (invalid leading zero on terminal integer) to `PROD-CAT-ENTERPRISE-1`. (transitrix-hq#458)
- **DGCA chain-view spec (`notations/views/diagrams/02-dgca.md`) now uses the correct field name `action.delivers_changes`** (matching the ACTION element schema and Studio implementation) instead of the incorrect `action.changes`. Updated in the projection-form example, view_config defaults, view_config keys documentation, inline `actions[]` field table, and validation rule `DGCA-010`. Inline actions in DGCA documents using `changes:` remain valid but should migrate to `delivers_changes:`. (transitrix-hq#452)
- **`tools/lint.py` validates inline element field references** (`parent`, `goals`, `delivers_changes`, `predecessors`, `owner_role`): a missing target or a non-string ID is an error, same grain as relation `from`/`to`.
- **`notations/views/diagrams/04-goals.md` — goal tree level 0 description clarified.** §7.1 table no longer describes level 0 as the organisation's vision (which moved to `ORGANIZATION` element type); level 0 is now described as the top goal.
- **`@transitrix/ingest-cli` — PII-004 detector no longer matches ISO 8601 dates as phone numbers.** The detector split into email-shape and phone-shape validators; phone-shaped matches with `YYYY-MM-DD` pattern are rejected, matching the Luhn-validation discipline of PII-005. ISO dates are reported as CLEAN; genuine phone tokens and emails still match.

---

## [4.2.0] — 2026-08-27

Bump category: **MINOR** — highest change since the 4.1.0 pin is a new catalogued TYPE (`STANDARD`). Parser/lint/batch-path/reg-intel fixes in the same window ride along. No migration recipe: a repository that never admits a `STANDARD` validates as it did on 4.1.0. New `error` enforcement that only names already-specified rules (`TTRS-002`, relation `from`/`to`) is grandfathered for already-admitted adopter canon per CONTRACT §10.4.

### Added

- **`STANDARD` — a new codex TYPE for a technical standard issued by a standards-developing organisation** (`notations/elements/14-codex.md` §2, §2.2). Lives in `codex/external/<jurisdiction>/` with `LAW`/`REGULATION`; internationally issued bodies use `intl` (no longer reserved). Discriminator at admission: statute → `REGULATION` (or `LAW`); org writes it for itself → `INTERNAL_STANDARD`/`POLICY`/`PRINCIPLE`; an SDO issues it → `STANDARD`. A regulation that incorporates a standard by reference stays a `REGULATION` and cites the `STANDARD`. Required fields are `jurisdiction`, `effective_date`, and `issuing_authority` (the issuing body). Permitted-TYPE lists for `REQ-003`, `TERM-002`, `COVMET-003`, `RIF-002`, `SEGMENT-002`, and `AMENDMENT-002` widen to include `STANDARD`; `PRINCIPLE` stays out of rules-in-force. `@transitrix/ingest-cli` accepts `--type STANDARD` with `--jurisdiction` and `--issuing-authority`. Purely additive: no existing field became required on `LAW`/`REGULATION`, and a repository with no `STANDARD` artefact validates as before. (transitrix-hq#318, #539)

### Fixed

- **`tools/lint.py` reads relation `from`/`to`.** Missing or non-string endpoints are errors; the advertised empty ArchiMate semantics pass is removed (use `@transitrix/cli --scope=repo`). (#536)
- **Document parsers reject unknown directive attributes and leftover text** on `view` / `figure`, matching `DIRECTIVE_LANGUAGE` §7 (`TTRS-002`). (#535)
- **Ingest and reg-intel batch paths no longer overwrite an unresolved flat file** when a second run has different content; identity is `run_id`. (#538)
- **`reg-intel` discovery reads `operations/config/scan-sources.yaml`**, and date checks reject impossible or unpadded ISO dates. (#537)
- **Plugin `--check` treats CRLF and LF manifests as equal**; the plugin description names the document views the skill offers. (#534)

---

## [4.1.0] — 2026-08-27

Bump category: **MINOR** — one PR landed since #532's 4.0.0 tag, categorised as purely additive (new test fixtures, no new schema or validator codes).

### Added

- **Validator tests for `assembled_on` relation kind** — positive and negative test fixtures in `notations/examples/relations/assembled-on/` covering endpoint constraints (both ends must be RELEASE), referential integrity (both ends must resolve to admitted primitives), and cross-subject permission (endpoints may be releases of different subject types, PRODUCT and/or APPLICATION). Additive — no new validator codes introduced; existing `REL-001`/`REL-002` codes suffice. (#345)

---

## [4.0.0] — 2026-08-25

Bump category: **MAJOR** — categorised the PRs landed since #512's 3.7.0 tag per RELEASING.md's bump table; highest is the set of breaking changes already staged for this cut (FGA notation-key removal, `.ttrs` `template_id`/`template_version` → `recipe_id`/`recipe_version`, underscore forbidden in an ID middle segment). Additive work in the same window (`process_parent`, `DRIVER.falsifier` / `ASSESSMENT.geographic_scope`, `rules-in-force`, `ACT-021`, and the documentation PRs) rides along. Migration recipe: [`migrations/3.1-to-4.0/`](migrations/3.1-to-4.0/) (Transforms A and B landed ahead of the cut per CONTRACT.md §10.6; Transform C is documented). `node scripts/check-notations.mjs` passes clean (two pre-existing SIZE1 warnings, non-blocking).

### Added

- **`rules-in-force` — a report-config view over the codex zone** (`notations/views/reports/24-rules-in-force.md`). Sibling of Compliance Impact and Coverage Metric: the same `REQUIREMENT.derived_from` join, reading the codex catalogue itself rather than the obligation × subject overlay. Onboarding skill gains a `rules-in-force` template. Purely additive — a repository with no such view validates as before. (#513)
- **`ACT-021` (warning) — an Action Schedule scoped by `view_config.scope.root_action` names an ACTION that is not that root and not a `parent`-descendant of it.** Descendants resolve only through `ACTION.parent`. The message names the ACTION id and the `root_action`; the ACTION is omitted from the render rather than dropped silently. Does not fire when `root_action` is absent. Does not make `parent` required on a true root (`ACTION-003` unchanged). Numbered `ACT-021` because `ACT-004`–`ACT-009` already name different checks. Worked fixture: `examples/action/root-action-scope/`. Additive — a scoped view whose listed or projected ACTIONs are all in the descendant tree validates as before. (#527)
- **`process_parent` — a first-class `PROCESS` → `PROCESS` relation** recording that the child is a phase of the parent (`17-relations.md` §3, `vocabulary.yaml`). Composition of behaviour, not sequence and not view membership. Optional `goal` / `result` on `PROCESS` (`ELEMENT_PRIMITIVES.md` §7.5). A process-blueprint column MAY name an admitted `PROCESS-…` (derived label, no restated `name`/`goal`/`result`) or keep a document-local `STAGE-…` sketch; `STAGE` is not registered. `ASSERT-003` is unchanged: a phase goes in `realised_via` (or is `subject` when it owns the obligation). Compliance-lane and report-config join for `PROCESS-` columns is specified (`13-process-blueprint.md` §5.4, `21-compliance-impact.md`, `22-coverage-metric.md`). New codes `REL-007`/`REL-008`, `BP-012`/`BP-013`/`BP-014`. Worked example: `examples/relations/process-parent/`. Additive — existing `STAGE-` only blueprints validate unchanged. (#522)
- **`DRIVER.falsifier` and `ASSESSMENT.geographic_scope`** — two optional fields on the motivation-layer primitives (`ELEMENT_PRIMITIVES.md` §7.1, §7.17). `falsifier` is prose recording the observation that would weaken or refute a driver as a standing force; whether it has fired stays a human judgement, not a stored boolean. `geographic_scope` is a list of country codes (ISO 3166-1 alpha-2 or `eu`, reusing the codex jurisdiction vocabulary, `elements/14-codex.md` §1.1) naming where a finding was observed — a region is an explicit list of the countries it comprises, a market is not modelled by this field at all, and the reserved value `[global]` states "everywhere" explicitly, distinct from omitting the field ("not stated"). New `ASSESS-001` (error) validates the value grammar. Purely additive — both fields are optional, no existing field's semantics changed, and an existing `DRIVER` or `ASSESSMENT` file with neither field validates exactly as before. No backfill. (#514)
- **A decision guide for connecting two `REQUIREMENT` records** (`15-requirement.md` §2.4.1) — a compact table distinguishing `parent` (inline, same-TYPE decomposition), `depends_on` (first-class REL, conditional dependency between peer obligations), and `required_for` (first-class REL, obligation-to-release scoping), each with a one-line use/avoid rule. Cross-linked from `17-relations.md` §3, which now also states explicitly that `parent` is an inline alternative to the REL kinds it registers, not a gap in the enum. Documentation only — clarifies existing normative text; no new field, TYPE, or validator rule. (#518)
- **`15-requirement.md` §2.4 states explicitly that `parent` MAY cross document-stage boundaries** — the ISO/IEC/IEEE 29148 StRS → SyRS → SRS tiers recorded by `level` (§2.5). This was already the *typical* direction described in §2.5's ladder; the new "Stage-agnostic" point states it as the field's own rule rather than as an aside on a different field, and confirms `parent` is independently silent on the endpoints' `admission_state`. New worked example `examples/requirement-parent/` — a three-tier `parent` chain (`stakeholder` → `system` → `software`) grounding the schema example already shown in §2. Documentation only; no new field, TYPE, or validator rule. (#519)
- **`guides/how-a-document-prints.md`** — page size is declared, never inherited, A4 (`612 × 792 pt` is US Letter and wrong; `595 × 842 pt` is A4); portrait by default; a wide picture takes a landscape page; if it still does not fit, split the view in the model. `DIRECTIVE_LANGUAGE.md` §3.5 states which supplied pictures are legitimate (photograph, screenshot of third-party software, scan — a picture of model content is a `view`, never a pre-exported raster placed as a `figure`). Named gaps: print layout, landscape PDF, and embedded pictures are specified and not built. (#526)

### Changed

- **BREAKING: the document-view source object is named `recipe`, not `template`/`skeleton`, across `@transitrix/document-view-engine` and `@transitrix/document-renderer`.** One object previously carried four names (`.ttrs` "template", the view engine's "skeleton", `template_id`/`template_version`, `parseSkeleton`/`parse-skeleton.mjs`); it is now `recipe` everywhere in both packages — filenames, identifiers, comments, and package descriptions (`parse-template.mjs`/`parse-skeleton.mjs` → `parse-recipe.mjs`, `parseSkeleton` → `parseRecipe`). Decided 2026-08-23; what a recipe produces is a **model-backed document**, never *live*/*living document*. The directive language spec and site copy are unaffected — this change is scoped to the two packages and their tests. (#515)
- **BREAKING: `.ttrs` header fields `template_id`/`template_version` renamed to `recipe_id`/`recipe_version`.** Required on every `.ttrs` file (`document`, `kind`, `recipe_id`, `recipe_version`, `canon`). Migration recipe: [`migrations/3.1-to-4.0/`](migrations/3.1-to-4.0/) Transform B. No adopter `.ttrs` file exists outside this repo's own test fixture, so the recipe carries nothing real to rewrite today — it ships anyway, per CONTRACT.md §10.6. (#515)
- **BREAKING: an ID middle segment may not contain `_`.** Underscore is TYPE-only (`PROCESS_BLUEPRINT`, `INTERNAL_STANDARD`, `BUSINESS_OBJECT`). A middle segment is `[A-Za-z0-9]+`; a hyphen splits segments. `LAW-PERSONAL_DATA-1` is invalid; write `LAW-PERSONAL-DATA-1`. Documented as Transform C of [`migrations/3.1-to-4.0/`](migrations/3.1-to-4.0/) — not auto-rewritten, because a blanket `_` → `-` would also hit TYPE prefixes. (#523)
- **`REQUIREMENT.derived_from` origin guidance:** Field artefacts are not valid origin ids for a canon obligation. Documentation only; `REQ-003` unchanged. (#524)
- **A repository may hold both a project role and the central role** (`patterns/enterprise-adr-registry.md`, `patterns/network-catalogue.md`). Dual-role is allowed; harvest/index vs central admission/promotion stay distinct. Documentation only. (#525)

### Removed

- **BREAKING: the `fga` notation key is removed.** `*.fga.transitrix.yaml` / `notation: fga` — the 3-layer Driver → Goal → Activity chain — is no longer a valid notation; author it as a `dgca` document with `view_config.layers.changes: off` (DGA mode) instead, per the 2026-06-23 FGA-into-DGCA merge decision (`notations/README.md` § Family selection). FGA was deprecated in `2.0.0` (2026-07-12); its own spec front matter named `removed_in: "4.0.0"` (`CONTRACT.md` §10.6's one-major window, satisfied as of `3.0.0`). The spec file (`notations/views/diagrams/03-fga.md`) and its example stub (`notations/examples/fga/`) are deleted — preserved in git history only, not repackaged. Migration recipe: [`migrations/3.1-to-4.0/`](migrations/3.1-to-4.0/) Transform A. No adopter `*.fga.transitrix.yaml` file exists outside the migration recipe's own fixture, so the recipe carries nothing real to rewrite today. (#520)

### Fixed

- **`ASSERTION.realised_via` no longer claims a process-blueprint stage as a resolvable target.** `16-assertion.md` §2.1, `21-compliance-impact.md`, `22-coverage-metric.md`, and `13-process-blueprint.md` §5.4 listed a blueprint `STAGE-…` id as a `realised_via` / lane-join target; stages are document-local and `ASSERT-004` cannot resolve them. The decided process-local idiom is `STEP`. View grouping by `stages[]` is unchanged. No schema, enum, TYPE, or validation-severity change. (#521)

---

## [3.7.0] — 2026-08-22

Bump category: **MINOR** — categorised the commits landed since #493's 3.6.0 tag per RELEASING.md's bump table; highest is a set of purely additive schema changes (new `PRINCIPLE` codex TYPE, new `introduced_in` relation kind, new `CAT-001`/`CAT-002`/`ADMIT-009`/`ADMIT-010`/`ADMIT-011` validator codes). Two of the new codes (`CAT-002`, and `BOBJ-D001`'s severity correction below) are `error`-severity, but CONTRACT §10.4's grandfather clause keeps a `MINOR`/`PATCH` release's new `error` rules from applying retroactively to already-admitted adopter canon, so neither forces a `MAJOR` bump. `node scripts/check-notations.mjs` passes clean (two pre-existing SIZE1 warnings, non-blocking).

### Added

- **`PRINCIPLE` — a new codex TYPE for a rule the organisation holds over itself with no stated issuing authority or conformance test** (`notations/elements/14-codex.md` §2, §2.1, §4.1). Required fields are `statement` (one normative sentence) and `rationale`; `issuing_authority` and `effective_date` are optional — where an artefact *can* state both an issuing authority and a conformance test, §2.1's discriminator classifies it as `POLICY` or `INTERNAL_STANDARD` instead. An optional `established_by` field cites the decision that established the principle, in the decision-log reference form already in use (`method/07-decisions.md` §2); its absence is a review finding (`CODEX-006`, info), not a validator error. `REQUIREMENT.derived_from`'s permitted TYPEs widen to include `PRINCIPLE` (`15-requirement.md` §2, `REQ-003`), and so does `TERM.derived_from`'s (`ELEMENT_PRIMITIVES.md` §7.30, `TERM-002`) — both restrictions are stated as the same rule for the same reason, so they widen together. Registered in `IDS_AND_REFERENCES.md` §3.5 and §4 (uniqueness scope: the organisation's `codex/internal/` zone, resolved against the nearest enclosing `transitrix.yaml`, unchanged from `POLICY`/`INTERNAL_STANDARD`). The onboarding skill gains a `templates/codex-principle.yaml` scaffold; `@transitrix/ingest-cli`'s `codex-artefact` / `admit-source --zone codex` commands accept `--type PRINCIPLE` with `--statement`/`--rationale`/`--established-by`. Purely additive: no existing field became required, no existing TYPE's shape changed, and a repository with no `PRINCIPLE` artefact validates exactly as it did before — no migration recipe needed. (#511)
- **A catalogue declares its own boundary — `CAT-001`/`CAT-002`.** `IDS_AND_REFERENCES.md` §4's uniqueness scope now resolves against the nearest enclosing `transitrix.yaml` (`MANIFEST.md` §4) instead of an unstated tree-wide scope. `CAT-001` (warning) flags a scanned tree with no manifest at its root; `CAT-002` (error) flags a manifest nested inside another's subtree — grandfathered per CONTRACT §10.4, so only files authored against this release or later are checked against it. All twelve `notations/examples/**` catalogue roots now carry their own `transitrix.yaml`; two example trees that violated the no-nesting rule become siblings. (#509)
- **`ADMIT-009` (warning) — `extraction_confidence` must not persist onto admitted canon.** `CONTRACT.md` §11.1 states why the field is an ingest-candidate review flag that never reaches canon and never enters the §11.4 confidence formula; registered in `vocabulary.yaml`, cross-referenced from `ELEMENT_PRIMITIVES.md` §7.29. (#505)
- **A new optional `example: true` admission-record field — `ADMIT-010`/`ADMIT-011`.** `CONTRACT.md` §6.4: absent means real; only `true` is a valid value (`ADMIT-010`); an example is excluded from every derived view/coverage total, and nothing without the field may reference something that has it (`ADMIT-011`, cross-cutting with `ADMIT-005`). New `check-notations.mjs` `EX1` check keeps every `notations/examples/**` `zone: canon` fixture marked; all 75 such fixtures now carry the field. (#506)
- **A new `introduced_in` relation kind** — closed-enum, `INTEGRATION | APPLICATION -> RELEASE`, M:N, time-aware (`17-relations.md` §3.3), registered in `vocabulary.yaml`. Separates the discrete per-release axis (which shipped state first carried a fact) from the continuous per-element `valid_from` axis; gives the derived what-shipped-in-release-R query as a predecessor walk. Endpoints stay narrow in v1 — `TECHNOLOGY_SERVICE`, `NODE`, `CHANGE` sources are a later widening, not a second kind. Also records the decision not to widen `ASSERTION.subject` to `APPLICATION` (`16-assertion.md` §2.4). (#495)

### Changed

- **`INFORMATION_ENTITY`'s alias window is now recorded as closed, matching what 1.0.0 announced.** 1.0.0 declared the `INFORMATION_ENTITY` → `BUSINESS_OBJECT` alias closed and old ids a hard error; the specs, the artefact, and the validator were never updated to agree, so at 3.6.0 `ELEMENT_PRIMITIVES.md` §7.15 and `IDS_AND_REFERENCES.md` §6 still promised an open one-release window with a `BOBJ-D001` *warning* and a closure "in the following release". `BOBJ-D001` is now `error`; the spec text says the window closed at 1.0.0; and the old name stays listed only so a tool that meets it can name the replacement instead of reporting an unknown TYPE. `ACTIVITY` and `FACTOR` carry the same 1.0.0-vs-reality gap and are deliberately left open — closing them reaches past this table (the `activity_goal` relation alias, the `activity_type` field, the `activities/` path prefix) and is its own pass. (#504)
- **`vocabulary.yaml`'s `deprecated_element_types` entries carry `accepted` (and `retired_in` when closed).** A retired TYPE name previously had no way to say whether it was still admissible, so every consumer inferred warn-vs-reject for itself. `accepted` is required and validated; a closed entry must name the release that closed it. `transitrix-ingest validate` words its finding from that field — an open window reads `[deprecation]`, a closed one `[error]` naming the release. (#504)
- **`method/08-governance.md` gains §2.1 — a human may ratify a bounded class of change in advance**, not only a single instance. A standing grant names the exact change permitted, the conditions a guard must evaluate on every use, and an end condition; an agent acting inside it executes a decision rather than takes one, so the run is the record rather than a fresh decision entry. The unconditional guarantee is unchanged: every change in force was ratified by a human, an agent may never author/widen/ratify the grant it acts under, and a grant with no evaluating guard is not in force. (#502)

### Fixed

- **The ingest and onboard extraction prompts told agents to emit `INFORMATION_ENTITY`.** Both `03_application.md` prompts (and their READMEs, the two `SKILL.md`s, `templates/AGENTS.md`, and the process-blueprint template's `information_entities[]` block) still named the TYPE retired by ADR 2026-06-08, so every application-layer extraction produced candidates that failed `validate` on the first pass and had to be renamed by hand. All now say `BUSINESS_OBJECT` / `business_objects[]`. `ingest/SKILL.md`'s promotion rule additionally listed `EQUIPMENT` and `INFORMATION_ENTITY` as `view-defined`, which the same ADR reversed when it promoted both to standalone catalogued elements. (#503, #504)
- **`ELEMENT_PRIMITIVES.md` §7.29 described a `RELEASE`'s `valid_from` as the admission-time record lifecycle; `CONTRACT.md` §7 already defined it as the modelled thing's own lifecycle — the ship date, not when the record was admitted.** Three bundled examples had followed the wrong sentence and set `valid_from` from `admitted_at` (two others, already correct from `released_at`, are unchanged); the worked example is corrected so its three dates actually differ. Also records the provenance decision behind it: no schema extension for release provenance — `derived_from` already covers tag-sourced releases via the section 3 envelope every standalone TYPE carries. (#494)

---

## [3.6.0] — 2026-08-17

Bump category: **MINOR** — categorised the 6 PRs landed since #486's 3.5.0 tag per RELEASING.md's bump table; highest is #487/#489 (new `CONTRACT.md` §10.7 section, new `check-notations.mjs` validation codes at warning severity) -> MINOR. `method/` is divided from four content files (515 lines in the largest) into a ten-file structure, one file per reader question, plus a new `guides/` folder for task procedures. Three pre-existing documentation defects are fixed while splitting: two incompatible ID-grammar examples are reconciled to the one canonical grammar, a repository-tree listing missing `04_technology/` is restored, and a paraphrased compatibility policy is replaced with a pointer to its canonical source. `check-notations.mjs` is widened to cover `method/` and gains four new mechanical invariants (ID1, LAYER1, DUALHOME1, SIZE1 — the last warn-only). No schema, field, enum, or required-field change; `node scripts/check-notations.mjs` passes clean with no new failures (two pre-existing SIZE1 warnings on files over the new soft ceiling, non-blocking).

### Added

- **A new `method/08-governance.md`** — assembled from doctrine previously scattered across `02-team-operations.md`, `03-architecture-decision-log.md`, `04-methodology-update-propagation.md`, and `01-methodology.md`: who may change what (human vs. agent authorship, the ratification gate, the cross-repo authorship limit), what gates a change (validation + review), immutability and supersession, mechanical enforcement, and the versioning/compatibility promise.
- **A new `guides/` folder at the repository root** — unnumbered, adopter-facing task procedures that don't belong to `method/`'s reading order: `modelling-capabilities.md`, `modelling-complex-processes.md`, `adl-adopter-setup.md`.
- **`notations/CONTRACT.md` §10.7** — a document path is now explicitly part of the published surface: retirable in a `MINOR` with one release of deprecation (a stub at the old path); a section-anchor change carries the same promise through a redirect table in the release notes (below).
- **A "Discovery" section in `RELEASING.md`** — the scheduled drift-detection job, moved here from `method/04-methodology-update-propagation.md` §7 as maintainer-side operational content, distinct from the adopter-facing propagation contract it sits alongside.
- **`check-notations.mjs` gains four new mechanical invariants** — `ID1` (example-ID grammar checked against `IDS_AND_REFERENCES.md` §1), `LAYER1` (layer-folder enumeration completeness), `DUALHOME1` (no `method/` table restates a `notations/` table), and `SIZE1` (warn-only per-file section-count soft ceiling); example checking and L1 link resolution now cover `method/` alongside `notations/`. (#489)
- **A portable `transitrix/plugin.json`** targeting the [Agent Plugins Specification v1.0.0](https://agent-plugins.org) alongside the existing Claude-Code-specific `.claude-plugin/plugin.json`, generated by `scripts/generate-plugin-manifests.mjs` so the two manifests never disagree on name or version by hand-editing drift; CI validates both the generator's `--check` mode and `claude plugin validate` on every PR. (#488)
- **Rendered view-example SVGs in `transitrix/README.md`** — every notation view the plugin's onboard skill produces that has a real renderer in `@transitrix/diagrams`, sourced from this repository's own `notations/examples/`, with a CI drift check that regenerates and diffs on every relevant PR. (#490)
- **Outbound links to transitrix.com carry a `?utm_source=<surface-slug>` parameter** identifying which surface (README, skill, etc.) the link lives on. (#491)
- **`CONTRIBUTING.md` "Adding or changing a Skill" section** — structure, `SKILL.md`/`README.md` pairing, and the per-skill validation gate. **`.github/ISSUE_TEMPLATE/`** (bug report, feature request, config) and an extended PR template checklist (DCO sign-off, one-concern-per-PR, no-work-item-reference). (#492)

### Fixed

- **`check-notations.mjs`'s new `ID1` check surfaced pre-existing violations**, now corrected: leading-zero worked-example IDs (`ROLE-*-001`, `GOAL-CUST-001`) and prose placeholders rewritten to the canonical `TYPE-…` convention; two proposed-but-unregistered rule codes (`ACTION-006`, `REL-COVERAGE-001`) added to `vocabulary.yaml`'s `deferred.rule_codes`. (#489)
- **`CONTRIBUTING.md`'s "Submitting changes" step 4** named a validator path (`organizations/<org>/.validators/lint.py`) this repo does not have; replaced with the accurate per-touched-path gate (`check-notations.mjs`, `@transitrix/cli validate`, skill-cheatsheet conformance, skill test suites). (#492)

### Changed

- **`method/` divided into ten files** (`00`–`09`), each answering one reader question in place of the former four mixed-scope files. See the redirect tables below for the full old-path → new-path and old-anchor → new-anchor mapping.
- **The two incompatible ID-grammar examples are reconciled.** The former `01-methodology.md` showed `APPLICATION-ORDER-1` in one place and the abbreviated, explicitly-forbidden `APP-TRX-001` in another, plus a third relation-id variant. `method/03-modelling.md` now shows the one canonical grammar throughout and states the relation-id form once.
- **The repository-tree listing in `method/02-repository.md`** (formerly `01-methodology.md` §4) restores the `canon/elements/04_technology/` line, missing from the tree since it was first written.
- **The compatibility-policy paraphrase is replaced with a pointer.** The former §13's inline restatement of "breaking changes to the YAML DSL, file layout, or naming convention" is replaced, in `method/08-governance.md`, with a pointer to `notations/CONTRACT.md` §10 — the one place that policy is defined.
- **`01-methodology.md` §12.1** (scaffold a new organisation) is merged into `GETTING_STARTED.md` Step 1 and deleted, rather than moved — it was the same recipe already told, in more depth, at the repository root.
- **132+ inbound references across the repository** — skills, scripts, patterns, notation specs, `CONTRACT.md`, `MANIFEST.md`, `README.md`, `CONTRIBUTING.md` — repointed from the five retired paths to their successor file(s) and section(s); none left resolving to a stub.

### Redirects — old path → new path

| Old path | New path(s) |
|---|---|
| `method/01-methodology.md` | `method/01-foundations.md` (§1, §1a, §2, §3) · `method/02-repository.md` (§4) · `method/03-modelling.md` (§5, §9) · `method/04-notations.md` (§6) · `method/05-working-the-model.md` (§7, §8) · `method/08-governance.md` (§7 closing line, §8, §13) · `GETTING_STARTED.md` (§12.1, merged) · `guides/modelling-capabilities.md` (§12.2) · `guides/modelling-complex-processes.md` (§12.3) |
| `method/02-team-operations.md` | `method/06-team-operations.md` (§1–§2, §3.2–§3.4, §4–§10) · `method/07-decisions.md` §2 (§3.1, the ADR record shape) |
| `method/03-architecture-decision-log.md` | `method/07-decisions.md` (§1–§9, §11–§12) · `guides/adl-adopter-setup.md` (§10) |
| `method/04-methodology-update-propagation.md` | `method/09-releases-and-propagation.md` (§1–§6, §8–§9) · `RELEASING.md` § "Discovery" (§7) |
| `method/05-catalogue-integration.md` | `method/09-releases-and-propagation.md` §6 (in full) |

Every retired path above keeps a stub pointing at its successor(s), kept for at least one further `MINOR` release (`notations/CONTRACT.md` §10.7).

### Redirects — old anchor → new anchor

| Old anchor | New anchor |
|---|---|
| `01-methodology.md#1-what-this-is` | `01-foundations.md#1-what-this-is` |
| `01-methodology.md#1a-how-the-to-be-is-obtained` | `01-foundations.md#2-how-the-to-be-is-obtained` |
| `01-methodology.md#2-four-core-principles` | `01-foundations.md#3-four-core-principles` |
| `01-methodology.md#3-standards-transitrix-builds-on` | `01-foundations.md#4-standards-transitrix-builds-on` |
| `01-methodology.md#3a-archimate-vocabulary-reference` | `notations/IDS_AND_REFERENCES.md` (deleted, replaced by a pointer) |
| `01-methodology.md#4-repository-structure` | `02-repository.md#1-repository-structure` |
| `01-methodology.md#41-operational-layer--team-operations-operations` | `02-repository.md#11-operational-layer--team-operations-operations` |
| `01-methodology.md#5-the-yaml-dsl` | `03-modelling.md#1-the-yaml-dsl` |
| `01-methodology.md#6-notation-kit` | `04-notations.md#1-the-notation-kit` |
| `01-methodology.md#61-where-each-notation-lives-in-the-repository` | `notations/README.md` (deleted, replaced by a pointer) |
| `01-methodology.md#7-change-lifecycle` | `05-working-the-model.md#1-change-lifecycle` |
| `01-methodology.md#8-validation-matrix` | `05-working-the-model.md#2-validation-matrix` |
| `01-methodology.md#9-naming-conventions` | `03-modelling.md#2-naming-conventions` |
| `01-methodology.md#12-getting-started` | `GETTING_STARTED.md` (§12.1) · `guides/modelling-capabilities.md` (§12.2) · `guides/modelling-complex-processes.md` (§12.3) |
| `01-methodology.md#13-versioning` | `08-governance.md#5-the-versioning-and-compatibility-promise` |
| `02-team-operations.md#31-architecture-decision-record-adr` | `07-decisions.md#2-the-record-format` |
| `02-team-operations.md#6-status-vocabularies` (ADR rows) | `07-decisions.md#21-provenance-and-source-author-source` |
| `02-team-operations.md#6-status-vocabularies` (WI/Feedback rows) | `06-team-operations.md#31-work-item-wi` / `#32-feedback-record-fb` |
| `02-team-operations.md#7-the-1-screen-rules-doc--operationsreadmemd` | `06-team-operations.md#6-the-1-screen-rules-doc--operationsreadmemd` |
| `02-team-operations.md#8-templates` | `06-team-operations.md#7-templates` |
| `03-architecture-decision-log.md#6-provenance-and-the-ratification-gate` | `07-decisions.md#4-provenance-and-the-ratification-gate` (mechanics) · `08-governance.md#2-who-may-change-what--human-and-agent-authorship` (doctrine) |
| `03-architecture-decision-log.md#7-immutability-discipline` | `07-decisions.md#6-immutability-discipline` (mechanics) · `08-governance.md#3-immutability-and-supersession` (doctrine) |
| `03-architecture-decision-log.md#8-ci-guard--scriptscheck-adlmjs` | `07-decisions.md#7-ci-guard--scriptscheck-adlmjs` |
| `03-architecture-decision-log.md#10-adopter-setup--from-an-empty-repo-to-a-running-harvest` | `guides/adl-adopter-setup.md` |
| `04-methodology-update-propagation.md#7-discovery--noticing-drift-on-a-schedule` | `RELEASING.md#discovery--noticing-drift-on-a-schedule` |
| `05-catalogue-integration.md#1-the-ownership-rule` | `09-releases-and-propagation.md#61-the-ownership-rule` |
| `05-catalogue-integration.md#2-the-four-levels` | `09-releases-and-propagation.md#62-the-four-levels` |
| `05-catalogue-integration.md#4-catalogue-publication-and-the-pin--l1` | `09-releases-and-propagation.md#64-catalogue-publication-and-the-pin--l1` |
| `05-catalogue-integration.md#7-setting-it-up` | `09-releases-and-propagation.md#66-setting-it-up` · `guides/adl-adopter-setup.md` (L0 step) |

---

## [3.5.0] — 2026-08-15

Bump category: **MINOR** — new `TERM` element type, a new catalogue-integration spec surface (levels, binding envelope, adopter pattern, `ingest-cli` commands), a new render contract section, and `document-renderer` pass 2/run-record/PDF output; all additive, no migration recipe required. Also cuts the tag `v3.4.0` never got — `notations/CURRENT_VERSION.yaml` was bumped in #475 but the release was never tagged; this release folds that gap in rather than shipping an intermediate untagged version.

### Added

- **`TERM` element type** (business-layer vocabulary, ArchiMate Meaning) — the 31st live element TYPE, folded into the `ELEM-ALIAS-001` cross-catalogue uniqueness gate. New **glossary report view** (`32-glossary.md`) projects name/aliases/description from `TERM` and every other TYPE into one flat, alphabetised lookup surface. **No renderer ships for it yet** (Studio and DSM both list it planned) — an authored glossary view validates cleanly but has no consumer today. (#479)
- **Catalogue integration — four levels and the binding envelope.** The ownership rule and the four separately-enabled levels (decisions / vocabulary / recognition / promotion) at which a project repository joins a network around a central catalogue repository, plus the `canon_id`/`origin` binding envelope and its validation rules (`BIND-001`–`005`). (#477)
- **Catalogue publication, the consumer pin, and the L1 vocabulary-divergence check** — publication format, the `transitrix.yaml` `catalogue:` pin, the fails-closed load rule, the pin-bump ADR gate, and a report-only L1 divergence check; `ingest-cli` gains a fails-closed catalogue loader. (#478)
- **`ingest-cli` L2 recognition + L3 promotion** — `catalogue-recognize` (propose a binding by unambiguous name/alias + TYPE match), `catalogue-bind` (human-gated write, fails closed against `BIND-001`–`004`), and `catalogue-promote` (emits a promotion proposal, never writes across the repository boundary); `repo-check` surfaces the full `BIND-001`–`005` envelope check. (#480)
- **Catalogue — adopter-facing half.** New pattern (`patterns/network-catalogue.md`), a §7 "Setting it up" section on the catalogue-integration doc, and `ingest-cli`'s `adopt-adl` (L0) and `catalogue-pin` (L1) commands. (#481)
- **`blocks` render contract for the matrix subset (§7a)** — what a conformant renderer must produce for a `grid:` root document: rectangular table sizing, header order, pre-layout `assign:` expansion, and inline validation surfacing per `BL-020`–`025`. States explicitly that the general layered-grid superset remains unspecified by design. (#484)
- **`document-renderer` pass 2** — fills `{{# instruct ... }}` slots left open by pass 1 via a caller-supplied `fill` hook, agent-agnostic by construction, enforcing the closed-input discipline of the 2026-08-12 instruction-slot decision. (#485)
- **`document-renderer` run record** — a pure function over template id/version, repository commit, model id, run timestamp, and per-slot instruction/verdict (sufficient / insufficient / not-attempted). (#485)
- **`document-renderer` PDF output** — dependency-free Markdown-to-PDF, A4, paginating automatically; bold/italic stripped and figures become text placeholders as named, non-silent scope limits. (#485)

### Changed

- Dependabot now watches all six npm manifests under `packages/`, including `document-renderer` and `document-view-engine`. (#482)
- The public-surface hygiene scan now also runs on direct pushes to `main`, not only on pull requests. (#483)

---

## [3.4.0] — 2026-08-09

Bump category: **MINOR** — new notation spec file (diagram view), additive `ingest-cli` checks, and tooling/doc fixes only; no migration recipe required.

### Added

- **`integration-map` diagram view** (`notations/views/diagrams/12-integration-map.md`) — projects admitted `INTEGRATION` elements (and, optionally, `uses` edges to `TECHNOLOGY_SERVICE`) as a labelled directed graph. No field on the view document accepts an inline `source`/`target` pair — an edge with nothing admitted behind it is structurally unrepresentable, enforced by `INTMAP-004` and demonstrated by a rule-violations fixture. Registered in the view-level TYPE table, the notation index, and `vocabulary.yaml`'s rule codes. (#474)
- **`ingest-cli repo-check` profile-completeness check** — flags every `canon/elements/` TYPE the active coverage profile does not cover, independent of whether any candidate for that TYPE ever loaded (previously invisible to `suggest-profile.mjs`, which only sees the loaded-candidate stream). Fails loudly (`resolvable: false`) when the profile itself cannot be resolved, instead of reporting a false-clean empty list. (#473)
- **CI: shared simple docs/chore PR auto-merge check** — schedules the reusable workflow hosted at `transitrix/templates` against this repository's own open PRs, plus `workflow_dispatch` for a manual run. `DRY_RUN` defaults `true`. (#469)

### Changed

- **`NOTATION_SELECTION_GUIDE.md`** — authored-or-derived now comes before the general-purpose-tool ranking (content derived from admitted canon has no PlantUML/Mermaid candidate at all), and the guide states plainly that Transitrix is not mandatory for diagrams — a one-off sketch is a drawing, and PlantUML/Mermaid are the right tools for it. (#474)
- **Declared `engines.node` floor raised `>=18` → `>=20`** across all six packages (`document-renderer`, `document-view-engine`, `decisions-cli`, `ingest-cli`, `reg-intel-cli`, `reqif-cli`) — CI already tests against Node 20 everywhere; the floor each manifest declared was a promise CI never tested. (#471)
- **Getting Started Step 3** now scaffolds a `GOAL` element with `transitrix new goal` and completes hand-authored files with `validate --fix`, instead of walking the reader through admission-record/lifecycle fields by hand; no longer cites the envelope spec sections directly. (#468)

### Fixed

- **A per-file read failure in `ingest-cli`'s zone walkers** (`canon.mjs`, `placement.mjs`, `check-stale.mjs`, `unresolved.mjs`, `repo-check.mjs`) was silently swallowed, making an unreadable file indistinguishable from a missing object. Each walker now names the file and reason; `check-stale`/`check-placement` print them, `repo-check` keeps its data-free contract and reports an aggregate count only. (#473)
- **`ELEMENT_PRIMITIVES.md` §3** now recommends a block scalar (`>-`/`|-`) as the default for free-text fields (`description`, provenance notes, `statement` on RULE/CONSTRAINT) — a plain scalar containing `": "` is ambiguous YAML and fails the whole document to parse, silently. (#473)
- **`IDS_AND_REFERENCES.md` §3.1`** now states, at the TYPE registry itself, that `type:` is a per-TYPE subtype value, never the catalogue TYPE (the catalogue TYPE is carried by `notation:` + the ID prefix) — `ELEMENT_PRIMITIVES.md` §3 already said this; the registry a reader lands on first did not. (#472)
- **`elements/25-nodes.md` §1** no longer claims `hosts` covers an `APPLICATION` deployed on a `NODE` — it doesn't. (#472)

---

## [3.3.0] — 2026-08-08

Bump category: **MINOR** — new notation spec file, additive document-view-engine rendering, and tooling/hygiene fixes only; no migration recipe required.

### Added

- **`DIRECTIVE_LANGUAGE.md` normative conformance spec** (`notations/views/documents/`, stable, v1.0) — the `{{ ... }}` directive grammar shared by `.ttrs` document-source templates and document-view-engine skeleton files becomes a conformance contract an independent implementation can build against without reading the reference code: five reference states (adds `⚑S`, cited to `CONTRACT.md` §16), a three-way suspicion-distinguishability requirement (§5.1), a normative strict/lenient render-profile split where lenient must detect exactly what strict fails on (§6), a named-failure requirement for any unimplemented construct (§7.1), and a conformance checklist (§9). New canonical extension form `*.<short-name>.ttrs` alongside `*.<short-name>.transitrix.yaml` (`CONTRACT.md` §3). (#461, #462)
- **`@transitrix/document-renderer` package** — reference implementation of the directive language and the `.ttrs` document-source template format. Pass 1 resolver runs with no agent present, touches nothing in the model (read-only), and is re-run-stable; resolves model-object references (`{{ REQ-14.parent.title }}`, depth 3) and derived/supplied/reference figures, and copies `{{# instruct }}` slots through byte-for-byte. New `T1` doc-lint check names the `.trs` near-miss extension explicitly. Frozen byte-for-byte conformance fixture (`tests/fixtures/product.mrd.expected.md`) that `test_conformance.mjs` diffs against and never regenerates; line endings pinned to LF across the fixture tree. New `document-renderer-test` CI workflow. (#461, #462)
- **Document-view engine gains derived-content evaluation, render profiles, illustrations, and the trace-coverage matrix** (`packages/document-view-engine/`) — `createEvaluator()` resolves `{{ ID.field }}` traversal (re-classifying the §3 states at every hop) and `{{# each ... }}` selection against canon; `renderDocument()` walks the AST into `review` (coloured, flagged) or `clean` (fails the build on a configured state set) HTML per §4; `figure`/`figref` render with document-order illustration numbering (forward references resolve; manual vs. missing border classes); `evaluateTrace()` builds the full `from`-type × `to`-type `{{ trace }}` coverage matrix, resolving `via` against either a first-class REL kind or a claim record's named endpoint field (e.g. `VERIFICATION.verifies`), with every row/column present even when uncovered. Derivation share, telemetry, and PDF output remain open on the epic. (#450, #451, #452)
- **`blocks`-notation `view` rendering** — new `blocks-view.mjs` parses a `blocks` notation `nested_blocks` document and lays it out as nested-box SVG; `render.mjs`'s `view` case renders it clean (green), suspect via `⚑S` (amber, cross-linked block id resolves suspect), or missing/unsupported (red, `⚑U`); `figure` and `view` now share one illustration-numbering sequence in document order. (#452)
- **`notations/vocabulary.yaml`** — new machine-readable source of truth for the element TYPE registry, the relation-type enum (with endpoint TYPE set and ACTOR-subtype narrowing), closed value vocabularies, and rule codes. Four `VOC1`–`VOC4` checks in `scripts/check-notations.mjs` cross-verify it against `ELEMENT_PRIMITIVES.md` §4, `elements/17-relations.md` §3, each vocabulary's owning spec, and rule-code tables respectively, failing closed on a missing or unparseable artefact. `packages/ingest-cli` derives its `placement.mjs`/`validate.mjs` closed sets from this file instead of hand-maintained literal copies. (#457, #466)
- README names the new `.ttrs` document source format and links the spec. (#464)

### Changed

- **`document-view-engine` and `document-renderer` share one grammar owner.** `document-renderer/src/ids.mjs` absorbs `isValidTypeName` and becomes the single ID grammar for the notation; new `document-renderer/src/syntax.mjs` holds the front-matter, header-scalar, and identifier/field-path primitives both parsers previously carried as byte-identical copies. `document-view-engine`'s own `ids.mjs` is deleted and `parse-skeleton.mjs` imports from `document-renderer` instead. Structural only — each parser keeps its own construct set, error shape, and AST node names; all eight existing test suites across both packages, including the frozen conformance fixture's byte comparison, pass unchanged. `document-view-engine` gains its own CI workflow, path-filtered to also run on grammar changes in `document-renderer`. (#465)

### Fixed

- **`notations/CURRENT_VERSION.yaml` and every dependent `methodology_version` pin** (`CONTRACT.md`, examples, view specs, onboarding templates, migration fixtures) bumped to `3.2.0` — the `v3.2.0` tag shipped without this step. `RELEASING.md`'s per-release checklist gains the missing step so a future release cuts the pin bump in the same PR as the changelog, before tagging. (#455)
- **`notations/vocabulary.yaml`'s own `methodology_version` pin** bumped to `3.2.0` (missed by #455). (#463)
- **`ingest-cli` `placement.mjs`/`validate.mjs`** were silently missing several catalogued element TYPEs and relation kinds versus the spec (stale hand-maintained literal lists) — both now derive from `vocabulary.yaml`, closing the gap. (#457)
- **`offers` relation** was missing its `from_subtype: [business_unit]` narrowing in the new `vocabulary.yaml`, despite `17-relations.md` §3's table and prose already documenting it. (#457)
- **`BOBJ-D001`** — a live warning row in `ELEMENT_PRIMITIVES.md` — was missing from `vocabulary.yaml`'s `rule_codes`. (#466)
- **`ELEMENT_PRIMITIVES.md` §4's materialisation-mode table** still listed `EQUIPMENT`/`INFORMATION_ENTITY` as view-defined, predating the 2026-06-08 ADR that promoted both to standalone catalogued elements (`EQUIPMENT`, renamed `BUSINESS_OBJECT`). (#457)

---

## [3.2.0] — 2026-08-07

Bump category: **MINOR** — additive notation, tooling, and CI-hygiene changes only; no migration recipe required.

### Added

- **Document-view engine** (`packages/document-view-engine/`) — skeleton-file parser (`parseSkeleton()`) covering bare/field/traversal inline references, `{{# each TYPE where ... order by ... }}` selection blocks, `.field` references, `trace`, `view`, `figure`/`figref`, `view`'s `as=`/`fit=` parameters, and the `\{{` escape; plus `resolveReference()`/`createResolver()` classifying an id against canon into the four §3 states (`ok`, `⚑U` unresolved, `⚑A` not admitted, `⚑V` out of validity, `⚑S` suspect via CONTRACT §16). Zero runtime dependencies; syntax/resolution scope only — render profiles, derivation share, telemetry, and PDF output remain open. (#439, #440, #443)
- **Document-view class + MRD/SRS/SDD layouts** (`notations/views/documents/`) — new view class alongside diagrams/reports; three deterministic, render-contract-defined layouts derived from admitted canon with no hand-authored prose surface: MRD (grouped `NEED`+`REQUIREMENT` via `REQUIREMENT.serves`), SRS (software-tier `REQUIREMENT` sectioned by `kind`), SDD (`APPLICATION`/`NODE`/`TECHNOLOGY_SERVICE` design elements traced to the `REQUIREMENT`s they realise). Reserved inert `view.standard` field; new `DOC1` doc-lint rule forbidding a shipped layout from emitting a standard identifier. (#426, #427, #430, #431)
- **`RELEASE` element TYPE** (`ELEMENT_PRIMITIVES.md` §7.29, `canon/elements/05_implementation/releases/`) — dated/versioned state of a `PRODUCT`/`APPLICATION` (`of`, `version`, optional `predecessor`, `released_at`). Rules `RELEASE-001..005`. (#446)
- **`required_for` relation** (`REQUIREMENT` → `RELEASE`, `17-relations.md` §3) — scopes an obligation to one release rather than the whole subject; derived "what must hold in release R" query via a `predecessor`-chain walk (`scripts/release-obligations.mjs`). No new rule code (reuses `REL-002`/`REL-003`). (#447)
- **`ASSERTION.subject_release` and `VERIFICATION.verified_on`** — optional `RELEASE` qualifiers narrowing a claim/protocol run to a specific release; derived "superseded" read via the `predecessor` chain. Rules `ASSERT-010`, `VERIF-007` (both error, reachable only when the new optional field is set). (#448)
- **`depends_on` relation kind** (`REQUIREMENT` → `REQUIREMENT`, `17-relations.md` §3) — conditional obligation dependency, distinct from `parent`/work-order relations. Rules `REL-005` (self-reference, error), `REL-006` (cycle, warning). (#438)
- **Agreement axis** (`CONTRACT.md` §6.3) — `agreement: draft | agreed | disputed` on `REQUIREMENT`/`CONSTRAINT`/`NEED`, independent of admission; only a human may write `agreed` (`AGREE-001..003`). Reference implementation `scripts/check-agreement.mjs`. (#433)
- **Link suspicion / content identity** (`CONTRACT.md` §16) — git-derived (never stored) suspicion flag over `REL`/`ASSERTION`/`VERIFICATION`/`VALIDATION` endpoints and agreement-carrying elements, with a mechanical-procedure hatch for declared bulk migrations. Reference implementation `scripts/check-link-suspicion.mjs`. (#437)
- **Deprecation policy** (`CONTRACT.md` §10.6) — a `status: deprecated` spec must name its `removed_in:` release; window is at least one MAJOR; removal is always a BREAKING entry. New `DEP1` doc-lint rule. FGA scheduled for removal in `4.0.0`, migration recipe pre-staged under `migrations/3.1-to-4.0/`. (#429)
- **Externally-distributed packages** (`PACKAGES.md` §1, §7.2) — package class with its own version and `compatible_with` range (`PKG-002`); package-agnostic validator discovery (`ingest-cli check-packages`); required §6 envelope-statement row on every package spec (`PKGDOC1`). (#434)
- **Ingest review-queue `semantic_links`** — optional typed edges between candidates for relations with no closed REL kind yet; passed through, never admitted to canon. (#435)
- **Ingest approver extraction + `role_assignment_proposals`** — new cross-cutting extraction prompt for a document's approval/sign-off chain; review-only person→role proposals, never shaped into a relation candidate or admitted. (#436)
- **`.github/pull_request_template.md`** — two-section PR template (What changed / How it is verified). (#444)

### Changed

- **ADL per-repo decision layer** (`method/03-architecture-decision-log.md` §1, §6, §10) — canonical only where the repo's readership is the reasoning's intended audience; a public repo keeps at most an unmotivated pointer, record lives centrally. Matching agent-authorship boundary added to §6. (#423)
- **Onboarding skill computes the admission record and lifecycle** — `admitted_at`/`admitted_by`/`gate_checks`/`valid_from` are no longer hand-typed placeholders; `SKILL.md` gains an "Admission record and lifecycle" procedure mirroring the CLI's own `transitrix new` behaviour. (#424)
- **Capability/application maturity converges on the versioned-attribute sidecar** (`CONTRACT.md` §9.4, `05-capability-map.md`, `10-applications.md`) — `target_maturity` joins `current_maturity`/`target_date` as time-varying (sidecar `{valid_from, value}` step function); single shared CMMI V2.0 scale definition. (#425)
- **View catalogue split into `diagrams/`/`reports/`/`documents/`** (`notations/views/`) — each spec's class now structural via folder rather than a README table position; `IDS_AND_REFERENCES.md` §3.2's document-level TYPE registry renamed `VIEW_TYPE`; `check-notations.mjs` C1 count check derives counts from the filesystem. (#426)

### Fixed

- **CI work-item reference guard** — widened to catch the unpunctuated "hub"+worktype+number form alongside the existing `#`-punctuated pattern; self-test added against the live extracted pattern. (#422)
- **`baseline-manifest` scope** — derived from every `id:` under `canon/` instead of a hardcoded two-directory list, so newly registered TYPEs are no longer silently omitted. (#428)
- **`ingest-cli admit-source` idempotency** — retrying on the same converted markdown after the raw source moved out of `_intake/inbox/` no longer skips the duplicate check and mints a spurious second artefact; `--force` still mints a genuine duplicate. (#432)
- **`check-notations` unit tests wired into CI** — `scripts/check-notations.test.mjs` now runs in `notations-doc-lint.yml` on every PR (previously local-only, blocked by a token-scope gap). (#442)
- **Duplicated `RISK` element schema content removed** (`ELEMENT_PRIMITIVES.md` §7.26) — broken nested code-fence and duplicated table/prose cleaned up. (#445)

---

## [3.1.0] — 2026-07-31

Bump category: **MINOR** — additive core vocabulary and tooling only; no migration recipe required.

### Added

- **`RISK` element type** (`ELEMENT_PRIMITIVES.md` §7.26) — motivation-layer projected event (likelihood / impact / residual / owner; `threatens` / `treated_by`). Additive alongside the ArchiMate Risk and Security Overlay mapping in `CONTRACT.md` §8.1. Rules `RISK-001..004`, `RISK-COVERAGE-001`. (#416)
- **`METRIC` element type** (`ELEMENT_PRIMITIVES.md` §7.27) — managed indicator (unit / target / `direction_of_good` / `measures`), distinct from report-config `COVERAGE_METRIC`. Rules `METRIC-001..004`. (#417)
- **`NEED` element type + `VALIDATION` claim** (`ELEMENT_PRIMITIVES.md` §7.28, `elements/28-validation.md`) — stakeholder/user need upstream of `REQUIREMENT`; `VALIDATION` mirrors `VERIFICATION` but anchors on `NEED` with a validation-method vocabulary. `REQUIREMENT.serves` optional back-reference. Rules `NEED-001..002`, `NEED-COVERAGE-001`, `NEED-VALIDATION-COVERAGE-001..002`, `REQ-SERVES-001`, `VALID-001..006`. Worked example under `notations/examples/validation/`. (#419)
- **`REQUIREMENT.level` and `REQUIREMENT.kind`** — optional ISO/IEC/IEEE 29148 specification-tier ladder (`stakeholder` / `system` / `software`) and functional/quality classification. Rules `REQ-005`, `REQ-006`. (#418)
- **Weekly Dependabot** with gated auto-merge for this repository's manifests and Actions. (#420)
- **Interactive one-card admission review** on `@transitrix/decisions-cli` (`review`), plus ingest/reg-intel conversational one-card review + stop/resume skill docs. (#397, #398)
- **Onboard skill** absorbs adopter starter templates previously living in the companion reference repo; teaching-content docs migrate into this repository. (#406, #405)
- **CI gates** — PR-description disclosure policy; commit-message scan with no PR-metadata carve-out; fail-closed when a hygiene value cannot be evaluated; committed content carries no work-item reference. (#413, #412, #408, #411)

### Changed

- **`VERIFICATION` wording** — documents verification only (not full V&V); `verifies` has only ever resolved to `REQUIREMENT`. (#415)
- **Public-surface hygiene** — work-item references use a neutral form in committed content; four remaining neutral-form cleanups. (#409, #403)

### Fixed

- **Stale-base squash restore** — content a stale-base squash had reverted is restored. (#414)
- **`.gitignore` notes** — stale `templates/` commentary trimmed. (#410, #404)

---

## [3.0.0] — 2026-07-29

Bump category: **MAJOR** — the ISO 14971 risk-management chain is removed from the public core. `VERIFICATION` and the rest of the compliance/V&V spine are unaffected. Decision of record: the 2026-07-29 core-scope decision.

### Breaking changes

- **BREAKING: `HAZARD` and `RISK_CONTROL` element types removed.** `notations/elements/28-hazard-risk-control.md`, the two TYPEs, and their canon folders (`canon/elements/01_motivation/hazards/`, `canon/elements/01_motivation/risk-controls/`) leave the public core. The ISO 14971 design-controls capability (hazard → risk-control → requirement → verification, with severity/probability/residual-risk classification) is no longer part of this repository. Migration recipe: [`migrations/2.1-to-3.0/`](migrations/2.1-to-3.0/).
- **BREAKING: Design-Controls Trace Matrix view removed.** `notations/views/24-design-controls-trace-matrix.md`, its reference renderer (`tools/render_trace_matrix.py`), and its onboarding template leave the public core.
- **BREAKING: Rules removed.** `HAZ-001..004`, `RISKCTL-001..005`, `HAZ-RISKCTL-COVERAGE-001/-002`, `RISKCTL-VERIF-COVERAGE-001`, and `DCTM-001..007` no longer exist — core tooling has no message for these codes; the migration recipe explains why and what to do.
- **BREAKING: Worked examples removed.** `notations/examples/design-controls/` and `notations/examples/design-controls-trace-matrix/` leave the public core.

### Added

- **`notations/CONTRACT.md` §8.1** — a mapping note expressing generic risk with core primitives already defined (`ASSESSMENT`, `DRIVER`, `GOAL`, `REQUIREMENT`, `CONSTRAINT`), per the Open Group's ArchiMate Risk and Security Overlay. No new element, folder, validator, or view — hazard/hazardous-situation/harm chains and residual-risk judgement are explicitly out of scope for this mapping.
- **`migrations/2.1-to-3.0/`** — migration recipe: detects `canon/elements/01_motivation/hazards/`, `canon/elements/01_motivation/risk-controls/`, and `*.design-controls-trace-matrix.transitrix.yaml` content, quarantines it out of `canon/` (never deletes), and states an affected repository's options.

### Changed

- **`VERIFICATION` is unaffected.** `notations/elements/27-verification.md` (now v0.3), `REQ-VERIF-COVERAGE-001/-002`, and `COVERAGE_PROFILES.md` §2.1's cross-cutting list are unchanged — `VERIFICATION` was never part of this removal.
- **`patterns/design-controls.md` renamed to [`patterns/baseline-audit-trail.md`](patterns/baseline-audit-trail.md) and generalised** off the ISO 14971 vocabulary — the baseline / audit-trail / review-approval mechanism it names (`git tag`, git history, the admission record) is domain-neutral and stays over `REQUIREMENT` / `ASSERTION` / `VERIFICATION`.
- **`notations/README.md`, `notations/views/REPORT_VIEW_CONFIG.md`, `notations/IDS_AND_REFERENCES.md`, `notations/ELEMENT_PRIMITIVES.md`, `transitrix/skills/onboard/SKILL.md`, `transitrix/.claude-plugin/plugin.json`** — catalogue counts, TYPE registry, and template listings updated to drop the removed TYPEs/view (11 diagram + 4 report views; 14 element notations).

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

The Actors / Stakeholders identity model. Unifies active-structure identity under one `ACTOR` TYPE and adds the `STAKEHOLDER` interest primitive; retires `UNIT` / `EMPLOYEE`. One pre-1.0 breaking change, called out below.

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
