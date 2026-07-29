---
title: "Assertion — REQUIREMENT realisation claim"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-07-29"
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

`realised_via[]` names the **elements that technically deliver the requirement** — capabilities, processes, internal standards, applications. These are factual references, not claims; the claim itself is the `status` field. Status and evidence are mutable over the assertion's lifecycle; the realisation set may also change (a process is replaced, a capability matures). Where an obligation lands not on the whole subject but on a **specific task or stage**, the bearing flow step is named here — the stage/task-level idiom in §2.1.

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
| `realised_via` | no | list | Typed IDs of elements that technically realise the requirement for the subject. Any number; the validator resolves each (`ASSERT-004`). No TYPE restriction. MAY name a process-flow `STEP-…` to localise the claim to a specific task / stage (§2.1); referencing a step is a cross-document reference that promotes it (`ASSERT-009`; [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20). |
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

## 2.1 Stage / task-level compliance impact

A REQUIREMENT often lands not on a whole subject but on a **specific task or stage within a process** — "this obligation impacts *this step*". The canonical way to express that keeps the compliance **subject at the established grain** (`PRODUCT` / `PROCESS` / `CAPABILITY`, `ASSERT-003`) and names the **bearing flow step(s)** in `realised_via`:

```yaml
about: REQUIREMENT-RIGHT-TO-ERASURE-1
subject: PROCESS-USER-DATA-PURGE-1        # the compliance unit — the process bears the obligation
realised_via:
  - STEP-USER-DATA-PURGE-4                 # the specific flow step that realises (and is impacted by) it
status: compliant
```

Read it as: the **PROCESS bears** the obligation (it is the unit of compliance), and the named **STEP is where in the process the obligation is realised** — and therefore the step that a change to the obligation impacts. The same idiom extends to any resolvable bearing element (a process-blueprint stage, an `ACTIVITY`); `realised_via` carries no TYPE restriction.

**This is the decided idiom.** The alternative — making a process step (or `ACTIVITY`) an `ASSERTION.subject` directly — was **considered and rejected**: it would fragment the unit of compliance into many sub-process subjects, grow the `ASSERT-003` subject enum, and break tooling that assumes the `{PRODUCT, PROCESS, CAPABILITY}` subject grain. The process-with-bearing-steps idiom localises impact **without** moving the compliance unit, and is fully backward-compatible — existing assertions are unaffected and `ASSERT-003` is unchanged.

**Referencing a step promotes it.** A flow step is canonical-by-containment in its `PROCESS` until a second document references it; an assertion's `realised_via` is exactly such a reference. The step MUST therefore be **promoted** to a standalone `STEP` element ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1; element-file shape and mechanical promotion in [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20) so the id resolves under `ASSERT-004`. A step referenced but not yet promoted is flagged by `ASSERT-009` (§5). This dependency is why stage/task-level assertions require step addressability.

---

## 2.2 Proposed (pre-admission) assertions

An automated harvest MAY emit an ASSERTION in the `proposed` admission state ([CONTRACT.md](../CONTRACT.md) §6.1) — e.g. a collector recording that a freshly-extracted obligation impacts a process or step. A proposed assertion carries `admission_state: proposed`, is excluded from admitted canon and every derived view, and does **not** count as coverage for `REQ-COVERAGE-001` until a human admits it (`proposed → active`). The collector never writes admitted canon; a human gate admits or rejects each draft. A proposed assertion MAY reference a proposed REQUIREMENT in the same harvest batch, but an admitted (`active`) assertion MUST NOT depend on an un-admitted one (`ADMIT-005`).

---

## 2.3 System, data, and infrastructure obligations

Regulatory frameworks increasingly impose obligations whose **subject is the system, its data, or its infrastructure** — data-retention rules on generated reports, data-residency constraints on application hosting, breach-notification duties on a data-management process. All three obligation classes are expressible with existing primitives; **`ASSERT-003` is unchanged** and no new subject TYPE is added.

The governing principle is the same as §2.1 (stage/task-level impact): the **compliance unit** stays at the `{PRODUCT, PROCESS, CAPABILITY}` grain; the system or infrastructure element that technically realises or violates the obligation goes in `realised_via`, which carries **no TYPE restriction**.

**Data-retention obligations** on operational artefacts (generated reports, archives, audit logs) land on the **process** that owns the retention behaviour — the archival, data-management, or reporting process. The application or service that physically retains the data goes in `realised_via`:

```yaml
about: REQUIREMENT-REPORT-RETENTION-1       # e.g. "retain audit reports for 5 years"
subject: PROCESS-REPORT-ARCHIVAL-1          # the process bears the retention obligation
realised_via:
  - APPLICATION-ARCHIVE-SERVICE-1           # the storage service that physically retains the data
status: compliant
```

**Data-residency / processing-location obligations** — "data must not leave region X" or "processing must occur in region Y" — land on the **product** that must be hosted in-region, or on the **process** that performs the constrained data transfer. The application service that places the product or process in the required region goes in `realised_via`:

```yaml
about: REQUIREMENT-DATA-RESIDENCY-EU-1      # e.g. "personal data must be processed in the EU"
subject: PRODUCT-ANALYTICS-PLATFORM-1       # the product whose deployment region is constrained
realised_via:
  - APPLICATION-EU-CLOUD-HOSTING-1          # the hosting application that realises in-region placement
status: compliant
```

Alternatively, where the obligation binds the data-transfer activity rather than a deployable product:

```yaml
about: REQUIREMENT-DATA-RESIDENCY-EU-1
subject: PROCESS-DATA-PROCESSING-1         # the data-processing process is the compliance unit
realised_via:
  - APPLICATION-EU-CLOUD-HOSTING-1
status: compliant
```

**Report composition / segregation restrictions** — "report type A must not co-mingle content category B" — are **restrictions**, not positive obligations. They belong to the `CONSTRAINT` type ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.13), which is already the canonical form for "the organisation must not do X". A CONSTRAINT-side assertion mechanism is explicitly out of scope for v1 (§7); model report-composition rules as `CONSTRAINT` artefacts and express violation via the `CONSTRAINT.status` or downstream tooling, not via an ASSERTION.

