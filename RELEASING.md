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
2. **Update `methodology_version` in the [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) reference repo's `transitrix.yaml`** to the new version, via a companion PR in that repo. acme-corp is the fixture adopter and tracks the latest released version.
3. **Update each notation spec's `version:` frontmatter** if any spec changed in this release. (`spec_version` on individual files is informational — see CONTRACT §10.1 — so this step is bookkeeping for discoverability, not enforcement.)
4. **Write release notes** describing what changed by category (`Added`, `Changed`, `Fixed`, `Removed`). Reference PR numbers.
5. **For a `MAJOR` release** — ship a migration recipe under `migrations/<prev>-to-<this>/` (recipe format: see [`migrations/`](migrations/) and [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.4). The recipe is a precondition for the tag.
6. **Tag** the release commit with `vX.Y.Z`.
7. **Publish** the release notes as a GitHub Release on the tag.
8. **Announce** the release (channel TBD with the maintainer).

---

## Adopter upgrade procedure

The conceptual companion to this section — the **propagation mechanism**: transport, the named operation, the ratification gate on autonomous agents, and what makes the upgrade *bounded / traceable / reproducible* — lives in [`method/04-methodology-update-propagation.md`](method/04-methodology-update-propagation.md). This section is the operational checklist; that document is the contract the checklist satisfies.

When an adopter repo moves from one methodology version to another, **three artefacts must move together** — specs, skill bundle, and CLI — in this order:

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
5. **Run `repo-check`** to confirm version currency:
   ```
   transitrix-ingest repo-check [org-root]
   ```
   A clean run shows `tooling.ok: true` and no version-mismatch red flag. If `tooling.ok: false` still appears, the installed binary is still the old version — repeat step 4.
6. **Re-resolve the coverage profile** (if the new release changed the preset vocabulary — see `COVERAGE_PROFILES.md` §7 for what changes between versions). Fix `transitrix.yaml` if needed, then re-run `repo-check` to clear any `coverage_warning`.

Steps 1–3 handle the **spec and canon**; step 4 handles the **CLI**; steps 5–6 confirm the three artefacts are in sync. Skipping step 4 leaves the CLI binary stale — it will run against new artefacts with old validators and a mismatched coverage-preset vocabulary.

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

## What this file does NOT cover

- **Compatibility semantics** — what each bump promises adopters. See [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.
- **Migration recipe format** — see the recipe folders under [`migrations/`](migrations/) and [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.4.
- **Migration CLI (`transitrix migrate`)** — lives in Transitrix Studio, not in this repo.
- **The 1.0 cut decision** — a deliberate future release, gated on the in-flight schema work landing.
- **Releases of Transitrix Studio, DSM, the Skill bundle, or any other downstream artefact** — each has its own SemVer policy and its own RELEASING.md.
