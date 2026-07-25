---
title: "Process notation research — UPN, EPC, Nimbus (Perzic recommendations)"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-25"
status: "research note — non-normative"
---

# Process notation research — UPN, EPC, Nimbus, FDP

**Origin:** Bora Perzic meeting, 2026-07-24 — see the strategy hub's `research/market/competitors_and_partners.md` §11 for the partner-assessment context. Bora flagged two things about Transitrix's process layer: an **operational-model / business-intent gap** (our diagrams are either fully governed-and-precise or fully catalogue-flat, with nothing business-readable in between) and a **visualisation/layout** trade-off (he called EPC "much easier to visualise than BPMN").

**Scope:** this is a research note, not a spec change. It does not modify any notation, pattern, or validator. It records what each external notation is, where it might inform future Transitrix work, and where our existing choices already hold up. Nothing here is committed to a roadmap — it is input for a future decision, per the issue's "feeds `patterns/` + the methodology notation" framing.

**Method note:** researched via web search against public documentation (TIBCO/Nimbus docs, ARIS BPM Community, academic/vendor comparisons — see Sources). `WebFetch` was unavailable in this (unattended) session, so Bora's own essay at `boraperzic.github.io/Notebook` was **not** read directly here — only the quotes already cached in `competitors_and_partners.md` §6/§11 were used. A future session with fetch access should read the essay itself before any adopter-facing claim leans on "Bora said X."

---

## 1. UPN — Universal Process Notation

