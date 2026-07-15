---
title: "Amendment — detected change to a codex source"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-06-07"
status: "draft"
---

# Amendment — Reference

**Scope:** The `AMENDMENT` element type in the **field zone** — a structured record that *a watched codex source has been amended*, capturing what moved, when it was detected, the section of the source it affects, hints about likely-impacted canon elements, and (once a human adjudicates) the canon `CHANGE` / Gap element(s) the amendment motivates. The shared zone / admission / pre-admission contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.4.

Amendments are **field-zone primitives**, not canon. They are evidence — the detection event recorded by a scanner agent or by a human reading the source — and become useful when they motivate canon `CHANGE` / Gap elements that close the resulting compliance gap. An AMENDMENT is never *promoted* into canon; canon `CHANGE` elements that cite it via `derived_from:` are how its consequences enter the authoritative model.

---

## 1. What an AMENDMENT is — and what it is NOT

The codex zone holds external constraints (laws, regulations) and internal authority documents that are *given to* the organisation ([CONTRACT.md](../CONTRACT.md) §5; [14-codex.md](14-codex.md)). When a codex source carries `monitoring_needed: true`, a scanner agent periodically re-fetches it ([14-codex.md](14-codex.md) §3.5). When the scanner observes drift, two things happen:

1. The codex artefact's `scan` block records the detection — `change_detected: true`, `change_description: …`, `review_needed: true`. This is operating state on the codex file ([14-codex.md](14-codex.md) §3.5).
2. A **structured amendment record** is emitted to the field zone — an `AMENDMENT-…` artefact carrying the detection event itself: which source, which section, what moved, what canon elements look likely-impacted, and (later, when adjudicated) what canon `CHANGE` / Gap elements close the resulting gap.

The two are complementary. The codex `scan` block answers *was there a change?* The AMENDMENT artefact answers *what was it, and what does it set in motion?* — and is queryable as its own field-zone primitive across detections, sources, and dates without scraping every codex YAML.

| | `AMENDMENT` (field zone) | `CHANGE` (canon zone, ArchiMate Gap — [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1) |
|---|---|---|
| **What it records** | An external fact — *a watched source was amended* (detection event with provenance) | An internal decision — *a delta the organisation must close* (a Gap / change initiative) |
| **Zone** | `field` — raw evidence, contradictions allowed, not authoritative ([CONTRACT.md](../CONTRACT.md) §5) | `canon` — admitted truth, internally consistent, authoritative |
| **Author** | A scanner agent (proposed) or a human reading the source (active by construction) | A human, adjudicating what the organisation will do about the amendment |
| **Lineage** | Cites the codex source it amends via `source:` | Cites the field evidence that motivated it via `derived_from: [AMENDMENT-…]`; references the obligations and elements it acts on via canon relations and per-CHANGE fields |
| **Lifecycle** | None (a detection event has no `valid_from` / `valid_to` window — only `detected_at`) | Standard canon primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) |

The relationship is one-to-many in both directions: one AMENDMENT MAY motivate several canon `CHANGE` elements (a single source amendment might force changes to multiple processes, products, or capabilities); one canon `CHANGE` MAY be motivated by several amendments (a Gap closed in response to a string of related source updates). The link is `AMENDMENT.motivates: [CHANGE-…]` on the amendment, and the symmetric `CHANGE.derived_from: [AMENDMENT-…]` on each canon `CHANGE` — both sides recorded so either is queryable without traversing the other catalogue.

The AMENDMENT chain is the **codex-driven** populator of the canon CHANGE catalogue. A CHANGE responding to an obligation with a non-codex `origin` (`process-product` / `project-product` — a BRD revision, a re-interview finding, a SOP tightening — [15-requirement.md](15-requirement.md) §2.1) has no AMENDMENT to cite, and instead names its motivation-layer subject directly via `CHANGE.addresses: [REQUIREMENT-… | CONSTRAINT-…]` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.3.1). Both surfaces are origin-agnostic on the `CHANGE` side (the schema does not distinguish); the split is only over which populator is available — a scanner-witnessed AMENDMENT for codex sources, or a direct `addresses` link for the rest.

