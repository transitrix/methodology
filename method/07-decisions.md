---
title: Decisions — record shape and multi-repo aggregation
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, methodology, operations, adr, adl, togaf, governance]
---

# Decisions — record shape and multi-repo aggregation

> The Architecture Decision Record (ADR) — the shape a team uses to record a decision about how it runs the model, the repository, or its working setup — and the Architecture Decision Log (ADL), the mechanism that aggregates those records across **many repositories** and lets an autonomous agent author them safely.

## 1. The two layers

| Layer | Where it lives | Owner |
|---|---|---|
| **Per-repo decision records** | each project repo, `operations/decisions/ADR-YYYY-MM-DD-<slug>.md` (or legacy `ADR-NNNN-<slug>.md`) | that repo's team |
| **Enterprise ADL** | the central **architecture repository**, `architecture/decision-log/` | the architecture function |

This is a git-native, agent-operable realisation of **TOGAF's *Governance Log → Decision Log*** — the log of "architecturally significant" decisions, expressed as Markdown records under version control and aggregated across an organisation's repositories. The **structure** mirrors TOGAF's Decision Log; the **agent-authored** dimension (§2.1, §4) is a **Transitrix extension** the standard does not mandate. The companion construct TOGAF places alongside it — the *Standards Information Base* (the reference-catalog) — is out of scope for this release; see §8.

The per-repo layer is **canonical only where the repository can hold the decision's reasoning** — where the repository's readership is the reasoning's intended audience, a decision record's single source of truth is the repository where the decision was made. Where a project repository is **public**, or otherwise readable by parties the reasoning is not intended for, that condition fails: the decision's home is the **central architecture repository** instead, and what remains in the project repository is at most a pointer that carries no motivation — a commit message, an issue comment, or a line stating that a decision was made and where to read it, never a `Context → Decision → Consequences` body.

Where the per-repo layer is canonical, the enterprise ADL is a **derived index** harvested from those repos plus full copies of *promoted* (enterprise-significant) records. There is no two-way sync — the central log never edits a project repo's records, and a project repo never writes into the central log.

```
project-repo-a/                     project-repo-b/            central architecture repo/
  operations/decisions/              operations/decisions/      architecture/
    ADR-0001-….md  ──────┐            ADR-0001-….md  ──┐          decision-log/
    ADR-0002-….md  ──────┤            ADR-0007-….md  ──┤            INDEX.md        ← harvested
                          │                             │            harvest.config.yaml
                          └──────────  harvest  ─────────┴──────►     promoted/      ← full copies
                                    (central pull job)                  …
```

An adopter running several internal project repositories accumulates architecture decisions in each, with no single place to see them — and TOGAF's own rationale applies: when a system is replaced, the key decisions that shaped it reveal constraints that are otherwise invisible. The ADL gives that enterprise-wide view without forcing decisions to be authored far from the work that motivates them. It also makes **autonomous-agent decisions safe**: an agent that can read a repo and change it must leave an auditable, gated trace rather than silently mutating state (§4).

## 2. The record format

Filename: `ADR-YYYY-MM-DD-<short-slug>.md` — the id is today's date plus a short kebab-case slug, and `id:` carries the same string as the filename. There is no counter and no allocation step: an author on a branch that cannot see another author's unmerged work can compute this id alone, and two records authored the same day get distinct filenames from their distinct slugs. (Records written before this scheme carry the legacy `ADR-NNNN-<short-slug>.md` sequential form — see §2.2. Both forms are valid; nothing is renamed.)

Front-matter:

```yaml
---
id: ADR-2026-06-11-pin-object-catalog
title: "Pin @acme/object-catalog to 2.3.0 for service-x"
status: accepted              # proposed | accepted | superseded
date: "2026-06-11"
author: agent                 # human-architect | agent (optional; absent = human-architect)
source: "Architecture Review Board 2026-06-09"   # optional, recommended — the deciding forum
relates_to:                   # optional — model IDs the decision concerns
  - CAPABILITY-V1
  - GOAL-EU-1
superseded_by: null            # ADR-… ID if this decision has been replaced
---
```

Body — three short sections:

```markdown
## Context
Why a decision was needed; the constraints in play.

## Decision
What the team decided, stated as a single declarative sentence followed by any
necessary qualifiers.

## Consequences
What this commits the team to; what it rules out; what becomes easier or harder.
```

### 2.1 Provenance and source (`author`, `source`)

Two front-matter fields record *who* authored a decision and *where* it came from. They are independent axes — a board decision (`source`) may be entered into the log by an agent (`author`).

- **`author`** (optional; absent = `human-architect`) — `human-architect` or `agent`; only agent authorship need be declared. `human-architect` (or unlabelled, legacy) records follow the team's normal sign-off. A team using only the single-repo convention may treat `author` as informational; the field becomes load-bearing once records aggregate here and an agent participates in authoring them. **What the field gates** — the ratification a `status: accepted` `author: agent` record requires before it is in force — is governance doctrine, stated once in [`08-governance.md`](08-governance.md).
- **`source`** (optional, recommended) — the forum the decision came from: an architecture review board, a design review, a named meeting, or `ad-hoc`. The methodology does not dictate an adopter's decision process; the field exists so that context — the constraint a future reader needs — is not lost.

