# RACI matrix (blocks notation, matrix subset)

A forkable RACI — who is **R**esponsible / **A**ccountable / **C**onsulted / **I**nformed across a set of activities — expressed as the `blocks` notation's [matrix subset](../../notations/views/08-blocks.md#4a-top-level-structure--matrix-subset-grid-root) (`grid:` root).

## Fork and go

1. Copy [`raci.blocks.transitrix.yaml`](raci.blocks.transitrix.yaml) into your own repository (or fork this one).
2. Edit `grid.columns` — one entry per role in your RACI (rename or add/remove roles).
3. Edit `grid.rows` — one entry per activity, with an `assign:` map giving each involved role a letter (`R`, `A`, `C`, or `I`). Omit a role from `assign` if it has no involvement in that row.
4. Validate: `npx @transitrix/cli validate raci.blocks.transitrix.yaml --template raci` (Windows PowerShell: `npx.cmd`). See "Implementation status" below — `--template raci` needs a CLI release newer than the one currently on npm.

## The layout convention

- **One row = one activity.** `rows[].name` is the activity label; `rows[].id` is a document-local identifier (no whitespace).
- **One column = one role.** `columns[].name` is the role label; `columns[].id` is a document-local identifier.
- **A cell = `rows[r].assign[<column id>]`.** Its value is the RACI letter. A role not involved in an activity simply has no key in that row's `assign` — leave it out rather than writing a blank value.

## The modelling rule this template applies

**Exactly one `A` per row.** A RACI where an activity has zero Accountable owners has no one answerable for it; one with two has an ambiguous owner. This is a convention *this template* applies on top of the base `blocks` matrix subset — the base notation does not fix what `assign` values mean or constrain how many of a given value may appear in a row (see [08-blocks.md §6a](../../notations/views/08-blocks.md#6a-template-level-invariants-matrix-subset)). Other matrix templates (a coverage grid, a status board) would define their own rule, or none.

**Implementation status.** Transitrix Studio's `blocks` validator now recognises the `grid:` root form (`BL-020`–`BL-025`) and can enforce this template's "exactly one `A` per row" rule via `npx @transitrix/cli validate raci.blocks.transitrix.yaml --template raci` — landed in [transitrix-studio#411](https://github.com/transitrix/transitrix-studio/pull/411) (merged 2026-07-26). **Not yet on the published npm package**, though: `@transitrix/cli`'s latest release predates that merge, so `npx @transitrix/cli` will not resolve `--template raci` until the next CLI release ships it. Until then, either build from a `transitrix-studio` clone (`npm install && npm run build`, then `npm run transitrix -- validate raci.blocks.transitrix.yaml --template raci`) or keep checking the rule by eye.

## Alternative: role-first orientation

The convention above puts activities on rows and roles on columns. If your RACI reads more naturally the other way around, swap them — `grid.columns` becomes the activities, `grid.rows` becomes the roles, and each row's `assign` maps activity-id → letter. The schema does not prefer one orientation over the other; pick whichever matches how your organisation already talks about the matrix.

## What this is not

This is a **document-local visual/data convention** on top of the `blocks` matrix subset — not a queryable, general-purpose RACI data model. If you need to query "who is Accountable across all activities" programmatically at scale, treat this template as a starting point to adapt, not a fixed data contract.
