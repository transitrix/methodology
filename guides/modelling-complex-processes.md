---
title: Modelling complex processes
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, guide, bpmn, processes]
---

# Modelling complex processes

> A BPMN process with lanes, stages, and KPIs, authored in Transitrix Studio. For the difference between a process diagram and a process landscape map: [`method/04-notations.md`](../method/04-notations.md) §4.

Use Transitrix Studio for BPMN authoring with lanes, stages, and KPIs.

1. Open `<org>/.templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml`.
2. Define lanes (one per organisational role or actor).
3. Decompose the process into stages.
4. Describe steps with explicit data flow (`required_data`, `output_data`).
5. Add quality gates and decision gateways.
6. Define KPIs with calculation references to step ids.
7. Render with Studio; export SVG / PNG for documentation.

---

**Last reviewed:** 2026-08-16. Moved here from `method/01-methodology.md` §12.3.
