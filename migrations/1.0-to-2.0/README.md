# Migration recipe — methodology 1.0 → 2.0

The on-disk migration recipe an adopter follows when upgrading from methodology
version 1.0 to 2.0. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md)
§10.4 and [`RELEASING.md`](../../RELEASING.md); see also
[`CHANGELOG.md`](../../CHANGELOG.md) (2.0.0).

---

## What this recipe covers

2.0.0 completes the **view-purity migration** for the Goals Tree and Action
Schedule notations: both now project over the canonical element catalogue rather
than authoring elements inline. Adopters who have:

- `*.goals.transitrix.yaml` files carrying an inline `goals[]` array, **or**
- `*.action.transitrix.yaml` files carrying an inline `actions[]` array

must apply the transforms below. Adopters who never used these notations (e.g.
DGCA-only shops) have nothing to migrate.

| Transform | Old (v1 inline) | Canonical (required at v2.0) |
|---|---|---|
| **A** | `*.goals.transitrix.yaml` with `goals[]` inline | `view_config` + standalone `GOAL-*.yaml` element files |
| **B** | `*.action.transitrix.yaml` with `actions[]` inline | `view_config` + standalone `ACTION-*.yaml` element files |

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

### A.2 — Rewrite the view file to `view_config` format

Remove `goal_types[]` and `goals[]` from the document root. Add `view_config`
with the vocabulary and display settings. Remove `id` from the document root
if it conflicts (it moves to the view_config context; see §4 of the spec).

Before:
```yaml
notation: goals
spec_version: "0.1"

id: GOALS-STRAT-2026-1
name: "Strategy 2026 — Goals Tree"
generated_at: "2026-05-26"
description: "..."
period: "2026"
author: Transitrix

goal_types:
  - { name: "Strategy",       level: 0 }
  - { name: "Strategic Goal", level: 1 }

goals:
  - id: GOAL-REVENUE-1
    name: "Triple revenue by 2028"
    type: "Strategy"
    level: 0
    valid_from: "2026-05-26"
    valid_to: null
```

After:
```yaml
notation: goals
spec_version: "0.1"
methodology_version: "2.0.0"

id: GOALS-STRAT-2026-1
name: "Strategy 2026 — Goals Tree"
generated_at: "2026-05-26"
description: "..."
period: "2026"
author: Transitrix

view_config:
  goal_types:
    - { name: "Strategy",       level: 0 }
    - { name: "Strategic Goal", level: 1 }
  display:
    depth: null
    collapsed: []
```

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

### B.2 — Rewrite the view file to `view_config` format

Remove `project:` and `actions[]` from the document root. Add `view_config`
with scope (root_action + optional goal filter) and the schedule settings.
Add `id` field (`ACTION_SCHED-…`).

Before:
```yaml
notation: action
spec_version: "0.1"

title: "GDPR Remediation Programme 2026"
description: |
  ...
version: "0.2"

project:
  start_date: "2026-03-01"

actions:
  - id: ACTION-EU-COMPLIANCE-1
    name: "EU Data Protection Compliance Initiative"
    type: Initiative
    goals: [GOAL-EU-1]
    valid_from: "2026-01-01"
    valid_to: null
```

After:
```yaml
notation: action
spec_version: "0.1"
methodology_version: "2.0.0"

id: ACTION_SCHED-GDPR-REMEDIATION-1
name: "GDPR Remediation Programme 2026"
description: |
  ...

view_config:
  scope:
    root_action: ACTION-EU-COMPLIANCE-1  # top-level action from the old inline list
  schedule:
    start_date: "2026-03-01"             # from the old project.start_date
```

**Choosing `root_action`.** The codemod uses the first action entry with no
`parent` field (or `parent: null`) as `root_action`. For programmes and
initiatives that nest multi-level hierarchies, this is the Initiative or
Programme at the top of the tree. Review the generated `view_config` and
adjust if the codemod chose the wrong root.

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

## Step 2 — Review generated element files

The codemod generates element files with `admitted_by: "migration-1.0-to-2.0"`.
Review each generated file and:
1. Confirm the `name`, `type`, `level`, and `description` are correct.
2. Confirm the `admitted_at` and `valid_from` dates are accurate.
3. Add any fields that were not captured in the inline entry (e.g. `link`, `tag`).

---

## Step 3 — Bump `methodology_version`

```yaml
# transitrix.yaml
methodology_version: "2.0.0"
```

---

## Step 4 — Re-run validation

```bash
transitrix-ingest validate <candidates-dir>
node migrations/1.0-to-2.0/validate.mjs <adopter-root>
```

A clean run shows no inline-element errors (no `GOALS-008` or `ACT-010`).

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
