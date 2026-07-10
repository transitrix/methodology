---
title: "Notation Selection Guide — Mermaid, PlantUML, Transitrix"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-10"
status: "draft"
---

# Notation Selection Guide — Mermaid, PlantUML, Transitrix

**Purpose:** a single reference an agent uses to pick — or offer a short list of — the right text-based notation for a user's request. It catalogues every diagram type in **Mermaid** and **PlantUML** (the two general-purpose "diagram-as-code" ecosystems) side by side with every **Transitrix** notation (this methodology's own canon data model), states what each is for, and gives lookup tables from a user's phrasing to a recommendation. It does not change how any notation works — it is a selection aid, meant to be read by (or summarised into) an agent's system prompt.

---

## 1. How to choose a family — read this first

The three families are not interchangeable, and the difference matters more than which specific diagram type looks closest:

- **Mermaid / PlantUML** are generic diagram-as-code renderers. A diagram is a single fenced text block, throwaway or living inside a doc/README/PR/wiki page, with no persistent data model behind it. Nothing about the diagram is validated against, or reused by, anything else.
- **Transitrix** notations are not diagrams-for-illustration — they are projections of the adopter's canonical enterprise-architecture data (`canon/`, `field/`, `codex/` zones per [CONTRACT.md](CONTRACT.md)). The same element (a Goal, a Capability, an Actor) can be referenced from many views; the view renders a projection, the element is the governed record. Content is validated, versioned, and cross-referenced with the rest of the adopter's model.

| Question | If yes → | If no → |
|---|---|---|
| Does this describe something true and lasting about the adopter's own organisation (a real process, capability, goal, obligation, schedule, actor) that should be versioned, queried, and cross-referenced with other canon artefacts? | **Transitrix** — pick the matching notation in §4 | Mermaid or PlantUML |
| Will the diagram live in a GitHub/GitLab README, PR description, issue, or wiki page that renders Markdown natively? | **Mermaid** (renders in a fenced block with no plugin) | **PlantUML** (needs a renderer/plugin/service) or **Transitrix** (needs the Transitrix Studio extension) |
| Does the needed diagram type exist only in PlantUML (wireframe, network topology, EBNF/regex, WBS, math formulas, Ditaa, ArchiMate, Chen/IE ER, chronology, file tree, chart)? | **PlantUML** | Mermaid |
| Does the needed type exist in both, but Mermaid's version is still beta/experimental while PlantUML's is mature (e.g. C4)? | Prefer **PlantUML**'s mature version; mention Mermaid's beta as a fallback if the user is already in a Mermaid-only pipeline | — |

If none of these resolve it, offer the user a short list (2–3 options) rather than guessing — see §6 for ready-made phrasing-to-notation mappings.

---

## 2. Mermaid — diagram-as-code catalogue

