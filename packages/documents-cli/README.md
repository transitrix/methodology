# Documents validator

`@transitrix/documents-cli` validates the optional [documents package](../../notations/packages/documents.md). Validation reads document types, documents and issuance events, reports structural and evidence findings, and never writes model files or resolves citations against core. Explicit record/read commands manage individual handoff rows.

Requires Node.js 20 or later. Install from a source checkout into your adopter repository:

```sh
npm pack /path/to/methodology/packages/documents-cli
npm install ./transitrix-documents-cli-0.1.0.tgz
```

Declare `packages: [documents]` in the adopter's `transitrix.yaml`, and place records under `documents/document-types/` and `documents/documents/`, one YAML file per ID. Run the normal package entry point:

```sh
transitrix-ingest check-packages /path/to/adopter
```

The generic command discovers the installed `@transitrix/documents-cli` and invokes it. Without the declaration, it does not read the documents folder or run this validator. A declared package whose validator is not installed is skipped under the generic package contract; install the package to obtain validation.

For an explicit package-only check:

```sh
npx --no-install transitrix-documents validate /path/to/adopter/documents
```

Each finding includes severity, rule and relative filename. Validation exit codes are 0 for input without errors (possibly with unavailable-evidence warnings), 1 for record errors, and 2 for invocation or directory-read errors. Invalid YAML or schema structure is reported as an `INPUT` error rather than assigned an unrelated DOCS rule. The validator accepts YAML maps and lists, quoted scalars and comments; duplicate mapping keys fail.

Versions accept the documented `"1.0"` compatibility form and full SemVer such as `"2.1.3"` or `"2.1.3-rc.1+build.2"`. Timestamps must be real calendar dates at UTC second precision, for example `"2026-09-01T14:30:00Z"`. DOCS-004 checks field membership and required entries; it does not add datatype-value rules. Citations check core ID syntax, including capability addresses, without requiring the target to exist.

To remove the package, delete the adopter's `documents/` folder and remove `documents` from the manifest declaration. Core files need no changes.

The synthetic integration tests pack and install the CLI, exercise each DOCS rule through generic dispatch, validate a core model before and after package removal, and check that a never-declared repository remains byte-identical after validation:

```sh
npm ci --prefix packages/documents-cli
python3 packages/documents-cli/tests/test_documents_integrity.py
```

Run these commands from the methodology checkout, with Python 3 and PyYAML installed. The test installs the packed CLI into a temporary adopter and needs npm registry access or a populated npm cache. It also runs the generic package and ReqIF regression tests.

## Recording and reading handoffs

A handoff is an explicit asserted act, separate from a render or a document's
status. The register adds no fields to repositories that do not use events.
Existing document records remain compatible. Commands operate on an explicitly
selected package folder; normal validator dispatch still requires declaration.

