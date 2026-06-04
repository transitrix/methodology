---
id: ADR-0001
title: "Adopt the Team Operations convention alongside the model"
status: accepted
date: "2026-06-03"
relates_to: []
superseded_by: null
---

## Context

The `acme_corp` repository carries a Transitrix architecture model (`canon/` + `field/` + `codex/`) and a small set of team-running artefacts that had no canonical home: notes on which methodology version is pinned, who maintains what, in-flight refactors. Until now those lived as ad-hoc comments on pull requests and were lost as soon as the PR closed.

The methodology now defines a **Team Operations** convention ([`method/team-operations.md`](../../../../method/team-operations.md)): a sibling folder `operations/` with `decisions/` and `work-items/`, deliberately outside the zone model. The convention is minimal — a folder, two file shapes, one linking rule — and intended to live under the same version control as the model.

## Decision

The `acme_corp` worked example adopts the Team Operations convention in full, starting at `operations/`. ADRs and Work Items follow the canonical schema; no local extensions are introduced at this point.

## Consequences

- Future decisions about how the `acme_corp` model is run (version pins, naming overrides, refactor scope) land as ADRs in `operations/decisions/`, not in PR comments.
- In-flight work that spans several PRs may be tracked as a Work Item in `operations/work-items/` to make the connection explicit.
- The convention is **not** subject to the doc-lint (`scripts/check-notations.mjs`) — operations files are plain Markdown outside the linter's scope. Drift in this layer is caught at PR review, not by CI.
- If a heavier process is ever needed (sprints, prioritisation, SLAs), the team will outgrow this convention and move to a dedicated tracker; this ADR will be superseded.
