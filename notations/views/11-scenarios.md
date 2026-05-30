---
notation: "Scenario Planning"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-19"
status: "documented"
file_extension: "*.scenarios.transitrix.yaml"
dsm_status: "implemented — Scenarios page; scenario-scoped entities planned in release 0.2.4"
---

# Scenario Planning Notation — Reference

**Version:** 0.2
**Date:** 2026-05-19
**Status:** Implemented in Transitrix DSM (core); entity scoping planned in 0.2.4
**File extension:** `*.scenarios.transitrix.yaml`
**Scope:** Alternative strategic development paths for an organisation; each scenario carries its own scoped set of goals, capabilities, activities, products, processes, and applications.
**Renderer:** Transitrix DSM — Scenarios page; Transitrix Studio (planned)

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `scenarios` |
| File extension | `*.scenarios.transitrix.yaml` |

---

## Element lifecycle

Every inline scenario entry (`SCENARIO` canonical TYPE per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1) carries the canonical primitive lifecycle in its frontmatter: `valid_from` and `valid_to`. The contract, field semantics, and validation rules (`LIFECYCLE-001..004`) are defined once in [CONTRACT.md](../CONTRACT.md) §7 and apply uniformly to inline scenarios in this notation. Per [CONTRACT.md](../CONTRACT.md) §7.1, the lifecycle sits on each scenario entry; the scenarios document itself does not carry a lifecycle field.

The entities scoped *within* a scenario (its goals, capabilities, activities, products, processes, applications) are references to other canonical elements — those references inherit lifecycle from their own canonical element files, not from the scenario. A scenario's `valid_from` / `valid_to` marks the period the scenario itself is admitted as a planning consideration; it is distinct from any time horizon the scenario's narrative may describe (e.g. "scenario for 2027").

---

## 1. Overview

A **Scenario** in Transitrix represents an alternative strategic development path for an enterprise. Scenarios allow organisations to model, compare, and select between different futures before committing to a direction.

The primary use case is **enterprise development planning**: different scenarios represent different strategic options — e.g., optimistic, pessimistic, or baseline variants. Each scenario is a self-contained strategic context.

---

## 2. When to use

| Use case | Notation |
|----------|----------|
| Model alternative strategic futures | Scenario |
| Plan development under a specific strategic option | Scenario |
| Compare goal trees across strategic options | Scenario |
| Track which capabilities/activities belong to which strategic path | Scenario |
| Analyse how market evolution (by country, sector) affects strategy | Scenario (future use case — not yet implemented) |

---

## 3. Scenario structure

Each scenario within an organisation contains:

| Element | Description |
|---------|-------------|
| **Name** | Scenario identifier (e.g., "Optimistic 2027", "Conservative baseline") |
| **Vision** | Narrative description of how the organisation develops under this scenario |
| **Factors view** | Scenario-specific view of the shared factor catalogue — which PESTLE/strategic drivers are relevant and how they impact the organisation in this scenario |
| **Goals** | Scenario-specific goal tree |
| **Capabilities** | Capabilities the organisation plans to build or strengthen in this scenario |
| **Activities** | Initiatives and activities designed to achieve the goals in this scenario |
| **Products** | Product portfolio associated with this scenario |
| **Processes** | Business processes designed or adapted for this scenario |
| **Applications** | Applications supporting this scenario |

---

## 4. Factor catalogue vs scenario factor view

The **Strategic Factors catalogue** is shared across all scenarios within an organisation — it represents the external and internal environment analysed once. Inside each scenario, the team works with a **scenario-specific view** of these factors: selecting which ones are relevant and configuring how they impact the organisation under that particular strategic path.

---

## 5. Entities scoped per scenario

The following entities vary by scenario (each has a `scenario_id` binding):

| Entity | Scenario-scoped |
|--------|----------------|
| Goals | Yes |
| Capabilities | Yes |
| Activities | Yes |
| Products | Yes |
| Processes | Yes |
| Applications | Yes |
| Strategic Factors | Shared catalogue; scenario-specific view/relevance |

**Active scenario context:** selecting an active scenario in the application switches the entire strategic context — all entity views (goals, capabilities, activities, products, processes, applications) show only the records belonging to that scenario, plus the relevant factors view.

