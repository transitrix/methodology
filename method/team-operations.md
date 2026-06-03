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

This is the **Team Operations** convention. It defines a folder, two file shapes, and one linking rule — nothing more.

**Hard distinctions to preserve:**

- **Operational ≠ Model.** Team-operations artefacts are not part of `canon/`. They do not describe the enterprise. They are not subject to the zone admission gates (see [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5–6) and they are not in the ID grammar registry (see [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md)). They live in a sibling folder, `operations/`, deliberately outside the zone model.
- **Operational ≠ `ISSUE` notation.** The model already has an [`issues`](../notations/views/12-issues.md) view notation, which catalogues **architectural** issues — defects, open questions, and risks *in the model or in the system being modelled*. That is part of canon. Team Operations uses **Work Items (`WI-…`)** for what the team is doing day to day, deliberately not the word "issue", to keep the two from colliding. An adopter who needs to track an architectural problem files an `ISSUE` under `canon/views/issues/`; an adopter who needs to track a piece of their own workstream files a `WI` under `operations/work-items/`.

The convention is intentionally minimal: a folder, two templates, and a one-screen rules doc. Adopters who want a heavier process should keep their existing tracker — this convention is for teams that want their decision log and work queue under the same version control and review surface as the model itself.

## 2. Folder layout

The adopter instantiates the convention at:

```
organizations/<org>/operations/
├── README.md                      # Local rules (~1 screen)
├── decisions/                     # Architecture decision records
│   ├── ADR-0001-<slug>.md
│   ├── ADR-0002-<slug>.md
│   └── …
└── work-items/                    # Team work items
    ├── WI-0001-<slug>.md
    ├── WI-0002-<slug>.md
    └── …
```

`operations/` is a **sibling** of `canon/`, `field/`, and `codex/` — not a zone. It is excluded from canon validation: the linter does not walk it, and `transitrix.yaml`'s `zones:` list does not include it.

## 3. The two file shapes

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

## 4. The linking rule — `relates_to:`

Both file shapes carry an optional `relates_to:` list of **model entity IDs** the artefact concerns — Goals, Capabilities, Activities, Changes, Roles, and so on, drawn from the canonical TYPE registry in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) §3.

`relates_to:` is the only link from operations into the model. The model does **not** link back: nothing inside `canon/` references an ADR or a Work Item, by design. The model describes the enterprise; the operations layer describes the team. The dependency is one-directional — operations → model.

If a Work Item or ADR references a model ID that does not resolve (typo, deleted element, future plan), the convention treats it as a warning, not an error. The canonical doc-lint (`scripts/check-notations.mjs`) does not validate `operations/` — it is outside the linter's scope, on purpose.

## 5. IDs — distinct namespace from the model

`ADR-` and `WI-` are deliberately **outside** the canonical ID grammar. The TYPE registry in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) governs model IDs only; `ADR-…` and `WI-…` carry zero-padded four-digit sequences (`ADR-0001`, `WI-0042`) and are unique within their own folder, not globally. They cannot be cross-referenced from inside the model.

This is intentional: the team-operations namespace is a different *kind* of identifier than a model entity ID, and keeping them mechanically distinguishable (four-digit padded sequence with no domain segment) prevents accidental collisions.

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

- The two file shapes the convention provides (ADR, WI) — point at this canonical doc rather than restating the schema.
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
- **Not a Transitrix Studio-rendered notation.** Operations files are plain Markdown — no rendering pipeline, no notation header, no extension convention.

## 10. References

- Worked example: [`organizations/acme_corp/operations/`](../organizations/acme_corp/operations/).
- Methodology overview: [`method/methodology.md`](methodology.md) §4 — repository structure.
- Distinct from the model-side issues catalogue: [`notations/views/12-issues.md`](../notations/views/12-issues.md).
- Distinct from the canon zones: [`notations/CONTRACT.md`](../notations/CONTRACT.md) §5.

---

**Status:** draft — new in this release. The convention is intentionally small; widen it only when an adopter team demonstrates a recurring need the current shape does not cover.
