# Knowledge Store

**Pattern type:** three-layer  
**Complexity:** medium  
**System-agnostic counterpart:** Knowledge Refinery pattern  
**OKF alignment:** Google Cloud Open Knowledge Format v0.1 (announced 2026-06-12) — spec at [GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)

---

## Overview

Transitrix includes an optional knowledge store component for organisations that need a structured curation layer between raw source material and the canonical model. The knowledge store is part of the methodology — not a separate or competing system. It uses [Google Cloud Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) as its storage format, which provides interoperability with OKF-compatible tooling while keeping knowledge objects fully within the Transitrix lifecycle.

## Problem

Raw source material — interview notes, meeting summaries, research documents — accumulates faster than it can be curated into the canonical model. Authors dump directly into `canon/` and quality degrades, or they leave everything in `field/` and canon never grows. There is no structured hand-off between "collected" and "validated".

## Solution

Three explicit layers with clear promotion rules: project repos contribute raw material, the Transitrix knowledge store curates it into OKF-formatted knowledge objects, and Transitrix canon holds only what has been validated and promoted.

```
┌────────────────────────────────────────────┐
│              source layer                  │
│                                            │
│  project repos — raw notes, docs, data     │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│   Transitrix knowledge store (optional)    │
│                                            │
│  OKF knowledge objects — curated, dated    │
└──────────────────────┬─────────────────────┘
                       │
┌──────────────────────▼─────────────────────┐
│         Transitrix canon layer             │
│                                            │
│  canon/ — validated primitives             │
└────────────────────────────────────────────┘
```

## Layers

### Source layer — project repos

Each project repo contributes raw material: meeting notes, interview transcripts, survey data, draft documents. Material lives under `field/` in each repo. No Transitrix structure is required at this layer — it is an input feed, not a model.

### Refinement layer — Transitrix knowledge store

The Transitrix knowledge store holds curated knowledge objects in OKF format: Markdown files with structured YAML frontmatter, explicit source citations, and timestamps. Curators pull from the source layer, extract signal, and write knowledge objects. Nothing reaches this layer without a citation and a timestamp.

OKF frontmatter per knowledge object (Google OKF v0.1 fields + Transitrix extensions):

| Field | Required | Notes |
|---|---|---|
| `type:` | **yes** | Short string identifying the kind of concept — no central registry, choose descriptive values (e.g. `insight`, `finding`, `concept`, `source-document`) |
| `title:` | recommended | Display name; derived from filename if omitted |
| `description:` | recommended | Single-sentence summary |
| `resource:` | recommended | Canonical URI for the underlying asset (Google OKF field) |
| `tags:` | recommended | YAML list for categorisation |
| `timestamp:` | recommended | ISO 8601 datetime of last modification |
| `source:` | Transitrix extension | Repo path or URI of the originating document (provenance) |
| `created_at:` | Transitrix extension | Date the object was curated (distinct from `timestamp:` which tracks modifications) |
| `confidence:` | Transitrix extension | Curator's epistemic assessment: `observed` / `inferred` / `assumed` |
| `supersedes:` | optional | Transitrix extension | ID or bundle-relative path of the knowledge object this one supersedes (re-curation; the old object is retained for history). Absent by default. |
| `superseded_by:` | optional | Transitrix extension | ID or bundle-relative path of a newer knowledge object that supersedes this one. Absent by default. |

OKF consumers must not reject bundles for unknown fields — Transitrix extensions are fully compatible.

**Bundle conventions (Google OKF v0.1):**
- `index.md` — progressive-disclosure directory listing; keep auto-generated and current
- `log.md` — chronological change history, date-grouped entries; record routing decisions, admit decisions, and assertion outcomes here
- Links between concept files use bundle-relative paths (`/knowledge/concept-name.md`)

### Canon layer — Transitrix repo

Validated primitives — DRIVER, GOAL, CHANGE, CAPABILITY, and others — promoted from the knowledge store. Each element in `canon/elements/` corresponds to one or more knowledge objects. The promotion decision is a pull request; review is the validation gate.

