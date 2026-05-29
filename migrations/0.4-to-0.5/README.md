# Migration recipe — methodology 0.4 → 0.5

This folder is the **on-disk migration recipe** an adopter follows when upgrading their repository from methodology version 0.4 to 0.5. The format is defined for all future migration recipes per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.4 and [`RELEASING.md`](../../RELEASING.md).

This recipe ships incrementally — each transform in the 0.4 → 0.5 cycle (see [`CHANGELOG.md`](../../CHANGELOG.md) Deprecated under 0.5.0) lands as an additive extension to the same `codemod.mjs` + `validate.mjs` + a per-pattern fixture pair under `fixtures/before/` and `fixtures/after/`.

## What this recipe covers

- **Codex `applies_to.{entities, processes}` retirement.** In 0.5.0, external and internal codex artefacts no longer carry an `applies_to` block (see [`notations/14-codex.md`](../../notations/14-codex.md) §8 — Migration). Bindings move to `REQUIREMENT.derived_from` plus `ASSERTION`. Codex artefacts that still carry `applies_to` produce a `CODEX-004` deprecation warning; the recipe removes the field.
- **Primitive lifecycle backfill.** In 0.5.0, every canonical element MUST carry `valid_from` and `valid_to` ([`notations/CONTRACT.md`](../../notations/CONTRACT.md) §7). Adopters with element primitives under `canon/elements/` missing those fields get them backfilled: `valid_from` adopts the file's `last_updated:` value when present, otherwise falls back to the sensible epoch `"2024-01-01"` per the §7.4 migration recipe. `valid_to` defaults to `null` (currently in effect).
- **Capability ID canonical form.** In 0.5.0, capability identifiers in view documents take the canonical `CAPABILITY-V…` / `CAPABILITY-H…` form, and capability-map document IDs take `CAPABILITY_MAP-…` (no zero-padding) per [`notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §2 (rule) and §6 (migration checklist). The recipe gates on the file's `notation:` header — only `capability-map`, `process-map`, `products`, `applications`, `scenarios` — and rewrites bare `V…` / `H…` IDs in `id:`, `capability:`, inline-array `capabilities: [V1, V2]`, and block-form `capabilities:\n  - V1` positions. CM- document IDs are normalised to `CAPABILITY_MAP-…` and stripped of leading zeros.
- **Goal `parent` → REL `goal_parent` extraction.** In 0.5.0, the goal-to-goal parent link is declared **time-aware** per [`notations/04-goals.md`](../../notations/04-goals.md) "Time-aware relations" — its canonical home is a `REL-…` file under `canon/relations/` with `type: goal_parent` per [`notations/17-relations.md`](../../notations/17-relations.md) §3. The inline `parent: GOAL-…` form on goal entries stays available transitionally; the recipe migrates each inline link to a first-class REL file. The codemod gates on `notation: goals`, drops each inline `parent:` line, and emits `canon/relations/REL-GOAL-<from-id>-PARENT-1.yaml` per dropped link. The REL's `valid_from` and `admitted_at` inherit the host goals doc's `date:` (fallback `"2024-01-01"`); `admitted_by` is the placeholder `"migration-codemod-0.4-to-0.5"`.
- **Activity `goals: [GOAL-…]` → REL `activity_goal` extraction.** In 0.5.0, the activity-to-goal link is declared **time-aware** per [`notations/07-activities.md`](../../notations/07-activities.md) "Time-aware relations" — canonical home is a `REL-…` file with `type: activity_goal` per [`notations/17-relations.md`](../../notations/17-relations.md) §3. The codemod gates on `notation: activities`, drops each inline `goals: [GOAL-A, GOAL-B]` array on activity entries, and emits one `canon/relations/REL-<activity-id>-GOAL-<goal-id-tail>-1.yaml` per goal id in the dropped array. Same `valid_from` / `admitted_at` / `admitted_by` conventions as the goal-parent extraction.

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

The recipe handles the mechanical edits. Architectural redirects — *where the semantics moved to* — are the adopter's call and not codemod-able:

### Codex `applies_to` → REQUIREMENT + ASSERTION

For every `applies_to.entities[]` or `applies_to.processes[]` entry the codemod removed, the adopter decides whether that entry encoded:

- An obligation the org must fulfil → create a `REQUIREMENT-…` element under `canon/elements/01_motivation/requirements/` with `derived_from: [<codex artefact ID>]` (see [`15-requirement.md`](../../notations/15-requirement.md)).
- A compliance claim about a subject → create an `ASSERTION-…` under `canon/assertions/` linking the requirement to the subject (see [`16-assertion.md`](../../notations/16-assertion.md)).

After the new REQUIREMENT / ASSERTION primitives are admitted, the original codex artefact's `applies_to` data is fully captured in canon. This is a model-shape choice the adopter makes once per binding; the codemod can't infer the right REQUIREMENT / ASSERTION shape automatically.

### Lifecycle backfill date review

The lifecycle backfill picks `valid_from` mechanically — `last_updated:` when present, otherwise `"2024-01-01"`. After running the codemod, the adopter SHOULD spot-check the backfilled `valid_from` values and adjust any that don't reflect the actual date the element took effect. The codemod's value is a safe default, not a historically-accurate claim.

### REL admission review (`goal_parent`, `activity_goal`)

Every REL emitted by the codemod — both `goal_parent` and `activity_goal` — inherits the host view doc's `date:` for both `valid_from` and `admitted_at`, and uses the placeholder marker `admitted_by: "migration-codemod-0.4-to-0.5"`. After running the codemod the adopter SHOULD:

- replace `admitted_by` with the real operator handle once each REL has been reviewed in their canon (`grep -r migration-codemod-0.4-to-0.5 canon/relations/` lists the migration-generated files);
- adjust `valid_from` if the link in fact took effect on a date other than the host doc's `date:`;
- re-run the codemod and `validate.mjs` after the manual review — they remain idempotent.

The codemod refuses to overwrite a REL file at the same `canon/relations/REL-….yaml` path if its content differs from what the codemod would emit, so manual edits to a REL file made between two codemod runs are preserved — the second run bails on that file with an explicit message instead of clobbering.

## What this recipe deliberately does NOT yet cover

Other 0.4 → 0.5 deprecated patterns are listed in [`CHANGELOG.md`](../../CHANGELOG.md) under the 0.5.0 entry. Three remain — they share one family-wide convention (see the next section) and are queued as the next transforms on this recipe:

- Inline `children[]` on capability-map view documents → REL `parent` files **plus** per-element file materialization.
- Inline `current_maturity` / `owner_role` / `target_date` on capability-map → sidecar **plus** per-element file materialization.
- Inline `owner_role` / `vendor` / `maturity` on applications → sidecar **plus** per-element file materialization.

Each transform will follow the same conventions (idempotent, dry-run-supporting, diff-summary-printing, unsafe-ambiguity-bailing) and ship its own fixture pair. The order and packaging of those subsequent transforms is a separate task.

## Family-wide convention for the remaining transforms

When the recipe takes on the three remaining inline → first-class transforms above, all three follow the **elements-first** convention decided in the upstream strategy hub: no inline-declared primitives survive the 0.4 → 0.5 migration; view documents become layout-only; primitive data lives in `canon/elements/`; sidecars co-locate with their primitive.

Concretely:

1. For each inline primitive in a view document (capabilities in capability-map, applications in applications catalogue, recursively including nested `children[]`), the codemod materialises a per-element file under `canon/elements/<zone>/<type>/<id>.yaml` carrying the stable fields, an admission record, and the primitive lifecycle.
2. Time-varying fields on the materialised primitive (`current_maturity` / `owner_role` / `target_date` for capabilities; `owner_role` / `vendor` / `maturity` for applications) move into a co-located `<id>.history.yaml` sidecar per [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §9.1.
3. Hierarchy declared via inline `children[]` becomes one REL `parent` file per child under `canon/relations/`, following the REL emission conventions already established for `goal_parent` and `activity_goal`.
4. The source view document is rewritten to layout-only — view-level metadata plus a flat reference list (capability IDs in canvas order; application IDs in catalogue order) — with no inline primitive data.

This convention is **family-wide**: any future first-class TYPE whose 0.x form embedded data inline (not just IDs) follows the same rule. Flat in the view, full object in `canon/elements/`, REL files for hierarchy.

The convention is the resolution of three shape questions raised against this recipe — capability `children[]` flatten-vs-coexist, capability sidecar target location, applications sidecar target location — closed against this recipe by the upstream call referenced in the recipe's task issue.

## See also

- Versioning and compatibility policy: [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §10.
- Per-release operational checklist: [`RELEASING.md`](../../RELEASING.md).
- The 0.5.0 release notes that drove this recipe: [`CHANGELOG.md`](../../CHANGELOG.md) under `0.5.0`.
- Spec sources for the transforms shipped:
  - Codex `applies_to` retirement — [`notations/14-codex.md`](../../notations/14-codex.md) §8.
  - Lifecycle backfill — [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §7 (rule) and §7.4 (migration recipe).
  - Capability ID canonical form — [`notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §2 and §6.
  - Goal `parent` → REL `goal_parent` — [`notations/04-goals.md`](../../notations/04-goals.md) "Time-aware relations" + [`notations/17-relations.md`](../../notations/17-relations.md) §3 (enum) and §6 (migration).
  - Activity `goals: [GOAL-…]` → REL `activity_goal` — [`notations/07-activities.md`](../../notations/07-activities.md) "Time-aware relations" + [`notations/17-relations.md`](../../notations/17-relations.md) §3 (enum) and §6 (migration).
