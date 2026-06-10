# Transitrix naming conventions & best practices

Conventions for IDs, file names, and element content in a Transitrix repo. The authoritative grammar and registry are [`notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md); the element-file shape is [`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md).

## Naming conventions

### Element IDs

**Format:** `<TYPE>-[<middle segment(s)>-]<INTEGER>` — the canonical grammar ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1). The terminal integer is ≥ 1 with **no leading zeros** (sorting is numeric); middle segments (a domain code, period, programme name) are optional and uppercase.

#### TYPE prefixes (canonical registry)

Use exactly these prefixes; the abbreviated forms `ACT`, `CHG`, `FAC`, `CAP`, `SCN`, `APP`, `PROC`, `PROD` are not valid TYPEs. Authoritative list: [`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §3.

**Element types**

| TYPE | What it is | Layer folder |
|---|---|---|
| `FACTOR` | strategic driver (external / internal) | `01_motivation/factors/` |
| `GOAL` | strategic or tactical goal | `01_motivation/goals/` |
| `CONSTRAINT` | design / operating constraint | `01_motivation/constraints/` |
| `REQUIREMENT` | positive obligation | `01_motivation/requirements/` |
| `CAPABILITY` | capability — V/H address, e.g. `CAPABILITY-V1.2` | `02_business/capabilities/` |
| `PROCESS` | business process | `02_business/processes/` |
| `PRODUCT` | product or service | `02_business/products/` |
| `ROLE` | business role | `02_business/roles/` |
| `UNIT` | organisational unit | `02_business/units/` |
| `EMPLOYEE` | named employee | `02_business/employees/` |
| `RULE` | business rule | `02_business/rules/` |
| `APPLICATION` | application | `03_application/applications/` |
| `INTEGRATION` | integration between applications | `03_application/integrations/` |
| `CHANGE` | business transformation (BDN change layer) | `05_implementation/changes/` |
| `ACTIVITY` | initiative / workstream | `05_implementation/activities/` |

`SCENARIO`, `ISSUE` are **view-defined** (live inside their view document, not as standalone element files) — see [`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §4.

`EQUIPMENT` is catalogued at `canon/elements/04_technology/equipment/`; `BUSINESS_OBJECT` (replaces `INFORMATION_ENTITY`, deprecated alias for one release) is catalogued at `canon/elements/02_business/business-objects/` — both are first-class standalone elements as of ADR 2026-06-08.

**Document-level types** — the view file's own ID; the TYPE names the notation

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
| `ACTIVITY_CARD` | `*.activity-card.transitrix.yaml` |

#### Domain codes

Optional middle segments — short uppercase abbreviations (`ORD`, `PAY`, `USR`, `EU`, `OPS`, …): `GOAL-REVENUE-1`, `ACTIVITY-CRM-EU-1`, `PROCESS-ORD-FULFILL-1`.

#### Sequence numbers

Plain positive integers from `1`, **no leading zeros**: `GOAL-REV-1`, `ROLE-SALES-1`, `APPLICATION-ORD-API-1`.

### Element ID examples

```
✓ GOAL-REVENUE-1          "Triple revenue in 3 years"
✓ PROCESS-ORD-FULFILL-1   "Order Fulfilment"
✓ APPLICATION-OMS-1       "Order Management System"
✓ CAPABILITY-V1.2         "Order Fulfilment" (V/H sub-grammar)
✓ REL-CAP-V11-PARENT-1    parent relation

✗ goal-1                  (TYPE must be uppercase)
✗ APP-OMS-1               (APP is not a TYPE — use APPLICATION)
✗ GOAL-REVENUE-001        (no leading zeros)
✗ APPLICATION_OMS_1       (use hyphens between segments, not underscores)
```

### File names

Element primitives are named **`<ID>.yaml`** — the file name *is* the canonical ID (`GOAL-REVENUE-1.yaml`, `APPLICATION-OMS-1.yaml`). View documents are `<domain>.<short-name>.transitrix.yaml` (`strategy-2026.goals.transitrix.yaml`). No spaces; no underscores standing in for hyphens.

### Relation IDs

First-class relations are `REL-[<middle>-]<INTEGER>` ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1), one file per relation in `canon/relations/`. The *kind* of link lives in the file's `type` field (closed enum `parent` / `goal_parent` / `activity_goal` / `unit_parent`), not in the ID — though a readable convention encodes the endpoints in the middle segments: `REL-CAP-V11-PARENT-1`. See [`notations/elements/17-relations.md`](../../notations/elements/17-relations.md).

