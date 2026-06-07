---
title: "Retire the model-side ISSUE type; no bespoke replacement — use existing ArchiMate primitives if needed"
status: accepted
date: "2026-06-07"
scope: methodology
supersedes: null
superseded_by: null
tags: [issue, archimate, assessment, work-items, retire, notations, canon, planning-model]
---

# ADR: Retire the model-side ISSUE type

**Status:** Accepted
**Date:** 2026-06-07
**Deciders:** Valerii Korobeinikov
**Scope:** Repo-local to `methodology` — the `ISSUE` element TYPE and the `issues` view notation. Studio / DSM consequences are downstream and tracked separately.

---

## Context

The methodology carried an `ISSUE` element TYPE and an `issues` view (`notations/views/12-issues.md`) — a register of problems, defects, open questions, and risks, with a `parent` tree and an `open → resolved` lifecycle.

Three threads left this in a contradictory state:

- **strategy#120** (proposal) flagged that `ISSUE` is tagged `view-defined` but is content, and asked the gating question "is an issue register *canon* or *operational state*?" — never answered.
- **strategy#122** (Planning model epic) took the SCENARIO reclassification forward but left `ISSUE` as "deferred to the far future (#120 + #121)" — a parenthetical that hinted at a link to the `ASSESSMENT` primitive (ArchiMate Assessment, added under #121) without recording any decision.
- **strategy#133** (Team Operations) then went the other way: it named the team's operational work items **Work Items (`WI-`)**, *not* "issues", and — in `method/team-operations.md` §1 — re-affirmed the model-side `ISSUE` notation as live canon.

Net result: `ISSUE` was simultaneously "deferred to the far future" and "live canon", with an implied-but-unrecorded idea that it should fold into an ArchiMate concept. Two goals frame the resolution: (1) move the model steadily toward ArchiMate canon; (2) the Work Items naming for the operational layer is correct and stays.

ArchiMate has no native "Issue" element. The semantics `ISSUE` carries split awkwardly: *problems / risks / weaknesses about the enterprise* are an ArchiMate **Assessment**; *defects / open questions / tasks the team is working* are operational tracking, i.e. **Work Items**. Nothing genuinely model-architectural is left over that needs a dedicated `ISSUE` TYPE.

## Decision

1. **Retire the model-side `ISSUE` TYPE and the `issues` view from the methodology canon.**

2. **Introduce no bespoke replacement primitive.** If a future need for issue-like modelling arises, use **only elements that already exist in the methodology's ArchiMate-aligned vocabulary** — e.g. `ASSESSMENT` (ArchiMate Assessment) for a problem / risk / weakness finding about a driver. Do not reintroduce a custom `ISSUE`.

3. **Operational team tracking stays `Work Items` (`WI-`)** per strategy#133 — confirmed correct, unchanged. This is the home for defects / open questions / in-flight team work; it is operational, not canon.

4. **This resolves the #120 / #122 "deferred" ambiguity** and the contradiction in `method/team-operations.md`: there is no model-side `ISSUE` to defer or to point adopters at.

## Alternatives

- **Keep `ISSUE` as an alias / specialisation of `ASSESSMENT`.** Rejected: `ISSUE`'s tracker semantics (status lifecycle, `parent` tree, `relates_to`) do not match Assessment; the alignment would be half-done and the canon-vs-operational confusion would persist.

- **Keep `ISSUE` as an independent TYPE, just un-defer it.** Rejected: contradicts the ArchiMate-alignment goal and leaves the original ambiguity in place.

- **Pre-build the Assessment mapping now.** Rejected by the decider: do not pre-empt a need. Retire cleanly; reach for existing ArchiMate elements only if and when a concrete need appears.

## Consequences

- The model loses a dedicated issue register. Adopters track team work as Work Items; architectural problems/risks, when modelled, are `ASSESSMENT`.
- `NOTATIONS_VALIDATION.md` item 3 (SCENARIO / ISSUE reclassification) — the ISSUE half is now settled as *retire*, not *reclassify*.
- One coherent story across the three threads: model = ArchiMate vocabulary; operational = Work Items; no third "issue" concept.

**Landed in this change (methodology canon sweep):**

- `notations/views/12-issues.md`, `notations/examples/issues/`, and `organizations/acme_corp/canon/views/issues/` moved to `0. archive/` (retired, not deleted).
- `ISSUE` / `ISSUES_CAT` removed from `IDS_AND_REFERENCES.md` (§3.1, §3.2, §4); `ISSUE` rows/sentences removed from `ELEMENT_PRIMITIVES.md` (§4 table, §4.2, §7.14, `ELEM-004`); `issues` row dropped from `README.md` §Views and the example `notations:` list in `MANIFEST.md`.
- `method/team-operations.md`, `method/methodology.md`, and `organizations/acme_corp/operations/README.md` updated: architectural problems/risks are modelled as `ASSESSMENT`; team tracking stays Work Items.

**Deferred follow-ups (separate PRs):**

- **Onboarding template** — `transitrix/skills/onboard/templates/{AGENTS.md, issues.issues.transitrix.yaml}` and `organizations/acme_corp/AGENTS.md` still describe a "self-hosted issues register". Migrating that task-tracking convention to Work Items belongs to strategy#133, not this PR.
- **Studio** (`proj:transitrix-studio`): retire the issues preview / `@transitrix/diagrams` issues notation / `.issues.transitrix.yaml` activation+language.
- **DSM** (`proj:transitrix-dsm`): remove any `issues`-notation consumption.
