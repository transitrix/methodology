# Notation contract — shared header rules

All Transitrix notations share the same file-header contract: the same required field, the same reserved field, the same validator rules, and the same extension/content match guarantee. This document defines those shared rules once. Each notation spec links here and lists only its per-notation values (the `notation:` short name and the file extension).

This document also defines four organisation-level contracts shared across all notations: the **zone model** (§5), the **admission record** (§6), the **primitive lifecycle** (§7), and the **versioned-attribute sidecar** (§9) — the four shared shapes every organisation artefact may carry. §8 aggregates the validation rules of the compliance and verification domain (REQUIREMENT + ASSERTION + VERIFICATION) for discoverability — the per-notation specs remain authoritative for the rule definitions themselves — and §8.1 covers risk modelling — the dedicated `RISK` element type, and the ArchiMate Risk and Security Overlay mapping onto core motivation primitives as an alternative. §10 sets the **versioning and compatibility policy** for the methodology itself — what kind of change each SemVer bump may carry, and what adopters can rely on across releases. §12 defines the **extensions bag** (`extensions:` — the open attribute escape hatch on every entity) and §13 the **unresolved holding area** (`canon/unresolved/` — where ingestion parks an object it cannot yet type); together they are the zero-information-loss contract the ingest pipeline relies on. §14 defines the **view-config contract** — the presentation layer of a view document — §14.5 covers the **legacy layout** (deprecated `canon/views/` coexistence), and §14.6 defines the **rendered snapshot format** — the committed output artefact produced by each CLI Capture run. §15 defines the **domain vocabulary** separating the project-domain `Action` from the process-domain `Activity`. §17 defines the **binding envelope** (`canon_id` / `origin`) that relates a project repository's element to a central repository's, additive to every other section here.

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
| `notation` | yes | string | Short name of the notation (`bpmn`, `dgca`, `goals`, `capability-map`, …). Identifies the schema the rest of the document follows. The accepted short names are listed in [README.md](README.md). |
| `spec_version` | no, accepted | string | Declared version of the notation spec the document conforms to. Reserved today; will become required when each notation reaches v1.0. The validator accepts but does not enforce it. |

The short name is fixed per notation and matches the per-notation table at the bottom of the spec being read.

### 1.1 Document metadata

Every view notation document MUST declare the following fields at the document root, alongside `notation:` and `spec_version:`:

```yaml
notation: <short-name>           # §1 — required
spec_version: "0.1"              # §1 — optional
name: "Human-readable title"     # §1.1 — required
generated_at: "YYYY-MM-DD"       # §1.1 — optional; quoted ISO 8601 date per §4
description: "One paragraph."    # §1.1 — optional
# … rest of the document
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `name` | yes | string | Human-readable document name — displayed in Studio diagram previews and listings. |
| `generated_at` | no | string | Date the document was generated or last substantively revised — quoted ISO 8601 date per §4. Distinct from the git modification date; records the authoring intent, not the file write. |
| `description` | no | string | One-paragraph context — what the document covers and why. |

**Root placement is mandatory.** Placing `name:` or `generated_at:` only inside a nested notation object (e.g. `nested_blocks.name`, `process_blueprint.name`, `view.name`) does not satisfy this contract. Renderers and tooling read root-level fields; notation-specific nested objects may carry their own name or date fields for notation-internal purposes, but those are not the document metadata fields defined here.

---

## 2. Validator behaviour

Every notation's compiler / validator enforces the same four header rules:

| Rule | Severity | Description |
|---|---|---|
| `HDR-001` | error | Missing `notation` field. |
| `HDR-002` | error | `notation` value does not match the short name expected for this notation. The file is probably in the wrong format for its extension. |
| `HDR-003` | error | File extension does not match the canonical extension for the `notation` declared inside the file (extension/content mismatch). Every notation has its own extension: `*.dgca.transitrix.yaml` for `dgca`, `*.goals.transitrix.yaml` for `goals`, `*.action.transitrix.yaml` for `action`; for all other notations it is `*.<short-name>.transitrix.yaml`. |
| `HDR-004` | accepted | `spec_version` is accepted but not enforced until the notation reaches v1.0. |

Additional notation-specific rules (per-field, semantic, structural) live in the respective spec's "Validation rules" section.

---

## 3. Extension / content match

Each notation has exactly one canonical file extension: `*.<short-name>.transitrix.yaml`. The `dgca`, `goals`, and `action` notations are each distinct and each carry their own extension (`*.dgca.transitrix.yaml`, `*.goals.transitrix.yaml`, `*.action.transitrix.yaml` respectively), even though they describe related layers of the same strategy-execution family. The `notation:` header inside the file identifies the specific notation; the extension mirrors it. The validator enforces this per rule `HDR-003`.

No aliases are accepted: one notation has exactly one extension. The full per-notation mapping lives in [README.md](README.md).

The canonical extension is `*.<short-name>.transitrix.yaml` **or** `*.<short-name>.ttrs`; which one a given notation takes is a property of that notation. A `.ttrs` document is prose with directives rather than a mapping, and its middle segment is the document kind (`product.mrd.ttrs`), so the extension/parent-folder rule applies to it unchanged. `.ttrs` replaces `*.<short-name>.transitrix.yaml` in full for the notation that takes it — it is never appended to it, and no notation carries both. "One notation, exactly one extension" is unchanged, and `HDR-003` continues to enforce it.

The near-miss `.trs` is one keystroke away and is a different, widely used format. A file ending `.trs` where a document source is expected is reported as that near-miss by name, not as an unknown-file error.

---

## 4. Date format

All date-typed fields across the Transitrix notations MUST be quoted ISO 8601 strings in `YYYY-MM-DD` form (e.g., `"2026-06-01"`). Unquoted `2026-06-01` is parsed by YAML 1.1 loaders as a native date type and is **not** accepted as the canonical form. Quote dates explicitly.

Which fields are date-typed is defined per notation — the shared document-metadata field `generated_at:` (§1.1), plus fields such as activity `start_date` / `end_date` and `project.start_date` / `project.calendar.holidays[]`, capability `assessment_date` / `target_date`, issue `created_at` / `resolved_at` / `updated_at`, and application / product `updated_at`. The quoting rule above applies to every one of them; specs reference this section rather than restating it.

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

**Packages are not a fourth zone.** An optional domain package ([`PACKAGES.md`](PACKAGES.md)) is a top-level folder sitting alongside `canon/`, `field/`, `codex/`, but it carries none of the zone trust contracts above — it is self-contained, removable, and may only reference into a zone, never be referenced from one.

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
| `canon` | `uniqueness`, `consistency`, `completeness` | IDs unique within the catalogue rooted at the nearest enclosing `transitrix.yaml` ([MANIFEST.md](MANIFEST.md) §4); no contradiction with existing canon; required fields present. |
| `field` | `provenance` | The source of the material is recorded — who, when, in what setting, and at what trust (`source_quality`, §11.2). |
| `codex` | `source_authority` | The issuing or authoritative source is identified and the artefact is faithful to it. |

A zone MAY record additional checks beyond its standard set; codex artefacts additionally carry zone-specific frontmatter defined in the codex notation spec.

### 6.1 Pre-admission lifecycle — `proposed → active | rejected`

The admission record above describes an artefact that **has** passed its zone gate. Some artefacts are produced by an **automated harvest** — a scanner / collector that extracts candidate canon from a source (a `REQUIREMENT` from a regulation, an `ASSERTION` of impact) — and **must not enter admitted canon until a human reviews them**. The collector never writes admitted canon directly: it emits *proposed* drafts plus a review digest, and a human gate admits or rejects each.

A **pre-admission state**, recorded by `admission_state` on the admission record, governs this. It is orthogonal to `zone`: `zone` names the artefact's **target** zone (where it lives once admitted), while `admission_state` records whether it has yet **passed that zone's gate**.

```yaml
zone: canon                          # the TARGET zone — where this artefact lives once admitted
admission_state: proposed            # proposed | active | rejected — absent ⇒ active (back-compat)
proposed_at: "2026-06-05"            # required when proposed/rejected — when the harvest emitted the draft
proposed_by: "reg-intel-collector"   # required when proposed/rejected — the tool / harvest id (never a human)
owner_to_confirm: ROLE-LEGAL-1       # recommended when proposed — the ROLE accountable for the admission decision
gate_checks:
  uniqueness: pass                   # checks the harvest can self-certify mechanically
  consistency: pass
  completeness: pending_review       # human-judgement checks the harvest cannot certify
derived_from:
  - REGULATION-GDPR-2016-1
# admitted_at / admitted_by are ABSENT until a human admits (proposed → active)
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `admission_state` | no | string | `proposed` \| `active` \| `rejected`. **Absent ⇒ `active`** — human-authored canon is admitted by construction, so existing files need no change (back-compat). |
| `reviewer_authority` | no | string | `ai_reviewed` \| `expert_confirmed` — the authority **tier** of the reviewer who admitted the artefact (tiered approval, §6.2). **Absent ⇒ `expert_confirmed`** (back-compat: every artefact admitted before this axis existed is treated as expert-confirmed; no migration). Only meaningful with `admission_state: active`; both tiers are admitted canon. A **tool** writes `ai_reviewed`, a **human** writes `expert_confirmed` (`ADMIT-007`). Orthogonal to `admission_state` and to the two trust signals (`source_quality`, `extraction_confidence`); never folded into the §11.4 confidence formula (§11.4). |
| `proposed_at` | when `proposed` / `rejected` | string | Date the automated harvest emitted the draft — quoted ISO 8601 (§4). |
| `proposed_by` | when `proposed` / `rejected` | string | The tool / harvest identifier that emitted the draft. A human never writes `proposed`. |
| `owner_to_confirm` | recommended when `proposed` | string | `ROLE-…` ID of the ROLE accountable for reviewing this proposed draft and making the admission decision (`proposed → active \| rejected`). Routes the open item to the designated inbox; absent ⇒ the draft is unrouted (warning `ADMIT-008`). Not used on `active` or `rejected` artefacts — admission is already decided. |
| `rejected_at` | when `rejected` | string | Date a human refused the draft. |
| `rejected_by` | when `rejected` | string | The human reviewer who refused it. |
| `rejection_reason` | recommended when `rejected` | string | Why the draft was refused — kept for audit. |

For `admission_state: proposed`, the §6 requirement on `admitted_at` / `admitted_by` is **deferred** (they are filled only on admission); `proposed_at` / `proposed_by` stand in their place.

**The state machine:**

```
   (automated harvest emits)
              │
              ▼
          proposed ──(human gate: review, complete gate_checks, accept)──▶ active
              │
              └────────────(human review: refuse)──────────────────────▶ rejected
```

- **`proposed`** — written **only** by an automated harvest. The artefact is shaped as its target canon TYPE and is structurally validated as that TYPE, but it is **not admitted canon**: it is excluded from the admitted set and from every derived view (below). `admitted_at` / `admitted_by` are absent; human-judgement `gate_checks` carry `pending_review`. `owner_to_confirm` (recommended) routes the open item to the ROLE accountable for the admission decision.
- **`active`** — admitted to canon. A human reviewer runs the canon gate (§6), completes every `gate_checks` entry to `pass`, sets `admission_state: active`, and fills `admitted_at` / `admitted_by` with the admission date and their handle. This is the only transition into admitted canon for a harvested draft. (Human-authored canon starts here directly, with `admission_state` absent.)
- **`rejected`** — a human reviewed the draft and refused it. The file is retained as an **auditable decision record** (who, when, why) but is never admitted canon and is excluded from derived views. A later harvest that re-finds the same source emits a *new* `proposed` draft; `rejected` is terminal and is not reopened.

`active` and `rejected` are terminal for this pre-admission machine. Retirement of an already-active element is the separate `valid_to` lifecycle (§7), not a state here.

