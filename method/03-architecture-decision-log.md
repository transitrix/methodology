---
title: Architecture Decision Log (ADL) — multi-repo aggregation
status: draft
last_reviewed: 2026-06-11
audience: public
license: MIT
tags: [transitrix, methodology, operations, adr, adl, togaf, governance]
---

# Architecture Decision Log (ADL) — multi-repo aggregation

> How architecture decisions made across **many repositories** are aggregated into one enterprise-level **Architecture Decision Log**, and how an autonomous agent may author decisions safely. The ADL is the multi-repo layer on top of the single-repo [Team Operations](02-team-operations.md) convention — not a separate, parallel system.

> **Starting out?** Go to **§10 — Adopter setup**: the whole path, from creating the folder to a scheduled harvest, with the commands. Sections 1–9 specify what the mechanism guarantees; §10 is what you do. The record format itself (filename, front-matter, body, supersession) is defined in [`02-team-operations.md`](02-team-operations.md) §3.1, which this document extends with two fields (§3).

This is a git-native, agent-operable realisation of **TOGAF's *Governance Log → Decision Log*** — the log of "architecturally significant" decisions, expressed as Markdown records under version control and aggregated across an organisation's repositories. The **structure** mirrors TOGAF's Decision Log; the **agent-authored** dimension (§3.1.1, §6) is a **Transitrix extension** the standard does not mandate. The companion construct TOGAF places alongside it — the *Standards Information Base* (the reference-catalog) — is out of scope for this release; see §9.

## 1. The two layers

| Layer | Where it lives | Owner | Defined by |
|---|---|---|---|
| **Per-repo decision records** | each project repo, `operations/decisions/ADR-NNNN-<slug>.md` | that repo's team | [Team Operations](02-team-operations.md) §3.1 (extended here with `author` / `source`) |
| **Enterprise ADL** | the central **architecture repository**, `architecture/decision-log/` | the architecture function | this document |

The per-repo layer is **canonical**: a decision record's single source of truth is the repository where the decision was made. The enterprise ADL is a **derived index** harvested from those repos plus full copies of *promoted* (enterprise-significant) records. There is no two-way sync — the central log never edits a project repo's records, and a project repo never writes into the central log.

```
project-repo-a/                     project-repo-b/            central architecture repo/
  operations/decisions/              operations/decisions/      architecture/
    ADR-0001-….md  ──────┐            ADR-0001-….md  ──┐          decision-log/
    ADR-0002-….md  ──────┤            ADR-0007-….md  ──┤            INDEX.md        ← harvested
                          │                             │            harvest.config.yaml
                          └──────────  harvest  ─────────┴──────►     promoted/      ← full copies
                                    (central pull job)                  …
```

## 2. Why this exists

An adopter running several internal project repositories accumulates architecture decisions in each, with no single place to see them — and TOGAF's own rationale applies: when a system is replaced, the key decisions that shaped it reveal constraints that are otherwise invisible. The ADL gives that enterprise-wide view without forcing decisions to be authored far from the work that motivates them.

It also makes **autonomous-agent decisions safe**. An agent that can read a repo and change it (for example, bringing a consuming repo up to a new methodology or catalog version) must leave an auditable, gated trace rather than silently mutating state. The ADL's `author` provenance, ratification gate, and append-only immutability (§6, §7) are what turn that convenience into a governed operation.

## 3. The record format — extends Team Operations §3.1

A per-repo decision record is a Team Operations ADR with two added front-matter fields. Everything else (filename `ADR-NNNN-<slug>.md`, body `Context → Decision → Consequences`, supersession semantics) is unchanged.

```yaml
---
id: ADR-0001
title: "Pin @acme/object-catalog to 2.3.0 for service-x"
status: accepted              # proposed | accepted | superseded
date: "2026-06-11"
author: agent                 # human-architect | agent   (optional; absent = human-architect)
source: "Architecture Review Board 2026-06-09"   # OPTIONAL, recommended (origin forum)
relates_to: []                # optional — model entity IDs
superseded_by: null
---
```

