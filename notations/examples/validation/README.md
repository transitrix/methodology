# Validation — worked example

A small, generic fixture exercising the validation-anchor leg — `NEED` → `REQUIREMENT` (via `serves`) → `VALIDATION` — end to end. Unlike the diagram/report-view folders elsewhere under `notations/examples/`, these are **standalone canon-zone element files** (per [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1), laid out under a `canon/` tree fragment exactly as they would sit in an adopter repository — there is no single previewable diagram file for this leg. Same posture as the sibling [`../verification/`](../verification/) fixture for the engineering-verification leg.

**Pattern, not adopter instance.** The scenario (customers needing timely notice of a service outage) is a generic, invented example chosen to exercise every field of `NEED`, the `REQUIREMENT.serves` back-reference, and `VALIDATION`. It names no real product, organisation, or adopter.

## Files in this folder

| File | TYPE | Role |
|---|---|---|
| [`canon/elements/02_business/actors/ACTOR-ENTERPRISE-CUSTOMERS-1.yaml`](canon/elements/02_business/actors/ACTOR-ENTERPRISE-CUSTOMERS-1.yaml) | `ACTOR` | The identity the stakeholder's stake attaches to ([`19-actors.md`](../../elements/19-actors.md)). |
| [`canon/elements/01_motivation/stakeholders/STAKEHOLDER-ENTERPRISE-CUSTOMERS-1.yaml`](canon/elements/01_motivation/stakeholders/STAKEHOLDER-ENTERPRISE-CUSTOMERS-1.yaml) | `STAKEHOLDER` | Whose need this is ([`20-stakeholders.md`](../../elements/20-stakeholders.md)). |
| [`canon/elements/01_motivation/needs/NEED-TIMELY-OUTAGE-STATUS-1.yaml`](canon/elements/01_motivation/needs/NEED-TIMELY-OUTAGE-STATUS-1.yaml) | `NEED` | The stakeholder need to be met, independent of how ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.26). |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-OUTAGE-STATUS-PAGE-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-OUTAGE-STATUS-PAGE-1.yaml) | `REQUIREMENT` | The design-input obligation written to satisfy the need, tracing back via `serves` ([`15-requirement.md`](../../elements/15-requirement.md) §2.5). |
| [`canon/validations/VALIDATION-OUTAGE-STATUS-UAT-1.yaml`](canon/validations/VALIDATION-OUTAGE-STATUS-UAT-1.yaml) | `VALIDATION` | The user-acceptance protocol that checks the need was actually met (`validates`), with method, result, and pass/fail outcome ([`28-validation.md`](../../elements/28-validation.md)). |

## The links

```
NEED-TIMELY-OUTAGE-STATUS-1
    │ stakeholder
    ▼
STAKEHOLDER-ENTERPRISE-CUSTOMERS-1 ── actor ──▶ ACTOR-ENTERPRISE-CUSTOMERS-1

NEED-TIMELY-OUTAGE-STATUS-1
    ▲ serves (REQUIREMENT-side back-reference)
    │
REQUIREMENT-OUTAGE-STATUS-PAGE-1

NEED-TIMELY-OUTAGE-STATUS-1
    │ validated by (VALIDATION.validates, reverse direction)
    ▼
VALIDATION-OUTAGE-STATUS-UAT-1  (outcome: pass)
```

Every forward link in this fixture resolves — nothing is seeded as incomplete; it demonstrates the schema and the happy path only, the same posture as [`../verification/`](../verification/) (whose own `reverse-trace-gaps/` sibling seeds the incomplete-trace case for that leg — no equivalent gap fixture is added here to keep this task's scope tight).

**Reading the full chain.** This fixture's `REQUIREMENT-OUTAGE-STATUS-PAGE-1` does not carry its own `VERIFICATION` — it is a separate, independent fixture from [`../verification/`](../verification/)'s `REQUIREMENT-BACKUP-POWER-1`. In a real adopter repository the same `REQUIREMENT` may accrue both a `VERIFICATION` (engineering check that the obligation was met) and, via its `serves` NEED, a `VALIDATION` (stakeholder check that the underlying need was met) — see [`28-validation.md`](../../elements/28-validation.md) §4 for how the two claim types compose over one need.

## References

- [`../../elements/28-validation.md`](../../elements/28-validation.md) — `VALIDATION` schema, validation rules, and the trade-off argument for a separate TYPE rather than widening `VERIFICATION.verifies`.
- [`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.26 — `NEED` schema and validation rules, including the reverse-trace completeness rules (`NEED-COVERAGE-001`, `NEED-VALIDATION-COVERAGE-001`/`-002`).
- [`../../elements/15-requirement.md`](../../elements/15-requirement.md) §2.5 — the `REQUIREMENT.serves` field.
- [`../../CONTRACT.md`](../../CONTRACT.md) §8 — aggregated compliance, verification, and validation domain validation rules.
- [`../verification/`](../verification/) — the sibling fixture for the `REQUIREMENT` → `VERIFICATION` engineering-verification leg.
