# Migration recipe — methodology 4.2 → 5.0

The on-disk migration recipe an adopter follows when upgrading to methodology
version 5.0.0. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md)
§10.4 and [`RELEASING.md`](../../RELEASING.md); see also
[`CHANGELOG.md`](../../CHANGELOG.md) (5.0.0).

---

## What changed and why

Two breaking changes land in `5.0.0`, both command/rule-surface removals —
**neither renames or restructures a single field in your `reqif/`, `canon/`,
`field/`, or `codex/` content.**

| Change | What's removed | Spec |
|---|---|---|
| **ReqIF lifecycle retirement** | `transitrix-reqif transition`, `revise`, `history`, `suspect` commands; validation rules `REQIF-008`, `REQIF-009` | [`notations/packages/reqif.md`](../../notations/packages/reqif.md) §2.9, §10 |
| **`FGCA-008..014` rule-code retirement** | The old repo-scope rule-code names, superseded by `DGCA-REPO-008..011` (`FGCA-012..014` have no replacement) | `notations/vocabulary.yaml` `deprecated_rule_codes` |

**Why:** lifecycle for an admitted `spec-object` now lives entirely in core's
`agreement` axis ([`CONTRACT.md`](../../notations/CONTRACT.md) §6.3), per the
2026-07-31 requirements-management cut-line decision — the package keeps only
the ReqIF interchange representation. `FGCA-008..011` were renamed to
`DGCA-REPO-008..011` one release earlier; `FGCA-012..014` are retired without
replacement (the per-element findings they reported are superseded by a
future aggregate coverage observation, not yet implemented).

## What this recipe does — and does not — decide for you

**This is not a schema transform.** No field is renamed, no file moves, no
YAML shape changes:

- `spec-object.workflow_state`, `.revision`, `.revisions`, and
  `spec-relation.recorded_target_revision` are **unaffected** — they continue
  to round-trip as inert foreign metadata exactly as before. The package's
  own tooling never managed them as a state machine in the first place from
  this release forward; it only ever preserved what ReqIF XML import handed
  it.
- Rule codes (`FGCA-008..014`, `REQIF-008`, `REQIF-009`) are **validator
  output**, never authored fields — no DGCA or ReqIF file names them, so
  there is nothing in your model to rewrite.

**What actually breaks is your own automation** — CI configuration, npm
scripts, or shell wrappers that invoke one of the four removed
`transitrix-reqif` commands will fail with "unknown command" after
upgrading. There is no safe, universal rewrite across arbitrary CI/script
syntax, so `codemod.mjs` does not attempt one — it only **scans and reports**
every occurrence; removing or replacing each one is a manual, one-line edit.

## Manual steps

1. **Check whether this recipe applies to you.** If your repository never
   adopted the `reqif` package, or never called `transition` / `revise` /
   `history` / `suspect` from your own scripts or CI, skip straight to step
   4 — there is nothing to migrate.
2. **Run the codemod** (below) to find every remaining reference to a removed
   command.
3. **Remove or rewrite each flagged line by hand.** For example:

   ```diff
    transitrix-reqif validate reqif/
   -transitrix-reqif transition reqif/ so-print-retry-req-1 approved
   ```

   If you relied on `transition`/`revise` to track a requirement's lifecycle,
   move that tracking to core's `agreement` axis once the `spec-object`'s
   content is admitted as a core `REQUIREMENT` / `CONSTRAINT` / `NEED`
   element (`CONTRACT.md` §6.3) — there is no package-level replacement.
4. **Bump `methodology_version` in `transitrix.yaml`** to `5.0.0`.
5. **Run the post-migration validator** (below) to confirm no removed-command
   reference remains, then run your normal `transitrix-ingest validate` /
   `tools/lint.py` pass.

### Manual alternative (no codemod)

Grep your repository for `transitrix-reqif transition`, `transitrix-reqif
revise`, `transitrix-reqif history`, and `transitrix-reqif suspect`; remove or
replace each match. That is the entire recipe — there is no second pass.

## Running the codemod

```bash
# Preview — reports occurrences, writes nothing (the codemod never writes)
node migrations/4.2-to-5.0/codemod.mjs <adopter-root> --dry-run

# Same scan (kept identical to --dry-run for interface consistency)
node migrations/4.2-to-5.0/codemod.mjs <adopter-root>

# Post-migration check
node migrations/4.2-to-5.0/validate.mjs <adopter-root>
```

`codemod.mjs` exits `0` when no removed-command reference is found (nothing
to migrate) and `1` when one or more is found (manual intervention — see
Manual steps above). `validate.mjs` exits `0` if no reference to a removed
command remains anywhere under the target; exits `1` with the offending
file:line list otherwise.

## Folder shape

```
migrations/4.2-to-5.0/
├── README.md
├── codemod.mjs          # scans for removed transitrix-reqif command usage; never rewrites
├── validate.mjs         # post-migration check; exits 0 on clean repo
└── fixtures/
    ├── before/          # a reqif spec-object (foreign lifecycle fields) + a script naming a removed command
    └── after/            # the same spec-object, byte-identical — proof no data-shape transform applies —
                          # and the script with the removed-command line taken out by hand
```

**Note on fixture equality.** Unlike a recipe with a real data transform,
`codemod.mjs fixtures/before/` does not produce `fixtures/after/` — the
codemod only reports the script's offending line (exit 1); the line's removal
in `fixtures/after/scripts/reqif-ci-check.sh` is the manual edit step 3
describes, not an automated one. The `reqif/spec-objects/` fixture *is*
byte-identical between `before/` and `after/`, demonstrating the one
automatable claim this recipe makes: your data never changes.
