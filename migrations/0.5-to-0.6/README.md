# Migration recipe — methodology 0.5 → 0.6

The on-disk migration recipe an adopter follows when upgrading from methodology version 0.5 to 0.6. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.4 and [`RELEASING.md`](../../RELEASING.md); see also [`CHANGELOG.md`](../../CHANGELOG.md) (0.6.0).

## What this recipe covers — the Actors decision

0.6.0 retires the `UNIT` and `EMPLOYEE` element TYPEs and unifies active-structure **identity** under a single `ACTOR` TYPE (`type ∈ {person, business_unit, system}`), per [`notations/elements/19-actors.md`](../../notations/elements/19-actors.md). Identity (the actor) is separated from engagement and ownership:

| 0.5 form | 0.6 form |
|---|---|
| `UNIT-…` element file | `ACTOR-…` with `type: business_unit` (in `canon/elements/02_business/actors/`) |
| `EMPLOYEE-…` element file | `ACTOR-…` with `type: person` **+** an `employment` REL ([`17-relations.md`](../../notations/elements/17-relations.md) §3) carrying the dates and role assignments |
| activity `unit:` / `employee:` / free-text `owner:` | one `owner: ACTOR-…` ([`07-activities.md`](../../notations/views/07-activities.md) §5.6) |
| `ROLE.unit: UNIT-…` | `ROLE.unit: ACTOR-…` (an `ACTOR` of `type: business_unit`) |

**Migration cost is near-zero in practice.** `UNIT` and `EMPLOYEE` were registered schema-only on 2026-05-29 and removed the same day; no adopter had populated them. This recipe exists for any adopter who began populating them between registration and the 0.6 cut.

## What the codemod does (safe, automatic)

- **Transform A — activity ownership collapse.** In `notation: activities | activity` files, rewrites `unit: UNIT-X` and `employee: EMPLOYEE-X | EMP-X` to `owner: ACTOR-<tail>`. Skips (and flags) an entry that already has a sibling `owner:` — that collapse is manual to avoid a duplicate key.
- **Transform B — `ROLE.unit` retarget.** In `notation: role` files, rewrites `unit: UNIT-X` → `unit: ACTOR-X`.
- **Transform D — `PROJECT_CARD` → `ACTIVITY_CARD` rename** (spec-level, no data migration). In `notation: project-card` files, rewrites the notation header → `activity-card`, root key `project_card:` → `activity_card:`, and doc-id prefix `PROJECT_CARD-` → `ACTIVITY_CARD-`, and renames the file `*.project-card.transitrix.yaml` → `*.activity-card.transitrix.yaml`. (Aligns the view name with the ACTIVITY-as-umbrella model; #112.)

## What is manual (the codemod flags, does not auto-apply)

- **`UNIT-…` / `EMPLOYEE-…` element files.** These need a move + (for EMPLOYEE) a split that can't be synthesised deterministically:
  - `UNIT-…` → move to `canon/elements/02_business/actors/`, set `notation: actor` + `type: business_unit`, rename `UNIT-…` → `ACTOR-…`.
  - `EMPLOYEE-…` → an `ACTOR(type: person)` **plus** an `employment` REL (`canon/relations/`, `type: employment`) carrying the role assignments and employment dates. Splitting identity from engagement is a human judgement (which dates, which roles).
  
  The codemod reports each such file with its mapping and **exits non-zero**, leaving the file unchanged so the adopter handles it explicitly.

## Folder shape

```
migrations/0.5-to-0.6/
├── README.md         # this file
├── codemod.mjs       # safe transforms A + B; detection + report for manual cases
├── validate.mjs      # post-migration check — no UNIT / EMPLOYEE residue
└── fixtures/
    ├── before/       # tiny adopter tree on 0.5 form
    └── after/        # the same tree after the codemod
```

## Conventions

Pure-Node (≥ 20), idempotent, `[--dry-run] [target-dir]` CLI, diff-style summary, exits non-zero on unsafe ambiguity (leaving the offending file unchanged).

## Running

```bash
# preview
node migrations/0.5-to-0.6/codemod.mjs --dry-run /path/to/adopter-repo
# apply
node migrations/0.5-to-0.6/codemod.mjs /path/to/adopter-repo
# handle any flagged UNIT/EMPLOYEE element files manually (see above), then verify
node migrations/0.5-to-0.6/validate.mjs /path/to/adopter-repo
```

A clean run exits `0`; a non-zero exit means UNIT/EMPLOYEE element files still need the manual move + split. After migrating, bump `methodology_version` in the adopter's `transitrix.yaml` to `0.6.x`.

## Self-test

```bash
cp -r migrations/0.5-to-0.6/fixtures/before /tmp/m && \
  node migrations/0.5-to-0.6/codemod.mjs /tmp/m && \
  diff -r /tmp/m migrations/0.5-to-0.6/fixtures/after && \
  node migrations/0.5-to-0.6/validate.mjs migrations/0.5-to-0.6/fixtures/after
```
