# `canon/elements/02_business/steps/`

Promoted process-flow **step** elements. A step is a single node (task / event / gateway) in a `PROCESS` element's `flow` ([`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.5). Steps sit on the ArchiMate 3.2 **business** layer.

## Steps are canonical-by-containment — this folder holds only *promoted* steps

A step's definition home is its `PROCESS` element, where it is authored inline in `flow.steps[]` and carries no admission record of its own (the PROCESS carries it). A step is **addressable** by its `STEP-…` id but is **not** materialised as a file here until it is *promoted* — which happens only when a **second document first references it**: a step-level `CHANGE`, a `RULE.applies_to`, an `ACTIVITY` realising it, or an `ASSERTION` (`subject` / `realised_via`).

**This org has no promoted steps yet.** Every flow step remains canonical-by-containment inside its process (e.g. `STEP-ORD-FULFILL-1…7` live in [`../processes/PROCESS-ORD-FULFILL-1.yaml`](../processes/PROCESS-ORD-FULFILL-1.yaml)); no second document references a step. This README documents the shape and the mechanical promotion for when that first cross-reference appears.

TYPE registry: see [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`STEP`), §4 (uniqueness scope). Full schema + promotion mechanic: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.20.

## File convention

`<id>.yaml`, where `<id>` is the step's existing `STEP-[<middle>-]<INTEGER>` id — **unchanged** by promotion (no rename). Example: `STEP-ORD-FULFILL-4.yaml`.

## Element schema (promoted form)

The common envelope is in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §3; the `STEP` field set is §7.20 (it mirrors the inline `flow.steps[]` shape of §7.5).

### Required

| Field | Description |
|---|---|
| `notation` | literal `step` |
| `id` | the step's existing `STEP-…` id (unchanged) |
| `name` | step label (required for task / gateway; optional for event) |
| `type` | node kind — `startEvent` / `endEvent` / `task` / `userTask` / `serviceTask` / `exclusiveGateway` / `parallelGateway` |
| `process` | `PROCESS-…` the step belongs to (its container) |
| admission record | `zone: canon`, `admitted_at`, `admitted_by`, `gate_checks` — [`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6 |
| lifecycle | `valid_from`, `valid_to` — [`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7 |

### Optional

| Field | Description |
|---|---|
| `performed_by` | `ROLE-…` / `ACTOR-…` lane the step runs in (a participant of the process) |
| `supported_by_application` | `APPLICATION-…` supporting the step |

## Promotion (mechanical)

When `STEP-X` is first referenced from a second document:

1. Create `STEP-X.yaml` here with the envelope + fields above, copying `type` / `name` / `performed_by` / `supported_by_application` from the step's `flow.steps[]` entry; set `process:` to the home `PROCESS-…`.
2. In the PROCESS element, reduce that `flow.steps[]` entry to a reference — `{ id: STEP-X }`.
3. Leave `flow.sequence` untouched — the graph edges stay process-owned.

The process behaviour stays fully reconstructable: nodes resolve via the promoted `STEP` files, edges via `PROCESS.flow.sequence` ([`ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §1.1).

## Skeleton

```yaml
notation: step
id: STEP-ORD-FULFILL-4          # the existing in-flow id, unchanged
name: "Pick and Pack"
type: task                      # startEvent | endEvent | task | userTask | serviceTask | exclusiveGateway | parallelGateway
process: PROCESS-ORD-FULFILL-1  # the container this step was promoted out of

# Optional
performed_by: ROLE-OPS-1
supported_by_application: APPLICATION-OMS-1

# Admission record (CONTRACT.md §6)
zone: canon
admitted_at: "2026-06-05"
admitted_by: "firstname.lastname"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — default to the home process's valid_from
valid_from: "2026-05-26"
valid_to: null
```

> The skeleton above is illustrative — `STEP-ORD-FULFILL-4` is **not** promoted in this org (no second document references it). It still lives inline in `PROCESS-ORD-FULFILL-1`.

## See also

- TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`STEP`), §4.
- Inline (unpromoted) shape and the canonical-by-containment rule: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.5, §1.
- Home process: [`../processes/PROCESS-ORD-FULFILL-1.yaml`](../processes/PROCESS-ORD-FULFILL-1.yaml).
