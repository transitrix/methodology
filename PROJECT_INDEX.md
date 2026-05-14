# Transitrix Project Index & Navigation

Complete guide to the Transitrix project structure and where to find everything.

---

## 🏠 Project Root Level

### Core Files

| File | Purpose | When to Use |
|------|---------|------------|
| **README.md** | Main project overview | Starting point - explains multi-tenant architecture |
| **PROJECT_INDEX.md** | This file - navigation guide | Need to find something in the project |
| **method/** | Methodology documentation | Understanding the core concepts and principles |
| **TOOLING.md** | Tools & integrations guide | Setting up Transitrix Studio or other tooling |
| **glossary.md** | Project terminology | Looking up standardized terms |
| **organizations/** | All organization directories | Main working area |
| **create_organization.sh** | Script to add new organizations | Adding a new company/team to the project |

### Scripts

```bash
./create_organization.sh <name>     # Create new organization quickly
```

---

## 📁 organizations/ Directory

Multi-tenant structure where each company/team has its own folder.

### Example Organization: acme_corp

```
organizations/acme_corp/
├── elements/                    # Architecture elements by ArchiMate layer
│   ├── 01_motivation/          # Goals, principles, constraints
│   ├── 02_business/            # Roles, processes, functions
│   ├── 03_application/         # Services, components, interfaces
│   └── 04_technology/          # Infrastructure, nodes, deployments
├── relations/                   # Relationships between elements (ATOMIC)
├── .templates/                  # Starting templates for new elements
│   ├── elements/               # Element templates per layer
│   ├── relations/              # Relation template
│   ├── bpmn/                   # BPMN process template
│   └── EXAMPLES.md             # Detailed real-world examples
├── .validators/                 # Validation and linting tools
│   └── lint.py                 # Main validator script
├── views/                       # Diagram generation configurations
│   └── README.md               # How to configure views
├── README.md                    # Organization overview & key info
├── GETTING_STARTED.md          # Step-by-step tutorial for team members
└── CONVENTIONS.md              # Naming standards & best practices
```

### Adding a New Organization

**Option 1: Use the script**
```bash
./create_organization.sh my_company
```

**Option 2: Copy existing organization**
```bash
cp -r organizations/acme_corp organizations/my_company
```

**Option 3: Manual creation**
```bash
mkdir -p organizations/my_company/{elements/{01_motivation,02_business,03_application,04_technology},relations,.templates,.validators,views}
cp organizations/acme_corp/{README.md,GETTING_STARTED.md,CONVENTIONS.md} organizations/my_company/
cp -r organizations/acme_corp/.templates organizations/my_company/
cp organizations/acme_corp/.validators/lint.py organizations/my_company/.validators/
```

See: `organizations/NEW_ORGANIZATION_TEMPLATE.md`

---

## 📖 Documentation Map

### **For Project Managers / Architects**
1. Start: `README.md` (root level)
2. Then: `method/Transitrix Методология...` (full methodology)
3. Reference: `PROJECT_INDEX.md` (this file)

### **For Team Members (First Time)**
1. Start: `organizations/[your_org]/README.md`
2. Tutorial: `organizations/[your_org]/GETTING_STARTED.md`
3. Reference: `organizations/[your_org]/CONVENTIONS.md`

### **For Creating Elements**
1. Review: `organizations/[your_org]/.templates/EXAMPLES.md`
2. Copy: `organizations/[your_org]/.templates/elements/[layer]_template.yaml`
3. Follow: Naming conventions in `CONVENTIONS.md`

### **For Understanding Methodology**
1. Core: `method/Transitrix Методология...`
2. Examples: `organizations/[your_org]/.templates/EXAMPLES.md`
3. Best Practices: `organizations/[your_org]/CONVENTIONS.md`

### **For CI/CD Integration**
1. Reference: `.github_workflows_example.yaml` (root level)
2. Linter: `organizations/[your_org]/.validators/lint.py`
3. Setup: Include linter validation in your pipeline

---

## 🗂️ Organization-Specific Directories

### elements/ - Architecture Elements

**01_motivation/** - Strategic layer
```
Elements you might create:
- GOAL-REV-001.yaml          # Revenue growth goal
- PRIN-SCALE-001.yaml        # Scalability principle
- CONS-COMPLIANCE-001.yaml   # Regulatory constraint
```

**02_business/** - Business layer
```
Elements you might create:
- ROLE-SALES-001.yaml                   # Sales manager role
- PROC-ORD-FULFILL.bpmn.transitrix.yaml           # Order fulfillment process
- FUNC-CUSTOMER-MGT-001.yaml           # Customer management function
```

**03_application/** - Application layer
```
Elements you might create:
- ORDER_API.yaml             # REST API microservice
- PAYMENT_SERVICE.yaml       # Payment processing
- CUSTOMER_DB.yaml           # Data object/database
- API_GATEWAY.yaml           # API interface
```

**04_technology/** - Technology layer
```
Elements you might create:
- POSTGRES_PRIMARY.yaml      # PostgreSQL database node
- KUBERNETES_CLUSTER.yaml    # Kubernetes infrastructure
- REDIS_CACHE.yaml           # Redis cache node
```

### relations/ - Relationships

```
Files you create:
- APP_TO_DB_001.yaml         # Application accesses database
- PROC_TO_APP_001.yaml       # Process uses application
- ROLE_TO_PROC_001.yaml      # Role performs process
```

**Key Rule:** All relations go here, NEVER inside element files.

### .templates/ - Starting Templates

Ready-to-use templates:
```
.templates/
├── elements/
│   ├── 01_motivation_template.yaml
│   ├── 02_business_template.yaml
│   ├── 03_application_template.yaml
│   └── 04_technology_template.yaml
├── relations/
│   └── relation_template.yaml
├── bpmn/
│   └── process_template.bpmn.transitrix.yaml
└── EXAMPLES.md               # Real-world e-commerce example
```

**How to use:**
```bash
cp .templates/elements/03_application_template.yaml \
   elements/03_application/MY_SERVICE.yaml
# Then edit the file
```

### .validators/ - Quality Assurance

```
lint.py                      # Main validation script
```

**Run validation:**
```bash
cd organizations/[your_org]
python3 .validators/lint.py
```

**What it checks:**
- YAML syntax validity
- Atomicity (no relations in elements)
- Referential integrity (all IDs exist)
- Policy compliance (active elements have owners)

### views/ - Diagram Configuration

```
README.md                    # How to configure views
```

**Purpose:** Define which diagrams to generate (PlantUML, Mermaid, SVG)

---

## 📋 Quick Reference

### Creating Your First Element

```bash
# 1. Navigate to organization
cd organizations/my_company

# 2. Choose layer and template
cp .templates/elements/03_application_template.yaml \
   elements/03_application/MY_FIRST_SERVICE.yaml

# 3. Edit file (your editor)
vim elements/03_application/MY_FIRST_SERVICE.yaml

# 4. Validate
python3 .validators/lint.py

# 5. Commit to Git
git add elements/03_application/MY_FIRST_SERVICE.yaml
git commit -m "docs(arch): add first service element"
```

### Creating Your First Relationship

```bash
# 1. In same organization directory
cp .templates/relations/relation_template.yaml \
   relations/SERVICE_TO_DATABASE.yaml

# 2. Edit with source and target IDs
vim relations/SERVICE_TO_DATABASE.yaml

# 3. Validate
python3 .validators/lint.py

# 4. Commit
git add relations/
git commit -m "docs(arch): add service-to-database relationship"
```

### Validating All Organizations

```bash
# Validate each organization
for org in organizations/*/; do
  echo "Validating $(basename $org)..."
  cd "$org"
  python3 .validators/lint.py
  cd ../..
