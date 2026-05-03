# LiteEA Project Rules & Standards

Project-specific adaptation of AI Agent Rules (v1.0.5-global)  
**Last Updated:** May 3, 2026  
**Status:** Active

---

## 📋 Naming & Code Standards

### File & Folder Naming

- **Documentation files:** lowercase kebab-case (e.g., `ai-agent-rules-1.0.5-global.md`)
- **Python files:** snake_case (e.g., `lint.py`, `validate_elements.py`)
- **Project folders:** lowercase snake_case (e.g., `acme_corp`, `my_company`)
- **Organization folders:** lowercase snake_case (e.g., `organizations/your_company`)
- **Architecture element files:** UPPER_SNAKE_CASE (e.g., `ORDER_API.yaml`, `SALES_MANAGER.yaml`)
- **Relation files:** Descriptive UPPER_SNAKE_CASE (e.g., `APP_TO_DB_001.yaml`)
- **Archive folders:** Exactly `0.archive` (always numbered with zero)

### Architecture Element IDs

- **Format:** `[TYPE]-[DOMAIN]-[SEQUENCE]`
- Use uppercase letters and hyphens only
- Examples: `APP-ORD-001`, `ROLE-SALES-001`, `NODE-DB-001`
- Must be unique within organization
- Never use underscores in element IDs (use hyphens instead)

### Python Code Standards

- **Variables & functions:** snake_case (e.g., `def validate_yaml()`)
- **Classes:** PascalCase (e.g., `class LiteEALinter`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `VALID_STATUSES = [...]`)
- **Avoid:** ambiguous names like `data`, `temp`, `value1`

### YAML Field Naming

- **Top-level fields:** lowercase with underscores (e.g., `metadata`, `properties`, `references`)
- Keep terminology consistent with `glossary.md`

---

## 🌍 Languages & Terminology

### Language Policy

- **Project documentation:** English (primary) + Russian (where specified by user)
- **Technical terms:** Always use English for element types and architectural concepts
- **Glossary:** Primary term in English, Russian translation in parentheses
- **Architecture elements:** IDs and descriptions must be in English

### Glossary Requirements

- **Location:** `glossary.md` in project root
- **Format:** `English term (Russian translation)`
- **Examples:**
  - Element: Architecture Element (Архитектурный элемент)
  - Relation: Relationship / Relation (Связь)
  - Layer: ArchiMate Layer (Слой ArchiMate)
  - Atomicity: Atomic Separation (Атомарное разделение)

### Abbreviation Usage

- **First mention:** `ABBR (Expanded form in English)`
- **Subsequent mentions:** Just the abbreviation
- Example: `ArchiMate (Architecture Information Model)`, then just `ArchiMate`

---

## 📖 Documentation Standards

### Format & Structure

- **Preferred format:** Markdown (.md)
- **Diagram format:** PUML (PlantUML) > Mermaid > SVG
- **Structure:** title, purpose, scope, assumptions, content, decisions, open questions
- **Style:** Short paragraphs and bullet points, avoid long blocks
- **Length:** Keep responses concise

### Required Documentation Files

Every organization must include:
- `README.md` - Organization overview
- `GETTING_STARTED.md` - Quick start tutorial
- `CONVENTIONS.md` - Naming standards & best practices
- `.templates/EXAMPLES.md` - Real-world examples

Root project must include:
- `README.md` - Project overview
- `PROJECT_INDEX.md` - Navigation guide
- `glossary.md` - All project terms (TO BE CREATED)
- `roadmap.md` - Project roadmap with tasks (TO BE CREATED)
- `stakeholders.md` - Project stakeholders (if applicable)

### Conversion Rules

- When converting from Office formats to Markdown: Use MS Markitdown tool (unless preserving illustrations requires otherwise)
- Use MS Markitdown for bulk document conversions
- Manual editing for complex formatting

### Source Verification

- ✅ Use international, English-language sources
- ❌ Avoid Russian sources for information verification
- ❌ Avoid sources identified as part of Russian disinformation networks
- Corroborate claims with minimum 2 independent non-Russian sources

---

## 📊 Project Management

### Roadmap Requirements

**File:** `roadmap.md` (project root)

**Format:**
```markdown
- [ ] 1.1 RD-001 Task description
  - [ ] 1.1.1 RD-002 Subtask
```

**Rules:**
- Every phase and task has checkbox: `- [ ]` (incomplete) or `- [x]` (complete)
- Maximum nesting: 4 levels
- Hierarchical numbers (1.2.3) can change during restructuring
- Stable IDs (RD-NNN) never change or reuse
- Reference in documents: `roadmap: RD-XXX`

