---
title: Releases and propagation — how a new version reaches an adopter
status: active
last_reviewed: 2026-08-18
audience: public
license: MIT
tags: [transitrix, methodology, operations, upgrade, versioning, catalogue, agents]
---

# Releases and propagation

> How a new methodology version — and, separately, a per-organisation reference catalog — is **delivered** to an adopter repository and **safely applied** there, including when the work is done by an autonomous agent.

This document binds components that already exist elsewhere in this repo into named operations. It does not redefine any of them.

## 1. The problem this solves

An autonomous agent that can read this public methodology repository can, on its own initiative, bring a consuming repository "up to" a newer methodology version. Convenient, but run without a defined mechanism the change is:

- **Unbounded** — touches whatever the agent notices to be different, not a declared scope.
- **Untraceable** — no durable record of "we moved from X to Y, by whom, on which date".
- **Non-reproducible** — re-running the agent on the same input may apply a different set of changes.

This document defines the mechanism that closes those three gaps without losing the convenience of agent-driven application.

## 2. The components — already in this repo

| Component | What it is | Where |
|---|---|---|
| **Version slot** | `methodology_version` field in the adopter's `transitrix.yaml` | [`notations/MANIFEST.md`](../notations/MANIFEST.md) §3 |
| **Released artefact** | Immutable Git tag `vX.Y.Z` + GitHub Release on this repo | [`RELEASING.md`](../RELEASING.md) |
| **Compatibility promise** | What each `MAJOR` / `MINOR` / `PATCH` bump promises | [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10 |
| **Migration recipe** | On-disk codemod + post-migration validator for breaking bumps | `migrations/<prev>-to-<this>/` |
| **Operational steps** | Ordered procedure the adopter runs | [`RELEASING.md`](../RELEASING.md) §"Adopter upgrade procedure" |
| **Ratification gate** | An agent's record proposes; a human accepts | [`08-governance.md`](08-governance.md) §2 |
| **Version-currency check** | Reports pinned vs installed | `transitrix-ingest repo-check` |

The four propagation guarantees — *declared*, *bounded*, *traceable*, *reproducible* — fall out of how these components are wired together.

## 3. The transport — versioned release, with vendored fallback

A methodology release is a **Git tag** on this public repository (`vX.Y.Z`) with a GitHub Release attached. The tag is **immutable** ([`CONTRACT.md`](../notations/CONTRACT.md) §10.4): once published, its contents do not change.

Two delivery channels, in preference order:

1. **Versioned release (primary).** The adopter pins `methodology_version: "X.Y.Z"` in `transitrix.yaml` and follows the published specs at `https://github.com/transitrix/methodology/releases/tag/vX.Y.Z`. Adopters do not vendor `notations/` into their repository ([MANIFEST.md](../notations/MANIFEST.md) §3) — the pin is the source-of-truth pointer.
2. **Agent-driven vendored sync (fallback).** Where an air-gapped or policy-constrained adopter cannot reach this repository at run time, an agent vendors the released artefacts (specs needed at run time, migration recipe, validator) into the adopter repository as part of the upgrade PR. The vendored copies cite the source tag and are gated by the same ADR (§5). The fallback exists to keep the rest of this mechanism applicable in restricted environments; it is not the recommended default.

**Submodule and subtree transports are rejected.** They couple the adopter's commit graph to this repository's commits and dilute the "one pin = one promise" invariant the version slot depends on.

## 4. The named operation — *upgrade adopter to vX.Y.Z*

There is **one** way to move an adopter repository from version `vA.B.C` to version `vX.Y.Z`. The operational steps are in [`RELEASING.md`](../RELEASING.md) §"Adopter upgrade procedure"; the **shape** of the operation, restated here, is what gives the propagation guarantees:

- **Declared.** The upgrade is the named operation, not a side effect of other work. Its scope is exactly what the target version's release notes and migration recipe declare. Nothing outside that scope changes in the same PR.
- **Bounded.** The operation touches: the `methodology_version` field in `transitrix.yaml`; whatever the migration recipe's codemod transforms touch (recipe-scoped, deterministic); one ADR recording the bump (`author: agent` if an agent prepared it); and, in the fallback transport (§3), the vendored copy of the release artefacts.
- **Reproducible.** The codemod and post-migration validator are pure-Node, idempotent, and parameterless beyond the adopter root (see [`migrations/0.5-to-0.6/README.md`](../migrations/0.5-to-0.6/README.md) §"Conventions"). Running the same recipe on the same input produces the same output, byte-for-byte — re-running it later does not drift.
- **Traceable.** The ADR (§5) is the durable record of the bump; Git history is the audit trail; `transitrix-ingest repo-check` reports the post-state.

A `MINOR` or `PATCH` bump that carries no migration recipe (additive specs only) reduces the operation to: bump the pin → re-validate canon → reinstall the CLI → run `repo-check` → record the ADR. The four guarantees still hold — the codemod step is simply empty.

## 5. The bound on autonomous agents

An agent may prepare an upgrade. An agent may not apply one that no human authorised. The mechanism is the ADL ratification gate ([`07-decisions.md`](07-decisions.md) §4; doctrine: [`08-governance.md`](08-governance.md) §2), and it has two paths — which one applies depends on whether a human ratified this upgrade or its class.

**The default path — the human ratifies the instance.**

- An agent-prepared upgrade PR **must** include an ADR with `author: agent` and `status: proposed` that records the bump. A worked example is `operations/decisions/ADR-0002-pin-methodology-0-5-0.md` in the acme-corp reference repo.
- The pin in `transitrix.yaml` may change in the same PR, but the decision is **not in force** until a human flips the ADR `proposed → accepted` in a separate, reviewed change.
- The ADL CI guard (`scripts/check-adl.mjs`, check A3) mechanically rejects an `author: agent` record introduced as `accepted`. The gate is enforced, not advised.

The worst an unattended agent can do on this path is leave a *proposed* upgrade for human review — the entire bounded, recipe-scoped diff plus the ADR are visible in one PR.

**Under a standing grant — the human ratified the class first.** Where a repository's maintainers have accepted a standing grant for a bounded class of upgrade ([`08-governance.md`](08-governance.md) §2.1), an agent may land an upgrade inside that class without a per-instance ADR: the ratification happened when the grant was accepted, and the record of each landing is the run. A repeated non-major pin bump is the usual case — it is not a decision each time, and a per-instance record would document a judgement nobody made.

This narrows nothing away from the paragraph above. The grant is accepted by a human; its conditions are checked mechanically on every use, or it is not in force; a bump outside the class — a `MAJOR` upgrade, or one whose conditions do not hold — takes the default path; and an agent can neither write a grant nor widen the one it acts under.

## 6. Catalogue integration — joining a network around a central catalogue

How a project repository relates to a **central repository** holding a shared catalogue — a per-organisation architecture repository, or any repository other project repositories treat as authoritative for a set of elements. One repository modelling on its own needs none of this; it applies once a second repository's canon should be able to recognise the first's. It reuses the transport (§3) and the ratification gate (§5) unchanged.

### 6.1 The ownership rule

Exactly one repository owns each element. For an element the central repository has admitted, the central repository owns its `id`, `name`, and content; every other repository relates to it by reference, never by copy. For an element only a project repository has admitted, that project repository owns it, exactly as it always has. Binding to a central element never renames the local element — **no tool ever rewrites a local `id`.**

### 6.2 The four levels

Four separately-enabled levels. Each is useful and complete on its own; stopping at any level is a valid state, not a partial one.

| Level | What a project repository does |
|---|---|
| **L0 — decisions** | Already shipped — the two-layer decision mechanism, §§1–8 of [`07-decisions.md`](07-decisions.md), in full. Nothing here adds to it. |
| **L1 — vocabulary** | Pins the published central catalogue in its own manifest (`catalogue:` field, [`notations/MANIFEST.md`](../notations/MANIFEST.md) §3); a CI step reports terminology divergence against the pin. Report only — it never edits. |
| **L2 — recognition** | A locally authored object is matched against the pinned catalogue; a match is **proposed** as a binding, staged for review. It never writes a binding into admitted canon on its own. |
| **L3 — promotion** | A local object is proposed for import into the central repository, carrying its own id as `origin` once admitted. |

### 6.3 The envelope

The binding envelope (`canon_id` on a project-repository element, `origin` on a central-repository element) and its validation rules (`BIND-001`–`005`) are defined once, canonically, in [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17 — this section does not restate the field shapes.

### 6.4 Catalogue publication and the pin — L1

This subsection is what §6.2's L1 row and [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17.4 forward-reference as "where the catalogue-publishing mechanism lands." It reuses §3's transport and §5's ratification gate unchanged.

#### 6.4.1 Catalogue publication

The central repository publishes a versioned catalogue slice the same way this repository publishes a methodology release (§3): an immutable Git tag `vX.Y.Z` with a GitHub Release attached. No submodule, no subtree — the same rejection §3 already states applies here unchanged. The slice's content is a flat list of elements, each carrying exactly `id`, `type`, `name` (required) and `aliases`, `description` (optional) — no admission record, no lifecycle, no relations.

#### 6.4.2 The pin

A consuming project repository pins the catalogue slice it reads via a `catalogue:` block in its own `transitrix.yaml` (`source`, `version`, `path` — all required within the map when present; documented in [`notations/MANIFEST.md`](../notations/MANIFEST.md) §3). A repository with no `catalogue:` field is L0/pre-L1 and unaffected by anything in this subsection. `path` is a location on disk the adopter has already vendored the slice to — no tool in this repository fetches it over the network at validation time.

#### 6.4.3 Fails closed

Loading the pin fails closed: `catalogue.path` missing or unreadable, the slice's content unparseable, or the slice's own declared `version` not matching `catalogue.version` in the manifest are all hard errors — none fall back to a default or a partial catalogue. A repository with **no** `catalogue:` field is not affected by this rule at all. Implementation: [`packages/ingest-cli/src/catalogue.mjs`](../packages/ingest-cli/src/catalogue.mjs).

#### 6.4.4 Pin bump → ADR

Bumping `catalogue.version` is a decision, ratified the same way a `methodology_version` bump already is (§5): an agent-prepared bump emits an `author: agent`, `status: proposed` decision record in the same PR, and the bump is not in force until a human flips that record `proposed → accepted` in a separate, reviewed change.

#### 6.4.5 L1 check — report only

A CI step diffs a repository's own canon (`name` + `aliases[]` per element) against the pinned catalogue slice's elements and reports two findings: a **collision** (a local element already bound whose surface form also matches a *different* central element) and an **unbound match** (a local element carrying no `canon_id` whose surface form matches one or more central elements). Both findings are **report only** — the check never edits a file and never fails the build. Implementation: [`packages/ingest-cli/src/catalogue.mjs`](../packages/ingest-cli/src/catalogue.mjs); surfaced in `transitrix-ingest repo-check`'s report, present only when a `catalogue:` pin is declared.

### 6.5 Constraints that hold at every level

Additive and backwards-compatible (adopting none of this validates exactly as before); propose, never auto-merge, at every level; no two-way sync — the central repository never edits a project repository's records and vice versa; no agent writes across a repository boundary ([`08-governance.md`](08-governance.md) §2).

### 6.6 Setting it up

L0 is one command (`transitrix-ingest adopt-adl`) — see [`guides/adl-adopter-setup.md`](../guides/adl-adopter-setup.md) Step 1. L1 is two commands (vendor the slice, then `catalogue-pin`) once a central repository publishes one. L2 (`catalogue-recognize` / `catalogue-bind`) and L3 (`catalogue-promote`) are commands run directly once L1 is pinned — full command reference: [`packages/ingest-cli/README.md`](../packages/ingest-cli/README.md).

## 7. What this document does NOT define

- **`transitrix migrate` CLI.** A future packaged front-end to the per-release migration recipe, currently deferred ([`CONTRACT.md`](../notations/CONTRACT.md) §10.5). Until it ships, the recipe is invoked directly per [`RELEASING.md`](../RELEASING.md) §"Adopter upgrade procedure".
- **Where a Discovery job runs, or how it delivers its digest.** The scheduled process that notices pin-vs-release drift and stale proposed decision records ahead of a human asking is a maintainer-side operation on the *source* repository, not part of what an adopter does — specified in [`RELEASING.md`](../RELEASING.md) §"Discovery".
- **The catalogue's L2/L3 matching, staging, and review-queue mechanics.** §6 names the levels and the envelope's canonical source; the recognition/promotion algorithm itself is implementation, in `packages/ingest-cli/src/catalogue.mjs`.

## 8. References

- [`packages/ingest-cli/README.md`](../packages/ingest-cli/README.md) — full command reference: `workflow-status`, `adopt-adl`, `catalogue-pin`, `catalogue-recognize`, `catalogue-bind`, `catalogue-promote`.
- [`RELEASING.md`](../RELEASING.md) — release process, the operational adopter-upgrade procedure, and the Discovery job.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10 — compatibility policy and version semantics; §17 — the binding envelope.
- [`notations/MANIFEST.md`](../notations/MANIFEST.md) §3 — the `methodology_version` and `catalogue:` fields.
- [`07-decisions.md`](07-decisions.md) — the ADR mechanism this document's ratification gate reuses.
- [`patterns/network-catalogue.md`](../patterns/network-catalogue.md) — the adopter-facing *why and when* for §6's mechanism.
- `operations/decisions/ADR-0002-pin-methodology-0-5-0.md` (acme-corp reference repo) — worked agent-authored upgrade ADR.

---

**Last reviewed:** 2026-08-18. §5 now states the two paths an agent-prepared upgrade can take — the default per-instance ratification, unchanged, and landing inside a class ratified in advance ([`08-governance.md`](08-governance.md) §2.1). Previously it restated the doctrine in a form that a standing grant would contradict. Prior 2026-08-16: Merges the former `04-methodology-update-propagation.md` §1–§6, §8–§9 with `05-catalogue-integration.md` — see those files' redirects. §7 (Discovery) moved to [`RELEASING.md`](../RELEASING.md), a maintainer-side operational document, rather than staying in this adopter-facing folder. §6 above condenses the former standalone catalogue-integration document, pointing at [`notations/CONTRACT.md`](../notations/CONTRACT.md) §17 for the binding envelope's field shapes rather than restating them, to avoid the two documents drifting apart.
**Status:** Active.
