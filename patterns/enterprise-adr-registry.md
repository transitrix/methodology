# Transitrix + Enterprise ADR Registry

**Pattern type:** three-tier
**Complexity:** medium
**Mechanism:** [`method/07-decisions.md`](../method/07-decisions.md) — this pattern is the when / why / choose entry point; the concrete record format, harvest job, and ratification gate are specified once, there.

---

## Problem

Multiple project repos each accumulate architecture decisions locally, reviewed locally, never aggregated. There is no enterprise view of what was decided, no way to check whether a local decision conflicts with a prior cross-project one, and no immutable record of what was decided and why.

## Solution

Adopt the [Architecture Decision Log (ADL)](../method/07-decisions.md) convention: per-repo decision records feed a central, harvested enterprise log. This pattern tells you *when* to reach for the multi-repo layer and *how to start*; the mechanism itself — record format, the harvest job, the agent-authorship ratification gate, the CI guards — lives in `method/07-decisions.md`, not here.

Two layers, unchanged from the canon:

| Layer | Where it lives | Canon reference |
|---|---|---|
| Per-repo decision records | `operations/decisions/ADR-YYYY-MM-DD-<slug>.md` (or legacy `ADR-NNNN-<slug>.md`), each project repo | [`method/07-decisions.md`](../method/07-decisions.md) §2 |
| Enterprise ADL | `architecture/decision-log/`, the central architecture repo | `method/07-decisions.md` §1, §5 |

The per-repo layer is canonical — a decision's single source of truth is the repo where it was made. The central log is a derived, harvested index plus full copies of *promoted* (enterprise-significant) records. There is no two-way sync.

```
   PROJECT REPOS (canonical)                    CENTRAL ARCHITECTURE REPO (derived)
┌──────────────────────────────┐
│ service-x/                   │             ┌────────────────────────────────────┐
│   operations/decisions/      │             │ architecture/decision-log/         │
│     ADR-0001-….md  ──────────┼──┐          │                                    │
│     ADR-0002-….md  ──────────┼──┤          │   harvest.config.yaml              │
└──────────────────────────────┘  │          │     one line per source repo       │
                                  │          │                                    │
┌──────────────────────────────┐  │ harvest  │   INDEX.md          ← regenerated  │
│ platform/                    │  ├─────────▶│     service-x/ADR-0001  → backlink │
│   docs/decisions/  (legacy)  │  │  (pull)  │     platform/ADR-0007   → backlink │
│     ADR-0007-….md  ──────────┼──┘          │     …every record, namespaced      │
└──────────────────────────────┘             │                                    │
                                             │   promoted/         ← full copies  │
     ▲                                       │     service-x/ADR-0002-….md        │
     │  the record never moves;               │     (only `scope:` ∈ promote list) │
     │  only its index entry is copied        └────────────────────────────────────┘
     │
   authored here ─── `author: agent` lands as `status: proposed`
                     a human flips it to `accepted` ── the ratification gate
```

Three properties the diagram encodes, each load-bearing:

- **One direction only.** The harvest reads source repos and writes the central log. It never writes back — so a project team's decisions cannot be edited by the architecture function, and the central log cannot drift from what the repos actually say.
- **Namespacing happens at the index, not at the source.** Each repo's ADR ids are its own — whichever form, date-slug or legacy — and only the harvest adds the repo-slug prefix at the index. Nothing to migrate, no id coordination between teams — and no coordination needed between two authors on unmerged branches either: a date-slug id is derived from today's date and a slug, not allocated from a shared counter.
- **The gate sits at the source.** Ratification of an agent-authored record happens in the repo where the decision was made, by the people it binds — not centrally, after the fact.

## Start here — one repo, right now

Don't wait for a second repo to begin. An adopter with a single repo can stand up the per-repo half of the ADL immediately:

1. **Adopt `operations/decisions/`** in this repo — the record shape `method/07-decisions.md` §2 defines (`ADR-YYYY-MM-DD-<slug>.md`, front-matter per that section).
2. **Write the first record** — `operations/decisions/ADR-<today's-date>-<slug>.md`, recording the decision to start keeping ADRs here. No numbering to start at — the id is today's date plus a slug. See [Transitrix Alone](transitrix-alone.md) §"How to start" step 6 for the same first-record move in the minimal deployment.
   *Don't hand-write the front-matter.* The [`adr` skill](../transitrix/skills/adr/SKILL.md) — `/transitrix:adr` once the plugin is installed — runs the Context → Decision → Consequences interview, derives the id from today's date and a slug, validates the record, and opens the PR. It is the authoring workflow for the flow `method/07-decisions.md` specifies; it never self-accepts (§4's gate).
3. **Optionally wire the CI guard** — `scripts/check-adl.mjs` (`method/07-decisions.md` §7) lints the folder on every PR that touches it, including the uniqueness guard (A5) that makes two authors on separate branches safe to allocate independently.

That is a complete, working ADL for one repo. Move to the sections below only once a **second** repo needs to see the first repo's decisions.

## When to add the enterprise layer (multi-repo)

- Two or more project repos share interfaces, libraries, or cross-cutting concerns.
- A governance or compliance requirement calls for an auditable, aggregated record across repos.
- Recurring coordination overhead from repos silently diverging on a decision another repo already made.
- An autonomous agent needs to make architecturally-significant changes across repos with a gated, auditable trace (`method/07-decisions.md` §4).

## How to stand up the central ADL

1. **Every source repo already has `operations/decisions/`** (see "Start here" above) — nothing to change per-repo to onboard it into the harvest.
2. **Create the central architecture repo's `architecture/decision-log/`** with a `harvest.config.yaml` listing every source repo (`method/07-decisions.md` §5).
3. **Run the harvest** (`scripts/adl-harvest.mjs`, scheduled + on demand) to regenerate `INDEX.md` and pull full copies of promoted records into `promoted/`.
4. **Set the promotion scope** — which records count as enterprise-significant (`method/07-decisions.md` §5's `promote.scopes`) — and who has authority to mark a record as promoted.
5. **Respect the ratification gate** — an `author: agent` record is never accepted until a human ratifies it (`method/07-decisions.md` §4). This is what makes it safe for an autonomous agent to author decisions across repos.

Full detail — record front-matter, the harvest algorithm, immutability discipline, the CI guard, TOGAF mapping: `method/07-decisions.md`.

### Setting it up

Step-by-step — what to create, what to run, where the scripts come from (they are **not** in the plugin payload), and the two policy calls to make before the first harvest: [`guides/adl-adopter-setup.md`](../guides/adl-adopter-setup.md).

## Legacy path variants

Earlier drafts of this pattern used `docs/decisions/` (per-repo) and `Architecture/` / `Architecture/INDEX.md` (central). Those are **legacy aliases only** — not a co-equal option alongside the canonical paths above. If you find them in an existing adopter repo, migrate to `operations/decisions/` and `architecture/decision-log/` the next time you touch that repo; don't propagate the old paths into new setups.
