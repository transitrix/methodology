---
title: How a model-backed document prints
status: active
last_reviewed: 2026-08-25
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

## Specified, not built

Print layout, landscape PDF, and embedded pictures are specified and **not built**.

- `fit` is a CSS class `dv-fit-<value>` in `@transitrix/document-view-engine` and a hook for print layout that is not built.
- `@transitrix/document-renderer` PDF figures are text placeholders — `[Figure: <caption>]` — named, not silent. They are never rasterised.

Those packages do not emit a landscape page, and they do not embed a picture in the PDF. A render that looks otherwise is not from them.

## Insert syntax

The three forms (`{{ view }}` / `{{ figure }}` / `{{ figref }}`) are defined in [`DIRECTIVE_LANGUAGE.md`](../notations/views/documents/DIRECTIVE_LANGUAGE.md) §3.5 and are not restated here. When the public explainer at `/recipes/` is live, it is a projection of this guide and of that section.
