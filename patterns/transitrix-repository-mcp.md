# Transitrix Repository MCP Server

**Pattern type:** integration  
**Complexity:** moderate

---

## Problem

Exposing a Transitrix repository through an MCP (Model Context Protocol) server without clear governance creates several hazards:

- **Semantic boundary confusion:** Where does the MCP interface end and the canonical model begin? Are MCP responses derived or canonical?
- **Unsanctioned canonical writes:** An external prompt could modify canon through the interface without admission, bypassing review. Schema changes could be invented on the fly.
- **Silent divergence:** Indexes and derived artefacts could drift from their source without audit, becoming a separate source of truth.
- **Uncontrolled capability exposure:** Tools and capabilities that should require human approval might be offered unconditionally through the interface.
- **Broken cross-repository writes:** An MCP server might admit modifications that affect external repositories, or propagate changes across federation boundaries without proper coordination.
- **Attribution and rollback loss:** When MCP invokes changes without explicit admission, audit trails become incomplete and reversal becomes impossible.

## Solution

A Transitrix repository exposed through MCP maintains clear boundaries between canonical source, derived interfaces, and governed automation:

- **Git and admitted canon are the source of truth.** MCP responses are derived, never canonical. All semantic operations go through MCP; all mutations go through Git and the admission record.
- **Capability exposure is explicit and enforced at the interface.** Analyst, Validator, Modeler, and governed-automation capability boundaries are decided in policy, not left to prompts. Capabilities that require human approval are locked behind admission gates.
- **Add-on discovery and capability profiles are separate concerns.** The core pattern exposes Transitrix canon; MCP extensions provide add-on-specific capabilities (Diagrams, Documents, Business Analysis, Design Control) without mixing concerns.
- **Diagram and document creation are specified through extensions.** Derived artefacts remain derived: they are not admitted into canon, never bypass review, and are never treated as authoritative.
- **Federation is explicit.** Cross-repository writes are routed through tracker integration and formal inter-repository agreements; they do not happen silently.
- **Every operation has a source.** Validation responses, index changes, and capability state are traceable to their origin.

## Structure

```
┌──────────────────────────────────────────────────┐
│         Transitrix Repository                    │
│                                                  │
│  Git history       (source of truth)             │
│  canon/            (admitted model)              │
│  transitrix.yaml   (capability manifest)         │
│  operations/       (admission record)            │
│  .mcp/             (server config and policy)    │
│  .mcp/extensions/  (add-on exposure rules)       │
└──────────────────────────────────────────────────┘
                        │
                        │ (MCP interface)
                        │
┌──────────────────────────────────────────────────┐
│    Governed MCP Server                           │
│                                                  │
│  ├─ Read: semantic queries over canon            │
│  ├─ Propose: change drafts in tracker            │
│  ├─ Validate: linter and schema checks           │
│  ├─ Discover: capability profiles & state        │
│  ├─ Evidence: impact and dependency analysis     │
│  └─ Extensions: add-on-specific tools            │
│      ├─ Diagrams: render views (derived)         │
│      ├─ Documents: compose artefacts (derived)   │
│      ├─ Business Analysis: cross-section views   │
│      └─ Design Control: change gates & evidence  │
└──────────────────────────────────────────────────┘
```

### Core MCP Interface

The server provides read-only semantic access to the model:

- **Semantic retrieval:** Query elements by type, name, relation, goal-path, and cross-references.
- **Schema and validation:** Report which elements are valid, which validators apply, and what the current state means against schema.
- **Evidence and impact:** Given a change, compute what else would be affected, what assumptions it touches, what compliance evidence exists.
- **Discovery:** List available capabilities, their state (declared, present, compatible, available, partial, disabled, unavailable), and requirements for access.

### Source of Truth and Semantic Boundaries

- **Git and canon are authoritative.** The MCP server reads only; all writes are Git commits with corresponding admission records.
- **Indexes are derived.** Category indices, relation indices, and cross-repository registries are computed from canon, never maintained separately. If an index drifts, canon is the source — regenerate the index from canon.
- **MCP responses are derived.** A query response is calculated; a cached response is a performance optimization, not a source of truth.
- **Validation responses report schema state, never invent it.** If a validator cannot reach a conclusion, it reports what it cannot determine and why — never guesses.

### Capability Exposure and Governance

Capabilities are exposed through typed interfaces with explicit permission boundaries:

**Analyst Capabilities** (read-only, no side effects):
- Semantic search and query execution over canon.
- Cross-reference traversal and impact analysis.
- Element-to-element traceability and change-ripple prediction.

**Validator Capabilities** (read, report, audit):
- Schema validation against transitrix.yaml pinned version.
- Linter checks (cross-reference resolution, required-field presence, notation compatibility).
- Compliance evidence audit (what requirements are covered, by what assertions, verified by what).
- Change simulation: "if this change lands, what fails?"

**Modeler Capabilities** (read, propose in tracker):
- Element and relation creation in `field/` as draft pull requests.
- Element modification proposals in `canon/` routed to human reviewers.
- Goal-tree elaboration (add children to existing goals within the declared scope).
- Notation additions (new diagram notation in `views/`).

**Governed-Automation Capabilities** (read, execute schema-locked operations):
- Policy-driven capability binding (e.g., "this deployment automation can read and update `DEPLOYMENT-STATE` only in `operations/`").
- No direct canon modification. Automation proposes changes through the tracker.
- Failure path: operation denied, exception logged, ticket opened for human review.

### Add-On Discovery and Extension Capabilities

The core server exposes Transitrix canon. Extensions provide add-on-specific capabilities:

**Diagrams Extension:**
- Render views in multiple formats (SVG, PNG, PlantUML).
- Derived only: source is `.goals.transitrix.yaml` or `.canvas.transitrix.yaml`; output is never admitted into canon.
- Schema enforcement: diagram validation confirms it matches the view file's declared elements.

**Documents Extension:**
- Compose documents (SRS, SDD, MRD) from selected elements and their relations.
- Derived only: output is a rendered artefact, not admitted into canon.
- Traceability link generation (this requirement is traced to this implementation element, verified by this assertion).

**Business Analysis Extension:**
- Cross-section views: filtered, combined views over canon from different angles (by goal-path, by process, by stakeholder, by risk tier).
- Capability assessment against enterprise reference models.
- Coverage analysis: what capabilities exist, what gaps remain, what is partial or disabled.

**Design Control Extension:**
- Change gate enforcement: policy-defined rules about what can change and when.
- Evidence checklist generation: for a proposed change, what evidence must be present before it can be admitted.
- Formal review workflow: change proposals, evidence attachment, approval step, commit with review hash.

### Discovery States

Each capability has an explicit state, discoverable via MCP:

- **Declared:** named in policy but not yet active.
- **Present:** installed in the repository (e.g., extension code is checked in).
- **Compatible:** present and compatible with the pinned methodology version.
- **Available:** compatible and enabled by policy for this repository.
- **Partial:** enabled for a subset of elements (e.g., read-only for some, full access for others).
- **Disabled:** installed and compatible but explicitly turned off by policy.
- **Unavailable:** required by policy but not present in this deployment.

### Validation and Evidence

The server reports validation state without invention:

- **Schema validation:** elements conform to transitrix.yaml schema.
- **Cross-reference resolution:** all references to other elements exist and are typed correctly.
- **Required-field presence:** mandatory fields are populated according to schema.
- **Notation compatibility:** diagram notations and artefact types are declared in transitrix.yaml.
- **Compliance evidence audit:** REQUIREMENT elements have corresponding ASSERTION and VERIFICATION, or their absence is explicitly documented.
- **Cannot-determine:** if validation requires external data (e.g., "is this element used in production?"), the server reports what it cannot determine and suggests where to look.

### Reviewable Proposals

The server does not modify canon directly. Instead, it proposes changes:

- **Element proposals:** routed as pull requests to `field/` or `canon/` for human review.
- **Notation proposals:** new diagram types or artefact kinds go to `views/` branches.
- **Process proposals:** changes to `operations/decisions/` governance go through the ADR process.
- **Capability proposals:** new extensions or capability exposure are proposed and ratified through policy pull requests.
- **Tracker integration:** all proposals (not just canon) are indexed in the tracker, linked bidirectionally.

### Provenance and Federation

Operations that cross boundaries or affect other repositories:

- **Federation:** if this model references elements in another repository's canon, MCP can traverse the reference but cannot modify the external element. Modifications go through the external repository's own MCP server.
- **Tracker integration:** changes to one repository's canon can automatically open issues in dependent repositories (e.g., "your integration depends on this capability; it has changed; please review").
- **Provenance records:** the admission record captures who proposed, when, what evidence was required, who approved, when admitted.
- **Audit trail:** every operation is logged; the Git history is the authoritative change log; MCP session logs augment but do not replace git history.