**Exclusion from derived views and cross-cutting checks.** Only `active` (and absent ⇒ active) artefacts constitute **admitted canon**. Renderers, views, and cross-cutting validators operate on the admitted set: a `proposed` or `rejected` artefact does not appear in any derived view and does not count toward coverage (e.g. `REQ-COVERAGE-001`). A `proposed` artefact MAY reference another `proposed` artefact in the same harvest batch; an `active` artefact MUST NOT depend on a `proposed` one — admit the dependency first (`ADMIT-005`).

**Validation rules** (apply to every canonical artefact, alongside the header and lifecycle rules):

| Rule | Severity | Description |
|---|---|---|
| `ADMIT-001` | error | `admission_state` is present and not one of `proposed` / `active` / `rejected`. |
| `ADMIT-002` | error | `admission_state: proposed` but `admitted_at` / `admitted_by` are present (a proposed draft is not yet admitted), or `proposed_at` / `proposed_by` are missing. |
| `ADMIT-003` | error | `admission_state` is `active` or absent, but `admitted_at` / `admitted_by` are missing or any `gate_checks` entry is not `pass`. |
| `ADMIT-004` | error | `admission_state: rejected` but `rejected_at` / `rejected_by` are missing. |
| `ADMIT-005` | warning | An `active` artefact cross-references a `proposed` or `rejected` artefact — admitted canon must not depend on un-admitted drafts. Cross-cutting (requires the full catalogue). |
| `ADMIT-006` | error | `reviewer_authority` is present and not one of `ai_reviewed` / `expert_confirmed` (§6.2). |
| `ADMIT-007` | error | The admitter does not match the tier: `reviewer_authority: ai_reviewed` but `admitted_by` identifies a human, or `reviewer_authority: expert_confirmed` but `admitted_by` identifies a tool. A tool writes `ai_reviewed`; a human writes `expert_confirmed` (§6.2). |
| `ADMIT-008` | warning | `admission_state: proposed` and `owner_to_confirm` is absent — the open item has no designated reviewer and will not route to any inbox. |
| `ADMIT-009` | warning | An admitted artefact (`admission_state: active` or absent) in the `canon` zone carries `extraction_confidence` — a review flag that belongs to an ingest candidate and is never persisted into canon (§11.1). Cite the provenance through `derived_from` and the field artefact it came from instead. Does not apply to `canon/unresolved/` (§13, untyped) or to candidates under `_intake/`, where the flag is correct. |
| `ADMIT-010` | error | `example` is present and is not `true`. The field is a marker; omit it or write `true` (§6.4). |
| `ADMIT-011` | error | An artefact without `example: true` references one that has it. Cross-cutting — requires the full catalogue (§6.4). |

This lifecycle is what an automated regulatory-intelligence collector (a separate task) depends on: the collector emits `proposed` drafts plus a review digest, and the human gate admits or rejects. The per-TYPE specs note it where relevant ([15-requirement.md](elements/15-requirement.md), [16-assertion.md](elements/16-assertion.md)).

### 6.2 Reviewer authority — tiered approval

Admission carries a second, orthogonal axis: *who confirmed it*. The single human gate (§6.1) records only *who* admitted; it cannot distinguish a draft an AI reviewer ticked from one a domain expert confirmed, so the only safe default is to hold everything behind the expert gate — which does not scale to a source that yields hundreds of `REQUIREMENT` / `ASSERTION` candidates. `reviewer_authority` grades the **authority tier** of the reviewer, independent of `admission_state` (gate progress) and of the two trust signals (`source_quality`, `extraction_confidence` — §11). (Per the tiered-approval reviewer-authority architecture decision.)

The tiers are ordinal — `ai_reviewed` < `expert_confirmed` — and **both are admitted canon** (`admission_state: active`); the axis adds **no** new exclusion from derived views. Write authority is strict:

- **`ai_reviewed`** — written **only** by a tool acting as reviewer (the ingest skill, an automated cross-check). The tool fills `admitted_by` with its tool id. A tool MAY admit a high-`extraction_confidence` draft straight to this tier; it may **never** write `expert_confirmed`.
- **`expert_confirmed`** — written **only** by a human reviewer. Absent `reviewer_authority` ⇒ `expert_confirmed`.

This keeps **"propose, never write the expert tier"**: the human gate retains exclusive authority over the top tier, so the core invariant (a tool never mints expert-confirmed canon unreviewed) holds. An `ai_reviewed` active record:

```yaml
zone: canon
admission_state: active
reviewer_authority: ai_reviewed
admitted_at: "2026-06-10"
admitted_by: "ingest-reviewer-claude"   # a tool id — ADMIT-007
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
derived_from:
  - REGULATION-GDPR-2016-1
```

**Cross-tier dependencies — weakest link.** An `expert_confirmed` artefact MAY depend on an `ai_reviewed` one: the lower tier is canon, so the dependency is allowed and `ADMIT-005` is **not** extended to forbid it. Views surface the **weakest-link** authority of the dependency chain — the displayed reviewer authority of a chain is the *minimum* tier over all of its nodes, so a single `ai_reviewed` node anywhere in the chain makes the whole chain read `ai_reviewed`. Rendering the weakest-link chain in Studio / DSM is a separate follow-up; this section defines the rule.

The routing that decides which drafts a tool may auto-admit to `ai_reviewed` (high `extraction_confidence`) versus send to the expert queue (medium / low) is a **skill-level** rule, not a CONTRACT one — it lives in the ingest skill ([transitrix/skills/ingest/SKILL.md](../transitrix/skills/ingest/SKILL.md)). The CONTRACT defines the tiers; the skill defines the routing.

**Recording the decision.** A human reviewing a `proposed` draft may record accept/reject/defer against the pipeline's review artifact (`review-queue.yaml` or `review-digest.yaml`) in a shared, machine-readable form — `decisions.reviewed.yaml`, applied by [`@transitrix/decisions-cli`](https://github.com/transitrix/methodology/tree/main/packages/decisions-cli). This is a recommended recording convention, not a new admission state or lifecycle: `apply` performs exactly the `proposed → active | rejected` transitions above (`defer` leaves the artefact `proposed`, same as not touching it at all), and never writes `reviewer_authority: expert_confirmed` on a tool's behalf (`ADMIT-007`). Recording by hand, without the CLI, remains equally valid.

### 6.3 Agreement axis — has the accountable party committed?

Admission (§6.1) asks whether a **record** has passed its zone gate; agreement asks whether the **statement** is owed. The two are independent — an admitted, regulation-derived requirement the organisation has not yet committed to, and a requirement agreed in a workshop before it passed the canon gate, both occur in practice, so a single ladder cannot express them: agreement can *precede* admission. (Per the 2026-07-31 requirements-management cut-line decision.)

`agreement` is a closed three-value axis carried by `REQUIREMENT`, `CONSTRAINT`, and `NEED` **only** — the elements whose statement is something an accountable party can *own*. It does **not** apply to `VERIFICATION` / `VALIDATION`: those record a comparison between an expected and an obtained result (an anchor, a `method`, an `outcome`, `evidence` — a shape both specs already have), and a machine may perform that comparison because the evidence carries the authority, not a signer. Widening the axis to cover them would collapse commitment and attestation back together — the named signature they need is already expressible as the admission record (`admitted_by` + `admitted_at` + `reviewer_authority: expert_confirmed`, a human guaranteed by `ADMIT-007`).

```yaml
agreement: agreed            # draft | agreed | disputed — absent ⇒ agreed (back-compat)
agreed_by: "v.korobeinikov"  # required whenever `agreement` is written explicitly
agreed_at: "2026-08-04"      # optional; quoted ISO 8601 date (§4) — when this value was last set
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `agreement` | no | string | `draft` \| `agreed` \| `disputed`. **Absent ⇒ `agreed`** — matches `admission_state` (§6.1) and `reviewer_authority` (§6.2): a human-authored element that predates this axis needs no change. |
| `agreed_by` | when `agreement` is present | string | Person handle or tool identifier that set the current `agreement` value. Required whenever `agreement` is written, so the write-authority rule below has something to check. |
| `agreed_at` | no | string | Date `agreement` was last set — quoted ISO 8601 per §4. |

- **`draft`** — the statement is recorded but the accountable party has not yet committed to it. Either a human or a tool may write this value.
- **`agreed`** — the accountable party has committed. **Written only by a human** (`AGREE-002`) — the mirror of `ADMIT-007`'s human-only `expert_confirmed` tier, and the reason the axis is worth having: it is the one place the model records that a *person* took on an obligation.
- **`disputed`** — the accountable party has raised a substantive objection. `disputed` is not `rejected` (§6.1): the record stays in the model — an external obligation may be non-negotiable, and the dispute concerns the organisation's response to it, not the record's continued existence in canon. Either a human or a tool may write this value.

**Reports, never filters.** Like `reviewer_authority` (§6.2), `agreement` adds **no** new exclusion from derived views or from any coverage / cross-cutting rule (`REQ-COVERAGE-001`, `NEED-COVERAGE-001`, …). A `draft` or `disputed` REQUIREMENT is still admitted canon if `admission_state` says so, still counts toward coverage, and still appears in every rendered view exactly as an `agreed` one does. Displaying the value — a badge, a column a reader filters by hand in a spreadsheet export — is a presentation concern; no validator, view generator, or cross-cutting rule may use `agreement` to decide whether an element is included.

#### 6.3.1 Validation rules

| Rule | Severity | Description |
|---|---|---|
| `AGREE-001` | error | `agreement` is present and not one of `draft` / `agreed` / `disputed`. |
| `AGREE-002` | error | `agreement: agreed` but `agreed_by` identifies a tool rather than a human (§6.2's tool-identifier convention) — a tool must never write `agreed`. |
| `AGREE-003` | error | `agreement` is present (any of the three values) but `agreed_by` is missing. |

`AGREE-002` and `AGREE-003` can both describe an `agreement: agreed` record with no `agreed_by`; a validator MAY report either or both. A reference implementation of this check lives in [`scripts/check-agreement.mjs`](../scripts/check-agreement.mjs).

### 6.4 Example marker — an artefact that illustrates rather than reports

Every field above assumes the artefact describes something real about the organisation. Some do not: the worked examples bundled under `notations/examples/**/canon/` carry a full admission record — `zone: canon`, `admitted_at`, `admitted_by`, `gate_checks` — because a fixture that cut corners would be a poor illustration of a contract whose whole subject is that the gate leaves a record. The `example` field says so in the document itself, so a consumer never has to guess it from a path segment (per the 2026-08-19 example-declares-itself decision).

```yaml
example: true   # absent ⇒ real; only `true` is valid — ADMIT-010
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `example` | no | boolean | `true` — marks the artefact as an illustration, not a report about a real organisation. **Absent ⇒ real**, matching every other axis on this record (`admission_state`, `reviewer_authority`, `agreement`), so no existing file changes. `example: false` is an error, not a synonym for absence (`ADMIT-010`) — one fact should have one way to write it. |

**What it asserts.** The artefact describes no real organisation; its admission record is part of the illustration and is still validated in full, so the fixture stays a genuine, checkable example rather than becoming one exempt from the contract it demonstrates.

**Exclusion from derived views.** A consumer computing what counts as admitted canon — for aggregation, coverage, compliance, or any derived total — MUST exclude an artefact carrying `example: true`. This is the same treatment §6.1 already gives `proposed` and `rejected` artefacts (**Exclusion from derived views and cross-cutting checks**, above); the new field is a second reason to be outside the admitted set, not a second mechanism.

**Nothing real may reference an example.** An artefact without `example: true` MUST NOT cross-reference one that has it — `ADMIT-005` pointed at this axis, at **error** rather than warning: a `proposed` artefact is expected to be admitted, so a reference to one is premature, while an example never becomes real and a reference into the example set never resolves (`ADMIT-011`, cross-cutting — requires the full catalogue). An example MAY reference another example.

### 6.5 Zone enumeration — every file is validated or reported

