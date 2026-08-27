---
title: "Codex — external & internal authority artefacts"
version: "0.4"
author: "Valerii Korobeinikov"
last_updated: "2026-08-27"
status: "draft"
---

# Codex Notation — Reference

**Scope:** The **Codex** zone — external constraints (laws, regulations, and standards issued by a standards-developing organisation) and internal authority documents (policies, internal standards, principles) that are *given to* or *held by* the organisation rather than modelled as canon. The three-zone model and the shared admission record are defined in [CONTRACT.md](../CONTRACT.md) §5–6.

Codex artefacts are **zone primitives**, not view documents: each artefact is a single YAML file named by its ID (`<TYPE>-…-<INTEGER>.yaml`, per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md)). They are not `.transitrix.yaml` notation files and carry no `notation:` header; instead they carry the shared admission record ([CONTRACT.md](../CONTRACT.md) §6, with `zone: codex`) plus the codex-specific frontmatter below.

---

## 1. Structure: external vs internal

The codex zone is split at the folder level:

```
codex/
  external/          # given to the org by outside authorities
    <jurisdiction>/  # ISO 3166-1 alpha-2, or `eu` / `intl`
  internal/          # issued by the org itself
```

- **`external/`** — laws, regulations, and externally issued technical standards, sub-foldered by **jurisdiction** because a distributed organisation operates under multiple legal (and standards) regimes that bind different processes differently. Internationally issued SDO artefacts live under `intl`.
- **`internal/`** — policies and internal standards the organisation issues to itself. Not foldered by country.

### 1.1 Jurisdiction codes

External codex artefacts live under a jurisdiction folder:

| Code | Meaning |
|---|---|
| ISO 3166-1 alpha-2 (`ge`, `de`, `ru`, …) | a single country's legal regime |
| `eu` | EU-wide law applying across member states |
| `intl` | internationally issued bodies (ISO, IEC, IEEE, UN, and peers) — live; not reserved |

The folder an external artefact sits in MUST match its `jurisdiction:` frontmatter (rule `CODEX-001`).

---

## 2. Codex TYPEs

| TYPE | Sub-zone | What it is |
|---|---|---|
| `LAW` | external | a statute or act binding the organisation |
| `REGULATION` | external | a regulation issued under a law |
| `STANDARD` | external | a technical standard issued by a standards-developing organisation (ISO, IEC, IEEE, ANSI, NIST-as-SDO, DIN, BSI, PCI SSC, and peers) |
| `POLICY` | internal | an internal policy the organisation issues |
| `INTERNAL_STANDARD` | internal | an internal standard or convention |
| `PRINCIPLE` | internal | a rule the organisation holds over itself, with no stated issuing authority or conformance test |

Registered in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.5; IDs follow the canonical grammar (`LAW-PERSONAL-DATA-2017-1`, `STANDARD-iso-27001-1`, `INTERNAL_STANDARD-coding-conventions-1`, `PRINCIPLE-data-minimisation-1`, …).

### 2.1 PRINCIPLE vs POLICY vs INTERNAL_STANDARD — the discriminator

All three are internal, self-issued artefacts, and it is easy to misfile one as another. The test is stated in words a reader applies at admission time, not a field the validator can compute:

- **Can the artefact state who holds it in force (an `issuing_authority`) *and* how conformance is checked?** Then it is a `POLICY` (a rule with a named enforcer) or an `INTERNAL_STANDARD` (a prescription with a conformance test) — whichever of the two the artefact actually is. `INTERNAL_STANDARD` is reserved for the artefacts that are genuinely standards: a prescription checked against a stated conformance test, not merely issued by someone.
- **Can it state neither?** Then it is a `PRINCIPLE` — a value the organisation holds itself to without a named enforcer or a pass/fail test. A code-of-conduct clause ("we minimise the personal data we collect") is typically a PRINCIPLE; the retention schedule that operationalises it into a checked rule is typically a POLICY.
- **Where both are true, it is a POLICY** (or INTERNAL_STANDARD) — `PRINCIPLE` is the residual category for what genuinely has neither, not a lighter-weight alternative to authoring the stronger artefact properly.

