---
title: "Verification — REQUIREMENT V&V claim"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-07-29"
status: "draft"
---

# Verification — Reference

**Scope:** The `VERIFICATION` type — a first-class engineering verification-and-validation (V&V) claim that a **`REQUIREMENT`** was checked against a stated protocol, with an explicit method, result, and pass/fail outcome. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.7.

Verifications are canon-zone artefacts that live **outside** the `elements/` tree, under `canon/verifications/` — the same structural choice as `ASSERTION` ([16-assertion.md](16-assertion.md)). Each verification is a single YAML file named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the verification-specific frontmatter below.

---

## 1. What a Verification is

A `REQUIREMENT` records *what the design must do*. A `VERIFICATION` records *that a specific protocol was run against the requirement, and what it found* — the engineering V&V counterpart to the regulatory-compliance `ASSERTION` ([16-assertion.md](16-assertion.md) §1). Before this type, verification existed only as a free-text `evidence[]` entry on an `ASSERTION`; `VERIFICATION` promotes that to a first-class, independently addressable claim with its own method, protocol, and pass/fail outcome.

```
   REQUIREMENT-DEVICE-ALARM-1              ─── verifies ──┐
                                                            ▼
                              VERIFICATION-DEVICE-ALARM-TEST-1
                                method: test
                                protocol: "..."
                                result: "..."
                                outcome: pass
                                evidence: […]
```

`verifies` is the **forward** link (verification → requirement it targets). The **reverse** question — "which requirements have no verification, or an unresolved one?" — is a cross-cutting completeness check, answered by `REQ-VERIF-COVERAGE-001` / `REQ-VERIF-COVERAGE-002` ([15-requirement.md](15-requirement.md) §4; see §5 below).

A `VERIFICATION` is distinct from an `ASSERTION`: an `ASSERTION` claims a *subject* (`PRODUCT` / `PROCESS` / `CAPABILITY`) is *compliant* with a requirement; a `VERIFICATION` claims a *protocol* was *run* against a requirement and records what it found. The two may coexist — an `ASSERTION.evidence[]` MAY cite a `VERIFICATION` via `kind: canonical_ref` — but neither implies the other.

---

## 2. Frontmatter — canonical schema

```yaml
notation: verification
id: VERIFICATION-DEVICE-ALARM-TEST-1
verifies: REQUIREMENT-DEVICE-ALARM-1     # required; must resolve to a REQUIREMENT
method: test                              # required; test | analysis | inspection | demonstration
protocol: "Discharge battery under controlled load to 10% state of charge; confirm the audible and visual low-battery alert triggers within 2 seconds of crossing the threshold."
result: "Alert triggered at 9.7% state of charge, 1.4 seconds after threshold crossing, across 10/10 runs."   # optional
outcome: pass                             # required; pass | fail | inconclusive | not_yet_run
evidence:                                  # optional; same shape as ASSERTION.evidence (16-assertion.md §4)
  - kind: external_doc
    title: "Low-battery alert verification protocol VP-014, run log"
    url: "https://internal.example/reports/vp-014-run-log.pdf"

performed_at: "2026-07-20"                # optional but recommended; date the protocol was run
performed_by: ROLE-VERIFICATION-ENG-1     # optional; ROLE typed ID, or free-text handle in quotes

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-07-21"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-07-21"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `verification`. Machine-readable type tag (redundant with the ID prefix, useful for tooling that reads files without parsing IDs). |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `VERIFICATION-[<middle>-]<INTEGER>`. |
| `verifies` | yes | string | Typed ID of the `REQUIREMENT` this verification targets. The validator resolves it (`VERIF-002`). |
| `method` | yes | string | One of `test`, `analysis`, `inspection`, `demonstration` — the classic V&V method vocabulary (IEEE/IEC/ISO 15288, and the same four methods FDA design-controls guidance names for 21 CFR 820.30(f)). See §3. |
| `protocol` | yes | string | The verification procedure — what was done, under what conditions, against what acceptance criteria. |
| `result` | no | string | Narrative of what was observed when the protocol ran. Distinct from `outcome` — `result` is the finding, `outcome` is the judgement. |
| `outcome` | yes | string | One of `pass`, `fail`, `inconclusive`, `not_yet_run`. See §3. |
| `evidence` | no | list | Hybrid array of evidence entries — same shape as `ASSERTION.evidence` ([16-assertion.md](16-assertion.md) §4): `canonical_ref` / `external_doc` / `note`. |
| `performed_at` | no | string | Date the protocol was run — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `performed_by` | no | string | A `ROLE-…` typed ID, or a free-text handle in quotes. |
| `zone` | yes | string | Always `canon` for VERIFICATION — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`). |
| `valid_from` | yes | string | Date the verification record took effect — see [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the verification record ceased to be in effect, or `null` if still in effect. |

---

## 3. Vocabularies

**`method`** — the V&V approach used:

| Value | Meaning |
|---|---|
| `test` | Exercising the requirement under controlled, repeatable conditions and observing the outcome (the fixture in §6 uses this). |
| `analysis` | Verification by calculation, modelling, or simulation rather than direct observation. |
| `inspection` | Visual or manual examination against a defined criterion (dimensions, labelling, physical construction). |
| `demonstration` | Observing functional operation without instrumented measurement — the requirement either visibly works or does not. |

**`outcome`** — the pass/fail judgement:

| Value | Meaning |
|---|---|
| `pass` | The protocol ran and the requirement's acceptance criteria were met. |
| `fail` | The protocol ran and the requirement's acceptance criteria were **not** met. |
| `inconclusive` | The protocol ran but did not yield a clear pass/fail determination (e.g. equipment fault, ambiguous acceptance criteria) — re-run or protocol revision is expected. |
| `not_yet_run` | The verification record exists (e.g. the protocol is planned/scheduled) but has not yet been executed. A `VERIFICATION` MAY be admitted at this outcome to reserve the trace link before execution; `result` is typically absent at this outcome. |

---

## 4. Relation to `ASSERTION`

`VERIFICATION` and `ASSERTION` are peer canon-zone claim primitives, both living flat outside `elements/` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §2), both targeting a `REQUIREMENT`, both resolved by scanning their own catalogue rather than carrying a backward field on `REQUIREMENT` itself. They differ in **what they claim**:

| | `ASSERTION` | `VERIFICATION` |
|---|---|---|
| Claims | a *subject* (PRODUCT / PROCESS / CAPABILITY) is compliant with the requirement | a *protocol* was run against the requirement |
| Domain | regulatory / organisational compliance | engineering V&V |
| Required link | `about` (REQUIREMENT) + `subject` (PRODUCT/PROCESS/CAPABILITY) | `verifies` (REQUIREMENT) only — no separate subject field |
| Judgement field | `status` (`compliant` / `partial` / `non_compliant` / `under_review` / `n_a`) | `outcome` (`pass` / `fail` / `inconclusive` / `not_yet_run`) |

A `VERIFICATION` carries no `subject` field: the thing verified is the requirement's acceptance criteria directly, not a claim about a particular product/process/capability satisfying it. Where a verification protocol is itself evidence for a compliance claim, cite it from the `ASSERTION.evidence[]` array (`kind: canonical_ref`, `ref: VERIFICATION-…`) — the two catalogues cross-reference; neither is nested inside the other.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `VERIF-001` | error | A required field from §2 is missing, or `id` does not match the canonical grammar `VERIFICATION-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1). |
| `VERIF-002` | error | `verifies` is missing, malformed, or resolves to an artefact whose TYPE is not `REQUIREMENT`. |
| `VERIF-003` | error | `method` is not one of `test`, `analysis`, `inspection`, `demonstration` (§3). |
| `VERIF-004` | error | `outcome` is not one of `pass`, `fail`, `inconclusive`, `not_yet_run` (§3). |
| `VERIF-005` | error | An `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve. |
| `VERIF-006` | warning | `evidence` is empty AND `outcome` is `pass` — an undefended positive claim, mirroring `ASSERT-007` ([16-assertion.md](16-assertion.md) §5). |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to VERIFICATION files in addition to the `VERIF-*` rules above.

**Reverse-trace completeness.** Whether every `REQUIREMENT` has at least one `VERIFICATION`, and whether every verification it has has actually closed (`pass` / `fail`, rather than stuck at `not_yet_run` / `inconclusive`) — is a cross-cutting check that requires scanning the full verifications catalogue against the full requirements catalogue. It is defined as `REQ-VERIF-COVERAGE-001` / `REQ-VERIF-COVERAGE-002` in [15-requirement.md](15-requirement.md) §4.

---

## 6. File location and naming

```
canon/verifications/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder sits at the canon-zone root alongside `canon/assertions/` (not under `canon/elements/`). Examples:

- `canon/verifications/VERIFICATION-DEVICE-ALARM-TEST-1.yaml`
- `canon/verifications/VERIFICATION-ENCLOSURE-DROP-TEST-1.yaml`

A worked example exercising `VERIFICATION` alongside `REQUIREMENT` is planned alongside the broader compliance worked-examples wave, the same status as the `REQUIREMENT` / `ASSERTION` worked examples ([15-requirement.md](15-requirement.md) §5, [16-assertion.md](16-assertion.md) §7) — not part of this initial registration.

---

## 7. Evolution

**Landed (v0.2, 2026-07-26):**
- **Reverse-trace completeness** — `REQ-VERIF-COVERAGE-001` (no `VERIFICATION` targets this REQUIREMENT) and `REQ-VERIF-COVERAGE-002` (every `VERIFICATION` that does is stuck at `not_yet_run` / `inconclusive`), defined in [15-requirement.md](15-requirement.md) §4.

**Removed (v0.3, 2026-07-29):** The design-controls trace-matrix report-config view and its reference renderer, which used to render `REQUIREMENT` → `VERIFICATION` alongside the ISO 14971 risk chain, left this repository along with `HAZARD` / `RISK_CONTROL` (ADR `cross-project/2026-07-29-design-controls-private-module`). `VERIFICATION` itself is unaffected — this element stays core, unchanged.

Out of scope for this schema:

- **Test execution management, 21 CFR Part 11 e-signatures, variant/configuration management.** Ceded to a dedicated ALM/QMS tool.
- **A dedicated `REQUIREMENT` → `VERIFICATION` report-config view.** Compliance and V&V coverage over this element are read via the existing report views ([21-compliance-impact.md](../views/21-compliance-impact.md), [22-coverage-metric.md](../views/22-coverage-metric.md)) or a future dedicated view — not scoped here.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.7 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- The REQUIREMENT element type verifications are about: [15-requirement.md](15-requirement.md).
- The compliance-domain peer primitive: [16-assertion.md](16-assertion.md).