The validator reports on zones as a whole, not only on the files it can parse. Every file under `canon/`, `field/`, and `codex/` (outside the special `sources/` subfolder in `codex/`, which holds cited copies) MUST be either:
- **Validated:** A YAML artefact carrying a complete admission record (`zone`, `admitted_at`, `admitted_by`, `gate_checks`), or
- **Reported as unvalidated:** A file in an unexpected format, carrying incomplete admission record, or falling outside the schema of any published notation.

A file is a *finding* (error or warning) if it fails both criteria: an un-parseable file *with* an admission record (contradictory signal) is an error; a file with *no* admission record (neither validated nor reported) is an error in the canon and field zones, and a warning in the codex zone (where non-YAML external documents may legitimately exist).

**The `sources/` exception.** The `codex/sources/` folder holds cited external documents (PDFs, HTML, archived web pages) that are faithful to their sources and are not edited. Files in `sources/` are never validation-checked and are not enumerated as zone artefacts — they are purely archival. A `sources/` file carrying an admission record is a configuration error (the two intentions are contradictory) and is reported as an `ADMIT-012` error.

**What this ensures:** A repository with `0` validation warnings and `0` unenumerated files means its entire zone contents are in one of two states: validated against a published notation, or formally documented as outside the scope of validation. A consumer can trust that no file was silently skipped.

**Validation rules:**

| Rule | Severity | Description |
|---|---|---|
| `ZONE-001` | error | File in `<zone>/` (outside `sources/`) has no admission record and does not match any published notation schema. (Error in `canon` and `field` zones; warning in `codex` — see §6.5 prose.) |
| `ZONE-002` | error | File in `<zone>/` is not valid YAML (syntax error, not a mapping). |
| `ZONE-003` | error | File in `<zone>/` has an admission record but the file format (extension or structure) does not match any published notation that admits records. |
| `ADMIT-012` | error | File in `codex/sources/` carries an admission record (`zone`, `admitted_at`, etc.). The `sources/` folder is archival; files there are not validated or admitted. |

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

The lifecycle contract applies to every **canonical element** — each individual primitive the organisation asserts. For element-primitive files (one element per file, under `canon/elements/<NN>_<layer>/`), the lifecycle fields sit in the file's frontmatter. For view documents that define elements inline (capability-map, DGCA, applications catalogue, …), each inline element entry carries its own `valid_from` / `valid_to`. The view document itself does not carry a lifecycle — it is a view, not an element.

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

**ID-rename migration (two-phase pattern).** When an element's canonical ID changes — whether a TYPE-prefix rename (e.g. `FACTOR-…` → `DRIVER-…`) or an individual element renumber — update relation files in two phases rather than a single atomic sweep:

1. **Phase 1 — bridge.** Rename the element file and set its `id:` to the new ID. Add the old ID to `former_ids:` on the element file ([ELEMENT_PRIMITIVES.md](../notations/ELEMENT_PRIMITIVES.md) §3). Existing REL `from:`/`to:` references that carry the old ID continue to resolve — the resolver falls back to `former_ids` when the literal value does not match any live element `id`. Ship this phase immediately; no relation-file changes required.
2. **Phase 2 — sweep.** In a dedicated follow-up commit, update all REL files to reference the new ID. Remove the old ID from `former_ids`. Track the sweep in the task issue. `former_ids` is a temporary bridge; entries must not persist after the sweep is complete.

`ELEM-FORMER-ID-001` ([ELEMENT_PRIMITIVES.md](../notations/ELEMENT_PRIMITIVES.md) §9) flags any `former_id` that collides with a live element `id` or another element's `former_ids` — such a collision means Phase 2 was not completed cleanly.

### 7.5 Out of scope (v1)

- **Bitemporality.** No separate `transaction_time` vs `valid_time`. v1 records what is true *now* about what was true *then*; back-dating corrections rewrite the file via git, and the git history is the audit trail.
- **Branching timelines.** Alternative futures are the concern of the Scenarios notation (`notations/views/reports/11-scenarios.md`), not of the primitive lifecycle.
- **Sub-day precision.** ISO 8601 date precision only; no timestamps, no timezones in canon. "Today" is the date of the query or render.
- **First-class time-aware relations.** Promoting relations like `parent` / `applies_to` / activity→goal to first-class lifecycle-bearing files is planned for Wave 3 of the temporal model. In v1 such relations remain inline and timeless on their host primitive.

---

## 8. Compliance, verification, and validation domain rules

