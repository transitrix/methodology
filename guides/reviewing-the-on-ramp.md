# Reviewing the on-ramp

Use this procedure when contributing feedback on the path from opening Transitrix documentation to validating a first model file. It produces a reproducible session record and a list of proposed cuts, including reasons to keep material that helps a newcomer understand the method.

This is a guide for reviewers, not a prerequisite for learning Transitrix. Newcomers start at the [README](../README.md).

## Prepare a baseline

A facilitator records the documentation commit, date, entry URL, and intended audience before the session. Map the entry surfaces and their links without prescribing which links the reader should follow:

| Surface | Documented audience and destination |
| --- | --- |
| [README](../README.md) | Diagram-only visitors go to Studio; team repository adopters go to Quick start. |
| [Getting started](../GETTING_STARTED.md) | Manual authors create and validate a one-goal tree. |
| [Onboarding skill](../transitrix/skills/onboard/README.md) | Agent-assisted adopters set up a repository or contribute to an existing one. |
| [Walkthrough](../WALKTHROUGH.md) | Readers explore a complete fictional organisation across notations. |
| [Foundations](../method/01-foundations.md) and [patterns](../patterns/index.md) | Readers seek the method's rationale or a deployment pattern. |

Record the required setup and advertised first result for each route. Keep diagram rendering, file validation, and whole-repository validation distinct. Record later reference material separately from material needed before the first result.

Recruit a reader who has not previously read the method and is neither an author nor a maintainer. A maintainer's inspection or an automated test can prepare the inventory, but cannot stand in for this reader's session.

### Agree on evidence and consent before collection

Before recording eligibility, experience, or session activity, agree with the reader and facilitator on what will be collected, who may access it, where it will be stored privately, and when it will be deleted. Decide whether the report will remain private or whether a redacted version may be published, and identify that destination. Record their consent privately before proceeding; consent to participate is separate from permission to publish. Explain that public GitHub records are durable and may be copied. If agreement is missing, do not collect the session.

Use session-scoped identifiers for every participant, such as `reader-01`, `facilitator-01`, and `reviewer-01`, within a session identified by an opaque code. Keep any identity mapping and contact details separately in the agreed private location, accessible only to those who need them to verify participation. Record prior experience with Git, YAML, modelling, and coding assistants as broad familiarity levels, without employers, account handles, or personal biography; technical experience does not disqualify the reader.

Keep raw notes, transcripts, screenshots, recordings, commands, model files, and outputs in the agreed private location, outside public repositories and attachments. Collect only what the session needs, use fictional modelling content, and let the reader pause capture or decline an excerpt. Record any resulting evidence limit. On assisted routes, capture only prompts, responses, and tool interactions visible to the reader in this session; do not collect hidden reasoning, system instructions, account history, or unrelated conversations.

Give the reader only an entry URL and this task: **“Use these materials to create and validate your first model file. Choose the route that fits how you work.”** Do not show them the facilitator's map, suspected friction, or proposed cuts first. If testing a particular route, record that assignment instead of claiming the reader discovered it unaided.

## Observe the first attempt

1. Record the start time, operating system, editor, installed prerequisites, and any assistant used. Pin the documentation commit and record the actual CLI or extension version; an unpinned command can download a different version on a later run.
2. Let the reader navigate and work without coaching. Ask them to note what they expect each link or instruction to do, where they hesitate, and what they try next. Record consented, user-visible assistant interaction encountered on an assisted route as part of the path.
3. Log each page and section visited, backtrack, setup action, command, error, and recovery. Keep observed behaviour and the reader's words separate from the facilitator's interpretation.
4. Stop the first attempt when a saved model file validates, the reader gives up, or the agreed session limit expires. Agree on a limit before starting (for example, 30 minutes); it bounds the observation, not the reader's ability. Record elapsed time and setup/download time separately.
5. If the reader asks a person for help, record the question and the point where it arose. Help may continue the session, but label the rest assisted. Do not restart the clock or describe that attempt as an unaided completion.

Keep the saved file, exact validation command, exit status, and relevant output with the private evidence record. A public report contains only approved, redacted copies or excerpts, with omissions marked and their effect on reproducibility stated. A rendered picture alone is not evidence that a file validated. A validated inline goal in a Goals tree is not evidence of a separately admitted canonical element or a clean whole-repository check.

Only the first attempt is a cold read. Later routes tried by the same reader are informed follow-ups. Use a new reader for an independent first attempt on another route, and state which routes were not exercised.

