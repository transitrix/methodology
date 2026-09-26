---
title: Declare ADR applicability in a pull request
status: active
last_reviewed: 2026-09-21
audience: public
license: MIT
tags: [transitrix, guide, adr, review]
---

# Declare ADR applicability in a pull request

An optional PR declaration makes an author's assessment of architectural impact
reviewable. It helps reviewers notice a missing decision without demanding an
Architecture Decision Record (ADR) for every change. This guide provides a manual
review convention and a proposal for evaluating automation; it adds no mandatory
policy, validator rule, manifest field or workflow.

## Three separate questions

| Question | Evidence to review | What does not establish it |
| --- | --- | --- |
| **Applicability:** does this change make or revise an architectural decision? | The actual diff, a specific rationale, existing decisions and any applicable standing grant. | A checked box, a path match or an ADR link by itself. |
| **Record validity:** does the relevant ADR satisfy the record contract? | The original record and the applicable checks in [the decision method](../method/07-decisions.md#7-ci-guard--scriptscheck-adlmjs). | A declaration that an ADR is required, or a URL that happens to resolve. |
| **Authority:** is the decision accepted and applicable to this change? | Current status, scope, supersession and the required ratification evidence under [governance](../method/08-governance.md#2-who-may-change-what--human-and-agent-authorship). | Passing record checks, `status: accepted` alone, or the PR author's assertion. |

The existing [`check-adl.mjs`](../scripts/check-adl.mjs) checks recognized ADR
files, not PR descriptions or the architectural significance of other files. Its
`--dir` option selects a decision-record subpath; it is not an applicability path
hint. Its A3 check rejects a newly introduced agent-authored accepted record when
a base ref is available. It does not authenticate a human reviewer or prove that
acceptance of a previously proposed record was authorized. A clean run with zero
records proves neither that no ADR was needed nor that a private decision exists.
Diff-based checks can be skipped without a base ref; follow the
[setup guide](adl-adopter-setup.md#step-3--the-ci-guard-per-repo-recommended).

## Optional PR text

Copy this section into an adopter's PR description or proposed template. Choose
one value, replace the prompts, and update the assessment when the diff changes.
These are local review terms, not ADR statuses or machine-readable core fields.

```text
ADR applicability: required | not required | uncertain
Rationale: What choice changes, or why this diff makes no new choice.
Decision evidence: New proposal, existing decision, standing grant plus run
  evidence, or none; use only a reference safe for this PR's audience.
Authority: Proposed / acceptance verified / not verified / not applicable;
  name the review evidence that supports the assessment, where safe.
Path hints reviewed: Matches and disposition, or no matches / not configured.
Override: None, or the disputed hint/check, reason, authorized reviewer,
  scope, evidence and expiry or one-PR limit; pending until approved.
```

Use `required` for a new or revised architectural choice, such as changing a
trust boundary, durable data ownership, a compatibility promise or a deployment
contract. A new proposal can satisfy the request to *prepare a record* while the
decision remains unaccepted. Use `not required` for a change that makes no new
choice; explain the boundary, rather than writing only “small change” or “docs.”
Implementing an existing accepted decision can need no new ADR, but the reviewer
still checks that the decision covers the implementation. `uncertain` asks for
review; it must not silently become `not required`.

Existing obligations still apply. For example, the
[upgrade contract](../method/09-releases-and-propagation.md#5-the-bound-on-autonomous-agents)
requires an agent-prepared upgrade proposal unless a valid standing grant covers
the change. A declaration cannot create or widen such a grant. Under an existing
grant, cite the grant and its mechanically checked run evidence where permitted;
the run can be the per-instance record under [the decision method §4](../method/07-decisions.md#4-provenance-and-the-ratification-gate).

For a private decision, keep the original and its reasoning in their authorized
home. Use an approved audience-safe name/date or public policy summary, with an
accessible public reference if available. Do not paste a private URL, repository
path, confidential title or rationale. An authorized reviewer checks the original
and records an audience-safe verification result. If that review cannot happen,
authority remains unverified; a public checker must not infer acceptance from a
404 or fetch private material with expanded credentials. See
[central authoring](adl-adopter-setup.md#central-authoring-for-a-public-repository).

## Worked review cases

These are synthetic examples of expected reviewer dispositions, not executed
gate results or evidence from an adopter trial.

| Change and declaration | Review outcome |
| --- | --- |
| Move durable customer data to a new system of record; `required`, rationale identifies ownership and migration, a valid proposed ADR is supplied. | Applicability is supported and record preparation is complete. Authority remains pending until the required acceptance is verified. |
| Correct spelling in an architecture guide; `not required`, rationale says interfaces, obligations and behavior are unchanged. | Reasonable ordinary change without a new ADR, even when the path is a hint match. Confirm the diff agrees. |
| Implement the retry limit in an existing accepted decision; `not required`, rationale and relevant decision supplied. | No new choice if implementation stays within the accepted scope; validate the reference and authority separately. A changed limit may need a new decision. |
| Change a public interface with no declaration. | Applicability is unknown. Request a declaration and review; neither absence nor a passing ADR guard implies “not required.” |
| `required` with a broken link, a non-ADR target or a valid but unrelated ADR. | Declaration is present, evidence is missing or irrelevant. Repair the reference or provide the audience-safe verification route; do not mark authority verified. |
| `required` with a valid superseded ADR or a proposed ADR described as accepted. | Record shape can be valid while authority is insufficient. Follow the successor and verify its scope, or obtain ratification. |
| Reformat a hinted schema file without changing semantics; `not required`, explicit one-PR override request with diff rationale. | An authorized reviewer may dismiss the hint under the adopter's existing exception process. Record the disposition; a self-approved override is insufficient. |
| Change a trust boundary in an unhinted file; `not required`, rationale says only “no matching paths.” | Reject that rationale. Review the choice and request the appropriate record; the hint list is not a scope exemption. |
| Repeat an upgrade within a standing grant; `not required`, grant and passing run evidence supplied. | Verify every grant condition and its end condition. Missing guard evidence or an out-of-scope change falls back to the ordinary proposal path. |
| Private accepted decision with an approved public summary and authorized verification. | Review applicability publicly and verify the original in its authorized audience. The safe summary is not itself an ADR or a new acceptance. |

A deliberate override records disagreement with an applicability hint or local
declaration check. It does not waive record validity, ratification, confidentiality
or unrelated required checks. Without an already authorized exception mechanism,
leave the request pending for the responsible decision owner; do not invent an
override label that grants authority by its presence.

## Evaluate path hints before enforcing anything

False positives are predictable: formatting a schema, fixing a link in a decision
guide or regenerating unchanged output can touch “architectural” paths without
making a decision. False negatives are equally plausible: configuration, one line
of application code or a prose edit outside those paths can change an interface or
trust boundary. Renames, copied boilerplate, stale declarations and misleading
`not required` rationales are ways to evade a naive rule. An AI diff classifier has
the same missing-context problem and is not a substitute for decision authority.

Start with manual review. If hints would help a particular adopter, document their
configuration before implementing them:

| Adopter-owned setting | Illustrative choice and boundary |
| --- | --- |
| Paths and explanation | `schemas/**`: review compatibility; `deploy/**`: review deployment boundaries; `docs/architecture/**`: review stated contracts. Replace these with actual local paths and reasons. An empty list disables hints only. |
| Exclusions | Exact generated or fixture paths, justified and reviewable. Exclusion suppresses a hint, never the declaration or substantive review. Avoid a blanket `docs/**` exemption. |
| Matching rules | Declare the glob dialect and case rules; inspect both old and new paths for renames and deleted files. Missing/truncated diff input yields unknown coverage, never “no impact.” |
| Record location | Configure the existing canonical ADR location separately from hint paths. Do not create a second decision log. |
| Review and exception ownership | Name who assesses significance and who can approve a local override, its scope, lifetime and audit evidence. Preserve existing ratification requirements. |
| Mode and reevaluation | Begin advisory. Bind assessments to the reviewed head and PR body; re-review relevant edits, base changes, renames and configuration changes. |

This table is configuration design guidance, not a shipped YAML schema or new
options for `check-adl.mjs`. Keep a future implementation's trusted configuration
and reviewer authorization outside unilateral control of the PR author. Treat PR
text as untrusted data, never executable instructions or a reason to retrieve
arbitrary URLs.

In a bounded pilot, compare hint matches and declarations with reviewers' actual
assessments. Record total reviewed PRs, missed architectural choices, unnecessary
prompts, unresolved cases, overrides and review effort. Sample unhinted changes as
well as hinted ones, or missed choices remain invisible. Agree duration, acceptable
error levels and the stop condition locally; no universal accuracy is claimed.

## Proposal boundary for an automated control

Recommendation: retain the declaration as advisory guidance first. A future
opt-in checker could check declaration completeness and issue explainable hints,
while keeping applicability review, ADR validation and authority verification as
separate results. It should never decide “ADR required” solely from a path match.

Before making any result blocking, the adopter's decision owner needs to choose
the covered PRs, blocking conditions, reference-verification route, authorized
override process, trusted configuration and pilot acceptance thresholds. A narrow
candidate is to block a missing or incomplete declaration while treating path
hints as advisory; even that is a new local policy requiring explicit adoption.
Workflow activation and administration are separate from documenting this option.

Any implementation needs positive and negative tests for the worked cases above,
plus empty/duplicate declarations, body edits after approval, renamed/deleted
paths, untrusted configuration changes, unavailable references, incomplete diffs
and unauthorized or expired overrides. Demonstrate that a valid proposed record
can pass record checks without passing authority review, and that an ordinary
change can pass without creating an ADR. Publish the adopter configuration and
the limits alongside the control. This guide implements no such checker.
