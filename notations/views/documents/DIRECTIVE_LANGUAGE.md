---
version: "1.0"
author: "Valerii Korobeinikov"
last_updated: "2026-08-25"
status: "stable"
---

# Directive language — normative conformance document

**Version:** 1.0
**Date:** 2026-08-25
**Status:** Stable — the single normative definition of the `{{ … }}` directive
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

### 0.1 It states requirements on an implementation, not on ours

**This document is a conformance contract.** It is written to be built against
by someone who has never read this repository's code. Where it says *must*, it
constrains **any** implementation of this language; nothing here describes what
one particular parser happens to do today, and a reader should never need
`pass1.mjs` open to know what conformance requires.

That framing is the whole point, and it is recent. While the rendering engine
was ours, a great deal could be settled in code and never written down. The
moment someone else writes the engine, each of those settled-in-code details
becomes a conformance contract. **A format with an unspecified failure
discipline is a format every adopter implements differently** — and in a year
`.ttrs` means different things to different people. So the failure discipline
(§7), the reference states (§5) and the profile split (§6) are stated here as
requirements, not left to be inferred.

**A conformant implementation** is one that admits some subset of the constructs
in §§2–4 and, for everything it admits, obeys §§5–7 in full. Admitting a subset
is expected and legitimate (§8); getting §§5–7 wrong for what you do admit is
not.

### 0.2 The reference implementation

[`@transitrix/document-renderer`](../../../packages/document-renderer/README.md)'s
pass 1 is the **reference implementation** of this document — it exists to make
the spec checkable, not as a product feature. Its committed conformance fixture
(`tests/fixtures/product.mrd.ttrs` and the frozen
`tests/fixtures/product.mrd.expected.md` beside it) is the output an independent
implementation diffs against. Where this document and that implementation
disagree, **this document wins** and the implementation has a bug.

Two implementations of the language ship in this repository today — the
reference one above, and
[`@transitrix/document-view-engine`](../../../packages/document-view-engine/README.md)
(skeleton files, render profiles). **Two implementations of one notation is
deliberate policy. Two specifications of one notation is drift** — the same
drift the closed-vocabulary work was written against. Hence one spec, and a
standing obligation on each implementation, §8.

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

**Which supplied pictures are legitimate.** A `figure` is a photograph, a
screenshot of third-party software, or a scan. A picture of model content is
a `view`, never a pre-exported raster placed as a `figure`.

Figures are numbered in document order. A `figref` naming no figure declared
earlier in the document is a failure — forward references are not resolved.

Page size, orientation, and what to do when a view does not fit are in
[`guides/how-a-document-prints.md`](../../../guides/how-a-document-prints.md)
— this section does not restate them.

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

Resolving a reference yields exactly one state. **The language names five non-ok
states** — three concern canon, one concerns provenance, one concerns
configuration.

A conformant implementation **must keep every state it reports distinct from
every other**; it may never merge two into one. Exactly two carve-outs exist,
both narrow and both stated below: `⚑S` may be declined so long as the decline
is reported (§5.1), and `no repository configured` cannot arise for a source
whose repository is mandatory. Neither is licence to fold a state into its
neighbour.

| State | Flag | Meaning |
|---|---|---|
| ok | — | resolved, admitted, and inside its validity interval |
| unresolved | `⚑U` | no object with that id exists |
| not admitted | `⚑A` | the object exists, but its admission state is not active |
| out of validity | `⚑V` | its `[valid_from, valid_to]` interval does not cover the render date |
| suspect | `⚑S` | the object resolves, but the link to it is under suspicion (§5.1) |
| no repository configured | — | the document cites canon, and none is configured |

The canon-side three are classified in that order: existence, then admission,
then validity. `⚑S` is orthogonal — it qualifies a reference that has already
resolved, and is defined not here but by
[`CONTRACT.md`](../../CONTRACT.md) §16, which this document **cites rather than
restates**. There is one definition of suspicion, and it is not this one.

**Collapsing any two of these is non-conformance, not a simplification.** "You
have no repository" and "your repository lacks this id" are different problems
with different fixes, and folding the first into the second hides it. The same
holds for every other pair: each state names a different thing for its reader to
go and do.

**The no-repository state is reachable only where the repository is optional.**
In `.ttrs` it is: the header's `canon:` may be absent, and a template naming no
model object and no derived figure renders standalone — a legitimate input, not
a degraded one. The document-view engine's skeleton format requires its
repository, so the state cannot arise there and an implementation of that format
alone need not produce it. It is listed here because the language is one, and an
implementation reading a source whose repository is optional **must** produce
it.

**The worst defect is not a missing reference.** It is a reference that resolves
and renders as plainly correct text when the object behind it was never admitted
or has stopped being valid — a reader has no way to see it. **A non-ok state
never renders as its bare value.**

### 5.1 `⚑S` and the three-way requirement

`⚑S` is the one state an implementation may decline to compute, because it is a
different class of input from everything else here: it is **derived from commit
history**, not read from a file. Declining is permitted. **Being silent about
declining is not.**

A conformant implementation must therefore be able to report **three distinct
outcomes**, never two:

| Outcome | Meaning |
|---|---|
| suspect | checked, and the link is under suspicion — `⚑S` |
| not suspect | **checked, and clean** |
| not computed | **never checked** — suspicion was not evaluated at all |

