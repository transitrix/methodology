---
title: "Hazard / Risk-Control — ISO 14971 risk-management chain"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-07-26"
status: "draft"
---

# Hazard / Risk-Control — Reference

**Scope:** Two motivation-layer element TYPEs, `HAZARD` and `RISK_CONTROL`, that together carry the ISO 14971 risk-management chain — hazard → control → requirement → verification — as first-class canonical elements. The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

`HAZARD` and `RISK_CONTROL` are **zone primitives**: each is a single YAML file under `canon/elements/01_motivation/hazards/` or `canon/elements/01_motivation/risk-controls/` respectively, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the type-specific frontmatter below. Bundled in one spec because they are two halves of the same shape of work — a source of harm and the measure that addresses it — the way [15-requirement.md](15-requirement.md) bundles `REQUIREMENT` and `CONSTRAINT`.

---

## 1. The chain

ISO 14971 (medical-device risk management) names a repeating chain: a **hazard** (a potential source of harm) is addressed by a **risk control** (a measure that reduces the risk it poses), which is typically realised as one or more **design requirements**, which are in turn checked by **verification**. Transitrix already has `REQUIREMENT` ([15-requirement.md](15-requirement.md)) and, as of this release, `VERIFICATION` ([27-verification.md](27-verification.md)); `HAZARD` and `RISK_CONTROL` complete the chain:

```
   HAZARD-BATTERY-DEPLETION-1        ─── mitigated by ──┐
                                                          ▼
                              RISK_CONTROL-LOW-BATTERY-ALERT-1
                                control_type: protective_measure
                                satisfies: REQUIREMENT-DEVICE-ALARM-1  ───┐
                                residual_risk: acceptable                 ▼
                                                          REQUIREMENT-DEVICE-ALARM-1
                                                                          │
                                                                    verified by
                                                                          ▼
                                                    VERIFICATION-DEVICE-ALARM-TEST-1
```

`RISK_CONTROL.mitigates` is the **forward** link to the hazard(s) it addresses; `RISK_CONTROL.satisfies` is the **forward** link into the existing REQUIREMENT/VERIFICATION spine. Neither `HAZARD` nor `REQUIREMENT` carries a backward field — as with `REQUIREMENT` ← `ASSERTION.about` ([16-assertion.md](16-assertion.md) §1) and `REQUIREMENT` ← `VERIFICATION.verifies` ([27-verification.md](27-verification.md) §1), the reverse direction is answered by scanning the referencing catalogue, not by an inline field on the referenced element. Whether every hazard has an adequate control, and every control an adequate verification, is a cross-cutting completeness question answered by `HAZ-RISKCTL-COVERAGE-001` / `-002` and `RISKCTL-VERIF-COVERAGE-001` (§6).

---

## 2. `HAZARD` — frontmatter

```yaml
notation: hazard
id: HAZARD-BATTERY-DEPLETION-1
name: "Undetected battery depletion during active use"
description: "The device's battery depletes during active use without the operator being alerted, leading to unexpected shutdown mid-procedure and loss of the function being performed."
harm: "Interruption of an in-progress procedure; potential delay in patient care while the device is restarted or replaced."

severity: critical           # required; negligible | minor | serious | critical | catastrophic — see §4
probability: occasional       # optional; frequent | probable | occasional | remote | improbable — see §4
initial_risk: unacceptable    # optional; acceptable | alarp | unacceptable — pre-mitigation evaluation, see §4

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-07-18"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-07-18"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `hazard`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `HAZARD-[<middle>-]<INTEGER>`. |
| `name` | yes | string | One-line name of the hazard. |
| `description` | yes | string | The hazard and the hazardous situation that gives rise to it — the source of harm and the circumstances under which it arises. |
| `harm` | recommended | string | The potential harm that could result if the hazardous situation occurs — ISO 14971 keeps "hazard", "hazardous situation", and "harm" as distinct concepts; this field records the harm side without requiring three separate elements. |
| `severity` | yes | string | Harm-severity classification, closed vocabulary — see §4. |
| `probability` | no | string | Likelihood-of-occurrence classification, closed vocabulary — see §4. Optional because a qualitative-only risk analysis may record severity without a probability estimate. |
| `initial_risk` | no | string | Pre-mitigation risk evaluation — `acceptable` \| `alarp` \| `unacceptable` (§4). The evaluation *after* mitigation is `RISK_CONTROL.residual_risk` (§3), not a second field here. |
| `zone` | yes | string | Always `canon` — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Standard admission record — see [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` / `valid_to` | yes | — | Standard primitive lifecycle — see [CONTRACT.md](../CONTRACT.md) §7. |

---

