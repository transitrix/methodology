# Migration recipe — methodology 3.1 → 4.0

The on-disk migration recipe an adopter follows when upgrading to methodology version 4.0, whenever that major ships. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.4. Both transforms below land ahead of the actual `4.0.0` release per §10.6 — each transform's replacement has already settled, so neither waits for the major-release cut.

| Transform | Covers |
|---|---|
| **A** | FGA retirement — `notation: fga` → `notation: dgca` |
| **B** | Recipe-file header rename — `template_id`/`template_version` → `recipe_id`/`recipe_version` |

---

## Transform A — FGA retirement

`4.0.0` removes the `fga` notation key. FGA (`*.fga.transitrix.yaml`, `notation: fga`) was deprecated in `2.0.0` (2026-07-12) in favour of DGCA with the Changes layer toggled off; see [`notations/views/diagrams/03-fga.md`](../../notations/views/diagrams/03-fga.md) and [CONTRACT.md](../../notations/CONTRACT.md) §10.6.

| Location | 3.x form | 4.0 form |
|---|---|---|
| File name | `*.fga.transitrix.yaml` | `*.dgca.transitrix.yaml` |
| `notation:` field | `notation: fga` | `notation: dgca` |
| Changes layer | absent (FGA had no Changes layer) | `view_config.layers.changes: off` |
| `factors[]` / `goals[]` / `actions[]` | unchanged | unchanged |

FGA had no `changes[]` layer at all — `view_config.layers.changes: off` is exactly the DGCA config that reproduces that 3-layer Driver → Goal → Activity shape (DGA mode; see `02-dgca.md` §"Layer toggles"). No other field is renamed.

### A.1 — Rename the file and swap the notation key

```bash
mv strategy.fga.transitrix.yaml strategy.dgca.transitrix.yaml
```

```yaml
# Before
notation: fga

# After
notation: dgca
```

### A.2 — Add the Changes-layer toggle

```yaml
view_config:
  layers:
    changes: off
```

---

## Transform B — Recipe-file header rename

`4.0.0` renames the required `.ttrs` header fields `template_id` / `template_version` to `recipe_id` / `recipe_version`, matching the recipe-naming decision (2026-08-23, `communications/tokens.md` §4a) that retires `template`/`skeleton` as names for this object across the document-view packages. This is the only field-level change — `document`, `kind`, and `canon` are unaffected, and the body syntax (transclusion tags, directive language) does not change.

| Location | 3.x form | 4.0 form |
|---|---|---|
| `.ttrs` header field | `template_id: <id>` | `recipe_id: <id>` |
| `.ttrs` header field | `template_version: "<ver>"` | `recipe_version: "<ver>"` |

### B.1 — Rename the header fields

```yaml
# Before
document: Market Requirements Document
kind: mrd
template_id: product.mrd
template_version: "1.0"
canon: canon

# After
document: Market Requirements Document
kind: mrd
recipe_id: product.mrd
recipe_version: "1.0"
canon: canon
```

No other field, and no part of the document body, changes.

---

## Step 1 — Run the codemod

`codemod.mjs` automates A.1–A.2 and B.1.
It is idempotent — re-running on a repo with no remaining `*.fga.transitrix.yaml` file and no remaining `template_id`/`template_version` header field is a no-op.

```bash
# Preview — shows what would change without writing any files
node migrations/3.1-to-4.0/codemod.mjs <adopter-root> --dry-run

# Apply
node migrations/3.1-to-4.0/codemod.mjs <adopter-root>

# Post-migration check
node migrations/3.1-to-4.0/validate.mjs <adopter-root>
```

`validate.mjs` exits `0` if no `*.fga.transitrix.yaml` file, no `notation: fga`, and no `template_id`/`template_version` header field remain anywhere under the target; exits `1` with the offending file list otherwise.

## Step 2 — Bump `methodology_version`

```yaml
# transitrix.yaml
methodology_version: "4.0.0"
```

## Step 3 — Re-run `repo-check`

```bash
transitrix-ingest repo-check [org-root]
```

## Folder shape

```
migrations/3.1-to-4.0/
├── README.md
├── codemod.mjs          # idempotent transform; runs Transforms A and B
├── validate.mjs         # post-migration check; exits 0 on clean repo
└── fixtures/
    ├── before/          # minimal adopter repo before migration (fga + template_id form)
    └── after/           # the same after running codemod.mjs (dgca + recipe_id form)
```
