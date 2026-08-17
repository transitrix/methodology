# Releasing the methodology

This document defines the per-release process for the Transitrix methodology. The compatibility policy itself — what `MAJOR` / `MINOR` / `PATCH` mean for adopters — is in [`notations/CONTRACT.md`](notations/CONTRACT.md) §10. This file describes the **process** the methodology maintainer follows to cut and ship a release.

The methodology is at **1.0** (stable, first tagged 2026-07-05). Post-1.0 SemVer applies (see CONTRACT §10.3) — `MINOR` releases carry only additive changes; breaking changes require a `MAJOR` bump. The full versioning-and-compatibility policy lives in CONTRACT §10; this file is the operational checklist.

---

## When to bump

| Bump | Examples |
|---|---|
| **PATCH** (`X.Y.0` → `X.Y.1`) | Clarification of an existing spec sentence; fixing a broken link; correcting a typo in an example; renumbering subsections without changing rule codes or field names. No schema change of any kind. |
| **MINOR** (`X.Y` → `X.(Y+1)`) | New optional field on an existing notation; new validation code at `info` or `warning` severity; new TYPE in `IDS_AND_REFERENCES.md` §3; new section in CONTRACT.md (e.g. §9 sidecar pattern); new notation spec file (e.g. `15-requirement.md`). Additive only. |
| **MAJOR** (`X.Y` → `(X+1).0`) | Renamed or removed field on an existing notation; changed validation severity (`warning` → `error`); changed enum membership in a closed enum (relations type, status enum, etc.); changed canonical ID grammar; required new field on an existing notation — anything that breaks a previously-valid adopter file. |

If a single release combines multiple kinds of change, the bump is the **highest** of any individual change in the set.

---

## Per-release checklist

For every release, in order:

1. **Confirm the bump category.** Read every PR landed since the previous tag; categorise each change per the table above; pick the bump.
2. **Bump `notations/CURRENT_VERSION.yaml`** to the new version, in the same PR as the release notes. This is the manifest pin `scripts/check-notations.mjs`'s V1 check enforces every other concrete `methodology_version:` pin in this repo against — run `node scripts/check-notations.mjs` after bumping it and fix every pin the check flags (or add it to the script's allowlist if it is an intentional placeholder, e.g. a migration fixture pinned to a fixed source version). The same script's **V2 check** enforces `packages/ingest-cli/src/coverage-presets.mjs`'s `PRESETS_VERSION` against the same pin — bump it too, and re-state each preset's element + relation lists against `COVERAGE_PROFILES.md` §3 / §3.1 for this release (the table re-statement itself isn't mechanically checked; only the version literal is). The tag is cut from a commit where this check is already clean — do not tag first and bump after.
3. **Update `methodology_version` in the [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) reference repo's `transitrix.yaml`** to the new version, via a companion PR in that repo. acme-corp is the fixture adopter and tracks the latest released version.
4. **Update each notation spec's `version:` frontmatter** if any spec changed in this release. (`spec_version` on individual files is informational — see CONTRACT §10.1 — so this step is bookkeeping for discoverability, not enforcement.)
5. **Write release notes** describing what changed by category (`Added`, `Changed`, `Fixed`, `Removed`). Reference PR numbers.
6. **For a `MAJOR` release** — ship a migration recipe under `migrations/<prev>-to-<this>/` (recipe format: see [`migrations/`](migrations/) and [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.4). The recipe is a precondition for the tag.
7. **Tag** the release commit with `vX.Y.Z`.
8. **Publish** the release notes as a GitHub Release on the tag.
9. **Announce** the release (channel TBD with the maintainer).

---

## Adopter upgrade procedure

The conceptual companion to this section — the **propagation mechanism**: transport, the named operation, the ratification gate on autonomous agents, and what makes the upgrade *bounded / traceable / reproducible* — lives in [`method/09-releases-and-propagation.md`](method/09-releases-and-propagation.md). This section is the operational checklist; that document is the contract the checklist satisfies.

When an adopter repo moves from one methodology version to another, **four artefacts must move together** — specs, skill bundle, CLI, and the vendored whole-repo validator — in this order:

1. **Bump `methodology_version`** in the adopter's `transitrix.yaml` to the new version string.
2. **Run the migration recipe** (MAJOR bump only) from `migrations/<prev>-to-<this>/` in this repo:
   ```
   node migrations/<prev>-to-<this>/codemod.mjs <adopter-root> --dry-run   # preview
   node migrations/<prev>-to-<this>/codemod.mjs <adopter-root>              # apply
   node migrations/<prev>-to-<this>/validate.mjs <adopter-root>             # post-check
   ```
3. **Re-validate canon** to confirm the migrated artefacts are still valid:
   ```
   transitrix-ingest validate <candidates-dir>
   ```
4. **Reinstall `@transitrix/ingest-cli`** — the installed binary does not auto-update; it remains pinned to the version it was installed from. Re-run your install command and confirm `--version` reflects the new release. The package is not yet published to npm, so the install is local from a fresh checkout of this repo:
   ```
   npm install -g ./packages/ingest-cli   # or `npm link` from inside the package
   transitrix-ingest --version
   ```
   Once the CLI is extracted to its own tooling repo and published, `npm install -g @transitrix/ingest-cli` (or `npx @transitrix/ingest-cli --version`) becomes the equivalent shorthand.
5. **Re-fetch `.validators/lint.py`** if `tools/lint.py` changed in this release (check the release notes) — this is a vendored copy, fetched once at scaffold time ([`transitrix/skills/onboard/SKILL.md`](transitrix/skills/onboard/SKILL.md) Step 2), and it does not auto-update either:
   ```
   curl -fsSL https://raw.githubusercontent.com/transitrix/methodology/vX.Y.Z/tools/lint.py -o .validators/lint.py
   ```
6. **Run `repo-check`** to confirm version currency:
   ```
   transitrix-ingest repo-check [org-root]
   ```
   A clean run shows `tooling.ok: true` and no version-mismatch red flag. If `tooling.ok: false` still appears, the installed binary is still the old version — repeat step 4.
7. **Re-resolve the coverage profile** (if the new release changed the preset vocabulary — see `COVERAGE_PROFILES.md` §7 for what changes between versions). Fix `transitrix.yaml` if needed, then re-run `repo-check` to clear any `coverage_warning`.

Steps 1–3 handle the **spec and canon**; step 4 handles the **CLI**; step 5 handles the **whole-repo validator**; steps 6–7 confirm all four artefacts are in sync. Skipping step 4 leaves the CLI binary stale — it will run against new artefacts with old validators and a mismatched coverage-preset vocabulary. Skipping step 5 leaves `.validators/lint.py` on its scaffold-time snapshot — any fix or rule change landed in `tools/lint.py` since then stays invisible to the adopter's own CI.

---

## Skill `min_version` convention

Every skill file (`transitrix/skills/<name>/SKILL.md`) carries a `min_version` field in its YAML frontmatter declaring the minimum methodology version required to use the skill:

```yaml
---
name: Transitrix Ingest
# ...
min_version: "0.6.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---
```

**Rules:**

- `min_version` is the first methodology version in which the skill was added or last had a **breaking change** (new required step, changed CLI interface, removed capability). Additive improvements to an existing skill do not require a bump.
- `min_version` is a hard floor: the adopter's agent uses the table in `AGENTS.md §14` to refuse a skill invocation when the adopter's pinned version is below the floor.
- When a release changes a skill in a breaking way, **update `min_version` in that skill's `SKILL.md`** as part of the same PR. This is a precondition for tagging, alongside the migration recipe (for MAJOR) and the changelog entry.

**Administrator note — updating skills in adopter repos:**

Skills are not auto-synced to adopter repos. When the methodology releases a version that updates one or more skills, the adopter's administrator must:

1. Copy the updated skill files from `transitrix/skills/<name>/` into the adopter repo (at whatever path the adopter's `AGENTS.md §14` table references).
2. Update the `Min version` column in the adopter's `AGENTS.md §14` to match the new `min_version` value.
3. Commit the update as a separate PR titled `chore: update skills to methodology vX.Y.Z`.

For MAJOR releases, skills are updated **after** the migration recipe is applied and `transitrix.yaml` reflects the new version — not before.

---

## Discovery — noticing drift on a schedule

The mechanism in [`method/09-releases-and-propagation.md`](method/09-releases-and-propagation.md) §1–§6 says what an agent must do *once it has decided* to propose an upgrade. This section says how the deciding happens without a human having to ask, and does not change the ratification gate: everything Discovery emits still lands as a *proposed* ADR that a human ratifies ([`method/09-releases-and-propagation.md`](method/09-releases-and-propagation.md) §5, unchanged).

### The failure mode this closes

Two forms of drift are self-inflicted when nothing watches for them:

- **Pin-vs-release drift.** An adopter's `methodology_version` sits behind the latest tag long enough that catching up spans multiple bumps in one PR — the diff is larger, the migration recipes compound, the review is harder. The propagation contract still holds each individual upgrade, but the *decision to propose one* was never triggered.
- **Stale-proposed-ADR drift.** An agent-prepared ADR sits at `status: proposed` past the point a human was going to notice on their own — the ratification gate works as designed, but the queue has no reminder.

Neither is a failure of the propagation contract; both are failures of *nobody looked*. Discovery is the periodic look.

### The scheduled-trigger contract

A recurring job runs against each source repo's registered downstream consumers (below). For each consumer, per run, it:

1. Invokes the existing version-currency check — [`transitrix-ingest repo-check`](transitrix/skills/repo-check/SKILL.md) — on the consumer's checkout, reading its pinned `methodology_version` and comparing against the latest released tag on the source repo.
2. **Where the pin is behind the latest tag**, invokes the existing recipe/sync mechanism ([`method/09-releases-and-propagation.md`](method/09-releases-and-propagation.md) §4) and opens the *already-specified* bounded PR: exactly the diff that section permits (pin field, recipe-scoped codemod output, one ADR with `author: agent` + `status: proposed`, and in the fallback transport the vendored artefacts). The PR opened by Discovery is *the same PR shape* — Discovery adds no new fields, no new diff surface, and no new merge path.
3. **Where the pin is current**, emits nothing for that consumer beyond a "current" line in the digest (below).

The job never merges, never flips a status, and never edits a source repo. Its only write is the bounded PR already permitted; the ratification gate is untouched.

### The stale-proposed-ADR reminder

The same job scans each registered consumer's decision folder (per the consumer's registry entry, below) for records at `status: proposed` whose `date:` is older than **fourteen calendar days**. Each such record is flagged in the same digest as the pin-vs-release output — one queue, one look.

Fourteen days is chosen because it is short enough that a single missed weekly review cycle does not trip the reminder, and long enough that it does not compete with the normal review cadence. The threshold is a property of Discovery, not of the ADL: an ADR sitting `proposed` is not itself an integrity violation ([`method/07-decisions.md`](method/07-decisions.md) §7) — the reminder just says *this one has been waiting a while*.

The reminder is a *flag in the digest*, not a state change on the ADR. Discovery never edits an ADR; the record is immutable except for a human ratifying `proposed → accepted` in a reviewed change ([`method/08-governance.md`](method/08-governance.md) §3). A ratification later than fourteen days is normal and is not itself a problem — the reminder exists so that ratification happens at all.

The on-demand half of this visibility gap is closed by `transitrix-ingest workflow-status` ([`method/06-team-operations.md`](method/06-team-operations.md) §3.2) — an adopter or agent can run it at any time to see every ADR currently at `proposed`, `author: agent` broken out from human-authored, without waiting for a scheduled run. `workflow-status` deliberately reports phases and counts only, never age, so it has no equivalent of the fourteen-day filter above; the scheduled job may still consume its `--format yaml` output for the underlying list of proposed-ADR ids rather than re-walking `operations/decisions/` itself, then apply its own age threshold on top.

### The downstream-consumer registry — contract

Each source repo that participates in Discovery declares its known downstream consumers in a machine-readable registry at the repo root. The registry is the discovery job's iteration input: without it, "check each adopter" has no operand.

**Location:** `adopters.yaml` at the source repo root. One file per source repo. The methodology repo carries the registry naming methodology's adopters (starting with acme-corp); a downstream source repo — e.g. acme-corp itself, whose downstream consumers are transitrix-studio's mirror and transitrix-dsm's demo-seed — carries the same-shape file naming *its* consumers. The shape is reusable across hops unchanged (the same reuse applies to the reference-catalog layer, [`method/09-releases-and-propagation.md`](method/09-releases-and-propagation.md) §6).

**Schema:**

```yaml
# adopters.yaml — machine-readable registry of downstream consumers of this repo.
# Read by the Discovery job; never edited by the job itself.
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

- **`pin_file` + `pin_key`** — the version slot referred to above. Named explicitly so a downstream registry (e.g. acme-corp → studio) can point at whatever pin field the next layer uses without Discovery baking in `methodology_version` as the only recognised key.
- **`decisions_path`** — the ADR folder scanned above. Named explicitly so a consumer using `docs/decisions/` instead of `operations/decisions/` is discoverable ([`method/07-decisions.md`](method/07-decisions.md) §3).
- **`role`** — free-form label used only to group entries in the digest. Not a validated enum.
- **`clone`** — the URL the job clones from. Discovery reads only; it does not push to consumers.

**Reusability guarantee.** The schema above is what acme-corp's own `adopters.yaml` uses to name transitrix-studio and transitrix-dsm as its downstream consumers, with `pin_file` / `pin_key` set to whatever field those consumers pin acme-corp under. The same discovery job shape runs one hop further down without change — the mechanism defined here is the whole mechanism for the chain.

**Worked example — the pin an adopter's ADR records.** [`operations/decisions/ADR-0002-pin-methodology-0-5-0.md`](https://github.com/transitrix/acme-corp/blob/main/operations/decisions/ADR-0002-pin-methodology-0-5-0.md) in the acme-corp reference repo is the shape of the ADR the Discovery job's proposed upgrade PR carries: `author: agent`, `status: proposed`, one bump recorded, awaiting human ratification. Discovery's job is to notice when a repo *should have* an ADR like that one but does not yet, and to open the PR that adds it.

### What the digest reports

One digest per run, one entry per registered consumer. For each consumer:

- **`current`** — pin matches the latest source-repo tag; no PR opened; noted in the digest so a healthy consumer is visible, not silent.
- **`behind`** — pin is behind the latest tag; a link to the bounded PR the job just opened (or the existing one it found already open — Discovery is idempotent, below).
- **`stale-proposed`** — zero or more ADRs at `status: proposed` older than fourteen days, each with its `id:` and its age in days.

The digest is Discovery's only user-visible output beyond the PRs themselves. Where the digest lives (Actions summary, a scheduled comment on a tracking issue, an emailed report) is an implementation detail deliberately left open, below.

### Idempotence

Discovery runs on a schedule; two runs a day apart with no intervening release must not produce two PRs, two ADRs, or two digest reminders for the same drift. The mechanics:

- **Bounded PR for a pin bump.** Before opening one, the job checks for an open PR on the consumer repo that already bumps `pin_key` to the target version and carries an `author: agent` + `status: proposed` ADR. If one exists, the digest links it; a new one is not opened. The check matches on ADR front-matter — `title`/body naming the same `pin_key` and target version — not on filename: a date-slug id ([`method/07-decisions.md`](method/07-decisions.md) §2) encodes the record's creation date, not the pinned component or version, so filename can no longer stand in for content.
- **Stale-proposed reminder.** Re-flagging the same ADR on every run is intentional — the reminder is a standing signal until the ratification happens. It is not a notification storm because each run emits one digest, not one message per finding.

### What this section does NOT define

- **Where the job runs.** GitHub Actions cron on the source repo, an external runner, or an internal automation platform — all satisfy the contract. The mechanism is the same regardless.
- **How the digest is delivered.** An Actions summary, a comment on a tracking issue, an email — all satisfy the contract. The digest shape above is the invariant.
- **Cross-hop authentication.** Whether the job clones consumer repos with a machine account, a fine-scoped PAT, or an app installation is deployment policy, not part of the propagation contract.
- **A merge-side notifier.** Discovery notices *drift*; it does not notice *acceptance*. Ratification of a proposed ADR is already visible as a normal PR review and does not need Discovery to announce it.

---

## What this file does NOT cover

- **Compatibility semantics** — what each bump promises adopters. See [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.
- **Migration recipe format** — see the recipe folders under [`migrations/`](migrations/) and [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.4.
- **Migration CLI (`transitrix migrate`)** — lives in Transitrix Studio, not in this repo.
- **The 1.0 cut decision** — a deliberate future release, gated on the in-flight schema work landing.
- **Releases of Transitrix Studio, DSM, the Skill bundle, or any other downstream artefact** — each has its own SemVer policy and its own RELEASING.md.
