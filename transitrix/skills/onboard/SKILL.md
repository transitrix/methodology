---
name: Transitrix Onboarding
description: Scaffold a new Transitrix architecture-as-text repository (zoned canon/ + field/ + codex/ layout with assistant-neutral AGENTS.md + transitrix.yaml manifest) and drive a first modelling session — enterprise architecture (BPMN, DGCA / Goals, capability map, process blueprint, action schedule, actions tree, nested blocks, scenarios, products, applications) plus codex artefacts (laws, regulations, policies, internal standards). Use when the user wants to start a new Transitrix repo from scratch, or has just cloned one and wants to author their first notation file with validation.
when_to_use: User says "set up Transitrix", "model my architecture as text", "create a new transitrix repo", "I want to write [DGCA / Goals / capability map / process blueprint / ...] but don't know the schema", or asks to scaffold an organisation-as-text repository following the Transitrix methodology. Also triggers when the user says "I cloned my team's Transitrix repo", "help me get oriented in this model", "make my first change to our architecture repo", or expresses a similar intent to orient in or contribute to a repo that already uses Transitrix.
min_version: "1.0.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix Onboarding Skill

Drive a newcomer from zero to a working Transitrix enterprise-as-text repo in one session. The methodology is canon at `github.com/transitrix/methodology`; this skill is the agent-facing protocol for picking it up — written for any coding agent that can read files, write files, run shell commands, and fetch URLs, not only Claude Code. The tool names below (`Read`, `Glob`, `WebFetch`, …) name the capability, not a literal tool you must have under that exact name — use whatever your own toolset calls it.

You may be reading this because the user typed `/transitrix:onboard`, because you decided to invoke this skill from a freeform request, or because you were pointed here directly — e.g. a fetch-and-follow prompt handed you this URL. However you got here, follow the six-step flow below. Don't deviate without telling the user.

---

## Step 1 — Detect repo state and branch

**Before asking anything,** check for signs of an existing Transitrix repo in the current working directory:

- search for `transitrix.yaml` at the working directory root (the adopter manifest), or
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

- Read `transitrix.yaml` — note `methodology_version`, `notations:`, `zones:`.
- List `canon/views/` — note which notation sub-folders exist and which are non-empty.
- List `canon/elements/` — note which ArchiMate layers have content.
- Check whether `field/` and `codex/` directories exist and have files.
- If `AGENTS.md` exists at the repo root, read it — it carries adopter-specific rules that govern the rest of this session.

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

- **Add a new notation file** → jump to **Step 3** (template copy → authoring → validate → PR). Before copying a template, search the existing tree to pick the right domain prefix and avoid ID clashes.
- **Modify an existing file** → read it first, summarise its current structure, then enter **Step 4** (interactive authoring with inline validation).
- **"Where is X?" / any question about the organization itself** → follow `AGENTS.md` §13 (canon-first sourcing): check `canon/` first, then `codex/`, cite the artefact ID/path; only fall back to `field/` with an explicit "unvalidated" caveat, and don't grep ad hoc top-level folders (scratch notes, `_intake/`) as if they were authoritative. If canon/codex genuinely don't cover it, say so rather than guessing from whatever's nearby.

After the first change is authored and validated, continue to **Step 6** (suggest next steps).

---

## Step 2 — Scaffold the repo

Scaffold the canonical **zoned** Transitrix adopter shape in the user's chosen target directory. The shape mirrors the worked example in the [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) reference repo and is defined for adopters in [`AGENTS.md`](https://github.com/transitrix/acme-corp/blob/main/AGENTS.md) §3.

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

After the directory tree exists, copy the canonical root files from the skill bundle's `templates/` directory into the repo root:

- `templates/AGENTS.md` → `<repo-root>/AGENTS.md` — the assistant-neutral agent guide. It carries `ADOPTER-FILL-ME` placeholders the user should fill in later (language, confidentiality policy, task source — see its §7–9).
- `templates/copilot-instructions.md` → `<repo-root>/.github/copilot-instructions.md` — the GitHub Copilot pointer that redirects to `AGENTS.md`.
- `templates/transitrix.yaml` → `<repo-root>/transitrix.yaml` — the adopter manifest (schema: `notations/MANIFEST.md`). After copying, edit `notations:` to list only the notations the user picked in step 1 (plus `codex` if they will use the codex zone), and `zones:` to the subset of `canon, field, codex` they will maintain.
- `templates/ANALYST.md` → `<repo-root>/ANALYST.md` — the **Analyst** role guide. The Analyst is a specialised read-only agent that answers questions about the organisation from the validated `canon/` model. It is always scaffolded alongside `AGENTS.md`; the user activates it by pointing their assistant at `ANALYST.md` instead of `AGENTS.md` when asking a business question.
- `templates/analyst-mcp.json` → `<repo-root>/.mcp.json` — the MCP server configuration that backs the Analyst's cited retrieval. Points the `canon` MCP server at `canon/`. If the adopter repo already has a `.mcp.json`, merge the `"canon"` entry into the existing `mcpServers` object rather than overwriting the file.
- `templates/VALIDATOR.md` → `<repo-root>/VALIDATOR.md` — the **Validator** role guide. The Validator is a specialised review agent that checks a change (a PR, a local diff) for structural validity, whole-repo referential integrity, and blast radius before it merges. It is always scaffolded alongside `AGENTS.md`; the user activates it by pointing their assistant at `VALIDATOR.md` instead of `AGENTS.md` when reviewing a change. No extra MCP setup — it uses the same repo-wide file tools as the Modeler.
- `templates/INGEST.md` → `<repo-root>/INGEST.md` — the **Ingest** role guide. Ingest is the front-door agent that turns raw material (interviews, policies, spreadsheets, notes) into `field` artefacts and canon candidates via the `/transitrix:ingest` skill, never writing admitted canon directly. It is always scaffolded alongside `AGENTS.md`; the user activates it by pointing their assistant at `INGEST.md` instead of `AGENTS.md` when loading raw material into the repo.
- `templates/FINDINGS.md` → `<repo-root>/FINDINGS.md` — the shared **raising a finding** protocol (propose → route → scrub) referenced by all four role guides above. Cross-cutting, not a role — always scaffolded alongside `AGENTS.md`; never activated on its own.
- **Claude Code pointer — default, not optional.** Write `<repo-root>/CLAUDE.md` with a single line: *"Read `AGENTS.md` in the repo root and follow it."* Do this **unconditionally** when the current assistant is Claude Code — don't ask first, don't gate it behind a user request. `CLAUDE.md` at an adopter repo root is free (no collision) — unlike the methodology canon repo's own root, where the name is reserved for a private file.

Additionally, write these generated files inline (no template):

- `<repo-root>/README.md` — a minimal org stub. Three sections: (1) one-paragraph intro naming the repo purpose and linking to `github.com/transitrix/methodology`; (2) "Getting started" pointing newcomers at `AGENTS.md` and the `/transitrix:onboard` skill; (3) "Tooling" recommending the two VS Code extensions — **Transitrix Studio** (`transitrix.transitrix-studio`, VS Code Marketplace) for live Transitrix notation preview (including `.puml` files — no separate PlantUML extension needed), and **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`, VS Code Marketplace and Open VSX) for Mermaid diagram preview in Markdown files. Leave `ADOPTER-FILL-ME` placeholders for org name, purpose, and team.
- `<repo-root>/operations/feedback.md` — the empty upstream feedback register (`method/02-team-operations.md` §3.3), the landing place `FINDINGS.md`'s `escalate-methodology` route points at. A `# Feedback register` heading, a one-line pointer at `method/02-team-operations.md` §3.3 and the opt-in `hello@transitrix.com` submission route, and an empty `## Register` section — no entries; the first `FB-0001` is added the first time a finding is actually raised, not at scaffold time. Write this **unconditionally**, alongside the other root files, so the register exists before anyone needs it — same treatment as `FINDINGS.md` itself, not a lazily-created folder like `operations/decisions/` (which the `adr` skill scaffolds on first use instead).

**Do not duplicate the agent guide itself outside `AGENTS.md`.** The canonical guide for every assistant is `AGENTS.md`; every per-tool file is a pointer, never a second copy of the guidance. Claude Code gets its `CLAUDE.md` pointer by default (bullet above, unconditional). For any other tool that doesn't read `AGENTS.md` natively (e.g. Cursor → `.cursor/rules/`), drop the equivalent one-line pointer file in that tool's location: *"Read `AGENTS.md` in the repo root and follow it."* See `AGENTS.md` §"Using this guide with your assistant".

