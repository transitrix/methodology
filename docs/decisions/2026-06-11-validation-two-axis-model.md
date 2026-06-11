---
status: accepted
date: 2026-06-11
scope: repo
supersedes: none
superseded_by: none
tags: [validation, validator, architecture, cli, lint, referential-integrity, archimate, tooling, developer-experience]
---

# Two-axis validation model: scope × responsibility

## Context

The methodology validates adopter repositories with **two** validators today:

- **`.validators/lint.py`** — Python, **whole-repo** graph checks (atomicity,
  referential integrity, ArchiMate semantics, policy). Ships in the worked
  example `organizations/acme_corp/`, scans `canon/`.
- **`@transitrix/cli validate <file>`** — TypeScript, **per-file**. Built on
  `@transitrix/diagrams`, the parser/model library shared by Transitrix Studio
  and DSM.

The canon already names **five rule categories** — syntax, atomicity,
referential integrity, ArchiMate semantics, policy — organised by *rule kind*
(`README.md` §Validation; `lint.py`).

A question surfaced during the onboarding front-door work
([`2026-06-11-onboarding-entry-front-door.md`](2026-06-11-onboarding-entry-front-door.md)):
should validation be split by **entity type** — *view / element / relation /
repo-structure*? Two failure modes if the axis is chosen wrong:

- **Entity-type fragments referential integrity, which is inherently
  cross-entity.** A relation references elements in other files; an element's
  inline cross-references (`goal.factors: [FACTOR-…]`, `owner_role: ROLE-…`)
  resolve against the whole model. A standalone "element validator" and
  "relation validator" each end up needing the entire graph — so the split is
  either double-loading or cosmetic (two entry points over one core).
- **Entity-type competes with the existing five-category (rule-kind)
  taxonomy** — two classification systems for one concern.

Meanwhile the live pain is **two runtimes** (Python + TS): two dependency
stories the onboarding Skill must scaffold, and two places where ID-grammar /
TYPE-registry rules can drift.

## Decision

Model validation along **two orthogonal axes**, over **one shared model**, and
**converge on one runtime**. This keeps the four-way responsibility split the
adopter cares about while putting the *execution* split on the seam that has
engineering meaning.

1. **Execution axis — `scope`.** Validation runs at one of two scopes:
   - **`file`** — a single notation/element file: syntax, schema/header,
     lifecycle, atomicity (no `relations:` block inside an element file). Cheap
     and incremental; runs in Studio on save and per-changed-file in CI.
   - **`repo`** — the whole loaded model: referential integrity, ArchiMate
     layer-semantics on relations, policy, ID uniqueness. The CI gate.

   This seam is the one with engineering meaning (caching, incrementality,
   editor-feedback latency). It already exists implicitly — CLI is `file`-scope,
   `lint.py` is `repo`-scope — and is now made explicit.

2. **Contract / reporting axis — every finding is tagged on two dimensions:**
   - **`target`** ∈ {`view`, `element`, `relation`, `structure`} — *which layer*
     is wrong (the four-way responsibility split).
   - **`category`** ∈ {`syntax`, `atomicity`, `referential`, `semantics`,
     `policy`} — *which rule kind* broke (the existing canonical five).

   A finding reads, e.g., `[repo][relation][referential] REL-…-3 → endpoint
   GOAL-… not found`. The responsibility split lives **here** — in the contract
   and the output — not as four engines.

3. **Shared finding vocabulary.** Both validators emit findings shaped
   `{scope, target, category, id, message}`. CI jobs are named by `scope`;
   output is filterable by `target` / `category`. Adopting this now makes the
   two current runtimes interchangeable in *reporting* before they are unified
   in *code*.

4. **Recommended target direction — converge on one runtime.** Consolidate
   validation onto the TypeScript stack (`@transitrix/diagrams`, already the
   shared parser/model for Studio and DSM), exposed through the CLI as
   `validate --scope=file|repo [--target=…] [--category=…]`. Retire the Python
   `.validators/lint.py` once the TS path reaches parity on the `repo`-scope
   checks. One parser, one source of truth for ID grammar / TYPE registry, one
   dependency for the onboarding Skill to scaffold. This is the **recommended
   direction**, sequenced as follow-ups below — not a flag-day rewrite.

## Alternatives considered

- **Split into four validators by entity type (view / element / relation /
  structure).** Rejected as the *implementation* axis: referential integrity is
  cross-entity, so element/relation cannot truly separate without each loading
  the whole graph, and it introduces a second taxonomy competing with the five
  rule-kind categories. **Kept as the reporting dimension (`target`)** — which
  is the part of the instinct that earns its keep.
- **Keep two runtimes indefinitely, only align paths.** Rejected as the end
  state: the dual Python/TS dependency story is the live pain. Aligning the
  finding vocabulary is step one; runtime convergence is the target.
- **Use the storage decomposition (elements-vs-relations files) as the
  validation architecture.** Rejected: atomic decomposition is a storage / diff
  axis, not a verification axis; conflating them is a category error.

## Consequences

- The modernised CI template (PR #197) already matches the `scope` axis —
  `view` = file-scope, `model-integrity` = repo-scope (elements + relations),
  `structure` = repo-scope. It adopts the `{scope, target, category}` output
  vocabulary once the validators emit it.
- The README responsibility framing (PR #196) stays correct: it names the four
  `target`s and both tools. This ADR formalises that into the two-axis model and
  **supersedes the "possible finer split" note** in
  [`2026-06-11-onboarding-entry-front-door.md`](2026-06-11-onboarding-entry-front-door.md).
- **Cross-repo reach.** Runtime convergence spans `methodology` (`lint.py`) and
  `transitrix-studio` (`@transitrix/cli`, `@transitrix/diagrams`). This stays
  within the Transitrix family — recorded here, with a referencing ADR to be
  dropped in `transitrix-studio/docs/decisions/`. Not a hub matter.
- **Follow-ups (sequenced, separate PRs):**
  1. Define the shared finding schema `{scope, target, category, id, message}`
     (JSON) in the methodology spec.
  2. Teach `@transitrix/cli` to emit it and to run `--scope=repo` (referential /
     semantics / policy / ID-uniqueness over `canon/`).
  3. Port `lint.py`'s repo-scope checks to the TS engine; reach parity; retire
     `lint.py`.
  4. The onboarding Skill scaffolds the single canonical validator + a CI
     workflow that emits the shared vocabulary.
- **No adopter breakage in the interim.** Until convergence completes,
  `lint.py` remains the adopter whole-repo gate and `@transitrix/cli` the
  per-file validator; existing repos keep working.
