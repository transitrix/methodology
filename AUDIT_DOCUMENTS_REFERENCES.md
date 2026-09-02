# Audit: Documents Package Reference Direction

**Date:** 2026-09-02  
**Status:** Complete — no violations found

---

## Scope

This audit verifies that the newly declared documents package follows the one-way reference rule defined in PACKAGES.md §4.1:

> **Reference direction:** Package objects may reference canonical material; canonical material must never reference package-specific types, validators, or removal procedures.

For the documents package specifically, violations would include:
1. Any canonical file (outside `packages/documents/`) that references document-package types (`doct-*`, `doc-*`)
2. Any canonical recipe (`canon/views/`) that includes documents extension or validators
3. Any snapshot or figure path that assumes documents package in place
4. Existing imports/dependencies that violate the direction rule

---

## Method

Systematic search across canonical material:

1. **Canonical material searched:**
   - `./notations/` — all spec files, views, examples (except package examples)
   - `./integration/` — integration guides
   - `./docs/` — documentation
   - `./guides/` — operational guides
   - `./method/` — methodology material

2. **Search terms used:**
   - Package object type IDs: `doct-*`, `doc-*`
   - Package validator codes: `DOCS-001` through `DOCS-007`
   - Package one-way reference: `canon_refs`
   - Package folder path: `documents/` (filtered for false positives like `document-view`, `doc-lint`)
   - Package CLI: `documents-cli`, `documents-validator`

3. **Results reviewed for context:**
   - All matches examined to distinguish true violations from:
     - References to document VIEW specs (`views/documents/`) — permitted, part of canonical material
     - References to document-view rendering notation — not a package reference
     - Tool references (`doc-lint`) — not package-related
     - Generic language ("documents you can", "documents are") — not type references

---

## Findings

**Zero violations identified.**

No canonical material references:
- Document package object types (no `doct-*` or `doc-*` IDs in canonical files)
- Document package validators (no `DOCS-*` codes in canonical material)
- Document package folders (no `documents/` path references from canonical layer)
- Document package specific fields (no `canon_refs` in canonical examples)

---

## Disposition

**All violations: none.** Reference direction is correct as-is.

The documents package correctly:
- Declares its own spec in `notations/packages/documents.md` (package-level material)
- Carries examples in `notations/examples/packages/documents/` (package-level examples, not canonical)
- Implements validation only in `packages/documents-cli` (package-level tooling)
- Defines one-way reference via `canon_refs` field (package→canon, never canon→package)

No canonical material needs to move or be modified to achieve compliance with the package→canon reference rule.

---

## Ready for Next Phase

Audit acceptance criteria met:
- ✓ Audit complete with all violations identified (zero)
- ✓ Violations documented with disposition (N/A — none found)
- ✓ Reference direction verified and documented

The reference direction is clean and ready for downstream phases.
