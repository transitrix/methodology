---
title: Model internal and external actors relative to a boundary
status: example convention
audience: public
license: MIT
---

# Model internal and external actors relative to a boundary

An actor can be internal to a group and external to a subsidiary at the same
moment. Record which boundary the assessment concerns, its effective dates,
and its basis. Do not make externality an intrinsic Boolean on ACTOR.

## What the existing model says

[ACTOR](../notations/elements/19-actors.md) records identity as `person`,
`business_unit` or `system`. `external_ref` is an identifier or URL, not an
externality flag. Employment, contracting and `unit_parent`
[relations](../notations/elements/17-relations.md) express engagement or
hierarchy. None establishes universal externality, automatic membership of
ancestors, or an inference policy for contractors.

[ORGANIZATION](../notations/ELEMENT_PRIMITIVES.md#731-organization--01_motivationorganizations)
is the catalogue's statement of mission/vision, with at most one effective
record. It is not an arbitrary boundary registry. A catalogue's manifest
boundary defines reference/uniqueness scope; it does not classify its actors
as operationally internal.

## A structured, queryable example

The [complete synthetic catalogue](../notations/examples/actor-boundaries/README.md)
uses ordinary business-unit ACTORs to name a group and a subsidiary, plus a
shared-service unit and a cross-functional council. The first two actors carry
explicit descriptions of the operational perimeters being assessed. Membership
assessments on the other actors pair a boundary reference with `internal`,
`external` or `unknown`, dates, and a basis.

These fields live under the existing
[extensions bag](../notations/CONTRACT.md#12-extensions--open-attribute-bag).
Their names and meanings are an **optional example convention**, not a
standardized schema, new relation type, or core-validated query. The example
query reads explicit assessments; it never infers membership from hierarchy,
employment, contracting, names or legal status. Missing assessment produces
`unknown / unassessed`; recorded `unknown` remains distinguishable.

A local checker resolves references within this catalogue, requires a defined
boundary and rejects ambiguous time windows before answering. A failed check
is an error, not an unknown classification. The README specifies the full
example convention and runnable queries.

## Keep legal identity separate

Legal personality and operational perimeter membership answer different
questions. The subsidiary, internal service unit and council can all be
`ACTOR(type: business_unit)` without that discriminator settling legal status.
This example asserts no legal status and performs no legal verification.
A separate legal-identity convention can use the same actor IDs while retaining
its own evidence, unknown state and acceptance; neither assessment derives the
other. Do not represent unknown legal status as false, or block a boundary
assessment while a separate legal classification is being evaluated.

## Adoption and decision boundary

An adopter must agree its perimeter definition, assessment authority, evidence,
review cadence and treatment of expired assessments. Replace the synthetic
basis with actual supporting references before recording real facts; example
admission records do not establish organizational evidence. The extension
inherits its ACTOR's admission and lifecycle. Its nested dates are local
assessment data, not independently admitted elements or core history sidecars.

The bounded example needs no new core semantics. Standardizing its shape,
allowing abstract/non-actor boundaries, deriving classifications from relation
paths, or making these checks core validator rules requires a separate semantic
decision. Specify the smallest failing case, reference domain, time/conflict
policy and desired inference before proposing a field, TYPE or rule. Until
then, passing core validation establishes neither those policies nor support
in a released reporting tool.
