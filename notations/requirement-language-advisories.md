# Requirement-language advisories

Contract and rule-set version: **0.1.0 (draft, opt-in)**.

This specification serves requirement authors, reviewers and implementers of a
shared advisory checker. It consumes Methodology revision
`7f45e1ec2a289c8dc8404577ab4c61134bc04364`, specifically
[REQUIREMENT 1.4](elements/15-requirement.md) and
[VERIFICATION](elements/27-verification.md). Consumers must pin this document's
own Git revision as well as that consumed revision; a moving branch is not a pin.
It defines candidate heuristics, not a language standard or proof of a defect.

## Scope and coverage

Only the decoded string values of REQUIREMENT **`name` and `description`** are
eligible authored obligation text. These are the actual statement and explanation
fields; there is no invented `text` or `acceptance_criteria` model property.
Evaluate fields independently. Do not scan arbitrary repository prose, comments,
IDs, metadata, CONSTRAINT records, verification results or linked documents for
additional findings. Missing/non-string required fields are structural concerns:
record unsupported input, not a language finding. Absent optional attributes,
including `level`, `kind`, `parent`, `serves` and `derived_from`, are not defects.

English scope must be explicitly selected by the caller outside the canonical
model, either for a whole field or for non-overlapping scalar ranges. Never infer
English from a successful token match. Mixed-language fields evaluate only their
explicitly selected English ranges and are partially evaluated; unknown language
or no selected English range is not evaluated. Do not translate or join matches
across language boundaries. This pilot does not require controlled English.

Report coverage separately from findings, for every requested field:

- `not-evaluated`: disabled pilot, no enabled rules, no supported English text,
  unsupported source syntax, malformed source, or no evaluable field.
- `partially-evaluated`: some eligible text was evaluated, but language ranges,
  unsupported markup, or requested context could not be evaluated.
- `evaluated`: every declared eligible range was evaluated with enabled rules and
  requested supported context was available. Deliberately excluded literal ranges
  are accounted for as exclusions, not errors.

A result has `no-findings` only when coverage is `evaluated` and its findings array
is empty. Partial or unevaluated results with empty arrays retain their coverage
label, never a clean badge. Findings and partial coverage can coexist. Aggregate
coverage is evaluated only if all requested fields are evaluated, not-evaluated
if none were evaluated, and partial otherwise. A clean result means only **no
enabled matches in the declared supported scope**, not completeness, correctness,
verification success, or absence of criteria elsewhere.

## Text extraction and coordinates

Read UTF-8 YAML 1.2 scalar values with source locations. Reject invalid UTF-8,
duplicate mapping keys and ambiguous parse results for this evaluation. Support
plain, single-quoted, double-quoted, literal (`|`) and folded (`>`) scalars,
including explicit indentation and chomping indicators. YAML quoting is syntax:
`name: "Retention shall be TBD days"` still contains an authored placeholder.
Decode YAML escapes and apply folding/chomping **before** matching. Aliases,
custom tags and merge keys are unsupported for these fields in this version;
report the limitation rather than guess the authored source.

The primary span is `[start, end)` in **zero-based Unicode scalar values** of the
entire decoded field, including its retained Markdown syntax. No NFC/NFKC
normalization, UTF-16 indexing, byte indexing or grapheme indexing is allowed.
CRLF and CR are normalized to LF by YAML decoding; supplementary characters count
as one scalar, combining marks each count separately. Do not collapse whitespace
or remove Markdown to construct the coordinate string. Evidence must equal the
exact decoded slice. A UI using UTF-16 must explicitly convert these offsets.

Also return ordered `sourceSegments`: half-open UTF-8 byte ranges in the original
file that contributed the matched scalar sequence. An escaped scalar maps to all
bytes of its escape; a YAML-folded space maps to the intervening source newline
and indentation. Coalesce adjacent contributing byte ranges; omit YAML indentation that does not
contribute a decoded scalar. Segments may span physical lines. Never pretend a decoded span
is one contiguous editable source range. Display locations may be derived from
these segments; the checker supplies no replacement edit. If the parser cannot
provide an exact mapping, mark the field not-evaluated (`source-map-unavailable`).

Within decoded fields use CommonMark 0.31.2 block/inline classification solely to
identify exclusions. Never match through markup tokens or across excluded ranges.
Exclude code spans, fenced/indented code blocks, block quotes, HTML blocks/tags,
autolinks, link destinations/titles and link/image labels (reference mentions).
Resolved reference-style links are excluded too; unresolved reference syntax is
not silently treated as a resolved target. A soft line break remains LF and can
match the whitespace in a phrase. Emphasis delimiters remain boundaries:
`as **soon** as possible` is outside this pilot's phrase match, not normalized to
plain prose. Report markup-interrupted potential phrases as unsupported only if
explicitly requested for evaluation; do not promise detection of all paraphrases.

