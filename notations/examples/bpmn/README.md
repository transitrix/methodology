# BPMN diagrams

Business Process Model and Notation diagrams defined in a compact YAML DSL.

**File extensions:** `*.bpmn.yaml`

## Minimal structure

```yaml
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

---

# Test Corpus Catalog

**Version:** 0.4  
**Updated:** 2026-05-12  
**Count:** 6 diagrams

This table lists all diagrams in `examples/bpmn/corpus/` with their structural properties and coverage matrix cell.

| Filename | Elements | Flows | Cross-lane % | Cycles | Gateways | Lanes | Cell | Purpose |
|----------|----------|-------|--------------|--------|----------|-------|------|---------|
| `simple-linear.cervin.yaml` | 6 | 5 | 0% | No | 0 | 1 | S-Lo-A-Lo-1 | Minimal baseline; pure same-lane, no gates |
| `simple-approval.cervin.yaml` | 8 | 7 | 29% | No | 1 (XOR) | 2 | S-Mi-A-Lo-2 | Basic cross-lane routing; horizontal port rule |
| `small-dense-approval.cervin.yaml` | 9 | 11 | 75% | No | 4 (2 AND, 1 XOR) | 2 | S-Hi-A-Hi-2 | Dense gates, high cross-lane; parallel paths |
| `order-processing.cervin.yaml` | 14 | 13 | 46% | Yes | 4 (1 XOR, 2 AND) | 3 | M-Mi-C-Hi-3 | Multi-lane; gateway distribution; backward edge |
| `large-cyclic-workflow.cervin.yaml` | 22 | 25 | 76% | Yes (rework loop) | 10 (4 AND, 6 XOR) | 4 | L-Hi-C-Hi-4 | Dense gates, cyclic; backward routing test |
| `xlarge-stress-test.cervin.yaml` | 52 | 54 | 82% | No | 20 (8 AND, 12 XOR) | 5 | XL-Hi-A-Hi-4+ | Stress test: 50+ elements, extreme complexity |

## Notes

- **Acyclic** diagrams are preferred for baseline (simpler to reason about); cyclic examples test backward routing and cycle-breaking heuristics.
- **Gateway density** ranges from 0% (only tasks/events) to 100% (only gateways). Most real processes cluster around 10–30%.
- **Cross-lane share** measures flows connecting different lanes; 0% is pure same-lane, 100% is every flow goes cross-lane.
- Each file is validated via `BpmnModdle.fromXML` during test runs to ensure valid BPMN 2.0 output.
