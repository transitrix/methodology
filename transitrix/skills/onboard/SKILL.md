---
name: Transitrix Onboarding
description: Scaffold a new Transitrix architecture-as-text repository (zoned canon/ + field/ + codex/ layout with assistant-neutral AGENTS.md + transitrix.yaml manifest) and drive a first modelling session — enterprise architecture (BPMN, DGCA / Goals, capability map, process blueprint, action schedule, actions tree, nested blocks, scenarios, products, applications) plus codex artefacts (laws, regulations, policies, internal standards). Use when the user wants to start a new Transitrix repo from scratch, or has just cloned one and wants to author their first notation file with validation.
when_to_use: User says "set up Transitrix", "model my architecture as text", "create a new transitrix repo", "I want to write [DGCA / Goals / capability map / process blueprint / ...] but don't know the schema", or asks to scaffold an organisation-as-text repository following the Transitrix methodology. Also triggers when the user says "I cloned my team's Transitrix repo", "help me get oriented in this model", "make my first change to our architecture repo", or expresses a similar intent to orient in or contribute to a repo that already uses Transitrix.
min_version: "0.5.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix Onboarding Skill

Drive a newcomer from zero to a working Transitrix enterprise-as-text repo in one session. The methodology is canon at `github.com/transitrix/methodology`; this skill is the agent-facing protocol for picking it up.