**What it is.** Developed by Walter Bril and colleagues at Nimbus Partners in the early 2000s; released as an open standard in 2008 ([TechTarget](https://www.techtarget.com/searchcio/definition/Universal-Process-Notation-UPN), [Netcall](https://www.netcall.com/blog/what-is-upn/)). Not proprietary, no special software required to read a UPN diagram.

**Structural rules:**
- **One shape.** The activity box is the only object used to represent a process step ([HandWiki](https://handwiki.org/wiki/Finance:Universal_Process_Notation)). No gateway/decision diamonds — branching is expressed as multiple labelled lines leaving one box, each line carrying the condition text. Vendor material claims this "eliminates decision boxes," cutting shape count by up to 50% versus a traditional flowchart ([Hike2](https://hike2.com/resources/article/power-of-universal-process-notation/)) — treat as a vendor claim, not a verified figure, but the mechanism (push branch logic onto the edge label, not a new node type) is real and matches what the sources describe.
- **Resources, not lanes.** A box carries a `resource` tag (who does it) rather than being positioned inside a swimlane. This keeps the flow strictly left-to-right and lets one box name multiple resources without a lane-crossing line ([Salesforce Ben](https://www.salesforceben.com/introduction-to-universal-process-notation-upn-for-salesforce-processes-mapping/)).
- **Recursive drill-down.** Any activity box can have its own lower-level diagram; there is no cap on depth. Each level is kept to roughly 8–10 boxes and describes its process at one consistent level of abstraction, no matter how complex the overall process is ([TechTarget](https://www.techtarget.com/searchcio/definition/Universal-Process-Notation-UPN), [Elements.cloud](https://elements.cloud/blog/universal-process-notation-upn/)).

**Where it touches our operational-model gap.** Transitrix currently has no notation that is *both* recursive *and* business-readable-first:
- [`06-process-map.md`](views/06-process-map.md) (Process Landscape Map) is a **flat, three-group catalogue** (Operating / Supporting / Management) — no sub-nesting, `draft` status.
- [`01-bpmn.md`](views/01-bpmn.md) is a **single flat flow**, one pool, standards-compliant, meant for governed execution — not meant to be skimmed by a non-specialist.
- [`08-blocks.md`](views/08-blocks.md) (Nested Block Diagrams) is the one Transitrix notation that already does UPN-style unlimited recursive drill-down — but it is scoped to "what's inside what" architecture/infra containment, not process abstraction.

UPN's actual trick — the same shape recursing into itself, one flow decomposing into a lower flow, framed for a general business audience rather than a BPMN-literate one — is a **mechanism we already own** (`blocks`'s recursion), applied to a **domain we haven't pointed it at** (process). That is the concrete shape of the "operational-model / business-intent gap": we can catalogue processes (flat) and we can execute one process precisely (BPMN), but we have nothing between them that reads like a business narrative and drills down like an org chart.

---

## 2. EPC — Event-driven Process Chain

**What it is.** ARIS/SAP-heritage notation: alternating **events** (passive, hexagon, "X has happened") and **functions** (active, "do X"), joined by AND/OR/XOR connectors ([Wikipedia](https://en.wikipedia.org/wiki/Event-driven_process_chain), [ARIS BPM Community](https://ariscommunity.com/event-driven-process-chain)).

**The alternation rule.** Functions and events must strictly alternate, directly or through connectors: an event is always followed by a function, a function always by an event. Events cannot carry a decision — no OR/XOR split is allowed immediately after an event, only after a function ([LinkedIn: Dehghanchaharabi](https://www.linkedin.com/pulse/event-driven-process-chains-epc-ali-dehghanchaharabi)). The flow is single-direction, conventionally top-to-bottom, with no pools, no lanes, no boundary events, no message flows.

**On "EPC is easier to visualise than BPMN" — the claim is contested, and the honest reading matters.** The ARIS-community sources disagree with each other, and several argue the *opposite* on raw diagram size: EPC diagrams tend to be **larger and bulkier** than the equivalent BPMN for the same process, because EPC needs an explicit event node before and after every function while BPMN doesn't ([Leonardo](https://blog.leonardo.com.au/epc-vs-bpmn-reviewing-modelling-notations), [OMNITRACKER](https://www.omnitracker.com/en/resources/news/epc-and-bpmn-2-0-advantages-definition-and-differences/)). What EPC does have going for it, consistently, is **layout tractability, not compactness**: the strict event/function alternation and single-direction flow make an EPC diagram a simply-layered DAG with no lane assignment problem and no cross-pool routing to solve. BPMN's generality — multiple pools, lanes, gateways that can point anywhere, boundary events, sub-process expansion — is exactly what makes *automatic* BPMN layout hard in general-purpose tooling. Read charitably, Bora's "easier to visualise" is almost certainly about the **layout algorithm's job**, not the rendered picture's size.

**Where this validates, rather than threatens, our own BPMN.** [`01-bpmn.md`](views/01-bpmn.md) §1/§5 already made the same trade EPC makes, by a different mechanism: instead of EPC's alternation grammar, our notation gets deterministic compile-time layout by **narrowing scope** — exactly one pool per document, a fixed subset of BPMN 2.0 element types, no manual coordinates. Two different notations, same underlying lesson: **auto-layout tractability comes from constraining the grammar, not from a smarter generic graph-layout engine.** This is direct evidence to *resist* scope creep on `bpmn` (multi-pool collaboration, sub-process expansion, boundary events — all listed out-of-scope in §13 of the spec) unless a layout story ships alongside it. EPC and BPMN both had to sacrifice generality for renderability; we already made that trade deliberately and should not casually undo it.

---

## 3. Nimbus — the method, not just the notation

UPN is the diagram grammar; **Nimbus** (now TIBCO Nimbus) is the surrounding governance platform. Beyond the notation itself, it adds: named diagram **owners** and **authors**, an **authorisation cycle** requiring assigned reviewers to sign off before a diagram publishes, a **document registry** for supporting artefacts, and per-diagram **access rights** ([TIBCO Nimbus Control docs](https://docs.tibco.com/pub/nimbus-control/8.1.4-january-2012/docs/controlGuide.pdf), [TIBCO product page](https://docs.tibco.com/products/tibco-nimbus)).

**Relevance to `patterns/`.** [`06-process-map.md`](views/06-process-map.md) already carries `owner_role` per process, but nothing in canon models an authorisation/sign-off cycle for a process change — who must approve a `PROCESS` element edit before it's "Active" again. None of the current five patterns ([`patterns/index.md`](../patterns/index.md)) cover this; the closest is the ADR-registry pattern, which governs *decisions*, not *process diagrams*. This is not a gap that needs closing now — it's a candidate shape for a future pattern ("process sign-off cycle") if an adopter asks for governed process change control. Noted here so it isn't rediscovered from scratch later.

---

## 4. FDP — unconfirmed, not researched

The issue itself flagged this as an unconfirmed acronym. Search confirms there is no standard EA/process-notation meaning attached to "FDP" — nothing surfaced across general search, ARIS/BPM community sources, or enterprise-architecture framework listings. Per the issue's own instruction, **no further time spent here**. Confirm with Bora what he meant before investing any research effort.

---

## 5. Summary — where each helps, and where it doesn't

| Notation | Serves the operational-model / business-intent gap? | Serves the layout question? | Action implied |
|---|---|---|---|
| **UPN** | Yes — recursive, business-readable-first, no gateway iconography. Closest fit to the gap Bora named. | Not really its point (single-shape diagrams don't have BPMN's layout problem to begin with). | Study further **only if** Valerii wants to scope a business-narrative process tier; the recursion mechanism already exists in `blocks` and could plausibly extend to process, but that's a real notation-design decision, not implied by this note. |
| **EPC** | Marginal — still a flow notation, not narrative-first; doesn't close the business-readability gap UPN does. | Yes, but as a lesson about grammar-constraint, not a layout algorithm to adopt. Confirms our `bpmn` narrowing was the right call. | No adoption — the lesson is already applied. Worth citing if `bpmn` scope-expansion is ever proposed. |
| **Nimbus (method)** | Indirect — governance, not notation. | No. | Filed as a future `patterns/` candidate; not actionable now. |
| **FDP** | Unknown | Unknown | Confirm the acronym with Bora before any further work. |

---

## 6. Contrast with BPMN auto-layout — do not lose it

Per `competitors_and_partners.md` §11, the explicit ask was to contrast against **our BPMN auto-layout strength** and not lose it. Nothing found here argues for weakening that strength. If anything, EPC's example strengthens the case for it: the two production notations that solved deterministic auto-layout (EPC, and our own `bpmn`) both did it by cutting the grammar down, not by building a cleverer layout engine. The risk to watch is the opposite direction — a future UPN-inspired "business narrative" tier must not become a backdoor way to re-widen `bpmn`'s own scope; it should be its own notation (or an extension of `blocks`), not a relaxation of `01-bpmn.md`'s single-pool constraint.

---

## 7. Open follow-ups

- Confirm "FDP" with Bora before spending any further research time on it.
- Read `boraperzic.github.io/Notebook` directly (this session had no `WebFetch` access) before making any adopter-facing or partnership-facing claim that attributes a specific position to Bora.
- If Valerii wants to pursue a business-narrative process tier, that's a notation-design decision (new notation vs. extending `blocks`) — not scoped or recommended by this note.

---

## Sources

- [TechTarget — Universal Process Notation (UPN)](https://www.techtarget.com/searchcio/definition/Universal-Process-Notation-UPN)
- [HandWiki — Universal Process Notation](https://handwiki.org/wiki/Finance:Universal_Process_Notation)
- [Elements.cloud — Universal Process Notation (UPN)](https://elements.cloud/blog/universal-process-notation-upn/)
- [Netcall — What is UPN?](https://www.netcall.com/blog/what-is-upn/)
- [Salesforce Ben — Introduction to UPN for Salesforce Processes Mapping](https://www.salesforceben.com/introduction-to-universal-process-notation-upn-for-salesforce-processes-mapping/)
- [Trailhead — Understanding Universal Process Notation in Detail](https://trailhead.salesforce.com/content/learn/modules/business-process-mapping/understand-universal-process-notation)
- [Hike2 — Power of Universal Process Notation Tool For Organizations](https://hike2.com/resources/article/power-of-universal-process-notation/)
- [Ian Gotts — The evolution of process diagramming](https://iangotts.medium.com/the-evolution-of-process-diagramming-266f8a447aab)
- [Imperial College — Quick Start Guide to Universal Process Notation (PDF)](https://www.imperial.ac.uk/media/imperial-college/administration-and-support-services/operational-excellence/public/Quick-Start-Guide-to-Universal-Process-Notation.pdf)
- [Wikipedia — Event-driven process chain](https://en.wikipedia.org/wiki/Event-driven_process_chain)
- [ARIS BPM Community — Event-driven process chain (EPC)](https://ariscommunity.com/event-driven-process-chain)
- [ARIS BPM Community — EPC vs BPMN](https://ariscommunity.com/users/kotnana/2010-11-30-epc-vs-bpmn)
- [ARIS BPM Community — BPMN vs. EPC revisited, part 1](https://ariscommunity.com/users/ivo/2011-04-11-bpmn-vs-epc-revisited-part-1)
- [ARIS BPM Community — BPMN vs. EPC revisited, part 2](https://ariscommunity.com/users/ivo/2011-04-27-bpmn-vs-epc-revisited-part-2)
- [ARIS BPM Community — EPC vs. BPMN, the perfect flamewar](https://ariscommunity.com/users/sstein/2010-04-15-epc-vs-bpmn-perfect-flamewar)
- [Leonardo Consulting — EPC vs BPMN: Reviewing Modelling Notations](https://blog.leonardo.com.au/epc-vs-bpmn-reviewing-modelling-notations)
- [OMNITRACKER — Advantages and differences of EPC and BPMN 2.0](https://www.omnitracker.com/en/resources/news/epc-and-bpmn-2-0-advantages-definition-and-differences/)
- [LinkedIn — Ali Dehghanchaharabi, Event-Driven Process Chains (EPC)](https://www.linkedin.com/pulse/event-driven-process-chains-epc-ali-dehghanchaharabi)
- [TIBCO — Nimbus product docs](https://docs.tibco.com/products/tibco-nimbus)
- [TIBCO Nimbus Control — Author Client User Guide (PDF)](https://docs.tibco.com/pub/nimbus-control/8.1.4-january-2012/docs/controlGuide.pdf)
- Internal: `research/market/competitors_and_partners.md` §6, §11 (strategy hub — private, not linked here per repo convention of not cross-linking the hub from public files)

---

## References (internal)

- BPMN notation: [`views/01-bpmn.md`](views/01-bpmn.md) — see especially §1 (overview), §5 (single-pool constraint), §13 (out-of-scope elements)
- Process landscape map: [`views/06-process-map.md`](views/06-process-map.md)
- Nested block diagrams: [`views/08-blocks.md`](views/08-blocks.md)
- Process blueprint: [`views/13-process-blueprint.md`](views/13-process-blueprint.md)
- Notation selection framing: [`NOTATION_SELECTION_GUIDE.md`](NOTATION_SELECTION_GUIDE.md)
- Deployment patterns: [`../patterns/index.md`](../patterns/index.md)
