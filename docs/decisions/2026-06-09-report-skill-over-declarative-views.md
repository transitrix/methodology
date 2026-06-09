---
status: Proposed
date: 2026-06-09
scope: repo
supersedes: []
superseded_by: []
tags: [reports, views, view-config, report-config, skill, cli, renderer, ux, parameters, reproducibility, compliance-impact, scenarios, tooling, portability]
---

# Reports are rendered from declarative view-configs; a thin conversational skill is the front-end

## Context

Transitrix already models a "view" as a **declarative report-config artefact**: the scenarios view (`notations/views/11-scenarios.md`) and the compliance-impact derived view (`notations/views/21-compliance-impact.md`, §7 report-config) are configuration documents — filters, scope, grouping, ordering — that a renderer turns into output. The render itself is (or will be) a deterministic step over canon plus the config.

What is **not** yet settled is the *operator UX*: how a person actually produces a report, and where its parameters live. The realistic entry point is conversational — a user asks an agent "give me the obligation impact for product X" — but the parameters of that request have to land somewhere. Two failure modes to avoid:

1. **A "fat skill"** that re-implements filtering/rendering logic inside the agent. Non-deterministic, drifts from the canonical view semantics, and breaks portability across agent runtimes.
2. **Reports whose parameters live only in a chat prompt.** Not reproducible, not versioned, not auditable — unacceptable for compliance reporting in particular, where "produce the same report next quarter" and "show who changed the report definition" are baseline requirements.

Surfaced 2026-06-09 while discussing report UX. Within the Transitrix family; no external data involved.

## Decision

(Recommended direction; `status: Proposed` — the resolution is gated.)

1. **The parameter object of a report is a declarative view-config artefact, not chat state.** Every report parameter — filters (e.g. jurisdiction, status, severity), scope (e.g. a single law or product), grouping columns, ordering — is expressed in a view-config and versioned in the repository. This is the existing report-config shape under `notations/views/`, not a new concept.

2. **Rendering is deterministic and lives in a CLI/library, never in the agent.** The renderer (a compliance/view export CLI, backed by the shared `@transitrix/diagrams` library) consumes `(view-config + canon)` and emits the report. The agent shells out to it; the agent does not compute the matrix. Same "deterministic guarantees never depend on the runtime" principle the validators already follow.

3. **A thin "report" skill is the conversational front-end.** Its only responsibilities: (a) understand the request; (b) **resolve parameters** — from the chat, from the view spec's defaults, or from a named saved view-config; (c) materialise or update a **named view-config artefact**; (d) invoke the renderer CLI; (e) return the output together with the path of the config it used. No render logic in the skill. Heavy logic stays in invokable scripts and the `SKILL.md` stays agent-neutral, so the skill loads under multiple agent runtimes — the same discipline the ingest skill follows.

4. **Parameter resolution and re-asking.** A required parameter with no safe default (e.g. the subject of a single-product view) → the skill asks once, concisely. Everything else → spec defaults (e.g. a compliance export defaults to the full matrix), and the skill **states which defaults it applied** ("full matrix, no jurisdiction filter — showing all"). No interrogation; one short clarification round at most.

5. **Named, reusable reports.** Saved view-configs form a small report registry the user can list and re-run by name ("run the Q3 obligations matrix"). Re-running is a re-render of the same committed config against current canon — reproducible and diffable over time.

6. **Tooling, not normative canon (for now).** The report skill and its renderer CLI are *tooling*, like the ingest skill and its CLI — kept in-repo until a tooling-extraction point and **not described in `notations/`**. The only normative surface this decision leans on is the existing view-config (report-config) shape, which already lives in `notations/views/`. If reports later become a public-facing narrative ("ask your repository for a compliance report"), the external wording is decided separately from this mechanism.

## Alternatives considered

- **A — Conversational-only, ephemeral reports (no artefact).** Rejected: not reproducible or auditable; compliance reporting needs a versioned parameter record. A chat transcript is not an audit trail.
- **B — Fat skill that renders in-agent.** Rejected: non-deterministic, drifts from canonical view semantics, and is not portable across agent runtimes. Rendering must stay in the deterministic CLI/library.
- **C — Config-only, no skill (the user hand-writes a view-config and runs the CLI).** Not rejected as a path — it remains the power-user escape hatch, and the skill writes exactly the same artefact a human would — but rejected as the *only* path: too high-friction for the "just ask in chat" UX this decision is about.
- **D — A GUI parameter form in the visual consumers.** Complementary, not competing: a visual editor can edit the same view-config. Out of scope here; this ADR is about the conversational + CLI path.

## Consequences

- **New tooling, not new canon:** a `report`/`view` skill in `skills/` plus the renderer CLI subcommands; the skill orchestrates, the CLI renders. No `notations/` change beyond relying on the existing report-config shape.
- **Reproducibility and audit:** every report has a committed config; "the same report next quarter" is a re-render, and the report definition is diffable and attributable.
- **Defaults must be specified per view.** For the skill's "state what I assumed" behaviour to be well-defined, each view spec must declare its defaults explicitly. This is a small follow-on for the view specs that don't yet pin defaults.
- **Within-family consumers:** the visual consumers (Studio / DSM) render the same view-configs; a local ADR in those repos should cross-reference this one. Stays within the Transitrix family — no hub ADR.
- **Portability cost:** the skill must stay thin and script-backed to load under more than one agent runtime — the same constraint the ingest skill carries.

### Decision record

- **Proposed by Win-Claude, 2026-06-09**, from a report-UX discussion. Open point for the resolution gate: confirm the "view-config is the parameter artefact + thin skill over a deterministic renderer CLI" direction, and decide whether the report skill ships in-repo now or waits for the tooling-extraction repo (consistent with how the ingest tooling is treated).
