---
notation: "Products Catalogue"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-08"
status: "draft"
file_extension: "*.products.transitrix.yaml"
---

# Products Catalogue Notation — Reference

**Scope:** Structured inventory of an organisation's products and services. A text-and-table catalogue — no diagram. Used to register what the organisation offers to its customers.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `products` |
| File extension | `*.products.transitrix.yaml` |

### Document root fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | MUST equal `products` (per [CONTRACT.md](../CONTRACT.md)) |
| `spec_version` | no | string | reserved field per the shared contract |
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. Per [CONTRACT.md](../CONTRACT.md) §1.1. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per [CONTRACT.md](../CONTRACT.md) §4. |
| `products_catalogue` | yes | object | the products catalogue root — see §4 and §5 |

Example header:

```yaml
notation: products
spec_version: "0.1"
name: "Human-readable title"    # required per CONTRACT.md §1.1
generated_at: "YYYY-MM-DD"      # optional per CONTRACT.md §4
products_catalogue:
  # ... see §4
```

---

## Element lifecycle

Every inline product or service entry under `products[]` carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7 and apply uniformly to inline elements in this notation. Per [CONTRACT.md](../CONTRACT.md) §7.1, the lifecycle sits on each `products[]` entry; the products-catalogue document itself does not carry a lifecycle field. The catalogue's own `status` field (e.g. `active` / `deprecated`) is a notation-specific operational state, distinct from `valid_from` / `valid_to` which mark the period the product element is asserted to exist.

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
      owner_role: "ROLE-PROD-001"
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
      owner_role: "ROLE-CS-001"
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

## 6. Relationship to other notations

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

## 7. References

- BusinessProduct / BusinessService elements: `elements/02_business/*.yaml`
- Process landscape map: `notations/06-process-map.md`
- Applications catalogue: `notations/10-applications.md`
- Capabilities map: `notations/05-capability-map.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6: `method/01-methodology.md`
