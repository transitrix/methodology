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
| **L1 — vocabulary** | Pins the published central catalogue in its own manifest; a CI step reports terminology divergence against the pin. Report only — it never edits. | §4 below. |
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

## 4. Catalogue publication and the pin — L1

This section is what §2's L1 row and [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17.4 forward-reference as "where the catalogue-publishing mechanism lands." It defines the publication format, the pin field, the fails-closed load rule, the pin-bump ratification gate, and the L1 divergence check — reusing [`04-methodology-update-propagation.md`](04-methodology-update-propagation.md)'s transport and ratification gate unchanged, per that document's §6.

### 4.1 Catalogue publication

The central repository publishes a versioned catalogue slice the same way this repository publishes a methodology release ([`04-methodology-update-propagation.md`](04-methodology-update-propagation.md) §3): an immutable Git tag `vX.Y.Z` with a GitHub Release attached. No submodule, no subtree — the same rejection §3 of that document already states applies here unchanged.

The slice's content is a flat list of elements, each carrying exactly:

```yaml
version: "X.Y.Z"                    # the catalogue release this slice was published at
elements:
  - id: TERM-001                    # the central element's own id
    type: TERM                      # its TYPE — a TERM element travels like any other TYPE, no special case
    name: "Capability"
    aliases: [Competency]           # optional — [] when none
    description: "..."
```

`id`, `type`, `name` are required; `aliases` and `description` are optional. Nothing beyond these five fields travels in the slice — no admission record, no lifecycle, no relations. A consuming repository resolves a `canon_id` (§3 above, [`CONTRACT.md`](../notations/CONTRACT.md) §17.1) against this flat list; it does not need, and the slice does not carry, anything else about the central element.

### 4.2 The pin

A consuming project repository pins the catalogue slice it reads in its own manifest — a new optional field in `transitrix.yaml`, documented here and cross-linked from [`notations/MANIFEST.md`](../notations/MANIFEST.md):

```yaml
catalogue:                          # optional — pins a central catalogue this repo consumes (L1)
  source: <org>/<repo>              # required within the map — the central repository's GitHub coordinate
  version: "X.Y.Z"                  # required within the map — the pinned catalogue release tag
  path: <local path>                # required within the map — where the vendored slice for this pin lives on disk; the CLI never fetches it
```

A repository with no `catalogue:` field is L0/pre-L1 and is unaffected by anything below — L1 is opt-in, consistent with §5's "additive and backwards-compatible" constraint. `path` is a location on disk the adopter (or an agent acting on the adopter's behalf) has already vendored the slice to; no tool in this repository fetches it over the network at validation time — the same posture [`notations/PACKAGES.md`](../notations/PACKAGES.md) §7.2 already takes for an externally-distributed package's `validator:` field.

### 4.3 Fails closed

Loading the pin follows the same posture `vocabulary.mjs` already applies to the methodology's own closed-vocabulary artefact:

- `catalogue.path` missing or unreadable → hard error.
- The slice's content unparseable → hard error.
- The slice's own declared `version` (§4.1) not matching `catalogue.version` in the manifest → hard error.

None of these fall back to a default or a partial catalogue. A repository with **no** `catalogue:` field is not affected by this rule at all — absence is a valid, unrelated state (§4.2); the rule applies only once a pin is declared. Implementation: [`packages/ingest-cli/src/catalogue.mjs`](../packages/ingest-cli/src/catalogue.mjs).

### 4.4 Pin bump → ADR

Bumping `catalogue.version` is a decision, ratified the same way a `methodology_version` bump already is ([`04-methodology-update-propagation.md`](04-methodology-update-propagation.md) §5): an agent-prepared bump emits an `author: agent`, `status: proposed` decision record in the same PR, and the bump is not in force until a human flips that record `proposed → accepted` in a separate, reviewed change. This section does not restate that mechanism — see §5 of that document for the ratification gate itself.

### 4.5 L1 check — report only

A CI step diffs a repository's own canon (`name` + `aliases[]` per element, [`ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §9) against the pinned catalogue slice's elements (§4.1, same fields) and reports two findings:

- **Collision.** A local element already bound to the catalogue (carries a `canon_id`, [`CONTRACT.md`](../notations/CONTRACT.md) §17.1) whose `name`/`aliases[]` surface form also matches a *different* central element — an id other than the one it is bound to.
- **Unbound match.** A local element carrying no `canon_id` whose `name`/`aliases[]` surface form matches one or more central elements — a term that may want a binding but does not carry one. This is reported even when the central side is itself ambiguous (more than one central element shares the surface form): a match that is unambiguous locally but ambiguous centrally is still a finding, not a silent pass.

Both findings are **report only** — the check never edits a file and never fails the build; it is the L1 half of the "propose, never auto-merge" constraint (§5 below), one level down from L2's staged-proposal mechanism. The check is a pure function of its two inputs (local canon, catalogue slice), so running it twice against unchanged input reports exactly the same thing. Implementation: [`packages/ingest-cli/src/catalogue.mjs`](../packages/ingest-cli/src/catalogue.mjs); surfaced in `transitrix-ingest repo-check`'s report, present only when a `catalogue:` pin is declared.

## 5. Constraints that hold at every level

- **Additive and backwards-compatible.** A repository that adopts none of this validates exactly as it did before this document existed. Any change here is a `MINOR` bump ([CONTRACT.md](../notations/CONTRACT.md) §10.2).
- **Propose, never auto-merge**, at every level — L1 reports, L2 proposes, L3 emits a proposal for a human admission gate. Nothing at any level writes admitted canon unattended.
- **No two-way sync**, at any level — the same discipline [`03-architecture-decision-log.md`](03-architecture-decision-log.md) §1 already states for decisions applies unchanged to elements: the central repository never edits a project repository's records, and a project repository never writes into the central repository.
- **No agent writes across a repository boundary.** An agent working a project repository may propose a promotion; it may never write into the central repository. This is the authorship limit [`03-architecture-decision-log.md`](03-architecture-decision-log.md) §6 already places on ADRs, generalised to elements.
- **Levels are separable in the tooling**, not merely in this document — each is built, and useful, independently of the ones after it.

## 6. References

- [`03-architecture-decision-log.md`](03-architecture-decision-log.md) — L0, in full; the propose-never-auto-merge and no-two-way-sync disciplines this document generalises.
- [`04-methodology-update-propagation.md`](04-methodology-update-propagation.md) §3, §5, §6 — the transport (versioned release), the ratification gate, and the reuse pattern §4 above applies unchanged.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17 — the binding envelope's field shapes and validation rules.
- [`notations/MANIFEST.md`](../notations/MANIFEST.md) — the `catalogue:` field on `transitrix.yaml` (§4.2 above).
- [`notations/PACKAGES.md`](../notations/PACKAGES.md) §7.2 — the local-path-field precedent (`validator:`) §4.2's `path` follows.
- [`packages/ingest-cli/src/catalogue.mjs`](../packages/ingest-cli/src/catalogue.mjs) — the fails-closed loader and the L1 diff (§4.3–§4.5).