Transitrix also distributes canonical vocabulary back downstream: a generated glossary or object-reference stubs committed to project repos keep source-layer teams aligned with the enterprise model.

## Quality gates

Quality gates are the rules the methodology places at the boundaries between layers — at ingest (raw → refinement layer) and at promotion (refinement → canon). The **methodology owns the rules**: what must hold before admission and before promotion. The **implementation owns the enforcement**: the shape engine, dedup algorithm, and tooling that verify the rules. This split keeps the quality guarantee portable across implementations while allowing each to use the most appropriate technical approach.

### Gate 1 — Quarantine on arrival

Every document admitted to the knowledge store enters as a `source-document` record in `_intake/processed/` (or its equivalent in a multi-repo deployment). No content is cited, answered from, or promoted until it has passed through the refinement layer.

**Rule:** raw material entering the refinement layer MUST be assigned the OKF `type: source-document` status on admission. Agents operating on the knowledge store MUST NOT read from `_intake/` as a source of answers; they read only from `knowledge/` (knowledge objects) and `canon/` (promoted primitives). The quarantine is not optional.

**Rationale:** errors admitted as if true propagate to every downstream object that cites the source. Fail at write, not at read.

### Gate 2 — One canonical definition per concept

Before an extracted knowledge object is written to `knowledge/`, it MUST be checked against existing canon terms and existing knowledge objects. A new object either maps to an existing concept or explicitly proposes a new one.

**Rule:** a knowledge object MUST NOT silently introduce a definition that conflicts with or duplicates an existing canon element. Mapping options:
- **Confirms** — the object corroborates an existing element (link to it in the body; no new `canon/` entry needed).
- **Extends** — the object adds detail to an existing element (update the knowledge object; open a PR to amend the existing canon element).
- **Proposes** — the object describes a genuinely new concept (create a new knowledge object; open a PR to add a new `canon/` element).
- **Conflicts** — the object contradicts an existing element; this MUST be flagged explicitly and held for human review before admission.

**Rationale:** a second definition of the same concept breaks the single-model guarantee. Every downstream user who queries the knowledge store gets one answer; ambiguity devalues the store.

#### Gate 2.1 — Supersession, not rewriting

When a knowledge object needs updating due to changed understanding or new information — a curation refresh — it is **superseded rather than rewritten in place**. The old object is retained in the repository for history and auditability; a new object is created with the updated curation, and both objects record their relationship via `supersedes` and `superseded_by` fields.

**Rule:** a curator who needs to update a knowledge object MUST NOT edit the original in place. Instead:

1. Create a new knowledge object with the updated curation.
2. On the new object, add `supersedes: <old-object-id>` (or bundle-relative path `/knowledge/old-name.md`).
3. On the old object, add `superseded_by: <new-object-id>` (or bundle-relative path).
4. The old object is retained and remains queryable; consumers following the `superseded_by` pointer are directed to the newer version.

**Fields:**
- `supersedes:` (optional) — ID or bundle-relative path of the knowledge object this one replaces. Only one object may supersede another (no chains beyond two objects). Absent by default.
- `superseded_by:` (optional) — ID or bundle-relative path of a newer knowledge object that supersedes this one. Only one object may be pointed to (no forks). Absent by default.

The two fields form a bidirectional pair: when set, both MUST name each other. A linter will flag `KS-019` if the pair is incomplete (e.g., `supersedes` set but the target does not carry `superseded_by`, or vice versa).

**Rationale:** re-curation produces new knowledge, not a replacement state machine. The full history — what was believed, when it changed, why — remains in the repository for audit, causal reasoning, and recovery. A repository that deletes old objects when they are superseded loses that history. Consumers reading `superseded_by` follow to the current version; queries over the store at a point in time can slice by `timestamp` to surface objects valid on a given date.

### Gate 3 — Blast-radius-aware promotion

Not all knowledge objects carry equal risk. Core vocabulary and widely-referenced elements touch every downstream citation; an error in them multiplies across the entire knowledge store.

**Rule:** the promotion gate for an object is calibrated to its blast radius:

| Risk tier | Characteristics | Required gate |
|---|---|---|
| Low | New, few or no dependents | Standard PR review |
| Medium | Extends an existing element with 2–9 dependents | Reviewer must confirm no dependent is invalidated |
| High | Touches core vocabulary or has 10+ dependents | Human sign-off required; re-validate all dependents after promotion |

Implementations SHOULD compute dependent counts from the canon graph before emitting the risk tier. When dependent counts are unavailable, default to the Medium gate. Never auto-promote to High without explicit human confirmation.

**Rationale:** the cost of a wrong high-blast-radius promotion is proportional to the number of objects that inherit the error. The gate scales the human review effort to the actual risk.

### Gate 4 — Provenance and confidence mandatory

Every object in the knowledge store — source-document records and knowledge objects alike — MUST carry provenance (`source:`) and epistemic confidence (`confidence:`). Missing provenance blocks admission; missing confidence blocks promotion.

**Rules:**
- `source:` (repo path or URI to the originating document) MUST be set before an object is admitted to `_intake/processed/`.
- `confidence:` MUST be set (`observed` / `inferred` / `assumed`) before a knowledge object is promoted to `knowledge/`. Default is forbidden — a curator must make an explicit assessment.
- `timestamp:` MUST be updated when an object is modified.
- **Low confidence + high dependents = review flag.** An object with `confidence: assumed` that has 3 or more downstream dependents MUST NOT be promoted without a review note explaining the assumption. Flag it in `_intake/log.md` and hold for sign-off.

**Rationale:** downstream consumers — human analysts and AI agents alike — need to know how much to trust each object and where it came from. Removing provenance makes the knowledge store an assertion engine with no accountability.

### Gate 5 — Scoped consistency (open tier)

The first-build gates (1–4) catch shape, provenance, and duplicate *candidates*. Gate 5 adds **deterministic consistency rules** over admitted knowledge objects — contradictions and epistemic ordering that a structural linter can check without NLP or OWL reasoning.

**Open-tier rules (methodology-owned, shipped in the reference linter):**

| Rule | What it checks |
|---|---|
| **Mapping vocabulary** | Optional `mapping:` on a knowledge object MUST be one of `confirms` / `extends` / `proposes` / `conflicts` (Gate 2 vocabulary). |
| **Declared conflicts** | `mapping: conflicts` MUST name the contradicted target in `conflicts_with:` (a `/knowledge/…` path or typed canon id). The object MUST NOT be treated as promoted until a human records the hold in `_intake/log.md`. |
| **Confidence ordering** | A knowledge object's `confidence:` MUST NOT rank higher than the `source-document` it cites when that source resolves to an `_intake/processed/` record (`assumed` < `inferred` < `observed`). |

**Out of scope for the open tier:** semantic contradiction detection (natural-language "these two paragraphs disagree"), cross-store reasoning, or canon-graph traversal beyond the explicit `conflicts_with:` pointer. Those belong to the proprietary advanced reasoner in DSM (see boundary below) — the open tier stays useful standalone without it.

### Gate 6 — Assisted ingest (propose–verify–dispose)

Ingestion is **assisted**, not autonomous: a proposer (model or agent) drafts candidates; deterministic gates (Gates 1–5 via the reference linter) **dispose** structurally; **ambiguity** routes to a human queue — never auto-promoted.

**Three tiers:**

| Tier | Role | May write to | May cite for answers |
|---|---|---|---|
| **Proposer** | Model / agent extraction | `_intake/drafts/` only | No |
| **Verifier** | Deterministic linter + gates | — (read-only check) | No |
| **Curator** | Human review + admit authority | `knowledge/` after approval | Yes (via promoted objects) |

**Workflow:**

1. **Propose** — extracted candidates land in `_intake/drafts/` using the draft template. Each draft carries `review_status:` (`ready` / `ambiguous` / `blocked`) and, when ambiguous, a non-empty `ambiguity_note:` explaining what needs human judgement.
2. **Verify** — run `tools/knowledge_store_lint.py` over the store **including drafts**. Fix every error on draft paths before presenting the batch to the curator. Warnings require explicit acknowledgment.
3. **Review** — curator approves, rejects, or resolves ambiguous items. Agents MUST NOT write to `knowledge/` before explicit approval.
4. **Dispose** — approved drafts are copied to `knowledge/` with draft-only fields (`review_status`, `ambiguity_note`) removed; the draft file is deleted; the linter runs again; `[admit]` is logged. Ambiguous items held for review are logged as `[ambig]` until resolved.

