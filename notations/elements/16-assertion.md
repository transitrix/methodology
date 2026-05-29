---
title: "Assertion — REQUIREMENT realisation claim"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-28"
status: "draft"
---

# Assertion — Reference

**Scope:** The `ASSERTION` type — the canonical compliance claim that a **subject** (`PRODUCT` / `PROCESS` / `CAPABILITY`) satisfies a **`REQUIREMENT`**, with an explicit status and supporting evidence. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.6.

Assertions are canon-zone artefacts that live **outside** the `elements/` tree, under `canon/assertions/`. Each assertion is a single YAML file named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the assertion-specific frontmatter below.

---

## 1. What an Assertion is

A REQUIREMENT records *what the organisation is obliged to do*. An Assertion records *whether a specific subject satisfies that obligation, and how the organisation knows*. The pair `(subject, requirement)` is the unit of compliance: one assertion per pair. Multiple subjects against the same requirement → multiple assertions; the same subject against multiple requirements → multiple assertions.

```
   REQUIREMENT-DATA-ERASURE-1                  ─── about ──┐
   PRODUCT-MOBILE-1            ─── subject ────────────────┤
                                                            ▼
                          ASSERTION-PRODUCT-MOBILE-DATA-ERASURE-1
                            status: compliant
                            realised_via:
                              - CAPABILITY-V1.2
                              - PROCESS-USER-DATA-PURGE-1
                            evidence: […]
                            assessed_at, next_review_at
                            valid_from / valid_to
```

`realised_via[]` names the **elements that technically deliver the requirement** — capabilities, processes, internal standards, applications. These are factual references, not claims; the claim itself is the `status` field. Status and evidence are mutable over the assertion's lifecycle; the realisation set may also change (a process is replaced, a capability matures).

Assertions are about **REQUIREMENTs only.** CONSTRAINT compliance — the parallel question "is the organisation respecting the restriction?" — is **out of scope for v1.** A CONSTRAINT is either honoured or violated, and that is currently modelled inline on the CONSTRAINT artefact or via downstream tooling, not via an ASSERTION. (See §5.)

---

## 2. Frontmatter — canonical schema

