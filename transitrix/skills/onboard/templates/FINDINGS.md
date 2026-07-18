# FINDINGS.md — raising a finding (shared protocol)

> **Shared across all four adopter role guides** — [`AGENTS.md`](AGENTS.md) (Modeler), [`ANALYST.md`](ANALYST.md), [`VALIDATOR.md`](VALIDATOR.md), [`INGEST.md`](INGEST.md). This is the single source for the propose → route → scrub rule; each role guide references this file rather than repeating it, and adds only its own one-line note on how a finding surfaces from that role's normal output (§4 below).

This file tells **any AI coding assistant** operating inside a Transitrix adopter repository, in any of the four roles, what to do when it notices something outside the task it was actually asked to do.

---

## 1. When this applies

Every role has strict guardrails — the Analyst is read-only, the Modeler doesn't decide waivers, the Validator doesn't merge, the Ingest role never writes admitted canon. Those guardrails hold even when a role notices something outside its own lane while doing its actual job: the Modeler authoring one element spots that a neighbouring element has the wrong owner; the Analyst answering a question about a capability notices a stale relation; the Validator reviewing a diff spots an unrelated structural problem; the Ingest role extracting candidates hits raw material that implies a gap in the notation itself.

Two outcomes, always:

- **Requested work** → the role does it, within its own lane, per its own guide.
- **Incidental finding** → the role does not silently fix it (that may be outside its role's write permission entirely, or simply outside what was asked) and does not drop it (the observation is real and would otherwise be lost). It raises a finding instead.

---

## 2. The rule — propose → route → scrub

1. **Propose.** State the correct fill — what the role believes the fix should be — alongside a **confidence signal**:
   - **Structural** wrongness (a missing required field, a dangling reference, an ArchiMate-layer violation, an ID-grammar violation) → **high confidence**. This is a fact about the model's shape, checkable the same way any validator checks it.
   - **Business-value** wrongness (which attribute is correct, who the real owner is, which of two plausible relations is right) → **flagged as the human's call**. The role states what it observed and why it looks wrong, but does not assert the "correct" answer with the same certainty as a structural finding.
2. **Route.** The finding goes to a human, who decides:
   - **Apply the fix** — author or approve the change into `canon/`, through the same gating as any other change (`AGENTS.md` §11).
   - **Escalate to the data owner or architect** — when the fix needs organisational judgement the raising role can't supply.
   - **Escalate upstream to the methodology** — when the finding is a notation or spec limitation, not a data problem (e.g. "there is no relation kind connecting X to Y").
3. **Scrub (mandatory for methodology-directed findings).** A finding routed upstream to `transitrix/methodology` is stripped of adopter specifics before it leaves this repo — a generic limitation only, never client model content. Same discipline as "publish pattern, not client instance" and the real-names rule, applied to this feedback channel too.

No role auto-applies its own proposed fill. Raising a finding is never itself a write to `canon/` — the human act of applying or escalating is what moves it.

---

## 3. Finding record shape

```yaml
type: data-error | model-suggestion | methodology-feedback
raised_by: <role>              # Ingest | Modeler | Analyst | Validator
subject: <element/artefact ID or area, e.g. CAPABILITY-V2 or "GOAL relation kinds">
confidence: structural | business-judgement
observation: <what was seen, in plain language>
proposed_fill: <the role's proposed correct value, if any — omit if none>
routing: apply | escalate-owner | escalate-methodology
```

- `type` — `data-error` (canon disagrees with itself or its source), `model-suggestion` (canon is valid but could model something better), `methodology-feedback` (a canon-confirmed gap in the notation itself, not fixable by editing data).
- `confidence` — the two-tier signal from §2 step 1. Not a numeric score; a role either has structural certainty or it doesn't.
- `routing` — the role's recommendation; the human makes the final call regardless.

This shape generalises two things that already exist in the methodology: the Ingest skill's `review-queue.schema.json` (candidates carry `extraction_confidence` and land in a human-reviewed queue) and the Validator's structured severity report (`VALIDATOR.md` §5, error/warning/pass). A role with an existing structured output surfaces a finding inline in that output rather than in a separate file — see §4.

---

## 4. How each role surfaces a finding

- **Ingest** — an incidental finding rides in the existing `review-queue` output alongside candidates and relation suggestions (`INGEST.md` §3); no new file.
- **Validator** — an incidental finding (something outside the diff under review) is reported alongside the diff's own findings, in the same severity-graded report (`VALIDATOR.md` §4-5), clearly marked as out-of-diff.
- **Modeler** — states the finding in the same session as the requested work, before or after making the requested change — never folded silently into the requested change's diff.
- **Analyst** — states the finding as a caveat alongside the cited answer to the question actually asked — never in place of answering the question.

---

## 5. What this protocol does NOT do

- Does **not** let a role write outside the zone or file types its own guide permits — a finding is a proposal, not a write.
- Does **not** replace the requested task — raise the finding in addition to doing the actual work, never instead of it.
- Does **not** apply to structural findings a role's own guide already requires it to check and report as part of its normal output (e.g. the Validator's three layers, `VALIDATOR.md` §2) — those are the role's job, not an "incidental" finding.
- Does **not** bypass human review — routing is a recommendation; a human decides apply vs. escalate vs. discard.
