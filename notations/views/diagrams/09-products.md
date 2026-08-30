---
notation: "Products Catalogue"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-08-30"
status: "documented"
file_extension: "*.products.transitrix.yaml"
---

# Products Catalogue Notation — Reference

**Scope:** Structured inventory of an organisation's products and services. A text-and-table catalogue — no diagram. Used to register what the organisation offers to its customers. Supports both inline authoring and projection over canonical PRODUCT elements.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `products` |
| File extension | `*.products.transitrix.yaml` |

---

## Source of truth

A Products Catalogue document has two valid authoring forms — both use the same YAML field schema:

- **Inline form (default):** `products[]` entries are authored directly in the view file. The file is self-contained. This is the expected form for a new adopter and for smaller product portfolios.
- **Projection form (Full tier — post-promotion):** the file carries only a `view_config` block that selects PRODUCT elements already admitted to `canon/elements/02_business/products/`. No product data is in this file; the renderer loads the elements at view time. See [`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §4.

The **promotion trigger** is cross-document sharing: a product stays inline until a second document references it; at that point it is promoted to a standalone element file in `canon/elements/02_business/products/` and both documents reference it by ID ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §1). Promotion is optional until it is forced by sharing — do not split elements into per-file form from day one.

The reconstruction invariant applies: `render(Elements, view_config)` → Products Catalogue. Deleting `views/products/` loses no model knowledge. See [`CONTRACT.md`](../../CONTRACT.md) §14 (view_config contract).

**Where products are authored.** In the inline form, products are authored directly in the view file under `products_catalogue.products[]`. In the projection form, new products are authored as standalone element files in `canon/elements/02_business/products/<PRODUCT-…>.yaml`, following the canonical element envelope ([`ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §3 and §7.4). The Products Catalogue view then projects over them. This is the same pattern as Goals Tree, DGCA, and the Actions Tree.

---

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `products` (per [CONTRACT.md](../../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `methodology_version` | yes (from v2.0) | string | methodology release this document conforms to |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../../CONTRACT.md) §1.1. |
| `id` | yes | string | document ID — `PROD-[<middle>-]<INTEGER>` per the canonical grammar |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../../CONTRACT.md) §4. |
| `description` | no | string | one-paragraph context |
| `products_catalogue` | yes (inline) / no (projection) | object | the products catalogue root — required in inline form; see §4 and §5. Absent in projection form. |
| `view_config` | no (inline) / yes (projection) | object | view configuration block — optional in inline form (selects a subset of inline products to render); required in projection form (is the only content of the file). See §"view_config for products" below. |

**Inline form** example header:

```yaml
notation: products
spec_version: "0.2"
methodology_version: "4.2.0"
id: PROD-ENTERPRISE-1
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
products_catalogue:
  # ... see §4
```

**Projection form** example header:

```yaml
notation: products
spec_version: "0.2"
methodology_version: "4.2.0"
id: PROD-RETAIL-1
name: "Retail product portfolio"
description: "All products and services offered in the retail channel"
view_config:
  # ... see view_config section below
```

---

## Element lifecycle

Every inline product or service entry under `products[]` carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../../CONTRACT.md) §7.1, the lifecycle sits on each `products[]` entry; the products-catalogue document itself does not carry a lifecycle field. The catalogue's own `status` field (e.g. `active` / `deprecated`) is a notation-specific operational state, distinct from `valid_from` / `valid_to` which mark the period the product element is asserted to exist.

---

## 1. Overview

The products catalogue answers the question: **what products and services does the organisation offer?**

It is a catalogue view over Business Product and Business Service elements defined in `elements/02_business/`. It does not replace those element files — it aggregates them into a structured view with additional metadata relevant to portfolio management.

---

## 2. When to use

| Use case | Use products catalogue? |
|----------|------------------------|
| Register a product or service offering | Yes |
| Show how a product is delivered (process) | No — use BPMN |
| Show which applications support a product | No — use Applications catalogue or ArchiMate |
| Compare product portfolio across domains | Yes |
| Track product maturity and ownership | Yes |

---

## 3. File location and naming

```
views/products/<DOMAIN>.products.transitrix.yaml
```

Examples:
- `views/products/ENTERPRISE.products.transitrix.yaml`
- `views/products/DIGITAL_CHANNEL.products.transitrix.yaml`

---

## 4. Top-level structure

```yaml
products_catalogue:
  id: "PROD-CAT-001"
  name: "Enterprise Products Catalogue"
  description: "Full inventory of products and services offered by the organisation"
  version: "1.0"
  updated_at: "2026-05-08"

  products:
    - product_id: "PROD-ECOMM-001"
      name: "E-Commerce Platform"
      type: "digital_product"          # digital_product | service | platform | bundle
      domain: "Digital"
      owner_role: "ROLE-PROD-1"
      status: "Active"                 # Draft | Active | Deprecated
      maturity: 3                      # CMM level 1–5
      description: "Online storefront and order management for end customers"
      capabilities:
        - "CAPABILITY-V1"
        - "CAPABILITY-V2"
      processes:
        - "PROC-ORD-FULFILL-001"
      supporting_apps:
        - "APP-OMS-001"
        - "APP-CRM-001"

    - product_id: "SVC-SUPPORT-001"
      name: "Customer Support Service"
      type: "service"
      domain: "Operations"
      owner_role: "ROLE-CS-1"
      status: "Active"
      description: "Tier-1 and Tier-2 support for customers via chat, email, and phone"
```

---

