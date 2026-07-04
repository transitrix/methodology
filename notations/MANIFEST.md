---
title: "Adopter manifest — transitrix.yaml"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-05-27"
status: "draft"
---

# Adopter Manifest — `transitrix.yaml`

**Scope:** The top-level manifest an adopting repository carries to declare which methodology release it conforms to, which notations it uses, and which zones it maintains. One file per adopter repository, at the repository root.

Adopters do **not** vendor a copy of `notations/` into their repo — they pin a methodology version here and follow the published specs at that version. The zone model the `zones:` field refers to is defined in [CONTRACT.md](CONTRACT.md) §5.

---

## 1. Location

| Adopter case | Repo root | Manifest path |
|---|---|---|
| Single legal entity | `[org]/` | `[org]/transitrix.yaml` |
| Holding (multiple entities) | `organizations/` | `organizations/transitrix.yaml`, with `_shared/` for group-level codex / field |

A worked example lives at `transitrix.yaml` in the [acme-corp reference repo](https://github.com/transitrix/acme-corp).

---

## 2. Structure

```yaml
transitrix: 1                       # manifest schema version (integer)
methodology_version: "0.7.0"        # the methodology release this repo conforms to
notations: [dgca, goals, activities, capability-map, codex]
zones: [canon, field, codex]
coverage_profile: full              # optional — see COVERAGE_PROFILES.md
confidence_decay:                   # optional — per-TYPE freshness decay; see CONTRACT.md §11.3
  defaults: { fresh_days: 180, stale_days: 730, floor: 0.3 }
operating_parameters:               # optional — org-wide operating defaults
  default_scan_frequency: P30D      # ISO 8601 duration; default REGISTRY row cadence
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `transitrix` | yes | integer | Manifest schema version. `1` today. Identifies the file as a Transitrix adopter manifest. |
| `methodology_version` | yes | string | The methodology release this repository pins to. Adopters follow the published specs at this version rather than vendoring `notations/`. |
| `notations` | yes | list | Short names of the notations the repository uses, from the catalogue in [README.md](README.md) — plus `codex` for the codex zone (see [14-codex.md](elements/14-codex.md)). |
| `zones` | yes | list | Which zones the repository maintains — any subset of `canon`, `field`, `codex`. A repo MAY start canon-only and add `field` / `codex` later. |
| `coverage_profile` | no | string \| map | Which slice of the methodology's vocabulary is in scope for this repo. Short form: a shipped preset name (`minimal` / `core` / `full`). Long form: a custom profile that extends a preset. Defaults to `full` when omitted. Full schema, presets, closure rule, and validation in [COVERAGE_PROFILES.md](COVERAGE_PROFILES.md). |
| `confidence_decay` | no | map | Per-element-TYPE freshness-decay parameters (`fresh_days`, `stale_days`, `floor`) used by confidence scoring. A `defaults` sub-map applies to any TYPE not listed under `by_type`. Defined in [CONTRACT.md](CONTRACT.md) §11.3. Omitted ⇒ the §11.3 defaults apply. |
| `operating_parameters` | no | map | Org-wide defaults for automated operating activities. v1 carries `default_scan_frequency` (ISO 8601 duration) — the fallback scan cadence for `REGISTRY` rows that declare no `scan_frequency` and whose registry sets no `default_scan_frequency` ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.19). Additive — further operating defaults may be added here as automated activities are modelled. |

No validator enforces the manifest yet; it is declarative. Tooling MAY read it to discover the pinned methodology version and the active notations and zones.

---

## 3. References

- Zone model and admission record: [CONTRACT.md](CONTRACT.md) §5–6.
- Notation catalogue (short names): [README.md](README.md).
- Codex zone: [14-codex.md](elements/14-codex.md).
- Coverage Profile (the `coverage_profile:` field): [COVERAGE_PROFILES.md](COVERAGE_PROFILES.md).
- Confidence and freshness (the `confidence_decay:` field): [CONTRACT.md](CONTRACT.md) §11.
