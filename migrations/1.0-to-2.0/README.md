# Migration recipe — methodology 1.0 → 2.0

The on-disk migration recipe an adopter follows when upgrading from methodology
version 1.0 to 2.0. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md)
§10.4 and [`RELEASING.md`](../../RELEASING.md); see also
[`CHANGELOG.md`](../../CHANGELOG.md) (2.0.0).

---

## What this recipe covers

**Inline authoring is the default.** As of the 2026-07-14 inline-authoring ADR
(`architecture/cross-project/2026-07-14-inline-authoring-until-promotion.md`),
`*.goals.transitrix.yaml` files with inline `goals[]` and
`*.action.transitrix.yaml` files with inline `actions[]` are valid and do not
need migration. Inline is the self-contained default; the projection form is for
Full-tier adopters whose elements are shared across documents.

This recipe is therefore **optional** — run it when you want to promote elements
from an inline view to standalone canonical files so they can be shared across
multiple views or documents. The trigger for promotion is cross-document sharing,
not a methodology version requirement.

| Transform | Inline (valid v1 and v2) | Promoted (canonical elements) |
|---|---|---|
| **A** | `*.goals.transitrix.yaml` with `goals[]` inline | standalone `GOAL-*.yaml` element files in `canon/elements/01_motivation/goals/` |
| **B** | `*.action.transitrix.yaml` with `actions[]` inline | standalone `ACTION-*.yaml` element files in `canon/elements/05_implementation/actions/` |

The codemod writes the element files but **does not strip inline data from the view** — after promotion the view file is still self-contained. Adopters who want a pure `view_config` projection may then manually remove the inline arrays from the view.

---

## Transform A — Goals Tree: extract inline goals

For each `*.goals.transitrix.yaml` file that carries a `goals[]` array:

### A.1 — Extract each goal entry to a standalone element file

For each entry in `goals[]`, create
`canon/elements/01_motivation/goals/<ID>.yaml` if it does not already exist:

```yaml
notation: goal
id: GOAL-REVENUE-1                    # the id from the inline entry
name: "Triple revenue by 2028"        # the name from the inline entry
type: "Strategy"                      # the type from the inline entry
level: 0                              # the level from the inline entry
parent: null                          # the parent from the inline entry (or omit)
description: >                        # description from the inline entry (if any)
  ...

zone: canon
admitted_at: "YYYY-MM-DD"            # use the inline entry's valid_from date
admitted_by: "migration-1.0-to-2.0"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

valid_from: "YYYY-MM-DD"             # from the inline entry's valid_from
valid_to: null                        # from the inline entry's valid_to
```

If an element file already exists for an ID in `goals[]`, the existing file is
authoritative — do not overwrite it. The codemod skips existing files.

### A.2 — View file is not changed

The codemod does **not** rewrite the view file. After running, the view file
still carries its inline `goals[]` and `goal_types[]` — it remains self-contained
and valid. Adopters who want to convert the view to a pure `view_config` projection
(no inline data) may do so manually by removing `goal_types[]` and `goals[]` from
the document root and adding the `view_config` block as shown in §4 of
`notations/views/04-goals.md`.

---

## Transform B — Action Schedule: extract inline actions

For each `*.action.transitrix.yaml` file that carries an `actions[]` array:

### B.1 — Extract each action entry to a standalone element file

For each entry in `actions[]`, create
`canon/elements/05_implementation/actions/<ID>.yaml` if it does not already
exist:

```yaml
notation: action
id: ACTION-GDPR-GAP-1                 # the id from the inline entry
name: "GDPR & NIS2 gap assessment"    # the name from the inline entry
type: Project                         # the type from the inline entry
parent: ACTION-GDPR-REMEDIATION-1    # the parent from the inline entry (or omit)
goals: [GOAL-EU-1]                    # the goals from the inline entry (or omit)
delivers_changes: []                  # the delivers_changes from the entry (or omit)
duration: 15                          # the duration from the inline entry (or omit)
start_date: "2026-03-01"             # the start_date from the entry (or omit)
end_date: null                        # the end_date from the entry (or omit)
predecessors: []                      # the predecessors from the entry (or omit)
owner: ROLE-DPO-1                    # the owner from the entry (or omit)
description: >                        # description from the inline entry (if any)
  ...

zone: canon
admitted_at: "YYYY-MM-DD"            # use the inline entry's valid_from date
admitted_by: "migration-1.0-to-2.0"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

valid_from: "YYYY-MM-DD"             # from the inline entry's valid_from
valid_to: null                        # from the inline entry's valid_to
```

If an element file already exists for an ID in `actions[]`, skip it — the
existing file is authoritative.

### B.2 — View file is not changed

The codemod does **not** rewrite the view file. After running, the view file
still carries its inline `actions[]` and `project:` block — it remains
self-contained and valid. Adopters who want to convert the view to a pure
`view_config` projection (no inline data) may do so manually by removing
`project:` and `actions[]` from the document root and adding a `view_config`
block as shown in §4 of `notations/views/07-action.md`.

---

## Step 1 — Run the codemod

`codemod.mjs` automates Transforms A and B.

```bash
# Preview (no files written)
node migrations/1.0-to-2.0/codemod.mjs <adopter-root> --dry-run

# Apply
node migrations/1.0-to-2.0/codemod.mjs <adopter-root>

# Post-migration check
node migrations/1.0-to-2.0/validate.mjs <adopter-root>
```

The codemod requires Node ≥ 20. No external dependencies.

---

## Step 2 — Review generated element files and bump `methodology_version`

The codemod generates element files with `admitted_by: "migration-1.0-to-2.0"`.
Review each generated file and:
1. Confirm the `name`, `type`, `level`, and `description` are correct.
2. Confirm the `admitted_at` and `valid_from` dates are accurate.
3. Add any fields that were not captured in the inline entry (e.g. `link`, `tag`).

Then bump the manifest:

```yaml
# transitrix.yaml
methodology_version: "2.0.0"
```

---

## Step 3 — Re-run validation

```bash
transitrix-ingest validate <candidates-dir>
node migrations/1.0-to-2.0/validate.mjs <adopter-root>
```

A clean run confirms all promoted element files are well-formed and resolve
their cross-references correctly.

---

## Folder shape

```
migrations/1.0-to-2.0/
├── README.md
├── codemod.mjs       # automates Transforms A and B; idempotent
├── validate.mjs      # post-migration check; exits 0 on clean repo
└── fixtures/
    ├── before/       # minimal adopter repo in v1 inline format
    └── after/        # the same after codemod.mjs runs
```