done
```

### Adding New Organization

```bash
# Using script (recommended)
./create_organization.sh new_company_name

# Or manually
cp -r organizations/acme_corp organizations/new_company_name
```

---

## 🎯 Common Tasks & Where to Find Guidance

| Task | See File |
|------|----------|
| Understand the methodology | `method/Transitrix Методология...` |
| Add new organization | `organizations/NEW_ORGANIZATION_TEMPLATE.md` |
| Create first element | `organizations/[org]/GETTING_STARTED.md` |
| Learn naming conventions | `organizations/[org]/CONVENTIONS.md` |
| See real examples | `organizations/[org]/.templates/EXAMPLES.md` |
| Understand relationships | `organizations/[org]/.templates/relations/relation_template.yaml` |
| Learn BPMN format | `organizations/[org]/.templates/bpmn/process_template.bpmn.transitrix.yaml` |
| Set up CI/CD | `.github_workflows_example.yaml` |
| Troubleshoot validation | `organizations/[org]/.validators/lint.py` |

---

## 📊 File Statistics

### Template Files
- **Element Templates:** 4 (by layer)
- **Relation Template:** 1
- **BPMN Template:** 1
- **Examples:** 1 comprehensive doc with e-commerce case study

### Documentation Files
- **Per Organization:** 3 (README, GETTING_STARTED, CONVENTIONS)
- **Root Level:** 2 (main README, PROJECT_INDEX)
- **Methodology:** 1 (Russian, comprehensive)

### Scripts
- **create_organization.sh** - Automated setup for new organizations

### Validators
- **lint.py** - Python validator (copied to each organization)

---

## 🔀 Organization Dependencies

```
Root Level
    ↓
method/
    ↓ (references)
    ├── README.md
    └── organizations/[name]/
            ↓
            ├── .templates/ (references methodology)
            ├── .validators/ (enforces methodology)
            ├── elements/ (created from templates)
            ├── relations/ (created from templates)
            └── documentation (explains templates & validators)
```

---

## ✅ Checklist: Project Setup

- [ ] Read `README.md` (root level)
- [ ] Choose organization name or use existing `acme_corp`
- [ ] Read `organizations/[org]/README.md`
- [ ] Read `organizations/[org]/GETTING_STARTED.md`
- [ ] Create first element from template
- [ ] Run validator: `python3 .validators/lint.py`
- [ ] Review naming in `CONVENTIONS.md`
- [ ] Look at examples in `.templates/EXAMPLES.md`
- [ ] Commit first element to Git
- [ ] Add more elements following the pattern

---

## 🚀 Next Steps

**Just starting?**
→ Go to `organizations/acme_corp/GETTING_STARTED.md`

**Adding new organization?**
→ Run `./create_organization.sh your_name`

**Need examples?**
→ See `organizations/acme_corp/.templates/EXAMPLES.md`

**Want to understand methodology?**
→ Read `method/Transitrix Методология...`

**Setting up CI/CD?**
→ Check `.github_workflows_example.yaml`

---

**Project Version:** 1.0.0  
**Last Updated:** May 3, 2026  
**Multi-Tenant:** Yes ✓  
**Organizations:** 1 example (acme_corp), extensible to many

Happy Architecting! 🏗️