## 3. `RISK_CONTROL` — frontmatter

```yaml
notation: risk-control
id: RISK_CONTROL-LOW-BATTERY-ALERT-1
name: "Audible and visual low-battery alert"
description: "The device continuously monitors state of charge and triggers a combined audible and visual alert when remaining capacity falls below the threshold needed to safely complete the longest supported procedure."

mitigates:                       # required; at least one HAZARD this control addresses
  - HAZARD-BATTERY-DEPLETION-1
control_type: protective_measure # required; inherent_safety_by_design | protective_measure | information_for_safety — see §4
satisfies: REQUIREMENT-DEVICE-ALARM-1   # optional; the REQUIREMENT this control is realised as
residual_risk: acceptable        # optional; acceptable | alarp | unacceptable — post-mitigation evaluation

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-07-19"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-07-19"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `risk-control`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `RISK_CONTROL-[<middle>-]<INTEGER>`. |
| `name` | yes | string | One-line name of the control measure. |
| `description` | yes | string | What the control does and how it reduces the risk. |
| `mitigates` | yes | list | One or more `HAZARD-…` IDs this control addresses. A list because a single control commonly addresses more than one hazard, and a single hazard is commonly addressed by more than one control (many-to-many) — the validator resolves each entry (`RISKCTL-002`). |
| `control_type` | yes | string | The ISO 14971 three-tier control hierarchy — `inherent_safety_by_design` \| `protective_measure` \| `information_for_safety` (§4). |
| `satisfies` | no | string | The `REQUIREMENT-…` this control is realised as a design requirement — the join into the existing REQUIREMENT/VERIFICATION spine. When present, the validator resolves it (`RISKCTL-004`). Optional because an early-lifecycle control may be recorded before it has been decomposed into a formal design requirement. |
| `residual_risk` | no | string | Post-mitigation risk evaluation — `acceptable` \| `alarp` \| `unacceptable` (§4). |
| `zone` | yes | string | Always `canon` — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` / `admitted_by` / `gate_checks` | yes | — | Standard admission record. |
| `valid_from` / `valid_to` | yes | — | Standard primitive lifecycle. |

---

## 4. Vocabularies

**`severity`** (HAZARD) — harm severity, ISO 14971-style ordinal scale, least to most severe:

`negligible` < `minor` < `serious` < `critical` < `catastrophic`

**`probability`** (HAZARD) — likelihood of the hazardous situation occurring, least to most likely:

`improbable` < `remote` < `occasional` < `probable` < `frequent`

**`initial_risk` / `residual_risk`** (HAZARD / RISK_CONTROL) — risk-acceptability evaluation:

| Value | Meaning |
|---|---|
| `acceptable` | The risk, at this point in the chain, is acceptable without further mitigation. |
| `alarp` | As Low As Reasonably Practicable — further mitigation is possible but the cost/benefit does not clearly justify it; a documented judgement call. |
| `unacceptable` | The risk requires further mitigation before the design can proceed. |

**`control_type`** (RISK_CONTROL) — the ISO 14971 control hierarchy, most to least preferred:

| Value | Meaning |
|---|---|
| `inherent_safety_by_design` | Eliminating or reducing the risk through the design itself (removing the hazard, or making the hazardous situation impossible). |
| `protective_measure` | A protective measure in the device itself or in the manufacturing process (an alarm, a guard, a fail-safe). |
| `information_for_safety` | Disclosing the residual risk to users (labelling, instructions for use, training) — the least preferred tier, used only where design and protective measures cannot further reduce the risk. |

No numeric risk-scoring formula (severity × probability matrices, risk-priority numbers) is defined in v1 — an adopter's own risk-management procedure defines its acceptability matrix; this schema carries the classification fields the matrix consumes, not the matrix itself.

---

## 5. File location and naming

```
canon/elements/01_motivation/hazards/<ID>.yaml
canon/elements/01_motivation/risk-controls/<ID>.yaml
```

One artefact per file, named by its canonical ID. Examples:

- `canon/elements/01_motivation/hazards/HAZARD-BATTERY-DEPLETION-1.yaml`
- `canon/elements/01_motivation/risk-controls/RISK_CONTROL-LOW-BATTERY-ALERT-1.yaml`

