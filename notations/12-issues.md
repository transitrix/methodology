---
notation: "Issues Register"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-26"
status: "draft"
file_extension: "*.issues.transitrix.yaml"
---

# Issues Notation — Issue Register

**Scope:** Text-native catalogue of an organisation's issues — problems, defects, open questions, and risks-to-resolve. Issues form a parent/child hierarchy, so the same document also renders as a nested tree. The notation records *what is wrong or unresolved*; it complements `activities`, which records *what work is planned*.
**Renderer:** Transitrix Studio (planned) — nested tree view.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across the Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `issues` |
| File extension | `*.issues.transitrix.yaml` |

---

## Element lifecycle

Every inline issue entry under `issues[]` (`ISSUE` canonical TYPE per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.1) carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](CONTRACT.md) §7 and apply uniformly to inline issues in this notation. Per [CONTRACT.md](CONTRACT.md) §7.1, the lifecycle sits on each issue entry; the issues-catalogue document itself does not carry a lifecycle field.

The issue's `status` (`open` / `in_progress` / `blocked` / `resolved` / `closed`), `created_at`, and `resolved_at` fields describe the **issue-handling timeline** — when the issue was opened, where it currently stands, when it was closed. These are operational state, distinct from `valid_from` / `valid_to` which mark the period the issue artefact itself is admitted to canon and considered in effect. In typical practice the two coincide for `open` issues (`valid_from ≈ created_at`, `valid_to: null`); closing an issue may or may not retire the artefact depending on the organisation's archive policy.

---

## 1. Overview

An **Issues** document is a register of issues an organisation is tracking. Each issue carries a lifecycle `status` and an optional `parent`, so the register is also a hierarchy: a broad issue decomposes into sub-issues, which decompose further.

The notation answers the question **"what is wrong, open, or unresolved?"** — distinct from `activities`, which answers "what work is planned?". An issue is not a unit of scheduled work; it is a standing record of a problem or open question. The two notations link: an issue may reference, via `relates_to`, the activities or goals it concerns.

Issues do **not** carry scheduling data — no duration, no dependencies, no critical path. Decomposition is by containment (`parent`), not by predecessor ordering. A renderer derives the tree from `issue_id` + `parent` and presents it as a nested, collapsible outline.

---

## 2. When to use this notation

| Need | Use |
|---|---|
| Register a problem, defect, open question, or risk | Issues |
| Break a broad issue into sub-issues | Issues — `parent` reference |
| Track issue lifecycle (open → in progress → resolved / closed) | Issues — `status` |
| Link an issue to the work or goal it concerns | Issues — `relates_to` |
| Plan a project as a network of activities with dependencies | Activities (`*.activities.transitrix.yaml`) |
| Decompose strategic goals hierarchically | Goals tree (`*.goals.transitrix.yaml`) |
| Trace strategic factors → goals → changes → activities | FGCA (`*.fgca.transitrix.yaml`) |

---

## 3. File location and naming

```
organizations/<org>/views/issues/<NAME>.issues.transitrix.yaml
```

Examples:
- `views/issues/platform-launch.issues.transitrix.yaml`
- `views/issues/data-migration.issues.transitrix.yaml`

Issues defined here MAY reference other elements by ID (activities, goals, roles) declared elsewhere in the organisation's repository.

---

## 4. Document structure

```yaml
notation: issues
spec_version: "0.1"

issues_catalogue:
  id: ISSUES-CAT-1
  name: "Platform Launch 2026 — Issue Register"
  description: "Open issues, defects, and questions for the 2026 platform launch."
  version: "0.1"
  updated_at: "2026-05-25"

  issues:
    - issue_id: ISSUE-1
      name: "Checkout latency above target under load"
      status: in_progress                     # open | in_progress | blocked | resolved | closed
      description: "p95 checkout response exceeds the 800 ms target above 2k concurrent users."
      relates_to: [ACTIVITY-5, GOAL-CUST-1]    # optional — activities / goals this issue concerns
      owner_role: ROLE-PLATFORM-1              # optional — role accountable for the issue

    - issue_id: ISSUE-2
      name: "Payment retry storms on gateway timeout"
      status: blocked
      parent: ISSUE-1                          # optional — makes this a sub-issue (nesting)

    - issue_id: ISSUE-3
      name: "Confirm idempotency-key TTL with the payments vendor"
      status: open
      parent: ISSUE-2
```

A document is a single `issues_catalogue` object holding catalogue metadata and a flat `issues` array. Nesting is expressed inside that flat array by the `parent` field — see §6.

---

## 5. Field reference

