# Knowledge Store

**Pattern type:** three-layer  
**Complexity:** medium  
**System-agnostic counterpart:** Knowledge Refinery pattern  
**OKF alignment:** Google Cloud Open Knowledge Format v0.1 (announced 2026-06-12) — spec at [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)

---

## Overview

Transitrix includes an optional knowledge store component for organisations that need a structured curation layer between raw source material and the canonical model. The knowledge store is part of the methodology — not a separate or competing system. It uses [Google Cloud Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) as its storage format, which provides interoperability with OKF-compatible tooling while keeping knowledge objects fully within the Transitrix lifecycle.

## Problem

Raw source material — interview notes, meeting summaries, research documents — accumulates faster than it can be curated into the canonical model. Authors dump directly into `canon/` and quality degrades, or they leave everything in `field/` and canon never grows. There is no structured hand-off between "collected" and "validated".

## Solution

Three explicit layers with clear promotion rules: project repos contribute raw material, the Transitrix knowledge store curates it into OKF-formatted knowledge objects, and Transitrix canon holds only what has been validated and promoted.

```
┌────────────────────────────────────────────┐
│              source layer                  │
│                                            │
│  project repos — raw notes, docs, data     │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│   Transitrix knowledge store (optional)    │
│                                            │
│  OKF knowledge objects — curated, dated    │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│         Transitrix canon layer             │
│                                            │
│  canon/ — validated primitives             │
└────────────────────────────────────────────┘
```

## Layers

### Source layer — project repos

Each project repo contributes raw material: meeting notes, interview transcripts, survey data, draft documents. Material lives under `field/` in each repo. No Transitrix structure is required at this layer — it is an input feed, not a model.

### Refinement layer — Transitrix knowledge store

The Transitrix knowledge store holds curated knowledge objects in OKF format: Markdown files with structured YAML frontmatter, explicit source citations, and timestamps. Curators pull from the source layer, extract signal, and write knowledge objects. Nothing reaches this layer without a citation and a timestamp.

OKF frontmatter per knowledge object (Google OKF v0.1 fields + Transitrix extensions):

| Field | Required | Notes |
|---|---|---|
| `type:` | **yes** | Short string identifying the kind of concept — no central registry, choose descriptive values (e.g. `insight`, `finding`, `concept`, `source-document`) |
| `title:` | recommended | Display name; derived from filename if omitted |
| `description:` | recommended | Single-sentence summary |
| `resource:` | recommended | Canonical URI for the underlying asset (Google OKF field) |
| `tags:` | recommended | YAML list for categorisation |
| `timestamp:` | recommended | ISO 8601 datetime of last modification |
| `source:` | Transitrix extension | Repo path or URI of the originating document (provenance) |
| `created_at:` | Transitrix extension | Date the object was curated (distinct from `timestamp:` which tracks modifications) |
| `confidence:` | Transitrix extension | Curator's epistemic assessment: `observed` / `inferred` / `assumed` |

OKF consumers must not reject bundles for unknown fields — Transitrix extensions are fully compatible.

**Bundle conventions (Google OKF v0.1):**
- `index.md` — progressive-disclosure directory listing; keep auto-generated and current
- `log.md` — chronological change history, date-grouped entries; record routing decisions, admit decisions, and assertion outcomes here
- Links between concept files use bundle-relative paths (`/knowledge/concept-name.md`)

### Canon layer — Transitrix repo

Validated primitives — DRIVER, GOAL, CHANGE, CAPABILITY, and others — promoted from the knowledge store. Each element in `canon/elements/` corresponds to one or more knowledge objects. The promotion decision is a pull request; review is the validation gate.

Transitrix also distributes canonical vocabulary back downstream: generated `glossary.md` or object-reference stubs committed to project repos keep source-layer teams aligned with the enterprise model.

## Single-repo MVP

For early adoption where standing up a separate knowledge repo adds too much overhead, the refinement layer can live as folders inside the Transitrix repo:

