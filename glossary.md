# Transitrix Project Glossary

**Location:** Project root
**Purpose:** Single source of truth for all project terms and abbreviations
**Format:** English
**Last Updated:** 2026-06-20

---

## Architecture & Methodology

| Term | Definition |
|------|-----------|
| **Transitrix** | Lightweight, text-native methodology for managing enterprise architecture as code; stores models, processes, and capabilities as YAML files in a Git repository. Previously known as Lite Enterprise Architecture (LiteEA). |
| **Architecture-as-Code (AaC)** | Approach to defining and managing architecture through text files stored in a Git version control system |
| **ArchiMate** | Open standard for enterprise architecture modelling (current version: 3.2) |
| **Element** | Architectural primitive — the atomic unit of modelling (component, role, goal, node) |
| **Relation** (or Relationship) | A typed link between two architectural elements |
| **Atomicity** | Principle by which an element's description and its relations are stored in separate files |

## Layers

| Term | Definition |
|------|-----------|
| **Motivation Layer** | Strategy layer — goals, principles, constraints, and drivers |
| **Business Layer** | Business layer — roles, processes, functions, and actors |
| **Application Layer** | Application layer — components, services, interfaces, and data objects |
| **Technology Layer** | Technology layer — infrastructure, nodes, system software, and artefacts |

## Element Types

### Motivation Layer Elements

| Type | Example ID |
|------|-----------|
| **Goal** | GOAL-REV-001 |
| **Principle** | PRIN-SCALE-001 |
| **Constraint** | CONS-COMPLIANCE-001 |
| **Driver** | DRIV-MARKET-001 |
| **Outcome** | OUTC-SAVINGS-001 |
| **Value** | VALUE-INNOVATION-001 |

### Business Layer Elements

| Type | Example ID |
|------|-----------|
| **BusinessRole** | ROLE-SALES-001 |
| **BusinessActor** | ACTR-CUSTOMER-001 |
| **BusinessProcess** | PROC-ORD-FULFILL |
| **BusinessFunction** | FUNC-PAYMENT-001 |
| **Service** | SRVC-CUSTOMER-MGT |

### Application Layer Elements

| Type | Example ID |
|------|-----------|
| **ApplicationComponent** | APP-ORD-API-001 |
| **ApplicationService** | SRVC-AUTH-001 |
| **DataObject** | DATA-ORDER-001 |
| **ApplicationInterface** | INTF-REST-API-001 |

### Technology Layer Elements

| Type | Example ID |
|------|-----------|
| **Node** | NODE-DB-001 |
| **SystemSoftware** | SYS-LINUX-001 |
| **Artifact** | ARTF-DOCKER-IMG-001 |
| **Device** | DEV-ROUTER-001 |
| **CommunicationPath** | NET-FIBER-001 |

## Relation Types (ArchiMate 3.2)

| Type | Use Case |
|------|----------|
| **Serving** | A serves / supports B |
| **Assignment** | A role performs an activity |
| **Realization** | A component realises a service |
| **Access** | A component reads or writes data |
| **Composition** | An element is composed of other elements |
| **Aggregation** | Weak containment between elements |
| **Triggering** | An activity triggers another activity |
| **Flow** | Transfer of data, resources, or control |
| **Specialization** | A is a subtype of B |
| **Association** | A generic link between elements |
| **Influence** | A influences B |

## Project Structure

| Term | Definition |
|------|-----------|
| **Organization** | Folder under `organizations/` containing a company's complete architecture |
| **Multi-tenant** | Support for multiple independent organizations in a single repository |
| **Template** | Ready-made YAML file for creating a new element |
| **Validator** (Linter) | Python script for checking architecture integrity |
| **View** | Configuration for generating diagrams |

## File Types

| Extension | Purpose |
|-----------|---------|
| **.yaml** | Architecture elements and relations |
| **.bpmn.transitrix.yaml** | Business process definition in text format |
| **.md** | Project documentation |
| **.py** | Tooling scripts (validator, generator, etc.) |
| **.puml** | PlantUML diagram — preferred format for architecture visualisation |
| **.mmd** | Mermaid diagram — alternative diagram format |

## Metadata Fields

