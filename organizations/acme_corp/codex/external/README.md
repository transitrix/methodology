# `codex/external/`

Laws and regulations binding the organisation, sub-foldered by **jurisdiction** (a distributed organisation operates under multiple legal regimes). Folder name = ISO 3166-1 alpha-2 code, plus `eu` for EU-wide and `intl` (reserved) for supranational bodies.

An external artefact's `jurisdiction:` frontmatter MUST match its parent folder (`CODEX-001`). One `<ID>.yaml` per artefact (`LAW-…`, `REGULATION-…`). See `notations/elements/14-codex.md` for the frontmatter contract.
