# `transitrix/skills/ingest/tests/`

Two-mode harness for the ingest skill + `@transitrix/ingest-cli`, mirroring the onboarding skill's split.

| Script | What it does | API key | Where |
|---|---|---|---|
| `test_ingest_integrity.py` | **Deterministic guard.** Part A checks the bundle is intact (SKILL.md frontmatter, the three JSON schemas parse, the three layer prompts + READMEs, the `_intake` template). Part B drives the **real CLI** end-to-end on a fixture (`scaffold-intake → convert → field-artefact → emit-candidates → validate → review-queue`) and asserts the outputs — conformant field artefact with a proposed `source_quality`, candidate files, relation-conservatism (the medium relation held back), a review queue with the gate closed, the two-axes rule (a candidate leaking `source_quality` is flagged), and **the one rule: `canon/` is never written**. | none | **every PR** touching `transitrix/skills/ingest/**` or `packages/ingest-cli/**`, and the weekly cron |
| `drive_ingest_e2e.py` | **True LLM drive.** An agent reads `SKILL.md` and runs the pipeline over the fixture itself. | required | weekly cron / manual dispatch only |

```
python transitrix/skills/ingest/tests/test_ingest_integrity.py          # always
ANTHROPIC_API_KEY=… python transitrix/skills/ingest/tests/drive_ingest_e2e.py   # full LLM drive
```

The integrity test needs **PyYAML** (to parse the emitted YAML) and **Node** (the CLI is Node); it skips Part B with a clear message if `node` is absent.

## On the e2e drive and CLI publication

`SKILL.md` shells out to `@transitrix/ingest-cli`. Until that package is published to npm, `drive_ingest_e2e.py` makes the local package resolvable with `npm install -g` before driving the agent; if it cannot, it **skips green** with a message. The deterministic integrity test does not depend on publication — it invokes the CLI by path, so it is the real PR-CI coverage today.

## Fixtures

- `fixtures/raw/INTERVIEW-sample.md` — a generic fake interview (a role, not a named person), `.md` so the integrity test needs no Markitdown.
- `fixtures/extraction-result.json` — a canned stand-in for the agent's extraction result, so `emit-candidates` has an input without an LLM. It mixes a high-confidence relation (→ candidate) and a medium one (→ held-back suggestion).
