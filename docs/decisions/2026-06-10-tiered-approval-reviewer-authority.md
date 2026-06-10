---
status: accepted
date: 2026-06-10
scope: repo
supersedes: none
superseded_by: none
tags: [admission, tiered-approval, reviewer-authority, confidence, source-quality, extraction-confidence, ingest, ai-review]
---

# Tiered approval — reviewer-authority axis (AI-reviewed → expert-confirmed)

## Context

Today canon has **one human gate**. A harvest emits a draft as
`admission_state: proposed`; a human reviewer admits it by setting
`admission_state: active` and filling `admitted_by` with their handle
(`notations/CONTRACT.md` §6.1). The model treats every reviewer as
indistinguishable — the gate is on / off, and the only thing in the audit trail
is *who* admitted. This works for tens of assertions; it does not scale to a
real source.

Surfaced 2026-06-09 dogfooding the ingest skill, **finding F19** in that pass.
Data-free, within the Transitrix family. A single GDPR-sized source can yield
hundreds of `REQUIREMENT` / `ASSERTION` candidates; expecting a domain expert
to manually confirm each before any value can be drawn from the harvest stalls
the pipeline at the gate. The ingest skill already separates two trust signals
to avoid this very collapse:

- **`source_quality`** — trust in the *source* (signed policy →
  `authoritative`; meeting note → `single_source`). A closed ordinal label on
  the field artefact's admission record (`CONTRACT.md` §§6, 11.2), authored at
  entry, fixed once recorded.
- **`extraction_confidence`** — "did the model read the document correctly".
  A separate review flag on each candidate. Surfaces in the review queue and
  is **never** folded into `source_quality`, **never** persisted into canon
  (`CONTRACT.md` §11.8; `transitrix/skills/ingest/README.md`).

The two axes are deliberately orthogonal: *who said it* vs *did the harvest
read it right*. Neither captures a third dimension that the single human gate
silently collapses today — *who confirmed it*. A draft confirmed by a domain
expert and a draft confirmed by an AI reviewer end up indistinguishable as
plain `admission_state: active`, with only the `admitted_by` handle to tell
them apart by inspection. That collapse is the F19 finding: there is no
machine-readable way to say "this is good enough for an AI to have ticked, not
yet expert-confirmed", and so the only safe default is to keep everything
behind the expert gate.

The pre-admission machine already has the shape needed to receive a third axis
without breaking the core invariant *"propose, never write canon"* — the
`admission_state` enum is closed (CONTRACT §6.1, rule `ADMIT-001`), the
admitted set already excludes proposed/rejected drafts from derived views
(§6.1, "Exclusion from derived views"), and views already carry a
`treat_proposed_as` switch (`hidden | shown-distinct`) used by the
compliance-impact and coverage-metric notations (`notations/views/21-…`,
`22-…`). A third axis that *grades reviewer authority* can be layered on this
machine without redefining the existing two trust signals.

Carried from the now-closed round-2 epic on ingest hardening; tightly coupled
to the existing data-quality model in CONTRACT §11. The direction here gates
whether the ingest skill can route the long tail of high-`extraction_confidence`
drafts past the manual gate without violating the model.

## Decision needed

Define **the reviewer-authority axis** — its name, its states, where it lives
on the admission record, how it composes with (and does not merge into)
`source_quality` and `extraction_confidence`, and what it means for canon
membership and view rendering. The framing question is whether to model the
axis as a **new field** that grades the *authority* of the admitting reviewer,
or as an **extension of the existing admission_state enum** that distinguishes
provisional admission from expert admission. Three candidate shapes are on the
table.

### Option A — new field `reviewer_authority`, orthogonal to `admission_state`

Add a third axis as a **first-class field** on the admission record,
independent of `admission_state` and independent of the existing two trust
signals.

```yaml
zone: canon
admission_state: active                # proposed | active | rejected (unchanged)
reviewer_authority: ai_reviewed        # ai_reviewed | expert_confirmed
admitted_at: "2026-06-10"
admitted_by: "ingest-reviewer-claude"  # the reviewer — tool ID for ai_reviewed,
                                       # human handle for expert_confirmed
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
derived_from:
  - REGULATION-GDPR-2016-1
```

