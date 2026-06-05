---
title: "Data quality — source trust at entry, freshness decay in canon, composite confidence on views"
status: accepted
date: "2026-06-05"
scope: methodology
supersedes: null
superseded_by: null
tags: [confidence, provenance, freshness, zones, views, data-quality]
---

# ADR: Data quality — source trust, freshness decay, and view composite confidence

**Status:** Accepted
**Date:** 2026-06-05
**Deciders:** Valerii Korobeinikov; Win-Claude (Transitrix-family coordinator — decided at family level per the escalation policy)
**Scope:** Repo-local to `methodology` (canonical owner of notation semantics). Consumed by `transitrix-dsm` (entry + storage) and `transitrix-studio` (view render). Those repos align as consumers per their standing "methodology is canon" rules; this ADR does not change their internal architecture.

---

## Context

The methodology already separates raw material (`field` zone) from validated truth (`canon` zone), with a `field`-zone admission gate whose contract is `provenance` (§5–6 of `notations/CONTRACT.md`). Two real-work needs were not yet served:

1. **At entry we already know how much to trust a source.** An interview with the accountable owner is not an offhand assumption, and that judgement should be captured at the moment of entry rather than reconstructed later.
2. **Confidence ages.** A canonical statement last reaffirmed two years ago is less certain than one confirmed last month, even when both are still `valid`. Stale canon should be detectable and surfaced.
3. **A view should advertise how much to trust it.** When a view is rendered, the reader needs a composite quality signal next to the formation date, not just the date.

Forces at play: canon's trust contract is "authoritative, internally consistent" and must not be undermined; `derived_from` is optional today and making it required would be a breaking change to existing adopter canon; the methodology is pre-1.0, so additive changes are cheap but breaking ones still cost adopters.

## Decision

Add a **Confidence and freshness** model to the shared contract (`CONTRACT.md` §11), built on three principles:

1. **Two independent signals, never collapsed.**
   - *source trust* — authored at entry as `source_quality` on the `field` artefact's admission record; a closed ordinal set `authoritative` (1.0) / `corroborated` (0.8) / `single_source` (0.5) / `unverified` (0.25); fixed once recorded.
   - *freshness* — derived, a function of how long ago the canon element was last reaffirmed (`admitted_at`); recomputed on read, never stored.
2. **Confidence is metadata about certainty, not a contradiction flag.** It never gates admission and never mutates canon. The cure for staleness is **reaffirmation** — re-running the admission gate bumps `admitted_at` and resets freshness; canon content is not edited to refresh a score.
3. **Composite is computed at render time.** A view surfaces `weakest link` (min over elements — the headline), `mean`, and `coverage` (% of elements with resolvable `derived_from`), mapped to A/B/C/D bands, next to the formation date.

Key formulas (full text in `CONTRACT.md` §11.3–11.6):

```
freshness            = 1.0 within fresh_days; decays linearly to a floor at stale_days; never 0
source_trust(elem)   = max source_quality weight over the elem's derived_from field sources
confidence(elem)     = source_trust(elem) · freshness(elem)
view weakest link    = min confidence over rendered elements
```

Decay parameters (`fresh_days`, `stale_days`, `floor`) are configured **per element TYPE** in the adopter manifest (`transitrix.yaml` → `confidence_decay`), because different facts age at different rates; defaults apply to TYPEs not overridden.

A non-mutating scheduled check (`FRESHNESS-001`, warning) reports canon elements past `stale_days` so they can be reaffirmed.

## Options Considered

### Source trust and freshness as one decaying score

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Honesty of signal | Poor — decay overwrites the authored judgement |
| Auditability | Poor |

**Pros:** one number, simplest to store and display.
**Cons:** a stale-but-authoritative source and a fresh-but-unverified one can land on the same value, hiding which problem you have. Rejected.

### Two separate signals combined at read time (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Honesty of signal | High — entry trust and age stay legible |
| Auditability | High — `source_quality` is authored and audit-trailed; freshness is a pure function of `admitted_at` |

**Pros:** preserves the authored signal; freshness is derived so nothing in canon mutates; maps cleanly onto the existing zone / admission / lifecycle contracts.
**Cons:** two concepts to teach; composite needs a documented aggregation.

### Element source trust: weakest source vs best source

Chose **best source (`max`)** at the element level — extra weak corroborating sources should not drag down an element that has at least one authoritative source. The **weakest-link (`min`)** aggregation is applied one level up, at the *view* composite, where a view genuinely is only as trustworthy as its worst element.

### Make `derived_from` required to guarantee provenance

Rejected — a new required field is a breaking (MAJOR) change to existing adopter canon. Instead `derived_from` stays optional; unsourced elements score at the `unverified` floor **and** are counted separately so the gap is visible without being a hard gate.

## Trade-off Analysis

The central trade-off is *simplicity vs. signal fidelity*. A single decaying number is easier to implement but destroys the distinction between "we never trusted this" and "we trusted this but haven't checked lately" — which are different remediation paths (get a better source vs. reaffirm). Keeping the signals separate costs one extra concept and a documented composite, and buys an honest, auditable model that sits naturally on the contract's existing seams (provenance at §6, lifecycle anchor at §7, view render at §11.6). The per-TYPE decay config avoids a one-size half-life that would be wrong for both capability maps and price lists.

## Consequences

- **Easier:** sources can be graded at entry; stale canon becomes detectable and reportable; views carry a trust signal readers can act on; nothing new is persisted in canon, so the audit trail stays clean.
- **Harder:** adopters must understand two signals; DSM must add a `source_quality` control at field entry and a re-admission ("reaffirm") action; Studio must compute and render the composite; a scheduled freshness pass must be wired somewhere.
- **To revisit:** persisting the confidence trajectory (would use the §9 sidecar); promoting `source_quality` to a first-class source entity; importance-weighting the view mean; tightening `source_quality` / `derived_from` from optional toward required at the 1.0 cut.

## Action Items

1. [ ] Methodology: land `CONTRACT.md` §11 + §6 `source_quality` + `MANIFEST.md` `confidence_decay` (this PR).
2. [ ] DSM: add `source_quality` to the field-entry path and a reaffirm (re-admission) action; store on the admission record.
3. [ ] DSM / validator: implement the `FRESHNESS-001` scheduled, non-mutating check.
4. [ ] Studio: compute element + view composite confidence and render it next to the view formation date.
5. [ ] Decide whether the freshness check runs in DSM, the CLI validator, or both.
