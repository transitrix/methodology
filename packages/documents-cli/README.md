# Documents validator

`@transitrix/documents-cli` validates the optional [documents package](../../notations/packages/documents.md). It reads document types and document records, reports DOCS-001–007 errors, and never writes model files or resolves citations against core.

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

Each finding includes severity, rule and relative filename. Exit codes are 0 for clean input, 1 for record findings, and 2 for invocation or directory-read errors. Invalid YAML or schema structure is reported as an `INPUT` error rather than assigned an unrelated DOCS rule. The validator accepts YAML maps and lists, quoted scalars and comments; duplicate mapping keys fail.

Versions accept the documented `"1.0"` compatibility form and full SemVer such as `"2.1.3"` or `"2.1.3-rc.1+build.2"`. Timestamps must be real calendar dates at UTC second precision, for example `"2026-09-01T14:30:00Z"`. DOCS-004 checks field membership and required entries; it does not add datatype-value rules. Citations check core ID syntax, including capability addresses, without requiring the target to exist.

To remove the package, delete the adopter's `documents/` folder and remove `documents` from the manifest declaration. Core files need no changes.

The synthetic integration tests pack and install the CLI, exercise each DOCS rule through generic dispatch, validate a core model before and after package removal, and check that a never-declared repository remains byte-identical after validation:

```sh
npm ci --prefix packages/documents-cli
python3 packages/documents-cli/tests/test_documents_integrity.py
```

Run these commands from the methodology checkout, with Python 3 and PyYAML installed. The test installs the packed CLI into a temporary adopter and needs npm registry access or a populated npm cache. It also runs the generic package and ReqIF regression tests.
