---
title: "Codex — external & internal authority artefacts"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-05-28"
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

Carries the admission record ([CONTRACT.md](CONTRACT.md) §6, `zone: codex`, `gate_checks.source_authority`) plus the codex-specific fields below. A codex artefact stores the **source document only** — it does NOT carry bindings to the entities and processes the source affects. Bindings live on `REQUIREMENT.derived_from` (the requirements drawn from the source) and on `ASSERTION` (linking those requirements to subjects). See [§8 Migration](#8-migration) for the rationale.

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
source_url: "https://matsne.gov.ge/en/document/view/3137391"   # optional; the canonical online location

# Optional — local snapshot of the source document for audit trail.
snapshot_file: "sources/snapshot_LAW-PERSONAL-DATA-2017-1_2026-05-27.pdf"
snapshot_date: "2026-05-27"

# Optional — pointers to related documents in the regulatory family
# (NPRM, guidance, companion amendments, …) for lineage navigation.
related_documents:
  - id: "REGULATION-LDT-NPRM-2023-1"
    type: PROPOSED_RULE
    name: "Medical Devices; LDTs (NPRM)"
    url: "https://www.federalregister.gov/d/2023-21662"

# Required on REGULATION (CODEX-005); optional on LAW. false = static
# (published once, never amended); true = live (receives amendments).
# Personal-data laws receive periodic amendments, so this one is live.
monitoring_needed: true

# Scanner-agent metadata — only meaningful when monitoring_needed: true.
# See §3.5 for the field semantics and agent workflow.
scan:
  last_scanned_at: "2026-05-28"
  next_scan_due: "2026-06-28"
  scan_frequency: monthly
  change_detected: false
  change_description: null
  review_needed: false
```

A static artefact (Final Rule, published once) omits the `scan` block and instead lists live counterparts in `monitor_instead[]` — see §3.4 for the static-form example.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `jurisdiction` | yes | string | ISO 3166-1 alpha-2, `eu`, or `intl`. MUST equal the parent folder name. |
| `effective_date` | yes | string | Date the artefact takes effect — quoted ISO 8601 ([CONTRACT.md](CONTRACT.md) §4). |
| `source_url` | no | string | Canonical online location of the source document. Informational for static artefacts; the fetch target for the scanner agent (see §3.5) on live artefacts. |
| `snapshot_file` | no | string | Relative path to a locally-captured copy of the source document (see §3.1). Required-together with `snapshot_date`. |
| `snapshot_date` | no | string | Date the snapshot was taken — quoted ISO 8601 ([CONTRACT.md](CONTRACT.md) §4). Required-together with `snapshot_file`. |
| `related_documents` | no | list | Pointers to documents in the same regulatory family — see §3.2. |
| `monitoring_needed` | conditional | boolean | Whether the artefact's source changes over time. **Required on `type: REGULATION`** (`CODEX-005`); optional on `type: LAW`. See §3.4. |
| `monitor_instead` | no | list | When `monitoring_needed: false`, lists live documents to watch in lieu of monitoring this one. See §3.4. |
| `scan` | no | map | Scanner-agent metadata — `last_scanned_at` / `next_scan_due` / `scan_frequency` / `change_detected` / `change_description` / `review_needed`. Only meaningful on `monitoring_needed: true` artefacts. See §3.5. |

### 3.1 Snapshots

A snapshot is a locally-captured copy of the source document held alongside the codex artefact for audit purposes. The snapshot is independent of the external URL remaining available; it is the artefact's authoritative state at `snapshot_date`.

**File layout convention.** Snapshots live in a `sources/` subfolder co-located with the codex YAML file; the filename encodes the artefact ID and snapshot date for traceability:

```
codex/external/ge/LAW-PERSONAL-DATA-2017-1.yaml
codex/external/ge/sources/snapshot_LAW-PERSONAL-DATA-2017-1_2026-05-27.pdf
```

The `sources/` folder is part of the codex layout — adopters MAY commit snapshot files to source control alongside the YAML. Binary formats (PDF, DOCX, HTML archive) are the typical shape; the format is unconstrained.

**Re-snapshotting.** When a re-capture is needed (the source has been re-issued, the previous snapshot is corrupted, etc.), update `snapshot_file` to point at the new file and update `snapshot_date` accordingly. Prior snapshot files MAY be retained in `sources/` for history but only the path in `snapshot_file` is canonical.

The two fields are required-together: a codex artefact MUST either declare both or omit both. Declaring only one is a configuration error (caught at adopter-validator level once a rule code is assigned).

### 3.2 Related documents

Regulatory artefacts typically belong to a family: a Final Rule has an NPRM that preceded it, may have companion guidance, and may be amended later by other instruments. `related_documents[]` encodes the lineage so a consumer reading the artefact can navigate the family without leaving the codex.

```yaml
related_documents:
  - id: "REGULATION-LDT-NPRM-2023-1"       # typed ID if the related doc is itself an admitted codex artefact
    type: PROPOSED_RULE                       # free-text local annotation (see below)
    name: "Medical Devices; LDTs (NPRM)"
    url: "https://www.federalregister.gov/d/2023-21662"
  - type: GUIDANCE
    name: "Laboratory Developed Tests Guidance"
    url: "https://www.fda.gov/.../ldts-guidance"
```

| Subfield | Required | Type | Semantics |
|---|---|---|---|
| `id` | no | string | Typed canonical ID of the related document when it is itself an admitted codex artefact (see [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §1). When present, the ID MUST resolve in canon. Omit when the related document is not (yet) admitted — `url` then carries the pointer. |
| `type` | yes | string | Free-text local annotation of the document's role in the family — typical values `PROPOSED_RULE`, `NPRM`, `GUIDANCE`, `AMENDMENT`, `COMPANION_RULE`, `WITHDRAWAL`. **Not** constrained to the Codex `TYPE` registry in §2. |
| `name` | yes | string | Human-readable title of the related document. |
| `url` | no | string | URL pointing at the related document. Required when `id` is absent. May coexist with `id` (the URL is informational once the artefact is admitted; the `id` is canonical). |

`type` is intentionally free-text: a Codex `TYPE` enum (§2) is for admitted artefacts, while a `related_documents[]` entry is often a *pointer* to a document the adopter has not (yet) admitted. Constraining `type` to the enum would force premature admission of every document the family touches.

### 3.3 Validation note

Validation rules for §3.1 (snapshots) and §3.2 (related_documents) — required-together for the snapshot pair, canon-resolution for `related_documents[].id`, presence of `url` when `id` is absent — are candidates for explicit `CODEX-*` rule codes in a follow-up revision. Until then, the conventions are documented here and enforced informally during admission review.

### 3.4 Monitoring and `monitor_instead`

REGULATION artefacts fall into two operationally distinct categories that the spec MUST distinguish so consumers know which need periodic re-checking and which are permanently settled:

- **Static (Final Rules, published once, never amended).** `monitoring_needed: false`. The artefact's content is fixed at admission. Adopters monitoring the underlying regulatory area instead watch the live counterpart documents (e.g., the CFR section the Final Rule amended) — those live documents are listed in `monitor_instead[]`.
- **Live (CFR sections, continuously amended).** `monitoring_needed: true`. The artefact's source can change between scans; a downstream scanner agent (see §3.5) periodically re-fetches the source and flags drift. `monitor_instead` is meaningless here and SHOULD be omitted.

```yaml
# A Final Rule (static) — points consumers at the live CFR section.
monitoring_needed: false
monitor_instead:
  - id: "REGULATION-CFR-21-PART-809-1"
    name: "21 CFR Part 809 — In Vitro Diagnostic Products"
    url: "https://www.ecfr.gov/current/title-21/part-809"
```

```yaml
# A live CFR section — scanner agent will re-fetch periodically.
monitoring_needed: true
```

| `monitor_instead[]` subfield | Required | Type | Semantics |
|---|---|---|---|
| `id` | no | string | Typed canonical ID when the live document is itself an admitted codex artefact. Same resolution semantics as `related_documents[].id` (§3.2). |
| `name` | yes | string | Human-readable title of the live document. |
| `url` | no | string | URL pointing at the live document. Required when `id` is absent. |

`monitoring_needed` is **required on `type: REGULATION`** (CODEX-005). It is optional on `type: LAW` — laws also receive amendments, but treating that as a separate concern is deferred until a real adopter brings the use case.

A `monitor_instead[]` entry duplicating the artefact's own `source_url` is a configuration error: the field is for *other* live documents, not the same one.

### 3.5 Scanner-agent metadata — `scan` block

When `monitoring_needed: true`, an automated scanner agent maintains a `scan` block on the artefact recording when the source was last fetched, when the next check is due, and whether human review is needed. Embedding the schedule and scan state in the artefact itself (rather than an external scheduler database) keeps the scan history auditable via git and allows per-artefact frequency tuning.

```yaml
scan:
  last_scanned_at: "2026-05-28"      # quoted ISO 8601 — when the agent last fetched the source
  next_scan_due: "2026-06-28"        # quoted ISO 8601 — agent sets this after each scan
  scan_frequency: monthly             # closed enum: daily | weekly | monthly | quarterly
  change_detected: false              # set true by the agent when the latest fetch differs from the prior one
  change_description: null            # free text — what the agent noticed when change_detected: true; null otherwise
  review_needed: false                # true = a human must review before the change is reflected in canon
```

| Subfield | Required | Type | Semantics |
|---|---|---|---|
| `last_scanned_at` | yes | string | Quoted ISO 8601 date the agent last fetched the source. |
| `next_scan_due` | yes | string | Quoted ISO 8601 date the next scan SHOULD run. The agent computes this from `last_scanned_at + scan_frequency`. |
| `scan_frequency` | yes | string | One of `daily` / `weekly` / `monthly` / `quarterly`. Closed enum; per-artefact tuning based on how often the source changes in practice. |
| `change_detected` | yes | boolean | `true` when the latest fetched content differs from the prior snapshot; `false` otherwise. |
| `change_description` | no | string \| null | Free-text summary of what the agent observed when `change_detected: true`. `null` (or omitted) when no change. |
| `review_needed` | yes | boolean | `true` when a change has been detected but not yet adjudicated by a human. Resets to `false` once the human creates the new / amended artefact. |

**Agent workflow.** A scanner agent operating against a `monitoring_needed: true` artefact:

1. Fetches the content at `source_url` (or, when the artefact opts to monitor counterparts, the URLs in `monitor_instead[].url`).
2. Compares the freshly-fetched content to the previously-captured `snapshot_file` (or the agent's prior fetch if no snapshot exists yet).
3. If content has changed: sets `change_detected: true`, populates `change_description`, sets `review_needed: true`.
4. Updates `last_scanned_at` to today and `next_scan_due` to today + `scan_frequency`.
5. The human review step creates the new or amended codex artefact (typically a fresh ID for a re-issued source, or an in-place update for a minor amendment), then resets `review_needed: false` on the artefact the agent flagged.

**Consistency rules.** A `scan` block is only meaningful on a `monitoring_needed: true` artefact. Declaring `scan:` alongside `monitoring_needed: false` is a configuration error — the artefact is static; the scanner has nothing to do. A future revision MAY wire this into an explicit `CODEX-*` rule code; for now the convention is documented here.

The `scan` block is optional — a brand-new live artefact that no scanner has touched yet legitimately has no `scan` block. Once a scanner runs against it the block appears and is maintained on subsequent scans.

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
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `issuing_authority` | yes | string | The internal body or role that issued the artefact. |
| `effective_date` | yes | string | Date the artefact takes effect — quoted ISO 8601. |

Internal artefacts have no `jurisdiction` and are not foldered by country. As with external codex, internal artefacts carry no bindings to entities or processes; those live on `REQUIREMENT` and `ASSERTION` (see [§8 Migration](#8-migration)).

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
| `CODEX-002` | error | Required frontmatter missing. External needs `jurisdiction` + `effective_date`; internal needs `issuing_authority` + `effective_date`. All codex artefacts also carry the admission record ([CONTRACT.md](CONTRACT.md) §6). |
| `CODEX-004` | warning | An `applies_to:` field is present on a codex artefact. The field was retired in this revision (see [§8 Migration](#8-migration)); bindings now live on `REQUIREMENT.derived_from` ([15-requirement.md](15-requirement.md)) and on `ASSERTION` ([16-assertion.md](16-assertion.md)). |
| `CODEX-005` | info | A `type: REGULATION` artefact does not declare `monitoring_needed:`. The field SHOULD be explicit so downstream consumers (and scanner agents) know whether the source is static or live — see §3.4. Info severity, not warning, because some legacy artefacts predate the field; new REGULATION artefacts SHOULD set it. |

Rule code `CODEX-003` was retired alongside `applies_to`; the code is reserved and is not reassigned.

---

## 7. References

- Zone model and admission record: [CONTRACT.md](CONTRACT.md) §5–6.
- Codex TYPE registry and uniqueness scope: [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.5, §4.
- The REQUIREMENT element that holds bindings drawn from codex sources: [15-requirement.md](15-requirement.md).
- The ASSERTION notation that links requirements to subjects: [16-assertion.md](16-assertion.md).
- Which zones and notations an adopter uses is declared in the `transitrix.yaml` manifest.

---

## 8. Migration

This revision (v0.2) retires the `applies_to.{entities, processes}` block from codex frontmatter. In the v0.1 design, every codex artefact (`LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`) carried direct bindings to the canonical entities and processes it affected. In v0.2 a codex artefact stores the **source document only**; bindings live downstream:

```
v0.1 layout:                              v0.2 layout:
  codex LAW          ──applies_to──►       codex LAW
                                                │ (no bindings stored here)
  codex LAW                                     ▼
                                       REQUIREMENT (motivation/requirements/)
                                                │  derived_from: [LAW-…]
                                                ▼
                                       ASSERTION (canon/assertions/)
                                                │  about: REQUIREMENT-…
                                                │  subject: PRODUCT-… | PROCESS-… | CAPABILITY-…
                                                ▼
                                       (the entity / process the law affects)
```

**Why the move.** A single law typically yields many obligations, and each obligation may bind a different set of entities and processes. Encoding the law-to-entity matrix on the codex artefact forced a flat list that lost the per-obligation structure. The new layout puts atomic obligations on `REQUIREMENT` (each citing its source via `derived_from:`) and per-subject claims on `ASSERTION` (each citing the requirement via `about:`). The codex artefact is freed to be a faithful copy of the source document, with no model-internal cross-references.

### 8.1 Migrating an existing codex artefact

For each existing codex YAML carrying `applies_to`:

1. **Remove the `applies_to` block** from the codex YAML. No other fields change.
2. **For each entry that used to live under `applies_to.entities[]` or `applies_to.processes[]`** — identify the obligation it implicitly encoded ("law X binds entity Y because Y must do Z" — Z is the obligation). Create a `REQUIREMENT-…` artefact under `canon/elements/01_motivation/requirements/` that names Z, with `derived_from: [<codex artefact ID>]`. (One requirement per distinct obligation; one requirement may cite multiple codex sources.)
3. **For each (subject, requirement) pair** the org wants to make a positive claim about, create an `ASSERTION-…` under `canon/assertions/` with `about: REQUIREMENT-…` and `subject: <ENTITY or PROCESS ID>`. Status and evidence fields capture whether the subject satisfies the requirement.

The migration is data-shape-only — no semantics are lost; the same matrix is just expressed in a normalised form that scales to many laws × many obligations × many subjects.

### 8.2 Validator behaviour during migration

- `CODEX-004` (warning, new in v0.2) fires whenever `applies_to` is present on a codex artefact. Adopters in mid-migration will see this warning until they remove the field. The warning does not block validation; it surfaces the field as deprecated.
- `CODEX-003` (error, retired in v0.2) was the typed-ID-resolution check inside `applies_to`. The code is reserved (not reassigned).
- `CODEX-002` (error, updated in v0.2) no longer lists `applies_to` among the required fields.

Post-migration, when adopters have removed `applies_to` from all codex artefacts and the warning ceases firing, `CODEX-004` is a candidate for promotion to `error` (or removal). That decision happens in the broader methodology-upgrade-path workstream, not on a per-revision basis here.
