---
title: Adoption health profile
status: proposed
last_reviewed: 2026-09-14
audience: public
license: MIT
---

# Adoption health profile

This is a proposed review method, not an adoption certification. The [health-profile skill](../transitrix/skills/health-profile/README.md) ships a runnable, bounded collector for a synthetic pilot; neither it nor `repo-check` implements the whole profile. The collector reports all six indicators, marking unsupported results unavailable. It helps an adopter identify gaps worth investigating.

The adopter owns the review scope, evidence and interpretation. No central telemetry, universal healthy threshold or automatic admission gate is implied. Health findings do not fail validation or CI. Compute the profile on demand; a static export is a dated snapshot, not live state. Collection and reconciliation require effort; the indicators can be incomplete or manipulated and must remain inspectable.

## Agree the review scope first

Record the repository revision, effective date, collection time, included element types and lifecycle states, and the rules/tool versions used. Distinguish the entire inventory from the active cohort. State exclusions and their counts. Missing evidence is **unknown**, never zero. Compare periods only when their cohorts and rules are comparable, or explain the difference.

## Six indicators

| Indicator | Input and calculation | Interpretation and limits |
| --- | --- | --- |
| Denominator | Count distinct canonical IDs in the declared cohort; reconcile files discovered, parsed, excluded and unreadable. | Establishes what the report covers. More elements do not mean better adoption. |
| Validity | Validate the parsed cohort against the pinned rules; report passes, findings and unchecked records separately. | This is a rule-based check, not agreement between two independent observations. A configured rule is not proof that its check executed. |
| Coverage | Compare the declared modelling scope and required subjects/relations with observed records. Report covered, missing and unknown items against that explicit scope. | File discovery coverage from `repo-check` is a separate measure; it does not prove the business scope is represented. |
| Freshness | Use reaffirmation/admission metadata under [CONTRACT §11](../notations/CONTRACT.md), reporting evidence dates and unknowns. Apply adopter-agreed review intervals by cohort. | Filesystem mtime is not content freshness. Git edit age measures change, not reaffirmation; collection time measures when the report ran. |
| Assertion queue | For a defined period, count opening backlog, arrivals, reviewed outcomes, cancellations, held items and closing backlog; show age and review time for their stated cohorts. | Administrative closure and cancellation are not verified outcomes. Held items remain visible; report their reason and age separately. Queue drain alone does not prove decisions use the model. |
| Connectedness | Count applicable relation opportunities and observed, resolved links using declared relation types and scope; report dangling references and unknown coverage separately. | A densely linked model can still be wrong. Isolated elements may be legitimate; investigate against their role rather than inventing links to improve a score. |

## Reconcile evidence before interpreting it

Keep each result traceable to its inputs and calculation. For inventory, compare discovery with the parsed catalogue. For coverage, compare the agreed scope with observed records. For queue movement, reconcile opening backlog plus arrivals minus departures with closing backlog; keep cancellations and other departure reasons visible. When the inputs are not independent, say so.

For freshness, a fresh checkout of unchanged content must produce the same evidence dates and freshness result for the same effective date. A real reaffirmation may change freshness without changing substantive content. If no authoritative date is available, return unknown. Test these cases in any implementation; no filesystem timestamp can substitute for the model's evidence.

Do not turn six measures into a single score without an explicit adopter decision about its meaning. Agree thresholds locally, retain denominators and unknown counts, and use examples of actual decisions to assess whether the model is useful. A trend is a prompt for investigation, not a causal explanation.

## What is needed before an operational report

Identify a collector and its supported rules, supply the required sources and permissions, and test known valid, invalid, stale and missing-evidence cases. Publish the report's scope and collection failures alongside its results. Retain enough input identity to reproduce a calculation without exposing protected content to an unintended audience.

Use the shipped collector only for its documented supported subset; use the remaining profile as a manual review checklist and label those results accordingly. Completing the checklist does not establish organisation-wide adoption, completeness or correctness.

## Candidate metrics within this profile

These metrics refine the existing indicators; none creates an adoption score or requires a new model field.

| Candidate metric | Existing home | Required evidence and current collector limit |
| --- | --- | --- |
| Change acceptance time | Assertion queue operational drill-down | Actual submission and accepted-review timestamps for the stated cohort and period; exclude cancellation/administrative closure and expose held work. No workflow collector is implemented. |
| Open review age | Assertion queue operational drill-down | Actual opening timestamp, observation/effective time, review target and adopter policy. Compare age with an SLA only when one is explicitly supplied. Unavailable in the shipped subset. |
| Current validation | Validity | Executed checks bound to exact inputs and rules. The collector reuses existing atomicity checks over parsed records; full notation/schema/admission validation remains outside this subset. |
| Reference integrity | Connectedness diagnostic | Existing linter checks on the declared parsed cohort. Resolved references do not establish graph completeness; supported fields and unchecked shapes are listed in the report. |
| Requirement verification coverage | Connectedness / traceability drill-down | Declared applicable requirements and their scoped verification links/evidence/outcomes, with exclusions and unknowns. A link is not a passing verification. This collector does not compute that ratio; it never represents adoption success. |
| Review freshness | Freshness for canonical reaffirmation; queue drill-down for workflow reviews | Qualified admission date and explicit per-type decay policy for canonical records. Workflow review timestamps/policies require a separate collector and remain unavailable. |

There is no genuinely missing seventh indicator in these candidates. Extending collection requires real sources, an explicit population and rules, and positive/negative controls. Git author time, file timestamps and invented review targets cannot stand in for those sources.

## Reproducible collector subset

The [scanner README](../transitrix/skills/health-profile/README.md) defines the common Python/Node entry points, dependencies, supported checks and calculations. It distinguishes parsed file classification from distinct canonical-ID inventory, and admitted inventory from an active lifecycle cohort. Reports retain effective date, observation time, revision and input hashes, rule identity, scope, numerator/denominator, exclusions and unknowns. Zero known evidence is unavailable; an empty applicable population is not applicable.

The shipped synthetic controls exercise fresh-checkout/synchronization invariance, policy-qualified reaffirmation, absent evidence/policy, exclusions, duplicate IDs, parse failures, empty populations, and positive/negative existing atomicity/reference checks through both runnable entry points. Health findings remain informational; ordinary validator gates are unchanged. Consumer propagation and operational data collection are not established by these synthetic tests or by a source merge.
