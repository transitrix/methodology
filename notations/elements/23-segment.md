---
title: "Segment — extracted chunk of a codex source"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-07"
status: "draft"
---

# Segment — Reference

**Scope:** The `SEGMENT` element type in the **field zone** — a chunk of regulatory source text (an article, clause, paragraph, or section) that a scanner agent or a human extracted from a codex document, recorded as a first-class, addressable artefact so downstream records can cite *the exact text they derive from* instead of a free-text section string. The shared zone / admission / pre-admission contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.4.

Segments are **field-zone primitives**, not canon. They are evidence — the extracted text itself, with provenance back to the codex source it was lifted from — and become useful when other artefacts point at them for traceability: an `AMENDMENT` records *which segments changed* ([22-amendment.md](22-amendment.md) `segment_refs[]`); a `REQUIREMENT` / `ASSERTION` records *which clause obliges* the claim it makes; the compliance-impact view ([../views/21-compliance-impact.md](../views/reports/21-compliance-impact.md)) can resolve an obligation down to the source clause that grounds it. A SEGMENT is never *promoted* into canon; it stays in the field zone as the text-level provenance other artefacts cite.

---

## 1. What a SEGMENT is — and what it is NOT

The codex zone holds external constraints (laws, regulations) and internal authority documents *given to* the organisation ([CONTRACT.md](../CONTRACT.md) §5; [14-codex.md](14-codex.md)). A codex artefact stores a source **as a whole document** — its identity, jurisdiction, effective date, and the admission record that it is an authoritative source. It does **not** decompose the source into addressable pieces.

But the obligations the organisation actually models do not derive from "GDPR" as a monolith — they derive from *Art.30(1)(b)*, from *§164.312(a)(1)*, from a specific clause. A `REQUIREMENT` cites its codex source via `derived_from:` ([15-requirement.md](15-requirement.md)); an `AMENDMENT` records that a source was amended ([22-amendment.md](22-amendment.md)). Both want to point at **a part of the source**, not the whole file. Before this TYPE, the only available shape was a free-text `source_section: "Art.30(1)(b)"` string — unresolvable, untyped, and re-typed identically on every artefact that touched the same clause.

A SEGMENT makes that chunk a typed, addressable artefact:

| | `SEGMENT` (field zone) | `CODEX` artefact (codex zone — [14-codex.md](14-codex.md)) |
|---|---|---|
| **Granularity** | A part of a source — one article / clause / paragraph / section | The whole source document |
| **What it records** | The extracted text of the chunk (or its fingerprint), with a locator into the source | The source's identity, authority, jurisdiction, effective date, admission |
| **Zone** | `field` — raw extracted evidence, contradictions allowed, not authoritative ([CONTRACT.md](../CONTRACT.md) §5) | `codex` — a source *given to* the organisation, admitted as authoritative |
| **Author** | A scanner agent (proposed) or a human reading the source (active by construction) | The codex admission gate ([14-codex.md](14-codex.md)) |
| **Lineage** | Cites the whole source it was extracted from via `source:`; nests under an enclosing SEGMENT via `parent:` | Stands alone; the source authority is the lineage |
| **Lifecycle** | None (an extraction is an event — only `extracted_at`) | Codex lifecycle ([14-codex.md](14-codex.md), `effective_date`) |

**SEGMENT is not a codex artefact, and not a notation.** It carries no `notation:` header — like the other field-zone primitives (`INTERVIEW`, `SURVEY`, `OBSERVATION`, `DRAFT`, `AMENDMENT`) and like codex artefacts, a SEGMENT is a zone primitive, not a notation document. It does not re-state the source's authority; it points back at the codex artefact that carries it.

**A SEGMENT is text-level provenance, not an obligation.** The obligation a clause expresses is modelled as a `REQUIREMENT` ([15-requirement.md](15-requirement.md)); the SEGMENT is the *raw text the requirement was read from*. One clause of text (one SEGMENT) may ground several requirements; one requirement may be grounded in several clauses (several SEGMENTs). Keeping the text chunk and the obligation distinct preserves the reconstruction invariant: the SEGMENT adds raw evidence, the REQUIREMENT adds the modelled obligation.

---

## 2. Frontmatter — canonical schema