**Rule:** agents operating on the knowledge store MUST NOT read from `_intake/drafts/` as a source of answers — same quarantine discipline as `_intake/processed/` (Gate 1). Only `knowledge/` and `canon/` are answer surfaces.

**Rationale:** the proposer is fallible; the verifier is not. Separating draft from promoted zones localises model error to a disposable staging area and keeps promotion behind a human gate.

### Methodology ↔ implementation boundary

The gates above are **methodology properties**: they hold regardless of which tool enforces them. A conformant implementation — whether Studio, DSM, a custom ingest pipeline, or a manual curation process — MUST satisfy all gates at the boundaries described. Gate 5 open-tier rules and the Gate 6 propose–verify–dispose workflow are likewise methodology properties; the advanced contradiction engine is not.

What a conformant implementation MAY vary:
- The mechanism for computing dependent counts (graph query, static analysis, cached index)
- The fuzzy-match algorithm for deduplication
- The UI for presenting quarantine, draft, and review queues
- Whether enforcement is automated (CI check) or manual (checklist)
- Whether `_intake/drafts/` is gitignored (ephemeral agent runs) or committed (audit trail during review)

What it MAY NOT vary: the admission rules, the risk-tier table, the mandatory-field requirements, the Gate 5 open-tier consistency rules, and the Gate 6 rule that proposers MUST NOT write directly to `knowledge/`.

**Reference implementation:** [`tools/knowledge_store_lint.py`](../tools/knowledge_store_lint.py) is a proof-point enforcement of Gates 1–6 over `_intake/processed/`, `_intake/drafts/`, and `knowledge/` — structural validation (required fields, the `confidence` enum), referential integrity (dangling bundle-relative links), duplicate-title detection (Gate 2), blast-radius tiering with the assumed-confidence review flag (Gate 3–4), scoped consistency checks (Gate 5 open tier), and draft-zone assisted-ingest rules (Gate 6). It is one conformant implementation, not the only one; a different tool MAY use a different shape/dedup engine as long as it satisfies the same rules. Run it with `python3 tools/knowledge_store_lint.py <knowledge-store-root>`.

**Validation codes (reference implementation):**

| Code | Severity | Gate | Description |
|---|---|---|---|
| `KS-001` | error | — | Frontmatter block missing or not valid YAML. |
| `KS-002` | error | — | Missing required field `type:`. |
| `KS-003` | error | 1 | `_intake/processed/` record does not carry `type: source-document` (quarantine violation). |
| `KS-004` | error | 4 | Missing `source:` on an intake record — blocks admission. |
| `KS-005` | error | 4 | Missing or invalid `confidence:` on a knowledge object — blocks promotion. |
| `KS-006` | warning | 4 | Missing `timestamp:` on a knowledge object (recommended). |
| `KS-007` | error | 6 | Dangling bundle-relative link (`/knowledge/…`) in object body. |
| `KS-008` | warning | 2 | Title similarity suggests a possible duplicate — confirm Confirms/Extends, not silent mint. |
| `KS-009` | info | 3 | Blast-radius tier (Low / Medium / High) from dependent-object count. |
| `KS-010` | warning | 4 | `confidence: assumed` with 3+ dependents — requires review note in `_intake/log.md`. |
| `KS-011` | error | 5 | `mapping:` present but not one of `confirms` / `extends` / `proposes` / `conflicts`. |
| `KS-012` | error | 5 | `mapping: conflicts` without a resolvable `conflicts_with:` target. |
| `KS-013` | warning | 5 | Knowledge-object `confidence:` ranks higher than its cited source-document (epistemic ordering violation). |
| `KS-014` | error | 5 | `mapping: conflicts` without a matching `[conflicts]` hold entry in `_intake/log.md`. |
| `KS-015` | error | 6 | `review_status:` (draft marker) present on a promoted `knowledge/` object. |
| `KS-016` | error | 6 | Draft missing or with invalid `review_status:` (`ready` / `ambiguous` / `blocked`). |
| `KS-017` | error | 6 | `review_status: ambiguous` without a non-empty `ambiguity_note:`. |