There is deliberately **one TYPE, not two** — no `IT_PRINCIPLE` or other domain-qualified variant. The layer a principle constrains is already carried by whatever cites it (a `REQUIREMENT` in a given layer, an `ASSERTION` against a given subject); the TYPE itself does not need to repeat that.

### 2.2 STANDARD vs REGULATION vs INTERNAL_STANDARD — the discriminator

This test is stated in words a reader applies at **admission time**, not a field the validator can compute:

- **Issued under a statute?** Then it is a `REGULATION` (or `LAW` if the artefact *is* the statute).
- **The adopting organisation writes it for itself?** Then it is `INTERNAL_STANDARD` / `POLICY` / `PRINCIPLE` — apply §2.1.
- **A standards-developing organisation issues it** (ISO, IEC, IEEE, ANSI, NIST acting as an SDO, DIN, BSI, PCI SSC, and peers)? Then it is a `STANDARD`. `issuing_authority` names that body. Folder under `codex/external/<jurisdiction>/` with `LAW` / `REGULATION`; internationally issued bodies use `intl`.

A regulation that **incorporates a standard by reference** stays a `REGULATION` and cites the `STANDARD` (typically via `related_documents[]` or a downstream `REQUIREMENT.derived_from` that names both). Incorporating a standard does not reclassify the regulation.

---

## 3. Frontmatter — external codex artefacts

