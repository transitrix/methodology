---
notation: "Glossary"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-10"
status: "draft"
file_extension: "*.glossary.transitrix.yaml"
dsm_status: "planned"
---

# Glossary Notation — Reference

**Scope:** Report-config view over the whole catalogue — projects `name` + `aliases[]` + `description` for every admitted element, whatever TYPE it is, into one flat, alphabetised lookup surface. No entry is defined inline in this document — it is a projection configuration, not an authoring surface (the reconstruction invariant, [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1).
**Renderer:** Transitrix Studio — glossary panel (planned); Transitrix DSM — planned.

---

## File header

Header rules — required `notation:` field, `spec_version:` semantics, validator behaviour, extension/content match — are shared across all Transitrix notations and defined in [CONTRACT.md](../../CONTRACT.md). This notation's per-notation values:

| Field | Value |
|---|---|
| `notation:` value | `glossary` |
| File extension | `*.glossary.transitrix.yaml` |

---

## 1. Overview

A Glossary document configures a single projection over the **entire admitted catalogue**, not one element TYPE: every element under `canon/elements/` contributes one entry — `name`, `aliases[]`, `description` — regardless of which TYPE it is. Two provenances feed it, and the renderer does not distinguish between them in the output shape:

- **`TERM`** elements ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.30) — business-layer vocabulary with no modelled behaviour of its own: industry terms, abbreviations, words used in a particular sense.
- **Every other TYPE** — a `BUSINESS_OBJECT`, a `CAPABILITY`, an `APPLICATION`, … — whatever the organisation has already modelled, read for its `name` / `aliases[]` / `description` alone.

An entry from either provenance renders **indistinguishable in shape**: `name`, its `aliases[]` (if any), and `description`. This is deliberate — the glossary is a lookup surface, not a catalogue browser; a reader (or the document engine resolving a token) does not need to know or care which TYPE backs a definition, only that the definition exists and is singular (the `ELEM-ALIAS-001` extension at [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.30/§9 is what guarantees singularity — a `TERM` restating an existing entry never reaches canon, so the glossary never carries two entries competing for one name).

**Two purposes:**

- **The single lookup surface for the document engine** — a token resolves to a definition without the renderer knowing which kind of element it hit ([document-view engine](../../PACKAGES.md), token resolution).
- **The readable glossary for onboarding** — a flat, alphabetised reference a new reader can scan cover to cover.

---

## 2. When to use

| Use case | Notation |
|---|---|
| One flat, alphabetised name → definition lookup across the whole catalogue | Glossary |
| Feed the document engine's token resolution | Glossary |
| Show a hierarchy, matrix, or filtered subset of one element TYPE | The TYPE's own diagram/report view (e.g. [23-actions-tree.md](23-actions-tree.md) for `ACTION`) |
| Define a new business-layer term with no modelled behaviour | Author a `TERM` element ([ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.30) — the glossary picks it up automatically at render time |

---

## 3. File location and naming

Per the named view-config convention ([REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) §2):

```
<repo-root>/canon/views/glossary/<NAME>.glossary.transitrix.yaml
```

Examples:
- `canon/views/glossary/full.glossary.transitrix.yaml`
- `canon/views/glossary/business-layer.glossary.transitrix.yaml`

---

## 4. Document structure

```yaml
notation: glossary
spec_version: "0.1"

id: GLOSSARY-FULL-1
name: "Full Glossary"
description: "Every named element across the catalogue, alphabetised."

view_config:
  scope:
    types: []                 # ELEMENT TYPEs to include; omit or [] = every TYPE
  display:
    group_by: "first_letter"  # "first_letter" | "none" — see §5.2
    show_type_badge: true     # show the source TYPE next to each entry
```

Every field beyond the required envelope (`notation:`, `id:`, `name:`) has an explicit default (§5) — a minimal document with just those three fields renders the full catalogue, alphabetised, with type badges shown, per the zero-configuration-default convention ([REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md) §6).

---

## 5. Fields

### Document root

| Field | Required | Description |
|---|---|---|
| `notation` | yes | MUST equal `glossary` (per [CONTRACT.md](../../CONTRACT.md) §3). |
| `spec_version` | no | reserved field per the shared contract |
| `id` | yes | document ID — `GLOSSARY-[<middle>-]<INTEGER>` per the canonical ID grammar ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1) |
| `name` | yes | human-readable name for this glossary document |
| `description` | no | one-paragraph context |
| `view_config` | no | rendering configuration — see §5.1 / §5.2 |

### 5.1 `view_config.scope`

| Field | Required | Default | Description |
|---|---|---|---|
| `types` | no | `[]` (every TYPE) | List of element TYPEs to include (e.g. `[TERM, BUSINESS_OBJECT]`). When present and non-empty, only elements of the listed TYPEs contribute entries. Omit or leave empty to include every element in the catalogue that carries a `name`. |

### 5.2 `view_config.display`

| Field | Required | Default | Description |
|---|---|---|---|
| `group_by` | no | `first_letter` | `first_letter` groups entries under an A–Z rail; `none` renders one flat alphabetised list. |
| `show_type_badge` | no | `true` | Show the source element TYPE next to each entry (e.g. `TERM`, `BUSINESS_OBJECT`). Set `false` for a pure dictionary reading with no provenance shown. |

---

## 6. Entry shape

Each glossary entry, regardless of source TYPE:

| Field | Source | Notes |
|---|---|---|
| Name | `<element>.name` | The heading. |
| Also known as | `<element>.aliases[]` | Rendered as a secondary line under the name, when present. |
| Definition | `<element>.description` | The body text. An element with no `description` contributes no entry (nothing to define). |
| Type badge | `<element>` TYPE | Shown when `show_type_badge: true`. |

Entries are sorted alphabetically by `name` (case-insensitive), independent of TYPE, layer, or admission order. Two entries alphabetically adjacent may come from any two TYPEs — the renderer never groups by TYPE unless a future revision adds that as an explicit `group_by` value.

---

## 7. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `GLOS-001` | error | `notation` missing or not equal to `glossary`. |
| `GLOS-002` | error | `id` missing or not matching `GLOSSARY-[<middle>-]<INTEGER>`. |
| `GLOS-003` | error | `name` missing or empty. |
| `GLOS-004` | warning | `view_config.scope.types[]` references a value that is not a TYPE in the element registry ([IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.1). |

The shared header rules (`HDR-001..004`, [CONTRACT.md](../../CONTRACT.md) §2) apply to glossary documents.

Glossary documents do **not** carry an admission record or primitive lifecycle — they are view configuration, not canon primitives.

---

## 8. References

- `TERM` element schema and the boundary rule against restating a modelled object: [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §7.30.
- Cross-catalogue name/alias uniqueness gate (`ELEM-ALIAS-001`, extended for `TERM`): [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §9.
- Named view-config convention (location, naming, listing, re-running): [REPORT_VIEW_CONFIG.md](../REPORT_VIEW_CONFIG.md).
- Reconstruction invariant — why a view document carries no canonical content of its own: [ELEMENT_PRIMITIVES.md](../../ELEMENT_PRIMITIVES.md) §1.1.
- ID grammar: [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §1.
- View-level TYPE registry (`GLOSSARY`): [IDS_AND_REFERENCES.md](../../IDS_AND_REFERENCES.md) §3.2.
