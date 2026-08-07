# @transitrix/document-view-engine

Parser for **skeleton files** — the Markdown-with-transclusion source format the
document-view engine renders against canon. A skeleton carries structure and
transclusion tags; the engine resolves them and emits a document. No document layout
ships with this package — a layout is authored by whoever needs that document, in
their own repository.

**Scope of this package today: syntax (§2), reference resolution (§3), derived-content
evaluation, render profiles (§4) for `inline`/`each` content, `figure`/`figref`
rendering, the `trace` coverage matrix, `view` rendering for the `blocks`
notation, derivation share (§5), telemetry (§6), and §7 output (print stylesheet, the
print-engine seam, and page-geometry verification).** `parseSkeleton()` turns a skeleton file's text
into a header object and a body AST. `resolveReference()` / `createResolver()`
classify an id against canon into one of the four states below. `createEvaluator()`
resolves `{{ ID.field }}` traversal, `{{# each ... }}` selection, and
`{{ trace ... }}` coverage matrices against canon. `renderDocument()` walks the AST
through an evaluator and emits HTML in the `review` or `clean` profile, including
numbered, bordered `figure` and `view` illustrations, the `figref` references that
point at them, the `trace` matrix as an HTML table, and — in `review` only — the §5
derivation-share and illustrations lines. `view` renders a `blocks` notation
(nested-form) source file as inline SVG at render time (`src/blocks-view.mjs`); any
other notation, or the `blocks` notation's `grid:` (matrix-subset) root, renders as a
missing/failed illustration — those are later slices on this epic. `renderDocument()`
also returns a §6 telemetry snapshot alongside the derivation-share numbers, in the
same single pass. `wrapDocument()` (`src/pdf-layout.mjs`) wraps a rendered `html`
body in a standalone document carrying the §7 print stylesheet — page size, every
`dv-*` class's print colour/border, and the `dv-fit-page` landscape-page rule;
`convertToPdf()` runs it through a **caller-supplied** print engine and verifies the
resulting page geometry (`src/pdf-geometry.mjs`). The engine itself is not bundled:
it is a dependency this repo does not carry today, so it is a parameter — see the
"PDF output" section below.

## Skeleton file shape

```markdown
---
document: design description        # free text; the name its readers use
canon: ../canon                     # root of the model this renders against
profile: neutral                    # reserved; only `neutral` exists today
---

{{# each REQUIREMENT where level = system and kind = functional order by id }}
### {{ .id }} — {{ .title }}

{{ .text }}
{{/ each }}
```

## Syntax

Delimiters `{{ … }}`; `\{{` escapes a literal.

| Form | AST node |
|---|---|
| `{{ REQ-14 }}` | `{ type: 'inline', id, fields: [] }` |
| `{{ REQ-14.text }}` | `{ type: 'inline', id, fields: ['text'] }` |
| `{{ REQ-14.parent.title }}` | `{ type: 'inline', id, fields: ['parent', 'title'] }` — traversal capped at depth 3 |
| `{{# each TYPE where f = v and f2 != v2 order by f }} … {{/ each }}` | `{ type: 'each', entityType, where, orderBy, children }` |
| `{{ .field }}` (inside an `each` body only) | `{ type: 'field-ref', fields }` |
| `{{ trace from = A to = B via = rel }}` | `{ type: 'trace', from, to, via }` |
| `{{ view <path> as = name fit = width\|page\|none }}` | `{ type: 'view', path, as, fit }` — `as`/`fit` optional, `fit` defaults to `width` |
| `{{ figure <path> caption = "..." as = name }}` | `{ type: 'figure', path, caption, as }` — `caption`/`as` optional |
| `{{ figref <name> }}` | `{ type: 'figref', name }` |

