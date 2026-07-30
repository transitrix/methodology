---
title: "Requirement — motivation-layer positive obligation"
version: "1.0"
author: "Valerii Korobeinikov"
last_updated: "2026-07-30"
status: "draft"
---

# Requirement — Reference

**Scope:** The `REQUIREMENT` element type in the motivation layer of an organisation's canon — a positive obligation the organisation must fulfil ("must submit", "must register", "must obtain approval"). The shared header / zone / admission / lifecycle contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Requirements are **zone primitives**: each requirement is a single YAML file under `canon/elements/01_motivation/requirements/`, named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`) plus the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7) and the requirement-specific frontmatter below.

---

## 1. REQUIREMENT vs CONSTRAINT — by form of the obligation

The motivation layer carries two element types with overlapping vocabularies but distinct semantics. The boundary is the **form of the obligation**:

| | REQUIREMENT | CONSTRAINT |
|---|---|---|
| **What it is** | A positive obligation — an action or state the org must achieve | A restriction or prohibition — a boundary the org must not cross |
| **Typical wording** | "MUST", "SHALL", "must submit", "must register", "must maintain", "must obtain" | "MUST NOT", "SHALL NOT", "is limited to", "cannot exceed", "must not exceed" |
| **Test** | "What do we have to do?" | "What are we forbidden from?" |
| **Element TYPE** | `REQUIREMENT` | `CONSTRAINT` |
| **Folder** | `canon/elements/01_motivation/requirements/` | `canon/elements/01_motivation/constraints/` |

Both types are first-class motivation elements (per ArchiMate 3.2). Both may carry the same regulatory attributes (`deadline`, `obligation_level`, `requirement_type`, `derived_from`) — the form distinction is orthogonal to the regulatory dimension. A REQUIREMENT and a CONSTRAINT derived from the same source law sit side by side in the model, distinguished only by their form.

**Boundary examples:**

| Wording | Type | Why |
|---|---|---|
| "Manufacturer must obtain premarket approval for Class III devices" | REQUIREMENT | positive action — *obtain* approval |
| "Class III devices cannot be marketed without prior approval" | CONSTRAINT | restriction — *cannot* be marketed |
| "Manufacturer must register its establishment annually with the regulator" | REQUIREMENT | positive action — *register* |
| "An unregistered establishment cannot manufacture or distribute" | CONSTRAINT | restriction — *cannot* manufacture |

The same regulation often produces a REQUIREMENT and a corresponding CONSTRAINT (the two sides of the same rule). Both are valid; both may be modelled — but not every rule warrants both. §1.1 sets the authoring defaults for obligations extracted from a codex source; §1.2 sets the test for when to mirror.

### 1.1 Default classification for extracted obligations

When an obligation is **extracted from a codex source** — by an automated harvest (e.g. a regulatory-intelligence collector) or by a human reading a law / regulation / policy — the form of the obligation in the source text determines the TYPE. The defaults below apply; they are conventions, not validator rules. The `origin` field (§2.1) captures the broader context — a legislative obligation from a regulation receives `origin: legislative`; obligations extracted from a process/SOP document receive `origin: process-product`; obligations from a BRD or project charter receive `origin: project-product`.

| Obligation form in source text | Default TYPE | Rationale |
|---|---|---|
| Positive duty — verbs of action / state to *achieve* ("must register", "must submit", "must maintain", "must obtain", "shall provide") | `REQUIREMENT` | Positive obligation per §1; this is the dominant form of regulatory text in practice. |
| Pure prohibition with no paired positive duty in the same rule — verbs of restriction ("must not transfer", "cannot market", "shall not retain beyond", "is limited to") | `CONSTRAINT` | Restriction per §1; the source imposes a boundary, not an action. |
| Both forms present in the same rule (registration duty AND prohibition on unregistered activity; retention duty AND prohibition on premature erasure) | both, per §1.2 | The rule has two distinct subject sets or two distinct enforcement surfaces (§1.2). |

**Positive obligations are the dominant form.** Practical experience extracting obligations from laws and regulations shows the overwhelming majority are positive duties. A scanner / collector's CLASSIFY step SHOULD default to `REQUIREMENT` for any obligation that is plausibly action-shaped, and surface only the unambiguously-restrictive ones as `CONSTRAINT`. Modelling positive obligations as `CONSTRAINT` is a common authoring mistake — `ASSERTION` ([elements/16-assertion.md](16-assertion.md)) binds compliance claims to `REQUIREMENT` (via `about:`), so a positive obligation mis-typed as `CONSTRAINT` has no surface for an assertion to bind to.

### 1.2 When to mirror a REQUIREMENT with a CONSTRAINT — and when not

