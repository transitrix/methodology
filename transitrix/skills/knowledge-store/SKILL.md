---
name: Transitrix Knowledge Store
description: Ingest raw source material into the OKF single-repo MVP knowledge store — assess, archive, route to the OKF track (extract drafts → verify → human review → promote to knowledge/) and/or the Canon track (extract Transitrix primitives → PR to canon/), and log every decision.
when_to_use: User says "ingest this document", "add this to the knowledge store", "extract knowledge objects from this", "route this to canon", "locate the original for this knowledge item", "add this web page or corporate document", or drops a file into `_intake/inbox/` and wants it processed.
min_version: "6.0.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Transitrix Knowledge Store Skill

Processes raw source material through the OKF single-repo MVP knowledge store. Extraction and curation use the agent's Read/Write/Edit tools; setup requires the shared intake-profile preflight from `@transitrix/ingest-cli`. A human reviews and approves before anything lands in `knowledge/` or `canon/`.

---

## The one rule

**Propose, never promote unilaterally.** For the OKF track, the agent writes drafts to `_intake/drafts/` only — never directly to `knowledge/`. For the Canon track, the agent opens a PR to `canon/` — it never merges it. The human gate is the only admission authority.

**Run the quality gates before and after promotion.** After writing drafts (Step 4a) and again after promoting approved objects to `knowledge/` (Step 4d), run the knowledge-store linter and fix every error:

```bash
python3 tools/knowledge_store_lint.py .
```

The linter enforces Gates 1–6 from [patterns/knowledge-store.md §Quality gates](../../../patterns/knowledge-store.md). Errors block promotion; warnings require explicit human acknowledgment in `_intake/log.md`. See [tests/README.md](tests/README.md) for the KS-001..017 code reference.

---

## Locate an original

Start with the knowledge object's `source:` citation or the source card the user names. Follow a legacy redirect if present, then read the card's `source:` path or URI. New uploaded originals are beside their cards in `sources/`. A legacy path under `_intake/originals/` refers to the workspace that retained it. Report the location and whether you can access it from the current workspace. A source-location request is read-only and can skip intake setup.

## Step 0 — Check the MVP structure

