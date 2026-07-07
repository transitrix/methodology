# Extract OKF Knowledge Objects

Extract discrete knowledge objects from the source document. Each object captures one clear, self-contained idea worth curating — an insight, finding, concept, or open question.

## What to extract

Extract an object when the source contains:

- A **finding** — an observed fact or measurement about how something works or fails
- An **insight** — a derived understanding or pattern that explains why something happens
- **concept** — a defined term, model, or framework the team uses
- **question** — an unresolved open question worth tracking

Do not extract:
- Procedural steps (unless the process itself is the insight)
- Data that is too specific to be reusable
- Statements that are already in `knowledge/` (check `knowledge/index.md`)
- Vague assertions without grounding in the source

## Output format

For each candidate object, output a fenced block:

~~~
---
type: insight | finding | concept | question
title: "<concise title>"
description: "<one-sentence summary>"
source: /_intake/processed/<source-document-filename>
created_at: YYYY-MM-DD
confidence: observed | inferred | assumed
mapping: confirms | extends | proposes | conflicts   # optional — classify against existing knowledge
conflicts_with: ""   # when mapping: conflicts — path to contradicted /knowledge/ object or canon id
tags: [<topic>, ...]
---

<Body: 2–5 sentences expanding the description. Cite the exact passage if helpful.>

Citations:
- [<Source document title>](/_intake/processed/<source-document-filename>)
~~~

## Confidence assignment

Inherit from the source document's `confidence:` unless the specific claim warrants lower:
- `observed` → direct evidence in the source text (measurements, quotes, examples)
- `inferred` → logical derivation from the source, not explicitly stated
- `assumed` → hedged or uncorroborated claim in the source

## Mapping classification (Gate 2)

When a candidate relates to something already in `knowledge/index.md`, set `mapping:`:
- `confirms` — restates or corroborates an existing object
- `extends` — adds detail without contradicting
- `proposes` — new claim not yet in the store
- `conflicts` — contradicts an existing object or canon assertion; set `conflicts_with:` to the `/knowledge/…` path or typed canon id

Do not admit `mapping: conflicts` objects without flagging them for human review.

## After extraction

List all candidate objects, numbered. Then state:
- How many were extracted
- What was skipped and why (e.g. "2 items skipped: too vague / already in knowledge/index.md")

Wait for the user to approve, reject, or revise each item before writing anything to `knowledge/`.