The compliance domain spans two notations — **`REQUIREMENT`** (motivation-layer element, [15-requirement.md](elements/15-requirement.md)) and **`ASSERTION`** (canon-zone primitive linking a requirement to a subject, [16-assertion.md](elements/16-assertion.md)). Generic engineering verification adds one more TYPE — **`VERIFICATION`** (canon-zone primitive linking a requirement to a verification protocol and pass/fail outcome, [27-verification.md](elements/27-verification.md)). Upstream of `REQUIREMENT` sits **`NEED`** (motivation-layer stakeholder/user need, [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §7.28), with its own validation-domain claim — **`VALIDATION`** (canon-zone primitive linking a need to a validation protocol and pass/fail outcome, [28-validation.md](elements/28-validation.md)) — the claim that the delivered thing actually satisfies the need, as distinct from `VERIFICATION`'s claim that the requirement was met ([28-validation.md](elements/28-validation.md) §1 argues the trade-off against widening `VERIFICATION.verifies` to serve both). A sixth TYPE, **`RELEASE`** (implementation-layer state of a modelled subject, [`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §7.29), joins this domain as the foundation for an obligation or a claim to attach to instead of the whole subject. Two sides attach to it, each specified in its own notation rather than here. The **claim side** is a pair of optional qualifiers — `ASSERTION.subject_release` ([16-assertion.md](elements/16-assertion.md) §2.4, `ASSERT-010`) and `VERIFICATION.verified_on` ([27-verification.md](elements/27-verification.md) §2.1, `VERIF-007`) — naming *which release* a claim concerns; both are optional, and a repository writing neither validates exactly as it did before they existed. The **obligation side** is the `required_for` relation kind, `REQUIREMENT` → `RELEASE` ([17-relations.md](elements/17-relations.md)). `RELEASE`'s own structural rules below stand on their own independently of either. For discoverability, the validation rules for all six TYPEs are aggregated below in a single table. The per-notation specs remain the authoritative source for the rule definitions; this table is an index.

| Rule | Severity | Notation | Short description | Authoritative spec |
|---|---|---|---|---|
| `REQ-001` | error | REQUIREMENT | `id` grammar invalid, or any required field missing | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-002` | error | REQUIREMENT | `derived_from` references an ID that does not resolve | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-003` | error | REQUIREMENT | `derived_from` ID is not of TYPE `LAW` / `REGULATION` / `STANDARD` / `POLICY` / `INTERNAL_STANDARD` / `PRINCIPLE` | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-005` | error | REQUIREMENT | `level` not in `{stakeholder, system, software}` | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-006` | error | REQUIREMENT | `kind` not in `{functional, quality}` | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-COVERAGE-001` | warning | REQUIREMENT (cross-cutting) | REQUIREMENT has no ASSERTION targeting it — compliance gap | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-VERIF-COVERAGE-001` | warning | REQUIREMENT (cross-cutting) | REQUIREMENT has no VERIFICATION targeting it — engineering verification gap, the verification-side analogue of `REQ-COVERAGE-001` | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-VERIF-COVERAGE-002` | warning | REQUIREMENT (cross-cutting) | REQUIREMENT has VERIFICATION(s) but none reached `pass`/`fail` — trace exists but hasn't closed | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-STALE-001` | warning | REQUIREMENT / CONSTRAINT | `next_review_at` is set and is in the past — obligation due for re-review; applies symmetrically to CONSTRAINT ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.13) | [15-requirement.md](elements/15-requirement.md) §4 |
| `REQ-SERVES-001` | error | REQUIREMENT | `serves` is present but does not resolve to an admitted `NEED` | [15-requirement.md](elements/15-requirement.md) §4 |
| `NEED-001` | error | NEED | `id` grammar invalid, or any required field missing | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `NEED-002` | error | NEED | `stakeholder` does not resolve to an admitted `STAKEHOLDER` | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `NEED-COVERAGE-001` | warning | NEED (cross-cutting) | NEED has no REQUIREMENT with `serves:` targeting it — unaddressed need, the NEED-side analogue of `REQ-COVERAGE-001` | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `NEED-VALIDATION-COVERAGE-001` | warning | NEED (cross-cutting) | NEED has no VALIDATION targeting it — the validation-side analogue of `REQ-VERIF-COVERAGE-001` | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `NEED-VALIDATION-COVERAGE-002` | warning | NEED (cross-cutting) | NEED has VALIDATION(s) but none reached `pass`/`fail` — trace exists but hasn't closed | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `ASSERT-001` | error | ASSERTION | a required field is missing, or `id` grammar invalid | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-002` | error | ASSERTION | `about` is missing, malformed, or resolves to a non-REQUIREMENT | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-003` | error | ASSERTION | `subject` does not resolve, or TYPE not in `{PRODUCT, PROCESS, CAPABILITY}` | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-004` | error | ASSERTION | a `realised_via` entry does not resolve | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-005` | error | ASSERTION | an `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-006` | error | ASSERTION | `status` not in the enum (`compliant` / `partial` / `non_compliant` / `under_review` / `n_a`) | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-007` | warning | ASSERTION | `evidence` is empty AND `status` is `compliant` or `partial` — undefended positive claim | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-008` | warning | ASSERTION | `next_review_at` is set and is in the past — assertion is stale | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-009` | warning | ASSERTION (cross-cutting) | `realised_via` references a flow step (`STEP-…`) not yet promoted to a standalone element — promote per [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.20 (task-level impact idiom, [16-assertion.md](elements/16-assertion.md) §2.1) | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-010` | error | ASSERTION | `subject_release` present but does not resolve to an admitted `RELEASE`, or the release's `of` differs from `subject` | [16-assertion.md](elements/16-assertion.md) §5 |
| `ASSERT-DEAD-LINK-001` | warning | ASSERTION (cross-cutting) | `subject` or `realised_via` references a primitive whose `valid_to` is in the past — bound to a currently-retired element | [16-assertion.md](elements/16-assertion.md) §5 |
| `PROCESS-COVERAGE-001` | warning | PROCESS (cross-cutting) | PROCESS has no admitted ASSERTION with it as `subject` — regulatory obligations entirely unmodelled; an `n_a` assertion counts as coverage | [16-assertion.md](elements/16-assertion.md) §5 |
| `JURISDICTION-CONSISTENCY-001` | warning | PROCESS_BLUEPRINT (cross-cutting) | a jurisdiction code in `lane_config.compliance_filter.jurisdictions` does not match the `jurisdiction` of any resolved codex source in scope — filter references an unrecognised code | [views/13-process-blueprint.md](./views/diagrams/13-process-blueprint.md) §6 |
| `VERIF-001` | error | VERIFICATION | `id` grammar invalid, or any required field missing | [27-verification.md](elements/27-verification.md) §5 |
| `VERIF-002` | error | VERIFICATION | `verifies` is missing, malformed, or resolves to a non-REQUIREMENT | [27-verification.md](elements/27-verification.md) §5 |
| `VERIF-003` | error | VERIFICATION | `method` not in `{test, analysis, inspection, demonstration}` | [27-verification.md](elements/27-verification.md) §5 |
| `VERIF-004` | error | VERIFICATION | `outcome` not in `{pass, fail, inconclusive, not_yet_run}` | [27-verification.md](elements/27-verification.md) §5 |
| `VERIF-005` | error | VERIFICATION | an `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve | [27-verification.md](elements/27-verification.md) §5 |
| `VERIF-006` | warning | VERIFICATION | `evidence` is empty AND `outcome` is `pass` — undefended positive claim | [27-verification.md](elements/27-verification.md) §5 |
| `VERIF-007` | error | VERIFICATION | `verified_on` present but does not resolve to an admitted `RELEASE` | [27-verification.md](elements/27-verification.md) §5 |
| `VALID-001` | error | VALIDATION | `id` grammar invalid, or any required field missing | [28-validation.md](elements/28-validation.md) §5 |
| `VALID-002` | error | VALIDATION | `validates` is missing, malformed, or resolves to a non-NEED | [28-validation.md](elements/28-validation.md) §5 |
| `VALID-003` | error | VALIDATION | `method` not in `{user_acceptance, field_trial, stakeholder_review, usability_study}` | [28-validation.md](elements/28-validation.md) §5 |
| `VALID-004` | error | VALIDATION | `outcome` not in `{pass, fail, inconclusive, not_yet_run}` | [28-validation.md](elements/28-validation.md) §5 |
| `VALID-005` | error | VALIDATION | an `evidence[]` entry with `kind: canonical_ref` has a `ref` that does not resolve | [28-validation.md](elements/28-validation.md) §5 |
| `VALID-006` | warning | VALIDATION | `evidence` is empty AND `outcome` is `pass` — undefended positive claim | [28-validation.md](elements/28-validation.md) §5 |
| `RELEASE-001` | error | RELEASE | `id` grammar invalid, or `of`/`version` or any required field missing | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `RELEASE-002` | error | RELEASE | `of` does not resolve to an admitted `PRODUCT` or `APPLICATION` | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `RELEASE-003` | error | RELEASE | `predecessor` resolves to a `RELEASE` with a different `of` | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `RELEASE-004` | error / warning | RELEASE (warning half cross-cutting) | `predecessor` names itself (error) · a cycle across the chain (warning) | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |
| `RELEASE-005` | error | RELEASE (cross-cutting) | two admitted releases of the same `of` share the same `version` string | [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §9 |

In addition, the shared header rules (`HDR-001..004`, §2) and primitive-lifecycle rules (`LIFECYCLE-001..004`, §7.3) apply to REQUIREMENT, NEED, ASSERTION, VERIFICATION, VALIDATION, and RELEASE files as they do to every other canonical artefact.

The `*-COVERAGE-001` / `*-DEAD-LINK-001` rules, `ASSERT-009`, and `RELEASE-005` are **cross-cutting**: their checks span more than one file (a REQUIREMENT's coverage depends on the assertions catalogue; a NEED's coverage depends on the requirements and validations catalogues; an ASSERTION's dead-link state depends on the lifecycle dates of the primitives it references; `ASSERT-009`'s promotion check depends on the `PROCESS` flows and the `STEP` files; `PROCESS-COVERAGE-001`'s check depends on the assertions catalogue; `JURISDICTION-CONSISTENCY-001`'s check depends on the codex catalogue; `RELEASE-005`'s duplicate-version check depends on every other admitted `RELEASE` of the same `of`). Notation-local rules check a single file in isolation; cross-cutting rules require the validator to be loaded with the full canon catalogue. The `VERIF-*` and `VALID-*` rules above are all notation-local (single-file or single-reference resolution) — `VERIF-007` included, resolving one reference. `ASSERT-010` is notation-local for the same reason, on the same basis as `RELEASE-003`: reading one field of a single resolved target is still single-reference resolution, not a catalogue scan. `RELEASE-004` splits across both categories — its self-reference half is notation-local, its cycle-detection half is cross-cutting (§9 of [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) states the split). The reverse-trace completeness questions — every requirement verified (`REQ-VERIF-COVERAGE-001`/`-002`) and every need validated (`NEED-VALIDATION-COVERAGE-001`/`-002`) — are themselves cross-cutting: like `REQ-COVERAGE-001` and `PROCESS-COVERAGE-001` above, they require the validator to be loaded with the full canon catalogue (verifications/validations and requirements/needs together), not just the file being checked.

The **superseded-state read** on a `VERIFICATION` carrying `verified_on` — the release it was run against has since been succeeded — is deliberately **not** in the table above. It is a derived report, not a validation rule: no code, no severity, nothing stored, and governed by §16.2's reports-never-filters guardrail. See [27-verification.md](elements/27-verification.md) §2.1.1.

### 8.1 Modelling risk — the `RISK` type, and the ArchiMate Risk and Security Overlay mapping as an alternative

Core carries a dedicated **`RISK`** element type ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.26) — a projected event, distinct from `ASSESSMENT`'s dated finding about the present state of a `DRIVER`. `RISK` has no ArchiMate counterpart: ArchiMate 3.x itself has no risk element (vocabulary rule, 2026-07-30 decision).

Before `RISK` existed, this section documented the only way core could express risk: the Open Group's *Risk and Security Overlay* (ArchiMate/SABSA), which expresses risk entirely through the motivation layer using primitives that already existed in this core. That mapping is **unchanged and remains valid** — `ASSESSMENT` keeps its present meaning and is not overloaded — for a repository that prefers to express risk this way instead of, or alongside, `RISK`:

| Overlay concept | Core primitive |
|---|---|
| Risk; vulnerability | `ASSESSMENT` (dated finding about a `DRIVER`) |
| Threat / threat source | `DRIVER`, assessed by `ASSESSMENT` |
| Control objective | `GOAL` |
| Control measure | `REQUIREMENT` (positive obligation) / `CONSTRAINT` (restriction) |
| Asset at risk | any core element the assessment is about |

This is a mapping note, not a schema — it introduces no element file, no folder, no validator, no view of its own. A reader modelling a generic risk this way uses `ASSESSMENT` / `DRIVER` / `GOAL` / `REQUIREMENT` / `CONSTRAINT` exactly as those types are already defined. It is no longer the *only* way to say "risk" in core — a repository may instead (or additionally) model risk directly with `RISK`, referencing the same `DRIVER` (or other element) via `threatens` and the same `REQUIREMENT` / `CONSTRAINT` via `treated_by`. The two are not in conflict: a `DRIVER` may carry both an `ASSESSMENT` and a `RISK` that threatens it.

**What neither approach covers.** Hazard → hazardous-situation → harm chains, formal severity/probability evaluation methodology, and verification of control effectiveness (the ISO 14971 design-controls specialisation) are not expressible by either the overlay mapping or `RISK`, and are not part of the core — that specialisation is out of scope for this repository.

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
| Capability map ([05-capability-map.md](./views/diagrams/05-capability-map.md)) | `maturity_level` (current/target), `responsible_role`, `target_date` |
| Applications catalogue ([10-applications.md](./views/diagrams/10-applications.md)) | `lifecycle_stage` (planned / active / sunset), `responsible_unit`, `vendor` (when an organisation switches vendors mid-life), `maturity` |
| Process map ([06-process-map.md](./views/diagrams/06-process-map.md)) | `maturity` |
| Organisational unit (future) | `headcount`, `head_role` |

Each notation's "Element lifecycle" or "Fields" section will, in a follow-up PR, mark its `time_varying` attributes and remove inline syntax for them. Adopters with existing inline values migrate by moving the value into a single-entry sidecar with `valid_from` set to the primitive's `valid_from`.

**The maturity scale is defined once, here.** Every notation that declares a maturity-shaped `time_varying` attribute — currently the capability map's `current_maturity` / `target_maturity` and the applications catalogue's `maturity` — uses the same scale, **CMMI V2.0, levels 1–5**, and references this definition rather than restating it:

| Level | Name | Description | Characteristics |
|-------|------|-------------|-----------------|
| **1** | Initial | Unpredictable, reactive | Poorly controlled; success depends on individual heroics |
| **2** | Managed | Project-level management | Processes planned, performed, measured, and controlled at project level |
| **3** | Defined | Organisation-wide standards | Processes documented and standardised across the organisation |
| **4** | Quantitatively Managed | Measured & controlled | Sub-processes controlled using statistical/quantitative techniques; performance is predictable |
| **5** | Optimising | Continuous improvement | Focus on incremental and innovative process improvement |

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

**Not to be confused with the `RELEASE` element TYPE.** Every "release" in this section is a release *of the methodology itself* — the versioned spec an adopter repo conforms to via `methodology_version`. `RELEASE` ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.29) is a state of a *modelled subject* — a `PRODUCT` or `APPLICATION` an adopter is modelling — and shares no schema, no SemVer policy, and no relation with the methodology-versioning concept this section defines.

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

### 10.3 Pre-1.0 disclaimer (historical — resolved at the 1.0 cut)

> **As of `v1.0.0` (2026-07-05), the methodology is past the 1.0 cut.** The policy in §10.2 now holds without exception: `MINOR` bumps are additive only; breaking changes require a `MAJOR` bump. Adopters on a released version may pin with a caret range (`^1.0.x`) and expect no breaking changes from subsequent `MINOR`/`PATCH` releases.
>
> **Historical note.** Before `v1.0.0`, `MINOR` bumps could carry breaking changes — standard SemVer pre-1.0 rules applied, and adopters on a `0.x` release were advised to pin exactly (`0.4.2`) rather than with a caret range. This no longer applies to any release from `1.0.0` onward.

### 10.4 The release promise

A released version of the methodology, once tagged, is **immutable**. Subsequent fixes to that version branch happen as a new `PATCH` bump; the old tag is not retroactively edited.

A `MINOR` or `PATCH` release (post-1.0) MUST NOT break any adopter repo that was valid against the previous release of the same `MAJOR` line. The validator's `error`-level rules added in a `MINOR` or `PATCH` release apply only to files authored against that release or later, not to files already in adopters' canon.

A `MAJOR` release SHOULD ship with a migration recipe under `migrations/<from>-to-<to>/` — format defined below.

#### On-disk shape

```
migrations/<from>-to-<to>/
├── README.md              # what changed, why, and manual step-by-step instructions
├── codemod.mjs            # idempotent automated transform
├── validate.mjs           # post-migration check — exits 0 on a clean repo
└── fixtures/
    ├── before/            # minimal adopter-repo fragment in <from> form
    └── after/             # the same fragment after running codemod.mjs
