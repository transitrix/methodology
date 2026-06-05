---
name: Transitrix Ingest
description: Turn raw organisational material (interviews, policies, org charts, spreadsheets, notes) into Transitrix field artefacts and typed canon candidates at scale, with source-quality scoring and a human review queue. Operates the field→canon derivation pipeline — convert a document, emit a field artefact with provenance and a proposed source_quality, extract typed elements and conservative relations that each cite their field source via derived_from, validate them against the canonical schemas and the adopter's coverage profile, and produce a review queue a human gates before anything is admitted to canon. Never writes canon directly.
when_to_use: User says "ingest these documents", "extract a model from this interview / policy / spreadsheet", "fill the field zone from raw material", "turn these notes into canon candidates", "set up the intake pipeline", or drops raw files into an adopter repo's `_intake/inbox/` and wants them processed into field artefacts + reviewable canon candidates.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix Ingest Skill

The **front door** to a Transitrix repository: it turns raw material into `field`-zone artefacts and typed `canon` *candidates*, at scale, and routes everything through a human review gate. It is the operational counterpart to the per-layer extraction prompts — the part that converts documents, scores source trust, runs the validators, and stages a review queue.

> **Status — skeleton (v0).** This skill ships the agent-facing protocol, the artefact/candidate/review-queue schemas, and the `_intake/` convention. The deterministic logic lives in a separate CLI (`@transitrix/ingest-cli`, see [§ The CLI](#the-cli)) that lands in a follow-up increment. Until that CLI is installed, the pipeline steps below describe the contract rather than an executable path — run the **CLI-presence pre-check** (Step 0) first and stop if it is absent.

The methodology is canon at `github.com/transitrix/methodology`; this skill is the agent-facing protocol for operating the field→canon pipeline against it. It runs **agent-neutrally** under Claude and GitHub Copilot — all heavy logic is in the CLI, and this `SKILL.md` only sequences it.

---

## The one rule that governs everything

**Propose, never write canon.** This skill emits `field` artefacts and canon *candidates* and runs them through the existing validators. It MUST NOT write into `canon/`. Admission to canon stays a deliberate, auditable human gate (`admitted_by`). A hallucinated element or relation reaching canon unreviewed is the worst-case failure, and the whole design exists to prevent it. Every step below is built around keeping that gate intact.

---

## Step 0 — CLI-presence pre-check

The deterministic work (document conversion, coverage-profile read, validator pass, artefact + candidate emission, `_intake/` moves) is done by the CLI, never reimplemented in the agent. Confirm it is available:

```
npx @transitrix/ingest-cli --version
```

- **Present** → proceed.
- **Absent** → this skill is not yet operational in this install (the CLI ships in a later increment). Stop and tell the user; do not hand-roll the pipeline, because hand-rolled extraction has no deterministic validator gate and risks the one rule above.

Also confirm you are operating inside a Transitrix adopter repository (a `transitrix.yaml` manifest at the repo root; see [MANIFEST](https://raw.githubusercontent.com/transitrix/methodology/main/notations/MANIFEST.md)). If there is no repo yet, the user wants `/transitrix:onboard` first.

---

## Step 1 — Scaffold the intake folder

`_intake/` is an **operational** folder at the organisation root — *not a zone*. Zones (`canon/`, `field/`, `codex/`) stay parallel; `_intake/` sits beside them as the pipeline's workspace:

```
<org>/
  _intake/              # operational intake pipeline — not a zone
    inbox/              # raw dropped files, untouched
    processing/         # currently being extracted (artefacts + candidates in flight)
    processed/          # source files whose ingest is complete (retained for traceability)
  canon/  field/  codex/
```

```
npx @transitrix/ingest-cli scaffold-intake <org-root>
```

Idempotent — it never overwrites existing intake content. A source file flows `inbox/ → processing/ → processed/`. In v0 the `_intake/` convention is **skill-local**: it is documented here and in [`templates/_intake.README.md`](templates/_intake.README.md), not yet reserved in the methodology MANIFEST/CONTRACT. (Promotion to a reserved org-structure convention is a separate proposal once the skill stabilises.)

---

## Step 2 — Convert the source to Markdown

Office documents are converted to Markdown with **MS Markitdown** before extraction (per project convention), unless illustrations must be preserved. The CLI shells out to Markitdown; `.md` / `.txt` inputs pass through unchanged.

```
npx @transitrix/ingest-cli convert <_intake/inbox/file>   # → _intake/processing/<file>.md
```

If Markitdown is not installed the CLI exits with an actionable message naming the install step. Conversion is the only point of contact with Markitdown — the rest of the pipeline is pure Node and runs identically under either agent.

---

## Step 3 — Emit the field artefact (with proposed source_quality)

Each converted document becomes one `field` artefact carrying a complete **admission record** — provenance (who / when / in what setting) and a **proposed** `source_quality`. The field artefact is what lives in `field/`; the original raw bytes stay in `_intake/processed/` so the artefact is traceable to its source.

```
npx @transitrix/ingest-cli field-artefact <processing/file.md> \
    --type INTERVIEW|SURVEY|OBSERVATION|DRAFT --role "<role>" --date YYYY-MM-DD
```

The CLI fills the admission record (`zone: field`, `gate_checks.provenance`) and **proposes** a `source_quality` from the document type. The schema is [`schemas/field-artefact.schema.json`](schemas/field-artefact.schema.json); the canonical contract is [CONTRACT §6](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md) (admission record) and [§11.2](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md) (the source-trust scale).

**Proposed `source_quality` by document character** — closed set, the human confirms at admission:

| Document character | Proposed `source_quality` | Weight |
|---|---|---|
| Signed policy, system of record, the accountable owner stating it directly | `authoritative` | 1.0 |
| The same fact confirmed across more than one independent field source | `corroborated` | 0.8 |
| One uncorroborated informant or observation | `single_source` | 0.5 |
| Draft, assumption, inference, hearsay | `unverified` | 0.25 |

The skill **proposes**; a human **confirms**. Never silently bake a higher trust than the source warrants.

---

## Step 4 — Extract typed candidates (entity-strong, relation-conservative)

The agent runs the per-layer extraction prompts in [`prompts/`](prompts/) over the field artefact; the CLI receives the result and emits typed canon **candidates**. Each candidate:

- uses a canonical ID (`<TYPE>-[<middle>-]<INTEGER>`, [IDS](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md) §1);
- carries `derived_from: [<FIELD-ARTEFACT-ID>]` citing its field source;
- carries `admitted_to: pending` — the human gate completes admission;
- carries an **`extraction_confidence`** flag (`high | medium | low`) — see the two-axes rule below.

```
npx @transitrix/ingest-cli emit-candidates <field/artefact.yaml>   # → _intake/processing/candidates/
```

Schema: [`schemas/candidate.schema.json`](schemas/candidate.schema.json).

**Relations are the risky part.** Extracting entities is tractable; extracting *correctly typed* relations of a closed kind is not. v0 is **entity-strong and relation-conservative**: a relation (closed REL kind) is only emitted as a candidate above a high confidence threshold. Everything below threshold goes to the review queue as a *suggestion*, not a candidate. Entities flow normally.

### Two axes of trust — never merge them

- **`source_quality`** — trust in the *source* (Step 3). A closed ordinal label on the field artefact's admission record. Fixed once a human confirms it.
- **`extraction_confidence`** — "did the model read the document correctly". A separate **review flag** on the candidate. It surfaces in the review queue and is **never** folded into `source_quality` and **never** persisted into canon ([CONTRACT §11.8](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)).

These are different questions with different fixes (get a better source vs. re-read the document). The schemas keep them in separate fields; collapsing them is a defect.

---

## Step 5 — Validate (coverage-profile aware)

Every candidate is run through the canonical validators — ID grammar, TYPE registry, closed REL kinds, lifecycle fields — and the adopter's **coverage profile**.

```
npx @transitrix/ingest-cli validate <processing/candidates/>
```

The CLI reads the repo's `coverage_profile` ([COVERAGE_PROFILES](https://raw.githubusercontent.com/transitrix/methodology/main/notations/COVERAGE_PROFILES.md)) and **only** proposes TYPEs / REL kinds the profile allows. Out-of-profile or invalid candidates are **flagged with an actionable reason** — not silently emitted into canon, and not silently dropped. A flagged candidate is a review-queue item, not a rejection.

---

## Step 6 — Produce the review queue

```
npx @transitrix/ingest-cli review-queue <processing/candidates/>   # → review-queue.yaml
```

The queue is the human gate. It lists every field artefact (with its proposed `source_quality`), every candidate element and relation (with `derived_from`, `extraction_confidence`, and any validation/coverage flags), and the relation *suggestions* that fell below threshold. Schema: [`schemas/review-queue.schema.json`](schemas/review-queue.schema.json).

**Nothing lands in `canon/` from this skill.** A human reviews the queue, confirms or revises each proposed `source_quality`, and runs the canon admission gate (`uniqueness`, `consistency`, `completeness` — [CONTRACT §6](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)) to admit candidates. When ingest is complete for a source, its raw file moves to `_intake/processed/`.

---

## The CLI

All deterministic behaviour lives in **`@transitrix/ingest-cli`** — document conversion, coverage-profile read, validator pass, field-artefact + candidate emission, and the `_intake/` moves. This keeps the deterministic guarantees independent of which agent drives the skill (the same principle as the methodology's CI validators): neither Claude nor Copilot reimplements the logic, and both get identical results.

The CLI is resolved as a **published package** (installed/invoked via `npx`), not vendored per skill and not referenced by a sibling path — a sibling-path reference would dangle when only this skill directory ships into a Copilot `.github/skills/` install. Its subcommands are the contract above: `scaffold-intake`, `convert`, `field-artefact`, `emit-candidates`, `validate`, `review-queue`.

---

## Portability — Claude + GitHub Copilot

This skill is one shared `SKILL.md` in the converged **Agent Skills** format. It is auto-loaded by Claude (as `/transitrix:ingest`) and picked up by Copilot from `.github/skills/ingest/` or `~/.copilot/skills/ingest/`. Discipline that keeps it portable:

- All heavy logic is in the CLI, not in agent-specific tool calls.
- This `SKILL.md` is **agent-neutral** — it references the CLI and the procedure, with no Claude-only or Copilot-only assumptions.
- The skill directory is self-contained: prompts and schemas live in the bundle, never referenced from a sibling skill.

---

## What this skill does NOT do

- It does **not** write to `canon/`. Ever. It emits candidates and a review queue; a human admits.
- It does **not** ship the methodology canon. It reads the published specs (via `WebFetch` when deeper than this protocol).
- It does **not** fold `extraction_confidence` into `source_quality`, or persist either extraction-confidence value into canon.
- It does **not** emit TYPEs or REL kinds outside the adopter's coverage profile — out-of-profile material is flagged for review.
- It does **not** auto-admit, auto-reaffirm, or move data between zones. `derived_from` is a citation, not a migration.