A SEGMENT carries the field-zone admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: field`, `gate_checks.provenance`) plus the segment-specific fields below. It carries **no `notation:` header** and **no primitive lifecycle** — an extraction is an event, captured in `extracted_at`, with no `valid_from` / `valid_to` window.

```yaml
id: SEGMENT-GDPR-ART-30-1
type: SEGMENT
name: "GDPR Art.30(1) — records of processing activities"
source: REGULATION-GDPR-2016-1                # required — typed ID of the codex artefact this chunk came from
locator: "Art.30(1)"                          # required — citation path within the source (article / section / clause)
parent: SEGMENT-GDPR-ART-30-0                 # optional — enclosing SEGMENT (article → clause nesting)

# The extracted text. At least one of text_excerpt / text_hash MUST be present
# (SEGMENT-003): the excerpt witnesses the text directly; the hash witnesses it
# tamper-evidently when the verbatim text cannot be stored (length, licensing).
text_excerpt: |
  Each controller and, where applicable, the controller's representative, shall
  maintain a record of processing activities under its responsibility. That
  record shall contain all of the following information: …
text_hash: "sha256:6c1f…"                     # recommended — sha256 of the extracted chunk's text

extracted_at: "2026-06-05"                    # required — when the scan / human extracted this chunk
source_hash: "sha256:9a4b…"                   # optional — fingerprint of the whole source at extraction time

# Admission record (CONTRACT.md §6) — required
zone: field
admitted_at: "2026-06-06"                     # absent when admission_state: proposed (see §3)
admitted_by: "v.korobeinikov"                 # absent when admission_state: proposed
gate_checks:
  provenance: "scanner extracted Art.30(1) from source_url snapshot 2026-06-05"
source_quality: authoritative                 # optional — see CONTRACT.md §11.2
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `SEGMENT-[<middle>-]<INTEGER>`. The middle segment typically hints at the source and locator (`SEGMENT-GDPR-ART-30-1`, `SEGMENT-HIPAA-164-312-3`); convention only — the grammar requires only `SEGMENT-` + optional middle + terminal integer. |
| `type` | yes | string | Fixed value `SEGMENT`. Mirrors the bare-`TYPE` convention of the other field-zone primitives (`type: INTERVIEW`, `type: AMENDMENT`); no `notation:` short name. |
| `name` | yes | string | One-line human-readable label naming the chunk. Mirrors the `name` convention across the methodology ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3). |
| `source` | yes | string | Typed canonical ID of the codex artefact the chunk was extracted from. MUST resolve to an admitted codex artefact whose TYPE is one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD` (`SEGMENT-002`). A SEGMENT is always a chunk of a codex source; nothing else is segmented in this sense. |
| `locator` | yes | string | Citation path identifying *where in the source* the chunk sits — article / section / paragraph / clause (`"Art.30(1)"`, `"§164.312(a)(1)"`, `"Clause 7.4.2"`). Free-text, source-shaped; this is the human-navigable address the free-text `AMENDMENT.source_section` used to carry, now promoted to a required field on the typed chunk. |
| `parent` | no | string | Typed `SEGMENT-…` ID of the enclosing chunk, for nesting (an article SEGMENT containing clause SEGMENTs). MUST resolve to an admitted SEGMENT whose `source` is the same codex artefact (`SEGMENT-004`); MUST NOT be the segment's own `id` nor form a cycle (`SEGMENT-005`). Absent for a top-level chunk. |
| `text_excerpt` | one of `text_excerpt` / `text_hash` | string | The verbatim extracted text of the chunk. Stored when the text can be retained (length and licensing permitting). The directly-witnessing form of the chunk. |
| `text_hash` | one of `text_excerpt` / `text_hash` | string | A SHA-256 fingerprint of the extracted chunk's text — format `sha256:<64 lowercase hex>` (`SEGMENT-006`), the same content-fingerprint convention the ingest pipeline uses for `source_hash`. Provides tamper-evidence and change detection when the verbatim text is not stored, and lets a re-extracted "same" chunk be matched (or flagged drifted) by hash. |
| `extracted_at` | yes | string | Date the scan or human extracted this chunk — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. Distinct from `proposed_at` / `admitted_at` (admission-gate events on this artefact); `extracted_at` is the underlying extraction event. |
| `source_hash` | no | string | SHA-256 fingerprint of the **whole source document** at extraction time — format `sha256:<64 lowercase hex>` (`SEGMENT-007`). Records which version of the source the chunk was lifted from, so a later amendment to the source is provable against the bytes the segment derived from. Same convention as the ingest pipeline's `source_hash`. |
| `zone` | yes | string | Always `field` for SEGMENT — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | conditional | string | Date admitted to the field zone — quoted ISO 8601. Required on admitted (`active` or absent ⇒ active) artefacts; absent on `admission_state: proposed` (see §3). |
| `admitted_by` | conditional | string | Person handle or tool ID that ran the field-zone admission gate. Required on admitted artefacts; absent on proposed. |
| `gate_checks` | yes | map | Field-zone standard check `provenance` ([CONTRACT.md](../CONTRACT.md) §6) — a short note recording how the chunk was extracted (the scanner agent + run date + source snapshot; or the human + source URL + access date). |
| `source_quality` | recommended | string | Authored trust in the *source of the extraction* — `authoritative` / `corroborated` / `single_source` / `unverified` ([CONTRACT.md](../CONTRACT.md) §11.2). For a scanner agent reading the canonical regulator URL, typically `authoritative`. Absent ⇒ downstream confidence scoring treats the source as `unverified`. |

The shared header rules (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) do **not** apply to SEGMENT files — they are field-zone primitives, not notation documents, and carry no `notation:` header. The lifecycle rules (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) likewise do not apply — SEGMENT carries no `valid_from` / `valid_to`. The admission-state rules (`ADMIT-001..005`, [CONTRACT.md](../CONTRACT.md) §6.1) **do** apply — a scanner extracts SEGMENTs in the `proposed` state (§3), and `ADMIT-005` constrains how an admitted artefact may reference a proposed one.

---

## 3. Pre-admission lifecycle — `proposed → active | rejected`

SEGMENT shares the pre-admission lifecycle in [CONTRACT.md](../CONTRACT.md) §6.1 with AMENDMENT: an extraction agent reading a codex source emits SEGMENTs in the `proposed` state; a human reviewer adjudicates each — admits if the chunk and its locator are correct, rejects (with reason) if the extraction was wrong (mis-bounded text, wrong locator, an OCR artefact).

```yaml
# A scanner-emitted proposed SEGMENT
id: SEGMENT-GDPR-ART-30-2
type: SEGMENT
name: "GDPR Art.30(1)(b) — purposes of the processing"
source: REGULATION-GDPR-2016-1
locator: "Art.30(1)(b)"
parent: SEGMENT-GDPR-ART-30-1
text_hash: "sha256:1d77…"
extracted_at: "2026-06-05"

