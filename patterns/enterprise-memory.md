# Enterprise Memory

**Pattern type:** dual-layer  
**Complexity:** low to medium  
**System-agnostic counterpart:** Enterprise Memory pattern  
**Composes with:** [Knowledge Store](knowledge-store.md)

---

## Problem

Architecture knowledge sits in disconnected silos — slide decks, outdated wikis, chat histories, individual heads. The same decisions are re-debated because the reasoning behind them was never captured in a durable, structured form. When teams or tools need to reason over the organisation's goals, capabilities, or history, they start from scratch every time.

Adding AI agents to the picture sharpens the problem: an agent has no persistent memory of the organisation between sessions. Every call reconstructs context from scratch, and the reconstructed context is only as good as whatever the caller knows to include.

## Solution

A Transitrix repository is an Enterprise Memory by design. Its structured, Git-native notation captures two kinds of memory in one place:

- **Semantic memory** — the stable model of the enterprise: what the organisation *is*, intends, and is capable of. Carried by `DRIVER`, `GOAL`, `CAPABILITY`, `PROCESS`, `PRODUCT`, and `SCENARIO` elements in `canon/`.
- **Episodic memory** — the record of what happened: decisions made, events observed, changes recorded. Carried by ADR records in `operations/decisions/`, `CHANGE` elements, `REQUIREMENT` traces, and `field/` artefacts with OKF provenance.

Both kinds are version-controlled in Git, human-readable as text, and machine-readable by any AI agent that can parse the repository. Because the memory is EA-grounded — built on a formal enterprise model at the business, strategy, and motivation layers — it is not a free-form notes pile or an opaque embedding store. It is structured enough to validate, version, and reason over precisely.

## Structure

```
┌────────────────────────────────────────────┐
│            Enterprise Memory               │
│                                            │
│  canon/          semantic layer            │
│    elements/     goals · drivers ·         │
│                  capabilities · processes  │
│    views/        derived diagrams          │
│                                            │
│  operations/     episodic layer            │
│    decisions/    ADRs — why canon is so    │
│                                            │
│  field/          episodic layer            │
│                  raw observations + artefacts│
│                                            │
│  codex/          governance layer          │
│                  laws · policies           │
└────────────────────────────────────────────┘
```

The semantic layer is the stable model; the episodic layer is the living record. Both are queryable by humans (search, `grep`, diagrams) and by machines (agent context, semantic search over structured YAML). The governance layer anchors both to external constraints.

## Memory kinds in Transitrix notation

| Memory kind | What it captures | Transitrix carrier |
|---|---|---|
| Semantic — intent | Goals, strategy, priorities | DRIVER, GOAL, DGCA chains |
| Semantic — capability | What the org can do | CAPABILITY, Capability Map views |
| Semantic — operations | How the org works | PROCESS, BPMN, Process Map |
| Semantic — landscape | Products, applications, actors | PRODUCT, APPLICATION, ACTOR |
| Episodic — decisions | Why things are the way they are | ADRs in `operations/decisions/` |
| Episodic — change events | External amendments, gaps to close | CHANGE, AMENDMENT, REQUIREMENT |
| Episodic — observations | Raw field notes, interviews, surveys | `field/` artefacts with OKF frontmatter |
| Governance — constraints | Laws, policies, compliance obligations | CODEX, REGULATION, POLICY |

Together these cover every ArchiMate layer — Motivation, Strategy, Business, Application — from one source of truth. Derived Mermaid views (sequence, ER, C4, journey) project the same model into the Application and Technology layers without duplicating content.

## Scales

> **Individual adopters:** see [Personal Memory](personal-memory.md) for a standalone guide scoped to solo or small-team deployments — same dual-layer foundation, individual-friendly framing, no governance overhead.

### Personal scale — second brain