**AMENDMENT is not a Gap.** Naming the field-zone TYPE `AMENDMENT-…` and *not* `CHANGE-…` is deliberate: the canon `CHANGE` TYPE (ArchiMate Gap, see [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1) is reserved for the *organisation's planned delta*, the BDN change layer the DGCA and Action schedule chains pivot on. Re-using the prefix for an external detection event would collide with that semantics and with the uniqueness scope of canon `CHANGE` IDs ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §4). The two TYPEs stay distinct.

---

## 2. Frontmatter — canonical schema

An AMENDMENT carries the field-zone admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: field`, `gate_checks.provenance`) plus the amendment-specific fields below. It carries **no `notation:` header** — like other field-zone artefacts (`INTERVIEW`, `SURVEY`, `OBSERVATION`, `DRAFT`) and like codex artefacts ([14-codex.md](14-codex.md)), an AMENDMENT is a zone primitive, not a notation document. It carries **no primitive lifecycle** — a detection event has no `valid_from` / `valid_to` window; the date the detection happened is captured in `detected_at`.

```yaml
id: AMENDMENT-GDPR-1
type: AMENDMENT
name: "GDPR Art.30 — recordkeeping wording tightened"
change_description: |
  Art.30(1)(b) wording changed from "the purposes of the processing" to
  "the specific purposes of the processing, including the legal basis";
  paragraph (g) on security-measure descriptions reworded. Affects processors
  obliged to maintain records of processing activities.
source: REGULATION-GDPR-2016-1                # required — typed ID of the amended codex artefact
source_section: "Art.30(1)(b),(g)"            # optional — free-text section identifier in the source
amended_at: "2026-05-21"                      # optional — when the source authority published the amendment (if known)
detected_at: "2026-06-05"                     # required — when the scan / human detected the change

# Optional — typed SEGMENT-… IDs identifying the extracted chunks of source
# text the amendment touched (the structured form of source_section). Each
# must resolve to an admitted SEGMENT (22 → 23-segment.md) on the same source.
segment_refs: []

# Optional — scanner / human hints about canon elements the amendment is
# likely to impact. Hints, not commitments: the authoritative impact set is
# expressed by the canon CHANGE elements this AMENDMENT motivates (below)
# once a human adjudicates. Typed IDs; the validator resolves each.
likely_impacted:
  - REQUIREMENT-GDPR-ART-30-RECORDKEEPING-1
  - PROCESS-DATA-PROCESSING-RECORD-1

# Optional — canon CHANGE / Gap elements this amendment motivates. Empty on
# first emission (the human has not yet decided what the org will do); filled
# during adjudication as CHANGE elements are authored to close the gap. Each
# entry must resolve to an admitted CHANGE element in canon.
motivates: []

# Admission record (CONTRACT.md §6) — required
zone: field
admitted_at: "2026-06-06"                     # absent when admission_state: proposed (see §3)
admitted_by: "v.korobeinikov"                 # absent when admission_state: proposed
gate_checks:
  provenance: "scanner re-fetched source_url on 2026-06-05; diff captured against snapshot"
source_quality: corroborated                  # optional — see CONTRACT.md §11.2
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `AMENDMENT-[<middle>-]<INTEGER>`. The middle segment typically hints at the amended source (`AMENDMENT-GDPR-1`, `AMENDMENT-LAW-PERSONAL-DATA-3`); convention only — the grammar requires only `AMENDMENT-` + optional middle + terminal integer. |
| `type` | yes | string | Fixed value `AMENDMENT`. Mirrors the bare-`TYPE` convention used by other field-zone primitives (`type: INTERVIEW`, etc.) and by codex artefacts (`type: LAW`, etc.); no `notation:` short name. |
| `name` | yes | string | One-line human-readable label naming what changed. Mirrors the `name` convention across the methodology ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3). |
| `change_description` | yes | string | Longer-form description of what moved — wording deltas, scope shifts, dates, the editorial trail the scanner produced or the human transcribed. Free text; not the same field as the codex artefact's `scan.change_description` (that is operating state on the codex side; this is the field-zone record). |
| `source` | yes | string | Typed canonical ID of the codex artefact that was amended. MUST resolve to an admitted codex artefact whose TYPE is one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD` (`AMENDMENT-002`). |
| `source_section` | no | string | Free-text section identifier within the source — article / paragraph / page / clause — for human navigation. **Legacy annotation**: with the `SEGMENT` TYPE now registered ([23-segment.md](23-segment.md)), the structured form of "which part of the source" is `segment_refs[]` (below), each resolving to a SEGMENT that carries its own `locator`. Retain `source_section` only as a free-text convenience when no SEGMENT has been extracted yet; prefer `segment_refs[]` once chunks exist. |
| `amended_at` | no | string | Date the source authority published the amendment — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. Optional because some sources do not carry an explicit publication date for incremental amendments; when absent, the detection date alone witnesses the event. |
| `detected_at` | yes | string | Date the scan or human first noticed the change — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. Distinct from `proposed_at` / `admitted_at` (those are admission-gate events on this artefact); `detected_at` is the underlying detection event the artefact records. |
| `segment_refs` | no | list | Typed `SEGMENT-…` IDs identifying the extracted chunks of source text the amendment touched ([23-segment.md](23-segment.md)). Each entry MUST resolve to an admitted SEGMENT whose `source` is this amendment's `source` (`AMENDMENT-007`) — a chunk of the amended document, not of some other source. The structured replacement for the free-text `source_section`. |
| `likely_impacted` | no | list | Typed canonical IDs of canon elements the amendment is likely to impact — scanner / human hints surfaced for the review digest, not authoritative claims. Typical TYPEs: `REQUIREMENT`, `CONSTRAINT`, `PROCESS`, `STEP`, `PRODUCT`, `CAPABILITY`, `ASSERTION`. Each entry MUST resolve to an admitted element in canon (`AMENDMENT-003`). The authoritative impact set is expressed by the canon `CHANGE` elements named in `motivates[]` once a human adjudicates. |
| `motivates` | no | list | Typed `CHANGE-…` IDs naming the canon `CHANGE` / Gap elements this amendment motivates. Empty on first emission; filled by the human as Gap elements are authored. Each entry MUST resolve to an admitted canon `CHANGE` element (`AMENDMENT-004`). The link is symmetric: a canon `CHANGE` motivated by an AMENDMENT additionally carries `derived_from: [AMENDMENT-…]` on its own admission record, so either side is queryable without traversing the other catalogue. |
| `zone` | yes | string | Always `field` for AMENDMENT — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | conditional | string | Date admitted to the field zone — quoted ISO 8601. Required on admitted (`active` or absent ⇒ active) artefacts; absent on `admission_state: proposed` (see §3). |
| `admitted_by` | conditional | string | Person handle or tool ID that ran the field-zone admission gate. Required on admitted artefacts; absent on proposed. |
| `gate_checks` | yes | map | Field-zone standard check `provenance` ([CONTRACT.md](../CONTRACT.md) §6) — a short note recording how the detection was witnessed (the scanner agent + run date + diff target; or the human + source URL + access date). |
| `source_quality` | recommended | string | Authored trust in the *source of the detection* — `authoritative` / `corroborated` / `single_source` / `unverified` ([CONTRACT.md](../CONTRACT.md) §11.2). For a scanner agent fetching the canonical regulator URL, the value is typically `authoritative`; for a human transcribing a press summary it might be `single_source`. Absent ⇒ downstream confidence scoring treats the source as `unverified`. |

The shared header rules (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) do **not** apply to AMENDMENT files — they are field-zone primitives, not notation documents, and carry no `notation:` header. The lifecycle rules (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) likewise do not apply — AMENDMENT carries no `valid_from` / `valid_to`. The admission-state rules (`ADMIT-001..005`, [CONTRACT.md](../CONTRACT.md) §6.1) **do** apply — an automated scanner emits AMENDMENTs in the `proposed` state (§3), and `ADMIT-005` constrains how an admitted artefact may reference a proposed one.

---

## 3. Pre-admission lifecycle — `proposed → active | rejected`

AMENDMENT is one of the canonical use cases for the pre-admission lifecycle in [CONTRACT.md](../CONTRACT.md) §6.1: a scanner agent watching a `monitoring_needed: true` codex source emits an AMENDMENT in the `proposed` state every time it detects drift; a human reviewer adjudicates each — admits if the detection is real and the change is worth recording, rejects (with reason) if it was a false positive or below the review threshold.

```yaml
# A scanner-emitted proposed AMENDMENT
id: AMENDMENT-GDPR-2
type: AMENDMENT
name: "GDPR Art.30 — formatting change to recital reference"
change_description: |
  Footnote numbering changed; substantive wording unchanged.
