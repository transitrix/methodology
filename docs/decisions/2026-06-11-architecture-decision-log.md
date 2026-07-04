---
status: Proposed
date: 2026-06-11
scope: repo
supersedes: []
superseded_by: []
tags: [adl, adr, team-operations, togaf, governance, multi-repo, agent-authored, immutability]
---

# Architecture Decision Log (ADL) — multi-repo aggregation component

## Context

An autonomous agent on a production environment self-discovered the public methodology repo, read it, and began bringing a consuming repository's configuration up to a new version on its own initiative. Convenient, but with no standardised, predictable mechanism behind it: the change was unbounded in scope, untraceable, and non-reproducible.

The methodology already has the single-repo half of the answer — the [Team Operations](../../method/team-operations.md) convention defines `operations/decisions/ADR-NNNN-*.md` records that are immutable-once-accepted and superseded rather than rewritten. What it lacks is (a) a multi-repo story — an adopter runs many internal project repos and needs one enterprise view of their decisions; and (b) a safe way for an agent (not only a human) to author a decision.

This realises TOGAF's *Governance Log → Decision Log* — the log of "architecturally significant" decisions — git-natively. The structure mirrors TOGAF's Decision Log; the agent-authored dimension is a Transitrix extension the standard does not mandate. This is a within-family methodology-engineering decision.

## Decision

We adopt an **Architecture Decision Log (ADL)** component (`method/architecture-decision-log.md`) as the multi-repo aggregation layer on top of Team Operations, with these settled choices:

1. **Layering.** Per-repo records (Team Operations `operations/decisions/`) are canonical; the enterprise ADL in the central architecture repo is a **derived index** — no two-way sync.
2. **Provenance + gate.** The ADR front-matter gains `author` (`human-architect | agent`) and an optional-recommended `source` (the decision forum). An `author: agent` record is `proposed` until a human ratifies it; an agent may never introduce an already-`accepted` record.
3. **Cross-repo identity.** Local `ADR-NNNN` is unchanged; the harvest namespaces it as `<repo-slug>/ADR-NNNN` in the central index. Nothing to migrate.
4. **Harvest.** A single central **pull job** (`scripts/adl-harvest.mjs`) walks the source repos and regenerates the index; no per-repo push wiring. The central log holds a backlinked index of everything plus full copies of **promoted** (enterprise-significant) records only.
5. **Immutability.** The ADL is append-only; accepted bodies are immutable; change is by supersession. Enforced by git history + a CI guard (`scripts/check-adl.mjs`), not read-only files. This is the inaugural ADL decision — the log's first entry is that the log is immutable.
6. **Scope of this release.** Up-flow (aggregation) only. The down-flow — versioned reference-catalog distribution (the TOGAF *Standards Information Base*) — is deferred to a later component.

## Alternatives considered

- **A parallel ADL system separate from Team Operations** — would recreate the "several incompatible ADR conventions" failure. Rejected: ADL extends Team Operations.
- **Mutable / editable central log** — destroys harvest trust and removes the autonomy guardrail. Rejected for append-only + supersession.
- **Per-repo push (CI in every repo) for aggregation** — uneven adoption leaves gaps and wires every repo. Rejected for a central pull job.
- **Full mirror of all records centrally** — drowns the enterprise log in repo-local trivia. Rejected for index-plus-promoted.
- **Ship both flows now** — doubles the surface under deadline and forces the catalog-format decision prematurely. Rejected: up-flow first.

## Consequences

- Adopters get an enterprise decision log and a safe agent-authorship path out of the box; the observed "agent silently updates a repo" behaviour becomes auditable and gated.
- Team Operations §3.1 gains two front-matter fields and an agent-authorship note; existing human-authored records remain valid (the new `author` key is the only addition they need).
- New tooling to maintain: `scripts/check-adl.mjs` (CI guard) and `scripts/adl-harvest.mjs` (harvest), plus the `adl-guard` workflow.
- A later ADR will add the reference-catalog distribution component and close the loop (a catalog-pin bump emits an `author: agent` ADR). This produces the living spec `method/architecture-decision-log.md`, which evolves as the component grows.
