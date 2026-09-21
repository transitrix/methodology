---
title: Model actor legal identity
status: active
last_reviewed: 2026-09-21
audience: public
license: MIT
---

# Model actor legal identity

Use an [ACTOR](../notations/elements/19-actors.md) with `type: business_unit`
for a company, subsidiary, internal unit or cross-functional body that has an
identity in the model. Record an assessment of separate legal personality
independently from whether that actor is internal or external to a named
operational boundary. Neither the actor's name nor `business_unit` answers
either question.

The [synthetic catalogue](../notations/examples/actor-legal-identity/README.md)
demonstrates all four identities using existing core semantics and an optional
local extension. It is modelling guidance, not a legal determination or a new
standardized field contract.

## Choose the existing concept

| Concept | What it represents | Legal-identity limit |
| --- | --- | --- |
| `ACTOR(type: business_unit)` | An identity that exists and performs work; the actor reference already includes a company example. | No core legal-personality discriminator. A unit and a company use the same TYPE. |
| `ORGANIZATION` | The catalogue's own name, mission, vision and background, with at least one of mission/vision and at most one effective record at a time. | Not a registry of legal entities, subsidiaries or arbitrary boundaries. Do not create one per company in a shared catalogue. |
| `ROLE` | A responsibility or position an actor fills. | Does not identify the legal entity filling it. |
| `REL(type: unit_parent)` | Time-aware organizational hierarchy between business-unit actors. | Does not assert share ownership, incorporation or separate legal personality. |
| `employment` / `contracting` relations | A recorded engagement between actors. | Do not establish universal internal/external scope or legal status. |
| `external_ref` | An external identifier or URL for the actor. | Neither an externality flag nor proof of registration or legal personality. |
| `extensions` | Source-derived attributes absent from the core schema. | Preserves an assessment, but core validators do not validate its meaning or evidence. |

These boundaries come from [element primitives](../notations/ELEMENT_PRIMITIVES.md)
§7.10 and §7.31, the [relation reference](../notations/elements/17-relations.md),
and [CONTRACT §12](../notations/CONTRACT.md#12-extensions--open-attribute-bag).
No new TYPE, core field or relation is needed to preserve the four example
identities and their recorded assessments.

## Record what is known, including unknowns

Keep one ACTOR per identity. In the example, `extensions.example_legal_identity`
holds the local scheme `legal-identity-assessment-v1`, an explicit status,
an assessment date and a basis. The three statuses are `legal_entity`,
`not_legal_entity` and `unknown`. They record what the model asserts about
separate legal personality, not registration progress or operational membership.

A negative assessment needs an explicit basis just as a positive one does.
Missing documents, an unfamiliar name or an absent registration identifier do
not justify `not_legal_entity`. An explicit `unknown` preserves an unresolved
assessment; an absent extension means unassessed. Reports may group both under
unknown, but must retain that distinction and must never coerce either to false.
Conflicting evidence stays unresolved until an accountable assessment is made.

The assessment date records when the assertion was made. It is not an
incorporation date, an effective interval or a freshness guarantee. The extension
shares its actor's admission and lifecycle; it supplies no independent admission
or history mechanism. If historical legal assessments are needed, agree how to
record effective dates, conflicting evidence and supersession before querying
them. Do not assume a current snapshot establishes past or future legal status.

Keep boundary assessments separate and explicit. The synthetic subsidiary is a
legal entity and internal to the group perimeter. The shared-service unit has no
separate legal personality and is simultaneously internal to the group and
external to the subsidiary perimeter. Its later boundary change to unknown
does not change its legal assessment. The council has unknown legal status;
its cross-functional composition is insufficient evidence to decide it.

## Validation and the remaining semantic boundary

Validate the core catalogue and the local extension convention separately, as
shown in the example. Core acceptance cannot establish a legal conclusion, and
even a correctly shaped local assessment requires an appropriate real source
and review when used outside the synthetic example.

The smallest remaining gap is a **portable, core-validated legal-identity
assessment contract**: consumers currently must agree their own status,
evidence, time and conflict rules. Standardizing such a contract requires a
separate semantic decision; this guide does not propose or approve new fields.
The local extension is sufficient for preserving these example assertions.

Registration identifiers and jurisdiction are outside this example. If needed,
evaluate them as separately sourced, scoped and dated attributes rather than
inferring them from the actor name or legal status. Registry integration,
ownership modelling and legal verification are separate requirements.
