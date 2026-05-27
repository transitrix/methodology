# Transitrix Onboarding Skill

A Claude Code [Skill](https://docs.claude.com/en/docs/claude-code/skills) that drives a newcomer from zero to a working Transitrix enterprise-as-text repo. After it is installed, the user invokes it with `/transitrix-onboard` (or by describing the goal in plain language), and the agent walks them through scaffolding a repo, picking a starter notation, and authoring their first file with inline canonical validation.

This directory is the **source bundle** for that skill. The bundle ships:

- [`SKILL.md`](SKILL.md) — the agent-facing protocol (frontmatter + the six-step flow + an embedded cheat sheet for the 13 notations).
- [`templates/`](templates/) — one starter `.transitrix.yaml` per notation. Each template carries the canonical `notation:` and `spec_version:` headers, the canonical root shape, and `FILL-ME` placeholders.

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
2. **Scaffold the repo.** Creates the canonical `organizations/<org>/{elements,views}/...` tree plus `.gitignore` and a README stub.
3. **Create the starter notation file from a template.** Copies the right template from [`templates/`](templates/) into the matching `views/<notation>/` subfolder. Renames it to `<DOMAIN>.<short-name>.transitrix.yaml`.
4. **Interactive authoring with inline validation.** Walks the user through the placeholders one at a time and validates after each meaningful edit. Validation errors are surfaced by their canonical code (e.g. `FGCA-009 — change references unknown goal`).
5. **Hand off to Transitrix Studio.** Points the user at the VS Code extension for live preview, or at `npx @transitrix/cli validate` for CLI-only workflows.
6. **Suggest next steps.** Proposes one — and only one — adjacent artefact in the family (e.g. "you built a Goals tree, the natural next step is an FGCA").

The agent never silently rewrites the user's content. If a validation rule fails, it surfaces the rule and waits for the user's choice.

---

## What's in `templates/`

One starter YAML per notation, named `<notation>.<short-name>.transitrix.yaml` so the file extension already matches the canonical Studio recogniser. The 13 templates are:

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
