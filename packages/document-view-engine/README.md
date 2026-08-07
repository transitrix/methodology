# @transitrix/document-view-engine

Parser for **skeleton files** — the Markdown-with-transclusion source format the
document-view engine renders against canon. A skeleton carries structure and
transclusion tags; the engine resolves them and emits a document. No document layout
ships with this package — a layout is authored by whoever needs that document, in
their own repository.

**Scope of this package today: syntax (§2) and reference resolution (§3).**
`parseSkeleton()` turns a skeleton file's text into a header object and a body AST.
`resolveReference()` / `createResolver()` classify an id against canon into one of
the four states below. Neither renders — render profiles (§4), derivation share
(§5), telemetry (§6), and PDF output (§7) are later layers built on top of these.

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

## Tests

```
node packages/document-view-engine/tests/test_parse_skeleton.mjs
node packages/document-view-engine/tests/test_resolve_references.mjs
```
