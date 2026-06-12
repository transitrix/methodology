---
status: Accepted
date: 2026-06-09
scope: repo
supersedes: []
superseded_by: []
tags: [process-blueprint, compliance-impact, view-config, lanes, obligations, assertion, requirement, codex, stage-level, derived-view, novelty, deadline, gap, entry-modes, renderer, ux, operational-settings, user-settings]
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

(Accepted — Valerii, 2026-06-09. All open points resolved; see the Decision record.)

1. **The Process Blueprint view becomes lane-configurable.** A configuration selects which aspect lanes render (systems, actors, equipment, business_objects, compliance, …) — each individually show/hide-able — rather than always drawing every lane. This is a *rendering* configuration; it does not change the blueprint's stored data. (Where that configuration lives — versioned report definition vs per-user local display preference — see §6.)

2. **Compliance / obligations is one such lane — derived, not stored.** When enabled, the compliance lane is computed per stage: gather the `ASSERTION`s whose `realised_via` hits the stage, lift each via `REQUIREMENT.derived_from` to its codex (law), and show the impacting laws beneath that stage. No compliance data is written into the blueprint canon; the lane is a projection. This is the blueprint-shaped realisation of the compliance-impact view, and it reuses the report view-config mechanism from `docs/decisions/2026-06-09-report-skill-over-declarative-views.md` (parameters live in a versioned view-config; render is deterministic).

3. **Collapsed cell = law IDs, with three orthogonal status signals.** A compliance cell under a stage lists the impacting **law IDs**. Each law chip carries up to three stacking decorations, each computed from canon:
   - **New** — the law's impact on this stage **appeared since the previous generated snapshot of this report**. Decoration: **dashed border**. (Diff-against-last; well-defined because the report is a versioned, deterministically re-rendered view-config.)
   - **Known gap** — the law's binding `ASSERTION.status` is a non-conformance (`non_compliant` / `partial`): we have assessed it and our systems do **not** comply. Decoration: a gap highlight (e.g. status colour / fill).
   - **Gap with a deadline** — a known gap **and** a compliance deadline is approaching or passed. The deadline is the **external regulatory date carried on `REQUIREMENT.deadline`**, surfaced through a temporal obligation status (`past_due` / `in_force` / `upcoming`); an internal remediation target on the `ASSERTION` stays a separate optional overlay, not this marker. Decoration: a distinct **urgent** marker (the operational "act now" state).

   The three are orthogonal and stack (a law may be *new* + *gap* + *deadline*). Border style = novelty; fill/colour = compliance status; an added badge = deadline risk.

4. **Drill-down on demand.** A cell expands to the underlying `ASSERTION`s (status, evidence) and their `REQUIREMENT` / codex — the optional detail layer, not shown by default ("при необходимости"). The full audit chain (down to the verbatim source segment + snapshot) is a deeper drill-down noted as a backlog surface, not specced here.

5. **Jurisdiction & filters from the report definition.** The compliance lane honours the existing compliance-impact filters (e.g. jurisdiction via `derived_from`), so a blueprint can be drawn for one regime or several.

