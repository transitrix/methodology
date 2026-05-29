# `canon/elements/01_motivation/constraints/`

Constraint elements — design / operating constraints that bind the organisation. Each constraint is one file under this folder. Constraints sit on the ArchiMate 3.2 **motivation** layer.

Constraints are referenced by FGCA factors via `references_constraint:` — the existence of a constraint is itself a factor for the organisation that acts on it. They may also be referenced from any other notation via `applies_to:` once a register-view notation lands; v1 ships the elements only.

TYPE registry: see [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`CONSTRAINT`).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `CONSTRAINT-[<middle>-]<INTEGER>` from `IDS_AND_REFERENCES.md`.

Examples: `CONSTRAINT-GDPR-1.yaml`, `CONSTRAINT-1.yaml`.

## Element schema

The schema is shared between `RULE` and `CONSTRAINT` elements — `type` distinguishes them and folder placement mirrors the ArchiMate layer.

### Required

| Field | Description |
|---|---|
| `id` | `CONSTRAINT-[<middle>-]<INTEGER>` |
| `name` | one-line statement |
| `type` | literal `constraint` |
| `statement` | normative wording — `MUST` / `SHOULD` / `MUST NOT` recommended |
| `status` | one of `active` / `proposed` / `deprecated` / `retired` |

### Optional

| Field | Description |
|---|---|
| `applies_to` | array of typed IDs the constraint binds. v1 accepts **any registered TYPE** from `IDS_AND_REFERENCES.md`; the validator checks the TYPE prefix is in the registry. Cross-document resolution is out of scope. |
| `source` | citation — regulation, contract, decision reference |
| `owner_role` | `ROLE-…` ID accountable for the constraint |
| `severity` | one of `mandatory` / `recommended` / `advisory` |
| `rationale` | why this constraint exists (regulatory / strategic / contractual context) |

## Skeleton

```yaml
id: CONSTRAINT-SAMPLE-1
name: "Short one-line statement"
type: constraint
statement: "MUST / SHOULD / MUST NOT wording, single sentence."
status: active

# Optional fields below
applies_to: []            # e.g. [PROCESS-ORDER-1, APPLICATION-OMS-1]
source: "Regulation §X.Y / Contract §Z"
owner_role: ROLE-OWNER-1
severity: mandatory       # mandatory | recommended | advisory
rationale: "Why this constraint exists in the organisation."
```

## Examples in this folder

| File | Description |
|---|---|
| `CONSTRAINT-GDPR-RESIDENCY-1.yaml` | EU customer personal-data residency requirement (GDPR art. 44–49) |

## See also

- TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`CONSTRAINT`), §4 (uniqueness scope).
- Sibling rules catalogue: [`../../02_business/rules/`](../../02_business/rules/).
- FGCA cross-reference field `references_constraint:` on FACTOR: [`notations/views/02-fgca.md`](../../../../../notations/views/02-fgca.md) § Fields → `factors[]`.
