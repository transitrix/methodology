---
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-08-07"
status: "draft"
---

# Directive language — normative reference

**Version:** 0.1
**Date:** 2026-08-07
**Status:** Draft — the single normative definition of the `{{ … }}` directive
language shared by every document source in this class.
**Applies to:** `.ttrs` document templates and document-view skeleton files.

---

## 0. What this document is, and what it is not

This is **not a notation spec.** It defines no file schema, claims no
`notation:` value, and registers nothing. It deliberately carries no top-level
`notation:` header — a file in this folder without one is not a view spec and is
not counted as one ([`check-notations.mjs`](../../../scripts/check-notations.mjs),
check `C1`). That absence is the point being made, not an omission.

What it defines is the **directive language**: the `{{ … }}` constructs that
appear inside a document source. One language, defined once, here.

Two implementations of that one language ship today —
[`@transitrix/document-renderer`](../../../packages/document-renderer/README.md)
(`.ttrs` templates, pass 1) and
[`@transitrix/document-view-engine`](../../../packages/document-view-engine/README.md)
(skeleton files, render profiles). **Two implementations of one notation is
deliberate policy. Two specifications of one notation is drift** — the same
drift the closed-vocabulary work was written against. Hence one spec, and a
standing obligation on each implementation, §7.

---

## 1. Document *kinds* are not notations

**A document view is a kind, never a notation of its own.**

`MRD`, `SRS`, `SDD` and `SDS` name **kinds**. A kind is the middle segment of a
document source's filename:

    <basename>.<kind>.ttrs         e.g.  product.mrd.ttrs
                                         platform.srs.ttrs
                                         gateway.sdd.ttrs

They are layouts over canon — a presentation surface, carrying no canonical
content of their own. They are not members of the notation registry in that
capacity, they do not each get a directive language of their own, and a new kind
never means a new language.

Stated plainly because the opposite reading is the available mistake: seeing
[`29-mrd.md`](29-mrd.md), [`30-srs.md`](30-srs.md) and [`31-sdd.md`](31-sdd.md)
sitting in this folder, one could conclude each defines a notation with its own
syntax. It does not. Each defines a **layout** — which elements a document of
that kind selects and how they are arranged. The syntax they are written in is
this document's, shared and identical across all of them.

**No registry surgery follows from this.** [`CONTRACT.md`](../../CONTRACT.md) §3
(extension / content match) and the `E1` extension-and-parent-folder check are
unaffected and unchanged. Those specs that do carry a `notation:` value keep it
and stay counted; this document simply states what was already true.

---

## 2. Lexical rules

Delimiters are `{{` and `}}`. Everything outside a directive is **fixed text**,
copied through verbatim.

| Rule | Definition |
|---|---|
| Escape | `\{{` renders a literal `{{`. **It is the only escape in the language.** There is no `\}}`; a `}}` outside a directive is ordinary text. |
| Whitespace | Insignificant immediately inside the delimiters: `{{REQ-14}}` and `{{ REQ-14 }}` are the same directive. |
| Nesting | **No directive nests inside another**, with the single exception of the block forms in §4, which contain fixed text and directives as their body. |

### 2.1 Identifiers