Some rules genuinely have two sides; many do not. Authoring both a REQUIREMENT and a mirror CONSTRAINT for every rule doubles the catalogue without adding model power and inflates `REQ-COVERAGE-001` noise (every mirror needs its own assertion line). The test:

**Mirror (author both) when at least one of:**

- **The source text uses both forms.** "The manufacturer must register its establishment annually; an unregistered establishment shall not manufacture or distribute medical devices." Two sentences, two forms, one rule — author `REQUIREMENT-MFR-REGISTER-…` and `CONSTRAINT-UNREGISTERED-MFR-…`.
- **The negative form binds a different subject set.** The REQUIREMENT binds the regulated entity (e.g., a registered manufacturer); the CONSTRAINT binds any actor in the same role (registered or not — distributors, importers, retailers can also be subjects of an "unregistered establishment cannot …" prohibition). The two sides are not the same compliance scope and an assertion against one does not cover the other.
- **The negative form has independent enforcement machinery.** A different penalty regime, a different audit surface, or a different competent authority enforces the prohibition than the positive duty. When the model is consumed for compliance reporting, the two sides need to be tracked separately.

**Author only the positive form (`REQUIREMENT`) when:**

- The source rule is a pure affirmative duty — periodic reporting, registration, maintenance, audit preparation, notification — and the rule text imposes no independent prohibition of failing to do it. "Failing to register" is implicit in the duty and does not need a separate `CONSTRAINT`. The same applies when a derived prohibition would simply restate the requirement in the negative ("must register" ↔ "must not be unregistered") with no added subject set or enforcement surface.

**Author only the negative form (`CONSTRAINT`) when:**

- The source rule is a pure prohibition with no associated affirmative duty in the same scope. "The controller shall not transfer personal data outside the EEA without an adequacy decision or appropriate safeguards." There is no positive duty to *transfer* — the regulation does not require transfer, it restricts it. Authoring a synthetic `REQUIREMENT-TRANSFER-WITH-SAFEGUARDS` would invent an obligation the source did not impose.
- A pre-existing `REQUIREMENT` already captures the affirmative duty and the prohibition adds nothing the assertion against the `REQUIREMENT` does not already cover. **Do not double-model the same rule.**

**Authoring sequence for a scanner-extracted positive obligation:** classify as `REQUIREMENT` (§1.1 default); admit; only then consider whether §1.2 mirror conditions apply and, if so, author a separate `CONSTRAINT` element. The mirror is a deliberate authoring decision, never an automated emission.

---

## 2. Frontmatter — canonical schema

```yaml
notation: requirement
id: REQUIREMENT-DATA-ERASURE-1
name: "Personal-data erasure on user request within 30 days"
description: "On request from a data subject, the controller must erase personal data within 30 days. The window starts at the time the request is received and verified."

# Optional attributes
origin: legislative             # legislative | process-product | project-product — see §2.1
severity: high                  # high | medium | low — organisation-defined priority
level: system                   # stakeholder | system | software — ISO/IEC/IEEE 29148 ladder — see §2.5
kind: functional                # functional | quality — see §2.6
parent: REQUIREMENT-PERSONAL-DATA-PROTECTION-1  # optional; same-TYPE decomposition — see §2.4
next_review_at: "2027-06-01"    # optional; drives REQ-STALE-001 — see §2.3
derived_from:                   # typed IDs of source documents this requirement is drawn from
  - LAW-PERSONAL-DATA-2017-1
  - REGULATION-GDPR-2016-1

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-05-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2017-05-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `requirement`. Machine-readable type tag (redundant with the ID prefix but useful for tooling that reads files without parsing IDs). |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `REQUIREMENT-[<middle>-]<INTEGER>`. |
| `name` | yes | string | One-line statement of the requirement. (Was `title` before the 2026-05-29 single-label-field decision; see [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §3.) |
| `description` | yes | string | Longer-form explanation of the obligation, its scope, and the conditions under which it applies. |
| `origin` | no | string | Origin / kind distinguishing the context from which the requirement was derived. Closed vocabulary — see §2.1. Omitted requirements are treated as `legislative` by tooling that supports filtering. |
| `severity` | no | string | One of `high`, `medium`, `low`. Organisation-defined priority for planning and reporting. Distinct from `obligation_level` (regulatory force, RFC 2119 — out of scope for v1; see [§5](#5-evolution)). |
| `level` | no | string | One of `stakeholder`, `system`, `software` — the ISO/IEC/IEEE 29148 specification tier. Distinct from `origin` and `parent` — see §2.5. |
| `kind` | no | string | One of `functional`, `quality` — whether the obligation is a behaviour/capability or a non-functional attribute. See §2.6. |
| `parent` | no | string | `REQUIREMENT-…` — the higher-scale REQUIREMENT this one decomposes from. Enables authoring a broad obligation once and decomposing it into more specific sub-requirements. Inline; not time-aware (v0.x transitional, same shape as `CHANGE.parent` in [ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.3 and `LOCATION.parent` in §7.22). Origin-agnostic — see §2.4. |
| `next_review_at` | no | string | Date by which the requirement should be re-reviewed — quoted ISO 8601. Drives the `REQ-STALE-001` staleness warning. Origin-agnostic (§2.3). |
| `derived_from` | no | list | Typed IDs of the codex artefacts this requirement is drawn from. Permitted TYPEs: `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`. Empty or absent for internal-only requirements with no codex source. |
| `zone` | yes | string | Always `canon` for REQUIREMENT — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`); see [CONTRACT.md](../CONTRACT.md) §6. |
| `valid_from` | yes | string | Date the requirement took effect — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the requirement ceased to be in effect, or `null` if still in effect — see [CONTRACT.md](../CONTRACT.md) §7. |

