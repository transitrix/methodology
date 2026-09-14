---
title: How a model-backed document prints
status: active
last_reviewed: 2026-09-14
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

## Insert syntax

The three forms (`{{ view }}` / `{{ figure }}` / `{{ figref }}`) are defined in [`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) §3.5 and are not restated here. When the public explainer at `/recipes/` is live, it is a projection of this guide and of that section.

Recipe identity, issued-document baselines, and the revision table inside the PDF: [`how-a-document-is-versioned.md`](how-a-document-is-versioned.md). That table is filled by hand.