The user has typed `/transitrix:onboard` (or you've decided to invoke this skill from a freeform request). Follow the six-step flow below. Don't deviate without telling the user.

---

## Step 1 — Detect repo state and branch

**Before asking anything,** check for signs of an existing Transitrix repo in the current working directory:

- `Glob` for `transitrix.yaml` at the working directory root (the adopter manifest), or
- a `canon/` directory at the root.

If either is found → switch to **Orient / Contribute mode** (§ below). Skip Steps 2–5.

If neither is found → **greenfield setup** — continue with the two questions below.

### Greenfield — confirm intent and surface area

Ask the user two short questions:

1. **What do you want to model first?** Show the family-selection cheat sheet (§ Cheat sheet below) and offer the most common starting points:
   - Strategy chain → **DGCA** (Driver → Goal → Change → Action) — use `view_config.layers.changes: off` for DGA mode (no Changes layer).
   - Hierarchy of goals → **Goals tree**.
   - Capability map with CMMI maturity → **Capability Map**.
   - Value chain with operational aspects → **Process Blueprint**.
   - Single process flow → **BPMN**.
   - Project schedule → **Action schedule**.
2. **How well do you know the methodology?** Calibrate explanation depth. If the user says "first time" — give a 90-second methodology walkthrough before scaffolding. If they say "I know it" — skip straight to step 2.

Do not assume. If the user picks a notation outside the family-selection table, that's fine — every notation in § Cheat sheet is a valid first artefact.

---

## Orient / Contribute mode (existing repo)

> **Entry condition:** `transitrix.yaml` or `canon/` found in the working directory (Step 1 detection). Steps 2–5 do not apply; skip straight to Step 6 after the first change lands.

**1 — Read the repo silently.** Before speaking to the user:

- `Read` `transitrix.yaml` — note `methodology_version`, `notations:`, `zones:`.
- `Glob` `canon/views/` — list which notation sub-folders exist and which are non-empty.
- `Glob` `canon/elements/` — note which ArchiMate layers have content.
- Check whether `field/` and `codex/` directories exist and have files.
- If `AGENTS.md` exists at the repo root, `Read` it — it carries adopter-specific rules that govern the rest of this session.

**2 — Orient the user.** Give a concise summary (3–5 bullets):

- Which methodology version the repo uses.
- Which notations are in use (non-empty `canon/views/` sub-folders).
- Which zones are active and populated.
- Where the agent guide lives (`AGENTS.md` at repo root) and that you have read it.

Example:
> This is a Transitrix repo at methodology v0.5.0, using DGCA, Goals, and Capability Map.
> Active zones: `canon/` (populated), `field/` (empty), `codex/` (empty).
> Agent guide: `AGENTS.md` at repo root — read and in effect.

**3 — Point at `AGENTS.md`.** Tell the user: "The repo's `AGENTS.md` governs how I behave here. What would you like to do first — add a new notation file, modify an existing one, or something else?"

**4 — Drive the first change.** Act on the user's response:

- **Add a new notation file** → jump to **Step 3** (template copy → authoring → validate → PR). Before copying a template, use `Glob`/`Grep` over the existing tree to pick the right domain prefix and avoid ID clashes.
- **Modify an existing file** → `Read` it first, summarise its current structure, then enter **Step 4** (interactive authoring with inline validation).
- **"Where is X?"** → `Grep` the repo and answer directly; no authoring loop needed.

After the first change is authored and validated, continue to **Step 6** (suggest next steps).

---

## Step 2 — Scaffold the repo

Scaffold the canonical **zoned** Transitrix adopter shape in the user's chosen target directory. The shape mirrors the worked example at [`organizations/acme_corp/`](https://github.com/transitrix/methodology/tree/main/organizations/acme_corp) in the methodology repo and is defined for adopters in [`organizations/acme_corp/AGENTS.md`](https://github.com/transitrix/methodology/blob/main/organizations/acme_corp/AGENTS.md) §3.

```
<repo-root>/
├── transitrix.yaml                 # adopter manifest — methodology version, notations, zones
├── AGENTS.md                       # assistant-neutral agent guide (canonical for all assistants)
├── .github/
│   ├── copilot-instructions.md     # pointer → AGENTS.md (GitHub Copilot)
│   └── workflows/
│       └── architecture-validate.yaml  # CI gate (fetched canon — see "Scaffold validation tooling + CI")
├── README.md                       # one-paragraph org stub + pointer to the methodology canon
├── .gitignore
├── .validators/                    # whole-repo model-integrity linter (fetched canon)
│   ├── lint.py
│   └── requirements.txt
├── canon/                          # validated model — the authoritative zone
│   ├── elements/
│   │   ├── 01_motivation/          # GOAL, CONSTRAINT, DRIVER, …
│   │   │   └── constraints/        # CONSTRAINT-…-N.yaml (one per file)
│   │   ├── 02_business/            # ROLE, PROCESS, CAPABILITY, RULE, …
│   │   │   └── rules/              # RULE-…-N.yaml (one per file)
│   │   ├── 03_application/         # APPLICATION, INTEGRATION, …
│   │   └── 04_technology/          # NODE, ARTIFACT, …
│   └── views/                      # one subfolder per notation
│       ├── bpmn/   dgca/   goals/   capabilities/   processmap/
│       ├── actions/   blocks/   scenarios/
│       └── applications/   products/   process-blueprint/
├── field/                          # raw inputs — not authoritative; provenance is the point
│   └── interviews/   surveys/   observations/   drafts/
└── codex/                          # constraints given to the org, faithful to source
    ├── external/                   # laws & regulations, sub-foldered by jurisdiction
    │   └── <jurisdiction>/         # ISO 3166-1 alpha-2 (ge, de, …), or `eu` / `intl` reserved
    └── internal/                   # policies & internal standards the org issues
```

Use the org name from step 1 (or ask: "What's the organisation name? — lowercase, hyphens for spaces"). If the directory already exists and isn't empty, **don't overwrite** — confirm with the user before proceeding.

The `canon/views/` folder names are intentionally shorter than the canonical short names in places (`capabilities/`, `processmap/`) — this is the adopter-side convention.

### Drop in the canonical root files

After the directory tree exists, copy the three canonical root files from the skill bundle's `templates/` directory into the repo root:

- `templates/AGENTS.md` → `<repo-root>/AGENTS.md` — the assistant-neutral agent guide. It carries `ADOPTER-FILL-ME` placeholders the user should fill in later (language, confidentiality policy, task source — see its §7–9).
- `templates/copilot-instructions.md` → `<repo-root>/.github/copilot-instructions.md` — the GitHub Copilot pointer that redirects to `AGENTS.md`.
- `templates/transitrix.yaml` → `<repo-root>/transitrix.yaml` — the adopter manifest (schema: `notations/MANIFEST.md`). After copying, edit `notations:` to list only the notations the user picked in step 1 (plus `codex` if they will use the codex zone), and `zones:` to the subset of `canon, field, codex` they will maintain.

Additionally, write one generated file (no template — author it inline):

- `<repo-root>/README.md` — a minimal org stub. Three sections: (1) one-paragraph intro naming the repo purpose and linking to `github.com/transitrix/methodology`; (2) "Getting started" pointing newcomers at `AGENTS.md` and the `/transitrix:onboard` skill; (3) "Tooling" recommending both VS Code extensions — **Transitrix Studio** (`transitrix.transitrix-studio`, VS Code Marketplace) for live Transitrix notation preview, and **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`, VS Code Marketplace and Open VSX) for Mermaid diagram preview in Markdown files. Leave `ADOPTER-FILL-ME` placeholders for org name, purpose, and team.

**Do not scaffold a Claude-specific `CLAUDE.md` agent guide.** The canonical guide for every assistant is `AGENTS.md`. If the user is on a tool that doesn't read `AGENTS.md` natively (e.g. Claude Code looks for `CLAUDE.md`, Cursor looks for `.cursor/rules/`), drop a one-line pointer file in that tool's location that reads *"Read `AGENTS.md` in the repo root and follow it."* The guidance itself stays in `AGENTS.md` only — see `AGENTS.md` §"Using this guide with your assistant".

### Three zones — what gets scaffolded

The adopter manifest's `zones:` field selects which of `canon` / `field` / `codex` the repo maintains. Scaffold all three folders by default unless the user explicitly opts out — empty zones cost nothing and keep the layout consistent.

- **`canon/`** — validated truth the organisation asserts. Authoritative; internally consistent. View notation files live in `canon/views/<notation>/`; reusable elements live in `canon/elements/<NN>_<layer>/`.
- **`field/`** — raw, unprocessed material (interviews, surveys, observations, drafts). Contradictions allowed; provenance is the point. **Not** authoritative. A Canon record may *cite* a Field artefact via `derived_from:` — a citation, not a migration.
- **`codex/`** — external constraints (laws, regulations) under `codex/external/<jurisdiction>/`, plus internal authority documents (policies, standards) under `codex/internal/`. Faithful to source; not edited to fit the model. See `notations/elements/14-codex.md` and Step 3 below for how to seed a first codex artefact.

Each artefact in any zone carries an **admission record** (`zone`, `admitted_at`, `admitted_by`, `gate_checks`, optional `derived_from`) defined in `notations/CONTRACT.md` §6. The codex and field templates ship with this record pre-filled with placeholders.

### .gitignore — and the private `_intake/` workspace

Initialise `.gitignore`:

```
node_modules/
.vscode/settings.json
.transitrix-cache/
__pycache__/
.venv/
.diagrams/

# _intake/ — the ingest skill's operational workspace (scaffolded later by
# `transitrix-ingest scaffold-intake`). It is a PER-USER, PRIVATE area: its
# contents are NOT shared with other modellers, so nothing that participates in
# the model may live there. Ignore the working files, but commit a .gitkeep in
# each subfolder so the inbox/ → processing/ → processed/ skeleton persists for
# everyone who clones the repo.
_intake/inbox/*
_intake/processing/*
_intake/processed/*
!_intake/**/.gitkeep
```

**Why `_intake/` is private and `canon/` is shared.** `_intake/` holds raw dropped files and in-flight extraction candidates — a private scratch space, not version-of-record. Model content is the opposite: it is committed and shared. This includes `canon/unresolved/` — the holding area for objects ingestion could not yet TYPE ([`notations/CONTRACT.md`](https://github.com/transitrix/methodology/blob/main/notations/CONTRACT.md) §13). An unresolved object is still real model knowledge (it may even be admitted-accurate, only its TYPE is open), so it must be committed to shared `canon/unresolved/`, **never** left in the private `_intake/`. When the ingest skill scaffolds `_intake/`, it drops the `.gitkeep` files; if a user creates the folders by hand, add an empty `.gitkeep` to each of `inbox/`, `processing/`, `processed/`.

Don't run `git init` unless the user asked for it.

### Scaffold validation tooling + CI

A freshly scaffolded repo should be able to validate itself and gate pull requests from day one — the agent sets this up so the adopter doesn't have to. In keeping with this skill's "fetch the canon, don't ship it" rule, pull the two canonical pieces from the methodology repo rather than embedding copies.

**Fetch from a pinned methodology version, not `main`.** Read `methodology_version` from the `transitrix.yaml` you just wrote (e.g. `0.5.0`) and fetch the canonical files from the matching release tag `v<methodology_version>` (e.g. `v0.5.0`) — never from the floating `main` branch. This makes the scaffold reproducible: two repos onboarded weeks apart on the same `methodology_version` get byte-identical validators, and the manifest already records which version they got. If no tag exists yet for the pinned version, tell the user and fall back to the latest release tag rather than silently pulling `main`.

1. **Whole-repo validator** — `WebFetch` `https://raw.githubusercontent.com/transitrix/methodology/v<methodology_version>/tools/lint.py` and write it to `<repo-root>/.validators/lint.py`. This is the model-integrity linter: it scans `canon/elements/**` and `canon/relations/**` for atomicity, referential integrity, ArchiMate semantics, and policy. The canonical source is `tools/lint.py` at the methodology root — fetch the canon, **not** the `organizations/acme_corp/` worked example.
2. **Validator dependencies** — write `<repo-root>/.validators/requirements.txt` containing one line: `pyyaml`. (`python3 -m pip install -r .validators/requirements.txt` to run the linter locally.)
3. **CI gate** — `WebFetch` `https://raw.githubusercontent.com/transitrix/methodology/v<methodology_version>/integration/ci-example.yaml` and write it to `<repo-root>/.github/workflows/architecture-validate.yaml`. It runs validation by `scope` — a repo-scope `model` job (structure + manifest, then `lint.py`: atomicity, referential integrity, ArchiMate semantics, policy) and a file-scope `views` job (`npx @transitrix/cli validate` per view) — and blocks merges on failure.

What the agent does **not** install: **Transitrix Studio** (the VS Code extension — the user installs it from the Marketplace, see Step 5) and the global Node / Python runtimes. The CI workflow provisions Node and Python itself; for local runs the user needs both on PATH.

This step is interim per ADR [`2026-06-11-validation-two-axis-model.md`](https://github.com/transitrix/methodology/blob/main/docs/decisions/2026-06-11-validation-two-axis-model.md): validation is converging onto a single TypeScript runtime (`@transitrix/cli --scope=repo`), after which this step will scaffold one validator instead of two. Until then, `lint.py` is the whole-repo gate and `@transitrix/cli` validates individual view files.

---

## Step 3 — Create the starter notation file from a template

Take the user's chosen notation from step 1. Copy the matching template from `${CLAUDE_SKILL_DIR}/templates/` into the right zone of the new repo. The templates are listed in § Templates below.

### View notations (canon zone)

For any of the 15 view notations (DGCA / Goals / Capability map / Process map / BPMN / Action schedule / Actions tree / Nested blocks / Scenarios / Applications / Products / Process Blueprint / Action Card / Compliance Impact / Coverage Metric), the destination is `canon/views/<notation-folder>/`. Naming convention: `<DOMAIN>.<short-name>.transitrix.yaml`. Ask the user for a short domain code (e.g. `strategy-2026`, `ORDER_FULFILMENT`, `CUSTOMER_ONBOARDING`). If they give a long name, suggest a kebab-case form.

After the copy:
- Open the file and read it to the user (or summarise its structure).
- Point at the placeholder values they need to fill in — they all carry `FILL-ME` markers.
- The template carries the canonical `notation:` and `spec_version:` headers, the canonical root key, and one minimal placeholder element per layer. **Do not strip the headers** — the canonical header is required by `notations/CONTRACT.md`.

### Codex artefacts (codex zone)

Codex artefacts are **zone primitives**, not view documents — they are individual `<ID>.yaml` files, one artefact per file, named by their canonical ID. They carry **no** `notation:` header (different shape from view notations; schema in `notations/elements/14-codex.md`).

If the user wants to seed a first codex artefact:

- **External** (law / regulation given to the org by outside authority) — copy `templates/codex-external.yaml` to `codex/external/<jurisdiction>/<ID>.yaml`. Rename the file to the artefact's canonical ID (e.g. `LAW-PERSONAL-DATA-2017-1.yaml`, `REGULATION-GDPR-2016-1.yaml`). The `<jurisdiction>` folder MUST match the `jurisdiction:` field inside the file (rule `CODEX-001`) — use ISO 3166-1 alpha-2 (`ge`, `de`, …), `eu` for EU-wide, or `intl` (reserved).
- **Internal** (policy / standard the org issues to itself) — copy `templates/codex-internal.yaml` to `codex/internal/<ID>.yaml`. Internal artefacts are not foldered by jurisdiction. Rename the file to the artefact's canonical ID (e.g. `POLICY-DATA-RETENTION-1.yaml`, `INTERNAL_STANDARD-coding-conventions-1.yaml`).

Update the `id:`, `name:`, `description:`, the admission record (`admitted_at`, `admitted_by`, `gate_checks.source_authority`), and the codex-specific fields (`jurisdiction` + `effective_date` for external; `issuing_authority` + `effective_date` for internal). A codex artefact stores the **source document only** — do not add bindings to canonical entities or processes on the artefact itself. Those bindings live downstream on `REQUIREMENT.derived_from` (which cites the codex source) and on `ASSERTION` (which links each requirement to its subject). See `notations/elements/14-codex.md` §8 Migration for the rationale; `notations/elements/15-requirement.md` and `notations/elements/16-assertion.md` for the downstream shapes.

---

## Step 4 — Interactive authoring with inline validation

Walk the user through filling the placeholders one at a time. After every meaningful edit, validate the file against the canonical schema:

- **For DGCA / Goals files**: validate against the canonical-form parsers in `@transitrix/diagrams` (`parseCanonicalDGCA`, `parseCanonicalGoals`). If Transitrix Studio is installed, opening the file shows live validation errors.
- **For every other notation**: validate against the rules in the relevant `notations/<NN>-<name>.md` spec. Each spec has a "Validation rules" table with the error codes the canonical validator uses. Surface those code names to the user in plain English when an edit produces an error.

If the user makes a change that introduces a canon violation:
- Explain the violation in one sentence ("you've referenced `GOAL-99` from a change, but no goal with that ID exists in the document — that's `DGCA-009`").
- Offer one or two ways to fix it.
- Don't auto-fix unless the user asks — surface the violation and let the user decide.

When fetching the full spec for a notation, use `WebFetch` against `https://raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<name>.md` (e.g. `02-dgca.md`, `04-goals.md`). Don't embed the full spec text in your context unless the user is going deep into a specific notation — the cheat sheet below is usually enough.

Once a few files exist, the whole-repo linter scaffolded in Step 2 catches cross-file problems the single-file check can't see (a relation whose endpoint doesn't exist, a missing owner): run `python3 .validators/lint.py` from the repo root, or let the CI workflow run it on the pull request.

---

## Step 5 — Hand off to Studio

Once the user has a working starter file, point them at **Transitrix Studio** (the VS Code extension) for live preview:

> "Install Transitrix Studio from the VS Code Marketplace (search for `transitrix.transitrix-studio`). Open the file you just authored — the preview opens automatically beside the editor and refreshes on every save."

The full notation set previews in Studio: BPMN, Goals, DGCA, Action schedule (PSND + Gantt), Actions tree, Process Map, Process Blueprint, Capability Map, Scenarios, Applications catalogue, Products catalogue, Nested blocks, Action Card, Compliance Impact, Coverage Metric.

Also recommend **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`) — available on both the VS Code Marketplace and Open VSX — so Mermaid diagrams in `.md` files (ADRs, architecture notes, `AGENTS.md` diagrams) render inline. Between Studio (Transitrix notation preview) and the Mermaid extension (Markdown diagram preview), the user has full visual coverage of the repo.

If the user is on a system without VS Code, they can use the CLI for compile / validate:

```
npx @transitrix/cli compile path/to/your.dgca.transitrix.yaml output.bpmn   # only meaningful for BPMN sources
npx @transitrix/cli validate path/to/your.dgca.transitrix.yaml
```

---

## Step 6 — Suggest next steps

Based on what the user just built, propose the next artefact in the family. Concrete patterns:

- They built a **Goals tree** → suggest a **DGCA** to link goals to their drivers and delivery activities.
- They built **DGCA** → suggest a **Capability map** for the same domain so they can see which capabilities each goal requires.
- They built a **Capability map** → suggest an **Applications catalogue** so each capability has a system inventory.
- They built **BPMN** for one process → suggest the **Process landscape map** to put it in context.
- They built **Process Blueprint** → suggest **Action schedule** to plan delivery against the blueprint stages.
- They built **Action schedule** → suggest **Goals tree** to back-link actions to strategic outcomes.

Don't push more than one suggestion per session. The point is to leave the user with one obvious next move, not a roadmap.

---

## Cheat sheet — Transitrix notation family

### Family selection

Use the matrix below to pick a notation. Full specs at `notations/<NN>-<name>.md` in `github.com/transitrix/methodology`.

| Situation | Notation | File extension |
|---|---|---|
| Trace strategic drivers → goals → transformation steps → deliverables | **DGCA** | `*.dgca.transitrix.yaml` |
| Same chain, but the Change layer adds no clarity (activities directly serve goals) | **DGCA** with `view_config.layers.changes: off` | `*.dgca.transitrix.yaml` |
| Decompose goals hierarchically (strategy → tactical → operational) | **Goals tree** | `*.goals.transitrix.yaml` |
| Plan delivery — actions, dependencies, durations, Gantt | **Action schedule** | `*.action.transitrix.yaml` |
| Browse the strategic portfolio as a hierarchy — Initiative → Programme → Project → Task | **Actions tree** | `*.actions-tree.transitrix.yaml` |
| Map capabilities with CMMI maturity, V/H orientation | **Capability map** | `*.capability-map.transitrix.yaml` |
| Top-level catalogue of processes (operating / supporting / management) | **Process landscape map** | `*.process-map.transitrix.yaml` |
| Detail one process — lanes, gateways, sequence flows | **BPMN** | `*.bpmn.transitrix.yaml` |
| Wide blueprint of a value chain — stages with systems, actors, equipment, information entities | **Process Blueprint** | `*.process-blueprint.transitrix.yaml` |
| Multi-level container layout — what's inside what | **Nested blocks** | `*.blocks.transitrix.yaml` |
| Alternative strategic development paths | **Scenarios** | `*.scenarios.transitrix.yaml` |
| Catalogue of applications + integrations | **Applications** | `*.applications.transitrix.yaml` |
| Catalogue of products + services | **Products** | `*.products.transitrix.yaml` |
| Single-project narrative view — goals served, dates, milestones, gate decisions | **Action Card** | `*.action-card.transitrix.yaml` |
| Compliance overlay — which obligations hit which product / process stage / task, with each cell's status | **Compliance Impact** | `*.compliance-impact.transitrix.yaml` |
| Coverage of canon — which subjects are dark for each regulatory regime, splitting modelling gaps from modelled exclusions | **Coverage Metric** | `*.coverage-metric.transitrix.yaml` |

**Family rule:** all three strategy-chain notations (DGCA, Goals, Action schedule) use the **flat form** — top-level arrays at the document root, hierarchy via `parent` / cross-references inside the flat array. No nested wrapper keys.

### Zone primitives — not view documents

A separate set of artefacts lives in the `field/` and `codex/` zones as one-file-per-record YAML, **not** as `.transitrix.yaml` view documents. They carry no `notation:` header. Use these when the situation is:

| Situation | Zone | Location | TYPE |
|---|---|---|---|
| External law or regulation binding the org | **codex** | `codex/external/<jurisdiction>/<ID>.yaml` | `LAW` / `REGULATION` |
| Internal policy or standard the org issues to itself | **codex** | `codex/internal/<ID>.yaml` | `POLICY` / `INTERNAL_STANDARD` |
| Recorded interview / survey / observation / draft | **field** | `field/<sub>/<ID>.yaml` | `INTERVIEW` / `SURVEY` / `OBSERVATION` / `DRAFT` |

Schema: `notations/elements/14-codex.md` for codex; `notations/CONTRACT.md` §5–6 for the zone model and admission record shared across all three zones; `notations/IDS_AND_REFERENCES.md` §3.4 + §3.5 for the codex / field TYPE registry.

### One-paragraph summary per notation

- **BPMN** — `notation: bpmn`. One root `process:` with `pools[].lanes[].elements[]` and `flows[]`. Elements typed (`startEvent`, `task`, `exclusiveGateway`, …); flows directed. Compiles to BPMN 2.0 XML.
- **DGCA** — `notation: dgca`. Flat root arrays: `factors[]`, `goals[]`, `changes[]`, `actions[]`. Typed string IDs (`DRIVER-1`, `GOAL-RET-1`, `CHANGE-1`, `ACTION-ONBOARD-1`). Cross-refs in the upstream direction: `goal.factors: [DRIVER-…]`, `change.goals: [GOAL-…]`, `action.changes: [CHANGE-…]`. Optional `driver.references_constraint: [CONSTRAINT-…]`. DGA mode (no Changes): add `view_config.layers.changes: off` — `changes[]` becomes optional, actions link via `action.goals: [GOAL-…]`.
- **Goals tree** — `notation: goals`. Flat root arrays: `goal_types[]` (with `{name, level}` entries) + `goals[]`. Each goal has `id`, `name`, `type` (matching a `goal_types[].name`), `level` (matching that type's level), optional `parent: GOAL-…`. Omit `parent` for a root.
- **Capability map** — `notation: capability-map`. Root key `capability_map:`. Capabilities use a V/H sub-grammar (`CAPABILITY-V1.2`, `CAPABILITY-H1`); each capability carries `type: domain | supporting`, `current_maturity`, optional `target_maturity`, `target_date`, etc.
- **Process landscape map** — `notation: process-map`. Top-level catalogue of `PROCESS-…` IDs grouped into `operating`, `supporting`, `management`.
- **Action schedule** — `notation: action`. Flat `actions[]`. Each action has string `id`, `name`, optional `predecessors: [ACTION-…]`, `goals: [GOAL-…]`, `delivers_changes: [CHANGE-…]`, `duration_days`, `start_date`, etc. Renders as a PSND network with critical path; optionally projects to Gantt.
- **Nested blocks** — `notation: blocks`. Root key `nested_blocks:`. Recursive `block` tree (`id`, `name`, optional `description`, optional `children[]`). Containment is YAML-nested.
- **Scenarios** — `notation: scenarios`. Alternative strategic development paths, each scoping its own goals / capabilities / activities / products / processes / applications.
- **Applications catalogue** — `notation: applications`. Inventory of `APPLICATION-…` elements + `INTEGRATION-…` entries with criticality, owner, type.
- **Products catalogue** — `notation: products`. Inventory of `PRODUCT-…` elements grouped by category.
- **Action Card** — `notation: action-card`. Root key `action_card:` carrying a single project's narrative — the project Action it summarises, planned dates, and document-scoped `MILESTONE` elements for narrative gates. One project per document.
- **Process Blueprint** — `notation: process-blueprint`. Root key `process_blueprint:` with `stages[]` (each carrying `goal` and `result`) and per-aspect arrays `systems[]`, `actors[]`, `equipment[]`, `information_entities[]`. Aspect entries reference the stages they appear in via `stages: [STAGE-…]`.
- **Compliance Impact** — `notation: compliance-impact`. Report-config over the compliance overlay (sibling of Scenarios). Root key `view:` declaring `subjects` (products / processes), `obligations` (`include` or `filter`), `grouping`, `status_display`, and `empty_cells`. Carries no canonical content — every cell is derived from `ASSERTION` + process flow + `REQUIREMENT` status.
- **Coverage Metric** — `notation: coverage-metric`. Report-config over the coverage read of canon (sibling of Compliance Impact). Root key `view:` declaring `subjects` (products / processes), `regimes` (`include` or `filter`), `grouping`, `coverage_rule`, and `empty_cells`. Carries no canonical content — counts the subjects with zero admitted obligations per regulatory regime and splits "Not yet modelled" (modelling gap) from "No obligation asserted (modelled fact)" (an admitted `n_a` `ASSERTION`).
- **Codex** *(zone primitives, not a view document)* — each artefact is a single `<ID>.yaml` file under `codex/external/<jurisdiction>/` (external: `LAW` / `REGULATION`) or `codex/internal/` (internal: `POLICY` / `INTERNAL_STANDARD`). No `notation:` header; carries the admission record (`CONTRACT.md` §6, `zone: codex`, `gate_checks.source_authority`) plus codex frontmatter (external: `jurisdiction` + `effective_date`; internal: `issuing_authority` + `effective_date`). A codex artefact stores the **source document only** — bindings to entities and processes live on `REQUIREMENT.derived_from` (`notations/elements/15-requirement.md`) and on `ASSERTION` (`notations/elements/16-assertion.md`), not on the codex artefact itself.

### ID grammar — canon

Every typed ID follows `<TYPE>-[<middle>-]<INTEGER>` per `notations/IDS_AND_REFERENCES.md`:

- Uppercase TYPE prefix (letters, digits, underscore; starts with a letter). Multi-word TYPEs are uppercase with underscores: `PROCESS_BLUEPRINT`, `INFORMATION_ENTITY`.
- Optional middle segments for disambiguation: `GOAL-RETENTION-12`, `ACTIVITY-Q3-2026-7`.
- Terminal positive integer, **no leading zeros** (`-1` not `-001`).
- Exception: `CAPABILITY-V1.2`, `CAPABILITY-H1.2.3` — capabilities use V/H diagram addresses instead of plain integers.

When in doubt, fetch the registry: `WebFetch https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md`.

---

## Templates

The `${CLAUDE_SKILL_DIR}/templates/` directory contains starter files in three groups: **root scaffolding** (manifest + agent guide + Copilot pointer), **view notations** (one per `.transitrix.yaml` notation, placed in `canon/views/<notation>/`), and **codex zone primitives** (placed in `codex/external/<jurisdiction>/` or `codex/internal/`).

Each notation template carries the canonical `notation:` and `spec_version:` headers (per `notations/CONTRACT.md`), uses the canonical root key (or flat top-level arrays for the strategy-chain four), has placeholders labelled `FILL-ME`, and parses cleanly under the canonical validator.

### Root scaffolding (drop into repo root in Step 2)

| File | Template | Destination |
|---|---|---|
| Adopter manifest | `templates/transitrix.yaml` | `<repo-root>/transitrix.yaml` |
| Agent guide (assistant-neutral) | `templates/AGENTS.md` | `<repo-root>/AGENTS.md` |
| GitHub Copilot pointer | `templates/copilot-instructions.md` | `<repo-root>/.github/copilot-instructions.md` |

The whole-repo validator (`.validators/lint.py` + `requirements.txt`) and the CI workflow (`.github/workflows/architecture-validate.yaml`) are **not** bundled templates — they are fetched from the methodology canon at scaffold time. See "Scaffold validation tooling + CI" in Step 2.

### View notations (drop into `canon/views/<notation-folder>/` in Step 3)

| Notation | Template file |
|---|---|
| BPMN | `templates/bpmn.bpmn.transitrix.yaml` |
| DGCA | `templates/dgca.dgca.transitrix.yaml` |
| Goals tree | `templates/goals.goals.transitrix.yaml` |
| Capability map | `templates/capability-map.capability-map.transitrix.yaml` |
| Process landscape map | `templates/process-map.process-map.transitrix.yaml` |
| Action schedule | `templates/action.action.transitrix.yaml` |
| Nested blocks | `templates/blocks.blocks.transitrix.yaml` |
| Scenarios | `templates/scenarios.scenarios.transitrix.yaml` |
| Applications | `templates/applications.applications.transitrix.yaml` |
| Products | `templates/products.products.transitrix.yaml` |
| Process Blueprint | `templates/process-blueprint.process-blueprint.transitrix.yaml` |
| Action Card | `templates/action-card.action-card.transitrix.yaml` |
| Compliance Impact | `templates/compliance-impact.compliance-impact.transitrix.yaml` |
| Coverage Metric | `templates/coverage-metric.coverage-metric.transitrix.yaml` |
| Actions tree | `templates/actions-tree.actions-tree.transitrix.yaml` |

### Codex zone primitives (drop into `codex/external/<jurisdiction>/` or `codex/internal/` in Step 3)

| Sub-zone | Template file | Destination |
|---|---|---|
| External (laws, regulations) | `templates/codex-external.yaml` | `codex/external/<jurisdiction>/<ID>.yaml` |
| Internal (policies, standards) | `templates/codex-internal.yaml` | `codex/internal/<ID>.yaml` |

Codex artefacts carry no `notation:` header (they are zone primitives, not view documents). Schema: `notations/elements/14-codex.md`.

---

## Reference reads on demand

When the user goes deeper than this cheat sheet covers, fetch the canonical spec:

- ID grammar / TYPE registry: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md`
- Shared file-header contract + zone model + admission record: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md`
- Adopter manifest schema (`transitrix.yaml`): `https://raw.githubusercontent.com/transitrix/methodology/main/notations/MANIFEST.md`
- Notation index + family selection: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/README.md`
- Per-notation full specs: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<short-name>.md` (including `14-codex.md` for the codex zone)
- Worked adopter example (the shape this skill scaffolds): `https://raw.githubusercontent.com/transitrix/methodology/main/organizations/acme_corp/AGENTS.md`

Read sparingly — the cheat sheet above is enough for 80% of cases. Pull the full spec only when the user hits a validation rule they want to understand, or asks for a field's semantics that the summary doesn't cover.

---

## What this skill does NOT do

- It does **not** ship the methodology canon. The canon lives in `github.com/transitrix/methodology`. This skill is a reading guide and a scaffolder, not a fork of the methodology. The validator and CI workflow it puts in a new repo are **fetched** from the canon at scaffold time, not bundled.
- It does **not** modify methodology files. Strictly read-only against `transitrix/methodology` — it only writes into the adopter's new repo.
- It does **not** install Transitrix Studio. The user installs it themselves from the VS Code Marketplace.
- It does **not** run the Studio CLI for the user uninvited. Suggest the commands; let the user run them.
