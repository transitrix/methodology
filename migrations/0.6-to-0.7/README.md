# Migration recipe — methodology 0.6 → 0.7

The on-disk migration recipe an adopter follows when upgrading from methodology version 0.6 to 0.7. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.4 and [`RELEASING.md`](../../RELEASING.md); see also [`CHANGELOG.md`](../../CHANGELOG.md) (0.7.0).

## What this recipe covers — FACTOR → DRIVER rename

0.7.0 renames the element TYPE `FACTOR` to `DRIVER` to align with ArchiMate 3.2 motivation-layer terminology.

| Location | 0.6 form | 0.7 form |
|---|---|---|
| Element file name | `factors/FACTOR-*.yaml` | `factors/DRIVER-*.yaml` |
| `notation:` field | `notation: factor` | `notation: driver` |
| `id:` field | `id: FACTOR-EU-REG-1` | `id: DRIVER-EU-REG-1` |
| ID references in view arrays | `factors: [FACTOR-EU-REG-1]` | `factors: [DRIVER-EU-REG-1]` |
| YAML array key | `factors:` | **unchanged** — `factors:` |
| Inline cross-ref field | `goal.factors: [FACTOR-…]` | **unchanged** — `goal.factors:` key stays; only the ID value changes |

**Adopters who have not yet populated `canon/elements/01_motivation/factors/`** (most early adopters) have nothing to migrate — only element files are affected. View files that contain no `FACTOR-*` ID values also need no edits.

## Gradual upgrade

This migration is intentionally **gradual**: the YAML structural keys (`factors:`, `goal.factors[]`, `references_constraint`) are not renamed. This means:

- **Existing view files are immediately valid** on 0.7 with no changes.
- Only **element files** (`FACTOR-*.yaml`) need updating, and only when you choose to bring them forward.
- **Validators accept legacy `FACTOR-*` IDs** in all structural-key values (e.g. `factors: [FACTOR-EU-REG-1]`) until the 1.0 cut. A `DRIVER-TYPE-LEGACY-001` warning fires on legacy IDs to guide incremental migration, but does not block validation.

You can migrate element files one at a time without touching view files, and your canon remains valid throughout.

## What to migrate

### Step 1 — Rename element files (if you have any)

For each file under `canon/elements/01_motivation/factors/FACTOR-*.yaml`:

```bash
# Example: rename one file
mv canon/elements/01_motivation/factors/FACTOR-EU-REG-1.yaml \
   canon/elements/01_motivation/factors/DRIVER-EU-REG-1.yaml
```

Inside the renamed file, update two fields:

```yaml
# Before
notation: factor
id: FACTOR-EU-REG-1

# After
notation: driver
id: DRIVER-EU-REG-1
```

### Step 2 — Update ID references in view files (optional until 1.0)

In your `*.dgca.transitrix.yaml` files (formerly `*.fgca.transitrix.yaml` / `*.fga.transitrix.yaml`), the `factors[]` array entries and `goal.factors[]` values that reference `FACTOR-*` IDs should be updated to match the renamed element files. The YAML key stays unchanged:

```yaml
# Before (valid, produces a DRIVER-TYPE-LEGACY-001 warning)
factors:
  - id: FACTOR-EU-REG-1
    name: "EU regulatory window"
goals:
  - id: GOAL-COMPLIANCE-1
    factors: [FACTOR-EU-REG-1]

# After (clean, no warning)
factors:
  - id: DRIVER-EU-REG-1
    name: "EU regulatory window"
goals:
  - id: GOAL-COMPLIANCE-1
    factors: [DRIVER-EU-REG-1]
```

Note: the `factors:` key and `goal.factors:` field names are **not changed**.

### Step 3 — Bump `methodology_version`

```yaml
# transitrix.yaml
methodology_version: "0.7.0"
```

### Step 4 — Re-run `repo-check`

```bash
transitrix-ingest repo-check [org-root]
```

A clean run shows `tooling.ok: true` with no version-mismatch flag. If `DRIVER-TYPE-LEGACY-001` warnings remain, they point to view files that still reference `FACTOR-*` IDs (Step 2 above).

## Codemod

`codemod.mjs` automates Steps 1–2 (element file rewrite + cross-reference substitution).
It is idempotent — re-running on a fully migrated repo is a no-op.

```bash
# Preview — shows what would change without writing any files
node migrations/0.6-to-0.7/codemod.mjs <adopter-root> --dry-run

# Apply
node migrations/0.6-to-0.7/codemod.mjs <adopter-root>

# Post-migration check
node migrations/0.6-to-0.7/validate.mjs <adopter-root>
```

`validate.mjs` exits 0 if no `notation: factor` / `id: FACTOR-…` element files remain.
Files that still reference `FACTOR-…` IDs in cross-reference value positions are
reported as informational notices (valid until 1.0 cut; produces a
`DRIVER-TYPE-LEGACY-001` warning from the runtime validator, not a failure).

The shell one-liners in the manual steps above remain valid as an alternative for
adopters who prefer them. Review the diff carefully in either case — the `factors:`
key must not be renamed.

## Folder shape

```
migrations/0.6-to-0.7/
├── README.md
├── codemod.mjs          # idempotent transform; runs Steps 1–2
├── validate.mjs         # post-migration check; exits 0 on clean repo
└── fixtures/
    ├── before/          # minimal adopter repo before migration (FACTOR-* form)
    └── after/           # the same after running codemod.mjs (DRIVER-* form)
```
