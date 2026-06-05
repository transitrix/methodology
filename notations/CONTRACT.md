# Notation contract — shared header rules

All Transitrix notations share the same file-header contract: the same required field, the same reserved field, the same validator rules, and the same extension/content match guarantee. This document defines those shared rules once. Each notation spec links here and lists only its per-notation values (the `notation:` short name and the file extension).

This document also defines four organisation-level contracts shared across all notations: the **zone model** (§5), the **admission record** (§6), the **primitive lifecycle** (§7), and the **versioned-attribute sidecar** (§9) — the four shared shapes every organisation artefact may carry. §8 aggregates the validation rules of the compliance domain (REQUIREMENT + ASSERTION) for discoverability — the per-notation specs remain authoritative for the rule definitions themselves. §10 sets the **versioning and compatibility policy** for the methodology itself — what kind of change each SemVer bump may carry, and what adopters can rely on across releases.

A change to the rules below applies to all notations simultaneously — they should be edited here, not duplicated into each spec.

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
| `source_quality` | field zone: recommended | string | Authored trust in the *source* of the material, from the closed set `authoritative` / `corroborated` / `single_source` / `unverified` (§11.2). Part of the `field` zone's `provenance` contract (§5). Absent ⇒ downstream confidence scoring (§11) treats the source as `unverified`. Not meaningful on `canon` / `codex` artefacts. |

**Standard `gate_checks` per zone** — the minimum each zone's gate asserts:

| Zone | Standard checks | Meaning |
|---|---|---|
| `canon` | `uniqueness`, `consistency`, `completeness` | IDs unique within the catalogue; no contradiction with existing canon; required fields present. |
| `field` | `provenance` | The source of the material is recorded — who, when, in what setting, and at what trust (`source_quality`, §11.2). |
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

### 7.2 Versioned attributes — see §9

Attributes that *change over time within* a primitive's lifecycle (a capability's maturity level, an application's vendor) are a separate concern, handled by the **versioned-attribute sidecar** defined in [§9](#9-versioned-attributes). The primitive's own `valid_from` / `valid_to` mark the window the element is in effect; values that move inside that window live in `<primitive_id>.history.yaml`. A notation spec declares which of its fields are `time_varying` and therefore sidecar-bound.

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
- **Branching timelines.** Alternative futures are the concern of the Scenarios notation (`notations/views/11-scenarios.md`), not of the primitive lifecycle.
- **Sub-day precision.** ISO 8601 date precision only; no timestamps, no timezones in canon. "Today" is the date of the query or render.
- **First-class time-aware relations.** Promoting relations like `parent` / `applies_to` / activity→goal to first-class lifecycle-bearing files is planned for Wave 3 of the temporal model. In v1 such relations remain inline and timeless on their host primitive.

---

## 8. Compliance-domain rules

The compliance domain spans two notations — **`REQUIREMENT`** (motivation-layer element, [15-requirement.md](elements/15-requirement.md)) and **`ASSERTION`** (canon-zone primitive linking a requirement to a subject, [16-assertion.md](elements/16-assertion.md)). For discoverability, the validation rules for both are aggregated below in a single table. The per-notation specs remain the authoritative source for the rule definitions; this table is an index.

