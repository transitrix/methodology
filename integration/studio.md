# Transitrix & Transitrix Studio Integration Guide

**Version:** 1.0.0
**Date:** 2026-05-03
**Status:** Active

---

## Overview

**Transitrix** (Lite Enterprise Architecture) — a methodology for managing enterprise architecture as code (Architecture-as-Code) with Git storage.

**Transitrix BPMN Authoring Tool (Transitrix Studio)** — a specialised tool for visualising, editing, and managing business processes in BPMN 2.0 notation.

Together they form a complete stack for **comprehensive enterprise architecture modelling** — from strategic goals to technical process implementation.

---

## Architecture Stack

```
Transitrix + Transitrix Studio = Complete Architecture-as-Code Stack

┌─────────────────────────────────────────────────────────┐
│ Transitrix Methodology                                   │
├─────────────────────────────────────────────────────────┤
│ • Multi-tenant organization structure                    │
│ • 4 ArchiMate layers (Motivation, Business, App, Tech)   │
│ • Atomic element/relation separation                     │
│ • Capability maturity modeling (CMM 5-level)             │
│ • Git as Single Source of Truth                          │
├─────────────────────────────────────────────────────────┤
│ Business Layer (Business Processes & Capabilities)       │
│ ├─ Capabilities (V/H hierarchy, maturity tracking)       │
│ └─ Processes (BPMN 2.0) ← Transitrix Studio handles this│
├─────────────────────────────────────────────────────────┤
│ Application & Technology Layers                          │
│ ├─ Application Components, Services                      │
│ ├─ Technology Infrastructure, Nodes                      │
│ └─ Relations linking all layers together                 │
└─────────────────────────────────────────────────────────┘
```

---

## How They Work Together

### 1. Modelling Processes in Transitrix Studio

```yaml
# organizations/acme_corp/elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml

id: "PROC-ORD-FULFILL-001"
name: "Order Fulfillment Process"
type: "BusinessProcess"

bpmn:
  lanes:
    - id: "lane_sales"
      name: "Sales Team"
      actor_role: "ROLE-SALES-001"        # ← Reference to BusinessRole
      responsible_system: "APP-CRM-001"   # ← Reference to ApplicationComponent

    - id: "lane_warehouse"
      name: "Warehouse"
      actor_role: "ROLE-WAREHOUSE-MANAGER-001"
      responsible_system: "APP-WMS-001"
```

### 2. Defining Capabilities in Transitrix

```yaml
# organizations/acme_corp/elements/02_business/ORGANIZATION_CAPABILITIES.yaml

capabilities:
  - id: "V1"
    name: "Order Management"
    type: "domain"
    category: "Strategic"

    maturity_levels:
      - level: 2
        effective_from: "2026-05-03"
        status: "Current"

    # Link to business process
    business_process: "PROC-ORD-FULFILL-001"  # ← Links to BPMN process above

    # Link to supporting systems
    applications: ["APP-CRM-001", "APP-WMS-001", "APP-OMS-001"]
```

### 3. Defining Architectural Elements

```yaml
# organizations/acme_corp/elements/03_application/CRM_SYSTEM.yaml

id: "APP-CRM-001"
name: "Customer Relationship Management System"
type: "ApplicationComponent"
layer: "Application"

properties:
  tech_stack: "Salesforce Platform"
  criticality: "High"
```

### 4. Connecting All Layers

```
Strategy (Goals & Principles)
  ↓
Capabilities (V1.1: Order Management)
  ├─ Maturity Level: 2 (Repeatable)
  ├─ Process: PROC-ORD-FULFILL-001 (BPMN)
  │   ├─ Lane: Sales Team (ROLE-SALES-001)
  │   │   └─ System: APP-CRM-001
  │   └─ Lane: Warehouse (ROLE-WAREHOUSE-MANAGER-001)
  │       └─ System: APP-WMS-001
  └─ Supporting Applications
      ├─ APP-CRM-001 (Salesforce)
      └─ APP-WMS-001 (Warehouse System)
```

---

## Workflow: From Strategy to Process

### Example: Order Management Capability

**Step 1: Define the strategy (Transitrix)**

```yaml
# Goal
- id: "GOAL-FAST-DELIVERY"
  name: "Deliver orders within 48 hours"
  category: "Strategic"
```

**Step 2: Break down into capabilities (Transitrix)**

```yaml
# Capability V1: Order Management
- id: "V1"
  name: "Order Management"
  business_process: "PROC-ORD-FULFILL-001"
  target_maturity: 3
  target_date: "2026-12-31"
```

**Step 3: Design the process (Transitrix Studio)**

Open in VS Code with the Transitrix Studio extension:
```
organizations/acme_corp/elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
```

Define:
- Lanes: Sales, Warehouse, Logistics
- Stages: Order Placement, Processing, Delivery
- Systems: CRM, WMS, Notification Service
- KPIs: Order-to-Delivery Time (target: 48h)

**Step 4: Define applications (Transitrix)**

```yaml
# APP-CRM-001, APP-WMS-001, APP-NOTIF-001
```

