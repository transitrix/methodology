# Notation contract — shared header rules

All eleven Transitrix notations share the same file-header contract: the same required field, the same reserved field, the same validator rules, and the same extension/content match guarantee. This document defines those shared rules once. Each notation spec links here and lists only its per-notation values (the `notation:` short name and the file extension).

This document also defines three organisation-level contracts shared across all notations: the **zone model** (§5), the **admission record** (§6), and the **primitive lifecycle** (§7) that every organisation artefact carries.

A change to the rules below applies to all eleven notations simultaneously — they should be edited here, not duplicated into each spec.

---

## 1. Required header

Every Transitrix notation file MUST start with a header that declares which notation the file follows. The header is YAML key/value syntax at the top of the file — for every notation in the family, the file itself is YAML and the header is the document's leading keys.

```yaml
notation: <short-name>      # required; this notation's short name
spec_version: "0.1"         # optional today; reserved field; will be required when this notation reaches v1.0
# … rest of the document
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Short name of the notation (`bpmn`, `fgca`, `goals`, `capability-map`, …). Identifies the schema the rest of the document follows. The accepted short names are listed in [README.md](README.md). |
| `spec_version` | no, accepted | string | Declared version of the notation spec the document conforms to. Reserved today; will become required when each notation reaches v1.0. The validator accepts but does not enforce it. |

The short name is fixed per notation and matches the per-notation table at the bottom of the spec being read.

---

## 2. Validator behaviour

Every notation's compiler / validator enforces the same four header rules:

| Rule | Severity | Description |
|---|---|---|
| `HDR-001` | error | Missing `notation` field. |
| `HDR-002` | error | `notation` value does not match the short name expected for this notation. The file is probably in the wrong format for its extension. |
| `HDR-003` | error | File extension does not match the `notation` declared inside the file (extension/content mismatch). |
| `HDR-004` | accepted | `spec_version` is accepted but not enforced until the notation reaches v1.0. |

Additional notation-specific rules (per-field, semantic, structural) live in the respective spec's "Validation rules" section.

---

## 3. Extension / content match

Each notation has exactly one canonical file extension, of the form `.<short-name>.transitrix.yaml`. The validator rejects any file whose extension and `notation:` value disagree (rule `HDR-003`).

No aliases are accepted: one notation has exactly one extension. The full per-notation mapping lives in [README.md](README.md).

---

## 4. Date format

All date-typed fields across the Transitrix notations MUST be quoted ISO 8601 strings in `YYYY-MM-DD` form (e.g., `"2026-06-01"`). Unquoted `2026-06-01` is parsed by YAML 1.1 loaders as a native date type and is **not** accepted as the canonical form. Quote dates explicitly.

Which fields are date-typed is defined per notation — the shared header `date:`, plus fields such as activity `start_date` / `end_date` and `project.start_date` / `project.calendar.holidays[]`, capability `assessment_date` / `target_date`, issue `created_at` / `resolved_at` / `updated_at`, and application / product `updated_at`. The quoting rule above applies to every one of them; specs reference this section rather than restating it.

---

## 5. Zones

A modelled organisation accumulates three kinds of knowledge with different trust contracts. Every artefact under an organisation belongs to exactly one **zone**, declared by a `zone:` field in its admission record (§6).

| Zone | What it holds | Trust contract |
|---|---|---|
| `canon` | Validated truth about the organisation — what it officially asserts about itself (its elements and views). | Internally consistent and unique; the authoritative model. |
| `field` | Raw, unprocessed material — interviews, surveys, observations, drafts. | Contradictions allowed; provenance is the point. Not authoritative. |
| `codex` | External constraints (laws, regulations) and internal authority documents (policies, standards) — *given to* the organisation rather than authored by it. | Faithful to an external or issuing source; not edited to fit the model. |

**Zones are parallel, not stacked.** There is no hierarchy and no numeric ordering between them — `canon/`, `field/`, and `codex/` sit side by side under an organisation, never as `1_canon/`, `2_field/`.

**Data is not migrated between zones.** Each zone has its own admission gate (§6); an artefact admitted to one zone is never moved to another. A Canon record MAY *cite* the Field material that informed it via `derived_from:` (§6) — that citation is the link, not a migration. Re-deriving Canon from Field yields a *new* Canon artefact; the Field artefact stays where it is.

---

## 6. Admission record

Each zone has an **admission gate**: before an artefact enters a zone it is validated, transformed into the zone's canonical form, and tagged. Admission leaves a record in the artefact's frontmatter, so the gate that admitted it is auditable.

```yaml
zone: canon                 # canon | field | codex — required
admitted_at: "2026-05-27"   # quoted ISO 8601 date (§4)
admitted_by: "v.korobeinikov"   # person handle or tool ID that ran the gate
gate_checks:                # sub-map keyed by check name → outcome
  uniqueness: pass
  consistency: pass
  completeness: pass