Additionally exclude paired literal quotation spans delimited by ASCII `"…"`,
curly `“…”`, or curly `‘…’` within one decoded line (greedy pairing is forbidden:
pair each opener with the next matching closer, left to right). Apostrophes are
not quotation delimiters. An unmatched opener is ordinary text. Explicit
source-excerpt ranges supplied with provenance by the authorized adapter are
excluded even without quote punctuation. Backslash-escaped Markdown punctuation
remains syntax and cannot start a quotation range. Record exclusion reasons and
ranges only within the caller-visible field. Quoted text stays byte-identical.

## Three candidate rules

Match left to right within eligible ranges; ASCII letters compare
case-insensitively, without locale-dependent or Unicode case folding. A token
boundary is the start/end of a range or a neighboring scalar **not** in Unicode
15.1 categories L, M, N, Pc and not ASCII `-`, `.`, `/`, `:`, `@`, or `+`.
These identifier punctuation characters deliberately prevent matches embedded in
IDs, paths and domains. A terminal sentence period is an exception: it is a
boundary when followed by whitespace or end of the field. Implementations must
pin Unicode category data rather than inherit an unrecorded runtime version.

Phrase spaces match one or more of exactly U+0020, U+0009, U+000A. No other
whitespace, stemming, synonyms or punctuation variants are implied. Both outer
boundaries must pass. One finding per rule occurrence; no sentence deduplication.

| Rule ID / version | Exact candidate | Advisory question |
|---|---|---|
| `RLA-PLACEHOLDER` / `0.1.0` | `TBD` or `TBC` | What decision or reference resolves this recorded placeholder, and who can confirm it? |
| `RLA-TIMING` / `0.1.0` | `as soon as possible` | Which applicable deadline or triggering condition is intended here, or is this deliberately high-level timing? |
| `RLA-EVALUATIVE` / `0.1.0` | `fast`, `quickly`, or `user-friendly` (ASCII hyphen) | Which acceptance criterion or definition applies here, or is this deliberately a stakeholder-level quality goal? |

`TBDish`, `TBC_1`, `REQ-TBD-1`, `TBD.example`, and `fast/path` do not match.
Literal bare tokens are excluded only when marked as code, a quote, a reference,
or an explicit literal range with provenance; prose guessing cannot distinguish
an unmarked product name from ordinary language. This is a documented false
positive risk. A bare `TBD` is an unresolved **candidate**, never a claim that a
reference was searched exhaustively. A resolved reference range excludes the
reference mention, not every equal token in the field.

Negation never automatically cancels a candidate: `not fast`, `not quickly`,
`not user-friendly`, `not as soon as possible` and `not TBD` still match. Attach
`negation: nearby` when the immediately preceding ASCII word is `not`, `never`
or `no`, separated from the candidate only by the phrase whitespace above;
otherwise `negation: unknown`. This flag is lexical evidence, not a polarity
judgment. Questions must not imply an affirmative obligation. Explicit
metalinguistic quotes such as `Do not write “TBD”` are excluded. Longer-distance
negation and semantic intent remain unknown. Never reclassify a REQUIREMENT as
a CONSTRAINT based on these rules.

High-level stakeholder goals remain valid obligations. Ask whether deliberate
abstraction is appropriate; do not demand a number, deadline or child requirement
for every finding. Qualitative inspection or demonstration may be sufficient.
No finding changes agreement, admission, lifecycle or verification state.

## Linked context and bounded interpretation

The checker consumes caller-authorized context at the **same actual snapshot**
as the requirement. Supported context is:

1. Explicit reverse links from admitted VERIFICATION records whose `verifies`
   equals this requirement ID: consult `protocol`, with optional `verified_on`
   scope. `result` and `outcome` are not definitions of the criterion.
2. Explicit definition references selected by the caller from a link in the
   eligible text, with exact target revision, field/anchor and visible excerpt.
   A successful link resolution alone is not proof that it supplies a criterion.

Do not traverse parents, descendants, `serves` or `derived_from` for inferred
criteria, crawl URLs, or treat a verification for a different release as applicable.
No implicit inheritance or transitive search is supported. Unqualified release
context can be shown as unqualified; it cannot establish current-release coverage.

For every candidate report `criterion: unknown` by default. When authorized
context is present, qualify it as `context-present` and ask the reviewer to check
the cited protocol/definition before adding another criterion. Never say "no
criterion exists". Optional **explicit reviewer bindings**, stored outside the
model, can associate a candidate's exact field hash/span with a context excerpt
and `criterion-supplied`, `placeholder-resolved` or `intentional-high-level`.
Bindings must carry the reviewer's identity, rationale, context hash and scope.
The checker validates exact hashes and scopes, not semantic adequacy. Valid
bindings remove the redundant candidate from active findings into a visible
`context-resolutions` list, retaining evidence and the binding. Stale, conflicting
or unverifiable bindings leave an active qualified candidate and unknown meaning.
This is distinct from dismissing an advisory without claiming it was resolved.

