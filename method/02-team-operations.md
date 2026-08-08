---
title: Team Operations — operational layer convention
status: draft
last_reviewed: 2026-07-27
audience: public
license: MIT
tags: [transitrix, methodology, operations, adr, work-items, feedback]
---

# Team Operations — operational layer convention

> Lightweight convention for the **work an adopter team does to run itself** — its decisions and its in-flight tasks — kept alongside the architectural model in the same repository, but strictly separate from it.

## 1. What this is — and what it is not

The Transitrix model (`canon/`, `field/`, `codex/`) describes the **enterprise** an organisation is steering: its goals, capabilities, processes, applications, and the changes/activities that move it forward. Those are statements *about the business*.

A team applying Transitrix also accumulates a second, smaller body of artefacts that describe how **the team itself** is operating: the choices it has made about its own setup, and the units of work it currently has in flight. Those are statements *about the team*.

This is the **Team Operations** convention. It defines a folder, its file shapes — three **record** shapes (ADR, WI, Feedback) and a machine- or human-written **operational config/state** area — and one linking rule. Nothing more.

**Hard distinctions to preserve:**

- **Operational ≠ Model.** Team-operations artefacts are not part of `canon/`. They do not describe the enterprise. They are not subject to the zone admission gates (see [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5–6) and they are not in the ID grammar registry (see [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md)). They live in a sibling folder, `operations/`, deliberately outside the zone model.
- **Operational ≠ model.** A problem, risk, or weakness *about the modelled enterprise* is a model finding — captured as an `ASSESSMENT` (ArchiMate Assessment) in canon, not as a team-operations artefact. Team Operations uses **Work Items (`WI-…`)** for what the team is doing day to day; an architectural finding is an `ASSESSMENT`, a piece of the team's own workstream is a `WI` under `operations/work-items/`. (The former model-side `issues` notation was retired, 2026-06-07.)

The convention is intentionally minimal: a folder, two templates, and a one-screen rules doc. Adopters who want a heavier process should keep their existing tracker — this convention is for teams that want their decision log and work queue under the same version control and review surface as the model itself.

This convention is the **single-repo** layer. When an adopter runs several repositories and wants one enterprise-wide view of their decisions — and when decisions may be authored by an agent, not only a human — those records aggregate into a central **Architecture Decision Log**; see [`method/03-architecture-decision-log.md`](03-architecture-decision-log.md).

## 2. Folder layout

The adopter instantiates the convention at:

```
organizations/<org>/operations/
├── README.md                      # Local rules (~1 screen)
├── feedback.md                    # Upstream feedback register (FB-… entries, one file; §3.3)
├── decisions/                     # Architecture decision records (ADR — human- or agent-authored; §3.1.1)
│   ├── ADR-2026-06-03-adopt-methodology.md
│   ├── ADR-2026-06-05-pin-catalog-2-3-0.md
│   └── …                          # legacy ADR-NNNN-<slug>.md records, if any, keep their form (§3.1.2)
├── work-items/                    # Team work items (human-authored)
│   ├── WI-0001-<slug>.md
│   ├── WI-0002-<slug>.md
│   └── …
├── config/                        # Operational settings, per tool/process (human-authored)
│   └── <domain>/…
└── state/                         # Operational state, per tool/process (machine-written; committed)
    └── <domain>/…                 # e.g. reg-intel/signal-cache.json
```

`operations/` is a **sibling** of `canon/`, `field/`, and `codex/` — not a zone. It is excluded from canon validation: the linter does not walk it, and `transitrix.yaml`'s `zones:` list does not include it.

## 3. The file shapes

The convention provides three **record** shapes (§3.1 ADR, §3.2 WI, §3.3 Feedback) and an operational **config/state** area (§3.4) for structured data a tool or process reads and writes.

### 3.1 Architecture Decision Record (`ADR-…`)

A short, append-only record of a decision the team has made about how it runs the model, the repository, or its working setup. ADRs are immutable once accepted: a later decision that changes course supersedes the earlier one rather than overwriting it.

Filename: `ADR-YYYY-MM-DD-<short-slug>.md` — the id is today's date plus a short kebab-case slug, and `id:` carries the same string as the filename. There is no counter and no allocation step: an author on a branch that cannot see another author's unmerged work can compute this id alone, and two records authored the same day get distinct filenames from their distinct slugs. (Records written before this scheme carry the legacy `ADR-NNNN-<short-slug>.md` sequential form — see §3.1.2. Both forms are valid; nothing is renamed.)

Front-matter:

```yaml
---
id: ADR-2026-06-03-adopt-methodology
title: "Adopt Transitrix methodology 0.5.x for the enterprise model"
status: accepted            # proposed | accepted | superseded
date: "2026-06-03"
author: human-architect     # human-architect | agent (optional; absent = human-architect) — see §3.1.1
source: "Architecture Review Board 2026-06-03"   # optional — the deciding forum (§3.1.1)
relates_to:                 # optional — model IDs the decision concerns
  - CAPABILITY-V1
  - GOAL-EU-1
superseded_by: null         # ADR-… ID if this decision has been replaced
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

#### 3.1.1 Provenance and source (`author`, `source`)

Two front-matter fields record *who* authored a decision and *where* it came from. They are independent axes — a board decision (`source`) may be entered into the log by an agent (`author`).

- **`author`** (optional; absent = `human-architect`) — `human-architect` or `agent`; only agent authorship need be declared. This drives the gate: an `author: agent` record is **not** in force until a human ratifies it (a human flips `status` to `accepted` in a separate, reviewed change). An agent may author a `proposed` record but may never introduce an already-`accepted` one. `human-architect` (or unlabelled, legacy) records follow the team's normal sign-off. This is what lets an agent do consequential work (e.g. record "bumped a version pin") while a human stays the gate.
- **`source`** (optional, recommended) — the forum the decision came from: an architecture review board, a design review, a named meeting, or `ad-hoc`. The methodology does not dictate an adopter's decision process; the field exists so that context — the constraint a future reader needs — is not lost.

A team using only the single-repo convention may treat `author` as informational. The fields become load-bearing once records aggregate into the central Architecture Decision Log and an agent participates in authoring them ([`method/03-architecture-decision-log.md`](03-architecture-decision-log.md)).

For the step-by-step setup — creating the folder, the authoring skill, the CI guard, and (later) the central harvest — see [`method/03-architecture-decision-log.md`](03-architecture-decision-log.md) §10.

#### 3.1.2 Legacy identifiers (`ADR-NNNN`)

Records written before the date-slug scheme use `ADR-NNNN-<short-slug>.md` — a four-digit zero-padded sequence, unique within `operations/decisions/`. They are **not** renamed or migrated: an existing `ADR-NNNN` id, filename, and history stand as-is, indefinitely. A folder may mix both forms — each is unique within its own form, and the two never collide (a date-slug id always carries two extra hyphen-delimited fields the four-digit form does not). `supersedes:` / `superseded_by:` treat an id as an opaque string, so a date-slug record may supersede a legacy one and vice versa.

### 3.2 Work Item (`WI-…`)

A short record of a piece of work the team has in flight or has queued. Work Items are mutable — `status` and the body are updated as work progresses — and short-lived: when the work is done the item is `closed`, not deleted.

Filename: `WI-NNNN-<short-slug>.md` (`NNNN` is a four-digit zero-padded sequence, monotonically increasing within `operations/work-items/`).

Front-matter:

```yaml
---
id: WI-0001
title: "Capture the first capability assessments for V1.1"
status: in_progress          # proposed | in_progress | blocked | done | closed
opened: "2026-06-03"
closed: null                 # ISO date when status → done/closed; null otherwise
owner: "v.korobeinikov"      # optional — the person carrying the item
relates_to:                  # optional — model IDs the work concerns
  - CAPABILITY-V1.1
  - ACTIVITY-DISCOVERY-1
---
```

Body — free-form Markdown. A short outcome statement and a checklist is usually enough; substantive discussion that leads to a course change is captured as an ADR, not as a long Work Item description.

### 3.3 Feedback Record (`FB-…`)

A short record of a **methodology-directed finding** raised from this repo — the landing place for `FINDINGS.md`'s `escalate-methodology` route (see the adopter role guides: `AGENTS.md`, `ANALYST.md`, `VALIDATOR.md`, `INGEST.md`). A finding here is about the notation or the spec itself (a gap, a friction, a suggestion), never about the modelled enterprise — a problem with the model is an `ASSESSMENT` in canon, per the hard distinction in §1.

Deliberately **not** one-file-per-record like ADR/WI: a single file, `operations/feedback.md`, holds a checklist index at the top and one short block per entry below it. The checkbox means "closed" — same convention as the ADR/WI index would use, adapted to one file instead of a folder.

```markdown
## Register
- [x] FB-0001 — no relation kind connects GOAL to CAPABILITY — closed (answered upstream)
- [ ] FB-0002 — ID grammar rejects non-Latin element names — sent-upstream

---
### FB-0002
type: notation-gap
methodology_version: "3.3.0"
raised_by: modeler
date: "2026-07-27"
status: sent-upstream
upstream: sent 2026-07-27
observation: <generic limitation, one paragraph>
proposed: <what the team believes the fix would be — optional>
```

Fields:

- `id` — `FB-NNNN`, carried by the entry's `###` heading (not repeated as a YAML key inside the block). Four-digit zero-padded, monotonically increasing within the single `operations/feedback.md` file — there is no per-record folder to enumerate, unlike ADR/WI (see §5).
- `type` — `notation-gap` | `tooling-friction` | `doc-gap` | `model-suggestion` (§6.4).
- `methodology_version` — **required**. A finding is always raised against a specific methodology version; record the one the repo's `transitrix.yaml` pins at the time.
- `raised_by` — the role that raised it: `Ingest` | `Modeler` | `Analyst` | `Validator`, per `FINDINGS.md` §3.
- `date` — ISO date the entry was written.
- `status` — `open` | `triaged` | `resolved-locally` | `sent-upstream` | `answered` | `closed` | `wont-fix` (§6.5).
- `upstream` — `not-sent` | `sent <date>` | `answered <date>` (§6.6).
- `observation` — what was seen, in plain language, stripped of adopter specifics (see below).
- `proposed` — what the team believes the fix would be. Optional.

**Anonymised at authoring time, not at export.** An entry is written as a *generic limitation only* — no model content, no element IDs, no organisation-identifying detail — the same scrub discipline `FINDINGS.md` §2 step 3 already requires for methodology-directed findings, applied at the moment of writing rather than at the moment of sending. This is what makes the file safe to read, quote, or forward as-is; there is nothing left to redact later.

**The record stays in the adopter's own repository.** Nothing in this convention writes to, opens an issue on, or transmits anything to `transitrix/methodology` or any other host. Submission upstream is opt-in and manual — the convention recommends `hello@transitrix.com` (see `CONTRIBUTING.md` §Communication) and stops there; a human decides whether an entry actually leaves this repo, and the `upstream:` field records that decision once made.

An authoring skill, `/transitrix:feedback`, is the intended path for composing an entry, allocating the next `FB-NNNN`, running the scrub gate, and updating `status`/`upstream` on later invocations — same plugin as the `adr` skill (`transitrix/skills/adr`). Until it lands, an entry may be written by hand, following the field set and the scrub discipline above.

### 3.4 Operational config and state (`config/`, `state/`)

A fourth area of `operations/`, distinct in *kind* from the ADR/WI/Feedback records above: **structured operational data** a tool or process reads and writes, not human-authored prose. It has two halves — the **config/state split**:

- **Config — `operations/config/<domain>/…` — human-authored operational *settings*.** Durable, intentional choices about how a tool or process the team runs is configured (cadences, toggles, the curated lists a team maintains to drive an operating activity). Hand-edited and reviewed like any other committed file. Format is the tool's own structured data (YAML / JSON).
- **State — `operations/state/<domain>/…` — machine-written operational *state*.** The current operational data a tool maintains **across runs** — caches, cursors, last-seen change signals, run bookkeeping. Written by tooling, not hand-edited. It is **committed** (so it survives a fresh clone / CI checkout — the reason it cannot live in the transient `_intake/` workspace), **churny** (frequent, expected diffs), and **disposable / correctness-non-critical**: a consumer MUST tolerate it being absent or stale and regenerate or degrade gracefully. It is never a source of truth about the enterprise.

`<domain>` is the tool or process that owns the data (e.g. `reg-intel`). *Worked example:* the reg-intel change-signal gate persists its last-seen `ETag` / `Last-Modified` / version values at `operations/state/reg-intel/signal-cache.json` — committed so a scheduled scan in a fresh checkout can cheaply tell whether a source moved, yet never part of the model and safe to delete (the gate then simply degrades to "always fetch").

Like the rest of `operations/`, both areas sit **outside** the zone model and the canonical ID grammar, are **not** walked by the doc-lint (`scripts/check-notations.mjs`), and carry no admission gate. Unlike ADR/WI/Feedback they carry no `id:` and no status vocabulary — they are addressed by **path**, and the *internal* shape of each file is owned by the tool that writes it, not by this convention. This convention fixes only **where** such data lives (`config/` vs `state/`) and the contract that `state/` is committed-but-disposable; a tool-specific config/state split conforms to this home rather than inventing its own location.

## 4. The linking rule — `relates_to:`

ADR and WI carry an optional `relates_to:` list of **model entity IDs** the artefact concerns — Goals, Capabilities, Activities, Changes, Roles, and so on, drawn from the canonical TYPE registry in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) §3.