**Status vocabulary:**

| Value | Meaning |
|---|---|
| `proposed` | The decision is drafted but not yet committed by the team. |
| `accepted` | The decision is in force. ADR body is immutable from here. |
| `superseded` | Replaced by a later ADR. `superseded_by:` names the successor. |

**Author vocabulary:**

| Value | Meaning |
|---|---|
| `human-architect` (or unset) | A person authored the record; the team's normal sign-off accepts it. |
| `agent` | Authored by an agent; stays `proposed` until a human ratifies it (§4). |

For the step-by-step setup — creating the folder, the authoring skill, the CI guard, and (later) the central harvest — see [`guides/adl-adopter-setup.md`](../guides/adl-adopter-setup.md).

### 2.2 Legacy identifiers (`ADR-NNNN`)

Records written before the date-slug scheme use `ADR-NNNN-<short-slug>.md` — a four-digit zero-padded sequence, unique within `operations/decisions/`. They are **not** renamed or migrated: an existing `ADR-NNNN` id, filename, and history stand as-is, indefinitely. A folder may mix both forms — each is unique within its own form, and the two never collide (a date-slug id always carries two extra hyphen-delimited fields the four-digit form does not). `supersedes:` / `superseded_by:` treat an id as an opaque string, so a date-slug record may supersede a legacy one and vice versa.

## 3. Cross-repo identity

Within one repo, an ADR id — either form — is unique ([`06-team-operations.md`](06-team-operations.md) §5). Across repos it is **not** — `ADR-2026-06-11-pin-object-catalog` (or a legacy `ADR-0001`) exists, independently, in every repo. The harvest therefore computes a globally-unique key by namespacing with the source repo, treating the id as an opaque string regardless of its form:

```
<repo-slug>/<id>          e.g.  service-x/ADR-2026-06-11-pin-object-catalog
                                platform/ADR-0007                          (legacy form, unchanged)
```

The local filename and `id:` are unchanged — **no change to the per-repo convention, nothing to migrate.** The repo segment exists only in the central index. `supersedes` / `superseded_by` pointers remain repo-local (a decision is superseded by a later decision *in the same repo*, whichever id form each side uses); cross-repo supersession is not modelled — it is a new decision that references the other.

## 4. Provenance and the ratification gate

| `author` | In force when | Who confirms |
|---|---|---|
| `human-architect` (or unset) | the team's normal sign-off accepts it (`status: accepted`) | the team's reviewer |
| `agent` | a human ratifies it — only then may `status` become `accepted` | a human reviewer named in the PR |

An agent may author a record and open it as `status: proposed`. It may **not** self-promote to `accepted`. This is the mechanism [`08-governance.md`](08-governance.md) states as doctrine; this section is its mechanics.

**The authorship limit — where, not just what.** An agent may author a decision record that is local to its own repository; it may **not** author one that crosses a boundary outside that repository — including writing directly into the central architecture repository, another project repository, or any location its own repository's agent cannot itself read. The control is structural rather than a review step: the crossing is defined by material the agent does not have (another repository's audience, confidentiality boundary, or reasoning), so the agent cannot reliably detect that it has crossed one — the boundary has to be enforced by *who may author where*, not by checking the record afterward. An agent that judges its own repository's decision belongs in the central log (§1) proposes that move to whoever can write there; it never writes across the boundary itself.

## 5. The harvest — central pull job

The central ADL is regenerated by a single **pull job** that runs from the central architecture repo. It is not wired into each project repo (no per-repo push, no per-repo CI step), so onboarding a new repo is one line in a config file.

Inputs — `architecture/decision-log/harvest.config.yaml` in the central repo:

```yaml
# Each source repo and where its decision records live.
sources:
  - repo: service-x
    path: operations/decisions          # default; override per repo if different
    clone: https://github.com/acme/service-x.git
  - repo: platform
    path: docs/decisions                 # a general code repo may use docs/decisions
    clone: https://github.com/acme/platform.git
promote:
  # Records lifted into the central log as full copies (enterprise-significant).
  scopes: [enterprise, cross-repo]       # by a record's `scope:` if present
```

Behaviour (`scripts/adl-harvest.mjs`):

1. For each source, read every `ADR-*.md` under its `path`, parse front-matter.
2. Regenerate `architecture/decision-log/INDEX.md` — one row per record: namespaced id, title, date, status, author, source, and a **backlink** to the record in its source repo.
3. Copy *promoted* records (those matching `promote`) into `architecture/decision-log/promoted/<repo-slug>/` as full files.
4. The job is **idempotent**: same inputs → same output, byte-for-byte. It only ever *writes the central index and the promoted copies* — it never touches a source repo.

Because the index is rebuilt from front-matter every run, status changes (a record going `superseded`) self-heal on the next harvest. The central log holds a **backlinked index of everything** plus **full copies of promoted records only** — not a full mirror (which would drown the log in repo-local trivia) and not index-only (which would put even the big decisions one click away).

The harvest runs on a schedule (cron / CI in the central repo) and on demand. Its output is committed through a pull request like any other change.

