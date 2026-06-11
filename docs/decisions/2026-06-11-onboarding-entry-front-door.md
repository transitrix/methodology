---
status: accepted
date: 2026-06-11
scope: repo
supersedes: none
superseded_by: none
tags: [onboarding, documentation, entry-path, validator, cli, developer-experience, readme]
---

# Single canonical front door for new adopters

## Context

A newcomer to the methodology meets three separate entry points, and they
disagree with each other:

1. **`README.md` → "Quick start"** — leads with
   `cp -r organizations/acme_corp organizations/your_company`, edits an
   **application** element, and validates with
   `python3 organizations/your_company/.validators/lint.py`.
2. **`organizations/acme_corp/GETTING_STARTED.md`** — a manual seven-step path
   whose first artefact is a **Goals tree**, validated with
   `npx @transitrix/cli validate`.
3. **The onboarding Skill (`/transitrix:onboard`)** — scaffolds a fresh zoned
   `canon/` + `field/` + `codex/` tree from templates, lets the user pick the
   first notation, and validates with `npx @transitrix/cli`.

Three concrete frictions follow from this:

- **Validator drift.** The most-read file (`README.md`) tells a newcomer to run
  `.validators/lint.py` inside *their* organisation folder. The onboarding Skill
  does not scaffold any `.validators/lint.py` (it drops `AGENTS.md`,
  `transitrix.yaml`, and the Copilot pointer), so a freshly onboarded repo
  cannot run that command. Every other adopter-facing surface
  (`GETTING_STARTED.md`, `AGENTS.md`, `SKILL.md`) uses `npx @transitrix/cli`,
  which is the published, canonical validator.
- **The `cp -r acme_corp` "copy-then-gut" trap.** Bootstrapping by copying the
  whole worked example inherits `acme_corp`'s content, which the newcomer then
  has to delete — the opposite of a clean start. The Skill's fresh-scaffold
  approach is better, but the README still leads with `cp -r`.
- **Two "simplest first artefact" opinions** — an application element (README)
  versus a Goals tree (`GETTING_STARTED.md`). There is no single hello-world.

These are documentation/developer-experience problems within the Transitrix
family — repo ergonomics, not a positioning or category change — so the
decision is recorded as a local repo ADR rather than surfaced to the hub.

## Decision

Adopt **one canonical front door** and make every entry surface agree with it.

1. **Primary path is the onboarding Skill (`/transitrix:onboard`).** `README.md`
   leads with the three-line install + invoke. The Skill is presented as the
   default way to start.
2. **Manual fallback is `organizations/acme_corp/GETTING_STARTED.md`.** The
   README links to it for adopters who want to author by hand or are not on
   Claude Code, instead of duplicating step-by-step instructions in the README.
   The `cp -r acme_corp` bootstrap is dropped from the README quick start.
3. **The canonical hello-world artefact is a Goals tree** — the simplest
   notation. README and `GETTING_STARTED.md` both name it.
4. **The canonical adopter validator is `npx @transitrix/cli validate`.**
   Studio provides the same checks inline on save. `.validators/lint.py` is
   reframed as an **internal linter for this methodology repository's own
   example corpus** — not an adopter command. The README's "Validation in one
   paragraph" says so explicitly.
5. **Reading order is relaxed.** `method/methodology.md` is reframed from
   "read this first" to "read for the *why* — not required to start."

## Alternatives considered

- **Keep the `cp -r` bootstrap as the primary path.** Rejected: it ships the
  worked example's content into the adopter repo and contradicts the Skill,
  which is the supported scaffolder.
- **Keep `.validators/lint.py` as an adopter-facing command.** Rejected: the
  Skill does not scaffold it, so the instruction is broken for skill-onboarded
  repos; `@transitrix/cli` is the published, maintained validator.
- **Leave the three doors co-equal and just cross-link them.** Rejected: a
  newcomer still has to reconcile contradictory first-artefact and validator
  instructions before doing anything.

## Consequences

- `README.md`, `GETTING_STARTED.md`, and the onboarding Skill now tell one
  consistent story: Skill-first, Goals-tree hello-world, `@transitrix/cli`
  validation.
- `GETTING_STARTED.md` already embodies the target (Goals tree +
  `@transitrix/cli` + Skill-as-fastest-path); it is left unchanged.
- The `.validators/lint.py` reference survives in the README, now scoped
  accurately to this repository's own corpus, so the statement stays true.
- **Follow-up (separate PR):** `integration/ci-example.yaml` is stale — it
  references the pre-zone layout (`elements/**`, `relations/**`, `views/**` at
  the repo root rather than under `canon/`) and runs `lint.py`. It should be
  modernised to the zoned paths and the `@transitrix/cli` validation flow.
  Deferred from this change because the correct batch/CI invocation of the CLI
  needs to be confirmed against `@transitrix/cli` (which lives in
  `transitrix-studio`) before publishing it in an adopter-facing template.
