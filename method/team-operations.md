---
title: Team Operations — operational layer convention
status: draft
last_reviewed: 2026-06-03
audience: public
license: MIT
tags: [transitrix, methodology, operations, adr, work-items]
---

# Team Operations — operational layer convention

> Lightweight convention for the **work an adopter team does to run itself** — its decisions and its in-flight tasks — kept alongside the architectural model in the same repository, but strictly separate from it.

## 1. What this is — and what it is not

The Transitrix model (`canon/`, `field/`, `codex/`) describes the **enterprise** an organisation is steering: its goals, capabilities, processes, applications, and the changes/activities that move it forward. Those are statements *about the business*.

A team applying Transitrix also accumulates a second, smaller body of artefacts that describe how **the team itself** is operating: the choices it has made about its own setup, and the units of work it currently has in flight. Those are statements *about the team*.

This is the **Team Operations** convention. It defines a folder, its file shapes — two human-authored **record** shapes (ADR, WI) and a machine- or human-written **operational config/state** area — and one linking rule. Nothing more.

**Hard distinctions to preserve:**

- **Operational ≠ Model.** Team-operations artefacts are not part of `canon/`. They do not describe the enterprise. They are not subject to the zone admission gates (see [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5–6) and they are not in the ID grammar registry (see [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md)). They live in a sibling folder, `operations/`, deliberately outside the zone model.
- **Operational ≠ model.** A problem, risk, or weakness *about the modelled enterprise* is a model finding — captured as an `ASSESSMENT` (ArchiMate Assessment) in canon, not as a team-operations artefact. Team Operations uses **Work Items (`WI-…`)** for what the team is doing day to day; an architectural finding is an `ASSESSMENT`, a piece of the team's own workstream is a `WI` under `operations/work-items/`. (The former model-side `issues` notation was retired, 2026-06-07.)

The convention is intentionally minimal: a folder, two templates, and a one-screen rules doc. Adopters who want a heavier process should keep their existing tracker — this convention is for teams that want their decision log and work queue under the same version control and review surface as the model itself.

## 2. Folder layout

The adopter instantiates the convention at:

```
organizations/<org>/operations/
├── README.md                      # Local rules (~1 screen)
├── decisions/                     # Architecture decision records (human-authored)
│   ├── ADR-0001-<slug>.md
│   ├── ADR-0002-<slug>.md
│   └── …
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

The convention provides two human-authored **record** shapes (§3.1 ADR, §3.2 WI) and an operational **config/state** area (§3.3) for structured data a tool or process reads and writes.

### 3.1 Architecture Decision Record (`ADR-…`)

A short, append-only record of a decision the team has made about how it runs the model, the repository, or its working setup. ADRs are immutable once accepted: a later decision that changes course supersedes the earlier one rather than overwriting it.

Filename: `ADR-NNNN-<short-slug>.md` (`NNNN` is a four-digit zero-padded sequence, monotonically increasing within `operations/decisions/`).

Front-matter:

```yaml
---
id: ADR-0001
title: "Adopt Transitrix methodology 0.5.x for the enterprise model"
status: accepted            # proposed | accepted | superseded
date: "2026-06-03"
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

### 3.3 Operational config and state (`config/`, `state/`)

A third area of `operations/`, distinct in *kind* from the ADR/WI records above: **structured operational data** a tool or process reads and writes, not human-authored prose. It has two halves — the **config/state split**:

- **Config — `operations/config/<domain>/…` — human-authored operational *settings*.** Durable, intentional choices about how a tool or process the team runs is configured (cadences, toggles, the curated lists a team maintains to drive an operating activity). Hand-edited and reviewed like any other committed file. Format is the tool's own structured data (YAML / JSON).
- **State — `operations/state/<domain>/…` — machine-written operational *state*.** The current operational data a tool maintains **across runs** — caches, cursors, last-seen change signals, run bookkeeping. Written by tooling, not hand-edited. It is **committed** (so it survives a fresh clone / CI checkout — the reason it cannot live in the transient `_intake/` workspace), **churny** (frequent, expected diffs), and **disposable / correctness-non-critical**: a consumer MUST tolerate it being absent or stale and regenerate or degrade gracefully. It is never a source of truth about the enterprise.

`<domain>` is the tool or process that owns the data (e.g. `reg-intel`). *Worked example:* the reg-intel change-signal gate persists its last-seen `ETag` / `Last-Modified` / version values at `operations/state/reg-intel/signal-cache.json` — committed so a scheduled scan in a fresh checkout can cheaply tell whether a source moved, yet never part of the model and safe to delete (the gate then simply degrades to "always fetch").

Like the rest of `operations/`, both areas sit **outside** the zone model and the canonical ID grammar, are **not** walked by the doc-lint (`scripts/check-notations.mjs`), and carry no admission gate. Unlike ADR/WI they carry no `id:` and no status vocabulary — they are addressed by **path**, and the *internal* shape of each file is owned by the tool that writes it, not by this convention. This convention fixes only **where** such data lives (`config/` vs `state/`) and the contract that `state/` is committed-but-disposable; a tool-specific config/state split conforms to this home rather than inventing its own location.

## 4. The linking rule — `relates_to:`

Both file shapes carry an optional `relates_to:` list of **model entity IDs** the artefact concerns — Goals, Capabilities, Activities, Changes, Roles, and so on, drawn from the canonical TYPE registry in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) §3.

