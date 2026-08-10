---
title: Methodology & catalog update propagation
status: draft
last_reviewed: 2026-07-03
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
| **Ratification gate** | An agent's record proposes; a human accepts | [`03-architecture-decision-log.md`](03-architecture-decision-log.md) §6 |
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

An agent may prepare an upgrade. An agent may not silently apply one. The mechanism that enforces the distinction is the ADL ratification gate ([`03-architecture-decision-log.md`](03-architecture-decision-log.md) §6):

- An agent-prepared upgrade PR **must** include an ADR with `author: agent` and `status: proposed` that records the bump. A worked example is `operations/decisions/ADR-0002-pin-methodology-0-5-0.md` in the acme-corp reference repo.
- The pin in `transitrix.yaml` may change in the same PR, but the decision is **not in force** until a human flips the ADR `proposed → accepted` in a separate, reviewed change.
- The ADL CI guard (`scripts/check-adl.mjs`, check A3) mechanically rejects an `author: agent` record introduced as `accepted`. The gate is enforced, not advised.

The worst an unattended agent can do, then, is leave a *proposed* upgrade for human review — the entire bounded, recipe-scoped diff plus the ADR are visible in one PR. The agent contributes the boring re-validation and migration work; the human contributes the decision.

## 6. Reference-catalog distribution — same pattern, separate component

The architecture-decision-log forward-references ([`03-architecture-decision-log.md`](03-architecture-decision-log.md) §9) a *down-flow*: a per-organization architecture repository publishing versioned reference catalogs (the TOGAF *Standards Information Base*) that project repositories pin and consume. That distribution layer is specified as **L1 — vocabulary** of the integration ladder in [`05-catalogue-integration.md`](05-catalogue-integration.md) §2, and reuses this mechanism unchanged:

- The catalog source becomes the organization's architecture repository (not this one).
- The version slot is a catalog-specific field on the consuming project's manifest.
- The named operation, the ratification gate, the recipe-scoped bound, and the reproducibility requirement are identical.

When that layer lands, this document grows a §3-style transport entry for the catalog channel — but the propagation contract is the one defined here.

## 7. Discovery — noticing drift on a schedule

The mechanism in §3–§6 says what an agent must do *once it has decided* to propose an upgrade. This section says how the deciding happens without a human having to ask, and does not change the ratification gate: everything Discovery emits still lands as a *proposed* ADR that a human ratifies (§5, unchanged).

### 7.1 The failure mode this closes

Two forms of drift are self-inflicted when nothing watches for them:

- **Pin-vs-release drift.** An adopter's `methodology_version` sits behind the latest tag long enough that catching up spans multiple bumps in one PR — the diff is larger, the migration recipes compound, the review is harder. The propagation contract (§4) still holds each individual upgrade, but the *decision to propose one* was never triggered.
- **Stale-proposed-ADR drift.** An agent-prepared ADR sits at `status: proposed` past the point a human was going to notice on their own — the ratification gate (§5) works as designed, but the queue has no reminder.

Neither is a failure of the propagation contract; both are failures of *nobody looked*. Discovery is the periodic look.

### 7.2 The scheduled-trigger contract

A recurring job runs against each source repo's registered downstream consumers (§7.4). For each consumer, per run, it:

1. Invokes the existing version-currency check — [`transitrix-ingest repo-check`](../transitrix/skills/repo-check/SKILL.md) — on the consumer's checkout, reading its pinned `methodology_version` and comparing against the latest released tag on the source repo.
2. **Where the pin is behind the latest tag**, invokes the existing recipe/sync mechanism (§4) and opens the *already-specified* bounded PR: exactly the diff §4 permits (pin field, recipe-scoped codemod output, one ADR with `author: agent` + `status: proposed`, and in the fallback transport the vendored artefacts). The PR opened by Discovery is *the same PR shape §4 defines* — Discovery adds no new fields, no new diff surface, and no new merge path.
3. **Where the pin is current**, emits nothing for that consumer beyond a "current" line in the digest (§7.5).

The job never merges, never flips a status, and never edits a source repo. Its only write is the bounded PR §4 already permits; the ratification gate in §5 is untouched.

