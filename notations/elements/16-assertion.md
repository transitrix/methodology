---
title: "Assertion — REQUIREMENT realisation claim"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-08-25"
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

`realised_via[]` names the **elements that technically deliver the requirement** — capabilities, processes, internal standards, applications. These are factual references, not claims; the claim itself is the `status` field. Status and evidence are mutable over the assertion's lifecycle; the realisation set may also change (a process is replaced, a capability matures). Where an obligation lands not on the whole subject but on a **specific task**, the bearing flow step is named here — the task-level idiom in §2.1.

Assertions are about **REQUIREMENTs only.** CONSTRAINT compliance — the parallel question "is the organisation respecting the restriction?" — is **out of scope for v1.** A CONSTRAINT is either honoured or violated, and that is currently modelled inline on the CONSTRAINT artefact or via downstream tooling, not via an ASSERTION. (See §5.)

---

## 2. Frontmatter — canonical schema

```yaml
notation: assertion
id: ASSERTION-PRODUCT-MOBILE-DATA-ERASURE-1
about: REQUIREMENT-DATA-ERASURE-1        # required; must resolve to a REQUIREMENT
subject: PRODUCT-MOBILE-1                 # required; exactly one typed ID; TYPE ∈ {PRODUCT, PROCESS, CAPABILITY}
subject_release: RELEASE-MOBILE-4         # optional; a RELEASE of `subject` — narrows the claim to one release (§2.4)
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
| `subject_release` | no | string | A `RELEASE-…` typed ID ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29) narrowing the claim to **one release of `subject`** rather than the subject as a whole. The named release's `of` MUST equal `subject` (`ASSERT-010`). Absent ⇒ the claim is about the subject as such, exactly as before this field existed. See §2.4. |
| `realised_via` | no | list | Typed IDs of elements that technically realise the requirement for the subject. Any number; the validator resolves each (`ASSERT-004`). No TYPE restriction. MAY name a process-flow `STEP-…` to localise the claim to a specific task (§2.1); a process-blueprint `STAGE-…` id is document-local and MUST NOT appear here (`ASSERT-004`); referencing a step is a cross-document reference that promotes it (`ASSERT-009`; [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20). |
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

## 2.1 Task-level compliance impact

A REQUIREMENT often lands not on a whole subject but on a **specific task within a process** — "this obligation impacts *this step*". The canonical way to express that keeps the compliance **subject at the established grain** (`PRODUCT` / `PROCESS` / `CAPABILITY`, `ASSERT-003`) and names the **bearing flow step(s)** in `realised_via`:

```yaml
about: REQUIREMENT-RIGHT-TO-ERASURE-1
subject: PROCESS-USER-DATA-PURGE-1        # the compliance unit — the process bears the obligation
realised_via:
  - STEP-USER-DATA-PURGE-4                 # the specific flow step that realises (and is impacted by) it