| `KS-018` | error | — | `supersedes` present but the referenced object does not exist or does not resolve. |
| `KS-019` | warning | — | `supersedes` and `superseded_by` point to each other but one is missing on the other side (bidirectional pointer inconsistency). |
| `KS-020` | error | — | A knowledge object in `knowledge/` (non-draft) carries both `supersedes` (points backward) and is pointed to by a `superseded_by` with incorrect identity — the pointer target and actual pointer source do not match. |
Integrity test harness: [`transitrix/skills/knowledge-store/tests/test_knowledge_store_integrity.py`](../transitrix/skills/knowledge-store/tests/test_knowledge_store_integrity.py) (CI job `knowledge-store-lint-test`).

---



For early adoption where standing up a separate knowledge repo adds too much overhead, the refinement layer can live as folders inside the Transitrix repo:

```
_intake/
  inbox/           ← incoming documents (gitignored — temporary staging)
  originals/       ← source files archived by reference (gitignored)
  processed/       ← OKF source-document records (type: source-document)
  drafts/          ← proposer output (Gate 6 — not cited; not promoted until curator approves)
  log.md           ← all events: [route] / [admit] / [ambig] / [conflicts] / [assert]

knowledge/         ← OKF knowledge objects (type: insight / finding / concept / ...)
  index.md         ← auto-generated bundle index
  <concept>.md     ← individual knowledge objects

canon/             ← Transitrix primitives (unchanged)
```

**Ingestion routing:** a single document can feed one or both tracks.
- **OKF track** — extract knowledge object drafts → verify with linter → curator reviews → promote to `knowledge/` → update `index.md`
- **Canon track** — extract Transitrix primitives → open PR to `canon/` → merge gate

All incoming documents are always archived to `processed/` as OKF source-document records before routing begins. `originals/` is gitignored; the processed record carries `source:` (path or URI) and `source_hash:` (SHA-256) for integrity.

Migrate to a separate knowledge repo when the single-repo structure becomes congested or when a dedicated curation role is established.

## When to use

- Multiple project repos producing source material that exceeds one team's capacity to review directly.
- An explicit curation role exists (knowledge manager, enterprise architect) who is distinct from the project teams.
- Source material quality is uneven and needs a structured validation stage before reaching canon.
- Downstream consumers (other tools, teams, systems) need stable, versioned canonical objects with traceable provenance.

## How to start

1. **Establish the canon first.** Follow the [Transitrix Alone](transitrix-alone.md) pattern. The knowledge store is an additive layer — `canon/` does not change shape when you add it.
2. **Enable the knowledge store** (or scaffold the single-repo MVP folders above). Decide the `confidence:` vocabulary your team will use (`observed / inferred / assumed` is a reasonable default).
3. **Instrument source repos.** Add a convention for capturing raw material: `field/` folder, a lightweight template, and a note in each project's `CONTRIBUTING.md` pointing to the knowledge repo as the curation destination.
4. **Define the promotion criteria.** Document in the knowledge repo's `README.md` what makes a knowledge object ready to promote: minimum confidence level, required fields, review sign-off.
5. **Promote the first batch.** Create a PR for each promoted object. Link the PR back to the knowledge object(s) it was derived from. This establishes the provenance chain.
6. **Wire the return path.** Set up a process (manual or automated) to publish a generated glossary or object-reference stubs from Transitrix back to source repos. This closes the loop and keeps project teams aligned with canon.

## Templates

Starter templates for the two core OKF record types live alongside this pattern:

