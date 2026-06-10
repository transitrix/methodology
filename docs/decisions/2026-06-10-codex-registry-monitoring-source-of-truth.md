---
status: proposed
date: 2026-06-10
scope: repo
supersedes: none
superseded_by: none
tags: [codex, registry, monitoring, source-of-truth, ingest, regulatory-sources, operating-state]
---

# Source-of-truth for monitored sources — codex `scan` vs REGISTRY

## Context

Two places in canon today record monitoring intent against an external source,
and they overlap on the watch URL — surfaced as **finding F15** in the
2026-06-09 ingest dogfooding.

- **Codex artefact (`notation: codex`).** A live codex artefact carries
  `source_url` (the canonical online location of the document),
  `monitoring_needed` (boolean — does this source change over time),
  `monitor_instead[]` (when `monitoring_needed: false`, the live counterparts to
  watch in its place), and a `scan` block (`last_scanned_at`, `next_scan_due`,
  `scan_frequency`, `change_detected`, `change_description`, `review_needed`)
  maintained by a scanner agent. The schema and agent workflow live in
  [`notations/elements/14-codex.md`](../../notations/elements/14-codex.md) §3
  and §§3.4–3.5; the rule `CODEX-005` requires `monitoring_needed:` on
  `type: REGULATION`. The scan block is embedded *in the codex artefact* so its
  history is auditable via git.

