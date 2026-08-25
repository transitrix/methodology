---
title: How a model-backed document is versioned
status: active
last_reviewed: 2026-08-25
audience: public
license: MIT
tags: [transitrix, guide, recipe, document, versioning]
---

# How a model-backed document is versioned

> How to keep versions of a recipe, of an issued document, and of a revision table inside that document. This is not `methodology_version`. You do not write the document — you write its recipe once, and the document comes from the model every time.

A **recipe** is the `.ttrs` source. A **model-backed document** is what a reader receives when that recipe is rendered against canon. A recipe is not a [template](../method/00-glossary.md) — that word is the copy-and-fill starter for a new element file.

## Four things people call "the version"

| What they mean | Where it actually lives | Automatic in the PDF? |
| --- | --- | --- |
| Which methodology release the repo conforms to | `methodology_version` in `transitrix.yaml` — one pin for the whole repository ([`CONTRACT.md`](../notations/CONTRACT.md) §10) | No. A different question. |
| Which recipe produced this render | `recipe_id` / `recipe_version` in the recipe header, copied into the run record | No. In the header and the run record, not copied into the body. |
| What the recipe and the model said at a named moment | Git history. A tag is a baseline ([`patterns/baseline-audit-trail.md`](../patterns/baseline-audit-trail.md)) | No. Git does not transclude. |
| The "Document history" / revision table a reader of the PDF expects | Fixed prose in the recipe, typed by hand | **No. Fill it in prose.** |

The directive language ([`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md)) has no construct that walks git, lists tags, or fills a revision table. `each` and `trace` select canon elements; they do not read history. An instruction slot is filled from declared model inputs, not from `git log`.

## Recipe versions

Keep **one recipe file**. Do not version by copying `product.srs.ttrs` to `product.srs.v2.ttrs`. Commits are the versions of the file.

```yaml
---
document: Software Requirements Specification
kind: srs
recipe_id: product.srs
recipe_version: "1.0"
canon: canon
---
```

- **`recipe_id`** names this recipe. Leave it stable. A different id is a different recipe, not a new edition of the same one.
- **`recipe_version`** is a label **you** bump. It is named in the [run record](../packages/document-renderer/README.md#the-run-record). It is not derived from git, and it does not bump itself on every commit.

Bump `recipe_version` when the *shape* of the recipe changes — a new section, a different set of figures, a different issued form. Do not bump it for a typo, a rephrased instruction, or a canon edit that the same recipe will pick up on the next render.

Save the change the same way as any other file in the repository: edit, commit, pull request. The audit trail of the recipe *is* `git log --follow -- <path>`.

## Issued document versions

The PDF is **derived**. Do not treat it as the source of truth, and do not keep a parallel tree of "SRS v1.pdf / SRS v2.pdf" as the versioning scheme.

When you hand a document to a reviewer, a customer, or a design-review gate:

1. The recipe and the canon it reads are at one git commit.
2. **Tag that commit.** The tag is the baseline — there is no separate baseline artefact to keep in sync ([`patterns/baseline-audit-trail.md`](../patterns/baseline-audit-trail.md)).
3. Keep the **run record** of that render. It already carries `recipe_id`, `recipe_version`, and `repository_commit`. That is how a later reader tells which recipe, which edition of the recipe, and which commit produced the file they were given.
4. Keep the PDF if your process needs the bytes that were sent. It is evidence of the issue, not a second model.

A later render of the same recipe against a later canon is a **new issue**, not an edit of the old PDF.

## The revision table inside the document

If a reader of the PDF needs a history table (a customer form, an internal cover sheet), **write it as fixed text in the recipe.** Update the table in the same commit as the issue you are recording.

One row per **issued** revision — the thing you tagged and handed over — not per git commit.

```markdown
## Document history

| Issue | Date       | Issued by | What this issue contains |
| ----- | ---------- | --------- | ------------------------ |
| 1.0   | 2026-03-12 | A. Person | First issued SRS for design review. |
| 1.1   | 2026-06-02 | A. Person | Added the shutdown requirement. Baseline tag `design-review-2026-Q2`. |
```

Columns are yours. A workable minimum is an identifier, an ISO date, who issued it, and what changed in that issue. Put the baseline tag in the last column so the table points at git instead of trying to replace it.

**Do not** paste `git log` into the table on every render. The language cannot do that, and a hand-copied dump either goes stale or becomes a commit list the reader of the PDF did not ask for.

**Do not** put the table in an `{{# instruct }}` slot. Pass 2 fills a slot from declared model-object inputs ([`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) §4.2). Git history is not a model object. A slot that declares no `inputs:` is not filled at all.

If this is the first issue, the table has one row, or the section says so in one sentence. Empty cells that look like "the renderer will fill this later" are a false promise.

## Showing identity on the page

Nothing in the body is filled from the header automatically. If a reader of the PDF must see the recipe identity on the page, **type it as fixed text** next to the title, and keep it in step with `recipe_id` / `recipe_version` by hand when you bump them.

```markdown
# Software Requirements Specification

Recipe `product.srs` · edition `1.0`
```

The run record remains the place a process should read those fields from. Duplicating them in the body is for the human holding the PDF.

Canon content (`{{ REQ-14 }}`, `{{ view … }}`) updates on the next render. That is the automatic part. Version *labels* are not.

## Requirement-object revisions are a different layer

The experimental ReqIF package can carry `revision` / `revisions` / `workflow_state` on a **spec-object** ([`notations/packages/reqif.md`](../notations/packages/reqif.md) §2.9). That is the history of one interchange object, written by `transitrix-reqif revise`. It is not the document-history table, it is not `recipe_version`, and it is not carried through ReqIF XML in v1.

Do not copy those numbers into the PDF table and call the two histories the same thing.

## What not to do

- Do not look for a directive that fills "Document history" from git. There is none.
- Do not keep `v1` / `v2` copies of the recipe as the versioning scheme.
- Do not version the PDF as source.
- Do not put `methodology_version` in the document-history table. That pin is the method the whole repository conforms to, not an issue of this document.

## See also

- [`guides/how-a-document-prints.md`](how-a-document-prints.md) — page size, orientation, pictures.
- [`notations/views/documents/DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) — the language; no git transclusion.
- [`packages/document-renderer/README.md`](../packages/document-renderer/README.md) — header fields and the run record.
- [`patterns/baseline-audit-trail.md`](../patterns/baseline-audit-trail.md) — a git tag is a baseline; git log is the audit trail.
- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §10 — `methodology_version`, the other kind of version.

---

**Last reviewed:** 2026-08-25.