- [`knowledge-store-templates/okf-source-document.md`](knowledge-store-templates/okf-source-document.md) — copy to `_intake/processed/` for each ingested document; covers `type`, `source`, `source_hash`, `confidence`, `tracks`, and routing notes
- [`knowledge-store-templates/okf-knowledge-object.md`](knowledge-store-templates/okf-knowledge-object.md) — copy to `knowledge/` for each extracted concept; covers `type`, `description`, `resource`, `confidence`, citations, and examples
- [`knowledge-store-templates/okf-knowledge-object-draft.md`](knowledge-store-templates/okf-knowledge-object-draft.md) — copy to `_intake/drafts/` during assisted ingest (Gate 6); adds `review_status` and `ambiguity_note`

**Initialise the MVP bundle with these two files:**

`_intake/log.md`:
```markdown
# Intake log

Entries are date-grouped. Each entry carries a type tag: [route] routing decision, [admit] chunk approval, [ambig] ambiguity hold, [conflicts] contradiction hold, [assert] assertion outcome.

## YYYY-MM-DD
```

`knowledge/index.md`:
```markdown
# Knowledge index

Auto-updated when knowledge objects are added or modified. Each entry: title, type, confidence, source.

| Object | Type | Confidence | Source |
|---|---|---|---|
```

## Compaction: Design Frame

Knowledge stores grow without bound. As object counts accumulate, storage and query performance degrade. **Compaction** is the process of selectively removing objects to keep the store bounded while preserving provenance and reversibility.

Compaction is **not automatic, not fast, and not a performance optimization alone.** It is an organizational decision — when and how an adopter chooses to retire old objects — recorded as an Architecture Decision Record in their own `operations/decisions/` folder, not a background cron job. This section documents the design frame: which variants exist, what each preserves and costs, and the invariants any algorithm must satisfy.

### Three invariants (non-negotiable)

Any compaction algorithm MUST satisfy all three:

1. **Nothing reachable from canon by `derived_from` is ever compacted away.** Criterion is mechanical reachability — if a canon element carries `derived_from: /knowledge/object-name`, that object MUST remain in the store. Compaction never orphans a canon citation.

2. **Reversible, or provable.** Either the compacted objects are restorable from archival storage (cold store, version control, S3), or the fact and contents of removal are cryptographically attested (SHA-256 manifest, signed deletion record) so the history survives and can be audited. Silent deletion is not permissible; evidence of what was removed MUST be preserved.

3. **Never automatic.** Compaction is human-triggered, deliberate, and recorded. No cron job, no background process, no "cleanup" that runs on schedule. The `knowledge/` zone's contract is provenance; the zone whose raison d'être is "nothing lost" does not get automatic pruning. An adopter makes the call, documents it in their ADR, and takes responsibility.

### Design variants

Four compaction variants are visible across typical enterprise knowledge stores. Each is a different point in the trade-off space between recency (removing old objects) and reversibility (keeping evidence).

#### Variant 1: Supersession-based (immature objects only)

**What it removes:** knowledge objects marked `superseded_by:` field (have been re-curated with a newer version).

**Preservation:** The superseding object carries `supersedes:` pointing back; consumers know where to look. Audit trail is semantic (explicit pointers in remaining objects), not cryptographic.

**Reversibility:** Complete if the new object is kept; the old object is recoverable from version control or backup without new infrastructure.

**Costs:**
- Storage: Medium (old objects are removed once a successor exists)
- Reversibility: High (implicit in semantic links and VCS history)
- Complexity: Low (check for presence of `superseded_by:` field)

**Satisfies invariants:**
1. ✓ Canon references cannot be to superseded objects (superseded = no longer current; canon cites current)
2. ✓ Pointers survive (in new objects and VCS); removal is provable from history
3. ✓ Can be human-triggered per ADR; no algorithm runs automatically

**When to use:** Orga nizations that re-curate regularly (stable knowledge objects with periodic updates); low-risk compaction since only explicitly-replaced objects are removed.

#### Variant 2: Date-based (tiered expiry)

**What it removes:** knowledge objects whose `timestamp:` is older than a threshold (e.g., objects not modified in 2 years), EXCEPT those cited by canon.

**Preservation:** Objects are archived to cold storage (timestamped tarball, S3, version control tag) before removal. Manifest of removed objects (filename, hash, removal date, remover) is retained.

**Reversibility:** Complete; cold store is consulted if an object is needed again; manifest proves what was removed and when.

