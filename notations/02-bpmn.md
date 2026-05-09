---
notation: "BPMN Process Diagram"
version: "1.0"
author: "Valerii Korobeinikov"
last_updated: "2026-05-04"
status: "implemented"
file_extension: "*.bpmn.transitrix.yaml"
---

# BPMN Process YAML Notation — Reference

**Version:** 1.0
**Date:** 2026-05-04
**Scope:** Reference for the YAML notation used to describe BPMN 2.0 processes. Covers structure, allowed elements, sequence flows, identifiers, and the supported subset of BPMN 2.0.
**Related:** [`rules.md`](rules.md), [`glossary.md`](glossary.md), [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json), [`examples/`](examples/).

---

## File header

Every `*.bpmn.transitrix.yaml` file MUST start with the following header:

```yaml
notation: bpmn          # required; this notation's short name
spec_version: 0.1       # optional today; reserved field; will be required when this notation reaches v1.0
# … rest of the document
```

Validator behaviour:
- Missing `notation` → hard error.
- `notation` value not equal to `bpmn` → hard error (the file might be the wrong format for this extension).
- File extension not equal to `.bpmn.transitrix.yaml` while `notation: bpmn` → hard error (extension/content mismatch).
- `spec_version` accepted but not enforced until this notation hits v1.0.

---

## 1. Overview

A process file describes a BPMN 2.0 process as a structured YAML document. The notation captures one pool, one or more lanes, typed elements inside lanes, and named sequence flows between elements. Coordinates and visual styling are **not** part of the notation — layout is computed deterministically at compile time and embedded as `bpmndi:` blocks in the output XML.

The notation is intentionally minimal. It covers the subset of BPMN 2.0 that maps cleanly to text and produces unambiguous diagrams without manual editing. Element types and structures outside this subset are explicitly out of scope (see Section 12).

The compiled output is consumable by any BPMN 2.0–conformant tool (Camunda Modeler, bpmn.io, Signavio, etc.) without round-tripping; YAML is the single source of truth.

---

## 2. File extension

The file extension is **`.bpmn.transitrix.yaml`**. Files outside this extension are rejected by the compiler with an explicit error.

---

## 3. Top-level structure

A process file contains a single root key `process` whose value is an object with four required fields and a fixed shape:

```yaml
process:
  id: <process-id>
  name: <human-readable name>
  pools:
    - id: <pool-id>
      name: <pool name>
      lanes:
        - id: <lane-id>
          name: <lane name>
          elements:
            - id: <element-id>
              type: <element type>
              name: <element name>
            # ...
        # ...
  flows:
    - id: <flow-id>           # optional; auto-generated if omitted
      from: <element-id>
      to: <element-id>
      condition: <expression>  # optional
      default: true|false      # optional
    # ...
```

No additional top-level keys are permitted. Validation is enforced by [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json) and rejected by the parser before compilation.

---

## 4. Process metadata

| Field | Type | Constraints |
|---|---|---|
| `process.id` | string | Identifier — must match the pattern `^[A-Za-z][A-Za-z0-9_-]*$` |
| `process.name` | string | Free-form, must be non-empty |

The `id` is emitted as the `id` attribute of the root `<process>` element in the BPMN XML; `name` becomes the `name` attribute. The id is also used as a stable reference for tooling and is not changed by the compiler.

---

## 5. Pools

A pool represents a single participant in the process. The notation supports **exactly one pool per document**. This is a deliberate narrowing of the BPMN 2.0 spec, which permits multiple pools per collaboration. Multi-pool support is out of scope (see Section 12).

```yaml
pools:
  - id: company
    name: Company
    lanes:
      # ...
```

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Identifier pattern; must differ from any element id and any lane id |
| `name` | string | Non-empty, free-form |
| `lanes` | array | At least one lane required |

The `pools` array must contain exactly one entry. Two or more entries cause a compile error.

---

## 6. Lanes

Lanes (a.k.a. swimlanes) partition a pool into horizontal bands, each typically representing a role or responsible system. Every element belongs to exactly one lane.

```yaml
lanes:
  - id: sales
    name: Sales
    elements:
      # ...
  - id: warehouse
    name: Warehouse
    elements:
      # ...
```

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Identifier pattern; must differ from pool id and from any element id |
| `name` | string | Non-empty, free-form (rendered as the lane caption) |
| `elements` | array | At least one element required |

Order of lanes in the YAML determines the vertical order of swimlanes in the rendered diagram (top to bottom).

---

## 7. Elements

An element is a node in the process graph. Seven element types are supported:

| Type | BPMN 2.0 equivalent | Visual shape |
|---|---|---|
| `startEvent` | Start Event (none trigger) | Thin-bordered circle |
| `endEvent` | End Event (none result) | Thick-bordered circle |
| `task` | Generic Task | Rounded rectangle |
| `userTask` | User Task | Rounded rectangle with user icon |
| `serviceTask` | Service Task | Rounded rectangle with gear icon |
| `exclusiveGateway` | Exclusive Gateway (XOR) | Diamond with `×` marker |
| `parallelGateway` | Parallel Gateway (AND) | Diamond with `+` marker |

Each element is an object with these fields:

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Identifier pattern; globally unique within the document |
| `type` | string | One of the seven enum values above |
| `name` | string | Required for tasks and gateways (non-empty); optional for events |

Example:

```yaml
elements:
  - id: start
    type: startEvent
  - id: receive-order
    type: task
    name: Receive Order
  - id: check-stock
    type: exclusiveGateway
    name: In stock?
  - id: end
    type: endEvent
```

Events (`startEvent`, `endEvent`) may omit `name` because their visual representation is unambiguous without a label. Tasks and gateways must carry a name.

### 7.1. Element semantics

- **`startEvent`** — entry point of the process. A process must contain at least one start event. A start event has no incoming sequence flows and exactly one outgoing flow.
- **`endEvent`** — exit point. A process must contain at least one end event. An end event has no outgoing sequence flows and at least one incoming flow.
- **`task`** / **`userTask`** / **`serviceTask`** — work performed in the process. The three subtypes differ only visually; semantically all are activities. Each task must have at least one incoming and one outgoing sequence flow, unless it is the sole element of a process.
- **`exclusiveGateway`** — XOR routing decision. When splitting (multiple outgoing flows), exactly one path is taken at runtime based on flow conditions; at most one outgoing flow may be marked as the default. When joining (multiple incoming flows), the first arriving token activates the outgoing flow.
- **`parallelGateway`** — AND fork/join. When splitting, all outgoing flows are activated simultaneously; outgoing flows must not carry conditions. When joining, the gateway waits for all incoming tokens before proceeding.

A gateway with exactly one incoming and one outgoing flow is forbidden — use a sequence flow instead.

---

## 8. Sequence flows

Sequence flows connect elements within the pool, declared in the top-level `flows` array. Each flow is an object:

```yaml
flows:
  - id: f1                     # optional; auto-generated as Flow_1, Flow_2, ... if omitted
    from: start
    to: receive-order
  - id: f2
    from: check-stock
    to: pick-pack
    condition: 'in_stock == true'
  - id: f3
    from: check-stock
    to: notify-customer
    default: true
```

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Optional. Auto-generated as `Flow_N` skipping any explicit `Flow_N` already in use |
| `from` | string | Required. Must reference an existing element id |
| `to` | string | Required. Must reference an existing element id; must differ from `from` (no self-loops) |
| `condition` | string | Optional. Free-form expression text; may not appear together with `default: true` |
| `default` | boolean | Optional. Marks this flow as the default branch of an XOR split |

### 8.1. Flow constraints

- **No self-loops:** `from === to` is rejected.
- **No duplicates:** two sequence flows with the same `(from, to)` pair are forbidden.
- **No cross-pool:** since the document has exactly one pool, all flow endpoints must reference elements in that pool.

### 8.2. Conditions

A `condition` field may appear on flows whose source is an Activity (task / userTask / serviceTask) or an exclusive gateway. Its value is treated as opaque expression text — the compiler emits it verbatim into a `<conditionExpression>` BPMN element. The expression language is not interpreted by the compiler; downstream tooling (process engines) is responsible for evaluation.

A condition cannot appear on:
- Flows from `startEvent`, `endEvent` (events do not branch).
- Flows from a `parallelGateway` split (parallel splits activate all branches unconditionally).

### 8.3. Default flow flag

The `default: true` flag marks a flow as the default branch of an XOR split. Default semantics:

- At most one default flow per gateway.
- A default flow may not also carry a `condition`.
- A default flow may originate only from an Activity or exclusive gateway.

When multiple conditional flows leave an XOR gateway and none of their conditions evaluate to true, control falls through to the default flow. If no default exists in this situation, the token is lost — the validator emits a warning for this anti-pattern.

In the emitted BPMN XML, the default flag is materialised as the `default="<flow-id>"` attribute on the parent gateway element.

### 8.4. Auto-generated flow identifiers

