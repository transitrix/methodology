# `transitrix/skills/onboard/extraction/`

Per-layer extraction prompts for initial Canon population from Field artefacts. Each file is a fully-formed **system prompt** that an extraction-batch agent reads, alongside one or more Field artefacts as input, to produce draft canonical primitives. A human then admits each draft to canon via the admission gate ([`notations/CONTRACT.md`](../../../../notations/CONTRACT.md) §6).

These prompts are part of the onboarding Skill bundle but are usable independently — any agent runtime that can carry a long system prompt + a YAML input can run them.

## The three prompts

One prompt per ArchiMate 3.2 layer:

| File | Layer | Extraction targets (canonical TYPEs in IDS §3.1) |
|---|---|---|
| [`01_motivation.md`](01_motivation.md) | Motivation | `DRIVER`, `GOAL`, `CONSTRAINT`, `REQUIREMENT` |
| [`02_business.md`](02_business.md) | Business | `ROLE`, `UNIT`, `EMPLOYEE`, `PROCESS`, `RULE`, `PRODUCT` |
| [`03_application.md`](03_application.md) | Application | `APPLICATION`, `INTEGRATION`, `BUSINESS_OBJECT` |

Each prompt carries the same eight sections: **Role**, **Inputs**, **Extraction target**, **Output schema** (with full YAML examples per TYPE), **Edge cases** (multilingual, uncertain, cross-layer hints, contradictions), **Anti-goals**, **See also**.

The `04_technology` layer is intentionally NOT covered in v1 — `acme_corp` has no technology-layer canon to extract toward yet. Adding the technology prompt is a follow-up once the technology layer is exercised.

## How the three prompts are used together

A typical extraction-batch run:

1. **Collect Field input.** The adopter has gathered raw material into the `field/` zone — interviews, surveys, observations, drafts. Each artefact carries the admission record (`zone: field`).
2. **Run each prompt over the input.** The same Field artefacts are fed independently to all three prompts. Each prompt extracts what belongs to its layer; material that belongs to a sibling layer surfaces in `cross_layer_hints:` so the sibling prompt picks it up.
3. **Collect drafts.** Each prompt run produces a list of draft canonical primitives. Drafts carry `admitted_to: pending` and cite the Field artefact in `derived_from:`.
4. **Human admission.** A human reviews each draft, applies the canon-zone admission gate (`uniqueness`, `consistency`, `completeness` per [CONTRACT §6](../../../../notations/CONTRACT.md#6-admission-record)), resolves contradictions surfaced in `extraction_notes`, links REQUIREMENTs to their codex sources where applicable, and either admits the draft (sets `admitted_at` + `admitted_by` + `gate_checks`) or rejects it.

The prompts deliberately do not see the current Canon state — extraction is **autonomous-batch**, not incremental. This is cheap *because* Canon starts empty; incremental extraction over an in-use Canon has different economics and is the concern of a separate, future epic.

## Inputs in practice

Every Field artefact carries the admission record at its top. The body — the content the extraction agent reads — lives in a type-specific block:

| Field TYPE | Content block |
|---|---|
| `INTERVIEW` | `notes:` (free-text transcript or notes) |
| `SURVEY` | `responses:` (structured or free-text answers) |
| `OBSERVATION` | `observations:` (what was directly observed) |
| `DRAFT` | `content:` (working draft awaiting admission) |

See [`fixtures/`](fixtures/) for a worked Field artefact + the kind of draft primitives it yields.

## Outputs in practice

Every draft primitive carries:

- A canonical ID (`<TYPE>-[<middle>-]<INTEGER>` from [IDS §1](../../../../notations/IDS_AND_REFERENCES.md#1-grammar), with full TYPE prefixes — no legacy abbreviations).
- `derived_from: [<FIELD-ARTEFACT-ID>]` citing the Field source, except on `REQUIREMENT`: omit `derived_from` (Field stays in `field/`; `REQ-003` rejects Field TYPEs). A human may add a permitted codex TYPE (`LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` / `PRINCIPLE`) at admission if one is also a source of authority.
- An admission record with `admitted_to: pending` / `gate_checks: pending` — the human gate completes these.
- `valid_from` / `valid_to` per the primitive lifecycle ([CONTRACT §7](../../../../notations/CONTRACT.md#7-primitive-lifecycle)).
- `confidence: high | medium | low` and `extraction_notes:` documenting ambiguities, contradictions, or judgement calls.

## Smoke test

The [`fixtures/`](fixtures/) folder ships an English-language fake INTERVIEW. Running `01_motivation.md` over it should produce a sensible draft set of DRIVERs / GOALs / CONSTRAINTs / REQUIREMENTs. The fixture is the smoke check that the prompt is internally consistent — if the prompt evolves and the fixture's expected outputs no longer make sense, the prompt is broken (or the fixture is stale).

Running `02_business.md` and `03_application.md` over the same fixture exercises `cross_layer_hints:` — the fixture contains material that surfaces as hints across all three layers.

## See also

- Three-zone model and the admission record: [`notations/CONTRACT.md`](../../../../notations/CONTRACT.md) §5–6.
- Field TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../notations/IDS_AND_REFERENCES.md) §3.4.
- The onboarding Skill bundle this extraction folder sits inside: [`../README.md`](../README.md).
