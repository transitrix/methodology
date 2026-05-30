# BPMN diagrams

Business Process Model and Notation 2.0 diagrams defined as compact YAML — one pool, lanes, typed elements, named sequence flows. Layout is computed by the compiler; coordinates are not part of the notation.

**File extension:** `*.bpmn.transitrix.yaml`

See the canonical spec: [`../../views/01-bpmn.md`](../../views/01-bpmn.md).

## Minimal structure

```yaml
notation: bpmn
spec_version: "0.1"

process:
  id: my-process
  name: My Process
  pools:
    - id: pool-1
      name: Pool Name
      lanes:
        - id: lane-requester
          name: Requester
          elements:
            - id: start-1
              type: startEvent
              name: Start
            - id: task-1
              type: task
              name: Do something
            - id: end-1
              type: endEvent
              name: End
  flows:
    - id: f1
      from: start-1
      to: task-1
    - id: f2
      from: task-1
      to: end-1
```

## Element types

| `type` value | Description |
|---|---|
| `startEvent` | Start event (circle) |
| `endEvent` | End event (thick circle) |
| `task` | Task (rounded rectangle) |
| `exclusiveGateway` | XOR gateway (diamond, X mark) |
| `parallelGateway` | AND gateway (diamond, + mark) |
| `inclusiveGateway` | OR gateway (diamond, O mark) |

See the spec for the full element catalogue, validation rules, and flow conditions.

## Flow conditions

Add a `condition` field to a flow from a gateway:

```yaml
flows:
  - id: f-yes
    from: gw-approve
    to: task-notify-ok
    condition: 'status == "approved"'
```

## Rules

- Every process must have at least one `startEvent` and one `endEvent`.
- All element and flow IDs must be unique within the file.
- Elements belong to a lane; flows connect elements across any lanes.
- Multiple pools and multiple lanes per pool are supported.

## Examples in this folder

| File | Description |
|---|---|
| `simple-linear.bpmn.transitrix.yaml` | Minimal baseline — pure same-lane, no gateways |
| `simple-approval.bpmn.transitrix.yaml` | Basic cross-lane routing with one XOR gateway |
| `small-dense-approval.bpmn.transitrix.yaml` | Dense gateways, high cross-lane share |
| `order-fulfillment.bpmn.transitrix.yaml` | Multi-lane order-fulfilment flow |
| `feature-release.bpmn.transitrix.yaml` | Feature-release pipeline with approval gates |
| `ai-expense-approval.bpmn.transitrix.yaml` | AI-assisted expense approval with multi-step routing |
| `large-cyclic-workflow.bpmn.transitrix.yaml` | Dense gates, rework loop — backward-routing test |
| `xlarge-stress-test.bpmn.transitrix.yaml` | 50+ element stress test |