### 2.1 `origin` — requirement taxonomy

`origin` captures the context from which the requirement was drawn — the domain and source type that gave rise to the obligation. This drives filtering, reporting, and ingest classification (a BRD and a regulation both produce `REQUIREMENT` elements but under fundamentally different authority chains).

| Value | Meaning | Typical source documents | Default `derived_from` TYPEs |
|---|---|---|---|
| `legislative` | Obligation derived from a law, regulation, standard, or internal policy — an externally imposed or formally adopted rule the organisation must comply with. | Law / regulation text, standards documents, internal policies, compliance frameworks. | `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD` |
| `process-product` | Requirement on the output or product of a **PROCESS** — what the process must deliver, in what shape, to what quality threshold. Typically extracted from SOPs, process specifications, or quality-management documents. | SOP, process spec, quality manual, ISO work instruction. | None (no codex source; `derived_from` cites field artefacts or is absent) |
| `project-product` | Requirement on a deliverable or product of a **PROJECT** or initiative — what the project must produce to satisfy its stakeholders. Typically extracted from BRDs, project charters, product specs, or stakeholder briefs. | BRD, project charter, product spec, stakeholder brief, RFP. | None (same as above) |

**Closed vocabulary.** Values outside `legislative | process-product | project-product` are rejected by REQ-004.

**Default when omitted.** A REQUIREMENT without `origin` is treated as `legislative` by tooling that supports origin-based filtering. Existing requirements admitted before this field was introduced carry no `origin` and are grandfathered as implicitly `legislative` (they were extracted from codex sources under the original compliance scope of this spec). Authors SHOULD add `origin` on newly admitted requirements; backfilling existing records is optional.

**Relation to `derived_from`.** `origin: legislative` requirements typically carry a `derived_from` list citing the codex artefact; `process-product` and `project-product` requirements typically do not (they derive from field artefacts — the interview, the BRD document, the process spec — not from codex sources). Having a `derived_from` codex reference does not override an explicit `origin: process-product` if the author intentionally set it (a process spec that is itself governed by a regulation may produce a `process-product` requirement that also cites the governing regulation as a `derived_from` reference).

**Relation to `ASSERTION`.** The `origin` field does not change which elements may be subjects of an `ASSERTION` targeting this `REQUIREMENT`. `ASSERTION.about` always references a `REQUIREMENT` id regardless of origin; the subject TYPE constraint (`PRODUCT | PROCESS | CAPABILITY`) comes from [elements/16-assertion.md](16-assertion.md) §3, not from `origin`.

**Origin-agnostic trace chain.** The forward trace from a REQUIREMENT to its realising elements — REQUIREMENT ← `ASSERTION.about`; `ASSERTION.subject` → `PRODUCT` / `PROCESS` / `CAPABILITY`; `ASSERTION.realised_via` → any admitted canonical element ([elements/16-assertion.md](16-assertion.md) §2, §2.1, §2.3) — is uniform across every `origin` value. A `process-product` REQUIREMENT extracted from an SOP and a `legislative` REQUIREMENT extracted from a regulation admit the same ASSERTION shape and the same realising subjects; downstream tooling that reads the ASSERTION catalogue derives the realisation and compliance trace without branching on `origin`. Backward-trace to source is the only origin-dependent leg: `legislative`-origin REQUIREMENTs typically cite codex artefacts through `derived_from` and rely on codex change-monitoring for the *maintain* task; `process-product` and `project-product` REQUIREMENTs typically cite field artefacts or nothing and rely on `next_review_at` (§2.3) instead. `CONSTRAINT` compliance is not yet tracked via `ASSERTION` in v1 ([elements/16-assertion.md](16-assertion.md) §1) — the origin-agnostic forward trace covers REQUIREMENTs only; the same statement applies vacuously to CONSTRAINTs until a parallel mechanism lands.

