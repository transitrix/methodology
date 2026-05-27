# `field/` — Field zone

Raw, unprocessed material gathered about the organisation. The zone model is defined in the methodology canon, `notations/CONTRACT.md` §5.

**Trust contract:** contradictions are allowed; provenance is the point. Field artefacts are **not** authoritative and are never edited into canon. A Canon record may *cite* the Field material behind it via `derived_from:` — a citation, not a migration (`CONTRACT.md` §6).

Each artefact carries the admission record (`zone: field`, `admitted_at`, `admitted_by`, `gate_checks: { provenance: … }`) and is one `<ID>.yaml` per file, named by its canonical ID.

| Folder | Holds | ID TYPE |
|---|---|---|
| `interviews/` | recorded interviews and their notes | `INTERVIEW` |
| `surveys/` | survey instruments and responses | `SURVEY` |
| `observations/` | direct observations of work, systems, or events | `OBSERVATION` |
| `drafts/` | working drafts not yet admitted to canon | `DRAFT` |

TYPE registry: the methodology's `notations/IDS_AND_REFERENCES.md` §3.4.
