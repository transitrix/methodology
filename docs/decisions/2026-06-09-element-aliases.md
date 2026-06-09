---
status: Proposed
date: 2026-06-09
scope: repo
supersedes: []
superseded_by: []
tags: [element-aliases, alternative-names, entity-resolution, element-primitives, ingest, validation, naming]
---

# Canonical home for element aliases / alternative names

> **Status: Proposed — direction not yet chosen.** This ADR frames the choice
> between an additive `aliases:` field and a standalone alias registry, and
> records the trade-offs. It does **not** decide; Valerii gates the resolution
> direction. No canon / spec edits follow until the direction is set.

## Context

Every element carries exactly one human-readable label, `name`, and that label
is **canonical across every element TYPE** — `notations/ELEMENT_PRIMITIVES.md`
§3 states it plainly: *"Human-readable label. Canonical across every element
TYPE — no TYPE-specific aliases. … A richer naming structure … is a separate
additive enhancement via additional fields, never via an alias for `name`."*
This is the no-alias rule (finding F-3 in that document's lineage): there is, by
design, nowhere on an element to record that it is also known by another surface
form.

That absence is exactly what automated **cross-source entity resolution**
(finding **F8**, carried under the ingest-pipeline hardening work) needs. F8's
goal is: when a new source mentions an object that already exists in canon under
a *different* surface form, **propose** linking the mention to the existing id
(propose, never auto-merge). To match a mention against canon, F8 needs a set of
known surface forms per element. With only `name` to match against, a source
that calls the same actor "Acme Logistics", "Acme Logistics Ltd.", and "ACME"
resolves to three candidates and mints duplicates — the very friction F8 exists
to remove. Today the only defences are manual ("reference existing IDs") and the
uniqueness gate, neither of which sees alternative names.

Surfaced 2026-06-09 dogfooding the ingest skill against a sample repository
(finding **F9**). Data-free; industry- and regime-agnostic; within the
Transitrix family. F9 (this alias-home decision) and F8 (the entity-resolution
consumer) are tightly coupled: **F8 cannot land without a home for aliases**, so
this ADR's direction unblocks F8.

The naming rule has a deliberate boundary worth stating up front. F-3 forbids a
**TYPE-specific alias for `name`** — i.e. a second *authoritative* label field
(REQUIREMENT's legacy `title`) or a per-TYPE rename of `name`. An `aliases:`
construct is a different thing: a **non-authoritative** set of *also-known-as*
strings used only for matching and discovery, with `name` still the single
canonical label. Whether that distinction *scopes* F-3 (aliases are simply
out of F-3's scope, since `name` stays the sole authoritative label) or *relaxes*
it (F-3 is widened to permit a bounded, non-authoritative alias construct) is one
of the things the chosen direction must state explicitly — see Consequences.

## Decision needed

Give elements a canonical place to record alternative surface forms, so that F8
entity resolution has something to match a new mention against. Two candidate
shapes are on the table.

### Option A — additive `aliases:` field on element TYPEs

A `standalone` element carries an optional `aliases:` list of strings on its own
file, alongside `name`:

```yaml
notation: actor
id: ACTOR-ACME-LOGISTICS-1
name: "Acme Logistics"
aliases:                       # optional — non-authoritative also-known-as forms
  - "Acme Logistics Ltd."
  - "ACME"
```

- **Scope of TYPEs.** Apply to the TYPEs entity resolution actually targets —
  the named-real-world-entity TYPEs (`ACTOR`, `ROLE`, `APPLICATION`, `PRODUCT`,
  `PROCESS`, …) — rather than universally. The set of alias-bearing TYPEs is a
  sub-decision of this option.
- **Authority.** `name` stays the sole canonical label; `aliases[]` is a
  match-hint, never rendered as the element's identity, never an id.
- **Schema surface.** One optional field added to the §3 envelope (or per-TYPE
  in §7). Small, additive, backward-compatible — existing files omit it.
- **Validation.** Alias uniqueness must be checked *across the catalogue* (an
  alias must not collide with another element's `name` or another element's
  alias, or matching becomes ambiguous). That is a new cross-file gate, not a
  per-file one — heavier than the existing single-file ELEM checks.
- **F8 consumption.** `emit-candidates` loads the canon catalogue and matches a
  mention against `name ∪ aliases[]` per element; a hit becomes a
  "matched-to-existing" proposal in the review queue. Reading is trivial (the
  field is co-located with the element).

### Option B — standalone alias registry keyed by element id

Aliases live **outside** the element files, in a dedicated registry that maps a
canonical id to its alternative surface forms — keyed by element id, one logical
record per element that has aliases:

```yaml
# e.g. canon/aliases/ALIAS-ACME-LOGISTICS-1.yaml  (placement open)
notation: alias
id: ALIAS-ACME-LOGISTICS-1
target: ACTOR-ACME-LOGISTICS-1     # the canonical element this resolves to
aliases:
  - "Acme Logistics Ltd."
  - "ACME"
# + §3 admission record + lifecycle
```

- **Placement is open.** Candidate homes: a first-class `alias`/registry element
  TYPE with its own `canon/aliases/` path; or a single curated **REGISTRY**
  artefact (the existing §7.19 pattern — an org-authored, lifecycle-bearing
  list) whose rows are alias→id mappings; or a relations-style record analogous
  to the time-aware `REL` files. Each carries different ID-grammar and
  admission implications.
- **Authority.** Element files are untouched; `name` remains the only label on
  the element. Alias data is a separate, separately-versioned concern.
- **Schema surface.** No change to the element envelope; a new artefact TYPE (or
  REGISTRY kind) is introduced instead. Larger conceptual surface, but isolated
  from every existing element schema.
- **Validation.** Uniqueness still has to hold across the registry *and* against
  element `name`s; plus referential integrity (every `target` id must resolve to
  a live canon element) and lifecycle alignment (an alias should not outlive its
  target). More moving parts than Option A.
- **F8 consumption.** `emit-candidates` loads the alias registry in addition to
  the element catalogue and matches against the union; a hit yields the target
  id. One extra artefact to load, but a clean single index to scan.

## Alternatives considered

- **A — additive `aliases:` field.** (Above.) Lightest schema change; aliases
  co-located with the element; the new cost is a cross-file uniqueness gate.
- **B — standalone alias registry.** (Above.) Keeps element schemas untouched;
  concentrates alias data and its lifecycle in one place; heavier new TYPE /
  artefact surface and referential-integrity validation.
- **C — keep the status quo (no alias home).** Rejected as the framing premise:
  F8 has nothing to match against and continues to mint duplicates on every
  surface-form variation — F9 is precisely this gap. Recorded only to make the
  cost of inaction explicit.
- **D — overload `derived_from` / provenance to carry surface forms.** Rejected
  in framing: `derived_from` is a citation to Field/Codex provenance
  (`CONTRACT.md` §6), *"a citation, never a migration"*; it records *where an
  element came from*, not *what it is also called*. Conflating the two corrupts
  provenance semantics and still gives F8 no clean index to match against.

## Consequences

The consequences below are common to both live options; the items marked
*(direction-specific)* resolve only once Valerii picks A or B.

- **F-3 boundary must be stated.** The chosen direction explicitly records its
  relationship to the `ELEMENT_PRIMITIVES.md` §3 no-alias rule: either it
  **scopes** F-3 (aliases are non-authoritative also-known-as data, out of
  F-3's "no second authoritative label" scope, `name` unchanged as the sole
  canonical label) or it **relaxes** F-3 (the rule is amended to permit a
  bounded alias construct). Either way the §3 wording is updated so the rule and
  the new construct do not read as contradictory.
- **New cross-catalogue uniqueness validation.** *(both)* An alias must not
  collide with another element's `name` or another element's alias, or entity
  resolution becomes ambiguous. This is a new catalogue-wide gate (new ELEM/gate
  rule), distinct from today's per-file `ELEM-*` checks.
- **F8 entity resolution becomes implementable.** *(both)* `emit-candidates`
  gains a canonical surface-form set to match new mentions against, and the
  review queue can distinguish *matched-to-existing* from *new*. This ADR's
  direction is the prerequisite for the F8 work; F8 should not be implemented
  until the direction lands.
- **Ingest review-queue surface.** *(both)* A matched-to-existing proposal needs
  a queue representation (which existing id, on what surface-form evidence,
  propose-not-merge). Spec'd with F8, after the direction here.
- **Schema-surface impact.** *(direction-specific)* — Option A: one optional
  field on the relevant TYPEs' §3/§7 schemas. Option B: a new artefact/registry
  TYPE, its catalogue path, ID grammar, and admission record; element schemas
  untouched.
- **Lifecycle & referential integrity.** *(direction-specific, B-weighted)*
  Option B additionally requires every alias record to `target` a live element
  and to not outlive it; Option A inherits the element's own lifecycle for free.
- **Migration.** *(direction-specific)* Both are additive — existing canon stays
  valid (no element currently carries aliases). Adopting aliases is opt-in per
  element. A migration recipe is only needed if Option B introduces a new TYPE
  that other tooling must learn.
- This is a notation/schema decision, so **once the direction is set this ADR
  becomes the decision record** and implementation lands as PRs (one concern
  each): §3 / §7 (or new TYPE) → validators → ingest `emit-candidates` + review
  queue (the F8 work). Until then, no canon/spec edits.

### Decision record

- **Open — awaiting Valerii.** Choose Option A (additive `aliases:` field) or
  Option B (standalone alias registry), and state the F-3 boundary (scope vs
  relax). Implementation PRs follow the chosen direction; the F8 cross-source
  entity-resolution work is gated on this.