**Summary.** For each new obligation class: choose the PRODUCT, PROCESS, or CAPABILITY that *owns* the compliance obligation as `subject`; place the APPLICATION, INTEGRATION, or other technical element that delivers or constrains it in `realised_via`. The three-subject grain (ASSERT-003) is the permanent compliance anchor; `realised_via` is the open-typed realisation list.

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

## 4. Evidence — four kinds

Each entry in `evidence[]` carries a `kind` plus kind-specific fields. Mix freely within one assertion.

```yaml
- kind: canonical_ref     # an internal artefact in this organisation's canon
  ref: <TYPED-ID>          # required; the validator resolves it (ASSERT-005)

- kind: external_doc      # a document outside the model (audit report, certification, vendor attestation)
  title: "..."             # required
  url: "..."               # required

- kind: note              # free-text observation
  text: "..."              # required

- kind: verification_ref  # a citation of a design-controls VERIFICATION — opaque, unresolved
  ref: "VERIFICATION-DEVICE-ALARM-TEST-1"   # required; plain string, not a typed-ID cross-reference
```

`canonical_ref` is preferred when the evidence already lives in the model (a process file, a rule file, a process-blueprint stage). `external_doc` is the fallback when the evidence is a PDF / web report / vendor attestation. `note` is the lightweight form for human-readable observations that do not justify a separate artefact.

**`verification_ref` — the compliance ↔ V&V bridge, kept as an opaque citation.** Before 2026-07-29, an assertion cited a `VERIFICATION` via `kind: canonical_ref` like any other canon element, and `ASSERT-005` resolved it. `VERIFICATION` has since moved to the `design-controls` domain package ([`../packages/design-controls.md`](../packages/design-controls.md)) — a core → package reference is no longer permitted ([`../PACKAGES.md`](../PACKAGES.md) §4.1), so this dedicated kind replaces that use of `canonical_ref` for good, per the ADR's compliance-↔-V&V-bridge amendment (`methodology/2026-07-29-design-controls-as-a-package` §2.1):

