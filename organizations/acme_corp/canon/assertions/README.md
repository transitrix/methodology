# `canon/assertions/`

Assertion artefacts — the canonical compliance claim that a subject (`PRODUCT` / `PROCESS` / `CAPABILITY`) satisfies a `REQUIREMENT`, with status and evidence. Each assertion is one file under this folder.

Assertions are canon-zone artefacts but live **outside** the `elements/` tree: `canon/assertions/` is a flat directory at the canon-zone root, peer to `canon/elements/` and `canon/views/`. This reflects that an assertion is a *claim about* canonical elements rather than an element itself.

Schema and validation rules are defined in [`notations/16-assertion.md`](../../../notations/16-assertion.md). TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../notations/IDS_AND_REFERENCES.md) §3.6 (`ASSERTION`), §4 (uniqueness scope).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `ASSERTION-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../notations/IDS_AND_REFERENCES.md) §1. A typical middle-segment convention encodes the (subject, requirement) pair — e.g. `ASSERTION-MOBILE-DATA-ERASURE-1` for a claim by `PRODUCT-MOBILE-1` against `REQUIREMENT-DATA-ERASURE-1`. The grammar imposes only the prefix and the terminal integer; teams may pick a different middle-segment convention.

## The (subject, requirement) pair

One assertion per `(subject, requirement)` pair. Multiple subjects against the same requirement → multiple assertions; the same subject against multiple requirements → multiple assertions. Status and evidence are mutable over an assertion's lifecycle; the realisation set (`realised_via`) may also change as the underlying processes / capabilities evolve.

## Status vocabulary

`compliant` / `partial` / `non_compliant` / `under_review` / `n_a`. See [`notations/16-assertion.md`](../../../notations/16-assertion.md) §3 for semantics.

## Examples in this folder

| File | Subject | About | Status | Evidence | Notes |
|---|---|---|---|---|---|
| `ASSERTION-MOBILE-DATA-ERASURE-1.yaml` | `PRODUCT-MOBILE-1` | `REQUIREMENT-DATA-ERASURE-1` | `compliant` | all three kinds (`canonical_ref` + `external_doc` + `note`) | full-evidence happy path |
| `ASSERTION-ONBOARD-DATA-ERASURE-1.yaml` | `PROCESS-CUST-ONBOARD-1` | `REQUIREMENT-DATA-ERASURE-1` | `partial` | `external_doc` + `note` only | mid-remediation; gaps documented |
| `ASSERTION-CRM-DATA-ERASURE-1.yaml` | `CAPABILITY-V2` | `REQUIREMENT-DATA-ERASURE-1` | `under_review` | empty | demonstrates the `ASSERT-007` warning (positive status absent → no defended claim) |

Three subjects (one each of `PRODUCT`, `PROCESS`, `CAPABILITY`) all targeting the same requirement — the same regulatory obligation has different realisation footprints across the organisation, and each is asserted separately.

`REQUIREMENT-AUDIT-LOG-RETENTION-1` deliberately has **no** assertion targeting it, to surface the planned `REQ-COVERAGE-001` warning (a requirement with no assertion is a compliance gap). See [`notations/16-assertion.md`](../../../notations/16-assertion.md) §7 Evolution.

## See also

- Assertion spec: [`notations/16-assertion.md`](../../../notations/16-assertion.md).
- The requirements assertions are about: [`../elements/01_motivation/requirements/`](../elements/01_motivation/requirements/) and [`notations/15-requirement.md`](../../../notations/15-requirement.md).
- Zone model, admission record, primitive lifecycle: [`notations/CONTRACT.md`](../../../notations/CONTRACT.md) §5–7.
