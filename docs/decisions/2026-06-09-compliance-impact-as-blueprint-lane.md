---
status: Proposed
date: 2026-06-09
scope: repo
supersedes: []
superseded_by: []
tags: [process-blueprint, compliance-impact, view-config, lanes, obligations, assertion, requirement, codex, stage-level, derived-view, novelty, deadline, gap, entry-modes, renderer, ux, operational-settings]
---

# Compliance impact as a configurable Process-Blueprint lane

## Context

The compliance-impact view (`notations/views/21-compliance-impact.md`) today renders a flat subject × obligation matrix. Operating it showed that the most legible form of "which laws bear on our process" is the **Process Blueprint** shape: the value-chain stages across the top, and a lane beneath them listing the laws that impact each stage — with optional drill-down to the underlying assertions and requirements.

The data to draw this already exists in canon:

- the Process Blueprint (`notations/views/13-process-blueprint.md`) provides the **stage skeleton** and its existing aspect lanes (systems → APPLICATION, actors → ROLE, equipment, business_objects);
- an `ASSERTION` binds an obligation to where it is realised (`realised_via`), which resolves to a process stage/step, and carries a compliance `status`;
- a `REQUIREMENT` resolves to its source law/regulation via `derived_from` → codex (carrying jurisdiction), and carries a `deadline`.

So "the laws under each stage" is a **derived** projection of assertions onto the blueprint's stages — not new stored data. This ADR settles how that compliance row is structured, configured, and decorated.

**Navigation frame (three entry modes).** The compliance lane is one *entry mode* into the obligation graph (law → segment → requirement/constraint → assertion → object): the **by-object** entry ("what binds this stage?"). The same graph is also entered **by obligation** ("what does this law touch — are we compliant?") and **by event** ("what just changed, and who is affected?"). The blueprint lane is the by-object surface; other compliance views serve the other two modes — all derived from the same data (view-purity). This ADR specs the by-object surface; the other modes are noted so the surfaces stay coherent, not specced here.

## Decision

(Recommended; `status: Proposed` — gated. Direction set with Valerii 2026-06-09; one config-layering point remains open below.)

1. **The Process Blueprint view becomes lane-configurable.** A configuration selects which aspect lanes render (systems, actors, equipment, business_objects, compliance, …) — each individually show/hide-able — rather than always drawing every lane. This is a *rendering* configuration; it does not change the blueprint's stored data. (Where that configuration lives — versioned report definition vs operational display preference — see §6 and Open points.)

2. **Compliance / obligations is one such lane — derived, not stored.** When enabled, the compliance lane is computed per stage: gather the `ASSERTION`s whose `realised_via` hits the stage, lift each via `REQUIREMENT.derived_from` to its codex (law), and show the impacting laws beneath that stage. No compliance data is written into the blueprint canon; the lane is a projection. This is the blueprint-shaped realisation of the compliance-impact view, and it reuses the report view-config mechanism from `docs/decisions/2026-06-09-report-skill-over-declarative-views.md` (parameters live in a versioned view-config; render is deterministic).

3. **Collapsed cell = law IDs, with three orthogonal status signals.** A compliance cell under a stage lists the impacting **law IDs**. Each law chip carries up to three stacking decorations, each computed from canon:
   - **New** — the law's impact on this stage **appeared since the previous generated snapshot of this report**. Decoration: **dashed border**. (Diff-against-last; well-defined because the report is a versioned, deterministically re-rendered view-config.)
   - **Known gap** — the law's binding `ASSERTION.status` is a non-conformance (`non_compliant` / `partial`): we have assessed it and our systems do **not** comply. Decoration: a gap highlight (e.g. status colour / fill).
   - **Gap with a deadline** — a known gap **and** a compliance deadline is approaching or passed. The deadline is the **external regulatory date carried on `REQUIREMENT.deadline`**, surfaced through a temporal obligation status (`past_due` / `in_force` / `upcoming`); an internal remediation target on the `ASSERTION` stays a separate optional overlay, not this marker. Decoration: a distinct **urgent** marker (the operational "act now" state).

   The three are orthogonal and stack (a law may be *new* + *gap* + *deadline*). Border style = novelty; fill/colour = compliance status; an added badge = deadline risk.

4. **Drill-down on demand.** A cell expands to the underlying `ASSERTION`s (status, evidence) and their `REQUIREMENT` / codex — the optional detail layer, not shown by default ("при необходимости"). The full audit chain (down to the verbatim source segment + snapshot) is a deeper drill-down noted as a backlog surface, not specced here.

