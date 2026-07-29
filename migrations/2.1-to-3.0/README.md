# Migration recipe — methodology 2.1 → 3.0

The on-disk migration recipe an adopter follows when upgrading from methodology
version 2.1 to 3.0. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md)
§10.4 and [`RELEASING.md`](../../RELEASING.md); see also
[`CHANGELOG.md`](../../CHANGELOG.md) (3.0.0).

---

## What changed and why

**3.0 removes the ISO 14971 risk-management chain from the public core.**
`HAZARD`, `RISK_CONTROL`, the design-controls trace-matrix view, its reference
renderer, and their validation rules leave this repository (decision of record:
the 2026-07-29 core-scope decision). `VERIFICATION` and the rest of the compliance/V&V spine
(`REQUIREMENT`, `ASSERTION`) are **unaffected** — this is not a schema change to
any type that stays in core.

**This recipe exists to turn an obscure failure into a clear one.** Core
tooling has no message for a TYPE it does not know (per
[`PACKAGES.md`](../../notations/PACKAGES.md) §5) — a repository that carries
`HAZARD` / `RISK_CONTROL` content and upgrades without running this recipe will
fail referential-integrity checks with a confusing error, not an actionable
one. `validate.mjs` below is the actionable message.

## What this recipe does — and does not — decide for you

This is **not** a schema transform: nothing is renamed, restructured, or
re-validated into a new shape. The affected content — files that were
perfectly valid under 2.1 — simply has no home in 3.0's core vocabulary
anymore. The recipe therefore:

- **Moves the content out of `canon/`**, byte-for-byte, into
  `_archived/design-controls-3.0-migration/<original path>` at your repo root,
  so the referential-integrity check that scans `canon/` stops seeing it and
  your repo validates again.
- **Never deletes anything.** The content is exactly as it was, just outside
  the tree core tooling scans.
- **Does not tell you where to take that content next.** What your
  organisation does about the ISO 14971 chain going forward — drop it,
  keep the archived copy as a historical record, or feed it into whatever
  process now owns your design-controls capability — is a decision for your
  organisation, not a decision this repository can make for you.

## What's affected

| Content | Before (canon) | After (archived) |
|---|---|---|
| `HAZARD` elements | `canon/elements/01_motivation/hazards/HAZARD-*.yaml` | `_archived/design-controls-3.0-migration/canon/elements/01_motivation/hazards/HAZARD-*.yaml` |
| `RISK_CONTROL` elements | `canon/elements/01_motivation/risk-controls/RISK_CONTROL-*.yaml` | `_archived/design-controls-3.0-migration/canon/elements/01_motivation/risk-controls/RISK_CONTROL-*.yaml` |
| Design-Controls Trace Matrix view-configs | any `*.design-controls-trace-matrix.transitrix.yaml`, wherever it lives in your `canon/views/` layout | `_archived/design-controls-3.0-migration/<same relative path>` |

`REQUIREMENT`, `ASSERTION`, and `VERIFICATION` files are not touched by this
recipe under any circumstance.

## Manual steps

1. **Check whether this recipe applies to you.** If your repository never
   adopted `HAZARD` / `RISK_CONTROL` / the design-controls trace matrix, skip
   straight to step 4 — there is nothing to migrate.
2. **Run the codemod** (see below) to move the affected content out of
   `canon/`.
3. **Decide what to do with the archived content** — keep it, delete it, or
   move it elsewhere entirely. This recipe does not decide for you (see
   above).
4. **Bump `methodology_version` in `transitrix.yaml`** to `3.0.0`.
5. **Run the post-migration validator** (below) to confirm `canon/` is clean,
   then run your normal `transitrix-ingest validate` / `tools/lint.py` pass.

### Manual alternative (no codemod)

If you'd rather do it by hand: move every file under
`canon/elements/01_motivation/hazards/`, every file under
`canon/elements/01_motivation/risk-controls/`, and every
`*.design-controls-trace-matrix.transitrix.yaml` file out of `canon/` (delete
them, or relocate them anywhere outside `canon/` — the exact destination
doesn't matter to core tooling, only that they leave `canon/`). Then run
`validate.mjs` to confirm.

## Running the codemod

```
node migrations/2.1-to-3.0/codemod.mjs --dry-run [target-dir]   # preview
node migrations/2.1-to-3.0/codemod.mjs [target-dir]              # apply
```

Default `target-dir` is the current working directory. The codemod is
idempotent — re-running it after a clean migration reports nothing to do.

## Running the post-migration validator

```
node migrations/2.1-to-3.0/validate.mjs <target-dir>
```

Exits `0` if no `HAZARD` / `RISK_CONTROL` / design-controls-trace-matrix file
remains under `canon/`; exits `1` with a list of offending files otherwise.
Does not re-run the codemod — validates only.

## Fixtures

[`fixtures/before/`](fixtures/before/) is a minimal adopter-repo fragment
carrying one `HAZARD`, one `RISK_CONTROL`, one design-controls trace-matrix
view-config, and one unrelated `REQUIREMENT` + `VERIFICATION` pair.
[`fixtures/after/`](fixtures/after/) is the expected result of running
`codemod.mjs` against it — the three affected files moved under
`_archived/design-controls-3.0-migration/`, the `REQUIREMENT` and
`VERIFICATION` files untouched in place.
