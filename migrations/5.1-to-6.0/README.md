# Migration recipe — methodology 5.1 → 6.0

Version 6.0.0 preserves knowledge supersession history and enforces reciprocal
links. The v5.1.0 rule table described `KS-019` as a warning; it is now an error
for admitted objects. `KS-018` and `KS-020` also enforce target resolution and
graph integrity. A store that passed the old linter can fail the new one.
Stores without supersession fields need no knowledge-object edits.

| Old form or behaviour | 6.0.0 requirement |
|---|---|
| Admitted successor names a predecessor without a backlink | Both admitted objects name each other; `KS-019` is an error |
| Malformed, missing, ambiguous, or draft target | Each pointer is one non-empty string resolving to one admitted knowledge object (`KS-018`) |
| Mismatched reverse pointer, self-link, or cycle | Repair the reviewed linear history (`KS-020`); chains of any length are allowed |
| Draft proposes a successor | Missing predecessor backlink remains a `KS-019` warning; do not mutate the predecessor before approval |
| Extraction carries unsupported top-level fields | Put schema-undefined data under `extensions`; supported TYPE fields stay at their defined locations |
| A later extraction overwrites an existing candidate value | Corroboration preserves existing values, fills absent fields, and adds provenance |

## Manual steps

1. Preserve the current revision and review the upgrade in a separate change.
   Run the **6.0.0** `tools/knowledge_store_lint.py` against the adopter root.
   Resolve `KS-018`/`KS-020` findings from evidence; do not infer a relationship
   from filenames or rewrite an assertion to make the linter pass.
2. For an already approved successor, add the missing reciprocal lifecycle
   pointer and advance the predecessor's `timestamp` to the repair time. For example:

   ```diff
   # knowledge/old.md (predecessor)
   -timestamp: 2026-09-01T10:00:00Z
   +timestamp: 2026-09-18T10:00:00Z
   +superseded_by: /knowledge/new.md
   # knowledge/new.md already contains:
    supersedes: /knowledge/old.md
   ```

   Preserve the predecessor's body, `source`, `description`, `confidence`,
   `created_at`, and any existing `supersedes`. Retain both objects, original
   sources and hashes, index rows, and a dated admission/repair log. A draft
   stays under review until the successor and backlink can be admitted together.
   This requires curator review; the codemod deliberately cannot do it.
3. Review extraction producers against the supported fields in
   [`emit-candidates.mjs`](../../packages/ingest-cli/src/emit-candidates.mjs).
   For example, replace top-level `custom_score: 7` with
   `extensions: {custom_score: 7}` when that field is not in the schema.
   Re-extract previously dropped TYPE fields from preserved sources, then review
   them; do not overwrite reviewed candidates merely to refresh confidence.
4. Review assembly history against
   [`17-relations.md`](../../notations/elements/17-relations.md).
   Each release records its complete `assembled_on` environment, including
   unchanged systems. A successor does not end its predecessor's historical
   links. Correct a `valid_to` set solely for succession only after reviewing
   the original evidence. `RELEASE` subjects are `PRODUCT` or `APPLICATION`;
   the former `TECHNOLOGY_SERVICE` wording did not override that restriction.
5. Set `methodology_version` in `transitrix.yaml` from `5.1.0` to `6.0.0`,
   manually or with the codemod below. Reinstall the ingest CLI from the new
   checkout, refresh adopted specs and skills, and refresh the knowledge-store
   linter if vendored. The knowledge-store skill now has `min_version: "6.0.0"`;
   update the corresponding skill-table entry. `tools/lint.py` itself did not
   change in this release. Follow the four-artefact procedure in
   [`RELEASING.md`](../../RELEASING.md#adopter-upgrade-procedure).
6. Run the post-check below, normal canon validation and `repo-check`. Review
   warnings explicitly. Validator implementers must also check CONTRACT §18's
   exhaustive coverage accounting and `NOTATION-SKIP-001` strict promotion;
   the specification does not certify every downstream validator's support.

Compaction remains a decision frame, with no deletion tool. Retain knowledge
objects until mechanical reachability and preservation can be demonstrated;
base/open-tier stores cannot establish the required canon binding and must
defer removal. See [the pattern](../../patterns/knowledge-store.md).

## Commands and boundaries

Use Node.js ≥20 for the pin-only, dependency-free codemod. The post-check also
requires `python3` and PyYAML, as does the reference knowledge-store linter.
Run these commands from the 6.0.0 methodology checkout:

```bash
node migrations/5.1-to-6.0/codemod.mjs --dry-run <adopter-root>
node migrations/5.1-to-6.0/codemod.mjs <adopter-root>
node migrations/5.1-to-6.0/validate.mjs <adopter-root>
```

The codemod changes only one unambiguous top-level manifest pin and preserves
other text, comments, quoting and line endings. Rerunning is a no-op. It exits
`1` for an unsupported/ambiguous pin, `2` for an I/O or invocation error, and
`0` on success; `--dry-run` writes nothing. Its success is not evidence that
manual compatibility work is complete. Upgrade older versions through their
intervening recipes first. For a knowledge-only store without a manifest, use
the manual steps and run `python3 tools/knowledge_store_lint.py <store-root>`
directly rather than adding a manifest solely for this wrapper.

`validate.mjs` checks the target pin and invokes the same reference linter used
by the skill. It exits `0` with no errors, `1` for validation findings, or `2`
for invocation/I/O errors. It never applies the codemod. It cannot verify
historical preservation, human approval, extraction producers, or downstream
validator implementations; those remain the manual review above.

`fixtures/before/` and `fixtures/after/` demonstrate the automated pin change
on an already valid reciprocal history. The test also removes a backlink to
prove the post-check rejects incomplete admission; it verifies dry-run,
idempotence, and byte preservation of the knowledge objects.
