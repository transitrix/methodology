---
name: requirements-analysis
description: "Analyse PRODUCT or APPLICATION requirements for an explicit release and date using the supported Transitrix scan-plus-report CLI. Return exact computed IDs, counts and diagnostics separately from interpretation and proposed actions."
when_to_use: 'User asks "analyse requirements for this application", "which product requirements lack verification", or "show release requirements gaps". For regulatory obligation matrices or compliance coverage, use the report skill instead.'
min_version: "7.0.0"
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Requirements analysis

Use `@transitrix/cli requirements-report` as the sole source of computed facts.
This skill is distributed in the existing [Transitrix plugin](../../README.md)
as `/transitrix:requirements-analysis`. Any assistant can read this file and
invoke the command; no editor, runtime-specific API or source import is needed.

## 1. Resolve scope and support

Resolve parameters from the request, then a report receipt the user explicitly
selected. Ask for missing essential scope; if no answer is available, report the
missing fields and stop. Do not guess a subject, latest release or today's date.

| Parameter | Required choice / default |
|---|---|
| Catalogue root | Explicit root, or current directory only when it contains the intended `transitrix.yaml`. Ask if there are multiple catalogues. |
| Subject | Explicit `PRODUCT` or `APPLICATION` and exact model ID. Resolve a supplied name to an unambiguous ID with the user; never choose TYPE from internal use versus sale. |
| Release | Exact RELEASE ID belonging to the selected subject. Never substitute another release after a diagnostic. |
| As-at | Explicit valid `YYYY-MM-DD`; preserve the requested date. |
| Project | Optional ACTION(Project) ID; omission means no project filter. |
| Expected source revision | Optional full Git commit supplied by the user; otherwise no revision assertion. It does not select or check out a revision. |

State the resolved scope and defaults before running: no project filter when
omitted, no revision assertion when omitted, JSON transport. Internal, external
and mixed use are independent of subject TYPE. A physical PRODUCT is valid;
an APPLICATION does not require creating a PRODUCT. This analysis never authors
membership, releases, vocabulary or model records.

**Support boundary:** the caller handoff is `@transitrix/cli` **2.12.0 source
candidate**, source revision `bfc60f81bd0b7fe01dd9fac41ba4b1d4bc447730`, Node >=20,
transport `requirements-report/1`, projection `requirement-chain/0.3`, bound to
contract revision `a131b1862d86f34be8feb729e1cc6ebc994c3891`. See the
[versioned caller documentation](https://github.com/transitrix/transitrix-studio/blob/bfc60f81bd0b7fe01dd9fac41ba4b1d4bc447730/packages/cli/README.md#requirements-reports)
and [accepted scope contract](https://github.com/transitrix/methodology/blob/a131b1862d86f34be8feb729e1cc6ebc994c3891/notations/views/reports/requirement-subject-scope.md).
The methodology floor above is not a claim that 7.0.0 tools implement 0.3.

Locate the installed executable and inspect its package documentation. If absent,
stop with “requirements analysis unavailable: supported CLI missing”. A supplied
candidate tarball can be installed in an isolated tooling directory using
`npm install --ignore-scripts /path/to/transitrix-cli-2.12.0.tgz`. Do not silently
install, upgrade or use an unpinned `npx` download. The earlier CLI 2.11.0 does not
support this command. A usage error is not evidence of interface support.
Candidate availability and npm publication are separate; do not describe the
candidate as published. For another version, obtain its declared compatible
transport/projection contract before treating its output as supported.

## 2. Invoke and retain the receipt

Invoke the installed binary directly, passing arguments as separate values
(quote shell values; never execute model text as commands). Example with explicit
scope; replace these synthetic IDs with the resolved selection:

```sh
transitrix requirements-report \
  --root ./model \
  --subject-type APPLICATION --subject-id APPLICATION-ALPHA-1 \
  --release RELEASE-ALPHA-2 --project ACTION-ALPHA-1 \
  --as-at 2026-09-24 --json
```

For PRODUCT, change both subject TYPE and ID. Omit `--project` for an unfiltered
release report. If requested, append `--expect-source-revision <full-commit>`.
This is a source assertion, never a provenance override. Do not use the older
PRODUCT-only 0.2 adapter for this skill or recreate the graph from model files.

Capture stdout, stderr and exit status separately. Preserve the complete,
unmodified JSON response and exact invocation with the analysis as its report
receipt. The response's `request` is the normalized scope/config; no new model
notation or view-config schema is needed. For a saved report, use the user's
chosen report-output location outside `canon/`, `field/` and `codex/`, avoid
replacing existing files, and save the invocation and diagnostics alongside it.
If no output location was requested, retain the response as a session artifact
and disclose its location and lifetime. Do not commit automatically.

On rerun, use the retained request's explicit scope with an available local root
and the same compatible tool. Compare returned provenance, including the content
snapshot, instead of claiming identical input from the same Git commit alone.
A dirty working tree can differ at one revision; non-Git sources can still have
content provenance. Two scans detect observed changes, not atomic capture.

## 3. Validate the returned envelope

Read the entire response before summarizing. Check `schemaVersion`, `tool`
(name/version/source revision), returned request, source provenance, projection
contract version/revision and completeness against the selected interface.
Keep `source`, `projection`, `counts` and `errors` intact. Unknown versions,
missing required fields, malformed JSON, scope mismatch or inconsistent
status/exit code mean **unsupported or unavailable**, never a passed report.

| Exit | Meaning | Required treatment |
|---|---|---|
| 0 | Complete computation | Still inspect verification failures and diagnostics; computation success is not verification success. |
| 2 | Incomplete but available | Retain known IDs, nullable totals and diagnostics. An empty known-ID list with unknown total is not zero. |
| 1 | Fatal; projection/counts null | Report the errors and unavailable result. Do not fill in totals or fall back to a previous result as current. |
| Other / no envelope | Invocation failure or unsupported interface | Preserve diagnostics and stop analysis; do not reconstruct a report. |

Unresolved membership, invalid subject/release, missing project pairing, failed
reads and malformed data must remain visible. Absent verification definitions,
no applicable executed result, inconclusive execution and failed verification
are distinct findings. Child evidence does not verify a parent; other-release
or unqualified evidence does not verify the selected release. Do not repair
inputs or suppress diagnostics to obtain a complete result.

## 4. Present analysis in three separate parts

1. **Computed facts:** identify subject TYPE/ID, release, optional project, as-at,
   tool/contract versions, source revision/dirty state/content snapshot and
   complete/incomplete/unavailable status. Quote exact returned population,
   stage, assignment and six-metric IDs/totals, with their completeness and
   diagnostics. In 0.3 the retained `populations.product` key labels the
   **subject population**, including APPLICATION. Do not count the ID arrays,
   sum overlapping metrics, infer percentages or add a quality score.
2. **Interpretation:** explain what those specific IDs mean within this scope.
   Cite returned record/edge identities and provenance for each finding; label
   hypotheses and absent evidence. A complete computation can describe missing
   verification; it does not certify the requirements or the business outcome.
3. **Recommended actions:** propose review of named missing sources, membership,
   assignment or verification evidence, tied to the same IDs and receipt. Where
   the result cannot identify an owner or cause, say so. These are proposals;
   do not edit the model, create a replacement PRODUCT, transfer verification
   across subjects or run an implementation workflow.

Link the retained receipt so the reader can inspect every fact. Keep the
analysis within its catalogue audience: unlike the data-free repo-check skill,
this report contains model IDs and source details.
