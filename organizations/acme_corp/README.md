# Transitrix: Lite Enterprise Architecture (Architecture-as-Code)

A lightweight, Git-based enterprise architecture methodology that combines ArchiMate 3.2 semantics with modern development workflows.

## 📁 Project Structure

```
Transitrix/
├── transitrix.yaml              # adopter manifest (methodology version, notations, zones)
├── canon/                       # validated model — the authoritative zone
│   ├── elements/                # architecture elements organized by layer
│   │   ├── 01_motivation/       # Goals, principles, constraints, drivers
│   │   ├── 02_business/         # Roles, actors, processes, functions
│   │   ├── 03_application/      # Components, services, interfaces
│   │   └── 04_technology/       # Infrastructure, nodes, artifacts
│   ├── relations/               # Relationship definitions (ATOMIC)
│   └── views/                   # View configurations for diagrams
├── field/                       # raw inputs (interviews, surveys, observations, drafts)
├── codex/                       # external constraints + internal authority docs
├── .templates/                  # Templates for new elements and relations
│   ├── elements/                # Element templates by layer
│   ├── relations/               # Relation template
│   └── bpmn/                    # BPMN process template
├── .validators/                 # Linting and validation scripts
│   └── lint.py                  # Architecture model validator
├── method/                      # Methodology documentation
└── README.md                    # This file
```

## 🚀 Quick Start

### 1. Create a New Element

```bash
# Copy template from .templates/
cp .templates/elements/03_application_template.yaml \
   canon/elements/03_application/MY_SERVICE.yaml

# Edit the file with your specifics
editor canon/elements/03_application/MY_SERVICE.yaml
```

### 2. Define a Relationship

```bash
# Copy relation template
cp .templates/relations/relation_template.yaml \
   canon/relations/MY_SERVICE_TO_DB.yaml

# Edit with source and target element IDs
editor canon/relations/MY_SERVICE_TO_DB.yaml
```

### 3. Validate Your Changes

```bash
# Run the linter
python3 .validators/lint.py

# Output:
# ✓ YAML syntax valid
# ✓ Atomicity check passed
# ✓ Referential integrity OK
# ✓ Policies compliant
```

### 4. Create a Pull Request

```bash
# Git workflow - same as code development
git checkout -b feature/new-service
git add canon/elements/ canon/relations/
git commit -m "docs: add OrderProcessor service and DB relations"
git push origin feature/new-service

# Create PR - your team reviews the architecture changes as a diff
```

## 📋 Element Types by Layer

### Motivation Layer (01_motivation/)
- **Goal**: Strategic business objectives
- **Principle**: Core design principles
- **Constraint**: Boundaries and limitations
- **Driver**: External business drivers
- **Outcome**: Measurable results
- **Value**: Business value propositions

### Business Layer (02_business/)
- **BusinessRole**: Organizational roles and responsibilities
- **BusinessActor**: Entities that perform business functions
- **BusinessProcess**: End-to-end processes (often .bpmn.transitrix.yaml)
- **BusinessFunction**: Reusable business capabilities
- **Service**: Business services offered

### Application Layer (03_application/)
- **ApplicationComponent**: Microservices, modules, components
- **ApplicationService**: High-level service interfaces
- **DataObject**: Data structures and schemas
- **ApplicationInterface**: APIs and integration points

### Technology Layer (04_technology/)
- **Node**: Physical/virtual infrastructure (servers, containers)
- **SystemSoftware**: Operating systems, middleware, databases
- **Artifact**: Deployable packages (containers, JARs, binaries)
- **Device**: Hardware devices
- **CommunicationPath**: Network connections and protocols

## 🔗 Relationship Types (ArchiMate)

- **Serving**: Provides or supports (A serves B)
- **Assignment**: Allocates or assigns (role assigns activity)
- **Realization**: Implements or fulfills (component realizes service)
- **Access**: Consumes or accesses data (component accesses data object)
- **Composition**: Made up of components
- **Aggregation**: Collections of elements
- **Triggering**: Initiates or causes (activity triggers another activity)
- **Flow**: Transfers or exchanges (data, resources)
- **Specialization**: Is a subtype of
- **Association**: Related to
- **Influence**: Impacts or affects
- **Junction**: Logical connections

## ✅ Validation Rules

### Syntax
- All files must be valid YAML

### Atomicity
- **NO relations inside element files** - must be separate files in `canon/relations/`
- Each element describes only itself (id, name, type, properties, metadata)

### Referential Integrity
- All `source` and `target` IDs in relations must point to existing elements
- Forward references are tracked as warnings during validation

### Semantic Compliance
- Relations must follow ArchiMate layer rules
- Example: ApplicationComponent should not directly "Serve" BusinessRole without an Interface

### Policies
- **Active/Production status** requires `metadata.owner` to be assigned
- Critical elements require approval before changes
- All relations with high criticality require documentation

## 🔍 Using the Linter

```bash
# Basic validation
python3 .validators/lint.py

# Exit codes:
# 0 = All checks passed
# 1 = Errors found (blocks commit/merge)

# Environment variable for custom root
REPO_ROOT=. python3 .validators/lint.py
```

## 📊 Viewing Diagrams

Architecture views are generated automatically in CI/CD and stored as:
- PlantUML (.puml) - for C4 and entity diagrams
- Mermaid (.mmd) - for flowcharts and sequences
- SVG - for web embedding and documentation

View configurations are in `canon/views/` - edit these to customize what gets visualized.

## 🔄 Git Workflow

### Typical commit message format:
```
docs(architecture): add OrderProcessor service [APP-ORD-001]

- New microservice for order orchestration
- Created ApplicationComponent element
- Added relations to OrderDB and NotificationService
- Validates against lint rules
```

### Review checklist for architecture PRs:
- [ ] YAML syntax is valid (linter passed)
- [ ] All element IDs are unique
- [ ] Relations reference valid source/target IDs
- [ ] Status and owner fields are correct
- [ ] Description clearly explains the "why"
- [ ] No relations inside element files (atomicity)

## 📚 Documentation

- See `method/Transitrix Методология управления архитектурой предприятия (Architecture-as-Code).md` for full methodology
- See `.templates/` directory for detailed examples of each element and relation type
- See `canon/views/README.md` for diagram generation configuration

## 🛠️ Development

### To add a validator rule:
Edit `.validators/lint.py` and add a method to the `TransitrixLinter` class:

```python
def _check_custom_rule(self):
    """Your custom validation logic"""
    for element_id, element_data in self.elements.items():
        if some_condition:
            self.errors.append(LintError(
                file=f"canon/elements/*/{element_id}.yaml",
                line=0,
                message="Your error message",
                severity="error"
            ))
```

### To add a new element type:
1. Create template in `.templates/elements/` (e.g., `05_new_layer_template.yaml`)
2. Create directory in `canon/elements/` if new layer (e.g., `canon/elements/05_new_layer/`)
3. Document new type in this README
4. Update linter semantic rules if needed

## 🤝 Contributing

1. **Create elements** by copying templates
2. **Define relations** atomically in `canon/relations/`
3. **Run linter** before committing
4. **Create PR** for team review
5. **Merge** after approval (automatic diagram generation occurs)

## 📝 License

This methodology and templates are part of the Transitrix project.

---

**Last Updated:** May 3, 2026  
**Methodology Version:** 1.0.0
