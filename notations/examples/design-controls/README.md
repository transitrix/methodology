# Design-controls — worked example

A small, generic fixture exercising the design-controls traceability chain — `HAZARD` → `RISK_CONTROL` → `REQUIREMENT` → `VERIFICATION` — end to end. Unlike the diagram/report-view folders elsewhere under `notations/examples/`, these are **standalone canon-zone element files** (per [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1), laid out under a `canon/` tree fragment exactly as they would sit in an adopter repository — there is no single previewable diagram file for this chain.

**Pattern, not adopter instance.** The scenario (a battery-powered device with a low-battery alert) is a generic, invented example chosen to exercise every field of every TYPE in the chain. It names no real product, organisation, or adopter.

## Files in this folder

| File | TYPE | Role in the chain |
|---|---|---|
| [`canon/elements/01_motivation/hazards/HAZARD-BATTERY-DEPLETION-1.yaml`](canon/elements/01_motivation/hazards/HAZARD-BATTERY-DEPLETION-1.yaml) | `HAZARD` | The potential source of harm: undetected battery depletion during active use. |
| [`canon/elements/01_motivation/risk-controls/RISK_CONTROL-LOW-BATTERY-ALERT-1.yaml`](canon/elements/01_motivation/risk-controls/RISK_CONTROL-LOW-BATTERY-ALERT-1.yaml) | `RISK_CONTROL` | The control measure that mitigates the hazard (`mitigates`) and is realised as a design requirement (`satisfies`). |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-DEVICE-ALARM-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-DEVICE-ALARM-1.yaml) | `REQUIREMENT` | The design requirement the risk control realises — the existing motivation-layer element type ([`15-requirement.md`](../../elements/15-requirement.md)). |
| [`canon/verifications/VERIFICATION-DEVICE-ALARM-TEST-1.yaml`](canon/verifications/VERIFICATION-DEVICE-ALARM-TEST-1.yaml) | `VERIFICATION` | The V&V protocol that checks the requirement (`verifies`), with method, result, and pass/fail outcome. |

## The chain

```
HAZARD-BATTERY-DEPLETION-1
        │ mitigated by (RISK_CONTROL.mitigates)
        ▼
RISK_CONTROL-LOW-BATTERY-ALERT-1
        │ satisfies (RISK_CONTROL.satisfies)
        ▼
REQUIREMENT-DEVICE-ALARM-1
        │ verified by (VERIFICATION.verifies, reverse direction)
        ▼
VERIFICATION-DEVICE-ALARM-TEST-1  (outcome: pass)
```

Every forward link (`mitigates`, `satisfies`, `verifies`) resolves in this fixture — no orphan or unverified element is seeded here; it demonstrates the schema and the happy path only. The reverse-trace completeness rules (`REQ-VERIF-COVERAGE-*`, `HAZ-RISKCTL-COVERAGE-*`, `RISKCTL-VERIF-COVERAGE-001`) that check for a seeded orphan or unverified element are demonstrated in the sibling fixture [`reverse-trace-gaps/`](reverse-trace-gaps/).

## References

- [`reverse-trace-gaps/`](reverse-trace-gaps/) — sibling fixture seeding each reverse-trace completeness gap this chain's rules check for.
- [`../../elements/27-verification.md`](../../elements/27-verification.md) — `VERIFICATION` schema and validation rules.
- [`../../elements/28-hazard-risk-control.md`](../../elements/28-hazard-risk-control.md) — `HAZARD` / `RISK_CONTROL` schema and validation rules.
- [`../../elements/15-requirement.md`](../../elements/15-requirement.md) — `REQUIREMENT` schema.
- [`../../CONTRACT.md`](../../CONTRACT.md) §8 — aggregated compliance and design-controls domain validation rules.
