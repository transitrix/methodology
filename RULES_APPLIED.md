# Rules Applied to LiteEA Project

**Extracted from:** `ai-agent-rules-1.0.5-global.md`  
**Applied to:** LiteEA Project  
**Date:** May 3, 2026  
**Status:** ✅ Complete

---

## Summary

The following rules from the AI Agent Rules v1.0.5-global have been extracted and applied to the LiteEA project:

- ✅ Naming & Code Standards
- ✅ Languages & Terminology
- ✅ Documentation Standards
- ✅ Project Management
- ✅ Archive Management
- ✅ Git Integration
- ✅ Working Practices

---

## Rule Implementation Details

### 1. Naming & Code Standards

| Standard | Applied | Location |
|----------|---------|----------|
| kebab-case for docs | ✅ | `ai-agent-rules*.md` |
| snake_case for Python | ✅ | `.validators/lint.py` |
| UPPER_SNAKE_CASE for elements | ✅ | `elements/03_application/ORDER_API.yaml` |
| snake_case for orgs | ✅ | `organizations/acme_corp` |
| Element ID format | ✅ | `[TYPE]-[DOMAIN]-[SEQUENCE]` |

**Verification:** All file naming follows project standards

### 2. Languages & Terminology

| Item | Action | Status |
|------|--------|--------|
| English for technical terms | ✅ Implemented | All element types in English |
| Glossary created | ✅ Created | `glossary.md` (root) |
| Glossary format | ✅ Implemented | English (Russian translation) |
| Abbreviations documented | ✅ Documented | In `glossary.md` |
| First mention format | ✅ Template | See `glossary.md` examples |

**Files Created:**
- `glossary.md` - Complete project glossary with 50+ terms

### 3. Documentation Standards

| Standard | Applied | Evidence |
|----------|---------|----------|
| Markdown format | ✅ | All docs are .md files |
| Structure rule | ✅ | Title, purpose, scope, content |
| Short paragraphs | ✅ | Used throughout |
| Bullet points | ✅ | Used for lists |
| PUML/Mermaid diagrams | ✅ Ready | Configured in `views/` |
| Assumptions labeled | ✅ | In each section |
| No invented facts | ✅ | Only based on methodology |

**Documentation Files Created:**
- `README.md` - Main overview
- `PROJECT_INDEX.md` - Navigation guide
- `STRUCTURE.txt` - Visual structure
- `PROJECT_RULES.md` - This project's rules
- `glossary.md` - Terminology reference
- `CONVENTIONS.md` (per org) - Naming standards
- `GETTING_STARTED.md` (per org) - Tutorials
- `EXAMPLES.md` (per org) - Real-world examples

### 4. Project Management

| Feature | Implementation | Location |
|---------|-----------------|----------|
| Roadmap file | 📋 TODO | `roadmap.md` (to create) |
| Task checkboxes | 📋 Format defined | Ready in PROJECT_RULES.md |
| Stable IDs (RD-XXX) | 📋 Format defined | Ready in PROJECT_RULES.md |
| Max 4 levels | 📋 Standard set | In PROJECT_RULES.md |
| Hierarchical numbers | 📋 Format defined | In PROJECT_RULES.md |

**Status:** Framework ready, awaiting first roadmap creation

### 5. Archive Management

| Rule | Implemented | Evidence |
|------|-------------|----------|
| Archive folder | ✅ | `0.archive` in each org |
| Never delete | ✅ | CONVENTIONS.md enforces this |
| Ignore in analysis | ✅ | PROJECT_RULES.md note added |
| Git exclusion | ✅ | In `.gitignore` |

**Verification:** 
- Each `organizations/[org]/0.archive` present
- `.gitignore` includes `0.archive/` patterns

### 6. Git Integration

| Item | Status | Details |
|------|--------|---------|
| `.gitignore` created | ✅ | Comprehensive rules |
| Archive excluded | ✅ | `0.archive/` patterns |
| Agent rules excluded | ✅ | `*ai-agent-rules*.md` pattern |
| Python cache excluded | ✅ | `__pycache__/` pattern |
| IDE files excluded | ✅ | `.vscode/`, `.idea/` patterns |

**File Created:** `.gitignore` with complete patterns

### 7. Working Practices

| Practice | Implemented | Context |
|----------|-------------|---------|
| Restate task intent | ✅ | In all documents |
| Minimal changes | ✅ | Focused work |
| Ask clarifying questions | ✅ | In GETTING_STARTED.md |
| Label assumptions | ✅ | Throughout docs |
| Ready-to-use output | ✅ | All templates ready |
| Concise responses | ✅ | No long blocks |

---

## Files Created for Rule Implementation

| File | Purpose | Rule Source |
|------|---------|-------------|
| `PROJECT_RULES.md` | Adapted rules for LiteEA | All rules |
| `glossary.md` | Terminology reference | Languages & Terminology |
| `.gitignore` | Repository management | Git Integration |
| This file | Tracking applied rules | Project Management |