### 5.1 Catalogue fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `notation` | yes | string | MUST equal `issues` |
| `spec_version` | no | string | reserved, see file header |
| `issues_catalogue.id` | yes | string | catalogue ID — `ISSUES-CAT-<integer>` per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) |
| `issues_catalogue.name` | yes | string | human-readable register name |
| `issues_catalogue.description` | no | string | optional register description |
| `issues_catalogue.version` | no | string | document version (semantic versioning recommended) |
| `issues_catalogue.updated_at` | yes | ISO 8601 date | last update date (`YYYY-MM-DD`) |
| `issues_catalogue.issues` | yes | array | the register entries (§5.2); MAY be empty |

### 5.2 Issue fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `issue_id` | yes | string | unique within the catalogue — `ISSUE-<integer>` per the ID grammar |
| `name` | yes | string | one-line summary of the issue; MUST NOT be empty |
| `status` | yes | enum | one of `open`, `in_progress`, `blocked`, `resolved`, `closed` |
| `parent` | no | string | `issue_id` of the parent issue — the nesting mechanism (§6) |
| `description` | no | string | optional multi-line detail |
| `relates_to` | no | array | typed IDs of `ACTIVITY` and/or `GOAL` elements this issue concerns |
| `owner_role` | no | string | `ROLE` element ID of the role accountable for the issue |

Severity, priority, assignee, dates, and labels are intentionally **not** in v1. They may be added later as backwards-compatible optional fields.

### 5.3 Status vocabulary

| Status | Meaning |
|---|---|
| `open` | Registered, not yet being worked. |
| `in_progress` | Actively being worked. |
| `blocked` | Cannot progress until something external is resolved. |
| `resolved` | The underlying problem has been fixed or answered. |
| `closed` | No longer tracked — resolved-and-verified, withdrawn, a duplicate, or a "won't fix". |

---

## 6. Nesting model

The `issues` array is **flat**. A child issue declares its parent with `parent: <issue_id>`; an issue with no `parent` is a root. This matches how `activities` expresses WBS-style grouping and keeps the catalogue a single flat list.

- Each issue has at most one parent — the hierarchy is a tree (or a forest, if there are several roots).
- A renderer derives the tree from `issue_id` + `parent` and renders it as a nested, collapsible outline.
- An issue whose `parent` does not resolve to a defined `issue_id` is rendered at the root and flagged (`ISS-004`).
- A `parent` chain that loops back on itself is invalid (`ISS-005`).

---

## 7. Validation rules

Shared header rules `HDR-001`…`HDR-004` apply (see [CONTRACT.md](CONTRACT.md)). Notation-specific rules:

| Rule | Severity | Description |
|---|---|---|
| `ISS-000` | error | Structural / header problem — input is not an object, the `notation` value is not `issues`, the `issues_catalogue` root key is missing, or a required catalogue field (`id` / `name` / `updated_at`) is missing. |
| `ISS-001` | error | Duplicate `issue_id` within the catalogue. |
| `ISS-002` | error | `status` is not one of the §5.3 vocabulary values. |
| `ISS-003` | error | `issue_id` or `name` is missing or empty. |
| `ISS-004` | warning | `parent` references an `issue_id` that is not defined — the issue is rendered at the root. |
| `ISS-005` | error | Cycle in the `parent` chain (an issue is its own ancestor). |
| `ISS-006` | error | A `relates_to` entry references an undefined ID, or an ID whose TYPE is neither `ACTIVITY` nor `GOAL`. |

A document with any `error` is invalid; `warning`-level findings do not block rendering.

---

## 8. Rendering

Transitrix Studio renders an issues document as a **nested, collapsible tree**:

- Each issue is a node showing its `name` and a `status` badge; the badge colour encodes the status.
- Sub-issues are nested under their parent; parents can be collapsed.
- Root issues (no `parent`) and issues with a broken `parent` (`ISS-004`) appear at the top level.
- `relates_to` and `owner_role` are shown as node detail; they are not edges of the tree.

The viewer is read-only preview; editing happens in the text file.

---

## 9. Relationship to other notations

```
Goals tree          →  why the work matters (strategic goals)
Activities          →  what work is planned to get there
Issues Register     →  what is wrong, open, or unresolved along the way
```

An issue's `relates_to` points at the `ACTIVITY` or `GOAL` it concerns; `activities` and the goals tree do not point back — the dependency is one-directional, issue → element. Issues are a register laid alongside the plan, not a layer of it.

---

## 10. References

- Shared header contract: [CONTRACT.md](CONTRACT.md)
- ID grammar and TYPE registry (`ISSUE`, `ISSUES_CAT`): [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md)
- Activities notation: [07-activities.md](07-activities.md)
- Goals notation: [04-goals.md](04-goals.md)
- Worked example: [`examples/issues/`](examples/issues/)