### Suggest editor tooling — right after scaffolding, don't wait for Step 5

As soon as the root files exist, also copy `templates/extensions.json` to `<repo-root>/.vscode/extensions.json` — this files the workspace extension recommendations so VS Code prompts the user to install the right tools immediately. Then check what's already installed: `code --list-extensions` (swap `code` for `cursor` / `codium` if that's the detected editor; on Windows PowerShell with a restricted execution policy use `code.cmd` / `cursor.cmd`). If **Transitrix Studio** (`transitrix.transitrix-studio`) or **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`) is missing, surface the install command(s) prominently now, before Step 3:

```
code --install-extension transitrix.transitrix-studio
code --install-extension bierner.markdown-mermaid
```

The agent does **not** run these itself — it shows the command and lets the user run it (see `AGENTS.md` §12, scaffolded into the new repo, for the standing rule this session-start check follows going forward). Step 5 below is a reminder to actually open the file in Studio once one exists, not the first time this comes up.

### Three zones — what gets scaffolded

The adopter manifest's `zones:` field selects which of `canon` / `field` / `codex` the repo maintains. Scaffold all three folders by default unless the user explicitly opts out — empty zones cost nothing and keep the layout consistent.

- **`canon/`** — validated truth the organisation asserts. Authoritative; internally consistent. View notation files live in `canon/views/<notation>/`; reusable elements live in `canon/elements/<NN>_<layer>/`.
- **`field/`** — raw, unprocessed material (interviews, surveys, observations, drafts). Contradictions allowed; provenance is the point. **Not** authoritative. A Canon record may *cite* a Field artefact via `derived_from:` — a citation, not a migration.
- **`codex/`** — external constraints (laws, regulations) under `codex/external/<jurisdiction>/`, plus internal authority documents (policies, standards) under `codex/internal/`. Faithful to source; not edited to fit the model. See `notations/elements/14-codex.md` and Step 3 below for how to seed a first codex artefact.

Each artefact in any zone carries an **admission record** (`zone`, `admitted_at`, `admitted_by`, `gate_checks`, optional `derived_from`) defined in `notations/CONTRACT.md` §6. These are envelope fields a tool produces, not content the author supplies — see "Admission record and lifecycle" below for how you fill them.

### Admission record and lifecycle — you compute these, the user doesn't hand-type them

Every element, relation, and codex artefact you author also carries a primitive lifecycle (`valid_from` / `valid_to`, `notations/CONTRACT.md` §7) alongside its admission record. Both are envelope fields that carry no meaning of their own — the author supplies only the artefact's own content (`id`, `name`, `description`, the per-TYPE fields); you compute the rest, the same way the CLI's `transitrix new` command does:

- **`zone`** — the destination folder (`canon`, `field`, or `codex`).
- **`admitted_by`** — the person's handle. Ask once, at the start of the session (or infer it from `git config user.name` and confirm with the user), then reuse it for every file you author in the session. Never leave a placeholder for the user to type their own handle into.
- **`admitted_at`** — today's date, quoted ISO 8601.
- **`gate_checks`** — run the standard checks for the destination zone (`CONTRACT.md` §6 "Standard `gate_checks` per zone") and record what actually happened, never a constant `pass`:
  - `uniqueness` — search the existing canon for the ID you're about to use; if it collides, choose a different one instead of writing the collision.
  - `consistency` — confirm every cross-reference field you filled in (e.g. `factors:`, `capability:`, `owner_role:`) resolves to an ID that already exists in canon.
  - `completeness` — confirm every field required for the TYPE (`ELEMENT_PRIMITIVES.md` §7) is filled before you write the file.
  - A failing check is a violation, not a `gate_checks` entry — surface it and offer a fix (see Step 4's violation-handling convention) rather than write the file with a check recorded as `pass` that didn't run.
- **`valid_from` / `valid_to`** (elements and relations, not codex) — default `valid_from` to today and `valid_to` to `null`; only ask the user if the real-world thing this element represents took effect on a different date, or has already ended.
- **`gate_checks.source_authority`** (codex only) is the one admission field that is **not** mechanical — it names the actual issuing legislative body or internal authority, so it's genuine content only the user can supply (see the codex section below).

State back to the user exactly which values you filled — the same transparency `notations/CONTRACT.md` §14.3 already establishes for view_config defaults ("full goals set, depth unlimited, no filters"): e.g. "admitted by v.korobeinikov today; uniqueness, consistency and completeness all pass."

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

1. **Whole-repo validator** — fetch `https://raw.githubusercontent.com/transitrix/methodology/v<methodology_version>/tools/lint.py` and write it to `<repo-root>/.validators/lint.py`. This is the model-integrity linter: it scans `canon/elements/**` and `canon/relations/**` for atomicity, referential integrity, ArchiMate semantics, and policy. The canonical source is `tools/lint.py` at the methodology root — fetch the canon, **not** the acme-corp reference repo's copy.
2. **Validator dependencies** — write `<repo-root>/.validators/requirements.txt` containing one line: `pyyaml`. (`python3 -m pip install -r .validators/requirements.txt` to run the linter locally.)
3. **CI gate** — fetch `https://raw.githubusercontent.com/transitrix/methodology/v<methodology_version>/integration/ci-example.yaml` and write it to `<repo-root>/.github/workflows/architecture-validate.yaml`. It runs validation by `scope` — a repo-scope `model` job (structure + manifest, then `lint.py`: atomicity, referential integrity, ArchiMate semantics, policy) and a file-scope `views` job (`npx @transitrix/cli validate` per view) — and blocks merges on failure.