The second and third are the pair that must not be allowed to look alike. A
document that renders with no `⚑S` anywhere is making a claim; an implementation
that never ran the check has made no claim at all, and must say so rather than
produce output indistinguishable from a clean one. **An implementation that
omits suspicion silently is non-conforming even when every other state is
right** — it is the one failure mode that reads as success.

Where an implementation reports "not computed" it should also say why, so a
reader is not left to guess whether the omission is policy or a defect.

---

## 6. Render profiles — the strict/lenient split

**A conformant implementation must offer at least two render profiles**, and
must name which one a given run used. This is a requirement on the
implementation's interface, not an option:

| Profile | Requirement |
|---|---|
| **strict** | **Fails the run** on every non-ok state of §5 the implementation computes. The output is not usable as a deliverable, and the implementation says so by exit status, not only in prose. |
| **lenient** | **Does not fail.** Renders every reference it can, each non-ok one carrying its flag, and reports every state it found. |

The names above are the roles, not required spelling — this repository's two
implementations call the lenient profile `review`, and the strict one `strict`
and `clean` respectively. What is normative is that **both roles exist and are
selectable**, and that a rendered document can be traced to which was used.

Two rules bind the pair together, and they are where a naive implementation goes
wrong:

1. **Lenient reports exactly what strict fails on.** Not a subset. The profiles
   differ in consequence, never in what they detect — otherwise "it passed in
   review" stops predicting anything about the strict run, and the lenient
   profile becomes a way of not knowing.
2. **Neither profile renders a non-ok reference as its bare value.** Lenient may
   render the value *with* its flag, so a reader sees both what the template
   meant and that it is not usable; strict renders a marker in its place. What
   neither may do is emit text that reads as correct.

The split exists because the two audiences are different. An author mid-draft
needs to see the whole document with its gaps marked; a release pipeline needs a
build that stops. Serving only the first ships wrong documents, and serving only
the second makes the format unusable while a document is being written.

---

## 7. Failure discipline

| Requirement | Rule |
|---|---|
| Never silent | Every construct a document contains is either rendered or reported. Nothing is dropped. |
| Never blank | A reference that does not render its value leaves a visible marker, not an empty string. |
| Named by kind | Unknown or malformed syntax and **recognised-but-not-implemented** are different failures and must carry different codes. |

### 7.1 Not-implemented is a named failure, never an unknown one

The third row is the one that is easy to get wrong, and it is normative.

**A conformant implementation may leave any construct of this document
unimplemented** — `each`, `trace`, `{{ .field }}`, or anything added to the
language later. Admitting a subset is expected (§8). What it may not do is fail
in either of the two ways that lose the distinction:

- **Never silently.** A template using an unimplemented construct does not
  render with that construct dropped or passed through as fixed text. It fails.
- **Never as unknown syntax.** It fails **by its own name — "recognised, not
  implemented"** — under a code distinct from the one used for a typo or a
  malformed directive.

The reason is the author on the other end. Reporting a valid template as
malformed syntax sends someone looking for a mistake they did not make, in a
file that is correct, against a specification that says the construct exists.
The two messages are "this is not in the language" and "this is in the language
and not in this tool" — and they lead to entirely different next actions.

The reference implementation (§0.2) uses `TTRS-004` for this class and
`TTRS-002` for unknown syntax; the codes themselves are that implementation's,
but **having two distinct codes is the requirement**.

---

## 8. What each implementation must state

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

## 9. Conformance checklist

An implementation claiming to read this language must satisfy all of the
following. It is a summary of the requirements above, not a separate set of
them; each row cites the section that binds.

| # | Requirement | § |
|---|---|---|
| 1 | Splits the `CAPABILITY` V/H prefix off before reading a field path | §2.1 |
| 2 | Caps field-path traversal at depth 3, and fails beyond it | §3.2 |
| 3 | Treats an `instruct` body as opaque — no directive inside one is resolved | §4.2 |
| 4 | Keeps every reference state it reports distinct — never merges two | §5 |
| 5 | Never renders a non-ok reference as its bare value, in any profile | §5, §6 |
| 6 | Reports suspicion three ways — suspect, not suspect, **not computed** | §5.1 |
| 7 | Offers both a strict and a lenient profile, and names which a run used | §6 |
| 8 | Detects the same states in both profiles; they differ only in consequence | §6 |
| 9 | Fails a recognised-but-unimplemented construct **by name**, under a code distinct from unknown syntax | §7.1 |
| 10 | States in its own README what it admits and what it defers | §8 |

Rows 4, 6, 7 and 9 are the ones an implementation built from the reference
code's behaviour alone would be most likely to miss, which is why each is
written as a requirement above rather than left to be inferred.

---

## 10. References

- Extension / content match, and the date format: [`CONTRACT.md`](../../CONTRACT.md) §3, §4.
- Link suspicion, content identity, and the mechanical-procedure hatch: [`CONTRACT.md`](../../CONTRACT.md) §16.
- ID grammar and the `CAPABILITY` V/H exception: [`IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md) §1-2.
- Document kinds shipped today: [`29-mrd.md`](29-mrd.md), [`30-srs.md`](30-srs.md), [`31-sdd.md`](31-sdd.md).
- The reference implementation and its conformance fixture: [`@transitrix/document-renderer`](../../../packages/document-renderer/README.md).
- Skeleton files, evaluation and render profiles: [`@transitrix/document-view-engine`](../../../packages/document-view-engine/README.md).
- This class's index: [`README.md`](README.md).