- **`author`** (optional; absent = `human-architect`) — *who authored the record.* `human-architect` or `agent`; only agent authorship must be declared. This drives the gate (§6): an `author: agent` record is **not** in force until a human ratifies it. A `human-architect` (or unlabelled, legacy) record follows the team's normal sign-off.
- **`source`** (optional, recommended) — *the forum the decision came from*: an architecture review board (a native TOGAF governance body), a design review, a named meeting, or `ad-hoc`. Optional, because the methodology does not dictate an adopter's decision process; recommended, because it preserves the context TOGAF's Decision Log exists to retain. `author` and `source` are independent axes — a board decision (`source`) can be entered into the log by an agent (`author`).

## 4. Cross-repo identity

Within one repo, `ADR-NNNN` is unique (Team Operations §5). Across repos it is **not** — `ADR-0001` exists in every repo. The harvest therefore computes a globally-unique key by namespacing with the source repo:

```
<repo-slug>/ADR-NNNN          e.g.  service-x/ADR-0001
```

The local filename and `id:` stay `ADR-NNNN` — **no change to the per-repo convention, nothing to migrate.** The repo segment exists only in the central index. `supersedes` / `superseded_by` pointers remain repo-local (a decision is superseded by a later decision *in the same repo*); cross-repo supersession is not modelled — it is a new decision that references the other.

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

## 6. Provenance and the ratification gate

| `author` | In force when | Who confirms |
|---|---|---|
| `human-architect` (or unset) | the team's normal sign-off accepts it (`status: accepted`) | the team's reviewer |
| `agent` | a human ratifies it — only then may `status` become `accepted` | a human reviewer named in the PR |

An agent may author a record and open it as `status: proposed`. It may **not** self-promote to `accepted`. Ratification is a human flipping `proposed → accepted` in a reviewed change. This is the mechanism that lets an agent do consequential work (e.g. record "bumped catalog pin to 2.3.0") while a human remains the gate — the worst an unattended agent can do is leave a *proposed* record for review.

## 7. Immutability discipline

The ADL is **append-only**. The discipline is identical to Team Operations §3.1, stated here as the property the central log depends on:

- An accepted record's **body is immutable**. Course changes are made by **supersession** — a *new* record plus `superseded_by` / `supersedes` pointers — never by rewriting an accepted one.
- The only mutable front-matter on an accepted record is its status pointers (`status: superseded`, `superseded_by`).
- Genuinely evolving artefacts (current-state design specs) are **not** ADRs; they carry `doc_type: living-design-doc` and evolve freely.

Two reasons this matters more here than in a single repo: the harvested index is only trustworthy if a backlink means the same thing tomorrow as today; and an autonomous agent that could edit accepted records could silently rewrite architectural history. Append-only removes both risks.

**Enforcement is git + CI, not read-only files.** Git history is the tamper-evident audit trail — every edit is a visible diff. `scripts/check-adl.mjs` (§8) mechanically rejects body diffs to `status: accepted` records, so the discipline is guarded, not merely documented. Editorial fixes (a broken link, a typo) are allowed and visible in history; anything semantic requires a new record.

## 8. CI guard — `scripts/check-adl.mjs`

A dependency-free doc-lint, companion to `check-notations.mjs`, run in CI on every PR that touches decision records. Checks:

- **A1 — front-matter validity.** Required keys present (`id`, `title`, `status`, `date`); `status` ∈ {proposed, accepted, superseded}; `author`, when present, ∈ {human-architect, agent} (absent = human-architect, which grandfathers legacy records that predate the field); `date` is ISO; a `superseded` record names a `superseded_by`.
- **A2 — immutability.** For each record at `status: accepted` on the base branch, the PR must not change its body or its non-status front-matter. (Diff-based: compares against the merge base.)
- **A3 — agent gate.** An `author: agent` record may not be introduced or changed to `status: accepted` in the same commit that authored it — acceptance is a separate, human-reviewed change.
- **A4 — filename/id agreement.** `ADR-NNNN` in the filename equals `id:`.