```

#### README.md — minimum contents

- What changed and why (the schema delta).
- A table of old form → new form for each transformed element.
- Numbered manual steps with `before` / `after` snippets for adopters who prefer manual edits.
- How to run the codemod and the post-migration validator.

#### codemod.mjs conventions

- **Pure Node.js ≥ 20** — no native add-ons, no external npm dependencies. Invoked as `node codemod.mjs [--dry-run] [target-dir]`; default `target-dir` is `cwd`.
- **Idempotent** — re-running on an already-migrated repo is a no-op: no diff produced, exit 0.
- **Line-based** — text transforms applied line by line, not a YAML parse/serialise roundtrip, so comments, key order, and formatting on untouched lines are preserved.
- **`--dry-run`** — prints what would change without writing any files.
- **Diff-style summary** — prints each changed file with a count of field-level changes; ends with a totals line (files scanned, files changed).
- **Exit codes** — `0` on a clean run or no-op; `1` on a detected unsafe ambiguity that requires manual intervention; `2` on a script-internal error (missing directory, unreadable file).

#### validate.mjs conventions

Checks that the structural changes targeted by the codemod have been applied (e.g. no `notation: factor` files remain after the `0.6 → 0.7` recipe). Exits `0` if the repo is clean; exits `1` with a list of offending files if not. Does not re-run the codemod — validates only.

#### Fixtures

`fixtures/before/` is a minimal fragment of an adopter repo in the `<from>` form — just enough files to exercise every transform in `codemod.mjs`. `fixtures/after/` is the expected output after running the codemod against `before/`. CI MAY assert that running `codemod.mjs fixtures/before/` produces a result equal to `fixtures/after/` to prevent recipe rot over time.

Worked examples: [`migrations/0.5-to-0.6/`](../migrations/0.5-to-0.6/) and [`migrations/0.6-to-0.7/`](../migrations/0.6-to-0.7/).

### 10.5 What this section does NOT cover

- **Migration CLI** (`transitrix migrate`). Phase 3 — lives in Transitrix Studio, not in this repo.
- **The 1.0 cut decision.** Phase 4 — gated on the in-flight schema epics landing.
- **Per-notation versioning.** `spec_version` on individual files is informational; only `methodology_version` in `transitrix.yaml` drives compatibility decisions.
- **Migration for adopter repositories of non-methodology versions** (DSM, Studio, CLI). Those have their own SemVer policies.

### 10.6 Deprecation policy

A spec file marked `status: "deprecated"` in its own front matter (§1 — the spec-authoring header, distinct from an adopter's notation-file header) names its removal release in the same change that deprecates it. Decided 2026-08-03.

- **A deprecation names its removal release.** The front matter carries `removed_in: "X.0.0"` alongside `status: "deprecated"`, and the spec body states it in prose. A deprecation with no stated end is not a deprecation — it is an unmaintained file. Checked by the `DEP1` doc-lint rule in [`check-notations.mjs`](../scripts/check-notations.mjs).
- **The window is at least one MAJOR.** Deprecated during a `2.x` release → removable in `3.0.0` at the earliest. Ordinary SemVer (§10.2); no local invention of a shorter or longer window.
- **Removal is always a `BREAKING` CHANGELOG entry** — folded into the `MAJOR` bump that performs it, never a silent tidy-up inside a `MINOR` or `PATCH` release.
- **The migration recipe outlives the file it replaces.** When a deprecated spec is deleted, its migration instructions move into `migrations/<from>-to-<to>/` (§10.4 shape) rather than disappearing with it. The recipe MAY land ahead of the actual removal, once the deprecation's replacement is settled — waiting until the major-release cut is not required and risks authoring it under time pressure.

**Historical note.** The `3.0.0` release (`CHANGELOG.md`) removed `HAZARD`, `RISK_CONTROL`, and the Design-Controls Trace Matrix view one minor after they shipped (`2.1.0` → `3.0.0`), with no deprecation window. That CHANGELOG entry is a record of what happened and is not rewritten to imply the window above was honoured — this section states the rule going forward, not retroactively.

### 10.7 Document paths are part of the published surface

§10.1–§10.6 govern the schema — fields, TYPEs, validation severities. This subsection governs the other thing a release can move: **where a spec document lives, and what its section anchors are.** An adopter, a skill, or a script can cite a file path or a `#section-anchor` as durably as it cites a field name, so a reorganisation of `method/` or `notations/` is a compatibility event too, not free housekeeping. Decided 2026-08-16 (the method-division restructuring).

- **A document path is retirable in a `MINOR`, with one release of deprecation.** Moving, splitting, merging, or renaming a spec file does not require a `MAJOR` bump — unlike a schema change, it breaks no adopter's canon — but the **old path MUST keep resolving** for at least one further `MINOR` release: a short stub at the retired path, pointing at the successor file(s) that absorbed its content. The stub is not scheduled for removal in the same change that adds it; it is removed no earlier than the next `MINOR`.
- **A section anchor carries the same promise, through a redirect table.** Where a reorganisation changes a document's internal heading structure (and therefore its `#anchor` targets), the release notes for that version carry an explicit **old-path → new-path table** and an **old-anchor → new-anchor table** — the redirect a URL-based `Location:` header would carry, expressed as a table because Markdown has no server to redirect through.
- **Every inbound reference is repointed in the same change that moves the target**, never left resolving to a stub. A stub is for an outside reader following an old bookmark or an old citation already committed elsewhere (a downstream repo, a saved link); it is not a placeholder this repository's own cross-references are allowed to rest on.
- **This does not relax §10.2.** A document move is additive to the compatibility promise, not a loophole in it — a `MINOR` claiming a document reorganisation still carries zero schema, field, enum, or validation-severity changes.

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

