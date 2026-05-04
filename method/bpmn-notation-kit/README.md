# BPMN Process YAML Notation — Self-contained Kit

This folder contains everything an author or AI agent needs to write valid process diagrams in our text-first BPMN notation. Drop the folder into any project and the notation can be used immediately, without external dependencies on this repository.

## What this notation is

Process diagrams are written as **YAML** and compile to standards-compliant **BPMN 2.0 XML** (OMG `formal/2013-12-09`). The YAML describes one pool with one or more lanes, typed elements inside lanes, and named sequence flows between them. Coordinates and visual styling are not part of the notation — layout is computed deterministically by the compiler.

File extension: **`.bpmn.yaml`**.

The compiled output is consumable by any BPMN 2.0–conformant tool (Camunda Modeler, bpmn.io, Signavio, etc.).

## Files in this kit

| File | Purpose |
|---|---|
| [`notation.md`](notation.md) | The language reference — top-level structure, allowed element types, sequence flows, identifier rules, examples. **Start here.** |
| [`rules.md`](rules.md) | Catalogue of BPMN 2.0 semantic rules enforced by the validator (errors that block compilation) and anti-patterns (warnings). |
| [`glossary.md`](glossary.md) | Domain terms used throughout the kit (BPMN, pool, lane, sequence flow, gateway, etc.). |
| [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json) | JSON Schema (draft-07) for machine-readable validation of `.bpmn.yaml` files. Use with AJV or any JSON Schema validator. |
| [`examples/minimal.bpmn.yaml`](examples/minimal.bpmn.yaml) | Smallest valid process: start → end. |
| [`examples/approval.bpmn.yaml`](examples/approval.bpmn.yaml) | Single-lane process with an XOR decision and a default branch. |
| [`examples/release-pipeline.bpmn.yaml`](examples/release-pipeline.bpmn.yaml) | Multi-lane pipeline with cross-lane flows and parallel split/join. |

## Quick start for an AI agent

When asked to write or edit a `.bpmn.yaml` file:

1. Read [`notation.md`](notation.md) Sections 3–9 for syntax (structure, elements, flows, identifiers).
2. Check [`rules.md`](rules.md) for what is allowed/forbidden semantically.
3. Use [`examples/`](examples) as templates — each example is a working diagram.
4. Validate authored YAML against [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json) before delivery.
5. When unsure about a term (e.g., "swimlane axis", "exclusive gateway"), check [`glossary.md`](glossary.md).

## Quick start for a human author

1. Copy one of the examples that resembles your target process.
2. Rename element ids and adjust the `flows` list.
3. Run validation (see your project's compile command, e.g., `cervin compile <file> <out.bpmn>`).
4. Open the resulting `.bpmn` in any BPMN viewer (e.g., bpmn.io online viewer).

## Scope and constraints

The notation supports a focused subset of BPMN 2.0:

- **One pool per document** (single participant).
- **Element types:** `startEvent`, `endEvent`, `task`, `userTask`, `serviceTask`, `exclusiveGateway`, `parallelGateway`.
- **Sequence flows** with optional condition expressions and a default flag.

Out of scope (see [`notation.md`](notation.md) Section 12 for the full list): multi-pool collaborations, sub-processes, message/timer/signal events, boundary events, message flows, data objects, inclusive/event-based gateways, lane sets, annotations, extensionElements.

This narrowing is deliberate: the supported subset maps cleanly to text and produces unambiguous diagrams without manual graphical editing.

## Versioning

The notation is currently at version **1.0** (frozen 2026-05-04).

Backward-incompatible changes (renaming or removing fields, tightening identifier rules, removing element types) require a major version bump.

## License

This kit is distributed under the same license as the source project (MIT unless stated otherwise where you obtained it).
