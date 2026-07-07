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

Write each candidate to `_intake/drafts/<slug>.md` (do not write to `knowledge/`). Use this frontmatter shape:

~~~
---
type: insight | finding | concept | question
title: "<concise title>"
description: "<one-sentence summary>"
source: /_intake/processed/<source-document-filename>
created_at: YYYY-MM-DD
confidence: observed | inferred | assumed
mapping: confirms | extends | proposes | conflicts   # optional
conflicts_with: ""   # when mapping: conflicts
review_status: ready | ambiguous | blocked
ambiguity_note: ""   # required when review_status: ambiguous
tags: [<topic>, ...]
timestamp: YYYY-MM-DDTHH:MM:SSZ
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

Do not promote `mapping: conflicts` objects without flagging them for human review.

## Review disposition (Gate 6)

Set `review_status:` on every draft:
- `ready` — grounded in the source, structurally complete, ready for curator review
- `ambiguous` — multiple valid interpretations or unclear mapping; set `ambiguity_note:` explaining what the curator must decide
- `blocked` — too vague or ungrounded to review; default is skip

## After extraction

List all draft files written under `_intake/drafts/`, numbered. Then state:
- How many drafts were written
- What was skipped and why (e.g. "2 items skipped: too vague / already in knowledge/index.md")

Run the linter per [verify-drafts.md](verify-drafts.md) before presenting drafts to the curator. Wait for approval before promoting anything to `knowledge/`.
