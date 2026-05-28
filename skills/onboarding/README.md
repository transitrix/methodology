# Transitrix Onboarding Skill

A Claude Code [Skill](https://docs.claude.com/en/docs/claude-code/skills) that drives a newcomer from zero to a working Transitrix enterprise-as-text repo. After it is installed, the user invokes it with `/transitrix-onboard` (or by describing the goal in plain language), and the agent walks them through scaffolding the canonical zoned (`canon/` + `field/` + `codex/`) adopter shape, picking a starter notation, and authoring their first file with inline canonical validation.

The skill itself runs in Claude Code. What it **scaffolds** for the adopter is assistant-neutral: the agent guide it drops in is `AGENTS.md` (read by any tool that supports the AGENTS.md convention), plus a `.github/copilot-instructions.md` pointer for GitHub Copilot. Adopters on Cursor / Claude Code / other tools add a one-line pointer in their tool's location.

This directory is the **source bundle** for the skill. The bundle ships:

- [`SKILL.md`](SKILL.md) — the agent-facing protocol (frontmatter + the six-step flow + an embedded cheat sheet for the 13 view notations + codex zone primitives).
- [`templates/`](templates/) — starter files in three groups: **root scaffolding** (`transitrix.yaml` manifest + assistant-neutral `AGENTS.md` + GitHub Copilot pointer), **view notations** (one `.transitrix.yaml` per view notation), and **codex zone primitives** (external + internal).

The skill is **read-only** against the methodology repo. It does not ship the canon — when the user goes deeper than the embedded cheat sheet, the skill fetches the full spec from `github.com/transitrix/methodology` via `WebFetch`.

---

## Install — Claude Code (local skill)

Claude Code reads skills from `~/.claude/skills/<command-name>/`. The slash command name is taken from the **install directory name**, not from anywhere in `SKILL.md`. To get `/transitrix-onboard`, copy this directory into `~/.claude/skills/transitrix-onboard/`.

### macOS / Linux

```bash
git clone https://github.com/transitrix/methodology.git /tmp/methodology
mkdir -p ~/.claude/skills
cp -r /tmp/methodology/skills/onboarding ~/.claude/skills/transitrix-onboard
```

### Windows (PowerShell)

```powershell
git clone https://github.com/transitrix/methodology.git $env:TEMP\methodology
New-Item -ItemType Directory -Force $env:USERPROFILE\.claude\skills | Out-Null
Copy-Item -Recurse $env:TEMP\methodology\skills\onboarding `
  $env:USERPROFILE\.claude\skills\transitrix-onboard
```

After copying, **restart Claude Code** so it re-scans the skills directory. The skill is then live in any project.

To update later, re-clone the methodology repo and re-copy. The bundle has no external dependencies — copying the files is the entire install.

### Project-local install

If you'd rather scope the skill to one project, put it in `<project>/.claude/skills/transitrix-onboard/` instead. Same rename rule applies.

---

## Usage — what the user experiences

Once installed, invoke the skill in three ways:

1. **Slash command** — type `/transitrix-onboard` in any Claude Code session.
2. **Freeform** — say "set up Transitrix for my org", "scaffold a transitrix repo", or "I want to model my architecture as text"; the skill's `when_to_use` triggers should pick it up.
3. **Mid-session** — already in a project and want to add a new notation file? Say "use the Transitrix onboarding skill to add an FGCA for the retention chain" and the agent will jump in at step 3 (template copy).

Once invoked, the agent runs the six-step flow documented in [`SKILL.md`](SKILL.md):

1. **Confirm intent and surface area.** Asks which notation you want to start with (showing the family-selection matrix), and how deep an explanation you want.
2. **Scaffold the repo.** Creates the canonical zoned tree (`canon/{elements,views}`, `field/{interviews,surveys,observations,drafts}`, `codex/{external/<jurisdiction>,internal}`), drops the `transitrix.yaml` manifest at the root, drops the assistant-neutral `AGENTS.md` agent guide and the `.github/copilot-instructions.md` pointer, and initialises `.gitignore` + a README stub.
3. **Create the starter notation file from a template.** For view notations, copies the matching template from [`templates/`](templates/) into the right `canon/views/<notation>/` subfolder and renames it to `<DOMAIN>.<short-name>.transitrix.yaml`. For codex artefacts, copies a codex-external or codex-internal template into `codex/external/<jurisdiction>/<ID>.yaml` or `codex/internal/<ID>.yaml`.
4. **Interactive authoring with inline validation.** Walks the user through the placeholders one at a time and validates after each meaningful edit. Validation errors are surfaced by their canonical code (e.g. `FGCA-009 — change references unknown goal`, `CODEX-001 — jurisdiction folder mismatch`).
5. **Hand off to Transitrix Studio.** Points the user at the VS Code extension for live preview, or at `npx @transitrix/cli validate` for CLI-only workflows.
6. **Suggest next steps.** Proposes one — and only one — adjacent artefact in the family (e.g. "you built a Goals tree, the natural next step is an FGCA").

The agent never silently rewrites the user's content. If a validation rule fails, it surfaces the rule and waits for the user's choice.

---

## What's in `templates/`

Three groups: root scaffolding, view notations, and codex zone primitives.

### Root scaffolding (dropped into repo root in Step 2)

| Purpose | Template | Destination in adopter repo |
|---|---|---|
| Adopter manifest (methodology version + notations + zones) | [`transitrix.yaml`](templates/transitrix.yaml) | `<repo-root>/transitrix.yaml` |
| Assistant-neutral agent guide | [`AGENTS.md`](templates/AGENTS.md) | `<repo-root>/AGENTS.md` |
| GitHub Copilot pointer → `AGENTS.md` | [`copilot-instructions.md`](templates/copilot-instructions.md) | `<repo-root>/.github/copilot-instructions.md` |

### View notations (dropped into `canon/views/<notation>/` in Step 3)

One starter YAML per view notation, named `<notation>.<short-name>.transitrix.yaml` so the file extension already matches the canonical Studio recogniser. The 13 view templates are:

| Notation | Template |
|---|---|
| BPMN | [`bpmn.bpmn.transitrix.yaml`](templates/bpmn.bpmn.transitrix.yaml) |
| FGCA | [`fgca.fgca.transitrix.yaml`](templates/fgca.fgca.transitrix.yaml) |
| FGA | [`fga.fga.transitrix.yaml`](templates/fga.fga.transitrix.yaml) |
| Goals tree | [`goals.goals.transitrix.yaml`](templates/goals.goals.transitrix.yaml) |
| Capability map | [`capability-map.capability-map.transitrix.yaml`](templates/capability-map.capability-map.transitrix.yaml) |
| Process landscape map | [`process-map.process-map.transitrix.yaml`](templates/process-map.process-map.transitrix.yaml) |
| Activities | [`activities.activities.transitrix.yaml`](templates/activities.activities.transitrix.yaml) |
| Nested blocks | [`blocks.blocks.transitrix.yaml`](templates/blocks.blocks.transitrix.yaml) |
| Scenarios | [`scenarios.scenarios.transitrix.yaml`](templates/scenarios.scenarios.transitrix.yaml) |
| Applications | [`applications.applications.transitrix.yaml`](templates/applications.applications.transitrix.yaml) |
| Products | [`products.products.transitrix.yaml`](templates/products.products.transitrix.yaml) |
| Issues | [`issues.issues.transitrix.yaml`](templates/issues.issues.transitrix.yaml) |
| Process Blueprint | [`process-blueprint.process-blueprint.transitrix.yaml`](templates/process-blueprint.process-blueprint.transitrix.yaml) |

### Codex zone primitives (dropped into `codex/external/<jurisdiction>/` or `codex/internal/` in Step 3)

Codex artefacts are zone primitives, not view documents — each is a single `<ID>.yaml` named by its canonical ID, carrying no `notation:` header. Schema: `notations/14-codex.md`.

| Sub-zone | Template | Destination in adopter repo |
|---|---|---|
| External (laws, regulations) | [`codex-external.yaml`](templates/codex-external.yaml) | `codex/external/<jurisdiction>/<ID>.yaml` |
| Internal (policies, standards) | [`codex-internal.yaml`](templates/codex-internal.yaml) | `codex/internal/<ID>.yaml` |

Each template parses cleanly under its canonical validator out of the box — the user just replaces the `FILL-ME` markers.

---

## Tools the skill uses

Declared in `SKILL.md` frontmatter under `allowed-tools`:

- `Read`, `Write`, `Edit` — author the new repo and the starter file.
- `Bash` (or PowerShell on Windows) — `mkdir`, `cp`, and an optional `git init` when the user asks.
- `Glob`, `Grep` — locate already-authored files in an existing repo.
- `WebFetch` — pull canonical specs from `raw.githubusercontent.com/transitrix/methodology/main/notations/<NN>-<name>.md` when the cheat sheet is not enough.

The skill does **not** request `Edit` against any file under the methodology canon, run package installers, or call out to Studio's CLI without the user's consent.

---

## Updating the bundle

The bundle is part of the methodology repo (`github.com/transitrix/methodology`, path `skills/onboarding/`). Changes to the bundle ship in the same PR flow as everything else in the methodology repo. After a release:

- The latest `main` of `skills/onboarding/` is always the source of truth.
- Users re-install by re-running the copy step above.
- There is no auto-update — the bundle is plain files.

If a notation's canonical shape changes, the template under `templates/` and the corresponding row in `SKILL.md`'s cheat sheet must be updated in the same commit.

---

## Cheat-sheet conformance check

The embedded cheat sheet in [`SKILL.md`](SKILL.md) is downstream of [`notations/README.md`](../../notations/README.md). When the canon catalogue changes — a notation added, renamed, retired, or its file extension changed — the Skill must follow. CI guards this:

- **Script:** [`scripts/check-skill-cheatsheet.mjs`](../../scripts/check-skill-cheatsheet.mjs) — pure Node, no dependencies.
- **Workflow:** [`.github/workflows/skill-cheatsheet-conformance.yml`](../../.github/workflows/skill-cheatsheet-conformance.yml) — runs on every PR and weekly Monday 09:00 UTC.

### What the script checks

Ground truth = the catalogue table in [`notations/README.md`](../../notations/README.md). The script verifies:

| Check | Rule |
|---|---|
| A | Every notation in the canon catalogue has a row in `SKILL.md` §"Family selection" carrying its canonical file extension. |
| B | Every notation in the canon catalogue has a view-template at `templates/<short>.<short>.transitrix.yaml` in the Skill's templates table. |
| C | Every file extension in the family-selection matrix corresponds to a notation in the canon. |
| D | Every view-template path in the templates table corresponds to a notation in the canon. |

The script exits `1` on drift (CI red) with a per-finding list naming the specific notation and where to fix it. Exit `2` is a script-internal error (file missing, parser broke).

### What the script does NOT check

- The codex zone-primitives section in the cheat sheet — codex isn't in the catalogue table; it's a parallel zone-primitive notation with a separate spec ([`notations/14-codex.md`](../../notations/14-codex.md)).
- Root-scaffolding templates (`transitrix.yaml`, `AGENTS.md`, `copilot-instructions.md`) — adopter-shape concerns, not notation-shape concerns.
- Intra-spec drift (each spec's front-matter `file_extension` vs its "File header" section) — a separate known issue, not the Skill's fault.
- The free-text "Situation" prose in the family-selection matrix.

### When CI fails

Read the per-finding output. For each finding:

- **Check A / B failure** — the canon added or renamed a notation; update the Skill cheat sheet and add/rename the view-template under `skills/onboarding/templates/` in the same PR.
- **Check C / D failure** — the Skill has a stray row or template that doesn't match the canon; either the catalogue is missing the notation (update the catalogue) or the Skill has a typo (fix the Skill).

The script runs on every PR, so a drift introduced anywhere — Skill side or canon side — surfaces in the PR conversation, not in the Actions tab as a warning.