### 7.3 The stale-proposed-ADR reminder

The same job scans each registered consumer's decision folder (per the consumer's registry entry, §7.4) for records at `status: proposed` whose `date:` is older than **fourteen calendar days**. Each such record is flagged in the same digest (§7.5) as the pin-vs-release output — one queue, one look.

Fourteen days is chosen because it is short enough that a single missed weekly review cycle does not trip the reminder, and long enough that it does not compete with the normal review cadence. The threshold is a property of Discovery, not of the ADL: an ADR sitting `proposed` is not itself an integrity violation ([`03-architecture-decision-log.md`](03-architecture-decision-log.md) §8) — the reminder just says *this one has been waiting a while*.

The reminder is a *flag in the digest*, not a state change on the ADR. Discovery never edits an ADR; the record is immutable except for a human ratifying `proposed → accepted` in a reviewed change (§5, [`03-architecture-decision-log.md`](03-architecture-decision-log.md) §7). A ratification later than fourteen days is normal and is not itself a problem — the reminder exists so that ratification happens at all.

The on-demand half of this visibility gap is closed by `transitrix-ingest workflow-status` ([`method/02-team-operations.md`](02-team-operations.md) §6.7) — an adopter or agent can run it at any time to see every ADR currently at `proposed`, `author: agent` broken out from human-authored, without waiting for a scheduled run. `workflow-status` deliberately reports phases and counts only, never age, so it has no equivalent of the fourteen-day filter above; the scheduled job may still consume its `--format yaml` output for the underlying list of proposed-ADR ids rather than re-walking `operations/decisions/` itself, then apply its own age threshold on top.

### 7.4 The downstream-consumer registry — contract

Each source repo that participates in Discovery declares its known downstream consumers in a machine-readable registry at the repo root. The registry is the discovery job's iteration input: without it, "check each adopter" has no operand.

**Location:** `adopters.yaml` at the source repo root. One file per source repo. The methodology repo carries the registry naming methodology's adopters (starting with acme-corp); a downstream source repo — e.g. acme-corp itself, whose downstream consumers are transitrix-studio's mirror and transitrix-dsm's demo-seed — carries the same-shape file naming *its* consumers. The shape is reusable across hops unchanged (§6 forward-references the same reuse for the reference-catalog layer).

**Schema:**

```yaml
# adopters.yaml — machine-readable registry of downstream consumers of this repo.
# Read by the Discovery job (§7); never edited by the job itself.
version: 1
consumers:
  - repo: transitrix/acme-corp                  # required — the consumer's GitHub coordinate
    clone: https://github.com/transitrix/acme-corp.git   # required — clone URL for the discovery job
    role: reference-adopter                     # optional — human label; drives digest grouping only
    pin_file: transitrix.yaml                   # required — path in the consumer repo carrying the pin
    pin_key: methodology_version                # required — YAML key inside pin_file
    decisions_path: operations/decisions        # required — directory of ADR records to scan (date-slug or legacy id)
```

Field semantics:

- **`pin_file` + `pin_key`** — the version slot §2 refers to. Named explicitly so a downstream registry (e.g. acme-corp → studio) can point at whatever pin field the next layer uses without Discovery baking in `methodology_version` as the only recognised key.
- **`decisions_path`** — the ADR folder §7.3 scans. Named explicitly so a consumer using `docs/decisions/` instead of `operations/decisions/` is discoverable ([`03-architecture-decision-log.md`](03-architecture-decision-log.md) §5).
- **`role`** — free-form label used only to group entries in the digest (§7.5). Not a validated enum.
- **`clone`** — the URL the job clones from. Discovery reads only; it does not push to consumers.

**Reusability guarantee.** The schema above is what acme-corp's own `adopters.yaml` uses to name transitrix-studio and transitrix-dsm as its downstream consumers, with `pin_file` / `pin_key` set to whatever field those consumers pin acme-corp under. The same discovery job shape runs one hop further down without change — the mechanism defined here is the whole mechanism for the chain.

