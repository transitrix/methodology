# @transitrix/document-renderer

**The reference implementation of the `{{ … }}` directive language** — parser for
the `.ttrs` document-template format and its pass 1 deterministic resolver,
which runs and is testable with no agent present.

## This is a reference implementation, not a product

Its job is to make
[`DIRECTIVE_LANGUAGE.md`](../../notations/views/documents/DIRECTIVE_LANGUAGE.md)
**checkable** — a specification with nothing executable behind it drifts from
what anyone actually builds. What this repository ships as a deliverable is the
**format**; the rendering engine an adopter runs is delivery work, built against
that spec rather than shipped from here.

Two things follow, and both are deliberate:

- **The spec outranks this code.** Where the two disagree, the specification is
  right and this package has a bug. Nothing here is normative by virtue of
  working; a behaviour not written down in `DIRECTIVE_LANGUAGE.md` is not a
  behaviour anyone else is obliged to reproduce.
- **The conformance fixture is the contract's test surface.**
  [`tests/fixtures/product.mrd.expected.md`](tests/fixtures/product.mrd.expected.md)
  is the frozen output of [`tests/fixtures/product.mrd.ttrs`](tests/fixtures/product.mrd.ttrs)
  — the thing an independent implementation diffs its own output against. See
  [Conformance fixture](#conformance-fixture).

Pass 1 ships as a unit callable on its own, so pass 2 (instruction slots) and
Studio's preview can both depend on it as a library rather than on the whole
renderer.

**This package owns the notation's parser and resolver.** One notation, one parser:
[`@transitrix/document-view-engine`](../document-view-engine/) implements a different
subset of the same directive language and depends on this package for the shared
grammar rather than keeping its own copy — the canonical ID grammar
([`src/ids.mjs`](src/ids.mjs)) and the syntax primitives front matter, header scalars,
header field reading and the id/field-path split ([`src/syntax.mjs`](src/syntax.mjs)).
Changing either file changes both packages; both packages' tests are the check.

**Two invariants, stated outright:**

- **It writes nothing into the model.** Every filesystem touch here is a read.
- **It is re-run-stable.** Given unchanged inputs the Markdown is byte-identical —
  no timestamps, no filesystem-order dependence, no counters that reset. The
  render date is one of those inputs: pin `renderDate` to keep runs on different
  days identical.

## What this package admits, and what it defers

The `{{ … }}` directive language is defined **once**, normatively, in
[`notations/views/documents/DIRECTIVE_LANGUAGE.md`](../../notations/views/documents/DIRECTIVE_LANGUAGE.md).
This package implements a subset of it. Both halves are stated here because
stating only the first leaves an author unable to tell "not in the language"
from "not in this package".

| Construct | This package |
|---|---|
| Fixed text, `\{{` escape | **admits** |
| Inline reference `{{ REQ-14 }}` | **admits** |
| Field path `{{ REQ-14.parent.title }}` (depth 3) | **admits** |
| `{{ view … }}` / `{{ figure … }}` / `{{ figref … }}` | **admits** — resolved and numbered; rasterising is the output layer's, via the `rasterise` hook |
| `{{# instruct … }} … {{/ instruct }}` | **admits** — parsed and copied through; filling one is pass 2's |
| `{{# each … }} … {{/ each }}` | **defers** — `TTRS-004` |
| `{{ trace … }}` | **defers** — `TTRS-004` |
| `{{ .field }}` (row reference) | **defers** — `TTRS-004`, it belongs to `each` |
| `⚑S` link suspicion | **not computed** — reported as such, never omitted |

A deferred construct is **recognised, not implemented in this pass**. It fails by
that name under its own code and is never reported as unknown syntax
(`TTRS-002`) — telling an author their valid template is a typo sends them
looking for a mistake they did not make.

Document kinds — `mrd`, `srs`, `sdd`, `sds` — are **kinds, not notations**
(`DIRECTIVE_LANGUAGE.md` §1). The kind is the middle segment of the filename.

## File naming

    <basename>.<kind>.ttrs        e.g. product.mrd.ttrs

The middle segment is the document kind, so the existing extension/parent-folder
lint applies to it unchanged. `.ttrs` replaces `*.<short-name>.transitrix.yaml`
in full for this artefact class — it is not appended to it
([`CONTRACT.md` §3](../../notations/CONTRACT.md)).

`.trs` is one keystroke away and is a different, widely used format. A file
ending `.trs` where a document source is expected is reported as that near-miss
by name, not as an unknown-file error — in `scripts/check-notations.mjs` (check
`T1`) and here (`TTRS-013`).

## Header

YAML front matter. Four required fields, one optional:

```yaml
---
document: Market Requirements Document   # required — the name its readers use
kind: mrd                                # required — matches the filename's middle segment
template_id: product.mrd                 # required — named in the run record
template_version: "1.0"                  # required — named in the run record
canon: ../canon                          # OPTIONAL — the repository
---
```

**`canon:` is deliberately optional — the repository is an optional input.** A
template naming no model object and no derived figure renders standalone, with no
repository configured at all. That is a legitimate input, not a degraded one.

## Slot kinds

Delimiters `{{ … }}`; `\{{` escapes a literal `{{`. That is the only escape.

| Kind | Form | AST node |
|---|---|---|
| Fixed text | anything outside `{{ … }}` | `{ type: 'text', value }` |
| Model-object reference | `{{ REQ-14 }}` | `{ type: 'reference', id, fields: [] }` |
| | `{{ REQ-14.text }}` | `{ type: 'reference', id, fields: ['text'] }` |
| | `{{ REQ-14.parent.title }}` | traversal capped at depth 3 |
| Figure — derived | `{{ view <path> as = name fit = width\|page\|none }}` | `{ type: 'view', path, as, fit }` — `fit` defaults to `width` |
| Figure — supplied | `{{ figure <path> caption = "…" as = name }}` | `{ type: 'figure', path, caption, as }` |
| Figure — reference | `{{ figref <name> }}` | `{ type: 'figref', name }` |
| Instruction slot | `{{# instruct <slot-id> }} … {{/ instruct }}` | `{ type: 'instruct', slotId, question, inputs, sufficient, raw }` |

**No slot kind nests inside another.** A model-object reference, a figure and a
figref are each a single `{{ … }}` on one line and contain nothing but their own
argument. An instruction slot is the one block form, and **its body is opaque**:
the parser scans straight from `{{# instruct … }}` to the matching
`{{/ instruct }}` and keeps everything between as raw text. A `{{ REQ-14 }}`
written inside a slot is instruction prose, not a reference — it is never
resolved, and never becomes its own node.

`id` is validated against the canonical ID grammar
([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1-2),
including the `CAPABILITY` V/H diagram-address exception — so `CAPABILITY-V1.2.3`
keeps its own dots rather than having them read as a field path.

### The instruction slot body

Three keys, one per line. `question:` and `sufficient:` are required, `inputs:`
is optional and comma-separated:

```
{{# instruct market-size }}
question: How large is the addressable market, and how fast is it growing?
inputs: CAP-1, REQ-14
sufficient: A market size with a currency and a year, a growth rate, and the method for both.
{{/ instruct }}
```

The slot id names that section in the run record, so **two slots may not share
one** (`TTRS-003`).

## What pass 1 does with each kind

| Kind | Pass 1 |
|---|---|
| Fixed text | copied verbatim |
| Model-object reference | resolved against the repository |
| Figure — derived | source resolved and numbered; rasterising is the output layer's job, reached through the `rasterise` hook |
| Figure — supplied | resolved and numbered; never generated |
| Instruction slot | **left untouched** — copied through byte-for-byte, so the unfilled section is visible in the output and pass 2 finds it by the same syntax that put it there |

## Usage

```js
import { runPass1 } from '@transitrix/document-renderer/src/pass1.mjs';

const {
  ok, markdown, instructionSlots, figures, errors,
  findings, states, suspicion,        // the four computed states, and why ⚑S is not
} = await runPass1({
  text,                       // template source
  templatePath,               // enables the filename/`kind:` check; bases figure paths
  // repositoryRoot,          // optional override; omitted, the header's `canon:` is used,
                              // resolved relative to the template. Pass null to force
                              // the no-repository case.
  // rasterise,               // optional hook: ({kind, source, name, number, fit}) => embedPath
  // profile: 'strict',       // 'strict' (default) | 'review'
  // renderDate: '2026-08-07',// validity is resolved at this date; defaults to today
});
```

`findings` lists every non-ok reference state in document order — `{ code, state,
flag, id, file }` — whatever the profile. `states` counts them by state.

`instructionSlots` lists every slot in the template, in document order, each with
its full instruction — that is what the run record names.

The parser is available on its own when only syntax is wanted:

```js
import { parseTemplate } from '@transitrix/document-renderer/src/parse-template.mjs';

const { header, ast, errors } = parseTemplate(text);
```

## Failure discipline

An unresolvable reference **fails the run by name**. It never renders as empty
text — the output carries a `«unresolved: …»` marker where it stood, and the run
has already failed by the time anyone reads it.

| Code | Meaning |
|---|---|
| `TTRS-001` | header: missing or malformed required field, or no front matter |
| `TTRS-002` | syntax: **unknown** directive, malformed reference, unclosed slot, bad slot id, missing `question:`/`sufficient:` |
| `TTRS-003` | two instruction slots share one id |
| `TTRS-004` | **recognised, not implemented in this pass** — `each`, `trace`, `{{ .field }}` |
| `TTRS-010` | a model-object reference does not resolve — no such id, or no such field path (`⚑U`) |
| `TTRS-011` | the template references a model object or derived figure, but **no repository is configured** |
| `TTRS-012` | a figure source does not exist, or a `figref` names no declared figure |
| `TTRS-013` | the filename is not `<basename>.<kind>.ttrs`, or its kind disagrees with the header |
| `TTRS-014` | the object exists but is **not admitted** (`⚑A`) |
| `TTRS-015` | the object is **out of validity** at the render date (`⚑V`) |

**`TTRS-004` is deliberately distinct from `TTRS-002`.** A construct this pass
recognises and declines is not a typo, and must not be reported as one.

**`TTRS-011` is deliberately distinct from `TTRS-010`.** "You have no repository
configured" and "your repository does not contain this id" are different problems
with different fixes, and folding the first into the second would hide it.

Deleting an element the document cites produces `TTRS-010`, not a silent gap.

## The five reference states

The language names **five** non-ok states
([`DIRECTIVE_LANGUAGE.md`](../../notations/views/documents/DIRECTIVE_LANGUAGE.md) §5).
This package computes four of them and reports the fifth as *not computed* —
the one carve-out the language permits, and only because it reports the decline
rather than staying silent about it. No two states are ever merged.

The three canon-side ones are `@transitrix/document-view-engine`'s own
(`⚑U` / `⚑A` / `⚑V`), reused rather than re-invented — one language must not
grow two classifications of the same failure. The fourth is about configuration,
not canon.

| State | Flag | Code | This package |
|---|---|---|---|
| `unresolved` | `⚑U` | `TTRS-010` | computed |
| `not-admitted` | `⚑A` | `TTRS-014` | computed |
| `out-of-validity` | `⚑V` | `TTRS-015` | computed |
| `no-repository` | — | `TTRS-011` | computed |
| `suspect` | `⚑S` | — | **not computed** — reported as such |

**The worst defect is not a missing reference** — it is one that resolves and
renders as plainly correct text when the object behind it was never admitted or
has stopped being valid. So a non-ok state never renders as its bare value.

### Profiles

The language requires a strict and a lenient profile, both selectable, with the
lenient one detecting exactly what the strict one fails on
([`DIRECTIVE_LANGUAGE.md`](../../notations/views/documents/DIRECTIVE_LANGUAGE.md) §6).
This package's pair:

| Profile | Role | Behaviour |
|---|---|---|
| `strict` *(default)* | strict | **fails on all four computed states**, naming the file, the id and the state |
| `review` | lenient | renders each flagged value and reports every state in `findings`, without failing |

These correspond to `@transitrix/document-view-engine`'s `clean` / `review`
pair. `review` reports exactly what `strict` fails on — the profiles differ in
consequence, never in what they detect. Every result carries the `profile` it
ran under, so a rendered document can be traced to which was used.

### Suspicion is reported as *not computed*

`⚑S` link suspicion is not computed by pass 1 — out of scope by the
rendered-documents decision, derived from commit history rather than read from a
file, and scoped by [`CONTRACT.md`](../../notations/CONTRACT.md) §16.2 to `REL`
and claim records rather than the element references a template cites.

Declining to compute it is permitted; **being silent about declining is not.**
The language requires three distinguishable outcomes, not two — *suspect*,
*checked and clean*, and *never checked*
([`DIRECTIVE_LANGUAGE.md`](../../notations/views/documents/DIRECTIVE_LANGUAGE.md) §5.1).
Every result therefore carries a `suspicion` field stating which, with its
reason:

```js
{ computed: false, state: 'not-computed', reason: '…' }
```

**It is never simply omitted.** A clean render must be distinguishable from one
that never checked — that is the one failure mode which reads as success.

## Tests

```
node packages/document-renderer/tests/test_parse_template.mjs
node packages/document-renderer/tests/test_pass1.mjs
node packages/document-renderer/tests/test_conformance.mjs
```

`tests/fixtures/product.mrd.ttrs` is a complete worked template — every slot kind,
one instruction slot — rendered end-to-end against `tests/fixtures/canon/` by the
pass-1 suite.

## Conformance fixture

`tests/fixtures/product.mrd.expected.md` is that template's rendered output,
**generated once and committed as a frozen target**. It is the artefact an
independent implementation of the language diffs its own output against, which
is what makes the specification checkable rather than merely written down.

`tests/test_conformance.mjs` asserts the current render matches it **byte for
byte**, and additionally checks the requirements a second implementation is most
likely to miss — the suspicion report, the profile naming, and that the lenient
profile detects exactly what the strict one fails on.

**It never regenerates the fixture, and must not be made to.** A golden file
that rewrites itself records whatever the code does today and can therefore
never catch a regression — the auto-update convenience is precisely the thing
this fixture exists to refuse. A failure is one of two things:

| | What it means | What to do |
|---|---|---|
| **Regression** | pass 1 stopped producing the specified output | fix the code; leave the fixture alone |
| **Deliberate change** | the specified output changed on purpose in `DIRECTIVE_LANGUAGE.md` | re-freeze the fixture in its **own** commit, naming the spec change it follows, so a reviewer sees the output diff |

If you cannot say which you are in, you are in the first.

Determinism is pinned on both sides: the test passes an explicit `renderDate`
(the render date is an input to validity resolution), and
`tests/fixtures/.gitattributes` pins line endings to LF — pass 1 copies fixed
text through verbatim, so a CRLF checkout would render CRLF and the byte
comparison would hold on one platform only.

## Scope

Pass 1 only. Filling instruction slots, emitting the run record, and PDF output
are not in this package. Nothing here calls a model, and nothing here may —
rendering happens in the CLI, never the agent.

`{{# instruct … }}` stays in the grammar and in the specification — a notation
expresses the slot; who fills it is an implementation's property — but nothing
here executes one. Pass 1 copies each slot through byte-for-byte so the unfilled
section is visible in the output rather than silently blank.
