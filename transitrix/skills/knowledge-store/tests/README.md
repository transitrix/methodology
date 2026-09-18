# Knowledge Store skill tests

Deterministic integrity guard for the Knowledge Store quality gates reference
implementation (`patterns/knowledge-store.md` §Quality gates).

| Script | Purpose | When |
|---|---|---|
| `test_knowledge_store_integrity.py` | Runs `tools/knowledge_store_lint.py` on fixtures; asserts KS-001..020 behaviour and 6.0 migration compatibility | Every PR touching the skill, linter, or pattern doc; CI job `knowledge-store-lint-test` |

Fixtures live under `fixtures/valid/` — a minimal OKF single-repo MVP bundle with one source-document and two linked knowledge objects.

Run locally with Node.js ≥20 and Python 3:

```bash
pip install pyyaml
python transitrix/skills/knowledge-store/tests/test_knowledge_store_integrity.py
```
