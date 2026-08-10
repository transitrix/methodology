---
title: Catalogue integration levels — joining a network around a central catalogue
status: draft
last_reviewed: 2026-08-10
audience: public
license: MIT
tags: [transitrix, methodology, operations, catalogue, federation, governance]
---

# Catalogue integration levels — joining a network around a central catalogue

> How a project repository relates to a **central repository** holding a shared catalogue — a per-organisation architecture repository, or any repository other project repositories treat as authoritative for a set of elements. One repository modelling on its own needs none of this; it applies once a second repository's canon should be able to recognise the first's.

This document names the **ownership rule** every level below assumes, and the **four levels** at which a project repository can integrate with a central one. Each level is separately enabled and useful on its own — a repository may stop at any level, and stopping is not a partial or broken state.

## 1. The ownership rule

**Exactly one repository owns each element.** For an element the central repository has admitted, the central repository owns it — its canonical `id`, its `name`, its content — and every other repository's relationship to it is by reference, never by copy. For an element only a project repository has admitted, that project repository owns it, exactly as it always has; nothing below changes what an unfederated repository does today.

Ownership is not renamed by binding. A project repository's locally authored element keeps its own `id` for as long as the repository exists — binding to a central element (§3) adds a fact about the element, it never substitutes the central element's identity for the local one. **No tool ever rewrites a local `id`.**

## 2. The four levels

| Level | What a project repository does | Specified |
|---|---|---|
| **L0 — decisions** | Already shipped. Nothing below is required to be here. | The two-layer decision mechanism — per-repo decision records, harvested into a central log, propose-never-auto-merge, no two-way sync — is [`03-architecture-decision-log.md`](03-architecture-decision-log.md) in full. |
| **L1 — vocabulary** | Pins the published central catalogue in its own manifest; a CI step reports terminology divergence against the pin. Report only — it never edits. | Catalogue publication format and the pin are specified where the catalogue-publishing mechanism lands. |
| **L2 — recognition** | A locally authored object is matched against the pinned catalogue; a match is **proposed** as a binding, staged for review. It never writes a binding into admitted canon on its own. | The binding envelope this proposal fills in, once accepted, is §3 below. |
| **L3 — promotion** | A local object is proposed for import into the central repository, carrying its own id as `origin` once admitted; the binding this returns to the project repository is applied through the same review gate as L2. | Same envelope, §3 below — `origin` is the central-side half of the binding L2 proposes locally. |

A repository at **L0 alone** — no pin, no bound element, nothing beyond decision records — is a complete, valid state: it takes no new field and needs nothing else in this document. Each later level is opt-in and additive to the ones before it; nothing in this document requires a repository to advance past the level it has a use for.

## 3. The envelope — additive binding

Two optional fields carry a binding between a project repository's element and a central repository's element. Neither is required by any TYPE's schema; both are documented once, here, rather than per-notation.

| Field | Where it appears | Semantics |
|---|---|---|
| `canon_id` | optional, on a `standalone` element in a **project** repository | Names the central element this element is bound to. Present only once a binding has been accepted (L2/L3, §2) — never authored ahead of that. |
| `origin` | optional, on an element admitted in the **central** repository | Names the source project repository and the local `id` the element was promoted from (L3, §2). |

Both fields are facts *about* an element, recorded alongside it — not a rename, not a merge, not a second copy. **Rendering rule:** a repository's own views always display its own `id`; the binding is metadata about the element, not its identity at home.

## 4. Constraints that hold at every level

- **Additive and backwards-compatible.** A repository that adopts none of this validates exactly as it did before this document existed. Any change here is a `MINOR` bump ([CONTRACT.md](../notations/CONTRACT.md) §10.2).
- **Propose, never auto-merge**, at every level — L1 reports, L2 proposes, L3 emits a proposal for a human admission gate. Nothing at any level writes admitted canon unattended.
- **No two-way sync**, at any level — the same discipline [`03-architecture-decision-log.md`](03-architecture-decision-log.md) §1 already states for decisions applies unchanged to elements: the central repository never edits a project repository's records, and a project repository never writes into the central repository.
- **No agent writes across a repository boundary.** An agent working a project repository may propose a promotion; it may never write into the central repository. This is the authorship limit [`03-architecture-decision-log.md`](03-architecture-decision-log.md) §6 already places on ADRs, generalised to elements.
- **Levels are separable in the tooling**, not merely in this document — each is built, and useful, independently of the ones after it.

## 5. References

- [`03-architecture-decision-log.md`](03-architecture-decision-log.md) — L0, in full; the propose-never-auto-merge and no-two-way-sync disciplines this document generalises.
- [`04-methodology-update-propagation.md`](04-methodology-update-propagation.md) §6 — the transport pattern (versioned release, explicit pin, named operation) L1's catalogue pin reuses.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17 — the binding envelope's field shapes and validation rules.