status: compliant
```

Read it as: the **PROCESS bears** the obligation (it is the unit of compliance), and the named **STEP is where in the process the obligation is realised** — and therefore the step that a change to the obligation impacts. The same idiom extends to any **resolvable** bearing element (an `ACTION`, an `APPLICATION`); `realised_via` carries no TYPE restriction, but every id must still resolve under `ASSERT-004`.

A process-blueprint stage is **not** such an element. Stages are document-local labels ([13-process-blueprint.md](../views/diagrams/13-process-blueprint.md), Element-lifecycle): they are not a registered TYPE, they are not promoted, and a `STAGE-…` id in `realised_via` fails `ASSERT-004`. How a coarser value-chain phase becomes addressable is a separate decision; it is not this idiom.

**This is the decided idiom.** The alternative — making a process step (or `ACTIVITY`) an `ASSERTION.subject` directly — was **considered and rejected**: it would fragment the unit of compliance into many sub-process subjects, grow the `ASSERT-003` subject enum, and break tooling that assumes the `{PRODUCT, PROCESS, CAPABILITY}` subject grain. The process-with-bearing-steps idiom localises impact **without** moving the compliance unit, and is fully backward-compatible — existing assertions are unaffected and `ASSERT-003` is unchanged.

**Referencing a step promotes it.** A flow step is canonical-by-containment in its `PROCESS` until a second document references it; an assertion's `realised_via` is exactly such a reference. The step MUST therefore be **promoted** to a standalone `STEP` element ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1; element-file shape and mechanical promotion in [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20) so the id resolves under `ASSERT-004`. A step referenced but not yet promoted is flagged by `ASSERT-009` (§5). This dependency is why task-level assertions require step addressability.

---

## 2.2 Proposed (pre-admission) assertions

An automated harvest MAY emit an ASSERTION in the `proposed` admission state ([CONTRACT.md](../CONTRACT.md) §6.1) — e.g. a collector recording that a freshly-extracted obligation impacts a process or step. A proposed assertion carries `admission_state: proposed`, is excluded from admitted canon and every derived view, and does **not** count as coverage for `REQ-COVERAGE-001` until a human admits it (`proposed → active`). The collector never writes admitted canon; a human gate admits or rejects each draft. A proposed assertion MAY reference a proposed REQUIREMENT in the same harvest batch, but an admitted (`active`) assertion MUST NOT depend on an un-admitted one (`ADMIT-005`).

---

## 2.3 System, data, and infrastructure obligations

Regulatory frameworks increasingly impose obligations whose **subject is the system, its data, or its infrastructure** — data-retention rules on generated reports, data-residency constraints on application hosting, breach-notification duties on a data-management process. All three obligation classes are expressible with existing primitives; **`ASSERT-003` is unchanged** and no new subject TYPE is added.

The governing principle is the same as §2.1 (task-level impact): the **compliance unit** stays at the `{PRODUCT, PROCESS, CAPABILITY}` grain; the system or infrastructure element that technically realises or violates the obligation goes in `realised_via`, which carries **no TYPE restriction**.

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

## 2.4 Release-scoped compliance claims — `subject_release`

A compliance claim can be true of one shipped state of a subject and false of the next: the release that adds an audit trail satisfies the obligation, its predecessor did not. Binding every claim to the subject as a whole forces the model to overwrite the old judgement with the new one and lose the distinction. The optional **`subject_release`** field lets an assertion say *which release* it is about:

```yaml
about: REQUIREMENT-INGEST-AUDIT-TRAIL-1
subject: PRODUCT-TELEMETRY-PLATFORM-1      # the compliance unit — unchanged grain
subject_release: RELEASE-TELEMETRY-PLATFORM-2   # the release the claim is about
status: compliant
```

**The subject grain is unchanged.** `subject` keeps its `{PRODUCT, PROCESS, CAPABILITY}` enum and `ASSERT-003` is untouched — `subject_release` is a *qualifier on* the subject, never a replacement for it. The compliance unit is still the subject; the release says which state of that subject the judgement covers.

**Absent means what it always meant.** An assertion with no `subject_release` is a claim about the subject as such, exactly as every assertion authored before this field existed. **No coverage warning fires on a claim that names no release** — there is no rule anywhere that a claim *ought* to be release-scoped, and adding one would retroactively make every existing assertion incomplete. Whether the distinction is worth drawing is the author's judgement, matching the "catalogued only when referenced" restraint on `RELEASE` itself ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29).

**Only a `PRODUCT` subject can carry one.** `RELEASE.of` resolves to a `PRODUCT` or an `APPLICATION` (`RELEASE-002`), and `ASSERT-010` requires the named release's `of` to equal `subject`. The two enums intersect at `PRODUCT` alone, so an assertion whose `subject` is a `PROCESS` or a `CAPABILITY` can never carry a valid `subject_release`. This is a consequence of the two existing rules, not a third restriction — a process or a capability is not a thing that ships in versions, and the obligation on one is not release-scoped. Where an obligation on a process genuinely varies with the version of a system the process runs on, the release-bearing element is that system: name it in `realised_via` and put the release-scoped claim on the product, the same division of labour as §2.1 and §2.3.

**And `APPLICATION` is not added to `subject` to close the remaining asymmetry — decided, not overlooked.** The asymmetry is real and worth naming: `RELEASE.of` admits an `APPLICATION`, so an application may have its own release chain and be the `to` of a `required_for`, yet no assertion can be release-scoped to one, because `APPLICATION` is not in the `ASSERT-003` subject enum. The fix is *not* to widen the enum. §2.1 already considered and rejected widening it (for process steps), §2.3 settles the general case for exactly this element — "place the APPLICATION, INTEGRATION, or other technical element that delivers or constrains it in `realised_via`" — and calls the three-subject grain the permanent compliance anchor. An application is a thing that ships; it is not a thing that *owes* a regulatory duty. The duty belongs to the product or process it serves. So the release-scoped claim goes on that `PRODUCT` with the application in `realised_via`, and where an application genuinely bears obligations in its own right and ships independently, it is a `PRODUCT` in the compliance model as well as an `APPLICATION` in the architecture — two records, because they answer to two different questions. Widening `subject` would instead fragment the compliance unit and break tooling that assumes the grain, which is what §2.1 rejected it for. (Decision recorded per `transitrix-hq#198`; the descriptive half of that issue — recording *which release carried an application-level fact* — is [17-relations.md](17-relations.md) §3.3's `introduced_in`, which is not a compliance claim and therefore not bound by this grain.)

