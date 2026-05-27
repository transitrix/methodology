# `canon/views/bpmn/`

Detailed BPMN 2.0 process flow diagrams. Each file describes the internal flow of a single BusinessProcess element (the thin metadata for which lives at `canon/elements/02_business/<PROCESS_ID>.yaml`).

Compiled from text-native YAML DSL to BPMN 2.0 XML by **Transitrix Studio**.

## File convention

`*.bpmn.transitrix.yaml`

## Templates

Two starting templates ship with the methodology:

- `.templates/bpmn/process_template.bpmn.transitrix.yaml` — basic single-pool, single-lane process.
- `.templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml` — multi-lane, multi-stage process with KPIs.

## See also

- `method/methodology.md` §6.4 — BPMN process diagrams
- `method/bpmn-notation-kit/` — full BPMN DSL spec, rules, and examples
- `canon/elements/02_business/` — thin BusinessProcess element files
