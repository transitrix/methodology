---
notation: "BPMN Process Diagram"
version: "1.3"
author: "Valerii Korobeinikov"
last_updated: "2026-06-23"
status: "documented"
file_extension: "*.bpmn.transitrix.yaml"
dsm_status: "not implemented in DSM — renders via Transitrix Studio"
---

# BPMN Process YAML Notation — Reference

**Version:** 1.3
**Date:** 2026-06-23
**Scope:** Reference for the YAML notation used to describe BPMN 2.0 processes. Covers structure, allowed elements, sequence flows, identifiers, validation rules, examples, and glossary.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `bpmn` |
| File extension | `*.bpmn.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `bpmn` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `process` | yes | object | the BPMN process root — see §3 |

Example header:

```yaml
notation: bpmn
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
process:
  # ... see §3
```

---

## Relationship to the PROCESS element — BPMN is a projection

A `.bpmn.transitrix.yaml` document is a **projection** of a `PROCESS` element's `flow`, not the definition home of the process. The canonical behaviour — participants, steps, gateways, sequence flows — lives on the `PROCESS-…` element ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5); this notation defines how that flow **renders** to BPMN 2.0. A BPMN file is derived output: it can be deleted and regenerated from the element with no loss (the reconstruction invariant, [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1).

Two consequences:

- **The view stores no behaviour and no captions of its own.** Lane captions are **derived** from each participant's `name`; the role / system bindings are the `PROCESS` `participants` and per-step `performed_by`. The only thing this notation adds on top of the element is layout, and layout is computed deterministically at compile time (§1) — so it carries no information either. The view is `render(PROCESS.flow)` and nothing more.
- **Lifecycle and identity live on the element.** The node labels in a rendered BPMN file (`POOL-…`, `GW-…`, `TASK-…`, `SF-…`, `SE-…`, `EE-…`) remain file-local labels in the *projection* ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.3); the canonical, addressable identity of each step is the `PROCESS` `flow.steps[].id` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5). Neither the BPMN file nor its labels carry the primitive lifecycle (`valid_from` / `valid_to`, [CONTRACT.md](../CONTRACT.md) §7); that lives on the `PROCESS` element registered in the process landscape map ([06-process-map.md](06-process-map.md)).

> **Inversion (this change).** Until now the BPMN file was the detailed flow representation that the `PROCESS` element pointed at via `bpmn_file`. That pointer is inverted: the element's `flow` is the source, the BPMN file is derived. The structural schema in §3–§8 below describes the **projected (serialised) form** the renderer emits and consumes.

---

## 1. Overview

A process file describes a BPMN 2.0 process as a structured YAML document. The notation captures one pool, one or more lanes, typed elements inside lanes, and named sequence flows between elements. Coordinates and visual styling are **not** part of the notation — layout is computed deterministically at compile time and embedded as `bpmndi:` blocks in the output XML.

The notation is intentionally minimal. It covers the subset of BPMN 2.0 that maps cleanly to text and produces unambiguous diagrams without manual editing. Element types and structures outside this subset are explicitly out of scope (see §13).

The compiled output is consumable by any BPMN 2.0–conformant tool (Camunda Modeler, bpmn.io, Signavio, etc.) without round-tripping. The canonical source of truth is the `PROCESS` element's `flow`, of which this YAML is a projection (see "Relationship to the PROCESS element" above).

---

## 2. File extension

The file extension is **`.bpmn.transitrix.yaml`**. Files outside this extension are rejected by the compiler with an explicit error.

Until 2026-05-20 the short form `.bpmn.yaml` was also accepted as an alias. Per the family-consistency decision recorded that day, the long form is now the sole canonical extension — every Transitrix notation uses the `*.<short-name>.transitrix.<ext>` form per [`CONTRACT.md`](../CONTRACT.md), and BPMN is no longer an exception.

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

No additional top-level keys are permitted. The compiler rejects unknown keys before compilation.

---

## 4. Process metadata

| Field | Type | Constraints |
|---|---|---|
| `process.id` | string | Identifier — must match the pattern `^[A-Za-z][A-Za-z0-9_-]*$` |
| `process.name` | string | Free-form, must be non-empty |

The `id` is emitted as the `id` attribute of the root `<process>` element in the BPMN XML; `name` becomes the `name` attribute. The id is also used as a stable reference for tooling and is not changed by the compiler.

---

## 5. Pools

A pool represents a single participant in the process. The notation supports **exactly one pool per document**. This is a deliberate narrowing of the BPMN 2.0 spec, which permits multiple pools per collaboration. Multi-pool support is out of scope (see §13).

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

Lanes (a.k.a. swimlanes) partition a pool into horizontal bands, each representing one **participant** — a `ROLE-…` or `ACTOR-…` (person / business_unit / system). Every element belongs to exactly one lane. In the canonical form a lane is the projection of one entry in the `PROCESS` `participants` list ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5).

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
| `performed_by_role` | string | Optional. `ROLE-…` for the role responsible for this lane — the default for every element in the lane (see §7.2). |
| `name` | string | The rendered lane caption. **Derived** from the participant's `name` — not authored (reconstruction invariant, [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §1.1). Present in the serialised projection only. |
| `elements` | array | At least one element required |
| `supported_by_application` | string | Optional. `APPLICATION-…` used for the work in this lane — the default for every element in it (see §7.2). |

Order of participants in the `PROCESS` element determines the vertical order of swimlanes in the rendered diagram (top to bottom).

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
| `performed_by_role` | string | Optional. `ROLE-…` responsible for this step — overrides the lane default (see §7.2). |
| `supported_by_application` | string | Optional. `APPLICATION-…` used for this task — overrides the lane default (see §7.2). |

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

### 7.2. Role and system association (cross-references to canon)

A process records **who** performs each piece of work and **which system** supports it by referencing canon primitives. In the canonical form these are the `PROCESS` `participants` and per-step `performed_by` / `supported_by_application` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.5); the BPMN projection carries them through:

- `performed_by_role: ROLE-…` — the responsible role ([elements/19-actors.md](../elements/19-actors.md) defines `ROLE` as the position that fills a lane or step).
- `supported_by_application: APPLICATION-…` — the supporting application ([10-applications.md](10-applications.md)).

Both may appear at **lane** level (the default for every element in the lane — the standard swimlane-is-a-participant reading) and at **element** level (an override for one task). Precedence, per element:

1. Element-level value wins.
2. Otherwise the enclosing lane's value applies.
3. If neither is present, no role / system is declared for that element.

This keeps a 10-task lane from repeating the field ten times while still allowing a single automated task inside a human lane to point at a system.

These are **inline cross-references from a BPMN-local label to a canon primitive**, not `REL` files: a BPMN task / lane id is a document-local label ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.3), not a canon primitive, so the link is one-way (canon never points back at a local label) and is validated by canon-existence (`BPMN-XREF-001`, §11), not by the `REL` rules. This is the same view-references-canon pattern used by capability-map (`business_process`), process-map (`capability`), and the products / applications catalogues — see [elements/17-relations.md](../elements/17-relations.md) §3.

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

The compiler runs four layers of validation on each input. Each layer can block compilation independently. Full rule catalogue is in §11.

| Layer | What is checked |
|---|---|
| 1. Schema | YAML structure, allowed element types, required fields, identifier patterns, single-pool constraint |
| 2. Structural | Identifier uniqueness, reference resolution, no self-loops, no duplicate flows |
| 3. Semantic | BPMN 2.0 rules: every process has a start and end event, gateways have correct multiplicity, conditions appear only where allowed, every element is reachable, etc. |
| 4. XML conformance | Output XML must round-trip through a BPMN 2.0 parser without warnings |

In addition, anti-pattern checks (warnings, not errors) flag suspicious-but-valid structures: floating elements, missing default flow on conditional split, implicit join, gateway labelled as a task. Warnings are non-blocking and may be configured externally.

---

## 11. Validation rules

**Governing principle.** Rules must either repeat or **narrow** the OMG BPMN 2.0 specification (`formal/2013-12-09`). Narrowing is allowed. Adding constraints outside the spec is allowed if they do not contradict it. Allowing what BPMN 2.0 forbids, or relaxing its invariants, is not allowed.

### Severity model

- **Error** — blocks compilation; the BPMN XML is not produced. Cannot be downgraded.
- **Warning** — surfaced to the user; does not block compilation. May be disabled via project configuration on a per-rule basis.

### Errors (block compilation)

**Start events**

| ID | Rule |
|---|---|
| **SE-001** | A process must have at least one Start Event. |
| **SE-003** | A Start Event must have no incoming Sequence Flows. |
| **SE-004** | A Start Event must have exactly one outgoing Sequence Flow. |

**End events**

| ID | Rule |
|---|---|
| **EE-001** | A process must have at least one End Event. |
| **EE-003** | An End Event must have no outgoing Sequence Flows. |
| **EE-004** | An End Event must have at least one incoming Sequence Flow. |

**Activities**

| ID | Rule |
|---|---|
| **ACT-001** | An Activity must have at least one incoming and one outgoing Sequence Flow (unless it is the sole element of a process). |

**Sequence flows**

| ID | Rule |
|---|---|
| **SF-001** | A Sequence Flow must connect two elements within the same pool (no cross-pool flows). |
| **SF-DUP** | Two Sequence Flows with the same `(from, to)` pair are forbidden. |
| **SF-005** | Conditional Sequence Flows may originate only from Activities or exclusive gateways. |
| **SF-006** | Default Sequence Flows may originate only from Activities or exclusive gateways. |
| **SF-007** | A Default Sequence Flow must not have a `condition` expression. |

**Gateways**

| ID | Rule |
|---|---|
| **GW-XOR-01** | An exclusive gateway with one incoming and one outgoing flow is forbidden — use a sequence flow instead. |
| **GW-XOR-02** | When splitting at an exclusive gateway, at most one outgoing flow may be the default; all others must have a `condition`. |
| **GW-AND-04** | Outgoing flows from a parallel gateway split must not carry `condition` expressions. |

**Process connectivity**

| ID | Rule |
|---|---|
| **CONN-001** | Every element must be connected (directly or transitively) to at least one Start Event and reach at least one End Event. |
| **CONN-002** | The process graph must be weakly connected — no isolated islands of elements. |

**Pools and lanes**

| ID | Rule |
|---|---|
| **POOL-05** | Exactly one pool per document. |

**Cross-references to canon**

| ID | Rule |
|---|---|
| **BPMN-XREF-001** | A `performed_by_role` / `supported_by_application` value (on a lane or an element, §7.2) must resolve to an admitted primitive in canon: `ROLE-…` in `canon/elements/02_business/roles/`; `APPLICATION-…` in `canon/elements/03_application/applications/`. Same canon-existence bar as `REL-002`, applied at parse time when the catalogue is loaded. |

### Warnings (non-blocking)

Anti-patterns: structures that are valid per BPMN 2.0 but suspicious in practice. Each warning may be disabled via project configuration (e.g., a `.transitrixrc` file with `rules: { 'AP-FLOAT': 'off' }`).

| ID | Description |
|---|---|
| **AP-FLOAT** | Floating element — has zero incoming AND zero outgoing flows. |
| **AP-NO-DEFAULT** | XOR split with two or more conditional outgoing flows and no default — if all conditions evaluate to false at runtime, the token is lost. |
| **AP-IMPLICIT-JOIN** | A Task with two or more incoming flows and no joining gateway — each arriving token independently activates the task per BPMN semantics, often unintended. |
| **AP-GW-AS-TASK** | A gateway whose `name` starts with an imperative verb ("Validate", "Approve", "Check", etc.) — gateways are routing constructs, not work-performing elements. **Off by default.** |

### Disabling warnings

```yaml
# .transitrixrc
rules:
  AP-FLOAT: off
  AP-IMPLICIT-JOIN: warn   # explicit warn (default)
