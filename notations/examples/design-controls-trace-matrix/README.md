# Design-Controls Trace Matrix — worked example

A worked render of [`24-design-controls-trace-matrix.md`](../../views/24-design-controls-trace-matrix.md) over the union of the two existing design-controls element fixtures:

- [`../design-controls/`](../design-controls/) — the happy-path chain (nothing seeded as incomplete).
- [`../design-controls/reverse-trace-gaps/`](../design-controls/reverse-trace-gaps/) — the seeded-gap chain (each reverse-trace completeness rule trips exactly once).

**Pattern, not adopter instance.** Same generic, invented scenario as the two source fixtures; no real product, organisation, or adopter is named.

This folder does not duplicate the element files — [`full-chain.design-controls-trace-matrix.transitrix.yaml`](full-chain.design-controls-trace-matrix.transitrix.yaml) is the view-config that would render over them if both fixture trees were checked out under one `canon/` root (as they would be in an adopter repo). The table below is the render contract (§5 of the spec) applied **by hand** to the source elements, so it doubles as the expected-output fixture for a future CLI implementation — the same purpose the parent `reverse-trace-gaps/` folder serves for the validator rules themselves.

## Requirement-chain section

One row per `(REQUIREMENT, VERIFICATION)` pair, per §5.2. `REQUIREMENT-THERMAL-CUTOFF-1` has zero verifications, so it renders as a single gap row with no verification columns.

| Requirement | Verification | Method | Outcome | Gap annotation |
|---|---|---|---|---|
| `REQUIREMENT-DEVICE-ALARM-1` | `VERIFICATION-DEVICE-ALARM-TEST-1` | test | pass | — (closed) |
| `REQUIREMENT-THERMAL-CUTOFF-1` | — | — | — | **"No verification recorded"** — `REQ-VERIF-COVERAGE-001` |
| `REQUIREMENT-ENCLOSURE-DROP-1` | `VERIFICATION-ENCLOSURE-DROP-TEST-1` | test | not_yet_run | **"Verification recorded but not yet closed"** — `REQ-VERIF-COVERAGE-002` |

## Risk-chain section

One row per `(HAZARD, RISK_CONTROL)` pair, per §5.2, with the Requirement/Verification columns resolved from the control's `satisfies` (or the fixed "Not yet decomposed to a requirement" state when absent — not seeded in this fixture, since every control here carries `satisfies`). `HAZARD-ENCLOSURE-CRACK-1` has zero controls, so it renders as a single gap row.

| Hazard | Risk Control | Control type | Residual risk | Gap (hazard side) | Requirement | Verification | Gap (control side) |
|---|---|---|---|---|---|---|---|
| `HAZARD-BATTERY-DEPLETION-1` | `RISK_CONTROL-LOW-BATTERY-ALERT-1` | protective_measure | acceptable | — (closed) | `REQUIREMENT-DEVICE-ALARM-1` | `VERIFICATION-DEVICE-ALARM-TEST-1` (pass) | — (closed) |
| `HAZARD-ENCLOSURE-CRACK-1` | — | — | — | **"No risk control recorded"** — `HAZ-RISKCTL-COVERAGE-001` | — | — | — |
| `HAZARD-OVERHEAT-1` | `RISK_CONTROL-THERMAL-CUTOFF-1` | protective_measure | unacceptable | **"Control recorded but not shown adequate"** — `HAZ-RISKCTL-COVERAGE-002` | `REQUIREMENT-THERMAL-CUTOFF-1` | "No verification recorded" | **"Risk-mitigating requirement lacks V&V closure"** — `RISKCTL-VERIF-COVERAGE-001` |

## Coverage of the render contract

Every branch of §5.2 and every gap label in §5.3 is exercised at least once by this worked example:

| Rule | Row it fires on |
|---|---|
| `REQ-VERIF-COVERAGE-001` | `REQUIREMENT-THERMAL-CUTOFF-1` (requirement-chain section), and reflected on the `HAZARD-OVERHEAT-1` row (risk-chain section) via `RISKCTL-VERIF-COVERAGE-001` |
| `REQ-VERIF-COVERAGE-002` | `REQUIREMENT-ENCLOSURE-DROP-1` |
| `HAZ-RISKCTL-COVERAGE-001` | `HAZARD-ENCLOSURE-CRACK-1` |
| `HAZ-RISKCTL-COVERAGE-002` | `HAZARD-OVERHEAT-1` |
| `RISKCTL-VERIF-COVERAGE-001` | `HAZARD-OVERHEAT-1` / `RISK_CONTROL-THERMAL-CUTOFF-1` |
| No gap (fully closed) | `REQUIREMENT-DEVICE-ALARM-1` and `HAZARD-BATTERY-DEPLETION-1` — the happy path, present so the table isn't all-gaps |

## References

- [`24-design-controls-trace-matrix.md`](../../views/24-design-controls-trace-matrix.md) — the spec this example renders.
- [`../design-controls/README.md`](../design-controls/README.md) — the happy-path source fixture.
- [`../design-controls/reverse-trace-gaps/README.md`](../design-controls/reverse-trace-gaps/README.md) — the seeded-gap source fixture and the rule-by-rule breakdown its authoring already did.
