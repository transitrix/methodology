# `views/products/`

Filtered views over Product elements. Each Product is stored atomically as one file under `elements/02_business/<PRODUCT_ID>.yaml` (with `type: Product`). A view here defines how to filter, group, and present a subset of those products — for example, "active retail products grouped by category" or "products by maturity stage".

## File convention

`*.products.transitrix.yaml`

## Skeleton

```yaml
title: "Active Retail Portfolio"
description: "Products currently in market, grouped by category"

filter:
  type: "Product"
  status: ["Active", "Production"]
  tags: ["retail"]

group_by: "category"               # field on the Product element

columns:
  - "name"
  - "owner"
  - "launched_at"
  - "stage"
```

## What the view does NOT do

It does not store product data. The Product elements live in `elements/02_business/`. A view describes how to render a slice of them — the data stays in the elements.

## See also

- `method/methodology.md` §4 — elements vs views
- `elements/02_business/` — individual Product element files
