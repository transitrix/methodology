# `depends_on` — REQUIREMENT → REQUIREMENT

A quarterly compliance-reporting duty is only meaningful if the data-residency
obligation it rests on holds. That is a **conditional dependency between
statements**, authored as a first-class `depends_on` REL — not as `parent`
(decomposition) and not as an `ACTION`/`CHANGE` sequence (work order).

```
REQUIREMENT-COMPLIANCE-REPORTING-1  --depends_on-->  REQUIREMENT-DATA-RESIDENCY-1
```

See [`../../../elements/17-relations.md`](../../../elements/17-relations.md) §3
and [`../../../elements/15-requirement.md`](../../../elements/15-requirement.md) §2.4.