- **States.** Closed set, ordinal: `ai_reviewed` < `expert_confirmed`. Absent ⇒
  `expert_confirmed` (back-compat for existing human-authored canon — every
  artefact admitted before this ADR is treated as expert-confirmed by
  construction, no migration).
- **What writes which.** `ai_reviewed` is written **only** by a tool acting as
  reviewer (the ingest skill, an automated cross-check). `expert_confirmed` is
  written **only** by a human reviewer. A human admitting a draft directly
  sets `expert_confirmed`; a tool admitting a high-`extraction_confidence`
  draft sets `ai_reviewed` and may **never** write `expert_confirmed`.
- **Routing by `extraction_confidence`.** High `extraction_confidence` →
  the ingest skill MAY auto-admit to `ai_reviewed` (provisional). Medium / low
  `extraction_confidence` → routed to the expert review queue; tool admission
  is forbidden. The threshold is configured per adopter (manifest).
- **Composition with the other axes.** `reviewer_authority` is independent of
  `source_quality` (an `authoritative` source can be `ai_reviewed`; an
  `unverified` field artefact can be `expert_confirmed`) and independent of
  `extraction_confidence` (which gates *eligibility* for `ai_reviewed`, not
  the value itself). Never folded into the §11.4 element-confidence formula;
  surfaced as a separate label.
- **Canon membership.** Both `ai_reviewed` and `expert_confirmed` artefacts
  are admitted canon (`admission_state: active`). The reviewer-authority axis
  does **not** add a new exclusion from derived views.
- **View rendering.** Views render `ai_reviewed` *distinct* from
  `expert_confirmed` by convention. A new view switch
  `treat_ai_reviewed_as: shown-distinct | shown-same | hidden` (default
  `shown-distinct`) extends the existing `treat_proposed_as` switch on the
  21-compliance-impact and 22-coverage-metric notations. Coverage metrics MAY
  exclude `ai_reviewed` by configuration; by default they include both with
  the reviewer-authority label surfaced.
- **Weight in confidence scoring.** `reviewer_authority` does not enter the
  §11.4 formula. The provisional-vs-confirmed distinction is rendered as a
  qualitative label alongside the numeric confidence band, not multiplied
  into it — keeping the existing two-signal model intact.

### Option B — extend `admission_state` with a provisional state

Add a fourth value to the existing enum:
`proposed → admitted_provisional → active | rejected`, with
`admitted_provisional` distinguishing AI-reviewed-but-not-expert-confirmed.

```yaml
admission_state: admitted_provisional   # proposed | admitted_provisional | active | rejected
admitted_provisional_at: "2026-06-10"
admitted_provisional_by: "ingest-reviewer-claude"   # tool ID — never a human
# admitted_at / admitted_by remain absent until an expert confirms
```

- **States.** The pre-admission machine grows from three terminal states to
  four: `proposed` (harvest), `admitted_provisional` (tool-confirmed),
  `active` (expert-confirmed), `rejected`. `active` becomes "expert-confirmed
  canon"; `admitted_provisional` is canon-shaped but tagged.
- **Authority.** Encoded in the state itself — the field is the same field as
  today; no new axis.
- **Routing by `extraction_confidence`.** As in Option A — high confidence
  may transition to `admitted_provisional` via tool; otherwise the draft sits
  at `proposed` until an expert promotes it directly to `active`.
- **Composition with the other axes.** No new field; the existing axes are
  unchanged. The state collapses *gate progress* and *reviewer authority*
  into one enum, which is the same simplification CONTRACT §6.1 explicitly
  chose to **un-collapse** for `zone` vs `admission_state` (orthogonal axes).
- **Canon membership.** `admitted_provisional` artefacts MAY be excluded from
  derived views by configuration. The existing `treat_proposed_as` switch on
  views generalises to `treat_provisional_as` (or grows to a small enum).
- **Validation rules.** `ADMIT-001` is extended; new `ADMIT-006`-class rules
  govern transitions out of `admitted_provisional`. The rule that
  `admission_state: active` requires complete `gate_checks` + `admitted_by`
  is unchanged; `admitted_provisional` requires the provisional-pair fields
  and bans the active-pair fields, mirroring §6.1's `ADMIT-002` shape.

### Option C — keep the single gate; surface authority via `admitted_by` prefix