| Rule | Severity | Notation | Short description | Authoritative spec |
|---|---|---|---|---|
| `REQ-001` | error | REQUIREMENT | `id` grammar invalid, or any required field missing | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-002` | error | REQUIREMENT | `derived_from` references an ID that does not resolve | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-003` | error | REQUIREMENT | `derived_from` ID is not of TYPE `LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD` | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-COVERAGE-001` | warning | REQUIREMENT (cross-cutting) | REQUIREMENT has no ASSERTION targeting it — compliance gap | [15-requirement.md](elements/15-requirement.md) §4 |
| `ASSERT-001` | error | ASSERTION | a required field is missing, or `id` grammar invalid | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-002` | error | ASSERTION | `about` is missing, malformed, or resolves to a non-REQUIREMENT | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-003` | error | ASSERTION | `subject` does not resolve, or TYPE not in `{PRODUCT, PROCESS, CAPABILITY}` | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-004` | error | ASSERTION | a `realised_via` entry does not resolve | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-005` | error | ASSERTION | an `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-006` | error | ASSERTION | `status` not in the enum (`compliant` / `partial` / `non_compliant` / `under_review` / `n_a`) | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-007` | warning | ASSERTION | `evidence` is empty AND `status` is `compliant` or `partial` — undefended positive claim | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-008` | warning | ASSERTION | `next_review_at` is set and is in the past — assertion is stale | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-DEAD-LINK-001` | warning | ASSERTION (cross-cutting) | `subject` or `realised_via` references a primitive whose `valid_to` is in the past — bound to a currently-retired element | [16-assertion.md](elements/16-assertion.md) §5 |

In addition, the shared header rules (`HDR-001..004`, §2) and primitive-lifecycle rules (`LIFECYCLE-001..004`, §7.3) apply to REQUIREMENT and ASSERTION files as they do to every other canonical artefact.

The two `*-COVERAGE-001` / `*-DEAD-LINK-001` rules are **cross-cutting**: their checks span more than one file (a REQUIREMENT's coverage depends on the assertions catalogue; an ASSERTION's dead-link state depends on the lifecycle dates of the primitives it references). Notation-local rules check a single file in isolation; cross-cutting rules require the validator to be loaded with the full canon catalogue.

---

## 9. Versioned attributes

The primitive lifecycle (§7) records *when an element is in effect*. Some of an element's attributes change *within* its lifecycle — a capability's maturity level grows over years; a unit's headcount drifts month to month; an application's lifecycle stage moves planned → active → sunset. These time-varying attributes are NOT stored inline on the primitive — inlining loses the history. They live in a **sidecar file** dedicated to the primitive's history.

### 9.1 Sidecar file shape

For a primitive whose canonical file is `<primitive_id>.yaml`, time-varying attributes are recorded in a co-located sidecar:

```
<primitive_id>.yaml            # the primitive — stable fields only
<primitive_id>.history.yaml    # versioned attributes for the same primitive
```

The sidecar is a YAML document with this shape:

```yaml
target: CAPABILITY-V1.2         # required — canonical ID of the primitive this sidecar belongs to
attribute_versions:
  maturity_level:
    - { valid_from: "2024-01-01", value: 1 }
    - { valid_from: "2025-06-01", value: 2 }
    - { valid_from: "2026-09-15", value: 3 }
  responsible_role:
    - { valid_from: "2024-01-01", value: ROLE-OPS-1 }
    - { valid_from: "2026-04-01", value: null }     # gap marker — attribute unset from 2026-04-01 until next entry
    - { valid_from: "2026-07-01", value: ROLE-OPS-2 }
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `target` | yes | string | Canonical ID of the primitive this sidecar versions. MUST resolve to an admitted primitive in canon (`VERSIONED-001`). |
| `attribute_versions` | yes | map | Sub-map keyed by attribute name; each value is an ordered list of version entries. An attribute name MUST match a `time_varying` field declared in the primitive's notation spec (see §9.4). |
| `attribute_versions.<name>[].valid_from` | yes | string | Quoted ISO 8601 date per §4 — when this attribute value took effect. Within an attribute's array, every `valid_from` MUST be unique (`VERSIONED-002`); the array SHOULD be sorted ascending (`VERSIONED-003`). |
| `attribute_versions.<name>[].value` | yes | scalar \| null | The value at this date. `null` is a **gap marker** — the attribute is unset from this date until the next entry's `valid_from`. |

The sidecar does not carry an admission record of its own — it follows its target primitive. It does not carry its own `valid_from` / `valid_to` either — its temporal window is governed by `target.valid_from` and `target.valid_to`.

### 9.2 Current value resolution

For an attribute `<name>` on the primitive at the time of a query:

1. Filter `attribute_versions.<name>[]` to entries where `valid_from <= today` (or the query date).
2. Pick the entry with the **largest** `valid_from`.
3. If that entry's `value` is `null`, the attribute is currently unset; otherwise it is the entry's `value`.
4. If no entries satisfy `valid_from <= today`, the attribute has not yet taken its first value — treat as unset.

This rule means a gap marker (`value: null` row) makes the attribute *currently unset* until a later non-null entry's `valid_from` is reached.

### 9.3 Validation rules

| Rule | Severity | Description |
|---|---|---|
| `VERSIONED-001` | error | Sidecar `target` does not resolve to an admitted primitive in canon. |
| `VERSIONED-002` | error | Two or more entries within one attribute's array carry the same `valid_from`. The current-value resolution rule (§9.2) is ambiguous in this case. |
| `VERSIONED-003` | warning | An attribute's array is not sorted by `valid_from` ascending. Resolution (§9.2) does not require sortedness, but the convention does — the validator MAY auto-sort and emit this warning. |
| `VERSIONED-004` | error | A field declared `time_varying` in its notation spec is present inline on the primitive (it MUST be in the sidecar instead). The primitive may keep the field name reserved for documentation but MUST NOT carry an inline value. |
| `VERSIONED-005` | error | A version entry's `valid_from` falls outside `[target.valid_from, target.valid_to]`. A versioned attribute cannot take a value before the primitive existed or after it retired. |

The shared header (`HDR-001..004`, §2) and primitive-lifecycle (`LIFECYCLE-001..004`, §7.3) rules do **not** apply to sidecar files — sidecars are not notation documents and carry no `notation:` header. Their structural correctness is governed entirely by `VERSIONED-001..005`.

### 9.4 Declaring `time_varying` attributes per notation

A notation spec MAY declare specific attributes as `time_varying`. v1 candidate attributes (each landed in a subsequent Wave 2 PR per notation family):

| Notation | Candidate `time_varying` attributes |
|---|---|
| Capability map ([05-capability-map.md](views/05-capability-map.md)) | `maturity_level` (current/target), `responsible_role`, `target_date` |
| Applications catalogue ([10-applications.md](views/10-applications.md)) | `lifecycle_stage` (planned / active / sunset), `responsible_unit`, `vendor` (when an organisation switches vendors mid-life) |
| Organisational unit (future) | `headcount`, `head_role` |

Each notation's "Element lifecycle" or "Fields" section will, in a follow-up PR, mark its `time_varying` attributes and remove inline syntax for them. Adopters with existing inline values migrate by moving the value into a single-entry sidecar with `valid_from` set to the primitive's `valid_from`.

### 9.5 Out of scope (v1)

- **Sub-day precision.** Same as §7.5 — ISO 8601 date only; no timestamps.
- **Versioning relations, not attributes.** The sidecar is a shape for *attributes* (scalar fields of an element). Versioning relations (`parent`, cross-references) is the concern of Wave 3 — first-class time-aware relation files — not Wave 2.
- **Versioning the lifecycle itself.** `valid_from` / `valid_to` on the primitive are not versionable. To change a primitive's lifecycle, rewrite the file via git; the git history is the audit trail.
- **Auto-derived rollups.** Cross-attribute computations (e.g. "average maturity over Q3 2026") are query-time concerns of the renderer / DSM, not of the sidecar schema.

### 9.6 Operating-state sidecars vs versioned-attribute sidecars

§9.1–§9.5 define the **versioned-attribute sidecar** (`<id>.history.yaml`): a git-tracked record of how an element's *business attributes* changed over time — maturity, vendor, owning role — each a value with a `valid_from`. It is part of the audit trail of canon; a human authors it.

A distinct need arises when an element drives an *automated operating activity* and accrues **runtime operating state** — machine-written telemetry about that activity, not a versioned business attribute. The motivating case is a `REGISTRY` element ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.19): a regulatory-source watch-list whose collector records, per row, when each source was last scanned, when it is next due, whether a change was detected, whether human review is pending, and the latest captured snapshot. This is **state, not config**, and must not churn the source-of-truth element on every scan.

Such state lives in an **operating-state sidecar**, co-located with its target element but kept distinct from the versioned-attribute sidecar:

```
<id>.yaml            # the element — authored configuration only
<id>.history.yaml    # versioned business attributes (§9.1) — human-authored, canon audit trail
<id>.runstate.yaml   # operating state — machine-written runtime telemetry, NOT canon
```

| Aspect | Versioned-attribute sidecar (`.history.yaml`) | Operating-state sidecar (`.runstate.yaml`) |
|---|---|---|
| Holds | business attributes that changed over the element's life | runtime telemetry of an automated activity the element drives |
| Author | human (admission-gated edits) | machine (the collector / runner) |
| Shape | `target` + `attribute_versions` keyed by attribute, each a `valid_from`-stamped value list (§9.1) | `target` + `rows`/state keyed per the driving element's schema; current-value, not full history |
| Zone | canon-adjacent — part of the audit trail, git-tracked | **not canon** — carries no admission record; it is regenerable runtime data |
| Validation | `VERSIONED-001..005` (§9.3) | governed by the driving element's spec, not by `VERSIONED-*` |

Both share the §9.1 sidecar principles — co-located with the target, no admission record of its own, temporal window governed by the target's lifecycle — but an operating-state sidecar is **not** a versioned-attribute store and is **not** canon: deleting it loses no authored knowledge, because a re-run regenerates it. The concrete `runstate.yaml` shape for the regulatory-source registry is defined in [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.19; this section fixes only the config/state boundary and the naming convention.

---

## 10. Versioning and compatibility

The methodology evolves. Each release changes the contract this document defines, the per-notation specs, or both. Adopters need to know what kind of change a release brings — does it break their existing files, or can they upgrade transparently? This section defines the compatibility policy.

### 10.1 Where versions live

Two version slots exist:

| Slot | Lives in | Records |
|---|---|---|
| `transitrix.yaml` `methodology_version` | adopter repository root (see [`MANIFEST.md`](MANIFEST.md)) | The methodology release the **whole repo** conforms to. Single source of truth for the repo. |
| `spec_version` on each notation file (§1) | every notation file's header | The notation-spec version the **individual file** declares. Informational; the manifest decides what version the repo is on. |

**Mixed-version repositories are not supported in v1.** Every artefact in an adopter repo conforms to the `methodology_version` declared in `transitrix.yaml`. No per-folder override; no per-notation override.

### 10.2 SemVer with explicit semantics

Methodology releases use [SemVer](https://semver.org) (`MAJOR.MINOR.PATCH`) with the semantics below. Each kind of release commits to a different compatibility promise.

| Bump | Kinds of change | Adopter action |
|---|---|---|
| **`MAJOR`** | Breaking schema change: renamed field, removed field, new required field, changed validation severity (warning → error), changed enum membership in a closed enum, etc. | **Migration required.** Adopter follows the migration recipe shipped with the release (defined in a subsequent epic) and updates `methodology_version` in `transitrix.yaml`. |
| **`MINOR`** | Additive only: new optional field, new notation, new validation code at `info` / `warning`, new TYPE in the registry, new section in a spec. Existing files validate cleanly against the new release. | None required. Adopter MAY adopt new fields when convenient. May update `methodology_version` in `transitrix.yaml` to make the upgrade explicit. |
| **`PATCH`** | Clarifications, doc fixes, example fixes, no schema change. | None. |

### 10.3 Pre-1.0 disclaimer

> **The methodology is pre-1.0.** Until the methodology reaches `v1.0.0`, `MINOR` bumps **may carry breaking changes** — standard SemVer pre-1.0 rules apply. Adopters pinning a pre-1.0 version with a caret range (`^0.4.x`) may be broken by a subsequent `0.5.0`. **Pin exactly** (`0.4.2`) in production adopter repos until the 1.0 cut.

Once the methodology hits `v1.0.0`, MINOR bumps will be additive only — the policy in §10.2 holds without the pre-1.0 exception.

### 10.4 The release promise

A released version of the methodology, once tagged, is **immutable**. Subsequent fixes to that version branch happen as a new `PATCH` bump; the old tag is not retroactively edited.

A `MINOR` or `PATCH` release (post-1.0) MUST NOT break any adopter repo that was valid against the previous release of the same `MAJOR` line. The validator's `error`-level rules added in a `MINOR` or `PATCH` release apply only to files authored against that release or later, not to files already in adopters' canon.

A `MAJOR` release SHOULD ship with a migration recipe under `migrations/<from>-to-<to>/` defining the codemod and manual steps an adopter follows to upgrade. The recipe format is the concern of Phase 2 of this epic.

### 10.5 What this section does NOT cover

- **Migration recipe on-disk format.** Phase 2 of this epic.
- **Migration CLI** (`transitrix migrate`). Phase 3 of this epic.
- **The 1.0 cut decision.** Phase 4 of this epic — gated on the in-flight schema epics landing.
- **Per-notation versioning.** `spec_version` on individual files is informational; only `methodology_version` in `transitrix.yaml` drives compatibility decisions.
- **Migration for adopter repositories of non-methodology versions** (DSM, Studio, CLI). Those have their own SemVer policies.

---

## 11. Confidence and freshness

Canon is the authoritative model, but not every canonical statement is equally well-sourced, and confidence in a statement *ages* — a fact last reaffirmed two years ago is less certain than one confirmed last month, even when both are still `valid`. This section defines how Transitrix records the trust earned at data entry, how it decays that trust as a statement goes unreaffirmed, and how it surfaces a composite for a rendered view.

Confidence is **metadata about certainty, not a contradiction flag.** A low-confidence canonical element is still canon — internally consistent and authoritative per §5. Confidence never gates admission and never mutates canon; it is computed, reported, and displayed.

### 11.1 Two independent signals

| Signal | Origin | Mutability | Lives in |
|---|---|---|---|
| **source trust** | Authored at entry — a judgement about *who or what* the material came from. | Fixed once recorded; a source does not become more or less trustworthy with the passage of time. | `source_quality` on a `field` artefact's admission record (§6). |
| **freshness** | Derived — a function of how long ago the canonical statement was last reaffirmed. | Changes every day; recomputed at query / render time. | Not stored. Computed from the canon element's `admitted_at` (§6). |

The two are deliberately separate. Collapsing them into one decaying number would erase the authored signal. A statement's overall confidence combines them (§11.4).

### 11.2 Source-trust scale

`source_quality` is a closed ordinal set. The numeric weight is used only for the arithmetic in §11.4–11.6; authors record the label, never the number.

| Label | Weight | Meaning |
|---|---|---|
| `authoritative` | 1.0 | Primary source of record: the organisation's system of record, a signed document, or the accountable owner stating it directly. |
| `corroborated` | 0.8 | Confirmed by triangulation across more than one independent field source. |
| `single_source` | 0.5 | One uncorroborated informant or observation. |
| `unverified` | 0.25 | Draft, assumption, inference, or hearsay. The default when `source_quality` is absent. |

### 11.3 Freshness decay

Freshness anchors on the canon element's `admitted_at` (§6) — the date the admission gate last ran for it. Re-running the gate on an unchanged element ("still true as of today") is a **reaffirmation**: it bumps `admitted_at` and resets freshness. This is the maintenance action that cures staleness; canon content is not edited to refresh a score.

```
age_days  = today − admitted_at
freshness = 1.0      if age_days ≤ fresh_days
          = floor    if age_days ≥ stale_days
          = 1.0 − (1.0 − floor) · (age_days − fresh_days) / (stale_days − fresh_days)   otherwise
