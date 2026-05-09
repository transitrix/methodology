#!/bin/bash
#
# Transitrix: Create New Organization
# Usage: ./create_organization.sh <organization_name>
#
# This script creates a new organization directory with all required
# structure, templates, and documentation.
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check argument
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Organization name required${NC}"
    echo "Usage: ./create_organization.sh <organization_name>"
    echo ""
    echo "Examples:"
    echo "  ./create_organization.sh acme_corp"
    echo "  ./create_organization.sh my_company"
    echo "  ./create_organization.sh client_alpha"
    exit 1
fi

ORG_NAME=$1

# Validate organization name (snake_case)
if ! [[ "$ORG_NAME" =~ ^[a-z0-9_]+$ ]]; then
    echo -e "${RED}Error: Organization name must be lowercase with underscores only${NC}"
    echo "Valid: acme_corp, my_company, client_alpha"
    echo "Invalid: AcmeCorp, my-company, My Company"
    exit 1
fi

ORG_PATH="organizations/$ORG_NAME"

# Check if organization already exists
if [ -d "$ORG_PATH" ]; then
    echo -e "${RED}Error: Organization '$ORG_NAME' already exists${NC}"
    echo "Path: $ORG_PATH"
    exit 1
fi

# Check if acme_corp template exists
if [ ! -d "organizations/acme_corp" ]; then
    echo -e "${RED}Error: Template organization 'acme_corp' not found${NC}"
    echo "Please ensure organizations/acme_corp/ exists"
    exit 1
fi

echo -e "${BLUE}Creating new organization: ${GREEN}$ORG_NAME${NC}"
echo ""

# Copy organization template
echo -e "${BLUE}[1/4]${NC} Copying structure from acme_corp..."
cp -r organizations/acme_corp "$ORG_PATH"
echo -e "${GREEN}✓${NC} Directory structure created"

# Update organization documentation
echo -e "${BLUE}[2/4]${NC} Updating documentation..."

# Update README.md
sed -i.bak "s/acme_corp/$ORG_NAME/g" "$ORG_PATH/README.md"
sed -i.bak "s/ACME Corporation/$ORG_NAME (Organization)/g" "$ORG_PATH/README.md"
rm -f "$ORG_PATH/README.md.bak"

# Update GETTING_STARTED.md
sed -i.bak "s/acme_corp/$ORG_NAME/g" "$ORG_PATH/GETTING_STARTED.md"
rm -f "$ORG_PATH/GETTING_STARTED.md.bak"

echo -e "${GREEN}✓${NC} Documentation updated"

# List structure
echo -e "${BLUE}[3/4]${NC} Verifying structure..."
if [ -d "$ORG_PATH/elements/01_motivation" ] && \
   [ -d "$ORG_PATH/elements/02_business" ] && \
   [ -d "$ORG_PATH/elements/03_application" ] && \
   [ -d "$ORG_PATH/elements/04_technology" ] && \
   [ -d "$ORG_PATH/relations" ] && \
   [ -d "$ORG_PATH/.templates" ] && \
   [ -d "$ORG_PATH/.validators" ]; then
    echo -e "${GREEN}✓${NC} All directories created successfully"
else
    echo -e "${RED}✗${NC} Some directories missing"
    exit 1
fi

# Test linter
echo -e "${BLUE}[4/4]${NC} Testing linter..."
cd "$ORG_PATH"
python3 .validators/lint.py > /dev/null 2>&1 && \
    echo -e "${GREEN}✓${NC} Linter validated successfully" || \
    echo -e "${RED}⚠${NC} Linter returned warnings (this is OK for empty org)"
cd - > /dev/null

echo ""
echo -e "${GREEN}✅ Organization created successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. cd organizations/$ORG_NAME"
echo "  2. Edit README.md with your organization details"
echo "  3. Create your first architecture element:"
echo "     cp .templates/elements/01_motivation_template.yaml \\"
echo "        elements/01_motivation/YOUR_GOAL.yaml"
echo "  4. Validate: python3 .validators/lint.py"
echo "  5. Commit: git add . && git commit -m 'docs(arch): initialize $ORG_NAME'"
echo ""
echo "For detailed guide, see:"
echo "  organizations/$ORG_NAME/GETTING_STARTED.md"
echo "  organizations/$ORG_NAME/CONVENTIONS.md"
echo ""