`relates_to:` is the only link from operations into the model. The model does **not** link back: nothing inside `canon/` references an ADR or a Work Item, by design. The model describes the enterprise; the operations layer describes the team. The dependency is one-directional — operations → model.

If a Work Item or ADR references a model ID that does not resolve (typo, deleted element, future plan), the convention treats it as a warning, not an error. The canonical doc-lint (`scripts/check-notations.mjs`) does not validate `operations/` — it is outside the linter's scope, on purpose.

## 5. IDs — distinct namespace from the model

`ADR-` and `WI-` are deliberately **outside** the canonical ID grammar. The TYPE registry in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) governs model IDs only; `ADR-…` and `WI-…` carry zero-padded four-digit sequences (`ADR-0001`, `WI-0042`) and are unique within their own folder, not globally. They cannot be cross-referenced from inside the model.

This is intentional: the team-operations namespace is a different *kind* of identifier than a model entity ID, and keeping them mechanically distinguishable (four-digit padded sequence with no domain segment) prevents accidental collisions.

Operational config/state files (§3.3) carry **no** identifier at all — they are addressed by **path** (`operations/state/<domain>/<name>`), not by a sequenced `ADR-`/`WI-` id and not by a model ID. They are never cross-referenced from inside the model.

## 6. Status vocabularies

### 6.1 ADR `status:`

| Value | Meaning |
|---|---|
| `proposed` | The decision is drafted but not yet committed by the team. |
| `accepted` | The decision is in force. ADR body is immutable from here. |
| `superseded` | Replaced by a later ADR. `superseded_by:` names the successor. |

### 6.2 Work Item `status:`

| Value | Meaning |
|---|---|
| `proposed` | The item is registered but not yet being worked. |
| `in_progress` | The item is actively being worked. |
| `blocked` | The item cannot progress until something external is resolved. |
| `done` | The work is complete; outcome is recorded in the body. |
| `closed` | No longer tracked — done-and-archived, withdrawn, or a "won't do". |

## 7. The 1-screen rules doc — `operations/README.md`

Each adopter writes a short local README inside `operations/` covering:

- The file shapes the convention provides (the ADR and WI records; the `config/`+`state/` operational-data area) — point at this canonical doc rather than restating the schema.
- The team's local **decision-making process** — when an ADR is required, who signs off, where supersedes are recorded.
- The team's local **work-item flow** — how items are opened, who reviews, how items move through `proposed → in_progress → done`.

The local README is the team's adaptation; this canonical doc is the convention.

A starter template lives at [`organizations/acme_corp/operations/README.md`](../organizations/acme_corp/operations/README.md).

## 8. Templates

Two starter templates live under `.templates/operations/` in the adopter repository:

- [`organizations/acme_corp/.templates/operations/ADR-template.md`](../organizations/acme_corp/.templates/operations/ADR-template.md)
- [`organizations/acme_corp/.templates/operations/WI-template.md`](../organizations/acme_corp/.templates/operations/WI-template.md)

Copy a template into the matching subfolder, fill in the front-matter and body, commit.

## 9. What this convention is not (extended)

To keep the layer minimal and prevent it from drifting into a parallel process system:

- **Not a ticket tracker.** Work Items are short, current, and few. A team that needs grooming, sprints, burn-down, and prioritisation has outgrown this convention and should use its existing tracker.
- **Not a forum.** Long discussions belong in the PR that proposes the ADR, not in the ADR body.
- **Not a versioned spec.** ADRs are decisions, not contracts; they do not carry `valid_from`/`valid_to` and they are not admitted to canon.
- **Not a Transitrix Studio-rendered notation.** Operations files are plain Markdown — no rendering pipeline, no notation header, no extension convention. (The §3.3 config/state area is the one place `operations/` holds structured data rather than Markdown — but it is still un-rendered and un-linted.)
- **Not a database of record.** `operations/state/` (§3.3) is a tool's committed working cache, not a source of truth. Anything correctness-critical belongs in the model or must be re-derivable; losing a state file must never lose model truth.

## 10. References

- Worked example: [`organizations/acme_corp/operations/`](../organizations/acme_corp/operations/).
- Methodology overview: [`method/methodology.md`](methodology.md) §4 — repository structure.
- Architectural findings about the enterprise are modelled as `ASSESSMENT` (the former model-side `issues` notation was retired, 2026-06-07).
- Distinct from the canon zones: [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5.

---

**Status:** draft — new in this release. The convention is intentionally small; widen it only when an adopter team demonstrates a recurring need the current shape does not cover.
