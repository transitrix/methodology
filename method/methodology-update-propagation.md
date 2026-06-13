---
title: Methodology & catalog update propagation
status: draft
last_reviewed: 2026-06-13
audience: public
license: MIT
tags: [transitrix, methodology, operations, upgrade, versioning, agents]
---

# Methodology & catalog update propagation

> How a new methodology version (and, in time, a per-organization reference catalog) is **delivered** to an adopter repository and **safely applied** there — bounded, traceable, reproducible — including when the work is done by an autonomous agent.

This document binds the components that already exist in this repo into a single named operation. It does not redefine any of them.

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
| **Ratification gate** | An agent's record proposes; a human accepts | [`architecture-decision-log.md`](architecture-decision-log.md) §6 |
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
- **Bounded.** The operation touches:
  - the `methodology_version` field in `transitrix.yaml`,
  - whatever the migration recipe's codemod transforms touch (recipe-scoped, deterministic),
  - one ADR recording the bump (`author: agent` if an agent prepared it),
  - and, in the fallback transport (§3), the vendored copy of the release artefacts.
- **Reproducible.** The codemod and post-migration validator are pure-Node, idempotent, and parameterless beyond the adopter root (see [`migrations/0.5-to-0.6/README.md`](../migrations/0.5-to-0.6/README.md) §"Conventions"). Running the same recipe on the same input produces the same output, byte-for-byte — re-running it later does not drift.
- **Traceable.** The ADR (§5) is the durable record of the bump; Git history is the audit trail; `transitrix-ingest repo-check` reports the post-state.

A `MINOR` or `PATCH` bump that carries no migration recipe (additive specs only) reduces the operation to: bump the pin → re-validate canon → reinstall the CLI → run `repo-check` → record the ADR. The four guarantees still hold — the codemod step is simply empty.

## 5. The bound on autonomous agents

An agent may prepare an upgrade. An agent may not silently apply one. The mechanism that enforces the distinction is the ADL ratification gate ([`architecture-decision-log.md`](architecture-decision-log.md) §6):

- An agent-prepared upgrade PR **must** include an ADR with `author: agent` and `status: proposed` that records the bump. A worked example is `organizations/acme_corp/operations/decisions/ADR-0002-pin-methodology-0-5-0.md`.
- The pin in `transitrix.yaml` may change in the same PR, but the decision is **not in force** until a human flips the ADR `proposed → accepted` in a separate, reviewed change.
- The ADL CI guard (`scripts/check-adl.mjs`, check A3) mechanically rejects an `author: agent` record introduced as `accepted`. The gate is enforced, not advised.

The worst an unattended agent can do, then, is leave a *proposed* upgrade for human review — the entire bounded, recipe-scoped diff plus the ADR are visible in one PR. The agent contributes the boring re-validation and migration work; the human contributes the decision.

## 6. Reference-catalog distribution — same pattern, separate component

The architecture-decision-log forward-references ([`architecture-decision-log.md`](architecture-decision-log.md) §9) a future *down-flow*: a per-organization architecture repository publishing versioned reference catalogs (the TOGAF *Standards Information Base*) that project repositories pin and consume. That distribution layer is intentionally not designed here — but it will reuse this mechanism unchanged:

- The catalog source becomes the organization's architecture repository (not this one).
- The version slot is a catalog-specific field on the consuming project's manifest.
- The named operation, the ratification gate, the recipe-scoped bound, and the reproducibility requirement are identical.

When that layer lands, this document grows a §3-style transport entry for the catalog channel — but the propagation contract is the one defined here.

## 7. What this document does NOT define

- **`transitrix migrate` CLI.** A future packaged front-end to the per-release migration recipe, currently deferred ([`CONTRACT.md`](../notations/CONTRACT.md) §10.5). Until it ships, the recipe is invoked directly per [`RELEASING.md`](../RELEASING.md) §"Adopter upgrade procedure".
- **Discovery.** How an agent decides a new release exists or is worth proposing for adoption is outside the propagation mechanism's remit. The mechanism specifies what an agent must do *once it has decided* to propose an upgrade.
- **Per-organization reference-catalog distribution.** §6 only forward-references it; the catalog version slot and the harvest-equivalent for catalogs are designed when that layer lands.

## 8. References

- [`RELEASING.md`](../RELEASING.md) — release process and the operational adopter upgrade procedure.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10 — compatibility policy and version semantics.
- [`notations/MANIFEST.md`](../notations/MANIFEST.md) §3 — the `methodology_version` field and the no-vendoring default.
- [`architecture-decision-log.md`](architecture-decision-log.md) — ADL, including the ratification gate (§6) and the reference-catalog forward reference (§9).
- [`migrations/0.5-to-0.6/README.md`](../migrations/0.5-to-0.6/README.md) — migration recipe format, worked example.
- `organizations/acme_corp/operations/decisions/ADR-0002-pin-methodology-0-5-0.md` — worked agent-authored upgrade ADR.

---

**Status:** draft — new in this release. Defines the propagation mechanism that [ADL](architecture-decision-log.md) §9 forward-references for the reference-catalog distribution layer.