source: REGULATION-GDPR-2016-1
detected_at: "2026-06-05"
segment_refs: []
likely_impacted: []
motivates: []

zone: field
admission_state: proposed                     # absent ⇒ active per CONTRACT.md §6.1
proposed_at: "2026-06-05"                     # required when proposed/rejected
proposed_by: "reg-intel-scanner"              # the tool that emitted the draft
gate_checks:
  provenance: pending_review                  # human-judgement check the scanner cannot certify
# admitted_at / admitted_by absent until human admits
```

A human reviewing the digest then either:

- **Admits** — verifies the detection is real and material, sets `admission_state: active`, fills `admitted_at` / `admitted_by`, completes `gate_checks.provenance` from `pending_review` to a recorded note (the source URL accessed, the diff target). The AMENDMENT enters the field zone as evidence. The reviewer may at the same time (or later) author one or more canon `CHANGE` elements and back-link them via `motivates: [CHANGE-…]`.
- **Rejects** — records the refusal with `admission_state: rejected`, `rejected_at`, `rejected_by`, and a short `rejection_reason` (a false positive, a formatting-only change below the threshold). The file is retained as a decision record but is excluded from the admitted field set and from every derived view.

The state machine and the rule codes that enforce it (`ADMIT-001..005`) are defined once in [CONTRACT.md](../CONTRACT.md) §6.1; this spec does not restate them.

**Exclusion from derived views.** Only `active` (and absent ⇒ active) AMENDMENTs constitute admitted field-zone evidence. A `proposed` or `rejected` AMENDMENT is excluded from the review digest's *admitted-evidence* count, from any canon-side query that lists "amendments motivating this CHANGE", and from confidence scoring's source-trust aggregation ([CONTRACT.md](../CONTRACT.md) §11.4). A `proposed` AMENDMENT MAY be referenced by another `proposed` artefact in the same harvest batch (e.g. a proposed CHANGE that is staged to be admitted alongside the amendment); an `active` canon CHANGE MUST NOT carry `derived_from: [AMENDMENT-…]` pointing at a `proposed` AMENDMENT (`ADMIT-005`).

---

## 4. File location and naming

```
field/amendments/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder sits at the field-zone root, alongside `field/interviews/`, `field/surveys/`, `field/observations/`, `field/drafts/`. Examples:

- `field/amendments/AMENDMENT-GDPR-1.yaml`
- `field/amendments/AMENDMENT-LAW-PERSONAL-DATA-3.yaml`

The folder name is the plural of the TYPE in lowercase, matching the existing field-zone folder convention.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `AMENDMENT-001` | error | `id` is missing or does not match the canonical grammar `AMENDMENT-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1); or any required field from §2 (`type`, `name`, `change_description`, `source`, `detected_at`, `zone`, `gate_checks`) is missing; or `type` is not the literal string `AMENDMENT`. |
| `AMENDMENT-002` | error | `source` is missing, malformed, does not resolve to any admitted codex artefact, or resolves to an artefact whose TYPE is not one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`. An AMENDMENT records a change to a codex source; nothing else can be amended in this sense. |
| `AMENDMENT-003` | error | An entry in `likely_impacted` is a well-formed typed ID but does not resolve to any admitted canonical element. Hints reference real elements; a dangling ID is treated as an error so the digest does not steer reviewers toward phantom impact. |
| `AMENDMENT-004` | error | An entry in `motivates` is a well-formed typed ID but does not resolve to any admitted canon element of TYPE `CHANGE`. The amendment-to-Gap link must point at a real Gap. |
| `AMENDMENT-005` | warning | `amended_at` is present and is later than `detected_at`. A detection cannot have happened before the underlying event; the dates are likely transposed or one is wrong. Warning, not error, because some sources publish-dates that are administratively backdated past the agent's first detection (a future-dated effective date is a separate matter and is not flagged). |
| `AMENDMENT-006` | warning | `gate_checks.provenance` is the literal `pending_review` AND `admission_state` is absent or `active`. The admitted artefact never had its provenance check completed by a human — a scanner-staged draft was admitted without finishing the review. |
| `AMENDMENT-007` | error | An entry in `segment_refs[]` is a well-formed typed ID but does not resolve to an admitted `SEGMENT` ([23-segment.md](23-segment.md)), or resolves to a SEGMENT whose `source` differs from this amendment's `source`. A segment reference must point at an admitted chunk of the amended document. |