5. **Jurisdiction & filters from the report definition.** The compliance lane honours the existing compliance-impact filters (e.g. jurisdiction via `derived_from`), so a blueprint can be drawn for one regime or several.

6. **Config layering — report *definition* vs operational *display* (recommended split).** Two kinds of configuration are deliberately kept apart:
   - **Report definition** (audit-relevant, versioned) — *what obligations the report is about*: scope, jurisdiction filter, the obligation/stage selection. Lives in the named, versioned view-config (the report-skill mechanism), so a compliance report is reproducible and diffable — which is also what makes the §3 "new since last" signal well-defined.
   - **Operational display preferences** (not canon, not normative) — *which lanes are toggled on*, decoration preferences, and similar view ergonomics. These are operational/tool settings, not part of the obligation audit trail, and need not be versioned as canon. A *named* report may, however, pin its lane-set into its own definition so it re-renders identically.
   The compliance lane's **semantics** (its derivation and the §3 decoration vocabulary) stay normative in the compliance-impact view spec; only the per-view *toggle* is operational. *(Direction leaning — to confirm at the gate, see Open points.)*

## Open points (for the gate)

- **Config layering / operational-settings home (Decision §6).** Confirm the definition-vs-display split (and that a named report pins its lane-set), and decide where operational display preferences live (a per-repo/per-user operational settings surface, distinct from canon and from the `notations/` view spec). Relates to the broader operational-constants / config-vs-state separation already under discussion.

*(Resolved 2026-06-09: the deadline data source — `REQUIREMENT.deadline` (external regulatory date) + temporal status; see Decision §3 and the Decision record.)*

## Alternatives considered

- **A — Bake an `obligations` aspect into the Process Blueprint notation (stored).** Rejected: couples the blueprint canon to the compliance model and duplicates data already derivable from assertions; the lane should be computed, not authored.
- **B — A separate "compliance blueprint" notation.** Rejected: duplicates the stage layout and grows the notation count for what is a rendering of an existing view.
- **C — Keep only the flat matrix.** Rejected: the stage-by-stage "where does each law bite" question is exactly what the blueprint shape answers and the matrix does not.
- **D — Put lane-visibility toggles in the versioned report definition.** Not chosen as the default: which lanes a viewer toggles is a display ergonomic, not obligation data; keeping it out of the versioned definition avoids churn in the audit trail. (A named report may still pin its lane-set — §6.)

## Consequences

- **Methodology:** the compliance-impact view spec gains the blueprint-lane layout + the §3 decoration vocabulary; depends on `ASSERTION.realised_via` resolving at stage / step grain, `ASSERTION.status`, `REQUIREMENT.derived_from` → codex, and `REQUIREMENT.deadline` + a temporal obligation status (`past_due` / `in_force` / `upcoming`).
- **No blueprint canon change:** the Process Blueprint data model is untouched; only its view / rendering gains lane toggles.
- **Operational-settings surface:** the recommended split (Decision §6) implies a small operational/display-preferences home distinct from canon — to be specified with the operational-config work, not in `notations/`.
- **Render side (Studio / DSM):** the blueprint renderer learns lane toggles, the derived compliance lane, the three stacking decorations (dashed = new, gap fill, deadline badge), and cell expansion. Builds on the interim compliance-impact renderer already in progress. A local ADR in those repos cross-references this one.
- **Reproducibility:** because the report definition is a versioned view-config, a blueprint-compliance report re-renders identically and diffs over time — the foundation for the "new since last" signal.

### Decision record

- **Proposed by Win-Claude, 2026-06-09**, from a report-shape discussion with Valerii: render compliance impact in Process-Blueprint form with a configurable, derived law lane and optional assertion/requirement drill-down.
- **Refined with Valerii, 2026-06-09:** cell decoration is three orthogonal signals — *new* (since last snapshot; dashed border), *known gap* (`ASSERTION.status` non-conformance), and *gap with a deadline* (urgent); lane-visibility config leans toward operational display settings (a named report may pin its lane-set), kept separate from the versioned report definition.
- **Refined with Valerii, 2026-06-09 (UX use-case review):** deadline data source resolved → `REQUIREMENT.deadline` (external regulatory date; an internal `ASSERTION` remediation target is a separate optional overlay), surfaced via a temporal status (`past_due` / `in_force` / `upcoming`). Adopted the three entry-modes framing (by object / by obligation / by event). One open point remains: the operational-settings home for display preferences.
