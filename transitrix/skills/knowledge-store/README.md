# Transitrix Knowledge Store Skill

The **OKF ingestion skill** for a Transitrix knowledge store. Processes raw source material through the OKF single-repo MVP pattern: assess → archive → route → extract → human review → write. All steps are performed by the agent with standard file tools — no external CLI required.

This directory is the **`knowledge-store` skill** within the `transitrix` plugin. Invoked as `/transitrix:knowledge-store`.

---

## The one rule

**Propose, never write canon unilaterally.** The agent presents knowledge object chunks to the user for approval before writing anything to `knowledge/`. For Transitrix primitives, the agent opens a PR to `canon/` — never merges it. The human gate is the only admission authority.

---

## What it ships

- [`SKILL.md`](SKILL.md) — the agent-facing protocol: five steps from document assessment through knowledge writing and canon PR.
- [`prompts/extract-okf.md`](prompts/extract-okf.md) — extraction prompt for knowledge objects (OKF track).
- [`prompts/extract-canon.md`](prompts/extract-canon.md) — extraction prompt for Transitrix primitives (Canon track).

The skill reads its OKF templates from the methodology patterns directory:
- [`patterns/knowledge-store-templates/okf-source-document.md`](../../../../patterns/knowledge-store-templates/okf-source-document.md)
- [`patterns/knowledge-store-templates/okf-knowledge-object.md`](../../../../patterns/knowledge-store-templates/okf-knowledge-object.md)

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
Agent: write to knowledge/ → update index.md   User:  review and merge PR
Agent: log [admit]                              Agent: log [assert]
```

---

## What this skill does NOT do

- Does not write to `knowledge/` before user review.
- Does not merge PRs to `canon/`.
- Does not process multiple documents per run (one source = one clean log entry).
- Does not assign `extraction_confidence: high` to relations.
- Does not remove existing knowledge objects.
