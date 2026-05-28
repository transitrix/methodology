# `canon/views/scenarios/`

Alternative strategic development paths — each scenario scopes its own goals, capabilities, activities, products, processes, and applications.

## File convention

`*.scenarios.transitrix.yaml`

See [`notations/11-scenarios.md`](../../../../notations/11-scenarios.md) for the full spec.

## Lifecycle

Every inline scenario entry (`SCENARIO` canonical TYPE per [`notations/IDS_AND_REFERENCES.md`](../../../../notations/IDS_AND_REFERENCES.md) §3.1) carries `valid_from` and `valid_to` in its frontmatter per [`notations/CONTRACT.md`](../../../../notations/CONTRACT.md) §7. These mark the period the scenario itself is admitted as a planning consideration — distinct from any time horizon the scenario's narrative may describe (e.g. "scenario for 2027"). The scenario-scoped goals / capabilities / activities / products / processes / applications are references to other canonical elements; their lifecycle lives on each target's own canonical file. The scenarios document itself carries no lifecycle.

## See also

- [`notations/examples/scenarios/`](../../../../notations/examples/scenarios/) — worked examples
- `method/methodology.md` §6 — notation kit