**Step 5: Link capability to process and applications (Transitrix)**

```yaml
capabilities:
  - id: "V1"
    business_process: "PROC-ORD-FULFILL-001"
    applications: ["APP-CRM-001", "APP-WMS-001", "APP-NOTIF-001"]
```

**Result:** Complete traceability from strategic goal to technical implementation.

---

## File Locations & Naming

### Transitrix Organization Structure

```
organizations/acme_corp/
├── elements/
│   ├── 01_motivation/
│   │   └── GOALS.yaml                          # Goals supporting capabilities
│   ├── 02_business/
│   │   ├── ORGANIZATION_CAPABILITIES.yaml      # Capability map
│   │   ├── BUSINESS_ROLES.yaml                 # Roles in processes
│   │   ├── BUSINESS_ACTORS.yaml                # Organizational units
│   │   ├── ORDER_FULFILLMENT_process.bpmn.transitrix.yaml # BPMN process ← Transitrix Studio
│   │   └── ...                                 # Other processes
│   ├── 03_application/
│   │   ├── APP-CRM-001.yaml                    # Systems referenced by processes
│   │   ├── APP-WMS-001.yaml
│   │   └── ...
│   └── 04_technology/
│       ├── DB-POSTGRES-001.yaml                # Infrastructure
│       └── ...
├── relations/
│   ├── CAPABILITY-TO-PROCESS.yaml              # V1 → PROC-ORD-FULFILL
│   ├── PROCESS-TO-ROLE.yaml                    # PROC → ROLE-SALES-001
│   ├── PROCESS-TO-APP.yaml                     # PROC → APP-CRM-001
│   └── ...
```

### Naming Conventions

| Item | Format | Example |
| --- | --- | --- |
| **BPMN Process File** | `[NAME]_process.bpmn.transitrix.yaml` | `ORDER_FULFILLMENT_process.bpmn.transitrix.yaml` |
| **Process ID** | `PROC-[DOMAIN]-[SEQ]` | `PROC-ORD-FULFILL-001` |
| **Lane Actor Role** | `ROLE-[DOMAIN]-[TYPE]-[SEQ]` | `ROLE-SALES-001`, `ROLE-WAREHOUSE-MANAGER-001` |
| **Supporting System** | `APP-[DOMAIN]-[SEQ]` | `APP-CRM-001`, `APP-WMS-001` |
| **Capability ID** | `V[N]`, `V[N].[N]` (or H for horizontal) | `V1`, `V1.1`, `H1` |

---

## Transitrix Studio Quick Commands

### Edit a Process

```bash
cd organizations/acme_corp

# Open in VS Code (with Transitrix Studio extension)
code elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml

# OR use the web UI
cd /path/to/transitrix-studio
npm run serve
# Open http://127.0.0.1:3000 → select your process
```

### Validate & Export

```bash
# Compile to BPMN 2.0 XML
node /path/to/transitrix-studio/dist/cli.js compile \
  organizations/acme_corp/elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml \
  /tmp/ORDER_FULFILLMENT.bpmn

# Run Transitrix validators
python3 organizations/acme_corp/.validators/lint.py
```

### Preview in Browser

```bash
cd /path/to/transitrix-studio
npm run serve
# Opens at http://127.0.0.1:3000
# Load your YAML, see BPMN preview on the right
```

---

## Integration Points

### From Process to Architecture

**When you create or modify a BPMN process:**

1. ✅ Reference existing ROLE elements (lane.actor_role)
2. ✅ Reference existing APP elements (step.supporting_system)
3. ✅ Update capability map if process supports a new capability
4. ✅ Add relations linking process → roles → systems
5. ✅ Validate: `python3 .validators/lint.py`
6. ✅ Commit to Git with message: `docs(process): add ORDER_FULFILLMENT BPMN`

### From Capability to Process

**When planning maturity improvements:**

1. ✅ Identify capability (e.g., V1: Order Management)
2. ✅ Design process in Transitrix Studio (ORDER_FULFILLMENT_process.bpmn.transitrix.yaml)
3. ✅ Define required systems (APP-CRM-001, APP-WMS-001)
4. ✅ Link capability → process in ORGANIZATION_CAPABILITIES.yaml
5. ✅ Set target_maturity and target_date
6. ✅ Track progress via capability roadmap

---

## Tools Ecosystem

| Tool | Purpose | Integration |
| --- | --- | --- |
| **Transitrix** | Architecture methodology + multi-tenant structure | Source of truth for all elements |
| **Transitrix Studio** | BPMN process authoring + visualization | Handles `02_business/*_process.bpmn.transitrix.yaml` files |
| **Git** | Version control + Single Source of Truth | All files committed + history preserved |
| **lint.py** | YAML validation + referential integrity | Validates ArchiMate references in processes |
| **VS Code** | Editor with Transitrix Studio extension | Live BPMN preview while editing |

---

## Documentation Map

### Transitrix Documentation