The upshot: no new element, field, or relation is required to trace an obligation of any `origin` end-to-end (source → REQUIREMENT → realising PRODUCT/PROCESS/CAPABILITY, via ASSERTION). Adopters modelling `process-product` or `project-product` obligations author the same ASSERTION shape they would for a `legislative` obligation; the trace chain is intact.

Field naming follows the conventions in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) and [CONTRACT.md](../CONTRACT.md); no requirement-specific naming conventions are introduced.

**Proposed (pre-admission) requirements.** An automated harvest (e.g. a regulatory collector) MAY emit a REQUIREMENT in the `proposed` admission state — a candidate extracted from a codex source that has not yet been human-reviewed. It carries `admission_state: proposed` per [CONTRACT.md](../CONTRACT.md) §6.1, is excluded from admitted canon and every derived view, and does **not** trigger `REQ-COVERAGE-001` until a human admits it (`proposed → active`). The collector never writes admitted canon; a human gate admits or rejects each draft. A proposed REQUIREMENT SHOULD carry `owner_to_confirm: ROLE-…` ([CONTRACT.md](../CONTRACT.md) §6.1) to route the open item to the accountable ROLE for review — e.g. `ROLE-LEGAL-1` for a proposed legal obligation awaiting Legal confirmation. Absent `owner_to_confirm` emits `ADMIT-008` (warning).

---

### 2.2 Admission entry points — two paths, one gate

Any `REQUIREMENT` or `CONSTRAINT`, regardless of `origin`, must pass **one human admission gate** before entering admitted canon. The gate is invariant; the path that leads to it differs by source type.

**Path A — ingest-skill pipeline (all origins):**

```
raw material (_intake/inbox/)
  → convert  (field artefact in field/, raw in _intake/processed/)
  → emit-candidates  (candidate in _intake/processing/candidates/, admitted_to: pending)
  → review-queue  (human reviews source_quality, origin, extraction_confidence)
  → admit  (human gates candidate → REQUIREMENT in canon/ with zone: canon, admission_state: active)
```

`emit-candidates` produces a candidate with `admitted_to: pending`. This candidate is **not** in `canon/` — it is in the staging area. A human runs the review-queue, confirms each candidate, and invokes `admit` to write the canon YAML. This path is **origin-agnostic**: `process-product` and `project-product` requirements from interviews, BRDs, and SOPs go through exactly the same steps as `legislative` requirements from field-zone copies of legislation. The `origin` value is simply passed through from the extraction prompt to the candidate and on to the admitted REQUIREMENT — no separate queue, no separate gate.

**Path B — codex-collector (legislative only):**

```
codex artefact in codex/external/<jurisdiction>/
  → automated extraction  (REQUIREMENT written directly to canon/ with admission_state: proposed)
  → human ratification  (human flips proposed → active, completing gate_checks)
```

The codex collector writes a `REQUIREMENT` file **directly into `canon/`** at `admission_state: proposed`. The file is structurally valid canon (fully typed, fully shaped) but excluded from admitted canon and derived views until a human completes the gate by flipping `admission_state: proposed → active`. This path is **legislative-only** by design: it applies to obligations extracted from law/regulation/policy documents whose structured format (a codex artefact with a `source_hash`) makes the extraction reliably near-final.

**Why the paths differ — and why both have one gate:**

| | Path A (ingest, all origins) | Path B (codex-collector, legislative) |
|---|---|---|
| Source material | Unstructured field artefacts | Structured codex artefacts with source_hash |
| Candidate location before gate | `_intake/processing/candidates/` | `canon/` at `admission_state: proposed` |
| Gate mechanism | `review-queue` + `admit` CLI command | Human edits `admission_state: proposed → active` |
| Who writes pre-gate candidate | ingest skill's `emit-candidates` | Automated collector |
| Origins served | `legislative`, `process-product`, `project-product` | `legislative` only |
| Human gate | Required before any `active` canon | Required before `proposed → active` |

Both paths converge at the same human decision: nothing enters admitted canon without a human reviewing and explicitly accepting the candidate. The difference is **where the pre-gate staging artefact lives** (`_intake/` staging vs. `canon/` at `proposed`) and **who writes it** (the ingest skill vs. the collector). There is no second gate for `process-product` or `project-product` requirements — they share Path A with legislative requirements.

---

