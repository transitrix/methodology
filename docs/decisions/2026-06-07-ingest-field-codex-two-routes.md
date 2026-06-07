---
title: "Ingest — one skill, two routes (field + codex), with a shared vocabulary"
status: accepted
date: "2026-06-07"
scope: methodology
supersedes: null
superseded_by: null
tags: [ingest, skill, codex, field, zones, vocabulary, provenance, requirement, assertion]
---

# ADR: Ingest — one skill, two routes (field + codex), shared vocabulary

**Status:** Accepted
**Date:** 2026-06-07
**Deciders:** Valerii Korobeinikov
**Scope:** Repo-local to `methodology` — the ingest skill (`transitrix/skills/ingest/`) and its CLI (`packages/ingest-cli/`) live here. The skill's outcome/acceptance source of truth is the hub task tracking the Ingest skill; this ADR records the field-vs-codex routing architecture and the cross-zone vocabulary, not a new public-facing claim.

---

## Context

The ingest skill operates the **field → canon** derivation pipeline: convert a raw document, emit a `field` artefact with a proposed `source_quality`, extract typed `canon` candidates that cite their source via `derived_from`, validate, and stage a human-gated review queue. The `field-artefact` CLI command accepts only the field-zone TYPEs `INTERVIEW | SURVEY | OBSERVATION | DRAFT`.

A rehearsal on a copy of `organizations/acme_corp` (five fictional sources — interview, product CSV, marketing page, site-visit PDF, and an EU regulation PDF) confirmed two things:

1. **The field route works end-to-end** across docx/csv/html/pdf, and `canon/` stayed byte-identical — the "propose, never write canon" rule held.
2. **Laws are not a field source.** `field-artefact --type LAW` is rejected by construction, and when the codex derivation was hand-run, the field validator **flagged the ASSERTION** (`kind must be "element" or "relation"`). The codex contract (`notations/elements/14-codex.md`) routes a law to `codex/external/<jurisdiction>/` as a faithful source copy, then derives obligations as `REQUIREMENT` and bindings as `ASSERTION` — a different trust model, artefact role, derivation shape, and lifecycle from the field route.

The question this ADR settles: should field and codex ingestion be one skill or two, and how much of their vocabulary can be unified.

Forces: the two routes genuinely differ (below); but they share a front-end and a governing rule, and divergent naming for identical concepts would make the pipeline harder to teach, validate, and maintain.

## Decision

**One skill, two routes** — `field` and `codex` — sharing the front-end and the canon gate, not two trust models bolted onto one command.

Shared, zone-neutral spine (unchanged): `scaffold-intake → convert → … → validate → review-queue`, the `_intake/ inbox→processing→processed` flow, the `derived_from` join, the admission-record envelope (`id`/`name`/`type`/`zone`/`admitted_at`/`admitted_by`/`gate_checks`), and **the one rule** (propose; a human gates; nothing is written to `canon/`).

Route-specific:

- **field route** — emits a `field` artefact carrying a proposed `source_quality` (the graded entry-trust scale, `CONTRACT.md` §11) plus a separate `extraction_confidence` review flag, then typed element/relation candidates.
- **codex route** — emits a **faithful** codex artefact (`LAW | REGULATION | POLICY | INTERNAL_STANDARD`) with the codex-specific frontmatter (`jurisdiction`, `effective_date`, `monitoring_needed`/`scan`, source snapshot), then derives **`REQUIREMENT` candidates** (`derived_from: [LAW-…]`) and **`ASSERTION` candidates** that bind a requirement to a subject. A codex source is authoritative-by-construction and is **not** placed on the field `source_quality` scale.

Surface: a single ingest skill with a route selector — `admit-source --zone field|codex` (replacing the zone-baked `field-artefact`), and `emit-candidates` generalised to shape `REQUIREMENT` elements and `ASSERTION` bindings so one `validate`/`review-queue` serves both routes.

### Vocabulary alignment

Two tiers, by where the name lives.

**Skill-local — do now (no spec change):**

| Concept | Today (field / codex) | Aligned to |
|---|---|---|
| Derivation kinds on a candidate | `kind: element \| relation` only | add `kind: assertion` so codex bindings are first-class candidates |
| "Did the model read it right" flag | `extraction_confidence` (field only) | same field + enum on codex derivations |
| Pipeline verb | `field-artefact` (zone-baked) | `admit-source --zone field\|codex` |
| Source byte-copy fingerprint | `source_hash` (field only) | emit on both routes |

