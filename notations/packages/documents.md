---
title: "Issued documents — identity and traceability package"
version: "1.0"
author: "Valerii Korobeinikov"
last_updated: "2026-09-02"
status: "draft"
---

# Documents Package — Reference

**Scope:** An optional domain package for capturing the identity and traceability of issued documents — versioned, status-tracked artifacts that bind to issues, capabilities, or other core elements by reference. This document is the package's own spec per [`PACKAGES.md`](../PACKAGES.md) §6.

This is a package, not a core notation: nothing here changes `IDS_AND_REFERENCES.md`'s core TYPE registry, and none of it is admitted, validated, or rendered by core tooling. An adopter repository that does not declare `packages: [documents]` is unaffected by everything in this document — see [`PACKAGES.md`](../PACKAGES.md) §5.

**What this package does not do:** it does not implement document management workflows, approval routing, signature capture, registration procedures, retention schedules, or records management regimes. It carries identity and traceability only — the metadata an issuing authority needs to track an artefact it has released.

---

## 1. Name and folder

- **Package name** (the `packages:` entry): `documents`.
- **Folder:** a top-level `documents/` folder in the adopter repository, at the same level as `canon/`, `field/`, `codex/`.

```yaml
transitrix: 1
methodology_version: "5.0.0"
packages: [documents]
```

---

## 2. Object types and ID grammar

### 2.1 The two object kinds

The package's object model has exactly two kinds:

| Kind | What it holds |
|---|---|
| `document-type` | A template: a name, a list of required fields (key + datatype), and versioning constraints. |
| `document` | An issued instance: an id, the type it instantiates, a version, a status, a timestamp, and a `values` map keyed by field name. |

### 2.2 ID grammar — disjoint from core

