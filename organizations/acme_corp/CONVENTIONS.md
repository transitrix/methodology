# Transitrix Naming Conventions & Best Practices

## Naming Conventions

### Element IDs

Element IDs uniquely identify architecture elements and must follow a strict format for consistency and searchability.

**Format:** `<TYPE>-[<middle segment(s)>-]<INTEGER>` — the canonical ID grammar defined in [`notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md). The terminal integer is a positive number ≥ 1 with **no leading zeros**; middle segments (a domain code, period, or programme name) are optional.

#### Type prefixes (canonical registry)

Use exactly these prefixes; the abbreviated forms `ACT`, `CHG`, `FAC`, `CAP`, `SCN` are deprecated. The authoritative list lives in `IDS_AND_REFERENCES.md` §3.

**Element types**

| TYPE | What it is |
|---|---|
| `FACTOR` | strategic driver (external / internal) |
| `GOAL` | strategic or tactical goal |
| `CHANGE` | business transformation (BDN change layer) |
| `ACTIVITY` | initiative / workstream |
| `CAPABILITY` | capability — V/H address, e.g. `CAPABILITY-V1.2` (see appendix §2) |
| `PROCESS` | business process |
| `PRODUCT` | product or service |
| `APPLICATION` | application |
| `INTEGRATION` | integration between applications |
| `ROLE` | business role |
| `UNIT` | organisational unit |
| `EMPLOYEE` | named employee |
| `SCENARIO` | strategic scenario |
| `ISSUE` | issue — problem, defect, or open question |
| `EQUIPMENT` | physical instrument / device / facility a process stage depends on |
| `INFORMATION_ENTITY` | data / document / record produced or consumed by a process stage |
| `RULE` | business rule (`elements/02_business/rules/`) |
| `CONSTRAINT` | design / operating constraint (`elements/01_motivation/constraints/`) |

**Document-level types** — the file's own ID; the TYPE names the notation

| TYPE | Notation file |
|---|---|
| `FGCA` | `*.fgca.transitrix.yaml` |
| `FGA` | `*.fga.transitrix.yaml` |
| `GOALS_TREE` | `*.goals.transitrix.yaml` |
| `CAPABILITY_MAP` | `*.capability-map.transitrix.yaml` |
| `PROCESS_MAP` | `*.process-map.transitrix.yaml` |
| `ACTIVITIES_NET` | `*.activities.transitrix.yaml` |
| `PRODUCTS_CAT` | `*.products.transitrix.yaml` |
| `APPLICATIONS_CAT` | `*.applications.transitrix.yaml` |
| `SCENARIOS` | `*.scenarios.transitrix.yaml` |
| `BLOCKS` | `*.blocks.transitrix.yaml` |
| `ISSUES_CAT` | `*.issues.transitrix.yaml` |
| `PROCESS_BLUEPRINT` | `*.process-blueprint.transitrix.yaml` |

> **Drift note.** Some current catalogue specs and example files still use abbreviated cross-reference prefixes (`APP-`, `PROC-`, `PROD-`) and zero-padded sequences (`-001`). These are tracked migrations (IDS_AND_REFERENCES.md §6) and will converge on the canonical forms above; follow each notation spec's own examples until its migration lands.

#### Domain Codes

Use meaningful 2-4 letter abbreviations for the domain:

```
ORD   = Orders
PAY   = Payments
USR   = Users / User Management
PRD   = Products
INV   = Inventory
SHP   = Shipping
NTF   = Notifications
RPT   = Reporting
AUT   = Authentication
BIL   = Billing
```

#### Sequence numbers

Use plain positive integers starting from `1` — **no leading zeros** (sorting and comparison are numeric, not lexical):

```
GOAL-REV-1        (First revenue goal)
GOAL-REV-2        (Second revenue goal)
ROLE-SALES-1      (First sales role)
APPLICATION-ORD-API-1  (First order API component)
```

### Element ID Examples

```
✓ GOAL-PERF-001        "Improve Performance"
✓ PROC-ORD-FULFILL     "Order Fulfillment Process"
✓ APP-ORD-API-001      "Order API Service"
✓ NODE-DB-ORDERS-PROD  "PostgreSQL Orders DB"
✓ REL-APP-NODE-001     "App to Database Access"

✗ goal-001             (Don't use lowercase)
✗ APP_ORDER_API        (Don't use underscores in IDs)
✗ OrderAPI             (Use uppercase prefixes)
✗ GOAL                 (Missing domain and sequence)
```

### File Names

**Format:** `[ELEMENT_NAME].[EXTENSION]`

```
SALES_MANAGER.yaml
ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
POSTGRES_PROD.yaml
PAYMENT_SERVICE.yaml
```

**Rules:**
- Use UPPER_SNAKE_CASE for clarity
- Match element name with file name (makes searching easier)
- Extension:
  - `.yaml` for regular elements and relations
  - `.bpmn.transitrix.yaml` for BPMN processes
- No spaces in file names
- No special characters except underscore

### Relation IDs

**Format:** `REL-[SOURCE_TYPE]-[TARGET_TYPE]-[SEQUENCE]`

```
REL-APP-NODE-001         (Application to Node)
REL-ROLE-PROC-001        (Role to Process)
REL-PROC-APP-002         (Process to Application)
REL-DATA-NODE-001        (Data to Infrastructure)
```

### Directory Organization

```
elements/
  01_motivation/
    GOAL_REVENUE_GROWTH.yaml
    PRIN_SCALABILITY.yaml
    CONS_REGULATORY_COMPLIANCE.yaml
  02_business/
    SALES_MANAGER.yaml
    ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
    CUSTOMER_SERVICE_FUNCTION.yaml
  03_application/
    ORDER_API.yaml
    PAYMENT_SERVICE.yaml
    CUSTOMER_DATABASE.yaml
  04_technology/
    POSTGRES_PRIMARY.yaml
    KUBERNETES_CLUSTER.yaml
    REDIS_CACHE.yaml

relations/
  APP_TO_DB_001.yaml
  PROC_TO_APP_001.yaml
  ROLE_TO_PROC_001.yaml
```

---

## Best Practices

### 1. Write Clear Descriptions

**Good Description:**
```yaml
description: "REST API for order management that handles order creation, validation, 
payment processing coordination, and real-time status updates. Serves web, mobile, 
and third-party integrations."
```

**Poor Description:**
```yaml
description: "Order API"
```

**Guidelines:**
- Explain the "what" (what does this element do?)
- Explain the "why" (why does it exist? what problem does it solve?)
- Include key capabilities and integrations
- Keep it 1-3 sentences, scannable
- Use clear, non-technical language where possible

### 2. Maintain Atomicity

**GOOD - Relations in separate file:**
```
elements/03_application/ORDER_API.yaml
relations/APP_ORDER_API_TO_DB.yaml
relations/APP_ORDER_API_TO_CACHE.yaml
```

**BAD - Relations in element file:**
```yaml
id: "APP-ORD-API-001"
name: "Order API"
type: "ApplicationComponent"
relations:
  - target: "NODE-DB-001"
    type: "Access"
```

**Rule:** Never put a `relations` section inside element files.

### 3. Use Consistent Status Values

Only use these status values - no variations:

```yaml
metadata:
  status: "Draft"        # Under development, not validated
  status: "Active"       # In use, validated
  status: "Deprecated"   # Planned for retirement
  status: "Archived"     # No longer in use
```

**Guidelines:**
- New elements start as `Draft`
- Move to `Active` after review and approval
- Use `Deprecated` while planning sunset
- Use `Archived` for historical reference only

### 4. Always Assign Ownership

```yaml
metadata:
  owner: "firstname.lastname"  # Individual responsible for this element
```

**Rules:**
- Required for all `Active` and `Production` status elements
- Use consistent email or handle format across team
- Should be someone who can answer questions about the element
- Update when ownership changes

### 5. Use Consistent Date Format

**Format:** `YYYY-MM-DD` or `Month DD, YYYY` in descriptions

```yaml
metadata:
  created_at: "2026-05-03"
  updated_at: "2026-05-04"

properties:
  updated_at: "May 4, 2026"  # In descriptions (optional)
```

### 6. Tag Elements for Categorization

Use tags to enable searching and filtering:

```yaml
metadata:
  tags: ["microservice", "api", "critical", "customer-facing"]
```

**Common tags:**
```
microservice, monolith, internal-service
critical, high, medium, low
customer-facing, internal
core-process, supporting
deprecated, legacy
security-critical, pii-data
```

### 7. Document Dependencies Clearly

```yaml
properties:
  dependencies:
    - "APP-PAYMENT-SERVICE-001"
    - "APP-NOTIFICATION-SERVICE-001"
    - "NODE-REDIS-CACHE-001"
```

### 8. Version Your Architecture

Include version and last review dates:

```yaml
versioning:
  current_version: "2.3.1"
  last_review_date: "2026-05-03"
  next_review_date: "2026-08-03"
```

### 9. Write Meaningful Relation Descriptions

**Good:**
```yaml
properties:
  description: "Order API reads all order data and writes transaction records. 
               Synchronous access pattern with average latency < 50ms."
```

**Poor:**
```yaml
properties:
  description: "Order API accesses database"
```

### 10. Use Correct ArchiMate Relationship Types

Choose the semantically correct type:

```
Serving       - A serves/supports B
Assignment    - Allocates/assigns (role to activity)
Realization   - Implements/fulfills (component realizes service)
Access        - Reads/consumes (component accesses data)
Composition   - Made up of (element contains subelements)
Aggregation   - Collections of (weakly related elements)
Triggering    - Initiates/causes (activity triggers another activity)
Flow          - Transfers/exchanges (data, material, control)
```

---

## Quality Checklist

Before committing architecture changes:

- [ ] All element IDs follow `[TYPE]-[DOMAIN]-[SEQUENCE]` format
- [ ] No duplicate IDs in the repository
- [ ] File names match element names (UPPER_SNAKE_CASE)
- [ ] All relations in separate files (atomicity rule)
- [ ] Descriptions are clear and explain "what" and "why"
- [ ] Active elements have assigned owner
- [ ] Status values are from approved list only
- [ ] Dates are in consistent format
- [ ] All source/target IDs in relations exist
- [ ] Relationship types are semantically correct (ArchiMate)
- [ ] Tags are meaningful and consistent
- [ ] Test passes: `python3 .validators/lint.py`

---

## Common Mistakes to Avoid

| Mistake | Example | Fix |
|---------|---------|-----|
| Lowercase IDs | `app-order-001` | `APP-ORD-001` |
| Underscores in IDs | `APP_ORDER_001` | `APP-ORD-001` |
| Inconsistent status | `Active`, `active`, `ACTIVE` | `Active` |
| Missing owner | No `metadata.owner` | `owner: "email@company.com"` |
| Relations in elements | `relations:` section inside element | Move to separate file |
| Vague descriptions | "Order system" | "REST API for order placement and status tracking" |
| Wrong date format | `03/05/2026` | `2026-05-03` |
| Relation type mismatch | ApplicationComponent "Serves" BusinessRole | Use Interface or correct type |
| Inconsistent naming | Mix of abbreviations and full words | Define and stick to abbreviations |

---

## Migration Guide: Old Naming → Transitrix Format

If you're migrating from another system:

| Old Format | Transitrix Format | Reason |
|------------|---------------|--------|
| `orderAPI` | `APP-ORD-API-001` | Standardized prefixes, machine-readable |
| `Database_1` | `NODE-DB-ORDERS-PROD` | Clear purpose, no underscores in IDs |
| `ORDER-PROCESS-v2` | `PROC-ORD-FULFILL` | No versioning in ID, use versioning field |
| `SalesRole` | `ROLE-SALES-001` | Consistent prefix, standardized |
| `REL_001` | `REL-APP-NODE-001` | Clear source/target types in ID |

---

## Questions?

- **How do I choose domain codes?** Use 2-4 letter abbreviations of the business domain
- **Can I modify status values?** No - stick to Draft, Active, Deprecated, Archived
- **What if a component has multiple purposes?** Create separate elements or use more specific domain codes
- **How often should I update elements?** Update `updated_at` whenever you make changes
- **Can file names differ from element names?** Recommended: keep them the same for discoverability

---

**Last Updated:** May 3, 2026  
**Version:** 1.0.0
