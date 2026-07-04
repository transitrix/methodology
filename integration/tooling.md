# Transitrix Tooling & Integration

**Version:** 1.0.0
**Date:** 2026-05-03
**Status:** Active

---

## Overview

The Transitrix methodology is supported by specialised tools for various aspects of architectural modelling. This document describes the available tools and their integration.

---

## Transitrix BPMN Authoring Tool (Transitrix Studio)

**Purpose:** Text-based (YAML) editing, visualisation, and management of business processes in BPMN 2.0 notation with automatic layout calculation.

**Location:** See [Transitrix Studio repository](https://github.com/transitrix/transitrix-studio)

**Version:** 0.3.7 (as of 2026-05-03)

**License:** MIT

### Key Features

- **Text-first BPMN:** YAML DSL (`*.bpmn.transitrix.yaml`) as source of truth, stored in Git alongside architecture elements
- **Three delivery channels:**
  - CLI: `transitrix-studio compile <src> <dst>` for local compilation
  - Web UI: `transitrix-studio serve` — local web interface with YAML editor and BPMN preview side by side
  - VS Code Extension: built-in editor with live preview and auto-save
- **Advanced layout algorithm:** 4-phase process with ELK (Eclipse Layout Kernel)
  - Global ELK phase for column (X) consistency across lanes
  - Parallel per-lane ELK passes for Y coordinates
  - Assembly with additional lane-axis alignment
  - Geometric flow routing with priority rules (R1–R6, L1)
- **Export:** BPMN 2.0 XML, SVG (full diagram support)
- **Integration:** Full support for ArchiMate element references (ROLE-XXX-001, APP-XXX-001, PROC-XXX-001)
- **Validation:** AJV schema validation, cross-lane routing checks, structural BPMN 2.0 compliance

### Usage with Transitrix

#### File Structure

```
organizations/[org]/
├── .templates/
│   └── bpmn/
│       ├── process_template.bpmn.transitrix.yaml           (basic process)
│       └── advanced-process-with-lanes.bpmn.transitrix.yaml (complex process)
└── elements/
    └── 02_business/
        └── [PROCESS_NAME]_process.bpmn.transitrix.yaml     (ready processes)
```

#### Workflow

1. **Create a process:**
   ```bash
   cd organizations/[your_org]
   cp .templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml \
      elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
   ```

2. **Edit:**
   - Open the file in VS Code with the Transitrix Studio extension installed
   - Use the graphical editor for process modelling
   - Edit YAML directly for element properties

3. **Validate:**
   ```bash
   python3 .validators/lint.py elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
   ```

4. **Visualise:**
   - Preview in VS Code (built-in viewer)
   - Export to SVG via Transitrix Studio
   - Include in project documentation

5. **Commit to Git:**
   ```bash
   git add elements/02_business/ORDER_FULFILLMENT_process.bpmn.transitrix.yaml
   git commit -m "Add ORDER_FULFILLMENT process with lanes and stages"
   ```

### Key BPMN Element Properties

When editing a process in Transitrix Studio, make sure to specify:

**For lanes:**
- `id` — unique identifier (lane_sales, lane_warehouse)
- `name` — descriptive name (Sales Team, Warehouse)
- `actor_role` — reference to BusinessRole (ROLE-SALES-001)
- `responsible_system` — reference to ApplicationComponent (APP-CRM-001)

**For tasks:**
- `id` — unique within the process context (S1_receive, S2_pack)
- `type` — element type (task, userTask, serviceTask, exclusiveGateway)
- `label` — user-facing description (Receive Order)
- `lane` — which lane the task is on
- `supporting_system` — system executing the task
- `required_data` — input data
- `output_data` — output data

**For gateways:**
- `decision_logic` — decision-making logic
- `true_path` / `false_path` — routing directions
- `checks` — validation conditions

**For KPIs:**
- `name` — metric name
- `target` — target value
- `calculated_from` — elements used for calculation

### Transitrix Studio Architecture

**Components:**

| Component | Description | Technology |
| --- | --- | --- |
| **Parser** (`src/parser.ts`) | YAML DSL → internal representation (ProcessIr) | AJV schema validation |
| **Layout Engine** (`src/layout.ts`) | 4-phase algorithm: ELK + geometric routing | ELK.js (Eclipse Layout Kernel) |
| **Emitter** (`src/emitter.ts`) | ProcessIr + LayoutIr → BPMN 2.0 XML | xmlbuilder2 |
| **CLI** (`src/cli.ts`) | File compilation from the command line | Node.js |
| **Web Server** (`src/serve-ui.ts`) | HTTP API and local web interface | Express-like Node.js server |
| **VS Code Extension** (`extension/src/`) | Built-in editor and preview | VS Code webview API |
| **Web UI** (`ui/src/`) | YAML editor + BPMN preview | Vite, React/Preact, bpmn-js viewer |

**Source (GitHub):**
```
transitrix-studio/
├── src/                # TypeScript source code
│   ├── ir.ts          # Type definitions (ProcessIr, LayoutIr)
│   ├── parser.ts      # YAML → ProcessIr
│   ├── layout.ts      # Layout algorithm (4-phase ELK)
│   ├── emitter.ts     # ProcessIr → BPMN 2.0 XML
│   ├── cli.ts         # CLI entry point
│   └── serve-ui.ts    # Web server & API
├── extension/         # VS Code extension
├── ui/               # Web UI (Vite SPA)
├── examples/         # Sample BPMN processes
├── tests/            # Vitest suite (38 tests)
├── CLAUDE.md         # AI agent context & layout algorithm docs
├── diagram-rules.md  # Routing rules (R1–R6, L1)
├── roadmap.md        # Project status (RD-001 to RD-078+)
└── transitrix-studio-project-description-v0.3.md  # Detailed description
```

### Process Examples

**Basic process:** `organizations/acme_corp/.templates/bpmn/process_template.bpmn.transitrix.yaml`

Usage:
- Single role / actor
- Simple linear flow
- No complex branching
- Fast prototyping

**Complex process:** `organizations/acme_corp/.templates/bpmn/advanced-process-with-lanes.bpmn.transitrix.yaml`

Usage:
- Multiple actors with swimlanes
- Explicit stages (S1, S2, S3) with phase grouping
- Quality checkpoints with explicit checks
- Rework loops and branching (gateways)
- Explicit data flow between steps
- KPIs and performance metrics

**Ready-made examples:**
- `organizations/acme_corp/.templates/EXAMPLES.md` — E-commerce Order Fulfillment
- `transitrix-studio/examples/` — additional BPMN process examples

### Integration with Architecture

Each BPMN process element can reference architectural elements:

```yaml
- id: "S1_receive"
  type: "task"
  supporting_system: "APP-CRM-001"  # Reference to ApplicationComponent
  lane: "lane_sales"                # Reference to BusinessRole via lane

# The validator will check:
# ✓ APP-CRM-001 exists in elements/03_application/
# ✓ lane_sales.actor_role matches an existing BusinessRole
```

This ensures complete traceability from process to applications and roles.

---

## Transitrix Studio Installation and Configuration

### Requirements

- Node.js 14+ (v16+ recommended)
- npm 6+
- VS Code 1.60+ (for the extension)
- Python 3.8+ (for Transitrix process validation)

### Quick Start

```bash
cd /path/to/transitrix-studio

# Install dependencies
npm install

# Full build (TypeScript → JavaScript)
npm run build

# Start local web interface (editor + preview)
npm run build && npm run ui:build
node dist/cli.js serve
# Or: npx transitrix-studio serve (if installed globally)
```

The web interface will open at `http://127.0.0.1:3000` (or the specified port).

### Installing the VS Code Extension

```bash
cd /path/to/transitrix-studio

# Prepare the extension
npm run extension:prep

# Via VS Code: press F5 to launch the Extension Development Host
# Or manually: npm run package-extension to create a VSIX file
```

### Process Validation

```bash
# Compile a single file
node dist/cli.js compile \
  /path/to/process.bpmn.transitrix.yaml \
  /tmp/output.bpmn

# With error checking
npm test
```

**Examples for testing:**
```bash
# Built-in Order Fulfillment example
node dist/cli.js compile \
  examples/order-fulfillment.bpmn.transitrix.yaml \
  /tmp/order-fulfillment.bpmn

# Preview in browser
npm run serve
```

### Integration with Transitrix Organizations

1. **Place processes in the standard location:**
   ```
   organizations/[org]/elements/02_business/[PROCESS_NAME]_process.bpmn.transitrix.yaml
   ```

2. **Use Transitrix Studio to edit:**
   - Open the `organizations/[org]` folder in VS Code
   - With the Transitrix Studio extension installed, you will see a preview when opening `.bpmn.transitrix.yaml` files
   - Edit YAML directly in the editor

3. **Validate after changes:**
   ```bash
   cd organizations/[org]
   python3 .validators/lint.py
   node /path/to/transitrix-studio/dist/cli.js compile \
     elements/02_business/[PROCESS_NAME]_process.bpmn.transitrix.yaml \
     /tmp/preview.bpmn
   ```

### Verifying Installation and Functionality

```bash
cd /path/to/transitrix-studio

# Full test suite (38 tests)
npm test

# Clean build
npm run build

# TypeScript type check
npm run type-check

# Code lint
npm run lint
```

**Successful verification:** all commands complete without errors; `npm test` shows "38 tests passed".

---

## Current State of Transitrix Studio (v0.3.7)

**Completed development phases (per roadmap.md):**

✅ **Phase 1–7** — All critical fixes, optimisations, code quality, tests (38 tests), and documentation
✅ **Phase 6** — Integration with AI Agent Rules (project rules, naming, English language)
✅ **Phase 7** — Advanced layout algorithm with routing rules (R1–R6, L1)

**Status:** Production-ready

**Project documentation:**
- `CLAUDE.md` — AI agent context and layout algorithm details
- `diagram-rules.md` — Routing rules and BPMN 2.0 validation
- `roadmap.md` — 78+ completed tasks with stable IDs (RD-XXX)

## Extensions and Integrations

### Planned Transitrix-level Tools

- **Capability Maturity Visualizer** (RD-201+) — Graphical representation of capability maturity levels
- **Architecture Dashboard** (RD-202+) — Interactive portal for browsing the full architecture with element browser
- **CI/CD Integration** (RD-103-104) — Automatic diagram generation on Git commits
- **API Gateway** (RD-206) — Programmatic access to architectural elements and processes
- **Collaboration Tools** (RD-209) — Architecture review, in-context diagram comments

### Potential Transitrix Studio Extensions

- **BPMN Simulation** — Process execution with execution path tracking
- **Performance Analysis** — Execution time analysis and bottleneck detection
- **Process Mining** — Integration with real execution logs
- **Multi-pool Support** — Support for multiple pools in a single diagram
- **Export Enhancements** — PNG, PDF, SVG with metadata for documentation

---

## Troubleshooting

### Compilation fails: "Cannot find module"

**Problem:**
```
Error: Cannot find module './dist/compiler.js'
```

**Solution:**
1. Ensure the build is complete: `npm run build`
2. Check that the `dist/` folder contains compiled files
3. Try a clean rebuild:
   ```bash
   rm -rf dist/
   npm run build
   ```

### VS Code extension does not show preview

**Problem:** "Preview not loading" or the extension does not activate

**Solution:**
1. Ensure `npm run extension:prep` has been run
2. Reload the VS Code Extension Development Host (F5)
3. Confirm the file has the `.bpmn.transitrix.yaml` extension
4. Check the VS Code Output panel → "Transitrix Studio" channel for errors

### Validation errors on compilation

**Problem:** "Schema validation failed" or "Invalid element structure"

**Solution:**
1. Check YAML syntax (use a YAML linter in VS Code)
2. Ensure the structure matches the template (`process_template.bpmn.transitrix.yaml`)
3. Verify all required fields: `id`, `lanes`, `stages`, `steps`
4. For ArchiMate references, use exact IDs (ROLE-XXX-001, APP-XXX-001)

### Web service won't start: Port already in use

**Problem:**
```
Error: listen EADDRINUSE :::3000
```

**Solution:**
```bash
# Use a different port
npm run serve -- --port 3001

# Or find and kill the process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Layout looks incorrect

**Problem:** "Elements overlap", "Flows cross incorrectly", "Lane axis not aligned"

**Solution:**
1. These issues typically occur with very large element ranges or special configurations
2. Try adjusting layout parameters via `.layout-options`:
   ```yaml
   layoutOptions:
     elkNodeSpacing: 60       # increase spacing between elements
     laneVerticalGap: 50      # increase gap between lanes
     elkDiagramPadding: 60    # increase padding
   ```
3. If the problem persists, check `diagram-rules.md` and `CLAUDE.md` in the Transitrix Studio repo for routing rules

### SVG export works but the diagram is incomplete

**Problem:** "SVG contains only part of the diagram"

**Solution:**
1. Verify the process has at least one flow (startEvent → step → endEvent)
2. Ensure all elements have unique IDs within the process
3. Try exporting to BPMN XML instead of SVG for debugging:
   ```bash
   node dist/cli.js compile process.bpmn.transitrix.yaml output.bpmn
   # Then open in a BPMN model editor such as bpmn-js
   ```

---

## Documentation and Resources

### Key Transitrix Studio Documents

| File | Purpose |
| --- | --- |
| `README.md` | Project overview and quick start |
| `CLAUDE.md` | AI agent context, layout algorithm details |
| `diagram-rules.md` | Routing rules (R1–R6, L1) and BPMN 2.0 validation |
| `transitrix-studio-project-description-v0.3.md` | Detailed description of version 0.3 |
| `roadmap.md` | Project status (RD-001 to RD-078+) |
| `method/00-glossary.md` | Glossary of terms (BPMN, DSL, layout, etc.) |
| `LICENSE` | MIT licence |
| `CONTRIBUTING.md` | Contributor guide |

### Transitrix Core Methodology

- **Methodology:** `method/01-methodology.md`
- Section 4: Business process modelling layer (description of Transitrix Studio)
- **integration/tooling.md:** This file (tools and integrations)

### Usage Examples

- **Transitrix Examples:** `organizations/acme_corp/.templates/EXAMPLES.md`
- **Transitrix Studio Examples:** `transitrix-studio/examples/`
  - `order-fulfillment.bpmn.transitrix.yaml` — full E-commerce process
  - and other process examples

### Questions and Issues

1. **When using Transitrix Studio:** see the Troubleshooting section above
2. **Layout algorithm design:** see `CLAUDE.md` and `diagram-rules.md` in the Transitrix Studio repository
3. **Integration with Transitrix:** see the Usage with Transitrix section above and methodology sections 4 and 9

### License and Authorship

**Transitrix Studio:** MIT License
**Transitrix:** MIT License

Both projects are published as open source and may be used for educational and commercial purposes under the MIT terms.

---

---

## CLI validation — Windows and extension set

### Windows PowerShell — use `npx.cmd`

On Windows with a restricted PowerShell execution policy (the default on many corporate workstations), the unsuffixed `npx` command resolves to a `.ps1` wrapper that the policy refuses to execute:

```
npx @transitrix/cli validate my.goals.transitrix.yaml
# Error: File C:\...\npx.ps1 cannot be loaded because running scripts is disabled on this system.
```

**Fix:** invoke `npx.cmd` instead of `npx`. The `.cmd` wrapper is not subject to the script-execution policy:

```
npx.cmd @transitrix/cli validate my.goals.transitrix.yaml
```

This applies everywhere `npx @transitrix/cli` appears — per-file validation, compile, and any other subcommand.

### Canonical notation extensions — built-in registry

The `@transitrix/cli validate` command ships with a built-in registry of every canonical Transitrix notation extension. **No `--ext` flag is needed for canonical notations.** The built-in registry matches the notation catalogue in [`notations/README.md`](../notations/README.md):

| File extension | Notation |
|---|---|
| `*.bpmn.transitrix.yaml` | `bpmn` |
| `*.dgca.transitrix.yaml` | `dgca` |
| `*.goals.transitrix.yaml` | `goals` |
| `*.capability-map.transitrix.yaml` | `capability-map` |
| `*.process-map.transitrix.yaml` | `process-map` |
| `*.action.transitrix.yaml` | `action` |
| `*.blocks.transitrix.yaml` | `blocks` |
| `*.products.transitrix.yaml` | `products` |
| `*.applications.transitrix.yaml` | `applications` |
| `*.scenarios.transitrix.yaml` | `scenarios` |
| `*.process-blueprint.transitrix.yaml` | `process-blueprint` |
| `*.action-card.transitrix.yaml` | `action-card` |
| `*.compliance-impact.transitrix.yaml` | `compliance-impact` |
| `*.coverage-metric.transitrix.yaml` | `coverage-metric` |
| `*.actions-tree.transitrix.yaml` | `actions-tree` |

Every one of these validates and compiles without additional flags. The `--ext <notation-name>` flag exists only for **non-canonical** extensions — custom notations an adopter has defined outside the built-in registry. Canonical BPMN validation is unchanged; the table above does not relax BPMN rules.

### Pre-commit validation on Windows

To gate every commit on notation validity before it reaches CI, add a `.git/hooks/pre-commit` file in your adopter repository. On Windows, use a `.cmd` file so the hook does not require PowerShell execution-policy changes:

**`.git/hooks/pre-commit`** (shell — works on Linux/macOS/Git Bash on Windows):

```sh
#!/usr/bin/env sh
# Transitrix notation pre-commit validation
set -e
status=0
found=0
for f in $(git diff --cached --name-only --diff-filter=ACM | grep '\.transitrix\.yaml$'); do
  found=1
  echo "Validating $f ..."
  npx.cmd @transitrix/cli validate "$f" || status=1
done
if [ "$found" -eq 0 ]; then
  echo "No .transitrix.yaml files staged — nothing to validate."
fi
exit $status
```

Make it executable (`chmod +x .git/hooks/pre-commit` on Unix; Git Bash on Windows respects this). The hook validates only staged `*.transitrix.yaml` files, so it runs quickly on typical commits. It uses `npx.cmd` so it works under a restricted PowerShell execution policy without any policy change.

**Document version:** 1.0.2
**Updated:** 2026-07-01
**Next update:** When new tools are added