### 2.3 `next_review_at` — review-due signal for non-codex origins

A `legislative`-origin REQUIREMENT can be kept current by re-scanning its `derived_from` codex source: when the underlying law or regulation is amended, downstream mechanisms (codex change-monitoring, [`AMENDMENT`](22-amendment.md)) surface a `CHANGE`/Gap against the affected REQUIREMENT. A `process-product` or `project-product` REQUIREMENT has no equivalent — its motivating source (an SOP, a BRD, a stakeholder brief) is a field artefact, not a monitorable codex document, so there is nothing for a scanner to re-scan.

**`next_review_at`** closes that gap with a lightweight authoring convention: the author records the date on which the requirement is next due for human review, and tooling surfaces requirements whose review date has arrived.

- **Semantics.** `next_review_at` is the date by which the author expects the requirement to be re-examined against its motivating source — checked for continued applicability, updated wording, or retirement. It is **not** `valid_to` (which retires the obligation) and **not** `assessed_at` (which records when an ASSERTION's status was last determined).
- **Origin-agnostic.** The field is available on any REQUIREMENT regardless of `origin`; the taxonomy in §2.1 does not restrict its use. In practice the field is primarily useful for `process-product` and `project-product` origins (no codex to scan). `legislative`-origin requirements typically rely on codex change-monitoring instead — but MAY carry `next_review_at` where codex monitoring is not (yet) in place, or where a periodic Legal / DPO re-review is required regardless of amendments.
- **Optional.** Absent or `null`, the requirement is not evaluated for staleness. Existing admitted requirements without the field are unaffected.
- **Authoring guidance.** For `process-product` requirements, align with the SOP's revision cadence (annual, biennial). For `project-product`, use the project close-out or a stakeholder sign-off milestone. Backfilling the field on legacy requirements is optional; new admissions of non-codex origins SHOULD set it.
- **Stale = today ≥ `next_review_at`.** A requirement is **stale** when today's date is greater than or equal to its `next_review_at`. Stale requirements are surfaced by `REQ-STALE-001` (§4) and by the `check-stale` CLI command (§5). Being stale is a signal, not an error: the author is asked to review, not to change anything by default.
- **Relation to codex change-monitoring (#153).** These are **two independent mechanisms**, deliberately separate. Codex change-monitoring re-scans a `derived_from` source and stays `legislative`-only; `next_review_at` is a review-checkpoint convention that stays origin-agnostic. A `legislative` REQUIREMENT covered by codex monitoring does not need `next_review_at`; a `process-product` REQUIREMENT (with no codex source) uses `next_review_at` as its only staleness signal.

The same convention applies symmetrically to **CONSTRAINT** ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.13): authors MAY set `next_review_at` on a CONSTRAINT and the `check-stale` command surfaces overdue CONSTRAINTs alongside overdue REQUIREMENTs.

---

### 2.4 `parent` — requirement hierarchy

A REQUIREMENT is a single obligation, but obligations naturally decompose: a broad "the organisation must protect personal data" is realised by narrower sub-obligations ("must obtain consent before processing", "must erase personal data on request within 30 days") that share the same source, subject set, or accountability chain. `parent` lets that decomposition be modelled explicitly on the requirement's own record, without inventing a new relation type.

- **Same-TYPE.** `parent` names another admitted `REQUIREMENT` — the higher-scale obligation this one decomposes from. Cross-TYPE hierarchies (REQUIREMENT → CONSTRAINT and vice versa) are not supported: a REQUIREMENT (positive obligation) and a CONSTRAINT (restriction) are peer motivation-layer elements per §1, not decompositions of one another. Mirror-pairs authored per §1.2 do not use `parent`.
- **Inline; not time-aware.** `parent` is a timeless cross-reference on the requirement's own record — the same shape as `CHANGE.parent` ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.3) and `LOCATION.parent` (§7.22). It is v0.x transitional and does **not** live in a `REL-…` file. If a time-aware requirement hierarchy is ever needed, a first-class `requirement_parent` REL kind ([elements/17-relations.md](17-relations.md)) is the promotion path — the current inline field is chosen for parity with the existing multi-scale primitives.
- **Origin-agnostic.** The taxonomy in §2.1 does not restrict `parent`. Any two REQUIREMENTs may be linked regardless of their `origin` values — a broad `legislative` obligation may decompose into `legislative` sub-obligations, and a `project-product` deliverable-quality obligation may decompose into finer `project-product` sub-obligations. Cross-`origin` decomposition (e.g. a `legislative` parent with a `process-product` child) is permitted but should be authored deliberately: it typically signals an organisational choice to satisfy a legal duty through a process-quality obligation, and the reasoning belongs in the child's `description`.
- **Structure only, no traversal semantics.** `parent` records structure; it does **not** imply that satisfying the parent's obligation is realised by satisfying all children, or that a claim about the parent aggregates its children. Compliance claims remain per-REQUIREMENT via `ASSERTION` ([elements/16-assertion.md](16-assertion.md)); a hierarchy view over `parent` is a downstream tooling concern, not a validator concern. In particular, `REQ-COVERAGE-001` (§4) evaluates per-REQUIREMENT and is unaffected by parent linkage — a parent REQUIREMENT is not "covered" by an ASSERTION targeting its child.
- **Optional.** Requirements without `parent` are top-level. Cycles in the `parent` chain are ill-formed (a REQUIREMENT is not its own transitive parent) but not currently a validator concern — same posture as `CHANGE.parent` and `LOCATION.parent`. Backfilling `parent` on existing admitted requirements is optional.

The same convention applies symmetrically to **CONSTRAINT** ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.13): authors MAY set `parent: CONSTRAINT-…` to decompose a broad restriction ("no personal data outside the EEA without safeguards") into narrower ones ("no PII in analytics logs sent outside the EEA"). Same-TYPE, same origin-agnostic semantics, same structure-only interpretation.

