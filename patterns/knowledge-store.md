# Transitrix + Knowledge Store

**Pattern type:** three-layer  
**Complexity:** medium  
**System-agnostic counterpart:** Knowledge Refinery pattern

---

## Problem

Raw source material — interview notes, meeting summaries, research documents — accumulates faster than it can be curated into the canonical model. Authors dump directly into `canon/` and quality degrades, or they leave everything in `field/` and canon never grows. There is no structured hand-off between "collected" and "validated".

## Solution

Three explicit layers with clear promotion rules: project repos contribute raw material, a dedicated knowledge repo curates it into OKF-formatted knowledge objects, and Transitrix canon holds only what has been validated and promoted.

```
┌────────────────────────────────────────────┐
│              source layer                  │
│                                            │
│  project repos — raw notes, docs, data     │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│            refinement layer                │
│                                            │
│  knowledge repo — OKF, curated, dated      │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│              canon layer                   │
│                                            │
│  Transitrix repo — validated primitives    │
└────────────────────────────────────────────┘
```

## Layers

### Source layer — project repos

Each project repo contributes raw material: meeting notes, interview transcripts, survey data, draft documents. Material lives under `field/` in each repo. No Transitrix structure is required at this layer — it is an input feed, not a model.

### Refinement layer — knowledge repository

A dedicated knowledge repository (separate from Transitrix) holds curated knowledge objects in OKF format: Markdown files with structured YAML frontmatter, explicit source citations, and timestamps. Curators pull from the source layer, extract signal, and write knowledge objects. Nothing reaches this layer without a citation and a timestamp.

Key OKF fields per knowledge object:
- `source:` — URI or repo path of the originating document
- `created_at:` — date the object was curated
- `confidence:` — curator's assessment (observed / inferred / assumed)
- `tags:` — free-form classification

### Canon layer — Transitrix repo

Validated primitives — DRIVER, GOAL, CHANGE, CAPABILITY, and others — promoted from the knowledge repo. Each element in `canon/elements/` corresponds to one or more knowledge objects. The promotion decision is a pull request; review is the validation gate.

Transitrix also distributes canonical vocabulary back downstream: generated `glossary.md` or object-reference stubs committed to project repos keep source-layer teams aligned with the enterprise model.

## When to use

- Multiple project repos producing source material that exceeds one team's capacity to review directly.
- An explicit curation role exists (knowledge manager, enterprise architect) who is distinct from the project teams.
- Source material quality is uneven and needs a structured validation stage before reaching canon.
- Downstream consumers (other tools, teams, systems) need stable, versioned canonical objects with traceable provenance.

## How to start with Transitrix

1. **Stand up the Transitrix repo first.** Follow the [Transitrix Alone](transitrix-alone.md) pattern to establish canon. The knowledge store wraps it — canon does not change shape.
2. **Create the knowledge repository.** A separate Git repo, not a folder inside Transitrix. Scaffold it with OKF-compatible frontmatter templates. Decide the `confidence:` vocabulary your team will use (observed / inferred / assumed is a reasonable default).
3. **Instrument source repos.** Add a convention for capturing raw material: `field/` folder, a lightweight template, and a note in each project's `CONTRIBUTING.md` pointing to the knowledge repo as the curation destination.
4. **Define the promotion criteria.** Document in the knowledge repo's `README.md` what makes a knowledge object ready to promote: minimum confidence level, required fields, review sign-off.
5. **Promote the first batch.** Create a Transitrix PR for each promoted object. Link the PR back to the knowledge object(s) it was derived from. This establishes the provenance chain.
6. **Wire the return path.** Set up a process (manual or automated) to publish a `glossary.md` or object-reference stubs from Transitrix back to source repos. This closes the loop and keeps project teams aligned with canon.
