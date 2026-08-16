---
title: Transitrix — foundations
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, methodology, foundations, enterprise_architecture, architecture_as_code]
---

# Foundations

> What Transitrix is, why it exists, how a to-be architecture is obtained, and what standards it stands on.

## 1. What this is

Transitrix is an open methodology for representing and managing enterprise architecture as **text-native, version-controlled artefacts**. Models, processes, capabilities, goals, and architectural relations live as YAML files in Git. Diagrams, reports, and dashboards are derived from those files automatically.

It is built for organisations that want to:

- **Move at the speed of code** — architectural change goes through pull requests, code review, and CI, not through workshops and PowerPoint.
- **Treat architecture as a living model** — strategy, structure, and execution plans share one source of truth that is read and written by both people and automated agents.
- **Reduce ceremony without losing rigour** — the methodology adopts ArchiMate 3.2 semantics where they bring value, and skips heavyweight artefacts that don't earn their cost.

Transitrix is designed for environments where leadership wants tight feedback loops between strategic intent and operational delivery — and is willing to manage their enterprise the way good engineering teams manage their software.

## 2. How the to-be is obtained

A frequent challenge to any as-is/to-be method: interviews cannot produce a finished target architecture, because an organisation does not hold its own end state ready to be drawn out. Transitrix's stance is that the to-be is **synthesized, not elicited and not merely copied** — from two inputs, split on a problem-space / solution-space cut.

**Strategic intent of the organisation** (problem space — direction and binding requirements):

- Goals, drivers, and desired outcomes.
- Legal and regulatory requirements, including regulatory and compliance standards (e.g. GDPR, Basel, FDA).
- Stakeholder needs and concerns.
- Market forces and competitive pressure.
- Business constraints — budget, time, risk appetite.

Elicited as goals, drivers, and constraints — modelled in the motivation layer as `GOAL`, `DRIVER`, `CONSTRAINT`, `REQUIREMENT` ([`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) §3.1) — **never as a finished target architecture**.

**The architect's decision** (solution space — synthesis within feasibility):

- Reference frameworks (ITIL, BIAN, SCOR, APQC PCF, BIZBOK, …).
- Technological constraints — existing landscape, platform limits, feasibility.
- Technical standards (e.g. OpenAPI, ISO technical specs).
- Architectural patterns and trade-offs.
- The as-is state, as a transition constraint.

A reference framework is a generic model — it states the *standard of good*, not the priorities for *this* organisation. The architect weighs it, adapts it, and decides; a framework is an input to the synthesis, never a substitute for it.

**The allocation principle.** The client is the source of intent and constraints, never of the solution. Reference frameworks are the source of the standard of good, never of the priorities. The specific target is the architect's synthesis of intent and standard, adapted to this organisation. Regulatory/compliance standards bind at the business level and belong to intent; technical standards are solution-space inputs and belong to the architect's decision — a considered split, not an oversight.

This dissolves a common false binary between "the client knows the target" and "the framework dictates the target." Asking a client to draw their future architecture is naive elicitation of the *solution*. Asking for goals, drivers, and constraints is legitimate elicitation of *intent*. The two acts are not the same, and only the second one works.

**In the model.** The synthesized target is captured as a `TARGET_STATE` ([`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) §3.1; [`ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §7.18) — the structural snapshot an architect varies when offering solution options — reached from the baseline state (`type: base`) via one or more `SCENARIO` paths (`ELEMENT_PRIMITIVES.md` §7.19). Motivation-layer intent (`GOAL`, `DRIVER`, `CONSTRAINT`, `REQUIREMENT`) is modelled independently of any target state; a `TARGET_STATE` records which goals it satisfies, never the reverse. The model never stores "the client's architecture" — only the intent and the architect's resulting synthesis.

## 3. Four core principles

Transitrix rests on four pillars. Every design decision in the methodology can be traced back to one of them.

### 3.1 Single source of truth

The architectural model lives in Git as YAML files. Every diagram, dashboard, report, and integration is derived from those files. There is one place to change a fact about the enterprise — and one history that records every change.

### 3.2 Scannability

A reader must be able to open any model file in a terminal or text editor and understand what it describes — without specialised software. Files are short, named conventionally, structured predictably, and human-friendly.

### 3.3 Automation and validation

The integrity of the model is a property of the repository, not of any individual reviewer. Linters, schema validators, and fitness-function checks run on every commit. Broken references, missing owners, layer-violation relationships, and policy gaps are flagged automatically.

### 3.4 Atomic decomposition

Objects (elements) and connections (relations) live in separate files. This keeps Git diffs readable, makes graph analysis tractable, and prevents the file structure from leaking implementation details into the methodology. One concept, one file, one place to change it.

## 4. Standards Transitrix builds on

Transitrix does not invent semantics where they already exist. It builds on:

- **ArchiMate 3.2** (The Open Group) — for the architectural element vocabulary across motivation, business, application, and technology layers. The full TYPE registry and ID grammar: [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md).
- **BPMN 2.0** (OMG) — for business process diagrams. Compiled from a YAML DSL, not authored on a canvas.
- **Capability Maturity Model (CMM)** — for maturity assessment of capabilities (5 levels: Initial → Repeatable → Defined → Managed → Optimised).

Transitrix adds value at the layer above these standards: how the model is **stored**, **versioned**, **validated**, **rendered**, and **acted upon** by both humans and software agents.

---

**Next:** [`02-repository.md`](02-repository.md) — how a repository following this methodology is laid out.

**Last reviewed:** 2026-08-16. Split from the former `01-methodology.md` — see [`method/01-methodology.md`](01-methodology.md) for the redirect.
**Status:** Active.