6. **Config layering — report *definition* (shared, versioned) vs display *preferences* (per-user, local).** Two kinds of configuration are kept apart:
   - **Report definition** (audit-relevant, versioned, shared) — *what obligations the report is about*: scope, jurisdiction filter, the obligation/stage selection. Lives in the named, versioned view-config (the report-skill mechanism), so a compliance report is reproducible and diffable — which is also what makes the §3 "new since last" signal well-defined. A *named* report may pin its lane-set here so it re-renders identically for everyone.
   - **Display preferences** (per-user, local, never committed) — *which lanes a person toggles on for themselves*, decoration preferences, and similar view ergonomics. They are individual and **not shared**: they live as local files in a dedicated settings folder that is itself **tracked by a `.gitkeep`** (so the folder's location is defined in the repo) while **its contents are `.gitignore`d** — the folder therefore appears **empty to every other user**, and each person keeps their own preferences locally. The exact folder name/location is an implementation detail of the operational/tooling layer, not `notations/`.

   The compliance lane's **semantics** (its derivation and the §3 decoration vocabulary) stay normative in the compliance-impact view spec; only the per-user *toggle* is a local preference.

## Open points

None — both prior open points were resolved on 2026-06-09 (deadline source → `REQUIREMENT.deadline`; operational-settings home → per-user local files in a `.gitkeep`-tracked, `.gitignore`d-contents folder). See the Decision record.

## Alternatives considered

- **A — Bake an `obligations` aspect into the Process Blueprint notation (stored).** Rejected: couples the blueprint canon to the compliance model and duplicates data already derivable from assertions; the lane should be computed, not authored.
- **B — A separate "compliance blueprint" notation.** Rejected: duplicates the stage layout and grows the notation count for what is a rendering of an existing view.
- **C — Keep only the flat matrix.** Rejected: the stage-by-stage "where does each law bite" question is exactly what the blueprint shape answers and the matrix does not.
- **D — Put lane-visibility toggles in the versioned report definition (for everyone).** Not chosen as the default: a personal toggle is a display ergonomic, not obligation data; keeping casual toggles out of the versioned definition avoids churn in the audit trail. (A *named* report may still pin its lane-set — §6.)
- **E — Commit per-user display preferences to the repo.** Rejected: preferences are individual; committing them creates noise and cross-user conflicts. They stay local and `.gitignore`d, with only a `.gitkeep`-tracked empty folder shared.

## Consequences

- **Methodology:** the compliance-impact view spec gains the blueprint-lane layout + the §3 decoration vocabulary; depends on `ASSERTION.realised_via` resolving at stage / step grain, `ASSERTION.status`, `REQUIREMENT.derived_from` → codex, and `REQUIREMENT.deadline` + a temporal obligation status (`past_due` / `in_force` / `upcoming`).
- **No blueprint canon change:** the Process Blueprint data model is untouched; only its view / rendering gains lane toggles.
- **Operational-settings surface:** a **per-user, local** display-preferences folder, kept by a `.gitkeep` with `.gitignore`d contents (empty for others); preferences are never committed. The exact folder name/location is an implementation detail for the view/tooling layer, not `notations/`. Defined alongside the broader operational-config work.
- **Render side (Studio / DSM):** the blueprint renderer learns lane toggles, the derived compliance lane, the three stacking decorations (dashed = new, gap fill, deadline badge), and cell expansion; it reads display preferences from the local settings folder and the report definition from the versioned view-config. Builds on the interim compliance-impact renderer already in progress. A local ADR in those repos cross-references this one.
- **Reproducibility:** because the report definition is a versioned view-config, a blueprint-compliance report re-renders identically and diffs over time — the foundation for the "new since last" signal. Per-user display tweaks do not affect the shared definition.

### Decision record

- **Proposed by the maintainer, 2026-06-09**, from a report-shape discussion with Valerii: render compliance impact in Process-Blueprint form with a configurable, derived law lane and optional assertion/requirement drill-down.
- **Refined with Valerii, 2026-06-09:** cell decoration is three orthogonal signals — *new* (since last snapshot; dashed border), *known gap* (`ASSERTION.status` non-conformance), and *gap with a deadline* (urgent); deadline source = `REQUIREMENT.deadline` (external regulatory date; an internal `ASSERTION` remediation target is a separate optional overlay) surfaced via a temporal status (`past_due` / `in_force` / `upcoming`); adopted the three entry-modes framing (by object / by obligation / by event).
- **Accepted by Valerii, 2026-06-09:** display preferences (lane toggles, decoration prefs) are **per-user and local** — kept in a dedicated settings folder tracked by `.gitkeep` while its contents are `.gitignore`d (empty for other users), never committed, not canon. Named reports still pin their lane-set in the versioned report definition. With this and the deadline-source resolution, all open points are closed and the ADR is **Accepted**.