```

Errors cannot be disabled by configuration.

---

## 12. Reserved characters and escaping

YAML rules apply for string fields. In particular:

- Strings containing `:` should be wrapped in single or double quotes: `name: 'In stock: yes/no?'`.
- Strings starting with reserved YAML scalars (`yes`, `no`, `true`, `false`, `null`, `~`, numbers) should be quoted: `condition: 'yes'`, not `condition: yes`.
- The flow-style mapping `{ id: x, type: task, name: My Task }` is supported.
- Multi-line strings are supported via `|` (literal) and `>` (folded) YAML scalars; the compiler accepts them in `name` and `condition` fields.

The compiler emits string content verbatim into XML, escaping XML-reserved characters (`<`, `>`, `&`, `"`, `'`) automatically.

---

## 13. Out of scope (BPMN 2.0 features not in this notation)

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

## 14. Examples

Three working examples follow. Each compiles successfully and passes all validation layers.

### 14.1. Minimal

Smallest valid process: one start event, one end event, one flow.

```yaml
process:
  id: minimal
  name: Minimal Process
  pools:
    - id: company
      name: Company
      lanes:
        - id: main
          name: Main
          elements:
            - id: start
              type: startEvent
            - id: end
              type: endEvent
  flows:
    - from: start
      to: end
```

