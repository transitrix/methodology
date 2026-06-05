# Architecture Decision Records — methodology

Repo-local ADRs for the `methodology` repository. Cross-project decisions (affecting ≥2 repos via the strategy hub) live in `vkgeorgia/strategy` under `Architecture/`; the records here are local to methodology — they own notation semantics that other Transitrix repos consume.

Format: dated `YYYY-MM-DD-slug.md`, front-matter (`status`, `date`, `scope`, `supersedes`, `superseded_by`, `tags`), body Context → Decision → Alternatives → Consequences. See `vkgeorgia/strategy` `Architecture/README.md` for the procedure.

| Date | ADR | Status | Scope |
|---|---|---|---|
| 2026-06-05 | [Data quality — source trust, freshness decay, view composite confidence](./2026-06-05-data-quality-source-trust-and-freshness.md) | Accepted | methodology (consumed by DSM, Studio) |
