---
title: "Requirement — motivation-layer positive obligation"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-28"
status: "draft"
---

# Requirement — Reference

**Scope:** The `REQUIREMENT` element type in the motivation layer of an organisation's canon — a positive obligation the organisation must fulfil ("must submit", "must register", "must obtain approval"). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Requirements are **zone primitives**: each requirement is a single YAML file under `canon/elements/01_motivation/requirements/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the requirement-specific frontmatter below.

---

## 1. REQUIREMENT vs CONSTRAINT — by form of the obligation

The motivation layer carries two element types with overlapping vocabularies but distinct semantics. The boundary is the **form of the obligation**:

| | REQUIREMENT | CONSTRAINT |
|---|---|---|
| **What it is** | A positive obligation — an action or state the org must achieve | A restriction or prohibition — a boundary the org must not cross |
| **Typical wording** | "MUST", "SHALL", "must submit", "must register", "must maintain", "must obtain" | "MUST NOT", "SHALL NOT", "is limited to", "cannot exceed", "must not exceed" |
| **Test** | "What do we have to do?" | "What are we forbidden from?" |
| **Element TYPE** | `REQUIREMENT` | `CONSTRAINT` |
| **Folder** | `canon/elements/01_motivation/requirements/` | `canon/elements/01_motivation/constraints/` |

Both types are first-class motivation elements (per ArchiMate 3.2). Both may carry the same regulatory attributes (`deadline`, `obligation_level`, `requirement_type`, `derived_from`) — the form distinction is orthogonal to the regulatory dimension. A REQUIREMENT and a CONSTRAINT derived from the same source law sit side by side in the model, distinguished only by their form.

**Boundary examples:**

| Wording | Type | Why |
|---|---|---|
| "Manufacturer must obtain premarket approval for Class III devices" | REQUIREMENT | positive action — *obtain* approval |
| "Class III devices cannot be marketed without prior approval" | CONSTRAINT | restriction — *cannot* be marketed |
| "Manufacturer must register its establishment annually with the regulator" | REQUIREMENT | positive action — *register* |
| "An unregistered establishment cannot manufacture or distribute" | CONSTRAINT | restriction — *cannot* manufacture |

The same regulation often produces a REQUIREMENT and a corresponding CONSTRAINT (the two sides of the same rule). Both are valid; both may be modelled.

---

## 2. Frontmatter — canonical schema

```yaml
notation: requirement
id: REQUIREMENT-DATA-ERASURE-1
name: "Personal-data erasure on user request within 30 days"
description: "On request from a data subject, the controller must erase personal data within 30 days. The window starts at the time the request is received and verified."

# Optional regulatory attributes
severity: high                  # high | medium | low — organisation-defined priority
derived_from:                   # typed IDs of source documents this requirement is drawn from
  - LAW-PERSONAL-DATA-2017-1
  - REGULATION-GDPR-2016-1

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-05-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2017-05-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `requirement`. Machine-readable type tag (redundant with the ID prefix but useful for tooling that reads files without parsing IDs). |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `REQUIREMENT-[<middle>-]<INTEGER>`. |
| `name` | yes | string | One-line statement of the requirement. (Was `title` before the 2026-05-29 single-label-field decision; see [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3.) |
| `description` | yes | string | Longer-form explanation of the obligation, its scope, and the conditions under which it applies. |
| `severity` | no | string | One of `high`, `medium`, `low`. Organisation-defined priority for planning and reporting. Distinct from `obligation_level` (regulatory force, RFC 2119 — out of scope for v1; see [§5](#5-evolution)). |
| `derived_from` | no | list | Typed IDs of the codex artefacts this requirement is drawn from. Permitted TYPEs: `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`. Empty or absent for internal-only requirements with no codex source. |
| `zone` | yes | string | Always `canon` for REQUIREMENT — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`); see [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | Date the requirement took effect — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the requirement ceased to be in effect, or `null` if still in effect — see [CONTRACT.md](../CONTRACT.md) §7. |

Field naming follows the conventions in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) and [CONTRACT.md](../CONTRACT.md); no requirement-specific naming conventions are introduced.

---

## 3. File location and naming

```
canon/elements/01_motivation/requirements/<ID>.yaml
```

One artefact per file, named by its canonical ID. Examples:

- `canon/elements/01_motivation/requirements/REQUIREMENT-DATA-ERASURE-1.yaml`
- `canon/elements/01_motivation/requirements/REQUIREMENT-AUDIT-LOG-RETENTION-1.yaml`

The folder sits alongside `canon/elements/01_motivation/constraints/` — the two motivation-layer obligation catalogues are peers, not nested.

---

## 4. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `REQ-001` | error | `id` is missing or does not match the canonical grammar `REQUIREMENT-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1); or any required field from §2 (`notation`, `name`, `description`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) is missing. |
| `REQ-002` | error | A value in `derived_from` is a well-formed typed ID but does not resolve to any admitted codex artefact in the organisation's `codex/` zone. |
| `REQ-003` | error | A value in `derived_from` resolves to an artefact whose TYPE is not one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`. Requirements derive only from codex source documents. |
| `REQ-COVERAGE-001` | warning | A REQUIREMENT has no ASSERTION targeting it — no file under `canon/assertions/` carries `about: <this REQ id>`. Surfaces a compliance gap: the obligation exists in the model but the organisation makes no recorded claim about whether any subject satisfies it. The rule is `warning` rather than `error` because a newly admitted REQUIREMENT legitimately has no assertion yet. Cross-cutting — fires on the REQUIREMENT but is computed by scanning the assertions catalogue. |

The shared lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) and header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) rules apply to REQUIREMENT files in addition to the REQ-* rules above. The aggregated compliance-domain rules table (covering both REQUIREMENT and ASSERTION) lives in [CONTRACT.md](../CONTRACT.md) §8.

---

## 5. Evolution

Pending design work (separate strategy-hub tasks) extends the REQUIREMENT schema with regulatory attributes that apply symmetrically to REQUIREMENT and CONSTRAINT:

- `deadline` (ISO 8601 date) and an extended `status` vocabulary (`active` / `upcoming` / `past_due` / `compliant` / `deprecated` / `retired`).
- `obligation_level` (`SHALL` / `SHOULD` / `MAY` — RFC 2119 language for positive obligations; the corresponding `SHALL_NOT` / `SHOULD_NOT` apply on CONSTRAINT).
- `requirement_type` (`DEFINITIONAL` / `PRODUCT` / `PROCESS` / `DOCUMENTATION` / `ORGANIZATIONAL` / `REPORTING`).
- A structured `derived_from` block (`document_id` + `section` + `section_url` + extraction provenance).

A separate notation (`ASSERTION`, planned) will link a REQUIREMENT to the elements that realise it (products / processes / capabilities) with status and evidence. Until that lands, a REQUIREMENT records the obligation; the model carries no machine-readable claim about whether it is satisfied.

A worked example yaml under `organizations/acme_corp/canon/elements/01_motivation/requirements/` plus a per-folder README is planned alongside the broader compliance worked-examples wave; not part of this initial registration.

---

## 6. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- Codex source documents that requirements derive from: [14-codex.md](14-codex.md).