**Precedent — one convention across `parent` fields.** Same-TYPE inline `parent` is the settled v0.x shape across multi-scale primitives: `CHANGE.parent` ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.3, capability → process → step decomposition) and `LOCATION.parent` (§7.22, enclosing location). Reusing that shape here keeps the authoring surface uniform; no new pattern is introduced.

---

### 2.5 `level` — specification tier (ISO/IEC/IEEE 29148 ladder)

`level` records which specification tier the requirement belongs to, per the ISO/IEC/IEEE 29148 StRS → SyRS → SRS ladder:

| Value | Tier | Meaning |
|---|---|---|
| `stakeholder` | Stakeholder Requirements Specification (StRS) | What a stakeholder needs, in stakeholder/business language — solution- and technology-agnostic. |
| `system` | System Requirements Specification (SyRS) | What the system as a whole must do to satisfy the stakeholder requirements it realises — still solution-agnostic at the software level. |
| `software` | Software Requirements Specification (SRS) | What a specific software component must do — the most granular tier, closest to implementation. |

**Closed vocabulary.** Values outside `stakeholder | system | software` are rejected by `REQ-005` (§4).

**Distinct from `origin`.** `origin` (§2.1) records the *authority chain* a requirement was drawn from (a law, a process spec, a project brief) — orthogonal to `level`. A `legislative`-origin requirement can be authored at any tier: a clause quoted near-verbatim from a regulation is typically `stakeholder`-level; a `system`-level requirement decomposed from it (§2.4, `parent`) inherits the same `origin` but narrows the tier, not the source.

**Distinct from `parent`.** `parent` (§2.4) records structural decomposition — which broader REQUIREMENT this one narrows from — with no level semantics of its own. `parent` linkage may span tiers (a `system`-level child of a `stakeholder`-level parent, the typical direction of decomposition) or stay within one (splitting a broad `stakeholder` requirement into two narrower `stakeholder` requirements). The ladder above describes the *typical* decomposition direction; it is authoring guidance, not a validator constraint in v1 — `REQ-005` checks only that a present `level` value is one of the three, not that a child's `level` deepens relative to its parent's.

**Optional.** Requirements without `level` are level-agnostic — the same posture as pre-existing requirements admitted before this field was introduced. Backfilling `level` on existing admitted requirements is optional.

### 2.6 `kind` — functional vs quality

`kind` classifies the obligation's nature:

| Value | Meaning | Example |
|---|---|---|
| `functional` | A behaviour, action, or capability the subject must provide — *what* it must do. | "must erase personal data on request", "must notify the competent authority within 24 hours" |
| `quality` | A non-functional attribute the subject must exhibit — performance, reliability, security, usability, maintainability, or a similar cross-cutting property that qualifies *how* functional behaviour is delivered rather than adding new behaviour. | "must retain logs for at least 12 months", "must respond within 200ms", "must be available 99.9% of the time" |

**Closed vocabulary.** Values outside `functional | quality` are rejected by `REQ-006` (§4).

