# Migration recipe — methodology 0.4 → 0.5

This folder is the **on-disk migration recipe** an adopter follows when upgrading their repository from methodology version 0.4 to 0.5. The format is defined for all future migration recipes per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.4 and [`RELEASING.md`](../../RELEASING.md).

This first published recipe is **demonstrative**: it covers one transform from the 0.4 → 0.5 cycle so the format is established and exercised end-to-end. Additional transforms from the 0.4 → 0.5 deprecated list (see [`CHANGELOG.md`](../../CHANGELOG.md) Deprecated under 0.5.0) land in subsequent commits to this folder; the codemod and validator extend additively.

## What this recipe covers

- **Codex `applies_to.{entities, processes}` retirement.** In 0.5.0, external and internal codex artefacts no longer carry an `applies_to` block (see [`notations/14-codex.md`](../../notations/14-codex.md) §8 — Migration). Bindings move to `REQUIREMENT.derived_from` plus `ASSERTION`. Codex artefacts that still carry `applies_to` produce a `CODEX-004` deprecation warning; the recipe removes the field.

## Folder shape (canonical for all migration recipes)

```
migrations/<from>-to-<to>/
├── README.md         # this file — what changed + how to run
├── codemod.mjs       # pure-Node, idempotent transform; reads adopter root, rewrites files
├── validate.mjs      # post-migration validation
└── fixtures/
    ├── before/       # tiny adopter-repo tree before migration
    └── after/        # the same tree after migration
```

Adopter repositories run the migration against their own root; the fixtures travel with the recipe so the codemod is testable in isolation.

## Conventions every codemod follows

- **Pure-Node JS or TS.** No native dependencies; runnable with a stock Node ≥ 20 on any platform.
- **Idempotent.** Running the codemod twice on the same input produces identical output the second time (no extra changes). Adopters re-running after a partial migration get a no-op.
- **Idiomatic CLI.** Accepts an optional target directory (default = current working directory) plus `--dry-run` to print the diff summary without writing.
- **Diff-style summary.** On every run (live or dry), prints the per-file modifications and a tail summary so the adopter sees exactly what changed.
- **Exits non-zero on unsafe ambiguity.** If the transform can't be applied deterministically — corrupt input, unexpected nesting, ambiguous parse — the codemod prints the offending file + reason and exits `1`, leaving the working tree unchanged for that file. Safe transforms apply normally.

## Running the recipe

From the adopter's repository root:

```bash
# Dry run — print the diff summary without writing
node migrations/0.4-to-0.5/codemod.mjs --dry-run

# Apply
node migrations/0.4-to-0.5/codemod.mjs

# Post-migration validation — confirm the transform left no residue
node migrations/0.4-to-0.5/validate.mjs
```

On a clean adopter the typical sequence is dry-run → review → apply → validate → update `methodology_version` in `transitrix.yaml` to `0.5.0` → commit.

## Testing the recipe against its fixtures

The recipe is testable in isolation by running it over its own `fixtures/before/` and asserting the result equals `fixtures/after/`:

```bash
# Reset the fixture
rm -rf /tmp/recipe-test && cp -r migrations/0.4-to-0.5/fixtures/before /tmp/recipe-test

# Run the codemod against the fixture
node migrations/0.4-to-0.5/codemod.mjs /tmp/recipe-test

# Compare to the expected after state
diff -r /tmp/recipe-test migrations/0.4-to-0.5/fixtures/after
# (no output = identical = recipe passes)

# Run again — verify idempotency
node migrations/0.4-to-0.5/codemod.mjs /tmp/recipe-test
diff -r /tmp/recipe-test migrations/0.4-to-0.5/fixtures/after
```

## Manual steps after the codemod

The recipe handles the mechanical removal. The architectural redirect — *where the binding semantics moved to* — is the adopter's call and not codemod-able:

1. For every `applies_to.entities[]` or `applies_to.processes[]` entry the codemod removed, the adopter decides whether that entry encoded:
   - An obligation the org must fulfil → create a `REQUIREMENT-…` element under `canon/elements/01_motivation/requirements/` with `derived_from: [<codex artefact ID>]` (see [`15-requirement.md`](../../notations/15-requirement.md)).
   - A compliance claim about a subject → create an `ASSERTION-…` under `canon/assertions/` linking the requirement to the subject (see [`16-assertion.md`](../../notations/16-assertion.md)).
2. After the new REQUIREMENT / ASSERTION primitives are admitted, the original codex artefact's `applies_to` data is fully captured in canon.

This is a model-shape choice the adopter makes once per binding; the codemod can't infer the right REQUIREMENT / ASSERTION shape automatically.

## What this recipe deliberately does NOT cover

Other 0.4 → 0.5 deprecated patterns are listed in [`CHANGELOG.md`](../../CHANGELOG.md) under the 0.5.0 entry. Adding them to this recipe is straightforward — each is its own transform inside the same `codemod.mjs` + `validate.mjs` + per-pattern fixture:

- Inline `children[]` on capability-map view documents → REL `parent` files.
- Inline `parent: GOAL-…` on goal entries → REL `goal_parent` files.
- Inline `goals: [GOAL-…]` on activity entries → REL `activity_goal` files.
- Inline `current_maturity` / `owner_role` / `target_date` on capability-map → sidecar.
- Inline `owner_role` / `vendor` / `maturity` on applications → sidecar.
- Lifecycle backfill on element primitives without `valid_from` / `valid_to`.
- Capability ID canonical form residual (`scenarios` + supporting docs).

Each transform follows the same conventions (idempotent, dry-run-supporting, diff-summary-printing, unsafe-ambiguity-bailing) and ships its own fixture pair. The order and packaging of those subsequent transforms is a separate task.

## See also

- Versioning and compatibility policy: [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.
- Per-release operational checklist: [`RELEASING.md`](../../RELEASING.md).
- The 0.5.0 release notes that drove this recipe: [`CHANGELOG.md`](../../CHANGELOG.md) under `0.5.0`.
- The codex spec change that this transform implements: [`notations/14-codex.md`](../../notations/14-codex.md) §8.
