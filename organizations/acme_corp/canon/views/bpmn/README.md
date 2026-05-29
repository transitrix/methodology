# `canon/views/bpmn/`

Detailed BPMN 2.0 process flow diagrams. Each file describes the internal flow of a single BusinessProcess element (the thin metadata for which lives at `canon/elements/02_business/<PROCESS_ID>.yaml`).

Compiled from text-native YAML DSL to BPMN 2.0 XML by **Transitrix Studio**.

## File convention

`*.bpmn.transitrix.yaml`

## Templates

Two starting templates ship with the methodology:

- `.templates/bpmn/process_template.bpmn.transitrix.yaml` — basic single-pool, single-lane process.
- `.templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml` — multi-lane, multi-stage process with KPIs.

## Lifecycle

BPMN files use **file-local labels** for their nodes (`POOL-…`, `GW-…`, `TASK-…`, `SF-…`, `SE-…`, `EE-…`) — per [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.3 these are not canonical elements. Neither the BPMN nodes nor the BPMN file itself carries the primitive lifecycle ([`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7). The lifecycle of the process this BPMN represents lives on its corresponding `PROCESS-…` element in [`../processmap/`](../processmap/) — the BPMN is the detailed flow, not the lifecycle bearer.

## See also

- `method/methodology.md` §6.4 — BPMN process diagrams
- `method/bpmn-notation-kit/` — full BPMN DSL spec, rules, and examples
- `canon/elements/02_business/` — thin BusinessProcess element files
