# BPMN 2.0 Validation Rules

**Version:** 1.0
**Date:** 2026-05-04
**Scope:** Catalogue of rules enforced on every `.bpmn.yaml` document. Errors block compilation; warnings are surfaced but non-blocking. Each rule has a stable ID for use in tooling output.

**Governing principle.** Rules must either repeat or **narrow** the OMG BPMN 2.0 specification (`formal/2013-12-09`). Narrowing — for example, "exactly one pool per document" — is allowed. Adding constraints outside the spec is allowed if they do not contradict it. Allowing what BPMN 2.0 forbids, or relaxing its invariants, is not allowed. When extending this rule set, every new rule is reviewed against this principle.

---

## Severity model

- **Error** — blocks compilation; the BPMN XML is not produced. Cannot be downgraded.
- **Warning** — surfaced to the user; does not block compilation. May be disabled via project configuration on a per-rule basis.

---

## Errors (block compilation)

### Start Events

| ID | Rule |
|---|---|
| **SE-001** | A process must have at least one Start Event. |
| **SE-003** | A Start Event must have no incoming Sequence Flows. |
| **SE-004** | A Start Event must have exactly one outgoing Sequence Flow. |

### End Events

| ID | Rule |
|---|---|
| **EE-001** | A process must have at least one End Event. |
| **EE-003** | An End Event must have no outgoing Sequence Flows. |
| **EE-004** | An End Event must have at least one incoming Sequence Flow. |

### Activities (tasks)

| ID | Rule |
|---|---|
| **ACT-001** | An Activity must have at least one incoming and one outgoing Sequence Flow (unless it is the sole element of a process). |

### Sequence Flows

| ID | Rule |
|---|---|
| **SF-001** | A Sequence Flow must connect two elements within the same pool (no cross-pool flows). |
| **SF-DUP** | Two Sequence Flows with the same `(from, to)` pair are forbidden. |
| **SF-005** | Conditional Sequence Flows may originate only from Activities or exclusive gateways. |
| **SF-006** | Default Sequence Flows may originate only from Activities or exclusive gateways. |
| **SF-007** | A Default Sequence Flow must not have a `condition` expression. |

### Gateways

| ID | Rule |
|---|---|
| **GW-XOR-01** | An exclusive gateway with one incoming and one outgoing flow is forbidden — use a sequence flow instead. |
| **GW-XOR-02** | When splitting at an exclusive gateway, at most one outgoing flow may be the default; all others must have a `condition`. |
| **GW-AND-04** | Outgoing flows from a parallel gateway split must not carry `condition` expressions. |

### Process connectivity

| ID | Rule |
|---|---|
| **CONN-001** | Every element must be connected (directly or transitively) to at least one Start Event and reach at least one End Event. |
| **CONN-002** | The process graph must be weakly connected — no isolated islands of elements. |

(CONN-003 — every flow's target must be reachable — is covered transitively by CONN-001 plus parser-level reference validation; no separate rule.)

### Pools and lanes

| ID | Rule |
|---|---|
| **POOL-05** | Exactly one pool per document. (Narrowing of BPMN 2.0 POOL-01: each element belongs to at most one pool.) |

(POOL-01..04 from the BPMN spec are either implied by single-pool constraint or out of scope for the current notation.)

---

## Warnings (non-blocking)

Anti-patterns: structures that are valid per BPMN 2.0 but suspicious in practice. Each warning may be disabled via project configuration (e.g., a `.cervinrc` file with `rules: { 'AP-FLOAT': 'off' }`).

| ID | Description |
|---|---|
| **AP-FLOAT** | Floating element — has zero incoming AND zero outgoing flows. Distinct from ACT-001 because it covers events too (an isolated `endEvent` with no incoming flow is also flagged). |
| **AP-NO-DEFAULT** | XOR split with two or more conditional outgoing flows and no default — if all conditions evaluate to false at runtime, the token is lost. Distinct from GW-XOR-02 (which permits a single conditional outgoing without default). |
| **AP-IMPLICIT-JOIN** | A Task with two or more incoming flows and no joining gateway — each arriving token independently activates the task per BPMN semantics, often unintended. |
| **AP-GW-AS-TASK** | A gateway whose `name` starts with an imperative verb ("Validate", "Approve", "Check", etc.) — gateways are routing constructs, not work-performing elements. **Off by default** — must be enabled explicitly. |

---

## Output XML conformance

After emit, the produced BPMN 2.0 XML is round-tripped through a conformant parser (`bpmn-moddle`). Any warnings or errors at this layer are reported as validator findings with severity `error` (invalid output is always a compiler bug, not a user-input issue).

---

## Rule ID format

Rule IDs use a 3-digit numeric suffix (e.g., `SE-001`, `EE-003`). Anti-pattern IDs use the `AP-` prefix. The IDs map 1:1 to the BPMN 2.0 spec rules (e.g., `SE-001` corresponds to `SE-01` in the spec catalog) — the extra digit leaves room for adding implementation-specific sub-rules without colliding with future spec extensions.

---

## Spec coverage

The current rule set covers the practical core of BPMN 2.0 process semantics for the supported element subset (events, three task variants, two gateway types, sequence flows, single pool with lanes). The following spec rules are **not** implemented because the relevant element types are out of scope of the notation:

- **GW-XOR-03..05, GW-AND-01..03** — runtime semantics (token flow at runtime), not statically checkable from YAML alone.
- **GW-INC, GW-EVT** — inclusive and event-based gateways are not in the supported element set.
- **SUB-01..04** — sub-processes are out of scope.
- **MF-01..04** — message flows require multi-pool support.
- **BE-01..05** — boundary events are out of scope.
- **ACT-02..04** — advanced activity types (call activity, receive task, etc.) are out of scope.

When new element types are added to the notation, the corresponding rules should be added to this catalogue.

---

## Disabling warnings

A project may suppress warnings by including a configuration file (default name `.cervinrc`) at the root of its source tree:

```yaml
rules:
  AP-FLOAT: off       # disable completely
  AP-IMPLICIT-JOIN: warn   # explicit warn (default)
```

Errors cannot be disabled by configuration — attempting to set an error-severity rule to `off` is itself a configuration error and the loader refuses to start.
