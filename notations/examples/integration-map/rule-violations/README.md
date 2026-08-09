# Integration map — rule-violation fixture

A sibling fixture to [`../`](../) (the valid case, where every edge comes from an
admitted `INTEGRATION` reference). This one deliberately breaks the one guarantee this
notation exists to make: **an edge with no admitted `INTEGRATION` behind it must be
impossible to express.**

> **The file in this folder is invalid on purpose. Do not copy it as a starting point** —
> copy from [`../enterprise.integration-map.transitrix.yaml`](../enterprise.integration-map.transitrix.yaml)
> instead.

## Seeded violation

| File | Seeded violation | Rule it trips |
|---|---|---|
| [`attempted-inline-edge.integration-map.transitrix.yaml`](attempted-inline-edge.integration-map.transitrix.yaml) | `view.integrations.include` carries an object (`source:` / `target:` / `protocol:` keys) instead of a bare `INTEGRATION-…` id — an attempt to author an edge directly rather than reference one already admitted. | `INTMAP-004` |

Per the spec's [§5.3](../../../views/diagrams/12-integration-map.md#53-the-schema-guarantee--why-an-unadmitted-edge-cannot-be-authored), this is defense-in-depth, not the primary guarantee: `view.integrations.include` / `.exclude` are typed as lists of strings, so there is no field shape on this notation into which a `(source, target)` pair fits. `INTMAP-004` is what a validator reports when an author hand-edits the YAML to try anyway — the same way a type-checked language rejects a string assigned to an integer field, rather than silently coercing it. There is no `edges:` or `links:` key anywhere in the schema for this violation to hide behind.

## What is deliberately *not* seeded

- **A reference to an unresolvable `INTEGRATION` id** (a plain string that doesn't resolve to anything admitted) — that is `INTMAP-003`, a different failure mode (a typo or a stale reference), and belongs in its own fixture if one is ever needed. This folder seeds the *schema-shape* violation, not the *reference-resolution* one.
- **A second rule firing alongside `INTMAP-004`.** `APPLICATION-OMS-1` is named consistently with the valid sibling fixture so nothing else about the file is unusual.

## References

- [`../README.md`](../README.md) — the valid fixture this one is a sibling to.
- [`../../../views/diagrams/12-integration-map.md`](../../../views/diagrams/12-integration-map.md) §5.3, §7 — the schema guarantee and `INTMAP-004`.