If a flow omits `id`, the compiler assigns one. Generation skips any explicit `Flow_N` already present in the document, so a user can mix explicit and auto-generated ids without collision.

---

## 9. Identifier rules

Every `id` in the document — for the process, pool, lanes, elements, and flows — must match the regular expression:

```
^[A-Za-z][A-Za-z0-9_-]*$
```

In words: starts with an ASCII letter, then any number of letters, digits, underscores, or hyphens. Spaces, dots, slashes, and Unicode letters are not allowed.

Uniqueness rules:

- Element ids are globally unique within the document.
- Lane ids must differ from pool ids and from any element id.
- Pool id must differ from any lane id and any element id.
- Flow ids are unique within the `flows` array.

Violations are caught by the parser before compilation and reported with the colliding identifier in the error message.

---

## 10. Validation summary

The compiler runs four layers of validation on each input. Each layer can block compilation independently. Full rule catalogue is in [`rules.md`](rules.md).

| Layer | What is checked |
|---|---|
| 1. Schema | YAML structure, allowed element types, required fields, identifier patterns, single-pool constraint (the JSON Schema in [`schema/bpmn-dsl.schema.json`](schema/bpmn-dsl.schema.json)) |
| 2. Structural | Identifier uniqueness, reference resolution, no self-loops, no duplicate flows |
| 3. Semantic | BPMN 2.0 rules: every process has a start and end event, gateways have correct multiplicity, conditions appear only where allowed, every element is reachable, etc. |
| 4. XML conformance | Output XML must round-trip through a BPMN 2.0 parser without warnings |

In addition, anti-pattern checks (warnings, not errors) flag suspicious-but-valid structures: floating elements, missing default flow on conditional split, implicit join, gateway labelled as a task. Warnings are non-blocking and may be configured externally.

---

## 11. Reserved characters and escaping

YAML rules apply for string fields. In particular:

- Strings containing `:` should be wrapped in single or double quotes: `name: 'In stock: yes/no?'`.
- Strings starting with reserved YAML scalars (`yes`, `no`, `true`, `false`, `null`, `~`, numbers) should be quoted: `condition: 'yes'`, not `condition: yes`.
- The flow-style mapping `{ id: x, type: task, name: My Task }` is supported.
- Multi-line strings are supported via `|` (literal) and `>` (folded) YAML scalars; the compiler accepts them in `name` and `condition` fields.

The compiler emits string content verbatim into XML, escaping XML-reserved characters (`<`, `>`, `&`, `"`, `'`) automatically.

---

## 12. Out of scope (BPMN 2.0 features not in this notation)

The following BPMN 2.0 features are **not** supported by the current notation. Documents using them either fail schema validation (unknown enum values) or are silently rejected at the parser level.

- **Multi-pool collaborations.** Exactly one pool per document is enforced.
- **Sub-processes** (collapsed or expanded), call activities, ad-hoc sub-processes.
- **Inclusive gateway** (`OR`), **event-based gateway**, **complex gateway**.
- **Boundary events** (interrupting or non-interrupting), attached to activities.
- **Message events** (start, intermediate, end), **timer events**, **signal events**, **error events**, **escalation events**, **compensation events**.
- **Message flows** between pools.
- **Data objects**, **data stores**, **data inputs/outputs**, **data associations**.
- **Receive task**, **send task**, **manual task**, **business rule task**, **script task** (only `task`, `userTask`, `serviceTask` are supported).
- **Lane sets** (nested lanes within lanes).
- **Annotations**, **groups**, **text annotations**, **associations**.
- **`extensionElements`** for custom metadata.

Adding any of these requires expanding the schema and the surrounding tooling in coordinated changes.

---

## 13. Examples

Three working examples are in [`examples/`](examples/):

- [`examples/minimal.bpmn.transitrix.yaml`](examples/minimal.bpmn.transitrix.yaml) — smallest valid process: one start, one end, one flow.
- [`examples/approval.bpmn.transitrix.yaml`](examples/approval.bpmn.transitrix.yaml) — single-lane process with XOR decision and a default branch.
- [`examples/release-pipeline.bpmn.transitrix.yaml`](examples/release-pipeline.bpmn.transitrix.yaml) — multi-lane pipeline with cross-lane flows and parallel split/join.

Each example compiles successfully and passes all validation layers.

---

## 14. Versioning

The notation is at version **1.0** (frozen 2026-05-04).

Backward-incompatible changes (renaming or removing fields, tightening identifier rules, removing element types) require a major version bump and a migration note. New optional fields and new allowed element types are minor changes; removed fields or types are major.