| Field | Type | Example |
|-------|------|---------|
| **id** | String | APP-ORD-001 |
| **name** | String | Order API Service |
| **type** | String | ApplicationComponent |
| **layer** | String | Application |
| **status** | Draft / Active / Deprecated / Archived | Active |
| **owner** | Email / Handle | firstname.lastname |
| **created_at** | YYYY-MM-DD | 2026-05-03 |
| **updated_at** | YYYY-MM-DD | 2026-05-03 |
| **tags** | Array | [microservice, critical] |
| **description** | Text | Clear explanation of purpose |
| **criticality** | Critical / High / Medium / Low | High |

## Abbreviations

| Abbreviation | Full Form |
|--------------|-----------|
| **AaC** | Architecture-as-Code |
| **BPMN** | Business Process Model and Notation |
| **API** | Application Programming Interface |
| **DB** | Database |
| **REST** | Representational State Transfer |
| **YAML** | YAML Ain't Markup Language |
| **Git** | Version Control System |
| **CI/CD** | Continuous Integration / Continuous Delivery |
| **SLA** | Service Level Agreement |
| **RTO** | Recovery Time Objective |
| **RPO** | Recovery Point Objective |

## Status Values

| Value | Meaning |
|-------|---------|
| **Draft** | Under development, not validated |
| **Active** | In use, validated and approved |
| **Deprecated** | Planned for retirement |
| **Archived** | No longer in use, kept for history |

## Criticality Levels

| Level | Definition |
|-------|-----------|
| **Critical** | System failure causes major business impact |
| **High** | System failure causes significant business impact |
| **Medium** | System failure causes moderate business impact |
| **Low** | System failure has minimal business impact |

## Domain Code Examples

| Code | Domain | Example |
|------|--------|---------|
| **ORD** | Orders | GOAL-ORD-001, APP-ORD-API-001 |
| **PAY** | Payments | APP-PAY-SERVICE-001 |
| **USR** | User Management | ROLE-USR-ADMIN-001 |
| **PRD** | Products | PROC-PRD-CATALOG-001 |
| **INV** | Inventory | NODE-INV-DB-001 |
| **SHP** | Shipping | FUNC-SHP-LOGISTICS-001 |
| **NTF** | Notifications | APP-NTF-EMAIL-001 |
| **RPT** | Reporting | SRVC-RPT-ANALYTICS-001 |
| **AUT** | Authentication | APP-AUT-OAUTH-001 |
| **BIL** | Billing | PROC-BIL-INVOICE-001 |

## Documentation Terms

| Term | Context |
|------|---------|
| **README** | Overview document |
| **GETTING_STARTED** | Tutorial for new users |
| **CONVENTIONS** | Naming standards and best practices |
| **EXAMPLES** | Real-world usage examples |
| **GLOSSARY** | This document |
| **ROADMAP** | Project phases and tasks |

## ArchiMate 3.2 Alignment Notes

Transitrix is grounded in ArchiMate 3.2 but uses deliberately simplified or domain-friendly names in several places. The table below records where Transitrix terms differ from the standard and the rationale.

| Transitrix TYPE | ArchiMate 3.2 term | Status |
|---|---|---|
| `DRIVER` (was `FACTOR`) | Driver | Aligned — rename in progress (pre-1.0) |
| `GOAL` | Goal | Aligned |
| `ASSESSMENT` | Assessment | Aligned |
| `STAKEHOLDER` | Stakeholder | Aligned |
| `CONSTRAINT` | Constraint | Aligned |
| `REQUIREMENT` | Requirement | Aligned |
| `BUSINESS_OBJECT` | Business Object | Aligned (renamed from `INFORMATION_ENTITY`) |
| `EQUIPMENT` | Equipment | Aligned |
| `TARGET_STATE` | Plateau | Intentional divergence — "Target State" is more accessible to business stakeholders; the ArchiMate Plateau correspondence is noted in the element spec |
| `CHANGE` | Gap | Intentional divergence — "Change" better reflects the BDN transformation concept in practice; the ArchiMate Gap correspondence is noted in the element spec |
| `SCENARIO` | Course of Action | Intentional divergence — "Scenario" is more intuitive for practitioners; the ArchiMate Course of Action correspondence is noted in the element spec |
| `ACTIVITY` | Work Package | Intentional divergence — "Activity" is broader and covers initiatives, workstreams, and phases; the ArchiMate Work Package correspondence is noted in the element spec |

---

## Notes

- **Consistency:** Use terms from this glossary consistently across all project documents
- **Updates:** Add new terms as the project evolves
- **Abbreviations:** First use as "ABBR (Expanded form)", then abbreviation alone

---

**Version:** 1.3.0
**Status:** Active
**Last Updated:** 2026-06-20
