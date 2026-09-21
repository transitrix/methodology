---
title: Model application hosting and external exchange
status: active
last_reviewed: 2026-09-20
audience: public
license: MIT
---

# Model application hosting and external exchange

Choose the relationship by the fact it records. An application's deployment,
its data exchange with another application, and a person's use of software
are different facts.

| Fact | Current representation | Boundary |
| --- | --- | --- |
| An application consumes infrastructure | `APPLICATION —uses→ TECHNOLOGY_SERVICE ←hosts— NODE` | Each arrow is a first-class `REL`; `hosts` has no APPLICATION endpoint. |
| Two applications exchange data | `INTEGRATION` with APPLICATION `source` and `target` | Both endpoints are software applications, including a real counterparty application. |
| An actor performs work supported by software | PROCESS `participants`, step `performed_by`, and `supported_by_application` | Records participation and software support; does not assert an application-to-actor exchange contract. |

## Hosting and platform consumption

Use a NODE for the infrastructure substrate and a TECHNOLOGY_SERVICE for the
capability it offers. For container hosting, `container_platform` is a NODE
`type`; the service's `type` is `compute`. TECHNOLOGY_SERVICE's closed enum is
`messaging | storage | api_gateway | database | compute`.

The [complete hosting example](../notations/examples/relations/application-hosting/README.md)
contains an application, node, service and both REL files, including admission
and lifecycle fields. It describes a synthetic portal consuming a container
execution service. The relation endpoints are:

```text
APPLICATION-PORTAL-1 —uses→ TECHNOLOGY_SERVICE-EXECUTION-1
NODE-CONTAINERS-1    —hosts→ TECHNOLOGY_SERVICE-EXECUTION-1
```

The REL files live under `canon/relations/`; they are not nested in the NODE
or APPLICATION YAML. A stable single-host service may instead use its defined
`node` field. APPLICATION has no inline `uses[]`, `applications[]`, or
`technology_services[]` field for platform consumption: use the `uses` REL,
even when the dependency is stable. To record a hosting migration, end the old
`hosts` REL's `valid_to` and admit a new one. Keep the application-to-service
REL while the application still consumes that same service.

This pattern records consumption of an execution capability. It does not
identify a deployed binary, container image, replica, deployment event, or
integration carried by that service.

Contracts: [NODE](../notations/elements/25-nodes.md),
[TECHNOLOGY_SERVICE](../notations/elements/26-technology-services.md),
[REL kinds](../notations/elements/17-relations.md) §3 and
[APPLICATION](../notations/ELEMENT_PRIMITIVES.md#77-application--03_applicationapplications).

## External organizations and applications

Suppose the portal sends a report to a partner organization. Establish what
receives it before selecting an element type:

- If a known partner application receives it, model that real software as an
  APPLICATION and the software-to-software exchange as INTEGRATION. The
  organization remains an ACTOR; the application does not replace its identity.
- If a partner representative reads or submits information using the portal,
  a PROCESS can name the ACTOR or ROLE in `participants`, identify the step's
  `performed_by`, and set `supported_by_application` to the portal. This says
  who performs the work and which software supports it.
- If the required fact is specifically “this application sends data to this
  organization,” and no counterparty application is established, the current
  vocabulary has no typed application-to-ACTOR exchange relationship. Preserve
  the observation in descriptive evidence; do not invent an application or
  claim a queryable exchange edge exists.

An ACTOR `type: system` still has an ACTOR identity and is not an APPLICATION
endpoint. `contracting` records engagement between actors; `uses` records
application consumption of technology services. Neither is an exchange edge.
`interface_semantics: true` does not widen INTEGRATION endpoints; both ordinary
and interface INTEGRATIONs require APPLICATION `source` and `target`.

Contracts: [INTEGRATION](../notations/ELEMENT_PRIMITIVES.md#78-integration--03_applicationintegrations-promotable-nested-in-view-in-v1),
[PROCESS](../notations/ELEMENT_PRIMITIVES.md#75-process--02_businessprocesses),
[ACTOR](../notations/elements/19-actors.md) and
[REL](../notations/elements/17-relations.md).

## Semantic gap to evaluate — not an adopted contract

The missing assertion is a named, directional information exchange between an
APPLICATION and an ACTOR acting as a business counterparty, independently of
whether its internal software is known. Participant identity and software
support do not establish that assertion.

A proposal for that assertion must decide whether it belongs to business
interaction or to an application interface. It must define eligible actor
subtypes, sender/recipient direction (including replies), payload and channel,
referenceable identity, evidence, lifecycle, and validation. It must also say
whether the actor is the recipient, an operator, or the owner of a receiving
application; those meanings cannot be inferred from one unqualified edge.

The recommended next evaluation is a separate business-exchange contract with
explicit endpoint roles, retaining APPLICATION-only INTEGRATION. Widening
INTEGRATION would change the meaning of existing application-interface queries
and require a compatibility decision. Neither option is approved by this guide;
no new TYPE, REL kind, field, or endpoint permission is introduced. The existing
hosting example can be used independently of that decision.
