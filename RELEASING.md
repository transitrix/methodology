# Releasing the methodology

This document defines the per-release process for the Transitrix methodology. The compatibility policy itself — what `MAJOR` / `MINOR` / `PATCH` mean for adopters — is in [`notations/CONTRACT.md`](notations/CONTRACT.md) §10. This file describes the **process** the methodology maintainer follows to cut and ship a release.

The methodology is **pre-1.0**. Standard pre-1.0 SemVer applies (see CONTRACT §10.3) — `MINOR` bumps may carry breaking changes until the 1.0 cut. The full versioning-and-compatibility policy lives in CONTRACT §10; this file is the operational checklist.

---

## When to bump

| Bump | Examples |
|---|---|
| **PATCH** (`0.x.0` → `0.x.1`) | Clarification of an existing spec sentence; fixing a broken link; correcting a typo in an example; renumbering subsections without changing rule codes or field names. No schema change of any kind. |
| **MINOR** (`0.x` → `0.(x+1)`) | New optional field on an existing notation; new validation code at `info` or `warning` severity; new TYPE in `IDS_AND_REFERENCES.md` §3; new section in CONTRACT.md (e.g. §9 sidecar pattern); new notation spec file (e.g. `15-requirement.md`); pre-1.0 may also include changes that are technically breaking but that the maintainer judges low-impact. |
| **MAJOR** (`0.x` → `1.0`, `1.x` → `2.0`) | Renamed or removed field on an existing notation; changed validation severity (`warning` → `error`); changed enum membership in a closed enum (relations type, status enum, etc.); changed canonical ID grammar; required new field on an existing notation. Post-1.0, anything that breaks a previously-valid adopter file. |

If a single release combines multiple kinds of change, the bump is the **highest** of any individual change in the set.

---

## Per-release checklist

For every release, in order:

1. **Confirm the bump category.** Read every PR landed since the previous tag; categorise each change per the table above; pick the bump.
2. **Update `methodology_version` in `organizations/acme_corp/transitrix.yaml`** to the new version. acme_corp is the fixture adopter and tracks the latest released version.
3. **Update each notation spec's `version:` frontmatter** if any spec changed in this release. (`spec_version` on individual files is informational — see CONTRACT §10.1 — so this step is bookkeeping for discoverability, not enforcement.)
4. **Write release notes** describing what changed by category (`Added`, `Changed`, `Fixed`, `Removed`). Reference PR numbers.
5. **For a `MAJOR` release** — ship a migration recipe under `migrations/<prev>-to-<this>/` (format defined in epic #78 Phase 2). The recipe is a precondition for the tag.
6. **Tag** the release commit with `vX.Y.Z`.
7. **Publish** the release notes as a GitHub Release on the tag.
8. **Announce** the release (channel TBD with the maintainer).

---

## What this file does NOT cover

- **Compatibility semantics** — what each bump promises adopters. See [`notations/CONTRACT.md`](notations/CONTRACT.md) §10.
- **Migration recipe format** — epic #78 Phase 2 (separate task).
- **Migration CLI (`transitrix migrate`)** — epic #78 Phase 3 (lives in Studio, not in this repo).
- **The 1.0 cut decision** — epic #78 Phase 4 (gated on in-flight schema epics landing).
- **Releases of Transitrix Studio, DSM, the Skill bundle, or any other downstream artefact** — each has its own SemVer policy and its own RELEASING.md.
