# Transitrix + Enterprise ADR Registry

**Pattern type:** three-tier  
**Complexity:** medium  
**System-agnostic counterpart:** Enterprise ADR Registry pattern

---

## Problem

Multiple project repos each maintain their own `docs/decisions/` folder. Decisions that affect shared interfaces, positioning, or cross-repo compatibility are made locally, reviewed locally, and never aggregated. There is no enterprise view of architecture decisions, no way to check whether a local ADR conflicts with a prior cross-project decision, and no immutable record of what was decided and why.

## Solution

Transitrix repo as the enterprise Architecture Decision Log (ADL). Three tiers classify decisions by scope and route cross-cutting ones through a structured promotion path into an append-only enterprise registry.

```
┌────────────────────────────────────────────┐
│              source tier                   │
│                                            │
│  project repos — local ADRs in docs/       │
│  scope: single-repo decisions              │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│              review tier                   │
│                                            │
│  cross-project ADR candidates              │
│  scope: affects 2+ repos or shared API     │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│               canon tier                   │
│                                            │
│  Architecture/INDEX.md — enterprise ADL    │
│  Architecture/ — immutable, append-only    │
└────────────────────────────────────────────┘
```

## Tiers

### Source tier — project repos

Each project repo keeps a `docs/decisions/` folder for local ADRs. Local decisions are those whose scope is entirely contained within one repo: a dependency choice, a local naming convention, a project-specific process. Standard ADR format applies (title, date, status, context, decision, consequences).

### Review tier — cross-project candidates

A decision enters the review tier when its scope extends beyond one repo. Classification criteria:

- Affects the interface or contract between two or more repos.
- Touches positioning, compatibility, or access policy shared across the enterprise.
- Overrides or supersedes a prior enterprise-level decision.

Cross-project candidates are nominated in a Transitrix PR. Reviewers validate scope classification and ensure the decision does not conflict with existing enterprise ADRs.

### Canon tier — `Architecture/` in the Transitrix repo

Promoted decisions become enterprise ADRs under `Architecture/` in the Transitrix repo. Key rules:

- **Immutable once merged.** Never edit a merged enterprise ADR. If a decision is superseded, write a new ADR that explicitly references and supersedes the old one. The old ADR's `status:` field is updated to `superseded` — its content is not changed.
- **Append-only.** No deletions. The record of what was decided, when, and why must survive even when the decision itself does not.
- **Indexed.** `Architecture/INDEX.md` is the canonical registry — one line per ADR with its number, title, date, and status. Update it with every promotion.

## When to use

- Two or more project repos that share interfaces, shared libraries, or cross-cutting concerns.
- A governance or compliance requirement to maintain an auditable record of architectural decisions.
- Recurring coordination overhead from local ADRs that silently diverge on shared concerns.
- Teams that need a single authoritative place to check "has this been decided before?"

## How to start with Transitrix

1. **Stand up the Transitrix repo first.** Follow the [Transitrix Alone](transitrix-alone.md) pattern. The ADR registry is an additional structure inside an existing Transitrix repo, not a separate one.
2. **Create `Architecture/`.** Add `Architecture/INDEX.md` with a header row and one seed entry documenting the decision to adopt Transitrix as the enterprise ADL. This is enterprise ADR-0001.
3. **Define the scope classification criteria.** Write them down in `Architecture/INDEX.md` (or a linked `Architecture/SCOPE.md`). The criteria from the review tier above are a starting point — adjust to your organisation's topology.
4. **Instrument project repos.** Add a note to each project's `CONTRIBUTING.md`: what qualifies as a cross-project ADR candidate, how to nominate one (open a Transitrix PR), and how to check the enterprise registry before making a local decision.
5. **Promote existing cross-cutting decisions.** Audit existing `docs/decisions/` across project repos for decisions that already belong in the enterprise registry. Promote them in a single batch PR. Link from the original local ADR to the enterprise record.
6. **Establish the promotion cadence.** A nomination is a Transitrix pull request; review is the validation gate. Decide who has the authority to promote (enterprise architect, architecture review board, or explicit reviewer set in `CODEOWNERS`).