What the agent does **not** install: **Transitrix Studio** (the VS Code extension — the user installs it from the Marketplace, see Step 5) and the global Node / Python runtimes. The CI workflow provisions Node and Python itself; for local runs the user needs both on PATH.

This step is interim per the validation-two-axis-model architecture decision: validation is converging onto a single TypeScript runtime (`@transitrix/cli --scope=repo`), after which this step will scaffold one validator instead of two. Until then, `lint.py` is the whole-repo gate and `@transitrix/cli` validates individual view files.

---

## Step 3 — Create the starter notation file from a template

Take the user's chosen notation from step 1. Copy the matching template from `${CLAUDE_SKILL_DIR}/templates/` into the right zone of the new repo. The templates are listed in § Templates below.

### View notations (canon zone)

For any of the 15 view notations (DGCA / Goals / Capability map / Process map / BPMN / Action schedule / Actions tree / Nested blocks / Scenarios / Applications / Products / Process Blueprint / Action Card / Compliance Impact / Coverage Metric), the destination is `canon/views/<notation-folder>/`. Naming convention: `<DOMAIN>.<short-name>.transitrix.yaml`. Ask the user for a short domain code (e.g. `strategy-2026`, `ORDER_FULFILMENT`, `CUSTOMER_ONBOARDING`). If they give a long name, suggest a kebab-case form.

After the copy:
- Open the file and read it to the user (or summarise its structure).
- Point at the placeholder values they need to fill in — they all carry `FILL-ME` markers.
- The template carries the canonical `notation:` and `spec_version:` headers plus the canonical root shape for the notation (a `view_config` block for pure-projection view notations — Goals tree, Action schedule, Actions tree, Action Card, Compliance Impact, Coverage Metric — and a canonical root key + one minimal placeholder entry per layer for the inline-shape notations — DGCA, BPMN, Capability map, Process map, Nested blocks, Scenarios, Applications, Products, Process Blueprint). **Do not strip the headers** — the canonical header is required by `notations/CONTRACT.md`.
- For a pure-projection view (Goals tree, Action schedule, Actions tree, Action Card), the view document by itself will not render anything until at least one companion element file exists. Author the standalone element file inline (no separate template): create `canon/elements/01_motivation/goals/<GOAL-…>.yaml` for a Goals tree, `canon/elements/05_implementation/actions/<ACTION-…>.yaml` for an Action schedule or Actions tree. Ask the user only for the element's own content — the per-TYPE fields in the matching `notations/elements/…md` spec (`ELEMENT_PRIMITIVES.md` §7.2 for GOAL, `notations/elements/24-action.md` for ACTION) — then compute the admission record and lifecycle yourself per "Admission record and lifecycle" above; don't hand the user a blank `admitted_by` or `valid_from` to fill in. The worked example under `transitrix/acme-corp` shows the shape of these companion files end-to-end (its `canon/views/goals/eu-strategy.goals.transitrix.yaml` + the sibling GOAL element files, and `canon/views/action/gdpr-remediation.action.transitrix.yaml` + its ACTION element files).

### Codex artefacts (codex zone)

