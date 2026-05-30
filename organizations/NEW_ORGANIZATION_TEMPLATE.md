# How to Add a New Organization

This guide explains how to create a new organization directory in Transitrix.

## Method 1: Copy Existing Organization (Recommended)

```bash
cd Transitrix
cp -r organizations/acme_corp organizations/your_company_name
```

This copies all templates, structure, and documentation.

## Method 2: Create from Scratch

```bash
cd Transitrix/organizations

# Create directory structure
mkdir -p your_company_name/{elements/{01_motivation,02_business,03_application,04_technology},relations,.templates/{elements,relations,bpmn},.validators,views}

# Copy templates from acme_corp
cp -r acme_corp/.templates/* your_company_name/.templates/
cp acme_corp/.validators/lint.py your_company_name/.validators/

# Copy documentation and customize
cp acme_corp/README.md your_company_name/README.md
cp acme_corp/GETTING_STARTED.md your_company_name/GETTING_STARTED.md
cp acme_corp/CONVENTIONS.md your_company_name/CONVENTIONS.md
```

## Method 3: Using Script

Create and run `create_organization.sh`:

```bash
#!/bin/bash

ORG_NAME=$1

if [ -z "$ORG_NAME" ]; then
  echo "Usage: ./create_organization.sh <organization_name>"
  exit 1
fi

cd organizations

# Copy from template
cp -r acme_corp "$ORG_NAME"

echo "✓ Created organization: $ORG_NAME"
echo "✓ Structure copied from acme_corp"
echo ""
echo "Next steps:"
echo "1. cd organizations/$ORG_NAME"
echo "2. Edit README.md to describe your organization"
echo "3. Create your first element"
echo "4. Run: python3 .validators/lint.py"
```

Run it:
```bash
chmod +x create_organization.sh
./create_organization.sh my_company
```

## After Creating Organization

### 1. Update Organization Documentation

Edit `organizations/your_company_name/README.md`:
```yaml
# Replace references to acme_corp
# Add your company description
# Update contact information
```

### 2. Verify Structure

```bash
cd organizations/your_company_name
tree -L 2
# Output:
# .
# ├── elements
# │   ├── 01_motivation
# │   ├── 02_business
# │   ├── 03_application
# │   └── 04_technology
# ├── relations
# ├── .templates
# ├── .validators
# ├── views
# ├── README.md
# ├── GETTING_STARTED.md
# └── CONVENTIONS.md
```

### 3. Test Linter

```bash
cd organizations/your_company_name
python3 .validators/lint.py
# Should pass with no elements yet
```

### 4. Create First Element

```bash
cp .templates/elements/01_motivation_template.yaml \
   elements/01_motivation/FIRST_GOAL.yaml

# Edit the file
vim elements/01_motivation/FIRST_GOAL.yaml

# Validate
python3 .validators/lint.py

# Commit
git add elements/01_motivation/
git commit -m "docs(arch): initialize org with first goal [GOAL-XXX-001]"
```

## Organization Naming Convention

Use snake_case for organization directory names:

```
✓ acme_corp
✓ your_company
✓ my_division_west
✓ client_alpha
✓ shared_infrastructure

✗ AcmeCorp
✗ Your Company
✗ your-company
```

## Best Practices

1. **Keep templates synchronized** - If you update templates in one org, share with others
2. **Use same validators** - All organizations should use the same linting rules
3. **Document differences** - If organization has custom rules, document in CONVENTIONS.md
4. **Consistent naming** - Use standardized domain codes and ID formats across all organizations

## Sharing Between Organizations

### Copy updated templates
```bash
cp organizations/acme_corp/.templates/elements/*.yaml \
   organizations/your_company/.templates/elements/
```

### Update validators
```bash
cp organizations/acme_corp/.validators/lint.py \
   organizations/your_company/.validators/
```

### Use Git symlinks (Advanced)
```bash
cd organizations/your_company/.templates
rm -rf elements relations bpmn
ln -s ../../acme_corp/.templates/elements
ln -s ../../acme_corp/.templates/relations
ln -s ../../acme_corp/.templates/bpmn
```

## Multi-Organization CI/CD

Example GitHub Actions for validating all organizations:

```yaml
name: Validate All Organizations

on:
  pull_request:
    paths:
      - 'organizations/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        organization: [acme_corp, your_company, another_org]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Validate ${{ matrix.organization }}
        run: |
          cd organizations/${{ matrix.organization }}
          python3 .validators/lint.py
```

## Directory Structure After Adding Organization

```
Transitrix/
├── organizations/
│   ├── acme_corp/              # Original example
│   ├── your_company/           # Your new organization
│   └── another_org/            # Another organization
├── method/
├── integration/ci-example.yaml
└── README.md
```

## Troubleshooting

### Linter fails after creating organization
```bash
# Verify file exists and has correct id field
cat organizations/your_company/elements/01_motivation/FIRST_GOAL.yaml

# Check YAML syntax
python3 -c "import yaml; yaml.safe_load(open('path/to/file.yaml'))"
```

### Want to see existing organizations
```bash
ls -d organizations/*/
```

### Copy without symlinks on Windows
```bash
# Use xcopy instead of cp -r
xcopy organizations\acme_corp organizations\your_company /E /I
```

---

That's it! Your new organization is ready for architecture modeling. 🎉

For detailed usage, see `organizations/[your_org]/GETTING_STARTED.md`