No new axis, no new state. Distinguish AI from expert review by an enforced
**naming convention on `admitted_by`** — a prefix that marks the admitter as
a tool, paired with a validation rule that flags any catalogue scan over
`admitted_by` values not matching either an `agent:` or `human:` prefix.

- **Authority.** Read from the `admitted_by` string itself
  (`agent:ingest-reviewer-claude` vs `human:v.korobeinikov`).
- **Composition with the other axes.** Nothing changes on the model.
- **Canon membership.** Every admitted artefact is canon, indistinguishable
  for view rendering. Downstream analysis MAY filter by prefix, but the model
  carries no first-class signal.
- **Routing.** Cannot be enforced by the model — the ingest skill decides
  whether to admit at `agent:` authority without canon flagging it.
- **Cost.** Smallest spec churn (a string-format rule), but the *purpose* of
  the F19 finding — a machine-readable reviewer-authority signal that can
  drive view rendering, coverage metrics, and downstream tooling — is
  satisfied only by string-parsing, which the rest of the model has
  deliberately avoided (`CONTRACT.md` §§2, 3).

## Alternatives considered

- **A — new `reviewer_authority` field.** Above. Keeps the existing trust
  signals (`source_quality`, `extraction_confidence`) and the existing
  admission machine untouched; adds one orthogonal axis. Mirrors the §6.1
  pattern that resisted collapsing orthogonal axes into one enum (zone vs
  admission_state). Costs one new field on the admission record and one new
  view-rendering switch.
- **B — extend `admission_state` with `admitted_provisional`.** Above. No
  new field, but collapses *reviewer authority* into *gate progress* — the
  same collapse §6.1 explicitly avoided for zone vs state. Heavier change to
  the validation rules (`ADMIT-001`, `ADMIT-003`) and the state machine
  diagram.
- **C — convention on `admitted_by`.** Above. Smallest spec change; carries
  no first-class signal; requires every downstream consumer to string-parse
  the field. Recorded to mark the floor of the design space.
- **D — fold reviewer authority into `source_quality`.** Rejected in framing.
  `source_quality` is trust in the **source**, not in the reviewer. Folding
  reviewer authority in would corrupt the §11.2 semantics — an
  `expert_confirmed` `single_source` is not the same as a `corroborated`
  source, and the §11.4 element-confidence formula uses
  `max(source_quality.weight)` precisely on the *source* axis.
- **E — multiply reviewer authority into the §11.4 element confidence.**
  Rejected. The two existing signals (source trust, freshness) are
  *properties of the statement*; reviewer authority is a *property of the
  review*. The CONTRACT §11.1 frame — *"two independent signals, deliberately
  separate"* — applies recursively: collapsing them into one decaying number
  erases each. Reviewer authority is surfaced as a label alongside the band,
  not multiplied into it.
- **F — keep the status quo (one human gate).** Rejected as the framing
  premise. F19 is precisely this gap: the long tail of
  high-`extraction_confidence` drafts cannot pass the gate at expert pace, so
  the gate either bottlenecks the pipeline or silently lowers its bar.

## Decision record

