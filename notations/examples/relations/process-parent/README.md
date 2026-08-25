# `process_parent` — PROCESS → PROCESS

Order fulfilment is a value chain. Receive, pick, and ship are **phases** of
that chain — each a child `PROCESS`, not a document-local `STAGE-…` sketch
and not a flow `STEP`. Composition is the first-class `process_parent` REL.
The blueprint columns name those child processes; listing them as columns is
view membership, not the REL.

```
PROCESS-FULFIL-RECEIVE-1  --process_parent-->  PROCESS-FULFIL-CHAIN-1
PROCESS-FULFIL-PICK-1     --process_parent-->  PROCESS-FULFIL-CHAIN-1
PROCESS-FULFIL-SHIP-1     --process_parent-->  PROCESS-FULFIL-CHAIN-1
```

See [`../../../elements/17-relations.md`](../../../elements/17-relations.md) §3
and [`../../../views/diagrams/13-process-blueprint.md`](../../../views/diagrams/13-process-blueprint.md) §5.2.
The existing `STAGE-` only sketch remains at
[`../../process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml`](../../process-blueprint/order-fulfilment.process-blueprint.transitrix.yaml).
