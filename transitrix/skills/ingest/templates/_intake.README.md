# `_intake/` — document intake pipeline

This folder is **operational**, not a zone. The Transitrix zones (`canon/`, `field/`, `codex/`) sit parallel beside it; `_intake/` is the workspace the **ingest** skill (`/transitrix:ingest`) uses to turn raw documents into reviewable field artefacts and canon candidates.

```
_intake/
  inbox/        # drop raw files here, untouched (interviews, policies, org charts, spreadsheets, notes)
  processing/   # being extracted now — converted Markdown, field artefacts, and candidates in flight
  processed/    # source files whose ingest is complete — retained for traceability
```

## The flow

A source file moves `inbox/ → processing/ → processed/`:

1. **`inbox/`** — you drop the raw file here. Nothing touches the bytes.
2. **`processing/`** — the pipeline converts the document to Markdown (MS Markitdown for Office formats), emits a `field` artefact with provenance and a proposed `source_quality`, extracts typed canon *candidates* (entity-strong, relation-conservative), validates them against the canonical schemas and this repo's `coverage_profile`, and stages a review queue.
3. **`processed/`** — once ingest is complete for a source, its original raw file is moved here and kept. The admitted **field artefact** lives in `field/` (with its admission record and `source_quality`); this retained raw file is what that artefact's provenance traces back to.

## What does *not* happen here

- **Nothing is admitted to canon from `_intake/`.** The pipeline only proposes. A human reviews the queue, confirms or revises each proposed `source_quality`, and runs the canon admission gate (`uniqueness`, `consistency`, `completeness`) to admit candidates into `canon/`.
- **`_intake/` is not version-of-record.** It is a workspace. The durable records are the `field/` artefact (citing the retained raw file) and, after human admission, the `canon/` elements that cite the field artefact via `derived_from`.

## Private — not shared

`_intake/` is a **per-user, private workspace**: its working files (`inbox/`, `processing/`, `processed/`) are **not shared** with other modellers and are **git-ignored**. Because of that, nothing that participates in the model may live here — an object that is part of the model must be committed to a shared zone. In particular, a standalone object ingestion could not yet TYPE goes to the shared, committed `canon/unresolved/` holding area (CONTRACT §13), **never** left sitting in `_intake/`.

To keep the folder skeleton in version control while ignoring its contents, each subfolder carries a committed **`.gitkeep`** file, and the repo `.gitignore` ignores the contents but not the `.gitkeep`:

```
_intake/inbox/*
_intake/processing/*
_intake/processed/*
!_intake/**/.gitkeep
```

`scaffold-intake` creates the `.gitkeep` files; if you make the folders by hand, add an empty `.gitkeep` to each.

## Status

In the current methodology version the `_intake/` convention is defined by the ingest skill (skill-local). It is not yet a reserved org-structure convention in the methodology `MANIFEST.md` / `CONTRACT.md`; that promotion is a separate decision taken once the skill stabilises.