Before any write, select the **knowledge-store** deployment profile using the
[compatibility contract](../../../patterns/knowledge-store.md#deployment-profiles-and-intake-compatibility).
Run the shared CLI preflight (see that contract for local installation):

```bash
transitrix-intake-profile check <repo-root> --profile knowledge-store
transitrix-intake-profile select <repo-root> --profile knowledge-store
```

For a new standalone repository, run these commands after Git initialisation at the chosen root. Stop if unavailable or refused. Do not scaffold, move sources or change ignore
rules to bypass a conflict. Ordinary ingest/reg-intel belongs in a separate
workspace. Commit `_intake/profile.json` with setup. On later runs repeat the
read-only check before any write, including when the marker already exists.

Verify the repo has the expected layout:

```
_intake/
  inbox/        ← source files waiting for processing
  drafts/       ← proposer output (Gate 6 — not cited; not promoted)
  log.md        ← all events: [route] / [admit] / [ambig] / [conflicts] / [assert]

sources/        ← committed cards and their uploaded originals

knowledge/
  index.md      ← bundle index (auto-maintained)
  <concept>.md  ← individual OKF knowledge objects
```

Scaffold any missing `_intake/`, `sources/`, and `knowledge/` directories. Create `_intake/drafts/` if absent. Commit a `sources/.gitkeep` while the directory is empty so a fresh clone has the location ready. Copy the initialisation content from [patterns/knowledge-store.md §Templates](../../../patterns/knowledge-store.md). Keep `_intake/inbox/*` and any legacy `_intake/originals/*` ignored (drafts MAY be committed for audit or gitignored for ephemeral runs). Keep `sources/` and any existing legacy cards or redirects visible to Git. Merge the [upload attributes](../../../patterns/knowledge-store.md#preserve-uploaded-originals) into `.gitattributes` without replacing unrelated rules. Check that `git check-attr text -- sources/example.original.md` reports `unset` before accepting uploads. See [moving existing cards](../../../patterns/knowledge-store.md#move-existing-source-cards). Re-run the profile check after setup and before committing. Verify that Git can track each new card and original path before writing it.

---

## Step 1 — Assess the document

Read the uploaded file from `_intake/inbox/` or use the supplied web or corporate-storage reference. Determine:

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

## Step 2 — Record the source in sources/

Record the source file reference in `sources/` as an OKF source-document record using the template at [patterns/knowledge-store-templates/okf-source-document.md](../../../patterns/knowledge-store-templates/okf-source-document.md).

Fill in:
- `title:` — document filename or stated title
- `description:` — one-sentence summary from Step 1
- `source:` — bundle-root path to an uploaded original, such as `/sources/interview.original.pdf`, or the URI of an external source. Use the specific revision when available
- `source_hash:` — SHA-256 of the exact uploaded bytes (`sha256sum` / `Get-FileHash`). For an external reference, include a hash when the exact content was available to hash
- `created_at:` — today's date
- `confidence:` — from Step 1
- `tags:` — inferred topic tags
- `tracks:` — from Step 1

Filename convention: `YYYY-MM-DD-<slug>.md` where slug is a 3–5 word kebab-case summary.

For a reissued source, use a fresh card even when the date or filename matches an earlier revision. Use a fresh original-file path for uploads and a revision-specific URI for external sources when available. Preserve the earlier record, original, and hash.

For an upload, verify that the file is intended for the repository's readers. Keep its extension and copy it byte-for-byte beside its card using `<card-stem>.original.<extension>` or `<card-stem>.original` when it has no extension. Check both paths before writing and choose a fresh stem for a new revision. If a retry finds a partial pair, verify the existing bytes and citation before completing it. Stop on a conflicting path. Commit the original and card together and keep the staging copy until the pair has been verified.

For a web page or corporate-storage file, write the card with the URI and keep the original at its existing location. Use the card's `source:` reference when locating the document.

---

## Step 3 — Log the routing decision

Append to `_intake/log.md`:

```markdown
## YYYY-MM-DD

- [route] `<source-card-path>` → tracks: [okf, canon] | confidence: observed | <one-line reason>
```

---

## Step 4 — OKF track (if `okf` in tracks)

### 4a — Propose drafts (Gate 6)

Read the source document at the location recorded in the card. Using the extraction prompt at [prompts/extract-okf.md](prompts/extract-okf.md), extract candidate knowledge objects and **write each to `_intake/drafts/<slug>.md`** using the template at [patterns/knowledge-store-templates/okf-knowledge-object-draft.md](../../../patterns/knowledge-store-templates/okf-knowledge-object-draft.md).

Each draft:
- has a clear, discrete idea (one concept per file)
- carries `type:`, `confidence:`, `source:`, `description:` as for promoted objects
- carries `review_status:` — `ready` (grounded, linter-clean candidate), `ambiguous` (needs human judgement; set non-empty `ambiguity_note:`), or `blocked` (too vague to review; skip by default)
- carries `mapping:` / `conflicts_with:` when relating to existing knowledge (Gate 2)

For re-curation, choose a fresh filename and set `supersedes` to the current admitted object. Leave that object unchanged during drafting; a missing-backlink `KS-019` warning is expected until admission (Gate 2.1).

Do **not** write to `knowledge/` at this step.

### 4b — Verify drafts

Follow [prompts/verify-drafts.md](prompts/verify-drafts.md). Run `python3 tools/knowledge_store_lint.py .` and fix every **error** on draft paths before presenting the batch. Then present drafts grouped by `review_status` (ready / ambiguous / blocked). State what was skipped and why.

### 4c — User review gate

Wait for the user to approve, reject, or revise each draft. Do not promote anything to `knowledge/` until you have explicit approval. For ambiguous drafts, log a hold (Step 4f) until resolved.

### 4d — Dispose approved drafts

For each approved draft, copy to `knowledge/<slug>.md` using [patterns/knowledge-store-templates/okf-knowledge-object.md](../../../patterns/knowledge-store-templates/okf-knowledge-object.md). **Remove** `review_status` and `ambiguity_note` from frontmatter. Delete the corresponding file under `_intake/drafts/`.

Never overwrite an existing knowledge-object path. For approved re-curation, create the successor and add `superseded_by` to its predecessor in the same change, updating only that predecessor’s lifecycle `timestamp` alongside the pointer. Preserve its body and all assertion metadata, including any earlier `supersedes`. Record the source revision and both object paths in the `[admit]` log entry; keep both index rows.

Run `python3 tools/knowledge_store_lint.py .` again. Fix every **error** before proceeding. Surface **warnings** (KS-008, KS-010, KS-013) for explicit acknowledgment.

### 4e — Regenerate knowledge/index.md

After all approved objects are promoted, update `knowledge/index.md` to include new or updated rows. Do not remove rows for existing objects not touched in this ingestion.

### 4f — Log admit decisions

Append to `_intake/log.md` for each promoted object:

```markdown
- [admit] `<knowledge-object-filename>` ← `<source-document-filename>` | approved | <one-line note>
```

For each rejected draft:

```markdown
- [admit] rejected: "<title>" | reason: <one-line reason>
```

For each ambiguous draft held for review:

```markdown
- [ambig] `<draft-filename>` | <ambiguity_note one-liner> | held for review
```

For each object held because it **conflicts** with existing knowledge (not admitted until reviewed):

```markdown
- [conflicts] `<knowledge-object-filename>` vs `<conflicts_with-target>` | held for review | <one-line note>
```

---

## Step 5 — Canon track (if `canon` in tracks)

### 5a — Extract Transitrix primitives

Using the extraction prompt at [prompts/extract-canon.md](prompts/extract-canon.md), identify candidate Transitrix elements (DRIVER, GOAL, CHANGE, CAPABILITY, ACTOR, ROLE, PROCESS, APPLICATION, PRODUCT, etc.) and typed relations. Be conservative on relations — only propose a relation when the source explicitly states the connection.

Draft candidate YAML blocks in a YAML review file under `_intake/drafts/` (for example `canon-candidates.yaml`), outside `canon/`. These are extraction proposals, not valid canonical elements yet:

```yaml
type: DRIVER
id: <TYPE>-TBD     # review placeholder, never an admitted ID
name: ""
description: ""
derived_from: [<source-card-path>]
admitted_to: pending
extraction_confidence: high | medium | low
```

### 5b — Review IDs, validate, then open PR

1. Present the draft candidates to the human reviewer. Keep `admitted_to: pending`;
   no admission record is invented. Resolve duplicate candidates against existing
   canon before reserving IDs.
2. During review, replace every `*-TBD` placeholder with a unique ID under
   [IDS_AND_REFERENCES §§1–2](../../../notations/IDS_AND_REFERENCES.md), including
   the CAPABILITY V/H exception. Resolve every relation endpoint to a reviewed ID.
   A placeholder is never a canonical ID, filename or admitted reference.
3. Prepare reviewed candidates at the TYPE's canonical placement from
   [ELEMENT_PRIMITIVES §4](../../../notations/ELEMENT_PRIMITIVES.md), not a generic
   per-type path. Apply the required envelope and TYPE fields; retain provenance
   and pending status until human admission under [CONTRACT §6](../../../notations/CONTRACT.md).
4. Run the adopter's canonical validators for ID uniqueness, reference consistency,
   required fields and placement. Unresolved placeholders or failed checks block
   the canon PR; keep those proposals in the draft YAML review file. Review flags
   such as `extraction_confidence` never become admitted canon fields.

Create a branch `knowledge-store/ingest-<YYYY-MM-DD>-<slug>` and commit only the reviewed, validated candidate files for human admission. Open a PR titled `[Knowledge Store] Ingest: <source-document-title>`.

PR body must include:
- Link to the source card
- Table of proposed elements with type, name, and extraction_confidence
- Note on any relations proposed
- Instruction: "Review the assigned IDs, resolved references, provenance and validation results; complete admission only when satisfied. Never merge unresolved placeholders or pending proposals as admitted canon."

### 5c — Log assertion outcome (after PR is merged or closed)

Once the user reports the PR outcome, append to `_intake/log.md`:

```markdown
- [assert] PR #<number> merged | admitted: [<DRIVER-NNN>, <GOAL-NNN>, ...] | source: <source-card-path>
```

Or for rejected:

```markdown
- [assert] PR #<number> closed without merge | reason: <one-line>
```

---

## What this skill does NOT do

- Does not merge PRs. The canon gate is always a human.
- Does not write to `knowledge/` before user review of drafts (Gate 6 — drafts land in `_intake/drafts/` only).
- Does not assign `extraction_confidence: high` to relations — relations are always flagged `medium` or lower and require human validation.
- Does not remove or rewrite existing knowledge objects. Re-curation adds a successor and lifecycle metadata under Gate 2.1.
- Does not process multiple documents in the same run unless explicitly asked — one source per run keeps the log clean.