```yaml
notation: assertion
id: ASSERTION-PRODUCT-MOBILE-DATA-ERASURE-1
about: REQUIREMENT-DATA-ERASURE-1        # required; must resolve to a REQUIREMENT
subject: PRODUCT-MOBILE-1                 # required; exactly one typed ID; TYPE ∈ {PRODUCT, PROCESS, CAPABILITY}
realised_via:                             # optional; any number of typed IDs of elements that realise the requirement
  - CAPABILITY-V1.2
  - PROCESS-USER-DATA-PURGE-1
  - INTERNAL_STANDARD-DATA-RETENTION-1
status: compliant                         # required; compliant | partial | non_compliant | under_review | n_a
evidence:                                 # optional; hybrid array of evidence entries
  - kind: canonical_ref
    ref: PROCESS-USER-DATA-PURGE-1
  - kind: external_doc
    title: "Q1 2026 data-erasure SLA report"
    url: "https://internal.example/reports/Q1-2026-erasure-sla.pdf"
  - kind: note
    text: "Quarterly DPO review on 2026-03-15 confirmed 100% erasure compliance over the period."

assessed_at: "2026-05-15"                 # optional but recommended; date the current status was determined
assessed_by: ROLE-DPO-1                   # optional; ROLE typed ID, or free-text handle in quotes
next_review_at: "2026-11-15"              # optional; drives the ASSERT-008 staleness warning

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-05-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-05-28"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `assertion`. Machine-readable type tag (redundant with the ID prefix, useful for tooling that reads files without parsing IDs). |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `ASSERTION-[<middle>-]<INTEGER>`. |
| `about` | yes | string | Typed ID of the REQUIREMENT this assertion is about. The validator resolves it (`ASSERT-002`). |
| `subject` | yes | string | Exactly one typed ID of the element that owns the claim. TYPE MUST be one of `PRODUCT`, `PROCESS`, `CAPABILITY` (`ASSERT-003`). |
| `realised_via` | no | list | Typed IDs of elements that technically realise the requirement for the subject. Any number; the validator resolves each (`ASSERT-004`). No TYPE restriction. |
| `status` | yes | string | One of: `compliant`, `partial`, `non_compliant`, `under_review`, `n_a`. See §3 below. |
| `evidence` | no | list | Hybrid array of evidence entries; each carries a `kind` and kind-specific fields. See §4. |
| `assessed_at` | no | string | Date the current status was determined — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `assessed_by` | no | string | A `ROLE-…` typed ID, or a free-text handle in quotes. |
| `next_review_at` | no | string | Date by which the assertion should be re-reviewed — quoted ISO 8601. Drives the `ASSERT-008` staleness warning. |
| `zone` | yes | string | Always `canon` for ASSERTION — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`). |
| `valid_from` | yes | string | Date the assertion took effect — see [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the assertion ceased to be in effect, or `null` if still in effect. |

---

## 3. Status vocabulary

| Value | Meaning |
|---|---|
| `compliant` | The subject satisfies the requirement at the assessment date. |
| `partial` | The subject partially satisfies the requirement (named gaps documented in `evidence` or in a follow-up). |
| `non_compliant` | The subject does not satisfy the requirement. |
| `under_review` | A review is in flight; the prior status no longer holds and the new status has not been determined. |
| `n_a` | The requirement does not apply to this subject (jurisdictional / categorical exclusion). |

Status is the **current** judgement. Status history over an assertion's lifecycle is the concern of the planned versioned-attribute sidecar (Wave 2 of the temporal model); v1 records only the current value.

---

## 4. Evidence — three kinds

Each entry in `evidence[]` carries a `kind` plus kind-specific fields. Mix freely within one assertion.

```yaml
- kind: canonical_ref     # an internal artefact in this organisation's canon
  ref: <TYPED-ID>          # required; the validator resolves it (ASSERT-005)

- kind: external_doc      # a document outside the model (audit report, certification, vendor attestation)
  title: "..."             # required
  url: "..."               # required

- kind: note              # free-text observation
  text: "..."              # required
```

`canonical_ref` is preferred when the evidence already lives in the model (a process file, a rule file, a process-blueprint stage). `external_doc` is the fallback when the evidence is a PDF / web report / vendor attestation. `note` is the lightweight form for human-readable observations that do not justify a separate artefact.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ASSERT-001` | error | A required field from §2 is missing, or `id` does not match the canonical grammar `ASSERTION-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1). |
| `ASSERT-002` | error | `about` is missing, malformed, or resolves to an artefact whose TYPE is not `REQUIREMENT`. |
| `ASSERT-003` | error | `subject` is missing, does not resolve, or resolves to an artefact whose TYPE is not in `{PRODUCT, PROCESS, CAPABILITY}`. |
| `ASSERT-004` | error | A value in `realised_via` does not resolve to any admitted canonical element. |
| `ASSERT-005` | error | An `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve. |
| `ASSERT-006` | error | `status` is not one of `compliant`, `partial`, `non_compliant`, `under_review`, `n_a`. |
| `ASSERT-007` | warning | `evidence` is empty AND `status` is `compliant` or `partial`. A positive status without evidence is undefended. |
| `ASSERT-008` | warning | `next_review_at` is set and is in the past relative to today. The assertion is stale and due for re-review. |
| `ASSERT-DEAD-LINK-001` | warning | The assertion's `subject` or any entry in `realised_via` resolves to a primitive whose `valid_to` is set and is earlier than today — the assertion is bound to a currently-retired element. The rule is `warning` rather than `error` because an assertion MAY be intentionally preserved as a historical record after one of its bound elements retires (the claim itself remains true for the period it covered). Distinct from `LIFECYCLE-004` ([CONTRACT.md](../CONTRACT.md) §7.3), which checks the referenced primitive's `valid_to` against the *referrer's* `valid_from` rather than against today. |

The shared lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) and header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) rules apply to ASSERTION files in addition to the ASSERT-* rules above. The aggregated compliance-domain rules table (covering both REQUIREMENT and ASSERTION) lives in [CONTRACT.md](../CONTRACT.md) §8.

---

## 6. File location and naming

```
canon/assertions/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder sits at the canon-zone root (not under `canon/elements/`). Examples:

- `canon/assertions/ASSERTION-PRODUCT-MOBILE-DATA-ERASURE-1.yaml`
- `canon/assertions/ASSERTION-PROCESS-CUST-ONBOARD-KYC-1.yaml`

A typical naming convention encodes the subject + requirement in the middle segments (`ASSERTION-<SUBJECT-HINT>-<REQUIREMENT-HINT>-<N>`), but the canonical grammar imposes only `ASSERTION-[<middle>-]<INTEGER>`; teams may pick a different middle-segment convention.

---

## 7. Evolution

Out of scope for this initial schema:

- **CONSTRAINT-side assertions.** A CONSTRAINT is honoured or violated; that is currently modelled inline on the CONSTRAINT artefact or via downstream tooling. A parallel ASSERTION-against-CONSTRAINT mechanism MAY be added later if the use case proves out.
- **Status history.** v1 records the current status. The planned versioned-attribute sidecar (Wave 2 of the temporal model) will host the time series.
- **Coverage analysis.** "Which requirements have no assertion targeting them?" is the concern of `REQ-COVERAGE-001` (planned as a cross-cutting validator rule).
- **Dead-link detection.** "Is this assertion bound to a retired element?" is the concern of `ASSERT-DEAD-LINK-001` (planned as a cross-cutting validator rule).
- **Worked examples** under `organizations/acme_corp/canon/assertions/` plus a per-folder README — planned alongside the broader compliance worked-examples wave; not part of this initial registration.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.6 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- The REQUIREMENT element type assertions are about: [15-requirement.md](15-requirement.md).
- Codex source documents requirements derive from: [14-codex.md](14-codex.md).