Exit codes match the repo convention: `0` clean, `1` findings, `2` script error.

## 9. Out of scope here — reference-catalog distribution (phase 2)

The *down* flow — the central architecture repo publishing versioned object catalogs (the TOGAF *Standards Information Base*) that project repos pin and consume — is a separate component, deliberately not in this release. It will reuse the same principles (explicit version pins, "supersede with a new version, don't edit in place") and will close the loop with this log: a repo bumping its catalog-version pin is itself an architecturally-significant decision → it emits an `author: agent` ADR here. Until then, the ADL stands on its own as the up-flow.

The *propagation mechanism* the down-flow will reuse — versioned transport, the named upgrade operation, and the agent ratification contract — is specified in [`04-methodology-update-propagation.md`](04-methodology-update-propagation.md). The reference-catalog layer is the next consumer of that mechanism.

## 10. Adopter setup — from an empty repo to a running harvest

The mechanism is specified above; this section is the path through it. Sections 10.1–10.3 stand up the per-repo half and are worth doing before a second repo exists; 10.4–10.5 add the enterprise layer.

### Step 1 — per-repo, start today (no second repo needed)

In each repository, without waiting for the central layer:

1. Create `operations/decisions/`.
2. Write `ADR-0001-<slug>.md` — the first record is the decision to start keeping records here.
3. Give it the front-matter of §3 — the Team Operations shape plus `author` / `source`, and optionally `scope:` if you already know this record should be promoted once a central log exists.

Body is `Context → Decision → Consequences`. Template: [`transitrix/skills/adr/templates/ADR-template.md`](../transitrix/skills/adr/templates/ADR-template.md).

**Two disciplines that make the whole thing trustworthy** (§7):

- **Append-only.** An accepted record's body is immutable. A change of course is a **new** record plus a `superseded_by` / `supersedes` pointer flip on the old one — never a rewrite. The only mutable front-matter on an accepted record is its status pointers.
- **A living design doc is not a decision.** A current-state spec that evolves as understanding improves carries `doc_type: living-design-doc` and evolves freely — it does not belong in an append-only log.

---

### Step 2 — the authoring skill

Install the plugin (Claude Code; the skill itself is assistant-neutral and works with any coding agent that can read and write files and run shell commands):

```
/plugin marketplace add transitrix/methodology
/plugin install transitrix@transitrix-methodology
```

Then, in any repo: `/transitrix:adr`.

The skill runs a Context → Decision → Consequences interview, allocates the next `ADR-NNNN`, validates the record, and opens a pull request. Three invariants it enforces ([`transitrix/skills/adr/SKILL.md`](../transitrix/skills/adr/SKILL.md)):

1. **Never self-accepts.** Anything it writes is `author: agent`, `status: proposed`.
2. **Supersession, not mutation** — see above.
3. **Routes living design docs away** from the log instead of forcing them in.

---

### Step 3 — the CI guard (per repo, recommended)

[`scripts/check-adl.mjs`](../scripts/check-adl.mjs) lints every pull request touching the decisions folder:

```
node scripts/check-adl.mjs                      # default: **/operations/decisions/
node scripts/check-adl.mjs --dir docs/decisions # a repo on the legacy path
```

Checks (§8): required front-matter and valid enum values (A1) · an accepted record's body cannot be modified (A2) · a new `author: agent` record cannot arrive already `accepted` (A3) · filename `ADR-NNNN` equals the `id:` field (A4). A2 and A3 are diff-based and skip rather than fail when no base ref is available. Exit `0` clean, `1` findings.

---

### Step 4 — the enterprise ADL (once a second repo needs to see the first repo's decisions)

In the central architecture repo:

```
architecture/
  decision-log/
    harvest.config.yaml   # the only file maintained by hand
    INDEX.md              # DERIVED — regenerated every run, never hand-edited
    promoted/             # full copies of enterprise-significant records, by repo
```

Fill `harvest.config.yaml` with one entry per source repo — the schema, with both the `path` override and the `promote.scopes` list, is in §5.

Run it:

```
node scripts/adl-harvest.mjs \
  --config architecture/decision-log/harvest.config.yaml \
  --workspace <dir-with-the-source-repos-checked-out> \
  --out architecture/decision-log
```

The job clones nothing itself — CI (or a wrapper script) checks the source repos out into `--workspace`, one sub-directory per repo slug. A missing source is **warned and skipped**, not fatal: the index degrades rather than failing the run. Exit codes: `0` ok · `1` nothing harvested · `2` error.

Output is a single Markdown table — namespaced id, title, date, status, author, source, and a backlink into the source repo — plus full copies of promoted records under `promoted/<repo-slug>/`. The run is **idempotent**: same inputs, byte-identical output. Status changes self-heal on the next harvest, because the index is rebuilt from front-matter every time.

Schedule it in the central repo (cron / CI) and allow on-demand runs. Its output lands through a pull request like any other change.

**Getting the two scripts.** `adl-harvest.mjs` and `check-adl.mjs` live in this repository under [`scripts/`](../scripts/), MIT-licensed — they are **not** part of the plugin payload, so installing the plugin does not get you the harvest. Copy `adl-harvest.mjs` into the central architecture repo and `check-adl.mjs` into each source repo that wants the guard, or vendor this repository. Node ≥ 18, no dependencies.

---

### Step 5 — the two policy decisions to make before the first harvest

1. **Promotion scope.** Which records count as enterprise-significant (`promote.scopes`), and **who has the authority** to mark a record with that scope. Everything not promoted still appears in the index — by backlink, not by copy.
2. **Ratification.** An `author: agent` record is **not in force** until a human flips `proposed → accepted` in a reviewed change (§6). This is what makes it safe to let an autonomous agent record consequential choices across repos: the worst an unattended agent can do is leave a proposal for review.

---

### Legacy paths — one caveat

`docs/decisions/` (per repo) and `Architecture/INDEX.md` (central) are **legacy aliases** from earlier drafts, not co-equal options. If an existing repo uses them, point `path:` at them in the config and migrate the next time you touch that repo — do not create them in a new setup, and never run two parallel decision folders in one repo.

---

### Verification note

The Step 4 harvest was run end to end on 2026-07-27 against the `acme-corp` worked example's `operations/decisions/`: **5 records indexed, 0 promoted** (no record carried a promoted scope), **0 sources skipped, exit 0**, and every generated backlink resolves. The commands above are the ones that were run, not a transcription from the spec.

---

## 11. TOGAF mapping (honest attribution)

- The **structure** mirrors TOGAF: the per-repo + central decision records are the *Governance Log → Decision Log*; the "architecturally significant" promotion threshold is TOGAF's own; `source` captures the *Architecture Board* and other governance bodies; the deferred catalog component (§9) is the *Standards Information Base / Reference Library*.
- The **agent-authored** dimension (`author: agent` + the ratification gate) is a **Transitrix extension** on top of TOGAF, not something the standard mandates. The methodology claims alignment with TOGAF's structure, and ownership of the autonomy layer.

## 12. References

- [Team Operations convention](02-team-operations.md) — the single-repo ADR/WI layer this builds on (record shape: §3.1).
- [`method/01-methodology.md`](01-methodology.md) — repository structure and change lifecycle.
- Design decision adopting this component: the "Architecture Decision Log (ADL) — multi-repo aggregation component" decision.

---

**Status:** draft — new in this release. Up-flow (aggregation) only; reference-catalog distribution (§9) follows. Widen only when an adopter demonstrates a need the current shape does not cover.