**Not `requirement_type`.** The planned `requirement_type` field ([§5](#5-evolution), pending design work — `DEFINITIONAL` / `PRODUCT` / `PROCESS` / `DOCUMENTATION` / `ORGANIZATIONAL` / `REPORTING`) classifies what *domain* a requirement targets. `kind` classifies whether the obligation itself is functional or a quality attribute — an orthogonal axis. The two are not substitutes for one another and may eventually coexist on the same REQUIREMENT.

**Optional.** Absent `kind` means unclassified; no default value is assumed by tooling.

---

## 3. File location and naming

```
canon/elements/01_motivation/requirements/<ID>.yaml
```

One artefact per file, named by its canonical ID. Examples:

- `canon/elements/01_motivation/requirements/REQUIREMENT-DATA-ERASURE-1.yaml`
- `canon/elements/01_motivation/requirements/REQUIREMENT-AUDIT-LOG-RETENTION-1.yaml`

The folder sits alongside `canon/elements/01_motivation/constraints/` — the two motivation-layer obligation catalogues are peers, not nested.

---

## 4. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `REQ-001` | error | `id` is missing or does not match the canonical grammar `REQUIREMENT-[<middle>-]<INTEGER>` ([IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1); or any required field from §2 (`notation`, `name`, `description`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) is missing. |
| `REQ-002` | error | A value in `derived_from` is a well-formed typed ID but does not resolve to any admitted codex artefact in the organisation's `codex/` zone. |
| `REQ-003` | error | A value in `derived_from` resolves to an artefact whose TYPE is not one of `LAW`, `REGULATION`, `POLICY`, `INTERNAL_STANDARD`. Requirements derive only from codex source documents. |
| `REQ-004` | error | `origin` is present but its value is not one of `legislative \| process-product \| project-product`. |
| `REQ-005` | error | `level` is present but its value is not one of `stakeholder \| system \| software` (§2.5). |
| `REQ-006` | error | `kind` is present but its value is not one of `functional \| quality` (§2.6). |
| `REQ-COVERAGE-001` | warning | A REQUIREMENT has no ASSERTION targeting it — no file under `canon/assertions/` carries `about: <this REQ id>`. Surfaces a compliance gap: the obligation exists in the model but the organisation makes no recorded claim about whether any subject satisfies it. The rule is `warning` rather than `error` because a newly admitted REQUIREMENT legitimately has no assertion yet. Cross-cutting — fires on the REQUIREMENT but is computed by scanning the assertions catalogue. |
| `REQ-VERIF-COVERAGE-001` | warning | A REQUIREMENT has no admitted `VERIFICATION` targeting it — no file under `canon/verifications/` carries `verifies: <this REQ id>` ([27-verification.md](27-verification.md) §2). The engineering V&V analogue of `REQ-COVERAGE-001`: the ASSERTION and VERIFICATION catalogues are independent ([27-verification.md](27-verification.md) §4), so a REQUIREMENT may carry compliance coverage with no V&V evidence, or vice versa. `warning`, not `error`, for the same reason as `REQ-COVERAGE-001` — a newly admitted REQUIREMENT legitimately has no verification yet, and a purely compliance-origin REQUIREMENT may never accrue one. Cross-cutting — fires on the REQUIREMENT but is computed by scanning the verifications catalogue. |
| `REQ-VERIF-COVERAGE-002` | warning | A REQUIREMENT has one or more admitted `VERIFICATION`s targeting it, but none has reached `outcome: pass` or `outcome: fail` — every verification against it is still `not_yet_run` or `inconclusive` ([27-verification.md](27-verification.md) §3). The trace link exists but has not closed. Distinct from, and mutually exclusive with, `REQ-VERIF-COVERAGE-001` by construction. Cross-cutting, same computation basis. |
| `REQ-STALE-001` | warning | `next_review_at` is set and is in the past relative to today (§2.3). The requirement is due for re-review. Time-dependent — the same file may pass on one day and fire on the next; surfaced by the `check-stale` CLI command (§5) so evaluation is explicit rather than embedded in every validate pass. Applies symmetrically to CONSTRAINT ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.13). Malformed / unparseable `next_review_at` values silently skip evaluation (the CLI flags them in a separate line rather than firing a false stale). Mirrors `ASSERT-008` ([16-assertion.md](16-assertion.md) §5). |

The shared lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) and header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) rules apply to REQUIREMENT files in addition to the REQ-* rules above. The aggregated compliance-and-verification-domain rules table (covering REQUIREMENT, ASSERTION, and VERIFICATION) lives in [CONTRACT.md](../CONTRACT.md) §8.

---

## 5. Evolution

**Landed (v0.7, 2026-07-30):**
- §2.5 + §2 schema — optional `level: stakeholder | system | software` field, the ISO/IEC/IEEE 29148 StRS → SyRS → SRS specification-tier ladder. No new TYPE. Distinct from `origin` (authority chain) and `parent` (structural decomposition, no level semantics) — both documented explicitly to head off conflation. `REQ-005` enforces the closed vocabulary.
- §2.6 + §2 schema — optional `kind: functional | quality` field, classifying whether the obligation is a behaviour/capability or a non-functional attribute. Distinct from the still-pending `requirement_type` field below — orthogonal axes, not substitutes. `REQ-006` enforces the closed vocabulary.
- Both fields are additive: absent on existing requirements, no migration recipe, no change to required fields.

