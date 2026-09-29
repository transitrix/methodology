# Documents Package — Worked Example

A minimal synthetic example of the `documents` package in use:

- **document-types/**: Templates for documents (requirements, specifications, etc.)
- **documents/**: Issued instances, with various statuses (issued, superseded, archived)

Each document is bound to core capabilities and requirements by reference ID.

Copy `document-types/` and `documents/` into the adopter's top-level
`documents/` folder, declare `packages: [documents]`, and install the
[validator](../../../../packages/documents-cli/README.md). Run
`transitrix-ingest check-packages <adopter-root>` to validate the records.

The integration test combines these records with synthetic core goals, validates
through generic package dispatch, then deletes the enclosing `documents/` folder
and removes the declaration. Core validation still passes and core bytes remain
unchanged. A separate never-declared repository is byte-identical before and
after real validation, even with invalid document records on disk.

[RP-17: one document, two editions, independent reviews](../rp17.md) shows a
synthetic recovery-arrangements document, its release binding, and use of the
read-only provenance checker. It separates current package metadata from
proposed identity/edition semantics and annual recurrence support.
