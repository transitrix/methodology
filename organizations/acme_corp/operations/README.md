# Operations — acme_corp

The **operational layer** for the team applying Transitrix to the `acme_corp` model. Distinct from the model itself (`canon/`, `field/`, `codex/`) — this folder is where the team records the decisions it has made about its own setup and the units of work it currently has in flight.

> Convention canon: [`method/team-operations.md`](../../../method/team-operations.md). This README is the **local** rules — it adapts the convention to how the `acme_corp` team works, and it should fit on one screen.

## Layout

```
operations/
├── README.md            # this file — local rules
├── decisions/           # ADR-NNNN-<slug>.md — Architecture Decision Records
└── work-items/          # WI-NNNN-<slug>.md — Work Items
```

## Two file shapes

- **ADR — Architecture Decision Record.** A short, append-only record of a decision about how the team runs the model. Once `status: accepted` the body is immutable; a later decision that changes course is a **new** ADR that names this one in its `superseded_by:` field. Schema: [`method/team-operations.md`](../../../method/team-operations.md) §3.1. Template: [`../.templates/operations/ADR-template.md`](../.templates/operations/ADR-template.md).

- **WI — Work Item.** A short record of a piece of work the team has in flight or queued. Mutable while active; `closed` when done — not deleted. Schema: [`method/team-operations.md`](../../../method/team-operations.md) §3.2. Template: [`../.templates/operations/WI-template.md`](../.templates/operations/WI-template.md).

## What goes where — local rules

| Situation | File shape |
|---|---|
| The team agreed on a way the repo or model is set up (a versioning pin, a naming override, a process choice) | **ADR** in `decisions/` |
| Someone is doing a piece of work that touches one or more model entities (filling in capability assessments, drafting a view, refactoring a relation set) | **WI** in `work-items/` |
| An architectural problem about the modelled enterprise (e.g. a defect in a process, a risk in a system) | **NOT here** — file an `ISSUE` under `canon/views/issues/` (model-side, see [`notations/views/12-issues.md`](../../../notations/views/12-issues.md)) |
| A long discussion or proposal that has not landed on a decision | The pull-request that opens the candidate ADR — not a separate file here |

## Linking into the model — `relates_to:`

Both ADR and WI carry an optional `relates_to:` list of model entity IDs (Goals, Capabilities, Activities, …). That is the only link from operations into the model. The model **never** links back — nothing in `canon/` references an ADR or a WI.

`relates_to:` entries use the canonical ID grammar from [`notations/IDS_AND_REFERENCES.md`](../../../notations/IDS_AND_REFERENCES.md) §3. Unresolved IDs are treated as warnings, not errors — the doc-lint does not validate `operations/`.

## Local flow

- **Opening an ADR.** Open a PR with `status: proposed`. Discussion lives on the PR. On merge the status flips to `accepted`. Owner: Valerii (sole maintainer of `acme_corp` today).
- **Superseding an ADR.** Open a new ADR; in the same PR set the old ADR's `status: superseded` and `superseded_by:`. The old body is otherwise untouched.
- **Opening a Work Item.** Anyone on the team may open a WI with `status: proposed` or `status: in_progress`. Update the status as the work moves. On completion set `status: done` (outcome recorded in body) or `status: closed` (won't do / withdrawn).

## Numbering

Sequence is per-folder, monotonically increasing, four-digit zero-padded (`ADR-0001`, `WI-0042`). When opening a new file pick the next free number.