```

Freshness never reaches zero — old canon is less certain, not worthless; it bottoms out at `floor`. The three parameters are configured per element TYPE, because different facts age at different rates (an organisation's capability map ages over years; a price list over weeks). They live in the adopter manifest (`transitrix.yaml`) under `confidence_decay` ([MANIFEST.md](MANIFEST.md) §2); the `defaults` apply to any TYPE not overridden under `by_type`:

```yaml
confidence_decay:
  defaults: { fresh_days: 180, stale_days: 730, floor: 0.3 }
  by_type:
    CAPABILITY:  { fresh_days: 365, stale_days: 1825 }
    APPLICATION: { fresh_days: 180, stale_days: 730 }
```

### 11.4 Element confidence

For one canonical element:

```
source_trust(element) = max weight over the source_quality of every field artefact
                        the element cites via derived_from (§6)
confidence(element)   = source_trust(element) · freshness(element)
```

Source trust takes the **best** available source (`max`): an element corroborated by an authoritative source is not dragged down by an additional weaker one — extra weak sources add nothing, they do not subtract. Multiplying by freshness then ages that trust: an `authoritative`-but-long-unreaffirmed element scores `1.0 · floor`, while a `single_source`-but-fresh element scores `0.5 · 1.0`.

### 11.5 Unsourced elements

`derived_from` remains optional (§6) — requiring it would break existing canon and is not in scope here. But an element with no resolvable `derived_from` has no authored trust to draw on. For confidence scoring it is treated as `unverified` (0.25) **and counted separately** so the gap is visible rather than hidden. This biases toward filling provenance without making it a hard gate.

### 11.6 View composite

A view renders a set of canonical elements. Its composite confidence is computed at render time and is **not stored** — views carry no lifecycle (§7.1) and no confidence state of their own. Three numbers are surfaced alongside the view's formation date:

| Component | Definition |
|---|---|
| **weakest link** | `min` of `confidence(element)` over the rendered elements — a view is only as trustworthy as its weakest element. The headline figure. |
| **mean** | arithmetic mean of `confidence(element)` over the rendered elements (equal weight per element in v1). |
| **coverage** | fraction of rendered elements with a resolvable `derived_from`. |

For display, a numeric confidence maps to a band: **A** ≥ 0.8, **B** ≥ 0.6, **C** ≥ 0.4, **D** < 0.4. The headline band is the band of the weakest link. Example render header:

```
Data confidence (as of 2026-06-05): B (weakest link) · 0.71 mean · 92% sourced
```

### 11.7 Regular freshness check

A scheduled validator pass computes freshness across canon and **reports** — it never writes. It flags every canonical element whose `age_days ≥ stale_days` for its TYPE (i.e. freshness has bottomed out at `floor`), so they can be reaffirmed. The cure is re-admission (§11.3), not an edit.

| Rule | Severity | Description |
|---|---|---|
| `FRESHNESS-001` | warning | A canonical element's `age_days` (today − `admitted_at`) is ≥ `stale_days` for its TYPE. The element is stale and should be reaffirmed. Advisory only — never blocks, never mutates canon. |

`FRESHNESS-001` is cross-cutting in the §8 sense: it needs the element's admission date and the active `confidence_decay` config, not just the file in isolation.

### 11.8 Out of scope (v1)

- **Persisting the confidence trajectory.** Confidence is recomputed on read. If an organisation later needs the history of a confidence value, the versioned-attribute sidecar (§9) is the mechanism — not added here.
- **`source_quality` as a first-class entity.** Today it is a label on a field artefact's provenance, not a referenced source record. Promoting sources to entities is a later concern.
- **Automatic reaffirmation.** Bumping `admitted_at` is a deliberate human / tool gate action; nothing reaffirms canon on its own.
- **Importance-weighting the mean.** v1 weights every rendered element equally; weighting by element importance is deferred.
