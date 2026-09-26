# Read-only document provenance

`src/provenance.mjs` exports `checkDocumentProvenance({ authorize, load })` and
`PROVENANCE_VERSION` (`document-provenance/1`). It compares an existing run
record, recipe and retained output with explicit claims and authorized adapter
observations. It never renders, calls a model, reads Git, resolves tags, writes
files, approves a document or changes its revision. Node 20 or later is required.
The existing `buildRunRecord` and serialization contract are unchanged.

```js
import { checkDocumentProvenance }
  from '@transitrix/document-renderer/src/provenance.mjs';

const result = await checkDocumentProvenance({
  authorize: async () => policyAllowsEntireBundle,
  load: async () => ({
    run: retainedRunBytes,       // Uint8Array, including Buffer
    recipe: retainedRecipeBytes,
    output: retainedOutputBytes, // one artifact per check, e.g. Markdown OR PDF
  }),
});
```

A legacy record needs no migration. It can establish matching recipe labels,
but cannot establish exact recipe bytes, actual input selection, or output
binding. Missing evidence returns `unverifiable`, never an assumed match.
`model_id` always means the model used for generated prose. It is never the
repository/model identity, a product identifier or a release.

## Authorization and observation boundary

`authorize()` runs before `load()` and must resolve to exactly `true`. It must
authorize **every** byte, identity, inventory, count and diagnostic in the
bundle for this caller. Bind both callbacks to the same immutable policy and
resource selection. Missing authorization, denial and authorization exceptions
return the same constant result; `load` is never called. No resource identifiers
are passed to authorization by the checker. The adapter already owns them.

This version uses an atomic disclosure boundary. If any part is denied, deny
the entire bundle; do not load hidden resources and then filter the result.
Do not report missing/denied subsets through inventory size or closure. Partial
object authorization needs a separately agreed adapter contract. The checker
has no filesystem or network access and cannot constrain a callback that
ignores this contract. Read callbacks must be observational and side-effect free.

The `observed` object is supplied by a **trusted observer adapter**, not by the
record author or an untrusted API client. The adapter must observe the named
snapshot and independently retain evidence supporting its facts. It must not
copy `claims` into `observed`, label working-tree reads with HEAD, resolve a
mutable tag today as proof of its historical target, or declare closure from
only the references visible in a recipe. A selection can depend on previously
absent records, rules, configuration and external data. Closure must include
those dependencies (including query membership) or remain unknown.

The checker computes SHA-256 of supplied bytes itself. Repository identity,
snapshot availability, historical context and closure are adapter observations,
not independently discovered Git facts. A supplied timestamp, commit or matching
checksum does not prove generation, authenticity, approval or compliance.

## Bundle interface, version 1

All fields are optional; omitted, invalid or unavailable evidence stays unknown.
Bytes must be `Uint8Array` (including `Buffer`), not decoded/re-encoded text.
Objects must be ordinary data objects. Do not supply getters or executable values.
The adapter must freeze or copy its snapshot before returning it so concurrent
changes cannot mix observations. The checker does not mutate inputs.

| Field | Meaning |
| --- | --- |
| `run` | Exact retained JSON bytes emitted by `serializeRunRecord` |
| `recipe` | Exact recipe bytes, with the existing `.ttrs` header |
| `output` | Exact retained output artifact bytes |
| `claims` | Supplemental **recorded assertions**, independently supplied; not new fields written to the renderer run record |
| `observed` | Independently observed facts from the authorized adapter |

`claims` accepts these fields:

- `recipe_sha256`, `output_sha256`: lowercase 64-character SHA-256.
- `output_run_sha256`: digest of the exact run bytes to which the output is
  **declared** to belong. A match checks that declaration only; even a matching
  output digest plus run digest cannot prove that a renderer produced it.
- `repository_id`: stable repository identity, not a directory basename.
- `input_kind`: `committed`, `index`, `working-tree` or `mixed`.
- `snapshot_id`: identity of the actual complete input snapshot, not necessarily
  a Git commit. Index/working-tree/mixed snapshots need their own captured identity.
- `selection_sha256`: digest of the exact selection specification under the
  adapter's agreed canonical encoding. No implicit repository-wide default.
- `product_id`, `release_id`, `document_issue_id`, `document_revision`: explicit,
  independent associations. A document revision is not a product release.
- `tools`, `rules`, `configuration`, `external`: inventories of `{ id, sha256 }`.
  Use one unique stable input ID per collection; rule/tool/configuration bytes
  identify material content, not only version labels. `external` covers material
  external inputs. Missing material bytes cannot count as verified.

`observed` accepts:

- `repository_id`; `snapshot: { kind, id, available, commit }`. `available: true`
  means the adapter read that actual snapshot. `commit` denotes the available
  committed snapshot only. For dirty/mixed inputs `repository.commit` remains
  unverifiable even when HEAD matches the run. No current checkout is substituted
  for an unavailable historical snapshot.
