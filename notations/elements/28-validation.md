---
title: "Validation — NEED validation claim"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-30"
status: "draft"
---

# Validation — Reference

**Scope:** The `VALIDATION` type — a first-class claim that a **`NEED`** ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.28) was checked against the stakeholder/user it belongs to, with an explicit method, result, and pass/fail outcome. `VALIDATION` is the validation-domain counterpart to `VERIFICATION` ([27-verification.md](27-verification.md)) — same claim shape, anchored one layer further upstream. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.8.

Validations are canon-zone artefacts that live **outside** the `elements/` tree, under `canon/validations/` — the same structural choice as `ASSERTION` ([16-assertion.md](16-assertion.md)) and `VERIFICATION` ([27-verification.md](27-verification.md)). Each validation is a single YAML file named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the validation-specific frontmatter below.

---

## 1. What a Validation is, and why it is a separate TYPE from `VERIFICATION`

A `NEED` records *what a stakeholder requires*, independent of how it will be met. A `VALIDATION` records *that the delivered thing was checked against that need, with that stakeholder (or a proxy for them), and what was found* — closing the gap `27-verification.md` §1 names explicitly: `VERIFICATION.verifies` has only ever resolved to `REQUIREMENT`, so there was no anchor for validating that a delivered thing meets a stakeholder/user need.

```
   NEED-TIMELY-OUTAGE-STATUS-1              ─── validates ──┐
                                                              ▼
                              VALIDATION-OUTAGE-STATUS-UAT-1
                                method: user_acceptance
                                protocol: "..."
                                result: "..."
                                outcome: pass
                                evidence: […]
```

`validates` is the **forward** link (validation → need it targets). The **reverse** question — "which needs have no validation, or an unresolved one?" — is a cross-cutting completeness check, answered by `NEED-VALIDATION-COVERAGE-001` / `NEED-VALIDATION-COVERAGE-002` ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §9; see §5 below).

