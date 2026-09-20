# Legal identity independently of operational boundaries

This standalone **synthetic example** accompanies the
[legal-identity guide](../../../guides/modelling-actor-legal-identity.md).
All four actors carry `example: true`. Their admission records, charters,
founding records and assessments are invented; no real entity or registry was
consulted. The manifest pins the core model contract, not a release of either
extension convention.

## Four identities, two independent questions

The following is the recorded example at 2026-06-01:

| ACTOR suffix | Identity | Legal assessment | Group perimeter | Subsidiary perimeter |
| --- | --- | --- | --- | --- |
| `GROUP-1` | Example Group | `legal_entity` | Unassessed | Unassessed |
| `SUBSIDIARY-1` | Example Subsidiary | `legal_entity` | Internal | Unassessed |
| `SERVICES-1` | Example Shared Services, an internal unit | `not_legal_entity` | Internal | External |
| `COUNCIL-1` | Example Review Council, a cross-functional body | `unknown` | Unknown, recorded | Unassessed |

All use `type: business_unit`. The subsidiary is a separate legal entity in
this fiction; its internal group classification does not negate that. The
shared-service unit's external classification relative to the subsidiary does
not make it a legal entity. From 2026-07-01, that one boundary assessment becomes
unknown; its dated legal assessment remains a separate snapshot. A boundary
definition does not automatically classify its host actor as internal.

These are reusable group, subsidiary, shared-service and council identities.
Each standalone example catalogue has its own manifest and scope. When combining
examples, reconcile assessments on the existing ACTOR IDs rather than copying
duplicate identity files into one catalogue. No hierarchy or ownership relation
is inferred from the name “subsidiary.”

## Local extension conventions

Every key below is an example convention, accepted without semantic validation
by [CONTRACT §12](../../CONTRACT.md#12-extensions--open-attribute-bag).

`extensions.example_legal_identity` contains exactly:

| Key | Local rule |
| --- | --- |
| `scheme` | `legal-identity-assessment-v1`. |
| `status` | `legal_entity`, `not_legal_entity`, or `unknown`; never a Boolean or null. |
| `assessed_on` | Quoted ISO date within the host actor's lifetime. An assessment date, not legal validity dates. |
| `basis` | Nonempty text explaining the assessment and its source; invented evidence here. |

An absent extension is unassessed, not negative. A malformed extension is an
error, not unknown. Do not use truthiness or `get(..., False)` to classify it:
select positives only by `status == "legal_entity"`, negatives only by
`status == "not_legal_entity"`, and retain recorded unknowns and unassessed
actors separately. The three states do not assert registry verification.

The separate `operational-perimeter-v1` convention uses
`extensions.example_boundary` with a `scheme` and nonempty `definition` on
boundary actors. `extensions.example_boundary_membership` holds the same
`scheme` and an `assessments` list. Each assessment has `boundary_ref`,
`classification` (`internal`, `external`, `unknown`), `from_date`, `until_date`
and nonempty `basis`. References resolve to boundary-defining business-unit
actors in this catalogue. Intervals are start-inclusive and end-exclusive;
null end is open, all intervals fit both host lifetimes, and same-actor,
same-boundary intervals cannot overlap. Missing assessments and temporal gaps
are unassessed. Different boundaries can disagree; there is no transitivity,
self-membership default, or inference from legal status. The legal snapshot
does not acquire effective dates from these boundary intervals.

## Validate and report evidence separately

From the repository root:

```sh
node scripts/check-notations.mjs
npx --yes @transitrix/cli@2.9.2 validate --scope=repo --root notations/examples/actor-legal-identity --json
```

Core validation checks only implemented model rules. Independently check the
local conventions above, including legal status enums, dates, nonempty bases,
boundary references, interval containment and overlap. Changing a legal status
to `false` or an invalid string can still pass core validation; a local check
must reject it. Changing the council's status to `not_legal_entity` with no
supporting evidence is a substantive error that a shape check cannot settle.

Record source inspection, validation and release separately. This example is
evaluated against the 6.0.0 core contract using CLI 2.9.2; the guide introduces
no standardized legal-identity schema. Successful validation is neither real
legal evidence, an independent-reader exercise nor a publication/release claim.
