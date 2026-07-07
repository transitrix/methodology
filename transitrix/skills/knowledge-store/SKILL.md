---
name: Transitrix Knowledge Store
description: Ingest raw source material into the OKF single-repo MVP knowledge store — assess, archive, route to the OKF track (extract knowledge objects → human review → write to knowledge/) and/or the Canon track (extract Transitrix primitives → PR to canon/), and log every decision.
when_to_use: User says "ingest this document", "add this to the knowledge store", "extract knowledge objects from this", "route this to canon", or drops a file into `_intake/inbox/` and wants it processed.
min_version: "1.0.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Transitrix Knowledge Store Skill

Processes raw source material through the OKF single-repo MVP knowledge store. All work is done by the agent using Read/Write/Edit tools — no external CLI required. A human reviews and approves before anything lands in `knowledge/` or `canon/`.

---

## The one rule

**Propose, never write canon unilaterally.** For the OKF track, the agent drafts knowledge object chunks and presents them to the user for review before writing to `knowledge/`. For the Canon track, the agent opens a PR to `canon/` — it never merges it. The human gate is the only admission authority.

**Run the quality gates before promotion.** After writing approved objects to `knowledge/` (Step 4c), run the knowledge-store linter and fix every error before presenting the batch as done:

```bash
python3 tools/knowledge_store_lint.py .
```

The linter enforces Gates 1–4 from [patterns/knowledge-store.md §Quality gates](../../../../patterns/knowledge-store.md). Errors block promotion; warnings (duplicate titles, `confidence: assumed` with high dependents) require explicit human acknowledgment in `_intake/log.md`. See [tests/README.md](tests/README.md) for the KS-001..010 code reference.

---

## Step 0 — Check the MVP structure

Verify the repo has the expected layout:

```
_intake/
  inbox/        ← source files waiting for processing
  originals/    ← raw source files (gitignored)
  processed/    ← OKF source-document records (committed)
  log.md        ← all events: [route] / [admit] / [assert]

knowledge/
  index.md      ← bundle index (auto-maintained)
  <concept>.md  ← individual OKF knowledge objects
```

If `_intake/` or `knowledge/` are missing, scaffold them now. Copy the initialisation content from [patterns/knowledge-store.md §Templates](../../../../patterns/knowledge-store.md). Add gitignore entries for `_intake/inbox/*` and `_intake/originals/*`.

---

## Step 1 — Assess the document

Read the source document from `_intake/inbox/`. Determine:

- **`confidence:`** — curator's epistemic assessment of the signal quality:
  - `observed` — first-hand account, direct evidence, system output
  - `inferred` — derived from evidence; logical but not stated explicitly
  - `assumed` — working assumption, hearsay, or low-corroboration claim
- **`tracks:`** — which ingestion tracks apply (one or both):
  - `okf` — contains knowledge objects: insights, findings, concepts, questions worth curating
  - `canon` — contains Transitrix primitives: DRIVERs, GOALs, CHANGEs, CAPABILITYs, etc.
- **Proposed `description:`** — one-sentence summary of the document

State your assessment to the user before proceeding.

---

## Step 2 — Archive to processed/

Copy the source file reference to `_intake/processed/` as an OKF source-document record using the template at [patterns/knowledge-store-templates/okf-source-document.md](../../../../patterns/knowledge-store-templates/okf-source-document.md).

Fill in:
- `title:` — document filename or stated title
- `description:` — one-sentence summary from Step 1
- `source:` — original file path or URI (e.g. `_intake/inbox/filename.md` or a web URL)
- `source_hash:` — SHA-256 of the source file (`sha256sum` / `Get-FileHash`)
- `created_at:` — today's date
- `confidence:` — from Step 1
- `tags:` — inferred topic tags
- `tracks:` — from Step 1

Filename convention: `YYYY-MM-DD-<slug>.md` where slug is a 3–5 word kebab-case summary.

Move the source file from `_intake/inbox/` to `_intake/originals/` (gitignored, kept for traceability).

---

## Step 3 — Log the routing decision

Append to `_intake/log.md`:

```markdown
## YYYY-MM-DD

- [route] `<processed-filename>` → tracks: [okf, canon] | confidence: observed | <one-line reason>
```