**Why a separate TYPE rather than widening `VERIFICATION.verifies` to accept a `NEED` as a second anchor kind** (the task's other permitted option): the two claims are asked by different people, at different points in the lifecycle, and answered against different acceptance criteria.

| | `VERIFICATION` | `VALIDATION` |
|---|---|---|
| Question asked | "Did we build the thing right?" — does the delivered artefact meet its stated design-input obligation | "Did we build the right thing?" — does the delivered artefact actually satisfy what the stakeholder needed |
| Anchor | `REQUIREMENT` — a design-input obligation the organisation committed to | `NEED` — a stakeholder/user requirement, independent of any design commitment |
| Typical method | engineering: `test` / `analysis` / `inspection` / `demonstration` (§3) | stakeholder-facing: `user_acceptance` / `field_trial` / `stakeholder_review` / `usability_study` (§3) |
| Who typically runs it | engineering / QA, against the requirement's acceptance criteria | the stakeholder, or a proxy for them (UX research, field team), against their own judgement |

Widening `verifies` to resolve to either `REQUIREMENT` or `NEED` would force one field and one `method` vocabulary to serve both questions, and would have immediately re-invalidated the wording correction landed the same day that clarified `verifies` "has only ever resolved to `REQUIREMENT`" (27-verification.md §7, v0.4). A `REQUIREMENT` may still cite the `NEED` it serves (`serves`, [15-requirement.md](15-requirement.md) §2.5) — so a reader can walk `VALIDATION` → `NEED` ← `REQUIREMENT` → `VERIFICATION` and see both claims meet at the same need without either claim type carrying the other's semantics. `ASSERTION` and `VERIFICATION` are already established as peer claim primitives over the same anchor (§1, [27-verification.md](27-verification.md) §4) rather than one type with a mode flag; `VALIDATION` follows that same precedent one layer up, rather than inventing a new pattern.

A `VALIDATION` is distinct from an `ASSERTION`: an `ASSERTION` claims a *subject* (`PRODUCT` / `PROCESS` / `CAPABILITY`) is *compliant* with a `REQUIREMENT`; a `VALIDATION` claims the delivered thing was *checked* against a `NEED` and records what was found. The two may coexist — an `ASSERTION.evidence[]` MAY cite a `VALIDATION` via `kind: canonical_ref` — but neither implies the other.

---

## 2. Frontmatter — canonical schema

```yaml
notation: validation
id: VALIDATION-OUTAGE-STATUS-UAT-1
validates: NEED-TIMELY-OUTAGE-STATUS-1    # required; must resolve to a NEED
method: user_acceptance                   # required; user_acceptance | field_trial | stakeholder_review | usability_study
protocol: "Simulate a service outage in the staging environment; observe whether ten enterprise-customer participants notice the status-page update within 5 minutes without being prompted."
result: "9/10 participants noticed the status update within 5 minutes; the tenth noticed at 6 minutes 40 seconds."   # optional
outcome: pass                             # required; pass | fail | inconclusive | not_yet_run
evidence:                                  # optional; same shape as ASSERTION.evidence (16-assertion.md §4)
  - kind: external_doc
    title: "Outage-status usability study, session recordings and notes"
    url: "https://internal.example/reports/outage-status-uat-1.pdf"

performed_at: "2026-07-22"                # optional but recommended; date the protocol was run
performed_by: ROLE-UX-RESEARCH-LEAD-1     # optional; ROLE typed ID, or free-text handle in quotes

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-07-23"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-07-23"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `validation`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `VALIDATION-[<middle>-]<INTEGER>`. |
| `validates` | yes | string | Typed ID of the `NEED` this validation targets. The validator resolves it (`VALID-002`). |
| `method` | yes | string | One of `user_acceptance`, `field_trial`, `stakeholder_review`, `usability_study` — the validation method vocabulary. See §3. |
| `protocol` | yes | string | The validation procedure — what was done, under what conditions, with whom, against what acceptance criteria. |
| `result` | no | string | Narrative of what was observed when the protocol ran. Distinct from `outcome` — `result` is the finding, `outcome` is the judgement. |
| `outcome` | yes | string | One of `pass`, `fail`, `inconclusive`, `not_yet_run`. See §3. |
| `evidence` | no | list | Hybrid array of evidence entries — same shape as `ASSERTION.evidence` ([16-assertion.md](16-assertion.md) §4): `canonical_ref` / `external_doc` / `note`. |
| `performed_at` | no | string | Date the protocol was run — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `performed_by` | no | string | A `ROLE-…` typed ID, or a free-text handle in quotes. |
| `zone` | yes | string | Always `canon` for VALIDATION — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`). |
| `valid_from` | yes | string | Date the validation record took effect — see [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the validation record ceased to be in effect, or `null` if still in effect. |

---

## 3. Vocabularies

**`method`** — the validation approach used:

| Value | Meaning |
|---|---|
| `user_acceptance` | The stakeholder (or a representative sample of the user population) directly exercises the delivered thing against their own acceptance criteria (the fixture in §6 uses this). |
| `field_trial` | Observed use under real or near-real operating conditions, outside a controlled test environment. |
| `stakeholder_review` | A structured review session where the accountable stakeholder examines the delivered thing (or a representation of it) and renders a judgement, without hands-on use. |
| `usability_study` | A moderated or unmoderated study observing representative users attempting realistic tasks, typically measuring success rate, time, and error. |

**`outcome`** — the pass/fail judgement:

| Value | Meaning |
|---|---|
| `pass` | The protocol ran and the need was judged satisfied. |
| `fail` | The protocol ran and the need was judged **not** satisfied. |
| `inconclusive` | The protocol ran but did not yield a clear pass/fail determination (e.g. insufficient participants, ambiguous acceptance criteria) — re-run or protocol revision is expected. |
| `not_yet_run` | The validation record exists (e.g. the protocol is planned/scheduled) but has not yet been executed. A `VALIDATION` MAY be admitted at this outcome to reserve the trace link before execution; `result` is typically absent at this outcome. |

Both vocabularies deliberately mirror `VERIFICATION`'s `outcome` enum (§3, [27-verification.md](27-verification.md) §3) so the two claim types compose in shared tooling (a coverage dashboard filtering on `outcome` behaves identically for both catalogues) while `method` stays domain-specific — engineering methods do not fit a stakeholder-facing check, and vice versa.

---

## 4. Relation to `VERIFICATION` and `ASSERTION`

`VALIDATION` is a peer canon-zone claim primitive to `VERIFICATION` and `ASSERTION` — all three live flat outside `elements/` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §2), all three are resolved by scanning their own catalogue rather than carrying a backward field on the element they target. They differ in **what they claim, and against which anchor**:

| | `ASSERTION` | `VERIFICATION` | `VALIDATION` |
|---|---|---|---|
| Claims | a *subject* (PRODUCT / PROCESS / CAPABILITY) is compliant with a REQUIREMENT | a *protocol* was run against a REQUIREMENT | a *protocol* was run against a NEED |
| Anchor | `REQUIREMENT` | `REQUIREMENT` | `NEED` |
| Domain | regulatory / organisational compliance | engineering verification | stakeholder / user validation |
| Required link | `about` (REQUIREMENT) + `subject` (PRODUCT/PROCESS/CAPABILITY) | `verifies` (REQUIREMENT) only | `validates` (NEED) only |
| Judgement field | `status` (`compliant` / `partial` / `non_compliant` / `under_review` / `n_a`) | `outcome` (`pass` / `fail` / `inconclusive` / `not_yet_run`) | `outcome` (`pass` / `fail` / `inconclusive` / `not_yet_run`) |

