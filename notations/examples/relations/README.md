# Relations — worked examples

First-class time-aware relation files (`canon/relations/REL-….yaml`). Spec: [`../../elements/17-relations.md`](../../elements/17-relations.md).

| File | Kind | What it shows |
|---|---|---|
| [`depends-on/`](depends-on/) | `depends_on` | A software-tier reporting obligation that presupposes a residency obligation — not decomposition (`parent`), not work order. |
| [`process-parent/`](process-parent/) | `process_parent` | A fulfilment value chain and three child-process phases; blueprint columns are the `PROCESS-…` ids. Composition is the REL, not the column list. The `STAGE-` only sketch stays under [`../process-blueprint/`](../process-blueprint/). |
| [`required-for/`](required-for/) | `required_for` | Obligations scoped to a specific release of a payments gateway: one inherited along the `predecessor` chain, one introduced later, one whose scope statement has been withdrawn by closing its window. |

Open any `REL-….yaml` alongside its endpoint files; validators with the catalogue loaded enforce `REL-001`…`REL-008`.
