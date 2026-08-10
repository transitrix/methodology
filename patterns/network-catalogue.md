# Transitrix + Network Catalogue

**Pattern type:** four-level, opt-in ladder
**Complexity:** medium
**Mechanism:** [`method/05-catalogue-integration.md`](../method/05-catalogue-integration.md) — this pattern is the when / why / choose entry point; the ownership rule, the binding envelope, the catalogue publication format, and the four levels themselves are specified once, there. §7 of that document is the step-by-step adopter path.

---

## Problem

Two or more repositories each hold their own Transitrix canon, and the same real-world concept — a capability, a term, a driver — gets modelled independently in each, under a different `id`, with no way for one repository to recognise what another already defined. Left alone, this either drifts silently (two definitions slowly diverge) or gets solved by hand, ad hoc, once someone notices the duplication.

## When *not* to do this

**One repository, alone, needs none of this.** If nothing outside your own canon should ever recognise one of your elements, stop — this pattern (and the mechanism behind it) has nothing to offer a single, unfederated repository. Adopting it anyway adds an opt-in field and a check that never fires; harmless, but not what you came here for. The signal to start is external: **a second repository's canon should be able to recognise the first's.**

## Solution

Adopt the [catalogue integration levels](../method/05-catalogue-integration.md): a **central repository** publishes a versioned catalogue slice of its own admitted elements, and a **project repository** relates to it through four separately-enabled levels — each useful, and complete, on its own.

| Level | What a project repository does |
|---|---|
| **L0 — decisions** | The [Enterprise ADR Registry](enterprise-adr-registry.md) mechanism, unchanged. Already covered if you've adopted that pattern. |
| **L1 — vocabulary** | Pins the published central catalogue; a report-only CI check flags terminology divergence. |
| **L2 — recognition** | A locally authored element is matched against the pinned catalogue; a binding is **proposed**, never written unattended. |
| **L3 — promotion** | A local element is proposed for import centrally; on admission, the local element gains its binding. |

**The ownership rule underneath all four:** exactly one repository owns each element. The central repository owns what it has admitted — id, name, content; every other repository relates to it by reference, never by copy. A project repository's own elements keep their own `id` forever; binding to a central element (L2/L3) adds a fact about the element, it never substitutes the central identity for the local one. **No tool ever rewrites a local `id`.**

```
   PROJECT REPOSITORIES                          CENTRAL REPOSITORY
┌──────────────────────────────┐
│ service-x/                   │             ┌────────────────────────────────────┐
│   canon/…  (canon_id →) ──────┼──┐          │ catalogue slice (published release) │
└──────────────────────────────┘  │  L1 pin   │   id · type · name · aliases ·      │
                                   ├─────────▶│   description — nothing else        │
┌──────────────────────────────┐  │  L2/L3    │                                     │
│ platform/                    │  │ propose   │ admitted elements                   │
│   canon/…  (canon_id →) ──────┼──┘           │   (origin: ← promoted from a repo)  │
└──────────────────────────────┘             └────────────────────────────────────┘
```

Three properties the diagram encodes, each load-bearing:

- **Propose, never auto-merge**, at every level — L1 reports, L2 proposes, L3 emits a proposal for a human admission gate. Nothing writes admitted canon unattended.
- **No two-way sync**, at any level — the central repository never edits a project repository's canon, and a project repository never writes into the central repository. Same discipline the ADR registry already applies to decisions, generalised to elements.
- **Levels are separable in the tooling**, not merely in the documentation — each is built, and useful, independently of the ones after it. A repository at L1 alone has a pinned vocabulary and a divergence report; nothing about it requires L2 or L3 to ever happen.

## Start here — L0, right now, before a second repository exists

L0 **is** the [Enterprise ADR Registry](enterprise-adr-registry.md) pattern's per-repo half, exactly. If you've already adopted that pattern's "Start here" section, L0 is done — there is nothing further to add for it. If not, one command does the whole per-repo setup in one step:

```
transitrix-ingest adopt-adl <org-root> [--repo <org>/<repo>]
```

See [`method/05-catalogue-integration.md`](../method/05-catalogue-integration.md) §7 Step 1 for what it creates and [`enterprise-adr-registry.md`](enterprise-adr-registry.md) for the mechanism itself.

**A repository at L0 alone is a complete, valid state** — no pin, no new field, no reference to a central catalogue anywhere in its own canon.

## When to add L1 (vocabulary)

- A central repository already publishes a catalogue slice you want your own terminology checked against.
- You want early warning when a term you're about to mint already exists centrally, before you author the element — not after.

`transitrix-ingest catalogue-pin <org>/<repo> <version> <path> [org-root]` writes the pin; `method/05-catalogue-integration.md` §7 Step 2 is the full walkthrough, including where the vendored slice goes.

## When to add L2 / L3 (recognition, promotion)

- L2, once you want locally authored elements checked for an existing central match, staged for human review rather than silently left unbound.
- L3, once you're ready to propose one of your own elements for adoption centrally — the reverse direction, a local object becoming a shared one.

Both are commands (`catalogue-recognize`, `catalogue-bind`, `catalogue-promote`) — `method/05-catalogue-integration.md` §7 Steps 3–4 and [`packages/ingest-cli/README.md`](../packages/ingest-cli/README.md) for the full reference.

## How this differs from Knowledge Store

[Knowledge Store](knowledge-store.md) answers a different question: *several repositories supply raw, uncurated material that a curation layer refines into one repository's canon.* The source repositories in that pattern hold no canon of their own — `field/` is an input feed, not a model.

Network Catalogue answers the opposite shape: *several repositories each hold their own complete canon*, and the question is how one repository's model recognises another's, without either giving up ownership of what it already modelled. If your repositories are producing raw material for one team to curate, use Knowledge Store. If your repositories are each already modelling independently and need to recognise each other's elements, use this pattern instead.

## Constraints (inherited from the mechanism, unchanged)

- **Additive and backwards-compatible.** Every repository stays valid unchanged; adopting no level here changes nothing.
- **No agent writes across a repository boundary.** An agent working a project repository may propose a promotion; it never writes into the central repository.