### Failure Behaviour

When operations cannot proceed:

- **Denied:** the operation violates policy (e.g., attempt to modify canon through Modeler interface). Response: denied, reason logged, human does not need to intervene (expected and handled).
- **Incomplete:** the operation cannot proceed because required data or capabilities are unavailable (e.g., "I cannot assess compliance impact because external-system-X is unreachable"). Response: report what is incomplete, suggest resolution, return partial results if any.
- **Impossible:** the operation requires something no deployment has (e.g., real hardware, interactive display, human hand). Response: flag as `needs:executor` in tracker, stop, wait for human.

## When to use

- Exposing a Transitrix repository for semantic query by LLM agents or AI-driven tools.
- Enabling external systems to validate changes before they are admitted into canon.
- Surfacing governance policies (capability exposure, discovery state) to automation without embedding decisions in prompts.
- Integrating with project tracking, compliance auditing, or cross-repository federation.
- Providing governed read access to canon for documentation generation, impact analysis, or compliance reporting.
- Any scenario where canon must remain authoritative and derived artefacts (queries, reports, proposals) must be traceable to source.

## How to start with the MCP pattern

### 1. Define your capability exposure policy

In `.mcp/policy.yaml`, declare which capabilities each access profile has:

```yaml
profiles:
  analyst:
    capabilities: [query, traverse, impact-analysis]
    scope: read-only
  modeler:
    capabilities: [query, traverse, propose-changes]
    scope: propose-to-tracker
  automation:
    capabilities: [query, execute-policy-gates]
    scope: schema-locked
    allowed_operations:
      - field: operations/
        access: read-write
      - field: views/
        access: read-only
```

### 2. Declare add-on extensions

In `.mcp/extensions/`, create one file per extension. Each names its capabilities and discovery state:

```yaml
# .mcp/extensions/diagrams.yaml
name: Diagrams
description: Render views from declared view files
capabilities:
  - render-svg
  - render-png
  - render-plantul
discovery_state: available
depends_on:
  - diagrams-notation
scope: derived-only
```

### 3. Configure the server

In `.mcp/server-config.yaml`, pin the MCP version and configure the interface:

```yaml
mcp_version: "0.1"
server_name: "transitrix-repository"
access_log: operations/audit/mcp-access.log
schema_enforcement: strict
index_autoregenerate: true
federation_enabled: true
```

### 4. Document the interface

In `.mcp/capabilities.md`, publish the MCP interface for external consumers. Include:
- Supported query language and examples.
- Capability profiles and who gets which access.
- Extension capabilities and their preconditions.
- Failure modes and error responses.
- Rate limits and quota (if any).

### 5. Add tests

In `tests/mcp-server/`, add integration tests:
- Query correctness: a known change is correctly reported in query responses.
- Boundary enforcement: unauthorized operations are denied.
- Index consistency: queries return results consistent with canon.
- Extension behavior: each extension behaves as documented.

### 6. Run validators

Before opening a PR:
- `python3 .validators/lint.py` ensures the policy file has required fields and is valid YAML.
- Any extension-specific validator (e.g., diagram-notation validator) passes.
- MCP server starts cleanly and serves test queries without error.

## What this pattern does not cover

- **Creating an MCP server implementation.** This pattern describes governance and boundaries; the server code is separate.
- **Specifying the MCP protocol version or API schema.** Those are stable platform decisions, not part of this pattern.
- **Running MCP outside this repository.** The server runs against a local or remote git clone; deployment, scaling, and high-availability are outside the pattern scope.
- **Real-time synchronization.** MCP queries execute against the current state of main; push-on-change notification is a deployment choice, not part of the pattern.
- **Embedding policy decisions in prompts.** Policy must be readable code and configuration, never baked into LLM instructions.

---

## Related patterns

- **[Transitrix Alone](transitrix-alone.md):** Establish your canonical model before exposing it through MCP.
- **[Knowledge Store](knowledge-store.md):** If MCP serves as the interface to an enterprise knowledge repository (with curated ingestion), combine this pattern with Knowledge Store.
- **[Network Catalogue](network-catalogue.md):** For federation across repositories, use MCP to expose individual repositories and Network Catalogue to bind them.
- **[Baseline & Audit Trail](baseline-audit-trail.md):** Combine with this pattern if MCP queries must be auditable for compliance or change review purposes.

---

**Canon action:** `ACTION-MCP-REPOSITORY-1`
