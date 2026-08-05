# Migration recipe — methodology 3.1 → 4.0

The on-disk migration recipe an adopter follows when upgrading to methodology version 4.0, whenever that major ships. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.4. Landed ahead of the actual `4.0.0` release per §10.6 — the deprecation's replacement (DGCA) has been settled since `2.0.0`, so the recipe does not wait for the major-release cut.

## What this recipe covers — FGA retirement

`4.0.0` removes the `fga` notation key. FGA (`*.fga.transitrix.yaml`, `notation: fga`) was deprecated in `2.0.0` (2026-07-12) in favour of DGCA with the Changes layer toggled off; see [`notations/views/diagrams/03-fga.md`](../../notations/views/diagrams/03-fga.md) and [CONTRACT.md](../../notations/CONTRACT.md) §10.6.

| Location | 3.x form | 4.0 form |
|---|---|---|
| File name | `*.fga.transitrix.yaml` | `*.dgca.transitrix.yaml` |
| `notation:` field | `notation: fga` | `notation: dgca` |
| Changes layer | absent (FGA had no Changes layer) | `view_config.layers.changes: off` |
| `factors[]` / `goals[]` / `actions[]` | unchanged | unchanged |

FGA had no `changes[]` layer at all — `view_config.layers.changes: off` is exactly the DGCA config that reproduces that 3-layer Driver → Goal → Activity shape (DGA mode; see `02-dgca.md` §"Layer toggles"). No other field is renamed.

## What to migrate

### Step 1 — Rename the file and swap the notation key

```bash
mv strategy.fga.transitrix.yaml strategy.dgca.transitrix.yaml
```

```yaml
# Before
notation: fga

# After
notation: dgca
```

### Step 2 — Add the Changes-layer toggle

```yaml
view_config:
  layers:
    changes: off
```

### Step 3 — Bump `methodology_version`

```yaml
# transitrix.yaml
methodology_version: "4.0.0"
```

### Step 4 — Re-run `repo-check`

```bash
transitrix-ingest repo-check [org-root]
```

## Codemod

`codemod.mjs` automates Steps 1–2.
It is idempotent — re-running on a repo with no remaining `*.fga.transitrix.yaml` files is a no-op.

```bash
# Preview — shows what would change without writing any files
node migrations/3.1-to-4.0/codemod.mjs <adopter-root> --dry-run

# Apply
node migrations/3.1-to-4.0/codemod.mjs <adopter-root>

# Post-migration check
node migrations/3.1-to-4.0/validate.mjs <adopter-root>
```

`validate.mjs` exits `0` if no `*.fga.transitrix.yaml` file and no `notation: fga` remain; exits `1` with the offending file list otherwise.

## Folder shape

```
migrations/3.1-to-4.0/
├── README.md
├── codemod.mjs          # idempotent transform; runs Steps 1–2
├── validate.mjs         # post-migration check; exits 0 on clean repo
└── fixtures/
    ├── before/          # minimal adopter repo before migration (fga form)
    └── after/           # the same after running codemod.mjs (dgca form)
```