`relates_to:` is the only link from operations into the model. The model does **not** link back: nothing inside `canon/` references an ADR or a Work Item, by design. The model describes the enterprise; the operations layer describes the team. The dependency is one-directional — operations → model.

If a Work Item or ADR references a model ID that does not resolve (typo, deleted element, future plan), the convention treats it as a warning, not an error. The canonical doc-lint (`scripts/check-notations.mjs`) does not validate `operations/` — it is outside the linter's scope, on purpose.

**Feedback Records (§3.3) do not carry `relates_to:`.** The whole point of the shape is that it contains no model-identifying detail — an entry citing an element ID is refused at authoring time (the scrub gate), not merely discouraged. A Feedback Record is about the notation or the spec, never about a specific model element, so there is nothing for it to link to.

## 5. IDs — distinct namespace from the model

`ADR-`, `WI-`, and `FB-` are deliberately **outside** the canonical ID grammar. The TYPE registry in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) governs model IDs only; `ADR-…`, `WI-…`, and `FB-…` are unique within their own folder (ADR/WI) or their own file (Feedback — see §3.3), not globally, and cannot be cross-referenced from inside the model. An ADR id is either the date-slug form `ADR-YYYY-MM-DD-<slug>` (§3.1, new records) or the legacy zero-padded four-digit sequence `ADR-NNNN` (§3.1.2, existing records); a `WI-` id keeps the zero-padded four-digit sequence (`WI-0042`); `FB-…` carries a zero-padded four-digit sequence (`FB-0002`).