**Costs:**
- Storage: Low (old objects moved off primary store)
- Reversibility: Medium (requires operational discipline: cold store must be managed, manifests must be queryable)
- Complexity: Medium (date parsing, canon reachability check, archival process)

**Satisfies invariants:**
1. ✓ Canon reachability is checked before removal
2. ✓ Removal is recorded in manifest; cryptographic hashes ensure tamper evidence
3. ✓ Manual trigger (per ADR) for archive-and-remove batches

**When to use:** Organizations with large, mature knowledge stores and discipline around version control and archival. Requires external storage and lifecycle tooling.

#### Variant 3: Risk-tier based (cascade from low-impact objects)

**What it removes:** knowledge objects tiered by blast radius (inferred from dependent-object count in canon). Only Low-tier objects (few canon citations, none critical) are compacted; Medium and High tier are always preserved.

**Preservation:** Removal is by tier; manifest records which objects belonged to which tier at removal time.

**Reversibility:** Medium; depends on whether canon references still exist (if an object is removed and later needed, can canon point be re-resolved from history?).

**Costs:**
- Storage: Medium (some objects kept, risky ones always kept)
- Reversibility: Medium (depends on tier assignments and canon stability)
- Complexity: Medium-High (blast-radius computation, tier assignments, dependencies on canon)

**Satisfies invariants:**
1. ✓ Canon references are kept by default (only Low-tier removed)
2. ⚠ Reversibility depends on tier assignments; manifest-only if blast-radius is recomputed
3. ✓ Manual trigger per ADR

**When to use:** Organizations with risk-averse governance (never lose cited objects) and smaller knowledge stores where Low-tier objects alone are sufficient compaction.

#### Variant 4: Consensus-based (human curators pick what to remove)

**What it removes:** A designated curator or curation team reviews objects using human judgment and explicitly selects which to remove (e.g., "this is stale, been superseded by three newer objects, nobody cites it, we're retiring it").

**Preservation:** Removal decisions are recorded in `_intake/log.md` with `[compact]` entries: curator name, objects removed, date, justification.

**Reversibility:** Complete from VCS; removal log provides audit trail and intent.

**Costs:**
- Storage: Variable (depends on curation judgement)
- Reversibility: High (human decisions are recorded; VCS is immutable)
- Complexity: Low (no algorithms; copy objects to archive, record in log, delete from store)

**Satisfies invariants:**
1. ✓ Can be done carefully (human checks canon references)
2. ✓ Decisions are logged; removal is auditable
3. ✓ Explicitly human-triggered

**When to use:** Small knowledge stores where curators know the content intimately; organizations building compaction discipline (start here, move to date-based or tier-based as store grows).

### Trade-off summary

| Variant | Storage gain | Reversibility | Complexity | Risk | Best for |
|---|---|---|---|---|---|
| Supersession-only | Low | High | Low | Low | Mature stores with regular re-curation |
| Date-based (cold storage) | High | High | Medium | Medium | Large stores with archival infrastructure |
| Risk-tier-based | Medium | Medium | Medium-High | Low | Risk-averse orgs with stable canon |
| Consensus-based | Variable | High | Low | Variable | Small stores, building discipline |

### Implementation: None yet (frame only)

This section documents the design space. Compaction algorithms are **not** implemented in this or any Transitrix version. Each adopter decides which variant matches their organization's risk tolerance, storage constraints, and operational capacity. The decision is recorded in their `operations/decisions/ADR-YYYY-MM-DD-knowledge-store-compaction.md` with full justification.

Transitrix provides the frame (this section), the invariants (above), and reference tooling for manifest management and archival. The adopter chooses the variant and owns the implementation.

## Tooling

Google Cloud publishes reference implementations alongside the OKF spec:
- **Enrichment agent** — walks a dataset, drafts OKF documents, enriches with citations and cross-references
- **Static HTML visualiser** — turns an OKF bundle into an interactive graph view with no backend required
- **Sample bundles** — GA4 e-commerce, Stack Overflow, Bitcoin datasets

These tools consume any OKF-conformant bundle, including Transitrix knowledge stores.