Prepare an act YAML with the fields in [§8 of the package contract](../../notations/packages/documents.md#8-issuance-event-register).
This synthetic example uses placeholders for hashes; replace them with SHA-256
of the exact retained bytes before recording it:

```yaml
package: documents
kind: issuance-event
id: issue-rp17-b-1
synthetic: true
document: doc-rp17-b-1
edition: B
issued_at: "2026-07-10T10:00:00Z"
issuer: Synthetic Issuer
recipient: Synthetic Recipient
run_record:
  uri: evidence/run-b.json
  sha256: "sha256:<64 lowercase hex digits>"
baseline:
  uri: evidence/baseline-b.txt
  sha256: "sha256:<64 lowercase hex digits>"
resource:
  uri: resource://documents/rp17/b.pdf
  sha256: "sha256:<64 lowercase hex digits>"
```

```sh
npx --no-install transitrix-documents record ./documents ./act.yaml
npx --no-install transitrix-documents read ./documents issue-rp17-b-1
npx --no-install transitrix-documents validate ./documents
```

`record` computes `issue_hash` when omitted, validates the input, and exclusively
creates `events/issue-rp17-b-1.yaml`. It refuses invalid/conflicting input and an
existing ID. It writes no evidence and never rewrites another row. `read` returns
the original row plus evidence states, without changing files. Both emit JSON.
A different handoff needs a different event ID, even for the same document/edition.
The edition label does not change the document's existing numeric version contract.

Local run/baseline pointers resolve beneath `documents/`. Absolute URIs are never
fetched by the CLI. Unavailable pointers produce `incomplete` reports and validation
warnings, not fabricated evidence or failed structural validation. Mismatching
bytes produce `conflict` and validation errors. Unknown run formats remain
unavailable. Retain historical rows and evidence through your existing repository
and external storage controls; exclusive creation is not a retention service.

For authorized integrations, the installed `src/events.mjs` exports `issueHash`,
`hashBytes`, `validateEvent` and `inspectEvent`. The latter accepts
`{ load: async pointer => bytesOrNull }`; the adapter owns access control and
external lookup. `src/register.mjs` exports `createEvent(folder, act)` and
`readEvent(folder, id)` with the same behavior as the CLI. These inspect a single
act, not a register-wide traceability query.

Optional timestamp evidence has this envelope:

```yaml
timestamp:
  format: rfc3161
  issue_hash: "sha256:<the computed act hash>"
  reference:
    uri: evidence/external-token.tsr
    sha256: "sha256:<hash of the supplied token bytes>"
```

You may supply `token_base64` instead of, or alongside, `reference`; both must bind
the same bytes. Compute the act hash with `issueHash(act)` before requesting any
external evidence through your own process. The package never requests or creates
a token. It checks the envelope only, preserving supplied evidence and reporting
`timestamp_trust: not-verified`. A reference or base64 value is not proof of an
RFC 3161 message imprint, signature, certificate chain or trusted time. No timestamp
field is required when unused; no automatic signing or submission occurs.

Validation exits 1 on structural or evidence-conflict findings, and 0 when structurally
valid (possibly incomplete). `read` exits 1 for an invalid/conflicting row. Invocation,
parse, write/refusal and filesystem failures exit 2. All commands keep unavailable
evidence explicit in their output.

## Querying retained issuance events

The supported query interface is the asynchronous JavaScript export
`queryIssuedDocuments` in `src/queries.mjs`. It enumerates the selected `events/`
register and reads actual retained runs and Git objects. There is no REST service,
Studio query plugin, Python query CLI, automatic audit write or persistent index.
Install the renderer alongside the documents package to use its provenance checker:

```sh
npm pack /path/to/methodology/packages/document-renderer
npm install ./transitrix-document-renderer-0.0.1.tgz
```

The optional peer is required only for queries; validation and record/read work
without it. A missing checker returns `incomplete`, never a successful empty list.

```js
import { queryIssuedDocuments } from '@transitrix/documents-cli/src/queries.mjs';

const options = {
  folder: './documents',
  repository: { root: '.', id: 'adopter-stable-model-id' },
  authorize: async () => policyAllowsEntireRegisterAndRepository,
  load: async pointer => retainedBytesForAuthorizedPointer(pointer),
  observe: async row => retainedObserverBundleFor(row),
};
const reverse = await queryIssuedDocuments({ ...options,
  query: { kind: 'document', id: 'doc-rp17-b-1' } });
const forward = await queryIssuedDocuments({ ...options,
  query: { kind: 'element', id: 'REQ-14' } });
const review = await queryIssuedDocuments({ ...options,
  query: { kind: 'review', id: 'REQ-14', target: exactTargetCommit } });
```

The callbacks above belong to the adopter: they are not supplied services.
`authorize` must grant the entire register, repository, retained bytes and every
observer fact atomically. Denial or an exception returns a constant unavailable
result without reading them. `load` returns exact bytes or null and must handle
local event paths as well as evidence pointers; when omitted it uses `localLoader`
from `src/register.mjs` and never fetches external URIs. `observe` returns the
existing [provenance bundle](../document-renderer/PROVENANCE.md), including claims,
recipe bytes and **independently retained** observations for that event. Neither
callback may write, fetch unapproved resources or reconstruct supposed historical
observations from current claims. Select an immutable register snapshot for each
call. Reads are memoized only for that invocation; no cache survives it.

### Baseline binding

For these queries, the event's existing `baseline` pointer must resolve to UTF-8
JSON with this supported envelope (values below are synthetic placeholders):

```json
{
  "format": "document-baseline/1",
  "repository_id": "synthetic-model",
  "commit": "<exact 40- or 64-character lowercase Git commit ID>",
  "document": "doc-rp17-b-1",
  "edition": "B",
  "run_sha256": "<64 lowercase hex digits>",
  "output_sha256": "<64 lowercase hex digits>",
  "product_id": "PRODUCT-portal-1",
  "release_id": "RELEASE-portal-3.2"
}
```

This is an explicit retained association, not renderer-generated identity or an
edition registry. `product_id` and `release_id` are optional; if present in the
baseline, claims or observations, all three must supply agreeing values. Release
membership is checked by the provenance checker. Missing release data cannot
establish applicability to a release. The event still stores only its act and
hashed pointers, with no copied recipe version, element inventory or stale flag.
Existing arbitrary baseline bytes remain valid event evidence; their query binding
is unknown until independently supported in this envelope. Do not rewrite old
evidence or manufacture this association for a legacy record.

The observed committed snapshot ID and commit, claim snapshot ID, baseline commit
and flat run `repository_commit` must agree. `model_id` remains the generated-prose
model; the model repository identity comes from explicit baseline/observer binding.
The query passes the register's run/output bytes to the existing checker; conflicting
adapter substitutes cannot replace them. Recipe, product/release, tools, rules,
configuration and external evidence retain that checker's semantics.

### Closure, Git comparisons and results

`observed.closure` must bind the exact run digest and commit with complete input
IDs. Citations alone do not prove closure. For a fixed-ID selection, these can be
core element IDs. Dynamic membership needs its material dependencies too: use
`path:canon/elements` for all changes beneath that directory, or `path:<relative
file-or-directory>` for narrower dependencies. The observer owns this completeness
judgment. No closure is inferred for old runs, omitted records or unobserved
external changes. Review results cover the compared Git snapshots only.

Targets are full commit IDs, never tags, HEAD, dates or "latest". Git is read
without optional locks or replacement objects, and without lazy network fetching.
Complete tree comparisons include added/modified paths and both sides of a move
or deletion; changed canonical YAML element IDs are read from both snapshots.
Moves count conservatively as review-worthy even if bytes are identical. Invalid
changed element identity, missing Git objects, unsupported tree entries, command
limits or unreadable history keep review unknown. No ancestry or time window
silently drops an older retained issuance.

Results contain `matches` (event IDs), `records` and enumeration `failures`.
Each record retains its exact document/edition and evidence pointers, recorded
model/baseline, recipe labels, run attributions, observed closure and checker
report. Repeated handoffs remain separate events; no latest-edition selection
occurs. `match` is `yes`, `no` or `unknown`; `review` is `review-needed`,
`no-relevant-change` or `unknown`. Review considers all closure inputs; a review
query's matches additionally require the selected element itself to have changed.
A match says the element was in the observed input closure, not necessarily quoted
verbatim in the output. Run attributions are returned separately.

Conflicts dominate aggregate status, even when a review subcheck passes. Missing
closure, binding, bytes, history or observations prevents a conclusive element
match/nonmatch and review result. Reverse lookup still returns retained claims,
marked incomplete or inconsistent. Missing/empty registers and absent document IDs
return incomplete with a reason, never an empty success. Overall provenance stays
`incomplete` even with a known review result because matching bytes and recorded
associations do not prove generation. A review-needed result is not approval,
invalidity, automatic reissuance or permission to alter retained bytes.

The [RP-17 example](../../notations/examples/packages/rp17.md) remains applicable:
A/B editions and release/B bindings are explicit; an actual unchanged review
creates no C. These queries create neither reviews nor editions. Proposed identity,
predecessor and recurrence semantics remain proposed.