- **REGISTRY element (`notation: registry`, `type: regulatory_source`).** An
  org-authored, curated list of regulatory sources to watch. Each row carries
  `id`, `name`, `type`, `jurisdiction`, `source_url`, `monitoring_needed`,
  `monitor_instead`, `scan_frequency`, and `change_signal_method`; the per-row
  runtime operating state (last scan, next due, change detected, review pending)
  lives in a co-located `REGISTRY-<…>.runstate.yaml` sidecar so the canonical
  config file does not churn on every scan. Schema in
  [`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md)
  §7.19 and
  [`organizations/acme_corp/canon/elements/02_business/registries/README.md`](../../organizations/acme_corp/canon/elements/02_business/registries/README.md);
  config-vs-state boundary in
  [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §9.6.

The overlap is concrete. `source_url`, `monitoring_needed`, `monitor_instead`,
and scan cadence/state appear in **both** places when a row in the REGISTRY
points at a source that has *also* been admitted as a codex artefact. That is
the common path for any source actively in use: it lives in the registry as a
watchlist row *and* in the codex zone as the ingested document. With both
copies populated by independent flows (the registry is org-authored; the codex
artefact is admitted through the codex gate), each field has two homes and no
declared authority — the same change can land in either place, and
"what do we monitor?" has two answers that can drift.

Surfaced 2026-06-09 dogfooding the ingest skill. Data-free; industry- and
regime-agnostic; within the Transitrix family. The ambiguity blocks the F15
finding and is adjacent to the codex / REGISTRY work already on the books — a
direction is needed before any spec edit on either side, because resolving it
in one place silently re-shapes the other.

## Decision needed

Define **the source of truth for monitored-source watch intent** and how the
codex `scan` flow and the REGISTRY row relate when both refer to the same
source. Four candidate shapes are on the table — the chosen direction must say
which field is authoritative for the watch URL, which artefact owns scan state,
and how a source moves or is linked between the two artefacts.

### Option A — split by lifecycle stage

REGISTRY owns the **curated source list and harvesting prioritisation**
(*"these are the sources we care about; here is the order and cadence we want
to look at them"*). The codex artefact, once admitted, owns the **monitoring of
the already-ingested source** (its own provenance, its `scan` block, its
`source_url` as the authoritative watch target). A REGISTRY row exists *before*
a source is ingested and persists *after* as a thin pointer; the codex
artefact's `scan` block is the authoritative runtime state once the source has
been admitted.

- **Watch-URL authority.** Codex `source_url` is authoritative for an admitted
  source. The REGISTRY row's `source_url` is the harvesting hint used at
  ingest time, expected to equal the codex `source_url` once admitted.
- **Scan state.** Lives in the codex artefact's `scan` block (or in the
  REGISTRY runstate sidecar for not-yet-admitted rows). A row whose source has
  been admitted as a codex artefact carries a `codex_id` link and defers scan
  state to that artefact.
- **Sync rule.** A `codex_id` link on the REGISTRY row makes the relationship
  explicit. A validator gate flags rows where the row's `source_url`
  disagrees with the linked codex artefact's `source_url`.

### Option B — REGISTRY owns watch intent; codex carries content only

The REGISTRY (with its runstate sidecar) owns **every** monitoring field —
`source_url` as the watch target, `monitoring_needed`, `monitor_instead`,
`scan_frequency`, `change_signal_method`, plus all scan state. Codex artefacts
become pure content-and-provenance: `effective_date`, `snapshot_file`,
`source_url` *as a citation, not a watch target*; the `scan` block and
`monitoring_needed` migrate out of codex into the REGISTRY runstate sidecar
(scan state) and the REGISTRY row (intent). `CODEX-005` is retired.

- **Watch-URL authority.** REGISTRY row `source_url`. Single home.
- **Scan state.** REGISTRY runstate sidecar; codex artefacts carry none.
- **Sync rule.** A codex artefact links *up* to its REGISTRY row via a
  `monitored_by:` field (or equivalent). Scanner agents read the REGISTRY,
  not codex artefacts.

### Option C — codex owns watch intent; REGISTRY becomes a thin index

Codex artefacts own **every** monitoring field, as they do today. The REGISTRY
becomes a thin index over admitted codex artefacts — a curated *priority list*
that drives ingestion order and exposes a view-friendly roll-up, but carries no
`source_url`, no `monitoring_needed`, no `monitor_instead`, and no scan
cadence. The REGISTRY row references a codex artefact by id and inherits all
monitoring fields from it; a row that points at a not-yet-admitted source
carries only the prioritisation metadata until the codex artefact lands.

- **Watch-URL authority.** Codex `source_url`. Single home.
- **Scan state.** Codex `scan` block, as today.
- **Sync rule.** REGISTRY rows reference codex artefacts by id; rows with no
  linked codex artefact are a backlog signal, not a monitoring directive.

### Option D — keep both, declare an explicit sync rule

Both artefacts retain their current fields. The decision is purely a
**precedence rule**: when both are present, one wins for which purpose. For
example: REGISTRY is authoritative for *intent* (*should this be watched?* and
*how often?*), codex is authoritative for *state* (*when was it last scanned?
what changed?*); the watch URL is authoritative on the codex artefact once one
exists, and on the REGISTRY row until then. The duplication is accepted; the
ambiguity is replaced by a documented winner per field and a validator gate
that flags disagreement.

- **Watch-URL authority.** Codex `source_url` once admitted; REGISTRY
  `source_url` before admission. A row that points at an admitted codex
  artefact MUST match its `source_url`.
- **Scan state.** Codex `scan` block on admitted artefacts; REGISTRY runstate
  on yet-to-be-admitted rows.
- **Sync rule.** A new validator gate (`REG-*` or `CODEX-*`) flags
  field-by-field disagreement between a REGISTRY row and the codex artefact
  whose id it carries.

## Alternatives considered

- **A — split by lifecycle stage.** Above. Each artefact stays
  responsibility-coherent: REGISTRY is the *what we want to ingest and
  prioritise*; codex is the *what we have ingested and how we keep it
  current*. Requires a `codex_id` link on the REGISTRY row and a validator
  gate against URL disagreement.
- **B — REGISTRY owns watch intent.** Above. Single home for monitoring
  intent and state. Heaviest spec churn on the codex side — `monitoring_needed`,
  `monitor_instead`, the `scan` block, and rule `CODEX-005` all migrate out;
  every existing codex artefact with `monitoring_needed:` would need to be
  rewritten or grandfathered.
- **C — codex owns watch intent.** Above. Single home, smallest churn to
  existing codex artefacts (they keep what they have). The REGISTRY loses
  most of its current row shape — `source_url`, `monitoring_needed`,
  `monitor_instead`, scan cadence — and turns into a priority list, which is
  a substantial walk-back of the §7.19 schema.
- **D — keep both, explicit sync rule.** Above. Lightest schema change;
  duplication accepted by design; relies on a validator gate to keep the two
  in step. Carries the long-term cost of two homes for the same fact, which
  is the F15 finding's framing premise.
- **E — keep the status quo (overlap, no rule).** Rejected as the framing
  premise. Recorded only to make the cost of inaction explicit: every row /
  artefact pair can drift, and "what do we monitor?" stays a question with
  two answers.

## Consequences

The consequences below are common to all live options; items marked
*(direction-specific)* resolve only once Valerii picks A, B, C, or D.

- **F15 unblocks once the direction is set.** *(both)* Until then no edit lands
  on `notations/elements/14-codex.md` §§3–3.5 or on
  `notations/ELEMENT_PRIMITIVES.md` §7.19 / the REGISTRY README, because
  resolving the overlap in one place silently re-shapes the other.
- **Validator surface.** *(direction-specific)* A new cross-artefact rule —
  whether `REG-*` or `CODEX-*` — flags `source_url` (and, under D, every
  duplicated field) disagreement between a REGISTRY row and its referenced
  codex artefact. The shape of that rule depends on which side is
  authoritative.
- **Scanner-agent workflow updates.** *(direction-specific)* The agent
  workflow in 14-codex.md §3.5 ("fetches `source_url`, compares to snapshot,
  updates `scan` block") needs an update under any non-status-quo option:
  - Under A: agent reads the codex `source_url` for admitted sources, the
    REGISTRY row's `source_url` for not-yet-admitted rows.
  - Under B: agent reads exclusively from the REGISTRY (with codex content as
    the comparison baseline).
  - Under C: agent reads exclusively from codex; the REGISTRY drives ingest
    priority, not the scanner.
  - Under D: agent reads the codex `source_url` once admitted, with the
    REGISTRY row's value as the fallback before admission.
- **Spec migration.** *(direction-specific)*
  - **B** retires `CODEX-005` and removes `monitoring_needed` / `monitor_instead`
    / the `scan` block from the codex schema — existing codex artefacts with
    these fields need a migration recipe.
  - **C** removes `source_url`, `monitoring_needed`, `monitor_instead`,
    `scan_frequency`, `change_signal_method` from the REGISTRY row schema —
    existing `REGISTRY-REG-SOURCES-1` rows shrink and the runstate sidecar's
    purpose is reduced to a backlog view.
  - **A** adds a `codex_id` link field on the REGISTRY row but otherwise leaves
    both schemas intact; the migration is opt-in.
  - **D** leaves both schemas unchanged and adds a precedence note plus the new
    cross-artefact validator gate.
- **Config-vs-state boundary stays.** *(both)* The
  `CONTRACT.md` §9.6 rule that runtime operating state must not live inline on
  canonical config files is unaffected: scan state, wherever it lives, stays
  in a machine-written sidecar (`scan:` on the codex artefact is already a
  per-artefact sidecar in spirit; the REGISTRY's `runstate.yaml` is the
  explicit form of the same rule).
- **Ingest pipeline coupling.** *(both)* The ingest review queue learns the
  authoritative side of `source_url` so that "watch this source" proposals do
  not need to be specified twice. This is downstream of the direction, not
  upstream.
- This is a notation/schema decision, so **once the direction is set this ADR
  becomes the decision record** and implementation lands as PRs (one concern
  each): codex schema update → REGISTRY schema update → validator gate →
  scanner-agent workflow refresh. Until then, no canon/spec edits.