### Directory organisation

```
canon/
  elements/<NN>_<layer>/<plural-type>/<ID>.yaml   # one element per file
  relations/REL-….yaml                            # one relation per file (flat)
  assertions/ASSERTION-….yaml
  views/<notation>/<domain>.<short>.transitrix.yaml
field/<sub>/<ID>.yaml
codex/external/<jurisdiction>/<ID>.yaml , codex/internal/<ID>.yaml
```

---

## Best practices

### 1. Write clear descriptions

Explain *what* the element is and *why* it exists in 1–3 scannable sentences. `description: "Order API"` is too thin; name the responsibility and the consumers.

### 2. Carry the full envelope

Every element-primitive file carries ([`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §3): the `notation:` header, identity (`id`/`name`/optional subtype `type`), the **admission record** (`zone`/`admitted_at`/`admitted_by`/`gate_checks`, [`CONTRACT.md`](../../notations/CONTRACT.md) §6), and the **primitive lifecycle** (`valid_from`/`valid_to`, §7). There is **no** `metadata{}` / `properties{}` wrapper — fields sit at the top level.

### 3. Model relationships the canonical way

- **Inline cross-reference** for most links — a typed-ID field (`owner_role: ROLE-…`, `goals: [GOAL-…]`, `applies_to: [PROCESS-…]`). Plural → array, singular → one ID ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §5).
- **First-class `REL` file** only when the link's history matters, and only for the closed `type` enum ([`17-relations.md`](../../notations/elements/17-relations.md)).

(Transitrix does **not** model arbitrary ArchiMate relationships — `Serving`/`Assignment`/`Access`/… are not part of the canonical model.)

### 4. Lifecycle, not free-text status

Temporal validity is `valid_from`/`valid_to` ([`CONTRACT.md`](../../notations/CONTRACT.md) §7); derived states (Planned/Active/Retired) come from comparing those to today. An optional top-level `status` records authoring/workflow state where a notation defines one. Time-varying attributes (a capability's maturity, an application's vendor) live in a `<ID>.history.yaml` sidecar (§9), not inline.

### 5. Quote dates

All dates are quoted ISO 8601 `YYYY-MM-DD` ([`CONTRACT.md`](../../notations/CONTRACT.md) §4): `valid_from: "2026-05-26"`.

### 6. Ownership is a typed reference

Accountability is `owner_role: ROLE-…` (a typed reference to a ROLE element), not a free-text handle.

### 7. Tag for discoverability

Optional `tags: [...]` — e.g. `["customer-facing", "critical"]`.

---

## Quality checklist

Before committing:

- [ ] Every ID follows `<TYPE>-[<middle>-]<INTEGER>` with a canonical TYPE prefix; no leading zeros.
- [ ] No duplicate IDs within the relevant uniqueness scope ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §4).
- [ ] Element files named `<ID>.yaml`, placed in the correct `<NN>_<layer>/<plural-type>/` folder.
- [ ] Each element carries `notation:` + admission record + `valid_from`/`valid_to`.
- [ ] Cross-references resolve to a defined element of the correct TYPE.
- [ ] Dates are quoted ISO 8601.
- [ ] Descriptions explain "what" and "why".
- [ ] Validates in Studio / `npx @transitrix/cli validate <file>`.

## Common mistakes

| Mistake | Example | Fix |
|---|---|---|
| Abbreviated TYPE prefix | `APP-OMS-1`, `PROC-ORD-1` | `APPLICATION-OMS-1`, `PROCESS-ORD-1` |
| Leading zeros | `GOAL-REVENUE-001` | `GOAL-REVENUE-1` |
| Lowercase TYPE | `goal-1` | `GOAL-1` |
| Underscores between segments | `APPLICATION_OMS_1` | `APPLICATION-OMS-1` |
| `metadata`/`properties` wrappers | nested `properties: { … }` | flat top-level fields (§3 envelope) |
| Arbitrary ArchiMate relations | a `Serving` REL | inline cross-reference, or a closed-enum `REL` |
| `title` for the label | `title: "…"` | `name: "…"` |
| Unquoted date | `valid_from: 2026-05-26` | `valid_from: "2026-05-26"` |

---

**Authoritative sources:** [`notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md), [`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md), [`notations/CONTRACT.md`](../../notations/CONTRACT.md). Methodology version is pinned in [`transitrix.yaml`](transitrix.yaml).
