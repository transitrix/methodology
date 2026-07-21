# Transitrix + Enterprise ADR Registry

**Pattern type:** three-tier
**Complexity:** medium
**Mechanism:** [`method/03-architecture-decision-log.md`](../method/03-architecture-decision-log.md) — this pattern is the when / why / choose entry point; the concrete record format, harvest job, and ratification gate are specified once, there.

---

## Problem

Multiple project repos each accumulate architecture decisions locally, reviewed locally, never aggregated. There is no enterprise view of what was decided, no way to check whether a local decision conflicts with a prior cross-project one, and no immutable record of what was decided and why.

## Solution

Adopt the [Architecture Decision Log (ADL)](../method/03-architecture-decision-log.md) convention: per-repo decision records feed a central, harvested enterprise log. This pattern tells you *when* to reach for the multi-repo layer and *how to start*; the mechanism itself — record format, the harvest job, the agent-authorship ratification gate, the CI guards — lives in `method/03`, not here.

Two layers, unchanged from the canon:

| Layer | Where it lives | Canon reference |
|---|---|---|
| Per-repo decision records | `operations/decisions/ADR-NNNN-<slug>.md`, each project repo | [Team Operations](../method/02-team-operations.md) §3.1, extended by `method/03` §3 |
| Enterprise ADL | `architecture/decision-log/`, the central architecture repo | `method/03` §1, §5 |

The per-repo layer is canonical — a decision's single source of truth is the repo where it was made. The central log is a derived, harvested index plus full copies of *promoted* (enterprise-significant) records. There is no two-way sync.

## Start here — one repo, right now

Don't wait for a second repo to begin. An adopter with a single repo can stand up the per-repo half of the ADL immediately:

1. **Adopt `operations/decisions/`** in this repo — the Team Operations convention `method/03` extends (`ADR-NNNN-<slug>.md`, front-matter per `method/03` §3).
2. **Write the first record** — `operations/decisions/ADR-0001-<slug>.md`, recording the decision to start keeping ADRs here. See [Transitrix Alone](transitrix-alone.md) §"How to start" step 6 for the same first-record move in the minimal deployment.
3. **Optionally wire the CI guard** — `scripts/check-adl.mjs` (`method/03` §8) lints the folder on every PR that touches it.

That is a complete, working ADL for one repo. Move to the sections below only once a **second** repo needs to see the first repo's decisions.

## When to add the enterprise layer (multi-repo)

- Two or more project repos share interfaces, libraries, or cross-cutting concerns.
- A governance or compliance requirement calls for an auditable, aggregated record across repos.
- Recurring coordination overhead from repos silently diverging on a decision another repo already made.
- An autonomous agent needs to make architecturally-significant changes across repos with a gated, auditable trace (`method/03` §6).

## How to stand up the central ADL

1. **Every source repo already has `operations/decisions/`** (see "Start here" above) — nothing to change per-repo to onboard it into the harvest.
2. **Create the central architecture repo's `architecture/decision-log/`** with a `harvest.config.yaml` listing every source repo (`method/03` §5).
3. **Run the harvest** (`scripts/adl-harvest.mjs`, scheduled + on demand) to regenerate `INDEX.md` and pull full copies of promoted records into `promoted/`.
4. **Set the promotion scope** — which records count as enterprise-significant (`method/03` §5's `promote.scopes`) — and who has authority to mark a record as promoted.
5. **Respect the ratification gate** — an `author: agent` record is never accepted until a human ratifies it (`method/03` §6). This is what makes it safe for an autonomous agent to author decisions across repos.

Full detail — record front-matter, the harvest algorithm, immutability discipline, the CI guard, TOGAF mapping: `method/03-architecture-decision-log.md`.

## Legacy path variants

Earlier drafts of this pattern used `docs/decisions/` (per-repo) and `Architecture/` / `Architecture/INDEX.md` (central). Those are **legacy aliases only** — not a co-equal option alongside the canonical paths above. If you find them in an existing adopter repo, migrate to `operations/decisions/` and `architecture/decision-log/` the next time you touch that repo; don't propagate the old paths into new setups.
