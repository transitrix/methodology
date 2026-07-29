# Reverse-trace completeness — seeded-gap fixture

A second, sibling fixture to [`../`](../) (the "happy path" chain, where every forward link resolves and nothing is seeded as incomplete). This one deliberately seeds each of the five reverse-trace completeness gaps so the validator rules that check them have something to flag. Same posture as the parent fixture: generic, invented scenario; no real product, organisation, or adopter named.

Every file here is **structurally valid** — every notation-local rule (`REQ-*`, `VERIF-*`, `HAZ-*`, `RISKCTL-*`) passes, every forward link (`mitigates`, `satisfies`, `verifies`) resolves. Only the cross-cutting reverse-trace rules fire, because that is exactly what this fixture is for.

## Seeded gaps

| File | Seeded gap | Rule(s) it trips |
|---|---|---|
| [`.../hazards/HAZARD-ENCLOSURE-CRACK-1.yaml`](design-controls/hazards/HAZARD-ENCLOSURE-CRACK-1.yaml) | No `RISK_CONTROL` anywhere in this catalogue carries this hazard in `mitigates` — an identified hazard with no design output addressing it. | `HAZ-RISKCTL-COVERAGE-001` |
| [`.../hazards/HAZARD-OVERHEAT-1.yaml`](design-controls/hazards/HAZARD-OVERHEAT-1.yaml) + [`.../risk-controls/RISK_CONTROL-THERMAL-CUTOFF-1.yaml`](design-controls/risk-controls/RISK_CONTROL-THERMAL-CUTOFF-1.yaml) | The hazard *is* mitigated, but its only control records `residual_risk: unacceptable` — nominally addressed, not shown adequately controlled. | `HAZ-RISKCTL-COVERAGE-002` |
| [`.../risk-controls/RISK_CONTROL-THERMAL-CUTOFF-1.yaml`](design-controls/risk-controls/RISK_CONTROL-THERMAL-CUTOFF-1.yaml) → [`.../requirements/REQUIREMENT-THERMAL-CUTOFF-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-THERMAL-CUTOFF-1.yaml) | The control's `satisfies` requirement carries zero admitted `VERIFICATION` — the risk-mitigating design requirement has no V&V closure. | `RISKCTL-VERIF-COVERAGE-001` (on the control) and `REQ-VERIF-COVERAGE-001` (on the requirement) — the same gap, surfaced from both ends of the chain. |
| [`.../requirements/REQUIREMENT-ENCLOSURE-DROP-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-ENCLOSURE-DROP-1.yaml) + [`.../verifications/VERIFICATION-ENCLOSURE-DROP-TEST-1.yaml`](design-controls/verifications/VERIFICATION-ENCLOSURE-DROP-TEST-1.yaml) | The requirement has a verification, but it is still `outcome: not_yet_run` — the trace link exists but has not closed. A REQUIREMENT with no risk control behind it at all, showing the V&V-coverage question applies to any REQUIREMENT, not only ones reached via the risk chain. | `REQ-VERIF-COVERAGE-002` |

## What is deliberately *not* seeded

`HAZARD-ENCLOSURE-CRACK-1` has no `RISK_CONTROL`, so there is no `satisfies`/`verifies` chain to seed a further gap on for it — one gap per hazard keeps each row in the table above attributable to exactly one rule. A fixture combining every possible co-occurring gap on a single element would obscure which rule is doing the flagging.

## References

- [`../README.md`](../README.md) — the happy-path fixture this one is a sibling to.
- [`../../../../elements/15-requirement.md`](../../../../elements/15-requirement.md) §4 — `REQ-VERIF-COVERAGE-001` / `-002` (core, on the REQUIREMENT).
- [`../../../../packages/design-controls.md`](../../../../packages/design-controls.md) — `HAZ-RISKCTL-COVERAGE-001` / `-002`, `RISKCTL-VERIF-COVERAGE-001`, and the rest of the package's validation rules.