- **method/** — Complete methodology (English)
- **README.md** — Project overview
- **PROJECT_RULES.md** — Naming standards, conventions
- **glossary.md** — 50+ standardized terms
- **roadmap.md** — Project implementation phases
- **integration/tooling.md** — Tools and integration guide
- **integration/studio.md** — This file (Transitrix + Transitrix Studio)

### Transitrix Studio Documentation

- **README.md** — Quick start
- **CLAUDE.md** — Layout algorithm details
- **diagram-rules.md** — Routing rules (R1–R6, L1)
- **roadmap.md** — Development phases (RD-001 to RD-078+)
- **examples/** — Sample BPMN processes

### Per-Organization Documentation

- **organizations/[org]/README.md** — Organization overview
- **organizations/[org]/GETTING_STARTED.md** — Step-by-step tutorials
- **organizations/[org]/CONVENTIONS.md** — Local naming standards
- **organizations/[org]/.templates/EXAMPLES.md** — Real-world examples

---

## Common Workflows

### Create a New Process

1. **In Transitrix:**
   ```bash
   cp organizations/acme_corp/.templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml \
      organizations/acme_corp/elements/02_business/NEW_PROCESS_process.bpmn.transitrix.yaml
   ```

2. **In VS Code + Transitrix Studio:**
   - Open the file
   - Edit lanes, stages, steps
   - See BPMN preview update in real-time

3. **Reference Architecture:**
   - Set `lane.actor_role` to existing ROLE-XXX-001
   - Set `step.supporting_system` to existing APP-XXX-001
   - Transitrix Studio will validate references

4. **Validate & Commit:**
   ```bash
   python3 .validators/lint.py
   git add elements/02_business/NEW_PROCESS_process.bpmn.transitrix.yaml
   git commit -m "docs(process): add NEW_PROCESS with lanes"
   ```

### Improve Process Quality (Maturity)

1. **Identify capability** needing improvement (e.g., V1.1 at level 2, target level 3)
2. **Redesign process** in Transitrix Studio (add quality gates, data flow, KPIs)
3. **Update capability maturity:**
   ```yaml
   - id: "V1.1"
     maturity_levels:
       - level: 2
         effective_from: "2026-05-03"
       - level: 3
         effective_from: "2026-12-31"
         status: null  # future target
   ```
4. **Track in roadmap** (Transitrix roadmap.md or Transitrix Studio roadmap.md)

---

## Best Practices

### Process Design

- ✅ **One process per file:** Easier to track changes in Git
- ✅ **Explicit actor lanes:** Shows who does what
- ✅ **Data flow:** Always define required_data and output_data
- ✅ **Quality gates:** Include checkpoints for complex processes
- ✅ **KPIs:** Measure what matters (time, quality, cost)
- ❌ **Avoid:** Multiple pools (Transitrix Studio supports single-pool only)

### ArchiMate Integration

- ✅ **Use exact IDs:** ROLE-SALES-001, APP-CRM-001 (must exist in architecture)
- ✅ **Link capabilities:** process.business_process in capability map
- ✅ **Create relations:** explicit files in relations/ folder
- ✅ **Validate:** `lint.py` checks all references
- ❌ **Avoid:** Hardcoding system names instead of IDs

### Git Workflow

- ✅ **Atomic commits:** One process = one commit
- ✅ **Clear messages:** `docs(process): add ORDER_FULFILLMENT with 3 lanes`
- ✅ **Pull requests:** Have someone review BPMN changes
- ❌ **Avoid:** Large diff PRs mixing multiple processes

---

## Troubleshooting

### "ArchiMate reference not found"

**Problem:** Transitrix Studio or lint.py reports that ROLE-SALES-001 doesn't exist.

**Solution:**
1. Check if ROLE exists: `grep -r "ROLE-SALES-001" organizations/acme_corp/elements/`
2. If missing, create it: `cp .templates/elements/02_business_template.yaml elements/02_business/SALES_ROLE.yaml`
3. Update with ID `ROLE-SALES-001`
4. Run `lint.py` again

### "Process won't compile"

**Problem:** Transitrix Studio shows "Compilation failed" or lint.py reports BPMN errors.

**Solution:**
1. Check YAML syntax (VS Code YAML linter should help)
2. Ensure mandatory fields: id, lanes, stages, steps
3. Verify lane.actor_role and step.supporting_system reference valid elements
4. Check for duplicate element IDs within the process
5. Run `npm test` in Transitrix Studio directory to ensure tool is working

### "Swimlane axis not aligned"

**Problem:** Elements in different lanes don't line up vertically (cross-lane flows look bent).

**Solution:**
1. This is expected for multi-lane processes with different step counts
2. Adjust layout parameters in `.layout-options` if desired
3. Check `CLAUDE.md` section "Swimlane axis" in the Transitrix Studio repo for algorithm details

---

## Version History

| Date | Version | Changes |
| --- | --- | --- |
| 2026-05-03 | 1.0.0 | Initial integration guide created |
| 2026-05-08 | 1.0.1 | Translated to English; moved to integration/ |

---

**Status:** Active
**Maintained by:** Transitrix Team
**License:** MIT
