---
notation: "FGA Strategy-to-Execution Chain"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-08"
status: "draft"
file_extension: "*.fga.transitrix.yaml"
---

# FGA Notation — Reference

**Scope:** Simplified strategy-to-execution chain in three layers: Factor → Goal → Activity. Skips the Changes layer present in FGCA.
**Renderer:** Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all eleven Transitrix notations and defined in [CONTRACT.md](CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `fga` |
| File extension | `*.fga.transitrix.yaml` |

---

## 1. Overview

FGA is the simplified variant of FGCA. It is used when the transformation step between goals and activities is implicit or trivial — when activities directly and obviously serve goals without needing an intermediate change layer.

FGA answers the same core management question as FGCA:

> *How do our day-to-day initiatives directly support strategic intent?*

Use FGA when the organisation operates in a fast-moving context where the Changes layer would add overhead without adding clarity. Use FGCA when strategic changes require explicit management attention.

| | FGCA | FGA |
|--|------|-----|
| Layers | Factor → Goal → Change → Activity | Factor → Goal → Activity |
| Use when | Strategy-to-execution needs explicit change management | Activities map directly to goals |
| File extension | `*.fgca.transitrix.yaml` | `*.fga.transitrix.yaml` |

---

## 2. When to use

| Situation | Recommendation |
|-----------|---------------|
| Activities clearly serve goals with no intermediate transformation step | FGA |
| Strategy requires significant organisational change to become reality | FGCA |
| Quick operational planning with known goals and tasks | FGA |
| Multi-quarter transformation programme | FGCA |

---

## 3. File location and naming

```
views/fga/<DOMAIN>.fga.transitrix.yaml
```

Examples:
- `views/fga/Q3_OPERATIONS.fga.transitrix.yaml`
- `views/fga/GROWTH_2026.fga.transitrix.yaml`

---

## 4. Top-level structure

```yaml
fga:
  id: "FGA-OPS-001"
  name: "Q3 Operational Initiatives"
  description: "Direct mapping of Q3 activities to strategic goals"
  period: "2026-Q3"

  factors:
    - id: "FACTOR-CHURN-001"
      name: "Rising customer churn in SMB segment"
      type: "external"               # external | internal
      goals:
        - id: "GOAL-RET-001"
          name: "Improve SMB retention to 90%"
          activities:
            - id: "ACT-ONBOARD-001"
              name: "Redesign onboarding flow"
              owner: "ROLE-PRODUCT-001"
              status: "In Progress"
              due_date: "2026-09-30"
            - id: "ACT-SUPPORT-001"
              name: "Launch dedicated SMB support tier"
              owner: "ROLE-CS-001"
              status: "Planned"
              due_date: "2026-08-31"
```

---

## 5. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `fga.id` | Yes | Unique ID for this view (`FGA-DOMAIN-SEQ`) |
| `fga.name` | Yes | Human-readable name |
| `fga.period` | No | Time period this FGA covers |
| `factors[].id` | Yes | Unique factor ID |
| `factors[].name` | Yes | Description of the driving factor |
| `factors[].type` | Yes | `external` or `internal` |
| `goals[].id` | Yes | References an existing Goal element ID |
| `goals[].name` | Yes | Goal name (should match the element) |
| `activities[].id` | Yes | Unique activity ID |
| `activities[].name` | Yes | Activity description |
| `activities[].owner` | No | Reference to BusinessRole element ID |
| `activities[].status` | No | `Planned` / `In Progress` / `Done` |
| `activities[].due_date` | No | Target completion date (YYYY-MM-DD) |

---

## 6. Difference from FGCA

FGCA adds a `changes` layer between goals and activities:

```
FGCA: Factor → Goal → Change → Activity
FGA:  Factor → Goal →          Activity
```

When converting FGA to FGCA: identify the implicit change each goal demands and make it explicit. This is the right move when a goal requires organisational transformation, not just execution.

---

## 7. References

- FGCA notation: `notations/02-fgca.md`
- Goals tree notation: `notations/04-goals.md`
- Goal elements: `elements/01_motivation/*.yaml` (type: Goal)
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6.2: `method/methodology.md`