`id` is validated against the canonical ID grammar
([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1-2), including the
`CAPABILITY` V/H diagram-address exception. A `where` clause's comparison is `=` / `!=`
against a literal, ANDed only — no other operator is expressible, by design.

## Usage

```js
import { parseSkeleton } from '@transitrix/document-view-engine/src/parse-skeleton.mjs';

const { header, ast, errors } = parseSkeleton(fileText);
if (errors.length > 0) {
  // each entry is { message } — surface all of them, not just the first
}
```

## Reference resolution (§3)

Given the `canon:` path from a skeleton's header, `createResolver()` walks canon once
and returns a bound `resolveReference(id, { renderDate })` — every reference in one
render pass shares the same canon index and migration-manifest load.

```js
import { createResolver } from '@transitrix/document-view-engine/src/resolve-references.mjs';

const { resolveReference } = await createResolver('/path/to/canon');
const { state, flag } = await resolveReference('REQ-014', { renderDate: '2026-08-06' });
```

`state` / `flag` is one of:

| `state` | `flag` | Meaning |
|---|---|---|
| `'ok'` | `null` | Resolves, admitted, in effect. |
| `'unresolved'` | `⚑U` | The id does not exist anywhere in canon. |
| `'not-admitted'` | `⚑A` | The object exists but `admission_state` isn't `active`. |
| `'out-of-validity'` | `⚑V` | `[valid_from, valid_to]` does not cover `renderDate`. |
| `'suspect'` | `⚑S` | Only for a `REL`/`ASSERTION`/`VERIFICATION`/`VALIDATION` record: one of its own endpoints changed since the record last looked at it (CONTRACT.md §16.2's link-suspicion computation, anchored on the record's own last commit — not a per-field anchor). A plain element's own reference fields (e.g. `REQUIREMENT.parent`) never carry `⚑S` directly (CONTRACT.md §16.2). |

An unresolvable endpoint on a `REL`/claim record is silent, not suspicious — the
same posture `scripts/check-link-suspicion.mjs` takes (a validator's concern, e.g.
`REL-002`, not this module's).

## Evaluation and render profiles (§4)

`createEvaluator(canonRoot)` builds on `createResolver()` to resolve the two
derived-content forms `renderDocument()` needs:

```js
import { createEvaluator } from '@transitrix/document-view-engine/src/evaluate.mjs';

const evaluator = await createEvaluator('/path/to/canon');
const { state, flag, content } = await evaluator.evaluateFieldPath('REQ-014', ['parent', 'title'], { renderDate: '2026-08-06' });
```

`evaluateFieldPath(id, fields, opts)` re-runs §3's four-state classification at
every traversal hop — a `parent` that is itself out of validity flags the whole
expression, not just the id nearest the reader. `evaluateEach(node, opts)` selects
every object of `node.entityType` whose §3 state resolves `ok`, applies `where`
(AND-only) and `order by`, and returns the matching ids in order.

`evaluateTrace(node, opts)` builds the full `node.from` × `node.to` coverage matrix
for `{{ trace from = A to = B via = kind }}`, returning `{ rows, cols, covered }` —
every `ok`-state object of each type gets a row/column regardless of coverage, and
`covered` is a `Set` of `"${rowId}|${colId}"` pairs. `via` resolves against either
mechanism canon already has, without the caller saying which: a first-class `REL`
kind ([17-relations.md](../../notations/elements/17-relations.md) §3, matched
against the record's own `type` field, oriented `from` → `to` as the record states),
or a claim record's single named endpoint field (`verifies` / `about` / `validates`,
oriented `endpoints[via]` → the record's own id — the direction the epic's own
example, `from = REQUIREMENT to = VERIFICATION via = verifies`, exercises). A `via`
matching neither produces an all-empty matrix, not an error.

`renderDocument(ast, evaluator, { profile, renderDate, failOn })` walks the AST and
emits HTML:

```js
import { renderDocument } from '@transitrix/document-view-engine/src/render.mjs';

const { html, failed, counts } = await renderDocument(ast, evaluator, { profile: 'review', renderDate: '2026-08-06' });
```

| Profile | Behaviour |
|---|---|
| `review` | Every span is coloured by its §3 state (`dv-ok` / `dv-suspect` / `dv-unresolved`); a non-default class also carries a flag glyph (`⚑S`/`⚑A`/`⚑V`/`⚑U`) as a second channel, never colour alone. |
| `clean` | Everything renders as `dv-clean`, no flags, no counters. `failed` is `true` when a state in `failOn` occurred anywhere in the render (default: `unresolved`, `not-admitted`, `out-of-validity` — `suspect` warns only, per §4). |

`trace` renders as `<table class="dv-trace">` — one `<th>` row/column header per id,
one `<td>` per cell. In `review`, a covered cell is `dv-trace-cell dv-ok` with a
checkmark, an uncovered cell is `dv-trace-cell dv-unresolved` with the `⚑U` flag (the
closest existing §4 class — a coverage gap has no state of its own in §3). In
`clean`, every cell is `dv-clean`, a checkmark or empty, no colour or flag. An
uncovered cell never fails the `clean` profile's build — it marks a coverage gap in
the model, not a broken reference, so it never feeds `failOn`; that check is
`REQ-VERIF-COVERAGE-001` ([15-requirement.md](../../notations/elements/15-requirement.md)
§4), a separate cross-cutting rule.

`figure` / `figref` render for real. Pass `skeletonDir` — the directory containing
the skeleton file — so a `figure`'s (or `view`'s) relative path resolves; an absolute
path is used as-is. Numbers are assigned once, in document order, across every
`figure` **and** `view` node in the AST together (§2 treats them as one shared
"illustration" sequence) — a `figref` may point at either form, later in the
document, and a forward reference still resolves to the right number; inserting a
`figure` or `view` earlier in the skeleton shifts every later number correctly. A
`figure` whose file doesn't exist on disk renders with the `dv-illus-missing` border
class instead of `dv-illus-manual`, and counts as a failing state for `clean`'s
`failOn` the same way an unresolved reference does.

`view` renders the target file as inline SVG when it parses as a `blocks` notation
document in the nested-form (`nested_blocks:` root — not the `grid:` matrix-subset
form, not yet rendered). Each `block.id` in the tree that matches the canonical ID
grammar ([`ids.mjs`](src/ids.mjs)) is checked against canon via
`evaluator.resolveReference()`; a document-local layout label (not canonical-shaped)
is never resolved. Border classes, per §4's illustration provenance rule:

| Class | When |
|---|---|
| `dv-illus-view` (green) | Parses as a `blocks` document; no cross-linked block id is suspect. |
| `dv-illus-suspect` (amber) | Parses; at least one cross-linked block id resolves `suspect` (⚑S flag). |
| `dv-illus-missing` (red) | The file doesn't exist, isn't the `blocks` notation, uses the `grid:` root, or otherwise fails to parse (⚑U flag) — same class `figure` uses for a missing file, and the same failing-state treatment for `clean`'s `failOn`. |

`fit` (`width` / `page` / `none`, §2) is carried through as a `dv-fit-<value>` class
on the wrapping `<figure>` — a hook for the print layout (§7, not built yet), not yet
acted on by this module.

## Derivation share (§5)

`renderDocument()` accumulates §5's word counts in the same render pass as
everything above — no extra AST walk. A `text` node's content counts toward
`manualWords`, minus its own structural lines (an ATX heading, a markdown table
row — `src/derivation-share.mjs`'s own concern; a `figure`/`view` caption is never
part of a `text` node's content in the first place, so it's excluded by
construction). An `inline`/`field-ref` node's resolved content counts toward
`derivedWords`, regardless of its §3 state — an unresolved reference's `null`
content simply counts zero words. Illustrations are **never folded into the word
ratio** (§5: "a diagram is not worth some number of words") — counted on their own
line instead: `total` is every `figure`/`view` node in the document, `fromModel` is
only the `view`s that actually rendered SVG from their source (a `figure` is manual
by definition and never counts toward it).

```js
const { html, derivationShare, illustrations } = await renderDocument(ast, evaluator, { profile: 'review' });
// derivationShare → { derivedWords, manualWords }
// illustrations   → { fromModel, total }
```

Both are always returned, in either profile, for a caller that wants the numbers
without the printed line. The printed lines themselves — `<div class="dv-derivation-share">Derivation share: NN% (X of Y words)</div>` and
`<div class="dv-illustrations">Illustrations — N of M rendered from the model</div>`
— are appended to the rendered HTML **in `review` only**; `clean` prints no
counters (§4). An empty document (no counted content at all) prints `n/a` rather
than a `0%` that would misleadingly claim a share.

## Telemetry (§6)

`renderDocument()` also returns a `telemetry` snapshot (`src/telemetry.mjs`), built in
the same single pass, of exactly what §6 asks for and nothing else: "which types,
fields, relation kinds and matrix pairs were referenced and how often; counts of each
failure state" — never section titles, heading text, prose, file names, or skeleton
ordering, since any of those could be replayed back into a document's shape.

```js
const { telemetry } = await renderDocument(ast, evaluator, { profile: 'review' });
// telemetry → {
//   types:         { [TYPE]: count },              -- every inline/field-ref/each/trace type reference
//   fields:        { ['TYPE.field(.field...)']: count },  -- every inline/field-ref field path, under its type
//   relations:     { [via]: count },                -- every trace node's relation kind
//   matrixPairs:   { ['from|to|via']: count },       -- every trace node's from/to/via triple
//   failureStates: { [state]: count },              -- every §3 state other than 'ok', across the whole render
// }
```

An `inline`/`field-ref`'s type comes from `evaluate.mjs`'s `typeOfId()` on the id it
resolved against, not from the skeleton text itself. A failure state is recorded at
every point this module already tracks one for the `clean` profile's `failOn` —
inline, field-ref, `figure`, `view`, and `figref` alike — so the tally covers the
whole render, not only spans. `telemetry` is always returned, identically, regardless
of `profile`; only the printed HTML differs between `review` and `clean`.

## PDF output (§7)

Three pieces, in the order the output actually happens: **declare** the page geometry,
**convert** through a print engine, **verify** the geometry of what came back.

### Declare — `src/pdf-layout.mjs`

`wrapDocument(bodyHtml, { title })` wraps a `renderDocument()` body in a standalone
`<html>` document carrying `buildStylesheet()`'s CSS: `@page { size: A4; margin:
20mm; }` for the default portrait page, a named `@page landscape { size: A4 landscape;
margin: 15mm; }` for a `dv-fit-page` illustration, and the print colour/border for
every `dv-*` class `render.mjs` emits (§4's state colours, the four illustration
border classes, the `dv-trace` table).

### Convert — the engine is a parameter, not a dependency

This package bundles no print engine. Turning HTML into PDF bytes needs a headless
rendering engine, which is a dependency it does not carry today (`"dependencies": {}`
— see `package.json`); which engine to adopt is an open architecture question, filed
separately rather than decided inside this slice. So the engine is supplied by the
caller:

```js
import { convertToPdf } from '@transitrix/document-view-engine/src/pdf-layout.mjs';

