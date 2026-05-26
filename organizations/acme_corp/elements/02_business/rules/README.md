# `elements/02_business/rules/`

Rule elements — business rules an organisation enforces. Each rule is one file under this folder. Rules sit on the ArchiMate 3.2 **business** layer.

Rules describe operational policy (approval thresholds, segregation of duties, eligibility criteria, …). They may be referenced from any other notation via `applies_to:` once a register-view notation lands; v1 ships the elements only. Rules contrast with **constraints** (`elements/01_motivation/constraints/`) — constraints are binding rules imposed from outside or above (regulation, contract); rules are the organisation's own operating policy.

TYPE registry: see [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`RULE`).

## File convention

`<id>.yaml`, where `<id>` follows the canonical grammar `RULE-[<middle>-]<INTEGER>` from `IDS_AND_REFERENCES.md`.

Examples: `RULE-DUAL-APPROVAL-1.yaml`, `RULE-1.yaml`.

## Element schema

The schema is shared between `RULE` and `CONSTRAINT` elements — `type` distinguishes them and folder placement mirrors the ArchiMate layer.

### Required

| Field | Description |
|---|---|
| `id` | `RULE-[<middle>-]<INTEGER>` |
| `name` | one-line statement |
| `type` | literal `rule` |
| `statement` | normative wording — `MUST` / `SHOULD` / `MUST NOT` recommended |
| `status` | one of `active` / `proposed` / `deprecated` / `retired` |

### Optional

| Field | Description |
|---|---|
| `applies_to` | array of typed IDs the rule governs. v1 accepts **any registered TYPE** from `IDS_AND_REFERENCES.md`; the validator checks the TYPE prefix is in the registry. Cross-document resolution is out of scope. |
| `source` | citation — internal policy reference, board decision, audit finding |
| `owner_role` | `ROLE-…` ID accountable for the rule |
| `severity` | one of `mandatory` / `recommended` / `advisory` |
| `rationale` | why this rule exists |

## Skeleton

```yaml
id: RULE-SAMPLE-1
name: "Short one-line statement"
type: rule
statement: "MUST / SHOULD / MUST NOT wording, single sentence."
status: active

# Optional fields below
applies_to: []            # e.g. [PROCESS-EXPENSE-APPROVAL-1]
source: "Internal Policy §X.Y / Board decision YYYY-MM-DD"
owner_role: ROLE-OWNER-1
severity: mandatory       # mandatory | recommended | advisory
rationale: "Why this rule exists."
```

## Examples in this folder

| File | Description |
|---|---|
| `RULE-DUAL-APPROVAL-1.yaml` | Expense claims above a threshold require two approvers |

## See also

- TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`RULE`), §4 (uniqueness scope).
- Sibling constraints catalogue: [`../../01_motivation/constraints/`](../../01_motivation/constraints/).