The admission-state rules (`ADMIT-001..005`, [CONTRACT.md](../CONTRACT.md) §6.1) apply in addition to the rules above. The header (`HDR-001..004`) and primitive-lifecycle (`LIFECYCLE-001..004`) rules do **not** apply, per §2.

`AMENDMENT-003`, `AMENDMENT-004`, and `AMENDMENT-007` are **cross-cutting**: they resolve typed IDs against the full canon + field catalogue, not the AMENDMENT file in isolation. The validator must be loaded with that set to evaluate them.

---

## 6. Evolution

Out of scope for this initial schema; tracked as follow-up work:

- **`SEGMENT` field-zone TYPE wiring.** *(Done — [23-segment.md](23-segment.md).)* `segment_refs[]` resolves to typed `SEGMENT-…` chunks (`AMENDMENT-007`, now error-grade), `source_section` is demoted to a free-text legacy annotation, and the structured "which part of the source" lives on each SEGMENT's `locator`.
- **Automated re-derivation hint.** When an AMENDMENT motivates a canon `CHANGE`, the canon `REQUIREMENT` elements whose `derived_from` cites the amended codex source are the obligations most likely needing re-extraction. A cross-cutting rule that surfaces "REQUIREMENTs derived from a source with an active AMENDMENT" is a candidate for the freshness / staleness validator pass ([CONTRACT.md](../CONTRACT.md) §11.7); not added here.
- **Per-amendment effective-date semantics.** An amendment may take effect immediately, on a fixed future date, or after a transition window. Modelling the effective-date model on the AMENDMENT itself (rather than on the resulting canon `CHANGE`) is deferred — for now the amendment records the detection, and the canon `CHANGE` carries the org's planned response and its own dates.
- **Worked example yaml.** A worked example under `organizations/acme_corp/field/amendments/` plus a per-folder README is planned alongside the broader compliance worked-examples wave; not part of this initial registration.

---

## 7. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.4 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, pre-admission lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §6.1.
- The codex artefacts an AMENDMENT records changes to: [14-codex.md](14-codex.md), especially §3.4 (`monitoring_needed`) and §3.5 (scanner-agent `scan` block).
- The extracted source chunks an AMENDMENT cites via `segment_refs[]`: [23-segment.md](23-segment.md).
- The canon `CHANGE` (ArchiMate Gap) elements an AMENDMENT motivates: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (`CHANGE`); used by DGCA ([views/02-dgca.md](../views/02-dgca.md)) and Action schedule ([views/07-action.md](../views/07-action.md)).
- The motivation-layer obligations whose re-derivation an amendment may trigger: [15-requirement.md](15-requirement.md), [16-assertion.md](16-assertion.md).
- Confidence and source trust on field artefacts: [CONTRACT.md](../CONTRACT.md) §11.
