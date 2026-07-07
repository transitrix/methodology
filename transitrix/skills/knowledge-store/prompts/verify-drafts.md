# Verify knowledge object drafts

After writing candidate objects to `_intake/drafts/`, run the deterministic verifier before presenting them to the curator:

```bash
python3 tools/knowledge_store_lint.py .
```

## Fix before review

- **Errors (any KS-00x error on a draft path)** — fix the draft frontmatter or body. Do not ask the curator to review structurally invalid drafts.
- **`review_status: blocked`** — the proposer could not ground the claim; skip or revise before review unless the curator explicitly asks to see it.
- **`review_status: ambiguous`** — ensure `ambiguity_note:` explains what needs human judgement.

## Present to the curator

Group drafts by disposition:

1. **Ready** — `review_status: ready`, linter passes with no errors
2. **Ambiguous** — `review_status: ambiguous`; quote `ambiguity_note:` for each
3. **Blocked** — list with reason; default is reject unless curator overrides

Never copy drafts to `knowledge/` until the curator approves. After approval, remove `review_status` and `ambiguity_note` from frontmatter before writing to `knowledge/`.