**Canon-touching — separate, reviewed methodology PR (notation shape, not a one-sided rewrite):**

| Concept | Today (field / codex) | Proposed |
|---|---|---|
| Retained copy of the source | `raw_source` (→ `_intake/processed/`) vs `snapshot_file`+`snapshot_date` (→ `codex/.../sources/`) | one term `source_snapshot` (+ `snapshot_date`), location stays per-zone |
| Admission gate sub-key | `gate_checks.provenance` vs `gate_checks.source_authority` | keep distinct but rename codex's to `issuing_authority`; document that they are different axes, not synonyms |

`source_quality` (field, graded informant trust) and the codex authority field are **different axes** and stay separate — collapsing them would re-introduce the very axis-conflation the data-quality model (`2026-06-05-data-quality-source-trust-and-freshness.md`) exists to prevent.

## Options Considered

### Route laws through the existing field path as-is

| Dimension | Assessment |
|---|---|
| Effort | Lowest |
| Correctness | Poor |

**Cons:** forces a law onto the field `source_quality` scale (a third trust axis on a two-axis model), and the field candidate schema cannot represent an `ASSERTION` (proven by the rehearsal flag). Rejected — a category error.

### Two fully separate sibling skills

**Pros:** clean separation of the two trust models.
**Cons:** duplicates the converter, the `_intake/` flow, the validator, and the review-queue assembly; two SKILL.md files drift. Acceptable fallback, not chosen.

### One skill, two routes, shared converter + gate (chosen)

**Pros:** shares everything that is genuinely shared (front-end, gate, review queue, `derived_from`); isolates only what genuinely differs (artefact schema, trust axis, derivation shape, lifecycle); one vocabulary to teach and validate.
**Cons:** `emit-candidates` and the candidate schema must grow a third `kind`; one command gains a `--zone` branch.

## Trade-off Analysis

The central trade-off is *shared surface vs. honest divergence*. Merging the two into one undifferentiated command would hide that a law and an interview are trusted for opposite reasons; splitting into two skills would duplicate the 80% that is identical. The chosen middle keeps the shared spine literally shared (one converter, one gate, one review queue) and lets the 20% that differs — the artefact frontmatter, the trust axis, the `REQUIREMENT`→`ASSERTION` two-step, the codex monitoring lifecycle — diverge explicitly behind a `--zone` selector. The vocabulary tiering ensures cheap, safe renames happen in the skill now, while canon-field renames go through the notation-shape review they warrant.

## Consequences

- **Easier:** one ingest entry point for adopters regardless of source kind; one review queue; a single shared vocabulary; the codex monitoring/scan lifecycle stays where it belongs (codex), not smeared onto field.
- **Harder:** the candidate schema and `emit-candidates` must learn `ASSERTION`; `validate`/`review-queue` must accept the new kind; the codex artefact emitter is new code; the canon-field renames need a coordinated notation PR + adopter migration note.
- **To revisit:** whether the codex route also wants its own coverage-profile gating; whether `ASSERTION` extraction (subject binding) should stay conservative like relations.

## Action Items

1. [ ] Skill/CLI: add `kind: assertion` to the candidate schema; generalise `emit-candidates` to shape `REQUIREMENT` + `ASSERTION`; teach `validate`/`review-queue` the new kind.
2. [ ] Skill/CLI: add the codex route — `admit-source --zone codex` emitting a faithful `LAW/REGULATION/POLICY/INTERNAL_STANDARD` artefact + `source_hash`.
3. [ ] Skill: rename `field-artefact` → `admit-source --zone field|codex` (keep an alias for one release).
4. [ ] Methodology PR (notation shape): unify `raw_source`/`snapshot_file` → `source_snapshot`; rename codex `gate_checks.source_authority` → `issuing_authority`; document the two-axes distinction in `CONTRACT.md` §6 / `14-codex.md`.
5. [ ] Fix the rehearsal-found defects: `ids.mjs` `CAPABILITY` V/H exception; closed-REL-kind check at `validate`; `emit-candidates` merging (not overwriting) `derived_from`; reconcile the CLI field-artefact schema with the worked acme example; structured-import `source_quality` default.
6. [ ] Docs: drop the stale "skeleton (v0)" status banner from `SKILL.md` / `README.md` now the CLI has landed.
