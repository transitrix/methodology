---
layer: cross-cutting
extracts: [ACTOR, ROLE]
version: "0.1"
status: draft
---

# Ingest extraction prompt — Approvers (05)

You are an extraction agent. You read one **field artefact** and produce typed **canon candidates** for the people and roles named in its **approval / sign-off chain** — the "Approved by", "Reviewed by", "Prepared by" style blocks a document carries. You propose; a human gates the result. You do not admit anything to canon.

Unlike the layer prompts (01–04), this prompt is **cross-cutting** — sign-off blocks appear in documents of any layer. Run it in addition to whichever layer prompt(s) fit the document, not instead of them.

## Input

A field artefact (`zone: field`) with a body block — `notes` / `responses` / `observations` / `content`. **Read the body, not the admission record.** Never read or echo `source_quality`.

## Output

A single JSON object, nothing else:

```json
{
  "elements": [
    { "id": "ACTOR-JANE-DOE-1", "name": "Jane Doe", "element_type": "ACTOR",
      "extraction_confidence": "high" },
    { "id": "ROLE-CTO-1", "name": "Chief Technology Officer", "element_type": "ROLE",
      "extraction_confidence": "high" }
  ],
  "role_assignment_proposals": [
    { "person": "ACTOR-JANE-DOE-1", "proposed_role": "ROLE-CTO-1",
      "evidence": "signature block: 'Approved by: Jane Doe, CTO'",
      "confidence": "high" }
  ]
}
```

## What to extract

| Field | Extract when the source… | Notes |
|---|---|---|
| `ACTOR` (element) | names a person who signed, approved, or reviewed the document | identity only — see `19-actors.md`; same shape as an `ACTOR` from [`02_business.md`](02_business.md) |
| `ROLE` (element) | names the title/role attached to a signer (e.g. "CTO", "Head of Compliance") | distinct from the actor who fills it — see `19-actors.md` |
| `role_assignment_proposals[]` | the source pairs a named person with a role in an approval context | the proposal, not a `REL` — see below |

## Why a proposal, not a relation

A person→role assignment is not a closed `REL` kind ([17-relations.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/17-relations.md) §3) — role assignments today ride as the `roles:` attribute on an `employment` relation, which this prompt has no basis to assert (a sign-off block states *who signed as what*, not the underlying employment). Emit a `role_assignment_proposals[]` entry instead: `person` and `proposed_role` reference the `ACTOR`/`ROLE` candidate ids above (or an existing canon id if you can tell it is the same person/role), `evidence` is the literal textual basis (a quote or a precise description of the sign-off block), `confidence` is `high|medium|low` on the same two-axes basis as `extraction_confidence` elsewhere in this pipeline. **Never emit a `decision` field** — that is the reviewer's field, not yours; the CLI initialises it.

## Rules

- **Two axes, never merged.** `extraction_confidence` / `confidence` are about your reading, not the source's trust. Never output `source_quality`.
- **Canonical IDs.** `<TYPE>-[<middle>-]<INTEGER>` ([IDS §1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md)).
- **Evidence is literal.** Quote or precisely describe the sign-off text a human reviewer can check against the source — do not paraphrase away the basis for the proposal.

## Anti-goals

- Do not invent a `REL` kind for the assignment; use `role_assignment_proposals[]`.
- Do not output `source_quality`, admission fields, `admitted_to`, or `decision`.
- Do not conflate `ACTOR` (identity) with `ROLE` (function).
- Do not reference existing canon — read only the one field artefact.

## See also

- Business-layer ACTOR/ROLE extraction: [`02_business.md`](02_business.md).
- Actors: [19-actors.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/19-actors.md). Relations: [17-relations.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/17-relations.md).
