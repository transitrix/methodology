# Documents Package — Worked Example

A minimal example of the `documents` package in use:

- **document-types/**: Templates for documents (requirements, specifications, etc.)
- **documents/**: Issued instances, with various statuses (issued, superseded, archived)

Each document is bound to core capabilities and requirements by reference ID.

Used by the removal-integrity test (`packages/documents-cli/tests/test_documents_integrity.py`) to validate that:

1. Removal (delete both folders, drop from `packages:` list) leaves no trace in the repository.
2. Absence of the package is truly silent: a repository that never declared it is byte-identical to one where it was used then removed.