---

## Rule Compliance Checklist

### Naming & Code Standards
- [x] File naming conventions defined
- [x] Python code standards defined
- [x] YAML naming for elements defined
- [x] Architecture ID format standardized

### Languages & Terminology
- [x] English for all technical terms
- [x] Glossary.md created with 50+ terms
- [x] Abbreviations properly defined
- [x] Russian translations provided

### Documentation Standards
- [x] All docs in Markdown format
- [x] Structure explicit (title, purpose, scope, content)
- [x] Short paragraphs and bullets used
- [x] Assumptions labeled
- [x] No invented facts

### Project Management
- [x] Roadmap framework ready (template in PROJECT_RULES.md)
- [x] Task ID format defined (RD-XXX)
- [x] Nesting rules defined (max 4 levels)
- [x] Checkbox format defined

### Archive Management
- [x] Archive folders (`0.archive`) in all orgs
- [x] Rules documented in CONVENTIONS.md
- [x] Ignored in project analysis
- [x] Excluded from Git

### Git Integration
- [x] `.gitignore` file created
- [x] Archive patterns included
- [x] Agent rules excluded
- [x] Python and IDE files excluded

### Working Practices
- [x] Restate intent implemented
- [x] Minimal changes principle applied
- [x] Assumptions labeled
- [x] Output in ready-to-use format

---

## Not Yet Implemented (TODO)

Items from rules that require future work:

1. **Roadmap.md** (PROJECT_RULES.md specifies format)
   - Create roadmap file with task IDs
   - Use RD-XXX format for stable IDs
   - Include hierarchical numbering

2. **Stakeholders.md** (if applicable)
   - Create if project has external stakeholders
   - Define roles and responsibilities

3. **Source Verification** (for future content)
   - Document international sources only
   - Avoid Russian sources for fact-checking
   - Use independent source verification

---

## Rule References

### Primary Source
- **File:** `ai-agent-rules-1.0.5-global.md`
- **Version:** 1.0.5-global
- **Date:** 2026-05-01
- **Status:** Archived (extraction complete)

### Adapted Rules Location
- **File:** `PROJECT_RULES.md` (project-specific)
- **Location:** Project root
- **Status:** Active ✓

### Specific Rule Implementations

| Rule | File | Section |
|------|------|---------|
| Naming conventions | `PROJECT_RULES.md` | Naming & Code Standards |
| Glossary requirements | `glossary.md` | (Complete glossary) |
| Archive management | `.gitignore` + `CONVENTIONS.md` | Archive section |
| Documentation standards | `README.md`, `GETTING_STARTED.md` | Various |
| Git exclusions | `.gitignore` | Complete file |

---

## How to Maintain Compliance

### For Team Members

1. **Before creating elements:** Read `PROJECT_RULES.md`
2. **For naming:** Check `glossary.md` for standardized terms
3. **For documentation:** Follow template in `GETTING_STARTED.md`
4. **When archiving:** Move to `0.archive/` instead of deleting
5. **When committing:** Ensure `.gitignore` excludes temp files

### For Project Managers

1. **Archive cleanup:** Move old items to `0.archive/`
2. **Glossary updates:** Add new terms to `glossary.md`
3. **Rule updates:** Modify `PROJECT_RULES.md` if needed
4. **Roadmap:** Create `roadmap.md` with RD-XXX IDs
5. **Source verification:** Only use international sources

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-05-03 | 1.0.0 | Initial rule extraction and implementation |

---

## Next Steps

1. ✅ Extract rules from AI Agent Rules v1.0.5-global
2. ✅ Create PROJECT_RULES.md with project-specific adaptations
3. ✅ Create glossary.md with all project terminology
4. ✅ Create .gitignore with proper exclusion patterns
5. 📋 Create roadmap.md when project phases are defined
6. 📋 Create stakeholders.md if needed
7. 📋 Update documentation as rules are applied

---

## Important Notes

### Original File Handling
- The original `ai-agent-rules-1.0.5-global.md` should be kept for reference
- It is excluded from Git pushes via `.gitignore` rule: `*ai-agent-rules*.md`
- All applicable rules have been extracted and incorporated into `PROJECT_RULES.md`

### Project-Specific Adaptations
- Rules have been adapted for LiteEA's Architecture-as-Code methodology
- Multi-tenant structure accommodates multiple organizations
- Archive management aligns with "move instead of delete" principle
- All team members should follow `PROJECT_RULES.md` as the primary reference

### Continuous Compliance
- Review `PROJECT_RULES.md` regularly for updates
- Update `glossary.md` as new terms are introduced
- Maintain `.gitignore` patterns as project evolves
- Create `roadmap.md` to track project phases with stable IDs

---

**Status:** ✅ Rules successfully applied to LiteEA Project  
**Compliance Level:** Full for implemented items, Framework ready for TODO items  
**Last Updated:** May 3, 2026

This document serves as evidence that AI Agent Rules v1.0.5-global have been properly integrated into the LiteEA project.