A `VALIDATION` carries no `subject` field, for the same reason `VERIFICATION` does not (§4, [27-verification.md](27-verification.md) §4): the thing checked is the need itself, not a claim about a particular product/process/capability satisfying it. Where a validation protocol is itself evidence for a compliance claim, cite it from the `ASSERTION.evidence[]` array (`kind: canonical_ref`, `ref: VALIDATION-…`) — the catalogues cross-reference; none is nested inside another.

**Reading the full chain.** `VALIDATION` → `NEED` ← `REQUIREMENT` → `VERIFICATION` is the complete "did we build the right thing, and did we build it right" pair over one need: `NEED.stakeholder` names whose need it is; `REQUIREMENT.serves` (optional, [15-requirement.md](15-requirement.md) §2.5) traces the design-input obligation that was written to satisfy it; `VERIFICATION` checks the requirement was met; `VALIDATION` checks the need was met. All four links are independently optional and independently resolvable — a `NEED` may have `VALIDATION`s with no serving `REQUIREMENT` yet (the need is known, the design response is not), and a `REQUIREMENT` may have `VERIFICATION`s with no `serves` back-reference (an obligation with no recorded upstream need, e.g. most `legislative`-origin requirements).

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `VALID-001` | error | A required field from §2 is missing, or `id` does not match the canonical grammar `VALIDATION-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1). |
| `VALID-002` | error | `validates` is missing, malformed, or resolves to an artefact whose TYPE is not `NEED`. |
| `VALID-003` | error | `method` is not one of `user_acceptance`, `field_trial`, `stakeholder_review`, `usability_study` (§3). |
| `VALID-004` | error | `outcome` is not one of `pass`, `fail`, `inconclusive`, `not_yet_run` (§3). |
| `VALID-005` | error | An `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve. |
| `VALID-006` | warning | `evidence` is empty AND `outcome` is `pass` — an undefended positive claim, mirroring `VERIF-006` ([27-verification.md](27-verification.md) §5). |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to VALIDATION files in addition to the `VALID-*` rules above.

**Reverse-trace completeness.** Whether every `NEED` has at least one `VALIDATION`, and whether every validation it has has actually closed (`pass` / `fail`, rather than stuck at `not_yet_run` / `inconclusive`) — is a cross-cutting check that requires scanning the full validations catalogue against the full needs catalogue. It is defined as `NEED-VALIDATION-COVERAGE-001` / `NEED-VALIDATION-COVERAGE-002` in [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §9.

---

## 6. File location and naming

```
canon/validations/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder sits at the canon-zone root alongside `canon/assertions/` and `canon/verifications/` (not under `canon/elements/`). Examples:

- `canon/validations/VALIDATION-OUTAGE-STATUS-UAT-1.yaml`
- `canon/validations/VALIDATION-CHECKOUT-FLOW-FIELD-TRIAL-1.yaml`

A generic worked example exercising `VALIDATION` alongside `NEED` and `REQUIREMENT` lives at [`../examples/validation/`](../examples/validation/).

---

## 7. Out of scope

- **Test execution management, 21 CFR Part 11 e-signatures, variant/configuration management.** Ceded to a dedicated ALM/QMS tool — same posture as `VERIFICATION` ([27-verification.md](27-verification.md) §7).
- **A dedicated `NEED` → `VALIDATION` report-config view.** Coverage over this element is read via the existing report views ([21-compliance-impact.md](../views/reports/21-compliance-impact.md), [22-coverage-metric.md](../views/reports/22-coverage-metric.md)) or a future dedicated view — not scoped here.
- **Formal usability metrics (SUS scores, task-success statistical thresholds).** `result` is narrative free text in v1; a structured metrics block is a future additive extension if a concrete need surfaces.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.8 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- The `NEED` element type validations are about: [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.28.
- The `REQUIREMENT` a NEED's serving obligation lives on, and its `serves` back-reference: [15-requirement.md](15-requirement.md) §2.5.
- The engineering-verification peer primitive, and the trade-off argument for keeping `VALIDATION` a separate TYPE rather than widening `verifies`: [27-verification.md](27-verification.md).
- The compliance-domain peer primitive: [16-assertion.md](16-assertion.md).