The two folders sit alongside `canon/elements/01_motivation/requirements/` and `canon/elements/01_motivation/constraints/` — peer motivation-layer catalogues, not nested. A generic worked example exercising both TYPEs alongside `REQUIREMENT` and `VERIFICATION` lives at [`../examples/design-controls/`](../examples/design-controls/).

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `HAZ-001` | error | A required field from §2 is missing, or `id` does not match the canonical grammar `HAZARD-[<middle>-]<INTEGER>`. |
| `HAZ-002` | error | `severity` is not one of `negligible`, `minor`, `serious`, `critical`, `catastrophic` (§4). |
| `HAZ-003` | error | `probability` is present and not one of `improbable`, `remote`, `occasional`, `probable`, `frequent` (§4). |
| `HAZ-004` | error | `initial_risk` is present and not one of `acceptable`, `alarp`, `unacceptable` (§4). |
| `RISKCTL-001` | error | A required field from §3 is missing, or `id` does not match the canonical grammar `RISK_CONTROL-[<middle>-]<INTEGER>`. |
| `RISKCTL-002` | error | `mitigates` is missing, empty, or contains an entry that does not resolve to an artefact of TYPE `HAZARD`. |
| `RISKCTL-003` | error | `control_type` is not one of `inherent_safety_by_design`, `protective_measure`, `information_for_safety` (§4). |
| `RISKCTL-004` | error | `satisfies` is present and does not resolve to an artefact of TYPE `REQUIREMENT`. |
| `RISKCTL-005` | error | `residual_risk` is present and not one of `acceptable`, `alarp`, `unacceptable` (§4). |
| `HAZ-RISKCTL-COVERAGE-001` | warning | A `HAZARD` has no admitted `RISK_CONTROL` mitigating it — no file under `canon/elements/01_motivation/risk-controls/` carries this HAZARD id in `mitigates`. An identified hazard with no corresponding design output addressing it — "no orphan design output" read from the hazard side. Cross-cutting — fires on the HAZARD but is computed by scanning the risk-controls catalogue. |
| `HAZ-RISKCTL-COVERAGE-002` | warning | A `HAZARD` has one or more admitted `RISK_CONTROL`s mitigating it, but none records `residual_risk: acceptable` or `residual_risk: alarp` — every mitigating control either omits `residual_risk` or records it `unacceptable`. The hazard is nominally addressed but not shown to be adequately controlled. Distinct from, and mutually exclusive with, `HAZ-RISKCTL-COVERAGE-001` by construction. |
| `RISKCTL-VERIF-COVERAGE-001` | warning | A `RISK_CONTROL` carries `satisfies`, but the `REQUIREMENT` it references has no admitted `VERIFICATION` that has reached `outcome: pass` or `outcome: fail` (either none targets it at all, or every one that does is still `not_yet_run` / `inconclusive`). The same underlying gap as `REQ-VERIF-COVERAGE-001` / `-002` ([15-requirement.md](15-requirement.md) §4), surfaced directly on the RISK_CONTROL record so an ISO 14971 audit reader does not have to jump to the requirement file to see that a risk-mitigating design requirement lacks V&V closure. Does not fire when `satisfies` is absent — an early-lifecycle control recorded before decomposition into a formal design requirement (§3) is not an orphan. |

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to both TYPEs in addition to the rules above.

**Reverse-trace completeness.** Whether every `HAZARD` has at least one adequately-controlled `RISK_CONTROL` (`HAZ-RISKCTL-COVERAGE-001` / `-002` above), and whether every `RISK_CONTROL` that carries `satisfies` has a corresponding, closed `VERIFICATION` (`RISKCTL-VERIF-COVERAGE-001` above) — these cross-cutting questions require scanning the full hazard / risk-control / requirement / verification catalogues together. Paired with the REQUIREMENT-side reverse-trace rules in [27-verification.md](27-verification.md) §5 and [15-requirement.md](15-requirement.md) §4.

---

## 7. Evolution

**Landed (v0.2, 2026-07-26):**
- **Reverse-trace completeness** — `HAZ-RISKCTL-COVERAGE-001` / `-002` (orphan / inadequately-controlled hazard) and `RISKCTL-VERIF-COVERAGE-001` (risk-mitigating requirement lacking V&V closure), defined in §6. Paired with the REQUIREMENT-side rules in [27-verification.md](27-verification.md) §5 and [15-requirement.md](15-requirement.md) §4.

Out of scope for this schema:

- **Numeric risk scoring.** No risk-priority-number formula or acceptability matrix is defined; an adopter's own risk-management procedure supplies it.
- **SDS / trace-matrix rendering.** A rendered design-controls trace matrix including the risk chain (Hazard → Risk-Control → Verification) is a separate report-config view, not yet implemented.
- **Post-market surveillance / risk-file maintenance workflow.** Ceded to a dedicated ALM/QMS tool.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- The REQUIREMENT element type a RISK_CONTROL may satisfy: [15-requirement.md](15-requirement.md).
- The VERIFICATION type that closes the chain: [27-verification.md](27-verification.md).
