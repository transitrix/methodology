<!-- DRAFT — structure only. Final narrative voice & positioning are owned by the
     comms / strategy layer (STYLE_GUIDE §3 voice tests, §3.5 no retired terms).
     This file is the demo SPINE: each beat maps to the notation/view that tells it.
     Fictional, data-free. -->

# acme_corp — a Transitrix walkthrough

> **What this is.** [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) (`acme_corp`) is a
> fictional mid-size EU direct-to-consumer online retailer, modelled end-to-end in Transitrix. This
> walkthrough reads that repository as one story — from "who they are" to "audit-ready" — so the
> notations connect into a coherent picture rather than standing as isolated diagrams.
>
> _Fictional and data-free. GDPR / NIS2 / e-commerce appear here only as demonstration
> material._

## The story in eight beats

Each beat links to where it lives in the `acme-corp` repo.

1. **Who they are — the as-is enterprise.**
   Products, the system estate, capabilities at their current maturity, and the
   order-lifecycle state machine managed by the Order Management System.
   → [`canon/views/products/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/products) ·
     [`canon/views/applications/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/applications) ·
     [`canon/views/capabilities/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/capabilities) ·
     [`canon/views/state/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/state) (order lifecycle — Application layer, Mermaid) ·
     [`canon/views/c4component/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/c4component) (application containers — Application layer, Mermaid) ·
     [`canon/views/er/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/er) (domain entity model — Application layer, Mermaid) ·
     [`canon/views/c4deployment/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/c4deployment) (deployment topology — Technology layer, Mermaid) ·
     [`canon/views/c4infrastructure/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/c4infrastructure) (network zones — Technology layer, Mermaid)

2. **The pressure — why they had to change.**
   External drivers (a GDPR enforcement wave, incoming NIS2) and the real obligations
   behind them; the coverage read shows where the model was still "dark".
   → [`canon/views/dgca/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/dgca) (drivers) ·
     [`codex/`](https://github.com/transitrix/acme-corp/tree/main/codex) (the obligations) ·
     [`canon/views/coverage-metric/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/coverage-metric)

3. **What they decided to become — the intent.**
   The goal tree: compliance, resilience, growth — and the portfolio quadrant that
   shows which goals demand immediate action versus which shape the longer horizon.
   → [`canon/views/goals/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/goals) ·
     [`canon/views/dgca/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/dgca) ·
     [`canon/views/quadrant/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/quadrant) (goal prioritisation — Strategy layer, Mermaid)

4. **The transformation — how.**
   The changes, target capability maturity, alternative paths considered.
   → [`canon/views/dgca/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/dgca) ·
     [`canon/views/capabilities/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/capabilities) ·
     [`canon/views/scenarios/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/scenarios)

5. **The delivery — the work.**
   The readiness programme as a scheduled project: dependencies, critical path, milestones.
   → [`canon/views/action/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/action) ·
     [`canon/views/timeline/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/timeline) (programme milestones — Implementation & Migration layer, Mermaid)

6. **How it runs day-to-day.**
   From the process landscape down to one detailed process, a value-chain blueprint
   with the obligations lane, and the application-layer sequence showing how OMS and
   CRM coordinate during a GDPR erasure sweep.
   → [`canon/views/processmap/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/processmap) ·
     [`canon/views/bpmn/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/bpmn) ·
     [`canon/views/process-blueprint/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/process-blueprint) ·
     [`canon/views/sequence/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/sequence) (erasure event — Application layer, Mermaid) ·
     [`canon/views/journey/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/journey) (customer order journey — Business layer, Mermaid)

7. **The proof — compliance, made legible.**
   Which obligations hit which products and processes, with each cell's status; the gaps
   that got closed.
   → [`canon/views/compliance-impact/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/compliance-impact) ·
     [`canon/views/sankey/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/sankey) (obligation volume by regulation and subject — Business layer, Mermaid)

8. **The outcome — audit-ready and machine-runnable.**
   Coverage before → after, and the decisions log that records how the architecture was
   governed along the way.
   → [`canon/views/coverage-metric/`](https://github.com/transitrix/acme-corp/tree/main/canon/views/coverage-metric) ·
     [`operations/decisions/`](https://github.com/transitrix/acme-corp/tree/main/operations/decisions)

## How to read it yourself

Clone [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) and open any view file in
**Transitrix Studio** (VS Code) for a live diagram, or render with
`npx @transitrix/cli validate <file>`. The whole-repo model integrity is gated in that repo's CI
(`.github/workflows/architecture-validate.yaml`). New to the methodology itself? Start with
[`GETTING_STARTED.md`](GETTING_STARTED.md).

---

<!-- TODO (comms/strategy): replace beat blurbs with the final success-story prose.
     Keep fictional + data-free; no client names. -->
