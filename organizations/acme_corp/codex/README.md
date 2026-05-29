# `codex/` — Codex zone

External constraints (laws, regulations) and internal authority documents (policies, standards) — *given to* the organisation rather than authored by it. Zone model: the methodology's `notations/CONTRACT.md` §5; artefact schema: `notations/elements/14-codex.md`.

**Trust contract:** faithful to an external or issuing source; not edited to fit the model. Each artefact carries the admission record (`zone: codex`, `gate_checks: { source_authority: … }`) plus the codex frontmatter, and is one `<ID>.yaml` per file.

```
codex/
  external/        # laws & regulations, sub-foldered by jurisdiction
    ge/ de/ eu/    # ISO 3166-1 alpha-2, plus `eu` (EU-wide); `intl` reserved
  internal/        # policies & internal standards the org issues
```

TYPE registry: `notations/IDS_AND_REFERENCES.md` §3.5 — `LAW`, `REGULATION` (external); `POLICY`, `INTERNAL_STANDARD` (internal).
