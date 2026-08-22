# Verification — worked example

A small, generic fixture exercising the engineering verification leg — `REQUIREMENT` → `VERIFICATION` — end to end. Unlike the diagram/report-view folders elsewhere under `notations/examples/`, these are **standalone canon-zone element files** (per [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1), laid out under a `canon/` tree fragment exactly as they would sit in an adopter repository — there is no single previewable diagram file for this leg.

**Pattern, not adopter instance.** The scenario (a system that must ride through loss of mains power) is a generic, invented example chosen to exercise every field of both TYPEs. It names no real product, organisation, or adopter.

## Files in this folder

| File | TYPE | Role |
|---|---|---|
| [`canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-1.yaml) | `REQUIREMENT` | The obligation to be met ([`15-requirement.md`](../../elements/15-requirement.md)). |
| [`canon/verifications/VERIFICATION-BACKUP-POWER-TEST-1.yaml`](canon/verifications/VERIFICATION-BACKUP-POWER-TEST-1.yaml) | `VERIFICATION` | The verification protocol that checks it (`verifies`), with method, result, and pass/fail outcome. |

## The link

```
REQUIREMENT-BACKUP-POWER-1
        │ verified by (VERIFICATION.verifies, reverse direction)
        ▼
VERIFICATION-BACKUP-POWER-TEST-1  (outcome: pass)
```

The forward link (`verifies`) resolves in this fixture — nothing is seeded as incomplete; it demonstrates the schema and the happy path only. The reverse-trace completeness rules (`REQ-VERIF-COVERAGE-001` / `-002`) are demonstrated in the sibling fixture [`verification-reverse-trace-gaps/`](../verification-reverse-trace-gaps/).

## References

- [`verification-reverse-trace-gaps/`](../verification-reverse-trace-gaps/) — sibling fixture seeding each reverse-trace completeness gap.
- [`../../elements/27-verification.md`](../../elements/27-verification.md) — `VERIFICATION` schema and validation rules.
- [`../../elements/15-requirement.md`](../../elements/15-requirement.md) — `REQUIREMENT` schema, and `REQ-VERIF-COVERAGE-001` / `-002` in §4.
- [`../../CONTRACT.md`](../../CONTRACT.md) §8 — aggregated compliance and verification domain validation rules.
