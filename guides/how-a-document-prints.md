---
title: How a model-backed document prints
status: active
last_reviewed: 2026-09-20
audience: public
license: MIT
tags: [transitrix, guide, recipe, document]
---

# How a model-backed document prints

> Page size, orientation, and what to do when a picture does not fit. You do not write the document — you write its recipe once, and the document comes from the model every time. Insert syntax is in [`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) §3.5, not here.

## Page size

Page size is **declared, never inherited. A4.**

A render reporting `612 × 792 pt` is US Letter and wrong. `595 × 842 pt` is A4.

## Orientation

Portrait by default. A wide picture takes a **landscape page**, not a smaller font.

## When it still does not fit

The **view is too large**. Split it in the model (overview and detail). A different projection is a **different view file**. Do not add filtering or depth to the `{{ view }}` tag. Do not crop an export and place it as a `figure`.

## Pictures

Which supplied pictures are legitimate is stated in [`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) §3.5. This guide does not restate the list.

## What the rendering paths support

| Path | Available support | Boundary |
| --- | --- | --- |
| Basic PDF renderer | A4 text pages; explicit `[Figure: <caption>]` placeholders. | Does not embed figures or produce landscape pages. |
| Paged-media preparation | `generatePagedMediaCss` and `wrapHtmlForPrintRendering` prepare HTML/CSS, including running footers and landscape page rules. | Preparation is implemented; it is not a PDF engine. |
| Caller-supplied HTML-to-PDF engine | Consumes the prepared HTML/CSS. | Final pagination, image embedding and landscape output depend on that engine and must be tested on the resulting PDF. |

See the [renderer documentation](../packages/document-renderer/README.md) for the supported entry points. A `dv-fit-<value>` CSS class is a layout hook, not proof of a correctly rendered page. Check the final page dimensions, orientation, figure presence and legibility with the chosen engine before issue. Passing CSS tests alone does not verify the PDF.

## References to pages

The directive language has no target-page reference or generated table-of-contents
construct. `figref` inserts a **figure number**, not the page containing that
figure; its contract requires the figure to have been declared earlier in the
document. See [the normative definition](../notations/views/documents/DIRECTIVE_LANGUAGE.md#35-figures).

The renderer's pass 1 resolves content and leaves instruction slots for pass 2,
which fills them through a caller-supplied hook. These are content stages, not
physical pagination passes. Neither stage knows the final page of a target.
Likewise, footer CSS using `counter(page)` and `counter(pages)` describes the
current page and total pages, not the page containing a named target.

The basic PDF writer breaks text into pages but exposes no anchor-to-page
resolution. Paged-media preparation emits HTML/CSS; it does not run a layout
engine or resolve target pages. No automatic target-page-reference workaround is
verified for these entry points. A caller-supplied engine needs separate final-PDF
verification before its capabilities can be promised. Do not infer page-reference
support from a preview, generated CSS, or a renderer's name.

For now, avoid promising automatically maintained page numbers. A page number
checked against one PDF becomes unverified as soon as content or layout changes.

### Evaluating a future extension

The following is a proposal for evaluation, **not supported syntax or a new
conformance requirement**. Address a stable, unique anchor within the document
and resolve the page containing it against the final paginated output, including
targets that appear after their references. Document anchors identify rendered
locations; a model ID alone does not distinguish repeated appearances.

Leave the resolution algorithm to the renderer. Exactly two passes are not a
requirement: inserting reference text can itself change line breaks and move the
target. Any iterative approach needs a declared finite convergence limit and a
check that the inserted values agree with the final output. Distinguish physical
PDF page positions from printed page labels, including covers and numbering
restarts.

Evaluation should report missing anchors, duplicate anchors, unsupported engines
or output formats, and unstable layout explicitly. Unpaginated output has no
physical page to resolve. Unresolved or unstable results must remain visible and
must not be presented as successful numeric references; never guess a page or
silently reuse one from an earlier render.

Before claiming support, verify a synthetic final PDF with a forward reference,
then insert content before its target and check the new placement. Include
missing and duplicate anchors, reference text that changes layout, and a case
that reaches the convergence limit. Intermediate HTML alone is not acceptance
evidence. This evaluation does not prescribe a document layout or TOC.

## Insert syntax

The three forms (`{{ view }}` / `{{ figure }}` / `{{ figref }}`) are defined in [`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) §3.5 and are not restated here. When the public explainer at `/recipes/` is live, it is a projection of this guide and of that section.

Recipe identity, issued-document baselines, and the revision table inside the PDF: [`how-a-document-is-versioned.md`](how-a-document-is-versioned.md). That table is filled by hand.
