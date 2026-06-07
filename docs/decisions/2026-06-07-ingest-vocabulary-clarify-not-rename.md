---
title: "Ingest vocabulary — clarify the field/codex correspondence, do not rename"
status: accepted
date: "2026-06-07"
scope: methodology
supersedes: null
superseded_by: null
tags: [ingest, codex, field, vocabulary, naming, documentation, provenance]
---

# ADR: Ingest vocabulary — clarify, do not rename

**Status:** Accepted
**Date:** 2026-06-07
**Deciders:** Valerii Korobeinikov
**Scope:** Repo-local to `methodology`. Refines the "vocabulary alignment / IG-4" action item of [`2026-06-07-ingest-field-codex-two-routes.md`](./2026-06-07-ingest-field-codex-two-routes.md).

---

## Context

The field-vs-codex routing ADR listed a follow-up ("IG-4"): unify the retained-source-copy field name (`raw_source` in the field zone, `snapshot_file` in codex) to a single `source_snapshot`, and rename the codex admission gate-check `gate_checks.source_authority` to `issuing_authority`, plus document the two trust axes.

On investigation across the repo (16 files reference these names), both renames look worse than the one-line action item implied:

- **`gate_checks.source_authority` → `issuing_authority` is wrong.** `source_authority` is the **codex zone's canonical admission gate-check** (`CONTRACT.md` §6: "codex → source_authority: the issuing or authoritative source is identified and the artefact is faithful to it"), parallel to the field zone's `gate_checks.provenance`. Meanwhile `issuing_authority` **already exists** as a distinct top-level field on **internal** codex artefacts (the body that issued a policy/standard, `14-codex.md` §4). Renaming the gate-check to `issuing_authority` collides with that field and conflates a gate-check with a content field.
- **`raw_source`/`snapshot_file` → `source_snapshot` has marginal benefit and real cost.** `raw_source` is a tooling-only field (ingest CLI + bundle schema). `snapshot_file`/`snapshot_date` is **canon**, with a deep sub-spec (`14-codex.md` §3.1 snapshots, re-snapshotting, the scanner-agent comparison in §3.5, and required-together validation). The two names are also **zone-appropriate**: "snapshot" fits a point-in-time capture of an external, evolving source (a law); "raw source" fits captured field material (an interview). Unifying would worsen the field name, churn embedded canon, and force an adopter data migration — to buy "one word".

The real problem the alignment was chasing is **reader confusion** (two names for a similar concept; `source_quality` vs `source_authority` look alike). Confusion is better fixed by documentation than by a breaking rename.

## Decision

**Decline both renames. Clarify instead.**

1. Keep `raw_source` (field tooling) and `snapshot_file`/`snapshot_date` (codex canon) as the zone-appropriate names for the retained source copy.
2. Keep `gate_checks.source_authority` as the codex admission gate-check (`CONTRACT.md` §6). Do not rename it.
3. Add a short clarification to the canon — `14-codex.md` §3.6 — stating:
   - codex sources are **authoritative by construction** and carry **no** `source_quality`; the graded source-trust scale is a field-zone concept (`CONTRACT.md` §11.2);
   - `source_quality` (graded trust on a field informant) and `source_authority` (a provenance gate-check on codex input) are **different axes**, deliberately not unified;
   - the retained source copy is the codex `snapshot_file` and the field analogue is the ingest field artefact's `raw_source` — the same byte-level-copy concept, named per zone.
4. Note the field↔codex correspondence in the ingest `field-artefact.schema.json` `raw_source` description.

## Options Considered

### Full rename (`source_snapshot` + `issuing_authority`)
Rejected. `issuing_authority` collides with the existing internal-codex field; the snapshot rename churns deep canon (snapshot sub-spec + scanner) and breaks adopter data; "snapshot" → field worsens the field name.

### Partial rename (`source_snapshot` only)
Rejected. Same codex-canon + adopter-migration cost, same field-naming regression, for marginal cross-zone tidiness.

### Clarify only (chosen)
Additive documentation. Zero breakage, no adopter migration, names stay stable, and the actual problem (confusion between similar names and across zones) is addressed where readers meet it (the spec).

## Consequences

- **Easier:** no breaking change; adopters' existing codex data and the ingest CLI keep working; the genuine confusion is resolved in the spec.
- **Harder:** two names for "the retained source copy" persist across zones — mitigated by the §3.6 correspondence note.
- **Supersedes:** the IG-4 "rename" action item in the field/codex two-routes ADR is resolved as *clarify, not rename*.

## Action Items

1. [x] Add `14-codex.md` §3.6 (this PR).
2. [x] Add the field↔codex correspondence line to `field-artefact.schema.json` (this PR).
3. [ ] Mark IG-4 done-as-clarify in `win-claude/tasks.md`.
