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

> **Starting out?** Go to **§7 — Setting it up**: the commands, level by level, with the point at which a reader may stop. Sections 1–6 specify what each level guarantees; §7 is what you run.

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

## 7. Setting it up — from an empty repo to a running L1 pin

The mechanism is specified above; this section is the path through it, level by level, with the point at which a reader may stop (§2 — stopping at any level is a complete, valid state, not a partial one). Step 1 is worth doing today, with no second repository in sight. Step 2 needs a central repository already publishing a slice (§4.1). Steps 3–4 (L2 recognition, L3 promotion) are commands, not a document walkthrough — once L1 is pinned, run them directly.

### Step 1 — L0, today, no central repository needed

L0 **is** [`03-architecture-decision-log.md`](03-architecture-decision-log.md) — nothing in this document adds to it (§2's table). One command does what that document's own §10 Steps 1 and 3 otherwise walk through by hand:

```
transitrix-ingest adopt-adl <org-root> [--repo <org>/<repo>]
```

It creates `operations/decisions/`, vendors `scripts/check-adl.mjs` into `<org-root>/scripts/` together with a GitHub Actions workflow that runs it on every pull request touching the folder, and — when `--repo` is given — prints the `sources:` entry a human adds to the central architecture repository's `architecture/decision-log/harvest.config.yaml` (`03-architecture-decision-log.md` §5) to onboard this repository into the harvest. It writes only under `<org-root>`; nothing here writes into the central repository. Idempotent — a file already in place is reported, never overwritten.

Write the first record with the `adr` skill ([`03-architecture-decision-log.md`](03-architecture-decision-log.md) §10 Step 2): `/transitrix:adr`.

**A repository that stops here is done.** No pin, no new field, nothing below required.

### Step 2 — L1, once a central catalogue exists to pin

Two commands, run once each per pin:

1. **Vendor the slice.** Fetch the central repository's published catalogue release (§4.1 — a Git tag, GitHub Release) and place it on disk under this repository — the CLI never fetches it at validation time (§4.3). Where it lands is exactly what `catalogue-pin`'s `<path>` argument names.
2. **Pin it:**

   ```
   transitrix-ingest catalogue-pin <org>/<repo> <version> <path> [org-root]
   ```

   Writes the `catalogue:` block into `transitrix.yaml` (§4.2). Refuses — rather than silently overwriting — when a `catalogue:` field is already declared; edit or remove that block by hand first if the intent is to re-pin at a new version.

From here, `transitrix-ingest repo-check` reports the L1 divergence findings (§4.5) on every run — nothing further to wire; unlike L0 there is no separate CI guard, because the check is report-only and already folds into the existing repo-check surface.

**A repository that stops here** has a pinned vocabulary and a divergence report; no binding is proposed or written until it opts into L2.

### Step 3 — L2, proposing bindings

```
transitrix-ingest catalogue-recognize [org-root]
```

Stages proposed bindings for every unbound local element with an unambiguous, same-TYPE match against the pinned catalogue (§2's L2 row) — nothing admitted. A human accepts one with `transitrix-ingest catalogue-bind <local-id> <canon-id>`, which is the one command that writes `canon_id` into a local element file (§3).

### Step 4 — L3, proposing a promotion

```
transitrix-ingest catalogue-promote <local-id> --repository <org>/<repo> [org-root]
```

Emits a promotion proposal file — never a write across the repository boundary (§5) — for the central repository's own human admission gate to consume. The binding it returns is applied the same way as L2's, through `catalogue-bind`.

---

## 8. References

- [`03-architecture-decision-log.md`](03-architecture-decision-log.md) — L0, in full; the propose-never-auto-merge and no-two-way-sync disciplines this document generalises.
- [`04-methodology-update-propagation.md`](04-methodology-update-propagation.md) §3, §5, §6 — the transport (versioned release), the ratification gate, and the reuse pattern §4 above applies unchanged.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17 — the binding envelope's field shapes and validation rules.
- [`notations/MANIFEST.md`](../notations/MANIFEST.md) — the `catalogue:` field on `transitrix.yaml` (§4.2 above).
- [`notations/PACKAGES.md`](../notations/PACKAGES.md) §7.2 — the local-path-field precedent (`validator:`) §4.2's `path` follows.
- [`packages/ingest-cli/src/catalogue.mjs`](../packages/ingest-cli/src/catalogue.mjs) — the fails-closed loader, the L1 diff, and the pin writer (§4.3–§4.5, §7 Step 2).
- [`packages/ingest-cli/src/adl-join.mjs`](../packages/ingest-cli/src/adl-join.mjs) — the L0 one-step join (§7 Step 1).
- [`packages/ingest-cli/README.md`](../packages/ingest-cli/README.md) — full command reference for `adopt-adl`, `catalogue-pin`, `catalogue-recognize`, `catalogue-bind`, `catalogue-promote`.
- [`patterns/network-catalogue.md`](../patterns/network-catalogue.md) — the adopter-facing *why and when* this document's *how* implements.