**Worked example — the pin an adopter's ADR records.** [`operations/decisions/ADR-0002-pin-methodology-0-5-0.md`](https://github.com/transitrix/acme-corp/blob/main/operations/decisions/ADR-0002-pin-methodology-0-5-0.md) in the acme-corp reference repo is the shape of the ADR the Discovery job's proposed upgrade PR carries: `author: agent`, `status: proposed`, one bump recorded, awaiting human ratification. Discovery's job is to notice when a repo *should have* an ADR like that one but does not yet, and to open the PR that adds it.

### 7.5 What the digest reports

One digest per run, one entry per registered consumer. For each consumer:

- **`current`** — pin matches the latest source-repo tag; no PR opened; noted in the digest so a healthy consumer is visible, not silent.
- **`behind`** — pin is behind the latest tag; a link to the bounded PR the job just opened (or the existing one it found already open — Discovery is idempotent per §7.6).
- **`stale-proposed`** — zero or more ADRs at `status: proposed` older than fourteen days, each with its `id:` and its age in days.

The digest is Discovery's only user-visible output beyond the PRs themselves. Where the digest lives (Actions summary, a scheduled comment on a tracking issue, an emailed report) is an implementation detail deliberately left to §7.7.

### 7.6 Idempotence

Discovery runs on a schedule; two runs a day apart with no intervening release must not produce two PRs, two ADRs, or two digest reminders for the same drift. The mechanics:

- **Bounded PR for a pin bump.** Before opening one, the job checks for an open PR on the consumer repo that already bumps `pin_key` to the target version and carries an `author: agent` + `status: proposed` ADR. If one exists, the digest links it; a new one is not opened. The check matches on ADR front-matter — `title`/body naming the same `pin_key` and target version — not on filename: a date-slug id (`method/02-team-operations.md` §3.1) encodes the record's creation date, not the pinned component or version, so filename can no longer stand in for content.
- **Stale-proposed reminder.** Re-flagging the same ADR on every run is intentional — the reminder is a standing signal until the ratification happens. It is not a notification storm because each run emits one digest, not one message per finding.

### 7.7 What this section does NOT define

- **Where the job runs.** GitHub Actions cron on the source repo, an external runner, or an internal automation platform — all satisfy the contract. The mechanism is the same regardless.
- **How the digest is delivered.** An Actions summary, a comment on a tracking issue, an email — all satisfy the contract. The digest shape (§7.5) is the invariant.
- **Cross-hop authentication.** Whether the job clones consumer repos with a machine account, a fine-scoped PAT, or an app installation is deployment policy, not part of the propagation contract.
- **A merge-side notifier.** Discovery notices *drift*; it does not notice *acceptance*. Ratification of a proposed ADR is already visible as a normal PR review and does not need Discovery to announce it.

## 8. What this document does NOT define

- **`transitrix migrate` CLI.** A future packaged front-end to the per-release migration recipe, currently deferred ([`CONTRACT.md`](../notations/CONTRACT.md) §10.5). Until it ships, the recipe is invoked directly per [`RELEASING.md`](../RELEASING.md) §"Adopter upgrade procedure".
- **Per-organization reference-catalog distribution.** §6 only forward-references it; the catalog version slot and the harvest-equivalent for catalogs are designed when that layer lands.

## 9. References

- [`packages/ingest-cli/README.md`](../packages/ingest-cli/README.md) — `workflow-status` command, the on-demand report §7.3's stale-proposed reminder builds visibility on top of.
- [`RELEASING.md`](../RELEASING.md) — release process and the operational adopter upgrade procedure.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10 — compatibility policy and version semantics.
- [`notations/MANIFEST.md`](../notations/MANIFEST.md) §3 — the `methodology_version` field and the no-vendoring default.
- [`03-architecture-decision-log.md`](03-architecture-decision-log.md) — ADL, including the ratification gate (§6) and the reference-catalog forward reference (§9).
- [`migrations/0.5-to-0.6/README.md`](../migrations/0.5-to-0.6/README.md) — migration recipe format, worked example.
- `operations/decisions/ADR-0002-pin-methodology-0-5-0.md` (acme-corp reference repo) — worked agent-authored upgrade ADR.

---

**Status:** draft — new in this release. Defines the propagation mechanism that [ADL](03-architecture-decision-log.md) §9 forward-references for the reference-catalog distribution layer.