```
_intake/
  inbox/           ← incoming documents (gitignored — temporary staging)
  originals/       ← source files archived by reference (gitignored)
  processed/       ← OKF source-document records (type: source-document)
  log.md           ← all events: [route] / [admit] / [assert]

knowledge/         ← OKF knowledge objects (type: insight / finding / concept / ...)
  index.md         ← auto-generated bundle index
  <concept>.md     ← individual knowledge objects

canon/             ← Transitrix primitives (unchanged)
```

**Ingestion routing:** a single document can feed one or both tracks.
- **OKF track** — extract knowledge objects → curator reviews chunks → write to `knowledge/` → update `index.md`
- **Canon track** — extract Transitrix primitives → open PR to `canon/` → merge gate

All incoming documents are always archived to `processed/` as OKF source-document records before routing begins. `originals/` is gitignored; the processed record carries `source:` (path or URI) and `source_hash:` (SHA-256) for integrity.

Migrate to a separate knowledge repo when the single-repo structure becomes congested or when a dedicated curation role is established.

## When to use

- Multiple project repos producing source material that exceeds one team's capacity to review directly.
- An explicit curation role exists (knowledge manager, enterprise architect) who is distinct from the project teams.
- Source material quality is uneven and needs a structured validation stage before reaching canon.
- Downstream consumers (other tools, teams, systems) need stable, versioned canonical objects with traceable provenance.

## How to start

1. **Establish the canon first.** Follow the [Transitrix Alone](transitrix-alone.md) pattern. The knowledge store is an additive layer — `canon/` does not change shape when you add it.
2. **Enable the knowledge store** (or scaffold the single-repo MVP folders above). Decide the `confidence:` vocabulary your team will use (`observed / inferred / assumed` is a reasonable default).
3. **Instrument source repos.** Add a convention for capturing raw material: `field/` folder, a lightweight template, and a note in each project's `CONTRIBUTING.md` pointing to the knowledge repo as the curation destination.
4. **Define the promotion criteria.** Document in the knowledge repo's `README.md` what makes a knowledge object ready to promote: minimum confidence level, required fields, review sign-off.
5. **Promote the first batch.** Create a PR for each promoted object. Link the PR back to the knowledge object(s) it was derived from. This establishes the provenance chain.
6. **Wire the return path.** Set up a process (manual or automated) to publish a `glossary.md` or object-reference stubs from Transitrix back to source repos. This closes the loop and keeps project teams aligned with canon.

## Templates

Starter templates for the two core OKF record types live alongside this pattern:

- [`knowledge-store-templates/okf-source-document.md`](knowledge-store-templates/okf-source-document.md) — copy to `_intake/processed/` for each ingested document; covers `type`, `source`, `source_hash`, `confidence`, `tracks`, and routing notes
- [`knowledge-store-templates/okf-knowledge-object.md`](knowledge-store-templates/okf-knowledge-object.md) — copy to `knowledge/` for each extracted concept; covers `type`, `description`, `resource`, `confidence`, citations, and examples

**Initialise the MVP bundle with these two files:**

`_intake/log.md`:
```markdown
# Intake log

Entries are date-grouped. Each entry carries a type tag: [route] routing decision, [admit] chunk approval, [assert] assertion outcome.

## YYYY-MM-DD
```

`knowledge/index.md`:
```markdown
# Knowledge index

Auto-updated when knowledge objects are added or modified. Each entry: title, type, confidence, source.

| Object | Type | Confidence | Source |
|---|---|---|---|
```

## Tooling

Google Cloud publishes reference implementations alongside the OKF spec:
- **Enrichment agent** — walks a dataset, drafts OKF documents, enriches with citations and cross-references
- **Static HTML visualiser** — turns an OKF bundle into an interactive graph view with no backend required
- **Sample bundles** — GA4 e-commerce, Stack Overflow, Bitcoin datasets

These tools consume any OKF-conformant bundle, including Transitrix knowledge stores.