Carries the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: codex`, `gate_checks.source_authority`) plus the codex-specific fields below. A codex artefact stores the **source document only** — it does NOT carry bindings to the entities and processes the source affects. Bindings live on `REQUIREMENT.derived_from` (the requirements drawn from the source) and on `ASSERTION` (linking those requirements to subjects). See [§8 Migration](#8-migration) for the rationale.

```yaml
id: LAW-PERSONAL-DATA-2017-1
name: "Law of Georgia on Personal Data Protection"
type: LAW                       # LAW | REGULATION | STANDARD
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
| `issuing_authority` | conditional | string | The body that issued the artefact. **Required on `type: STANDARD`** (`CODEX-002`) — the standards-developing organisation. Optional on `LAW` / `REGULATION` (the legislative source is typically `gate_checks.source_authority`). |
| `effective_date` | yes | string | Date the artefact takes effect — quoted ISO 8601 ([CONTRACT.md](../CONTRACT.md) §4). |
| `source_url` | no | string | Canonical online location of the source document. Informational for static artefacts; the fetch target for the scanner agent (see §3.5) on live artefacts. For an admitted source this is the **authoritative watch target** — when a `REGISTRY` row points at this artefact (via its `codex_id`), this `source_url` wins over the row's and the two MUST agree ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20, rule `REG-001`; ADR 2026-06-10). |
| `snapshot_file` | no | string | Relative path to a locally-captured copy of the source document (see §3.1). Required-together with `snapshot_date`. |
| `snapshot_date` | no | string | Date the snapshot was taken — quoted ISO 8601 ([CONTRACT.md](../CONTRACT.md) §4). Required-together with `snapshot_file`. |
| `related_documents` | no | list | Pointers to documents in the same regulatory family — see §3.2. |
| `monitoring_needed` | conditional | boolean | Whether the artefact's source changes over time. **Required on `type: REGULATION`** (`CODEX-005`); optional on `type: LAW` and `type: STANDARD`. See §3.4. |
| `monitor_instead` | no | list | When `monitoring_needed: false`, lists live documents to watch in lieu of monitoring this one. See §3.4. |
| `scan` | no | map | Runtime scan state + human-visibility marker — `last_scanned_at` / `next_scan_due` / `scan_frequency` / `change_detected` / `change_description` / `review_needed`. Only meaningful on `monitoring_needed: true` artefacts. Discovery is via `scan-sources.yaml` (§3.7), not this block. The **authoritative runtime scan state** for an admitted source: once a `REGISTRY` row links this artefact via `codex_id`, scan state defers here (the row's `scan_frequency` / `change_signal_method` are superseded — [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20, ADR 2026-06-10). See §3.5. |

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
| `id` | no | string | Typed canonical ID of the related document when it is itself an admitted codex artefact (see [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1). When present, the ID MUST resolve in canon. Omit when the related document is not (yet) admitted — `url` then carries the pointer. |
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

`monitoring_needed` is **required on `type: REGULATION`** (CODEX-005). It is optional on `type: LAW` and `type: STANDARD` — laws and standards also receive amendments, but treating that as a separate concern is deferred until a real adopter brings the use case.

A `monitor_instead[]` entry duplicating the artefact's own `source_url` is a configuration error: the field is for *other* live documents, not the same one.

### 3.5 Scanner-agent metadata — `scan` block

When `monitoring_needed: true`, the `scan` block serves two roles simultaneously:

1. **Runtime state.** An automated scanner agent writes this block after each scan run — recording when the source was last fetched, when the next check is due, and whether a change was detected. Embedding state in the artefact keeps the scan history auditable via git and allows per-artefact frequency tuning.
2. **Human-facing visibility marker.** At authoring time a reader inspecting the artefact can see at a glance whether this source is being monitored and at what cadence, without having to consult an external registry.

**Source discovery is separate.** The scanner does not discover what to scan by walking `codex/` on disk. Instead, `list-due` reads from a centralised watch-list at `operations/config/scan-sources.yaml` (see §3.7). The `scan` block in this artefact is the *state* side of the split; `scan-sources.yaml` is the *discovery* side. Keep them consistent: the `cadence` in the watch-list entry and the `scan_frequency` in this block SHOULD agree.

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

**Which `source_url` the agent reads (source-of-truth split, ADR 2026-06-10, Option A).** For an **admitted** source the codex artefact is authoritative: the agent reads *this artefact's* `source_url` and maintains *this artefact's* `scan` block. For a source still on the watchlist but **not yet admitted** — a `REGISTRY` row of `type: regulatory_source` with no `codex_id` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.20) — there is no codex artefact yet, so the agent reads the **REGISTRY row's** `source_url` and tracks state in the registry runstate sidecar. Once the source is admitted and the row gains a `codex_id`, monitoring moves here; rule `REG-001` flags any lingering `source_url` disagreement between the row and this artefact.

**Agent workflow.** A scanner agent operating against an admitted `monitoring_needed: true` artefact:

1. Fetches the content at this artefact's `source_url` (or, when the artefact opts to monitor counterparts, the URLs in `monitor_instead[].url`).
2. Compares the freshly-fetched content to the previously-captured `snapshot_file` (or the agent's prior fetch if no snapshot exists yet).
3. If content has changed: sets `change_detected: true`, populates `change_description`, sets `review_needed: true`.
4. Updates `last_scanned_at` to today and `next_scan_due` to today + `scan_frequency`.
5. The human review step creates the new or amended codex artefact (typically a fresh ID for a re-issued source, or an in-place update for a minor amendment), then resets `review_needed: false` on the artefact the agent flagged.

**Consistency rules.** A `scan` block is only meaningful on a `monitoring_needed: true` artefact. Declaring `scan:` alongside `monitoring_needed: false` is a configuration error — the artefact is static; the scanner has nothing to do. A future revision MAY wire this into an explicit `CODEX-*` rule code; for now the convention is documented here.

The `scan` block is optional — a brand-new live artefact that no scanner has touched yet legitimately has no `scan` block. Once a scanner runs against it the block appears and is maintained on subsequent scans.

### 3.6 Trust and provenance — vs the field zone

A codex source is **authoritative by construction**: it is *given to* the organisation by an outside or issuing authority, so a codex artefact carries **no** `source_quality`. The graded source-trust scale (`authoritative` / `corroborated` / `single_source` / `unverified`, [CONTRACT.md](../CONTRACT.md) §11.2) is a **field-zone** concept — it scores how far to trust an *informant or observation*. A codex source has nothing to grade: `gate_checks.source_authority` records **who** the authoritative source is (provenance), not **how much** to trust it. `source_quality` and `source_authority` are therefore **different axes** — one a graded trust label on field input, the other a provenance gate-check on codex input — and are deliberately *not* unified despite the similar names.

The **retained copy of the source** is likewise the same concept under a zone-appropriate name. In codex it is the `snapshot_file` (a point-in-time capture of an external, possibly-evolving document, held in `sources/`, §3.1); in the **field** zone it is the ingest pipeline's field-artefact `raw_source` (the raw input bytes, retained in `_intake/processed/`). Both are a byte-level copy kept for traceability and fingerprinted by a `source_hash`; they are named per zone — "snapshot" fits an external evolving source, "raw source" fits captured field material — rather than unified.

### 3.7 Source watch-list — `scan-sources.yaml`

The scanner's source-discovery list is a YAML file at:

```
operations/config/scan-sources.yaml
```

`list-due` reads this file to determine which sources to scan. It does **not** walk the `codex/` directory. This separation makes the watch-list explicit and extensible: future connector types (Confluence, SharePoint, API endpoints) can be added as entries without requiring codex artefacts.

#### Schema

```yaml
sources:
  - id: LAW-GDPR-1                                         # matches the codex artefact id
    type: codex                                            # "codex" for admitted artefacts; non-codex connectors reserved
    path_or_url: codex/external/eu/LAW-GDPR-1.yaml         # path relative to org root (type: codex) or URL (future types)
    cadence: quarterly                                     # daily | weekly | monthly | quarterly — authoritative for this entry
    domain: data-protection-privacy                        # free-text domain tag for human orientation
    notes: "GDPR — live regulation"                        # optional free-text
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `id` | yes | string | Identifier for this watch-list entry. For `type: codex` SHOULD match the codex artefact `id:` field. |
| `type` | yes | string | Connector type. `codex` = admitted codex artefact; non-codex types are reserved for future increments. |
| `path_or_url` | yes | string | For `type: codex`: path to the artefact YAML file, relative to the org root. For future remote types: the watch URL. |
| `cadence` | yes | string | Closed enum `daily` / `weekly` / `monthly` / `quarterly`. Authoritative scan frequency for this entry. SHOULD match `scan.scan_frequency` in the codex artefact. |
| `domain` | no | string | Free-text domain tag — helps humans orient when the list grows. Not used by the scanner. |
| `notes` | no | string | Optional human notes. Not used by the scanner. |

#### Relationship to the codex `scan:` block

The `scan-sources.yaml` entry (`cadence`, `path_or_url`) is the **discovery and configuration** side. The codex artefact's `scan:` block (`last_scanned_at`, `next_scan_due`, `scan_frequency`, `change_detected`, …) is the **runtime state** side. `list-due` reads the path from `scan-sources.yaml`, then reads the artefact's `scan:` block to get the current scan state. `update-scan` writes back to the artefact only; it does not modify `scan-sources.yaml`.

Keep the two in sync: if you change an entry's `cadence` in `scan-sources.yaml`, update the artefact's `scan.scan_frequency` (or pass `--frequency` to the next `update-scan` run) so the visual marker stays accurate.

---

## 4. Frontmatter — internal codex artefacts

`POLICY` and `INTERNAL_STANDARD` share the shape below. `PRINCIPLE`'s shape is distinct — see [§4.1](#41-frontmatter-principle) — because it carries no stated issuing authority by default (§2.1).

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

### 4.1 Frontmatter — `PRINCIPLE`

```yaml
id: PRINCIPLE-data-minimisation-1
name: "Data Minimisation"
type: PRINCIPLE
zone: codex
admitted_at: "2026-08-22"
admitted_by: "v.korobeinikov"
gate_checks:
  source_authority: "Architecture Review Board"
statement: "The organisation collects no personal data beyond what a stated purpose requires."
rationale: "Reduces breach exposure and regulatory surface; a value the organisation holds itself to rather than a rule imposed by an external authority or checked by a stated conformance test."
established_by: "ADR-2026-08-21-a-catalogue-declares-its-boundary"
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `statement` | yes | string | One normative sentence stating the rule. |
| `rationale` | yes | string | Why the organisation holds itself to this rule. |
| `issuing_authority` | no | string | Present only where the principle happens to also carry a named enforcer — at which point §2.1's discriminator classifies it as `POLICY` instead. Optional here for the artefact still being reclassified rather than rejected while that judgement is made. |
| `effective_date` | no | string | Date the principle took effect — quoted ISO 8601. Optional: a standing value often has no distinguishable effective date. |
| `established_by` | no | string | The decision that established this principle, in the decision-log reference form already in use for architecture decisions ([`method/07-decisions.md`](../../method/07-decisions.md) §2 — an `ADR-YYYY-MM-DD-<slug>` id, or the legacy `ADR-NNNN-<slug>` form; central-namespaced `<repo-slug>/<id>` per §3 when the record lives in the central architecture repository). Absence is admissible — `CODEX-006` flags it as a review finding, not a validator error. |

`gate_checks.source_authority` is still required, unchanged from every other codex artefact ([CONTRACT.md](../CONTRACT.md) §6) — it records who admitted this artefact into the catalogue, which is a different question from whether the principle itself names an issuing authority.

---

## 5. File location and naming

```
codex/external/<jurisdiction>/<ID>.yaml
codex/internal/<ID>.yaml
```

One artefact per file, named by its canonical ID. Examples:

- `codex/external/ge/LAW-PERSONAL-DATA-2017-1.yaml`
- `codex/external/eu/REGULATION-GDPR-2016-1.yaml`
- `codex/external/intl/STANDARD-iso-27001-1.yaml`
- `codex/internal/INTERNAL_STANDARD-coding-conventions-1.yaml`
- `codex/internal/PRINCIPLE-data-minimisation-1.yaml`

---

## 6. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `CODEX-001` | error | An external artefact's `jurisdiction:` does not match its parent folder name under `codex/external/<jurisdiction>/`. |
| `CODEX-002` | error | Required frontmatter missing. External `LAW`/`REGULATION` need `jurisdiction` + `effective_date`; external `STANDARD` needs those plus `issuing_authority` (the issuing body, §2.2); internal `POLICY`/`INTERNAL_STANDARD` need `issuing_authority` + `effective_date`; internal `PRINCIPLE` needs `statement` + `rationale` (§4.1) — `issuing_authority` and `effective_date` are optional on `PRINCIPLE`. All codex artefacts also carry the admission record ([CONTRACT.md](../CONTRACT.md) §6). |
| `CODEX-004` | warning | An `applies_to:` field is present on a codex artefact. The field was retired in this revision (see [§8 Migration](#8-migration)); bindings now live on `REQUIREMENT.derived_from` ([15-requirement.md](15-requirement.md)) and on `ASSERTION` ([16-assertion.md](16-assertion.md)). |
| `CODEX-005` | info | A `type: REGULATION` artefact does not declare `monitoring_needed:`. The field SHOULD be explicit so downstream consumers (and scanner agents) know whether the source is static or live — see §3.4. Info severity, not warning, because some legacy artefacts predate the field; new REGULATION artefacts SHOULD set it. |
| `CODEX-006` | info | A `type: PRINCIPLE` artefact does not declare `established_by` (§4.1). Info severity — a record without one is admissible; the absence is a review finding for whoever admits it, not a defect the validator blocks on. |

Rule code `CODEX-003` was retired alongside `applies_to`; the code is reserved and is not reassigned.

---

## 7. References

- Zone model and admission record: [CONTRACT.md](../CONTRACT.md) §5–6.
- Codex TYPE registry and uniqueness scope: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.5, §4.
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

---

## 9. Evolution

- **v0.3 → v0.4 — `STANDARD` TYPE added (§2, §2.2).** Purely additive: a new sibling TYPE in the existing `external` sub-zone for a technical standard issued by a standards-developing organisation. Required fields are the external pair (`jurisdiction` + `effective_date`) plus `issuing_authority` (the issuing body). `intl` is live (no longer reserved). No existing field became required on `LAW` / `REGULATION`, no existing TYPE's shape changed, and a repository with no `STANDARD` artefact validates exactly as it did before. `REQUIREMENT.derived_from`'s permitted TYPEs list widened to include `STANDARD` ([15-requirement.md](15-requirement.md) §2, `REQ-003`) — also additive.
- **v0.2 → v0.3 — `PRINCIPLE` TYPE added (§2, §2.1, §4.1, `CODEX-002`, `CODEX-006`).** Purely additive: a new sibling TYPE in the existing `internal` sub-zone, with its own required-field pair (`statement` + `rationale`) and its own optional fields (`issuing_authority`, `effective_date`, `established_by`). No existing field became required, no existing TYPE's shape changed, and no existing artefact needs updating — a repository with no `PRINCIPLE` artefact validates exactly as it did before. `REQUIREMENT.derived_from`'s permitted TYPEs list widened to include `PRINCIPLE` ([15-requirement.md](15-requirement.md) §2, `REQ-003`) — also additive, since widening a permitted-values enum accepts strictly more than it did before.
