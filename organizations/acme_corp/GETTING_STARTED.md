# Getting Started with Transitrix

Welcome to the Transitrix Architecture-as-Code methodology! This guide will walk you through your first architecture modeling exercise.

## Prerequisites

- Git client
- Text editor (VS Code recommended)
- Python 3.9+ (for running validators)
- Basic understanding of YAML format

## Step 1: Clone and Setup

```bash
git clone <repository-url>
cd Transitrix
pip install pyyaml
```

## Step 2: Understand the Structure

Review the main directories:
- **elements/** - All architecture elements organized by layer
- **relations/** - All relationships between elements
- **.templates/** - Templates to copy when creating new elements
- **.validators/** - Linting tools to ensure consistency

Read `method/Transitrix Методология управления архитектурой предприятия.md` for complete methodology details.

## Step 3: Create Your First Element

Let's add a simple business role.

### Option A: Using Command Line

```bash
# Copy the template
cp .templates/elements/02_business_template.yaml \
   elements/02_business/SALES_MANAGER.yaml

# Open and edit (use your editor)
vim elements/02_business/SALES_MANAGER.yaml
```

### Option B: Manual Steps

1. Go to `elements/02_business/`
2. Create new file: `SALES_MANAGER.yaml`
3. Copy this content:

```yaml
id: "ROLE-SALES-001"
name: "Sales Manager"
type: "BusinessRole"
layer: "Business"

metadata:
  status: "Draft"
  owner: "firstname.lastname"
  created_at: "2026-05-03"
  updated_at: "2026-05-03"
  tags: ["sales", "management"]

properties:
  description: "Responsible for managing sales team and customer relationships"
  scope: "Sales Department"
  criticality: "High"
  responsibility_area: "Revenue Generation"
  competencies:
    - "Sales Strategy"
    - "Team Management"
    - "Customer Relationship Management"

governance:
  approval_required: false
  compliance_frameworks: []
```

4. Save the file

## Step 4: Create a Relationship

Now let's connect the Sales Manager to a business process.

```bash
cp .templates/relations/relation_template.yaml \
   relations/SALES_MANAGER_TO_ORDER_PROCESS.yaml
```

Edit `relations/SALES_MANAGER_TO_ORDER_PROCESS.yaml`:

```yaml
id: "REL-SALES-001"

source:
  id: "ROLE-SALES-001"
  type: "BusinessRole"

target:
  id: "PROC-ORD-001"  # This should be an existing process ID
  type: "BusinessProcess"

type: "Assignment"

metadata:
  status: "Draft"
  created_at: "2026-05-03"
  created_by: "firstname.lastname"

properties:
  description: "Sales Manager is responsible for managing order fulfillment process"
  criticality: "High"
```

**Note:** Make sure the target ID (`PROC-ORD-001`) exists in `elements/02_business/`. For now, you can reference a process you'll create next, or use an existing element ID.

## Step 5: Validate Your Changes

```bash
python3 .validators/lint.py
```

Expected output:
```
🔍 Transitrix Linter v1.0
📂 Scanning: .

Phase 1: Validating YAML syntax...
  ✓ All YAML files are valid

Phase 2: Loading architecture elements...
  ✓ Loaded X elements, Y relations

Phase 3: Checking atomicity...
  ✓ No relations found in element files

Phase 4: Validating referential integrity...
  ⚠️ WARNING: Target element 'PROC-ORD-001' not found

Phase 5: Validating semantic rules...
  ✓ Semantic rules passed

Phase 6: Checking compliance policies...
  ⚠️ WARNING: Element 'ROLE-SALES-001' has status 'Draft' (OK for now)

📊 Results:
  Errors:   0
  Warnings: 1

✅ Validation PASSED - Architecture model is consistent
```

The warning about `PROC-ORD-001` is expected if you haven't created that process yet. Create it to clear the warning.

## Step 6: Create a Business Process (Advanced)

```bash
cp .templates/bpmn/process_template.bpmn.transitrix.yaml \
   elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
```

Edit the file to define your process steps, roles, and systems involved.

## Step 7: Commit and Create a Pull Request

```bash
# Check what you've created
git status

# Stage your changes
git add elements/
git add relations/

# Commit with meaningful message
git commit -m "docs(architecture): add Sales Manager role and order assignment

- Added ROLE-SALES-001: Sales Manager business role
- Added REL-SALES-001: Sales Manager assignment to order process
- Validation passed with 0 errors
"

# Push to remote
git push origin feature/add-sales-architecture

# Create PR on GitHub/GitLab
# Team reviews the architecture changes just like code reviews
```

## Step 8: Review Checklist for PRs

When reviewing an architecture PR, check:

- [ ] All YAML files are valid (linter passed)
- [ ] Element IDs are unique and follow naming convention
- [ ] Relations reference valid source/target IDs
- [ ] No relations defined inside element files (atomicity rule)
- [ ] Status field is appropriate (Draft vs. Active)
- [ ] Owner is assigned for Active/Production elements
- [ ] Descriptions are clear and explain the "why"
- [ ] Layer and type fields match ArchiMate semantics

## Common Workflows

### Add a new microservice

```bash
# Create application component
cp .templates/elements/03_application_template.yaml \
   elements/03_application/ORDER_API.yaml

# Edit and fill in:
# - id: APP-ORD-API-001
# - name: Order API Service
# - tech_stack: FastAPI, Python 3.12
# - api_type: REST
# - repository_url: https://github.com/org/order-api

# Create relation to database
cp .templates/relations/relation_template.yaml \
   relations/ORDER_API_TO_POSTGRES.yaml

# Edit with source=APP-ORD-API-001, target=NODE-DB-001, type=Access

# Validate and commit
python3 .validators/lint.py
git add elements/ relations/
git commit -m "feat: add Order API microservice"
git push
```

### Document infrastructure

```bash
# Create node (database, server, etc.)
cp .templates/elements/04_technology_template.yaml \
   elements/04_technology/POSTGRES_PROD.yaml

# Fill in infrastructure details:
# - id: NODE-DB-001
# - name: PostgreSQL Production Database
# - deployment_location: AWS us-east-1
# - instance_count: 3
# - cpu_cores: 8

python3 .validators/lint.py
git add elements/
git commit -m "docs: add PostgreSQL production cluster to infrastructure"
git push
```

## Useful Tips

### Search for an element
```bash
grep -r "Order API" elements/ --include="*.yaml"
```

### Find all relations pointing to a component
```bash
grep -r "APP-ORD-API-001" relations/ --include="*.yaml"
```

### View YAML structure
```bash
cat elements/03_application/ORDER_API.yaml | head -20
```

### Validate only one file
```bash
python3 -c "
import yaml
with open('elements/03_application/ORDER_API.yaml') as f:
    data = yaml.safe_load(f)
    print('✓ Valid YAML:', data.get('id'))
"
```

## Naming Conventions

### Element IDs
```
[TYPE]-[SHORT_CODE]-[SEQUENCE]

Examples:
- GOAL-PERF-001       (Goal for Performance)
- ROLE-SALES-001      (Business Role for Sales)
- PROC-ORD-001        (Process for Orders)
- APP-SRVC-001        (Application Service)
- NODE-DB-001         (Node - Database)
- INTFC-REST-001      (Interface - REST)
```

### File Names
```
[ELEMENT_NAME].yaml

Examples:
- SALES_MANAGER.yaml
- ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
- POSTGRES_PROD.yaml
```

### Relation IDs
```
REL-[SOURCE_TYPE]-[TARGET_TYPE]-[SEQUENCE]

Examples:
- REL-APP-NODE-001
- REL-ROLE-PROC-001
- REL-SALES-ORDER-001
```

## Troubleshooting

### Linter says "YAML syntax error"
Check your indentation - YAML is whitespace-sensitive. Use 2 spaces per indent level.

### "Referential integrity: Source element not found"
The element ID in your relation doesn't exist. Check:
1. Spelling of the ID
2. Whether the element file is in the correct directory
3. Whether the element file has the correct `id:` field

### "ATOMICITY VIOLATION: Element contains 'relations' section"
You defined relations inside an element file. Move them to a separate file in `relations/`.

### Linter passes but I think something is wrong
Edit `.validators/lint.py` and add your custom validation rule. See the Development section in README.md.

## Next Steps

1. **Model your organization:** Create elements for your business layers
2. **Define relationships:** Connect elements to show dependencies
3. **Create process diagrams:** Use BPMN for detailed process documentation
4. **Set up CI/CD:** Configure automatic validation and diagram generation
5. **Build views:** Create custom views for different stakeholders
6. **Automate reports:** Generate architecture documentation automatically

## Getting Help

- Read the full methodology: `method/Transitrix Методология управления архитектурой предприятия.md`
- Review templates in `.templates/` for detailed examples
- Check the linter output for specific validation issues
- Ask your architecture team - they can help you understand your organization's structure

---

**Happy Architecting! 🏗️**
