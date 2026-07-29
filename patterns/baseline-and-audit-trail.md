# Baseline, Audit Trail and Approval Record

**Pattern type:** overlay
**Complexity:** simple
**Mechanism:** [`notations/CONTRACT.md`](../notations/CONTRACT.md) §6 (admission record), §6.1 (pre-admission lifecycle), §6.2 (reviewer authority), §7 (primitive lifecycle) — this pattern introduces **no new schema**. It names the audit-facing story an existing mechanism already tells and gives it a QA-facing vocabulary.

---

## Problem

An adopter under any review obligation — an internal audit, a design review, a
management-system surveillance visit, a customer assessment — eventually faces the
same three questions about its canon (`REQUIREMENT` / `ASSERTION` / `VERIFICATION`,
[CONTRACT.md](../notations/CONTRACT.md) §8):

1. **"What did the model say at the time of the review?"** — a baseline.
2. **"Who changed what, and when?"** — an audit trail.
3. **"Who reviewed and approved this content, and on what authority?"** — a review/approval record.

None of these need a new mechanism. CONTRACT.md §6/§6.2/§7 already carries every fact an auditor asks for; what is missing is a QA-facing name for the pattern and a thin script that packages the first question as an artefact instead of a manual `git log` walk. This pattern supplies both.

## Solution

### 1. Baseline — a `git tag` is a baseline

**Convention:** when a review, a milestone, or a submission needs a frozen snapshot of the model, tag the commit. The tag *is* the baseline — there is no separate baseline artefact to author, version, or keep in sync, because the git object it points at is already immutable.

```
git tag review-2026-Q3 <commit>
```

`scripts/baseline-manifest.mjs` turns that tag into a **manifest** — the frozen `REQUIREMENT` / `ASSERTION` set exactly as it stood at that ref:

```
node scripts/baseline-manifest.mjs <ref> [--root <adopter-repo>] [--out <file.md>]
```

- **Read-only.** It reads every file via `git show <ref>:<path>` — it never runs `git checkout`, so it never disturbs the working tree and is safe to run against a tag from years ago while the working tree sits on a different branch.
- **Split by `reviewer_authority`** ([CONTRACT.md](../notations/CONTRACT.md) §6.2) — the manifest separates `expert_confirmed` requirements from `ai_reviewed` ones, so an auditor can see at a glance how much of the baseline rests on the top authority tier versus the AI-reviewed tier.
- **Carries `REQ-COVERAGE-001` as it existed at that ref** — each requirement's compliance-coverage gap status ([CONTRACT.md](../notations/CONTRACT.md) §8) is computed from the `ASSERTION` set *at that same ref*, not from today's canon. A baseline answers "what did the model say then", not "what does it say now".

Run it against any ref git can resolve — a tag, a branch, a SHA. There is nothing tag-specific in the mechanism; tags are simply the natural, human-legible way to mark a baseline commit.

### 2. Audit trail — git history is the audit trail

**Convention, articulated for a reviewing reader:** every canonical file's change history *is* the audit trail. Each commit that touches a `REQUIREMENT`, `ASSERTION` or `VERIFICATION` file already records, immutably:

| Auditor's question | Where the answer already lives |
|---|---|
| Who made this change? | The commit author (or the PR approver — see §3) |
| When? | The commit timestamp |
| What changed? | The commit diff |
| Why? | The commit message / linked PR description |

`git log --follow -- <path>` (or a Studio / DSM history view over the same commits) is the audit trail. Nothing needs to be authored separately, because nothing is asserted here that git does not already guarantee.

### 3. Review/approval record — the admission record already is one

**Mapping**, restated for a reviewing reader who does not think in terms of the admission gate:

| Audit concept | Transitrix mechanism |
|---|---|
| The record was reviewed | A PR against the canon file, approved before merge |
| The reviewer's identity | `admitted_by` ([CONTRACT.md](../notations/CONTRACT.md) §6) — the PR approver who ran the admission gate |
| The reviewer's authority | `reviewer_authority: expert_confirmed` ([CONTRACT.md](../notations/CONTRACT.md) §6.2) — a human reviewer; `ai_reviewed` records a tool reviewer instead |
| When it was approved | `admitted_at` |
| What was checked | `gate_checks` — the standard canon checks (`uniqueness`, `consistency`, `completeness`) |

No new field, no separate sign-off document: **PR approver + `reviewer_authority: expert_confirmed` + the admission gate together constitute the review/approval record.** An adopter that wants a single-line emitter over this mapping can derive it from the same fields `baseline-manifest.mjs` already reads — no separate schema to add if that becomes worth building.

## Guardrails — what this pattern does not claim

- **A commit is not an electronic signature.** A git commit authenticated by an SSH key or a platform account is a strong audit-trail and baseline mechanism, nothing more. This pattern documents an audit trail and a review/approval mapping; an adopter operating under a regime that mandates electronic signatures needs a signature mechanism this pattern does not provide.
- **Pattern, not adopter instance.** Nothing here names or implies any specific adopter, product, or submission. `scripts/baseline-manifest.mjs` and the mapping above are generic over any repository carrying canon.
- **No new claim about verification coverage.** Whether every requirement is verified, and whether each verification has closed, is answered by the reverse-trace rules on the V&V leg ([27-verification.md](../notations/elements/27-verification.md), [15-requirement.md](../notations/elements/15-requirement.md) §4) — shipped independently of this pattern. This pattern adds nothing to that surface; it only names the baseline / audit-trail / review-approval story that sits alongside it.

## When to use

Once an adopter has admitted its first `REQUIREMENT` and expects a review, an audit, or a submission to ask "what did the model say, and who approved it" — tag the commit and run `baseline-manifest.mjs` against it. There is no earlier point at which this pattern adds anything: before the first admitted requirement, there is nothing to baseline.

## See also

- [`notations/CONTRACT.md`](../notations/CONTRACT.md) §6, §6.1, §6.2, §7, §8 — the underlying mechanism.
- [`notations/elements/15-requirement.md`](../notations/elements/15-requirement.md), [`16-assertion.md`](../notations/elements/16-assertion.md) — the elements a baseline manifest reads.
- [`notations/elements/27-verification.md`](../notations/elements/27-verification.md) — the V&V leg whose coverage a reviewer asks about alongside the baseline.