- `selection_sha256`, `as_at`, `profile`: actual selection digest, validity date
  and renderer profile. `as_at` is compared with `render_date`, never with the
  wall-clock run timestamp. This API compares exact recorded representations;
  adapters must not silently normalize distinct dates or scope selections.
- `product_id`, `release_id`, `document_issue_id`, `document_revision`, plus
  `release_product_id`: independently observed association and release membership.
  Unselected, unmodelled and invalid membership are not inferred. If requirement
  populations feed selection, use the existing
  [requirement-chain release-scope contract](../../notations/views/reports/requirement-chain.md);
  this checker neither recomputes scope nor carries other-release evidence forward.
- `tools`, `rules`, `configuration`, `external`: `{ id, bytes }` inventories.
  Entries are sorted by ID before comparison; duplicates or missing bytes are
  unverifiable. Different inventory membership is inconsistent. Empty inventories
  are unknown, except empty external inputs with observed complete closure, which
  are `not-applicable`.
- `closure: { complete, run_sha256, snapshot_id, input_ids }`: the adapter's
  independently established full input closure for these exact run bytes and
  snapshot. `complete` must be exactly `true`. `input_ids` includes material
  query-membership dependencies, not merely paths returned by a query. This is
  an observer interface, not permission to invent generation-time facts for a
  legacy record. A declaration of closure alone is not an observation.
- `changes: { complete, repository_id, base_snapshot_id, target_snapshot_id,
  ids }`: an exhaustive authorized comparison against the closure's base snapshot.
  The target is an actual snapshot identity too. If comparison or closure is
  unknown, review status is unknown. With known closure, intersection means
  `relevant-change-review-needed`; no intersection means `no-relevant-change`
  within that closure. Neither conclusion proves staleness, invalidity or
  permission to regenerate.

All identity strings must be nonempty and at most 512 characters. Evidence IDs
must be safe for the caller to see. Collections are compared after stable
code-point sorting, independent of host locale. No timestamps are synthesized.

## Result contract

The [JSON Schema](src/provenance-result.schema.json) describes the machine-readable
result. Ordering and aggregation rules below are additional semantic constraints.
The result is JSON-serializable with a fixed field order:

```json
{
  "contract_version": "document-provenance/1",
  "status": "incomplete",
  "incomplete": true,
  "coverage": {
    "consistent": 0,
    "inconsistent": 0,
    "unverifiable": 1,
    "not-applicable": 0
  },
  "checks": [{
    "id": "evidence",
    "scope": "authorized-bundle",
    "status": "unverifiable",
    "reason": "unavailable",
    "expected": null,
    "observed": null,
    "evidence": [],
    "basis": "none"
  }]
}
```

That is the exact denial result, independent of hidden identities or counts.
Loading/parsing failures use the same shape with `reason: "invalid-evidence"`.
No exception message, prose, source path or parser excerpt is returned.

Checks are sorted by `id`. Status is `consistent`, `inconsistent`, `unverifiable`
(missing, unsupported or not independently established), or `not-applicable`.
`expected` is a recorded claim, not an authoritative truth; `observed` is the
comparison value. Values are null, safe scalar identities/digests, a Boolean
review flag, or a JSON string of sorted `[id, sha256]` inventory entries.
`evidence` contains only the fixed handles `run`, `recipe`, `output`, `claims`
and `adapter`. The authorized consumer maps these handles to retained evidence;
none is an assertion that the resource exists or is authentic.

`basis` distinguishes `byte-observation`, `adapter-observation`, `comparison`,
`recorded-claim` and `none`. In particular, `output.run-binding` is a comparison
of a declared link, while `run.generation` remains `unverifiable`. Version 1
never upgrades a declaration to independently verified generation. A future
capture/verifier contract is needed to make that stronger claim.

`coverage` counts returned checks by status, not model objects or inputs.
`incomplete` is true if any check is unverifiable. Overall `status` is
`inconsistent` if any mismatch exists, otherwise `incomplete` if any unknown
exists, otherwise `consistent`. An inconsistent result may also be incomplete.
Consumers must retain both fields and must not turn consistent individual checks
into an overall success badge. Legacy checks retain generation/model unknowns
regardless of how many byte comparisons match. Unknown fields do not establish
new checks. Breaking semantics or status changes require a new contract version.

## Capture gaps

Existing run records retain neither repository identity nor exact recipe/input
closure/output digests. An adapter without independently retained evidence must
leave those observations absent. A future compatible capture could bind the
exact recipe, repository identity and actual snapshot, selection/as-at, material
rule/tool/configuration/external bytes and final output digests to exact run
bytes after output finalization. Such a record would still need an independently
verifiable collection/binding mechanism before asserting consumption. This
checker introduces no new generation behavior or persisted capture schema.