Per [`PACKAGES.md`](../PACKAGES.md) §4.1, a package identifier must never be shaped so it could be mistaken for a core `TYPE-NAME-<integer>` id ([`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1). Core ids are TYPE-led, and TYPE always starts with an uppercase letter (`^[A-Z]`). This package's grammar is **entirely lowercase**, which is unconditionally disjoint:

```
<kind>-<slug>-<INTEGER>
```

| `<kind>` | Object kind |
|---|---|
| `doct` | `document-type` |
| `doc` | `document` |

- `<kind>` is one of the two literal tokens above, followed immediately by a hyphen (so `doc-…` and `doct-…` never collide — the token match is exact, not a prefix test).
- `<slug>` is one or more lowercase alphanumeric segments separated by hyphens.
- `<INTEGER>` is a terminal positive integer ≥ 1, no leading zeros — same terminal-integer rule as the core grammar ([`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1).

```
^(doct|doc)-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$
```

**Examples:** `doct-requirements-1`, `doc-srs-v2-1`, `doct-architecture-decision-1`, `doc-meeting-notes-2`.

### 2.3 File layout

```
documents/
  document-types/<id>.yaml
  documents/<id>.yaml
```

One object per file, named by its id. Every file carries `package: documents` and `kind: <one of the two kinds above>` — this pair is how the package's own tooling recognises its files; core tooling never reads them (§4.2 of the mechanism doc).

### 2.4 `document-type` schema

```yaml
package: documents
kind: document-type
id: doct-requirements-1
name: "Requirements Document"
fields:
  - key: "Title"
    datatype: STRING
    required: true
  - key: "Version"
    datatype: STRING
    required: true
  - key: "Status"
    datatype: STRING
    required: true
  - key: "IssuedDate"
    datatype: DATE
    required: true
```

| Field | Required | Semantics |
|---|---|---|
| `package` | yes | Fixed value `documents`. |
| `kind` | yes | Fixed value `document-type`. |
| `id` | yes | `doct-…` per §2.2. |
| `name` | yes | Human-readable name of the document type. |
| `fields` | yes | Array of field definitions, each with `key`, `datatype`, and `required`. |

Supported datatypes: `STRING`, `TEXT`, `DATE`, `INTEGER`, `BOOLEAN`. Fields is never empty.

### 2.5 `document` schema

```yaml
package: documents
kind: document
id: doc-srs-v2-1
type: doct-requirements-1
version: "2.0"
status: "issued"
issued_at: "2026-09-01T14:30:00Z"
values:
  Title: "System Requirements Specification"
  Version: "2.0"
  Status: "Approved"
  IssuedDate: "2026-09-01"
canon_refs:
  - CAPABILITY-V2
  - REQUIREMENT-sched-auth-1
```

| Field | Required | Semantics |
|---|---|---|
| `package` | yes | Fixed value `documents`. |
| `kind` | yes | Fixed value `document`. |
| `id` | yes | `doc-…` per §2.2. |
| `type` | yes | A `doct-…` id of the document-type this instance instantiates. |
| `version` | yes | A SemVer-shaped version string (e.g. "1.0", "2.1.3"). |
| `status` | yes | One of: `draft`, `issued`, `superseded`, `archived`. |
| `issued_at` | yes | ISO 8601 timestamp (UTC second-precision); the instant this version was released. |
| `values` | yes | A map keyed by field names defined in the document-type's `fields`; every `required: true` field must have an entry. |
| `canon_refs` | no | An array of core element IDs (CAPABILITY, REQUIREMENT, CONSTRAINT, etc.) this document is bound to by traceability; empty array or field absent if no bindings. |

### 2.6 One-way reference to core — `canon_refs`

Per [`PACKAGES.md`](../PACKAGES.md) §4.1, a package object may reference a core element by id; no core element may reference a package object. This package's mechanism for that one-way reference is the `canon_refs` array on a `document`: a plain list of core element IDs that the document cites or is bound to. Nothing elsewhere in the package or in core reads or resolves these values automatically — they are citations, not enforced links. They round-trip through any import/export unchanged.

The package validator checks that a `canon_refs` value is grammar-valid (DOCS-005, §5); it does not confirm the id resolves to an admitted element (package tooling has no access requirement into `canon/`). That resolution is core's job, and per [`PACKAGES.md`](../PACKAGES.md) §4.1 it already happens for free: a `canon_refs` value is not itself a core cross-reference field, so no core validator reads it either. The citation is documentary, not enforced.

---

## 3. File location and naming

```
<adopter-repo-root>/documents/document-types/<id>.yaml
<adopter-repo-root>/documents/documents/<id>.yaml
```

One artefact per file, named by its canonical package id (§2.2).

---

## 4. Validation rules — the package's own validator

Run by `@transitrix/documents-cli validate <documents-folder>` (the reference implementation lives in [`packages/documents-cli`](../../packages/documents-cli) in this repo). No documents-specific rule is ever wired into `packages/ingest-cli`, `scripts/check-notations.mjs`, or Studio's validator registry ([`PACKAGES.md`](../PACKAGES.md) §4.2) — the checks in the table below live only here and in `documents-cli`. `@transitrix/ingest-cli`'s `check-packages` command ([`PACKAGES.md`](../PACKAGES.md) §4.2, §7.1) may invoke this validator generically (a name → path lookup, run as a subprocess) when `@transitrix/documents-cli` is installed in the adopter repo; it never learns what the table below checks.

| Rule | Severity | Description |
|---|---|---|
| `DOCS-001` | error | An object's `id` does not match its kind's grammar in §2.2. |
| `DOCS-002` | error | Two objects in the package share the same `id`. |
| `DOCS-003` | error | A `document.type` does not resolve to a `document-type` id present in the package. |
| `DOCS-004` | error | A `document` carries a `values` entry not defined in its `document-type`'s `fields`, or is missing a required field. |
| `DOCS-005` | error | A `canon_refs` entry is present but is not a grammar-valid core id (syntax per [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1). |
| `DOCS-006` | error | A `document.issued_at` is not a valid ISO 8601 timestamp, or `document.version` is not a valid SemVer string. |
| `DOCS-007` | error | A `document.status` is not one of: `draft`, `issued`, `superseded`, `archived`. |

No rule here reaches into `canon/`, `field/`, or `codex/` — package-internal integrity only, per [`PACKAGES.md`](../PACKAGES.md) §4.2.

---

## 5. Removal procedure

Per [`PACKAGES.md`](../PACKAGES.md) §4.3, removal is the baseline two-step procedure — this package adds no package-specific step:

1. Delete the `documents/` folder from the adopter repository root.
2. Remove `documents` from the `packages:` list in `transitrix.yaml` (or delete the whole `packages:` line, if `documents` was the only entry).

Nothing else changes. No `canon/`, `field/`, or `codex/` file is touched by either step, because per §2.6 no core element ever references a package object — there is nothing in `canon/` for the two steps above to leave dangling.

Demonstrated as a test, not asserted in prose ([`PACKAGES.md`](../PACKAGES.md) §4.3): run `python packages/documents-cli/tests/test_documents_integrity.py` (also wired into CI). The test copies a worked example, performs both removal steps against the copy, and asserts that no `canon/` file still references a document id and that every `canon/` file still parses.

---

## 6. Experimental status and review date

This package is **experimental**, in full. Landed 2026-09-02. Reviewed by **2027-03-02** (six months out), or sooner if real adopter usage surfaces a shape problem before then.

What "review" means here: re-read this spec against how the reference implementation has actually been used, then choose one of — keep as-is (still experimental, set a new review date); promote to stable (replace this section with a statement that the package graduated); revise the object model or status values based on what usage showed; or remove the package (§5 makes this the cheap option by design).

Per [`PACKAGES.md`](../PACKAGES.md) §6, core specs are never refactored to accommodate this package's experimental surface while it carries this status. Confirmed on landing: this package's spec touches no core spec file except `PACKAGES.md`'s own §7.1 shipped-packages row and `README.md`'s notation index — never `IDS_AND_REFERENCES.md`, `CONTRACT.md`, `COVERAGE_PROFILES.md`, or a core validator.

---

## 7. Core envelope statement

**No.** This package does not carry [`CONTRACT.md`](../CONTRACT.md)'s core envelope — the required header (§2), admission record (§6), or lifecycle (§7) — on either of its two object kinds (§2.1). Neither `document-type` nor `document` is ever admitted; `package: documents` + `kind: <…>` (§2.3) is the only pair the package's own tooling reads, and no core validator reads it at all ([`PACKAGES.md`](../PACKAGES.md) §4.2).

This package carries document identity and traceability metadata: versioning, status, and bindings to core elements. A `document` sitting in `documents/documents/` has made no claim about admission to `canon/`, `field/`, or `codex/`. The one place it touches core is the one-way `canon_refs` citation (§2.6), which points *at* already-existing core elements — it never asserts that the citing `document` itself is, or needs to become, an admitted core object. Documents are recordings of released artefacts, not core model elements.

---

## 9. DMS integration contract

This package is upstream of document management. An adopter who keeps issued documents in a document management system (DMS) — whether commercial, open-source, or internal — integrates with this package at a defined seam. This section specifies what the module produces, what the adopter DMS provides, and what deliberate non-scope boundaries protect both sides.

### 9.1 What the module produces — the contract's goods

A rendered document run produces three artefacts:

| Artefact | What it holds | Audience |
|---|---|---|
| **Run record** | Recipe identity (id, version), repository commit, model id, render timestamp, per-slot instructions and their verdicts. | DMS, integration layer, audit trails. |
| **Snapshot manifest** | The model state the render captured: list of element IDs cited in the document, rendered date, methodology version. | Traceability queries, freshness checks, retirement detection. |
| **Document identity** | Issuer, issue timestamp, document hash (content fingerprint), source reference (URI), baseline tag (git reference). | DMS registration, integrity checking, auditability. |

**Format:** each is emitted as JSON by the reference implementation. A non-reference renderer may emit another format provided it carries the same semantic content and is documented per §9.6.

### 9.2 What the adopter DMS provides — the contract's consumers

| Consumer layer | Role |
|---|---|
| **Document store** | URI-addressable storage for the PDF (or other output format) — e.g. `resource://documents/srs-2026-q3/issue-1`. The URI is a reference, never dictated by the module. |
| **Metadata intake** | An endpoint or queue where the module deposits run record, snapshot manifest, and document identity on every render. |
| **Query surface** | An API exposing facts the adopter needs — e.g. "which documents cite this capability", "which documents may be stale because an element changed". These queries are application-specific; the module provides the data, not the queries. |
| **Retention and lifecycle** | Retention schedules, approval workflows, signature capture, records classifications, any regulatory regime the adopter runs. None of this is the module's concern. |

### 9.3 What the module deliberately does not do — non-scope boundaries

The module carries document **identity and traceability**. It does not carry document **management**. This means:

| The adopter DMS does | The module does not do |
|---|---|
| Route documents for approval | Decide whether a document is valid to issue. |
| Capture signatures | Sign or verify signatures. |
| Register documents for compliance | Create compliance records or regulatory filings. |
| Hold retention schedules | Enforce retention policies. |
| Classify by sensitivity | Assign classification levels or access control. |
| Audit who accessed what | Log access to issued documents. |
| Replace a real DMS | Substitute for a working document repository. |
| Route for change control | Approve or reject changed elements. |

The module answers the question "what model was rendered into this document?" — not "who may see it" or "when must it be deleted."

### 9.4 Data exchange format — run record schema

The run record is the primary interchange artefact. Its structure is governed by [`document-renderer/README.md`](../../packages/document-renderer/README.md), emitted as JSON following this schema:

```json
{
  "recipe": {
    "id": "product.srs",
    "version": "1.0"
  },
  "repository": {
    "commit": "a1b2c3d4…",
    "baseline_tag": "release-2026-q3"
  },
  "model": {
    "id": null,
    "methodology_version": "5.0.0"
  },
  "rendered_at": "2026-09-02T14:30:00Z",
  "profile": "strict",
  "slots": [
    {
      "slot_id": "market-size",
      "question": "How large is the addressable market?",
      "inputs": ["CAP-1", "REQ-14"],
      "sufficient": true,
      "verdict": "sufficient",
      "produced_text": "The addressable market is $5B growing at 15% CAGR.",
      "attributions": ["CAP-1"]
    }
  ],
  "suspicion": {
    "computed": false,
    "reason": "not-computed-by-this-pass"
  }
}
```

**Snapshot manifest** (extracted from the run record and document, for efficiency in queries):

```json
{
  "document_id": "doc-srs-v2-1",
  "document_hash": "sha256:a1b2c3…",
  "rendered_at": "2026-09-02T14:30:00Z",
  "recipe_id": "product.srs",
  "recipe_version": "1.0",
  "baseline_commit": "a1b2c3d4…",
  "methodology_version": "5.0.0",
  "elements_cited": [
    "CAPABILITY-V2",
    "REQUIREMENT-sched-auth-1",
    "CONSTRAINT-4"
  ]
}
```

**Document identity** (metadata bound to the issued artefact):

```json
{
  "id": "doc-srs-v2-1",
  "type": "doct-requirements-1",
  "version": "2.0",
  "status": "issued",
  "issued_at": "2026-09-02T14:30:00Z",
  "issuer": "release-automation@example.com",
  "content_hash": "sha256:a1b2c3…",
  "source_uri": "resource://documents/srs-2026-q3/issue-1",
  "baseline_tag": "release-2026-q3"
}
```

All timestamps are ISO 8601 UTC, second-precision. Hashes use SHA256. A non-reference renderer must emit JSON carrying these fields; schema variations are acceptable if approved by the consuming DMS.

### 9.5 Integration example — how a DMS consumes the data

**Scenario:** The adopter runs Studio to render a recipe, capturing the run record and snapshot manifest. A webhook delivers them to the DMS integration layer.

```
1. Studio renders recipe -> PDF + run record + document identity
2. Metadata integration layer receives all three
3. DMS:
   - Stores the PDF at the URI named in document identity
   - Ingests snapshot manifest for traceability queries
   - Logs the run record for audit trail
   - Marks the document as "ready for review" (its own workflow)
4. On later model change (element modified/deleted):
   - Snapshot query: "which documents cite this element?"
   - Result: [doc-srs-v2-1]
   - DMS flags document as "stale, re-render recommended"
   - Adopter decides: re-render, or retire the document
```

The module provides the data. The adopter DMS provides the **decision**, the **action**, and the **workflow**.

### 9.6 Out-of-scope list — what the adopter DMS must guarantee

- **The adopter is responsible for:**
  - Storing the document bytes at the URI the module names
  - Verifying the content hash matches what the module emitted
  - Implementing access control (who may read/download)
  - Enforcing retention schedules and lifecycle
  - Capturing and verifying signatures if regulations require them
  - Logging access and changes for audit
  - Handling integration failures (e.g. webhook delivery retry)

- **The module is NOT responsible for:**
  - Storing the document (it emits bytes; storage is the DMS's)
  - Approval workflows (the DMS owns that)
  - Signature capture or verification
  - Compliance registration or regulatory filing
  - Access control or role-based permissions
  - Retention enforcement
  - Audit logging of who accessed what

---

## 10. Traceability queries — bidirectional document-model linkage

The DMS integration produces three derived queries that enable computable traceability between issued documents and the model elements they cite. These queries run on demand against run records and snapshot manifests, with no persistent storage or index beyond what those two artefacts provide (§10.5).

### 10.1 Query 1: Documents citing an element

**Purpose:** Given a model state (git commit) and an element ID, find all issued documents that cite that element.

**Signature:**
```
documents_citing_element(commit: string, element_id: string) 
  -> List[{document_id, document_version, rendered_at, recipe_id}]
```

**Inputs:**
- `commit`: Git commit hash at which to query the model state (e.g. `a1b2c3d4…`).
- `element_id`: A core element ID in grammar-valid form per [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1 (e.g. `CAPABILITY-V2`, `REQUIREMENT-sched-auth-1`).

**Output:** An array of document records, each carrying:
- `document_id`: The document's package id (`doc-…` per §2.2).
- `document_version`: SemVer version of that document instance.
- `rendered_at`: ISO 8601 UTC timestamp when the document was issued.
- `recipe_id`: The recipe that rendered this document.
- `recipe_version`: Version of the recipe.

**Evaluation:**
1. Enumerate all run records where `repository.commit` is `commit` or an ancestor thereof (within the canonical rendering workflow's lookback window; see §10.5).
2. For each run record, inspect its `slots[].attributions[]` to identify which elements are cited.
3. For each document rendered by that run, check its snapshot manifest: if `elements_cited` contains `element_id`, include the document in the result.

**Example:**
```
documents_citing_element(
  commit="release-2026-q3", 
  element_id="CAPABILITY-V2"
) 
-> [
  {
    document_id: "doc-srs-v2-1",
    document_version: "2.0",
    rendered_at: "2026-09-02T14:30:00Z",
    recipe_id: "product.srs",
    recipe_version: "1.0"
  }
]
```

**Called from:** Adopter dashboards, internal audit tools, downstream DMS traceability queries (e.g. "which documents cite this capability?").

### 10.2 Query 2: Documents affected by a model change

**Purpose:** Given an element ID that was deleted or moved, find all issued documents that are now potentially stale because they cited the old element state.

**Signature:**
```
stale_documents_for_change(element_id: string, change_type: enum["deleted", "moved"]) 
  -> List[{document_id, document_version, last_rendered_at, stale_since}]
```

**Inputs:**
- `element_id`: The core element ID that changed (e.g. `REQUIREMENT-auth-1`).
- `change_type`: The nature of the change — `"deleted"` if the element no longer exists in `canon/`, or `"moved"` if it was renamed or reclassified.

**Output:** An array of stale-document records, each carrying:
- `document_id`: The document's package id.
- `document_version`: SemVer version of the document instance.
- `last_rendered_at`: ISO 8601 UTC timestamp when the document was last issued.
- `stale_since`: ISO 8601 UTC timestamp of the commit that deleted/moved the element.
- `recommendation`: One of `"re-render"`, `"retire"`, or `"review"` (based on time elapsed since render, per DMS policy).

**Evaluation:**
1. Query git history to find the commit where `element_id` was deleted or moved.
2. Enumerate all run records where `repository.commit` is before that deletion commit.
3. For each run record, check all documents it rendered: if the snapshot manifest's `elements_cited` contains `element_id`, the document is stale.
4. Return all stale documents, sorted by `last_rendered_at` (oldest first).

**Example:**
```
stale_documents_for_change(
  element_id="REQUIREMENT-auth-1",
  change_type="deleted"
)
-> [
  {
    document_id: "doc-srs-v2-1",
    document_version: "2.0",
    last_rendered_at: "2026-09-01T10:00:00Z",
    stale_since: "2026-09-02T08:45:00Z",
    recommendation: "re-render"
  }
]
```

**Called from:** Adopter DMS on model change events, CI/CD workflows that flag stale documents, change-impact dashboards.

### 10.3 Query 3: Document provenance and elements

**Purpose:** Given an issued document ID, retrieve the model state it was rendered from, its render metadata, and the complete list of elements it cites.

**Signature:**
```
document_provenance(document_id: string) 
  -> {
    document_version, 
    rendered_at, 
    recipe_id, 
    recipe_version, 
    baseline_commit, 
    methodology_version, 
    elements_cited: List[string], 
    run_record: object
  }
```

**Inputs:**
- `document_id`: The document's package id (`doc-…` per §2.2).

**Output:** A single document-provenance record carrying:
- `document_version`: SemVer version of the document.
- `rendered_at`: ISO 8601 UTC timestamp when rendered.
- `recipe_id`: The recipe that produced this document.
- `recipe_version`: Version of the recipe.
- `baseline_commit`: Git commit hash of the model state that was rendered.
- `baseline_tag`: Git tag or reference name if the render was tagged (e.g. `release-2026-q3`).
- `methodology_version`: The Transitrix methodology version the render used.
- `elements_cited`: Array of core element IDs in `elements_cited` from the snapshot manifest.
- `run_record`: The full run record JSON (for audit trails and detailed inspection).

**Evaluation:**
1. Look up the snapshot manifest for `document_id` in the DMS metadata store.
2. Retrieve the corresponding run record from the same store.
3. Return the full provenance object.

**Example:**
```
document_provenance("doc-srs-v2-1")
-> {
  document_version: "2.0",
  rendered_at: "2026-09-02T14:30:00Z",
  recipe_id: "product.srs",
  recipe_version: "1.0",
  baseline_commit: "a1b2c3d4…",
  baseline_tag: "release-2026-q3",
  methodology_version: "5.0.0",
  elements_cited: ["CAPABILITY-V2", "REQUIREMENT-sched-auth-1"],
  run_record: { … }
}
```

**Called from:** DMS UI (document details pane), adopter integration tools, audit and compliance workflows, document versioning dashboards.

### 10.4 Calling convention and error handling

All three queries are **stateless and demand-computed**. They run synchronously on invocation, with no caching or warming phase.

| Error case | Behavior |
|---|---|
| `element_id` not found in any run record | Return empty list (Query 1, 2) or `null` (Query 3). |
| `commit` not in git history | Return empty list (Query 1). |
| `document_id` not found in DMS | Return `null` (Query 3). |
| Run record or snapshot manifest corrupted | Raise `DataIntegrityError` with the affected document id. |
| Git history unavailable | Raise `GitHistoryError` — queries are offline and fail gracefully if the repository is not accessible. |

### 10.5 Implementation location and performance

**Where they run:**
- **Primary:** Studio's document-render workflow, after rendering completes and before metadata is handed to the DMS.
- **Secondary:** The adopter's own integration layer or DMS plugin, querying via a REST API the module exposes (see §10.6).
- **Offline:** An adopter's internal dashboard or audit tool that has read access to run records and git history but not the DMS.

**Performance characteristics:**
- Query 1 (documents citing element): O(R × S), where R = number of run records in the lookback window, S = average snapshot size. Typical: < 500ms for 10 years of renders.
- Query 2 (stale documents): O(R × S × G), where G = git-history depth (worst case: full repo walk to find the deletion commit). Typical: < 2s for 10 years of renders. Mitigation: cache the deletion commit once found.
- Query 3 (document provenance): O(1) — direct lookup in DMS metadata store.

**No persistent index.** Queries derive results from run records and git history on demand. This trades latency for simplicity: no index to keep in sync, no storage beyond what the DMS already holds, and every result is guaranteed current (never stale cached data).

**Lookback window:** Queries enumerate run records back to the earliest document still in-scope under the adopter's retention policy (see §9.6). The module does not enforce a limit; it is the adopter DMS's responsibility to bound the window (e.g. "only documents from the last 7 years" or "only documents marked 'active'").

### 10.6 API surface — how callers invoke the queries

Each query is a callable function in the module's integration layer, exposed as:
- **Studio plugin:** `@transitrix/documents-dms-queries` package, imported as `{ documentsForElement, staleDocuments, documentProvenance } from '@transitrix/documents-dms-queries'`.
- **REST API:** `POST /query/<query-name>` on the adopter's integration endpoint, with JSON body carrying the query inputs.
- **Python CLI:** `@transitrix/documents-cli query <query-name> <args>` (reference implementation).

Each invocation logs (to the DMS audit trail):
- Query name
- Inputs (commit, element id, or document id)
- Timestamp
- Caller identity (if available from the calling context)
- Result count

---

## 11. References

- [`PACKAGES.md`](../PACKAGES.md) §4 (reversibility contract), §6 (what a package spec must state).
- [`CONTRACT.md`](../CONTRACT.md) §2/§6/§7 (core envelope elements referenced in §7).
- [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1 (core id grammar, a package's grammar must stay disjoint).
- [`packages/documents-cli`](../../packages/documents-cli) (reference validator implementation).