An `id` is validated against the canonical ID grammar
([`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §1):

    <TYPE>-[<middle>-]<INTEGER>            REQ-14, CAP-1, BUSINESS_SERVICE-3

**The `CAPABILITY` exception is part of this language, not just of the ID
grammar.** A capability id embeds a V/H diagram address whose dots are part of
the id ([`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §2):

    CAPABILITY-V<L1[.L2[.L3]]>
    CAPABILITY-H<L1[.L2[.L3]]>

A conforming parser **must** split the capability prefix off *before* reading a
field path, or it will read `CAPABILITY-V1.2.3` as the id `CAPABILITY-V1` with
the field path `2.3`. This is the pitfall a naive grammar gets wrong, and it is
normative:

| Directive | id | field path |
|---|---|---|
| `{{ CAPABILITY-V1.2.3 }}` | `CAPABILITY-V1.2.3` | — |
| `{{ CAPABILITY-V1.2.3.name }}` | `CAPABILITY-V1.2.3` | `name` |
| `{{ REQ-14.parent.title }}` | `REQ-14` | `parent.title` |

---

## 3. Inline constructs

### 3.1 Inline reference

    {{ <id> }}

Substitutes the named object's display value. With no field path, an
implementation resolves the first field the object carries from its own
documented default order.

### 3.2 Field path

    {{ <id>.<field>[.<field>[.<field>]] }}

Substitutes one field of the named object. A middle segment must itself name
another object, which the resolver walks into.

**Traversal is capped at depth 3.** A path of four or more segments is a
failure, not a deeper walk. The cap is a language rule, not an implementation
budget: a document that walks arbitrarily far into the model stops being a
document and becomes a query.

### 3.3 Row reference

    {{ .<field> }}

A field of the current row of the enclosing `each` block (§4.1). **Meaningful
only inside one** — outside any `each`, there is nothing for it to resolve
against, and it is a failure.

### 3.4 Trace

    {{ trace from = <TYPE> to = <TYPE> via = <relation> }}

Renders the trace coverage between two element types along one relation. All
three attributes are required.

### 3.5 Figures

| Form | Meaning |
|---|---|
| `{{ view <path> [as = <name>] [fit = width\|page\|none] }}` | **Derived** figure — a view authored in an existing view notation, rendered from the model. `fit` defaults to `width`. |
| `{{ figure <path> [caption = "…"] [as = <name>] }}` | **Supplied** figure — an asset embedded as-is. Never generated. |
| `{{ figref <name> }}` | Cross-reference to a figure declared earlier in the same document, by its `as` name. |

Figures are numbered in document order. A `figref` naming no figure declared
earlier in the document is a failure — forward references are not resolved.

---

## 4. Block constructs

A block form opens with `{{# … }}` and closes with `{{/ … }}`. **There are
exactly two.**

### 4.1 `each`

    {{# each <TYPE> [where <clause> [and <clause>]…] [order by <field>] }}
      … body …
    {{/ each }}

Repeats its body once per selected element, binding each in turn as the current
row for `{{ .field }}` (§3.3).

The `where` clause is deliberately small, and the limits are normative rather
than incidental:

| Rule | Definition |
|---|---|
| Combination | **`and` only.** There is no `or`, and no parentheses. |
| Operators | **`=` and `!=` only.** No ordering comparisons, no pattern matching, no membership. |
| Right-hand side | **A literal only.** Never another field, never a nested directive. |

A document template is not a query language, and the ceiling is set here on
purpose: everything expressible in `where` is answerable by one pass over the
element index, with no join planning and no evaluation order to reason about.

`order by` takes a single field and is what makes a rendered document
reproducible — without it, row order would follow the index's own order, which
is not a guarantee any document should rest on.

### 4.2 `instruct`

    {{# instruct <slot-id> }}
    question: …
    inputs: …
    sufficient: …
    {{/ instruct }}

An **instruction slot** — a section a deterministic pass cannot fill, carrying
the instruction for whatever later pass does. `question:` and `sufficient:` are
required; `inputs:` is optional and comma-separated.

**A slot's body is opaque.** A parser scans from `{{# instruct … }}` straight to
the matching `{{/ instruct }}` and keeps everything between as raw text. A
`{{ REQ-14 }}` written inside a slot is **instruction prose, not a reference** —
it is never resolved and never becomes a node of its own. This is the second
rule a naive grammar gets wrong, and it is normative.

A `<slot-id>` is lower-case letters, digits and hyphens, and **must be unique
within a document** — it names that section wherever slots are recorded.

---

## 5. Reference states

Resolving a reference yields exactly one state. Three concern canon; the fourth
concerns configuration.

| State | Flag | Meaning |
|---|---|---|
| ok | — | resolved, admitted, and inside its validity interval |
| unresolved | `⚑U` | no object with that id exists |
| not admitted | `⚑A` | the object exists, but its admission state is not active |
| out of validity | `⚑V` | its `[valid_from, valid_to]` interval does not cover the render date |
| no repository configured | — | the document cites canon, and none is configured |

They are classified in that order: existence, then admission, then validity.

**The states are kept distinct on purpose.** "You have no repository" and "your
repository lacks this id" are different problems with different fixes, and
folding the first into the second hides it.

**The worst defect is not a missing reference.** It is a reference that resolves
and renders as plainly correct text when the object behind it was never admitted
or has stopped being valid — a reader has no way to see it. A non-ok state
therefore never renders as its bare value.

### 5.1 Suspicion (`⚑S`) — reported as not computed

Link suspicion is **not** part of this language's MVP. Three standing reasons,
none of them a schedule:

1. It is out of scope by the rendered-documents decision.
2. It is **computed from commit history**, not read from a file — a different
   class of input from everything else here.
3. [`CONTRACT.md`](../../CONTRACT.md) §16.2 scopes it to `REL` and claim
   records, not to the element references a document cites.

**It must nonetheless be reported as "not computed", never simply omitted.** A
clean render and a render that never checked must not look alike. An
implementation that silently leaves suspicion out of its output is
non-conforming even when every other state is right.

---

## 6. Failure discipline

| Requirement | Rule |
|---|---|
| Never silent | Every construct a document contains is either rendered or reported. Nothing is dropped. |
| Never blank | A reference that does not render its value leaves a visible marker, not an empty string. |
| Named by kind | Unknown or malformed syntax and **recognised-but-not-implemented** are different failures and must carry different codes. |

The third row is the one that is easy to get wrong. A construct defined in this
document but not implemented by the package reading it **fails by name —
"recognised, not implemented in this pass"** — and never in the same bucket as a
typo. Reporting a valid template as malformed syntax sends its author looking
for a mistake they did not make.

---

## 7. What each implementation must state

This language is defined once, here. **An implementation admits a subset of it.**

Every package that reads a document source **must state, in its own README:**

1. **What it admits** — the constructs of this document it implements.
2. **What it defers** — the constructs it recognises and declines, and under
   which failure code.

Stating both is what keeps one language with two implementations from becoming
two languages. A package that documents only what it supports leaves an author
unable to tell "not in the language" from "not in this package" — and that
ambiguity is where a second, accidental specification starts.

---

## 8. References

- Extension / content match, and the date format: [`CONTRACT.md`](../../CONTRACT.md) §3, §4.
- Link suspicion, content identity, and the mechanical-procedure hatch: [`CONTRACT.md`](../../CONTRACT.md) §16.
- ID grammar and the `CAPABILITY` V/H exception: [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §1-2.
- Document kinds shipped today: [`29-mrd.md`](29-mrd.md), [`30-srs.md`](30-srs.md), [`31-sdd.md`](31-sdd.md).
- `.ttrs` templates and pass 1: [`@transitrix/document-renderer`](../../../packages/document-renderer/README.md).
- Skeleton files, evaluation and render profiles: [`@transitrix/document-view-engine`](../../../packages/document-view-engine/README.md).
- This class's index: [`README.md`](README.md).