## 5. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `products_catalogue.id` | Yes | Unique catalogue ID (`PROD-CAT-DOMAIN-SEQ`) |
| `products_catalogue.name` | Yes | Human-readable name |
| `products_catalogue.updated_at` | Yes | Last update date (YYYY-MM-DD) |
| `products[].product_id` | Yes | Unique product ID — references element in `elements/02_business/` |
| `products[].name` | Yes | Product name (should match the element) |
| `products[].type` | Yes | `digital_product` / `service` / `platform` / `bundle` |
| `products[].domain` | No | Business domain this product belongs to |
| `products[].owner_role` | No | BusinessRole element ID of the product owner |
| `products[].status` | Yes | `Draft` / `Active` / `Deprecated` |
| `products[].maturity` | No | CMM level 1–5 |
| `products[].description` | No | Short product description |
| `products[].capabilities` | No | List of capability IDs this product realises |
| `products[].processes` | No | List of BusinessProcess element IDs that deliver this product |
| `products[].supporting_apps` | No | List of Application element IDs |

---

## 6. view_config for products

The `view_config` block (see [`CONTRACT.md`](../../CONTRACT.md) §14) defines which elements to include and how to display them in projection form. All fields are optional; omitted fields fall back to the defaults below.

### view_config defaults

```yaml
# Canonical defaults — a view_config that omits any of these falls back to the value shown.
view_config:
  selection:
    filter: all              # include every active PRODUCT in canon
    ids: []                  # when filter is "ids": explicit PRODUCT-… list to include
    types: []                # when filter is "types": include products of these types (digital_product | service | platform | bundle)
    domains: []              # when filter is "domains": include products in these business domains
    owner_roles: []          # when filter is "owner_roles": include products owned by these ROLE-… IDs
    extensions_key: null     # when set: filter by extension — e.g., "pricing_model" matches products with `extensions.pricing_model` field
    extensions_value: null   # the value to match in the extension; paired with extensions_key
    valid_at: null           # ISO 8601 date; renderer includes only products whose lifecycle spans this date
  display:
    depth: null              # maximum depth (reserved for hierarchical rendering); null = unlimited
    order_by: name           # sort field: name | type | domain | owner_role | status | maturity | custom
    collapsed: []            # list of product IDs to render as collapsed sections (if supported by renderer)
```

### view_config keys

**`selection.filter`** — which products to include:
- `all`: include every product in canon
- `ids`: include only the products listed in `selection.ids[]`
- `types`: include only products whose `type` is in `selection.types[]`
- `domains`: include only products whose `domain` is in `selection.domains[]`
- `owner_roles`: include only products whose `owner_role` is in `selection.owner_roles[]`
- `extensions`: include only products that have a specific extension key/value pair (set `extensions_key` and `extensions_value`)

**`selection.valid_at`** — lifecycle filtering (optional):
- Omit to include all products regardless of lifecycle
- Set to an ISO 8601 date (e.g., `"2026-08-30"`) to include only products whose `valid_from ≤ valid_at` and (`valid_to` is null or `valid_to ≥ valid_at`)

**`display.order_by`** — sort order for the catalogue:
- `name`: alphabetical by product name
- `type`: by product type
- `domain`: by business domain
- `owner_role`: by owning role
- `status`: by status (Draft, Active, Deprecated)
- `maturity`: by CMM level (1–5)
- `custom`: renderer-defined ordering (reserved for future use)

### Projection form example

A Products Catalogue document in projection form carries only the `view_config` and envelope; product details are loaded from canonical elements:

```yaml
notation: products
spec_version: "0.2"
methodology_version: "4.2.0"
id: PROD-DIGITAL-1
name: "Digital Products & Services"
description: "All digital-channel offerings sorted by maturity"
generated_at: "2026-08-30"

view_config:
  selection:
    filter: domains
    domains: [Digital]
  display:
    order_by: maturity
    depth: null
```

Another example — products offered for free (via extension):

```yaml
notation: products
spec_version: "0.2"
id: PROD-FREE-1
name: "Free Product Tier"

view_config:
  selection:
    filter: extensions
    extensions_key: pricing_model
    extensions_value: free
```

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `PROD-001` | error | `notation` missing or does not equal `products`. |
| `PROD-002` | error | `id` missing or does not match `PROD-[<middle>-]<INTEGER>`. |
| `PROD-003` | error | `name` missing or empty. |
| `PROD-004` | error | `methodology_version` missing in projection form or non-projection form with `methodology_version` ≥ 2.0. |
| `PROD-005` | error | `view_config.selection.filter` is an unknown value (must be one of: `all`, `ids`, `types`, `domains`, `owner_roles`, `extensions`). |
| `PROD-006` | error | `view_config.selection.filter` is `ids` but `selection.ids[]` is empty or missing. |
| `PROD-007` | error | `view_config.selection.filter` is `extensions` but `extensions_key` and/or `extensions_value` are missing. |
| `PROD-008` | error | A `view_config.selection.*[]` entry (id, type, domain, owner_role) references a non-existent entity in canon. |
| `PROD-009` | warning | Both `products_catalogue.products[]` (inline) and `view_config` are present. Inline form takes precedence; `view_config` is ignored. |
| `PROD-010` | error | `view_config.display.order_by` is an unknown value. |

Element-level validation (product type conformance, role references, lifecycle rules) lives in the PRODUCT element rules applied when canonical element files are validated, not here.

---

## 8. Relationship to other notations

```
Products Catalogue       →  what we offer
        ↓
Process Landscape Map    →  how we deliver it
        ↓
Applications Catalogue   →  what systems support delivery
        ↓
Capabilities Map         →  what capabilities are required
```

---

## 9. References

- BusinessProduct / BusinessService elements: `elements/02_business/*.yaml`
- Process landscape map: `notations/06-process-map.md`
- Applications catalogue: `notations/10-applications.md`
- Capabilities map: `notations/05-capability-map.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology, notation kit: `method/04-notations.md`
