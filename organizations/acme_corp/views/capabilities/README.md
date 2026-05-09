# `views/capabilities/`

Capability maps — hierarchical view of capabilities with CMM maturity overlay. Each capability referenced here is a Capability element under `elements/02_business/`.

## File convention

`*.capmap.transitrix.yaml`

## Skeleton

```yaml
title: "Customer-Domain Capabilities"
set_id: "v1.0"
organisation: "Acme Corp"

capabilities:
  - id: "CAP-CRM-001"             # references elements/02_business/CAP-CRM-001.yaml
    address: "1.0.0"              # L1
    maturity:
      - { date: "2026-01-01", level: 2 }
      - { date: "2026-04-01", level: 3 }
  - id: "CAP-CRM-002"
    address: "1.1.0"              # L2 under L1=1
```

## See also

- `method/methodology.md` §6.2 / §6.3 — capabilities and maturity model
- `.templates/capability-map_template.yaml` — copy-and-fill template
- `elements/02_business/` — where individual Capability elements live
