# Diagnostic compatibility — methodology 6.0 → 7.0

This migration contract is for catalogue maintainers and validator implementers.
The target **7.0.0** is unreleased; this document does not change the current
release or any manifest pin. It defines the next-major boundary for the ACTION
numeric restrictions in [24-action.md](../../notations/elements/24-action.md)
§6–6.1. Adding diagnostic identities for already-invalid structures does not
itself change their validity. Rejecting previously accepted numbers does.

## Compatibility and migration

Through 6.x, ACTION `score` is an integer without a published lower bound;
cost and effort fields are numbers without a published lower bound. From 7.0.0,
negative `duration`, `duration_days`, `labor_cost`, `resources_cost`, `effort`,
and `score` produce `ACTION-011` errors. Zero remains valid, fractions remain
valid for the number fields, and fractional scores remain schema errors.
`sort` is not covered. Existing `duration_days` inputs remain supported; neither
that alias nor the accepted `Strategic Initiative` value is removed here.

Before upgrading:

1. Preserve the catalogue revision and original diagnostic output, including
   the validator version. Check the six named fields on canonical and supported
   inline ACTION records. Do not apply the check to every numeric field.
2. Review each negative value with its author. Correct genuine data errors from
   evidence. If a negative score or cost intentionally conveys a signed measure,
   preserve that meaning in an appropriately named `extensions` field and remove
   or replace the canonical value only after review. Do not clamp, take absolute
   values, or silently discard the source value.
3. Reconcile `duration_days` with `duration` in the declared schedule units.
   Where both are supplied, preserve the original values in the review record,
   choose the intended canonical duration, and remove the redundant alias only
   after confirming equivalence. No automatic conversion is safe without units.
4. Validate against the target contract, review visible warnings and unsupported
   forms, and update the manifest only when adopting a released 7.0.0 validator
   and methodology. The per-file `spec_version` is informational, not a switch
   enabling new errors in an older catalogue.

## Historical emissions and normalisation

The following profile covers **canonical ACTION emissions in Studio source
revision `4b39c67b790d92c542286934c5275d8e2f4d8f47`**, not
alternative meanings for the schedule-view codes. A historical record must
retain its original fields. Only a record with the named source revision and
canonical ACTION element context may acquire the indicated successor as an
additional normalised field. Other versions require their own explicit mapping.

| Legacy canonical ACTION emission | Successor | Severity | Meaning |
|---|---|---|---|
| `ACT-005` | `ACTION-007` | warning | Unresolved parent or predecessor |
| `ACT-006` | `ACTION-008` | error | Predecessor cycle |
| `ACT-007` | `ACTION-009` | error | Self predecessor |
| `ACT-008` | `ACTION-010` | error | Invalid/reversed planned dates |
| `ACT-009` | `ACTION-011` | error | Negative value in the six named numeric fields |