const { pdf, geometry } = await convertToPdf(html, {
  title: 'Design Description',
  convert: (doc) => myPrintEngine.render(doc),   // HTML in, PDF bytes out
});
```

Everything around the engine — wrap, convert, verify — is implemented and tested here,
so adopting an engine later is supplying one function rather than writing this half.

### Verify — `src/pdf-geometry.mjs`

`verifyPageGeometry(pdfBytes)` reads every page's `/MediaBox` (honouring `/Rotate` and
page-tree inheritance) and checks it is A4 in one of the two declared orientations —
595 × 842 pt portrait, 842 × 595 pt landscape, ±1 pt. `convertToPdf` runs it by default
and **throws** on a mismatch.

The check is the point of §7, not decoration: an engine that ignores `@page { size:
A4 }` falls back to its own default paper — 612 × 792 pt, US Letter — and produces a
plausible-looking PDF whose last centimetres spill onto a second page every time. That
case is reported by name ("US Letter — the page-size declaration was ignored"), not as
a bare size mismatch. A PDF whose page objects cannot be read at all (compressed object
streams) is also a failure, never a vacuous pass: an unverifiable page size is not a
verified one.

```js
import { verifyPageGeometry } from '@transitrix/document-view-engine/src/pdf-geometry.mjs';

const { ok, pages, problems } = verifyPageGeometry(pdfBytes);
```

## Tests

```
node packages/document-view-engine/tests/test_parse_skeleton.mjs
node packages/document-view-engine/tests/test_resolve_references.mjs
node packages/document-view-engine/tests/test_evaluate.mjs
node packages/document-view-engine/tests/test_blocks_view.mjs
node packages/document-view-engine/tests/test_render.mjs
node packages/document-view-engine/tests/test_derivation_share.mjs
node packages/document-view-engine/tests/test_telemetry.mjs
node packages/document-view-engine/tests/test_pdf_layout.mjs
node packages/document-view-engine/tests/test_pdf_geometry.mjs
```
