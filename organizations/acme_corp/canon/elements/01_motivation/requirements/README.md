# `canon/elements/01_motivation/requirements/`

Requirement elements — positive obligations the organisation must fulfil. Each requirement is one file under this folder. Requirements sit on the ArchiMate 3.2 **motivation** layer.

Requirements are distinct from `CONSTRAINT` by the **form of the obligation**: REQUIREMENT = positive action ("must submit", "must register", "must obtain approval"); CONSTRAINT = restriction ("must not", "cannot exceed"). See the full decision guide in [`notations/elements/15-requirement.md`](../../../../../notations/elements/15-requirement.md) §1.

Each requirement may cite zero or more codex sources via `derived_from:` (`LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD`). A requirement with no `derived_from` is an internal obligation that has no written codex source.

Requirements are not bound to subjects directly. The compliance claim that a specific subject (`PRODUCT` / `PROCESS` / `CAPABILITY`) satisfies a requirement lives in [`../../../assertions/`](../../../assertions/) as an `ASSERTION` artefact ([`notations/elements/16-assertion.md`](../../../../../notations/elements/16-assertion.md)).

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`REQUIREMENT`), §4 (uniqueness scope).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `REQUIREMENT-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §1.

Examples: `REQUIREMENT-DATA-ERASURE-1.yaml`, `REQUIREMENT-1.yaml`.

## Schema

Defined in [`notations/elements/15-requirement.md`](../../../../../notations/elements/15-requirement.md) §2. Every requirement carries:

- The requirement-specific fields: `notation: requirement`, `id`, `title`, `description`, optional `severity` / `derived_from`.
- The admission record per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §6: `zone: canon`, `admitted_at`, `admitted_by`, `gate_checks`.
- The primitive lifecycle per [`notations/CONTRACT.md`](../../../../../notations/CONTRACT.md) §7: `valid_from`, `valid_to`.

## Examples in this folder

| File | Source | Notes |
|---|---|---|
| `REQUIREMENT-DATA-ERASURE-1.yaml` | external — `LAW-PERSONAL-DATA-2017-1` | demonstrates a requirement derived from a codex external `LAW` |
| `REQUIREMENT-AUDIT-LOG-RETENTION-1.yaml` | none (`derived_from` absent) | demonstrates an internal-only requirement with no codex source; intentionally has no assertion targeting it, surfacing the planned `REQ-COVERAGE-001` warning |

## See also

- Requirement spec: [`notations/elements/15-requirement.md`](../../../../../notations/elements/15-requirement.md).
- Sibling constraints catalogue: [`../constraints/`](../constraints/).
- Compliance claims linking requirements to subjects: [`../../../assertions/`](../../../assertions/) and [`notations/elements/16-assertion.md`](../../../../../notations/elements/16-assertion.md).
- Codex sources requirements derive from: [`../../../../codex/`](../../../../codex/) and [`notations/elements/14-codex.md`](../../../../../notations/elements/14-codex.md).
