# Transitrix Implementation Patterns

Concrete deployment guides for common enterprise scenarios. Each pattern covers the problem it solves, the structure it establishes, when to use it, and how to start.

| Pattern | File | Tier | Scenario |
|---|---|---|---|
| Transitrix Alone | [transitrix-alone.md](transitrix-alone.md) | Simple or Full | One repo as the enterprise architecture source of truth. Simplest deployment — greenfield, small org, single-domain pilot. |
| Transitrix + Knowledge Store | [knowledge-store.md](knowledge-store.md) | Full | Three-layer architecture: raw sources feed a curated knowledge repo that feeds Transitrix canon. |
| Transitrix + Enterprise ADR Registry | [enterprise-adr-registry.md](enterprise-adr-registry.md) | Full | Transitrix repo as the enterprise ADL, aggregating cross-project architecture decisions. |
| Enterprise Memory | [enterprise-memory.md](enterprise-memory.md) | Simple or Full | A Transitrix repo as a durable, EA-grounded memory for humans and AI agents — semantic canon + episodic record. Composes with Knowledge Store at enterprise scale. |
| Personal Memory | [personal-memory.md](personal-memory.md) | Simple | Individual or small-team deployment: one repo as a personal second brain — goals, contacts, and decisions as structured, agent-queryable memory. |
| Baseline & Audit Trail | [baseline-audit-trail.md](baseline-audit-trail.md) | Full | Overlay for adopters with a review/audit obligation over `REQUIREMENT` / `ASSERTION` / `VERIFICATION` content — a `git tag` baseline, git history as the audit trail, and the admission record as the review/approval record. No new schema. |

---

## Choosing a pattern

Start with **Transitrix Alone** unless you already have multiple source repos producing content (use Knowledge Store) or multiple project repos making cross-cutting decisions (use ADR Registry). **Enterprise Memory** and **Personal Memory** describe the role any Transitrix repo plays for humans and AI agents — read the one that matches your scale (personal for an individual or small team; enterprise for a multi-project, EA-governed deployment), alongside whichever deployment pattern you choose.

The patterns are additive. Transitrix canon is always the centre; the other patterns wrap it. You can start with Alone and migrate later — the canon layer does not change shape.

## Common questions

An adopter (or an adopter's agent) rarely asks "which pattern tier do I need" — it asks a concrete question. Match the question to a pattern below rather than reverse-engineering it from the scenario table above.

| Question | Pattern |
|---|---|
| "How do we keep architecture decisions?" / "How do we stand up an ADL?" / "Where do ADRs live?" | [Enterprise ADR Registry](enterprise-adr-registry.md) — start with its "Start here" section for a single repo |
| "How do we get started with Transitrix at all?" / "Where does everything go in one repo?" | [Transitrix Alone](transitrix-alone.md) |
| "We have several repos producing raw material — how does it become canon?" | [Knowledge Store](knowledge-store.md) |
| "How do we make this repo a shared memory for humans and agents?" | [Enterprise Memory](enterprise-memory.md) |
| "Can I use Transitrix as a personal second brain?" | [Personal Memory](personal-memory.md) |
| "How do we baseline the model for an audit / design review?" | [Baseline & Audit Trail](baseline-audit-trail.md) |
| "Which deployment size fits us — Simple or Full?" | [`implementation-tiers.md`](implementation-tiers.md) |

Not sure which tier fits your organisation? See [`implementation-tiers.md`](implementation-tiers.md) for the Simple vs Full comparison — what belongs in each, the upgrade trigger, and the upgrade path.
