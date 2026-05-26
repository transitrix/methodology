---
name: Transitrix Onboarding
description: Scaffold a new Transitrix architecture-as-text repository and drive a first modelling session — enterprise architecture (BPMN, FGCA / FGA / Goals, capability map, process blueprint, activities network, blocks, scenarios, issues, products, applications). Use when the user wants to start a new Transitrix repo from scratch, or has just cloned one and wants to author their first notation file with validation.
when_to_use: User says "set up Transitrix", "model my architecture as text", "create a new transitrix repo", "I want to write [FGCA / Goals / capability map / process blueprint / ...] but don't know the schema", or asks to scaffold an organisation-as-text repository following the Transitrix methodology.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix Onboarding Skill

Drive a newcomer from zero to a working Transitrix enterprise-as-text repo in one session. The methodology is canon at `github.com/transitrix/methodology`; this skill is the agent-facing protocol for picking it up.

The user has typed `/transitrix-onboard` (or you've decided to invoke this skill from a freeform request). Follow the six-step flow below. Don't deviate without telling the user.

---

## Step 1 — Confirm intent and surface area

Ask the user two short questions:

1. **What do you want to model first?** Show the family-selection cheat sheet (§ Cheat sheet below) and offer the most common starting points:
   - Strategy chain → **FGCA** (Factor → Goal → Change → Activity) or **FGA** (no Changes).
   - Hierarchy of goals → **Goals tree**.
   - Capability map with CMMI maturity → **Capability Map**.
   - Value chain with operational aspects → **Process Blueprint**.
   - Single process flow → **BPMN**.
   - Project schedule → **Activities network**.
2. **How well do you know the methodology?** Calibrate explanation depth. If the user says "first time" — give a 90-second methodology walkthrough before scaffolding. If they say "I know it" — skip straight to step 2.

Do not assume. If the user picks a notation outside the family-selection table, that's fine — every notation in § Cheat sheet is a valid first artefact.

---

## Step 2 — Scaffold the repo

Create the canonical Transitrix directory tree in the user's chosen target directory:

```
<repo-root>/
├── organizations/
│   └── <org_name>/
│       ├── README.md
│       ├── elements/
│       │   ├── 01_motivation/
│       │   │   └── constraints/       # CONSTRAINT-... yaml files (one per file)
│       │   ├── 02_business/
│       │   │   └── rules/             # RULE-... yaml files (one per file)
│       │   ├── 03_application/
│       │   └── 04_technology/
│       └── views/
│           ├── bpmn/
│           ├── fgca/                  # Factor → Goal → Change → Activity
│           ├── fga/                   # Factor → Goal → Activity (no Changes)
│           ├── goals/
│           ├── capabilities/          # capability-map files
│           ├── processmap/            # process-map files
│           ├── activities/
│           ├── blocks/
│           ├── scenarios/
│           ├── issues/
│           ├── process-blueprint/
│           ├── products/
│           └── applications/
└── .gitignore
```

Use the org name from step 1 (or ask: "What's the organisation name? — lowercase, hyphens for spaces"). If the directory already exists and isn't empty, **don't overwrite** — confirm with the user before proceeding.

The `views/*` subfolders correspond one-to-one with Transitrix notations. The `views/` folder name is intentionally shorter than the canonical short name in places (`capabilities/`, `processmap/`) — this is the org-side convention and matches the spec's path examples.

Initialise `.gitignore`:

```
node_modules/
.vscode/settings.json
.transitrix-cache/
```

Initialise `organizations/<org>/README.md` with a one-paragraph stub naming the org and pointing at `github.com/transitrix/methodology` for the methodology canon.

Don't run `git init` unless the user asked for it.

---

## Step 3 — Create the starter notation file from a template

Take the user's chosen notation from step 1. Copy the matching template from `${CLAUDE_SKILL_DIR}/templates/` into the right `views/<notation>/` subfolder of the new repo. The 13 templates are listed in § Templates below.

Naming convention for view files: `<DOMAIN>.<short-name>.transitrix.yaml`. Ask the user for a short domain code (e.g. `strategy-2026`, `ORDER_FULFILMENT`, `CUSTOMER_ONBOARDING`). If they give a long name, suggest a kebab-case form.

After the copy:
- Open the file and read it to the user (or summarise its structure).
- Point at the placeholder values they need to fill in — they all carry `FILL-ME` markers.
- The template carries the canonical `notation:` and `spec_version:` headers, the canonical root key, and one minimal placeholder element per layer. **Do not strip the headers** — the canonical header is required by `notations/CONTRACT.md`.

---

## Step 4 — Interactive authoring with inline validation

Walk the user through filling the placeholders one at a time. After every meaningful edit, validate the file against the canonical schema:

- **For FGCA / FGA / Goals files**: validate against the canonical-form parsers in `@transitrix/diagrams` (`parseCanonicalFGCA`, `parseCanonicalGoals`; FGA uses an FGCA wrapper inside the Studio extension). If Transitrix Studio is installed, opening the file shows live validation errors.
- **For every other notation**: validate against the rules in the relevant `notations/<NN>-<name>.md` spec. Each spec has a "Validation rules" table with the error codes the canonical validator uses. Surface those code names to the user in plain English when an edit produces an error.

If the user makes a change that introduces a canon violation:
- Explain the violation in one sentence ("you've referenced `GOAL-99` from a change, but no goal with that ID exists in the document — that's `FGCA-009`").
- Offer one or two ways to fix it.
- Don't auto-fix unless the user asks — surface the violation and let the user decide.

When fetching the full spec for a notation, use `WebFetch` against `https://raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<name>.md` (e.g. `02-fgca.md`, `04-goals.md`). Don't embed the full spec text in your context unless the user is going deep into a specific notation — the cheat sheet below is usually enough.

---

## Step 5 — Hand off to Studio

Once the user has a working starter file, point them at **Transitrix Studio** (the VS Code extension) for live preview:

> "Install Transitrix Studio from the VS Code Marketplace (search for `transitrix.transitrix-studio`). Open the file you just authored — the preview opens automatically beside the editor and refreshes on every save."

The full notation set previews in Studio: BPMN, Goals, FGCA, FGA, Activity Network (PSND + Gantt), Process Map, Process Blueprint, Capability Map, Scenarios, Applications catalogue, Products catalogue, Nested blocks, Issues register.

If the user is on a system without VS Code, they can use the CLI for compile / validate:

```
npx @transitrix/cli compile path/to/your.fgca.transitrix.yaml output.bpmn   # only meaningful for BPMN sources
npx @transitrix/cli validate path/to/your.fgca.transitrix.yaml
```

---

## Step 6 — Suggest next steps

Based on what the user just built, propose the next artefact in the family. Concrete patterns:

- They built a **Goals tree** → suggest an **FGCA** or **FGA** to link goals to driving factors and delivery activities.
- They built **FGCA** → suggest a **Capability map** for the same domain so they can see which capabilities each goal requires.
- They built a **Capability map** → suggest an **Applications catalogue** so each capability has a system inventory.
- They built **BPMN** for one process → suggest the **Process landscape map** to put it in context.
- They built **Process Blueprint** → suggest **Activities network** to plan delivery against the blueprint stages.
- They built **Activities network** → suggest **Goals tree** to back-link activities to strategic outcomes.

Don't push more than one suggestion per session. The point is to leave the user with one obvious next move, not a roadmap.

---

## Cheat sheet — Transitrix notation family

### Family selection

Use the matrix below to pick a notation. Full specs at `notations/<NN>-<name>.md` in `github.com/transitrix/methodology`.

| Situation | Notation | File extension |
|---|---|---|
| Trace strategic drivers → goals → transformation steps → deliverables | **FGCA** | `*.fgca.transitrix.yaml` |
| Same chain, but the Change layer adds no clarity (activities directly serve goals) | **FGA** | `*.fga.transitrix.yaml` |
| Decompose goals hierarchically (strategy → tactical → operational) | **Goals tree** | `*.goals.transitrix.yaml` |
| Plan delivery — activities, dependencies, durations, Gantt | **Activities** | `*.activities.transitrix.yaml` |
| Map capabilities with CMMI maturity, V/H orientation | **Capability map** | `*.capability-map.transitrix.yaml` |
| Top-level catalogue of processes (operating / supporting / management) | **Process landscape map** | `*.process-map.transitrix.yaml` |
| Detail one process — lanes, gateways, sequence flows | **BPMN** | `*.bpmn.transitrix.yaml` |
| Wide blueprint of a value chain — stages with systems, actors, equipment, information entities | **Process Blueprint** | `*.process-blueprint.transitrix.yaml` |
| Multi-level container layout — what's inside what | **Nested blocks** | `*.blocks.transitrix.yaml` |
| Alternative strategic development paths | **Scenarios** | `*.scenarios.transitrix.yaml` |
| Catalogue of applications + integrations | **Applications** | `*.applications.transitrix.yaml` |
| Catalogue of products + services | **Products** | `*.products.transitrix.yaml` |
| Register of issues — problems, defects, open questions | **Issues** | `*.issues.transitrix.yaml` |

**Family rule:** all four strategy-chain notations (FGCA, FGA, Goals, Activities) use the **flat form** — top-level arrays at the document root, hierarchy via `parent` / cross-references inside the flat array. No nested wrapper keys.

### One-paragraph summary per notation

- **BPMN** — `notation: bpmn`. One root `process:` with `pools[].lanes[].elements[]` and `flows[]`. Elements typed (`startEvent`, `task`, `exclusiveGateway`, …); flows directed. Compiles to BPMN 2.0 XML.
- **FGCA** — `notation: fgca`. Flat root arrays: `factors[]`, `goals[]`, `changes[]`, `activities[]`. Typed string IDs (`FACTOR-1`, `GOAL-RET-1`, `CHANGE-1`, `ACTIVITY-ONBOARD-1`). Cross-refs in the upstream direction: `goal.factors: [FACTOR-…]`, `change.goals: [GOAL-…]`, `activity.changes: [CHANGE-…]`. Optional `factor.references_constraint: [CONSTRAINT-…]`.
- **FGA** — `notation: fga`. Same shape as FGCA minus `changes[]`. Activities link directly to goals via `activity.goals: [GOAL-…]`.
- **Goals tree** — `notation: goals`. Flat root arrays: `goal_types[]` (with `{name, level}` entries) + `goals[]`. Each goal has `id`, `name`, `type` (matching a `goal_types[].name`), `level` (matching that type's level), optional `parent: GOAL-…`. Omit `parent` for a root.
- **Capability map** — `notation: capability-map`. Root key `capability_map:`. Capabilities use a V/H sub-grammar (`CAPABILITY-V1.2`, `CAPABILITY-H1`); each capability carries `type: domain | supporting`, `current_maturity`, optional `target_maturity`, `target_date`, etc.
- **Process landscape map** — `notation: process-map`. Top-level catalogue of `PROCESS-…` IDs grouped into `operating`, `supporting`, `management`.
- **Activities** — `notation: activities`. Flat `activities[]`. Each activity has string `id`, `name`, optional `predecessors: [ACTIVITY-…]`, `goals: [GOAL-…]`, `delivers_changes: [CHANGE-…]`, `duration_days`, `start_date`, etc. Renders as a PSND network with critical path; optionally projects to Gantt.
- **Nested blocks** — `notation: blocks`. Root key `nested_blocks:`. Recursive `block` tree (`id`, `name`, optional `description`, optional `children[]`). Containment is YAML-nested.
- **Scenarios** — `notation: scenarios`. Alternative strategic development paths, each scoping its own goals / capabilities / activities / products / processes / applications.
- **Applications catalogue** — `notation: applications`. Inventory of `APPLICATION-…` elements + `INTEGRATION-…` entries with criticality, owner, type.
- **Products catalogue** — `notation: products`. Inventory of `PRODUCT-…` elements grouped by category.
- **Issues register** — `notation: issues`. Root key `issues_catalogue:` with `issues[]`. Each issue: `issue_id`, `name`, `status` (`open` / `in_progress` / `blocked` / `resolved` / `closed`), optional `parent`, `description`, `relates_to`, `owner_role`. Hierarchy via `parent`.
- **Process Blueprint** — `notation: process-blueprint`. Root key `process_blueprint:` with `stages[]` (each carrying `goal` and `result`) and per-aspect arrays `systems[]`, `actors[]`, `equipment[]`, `information_entities[]`. Aspect entries reference the stages they appear in via `stages: [STAGE-…]`.

### ID grammar — canon

Every typed ID follows `<TYPE>-[<middle>-]<INTEGER>` per `notations/IDS_AND_REFERENCES.md`:

- Uppercase TYPE prefix (letters, digits, underscore; starts with a letter). Multi-word TYPEs are uppercase with underscores: `PROCESS_BLUEPRINT`, `INFORMATION_ENTITY`.
- Optional middle segments for disambiguation: `GOAL-RETENTION-12`, `ACTIVITY-Q3-2026-7`.
- Terminal positive integer, **no leading zeros** (`-1` not `-001`).
- Exception: `CAPABILITY-V1.2`, `CAPABILITY-H1.2.3` — capabilities use V/H diagram addresses instead of plain integers.

When in doubt, fetch the registry: `WebFetch https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md`.

---

## Templates

The `${CLAUDE_SKILL_DIR}/templates/` directory contains one starter file per notation. Each template:

- Carries the canonical `notation:` and `spec_version:` headers (per `notations/CONTRACT.md`).
- Uses the canonical root key (or flat top-level arrays for the strategy-chain four).
- Has placeholder values labelled `FILL-ME` so the user can find them.
- Includes minimal cross-references so the placeholder file parses cleanly under the canonical validator.

| Notation | Template file |
|---|---|
| BPMN | `templates/bpmn.bpmn.transitrix.yaml` |
| FGCA | `templates/fgca.fgca.transitrix.yaml` |
| FGA | `templates/fga.fga.transitrix.yaml` |
| Goals tree | `templates/goals.goals.transitrix.yaml` |
| Capability map | `templates/capability-map.capability-map.transitrix.yaml` |
| Process landscape map | `templates/process-map.process-map.transitrix.yaml` |
| Activities | `templates/activities.activities.transitrix.yaml` |
| Nested blocks | `templates/blocks.blocks.transitrix.yaml` |
| Scenarios | `templates/scenarios.scenarios.transitrix.yaml` |
| Applications | `templates/applications.applications.transitrix.yaml` |
| Products | `templates/products.products.transitrix.yaml` |
| Issues | `templates/issues.issues.transitrix.yaml` |
| Process Blueprint | `templates/process-blueprint.process-blueprint.transitrix.yaml` |

---

## Reference reads on demand

When the user goes deeper than this cheat sheet covers, fetch the canonical spec:

- ID grammar / TYPE registry: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md`
- Shared file-header contract: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md`
- Notation index + family selection: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/README.md`
- Per-notation full specs: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<short-name>.md`

Read sparingly — the cheat sheet above is enough for 80% of cases. Pull the full spec only when the user hits a validation rule they want to understand, or asks for a field's semantics that the summary doesn't cover.

---

## What this skill does NOT do

- It does **not** ship the methodology canon. The canon lives in `github.com/transitrix/methodology`. This skill is a reading guide and a scaffolder, not a fork of the methodology.
- It does **not** modify methodology files. Strictly read-only against `transitrix/methodology`.
- It does **not** install Transitrix Studio. The user installs it themselves from the VS Code Marketplace.
- It does **not** run the Studio CLI for the user uninvited. Suggest the commands; let the user run them.