### 14.2. Approval (XOR decision)

Single-lane process with an exclusive gateway, conditions, and a default branch.

```yaml
process:
  id: order-check
  name: Order Check
  pools:
    - id: company
      name: Company
      lanes:
        - id: sales
          name: Sales
          elements:
            - id: start
              type: startEvent
            - id: receive-order
              type: task
              name: Receive Order
            - id: check-stock
              type: exclusiveGateway
              name: In stock?
            - id: pick-pack
              type: task
              name: Pick and Pack
            - id: notify-customer
              type: task
              name: Notify Customer
            - id: end
              type: endEvent
  flows:
    - from: start
      to: receive-order
    - from: receive-order
      to: check-stock
    - from: check-stock
      to: pick-pack
      condition: 'in_stock'
    - from: check-stock
      to: notify-customer
      default: true
    - from: pick-pack
      to: end
    - from: notify-customer
      to: end
```

### 14.3. Release pipeline (multi-lane, parallel gateway)

Three lanes, `userTask` and `serviceTask`, XOR with default, parallel gateway split and join.

```yaml
process:
  id: release-pipeline
  name: Release Pipeline
  pools:
    - id: pipeline
      name: Release Pipeline
      lanes:
        - id: dev
          name: Development
          elements:
            - id: feature-ready
              type: startEvent
            - id: run-tests
              type: task
              name: Run Unit Tests
            - id: tests-pass
              type: exclusiveGateway
              name: Tests pass?
            - id: build
              type: task
              name: Build Package
        - id: qa
          name: QA
          elements:
            - id: manual-test
              type: userTask
              name: Manual Testing
            - id: regression
              type: task
              name: Regression Suite
        - id: ops
          name: DevOps
          elements:
            - id: deploy-start
              type: parallelGateway
              name: Deploy Start
            - id: health-check
              type: serviceTask
              name: Health Check
            - id: deploy-staging
              type: serviceTask
              name: Deploy to Staging
            - id: deploy-complete
              type: parallelGateway
              name: Deploy Complete
            - id: promote
              type: task
              name: Promote to Production
            - id: released
              type: endEvent
  flows:
    - from: feature-ready
      to: run-tests
    - from: run-tests
      to: tests-pass
    - from: tests-pass
      to: build
      condition: 'passed'
    - from: tests-pass
      to: released
      default: true
    - from: build
      to: manual-test
    - from: manual-test
      to: regression
    - from: regression
      to: deploy-start
    - from: deploy-start
      to: health-check
    - from: deploy-start
      to: deploy-staging
    - from: health-check
      to: deploy-complete
    - from: deploy-staging
      to: deploy-complete
    - from: deploy-complete
      to: promote
    - from: promote
      to: released
```

