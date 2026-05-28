# `canon/views/issues/`

Register of issues — problems, defects, open questions — in a parent/child tree, complementing the activities plan.

## File convention

`*.issues.transitrix.yaml`

See [`notations/12-issues.md`](../../../../notations/12-issues.md) for the full spec.

## Lifecycle

Every inline issue entry under `issues[]` (`ISSUE` canonical TYPE per [`notations/IDS_AND_REFERENCES.md`](../../../../notations/IDS_AND_REFERENCES.md) §3.1) carries `valid_from` and `valid_to` per [`notations/CONTRACT.md`](../../../../notations/CONTRACT.md) §7. These are distinct from the issue's own `status` / `created_at` / `resolved_at` fields, which describe the issue-handling timeline (operational state). In typical practice `valid_from ≈ created_at` while the issue is open; closing the issue may or may not retire the artefact, depending on the organisation's archive policy. The issues-catalogue document itself carries no lifecycle.

## See also

- [`notations/examples/issues/`](../../../../notations/examples/issues/) — worked example
- `method/methodology.md` §6 — notation kit