Codex artefacts are **zone primitives**, not view documents — they are individual `<ID>.yaml` files, one artefact per file, named by their canonical ID. They carry **no** `notation:` header (different shape from view notations; schema in `notations/elements/14-codex.md`).

If the user wants to seed a first codex artefact:

- **External** (law / regulation given to the org by outside authority) — copy `templates/codex-external.yaml` to `codex/external/<jurisdiction>/<ID>.yaml`. Rename the file to the artefact's canonical ID (e.g. `LAW-PERSONAL-DATA-2017-1.yaml`, `REGULATION-GDPR-2016-1.yaml`). The `<jurisdiction>` folder MUST match the `jurisdiction:` field inside the file (rule `CODEX-001`) — use ISO 3166-1 alpha-2 (`ge`, `de`, …), `eu` for EU-wide, or `intl` (reserved).
- **Internal** (policy / standard the org issues to itself) — copy `templates/codex-internal.yaml` to `codex/internal/<ID>.yaml`. Internal artefacts are not foldered by jurisdiction. Rename the file to the artefact's canonical ID (e.g. `POLICY-DATA-RETENTION-1.yaml`, `INTERNAL_STANDARD-coding-conventions-1.yaml`).

Ask the user for the artefact's own content — `id:`, `name:`, `description:`, the codex-specific fields (`jurisdiction` + `effective_date` for external; `issuing_authority` + `effective_date` for internal), and `gate_checks.source_authority` (the issuing legislative body or internal authority — real content, not a default). Compute `admitted_at` / `admitted_by` yourself per "Admission record and lifecycle" above rather than asking the user to fill them in. A codex artefact stores the **source document only** — do not add bindings to canonical entities or processes on the artefact itself. Those bindings live downstream on `REQUIREMENT.derived_from` (which cites the codex source) and on `ASSERTION` (which links each requirement to its subject). See `notations/elements/14-codex.md` §8 Migration for the rationale; `notations/elements/15-requirement.md` and `notations/elements/16-assertion.md` for the downstream shapes.

---

## Step 4 — Interactive authoring with inline validation

Walk the user through filling the placeholders one at a time. After every meaningful edit, validate the file against the canonical schema:

- **For DGCA / Goals files**: validate against the canonical-form parsers in `@transitrix/diagrams` (`parseCanonicalDGCA`, `parseCanonicalGoals`). If Transitrix Studio is installed, opening the file shows live validation errors.
- **For every other notation**: validate against the rules in the relevant `notations/<NN>-<name>.md` spec. Each spec has a "Validation rules" table with the error codes the canonical validator uses. Surface those code names to the user in plain English when an edit produces an error.

If the user makes a change that introduces a canon violation:
- Explain the violation in one sentence ("you've referenced `GOAL-99` from a change, but no goal with that ID exists in the document — that's `DGCA-009`").
- Offer one or two ways to fix it.
- Don't auto-fix unless the user asks — surface the violation and let the user decide.

When fetching the full spec for a notation, fetch `https://raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<name>.md` (e.g. `02-dgca.md`, `04-goals.md`). Don't embed the full spec text in your context unless the user is going deep into a specific notation — the cheat sheet below is usually enough.

Once a few files exist, the whole-repo linter scaffolded in Step 2 catches cross-file problems the single-file check can't see (a relation whose endpoint doesn't exist, a missing owner): run `python3 .validators/lint.py` from the repo root, or let the CI workflow run it on the pull request.

---

## Step 5 — Hand off to Studio

The install suggestion already happened right after scaffolding (see "Suggest editor tooling" in Step 2). Now that the user has a working starter file, close the loop — point them at **Transitrix Studio** for live preview:

> "Open the file you just authored — the preview opens automatically beside the editor and refreshes on every save." (If they skipped the earlier install prompt, repeat the `code --install-extension transitrix.transitrix-studio` command once here.)

The full notation set previews in Studio: BPMN, Goals, DGCA, Action schedule (PSND + Gantt), Actions tree, Process Map, Process Blueprint, Capability Map, Scenarios, Applications catalogue, Products catalogue, Nested blocks, Action Card, Compliance Impact, Coverage Metric.

Between Studio (Transitrix notation preview) and the Mermaid extension (Markdown diagram preview), the user has full visual coverage of the repo.

If the user is on a system without VS Code, they can use the CLI for compile / validate:

```
npx @transitrix/cli compile path/to/your.dgca.transitrix.yaml output.bpmn   # only meaningful for BPMN sources
npx @transitrix/cli validate path/to/your.dgca.transitrix.yaml
```

All canonical `*.transitrix.yaml` notation extensions are recognised without `--ext`; pass `--ext <notation-name>` only for a non-canonical extension outside the built-in registry. **On Windows PowerShell** with a restricted execution policy (the default on many workstations), replace `npx` with `npx.cmd` — plain `npx` resolves to a `.ps1` wrapper that the policy refuses to launch:

```
npx.cmd @transitrix/cli validate path/to/your.dgca.transitrix.yaml
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
| Application-cooperation graph — what talks to what, derived from admitted `INTEGRATION` (never hand-drawn) | **Integration Map** | `*.integration-map.transitrix.yaml` |
| Catalogue of products + services | **Products** | `*.products.transitrix.yaml` |
| Single-project narrative view — goals served, dates, milestones, gate decisions | **Action Card** | `*.action-card.transitrix.yaml` |
| Compliance overlay — which obligations hit which product / process stage / task, with each cell's status | **Compliance Impact** | `*.compliance-impact.transitrix.yaml` |
| Coverage of canon — which subjects are dark for each regulatory regime, splitting modelling gaps from modelled exclusions | **Coverage Metric** | `*.coverage-metric.transitrix.yaml` |
| Stakeholder-facing document listing design-input requirements grouped under the need each satisfies | **MRD** | `*.mrd.transitrix.yaml` |
| Software requirements specification — software-tier requirements sectioned by functional / quality | **SRS** | `*.srs.transitrix.yaml` |
| Design-facing document listing which application/technology elements realise which requirements | **SDD** | `*.sdd.transitrix.yaml` |

**Family rule:** the strategy-chain notations split by shape. **DGCA** uses the **flat form** — top-level arrays at the document root (`factors[]` / `goals[]` / `changes[]` / `actions[]`), cross-references upstream inside the flat arrays. **Goals tree** and **Action schedule** (both since v2.0) are **pure projections** — the view document carries only `view_config`, and each `GOAL-…` / `ACTION-…` lives as a standalone element file under `canon/elements/…`; the parent link (Goals) and predecessor / duration / cross-refs (Action) live on the element files, not in the view. In all three, hierarchy uses `parent: <SAME-TYPE>-…` on the child; no nested wrapper keys.

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
- **Goals tree** — `notation: goals` (v2.0 pure projection). The view document carries a required `methodology_version: "3.0.0"`, a document `id: GOALS-…`, and a `view_config` (with `scope`, `goal_types[]` display vocabulary, and `display`). Element data is **not** inline — each `GOAL-…` is a standalone file at `canon/elements/01_motivation/goals/<GOAL-…>.yaml` (with its own `notation: goal` envelope, `type`, `level`, optional `parent: GOAL-…`, and admission / lifecycle fields per `ELEMENT_PRIMITIVES.md` §7.2). Root goals omit `parent`. Inline `goals[]` at document root is a `GOALS-008` error.
- **Capability map** — `notation: capability-map`. Root key `capability_map:`. Capabilities use a V/H sub-grammar (`CAPABILITY-V1.2`, `CAPABILITY-H1`); each capability carries `type: domain | supporting`, `current_maturity`, optional `target_maturity`, `target_date`, etc.
- **Process landscape map** — `notation: process-map`. Top-level catalogue of `PROCESS-…` IDs grouped into `operating`, `supporting`, `management`.
- **Action schedule** — `notation: action` (v2.0 pure projection). The view document carries a required `methodology_version: "3.0.0"`, a document `id: ACTION_SCHED-…`, and a `view_config` (with `scope`, `schedule.start_date` + optional working `calendar`, and `display.view: network | gantt | both`). Element data is **not** inline — each `ACTION-…` is a standalone file at `canon/elements/05_implementation/actions/<ACTION-…>.yaml` with its own `notation: action` envelope, `type` (`Initiative | Programme | Project | Task`), `duration` (renamed from the v1 `duration_days`), optional `predecessors: [ACTION-…]`, `goals: [GOAL-…]`, `delivers_changes: [CHANGE-…]`, `parent: ACTION-…`, and admission / lifecycle fields (see `elements/24-action.md`). Renders as a PSND network with critical path plus a Gantt projection. Inline `actions[]` / `activities[]` at document root is an `ACT-010` error.
- **Nested blocks** — `notation: blocks`. Root key `nested_blocks:`. Recursive `block` tree (`id`, `name`, optional `description`, optional `children[]`). Containment is YAML-nested.
- **Scenarios** — `notation: scenarios`. Alternative strategic development paths, each scoping its own goals / capabilities / activities / products / processes / applications.
- **Applications catalogue** — `notation: applications`. Inventory of `APPLICATION-…` elements + `INTEGRATION-…` entries with criticality, owner, type.
- **Integration Map** — `notation: integration-map`. Root key `view:` — a selection/rendering config projecting admitted `INTEGRATION` elements (application-to-application edges, `source`/`target`) as a labelled directed graph, optionally extended with `uses` edges to `TECHNOLOGY_SERVICE`. Carries no canonical content: `view.integrations.include`/`.exclude` accept only bare string references, never an inline `source:`/`target:` pair, so no edge can be authored that canon doesn't already carry.
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

The `${CLAUDE_SKILL_DIR}/templates/` directory contains starter files in three groups: **root scaffolding** (manifest + agent guides + Copilot pointer + MCP config), **view notations** (one per `.transitrix.yaml` notation, placed in `canon/views/<notation>/`), and **codex zone primitives** (placed in `codex/external/<jurisdiction>/` or `codex/internal/`).

Each notation template carries the canonical `notation:` and `spec_version:` headers (per `notations/CONTRACT.md`), uses the canonical root key (or flat top-level arrays for the strategy-chain four), has placeholders labelled `FILL-ME`, and parses cleanly under the canonical validator.

### Root scaffolding (drop into repo root in Step 2)

| File | Template | Destination |
|---|---|---|
| Adopter manifest | `templates/transitrix.yaml` | `<repo-root>/transitrix.yaml` |
| Agent guide — Modeler (assistant-neutral) | `templates/AGENTS.md` | `<repo-root>/AGENTS.md` |
| Agent guide — Analyst (read-only Q&A) | `templates/ANALYST.md` | `<repo-root>/ANALYST.md` |
| MCP config — Analyst canon server | `templates/analyst-mcp.json` | `<repo-root>/.mcp.json` *(merge if file exists)* |
| Agent guide — Validator (review before merge) | `templates/VALIDATOR.md` | `<repo-root>/VALIDATOR.md` |
| Agent guide — Ingest (raw material → candidates) | `templates/INGEST.md` | `<repo-root>/INGEST.md` |
| Shared protocol — raising a finding | `templates/FINDINGS.md` | `<repo-root>/FINDINGS.md` |
| GitHub Copilot pointer | `templates/copilot-instructions.md` | `<repo-root>/.github/copilot-instructions.md` |
| VS Code extension recommendations | `templates/extensions.json` | `<repo-root>/.vscode/extensions.json` |
| Upstream feedback register (empty) | *authored inline, no template* | `<repo-root>/operations/feedback.md` |

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
| Integration Map | `templates/integration-map.integration-map.transitrix.yaml` |
| Products | `templates/products.products.transitrix.yaml` |
| Process Blueprint | `templates/process-blueprint.process-blueprint.transitrix.yaml` |
| Action Card | `templates/action-card.action-card.transitrix.yaml` |
| Compliance Impact | `templates/compliance-impact.compliance-impact.transitrix.yaml` |
| Coverage Metric | `templates/coverage-metric.coverage-metric.transitrix.yaml` |
| Actions tree | `templates/actions-tree.actions-tree.transitrix.yaml` |
| MRD | `templates/mrd.mrd.transitrix.yaml` |
| SRS | `templates/srs.srs.transitrix.yaml` |
| SDD | `templates/sdd.sdd.transitrix.yaml` |

### Codex zone primitives (drop into `codex/external/<jurisdiction>/` or `codex/internal/` in Step 3)

| Sub-zone | Template file | Destination |
|---|---|---|
| External (laws, regulations) | `templates/codex-external.yaml` | `codex/external/<jurisdiction>/<ID>.yaml` |
| Internal (policies, standards) | `templates/codex-internal.yaml` | `codex/internal/<ID>.yaml` |

Codex artefacts carry no `notation:` header (they are zone primitives, not view documents). Schema: `notations/elements/14-codex.md`.

### Element primitive templates (reference — not yet wired into Step 2/3)

One copy-and-fill template per ArchiMate layer, at `canon/elements/<NN>_<layer>/<plural-type>/<ID>.yaml` once filled. These are reference copies for manual use; the automated flow in Step 3 still authors element files inline per-TYPE (see § there) rather than copying these. If you do drive one of these templates for the user, the admission record and lifecycle fields are still yours to compute per "Admission record and lifecycle" above — the illustrative values in the template are not something to hand the user to fill in.

| Layer | Template file |
|---|---|
| 01 Motivation (DRIVER, GOAL, CONSTRAINT, REQUIREMENT) | `templates/elements/01_motivation_template.yaml` |
| 02 Business (CAPABILITY, PROCESS, PRODUCT, ROLE, UNIT, EMPLOYEE, RULE) | `templates/elements/02_business_template.yaml` |
| 03 Application (APPLICATION, INTEGRATION) | `templates/elements/03_application_template.yaml` |
| 04 Technology (no TYPE registered yet) | `templates/elements/04_technology_template.yaml` |
| 05 Implementation (ACTION, CHANGE) | `templates/elements/05_implementation_template.yaml` |

### Relations template (reference)

| Purpose | Template file | Destination |
|---|---|---|
| First-class time-aware relation (REL) | `templates/relations/relation_template.yaml` | `canon/relations/<ID>.yaml` |

Schema: `notations/elements/17-relations.md`.

### Operations zone templates (reference — see `method/02-team-operations.md` §8)

Copied into an adopter's own `.templates/operations/` when it adopts the operations convention; not part of the `canon`/`field`/`codex` model zones.

| Purpose | Template file |
|---|---|
| Architecture Decision Record | `../adr/templates/ADR-template.md` |
| Work Item | `templates/operations/WI-template.md` |
| Central ADL harvest config | `templates/operations/adl-harvest.config.template.yaml` |
| Central ADL index placeholder | `templates/operations/central-adl-index.template.md` |
| Per-user settings | `templates/operations/settings-template.md` |


### Additional BPMN example (reference)

`templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml` — a multi-lane, multi-application worked BPMN flow, alongside the minimal starter at `templates/bpmn.bpmn.transitrix.yaml` used by Step 3.

---

## Reference reads on demand

When the user goes deeper than this cheat sheet covers, fetch the canonical spec:

- ID grammar / TYPE registry: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md`
- Shared file-header contract + zone model + admission record: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md`
- Adopter manifest schema (`transitrix.yaml`): `https://raw.githubusercontent.com/transitrix/methodology/main/notations/MANIFEST.md`
- Notation index + family selection: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/README.md`
- Per-notation full specs: `https://raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<short-name>.md` (including `14-codex.md` for the codex zone)
- Notation selection guide (Mermaid / PlantUML / Transitrix side by side, with use-cases and a phrase-to-recommendation lookup table): `https://raw.githubusercontent.com/transitrix/methodology/main/notations/NOTATION_SELECTION_GUIDE.md` — fetch this when the user names a diagram/view but it's unclear which notation fits, or asks for something the family-selection table above doesn't resolve (e.g. a sequence diagram, a wireframe, a C4 diagram — things Mermaid/PlantUML cover and Transitrix doesn't, or vice versa). If the request is too vague to apply it (e.g. "make me a diagram"), ask a clarifying question first per the guide's §1.1 — don't guess.
- Worked adopter example (the shape this skill scaffolds): `https://raw.githubusercontent.com/transitrix/acme-corp/main/AGENTS.md`

Read sparingly — the cheat sheet above is enough for 80% of cases. Pull the full spec only when the user hits a validation rule they want to understand, or asks for a field's semantics that the summary doesn't cover.

---

## What this skill does NOT do

- It does **not** ship the methodology canon. The canon lives in `github.com/transitrix/methodology`. This skill is a reading guide and a scaffolder, not a fork of the methodology. The validator and CI workflow it puts in a new repo are **fetched** from the canon at scaffold time, not bundled.
- It does **not** modify methodology files. Strictly read-only against `transitrix/methodology` — it only writes into the adopter's new repo.
- It does **not** install Transitrix Studio. The user installs it themselves from the VS Code Marketplace.
- It does **not** run the Studio CLI for the user uninvited. Suggest the commands; let the user run them.