31 diagram types (verified against `mermaid.js.org/syntax/*`, July 2026). Triggered by a ```` ```mermaid ```` fenced block whose first line is the keyword below.

### 2.1 Stable

| Name | Keyword | What it models | When to recommend it |
|---|---|---|---|
| Flowchart | `flowchart` (alias `graph`) | Nodes + directional edges | Process/decision/algorithm/workflow logic; the most common ask |
| Sequence Diagram | `sequenceDiagram` | Ordered message exchange between participants | Interactions/API calls/protocol messages between actors or services over time |
| Class Diagram | `classDiagram` | Classes, attributes/methods, OOP relationships | Software class structure, static domain model |
| State Diagram | `stateDiagram-v2` | States + transitions | Finite-state machine, status lifecycle |
| Entity Relationship Diagram | `erDiagram` | Entities + relationships/cardinality | Database schema / data model, quick form |
| User Journey | `journey` | Steps through a task with a per-step satisfaction score | UX/customer journey mapping, informal |
| Gantt Chart | `gantt` | Tasks on a timeline with durations/dependencies/milestones | Illustrative project schedule (not a governed delivery plan — see Transitrix `action` for that) |
| Pie Chart | `pie` | Proportional slices of a whole | Percentage / part-to-whole breakdown |
| Quadrant Chart | `quadrantChart` | Points on two axes, 4 quadrants | Prioritise/classify items on two dimensions (effort vs. impact) |
| Requirement Diagram | `requirementDiagram` | Requirements + relations to design/test elements (SysML-based) | Generic requirement-to-element traceability (not regulatory/compliance — see Transitrix `requirement`+`assertion` for that) |
| GitGraph Diagram | `gitGraph` | Git commit/branch/merge history | Illustrate a branching strategy or commit history |
| C4 Diagram | `C4Context` / `C4Container` / `C4Component` / `C4Dynamic` / `C4Deployment` | Software architecture at 4 zoom levels | System/container/component diagram; **flagged experimental by Mermaid's own docs** — prefer PlantUML's C4 stdlib (§3) for anything durable |
| Mindmap | `mindmap` | Radial hierarchy from a central idea | Brainstorming, hierarchical idea breakdown |
| Timeline | `timeline` | Chronological sequence of events/eras | History, roadmap, chronology |
| ZenUML | `zenuml` | Code-like DSL for sequence/interaction diagrams | User specifically wants ZenUML syntax — **not bundled**, needs `@mermaid-js/mermaid-zenuml` registered separately |

### 2.2 Newer / graduated from beta

| Name | Keyword | What it models | When to recommend it |
|---|---|---|---|
| Sankey Diagram | `sankey` | Flows between nodes, edge width ∝ magnitude | Resource/budget/energy allocation between categories |
| XY Chart | `xychart` | Bar and/or line chart on x/y axes | Quantitative bar/line chart of categories or time series |
| Block Diagram | `block` | Freeform blocks/composite shapes and connectors | System/module diagram needing layout flowchart doesn't offer |
| Packet Diagram | `packet` | Byte/bit-level layout of a packet or data structure | Binary protocol / packet / frame layout |
| Kanban | `kanban` | Columns of task cards by workflow stage | Kanban board / task-status visualization |

### 2.3 Beta / experimental

Mermaid's own docs mark all of these beta — syntax may change.

| Name | Keyword | What it models | When to recommend it |
|---|---|---|---|
| Architecture Diagram | `architecture-beta` | Cloud/service components in groups with junctions | Cloud infra, CI/CD pipeline, microservices topology |
| Radar Chart | `radar-beta` | Multi-axis polygon comparison | Compare entities across several metrics at once |
| Treemap | `treemap-beta` | Nested rectangles sized by value | Hierarchical part-to-whole with size encoding |
| Swimlanes Diagram | `swimlane-beta` | Flowchart split into lanes by actor/team/system | Cross-functional process, informal (not BPMN-compliant — see Transitrix `bpmn`) |
| Event Modeling | `eventmodeling` | Triggers/commands/views/events over time, in swimlanes | Design an event-driven / event-sourced workflow |
| Ishikawa (Fishbone) Diagram | `ishikawa` | Cause-and-effect diagram | Root-cause analysis |
| Cynefin Framework Diagram | `cynefin-beta` | Plots items across the 5 Cynefin domains | Classify a problem by complexity to pick a response approach |
| Wardley Map | `wardley-beta` | Value chain vs. visibility × evolution axes | Strategic mapping, build-vs-buy analysis |
| Venn Diagram | `venn-beta` | Overlapping circles | Show overlap/commonality between sets |
| Railroad (Syntax) Diagram | `railroad-beta` (+ `-ebnf`/`-abnf`/`-peg` variants) | Grammar/syntax diagrams | Document a language/parser grammar |
| TreeView | `treeView-beta` | Directory/file tree with icons | File-system or nested folder structure |

**Notes:** `graph` still works but `flowchart` is preferred (adds per-subgraph `direction`). `stateDiagram` (v1) is legacy — always use `stateDiagram-v2`. Nothing has been removed, only graduated/aliased.

---

## 3. PlantUML — diagram-as-code catalogue

28 diagram types plus the widely-used C4 extension (verified against `plantuml.com`, July 2026). UML types nest inside `@startuml`/`@enduml`; most non-UML types have their own `@start*`/`@end*` pair.

### 3.1 UML diagrams

| Name | Trigger | What it models | When to recommend it |
|---|---|---|---|
| Sequence Diagram | `@startuml` + `participant`/arrows/`alt`/`loop` | Message exchange over time | Same as Mermaid sequence — pick by target renderer |
| Use Case Diagram | `@startuml` + `actor`/`usecase` | Actors vs. system functions | "What can each role do in this system" |
| Class Diagram | `@startuml` + `class`/`interface`/relations | Static structure | Object model / code structure documentation |
| Object Diagram | `@startuml` + `object`/`map` | Concrete instance snapshot | Example instances of a class model |
| Activity Diagram | `@startuml` + `start`/`if`/`fork`/`switch` | Workflow with branching/loops/parallelism | Business process or algorithm flow (informal — not BPMN-compliant; see Transitrix `bpmn`). Use modern colon syntax; dash-based legacy syntax is discouraged |
| Component Diagram | `@startuml` + `component`/`interface`/`package` | Modules/components and dependencies | Software architecture overview |
| Deployment Diagram | `@startuml` + `node`/`artifact`/`cloud` | Hardware/infra topology hosting components | Infra/deployment topology |
| State Diagram | `@startuml` + `state`/`[*]` | States + transitions | Same as Mermaid state — pick by target renderer |
| Timing Diagram | `@startuml` + `robust`/`concise`/`clock` | State/value changes across a timeline | Hardware signal / real-time protocol timing |

### 3.2 Non-UML diagrams

| Name | Trigger | What it models | When to recommend it | Core / stdlib |
|---|---|---|---|---|
| JSON Data | `@startjson` | JSON document as a tree | Visualise an API payload / config | Core |
| YAML Data | `@startyaml` | YAML document as a tree | Visualise YAML config (k8s, CI) | Core |
| EBNF Grammar | `@startebnf` | Railroad diagram of a grammar spec | Document a language/protocol/DSL grammar | Core |
| Regex | `@startregex` | Regex broken into a railroad diagram | Explain/debug a regex pattern | Core |
| Network Diagram | `@startnwdiag` | Network topology, subnets, addresses | Illustrate network layout / IP addressing | Core (nwdiag) |
| Wireframe (Salt) | `@startsalt` | ASCII-art GUI mockup | Low-fidelity UI/screen mockup | Core |
| ArchiMate | `@startuml` + `!include <archimate/Archimate>` | EA layers: business/application/technology/motivation/strategy | Illustrative enterprise-architecture diagram (not persistent — see Transitrix element primitives for governed EA data) | Core stdlib |
| Gantt Chart | `@startgantt` | Tasks, durations, dependencies, milestones | Illustrative project schedule (not governed — see Transitrix `action`) | Core |
| MindMap | `@startmindmap` | Radial idea tree | Brainstorming, topic breakdown | Core |
| WBS | `@startwbs` | Hierarchical scope decomposition | Project scope breakdown, org chart | Core |
| ER — Chen notation | `@startchen` | Entities, attributes, relationship diamonds, cardinality | Conceptual/academic DB design | Core |
| ER — Information Engineering | `@startuml` + `entity` + crow's-foot markers | DB schema, crow's-foot cardinality | Relational schema / table-and-FK documentation | Core |
| Math — AsciiMath | `@startmath` or `<math>` | Formula rendering | Embed a math expression | Core |
| Math — JLaTeXMath | `@startlatex` or `<latex>` | Formula rendering from LaTeX | Embed a LaTeX-authored formula | Requires separate JAR (not bundled) |
| Ditaa | `@startditaa` | ASCII-art box/arrow diagram | Quick ASCII flowchart/architecture sketch | Core |
| Files / Directory Tree | `@startfiles` | File/folder tree | Document a repo layout or filesystem | Core |
| Chart | `@startchart` | Bar/line/area/scatter data chart | Simple data visualisation in text-based docs | Core (since v1.2026.0) |
| Chronology | `@startchronology` | Timeline of dated events, near-natural language | Historical timeline, event log, milestone narrative | Core |
| C4 Model | `@startuml` + `!include .../C4_Context.puml` + `Person()`/`System()`/`Rel()` | Architecture at context/container/component/dynamic/deployment zoom | Most common software-architecture-overview ask; **mature**, prefer over Mermaid's experimental C4 | Requires C4-PlantUML stdlib |

### 3.3 Notes / traps

- **No native SysML support** (requirement diagrams, block definition diagrams) — don't recommend PlantUML for SysML-style requirement traceability; Mermaid has a generic `requirementDiagram` instead.
- Icon libraries (AWS, Azure, OpenIconic, sprites) are `!include` add-ons skinning Component/Deployment diagrams, not separate diagram types — flag when a request needs cloud-provider iconography.
- Legacy dash-based Activity syntax still parses but PlantUML's own docs discourage it for new diagrams.

---

## 4. Transitrix — canonical methodology notations (ours)

Unlike Mermaid/PlantUML, a Transitrix notation is not a single fenced block — it's a `*.<short-name>.transitrix.yaml` file with a `notation: <short-name>` header (contract in [CONTRACT.md](CONTRACT.md) §3), rendered by Transitrix Studio. The full index with extensions lives in [README.md](README.md); this table adds the "when to recommend it" framing to match §2–§3 above.

### 4.1 Views — render-able artefacts (15 active, 1 deprecated)

| Notation | Short name | What it models | When to recommend it | Status |
|---|---|---|---|---|
| BPMN Process Diagram | `bpmn` | True BPMN 2.0 process flow — lanes, gateways, sequence flows | A standards-compliant process diagram that must live in canon (not an illustrative flowchart) | documented |
| DGCA Strategy-to-Execution Chain | `dgca` | Driver → Goal → Change → Activity; `layers.changes: off` gives 3-layer DGA mode | Trace why a driver leads to a goal, what transformation closes the gap, what delivers it | documented |
| Goals Tree | `goals` | Hierarchy of strategic/tactical/operational goals | Goal decomposition or OKR-style tree, no driver/action context needed | documented |
| Capabilities Map | `capability-map` | Capability hierarchy with CMMI V2.0 maturity | Assess/display business capability maturity | documented |
| Process Landscape Map | `process-map` | Top-level catalogue of Operating/Supporting/Management processes | High-level "what processes do we run" catalogue | draft |
| Action — Project Schedule | `action` | Activity-on-Node (AoN) precedence network, critical path | A governed delivery schedule referencing canon Goals/Changes (see §4.2 for the `ACTION` *element*, a related but distinct concept) | documented |
| Nested Block Diagrams | `blocks` | Recursive container tree — "what's inside what" | Deep architectural overview, infra zones, bounded-context maps |documented |
| Products Catalogue | `products` | Inventory of products/services, text + table | Portfolio catalogue of what the org sells/offers | draft |
| Applications Catalogue | `applications` | Inventory of applications/integrations | IT application landscape inventory | draft |
| Scenarios | `scenarios` | Report-config over the `SCENARIO` catalogue — alternative paths to a target state | Compare roadmap/planning alternatives serving one or more goals | draft |
| Process Blueprint | `process-blueprint` | Wide left-to-right value chain; each stage carries goal/result/systems/actors/equipment/info | A governed, canon-linked value chain (not an ad hoc journey sketch) | draft |
| Action Card | `action-card` | Single-project narrative — DGCA chain, dates, milestones, gate decisions | One-pager for a single project's status/context | draft |
| Compliance Impact | `compliance-impact` | Report-config (obligation × subject) matrix from `ASSERTION` + `REQUIREMENT` | Show which regulations/obligations are covered by which processes/products | draft |
| Coverage Metric | `coverage-metric` | Report-config — subjects with zero admitted obligations, per jurisdiction | Measure compliance-modelling coverage gaps | draft |
| Actions Tree | `actions-tree` | Report-config tree — Initiative → Programme → Project → Task | Strategic delivery portfolio tree | draft |
| ~~FGA Strategy-to-Execution Chain~~ | `fga` | Superseded by DGCA with `layers.changes: off` | Never — migrate any reference to DGCA/DGA mode | **deprecated** |

For the DGCA / Goals / Action three-way overlap (they sit on the same strategy-to-execution spectrum and are easy to conflate), see the **Family selection** section of [README.md](README.md#family-selection) — it has the full layer-composition and selection-matrix tables; not duplicated here.

### 4.2 Elements — canon/field-zone data primitives (13)

These are not diagrams a user requests directly — they're the governed records that views arrange and point at. A view is a projection; the element is the record. Roughly ArchiMate-layered.

| Element TYPE | Layer | What it models | When to recommend it |
|---|---|---|---|
| `CODEX` | Codex zone | External law/regulation or internal policy/standard | Modelling a regulatory or policy source itself |
| `REQUIREMENT` | Motivation | Positive obligation derived from a codex source | "Must submit / register / obtain approval"-type obligations |
| `ASSERTION` | Canon (compliance) | Claim that a subject (Product/Process/Capability) satisfies a Requirement | Recording a compliance status with evidence |
| `REL` (Relations) | Cross-cutting | First-class, time-aware relation between two canonical primitives | Any typed link needing its own validity window (parent, goal_parent, engagement, …) |
| `ACTOR` | Business | Identity — person / business_unit / system | Who or what exists and performs work |
| `STAKEHOLDER` | Motivation | Interest — stake profile (concern/interest/influence) | Whose interests are at stake, referencing an Actor |
| `LOCATION` | Business | Physical or virtual place | Where actors operate |
| `AMENDMENT` | Field | Detected change to a watched codex source | A law/regulation changed, pre-adjudication |
| `SEGMENT` | Field | Extracted chunk (article/clause) of a codex source | Citing exact regulatory text with provenance |
| `ACTION` (element) | Implementation | Bounded work package moving current → target state | The canonical delivery work-package record referenced by DGCA/Action Card/Relations (distinct from the `action` **view**, §4.1) |
| `BUSINESS_SERVICE` | Business | Externally visible behaviour a business unit offers | Naming a capability the org offers externally |
| `NODE` | Technology | Physical/virtual compute, network, or storage substrate | Canonical infra inventory record |
| `TECHNOLOGY_SERVICE` | Technology | Platform-level service exposed by a Node/group of Nodes | Canonical platform-service record |

**Naming collision to watch for:** "Action" names both a *view* (`07-action.md`, an AoN schedule diagram) and an *element* (`24-action.md`, a standalone work-package record). They're related — the view's nodes typically point at `ACTION` element files — but they answer different requests ("show me the schedule" vs. "record this work package").

**Retired form:** an earlier ASCII-art rendering of `blocks` via Svgbob (`*.blocks.transitrix.txt`) is retired; all views now render through the shared diagram engine as structured YAML. Don't suggest Svgbob for new work.

---

## 5. Cross-family equivalence map

The same concept often exists in more than one family. This table exists to stop the "closest-looking diagram" trap — pick Transitrix only when the canon-linkage column actually applies.

| Concept | Mermaid | PlantUML | Transitrix | Prefer Transitrix when… |
|---|---|---|---|---|
| Message/API sequence | `sequenceDiagram` | Sequence Diagram | — | never — no Transitrix equivalent |
| Class/object structure | `classDiagram` | Class / Object Diagram | — | never |
| Business process, lanes/gateways | `flowchart`, `swimlane-beta` (informal) | Activity Diagram (informal) | **bpmn** (true BPMN 2.0) | the process is real and governed, not illustrative |
| State machine / lifecycle | `stateDiagram-v2` | State Diagram | — (element lifecycle is governed by CONTRACT.md §7, not a view) | never |
| ER / DB schema | `erDiagram` | Chen ER / IE (crow's-foot) | — | never — Transitrix models the org, not arbitrary DB schemas |
| Gantt / project schedule | `gantt` | Gantt Chart | **action** (AoN, critical path) | the schedule is a real delivery plan referencing canon Goals/Changes |
| Capability / goal hierarchy | `mindmap`, `treemap-beta` (informal) | WBS, MindMap (informal) | **capability-map**, **goals** | need CMMI maturity, canonical IDs, cross-refs |
| C4 software architecture | `C4Context`… (experimental) | C4 via stdlib (mature) | element primitives (`ACTOR`/`NODE`/`TECHNOLOGY_SERVICE`) + **blocks** | the infra/app landscape must persist and cross-reference compliance/process |
| Enterprise architecture (ArchiMate) | — | ArchiMate stdlib (illustrative) | element primitives — ArchiMate-inspired, governed canon data | the model must be governed/versioned, not a one-off picture |
| Strategy → goals → initiatives | — | — | **dgca**, **goals**, **actions-tree** | always — no Mermaid/PlantUML equivalent |
| Regulatory obligation mapping | — | — | **codex + requirement + assertion + compliance-impact** | always — unique to Transitrix |
| UI mockup / wireframe | — | Salt (Wireframe) | — | never — PlantUML only |
| Network topology | — | Network Diagram (nwdiag) | `NODE` / `TECHNOLOGY_SERVICE` (inventory, not a topology picture) | quick sketch → PlantUML; canonical infra inventory → Transitrix |
| Value chain / customer journey | `journey` (informal) | — (use Activity) | **process-blueprint** | needs to be governed and canon-linked |
| Requirements traceability | `requirementDiagram` (generic SysML-style) | — | **requirement + assertion** | the requirement is a regulatory/compliance obligation, not a generic SysML one |
| Portfolio / initiative tree | — | — | **actions-tree** | always |
| Scenario / roadmap comparison | `quadrantChart` (informal 2-axis) | — | **scenarios** | needs to persist and point at canon `TARGET_STATE` / `GOAL` |

---

## 6. Quick lookup — phrase → recommendation

Ready-made mappings from common phrasing to a recommendation. Use these as a first pass; fall back to §1's decision table for anything not listed.

| If the user asks for… | Recommend | Why |
|---|---|---|
| A flowchart / decision logic | Mermaid `flowchart` | Renders natively on GitHub; PlantUML Activity Diagram if already in a PlantUML pipeline |
| Sequence of API calls / messages between services | Mermaid `sequenceDiagram` or PlantUML Sequence Diagram | Equivalent — pick by target renderer |
| A real BPMN process that belongs in canon | Transitrix **bpmn** | Only one with true BPMN 2.0 semantics + governance |
| A class / OOP structure diagram | Mermaid `classDiagram` or PlantUML Class Diagram | No Transitrix equivalent — not this methodology's concern |
| A database schema / ER diagram | Mermaid `erDiagram` (quick) or PlantUML Chen/IE ER (more cardinality detail) | Ad hoc DB design |
| A state machine / object lifecycle | Mermaid `stateDiagram-v2` or PlantUML State Diagram | Transitrix element lifecycle is governed, not diagrammed |
| A project schedule / Gantt with dependencies | Transitrix **action** if it's the org's real delivery plan; Mermaid `gantt` / PlantUML Gantt if illustrative | canon linkage is the deciding factor |
| A strategic goal tree / OKRs | Transitrix **goals** | Purpose-built, no generic equivalent worth using |
| Driver → goal → initiative → delivery trace | Transitrix **dgca** | Unique to Transitrix |
| A business capability map with maturity | Transitrix **capability-map** | No Mermaid/PlantUML equivalent |
| A value chain / customer journey, governed | Transitrix **process-blueprint**; Mermaid `journey` if just a quick sketch | canon linkage is the deciding factor |
| Compliance / regulatory obligation mapping | Transitrix **codex + requirement + assertion + compliance-impact** | Unique to Transitrix |
| A portfolio tree (Initiative/Programme/Project/Task) | Transitrix **actions-tree** | Unique to Transitrix |
| Comparing roadmap / scenario alternatives | Transitrix **scenarios**; Mermaid `quadrantChart` for a quick 2-axis comparison | canon linkage is the deciding factor |
| A nested/layered architecture overview | Transitrix **blocks**; Mermaid `treemap-beta` for a quick size-encoded sketch | canon linkage is the deciding factor |
| C4 context/container/component diagram | PlantUML C4 (mature, via stdlib); Mermaid C4 only if already Mermaid-only and okay with experimental | PlantUML's C4 support is production-grade |
| Enterprise architecture in ArchiMate style | PlantUML ArchiMate stdlib if illustrative; Transitrix element primitives if it must persist | canon linkage is the deciding factor |
| A UI mockup / wireframe | PlantUML Salt (`@startsalt`) | Mermaid has no wireframe type |
| Network topology | PlantUML Network Diagram (nwdiag) for illustration; Transitrix `NODE`/`TECHNOLOGY_SERVICE` for canonical infra | canon linkage is the deciding factor |
| Git branching history | Mermaid `gitGraph` | PlantUML has no dedicated git diagram |
| A mind map / brainstorm | Mermaid `mindmap` or PlantUML MindMap | Equivalent, either works |
| A work breakdown structure | PlantUML WBS; Transitrix **actions-tree** if it's the canonical delivery portfolio | canon linkage is the deciding factor |
| A Kanban board | Mermaid `kanban` | No PlantUML or Transitrix equivalent |
| A percentage / part-to-whole breakdown | Mermaid `pie` | Simplest fit |
| Root-cause / fishbone analysis | Mermaid `ishikawa` (beta) | No PlantUML equivalent |
| A grammar / regex railroad diagram | PlantUML EBNF/Regex (mature) or Mermaid `railroad-beta` (newer) | PlantUML more established |
| A math formula | PlantUML AsciiMath/JLaTeXMath | Mermaid has no math rendering |
| JSON/YAML payload visualization | PlantUML JSON/YAML diagram | No Mermaid equivalent |
| A byte/bit packet layout | Mermaid `packet` | No PlantUML equivalent |
| A Sankey (resource/budget flow) diagram | Mermaid `sankey` | No PlantUML equivalent |
| Generic requirements traceability (SysML-style) | Mermaid `requirementDiagram` | Use Transitrix `requirement`+`assertion` instead only if the requirement is a regulatory/compliance obligation |

---

## 7. Embedding / rendering cheat-sheet

| Family | Trigger | Renders natively where | Notes |
|---|---|---|---|
| Mermaid | ` ```mermaid ` fenced block | GitHub, GitLab, Notion, Obsidian, many wikis | No plugin needed on most modern Markdown hosts |
| PlantUML | `@startuml`/`@enduml` (or diagram-specific `@start*`/`@end*`) | Needs a rendering step — PlantUML server (plantuml.com or self-hosted), VS Code/JetBrains plugin, or Kroki | GitHub does **not** render PlantUML natively from a fenced block |
| Transitrix | `*.<short-name>.transitrix.yaml` file, `notation: <short-name>` header | Transitrix Studio (VS Code extension) live preview, or a committed rendered snapshot from CLI Capture (CONTRACT.md §14.5) | Not a fenced-code-block format — a standalone file per CONTRACT.md §3 |

---

## 8. Sources

- Mermaid: [mermaid.js.org/syntax/*](https://mermaid.js.org/intro/) — cross-checked against `mermaid-js/mermaid` doc source (`packages/mermaid/src/docs/syntax/`, develop branch), July 2026.
- PlantUML: [plantuml.com](https://plantuml.com/) diagram-type pages, plus [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML), July 2026.
- Transitrix: [README.md](README.md) (notation index), [CONTRACT.md](CONTRACT.md) (shared header/zone/admission rules), [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) (element-file schema), each spec under [`views/`](views/) and [`elements/`](elements/).