A single Transitrix repo for one person or a small team. All memory kinds live in one repo under the [Transitrix Alone](transitrix-alone.md) pattern. Low ceremony: no separate knowledge repo, no dedicated curation role. The semantic canon grows incrementally; episodic entries are captured directly in `field/` and `operations/decisions/`.

```
canon/elements/        ← semantic: goals, capabilities, processes
canon/views/           ← derived diagrams
field/                 ← episodic: observations, notes, artefacts
operations/decisions/  ← episodic: ADRs — the decision log
codex/                 ← governance constraints
```

This is the minimum viable Enterprise Memory. It is operational from day one of a Transitrix deployment; no additional infrastructure is required.

### Enterprise scale — governed memory

For multi-project environments where raw material volume exceeds one team's direct review capacity, add the [Knowledge Store](knowledge-store.md) pattern. Project repos feed raw material; the knowledge store curates it into OKF knowledge objects; validated objects promote to Transitrix canon.

The Knowledge Store's curated canon *is* the semantic layer of the Enterprise Memory — the two are not competing structures. They compose: a governed Enterprise Memory uses the Knowledge Store for curation; the Knowledge Store's output is the semantic canon that agents and teams reason over.

```
┌────────────────────────────────────────────┐
│       project repos (source layer)         │
│  raw notes, interviews, survey data        │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│   Knowledge Store (curation layer)         │
│  OKF knowledge objects — curated, dated    │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│  Enterprise Memory — Transitrix repo       │
│  semantic canon + episodic record          │
└────────────────────────────────────────────┘
```

## When to use

- Any team that wants a single place both humans and AI agents can query for organisational context.
- Individuals building a personal second brain — a repo where decisions, goals, and observations accumulate over time in a structured, queryable form.
- Enterprises that need AI agents to carry persistent, EA-grounded knowledge of the organisation across sessions.
- Organisations where the same strategic questions resurface because the reasoning behind prior answers was not preserved.

## How to start

1. **Follow the Transitrix Alone pattern.** A Transitrix repo is an Enterprise Memory. The `canon/` + `field/` + `operations/` layout established by [Transitrix Alone](transitrix-alone.md) is the base structure — nothing extra needed to start.
2. **Author your first Goals tree.** This is the seed of the semantic layer. One `*.goals.transitrix.yaml` file in `canon/views/` captures intent at the top of the model.
3. **Capture the first episodic entries.** Write the initial ADR documenting why you are adopting Transitrix (`operations/decisions/0001-initial-scope.md`). Every future decision that belongs in the model record gets an ADR here.
4. **Use `field/` for observations.** Notes, interview summaries, meeting outputs — anything not yet ready for canon goes in `field/`. If you are using the Knowledge Store pattern, these feed the OKF curation track. If not, they remain as-is until you are ready to promote.
5. **Add the Knowledge Store when curation load grows.** The Knowledge Store is the natural next step when field material volume exceeds what one reviewer can handle directly. The repo structure does not change — `canon/` remains the centre.
6. **Wire an AI agent.** Point the agent at your Transitrix repo as context. Structured YAML elements and named ADRs are dense, machine-readable memory. The agent can reason over goals, query capabilities, and check prior decisions — without you reconstructing context on each call.

## OKF frontmatter for field artefacts

Field artefacts that feed the episodic layer use OKF frontmatter (same conventions as the [Knowledge Store](knowledge-store.md) pattern — no new fields introduced here):

| Field | Required | Notes |
|---|---|---|
| `type:` | **yes** | e.g. `observation`, `insight`, `finding`, `source-document` |
| `title:` | recommended | Display name |
| `description:` | recommended | Single-sentence summary |
| `source:` | Transitrix extension | Originating document path or URI |
| `created_at:` | Transitrix extension | Date the object was captured |
| `confidence:` | Transitrix extension | `observed` / `inferred` / `assumed` |
| `timestamp:` | recommended | ISO 8601 datetime of last modification |

See the [Knowledge Store](knowledge-store.md) pattern for the full OKF field table, starter templates, and bundle conventions.
