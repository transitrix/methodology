# Reverse-trace completeness — seeded-gap fixture

A sibling fixture to [`../verification/`](../verification/) (the happy path, where the forward link resolves and nothing is seeded as incomplete). This one deliberately seeds both reverse-trace completeness gaps so the rules that check them have something to flag. Same posture as the parent fixture: generic, invented scenario; no real product, organisation, or adopter named.

Every file here is **structurally valid** — every notation-local rule (`REQ-*`, `VERIF-*`) passes and every forward link (`verifies`) resolves. Only the cross-cutting reverse-trace rules fire, because that is exactly what this fixture is for.

## Seeded gaps

| File | Seeded gap | Rule it trips |
|---|---|---|
| [`.../requirements/REQUIREMENT-SESSION-TIMEOUT-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-SESSION-TIMEOUT-1.yaml) | No `VERIFICATION` anywhere in this catalogue carries this requirement in `verifies` — an admitted obligation nobody has checked. | `REQ-VERIF-COVERAGE-001` |
| [`.../requirements/REQUIREMENT-FAILOVER-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-FAILOVER-1.yaml) + [`.../verifications/VERIFICATION-FAILOVER-DRILL-1.yaml`](canon/verifications/VERIFICATION-FAILOVER-DRILL-1.yaml) | The requirement *has* a verification, but it is still `outcome: not_yet_run` — the trace link exists and has not closed. | `REQ-VERIF-COVERAGE-002` |
| [`.../requirements/REQUIREMENT-BACKUP-POWER-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-1.yaml) + [`.../verifications/VERIFICATION-BACKUP-POWER-TEST-1.yaml`](canon/verifications/VERIFICATION-BACKUP-POWER-TEST-1.yaml) | None — carried over from the parent fixture so the catalogue contains a closed chain alongside the open ones. | (clean) |

## What is deliberately *not* seeded

A single requirement carrying both gaps at once. One gap per requirement keeps each row above attributable to exactly one rule; a fixture combining co-occurring gaps on one element would obscure which rule is doing the flagging.

## References

- [`../verification/README.md`](../verification/README.md) — the happy-path fixture this one is a sibling to.
- [`../../elements/15-requirement.md`](../../elements/15-requirement.md) §4 — `REQ-VERIF-COVERAGE-001` / `-002`.
- [`../../CONTRACT.md`](../../CONTRACT.md) §8 — aggregated compliance and verification domain validation rules.