In the published schedule specification, `ACT-005` remains an **error** for an unresolved scoped GOAL;
`ACT-006` an invalid type filter; `ACT-007` invalid/duplicate working days;
`ACT-008` invalid holiday dates; and `ACT-009` the missing schedule-anchor
**warning**. Their complete table, including scheduling advisories, remains in
[07-action.md §6](../../notations/views/diagrams/07-action.md#6-validation-rules).
`ACTION-006` stays reserved and inactive.

Do not confuse that normative table with the observed schedule implementation at
`4b39c67b790d92c542286934c5275d8e2f4d8f47`: it emits `ACT-009` as a numeric
**error**, and `ACT-019` for the missing-anchor **warning**. That numeric emission
is a collision requiring a tooling correction, not a new meaning for the published
`ACT-009`. The canonical mapping above cannot be applied to schedule records.

`CODEX-003` remains retired: its historical codex v0.1 meaning was typed-ID
resolution inside `applies_to`. It must not be globally aliased to `CODEX-002`.
A tool's incorrect use of it for missing jurisdiction/effective date is corrected
to `CODEX-002` only when the stored context identifies that missing-field check.

## Positive and rejecting examples

Each row is a mutation of an otherwise valid document in the named form;
“passes” means this rule does not fire, not that all catalogue checks pass.
Consumers can use these pairs to check diagnostic meaning independently of code
spelling. All errors must identify the affected field; warnings remain visible.

| Rule | Positive example | Rejecting / advisory example |
|---|---|---|
| `ACTION-007` | Omitted root parent; predecessor resolves in catalogue | `parent: ACTION-MISSING-1` with no such ACTION → warning |
| `ACTION-008` | ACTION-1 precedes ACTION-2 only | ACTION-1 and ACTION-2 each name the other as predecessor → error |
| `ACTION-009` | ACTION-1 has `predecessors: []` | ACTION-1 has `predecessors: [ACTION-1]` → error |
| `ACTION-010` | Both dates `2026-09-24`; either date absent | `2026-02-30`, or end `2026-09-23` before start `2026-09-24` → error |
| `ACTION-011` | Each of the six fields separately set to `0`; number fields `0.5`; score `2` | Each field separately set to `-1` → error in 7.0.0; negative score/cost not newly rejected on 6.x pins |
| `SCHEMA_INVALID` | ACTION `score: 2`, `predecessors: []` | `score: 2.5`, `score: "2"`, or `predecessors: {}` → error with notation and field/type context |
| `CODEX-002` | REGULATION has jurisdiction and effective date | Omit either required field → error; never retired `CODEX-003` |
| `AC-001` | Object `action_card` with valid metadata | Remove `action_card` → error |
| `AC-002` | `action_card.id: ACTION_CARD-1` | Remove only `action_card.id`, or set it to an invalid ID → error |
| `APP-002` | Inline `applications_catalogue` has required metadata and `applications: []` | Remove catalogue or replace applications array with an object → error |
| `CMAP-002` | Inline `capability_map` has required metadata and `capabilities: []` | Remove map or replace capabilities array with an object → error |
| `FGCA-004` | Inline arrays of objects, including `goals: []` with no dangling references; changes omitted with changes layer off | Inline `goals: {}` or missing goals → error; nonempty enforcement belongs to `DGCA-004`, not this shape code |
| `PMAP-002` | Inline `process_map: {id: PMAP-1, name: Example, updated_at: "2026-09-24", groups: []}` | Remove `process_map`, or replace `groups` with an object → error; not a products rule |
| `SCN-002` | Historical inline `scenario: {id: SCENARIO-1, name: Example, status: Draft}` | Omit `scenario`, its `id`, `name` or `status` → error; not a projection configuration rule |
| `GAP-REQ-NO-ASSERT` | ASSERTION.about targets the REQUIREMENT | No targeting ASSERTION, even with a VERIFICATION → advisory warning, not noncompliance |

The gap report may also observe absent targeting assertions for CONSTRAINTs,
but must state that ASSERTION does not support those targets in v1. It must not
require creating an invalid assertion. Shape rows describe only their owning
supported forms. Any unsupported form remains explicitly unvalidated, with
`NOTATION-SKIP-001` and strict-mode failure under CONTRACT §18; neither migration
nor code normalisation can turn it into a clean validation result.


## Known implementation gaps at the compared revision

The source revision above and its locally packaged CLI 2.9.4 / diagrams 1.13.3
were compared with the example mutations. These observations are revision-bound;
they are not claims about a subsequently published or installed validator.

- Canonical ACTION still emits the legacy codes above. Negative score/cost is
  rejected even under a 6.0.0 pin; the specified 7.0.0 compatibility boundary is
  not implemented. Fractional/string scores and object-valued predecessors pass
  the canonical path without the required schema finding. Schedule validation
  accepts fractional scores, rejects string scores with the colliding `ACT-009`,
  and can fail on object-valued predecessors without a JSON diagnostic.
- `duration ?? duration_days` determines scheduling precedence, but both fields
  are independently checked. Different positive values coexist; a negative alias
  still fails beside a positive canonical value. No equality or integer check may
  be inferred from the absence of a finding.
- Missing codex jurisdiction/effective date still emits retired `CODEX-003`;
  correction to `CODEX-002` remains required.
- Inline DGCA empty arrays pass the historical `FGCA-004` shape check. A dangling
  reference may independently fail `FGCA-011`; remove it when testing emptiness
  alone. This does not satisfy the stronger `DGCA-004` nonempty requirement.
- Products catalogue shape failures emit `PROD-002`, not `PMAP-002`. That runtime
  predicate is broader than the published products `PROD-002` ID rule. Keep the
  discrepancy explicit rather than silently redefining the published identity.
- Products and scenarios projection documents are sent through inline predicates
  in the compared runtime. They fail for absent `products_catalogue` or `scenario`
  instead of receiving the required unsupported-form report. `SCN-002` must not be
  described as evidence that projection `view.name` was checked.

These gaps require validator follow-through. The contract and examples do not
claim runtime conformance, and a source merge alone does not close the gaps.
