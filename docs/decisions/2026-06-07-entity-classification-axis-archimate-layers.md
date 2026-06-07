---
title: "Entity classification axis is the ArchiMate layer; governance docs are cross-cutting"
status: accepted
date: "2026-06-07"
scope: methodology
supersedes: null
superseded_by: null
tags: [taxonomy, layers, archimate, coverage-profile, manifest, governance, notations, organization]
---

# ADR: Entity classification axis is the ArchiMate layer; governance docs are cross-cutting

**Status:** Accepted
**Date:** 2026-06-07
**Deciders:** Valerii Korobeinikov
**Scope:** Repo-local to `methodology` — the `notations/` vocabulary and its root-level documents. This ADR records how element TYPEs are classified and where the adoption-mechanism docs sit; it introduces no new public-facing claim and no schema change.

---

## Context

A reorganization question was raised: `COVERAGE_PROFILES.md` reads as "operational" rather than as a description of the model, which prompted the broader question of whether the methodology should separate **model entities** from **operational-activity entities** as a top-level distinction.

Two facts frame the answer:

1. **`COVERAGE_PROFILES.md` is not an entity description.** It defines the mechanism by which an adopter declares, in `transitrix.yaml`, which slice of the vocabulary (per-layer element TYPEs + relation kinds) is in scope for a repository. By genre it sits beside `MANIFEST.md` (the `transitrix.yaml` envelope), not beside `ELEMENT_PRIMITIVES.md` / `IDS_AND_REFERENCES.md`, which describe the entities themselves. It is orthogonal to any "model vs operational" axis — it governs *how the methodology is used*, not *what exists in the model*.

2. **A model-vs-operational split already exists — it is the ArchiMate layer axis.** `IDS_AND_REFERENCES.md` §3.1 already places every element TYPE on a layer (`01_motivation`, `02_business`, `03_application`, `04_technology`, `05_implementation`). The execution/delivery ("operational") entities are precisely `05_implementation`: `ACTIVITY`, `CHANGE`, `MILESTONE`, `SCENARIO`, `TARGET_STATE` (`ISSUE` is adjacent). The descriptive enterprise model is `01`–`04`. This split is canonical and ArchiMate-anchored.

The forces: a second top-level "model / operational" taxonomy would compete with the layer axis, create ambiguity for border TYPEs, and require keeping two classifications in sync. Against that, the instinct behind the question — that the `notations/` root mixes document *kinds* — is legitimate and worth recording.

## Decision

1. **The single classification axis for element TYPEs is the ArchiMate layer.** "Operational-activity entities" are not a separate taxonomy; they are the `05_implementation` layer. No parallel model-vs-operational split is introduced.

2. **`COVERAGE_PROFILES.md` and `MANIFEST.md` are cross-cutting governance / adoption-mechanism documents**, not entity descriptions. They are not classified as "operational" and are not grouped with the layer vocabulary. `README.md` already signposts both as cross-cutting; that framing stands.

3. **The legitimate root-level grouping, if ever made explicit, is by document kind** — model-definition docs (`CONTRACT.md`, `ELEMENT_PRIMITIVES.md`, `IDS_AND_REFERENCES.md`) vs adoption/tooling docs (`MANIFEST.md`, `COVERAGE_PROFILES.md`) — not by "model vs operational". This is at most a one-line clarification in `README.md`; no folder split.

## Alternatives

- **Introduce a top-level "model entities vs operational entities" taxonomy.** Rejected: duplicates the layer axis, forces sync of two classifications, and creates border-case ambiguity (e.g. where `REGISTRY`, `RULE`, `STEP` fall). The layer axis already answers the question with ArchiMate backing.

- **File `COVERAGE_PROFILES.md` under an "operational" grouping.** Rejected: a category error — it describes no entity; it is a scoping mechanism over the vocabulary, peer to `MANIFEST.md`.

- **Physically split the `notations/` root into subfolders by document kind.** Rejected (for now): low value, and it would break a large number of internal cross-links. The `README.md` cross-references already make the two kinds legible.

## Consequences

- No file moves, no schema changes, no link churn. The current layout stands.
- Future "which group does this entity belong to" questions resolve to "which layer", with one canonical answer in `IDS_AND_REFERENCES.md` §3.1.
- If `README.md` is revised, a one-line note may group root docs as model-definition vs adoption/tooling. Optional and cosmetic; not required by this ADR.
- Border-case TYPEs (`REGISTRY`, `RULE`, `STEP`, `ISSUE`) are classified by their declared layer, not by an "operational?" judgement call.