## 6. Immutability discipline

The ADL is **append-only**. What this obliges (nothing changes an accepted body; a course change is a new record plus supersession) is doctrine, stated once in [`08-governance.md`](08-governance.md). Two reasons it matters more here than in a single repo: the harvested index is only trustworthy if a backlink means the same thing tomorrow as today; and an autonomous agent that could edit accepted records could silently rewrite architectural history. Append-only removes both risks.

**Enforcement is git + CI, not read-only files.** Git history is the tamper-evident audit trail — every edit is a visible diff. `scripts/check-adl.mjs` (§7 below; wiring instructions in [`guides/adl-adopter-setup.md`](../guides/adl-adopter-setup.md)) mechanically rejects body diffs to `status: accepted` records, so the discipline is guarded, not merely documented. Editorial fixes (a broken link, a typo) are allowed and visible in history; anything semantic requires a new record.

## 7. CI guard — `scripts/check-adl.mjs`

A dependency-free doc-lint, companion to `check-notations.mjs`, run in CI on every PR that touches decision records. Checks:

- **A1 — front-matter validity.** Required keys present (`id`, `title`, `status`, `date`); `status` ∈ {proposed, accepted, superseded}; `author`, when present, ∈ {human-architect, agent} (absent = human-architect, which grandfathers legacy records that predate the field); `date` is ISO; a `superseded` record names a `superseded_by`.
- **A2 — immutability.** For each record at `status: accepted` on the base branch, the PR must not change its body or its non-status front-matter. (Diff-based: compares against the merge base.)
- **A3 — agent gate.** An `author: agent` record may not be introduced or changed to `status: accepted` in the same commit that authored it — acceptance is a separate, human-reviewed change.
- **A4 — filename/id agreement.** The filename's id segment equals `id:` — for a date-slug record (`ADR-YYYY-MM-DD-<slug>.md`) that segment's date additionally must equal the `date:` field; for a legacy record (`ADR-NNNN-<slug>.md`) the four-digit segment must equal `id:`.
- **A5 — uniqueness.** No two records under a decisions folder may share an `id:`, and a record added by a PR may not reuse an `id:` already present on the base branch — checked across both id forms. This is what makes the date-slug id safe to compute without coordination: two authors on separate unmerged branches can never merge a silent duplicate.

Exit codes match the repo convention: `0` clean, `1` findings, `2` script error.

For the adopter setup path — creating the folder, installing the authoring skill, wiring this guard, and standing up the central harvest — see §9.

## 8. Reference-catalog distribution — the down-flow

The *down* flow — the central architecture repo publishing versioned object catalogs (the TOGAF *Standards Information Base*) that project repos pin and consume — is a separate component from the ADL. It is specified as a ladder of four separately-enabled levels, this ADL mechanism being the first of them, in [`09-releases-and-propagation.md`](09-releases-and-propagation.md) §6. It reuses this log's own principles (explicit version pins, "supersede with a new version, don't edit in place") and closes the loop with it: a repo bumping its catalog-version pin is itself an architecturally-significant decision → it emits an `author: agent` ADR here. The ADL stands on its own as the up-flow regardless of which, if any, of the later levels a repository adopts.

The *propagation mechanism* the down-flow reuses — versioned transport, the named upgrade operation, and the agent ratification contract — is specified in [`09-releases-and-propagation.md`](09-releases-and-propagation.md) §1–§5.

## 9. Adopter setup

The mechanism is specified above (§2–§8); the step-by-step path through it — per-repo start, the authoring skill, the CI guard, and standing up the enterprise harvest — is a procedure, not a question this document answers, so it lives in [`guides/adl-adopter-setup.md`](../guides/adl-adopter-setup.md).

## 10. TOGAF mapping (honest attribution)

- The **structure** mirrors TOGAF: the per-repo + central decision records are the *Governance Log → Decision Log*; the "architecturally significant" promotion threshold is TOGAF's own; `source` captures the *Architecture Board* and other governance bodies; the deferred catalog component (§8) is the *Standards Information Base / Reference Library*.
- The **agent-authored** dimension (`author: agent` + the ratification gate) is a **Transitrix extension** on top of TOGAF, not something the standard mandates. The methodology claims alignment with TOGAF's structure, and ownership of the autonomy layer.

## 11. References

- [Team Operations convention](06-team-operations.md) — the folder this record shape lives in, and the two other record shapes (WI, Feedback) native to it.
- [`method/02-repository.md`](02-repository.md) — repository structure.
- [`method/08-governance.md`](08-governance.md) — the ratification gate and immutability discipline, stated as doctrine.
- Design decision adopting this component: the "Architecture Decision Log (ADL) — multi-repo aggregation component" decision.

---

**Next:** [`08-governance.md`](08-governance.md) — who may change what, what gates it, and what an agent may do unattended.

**Last reviewed:** 2026-08-16. Merges the former `03-architecture-decision-log.md` with the ADR record shape formerly at `02-team-operations.md` §3.1 — see those files for the redirect. The two are combined here because the record shape and its multi-repo aggregation are one question, not two.
**Status:** Active.
