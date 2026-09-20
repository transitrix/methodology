# Shared business process

A complete synthetic catalogue for modellers who need several participants in one
referenceable business process. All people, assignments and admission records are
illustrative. Copy the directory as a standalone catalogue, then replace the
fictional facts and run your own admission gates.

## Identity, responsibility and behaviour

| Record | Meaning in this example |
| --- | --- |
| `ACTOR-REVIEWER-1`, `ACTOR-APPROVER-1` | Two fictional people: Morgan Example and Taylor Example. |
| `ACTOR-SERVICE-UNIT-1` | The business unit employing them. |
| `ROLE-REVIEWER-1`, `ROLE-APPROVER-1` | Responsibilities that persist independently of their current holders. |
| `REL-EMPLOYMENT-REVIEWER-1`, `REL-EMPLOYMENT-APPROVER-1` | Dated person-to-unit employment, with `roles` recording each assignment. |
| `PROCESS-REQUEST-REVIEW-1` | One identified behaviour: check a request, then record its approval or rejection. |
| `PROCESS-NEW-SERVICE-1`, `PROCESS-SERVICE-RENEWAL-1` | Overview processes that share the same review phase. |
| The two `REL-REVIEW-PARENT-…` records | `process_parent` edges from that phase to each parent. |

The [review process](canon/elements/02_business/processes/PROCESS-REQUEST-REVIEW-1.yaml)
contains the entire bounded flow, two participants and one `performed_by` reference
per step. `owner_role` identifies accountability for the whole process; it does not
make that role the performer of every step. Both an approved and a rejected request
finish the review; fulfilment after approval is outside this phase.

The process uses role participants so changing a role holder changes the employment
REL, without changing the process's responsibilities. A PROCESS may instead name an
admitted ACTOR directly when the behaviour concerns that identity. Merely listing a
ROLE and ACTOR together does not assign one to the other. See
[ACTOR and ROLE](../../elements/19-actors.md) and
[PROCESS](../../ELEMENT_PRIMITIVES.md#75-process--02_businessprocesses).

## Referencing shared behaviour

Both parents reference **the same** `PROCESS-REQUEST-REVIEW-1`, through separate
[process_parent relations](../../elements/17-relations.md). To find its parents,
select relations with `type: process_parent` and `from: PROCESS-REQUEST-REVIEW-1`,
then resolve their `to` IDs. To find a parent's phases, reverse the query. Both
links are concurrently effective from `2026-01-01` in this synthetic catalogue.

These relations express decomposition, not invocation, sequencing or execution
instances. The parent records are intentionally overview definitions without a
flow; they do not specify when to call the child or how to continue afterwards.
The shared phase's four steps are canonical by containment. No other record
references an individual step, so no standalone STEP record is needed. Promote a
step before a second document references it, following
[the STEP contract](../../ELEMENT_PRIMITIVES.md#721-step--02_businesssteps-promoted-contained-in-process-in-v1).

## Several participants does not mean joint performance

This process describes a handoff: the reviewer recommends, then the approver
decides. It does not assert that both people perform either task together.
Parallel tasks and a joining gateway would express separate concurrent work and
synchronisation; they would still not establish a single indivisible joint act.

A collective identity would additionally need a referenceable group and explicit
membership semantics. An ordinary `ACTOR(type: business_unit)` is appropriate
when the thing really is a business unit, but a process participant list does not
create that identity, define its membership, or make it the joint performer.

**Gap proposal for evaluation, not an approved schema:** consider a fictional
agreement that is valid only when two designated parties perform one acceptance
together. Consumers would need to distinguish this from either party acting
alone, from two sequential approvals, and from independent parallel approvals.
A candidate contract would have to define the participant set, whether all or a
specified subset must act, how membership and role assignments are evaluated at
the relevant time, the identity of the shared act, and the evidence that makes
one execution complete. A separate collective-identity requirement would need
membership and lifecycle rules of its own.

The decision to return is whether that stronger joint-performance requirement is
needed beyond the existing multi-participant PROCESS contract. If so, commission
a bounded semantic design with positive and negative examples for those four
cases, temporal membership changes and missing participant evidence. The current
scalar `performed_by` must not be changed to a list as a shortcut. This example
introduces neither BUSINESS_COLLABORATION nor BUSINESS_INTERACTION, new REL kinds,
or multi-pool BPMN. The current BPMN projection remains one pool with lanes.

## Validate before adapting

Run repository validation from the Methodology repository root:

```sh
npx @transitrix/cli validate --scope=repo --root notations/examples/shared-business-process --json
```

The manifest declares a separate catalogue boundary. Check every record's
admission and lifecycle against the [common envelope](../../ELEMENT_PRIMITIVES.md#3-the-canonical-envelope),
and the flow against the [PROCESS schema](../../ELEMENT_PRIMITIVES.md#75-process--02_businessprocesses):
unique canonical step IDs, legal node types, one existing participant per step,
resolving sequence endpoints and a complete start-to-end path. Check role
assignments and typed relation endpoints against the [relation contract](../../elements/17-relations.md).

CLI 2.9.2 repository validation does not enforce all canonical PROCESS flow fields;
a passing report alone is insufficient. In particular, check performer membership
sequence endpoints and employment role references explicitly. Single-file diagram validation is not a
substitute for checking the canonical PROCESS record. The admission values here
are synthetic, not evidence of real operational performance or joint acceptance.
