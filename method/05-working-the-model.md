---
title: Transitrix — working the model
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, methodology, change-lifecycle, validation]
---

# Working the model

> How a change to the model flows from a blank file to a merged, validated fact — and what checks it along the way.

## 1. Change lifecycle

Working with the Transitrix repository is structurally identical to working with a software codebase:

1. **Create.** Copy a template from `.templates/` into the appropriate `canon/elements/` or `canon/relations/` folder.
2. **Describe.** Fill in the YAML — element attributes or relation endpoints. Add metadata (owner, status, dates).
3. **Validate.** Run the linter (`.validators/lint.py`) locally. Fix syntax, integrity, and policy errors.
4. **Review.** Open a pull request. Reviewers see the change as a Git diff — the same review surface as for code.
5. **Publish.** Merge triggers CI: diagrams are regenerated, the architecture portal updates, downstream integrations refresh.

What this means for governance — every change is observable, reviewable, and reversible, and who may change what without a human in the loop — is stated once, as doctrine, in [`08-governance.md`](08-governance.md).

## 2. Validation matrix

The linter applies five categories of rules. Each category has progressively-deeper checks; this is the v1 baseline.

| Category | Check |
| --- | --- |
| **Syntax** | The file is valid YAML; required fields are present; types match the schema. |
| **Atomicity** | Element files contain no relations section; relation files contain no element fields beyond endpoints. |
| **Referential integrity** | Every `source` and `target` in a relation refers to an existing element id. |
| **Semantics** | Relations conform to ArchiMate 3.2 layer rules (e.g., a BusinessRole cannot be served by an ApplicationComponent without an intermediate ApplicationService). |
| **Policy** | Active status requires an `owner` field; recent updates require an `updated_at` date; deprecated elements must reference a successor. |

Validators run locally on save and as a CI gate on every pull request. A pull request that breaks the validation matrix cannot be merged — this is the mechanical half of the change gate; [`08-governance.md`](08-governance.md) states the doctrine it enforces.

---

**Next:** [`06-team-operations.md`](06-team-operations.md) — how a team running Transitrix organises its own decisions and work.

**Last reviewed:** 2026-08-16. Split from the former `01-methodology.md` §7–§8 — see [`method/01-methodology.md`](01-methodology.md) for the redirect.
**Status:** Active.
