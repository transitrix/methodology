# `views/applications/`

Filtered views over Application elements (ArchiMate `ApplicationComponent`, `ApplicationService`). Each application is stored atomically as one file under `elements/03_application/<APP_ID>.yaml`. A view here defines how to filter, group, and present a subset.

## File convention

`*.applications.transitrix.yaml`

## Skeleton

```yaml
title: "Production Application Portfolio"
description: "All Active applications, grouped by criticality"

filter:
  type: ["ApplicationComponent", "ApplicationService"]
  status: ["Active", "Production"]

group_by: "properties.criticality"

columns:
  - "name"
  - "owner"
  - "tech_stack"
  - "criticality"
  - "updated_at"
```

## What the view does NOT do

It does not store application data. The application elements live in `elements/03_application/`. A view describes how to render a slice of them — the data stays in the elements.

## See also

- `method/methodology.md` §4 — elements vs views
- `elements/03_application/` — individual Application element files
