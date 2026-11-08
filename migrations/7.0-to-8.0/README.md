# Methodology 7.0 → 8.0 migration

This is a proposed MAJOR release recipe. It neither releases software nor
runs an adopter upgrade. CONTRACT §10.2 and RELEASING govern the closed relation
enum: adding `reports_to` requires MAJOR even when existing REL fields need no
rewrite. The former local MINOR language in relation spec 0.6 is superseded by
0.7; no historical acceptance or diagnostic receipt is rewritten.

## Compatibility disposition

| 7.0 form or behavior | 8.0 action |
|---|---|
| Existing valid relation kind and quoted lifecycle dates | Preserve the record, IDs and windows; update the release pin/tooling after review |
| `reports_to` unknown to the 7.0 vocabulary | Adopt the 8.0 vocabulary and qualified consumers before authoring; never infer reporting |
| Capability stage/tags not checked by the old linter | Review the new optional-field constraints; absence stays absent |
| Application technical capability payload not checked by the old linter | Review local key uniqueness, required key/name, declared capability references and lifecycle containment |
| Capability-map view config accepted without the new checks | Review scenario/selected system references and closed optional subobjects |
| Setup without Git/visible marker/disjoint profile preflight | Review explicit profile ownership/layout; unsupported, mixed, unknown, symlink or invisible-marker layouts now fail before writes |
| `methodology_version: "7.0.0"` | `methodology_version: "8.0.0"` after the manual review |

The optional-field checks are not claimed to be compatible merely because their
fields are optional: an earlier permissive linter could accept, for example,
`tags: [""]`, an unknown management stage or a reversed technical capability
window. Under the target contracts those values fail. A new error may expose
previously invalid data or constrain previously unchecked content; this MAJOR
recipe makes both cases visible rather than promising blanket old-input
acceptance. Unknown legacy payloads require owner review, never deletion or
automatic coercion. Existing 7.x pins retain their historical compatibility
promise; no validator backport or error-suppression change is made here.

## Manual procedure

1. Preserve original files, revision and diagnostics with their tool versions.
   Inventory only the intended catalogue and optional fields. Keep private data
   and historical UNKNOWN receipts in their original storage.
2. Review capability `management_cycle_stage` (null or Strategic, Learning,
   Planning, Execution, Assurance) and nonempty string `tags`. For example,
   `tags: []` stays valid; `tags: [""]` needs an author decision. Do not fill
   absent fields or manufacture tags/stages.
3. Review technical capability key/name, references, unique local keys and
   inclusive date windows within the APPLICATION lifetime. A same-day window is
   valid; an end before its start needs correction from evidence. Preserve
   custom data for review outside closed subobjects without silently moving it.
   Validate the selected capability-map scenario/system references and optional
   configuration against the target schema.
4. Before any later setup/migration, review profile separation and marker
   visibility with the owner. Preserve all original and unknown content; select
   an explicit supported layout. This recipe never splits stores, moves files,
   invokes intake, creates a workspace or edits visibility rules.
5. For reporting, use explicit person→person REL records with evidence and
   windows. Employment or unit membership does not imply reporting. Keep
   concurrent managers valid with REL-013 warning; retain disjoint recurrence.
   REL-011/012 graph/health errors remain distinct from per-file validation.
6. Only when adopting the reviewed release/tooling, change the root manifest:

   ```yaml
   # before
   methodology_version: "7.0.0"
   # after
   methodology_version: "8.0.0"
   ```

   Align vocabulary/specs, skill bundle 0.2.0, ingest PRESETS_VERSION 8.0.0 and
   the vendored whole-repo linter. Ingest CLI and Studio CLI are separate tools;
   the requirements-analysis skill's exact 2.13.0 candidate map is not an
   ingest-tool version. A changed manifest alone is not adoption or acceptance.
7. Run the pin-only postcheck below, then the release-qualified whole-repo and
   applicable file/graph validators on the preserved catalogue. Inspect warnings
   and unvalidated files; do not turn missing evidence into success. Qualify
   profiles without running setup/intake as an implicit side effect.

## Mechanical transform and limits

Node 20+, no dependencies. The codemod changes only one unambiguous root pin;
all model bytes, comments, unknown data and history remain untouched. Re-running
is a no-op. Unexpected/duplicate pins and symlink manifests fail visibly.

```sh
node migrations/7.0-to-8.0/codemod.mjs --dry-run /path/to/model
node migrations/7.0-to-8.0/codemod.mjs /path/to/model
node migrations/7.0-to-8.0/validate.mjs /path/to/model
```

`validate.mjs` checks only the structural pin transform, not capability, graph,
intake layout or whole-catalogue conformance. Manual steps remain required.
Exit 0 means that narrow check passed; 1 is an ambiguous/incorrect pin; 2 is an
invocation/read failure. No automatic semantic rewrite is supplied because it
would require owner decisions. Synthetic tests check dry-run preservation,
idempotence, exact fixture output, duplicate/unknown pins and symlink refusal.

## Evidence and delivery boundaries

Retain the accepted requirement-scope 0.3 and explicit 0.2 adapter. Skill bundle
0.2.0 changes its required caller boundary and therefore uses methodology floor
8.0.0. Its candidate map pins an exact Studio source commit; null artifact
hashes and qualification receipt block invocation until supplied, rather than
qualifying a proposed package by its version number.

Methodology #652's two previously disclosed Node failures remain baseline
limitations pending disposition; this recipe does not relabel them successful.
The reference-adopter companion PR required by RELEASING remains a separate
reviewed pin/ADR proposal; no adopter is upgraded by this source PR.
