---
status: Proposed
date: 2026-06-09
scope: repo
supersedes: []
superseded_by: []
tags: [process-blueprint, compliance-impact, view-config, lanes, obligations, assertion, requirement, codex, stage-level, derived-view, novelty, renderer, ux]
---

# Compliance impact as a configurable Process-Blueprint lane

## Context

The compliance-impact view (`notations/views/21-compliance-impact.md`) today renders a flat subject × obligation matrix. Operating it showed that the most legible form of "which laws bear on our process" is the **Process Blueprint** shape: the value-chain stages across the top, and a lane beneath them listing the laws that impact each stage — with optional drill-down to the underlying assertions and requirements.

The data to draw this already exists in canon:

- the Process Blueprint (`notations/views/13-process-blueprint.md`) provides the **stage skeleton** and its existing aspect lanes (systems → APPLICATION, actors → ROLE, equipment, business_objects);
- an `ASSERTION` binds an obligation to where it is realised (`realised_via`), which resolves to a process stage/step;
- a `REQUIREMENT` resolves to its source law/regulation via `derived_from` → codex (carrying jurisdiction).

So "the laws under each stage" is a **derived** projection of assertions onto the blueprint's stages — not new stored data. The open question this ADR answers is how that compliance row is structured, configured, and decorated.

## Decision

(Recommended; `status: Proposed` — gated. Direction set with Valerii 2026-06-09; two sub-points flagged open below.)

1. **The Process Blueprint view becomes lane-configurable.** A view-config selects which aspect lanes render (systems, actors, equipment, business_objects, …) — each individually show/hide-able — rather than always drawing every lane. This is a *rendering* configuration; it does not change the blueprint's stored data.

2. **Compliance / obligations is one such lane — derived, not stored.** When enabled, the compliance lane is computed per stage: gather the `ASSERTION`s whose `realised_via` hits the stage, lift each via `REQUIREMENT.derived_from` to its codex (law), and show the impacting laws beneath that stage. No compliance data is written into the blueprint canon; the lane is a projection. This is the blueprint-shaped realisation of the compliance-impact view, and it reuses the report view-config mechanism from `docs/decisions/2026-06-09-report-skill-over-declarative-views.md` (parameters live in a versioned view-config; render is deterministic).

3. **Collapsed cell = law IDs, with newness decorated.** A compliance cell under a stage lists the impacting **law IDs**. Laws that are **new** are drawn with a **dashed border**, to draw the eye to what has changed. *(OPEN — gate: the definition of "new" — see Open points.)*

4. **Drill-down on demand.** A cell expands to the underlying `ASSERTION`s (status, evidence) and their `REQUIREMENT` / codex — the optional detail layer, not shown by default ("при необходимости").

5. **Jurisdiction & filters from the view-config.** The compliance lane honours the existing compliance-impact filters (e.g. jurisdiction via `derived_from`), so a blueprint can be drawn for one regime or several.

## Open points (for the gate)

- **Novelty definition (Decision §3).** What "new" means for the dashed border. Lean: *new since the previous generated snapshot of this report* (diff-against-last) — answers "what changed since I last looked", and is well-defined precisely because the report is a versioned view-config that re-renders deterministically. Alternatives: a recency window on `valid_from` / admission date, or "pending admission" (proposed-but-not-yet-admitted). To pin before build.
- **Spec home.** Whether the lane-toggle config is specified in the Process Blueprint view spec or the compliance-impact view spec (the two converge here). Lean: define the compliance lane and its config in the **compliance-impact view**, *referencing* the blueprint stage structure as the column axis — keeps compliance logic in one place and leaves the blueprint notation unchanged.

## Alternatives considered

- **A — Bake an `obligations` aspect into the Process Blueprint notation (stored).** Rejected: couples the blueprint canon to the compliance model and duplicates data already derivable from assertions; the lane should be computed, not authored.
- **B — A separate "compliance blueprint" notation.** Rejected: duplicates the stage layout and grows the notation count for what is a rendering of an existing view.
- **C — Keep only the flat matrix.** Rejected: the stage-by-stage "where does each law bite" question is exactly what the blueprint shape answers and the matrix does not.

## Consequences

- **Methodology:** the compliance-impact view spec gains the blueprint-lane layout + lane-visibility config + the newness decoration rule; depends on `ASSERTION.realised_via` resolving at stage / step grain (the stage-level prerequisite) and `REQUIREMENT.derived_from` → codex.
- **No blueprint canon change:** the Process Blueprint data model is untouched; only its view / rendering gains lane toggles.
- **Render side (Studio / DSM):** the blueprint renderer learns lane toggles + the derived compliance lane + the dashed-border "new" decoration + cell expansion. Builds on the interim compliance-impact renderer already in progress. A local ADR in those repos cross-references this one.
- **Reproducibility:** because the whole thing is driven by a versioned view-config, a blueprint-compliance report re-renders identically and diffs over time — which is also what makes the "new since last" decoration well-defined.

### Decision record

- **Proposed by Win-Claude, 2026-06-09**, from a report-shape discussion with Valerii: render compliance impact in Process-Blueprint form with a configurable, derived law lane (collapsed = law IDs, new ones dashed-bordered) and optional assertion / requirement drill-down. Two open points (novelty definition; spec home) await the gate.
