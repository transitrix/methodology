---
status: accepted
date: 2026-06-11
scope: repo
supersedes: none
superseded_by: none
tags: [validation, validator, cli, lint, referential-integrity, archimate, tooling, developer-experience]
---

# Validation: converge on one runtime; `scope` as the one execution axis

## Context

The methodology validates adopter repositories with **two** runtimes today:

- **`.validators/lint.py`** — Python, **whole-repo** graph checks (atomicity,
  referential integrity, ArchiMate semantics, policy). Ships in the worked
  example `organizations/acme_corp/`, scans `canon/`.
- **`@transitrix/cli validate <file>`** — TypeScript, **per-file**. Built on
  `@transitrix/diagrams`, the parser/model library already shared by Transitrix
  Studio and DSM.

The live pain is **two runtimes**: two dependency stories the onboarding Skill
must scaffold, and two places where ID-grammar / TYPE-registry rules can drift.

The onboarding front-door work
([`2026-06-11-onboarding-entry-front-door.md`](2026-06-11-onboarding-entry-front-door.md))
also raised a modelling question — should validation be split by **entity type**
(view / element / relation / structure)? That question is answered below, but it
is **not** the decision that matters: the decision that matters is removing a
runtime.

## Decision

1. **Converge on one runtime (the decision that matters).** Consolidate
   validation onto the TypeScript stack (`@transitrix/diagrams`), exposed through
   the CLI as `@transitrix/cli validate --scope=file|repo`. Retire the Python
   `.validators/lint.py` once the TS path reaches parity on the `repo`-scope
   checks. One parser, one source of truth for ID grammar / TYPE registry, one
   dependency for the onboarding Skill to scaffold. Sequenced as follow-ups
   below — not a flag-day rewrite.

2. **One execution axis — `scope`.** This is the only axis with engineering
   meaning (caching, incrementality, editor-feedback latency), and it already
   exists implicitly (CLI = file-scope, `lint.py` = repo-scope). Make it explicit:
   - **`file`** — a single notation/element file: syntax, schema/header,
     lifecycle, atomicity. Cheap and incremental; Studio-on-save, per-changed-file
     in CI.
   - **`repo`** — the whole loaded model: referential integrity, ArchiMate
     layer-semantics, policy, ID uniqueness. The CI gate.

3. **Findings stay `{scope, id, message}` for now.** No richer reporting contract
   is adopted at this time (see Deferred).

## Deferred — finding-reporting taxonomy (proposed, not adopted)

A taxonomy that tags every finding on two further dimensions —
`target` ∈ {view, element, relation, structure} and
`category` ∈ {syntax, atomicity, referential, semantics, policy} — was considered
as a second "axis". It is **demoted to a proposal** and not adopted now:

- These are **labels on a message, not an execution axis.** Calling them an "axis"
  over-states a reporting concern.
- Freezing the contract now would design an output format **ahead of any
  consumer**: nothing reads `target`/`category` yet (no Studio problems-panel
  filter, no CI annotation formatter). That is speculative generality.

Revisit when a real consumer needs to filter or group findings by `target` /
`category`. The four-way responsibility framing in the README and the CI header
comment is fine as **documentation**; it does not need to be a contract or four
engines yet.

## Alternatives considered

- **Split into four validators by entity type (view / element / relation /
  structure).** Rejected as the *implementation* axis: referential integrity is
  cross-entity (a relation references elements in other files; an element's inline
  cross-references resolve against the whole model), so element/relation cannot
  truly separate without each loading the whole graph — the split is either
  double-loading or cosmetic, and it competes with the existing five rule-kind
  categories.
- **A formal "two-axis model" (scope × responsibility), adopted now.** This was
  the original framing; it is **superseded by the framing above** — the
  responsibility dimension is demoted to a deferred reporting proposal so the ADR
  commits only to what removes complexity.
- **Keep two runtimes indefinitely.** Rejected as the end state: the dual
  Python/TS dependency story is the live pain. Convergence is the target.

## Consequences

- **CI template.** The example pipeline is structured by `scope` — `model`
  (repo-scope: structure + `lint.py`) and `views` (file-scope: CLI) — per
  PR #200, which collapses the earlier four-job version (#197) onto this axis.
- **README framing (#196).** Stays correct: it describes validation by `scope`
  and names both tools. This ADR formalises that.
- **Supersedes** the "possible finer split" note in
  [`2026-06-11-onboarding-entry-front-door.md`](2026-06-11-onboarding-entry-front-door.md).
- **Cross-repo but in-family.** Runtime convergence spans `methodology`
  (`lint.py`) and `transitrix-studio` (`@transitrix/cli`, `@transitrix/diagrams`).
  Recorded here, with a referencing ADR to be dropped in
  `transitrix-studio/docs/decisions/`. Not a hub matter.
- **Follow-ups (sequenced, separate PRs):**
  1. Teach `@transitrix/cli` to run `--scope=repo` (referential / semantics /
     policy / ID-uniqueness over `canon/`).
  2. Port `lint.py`'s repo-scope checks to the TS engine; reach parity; retire
     `lint.py`.
  3. The onboarding Skill scaffolds a single canonical validator instead of two
     (collapses the interim two-runtime scaffold in #199).
  4. *(Deferred, only if a consumer needs it)* define and emit the
     `{scope, target, category, id, message}` finding schema.
- **No adopter breakage in the interim.** Until convergence completes, `lint.py`
  remains the adopter whole-repo gate and `@transitrix/cli` the per-file
  validator; existing repos keep working.