zone: field
admission_state: proposed                     # absent ⇒ active per CONTRACT.md §6.1
proposed_at: "2026-06-05"                     # required when proposed/rejected
proposed_by: "reg-intel-scanner"              # the tool that emitted the draft
gate_checks:
  provenance: pending_review                  # human-judgement check the scanner cannot certify
# admitted_at / admitted_by absent until human admits
```

A human reviewing the extraction batch then either:

- **Admits** — verifies the locator and the chunk boundaries are right, sets `admission_state: active`, fills `admitted_at` / `admitted_by`, completes `gate_checks.provenance` from `pending_review` to a recorded note. The SEGMENT enters the field zone as text-level evidence other artefacts may cite.
- **Rejects** — records the refusal with `admission_state: rejected`, `rejected_at`, `rejected_by`, and a short `rejection_reason` (mis-bounded chunk, wrong locator, duplicate of an existing SEGMENT). The file is retained as a decision record but excluded from the admitted field set and from every artefact that resolves `segment_refs[]`.

The state machine and the rule codes that enforce it (`ADMIT-001..005`) are defined once in [CONTRACT.md](../CONTRACT.md) §6.1; this spec does not restate them.

**Exclusion from references.** Only `active` (and absent ⇒ active) SEGMENTs constitute admitted field-zone evidence. A `proposed` or `rejected` SEGMENT MUST NOT be the resolution target of an admitted artefact's `segment_refs[]` or `parent` (`ADMIT-005`): an admitted AMENDMENT cannot cite a not-yet-admitted SEGMENT, and an admitted SEGMENT cannot nest under a proposed parent. Within a single harvest batch, a `proposed` artefact MAY reference another `proposed` SEGMENT staged for admission alongside it.

---

## 4. File location and naming

```
field/segments/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder sits at the field-zone root, alongside `field/interviews/`, `field/surveys/`, `field/observations/`, `field/drafts/`, `field/amendments/`. Examples:

- `field/segments/SEGMENT-GDPR-ART-30-1.yaml`
- `field/segments/SEGMENT-HIPAA-164-312-3.yaml`

