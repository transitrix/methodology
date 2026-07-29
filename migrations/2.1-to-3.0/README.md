# Migration recipe — methodology 2.1 → 3.0

The on-disk migration recipe an adopter follows when upgrading from methodology
version 2.1 to 3.0. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md)
§10.4 and [`RELEASING.md`](../../RELEASING.md); see also
[`CHANGELOG.md`](../../CHANGELOG.md) (3.0.0).

---

## What this recipe covers

3.0 **removes two element TYPEs and one view** from the core vocabulary:

| Removed | Was |
|---|---|
| `HAZARD` | `notations/elements/28-hazard-risk-control.md`; files under `canon/elements/01_motivation/hazards/` |
| `RISK_CONTROL` | same spec; files under `canon/elements/01_motivation/risk-controls/` |
| The design-controls trace-matrix view | `notations/views/24-design-controls-trace-matrix.md`; view-configs named `*.design-controls-trace-matrix.transitrix.yaml`; renderer `tools/render_trace_matrix.py` |
| `HAZ-*`, `RISKCTL-*`, `HAZ-RISKCTL-COVERAGE-*`, `RISKCTL-VERIF-COVERAGE-001` | `CONTRACT.md` §8 |

**`VERIFICATION` is unaffected.** It stays a core TYPE, with `REQ-VERIF-COVERAGE-001`
/ `-002` unchanged and `ASSERTION.evidence[]` still able to cite a verification as a
`canonical_ref`. A repository that uses `REQUIREMENT` → `VERIFICATION` and nothing
else needs **no migration at all** — 3.0 is a no-op for it.

## Why this needs a recipe rather than release notes

Core tooling has **no message for a TYPE it does not know**
([`PACKAGES.md`](../../notations/PACKAGES.md) §5). If a repository still carries
`HAZARD` or `RISK_CONTROL` files after the upgrade, the failure is not "this TYPE was
removed" — it is an obscure referential-integrity error on the ID grammar or on an
unresolvable reference, diagnosed by nobody at 3 a.m. The detector below exists so
the upgrade fails with a sentence a human can act on, before anything else runs.

## Step 1 — detect

From this repository, against the adopter root:

```
node migrations/2.1-to-3.0/detect.mjs <adopter-root>
```

- **Exit 0, "nothing to migrate"** — the repository carries none of the removed
  vocabulary. Bump `methodology_version` to `3.0.0` and you are done.
- **Exit 1, with a file list** — the repository carries content whose TYPEs no longer
  exist in the core. Go to step 2.

## Step 2 — decide what happens to the listed content

There is no automatic transform, and this is deliberate: the core has nowhere to put
this content, so a codemod could only delete it. That is the adopter's decision, not a
script's. Three options:

1. **Retire it.** The chain was authored and is no longer maintained: delete the
   listed files and the matrix view-configs. Git history keeps every version of it,
   and a `git tag` on the pre-upgrade commit preserves a citable baseline
   ([`patterns/baseline-and-audit-trail.md`](../../patterns/baseline-and-audit-trail.md)).
2. **Freeze it.** Move the listed files out of `canon/` into an archive path the
   validator does not scan, before bumping the version. The content survives as a
   record; it is no longer canon and no rule applies to it.
3. **Keep it live under a package.** If a removable domain package supplying these
   TYPEs is in use, declare it in `transitrix.yaml` under `packages:` and follow that
   package's own placement rules. Absent such a package, this option does not apply —
   the core will not resolve the TYPEs on its own
   ([`PACKAGES.md`](../../notations/PACKAGES.md) §2, §4).

Whichever option is chosen, re-run step 1 until it exits 0.

## Step 3 — bump and re-validate

```
transitrix-ingest validate <candidates-dir>
```

Then follow the standard adopter upgrade procedure in
[`RELEASING.md`](../../RELEASING.md) §"Adopter upgrade procedure" — bump
`methodology_version` to `3.0.0`, reinstall the CLI, re-fetch the vendored validator
if `tools/lint.py` changed.

## Anything else in this release?

No. 3.0 carries no renamed field, no changed enum, and no severity change on any
surviving rule. The removal above is the whole of the breaking surface.
