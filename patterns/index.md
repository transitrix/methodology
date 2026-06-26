# Transitrix Implementation Patterns

Concrete deployment guides for common enterprise scenarios. Each pattern covers the problem it solves, the structure it establishes, when to use it, and how to start.

| Pattern | File | Tier | Scenario |
|---|---|---|---|
| Transitrix Alone | [transitrix-alone.md](transitrix-alone.md) | Simple or Full | One repo as the enterprise architecture source of truth. Simplest deployment — greenfield, small org, single-domain pilot. |
| Transitrix + Knowledge Store | [knowledge-store.md](knowledge-store.md) | Full | Three-layer architecture: raw sources feed a curated knowledge repo that feeds Transitrix canon. |
| Transitrix + Enterprise ADR Registry | [enterprise-adr-registry.md](enterprise-adr-registry.md) | Full | Transitrix repo as the enterprise ADL, aggregating cross-project architecture decisions. |

---

## Choosing a pattern

Start with **Transitrix Alone** unless you already have multiple source repos producing content (use Knowledge Store) or multiple project repos making cross-cutting decisions (use ADR Registry).

The patterns are additive. Transitrix canon is always the centre; the other patterns wrap it. You can start with Alone and migrate later — the canon layer does not change shape.

Not sure which tier fits your organisation? See [`IMPLEMENTATION_TIERS.md`](../IMPLEMENTATION_TIERS.md) for the Simple vs Full comparison — what belongs in each, the upgrade trigger, and the upgrade path.