The folder name is the plural of the TYPE in lowercase, matching the existing field-zone folder convention.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `SEGMENT-001` | error | `id` is missing or does not match the canonical grammar `SEGMENT-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1); or any required field from §2 (`type`, `name`, `source`, `locator`, `extracted_at`, `zone`, `gate_checks`) is missing; or `type` is not the literal string `SEGMENT`. |
| `SEGMENT-002` | error | `source` is missing, malformed, does not resolve to any admitted codex artefact, or resolves to an artefact whose TYPE is not one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`. A SEGMENT is always a chunk of a codex source. |
| `SEGMENT-003` | error | Neither `text_excerpt` nor `text_hash` is present. The chunk must be witnessed either by its verbatim text or by a content fingerprint; a SEGMENT with no text and no hash records nothing extractable. |
| `SEGMENT-004` | error | `parent` is present but does not resolve to an admitted SEGMENT, or resolves to a SEGMENT whose `source` differs from this segment's `source`. Nesting is within one source — a clause cannot nest under an article of a different document. |
| `SEGMENT-005` | error | `parent` equals the segment's own `id`, or the `parent` chain forms a cycle. A nesting hierarchy must be acyclic. |
| `SEGMENT-006` | warning | `text_hash` is present but not of the form `sha256:<64 lowercase hex>`. The fingerprint convention is shared with the ingest pipeline's `source_hash`; a malformed hash cannot be matched against a re-extraction. |
| `SEGMENT-007` | warning | `source_hash` is present but not of the form `sha256:<64 lowercase hex>` (same convention as `text_hash`). |
| `SEGMENT-008` | warning | Both `text_excerpt` and `text_hash` are present and the SHA-256 of the stored `text_excerpt` does not equal `text_hash`. The excerpt and its fingerprint disagree — one was edited without the other. Warning, not error, because normalisation (whitespace, encoding) can legitimately shift the hash; the validator notes the mismatch for review. |

The admission-state rules (`ADMIT-001..005`, [CONTRACT.md](../CONTRACT.md) §6.1) apply in addition to the rules above. The header (`HDR-001..004`) and primitive-lifecycle (`LIFECYCLE-001..004`) rules do **not** apply, per §2.

`SEGMENT-002`, `SEGMENT-004`, and `SEGMENT-005` are **cross-cutting**: they resolve typed IDs against the full field + codex catalogue, not the SEGMENT file in isolation. The validator must be loaded with that set to evaluate them.

---

## 6. Evolution

Out of scope for this initial schema; tracked as follow-up work:

- **`REQUIREMENT` / `ASSERTION` text-level lineage.** This revision wires the `AMENDMENT → SEGMENT` link (`segment_refs[]`, [22-amendment.md](22-amendment.md) §2). The symmetric wiring on the obligation side — a `REQUIREMENT.derived_from` (or a new `grounded_in: [SEGMENT-…]`) and an `ASSERTION.evidence` that resolves to SEGMENTs — lets an obligation cite the exact clause it was read from. Deferred to the requirement/assertion lineage pass; not added here to keep this task to the SEGMENT definition plus the one AMENDMENT wiring it unblocks.
- **Locator grammar.** `locator` is free text in this revision (source-shaped: `"Art.30(1)(b)"`, `"§164.312(a)(1)"`). A structured locator (a typed path with source-format awareness) would let the renderer deep-link into a source viewer and let two extractions of the same clause be matched by locator, not just by hash. Deferred.
- **Automated re-segmentation on amendment.** When an `AMENDMENT` reports a source changed, the SEGMENTs whose `source_hash` no longer matches the current source are the chunks most likely needing re-extraction. A cross-cutting rule that surfaces "SEGMENTs of a source with an active AMENDMENT and a stale `source_hash`" is a candidate for the freshness / staleness validator pass ([CONTRACT.md](../CONTRACT.md) §11.7); not added here.
- **Worked example yaml.** A worked example under `organizations/acme_corp/field/segments/` plus a per-folder README is planned alongside the broader compliance worked-examples wave; not part of this initial registration (consistent with how 14-codex / 15-requirement / 16-assertion / 22-amendment handled their initial registrations).

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.4 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, pre-admission lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §6.1.
- The codex artefacts a SEGMENT is extracted from: [14-codex.md](14-codex.md).
- The amendment artefacts that cite SEGMENTs: [22-amendment.md](22-amendment.md) (`segment_refs[]`).
- The motivation-layer obligations a segment's text grounds: [15-requirement.md](15-requirement.md), [16-assertion.md](16-assertion.md).
- Content-fingerprint convention (`sha256:<hex>`): the ingest pipeline's `source_hash` on field artefacts.
- Confidence and source trust on field artefacts: [CONTRACT.md](../CONTRACT.md) §11.
