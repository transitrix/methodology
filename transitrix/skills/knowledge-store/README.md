# Transitrix Knowledge Store Skill

The **OKF ingestion skill** for a Transitrix knowledge store. Processes raw source material through the OKF single-repo MVP pattern: assess → archive → route → extract → human review → write. The agent extracts and curates with standard file tools. Setup first runs the shared intake-profile preflight from `@transitrix/ingest-cli`.

This directory is the **`knowledge-store` skill** within the `transitrix` plugin. Invoked as `/transitrix:knowledge-store`.

## Intake profile selection

Choose `ingest` for the ordinary ingest/reg-intel workflow (private processed raw
files), or `knowledge-store` for OKF curation (committed source-document records,
private originals). They require separate workspaces. Setup and subsequent intake
runs must pass the shared CLI preflight; incompatible or ambiguous existing
content is refused without migration. See the [deployment compatibility contract](../../../patterns/knowledge-store.md#deployment-profiles-and-intake-compatibility)
for selection, installation and retention rules.

---

## The one rule

**Propose, never write canon unilaterally.** The agent presents knowledge object chunks to the user for approval before writing anything to `knowledge/`. For Transitrix primitives, the agent opens a PR to `canon/` — never merges it. The human gate is the only admission authority.

---

Re-curating a reissued source creates a new source record and a new knowledge object. After review, the new object and its predecessor receive reciprocal supersession pointers; the predecessor’s body and assertion metadata remain intact. See [Gate 2.1](../../../patterns/knowledge-store.md#gate-21--supersession-not-rewriting).

## What it ships

- [`SKILL.md`](SKILL.md) — the agent-facing protocol: five steps from document assessment through knowledge writing and canon PR.
- [`prompts/extract-okf.md`](prompts/extract-okf.md) — extraction prompt for knowledge objects (OKF track).
- [`prompts/extract-canon.md`](prompts/extract-canon.md) — extraction prompt for Transitrix primitives (Canon track).
- [`tests/test_knowledge_store_integrity.py`](tests/test_knowledge_store_integrity.py) — deterministic CI guard for `tools/knowledge_store_lint.py` (KS-001..017).

The skill reads its OKF templates from the methodology patterns directory:
- [`patterns/knowledge-store-templates/okf-source-document.md`](../../../patterns/knowledge-store-templates/okf-source-document.md)
- [`patterns/knowledge-store-templates/okf-knowledge-object.md`](../../../patterns/knowledge-store-templates/okf-knowledge-object.md)

---

## Repo layout expected by the skill

```
<repo-root>/
  _intake/
    inbox/         ← drop source files here
    originals/     ← gitignored; raw files move here after archival
    processed/     ← OKF source-document records (committed)
    log.md         ← [route] / [admit] / [assert] events
  knowledge/
    index.md       ← bundle index
    <concept>.md   ← individual OKF knowledge objects
  canon/           ← Transitrix primitives (unchanged by this skill except via PR)
```

---

## Ingestion flow summary

```
User drops file in _intake/inbox/
        ↓
Agent: assess → archive to processed/ → log [route]
        ↓
       (okf track?)──────────────────────────────────(canon track?)
        ↓                                                    ↓
Agent: extract chunks                           Agent: extract primitives
User:  review and approve                       Agent: open PR to canon/
Agent: write to knowledge/ → run knowledge_store_lint.py → update index.md   User:  review and merge PR
Agent: log [admit]                              Agent: log [assert]
```

---

## What this skill does NOT do

- Does not write to `knowledge/` before user review.
- Does not merge PRs to `canon/`.
- Does not process multiple documents per run (one source = one clean log entry).
- Does not assign `extraction_confidence: high` to relations.
- Does not remove existing knowledge objects.