This is intentional: the team-operations namespace is a different *kind* of identifier than a model entity ID, and keeping ADR/WI/FB ids mechanically distinguishable from a model ID (no domain segment) prevents accidental collisions. Uniqueness within `operations/decisions/` is mechanically guarded — two records sharing an `id:` fail CI regardless of which id form each uses ([`method/03-architecture-decision-log.md`](03-architecture-decision-log.md) §8, check A5). (When records from several repos are aggregated, the central Architecture Decision Log namespaces them as `<repo-slug>/<id>` — the local id is unchanged, treated as an opaque string; see [`method/03-architecture-decision-log.md`](03-architecture-decision-log.md) §4. Feedback Records are not aggregated across repos — each repo's register is independent, and there is no `FB-` equivalent of the central Architecture Decision Log.)

Operational config/state files (§3.4) carry **no** identifier at all — they are addressed by **path** (`operations/state/<domain>/<name>`), not by a sequenced `ADR-`/`WI-`/`FB-` id and not by a model ID. They are never cross-referenced from inside the model.

## 6. Status vocabularies

### 6.1 ADR `status:`

| Value | Meaning |
|---|---|
| `proposed` | The decision is drafted but not yet committed by the team. |
| `accepted` | The decision is in force. ADR body is immutable from here. |
| `superseded` | Replaced by a later ADR. `superseded_by:` names the successor. |

### 6.2 ADR `author:`

| Value | Meaning |
|---|---|
| `human-architect` (or unset) | A person authored the record; the team's normal sign-off accepts it. |
| `agent` | Authored by an agent; stays `proposed` until a human ratifies it (§3.1.1). |

### 6.3 Work Item `status:`

| Value | Meaning |
|---|---|
| `proposed` | The item is registered but not yet being worked. |
| `in_progress` | The item is actively being worked. |
| `blocked` | The item cannot progress until something external is resolved. |
| `done` | The work is complete; outcome is recorded in the body. |
| `closed` | No longer tracked — done-and-archived, withdrawn, or a "won't do". |

### 6.4 Feedback `type:`

| Value | Meaning |
|---|---|
| `notation-gap` | The notation or schema cannot express something the team needed to model. |
| `tooling-friction` | The methodology's tooling (a skill, a validator, a CLI command) made the task harder than it should have been. |
| `doc-gap` | A spec or guide is silent, ambiguous, or wrong about something the team needed to know. |
| `model-suggestion` | Canon is valid and expressible as-is, but the methodology could guide adopters toward a better shape. |

### 6.5 Feedback `status:`

| Value | Meaning |
|---|---|
| `open` | Registered; not yet triaged. |
| `triaged` | Reviewed locally; the team has decided how to route it. |
| `resolved-locally` | Addressed within the adopter's own repo or practice; not going upstream. |
| `sent-upstream` | Sent to the methodology maintainer. |
| `answered` | The maintainer responded. |
| `closed` | No longer tracked — the checkbox flips to `[x]` here or at `wont-fix`. |
| `wont-fix` | Reviewed and deliberately not pursued. |

### 6.6 Feedback `upstream:`

| Value | Meaning |
|---|---|
| `not-sent` | Default — nothing has been sent yet. |
| `sent <date>` | Sent to `hello@transitrix.com` on `<date>`. |
| `answered <date>` | The maintainer replied on `<date>`. |

### 6.7 Read by a reporting command

`transitrix-ingest workflow-status` (see [`method/04-methodology-update-propagation.md`](04-methodology-update-propagation.md) §7.3) reads the vocabularies above — `author: agent` proposed ADRs broken out from human-proposed per §6.2 — to report every human gate's phase and count in one on-demand view. This does not change the boundary already stated in §4–§5: the command reads `operations/` front-matter read-only, `operations/` stays outside the ID grammar and outside `scripts/check-notations.mjs`, and the command itself never writes a zone, an operations record, or a batch.

## 7. The 1-screen rules doc — `operations/README.md`

Each adopter writes a short local README inside `operations/` covering:

- The file shapes the convention provides (the ADR, WI, and Feedback records; the `config/`+`state/` operational-data area) — point at this canonical doc rather than restating the schema.
- The team's local **decision-making process** — when an ADR is required, who signs off, where supersedes are recorded.
- The team's local **work-item flow** — how items are opened, who reviews, how items move through `proposed → in_progress → done`.
- The team's local **feedback-routing process** — when a Feedback Record is written, whether the team reviews before marking `sent-upstream`, who owns actually sending it.

The local README is the team's adaptation; this canonical doc is the convention.

A starter template lives at [`operations/README.md`](https://github.com/transitrix/acme-corp/blob/main/operations/README.md) in the acme-corp reference repo.

## 8. Templates

Two starter templates live in this repository (an adopter copies one into its own `.templates/operations/` when starting the convention):

- [`ADR-template.md`](../transitrix/skills/adr/templates/ADR-template.md) — under `transitrix/skills/adr/templates/`, alongside the skill that writes records. Its front matter carries the date-slug id of §3.1; there is deliberately no second copy seeding the legacy `ADR-NNNN` form, which §3.1.2 keeps for existing records only.
- [`WI-template.md`](../transitrix/skills/onboard/templates/operations/WI-template.md) — under `transitrix/skills/onboard/templates/operations/`.

Copy a template into the matching subfolder, fill in the front-matter and body, commit.

Feedback carries no separate per-record template — it is one growing file, not one file per entry. The onboarding skill (`transitrix/skills/onboard`) scaffolds `operations/feedback.md` with its empty header directly; an entry is appended to it (by hand, or by the `/transitrix:feedback` skill once it lands) following the shape in §3.3.

## 9. What this convention is not (extended)

To keep the layer minimal and prevent it from drifting into a parallel process system:

- **Not a ticket tracker.** Work Items are short, current, and few. A team that needs grooming, sprints, burn-down, and prioritisation has outgrown this convention and should use its existing tracker.
- **Not a forum.** Long discussions belong in the PR that proposes the ADR, not in the ADR body.
- **Not a versioned spec.** ADRs are decisions, not contracts; they do not carry `valid_from`/`valid_to` and they are not admitted to canon.
- **Not a Transitrix Studio-rendered notation.** Operations files are plain Markdown — no rendering pipeline, no notation header, no extension convention. (The §3.4 config/state area is the one place `operations/` holds structured data rather than Markdown — but it is still un-rendered and un-linted.)
- **Not a database of record.** `operations/state/` (§3.4) is a tool's committed working cache, not a source of truth. Anything correctness-critical belongs in the model or must be re-derivable; losing a state file must never lose model truth.
- **Not a support channel.** A Feedback Record (§3.3) documents a generic limitation for the methodology maintainer, not adopter-specific troubleshooting or a request for help using the tool — that goes through the project's own support surfaces (`CONTRIBUTING.md`), same as any other user.

## 10. References

- Multi-repo aggregation + agent-authorship: [`method/03-architecture-decision-log.md`](03-architecture-decision-log.md).
- Worked example: [`operations/`](https://github.com/transitrix/acme-corp/tree/main/operations/) in the acme-corp reference repo, including a filled [`operations/feedback.md`](https://github.com/transitrix/acme-corp/blob/main/operations/feedback.md).
- Methodology overview: [`method/01-methodology.md`](01-methodology.md) §4 — repository structure.
- Architectural findings about the enterprise are modelled as `ASSESSMENT` (the former model-side `issues` notation was retired, 2026-06-07).
- Distinct from the canon zones: [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5.
- The propose → route → scrub protocol a Feedback Record's `observation` must satisfy before it is written: `FINDINGS.md` (adopter role-guide shared protocol, scaffolded by `transitrix/skills/onboard`) §2.
- The opt-in upstream submission channel: [`CONTRIBUTING.md`](../CONTRIBUTING.md) §Communication.

---

**Status:** draft — new in this release. The convention is intentionally small; widen it only when an adopter team demonstrates a recurring need the current shape does not cover.