derived_from:               # optional; typed IDs of the artefacts this one derives from
  - INTERVIEW-cfo-onboarding-2026-04-15-1
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `zone` | yes | string | The zone this artefact belongs to: `canon`, `field`, or `codex`. |
| `admitted_at` | yes | string | Date the artefact was admitted to its zone — quoted ISO 8601 per §4. |
| `admitted_by` | yes | string | The person handle or tool identifier that ran the admission gate. |
| `gate_checks` | yes | map | Sub-map keyed by check name; each value records the outcome (`pass`, or a short note). The standard checks per zone are listed below. |
| `derived_from` | no | list | Typed IDs (per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md)) of the artefacts this one was derived from. This is how a Canon record cites the Field material behind it (§5) — a citation, never a migration. |

**Standard `gate_checks` per zone** — the minimum each zone's gate asserts:

| Zone | Standard checks | Meaning |
|---|---|---|
| `canon` | `uniqueness`, `consistency`, `completeness` | IDs unique within the catalogue; no contradiction with existing canon; required fields present. |
| `field` | `provenance` | The source of the material is recorded — who, when, and in what setting. |
| `codex` | `source_authority` | The issuing or authoritative source is identified and the artefact is faithful to it. |

A zone MAY record additional checks beyond its standard set; codex artefacts additionally carry zone-specific frontmatter defined in the codex notation spec.

---

## 7. Primitive lifecycle

Transitrix shows the organisation *in motion* — what existed when, what changed, what's gone. Every canonical element therefore carries a lifecycle in its frontmatter: when it became valid, and when it stopped (or `null` if still in effect).

```yaml
valid_from: "2026-05-27"    # quoted ISO 8601 date (§4) — when the element took effect
valid_to: null              # quoted ISO 8601 date or null — when the element ended (null = still in effect)
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `valid_from` | yes | string | Date the element took effect — quoted ISO 8601 per §4. |
| `valid_to` | yes | string \| null | Date the element ceased to be in effect — quoted ISO 8601 per §4, or `null`. `null` means the element is currently in effect. |

The lifecycle frontmatter sits alongside the admission record (§6); the two are distinct. Admission records *when an artefact entered its zone* (a one-time gate event); lifecycle records *when the element it represents is in effect* (a temporal property of the modelled thing, independent of when it was admitted). An artefact admitted today may legitimately carry `valid_from` years in the past — the organisation is recording history.

### 7.1 Where it applies

The lifecycle contract applies to every **canonical element** — each individual primitive the organisation asserts. For element-primitive files (one element per file, under `canon/elements/<NN>_<layer>/`), the lifecycle fields sit in the file's frontmatter. For view documents that define elements inline (capability-map, FGCA, applications catalogue, …), each inline element entry carries its own `valid_from` / `valid_to`. The view document itself does not carry a lifecycle — it is a view, not an element.

Each notation spec lists which of its top-level entries are elements (and therefore lifecycle-bearing) versus document-level metadata (and therefore not). Per-notation specs reference this section rather than restating the rule.

### 7.2 Versioned attributes — not in v1

Attributes that *change over time within* a primitive's lifecycle (a capability's maturity level, a unit's headcount) are a separate concern, handled by the **versioned-attribute sidecar** planned for Wave 2 of the temporal model. v1 covers only the primitive's overall `valid_from` / `valid_to`; the inline form of time-varying attributes is unchanged until Wave 2 lands.

### 7.3 Validation rules

Every notation's validator enforces the same four lifecycle rules:

| Rule | Severity | Description |
|---|---|---|
| `LIFECYCLE-001` | error | `valid_from` missing or not a parseable quoted ISO 8601 date. |
| `LIFECYCLE-002` | error | `valid_to` is present, is not `null`, and is not a parseable quoted ISO 8601 date. |
| `LIFECYCLE-003` | error | `valid_to` is a date earlier than `valid_from`. |
| `LIFECYCLE-004` | warning | A cross-reference resolves to a primitive whose `valid_to` is earlier than the referring primitive's `valid_from` — the referenced primitive had already ended before the referrer began (a dangling temporal reference). A per-notation spec MAY downgrade this to `info` for relation kinds where a stale reference is expected (e.g. an Issue that explicitly references a retired component). |

### 7.4 Migration

The lifecycle fields are required on every canonical primitive once a notation spec is updated to reference this section. Existing canonical files in adopter repositories backfill: `valid_from` = the file's `last_updated` (or, if absent, a sensible organisation-chosen epoch); `valid_to: null`. A mechanical sweep — no manual decision per file is needed.

### 7.5 Out of scope (v1)

- **Bitemporality.** No separate `transaction_time` vs `valid_time`. v1 records what is true *now* about what was true *then*; back-dating corrections rewrite the file via git, and the git history is the audit trail.
- **Branching timelines.** Alternative futures are the concern of the Scenarios notation (`notations/11-scenarios.md`), not of the primitive lifecycle.
- **Sub-day precision.** ISO 8601 date precision only; no timestamps, no timezones in canon. "Today" is the date of the query or render.
- **First-class time-aware relations.** Promoting relations like `parent` / `applies_to` / activity→goal to first-class lifecycle-bearing files is planned for Wave 3 of the temporal model. In v1 such relations remain inline and timeless on their host primitive.