---

## Step 4 — OKF track (if `okf` in tracks)

### 4a — Extract knowledge object drafts

Read the source document from `_intake/originals/` (or the processed record). Using the extraction prompt at [prompts/extract-okf.md](prompts/extract-okf.md), extract candidate knowledge objects. Each object:

- has a clear, discrete idea (one concept per file)
- carries `type:` — choose from: `insight`, `finding`, `concept`, `question` (or descriptive alternatives)
- carries `confidence:` — inherited from the source unless the specific claim warrants a lower rating
- carries `source:` — bundle-relative path to the processed source-document record
- carries `description:` — one sentence

Present the full list of drafts to the user for review. Number each chunk. State what was skipped and why (too vague, duplicate of existing object, etc.).

### 4b — User review gate

Wait for the user to approve, reject, or revise each chunk. Do not write anything to `knowledge/` until you have explicit approval.

### 4c — Write approved objects

For each approved chunk, write to `knowledge/<slug>.md` using the template at [patterns/knowledge-store-templates/okf-knowledge-object.md](../../../../patterns/knowledge-store-templates/okf-knowledge-object.md).

Filename: kebab-case slug from the `title:`. Check for existing files with the same concept first — update rather than duplicate. Before admitting, classify the mapping per Gate 2 (Confirms / Extends / Proposes / Conflicts) and note it in the admit log entry.

After all approved objects are written, run `python3 tools/knowledge_store_lint.py .` from the repo root. Fix every **error** before proceeding. Surface **warnings** (KS-008 duplicate title, KS-010 assumed-confidence + high dependents) to the user for explicit acknowledgment.

### 4d — Regenerate knowledge/index.md

After all approved objects are written, update `knowledge/index.md` to include new or updated rows. Do not remove rows for existing objects not touched in this ingestion.

### 4e — Log admit decisions

Append to `_intake/log.md` for each admitted object:

```markdown
- [admit] `<knowledge-object-filename>` ← `<source-document-filename>` | approved | <one-line note>
```

For each rejected chunk:

```markdown
- [admit] rejected: "<title>" | reason: <one-line reason>
```

---

## Step 5 — Canon track (if `canon` in tracks)

### 5a — Extract Transitrix primitives

Using the extraction prompt at [prompts/extract-canon.md](prompts/extract-canon.md), identify candidate Transitrix elements (DRIVER, GOAL, CHANGE, CAPABILITY, ACTOR, ROLE, PROCESS, APPLICATION, PRODUCT, etc.) and typed relations. Be conservative on relations — only propose a relation when the source explicitly states the connection.

For each candidate, draft a YAML block in the format expected by `canon/elements/<type>/`:

```yaml
type: DRIVER
id: DRIV-NNN        # assign the next available integer
name: ""
description: ""
derived_from: [<processed-source-document-path>]
admitted_to: pending
extraction_confidence: high | medium | low
```

### 5b — Open PR

Create a branch `knowledge-store/ingest-<YYYY-MM-DD>-<slug>` and commit the candidate YAML files. Open a PR titled `[Knowledge Store] Ingest: <source-document-title>`.

PR body must include:
- Link to the processed source-document record
- Table of proposed elements with type, name, and extraction_confidence
- Note on any relations proposed
- Instruction: "Review, revise IDs to avoid conflicts, and merge when satisfied."

### 5c — Log assertion outcome (after PR is merged or closed)

Once the user reports the PR outcome, append to `_intake/log.md`:

```markdown
- [assert] PR #<number> merged | admitted: [DRIV-NNN, GOAL-NNN, ...] | source: <processed-filename>
```

Or for rejected:

```markdown
- [assert] PR #<number> closed without merge | reason: <one-line>
```

---

## What this skill does NOT do

- Does not merge PRs. The canon gate is always a human.
- Does not write to `knowledge/` before user review of chunks.
- Does not assign `extraction_confidence: high` to relations — relations are flagged `medium` or lower unless the source text is unambiguous.
- Does not remove existing knowledge objects. Only add or update.
- Does not process multiple documents in the same run unless explicitly asked — one source per run keeps the log clean.
