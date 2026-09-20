---
title: How to record repository mechanics changes
status: active
last_reviewed: 2026-09-20
audience: public
license: MIT
tags: [transitrix, guide, repository, changelog]
---

# How to record repository mechanics changes

An adopter can keep a plain `CHANGELOG.md` to explain changes to how its model repository is maintained: methodology upgrades, notation or validation coverage, tooling, and local layout conventions. This is an **optional documentation convention**, with no new schema, validator rule, or mandatory repository-version field.

## Keep each history in its own place

| Question | Record |
| --- | --- |
| How did this repository's mechanics change, and what should contributors do? | The adopter's repository `CHANGELOG.md`, supported by its Git commits and review records. |
| What changed in the modelled enterprise, and when was it true? | Model elements, relations, admission records and lifecycle/history sidecars under the [shared contract](../notations/CONTRACT.md). A changelog summary cannot replace these records. |
| Which edition of a document was issued or approved? | The [issued-document record](how-to-preserve-issued-document-versions.md), with its own identity, approval and supersession history. A repository change does not issue a new document. |
| What did a Transitrix Methodology release change for all adopters? | Methodology's own [release changelog](../CHANGELOG.md). An adopter records when and how it adopted that release, rather than copying the release notes. |

The adopter manifest's [`methodology_version`](../notations/MANIFEST.md) identifies the methodology release the repository follows. It is not a version of the repository's contents. A dated changelog entry and a Git reference are enough for this convention; do not add a repository-version field to the manifest for it.

## Use a short dated log

Place `CHANGELOG.md` at the repository root, outside the model zones, and link it from the repository's README or contributor guide. In a repository containing several catalogues, name the affected catalogue or manifest in each entry so an upgrade is not mistaken for a change to all of them.

Keep completed changes newest first under `YYYY-MM-DD` headings. An optional `Unreleased` section can collect prepared changes; label pending checks or rollout explicitly, and move entries to a date only when the stated change has taken effect. This convention does not require release tags or semantic versions for the repository.

For each material change, record:

- **What changed:** the affected paths and previous/new versions, settings or conventions.
- **Contributor action:** any migration, regeneration or local setup needed; say when no action is needed.
- **Verification and limits:** the checks actually run, their outcome and coverage, and anything still pending. A configured check is not evidence that it passed.
- **Trace:** the relevant commit, pull request or local decision, using references that the repository's readers can access.

Group entries under `Methodology`, `Notations and coverage`, and `Tooling and layout` when useful; omit empty groups. Record changes to what is validated separately from changes to the facts being modelled. For example, adding validation of a view family does not establish completeness or compliance of the enterprise model.

Keep routine model edits in their existing histories. When a single change includes both a mechanics migration and model edits, record the mechanics here and point to the model changes without replacing their admission or history records. Keep the rationale for a substantial local convention in the team's decision log and cite it briefly.

## Complete synthetic example

The following is a complete illustrative `CHANGELOG.md` for a fictional single-catalogue repository. Dates, counts, local files and results are invented to show the format; they are not evidence of an actual migration or executed checks. The `conventions.md` files are contributor documentation outside the model zones. Replace the example details and traces with your own verified records before use.

```markdown
# Repository changelog

This log records changes to repository mechanics. Model facts and their history
remain in the model; issued documents retain their separate edition records.
Entries are dated changes, not repository releases.

## Unreleased

### Tooling and layout

- Prepared a move from manual view validation to a pull-request check.
  Contributor action: continue the existing manual check until CI is enabled.
  Verification: configuration reviewed; CI execution is pending.
  Trace: the proposed automation change in Git history for `.github/workflows/`.

## 2026-09-18

### Methodology

- Changed `transitrix.yaml` methodology_version from `5.0.0` to `6.0.0`
  after reviewing the published release notes and applicable migration guidance.
  Contributor action: use the pinned specification for subsequent edits and
  follow the updated validation instructions in `CONTRIBUTING.md`.
  Verification: repository lint and validation of all 12 existing view files
  passed with the tool versions recorded in `CONTRIBUTING.md`.
  Scope: this catalogue only; no new document editions were issued.
  Trace: the upgrade commit changing `transitrix.yaml` and `CONTRIBUTING.md`.

### Notations and coverage

- Added `capability-map` to the manifest's notations list and extended the
  documented validation scope to all three views in `views/capability-map/`.
  Contributor action: include capability-map views in the pre-review check.
  Verification: all three views passed validation. This covers view structure,
  not the completeness of the capability inventory or its assessments.
  Trace: the coverage change in Git history for `transitrix.yaml` and
  `CONTRIBUTING.md`.

## 2026-09-10

### Tooling and layout

- Moved contributor documentation from `docs/conventions.md` to root
  `CONVENTIONS.md` and updated the README link. Model-zone paths did not change.
  Contributor action: update bookmarks and use the new path when contributing.
  Verification: relative links in README and CONVENTIONS checked; no broken
  local targets found. No model data or issued documents changed.
  Trace: the rename commit in Git history for `CONVENTIONS.md` and `README.md`.
```

Before accepting a real entry, check that another contributor can find its trace, identify the affected scope, carry out the stated action, and distinguish completed verification from a plan. This is a review of the log's usefulness, not an additional admission gate.
