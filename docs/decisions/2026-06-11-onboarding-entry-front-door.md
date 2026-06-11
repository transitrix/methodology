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
  cannot run that command. Per-file authoring elsewhere
  (`GETTING_STARTED.md`, `AGENTS.md`, `SKILL.md`) uses `npx @transitrix/cli`.
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
4. **Validation is separated by responsibility — view / element / relation /
   repo-structure — and the docs name both tools accurately.** A single *view
   notation* file validates inline in **Transitrix Studio** (on save) or with
   `npx @transitrix/cli validate <file>`. The *element*, *relation*, and
   *repo-structure* checks (atomicity, referential integrity, ArchiMate
   semantics, policy) are run across the whole repository by the model-integrity
   linter `.validators/lint.py` — which is **adopter-facing** (it ships in the
   worked example and scans `canon/`), not internal to this repository. The two
   are complementary, not a primary/legacy pair.
5. **Reading order is relaxed.** `method/methodology.md` is reframed from
   "read this first" to "read for the *why* — not required to start."

## Alternatives considered

- **Keep the `cp -r` bootstrap as the primary path.** Rejected: it ships the
  worked example's content into the adopter repo and contradicts the Skill,
  which is the supported scaffolder.
- **Keep `python3 .validators/lint.py` as the README's headline first-run
  command.** Rejected as the *quick-start* command: the Skill does not scaffold
  `.validators/lint.py`, so it is broken for skill-onboarded repos, and a
  whole-repo lint is the wrong first step when you have authored one file. The
  linter keeps its place as the whole-repo CI gate (see Decision 4); per-file
  authoring uses Studio / `@transitrix/cli`.
- **Leave the three doors co-equal and just cross-link them.** Rejected: a
  newcomer still has to reconcile contradictory first-artefact and validator
  instructions before doing anything.

## Consequences

- `README.md`, `GETTING_STARTED.md`, and the onboarding Skill now tell one
  consistent story: Skill-first, Goals-tree hello-world, `@transitrix/cli`
  validation.
- `GETTING_STARTED.md` already embodies the target (Goals tree +
  `@transitrix/cli` + Skill-as-fastest-path); it is left unchanged.
- The README's "Validation in one paragraph" now names both tools by
  responsibility: `@transitrix/cli` / Studio for view files, `.validators/lint.py`
  for whole-repo element/relation/structure integrity.
- **Open gap (skill).** The onboarding Skill does not scaffold a validator
  bundle: a freshly onboarded repo has no `.validators/lint.py`, no
  `requirements.txt`, no `.github/workflows`, and no pinned `@transitrix/cli`.
  With the `cp -r acme_corp` bootstrap dropped, skill-onboarded repos therefore
  have no whole-repo validator and no CI until the Skill is taught to scaffold
  them. Tracked as a follow-up — the Skill (the agent) should own dependency +
  CI setup at scaffold time.
- **Possible finer split.** `.validators/lint.py` currently bundles the element,
  relation, and repo-structure responsibilities into one engine. Splitting it
  into dedicated per-responsibility validators is a separate methodology
  decision, not gated here.
- **Follow-up (separate PR):** `integration/ci-example.yaml` is stale — it
  references the pre-zone layout (`elements/**`, `relations/**`, `views/**` at
  the repo root rather than under `canon/`) and runs `lint.py` on those paths.
  It should be modernised to the zoned `canon/` layout and to validation steps
  separated by responsibility (structure / model-integrity / view notations).