**Landed (v0.6, 2026-07-26):**
- §4 — `REQ-VERIF-COVERAGE-001` / `REQ-VERIF-COVERAGE-002`, the reverse-trace completeness rules for the REQUIREMENT ↔ `VERIFICATION` leg ([27-verification.md](27-verification.md)): no verification targets the requirement at all, or every one that does is still unresolved (`not_yet_run` / `inconclusive`). Resolves the "deliberately out of scope" question left open when `VERIFICATION` landed.

**Landed (v0.5, 2026-07-03):**
- §2.1 — origin-agnostic trace-chain audit: documented explicitly that the forward trace (REQUIREMENT ← `ASSERTION.about`; `ASSERTION.subject` → PRODUCT / PROCESS / CAPABILITY; `ASSERTION.realised_via` → any admitted element) is uniform across every `origin` value. No new element, field, or relation is required to trace an obligation of any origin end-to-end; audit found no structural gap.
- §2.4 + §2 schema — optional `parent: REQUIREMENT-…` field. Same-TYPE, inline, timeless — the same shape as `CHANGE.parent` ([`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.3) and `LOCATION.parent` (§7.22). Lets a broad requirement decompose into narrower sub-requirements without inventing a new relation type. Origin-agnostic. The same convention is mirrored on CONSTRAINT via [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.13 (`parent: CONSTRAINT-…`).

**Landed (v0.4, 2026-07-03):**
- §2.3 + §4 — `next_review_at` review-checkpoint field (optional ISO 8601 date, origin-agnostic) and `REQ-STALE-001` warning. Closes the "Maintain" gap for `process-product` / `project-product` origins that have no monitorable codex source — codex change-monitoring (#153 track) stays `legislative`-only by design; `next_review_at` is a lightweight orthogonal mechanism. Surfaced by the `check-stale` CLI command in `@transitrix/ingest-cli` (walks `canon/elements/01_motivation/requirements/` and `.../constraints/`, reports overdue by ID). The same convention applies symmetrically to CONSTRAINT via [`ELEMENT_PRIMITIVES.md`](../ELEMENT_PRIMITIVES.md) §7.13.

**Landed (v0.3, 2026-07-03):**
- §2.2 — documented the two admission entry points (ingest-skill `pending` path and codex-collector `proposed` path) and confirmed that `emit-candidates` is origin-agnostic: `process-product` and `project-product` requirements pass through the same pipeline steps as `legislative` ones. The codex-collector `proposed` path is deliberately `legislative`-only (codex artefacts are structured and near-final; field material is not).

**Landed (v0.2, 2026-07-02):**
- `origin` field — three-value taxonomy (`legislative | process-product | project-product`) distinguishing the context from which the requirement was derived. Ingest classification: `emit-candidates` and the extraction prompts pass `origin` through based on source-document context signals.

**Pending design work (separate tasks) extends the REQUIREMENT schema with regulatory attributes that apply symmetrically to REQUIREMENT and CONSTRAINT:**

- `deadline` (ISO 8601 date) and an extended `status` vocabulary (`active` / `upcoming` / `past_due` / `compliant` / `deprecated` / `retired`).
- `obligation_level` (`SHALL` / `SHOULD` / `MAY` — RFC 2119 language for positive obligations; the corresponding `SHALL_NOT` / `SHOULD_NOT` apply on CONSTRAINT).
- `requirement_type` (`DEFINITIONAL` / `PRODUCT` / `PROCESS` / `DOCUMENTATION` / `ORGANIZATIONAL` / `REPORTING`).
- A structured `derived_from` block (`document_id` + `section` + `section_url` + extraction provenance).

A separate notation (`ASSERTION`, planned) will link a REQUIREMENT to the elements that realise it (products / processes / capabilities) with status and evidence. Until that lands, a REQUIREMENT records the obligation; the model carries no machine-readable claim about whether it is satisfied.

A worked example yaml under `organizations/acme_corp/canon/elements/01_motivation/requirements/` plus a per-folder README is planned alongside the broader compliance worked-examples wave; not part of this initial registration.

---

## 6. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- Codex source documents that requirements derive from: [14-codex.md](14-codex.md).
- The engineering V&V counterpart that `REQ-VERIF-COVERAGE-001`/`-002` (§4) check for: [27-verification.md](27-verification.md).