- `ref` is a **plain string**, not a typed-ID cross-reference field. **No core validator resolves it** — `ASSERT-005` applies only to `kind: canonical_ref` entries and explicitly does not extend to `verification_ref` (§5). Core treats the value exactly as it treats a `note`'s `text` — inert content.
- When a repository declares `packages: [design-controls]`, that package's own validator MAY resolve `ref` against its `VERIFICATION` catalogue and check the cited verification's outcome ([`../packages/design-controls.md`](../packages/design-controls.md) §3.1).
- When the package is absent, the citation carries **no integrity guarantee whatsoever** — nothing confirms the cited id exists, ever existed, or is well-formed. A reader must not mistake a `verification_ref` entry for a checked link unless the package is declared.
- This is a **deliberately asymmetric** guarantee — checked when the package is present, inert when it is not — the price of keeping the compliance-↔-V&V bridge without a core → package reference (ADR §2.1, §2.5).

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `ASSERT-001` | error | A required field from §2 is missing, or `id` does not match the canonical grammar `ASSERTION-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1). |
| `ASSERT-002` | error | `about` is missing, malformed, or resolves to an artefact whose TYPE is not `REQUIREMENT`. |
| `ASSERT-003` | error | `subject` is missing, does not resolve, or resolves to an artefact whose TYPE is not in `{PRODUCT, PROCESS, CAPABILITY}`. |
| `ASSERT-004` | error | A value in `realised_via` does not resolve to any admitted canonical element. |
| `ASSERT-005` | error | An `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve. **Does not apply to `kind: verification_ref`** (§4) — that kind's `ref` is an opaque string no core rule resolves, checked only by the `design-controls` package's own validator when declared. |
| `ASSERT-006` | error | `status` is not one of `compliant`, `partial`, `non_compliant`, `under_review`, `n_a`. |
| `ASSERT-007` | warning | `evidence` is empty AND `status` is `compliant` or `partial`. A positive status without evidence is undefended. |
| `ASSERT-008` | warning | `next_review_at` is set and is in the past relative to today. The assertion is stale and due for re-review. |
| `ASSERT-009` | warning | A `realised_via` entry references a process-flow step (`STEP-…`) that is **not promoted** to a standalone `STEP` element (it remains inline in its `PROCESS`). The assertion is a cross-document reference and triggers promotion ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20); promote the step so the reference resolves as a first-class element. Distinct from `ASSERT-004`, which fires only when the id resolves to nothing at all. Cross-cutting — requires the full canon catalogue (the `PROCESS` flows and the `STEP` files) to evaluate. |
| `ASSERT-DEAD-LINK-001` | warning | The assertion's `subject` or any entry in `realised_via` resolves to a primitive whose `valid_to` is set and is earlier than today — the assertion is bound to a currently-retired element. The rule is `warning` rather than `error` because an assertion MAY be intentionally preserved as a historical record after one of its bound elements retires (the claim itself remains true for the period it covered). Distinct from `LIFECYCLE-004` ([CONTRACT.md](../CONTRACT.md) §7.3), which checks the referenced primitive's `valid_to` against the *referrer's* `valid_from` rather than against today. |
| `PROCESS-COVERAGE-001` | warning | A `PROCESS` element has no admitted `ASSERTION` with it as `subject` — the process's regulatory obligations are entirely unmodelled. An admitted assertion with `status: n_a` counts as coverage (the model has considered the regime against the process and recorded an explicit exclusion); only the total absence of any assertion triggers this warning. Cross-cutting — requires the full assertions catalogue to evaluate. Indexed in [CONTRACT.md](../CONTRACT.md) §8; relates to the coverage read in [22-coverage-metric.md](../views/22-coverage-metric.md). |

**`ASSERT-003` is deliberately unchanged.** Stage/task-level impact (§2.1) is expressed through `realised_via`, not by widening the `subject` enum — the subject grain stays `{PRODUCT, PROCESS, CAPABILITY}`, and every assertion authored before this addition (e.g. under epic #83) remains valid. The only addition is `ASSERT-009`, a warning that never fires on assertions without step references.

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

**Landed (v0.2, 2026-07-29):** `evidence[]` gained a fourth kind, `verification_ref` (§4) — an opaque citation of a `VERIFICATION` record, replacing the prior `kind: canonical_ref` use for that purpose now that `VERIFICATION` has moved to the `design-controls` domain package and a core → package reference is no longer permitted. `ASSERT-005` (§5) does not apply to it. Per ADR `methodology/2026-07-29-design-controls-as-a-package` §2.1 and epic `vkgeorgia/strategy#852`.

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
