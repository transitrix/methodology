# `views/processmap/`

Process landscape maps — top-level catalogues of an organisation's processes, grouped by Operating / Supporting / Management. Each process referenced here is a BusinessProcess element under `elements/02_business/`. Detailed flow diagrams (BPMN) live in `views/bpmn/`.

## File convention

`*.process-map.transitrix.yaml`

## Skeleton

```yaml
title: "Acme Corp — Process Landscape"

groups:
  operating:
    - id: "PROC-ORD-FULFILL-001"   # references elements/02_business/<file>.yaml
    - id: "PROC-ORD-PLACE-001"
  supporting:
    - id: "PROC-HR-ONBOARD-001"
  management:
    - id: "PROC-FIN-CLOSE-001"
```

## See also

- `method/methodology.md` §6.4 — process diagrams vs landscape maps
- `views/bpmn/` — detailed flow diagrams for individual processes
- `elements/02_business/` — where individual BusinessProcess elements live
