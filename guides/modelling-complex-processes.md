---
title: Modelling complex processes
status: active
last_reviewed: 2026-09-20
audience: public
license: MIT
---

# Modelling complex processes

Start with the behaviour the organisation needs to describe, then select a view that makes it readable.

1. Admit the `PROCESS` and author its canonical `flow`, including the steps, transitions and participating ACTORs/ROLEs and supporting applications. Follow the [BPMN specification's canonical source contract](../notations/views/diagrams/01-bpmn.md); a BPMN view projects this behaviour and must not become an independently maintained process definition.
2. Use one pool with lanes to explain participants; multi-pool collaboration is outside the current schema. Resolve actor, role and supporting-application references against canon. The [advanced BPMN starter](../transitrix/skills/onboard/templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml) illustrates a multi-lane projection with branches and a rework loop; replace the example identities and align it with your canonical flow before use.
3. For stage goals, results and the systems, actors, equipment or business objects involved, use the separate process-blueprint notation described in the [notation kit](../method/04-notations.md). Keep those statements in their owning notation. Do not invent `required_data`, `output_data` or KPI calculation fields on BPMN nodes: BPMN data inputs/outputs and data associations are outside the current projection schema.
4. If performance measurement is needed, define the relevant canonical metrics and their evidence under [element primitives](../notations/ELEMENT_PRIMITIVES.md). A diagram label does not establish a measured KPI or its calculation.
5. Review every branch, termination and rework route against the intended process. Split an unreadable view into overview and detail views without changing the underlying behaviour.

Completion means the canonical process and references validate, the projection agrees with them, and the intended reader can follow the paths. Rendering alone tests none of the business assumptions. Check the capabilities of the renderer you actually use; this guide does not certify an installed Studio version.

For a complete admitted synthetic catalogue, use the [shared business-process example](../notations/examples/shared-business-process/README.md). It separates identity (ACTOR), responsibility (ROLE), assignment (engagement REL) and behaviour (PROCESS), and references one review phase from two parents. Several participants do not establish a collective identity or an indivisible jointly performed interaction; the example states the remaining semantic question without extending the vocabulary.
