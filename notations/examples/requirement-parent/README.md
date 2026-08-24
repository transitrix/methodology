# `parent` — REQUIREMENT decomposition crossing document-stage boundaries

A single stakeholder-level obligation ("protect personal data") realised at
two narrower tiers, each linked to the one above it by the inline `parent`
field — not a `REL` file, since `parent` is timeless and lives on the
requirement's own record.

```
REQUIREMENT-PERSONAL-DATA-PROTECTION-1   (level: stakeholder)
  ^
  | parent
REQUIREMENT-DATA-ERASURE-1               (level: system)
  ^
  | parent
REQUIREMENT-DATA-ERASURE-API-1           (level: software)
```

Each `parent` link crosses exactly one ISO/IEC/IEEE 29148 document-stage
boundary (StRS → SyRS → SRS) — the *typical* decomposition direction per
[`../../elements/15-requirement.md`](../../elements/15-requirement.md) §2.5.
`parent` is stage-agnostic by design (§2.4's "Stage-agnostic" point): nothing
here requires a `parent` link to cross a tier, but nothing forbids it either,
and `REQ-005` validates only that a present `level` value is well-formed, not
that a child's tier is deeper than its parent's.

This scenario is the same one named in the schema example at
[`../../elements/15-requirement.md`](../../elements/15-requirement.md) §2 —
this folder gives it a real, catalogued, cross-referenced instance.

## What this example is not

It does not claim the parent obligation is *satisfied* by its children —
`parent` is structure only, with no traversal semantics
([`15-requirement.md`](../../elements/15-requirement.md) §2.4). A compliance
claim about any of the three is a separate `ASSERTION`
([`16-assertion.md`](../../elements/16-assertion.md)), not modelled here.

See also [`../../elements/15-requirement.md`](../../elements/15-requirement.md)
§2.4, §2.4.1, §2.5.
