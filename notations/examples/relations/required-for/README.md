# `required_for` — REQUIREMENT → RELEASE

Two obligations on a payments gateway, each scoped to the release it applies
to rather than to the gateway as a whole, plus a third whose scope statement
has since been withdrawn.

```
REQUIREMENT-PAYMENT-AVAILABILITY-1  --required_for-->  RELEASE-PAYMENTS-GATEWAY-1   (open)
REQUIREMENT-LEGACY-CIPHER-SUITE-1   --required_for-->  RELEASE-PAYMENTS-GATEWAY-1   (valid_to 2026-06-30)
REQUIREMENT-STRONG-AUTH-1           --required_for-->  RELEASE-PAYMENTS-GATEWAY-2   (open)

RELEASE-PAYMENTS-GATEWAY-2  --predecessor-->  RELEASE-PAYMENTS-GATEWAY-1
```

## What the query returns

"What must hold in release R" ([`17-relations.md`](../../../elements/17-relations.md)
§3.2) as at **2026-08-07**:

| Release | Obligation | Depth | Why |
|---|---|---|---|
| `RELEASE-PAYMENTS-GATEWAY-2` | `REQUIREMENT-STRONG-AUTH-1` | 0 | attached directly |
| `RELEASE-PAYMENTS-GATEWAY-2` | `REQUIREMENT-PAYMENT-AVAILABILITY-1` | 1 | **inherited** along `predecessor` from 2.3.0 |
| `RELEASE-PAYMENTS-GATEWAY-1` | `REQUIREMENT-PAYMENT-AVAILABILITY-1` | 0 | attached directly |

`REQUIREMENT-LEGACY-CIPHER-SUITE-1` appears for neither release: its relation
window closed on 2026-06-30. Ask the same question **as at 2026-04-01** and it
comes back for 2.3.0 — the file was never deleted, so the history of what was
in scope for a shipped release stays answerable.

`REQUIREMENT-STRONG-AUTH-1` appears for 2.4.0 only. Inheritance runs one way
along the chain: a later release inherits its ancestors' obligations, and an
obligation introduced later never reaches back.

Run it:

```
node scripts/release-obligations.mjs \
  --root notations/examples/relations/required-for \
  --release RELEASE-PAYMENTS-GATEWAY-2 --as-at 2026-08-07
```

## What this example is not

The three relations say **where** each obligation applies. They say nothing
about who makes it hold, in what order, or by when — that boundary is the
point of the kind and is stated at
[`17-relations.md`](../../../elements/17-relations.md) §3.1. Nor do they claim
any obligation is *met*: that is an `ASSERTION` / `VERIFICATION` question.

See also [`../../../elements/17-relations.md`](../../../elements/17-relations.md)
§3 and [`../../../ELEMENT_PRIMITIVES.md`](../../../ELEMENT_PRIMITIVES.md) §7.29.
