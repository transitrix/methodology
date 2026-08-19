# `prompts/` — ingest extraction prompts

Per-layer **system prompts** the ingest agent runs over a `field` artefact to produce an **extraction result** — typed canon candidates (elements and relations). The result is handed to `@transitrix/ingest-cli emit-candidates`, which shapes it into candidate files and a review queue. These are a **fork** of the onboarding skill's `extraction/` prompts, adapted for the ingest job (multi-element + relation extraction with `extraction_confidence` and relation-conservatism).

| File | ArchiMate layer | Extracts |
|---|---|---|
| [`01_motivation.md`](01_motivation.md) | Motivation | `DRIVER`, `GOAL`, `CONSTRAINT`, `REQUIREMENT`, `STAKEHOLDER` |
| [`02_business.md`](02_business.md) | Business | `ACTOR`, `ROLE`, `PROCESS`, `RULE`, `PRODUCT`, `CAPABILITY` |
| [`03_application.md`](03_application.md) | Application | `APPLICATION`, `INTEGRATION`, `BUSINESS_OBJECT` |
| [`04_implementation.md`](04_implementation.md) | Implementation & Migration | `ACTIVITY`, `CHANGE`, `TARGET_STATE` (+ milestone candidates routed through these two TYPEs until `MILESTONE` lands) |
| [`05_approvers.md`](05_approvers.md) | Cross-cutting | `ACTOR`, `ROLE` from a document's approval / sign-off chain, plus `role_assignment_proposals[]` |

Each prompt is self-contained (it can be fed to an agent independently) and emits the same **result contract**:

```json
{
  "elements": [
    { "id": "GOAL-RET-1", "name": "Improve retention", "element_type": "GOAL",
      "extraction_confidence": "high", "extraction_notes": "explicit ask by the accountable owner",
      "valid_from": "2026-01-01" },
    { "id": "PRODUCT-WIDGET-1", "name": "Widget Pro", "element_type": "PRODUCT",
      "extraction_confidence": "high",
      "extensions": { "materials": ["Steel 316L"], "source_table": "product_equipment_matrix" } }
  ],
  "relations": [
    { "rel_kind": "stakeholding", "from": "STAKEHOLDER-CFO-1", "to": "GOAL-RET-1",
      "extraction_confidence": "high", "extraction_notes": "..." }
  ],
  "semantic_links": [
    { "link_type": "requirement_dependency", "from": "REQUIREMENT-A-1", "to": "REQUIREMENT-B-1",
      "confidence": "medium", "rationale": "source states A cannot be met until B is satisfied, but no closed REL kind exists for this edge" }
  ],
  "unresolved": [
    { "ingest_field": "materials", "related_to": ["PRODUCT-WIDGET-1"],
      "data": ["Steel 316L", "Rubber gasket B12"] }
  ],
  "role_assignment_proposals": [
    { "person": "ACTOR-JANE-DOE-1", "proposed_role": "ROLE-CTO-1",
      "evidence": "signature block: 'Approved by: Jane Doe, CTO'",
      "confidence": "high" }
  ]
}
```

## Rules every prompt enforces

- **Two axes, never merged.** `extraction_confidence` (`high|medium|low`) answers *"did I read the document correctly"* — it is a review flag on the candidate, **separate** from the field artefact's `source_quality` (trust in the *source*). A prompt **never** outputs `source_quality`; that lives on the field artefact and is the CLI's / human's concern.
- **Entity-strong, relation-conservative.** Extract entities readily. For relations, only mark `extraction_confidence: high` when the source states the relation plainly; otherwise mark `medium`/`low` and let the pipeline hold it back as a *suggestion* (the CLI only promotes `high` relations to candidates).
- **Canonical IDs.** Every element carries an ID per `<TYPE>-[<middle>-]<INTEGER>` ([IDS §1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md)); relations reference element IDs in `from`/`to`. Never invent a TYPE or a relation kind — use the registries.
- **Semantic links, not invented relation kinds.** When the source plainly states a typed edge between two candidates but no closed REL kind covers it ([17-relations.md §3](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/17-relations.md)), emit it as a `semantic_links[]` entry (`link_type`, `from`, `to`, `confidence`, `rationale`) instead of forcing it into `relations[]` with a made-up `rel_kind`. Semantic links are review-only — the CLI never shapes them into relation candidates and they are never admitted to canon. **Exception that is now covered:** a REQUIREMENT→REQUIREMENT conditional dependency is the closed kind `depends_on` — emit it in `relations[]`, not as a semantic link.
- **Propose, never admit.** The agent reads the field artefact body only (not its admission record), extracts, and stops. Admission to canon is a separate human gate; the CLI writes candidates as `admitted_to: pending`.
- **Zero information loss — never drop, never guess (CONTRACT §12 / §13).** A source field that maps to no schema field of a *known* entity goes in that element's optional **`extensions:`** map (an open key-value bag, carried verbatim to the admitted entity). A *standalone object whose TYPE you cannot determine* — not merely an extra field on a known entity — goes in the top-level **`unresolved[]`** array, each item `{ ingest_field, data, related_to? }`; the CLI parks it in `canon/unresolved/` for a human to resolve. Never invent a TYPE to make an object fit, and never silently discard data — when in doubt between an `extensions:` key and an `unresolved[]` object, prefer `unresolved[]`.
- **Person→role assignment is a proposal, not an invented relation.** [`05_approvers.md`](05_approvers.md) emits `role_assignment_proposals[]` (`person`, `proposed_role`, `evidence`, `confidence`) for a document's approval / sign-off chain — a role assignment has no closed `REL` kind of its own ([17-relations.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/17-relations.md) §3; today it rides as the `roles:` attribute on an `employment` relation, which a sign-off block gives no basis to assert). A prompt never sets `decision` on a proposal — the CLI initialises it to `pending` and a human reviewer resolves it.

## See also

- The skill protocol: [`../SKILL.md`](../SKILL.md).
- Candidate / field-artefact schemas: [`../schemas/`](../schemas/).
- Admission record + confidence model: [CONTRACT §6, §11](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md).
- TYPE + relation registries: [IDS §3](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md), [17-relations.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/17-relations.md).