**Example task:**
```markdown
- [ ] 1.1 RD-001 Create LiteEA architecture framework
  - [x] 1.1.1 RD-002 Define ArchiMate layer structure
  - [ ] 1.1.2 RD-003 Create YAML templates
    - [ ] 1.1.2.1 RD-004 Element templates
    - [ ] 1.1.2.2 RD-005 Relation templates
  - [ ] 1.1.3 RD-006 Build validation linter
```

### Archive Management

**Location:** `0.archive/` in project root and subfolders

**Rules:**
- Never delete files - move to nearest `0.archive` folder
- Files moved from: `element/` → `0.archive/` (keep structure)
- Can create local `0.archive` in subfolders when needed
- When analyzing project: **Ignore all `0.archive` folders** (outdated/superseded)
- Git: Exclude `0.archive` from pushes via `.gitignore`

**Project already uses:** ✓ `0.archive` in each organization

---

## 🎨 Design & UI

### Interface Standards

- **Language:** English only for UI text
- **Date format:** YYYY-MM-DD
- **Time format:** HH:MM (24-hour)
- **Theme:** Light mode (day mode) preferred
- **Layout:** Horizontal tabs with two levels max, vertical tree for deeper nesting

### Status Indicators

- User info, DB availability, DB size, AI model, AI availability
- Preferred: LED-style indicators
- System message bar colors: 🟢 Green (info) 🟡 Yellow (warning) 🔴 Red (error)
- Message timestamp format: YYYY-MM-DD HH:MM

---

## 🤖 Working Practices for AI Agents

### Task Execution

- Restate task intent internally before output
- Apply minimal sufficient changes
- Do not alter unrelated content
- Ask one focused clarifying question if uncertain
- Label assumptions explicitly
- Provide output in ready-to-use format

### Documentation Work

- Preserve original style unless refactoring requested
- Preserve system-specific terms exactly (official names)
- Do not invent facts, system behavior, or references
- State assumptions clearly when info is missing

### LiteEA-Specific Practices

- Validate YAML syntax before committing
- Run `lint.py` to check atomicity and integrity
- Never put relations inside element files
- Keep element IDs stable (don't rename existing elements)
- Update `updated_at` timestamp when modifying elements
- Verify all source/target IDs exist in relations

---

## 🔐 Git Integration

### .gitignore Rules

Add to project `.gitignore`:

```gitignore
# Archive folders (across entire project tree)
0.archive/
**/0.archive/

# Agent rules file (not for remote)
*ai-agent-rules*.md
ai-agent-rules-*.md

# Python cache
__pycache__/
*.pyc
.pytest_cache/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

---

## ✅ Project Compliance Checklist

- [x] Naming conventions defined for all artifact types
- [x] Archive folder (`0.archive`) implemented in each organization
- [ ] `glossary.md` created in project root (TODO)
- [ ] `roadmap.md` created in project root with RD-XXX task IDs (TODO)
- [ ] `stakeholders.md` created if stakeholders exist (TODO)
- [x] Documentation in Markdown format
- [x] Python code follows snake_case standards
- [x] Element IDs use uppercase with hyphens
- [x] YAML templates for all ArchiMate layers
- [x] Validator linter implemented
- [x] `.gitignore` properly configured
- [x] Multi-organization structure ready

---

## 📝 To Do Based on Rules

Priority tasks to align project with rules:

1. **Create glossary.md**
   - Location: Project root
   - Include: All project terms, abbreviations, ArchiMate concepts
   - Format: English (Russian translation)

2. **Create roadmap.md**
   - Location: Project root
   - Template: Phases and tasks with RD-XXX IDs
   - Include: Methodology definition, template creation, organization setup

3. **Update .gitignore**
   - Add: `0.archive/` patterns
   - Add: `*ai-agent-rules*.md` pattern
   - Add: Python and IDE ignores

4. **Create stakeholders.md** (if applicable)
   - List: Project stakeholders
   - Define: Roles and responsibilities

5. **Add source verification**
   - Tag: International sources used
   - Rule: No Russian sources for fact verification

---

## 📚 References

- **Base Rules:** `ai-agent-rules-1.0.5-global.md` (archived after extraction)
- **Project Methodology:** `method/LiteEA Методология...`
- **Organization Guide:** `organizations/[org]/CONVENTIONS.md`

---

**Version:** 1.0.0  
**Effective Date:** May 3, 2026  
**Created from:** AI Agent Rules v1.0.5-global  
**Status:** Active ✓

This document complements the methodology documentation and provides operational standards for the LiteEA project.
