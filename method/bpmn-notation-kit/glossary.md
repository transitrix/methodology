# Glossary

Domain terms used throughout the notation kit. English-primary; concise definitions focused on what the term means in this notation.

| Term | Definition |
|---|---|
| **Activity** | A unit of work in the process. In this notation: `task`, `userTask`, or `serviceTask`. The three subtypes differ visually but share the same routing semantics (each must have at least one incoming and one outgoing flow). |
| **Anti-pattern** | A structure that is technically valid per BPMN 2.0 but suspicious in practice. The validator emits a warning, not an error. Examples: floating element, missing default flow on a conditional split, implicit join. |
| **AJV** | "Another JSON Validator" — a fast JSON Schema validator used to enforce the YAML structure against [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json). Any draft-07–compatible validator works. |
| **BPMN** | Business Process Model and Notation — an OMG standard for business process diagrams. The notation in this kit produces valid BPMN 2.0 XML output (`formal/2013-12-09`). |
| **BPMN 2.0 XML** | The standardised XML serialisation of a BPMN diagram. Contains both a semantic section (process elements with flows and refs) and a `bpmndi:` diagram-interchange section (visual coordinates). The output of compiling a `.bpmn.yaml` file. |
| **bpmndi** | "BPMN Diagram Interchange" — the part of the BPMN 2.0 XML that stores visual layout (shapes, edges, waypoints) in a tool-portable way. Generated automatically by the compiler. |
| **Compiler** | The tool that reads a `.bpmn.yaml` file, validates it, computes layout, and emits BPMN 2.0 XML. |
| **Condition** | An expression on a sequence flow that determines whether the flow is taken at runtime. In this notation, a free-form string emitted verbatim into `<conditionExpression>`. The compiler does not interpret the expression language. |
| **Default flow** | A sequence flow marked with `default: true` that is taken when no other conditional flow leaving the same XOR gateway has its condition evaluate to true. At most one default per gateway. |
| **DSL** | Domain-Specific Language. The YAML notation in this kit is a DSL for describing BPMN 2.0 processes as text. |
| **Element** | A node in the process graph: an event, a task, or a gateway. Each element has a unique `id`, a `type` from a fixed enumeration, and (for tasks and gateways) a `name`. |
| **End event** | A `endEvent` element marking an exit point of the process. Has at least one incoming sequence flow and no outgoing flows. A process must contain at least one end event. |
| **Exclusive gateway** | An `exclusiveGateway` element representing an XOR routing decision. When splitting, exactly one outgoing flow is taken at runtime. When joining, the first arriving token activates the outgoing flow. |
| **Fork / split** | A gateway that has multiple outgoing flows. The runtime behaviour depends on the gateway type (XOR: choose one, AND: take all). |
| **Gateway** | A diamond-shaped routing element. Two types are supported: `exclusiveGateway` (XOR) and `parallelGateway` (AND). |
| **Identifier** | A string that uniquely names an element, lane, pool, flow, or process. Must match `^[A-Za-z][A-Za-z0-9_-]*$` (ASCII letter followed by letters, digits, underscores, hyphens). |
| **Join / merge** | A gateway that has multiple incoming flows. The runtime behaviour depends on the gateway type (XOR: pass-through on first token, AND: wait for all tokens). |
| **JSON Schema** | A vocabulary for declaring the shape and constraints of JSON (and YAML, since YAML is a JSON superset). The notation's schema is in [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json) (draft-07). |
| **Lane (swimlane)** | A horizontal partition of a pool, typically representing a role or responsible system. Every element belongs to exactly one lane. The order of lanes in YAML determines vertical order in the rendered diagram. |
| **OMG** | Object Management Group — the standards body that publishes BPMN 2.0. The reference document for the notation is OMG `formal/2013-12-09`. |
| **Parallel gateway** | A `parallelGateway` element representing an AND fork/join. When splitting, all outgoing flows are activated simultaneously and unconditionally. When joining, the gateway waits for all incoming tokens before proceeding. |
| **Pool** | A BPMN 2.0 participant. Represents one organisation, system, or actor in the process. The notation supports exactly one pool per document. |
| **Process** | The top-level object in a `.bpmn.yaml` document. Has an `id`, `name`, one `pool`, and a `flows` array. Compiles to a BPMN 2.0 `<process>` element. |
| **Round-trip parsing** | Parsing the compiled XML back through a BPMN 2.0 parser to verify it is well-formed. The compiler runs a round-trip check via `bpmn-moddle` on every emit; any warnings indicate a compiler bug. |
| **Sequence flow** | A directed edge from one element to another. Declared in the top-level `flows` array. May carry a condition expression and/or a default flag. |
| **Service task** | A `serviceTask` element — work performed by an automated service or system. Visually a rounded rectangle with a gear icon. |
| **Start event** | A `startEvent` element marking an entry point of the process. Has no incoming flows and exactly one outgoing flow. A process must contain at least one start event. |
| **Subset** | The portion of BPMN 2.0 supported by this notation. Narrower than the full spec — see Section 12 of [`notation.md`](notation.md) for what is out of scope. |
| **Swimlane** | Synonym for *lane*. |
| **Swimlane axis** | The horizontal centreline of a lane. The compiler aligns single-column elements to their lane's axis to keep cross-lane flows straight. |
| **Task** | A `task` element — generic unit of work. Visually a rounded rectangle. The base type; see also `userTask` and `serviceTask`. |
| **User task** | A `userTask` element — work performed by a human. Visually a rounded rectangle with a user icon. |
| **Validation** | The set of layered checks the compiler runs on each input: structural (schema), semantic (BPMN rules), and conformance (round-trip XML). See [`rules.md`](rules.md) for the full catalogue. |
| **Waypoint** | A point on the path of a sequence flow's edge. A flow is rendered as a polyline through its waypoints. The compiler computes waypoints automatically — they are not part of the source notation. |
| **YAML** | A human-friendly data serialisation format used as the source language of this notation. The notation is a strict subset of YAML with a fixed schema. |
| **YAML DSL** | The full name of this notation: a YAML-based domain-specific language for BPMN 2.0 processes. |