- **Option A chosen — Valerii, 2026-06-10.** New field `reviewer_authority: ai_reviewed | expert_confirmed` on the admission record, orthogonal to `admission_state` and to the existing two trust signals (`source_quality`, `extraction_confidence`). Both tiers are `admission_state: active` (both are canon). Absent field ⇒ `expert_confirmed` (back-compat; no migration needed).
- **Cross-cutting dependency rule — Valerii, 2026-06-10.** An `expert_confirmed` artefact MAY depend on an `ai_reviewed` artefact. The lower tier is canon; the dependency is allowed. Views surface the **weakest-link** authority level of the full dependency chain (the chain's displayed reviewer authority = minimum of all nodes in the chain). No `ADMIT-005`-extension to forbid cross-tier dependencies.

## Consequences

The consequences below are common to all live options; items marked
*(direction-specific)* resolve only once Valerii picks A, B, or C.

- **Core invariant preserved.** *(both)* "Propose, never write canon"
  (CONTRACT §6.1) is unchanged — a tool never writes `expert_confirmed`
  (Option A) or `active` (Option B); it can only mark the lower tier and
  route the draft. The human gate retains exclusive authority to promote to
  the top tier.
- **No change to `source_quality` or `extraction_confidence`.** *(both)* The
  two axes stay orthogonal to each other and to the new signal. The
  data-quality model in CONTRACT §11 is unchanged; nothing folds into §11.4.
- **Routing rule lands in the ingest skill.** *(both)* The mapping
  high-`extraction_confidence` → tool-admit-to-lower-tier, medium/low →
  expert queue, is a skill-level rule and belongs in
  `transitrix/skills/ingest/SKILL.md` (or its README), not in the CONTRACT.
  The CONTRACT defines the states; the skill defines the routing.
- **Admission record growth.** *(direction-specific)*
  - **A** adds one field (`reviewer_authority`) plus a back-compat default
    (`absent ⇒ expert_confirmed`). Schema additive; existing canon untouched.
  - **B** extends the enum, adds two new fields (`admitted_provisional_at`,
    `admitted_provisional_by`), and updates the state-machine diagram.
    Existing canon (no provisional state) is unaffected; the change is
    additive.
  - **C** adds a string-format rule on `admitted_by`. Existing canon may
    need a one-time backfill to add the `human:` prefix.
- **View rendering.** *(direction-specific)*
  - **A** adds a new view switch
    (`treat_ai_reviewed_as: shown-distinct | shown-same | hidden`) on the
    21-compliance-impact and 22-coverage-metric notations, mirroring the
    existing `treat_proposed_as` switch (CONTRACT §6.1, ASSERTION §2.2).
    Default `shown-distinct`.
  - **B** generalises `treat_proposed_as` to cover the new
    `admitted_provisional` state — either by widening the enum on that
    switch or by adding a parallel `treat_provisional_as` switch.
  - **C** carries no view signal — string-parsing in the renderer.
- **Validation rules.** *(direction-specific)*
  - **A** adds rules along the shape of §6.1: `ADMIT-006` (closed enum on
    `reviewer_authority`), `ADMIT-007` (`reviewer_authority: ai_reviewed`
    requires `admitted_by` to identify a tool, not a human; vice versa for
    `expert_confirmed`). The existing `ADMIT-001..005` are unchanged.
  - **B** extends `ADMIT-001` (closed enum grows), adds `ADMIT-006`
    (provisional-pair fields required when state is provisional), and
    `ADMIT-007` (no expert-only fields in provisional state). The
    cross-cutting `ADMIT-005` (no active dependency on un-admitted)
    generalises to "no `expert_confirmed`/`active` dependency on lower-tier"
    if the family wants to forbid expert-confirmed canon depending on
    AI-reviewed canon.
  - **C** adds one format rule on `admitted_by`.
- **Cross-cutting dependency rule.** *(direction-specific, common to A and B)*
  The §6.1 rule `ADMIT-005` — *"an `active` artefact MUST NOT depend on a
  `proposed` one"* — has a parallel question for the new tier: MAY an
  expert-confirmed artefact depend on an AI-reviewed one? The ADR's chosen
  direction must state this — either permitting it (the lower tier is canon,
  so dependencies are allowed) or forbidding it by `ADMIT-005`-extension
  (expert-confirmed canon must depend only on expert-confirmed canon). This
  is a real cross-cutting cost worth stating up front.
- **Coverage metrics.** *(both)* The 22-coverage-metric notation's
  `view.coverage_rule.treat_proposed_as` switch already lets adopters choose
  whether unadmitted drafts contribute to coverage. The new signal extends
  that choice — adopters should be able to count `ai_reviewed` as covered,
  shown-distinct, or excluded. Default behaviour and the per-adopter
  override are part of the direction.
- **Migration.** *(both)* Additive — existing canon stays valid. Existing
  human-admitted artefacts are treated as the top tier by default (either
  `reviewer_authority` absent ⇒ `expert_confirmed` under A, or
  `admission_state: active` unchanged under B). No file rewrite required.
- This is a notation/schema decision, so **once the direction is set this ADR
  becomes the decision record** and implementation lands as PRs (one concern
  each): CONTRACT §6.1 update → CONTRACT §11 wording (clarify non-fold) →
  view-rendering switch on 21 / 22 → ingest skill routing rule. Until then,
  no canon/spec edits.