---

## 6. Multiple scenarios in one organisation

An organisation can maintain multiple development scenarios simultaneously. This enables:

- Comparing strategic options side-by-side
- Running sensitivity analysis on different assumptions
- Preserving historical scenarios as a record of rejected or superseded paths

---

## 7. File location and naming

```
views/scenarios/<NAME>.scenarios.transitrix.yaml
```

Examples:
- `views/scenarios/OPTIMISTIC_2027.scenarios.transitrix.yaml`
- `views/scenarios/CONSERVATIVE_BASELINE.scenarios.transitrix.yaml`

---

## 8. Top-level structure

```yaml
scenario:
  id: "SCN-001"
  name: "Optimistic Growth 2027"
  description: "Aggressive expansion scenario assuming 30% market growth"
  status: "Active"                # Draft | Active | Archived
  created_at: "2026-01-01"

  vision: >
    By 2027 the organisation has expanded into three new markets,
    doubled its digital product portfolio, and achieved maturity level 3
    across all core capabilities.

  factors_view:
    - factor_id: "FAC-MARKET-001"
      relevance: "High"
      impact: "Revenue growth opportunity in CEE region"
    - factor_id: "FAC-TECH-001"
      relevance: "Medium"
      impact: "AI adoption accelerates product differentiation"

  goals:
    - goal_id: "GOAL-REV-001"
    - goal_id: "GOAL-MARKET-001"

  capabilities:
    - capability_id: "CAP-ECOMM-001"
    - capability_id: "CAP-DATA-001"

  activities:
    - activity_id: "ACT-EXPAND-001"
    - activity_id: "ACT-DIGITAL-001"

  products:
    - product_id: "PROD-PLATFORM-001"

  processes:
    - process_id: "PROC-DELIVERY-001"

  applications:
    - app_id: "APP-CRM-001"
    - app_id: "APP-OMS-001"
```

---

## 9. Fields

| Field | Required | Description |
|-------|----------|-------------|
| `scenario.id` | Yes | Unique scenario ID (`SCN-SEQ`) |
| `scenario.name` | Yes | Human-readable scenario name |
| `scenario.description` | No | Short description of the scenario's strategic premise |
| `scenario.status` | Yes | `Draft` / `Active` / `Archived` |
| `scenario.vision` | No | Narrative vision for this scenario |
| `factors_view[].factor_id` | Yes | Reference to a Factor element in the shared catalogue |
| `factors_view[].relevance` | No | `High` / `Medium` / `Low` |
| `factors_view[].impact` | No | Free-text description of the factor's impact under this scenario |
| `goals[].goal_id` | Yes | Reference to a Goal element |
| `capabilities[].capability_id` | Yes | Reference to a Capability element |
| `activities[].activity_id` | Yes | Reference to an Activity element |
| `products[].product_id` | Yes | Reference to a Product element |
| `processes[].process_id` | Yes | Reference to a BusinessProcess element |
| `applications[].app_id` | Yes | Reference to an Application element |

---

## 10. Relationship to other notations

```
Scenario
  └── Goals Tree       (notations/04-goals.md)        — goal tree for this scenario
  └── FGCA             (notations/02-fgca.md)          — factor–goal–activity chain
  └── Capabilities Map (notations/05-capability-map.md)— capabilities in this scenario
  └── Process Map      (notations/06-process-map.md)   — processes in this scenario
  └── Products         (notations/09-products.md)      — product portfolio
  └── Applications     (notations/10-applications.md)  — supporting applications
```

---

## 11. Future use case (planned)

A second application of scenarios — **planning the development of a market situation** (e.g., different regulatory or competitive evolution paths for a country or region) — is in the backlog. This variant is not yet implemented. See DSM ROADMAP release 0.2.4.

---

## 12. References

- DSM: `docs/docs/concepts/scenarios.md`
- Goals tree: `notations/04-goals.md`
- FGCA: `notations/02-fgca.md`
- Capabilities map: `notations/05-capability-map.md`
- ID grammar and TYPE registry: `notations/IDS_AND_REFERENCES.md`
- Methodology section 6: `method/methodology.md`
