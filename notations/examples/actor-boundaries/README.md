# Query actor classifications relative to an operational boundary

This standalone **synthetic example** accompanies the
[actor-boundary guide](../../../guides/modelling-actor-boundaries.md). Every
actor has `example: true`; admission and basis text are illustrative, not real
organizational evidence. The manifest pins the model contract; it does not
claim a release of this convention or query tool.

## Local convention: operational-perimeter-v1

All extension keys below are example-specific. [CONTRACT §12](../../CONTRACT.md#12-extensions--open-attribute-bag)
accepts their contents without validating their meaning.

| Location under `extensions` | Local meaning |
| --- | --- |
| `example_boundary.scheme` | Exactly `operational-perimeter-v1`. |
| `example_boundary.definition` | Nonempty description of the operational perimeter represented by this business-unit ACTOR. |
| `example_boundary_membership.scheme` | Same scheme/version as the referenced boundary. |
| `example_boundary_membership.assessments[]` | Explicit, dated assessments about this host ACTOR. |
| `assessments[].boundary_ref` | ID resolving to a business-unit ACTOR with `example_boundary` in this catalogue. No cross-catalogue lookup or ORGANIZATION registry. |
| `assessments[].classification` | `internal`, `external`, or `unknown` relative to that boundary only. |
| `assessments[].from_date`, `until_date` | Quoted dates, inclusive start and exclusive end; null end is open. Nonempty intervals wholly within both actor lifetimes. |
| `assessments[].basis` | Nonempty assessment basis; synthetic prose here. Adopters define their own evidence/reference contract. |

For this query, host lifetimes are also interpreted as start-inclusive and
end-exclusive. Same-actor/same-boundary intervals cannot overlap, even when
they agree. Different boundaries may have simultaneous assessments. Adjacent
intervals allow a change without ending the actor. A gap is unassessed, not a
carry-forward of the previous value. There is no inference, transitivity,
self-membership default or priority rule. An inactive actor is omitted; an
inactive or missing query boundary is an error. Invalid references, mixed
real/example references and malformed assessments fail before querying.

## Run the query

Requires Python 3 and PyYAML. From the repository root:

```sh
python3 notations/examples/actor-boundaries/query.py ACTOR-GROUP-1 2026-06-01
python3 notations/examples/actor-boundaries/query.py ACTOR-SUBSIDIARY-1 2026-06-01
python3 notations/examples/actor-boundaries/query.py ACTOR-SUBSIDIARY-1 2026-07-01
```

Each query prints all effective actors as tab-separated ID, classification,
and assessment status. The shared-service unit's rows are respectively:

```text
ACTOR-SERVICES-1  internal  recorded
ACTOR-SERVICES-1  external  recorded
ACTOR-SERVICES-1  unknown   recorded
```

The council is `unknown / recorded` for the group and `unknown / unassessed`
for the subsidiary. The group and subsidiary actors themselves are unassessed;
a boundary definition alone does not classify its host. To list only external
actors, filter the second column for `external` after a successful query; retain
unknowns in a separate report rather than silently treating them as internal.

`query.py` first checks this entire local convention, then selects the explicit
assessment effective on the requested date. It is a small reusable example
for modellers, **not a whole-model validator**. It does not verify real evidence,
legal status, all admission rules, or all core field sets.

## Validate in separate layers

Run the repository's documentation checks and the published CLI independently:

```sh
node scripts/check-notations.mjs
npx --yes @transitrix/cli@2.9.2 validate --scope=repo --root notations/examples/actor-boundaries --json
```

CLI acceptance is bounded to its implemented core checks. A bad extension
reference or classification can still pass core validation; the local query
must reject it. Run both layers, and report the CLI version and coverage
findings separately from the local query result. Neither result establishes
release, real admission, or independent-reader acceptance.