**Derived query — "is release R compliant".** The compliance state of a release is read by collecting the admitted assertions carrying `subject_release: R`, exactly as the subject-wide read collects those carrying `subject: <the subject>`. Nothing is stored on the `RELEASE` element, which enumerates none of its own contents by design ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29). A release-scoped and a subject-wide assertion about the same `(subject, requirement)` pair are **different claims about different things** and do not collide under the one-assertion-per-pair rule (§1); the pair for a release-scoped claim is `(subject_release, requirement)`.

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

`canonical_ref` is preferred when the evidence already lives in the model (a process file, a rule file, a promoted `STEP`). `external_doc` is the fallback when the evidence is a PDF / web report / vendor attestation. `note` is the lightweight form for human-readable observations that do not justify a separate artefact.

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
| `ASSERT-009` | warning | A `realised_via` entry references a process-flow step (`STEP-…`) that is **not promoted** to a standalone `STEP` element (it remains inline in its `PROCESS`). The assertion is a cross-document reference and triggers promotion ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20); promote the step so the reference resolves as a first-class element. Distinct from `ASSERT-004`, which fires only when the id resolves to nothing at all. Cross-cutting — requires the full canon catalogue (the `PROCESS` flows and the `STEP` files) to evaluate. |
| `ASSERT-010` | error | `subject_release` is present but does not resolve to an admitted `RELEASE`, or resolves to a `RELEASE` whose `of` differs from this assertion's `subject` — the claim names a release of something other than the thing it is a claim about (§2.4). Single-reference resolution, like `ASSERT-002`/`ASSERT-003`; not cross-cutting. Never fires on an assertion that omits the field. |
| `ASSERT-DEAD-LINK-001` | warning | The assertion's `subject` or any entry in `realised_via` resolves to a primitive whose `valid_to` is set and is earlier than today — the assertion is bound to a currently-retired element. The rule is `warning` rather than `error` because an assertion MAY be intentionally preserved as a historical record after one of its bound elements retires (the claim itself remains true for the period it covered). Distinct from `LIFECYCLE-004` ([CONTRACT.md](../CONTRACT.md) §7.3), which checks the referenced primitive's `valid_to` against the *referrer's* `valid_from` rather than against today. |
| `PROCESS-COVERAGE-001` | warning | A `PROCESS` element has no admitted `ASSERTION` with it as `subject` — the process's regulatory obligations are entirely unmodelled. An admitted assertion with `status: n_a` counts as coverage (the model has considered the regime against the process and recorded an explicit exclusion); only the total absence of any assertion triggers this warning. Cross-cutting — requires the full assertions catalogue to evaluate. Indexed in [CONTRACT.md](../CONTRACT.md) §8; relates to the coverage read in [22-coverage-metric.md](../views/reports/22-coverage-metric.md). |

**`ASSERT-003` is deliberately unchanged.** Task-level impact (§2.1) is expressed through `realised_via`, not by widening the `subject` enum — the subject grain stays `{PRODUCT, PROCESS, CAPABILITY}`, and every assertion authored before this addition remains valid. The only addition is `ASSERT-009`, a warning that never fires on assertions without step references. Release scoping (§2.4) leaves it unchanged for the same reason: `subject_release` qualifies the subject rather than widening what may be one.

**`ASSERT-010` reads two conditions, not one.** The rule as scoped named only the mismatched-`of` case; an unresolvable `subject_release` is folded into the same code rather than left unchecked, because a mistyped release id would otherwise pass validation silently and every other cross-reference field in core carries a resolution check (`ASSERT-002`, `RELEASE-002`, `BSV-003`, `TSVC-003`, `REQ-SERVES-001`). One code covers both because the mismatch check cannot run at all until the reference resolves.

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

**Landed (v0.2, 2026-08-07):** the optional `subject_release` qualifier (§2.4) and `ASSERT-010`. Purely additive — `subject` and `ASSERT-003` are unchanged, no field became required, and a repository that never writes the qualifier validates exactly as it did before. A worked fixture pair lives at [`../examples/release-qualifiers/`](../examples/release-qualifiers/).

**Clarified (2026-08-25):** §2.1 no longer lists a process-blueprint stage as a `realised_via` target. Stages are document-local; a `STAGE-…` id does not resolve under `ASSERT-004`. The decided process-local idiom is `STEP`. How a coarser value-chain phase becomes addressable is out of scope for this clarification.

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
- The RELEASE element type `subject_release` names: [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29.
- The verification-side counterpart qualifier (`verified_on`): [27-verification.md](27-verification.md) §2.1.
