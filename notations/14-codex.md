---
title: "Codex — external & internal authority artefacts"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-27"
status: "draft"
---

# Codex Notation — Reference

**Scope:** The **Codex** zone — external constraints (laws, regulations) and internal authority documents (policies, standards) that are *given to* the organisation rather than authored by it. The three-zone model and the shared admission record are defined in [CONTRACT.md](CONTRACT.md) §5–6.

Codex artefacts are **zone primitives**, not view documents: each artefact is a single YAML file named by its ID (`<TYPE>-…-<INTEGER>.yaml`, per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md)). They are not `.transitrix.yaml` notation files and carry no `notation:` header; instead they carry the shared admission record ([CONTRACT.md](CONTRACT.md) §6, with `zone: codex`) plus the codex-specific frontmatter below.

---

## 1. Structure: external vs internal

The codex zone is split at the folder level:

```
codex/
  external/          # given to the org by outside authorities
    <jurisdiction>/  # ISO 3166-1 alpha-2, or `eu` / `intl`
  internal/          # issued by the org itself
```

- **`external/`** — laws and regulations, sub-foldered by **jurisdiction** because a distributed organisation operates under multiple legal regimes that bind different processes differently.
- **`internal/`** — policies and internal standards the organisation issues to itself. Not foldered by country.

### 1.1 Jurisdiction codes

External codex artefacts live under a jurisdiction folder:

| Code | Meaning |
|---|---|
| ISO 3166-1 alpha-2 (`ge`, `de`, `ru`, …) | a single country's legal regime |
| `eu` | EU-wide law applying across member states |
| `intl` | supranational bodies (UN, etc.) — **reserved; no content in v1** |

The folder an external artefact sits in MUST match its `jurisdiction:` frontmatter (rule `CODEX-001`).

---

## 2. Codex TYPEs

| TYPE | Sub-zone | What it is |
|---|---|---|
| `LAW` | external | a statute or act binding the organisation |
| `REGULATION` | external | a regulation issued under a law |
| `POLICY` | internal | an internal policy the organisation issues |
| `INTERNAL_STANDARD` | internal | an internal standard or convention |

Registered in [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.5; IDs follow the canonical grammar (`LAW-PERSONAL-DATA-2017-1`, `INTERNAL_STANDARD-coding-conventions-1`, …).

---

## 3. Frontmatter — external codex artefacts

Carries the admission record ([CONTRACT.md](CONTRACT.md) §6, `zone: codex`, `gate_checks.source_authority`) plus:

```yaml
id: LAW-PERSONAL-DATA-2017-1
name: "Law of Georgia on Personal Data Protection"
type: LAW                       # LAW | REGULATION
zone: codex
admitted_at: "2026-05-27"
admitted_by: "v.korobeinikov"
gate_checks:
  source_authority: "Legislative Herald of Georgia"
jurisdiction: ge                # MUST match the parent folder (CODEX-001)
effective_date: "2017-05-01"
applies_to:
  entities:                     # typed IDs of org entities the artefact binds
    - APPLICATION-CRM-1
  processes:                    # typed IDs of processes the artefact binds
    - PROCESS-CUST-ONBOARD-1
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `jurisdiction` | yes | string | ISO 3166-1 alpha-2, `eu`, or `intl`. MUST equal the parent folder name. |
| `effective_date` | yes | string | Date the artefact takes effect — quoted ISO 8601 ([CONTRACT.md](CONTRACT.md) §4). |
| `applies_to` | yes | map | Sub-map with `entities:` and `processes:` — lists of typed IDs the artefact binds. A single artefact MAY apply to many entities and many processes; that is how one law's effect across different processes (and, via several artefacts, different countries) is encoded. |

---

## 4. Frontmatter — internal codex artefacts

```yaml
id: INTERNAL_STANDARD-coding-conventions-1
name: "Engineering Coding Conventions"
type: INTERNAL_STANDARD         # POLICY | INTERNAL_STANDARD
zone: codex
admitted_at: "2026-05-27"
admitted_by: "v.korobeinikov"
gate_checks:
  source_authority: "VP Engineering"
issuing_authority: "VP Engineering"
effective_date: "2026-01-01"
applies_to:
  entities:
    - APPLICATION-CRM-1
  processes: []
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `issuing_authority` | yes | string | The internal body or role that issued the artefact. |
| `effective_date` | yes | string | Date the artefact takes effect — quoted ISO 8601. |
| `applies_to` | yes | map | `entities:` and `processes:` lists of typed IDs the artefact binds. |

Internal artefacts have no `jurisdiction` and are not foldered by country.

---

## 5. File location and naming

```
codex/external/<jurisdiction>/<ID>.yaml
codex/internal/<ID>.yaml
```

One artefact per file, named by its canonical ID. Examples:

- `codex/external/ge/LAW-PERSONAL-DATA-2017-1.yaml`
- `codex/external/eu/REGULATION-GDPR-2016-1.yaml`
- `codex/internal/INTERNAL_STANDARD-coding-conventions-1.yaml`

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `CODEX-001` | error | An external artefact's `jurisdiction:` does not match its parent folder name under `codex/external/<jurisdiction>/`. |
| `CODEX-002` | error | Required frontmatter missing. External needs `jurisdiction` + `effective_date` + `applies_to`; internal needs `issuing_authority` + `effective_date` + `applies_to`. All codex artefacts also carry the admission record ([CONTRACT.md](CONTRACT.md) §6). |
| `CODEX-003` | error | An `applies_to.entities[]` or `applies_to.processes[]` value is not a well-formed typed ID, or — when the validator has the canon catalogue loaded — does not resolve to a defined element. Codex binds canon, so resolution against canon is in scope here (unlike the strategy-chain notations, which defer cross-document existence checks). |

---

## 7. References

- Zone model and admission record: [CONTRACT.md](CONTRACT.md) §5–6.
- Codex TYPE registry and uniqueness scope: [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.5, §4.
- Which zones and notations an adopter uses is declared in the `transitrix.yaml` manifest.
