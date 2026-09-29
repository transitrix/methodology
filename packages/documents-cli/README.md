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