---

## 15. Glossary

Domain terms used in this notation. Concise definitions focused on what each term means in this context.

| Term | Definition |
|---|---|
| **Activity** | A unit of work in the process. In this notation: `task`, `userTask`, or `serviceTask`. The three subtypes differ visually but share the same routing semantics. |
| **Anti-pattern** | A structure that is technically valid per BPMN 2.0 but suspicious in practice. The validator emits a warning, not an error. |
| **BPMN** | Business Process Model and Notation — an OMG standard for business process diagrams. This notation produces valid BPMN 2.0 XML output (`formal/2013-12-09`). |
| **BPMN 2.0 XML** | The standardised XML serialisation of a BPMN diagram. Contains both a semantic section and a `bpmndi:` diagram-interchange section (visual coordinates). The output of compiling a `.bpmn.transitrix.yaml` file. |
| **bpmndi** | "BPMN Diagram Interchange" — the part of the BPMN 2.0 XML that stores visual layout (shapes, edges, waypoints) in a tool-portable way. Generated automatically by the compiler. |
| **Compiler** | The tool that reads a `.bpmn.transitrix.yaml` file, validates it, computes layout, and emits BPMN 2.0 XML. |
| **Condition** | An expression on a sequence flow that determines whether the flow is taken at runtime. A free-form string emitted verbatim into `<conditionExpression>`. The compiler does not interpret the expression language. |
| **Default flow** | A sequence flow marked with `default: true` that is taken when no other conditional flow leaving the same XOR gateway evaluates to true. At most one default per gateway. |
| **DSL** | Domain-Specific Language. This YAML notation is a DSL for describing BPMN 2.0 processes as text. |
| **Element** | A node in the process graph: an event, a task, or a gateway. Each element has a unique `id`, a `type` from a fixed enumeration, and (for tasks and gateways) a `name`. |
| **End event** | An `endEvent` element marking an exit point of the process. Has at least one incoming flow and no outgoing flows. |
| **Exclusive gateway** | An `exclusiveGateway` element representing an XOR routing decision. When splitting, exactly one outgoing flow is taken. When joining, the first arriving token activates the outgoing flow. |
| **Fork / split** | A gateway that has multiple outgoing flows. Runtime behaviour depends on the gateway type (XOR: choose one; AND: take all). |
| **Gateway** | A diamond-shaped routing element. Two types are supported: `exclusiveGateway` (XOR) and `parallelGateway` (AND). |
| **Identifier** | A string that uniquely names an element, lane, pool, flow, or process. Must match `^[A-Za-z][A-Za-z0-9_-]*$`. |
| **Join / merge** | A gateway that has multiple incoming flows. Runtime behaviour depends on type (XOR: pass-through on first token; AND: wait for all tokens). |
| **Lane (swimlane)** | A horizontal partition of a pool, typically representing a role or responsible system. Every element belongs to exactly one lane. |
| **OMG** | Object Management Group — the standards body that publishes BPMN 2.0. Reference document: `formal/2013-12-09`. |
| **Parallel gateway** | A `parallelGateway` element representing an AND fork/join. When splitting, all outgoing flows are activated simultaneously. When joining, waits for all incoming tokens. |
| **Pool** | A BPMN 2.0 participant. The notation supports exactly one pool per document. |
| **Process** | The top-level object in a `.bpmn.transitrix.yaml` document. Has an `id`, `name`, one `pool`, and a `flows` array. Compiles to a BPMN 2.0 `<process>` element. |
| **Round-trip parsing** | Parsing the compiled XML back through a BPMN 2.0 parser to verify it is well-formed. The compiler runs this check on every emit. |
| **Sequence flow** | A directed edge from one element to another. Declared in the top-level `flows` array. May carry a condition expression and/or a default flag. |
| **Service task** | A `serviceTask` element — work performed by an automated service or system. |
| **Start event** | A `startEvent` element marking an entry point of the process. Has no incoming flows and exactly one outgoing flow. |
| **Subset** | The portion of BPMN 2.0 supported by this notation. See §13 for what is out of scope. |
| **Swimlane axis** | The horizontal centreline of a lane. The compiler aligns single-column elements to their lane's axis to keep cross-lane flows straight. |
| **Task** | A `task` element — generic unit of work. The base type; see also `userTask` and `serviceTask`. |
| **User task** | A `userTask` element — work performed by a human. |
| **Validation** | The set of layered checks the compiler runs on each input: structural (schema), semantic (BPMN rules), and conformance (round-trip XML). See §11 for the full catalogue. |
| **Waypoint** | A point on the path of a sequence flow's edge. Computed automatically by the compiler — not part of the source notation. |
| **YAML DSL** | The full name of this notation: a YAML-based domain-specific language for BPMN 2.0 processes. |

---

## 16. Versioning

The notation is at version **1.3** (updated 2026-06-23).

Backward-incompatible changes (renaming or removing fields, tightening identifier rules, removing element types) require a major version bump and a migration note. New optional fields and new allowed element types are minor changes; removed fields or types are major.

### Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-05-04 | Initial frozen spec |
| 1.1 | — | Extension/header/boolean corrections |
| 1.2 | 2026-05-26 | BPMN-as-projection inversion; §7.2 role/system association |
| 1.3 | 2026-06-23 | Rename `performed_by` → `performed_by_role` on lane and element to match DSL usage; tighten `BPMN-XREF-001` |
