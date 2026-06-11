# Methodology Decision Records — index

Repo-scoped Architecture Decision Records for the Transitrix methodology canon.
One file per decision, `YYYY-MM-DD-<slug>.md`, with `status` / `date` / `scope`
front-matter. `scope: repo` records are methodology-wide design decisions;
adopter teams keep their own `operations/decisions/ADR-NNNN-…` log separately
(see `method/methodology.md` §4.1, Team Operations).

`status` values: **Proposed** (direction not yet gated) · **Accepted** (decided;
implementation PRs follow) · **Superseded** (replaced by a later ADR).

| Date | Decision | Status | Scope |
|---|---|---|---|
| 2026-06-11 | [Single canonical front door for new adopters](2026-06-11-onboarding-entry-front-door.md) | Accepted | repo |
| 2026-06-11 | [Validation: converge on one runtime; scope axis](2026-06-11-validation-two-axis-model.md) | Accepted | repo |
| 2026-06-11 | [Architecture Decision Log (ADL) — multi-repo aggregation component](2026-06-11-architecture-decision-log.md) | Proposed | repo |
| 2026-06-10 | [Tiered approval — reviewer-authority axis (AI-reviewed → expert-confirmed)](2026-06-10-tiered-approval-reviewer-authority.md) | Proposed | repo |
| 2026-06-10 | [Source-of-truth for monitored sources — codex `scan` vs REGISTRY](2026-06-10-codex-registry-monitoring-source-of-truth.md) | Proposed | repo |
| 2026-06-09 | [Canonical home for element aliases / alternative names](2026-06-09-element-aliases.md) | Proposed | repo |
| 2026-06-08 | [EQUIPMENT and BUSINESS_OBJECT become first-class catalogued elements](2026-06-08-equipment-catalogued-element.md) | Accepted | repo |