## Separate volume from understanding

Record three different observations; do not collapse them into a single score:

- **Volume:** pages/sections actually visited, backtracks, commands, and words encountered before success or stopping. For comparable word counts, count whitespace-separated tokens in the recorded Markdown excerpts, including code; save the excerpt boundaries and count each section once. Record repeat visits separately. Assistant text is a separate count. These are exposure estimates, not proof that every word was read.
- **Comprehension:** after stopping, ask the reader to explain what they made, what validation checked, and what they would change next. Record the answers before correcting them. Faster completion with a mistaken explanation is not an improvement.
- **Imaginability:** ask what use they could picture for the result and when that became clear. Record “no use yet” as a valid answer; do not substitute a word count for it.

No first-reader observations means no comprehension or unaided-completion result. Mark missing evidence explicitly rather than filling it with a maintainer's prediction.

## Propose and defend cuts

After the session, identify material that could be removed from the entry path, moved after first success, or clarified. Leave the specification unchanged; a proposed change to the method belongs in a separate specification review.

For each proposal, record:

| Field | What to record |
| --- | --- |
| Location | File, section, and documentation commit. |
| Evidence | Session event or reader observation; mark desk-review hypotheses as untested. |
| Change | Exact cut, move, or clarification proposed. |
| Expected effect | Steps or reading removed, and the first result it should help reach. |
| Understanding at risk | What explanation or prerequisite the reader would lose. |
| Disposition | Accepted, refused, or deferred, with a session-scoped reviewer identifier and reason. |
| Verification | Follow-up session or check that supports the disposition. |

Record totals for proposed, accepted, refused, and deferred cuts. A refusal is useful evidence when it explains what the material protects. Do not manufacture a refusal to reach a quota, or treat accepting every proposal as proof that the review was rigorous. A change that saves words but harms comprehension must be refused or revised.

## File and sign the report

Prepare the report privately using this outline. Before publishing any version, remove personal and account data from prose, commands, paths, URLs, transcripts, screenshots, model files, and output: names, usernames, email addresses, home paths, account or repository identifiers, and personal context. Remove credentials and identifying organisation data as well. Retain relevant public documentation URLs and tool versions. Mark substitutions consistently so the sequence remains understandable; keep raw-to-redacted correspondence private. Do not publish private storage links or identity mappings.

Have the reader and facilitator review the exact redacted report revision and explicitly approve its publication to the agreed destination. Withheld material stays private; record evidence limits without disclosing what was withheld. If publication is not approved, keep the report private.

```text
Baseline date and documentation commit:
Session code and session-scoped participant identifiers:
Agreed report visibility and collection/publication consent status:
Reader eligibility and broad prior-experience levels:
Entry URL, intended audience, and route selection:
Entry map and required setup:
Environment and actual tool versions:
Session limit, start, stop, and outcome:
Ordered page/section visits and observations:
Approved redacted artefact, command, exit status, and output:
Elapsed time and setup/download time:
Volume counts and excerpt boundaries:
Reader's comprehension and imaginability answers:
Help requested or given:
Proposals, dispositions, reasons, and totals:
Unvisited routes and other evidence limits:
Redactions, omissions, and their effect on reproducibility:
Reader sign-off, date, and report revision:
Publication approval, date, and exact report revision:
Process reviewer identifier, review date, and process revision:
```

The reader signs in their own words that they performed the recorded session, met the eligibility conditions, and that the report accurately records the outcome and help received. A failed attempt can be signed as an accurate baseline. Sign-off must not imply successful completion when the reader stopped or needed help.

The reader may sign privately under their session-scoped identifier; neither a public name nor a GitHub account is required. Retain their actual attestation and its connection to the report revision privately. With their permission, the facilitator may publish the approved attestation under that identifier, stating that the reader supplied it privately and which revision it covers. This relays the reader's words; it does not author a sign-off for them. Keep accuracy sign-off distinct from publication approval, and obtain both again if the report revision changes.

A separate process reviewer checks that the procedure preserves independence and distinguishes observation from interpretation. Record review comments and their resolution. Neither the facilitator nor the process reviewer signs on behalf of the reader. An unsigned inventory remains a preparation report, not a completed cold-read baseline.

Submit only the approved report version through the agreed route in [Contributing](../CONTRIBUTING.md#communication). Raw evidence remains private under the agreed access and deletion terms.