Unavailable/missing/denied requested context makes coverage partial, even if
lexical evaluation completed. Authorization precedes reads and output creation.
Public result vocabulary collapses missing and denied to `context-unavailable`;
never disclose hidden IDs, paths, snippets, counts, existence or denial reasons.
Emit at most one generic context limitation per visible requirement, independent
of the number of hidden targets. Do not enumerate inaccessible objects to count
them. Unsupported semantic resolution is `unknown`, not failure or success.

## Shared findings and dismissal

UI, CLI and MCP consumers must use the same deterministic normalized result.
The result includes contract/rule-set version, enabled rule IDs and versions,
configuration digest, repository identity, actual snapshot identity (commit plus
overlay content digest when dirty), requested scope, field coverage, safe
limitations, findings and context-resolutions. A base commit alone must never
masquerade as the snapshot of modified working files.

Each finding includes requirement ID, field, exact span and source segments,
matched text, rule/version, advisory question, negation evidence, criterion state,
consulted visible context identities/hashes/excerpts and limitations. Set severity
to `advisory`; emit neither confidence percentages nor replacement prose. Sort by
repository-relative visible source path (UTF-8 byte order), requirement ID,
`name` before `description`, scalar start, scalar end, then rule ID. Stable
ordering is independent of traversal, rendering and transport.

Identity is `sha256` of the UTF-8 JSON array, serialized compactly with literal
Unicode (no ASCII escaping):

```text
["rla-finding-1", repositoryIdentity, requirementId, field,
 ruleId, ruleVersion, decodedFieldSha256, start, end]
```

Hash decoded field UTF-8 bytes without normalization. This content-bound identity
survives YAML wrapping and UI presentation changes, but changes with any decoded
field edit, rule version or occurrence span. Always retain the actual snapshot
and source-file hash separately in the evidence; two repositories cannot share
a dismissal accidentally. Context changes do not silently change this identity.

Dismissal is an explicit authorized reviewer action, recorded outside canonical
source with finding identity, reason, actor, time, source snapshot and consulted
context digest. Its default scope is that exact source snapshot and context
digest only. A different revision, even if field text is equal or later reverted,
requires fresh confirmation; no wildcard, ID-only or rule-wide suppression.
Keep append-only dismissal/revocation events and disclose dismissed counts only
for visible findings. Rendering a finding or accepting a suggestion is not a
dismissal. Re-evaluation preserves source bytes, including quotations and status.

This is a shared logical contract, not a new canonical schema or MCP transport.
The existing consumer owner must bind parser versions, source mapping,
authorization, snapshot and dismissal storage to its existing adapters before
claiming parity. Do not create a competing server. Keep pilot configuration out
of the model schema. Advisory matches never fail admission or CI, contribute to
an aggregate quality score, or alter the six structural metrics. Parser/runtime
failures remain distinct operational errors; they are not advisory findings.

## Reusable illustrations and evaluation

These minimal examples explain the public contract; all are synthetic. They do
not establish adopter benefit or default-on suitability.

| Field text (after YAML decoding) | Expected interpretation |
|---|---|
| `Retention shall be TBD days` | Placeholder at `[19,22)`; ask what resolves it. |
| `The service shall respond as soon as possible` | Timing at `[26,45)`; ask for applicable timing. |
| `The service shall respond quickly` | Evaluative at `[26,33)`; ask which criterion applies. |
| `The interface shall be user-friendly` | Evaluative question; intentional stakeholder abstraction is possible. |
| `The service shall respond within 2 seconds` | No enabled lexical matches; not a verification verdict. |
| ``The parser shall preserve `REQ-TBD-1` `` | No placeholder; code is literal. |
| `The source says “respond quickly”` | No evaluative match in the quotation. |
| `😀 é TBD` | Placeholder at `[5,8)`; emoji is one scalar and combining accent is separate. |

Before recommending defaults, evaluate a versioned corpus across stakeholder,
system and software examples. A corpus manifest records its version, contract
revision/hash, consumed Methodology revision, rule configuration, fixture hashes,
provenance/license, synthetic versus realistic origin, field/language/context
inputs, expected coverage, matches/spans, review-value and false-positive labels.
Use `useful | redundant | intentional | uncertain` review value and
`yes | no | unknown` false-positive labels, with rationale and reviewer identity.
Expected labels are hypotheses until reviewed; do not call seeded positives
independently validated useful findings.

Include positives and negatives for all three rules, boundaries, quotes,
IDs/code, negation, linked criteria, unavailable/denied context, YAML/Markdown
wrapping, Unicode, read-only behavior, stable ordering and normalized consumer
parity. Report per-rule emitted findings, reviewed useful findings, false positives,
missed seeded cases and each denominator. Keep synthetic and realistic strata
separate; report absence of non-protected realistic material honestly. Disable
noisy rules rather than broaden the pilot. Uncertain benefit remains opt-in.

Corpus manifests and results are evaluation inputs, not a canonical model
extension. Keep evaluation working material separate from reusable consumer
illustrations. A handoff pins the contract and corpus bytes with SHA-256 hashes;
any semantic change to matching, exclusions, coordinates or context invalidates
previous acceptance and requires a new version and expected outcomes.