**A third signal exists upstream and never reaches canon — `extraction_confidence`.** It answers a different question from either of the two above: *did the extractor read the source document correctly*. It is a review flag on an ingest **candidate** (`candidate.extraction_confidence`, [vocabulary.yaml](vocabulary.yaml)), surfaced in the review queue and used to route reviewer authority (§6.2). It is **never persisted into canon**, is never folded into `source_quality`, and never enters the §11.4 formula: once a candidate is admitted, the candidate is gone, and how confidently a now-superseded extraction was read is not a property of the element. An admitted element carrying it misrepresents a one-time routing signal as a permanent, citable attribute — the provenance an admitted element does carry is `derived_from` plus the cited field artefact (an `OBSERVATION` or other source record, [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.4). Enforced by `ADMIT-009` (§6.1); stated per TYPE in [ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §7.29.

### 11.2 Source-trust scale

`source_quality` is a closed ordinal set. The numeric weight is used only for the arithmetic in §11.4–11.6; authors record the label, never the number.

| Label | Weight | Meaning |
|---|---|---|
| `authoritative` | 1.0 | Primary source of record: the organisation's system of record, a signed document, or the accountable owner stating it directly. |
| `corroborated` | 0.8 | Confirmed by triangulation across more than one independent field source. |
| `single_source` | 0.5 | One uncorroborated informant or observation. |
| `unverified` | 0.25 | Draft, assumption, inference, or hearsay. The default when `source_quality` is absent. |

### 11.3 Freshness decay

Freshness anchors on a date and decays the same way for canonical elements and knowledge objects, computed using the formula below. The anchor date differs:

- **Canonical elements** (`canon/…`): anchors on the element's `admitted_at` (§6) — the date the admission gate last ran for it. Re-running the gate on an unchanged element ("still true as of today") is a **reaffirmation**: it bumps `admitted_at` and resets freshness. This is the maintenance action that cures staleness; canon content is not edited to refresh a score.
- **Knowledge objects** (`knowledge/…`): anchors on the object's `timestamp` — the date it was recorded or last curated. When a knowledge object needs refreshing due to staleness, re-curation records the change (rather than editing the original), preserving the full history.

```
age_days  = today − anchor_date
freshness = 1.0      if age_days ≤ fresh_days
          = floor    if age_days ≥ stale_days
          = 1.0 − (1.0 − floor) · (age_days − fresh_days) / (stale_days − fresh_days)   otherwise
```

Freshness never reaches zero — old content is less certain, not worthless; it bottoms out at `floor`. The three parameters live in the adopter manifest (`transitrix.yaml`) under `confidence_decay` ([MANIFEST.md](MANIFEST.md) §2):

- **Canonical elements** use per-TYPE thresholds (different facts age at different rates: an organisation's capability map ages over years; a price list over weeks), configured under `by_type`:

```yaml
confidence_decay:
  defaults: { fresh_days: 180, stale_days: 730, floor: 0.3 }
  by_type:
    CAPABILITY:  { fresh_days: 365, stale_days: 1825 }
    APPLICATION: { fresh_days: 180, stale_days: 730 }
  knowledge: { fresh_days: 180, stale_days: 730, floor: 0.3 }   # single threshold for all knowledge objects
```

- **Knowledge objects** use a single default threshold pair (no per-object-type distinction), configured under `knowledge`. When `knowledge:` is absent, the `defaults` apply.



### 11.4 Element confidence

For one canonical element:

```
source_trust(element) = max weight over the source_quality of every field artefact
                        the element cites via derived_from (§6)
confidence(element)   = source_trust(element) · freshness(element)
```

Source trust takes the **best** available source (`max`): an element corroborated by an authoritative source is not dragged down by an additional weaker one — extra weak sources add nothing, they do not subtract. Multiplying by freshness then ages that trust: an `authoritative`-but-long-unreaffirmed element scores `1.0 · floor`, while a `single_source`-but-fresh element scores `0.5 · 1.0`.

**`reviewer_authority` is not folded into this formula.** The reviewer-authority tier (§6.2 — `ai_reviewed` vs `expert_confirmed`) is a property of the *review*, not of the *statement*; source trust and freshness are properties of the statement. It is surfaced as a qualitative label **alongside** the numeric confidence band, never multiplied into it — the same separation §11.1 keeps between the two existing signals. An adopter reads "confidence 0.5, ai_reviewed", not a single blended number.

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

A scheduled validator pass computes freshness across canon and knowledge objects, and **reports** — it never writes. It flags every artefact (canonical element or knowledge object) whose `age_days ≥ stale_days` for its category (i.e. freshness has bottomed out at `floor`), so they can be refreshed. The cure differs:

- **Canonical elements:** re-admission (§11.3) — re-run the admission gate to bump `admitted_at`.
- **Knowledge objects:** re-curation (§11.4a) — record a new object and supersede the old one (if there are changes to document).

| Rule | Severity | Description |
|---|---|---|
| `FRESHNESS-001` | warning | A canonical element's `age_days` (today − `admitted_at`) is ≥ `stale_days` for its TYPE, OR a knowledge object's `age_days` (today − `timestamp`) is ≥ `stale_days` for knowledge objects (the single default threshold). The artefact is stale and should be refreshed. Advisory only — never blocks, never mutates, never filters. |

`FRESHNESS-001` is cross-cutting in the §8 sense: it needs the anchor date and the active `confidence_decay` config, not just the file in isolation.

### 11.8 Out of scope (v1)

- **Persisting the confidence trajectory.** Confidence is recomputed on read. If an organisation later needs the history of a confidence value, the versioned-attribute sidecar (§9) is the mechanism — not added here.
- **`source_quality` as a first-class entity.** Today it is a label on a field artefact's provenance, not a referenced source record. Promoting sources to entities is a later concern.
- **Automatic reaffirmation.** Bumping `admitted_at` is a deliberate human / tool gate action; nothing reaffirms canon on its own.
- **Importance-weighting the mean.** v1 weights every rendered element equally; weighting by element importance is deferred.

---

## 12. Extensions — open attribute bag

Real source material carries fields that map to no defined schema field of the entity being ingested. Dropping them loses information; inventing ad-hoc top-level keys pollutes the schema and trips the validator. Every entity type therefore carries one reserved **open key-value bag**, `extensions:`, that holds source-derived fields the schema does not define. It is the zero-information-loss escape hatch for a *known* entity; the parallel escape hatch for an *unknown whole object* is the unresolved holding area (§13).

```yaml
type: PRODUCT
id: PROD-001
name: Widget Pro
# … standard schema fields …
extensions:
  materials:
    - "Steel 316L"
    - "Rubber gasket B12"
  source_table: product_equipment_matrix
  source_field: materials
```

### 12.1 Rules

- `extensions:` is **optional** on every entity type and, when present, is a **map** (an open key-value bag). Its keys are free-form; its values may be any YAML value (scalar, list, map).
- The validator **passes `extensions:` through untouched** — it never raises an unknown-field error for `extensions:` itself or for any key nested under it, and it does not constrain their shape (`EXT-001`).
- `extensions:` is for fields the schema does **not** define. A field the entity's notation already defines belongs in its defined place, never relocated into `extensions:` to dodge a schema rule (`EXT-002`).
- `extensions:` carries no admission, lifecycle, or confidence semantics of its own — it rides on its host entity and shares the host's admission record (§6) and lifecycle (§7).

| Rule | Severity | Description |
|---|---|---|
| `EXT-001` | accepted | `extensions:` and every key nested under it are accepted without schema validation — the validator never raises an unknown-field error for them. The pass-through guarantee. |
| `EXT-002` | warning | A key under `extensions:` collides with a field the entity's notation already defines — the value probably belongs in its defined place, not in the open bag. |

### 12.2 Distinction from versioned attributes and unresolved objects

`extensions:` holds **schema-undefined fields of a known entity**, stored inline on that entity. It is distinct from:

- the **versioned-attribute sidecar** (§9) — for *defined* fields whose value changes over time;
- the **unresolved holding area** (§13) — for a *whole object* whose TYPE is unknown, not merely an extra field on a known one.

The full routing decision (known object / unknown field / unknown object / law-or-standard) lives in the ingest skill ([`transitrix/skills/ingest/SKILL.md`](../transitrix/skills/ingest/SKILL.md)); §13.3 restates its canon-side summary.

---

## 13. Unresolved holding area — `canon/unresolved/`

Ingestion sometimes surfaces a standalone object whose TYPE matches no known entity — not a `PRODUCT`, `ACTIVITY`, `CHANGE`, …, and not merely an attribute of a known object (that would be an `extensions:` key, §12). Discarding it loses information; admitting it under some guessed TYPE corrupts canon. Such objects land in a reserved holding area, **`canon/unresolved/`**, with their ingestion provenance preserved, pending human resolution.

```yaml
# canon/unresolved/UNRES-001.yaml
ingest_status: unresolved
ingest_source: product_equipment_matrix.xlsx
ingest_field: materials
ingest_date: "2026-06-10"        # quoted ISO 8601 per §4
related_to:
  - PROD-001
data:
  - "Steel 316L"
  - "Rubber gasket B12"
```

### 13.1 Type resolution is orthogonal to admission

An unresolved object is **not** low-trust raw material. Its content may be entirely accurate — drawn from an authoritative system of record, validated, and canonical in every respect **except that its TYPE is not yet resolved**. "Unresolved" names exactly one gap: the object's TYPE is unknown. It says nothing about whether the content is true.

Type resolution is therefore a **second axis, orthogonal to admission** (§6) — exactly as reviewer authority (§6.2) is orthogonal to admission state (§6.1):

| Axis | States | Question |
|---|---|---|
| admission (§6) | `proposed` → `active` | Is the content validated and admitted? |
| type resolution (§13) | `unresolved` → typed | Is the object's TYPE known? |

The two move independently. An entry in `canon/unresolved/` MAY carry a full admission record — `admitted_by`, `gate_checks`, `source_quality` (§11.2), even a lifecycle (§7) — i.e. it can be **admitted-but-untyped**: a human has confirmed the content is accurate, but no TYPE has been assigned. It MAY equally be `proposed`-but-untyped (freshly ingested, content not yet reviewed). Both live here; the admission record, when present, is honoured exactly as it is on typed canon.

**Why it is segregated from typed canon — TYPE, not trust.** The canon machinery is **TYPE-keyed**: a canonical id is `<TYPE>-<INTEGER>` ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1), placement is per-TYPE ([ELEMENT_PRIMITIVES.md](ELEMENT_PRIMITIVES.md) §4), and relations (§17) and derived views dispatch on TYPE. An object with no resolved TYPE cannot take a canonical id, cannot be placed in a per-TYPE folder, and cannot be rendered by a TYPE-keyed view. It is held in `canon/unresolved/` — fully part of canon's *knowledge*, but outside the *typed* machinery — until its TYPE is resolved (§13.3), at which point it earns a `<TYPE>-N` id and moves to its per-TYPE folder.

**Exclusion is from typed derived views, not from canon.** An unresolved entry does not render in a TYPE-keyed view and is not counted by TYPE-scoped coverage (e.g. `REQ-COVERAGE-001`) — that machinery operates on a resolved TYPE the entry does not yet have. Its content is still authoritative canon; it is simply invisible to anything that needs a TYPE. Every tool that walks *typed* canon (the canon index, coverage, placement check, renderers) MUST therefore skip `canon/unresolved/` so an untyped entry is never mistaken for a typed element.

**It lives in shared, committed canon — never in `_intake/`.** Because an unresolved object carries real model knowledge, it cannot sit in the per-user, private `_intake/` workspace, whose contents are not shared with other modellers. It is committed to `canon/unresolved/` so the whole team sees and can resolve it. This is the opposite of a *candidate*, which is a pre-model extraction proposal that stages privately in `_intake/processing/` until a human admits it.

### 13.2 Fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `ingest_status` | yes | string | Always `unresolved` for an entry in this folder — the marker of the **type-resolution** axis (§13.1), independent of admission. It records that the TYPE is unknown, not that the content is untrusted. |
| `ingest_source` | yes | string | The source the object came from (file name or field-artefact id). |
| `ingest_field` | yes | string | The source field / column / path the object was extracted from. |
| `ingest_date` | yes | string | Quoted ISO 8601 date (§4) the object was ingested. |
| `related_to` | recommended | list | Typed IDs of known canon objects this unresolved object appears related to (e.g. the `PRODUCT` a materials list hangs off). |
| `data` | yes | any | The extracted payload, preserved verbatim for the reviewer. |

An unresolved entry MAY **also** carry any field a typed canon element would — an admission record (§6: `admitted_by`, `gate_checks`, `admission_state`), a `source_quality` (§11.2), and a lifecycle (§7) — when it is *admitted-but-untyped* (§13.1). Those fields keep their normal meaning; the entry simply has no resolved TYPE and therefore no `<TYPE>-N` id. It does **not** carry a `notation:` header (it is not a notation document) and is not given a typed canonical id until it is resolved (§13.3).

### 13.3 Resolution — the ingestion decision matrix

Human review resolves each entry to exactly one outcome. The full ingestion-routing matrix:

| Situation | Action |
|---|---|
| Known object, unknown fields | `extensions:` on the object (§12) |
| Unknown fields that are clearly attributes of a known object | `extensions:` on the parent (§12) |
| Object is a law / rule / standard | `codex` zone (§5) — *not* `canon/unresolved/` |
| Standalone object, unknown TYPE | `canon/unresolved/` (§13) |
| Same unknown TYPE recurs across ingestions | Propose a new entity TYPE in the methodology (a proposal, not an in-repo resolution) |

Resolving one `canon/unresolved/` entry means exactly one of:

- **promote** — the object is a real entity of a (possibly new) TYPE; admit it through the normal admission gate (§6) and delete the unresolved entry;
- **fold** — the object is actually an attribute of a known entity; move it into that entity's `extensions:` (§12) and delete the unresolved entry;
- **discard** — the object carries no modelling value; delete it.

`codex` is for laws, internal rules, and standards only (§5) — never a destination for a generic untyped ingested object.

### 13.4 Validation rules

| Rule | Severity | Description |
|---|---|---|
| `UNRES-001` | error | A file under `canon/unresolved/` is missing a required field (`ingest_status`, `ingest_source`, `ingest_field`, `ingest_date`, or `data`). |
| `UNRES-002` | error | A file under `canon/unresolved/` carries a TYPE-resolved canonical id (`<TYPE>-<INTEGER>` whose TYPE is registered, [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.1) — its TYPE is resolved, so it must move to its per-TYPE canon folder (§13.3), not linger in the holding area. (An admission record is **not** an error here — an entry may be admitted-but-untyped, §13.1.) |
| `UNRES-003` | warning | A `related_to` entry does not resolve to a known canon object. Cross-cutting (requires the full catalogue). |
| `UNRES-004` | error | A typed canon walker (canon index, coverage, placement, renderer) counts a `canon/unresolved/` entry as a typed element — the holding area MUST be skipped by TYPE-keyed machinery (§13.1). A tooling rule, enforced by the validator's catalogue load. |

The shared header rules (`HDR-001..004`, §2) do **not** apply to `canon/unresolved/` files — an unresolved entry has no resolved TYPE and therefore no `notation:` header, regardless of its admission state.

---

## 14. View-config contract

[`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §1.1 defines the **reconstruction invariant**: a view is `render(Elements + Relations, view_config)` → diagram. The elements and relations in `canon/elements/**` and `canon/relations/**` are the complete, sufficient source of truth for the organisation's behaviour; a view is a projection over them. This section formalises the *view_config* side of that contract — what it is, what it contains, where it lives, and how per-view specs declare their defaults.

### 14.1 What view_config is

A `view_config` is the **presentation layer** of a view document: the configuration that determines which elements and relations appear in a rendered view and how they are arranged. It is the *parameters* of the render function — not the source data, not canonical content.

**Belongs in `view_config`:**

| Category | Examples |
|---|---|
| Selection | which goals to include — by id, tag, type, or `all` |
| Filter | restrict the element set — by status, layer, zone, `valid_at` date, jurisdiction |
| Grouping | cluster elements — by layer, domain, type, custom key |
| Ordering | sort criteria within groups |
| Display options | depth limit, collapsed nodes, label format, column visibility, orientation |

**Does NOT belong in `view_config`** (these live in `canon/elements/**` and `canon/relations/**`):

- Canonical element data — names, descriptions, per-TYPE fields
- Lifecycle dates (`valid_from` / `valid_to`)
- Admission records
- Any fact about how the organisation works or what it has decided

**Corollary.** Deleting the entire `views/` folder entirely loses no model knowledge — all views regenerate from elements + relations + view_config files. A view carries no non-derivable information beyond its configuration ([`ELEMENT_PRIMITIVES.md`](ELEMENT_PRIMITIVES.md) §1.1).

### 14.2 Where view_config lives in a file

`view_config` is a **top-level key** in a view document (`*.<short-name>.transitrix.yaml`). It is separate from the file header fields (`notation:`, `spec_version:`) and from the view identity block (`view.id`, `view.name`, `methodology_version`). No view_config field belongs in the header; no header field belongs in `view_config`.

Structural layout of a view document:

```yaml
notation: dgca                # §1 — required header
spec_version: "0.1"           # §1 — optional header
methodology_version: "5.0.0"  # manifest-pinned methodology version
name: "Retail strategy chain" # §1.1 — required document name

view:                         # view identity block — id only; name lives at root per §1.1
  id: DGCA-RETAIL-1

view_config:                  # presentation layer — defined here (§14)
  goals:
    filter: all               # selection: include every GOAL in canon
  display:
    depth: 3                  # display option: max depth
    collapsed: []             # display option: no collapsed nodes
```

Each per-view notation spec ([`notations/views/`](views/)) defines the full set of valid `view_config` keys for that notation. Only keys defined by the spec are valid; unknown keys are an error (`VC-001`).

### 14.3 Per-view default-stating convention

Every view spec MUST declare **explicit defaults** for every optional `view_config` field. The defaults block in each view spec serves two purposes:

1. **Zero-config renders.** A view document that carries only the required envelope (`notation:`, `view.id`, `view.name`, `methodology_version`) renders deterministically — each omitted field falls back to its spec default. There is no implicit "show everything" that varies by tool version.

2. **Skill transparency (ties RPT-1).** When the CLI or report skill materialises a minimal view-config in response to a free-text request, it **states back** exactly which defaults were applied ("full goals set, depth unlimited, no filters"). The defaults block is the source of that statement; the skill reads spec defaults, never invents them.

The defaults block lives in the view spec under a `### view_config defaults` (or equivalent) heading. It is a commented YAML block listing each optional key with its default value and a short inline comment explaining the default:

```yaml
# Canonical defaults — spec authority
# A view_config that omits any of these falls back to the value shown.
view_config:
  goals:
    filter: all          # include every active GOAL in canon
  factors:
    surface: derived     # derive from the included goal set via goal.factors
  display:
    depth: null          # unlimited depth
    collapsed: []        # no collapsed nodes
```

Each per-view migration (VP-3+) adds this defaults block to its spec.

### 14.4 Validation rules

| Rule | Severity | Description |
|---|---|---|
| `VC-001` | error | A `view_config` key is not declared in the view spec for this notation — unknown keys are not accepted. |
| `VC-002` | error | A `view_config` entry (e.g. a filter or selection) references an element or relation ID that does not resolve in canon. The view_config is stale and must be updated. |
| `VC-003` | warning | A view spec has no explicit defaults block (§14.3). Zero-config renders are undefined for this notation; the CLI/skill cannot state assumptions. |

`VC-002` is cross-cutting — it requires the full canon catalogue to resolve. It is reported at render time, not at file-lint time.

---

### 14.5 Legacy layout (`canon/views/` — deprecated)

Repositories created before 2026-08-26 may carry views nested inside `canon/views/`, where `canon/views/<notation>/` holds view documents. This layout is **legacy and deprecated**. The normative layout places view documents in a `views/` folder that is a sibling of `canon/` at the organisation root, so the path becomes `views/<notation>/` instead.

**Transition policy.**

A repository in transition may carry both `canon/views/` (legacy) and `views/` (normative) during migration. The **diagnostic `MIX-001`** fires when both layouts coexist in the same organization:

| Rule | Severity | Description |
|---|---|---|
| `MIX-001` | warning | Both legacy `canon/views/` and normative `views/` folders exist under the same organisation root. The repository is in transition. Views are authoritative from the normative `views/` layout; the legacy `canon/views/` layout SHOULD NOT receive new elements. The diagnostic MUST name both paths found (e.g., "both `<org>/canon/views/` and `<org>/views/` exist") and SHOULD direct migration to the normative layout per [`method/02-repository.md`](../method/02-repository.md) §1.1a. |

When only `canon/views/` exists (no `views/` sibling yet), the validator accepts it as valid legacy. When both layouts exist, `MIX-001` fires to highlight that the repository is mid-transition. When only `views/` exists, `MIX-001` does not fire; the layout is fully migrated.

**Validator behaviour:** A validator that encounters `MIX-001` SHOULD warn that the legacy layout is deprecated and MAY halt admission of new elements into `canon/views/`. Validators MAY offer a codemod to migrate existing `canon/views/**` files to `views/**` automatically.

---

### 14.6 Rendered snapshots

A `view_config` defines *what* to render (§14.1). A **rendered snapshot** is the committed output of that render — a point-in-time record of which elements the view projected and their key display values, written by the CLI and checked into the adopter repository. It makes the captured state visible in git without re-running the CLI.

**Relation to canon.** A snapshot is derived, regenerable output — not canon. It carries no admission record (§6), no lifecycle (§7), and no confidence state (§11). Deleting a `snapshots/` folder loses no model knowledge; re-running `transitrix capture` regenerates it. The snapshot's authoritativeness derives from the canon it was rendered from, not from the snapshot file itself.

**Location.** Snapshots live in a `snapshots/` subdirectory alongside the view document they capture, within the notation's view folder:

```
views/
  <notation>/
    <view-file>.<notation>.transitrix.yaml   # the authored view document (unchanged by capture)
    snapshots/
      2026-06-20T143000Z.yaml                # one file per CLI Capture run
      2026-06-15T091200Z.yaml
```

**File naming.** Each snapshot is named with a compact ISO 8601 UTC timestamp: `YYYY-MM-DDTHHMMSSZ.yaml` — the date portion uses the standard hyphen-separated form; the time portion omits colons so the name is valid on all operating systems (including Windows). The CLI sets the timestamp at the moment of writing.

- Example: a capture at 14:30:00 UTC on 2026-06-20 produces `2026-06-20T143000Z.yaml`.
- Files sort alphabetically in chronological order; the most recent snapshot is always last.
- Sub-day precision is deliberate: the accumulation rule (below) requires each Capture to produce a distinct file, even when the CLI runs multiple times on the same calendar day.

**Required fields — shared envelope.** Every snapshot file MUST carry the following fields, regardless of notation:

```yaml
view_id: DGCA-RETAIL-1               # canonical ID of the view being captured
generated_at: "2026-06-20T14:30:00Z" # ISO-8601 UTC timestamp — matches the file name
methodology_version: "5.0.0"          # methodology version in use at generation time
# …notation-specific element list follows (format defined per notation spec)…
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `view_id` | yes | string | Canonical ID of the `view.id` in the view document being captured. |
| `generated_at` | yes | string | ISO-8601 UTC timestamp of when the CLI wrote this snapshot. Must match the timestamp encoded in the file name. |
| `methodology_version` | yes | string | Methodology version in effect when the CLI ran — allows staleness detection when the spec evolves. |

**Notation-specific content.** Beyond the shared envelope, each view notation spec defines which element and relation fields to denormalize into the snapshot. Each per-notation spec MUST define, under a `### Snapshot content` heading, at minimum:

- the canonical element **`id`** — traceable back to `canon/elements/`
- at least one **human-readable key field** (e.g. `name`, `label`) — so the snapshot is readable without CLI tooling or canon access

Notation-specific snapshot content definitions are added per notation in subsequent VP-series passes; this section fixes the shared envelope and the conventions that all notation snapshot definitions must follow.

**Authoring rules.**

1. **CLI-only writes.** Snapshots are written exclusively by `transitrix capture` (or the equivalent Studio action). Hand-editing a snapshot file is not accepted.
2. **Read-only after generation.** Snapshot files MUST NOT be modified after the CLI writes them. The git history of the `snapshots/` folder is the audit trail.
3. **Accumulation.** Each `transitrix capture` run creates a new timestamped file. Earlier snapshots are never overwritten or deleted by the CLI. Pruning old snapshots is a manual housekeeping decision by the adopter.
4. **View document unchanged.** Capturing a snapshot does not modify the `*.view.yaml` document or any canon element.

**Validation rules.**

| Rule | Severity | Description |
|---|---|---|
| `SNAP-001` | error | A file in a `snapshots/` directory is missing a required envelope field (`view_id`, `generated_at`, or `methodology_version`). |
| `SNAP-002` | error | `view_id` does not resolve to a `view.id` declared in any view document in the same notation folder. |
| `SNAP-003` | error | File name does not conform to `YYYY-MM-DDTHHMMSSZ.yaml` (compact ISO 8601 UTC timestamp, colons omitted, `Z` suffix required). |
| `SNAP-004` | warning | `generated_at` does not match the timestamp encoded in the file name — the file may have been renamed or copied outside the CLI. |
| `SNAP-005` | warning | An element `id` in the snapshot does not resolve in the current canon — the snapshot is stale relative to the model. Re-run `transitrix capture` to refresh. Advisory only; never blocks. |

`SNAP-002` and `SNAP-005` are cross-cutting (require the full canon catalogue and the view document set). `SNAP-001`, `SNAP-003`, and `SNAP-004` are per-file checks.

---

## 15. Domain vocabulary — Action vs Activity

Two terms in the methodology carry closely related names and must not be conflated.

| Term | Domain | Definition | Where used |
|---|---|---|---|
| **Action** | Project domain | A bounded, goal-directed unit of transformation work the organisation undertakes — an Initiative, Programme, Project, or Task (ArchiMate Work Package). Temporary: it starts, delivers, and ends. Modelled as the `ACTION` element TYPE. | ACTION elements (`canon/elements/05_implementation/actions/`); Action schedule (`*.action.transitrix.yaml`); Actions tree (`*.actions-tree.transitrix.yaml`); Action Card (`*.action-card.transitrix.yaml`); DGCA fourth column. |
| **Activity** | Process domain | A single step in a **recurring** business process — an operational task that repeats as part of normal operations (BPMN Task / ArchiMate Business Process step). Ongoing: it runs continuously as the business operates, not as a one-off transformation event. Modelled as a node inside a `PROCESS` element's `flow`. | BPMN (`*.bpmn.transitrix.yaml`); PROCESS elements (`canon/elements/02_business/processes/`); Process Blueprint (`*.process-blueprint.transitrix.yaml`). |

**Rule:** the word **Activity** MUST NOT be used to describe project-domain work items. The word **Action** MUST NOT be used to describe process-domain steps. Validators that detect `notation: activity` on a project-schedule document (distinct from `notation: bpmn` / PROCESS `flow` contexts) MUST emit `ACTION-005`.

**Historical note.** Prior to 2026-06-25 the project-domain primitive was called `ACTIVITY`. That name was deprecated in favour of `ACTION` to enforce this distinction, and as of the 1.0 release (2026-07-05) is fully removed: the `ACTIVITY` TYPE prefix, `activity_type` field, `activities:` array name, and `*.activities.transitrix.yaml` extension are no longer accepted — validators emit `ACTION-005` as an **error**, not a warning. See [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §6 for the migration checklist.

---

## 16. Link suspicion, content identity, and the mechanical-procedure hatch

A record that points at another primitive — a `REL`, an `ASSERTION`, a `VERIFICATION`, a `VALIDATION`, or an element that has committed to something (§6.3, when present) — carries a claim that was true of its target *at the time the claim was made*. Nothing here re-checks that claim; the far end can be rewritten afterward without anyone touching the record that pointed at it. This section defines a **derived** signal — never stored, never authored — that answers "has the thing I pointed at changed since I last looked at it?" from git history alone.

Three pieces, in order: what "changed" means (§16.1), how the signal is computed (§16.2), and how a bulk, non-editorial edit is told apart from one that should raise the signal (§16.3).

### 16.1 Content identity

**Content identity is the whole endpoint, parsed and normalised — not a curated per-spec list of "material" fields.** Reformatting a file, reordering its keys, or editing a comment changes nothing about content identity; changing a statement always does. Concretely: every non-blank, non-comment line of the file is kept **except** the lines belonging to the administrative envelope this CONTRACT already defines by name —

```
zone, admitted_at, admitted_by, gate_checks, derived_from,                 (§6)
admission_state, proposed_at, proposed_by, owner_to_confirm,
rejected_at, rejected_by, rejection_reason,                                (§6.1)
reviewer_authority,                                                        (§6.2)
agreement, agreed_by, agreed_at,                                           (§6.3, when present)
valid_from, valid_to                                                       (§7)
```

— the fields that record *who filed this and when*, never *what it says*. This is one generic exclusion list, defined once here, not a per-notation judgement call — a spec adding a new envelope field to §6 or §7 in a future revision extends this list in the same revision, not by inventing a second mechanism. The kept lines are whitespace-normalised, sorted, and hashed (`sha256:<hex>`, the same format `packages/ingest-cli/src/source-hash.mjs` uses for source fingerprints). Two files have the same content identity if and only if their non-envelope lines are the same multiset — order-independent, formatting-independent, comment-independent.

This is deliberately **not** a general YAML parser: a reference implementation only needs to tell "this line is part of the statement" from "this line is bookkeeping," and a flat, line-oriented pass over the already-well-known envelope field names does that without adding a parsing dependency to the toolchain (the same posture `scripts/baseline-manifest.mjs` and `scripts/check-agreement.mjs` already take).

### 16.2 Link suspicion — derived, never stored

**Link suspicion is computed fresh from git on every check; no file ever carries a `suspicious: true` flag.** The alternative — writing the result back onto the record — is exactly the failure mode `packages/reqif-cli`'s stored-revision suspect-link mechanism (`notations/packages/reqif.md` §2.9) already rejects for its own domain: a mutable flag goes stale the moment it stops being recomputed. This section generalises the same posture — derived, not stored — to every addressable link record core already has, using git as the append-only ledger instead of a stored revision counter.

The computation is one function of three inputs — an **anchor commit**, the **target's path**, and the **target's content identity (§16.1) at that commit versus now** — applied identically everywhere:

> *Suspicious* ⟺ the target's content identity at the anchor commit differs from its content identity now, **and** §16.3's hatch does not explain the difference.

The anchor is *when this record last looked at its target*, and it is resolved differently per application because "last looked at" means something different in each:

| Application | Record | Target | Anchor commit |
|---|---|---|---|
| **Suspicion on a relation** | `REL` (`from`/`to`, [17-relations.md](elements/17-relations.md) §2) or `ASSERTION` (`about`, and `subject_release` when present, [16-assertion.md](elements/16-assertion.md) §2) | the endpoint(s) the record resolves to | the record file's own most recent commit — the last time anyone touched the link |
| **Staleness on a comparison** | `VERIFICATION` (`verifies`, and `verified_on` when present, [27-verification.md](elements/27-verification.md) §2) or `VALIDATION` (`validates`, [28-validation.md](elements/28-validation.md) §2) | the `REQUIREMENT` / `NEED` it was run against, and the `RELEASE` it was run against where `verified_on` names one | the record file's own most recent commit — the last time the protocol's target was current |
| **Agreement lapse on an element** | a `REQUIREMENT` / `CONSTRAINT` / `NEED` carrying `agreement: agreed` (§6.3, when present) | itself | the most recent commit that touched the `agreement` / `agreed_by` / `agreed_at` lines specifically — the last time the accountable party actually committed, not the last time the file was edited for any reason |

The third row is the one case where record and target are the same file: an element can be edited after it was agreed without anyone re-confirming, and that is exactly the condition worth surfacing. Anchoring on "last commit that touched the agreement fields" rather than "last commit that touched the file" is what makes an unrelated edit (fixing a typo in an unrelated field, admitting a sibling element) invisible while a rewritten statement after agreement is not.

**Unresolvable and out-of-scope endpoints are silent, not suspicious.** A `REL-002` / `ASSERT-002` / `VERIF-002` / `VALID-002` endpoint-resolution failure is a validator error already; link suspicion only ever evaluates endpoints that resolve. A resolvable link that has never changed produces no finding — the same "suspect only ever appears with an explicit true/false, never a silent absence" distinction `reqif.md` §2.9 draws is not needed here because there is no stored flag to be silently missing; the report simply lists what it found suspicious and nothing else.

**Reports, never filters — same guardrail as §6.3.** Suspicion is a presentation concern: a badge a reviewer sees, a line in a report. No validator, coverage rule, or view generator may use it to exclude a relation, an assertion, a verification, a validation, or an element from anything. A suspicious link is still a link.

**A release qualifier adds an endpoint, not a mechanism.** `ASSERTION.subject_release` and `VERIFICATION.verified_on` extend the two rows above with one more resolvable endpoint each; the computation, the anchor, and the guardrail are unchanged. The separate question those qualifiers make askable — *has the release I pointed at been superseded?* — is **not** this computation and is deliberately not a fourth row: it is answered by walking the `predecessor` chain, not by comparing content identity across commits, and a superseded release's file typically has not changed at all. It inherits this section's derived-never-stored posture and its reports-never-filters guardrail, and nothing else. It is defined at [27-verification.md](elements/27-verification.md) §2.1.1.

A reference implementation of §16.1 and §16.2 lives in [`scripts/check-link-suspicion.mjs`](../scripts/check-link-suspicion.mjs).

### 16.3 The mechanical-procedure hatch

A bulk, non-editorial edit — a scripted rename, a reformat that a naive diff can't tell from a rewrite, a declared migration — can legitimately touch a target's content identity without any accountable party having reconsidered the statement. Suspicion firing on every such edit would make the signal useless within one bulk pass. The hatch lets a process declare its edit mechanical — but **the declaration alone is never sufficient**; the checker independently verifies it before suppressing suspicion.

A migration declares itself by writing a manifest alongside its recipe, under `migrations/<slug>/TRANSFORM.yaml`:

```yaml
mechanical: true
applies_to:
  - canon/elements/01_motivation/requirements/REQUIREMENT-DATA-ERASURE-1.yaml
line_edits:
  - from: "owner_role: ROLE-OLD-1"
    to: "owner_role: ROLE-NEW-1"
```

`applies_to` names the exact files the migration touches — not a glob, not a pattern; a bulk edit already knows precisely which files it wrote. `line_edits` names, line for line, exactly what changed. The checker's verification is a replay, not a trust exercise: it takes the target's content identity lines *before* the edit, applies the declared `line_edits` to them, and checks the result matches the target's content identity lines *after* the edit exactly. A match suppresses suspicion. Anything left over — a line the manifest didn't declare, a declared edit that doesn't appear in the actual diff — means the manifest didn't fully explain the change, and suspicion stands **regardless of the `mechanical: true` flag**.

This is the property that makes the hatch a checker-verified exemption rather than a mute button: **the editing tool cannot self-grant it.** Writing `mechanical: true` and walking away does nothing on its own; only a `line_edits` list the checker can independently replay and match does. A tool that declares itself mechanical but under- or over-states what it changed gets exactly the same suspicion result as a tool that made no declaration at all.

**Validation rules.**

| Rule | Severity | Description |
|---|---|---|
| `MECH-001` | info | A migration manifest under `migrations/<slug>/TRANSFORM.yaml` declares `mechanical: true` for a changed target, but replaying its `line_edits` against the target's before-state does not reproduce the after-state exactly — the hatch is refused and the change is reported exactly as if no manifest existed. |

`MECH-001` is informational, not a build-breaking error: refusal does not fail validation, it only means §16.2's suspicion computation proceeds without the exemption. A reference implementation lives in [`scripts/check-link-suspicion.mjs`](../scripts/check-link-suspicion.mjs), alongside §16.1 and §16.2.

**Additive.** Nothing in this section changes an existing schema, adds a required field to any TYPE, or alters an existing validation rule. A repository that declares no `migrations/*/TRANSFORM.yaml` manifest and never inspects link suspicion validates exactly as it did before this section existed.

## 17. Binding envelope — `canon_id` and `origin`

A project repository's element and a central repository's element are related by an optional, additive binding, not by a copy or a rename. The levels this binding is proposed and accepted at, the ownership rule it depends on, and the repository-boundary constraints it obeys are specified in [`method/09-releases-and-propagation.md`](../method/09-releases-and-propagation.md); this section defines the fields themselves and the rules a binding must satisfy.

### 17.1 Fields

| Field | Required | Type | Semantics |
|---|---|---|---|
| `canon_id` | no | string | On a `standalone` element in a **project** repository: the id of the central element this element is bound to, resolved against the repository's pinned catalogue. Absent by default — present only once a binding has been accepted, never authored ahead of acceptance. |
| `origin` | no | map | On an element admitted in the **central** repository: `{ repository: <slug>, id: <the local id it was promoted from> }` — where the element came from. Absent for an element the central repository authored itself. |

Both fields are facts recorded *alongside* an element's own envelope (§3) — neither is a required field on any TYPE, and neither substitutes for `id`. **No tool ever rewrites a local `id`** in order to add or remove a binding.

### 17.2 Validation rules

| Rule | Severity | Description |
|---|---|---|
| `BIND-001` | error | `canon_id` is present but does not resolve to any element in the repository's pinned catalogue. |
| `BIND-002` | error | `canon_id` resolves, but the resolved central element's TYPE differs from this element's own TYPE. |
| `BIND-003` | error | Two or more elements in the same catalogue carry the same `canon_id` — a central element cannot be the binding target of more than one local element. A **cross-catalogue** gate, requiring a full catalogue scan. |
| `BIND-004` | error | `canon_id` is present but the repository has no catalogue pin configured — a binding without a pin. |
| `BIND-005` | error | `origin` is present on an element that is not itself admitted in the central repository — `origin` records provenance for a central element, it is not a project-repository field. |

### 17.3 Rendering rule

A repository's own views always display its own `id` — a binding is metadata about an element, never a substitute for its identity at home. A rendered view never resolves `canon_id` in place of the id it is displaying.

### 17.4 Out of scope here

- **The catalogue itself** — its publication format, the pin field's shape and location in a consuming repository's manifest, and the version-match rule a pin resolves under — is specified where the catalogue-publishing mechanism lands, not here. `BIND-001` and `BIND-004` above assume that mechanism exists; they do not define it.
- **How a binding is proposed** — the matching, staging, and review-queue mechanics of recognition and promotion (L2 / L3, [`method/09-releases-and-propagation.md`](../method/09-releases-and-propagation.md) §6.2) — is separate from the envelope shape and rules a binding must satisfy once accepted, which is all this section defines.
- **`TERM` and other TYPE-specific catalogue content** are out of scope here; this section's fields and rules apply to any `standalone` element regardless of TYPE.

## 18. Validator behaviour and notation coverage

Every notation in the methodology family carries a published specification and a set of validation rules. The validator is the tool that enforces these rules across a repository. This section defines which notations are validated, what codes the validator may emit, and the requirement that every validation code produced by the validator must be documented in the specification.

### 18.1 Validated notations

The following notations are **validated** — their files are read and checked against the specification's validation rules:

**View notations (diagram, report, document):**
- `dgca` (Strategy-to-Execution Chain, §2-dgca.md)
- `goals` (Goals tree, §04-goals.md)
- `action` (Action schedule, §07-action.md)
- `action-card` (Action card narrative, §18-action-card.md)
- `blocks` (Multi-level container layouts, §08-blocks.md)

**Element notations (zone primitives):**
- `goal` (Goal element, §02-goal.md)
- `codex` (Codex entry, §14-codex.md)
- `requirement` (Requirement element, §15-requirement.md)
- `assertion` (Assertion element, §16-assertion.md)
- `relation` (Relation element, §17-relations.md)
- `action` (Action element, §24-action.md)
- `verification` (Verification element, §27-verification.md)
- `validation` (Validation element, §28-validation.md)

### 18.2 Skipped notations

The following published notations are **not currently validated** — their files are recognised but not checked:

**View notations:**
- `bpmn` (BPMN process flow, §01-bpmn.md)
- `capability-map` (Capability hierarchy with maturity, §05-capability-map.md)
- `process-map` (Process catalogue, §06-process-map.md)
- `applications` (Application inventory, §10-applications.md)
- `integration-map` (Application integration graph, §12-integration-map.md)
- `process-blueprint` (Value-chain blueprint, §13-process-blueprint.md)
- `scenarios` (Scenarios report, §11-scenarios.md)
- `compliance-impact` (Compliance matrix report, §21-compliance-impact.md)
- `coverage-metric` (Coverage metric report, §22-coverage-metric.md)
- `actions-tree` (Actions tree report, §23-actions-tree.md)
- `rules-in-force` (Rules in force report, §24-rules-in-force.md)
- `glossary` (Glossary report, §32-glossary.md)
- `mrd` (Marketing Requirements Document, §29-mrd.md)
- `srs` (Software Requirements Specification, §30-srs.md)
- `sdd` (Software Design Description, §31-sdd.md)

**Element notations:**
- `actor` (Actor element, §19-actors.md)
- `stakeholder` (Stakeholder element, §20-stakeholders.md)
- `location` (Location element, §21-locations.md)
- `amendment` (Amendment element, §22-amendment.md)
- `segment` (Segment element, §23-segment.md)
- `business-service` (Business Service element, §25-business-services.md)
- `node` (Node element, §25-nodes.md)
- `technology-service` (Technology Service element, §26-technology-services.md)

### 18.3 Validator code publication rule

Every code the validator may emit — error, warning, or info — **must appear in a published specification table.** Codes are documented in one of two places:

1. **Shared codes** (apply to all or multiple notations) are documented in this document (CONTRACT.md). Examples: `HDR-001..004` (header rules, §2), `LIFECYCLE-001..004` (primitive lifecycle, §7.3), `MECH-001` (mechanical migration, §16.3), `BIND-001..005` (binding envelope, §17.2).

2. **Notation-specific codes** (apply only to one notation) are documented in that notation's specification file, in the "Validation rules" section. Examples: `DGCA-001..021`, `GOALS-009..011`, `GOALS-REQ-001..003` (in their respective spec files).

No code may be emitted by the validator that does not appear in a published table. When the validator is updated to emit a new code, the corresponding specification section must be updated in the same release.

### 18.4 Skipped notation reporting

The validator **must report which notations it encountered but did not validate.** When a file of a skipped notation type is discovered:

- **In a validation run that reports counts:** the skipped notation's filename is listed in the output with a status of "SKIPPED" or "NOT VALIDATED" (exact wording is implementation-specific), distinguishing it from errors and warnings.
- **In a validation run over a complete repository:** the count of files examined equals the count of files expected in the repository (i.e., a file of a skipped notation is counted as "examined" but reported as skipped, not silently omitted from the count).

**Example output:**

```
✓ DGCA file: views/dgca/strategy-2026.dgca.transitrix.yaml (clean)
⊘ BPMN file: views/diagrams/order-flow.bpmn.transitrix.yaml (SKIPPED — validator not yet implemented)
✓ Goal element: canon/elements/01_motivation/goals/GOAL-REVENUE-1.yaml (clean)
✓ Requirement element: canon/elements/01_motivation/requirements/REQUIREMENT-DATA-ERASURE-1.yaml (clean)

Summary: 7 files examined, 6 validated, 1 skipped, 0 errors, 0 warnings.
```

This way, a file of a currently-skipped notation is never silent — its presence is visible, and the output tells the reader why it was not checked.
