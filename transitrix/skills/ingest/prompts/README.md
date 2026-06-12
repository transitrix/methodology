# `prompts/` — ingest extraction prompts

Per-layer **system prompts** the ingest agent runs over a `field` artefact to produce an **extraction result** — typed canon candidates (elements and relations). The result is handed to `@transitrix/ingest-cli emit-candidates`, which shapes it into candidate files and a review queue. These are a **fork** of the onboarding skill's `extraction/` prompts, adapted for the ingest job (multi-element + relation extraction with `extraction_confidence` and relation-conservatism).

| File | ArchiMate layer | Extracts |
|---|---|---|
| [`01_motivation.md`](01_motivation.md) | Motivation | `FACTOR`, `GOAL`, `CONSTRAINT`, `REQUIREMENT`, `STAKEHOLDER` |
| [`02_business.md`](02_business.md) | Business | `ACTOR`, `ROLE`, `PROCESS`, `RULE`, `PRODUCT`, `CAPABILITY` |
| [`03_application.md`](03_application.md) | Application | `APPLICATION`, `INTEGRATION`, `INFORMATION_ENTITY` |
| [`04_implementation.md`](04_implementation.md) | Implementation & Migration | `ACTIVITY`, `CHANGE`, `TARGET_STATE` (+ milestone candidates routed through these two TYPEs until `MILESTONE` lands) |

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
  "unresolved": [
    { "ingest_field": "materials", "related_to": ["PRODUCT-WIDGET-1"],
      "data": ["Steel 316L", "Rubber gasket B12"] }
  ]
}
```

## Rules every prompt enforces

- **Two axes, never merged.** `extraction_confidence` (`high|medium|low`) answers *"did I read the document correctly"* — it is a review flag on the candidate, **separate** from the field artefact's `source_quality` (trust in the *source*). A prompt **never** outputs `source_quality`; that lives on the field artefact and is the CLI's / human's concern.
- **Entity-strong, relation-conservative.** Extract entities readily. For relations, only mark `extraction_confidence: high` when the source states the relation plainly; otherwise mark `medium`/`low` and let the pipeline hold it back as a *suggestion* (the CLI only promotes `high` relations to candidates).
- **Canonical IDs.** Every element carries an ID per `<TYPE>-[<middle>-]<INTEGER>` ([IDS §1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md)); relations reference element IDs in `from`/`to`. Never invent a TYPE or a relation kind — use the registries.
- **Propose, never admit.** The agent reads the field artefact body only (not its admission record), extracts, and stops. Admission to canon is a separate human gate; the CLI writes candidates as `admitted_to: pending`.
- **Zero information loss — never drop, never guess (CONTRACT §12 / §13).** A source field that maps to no schema field of a *known* entity goes in that element's optional **`extensions:`** map (an open key-value bag, carried verbatim to the admitted entity). A *standalone object whose TYPE you cannot determine* — not merely an extra field on a known entity — goes in the top-level **`unresolved[]`** array, each item `{ ingest_field, data, related_to? }`; the CLI parks it in `canon/unresolved/` for a human to resolve. Never invent a TYPE to make an object fit, and never silently discard data — when in doubt between an `extensions:` key and an `unresolved[]` object, prefer `unresolved[]`.

## See also

- The skill protocol: [`../SKILL.md`](../SKILL.md).
- Candidate / field-artefact schemas: [`../schemas/`](../schemas/).
- Admission record + confidence model: [CONTRACT §6, §11](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md).
- TYPE + relation registries: [IDS §3](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md), [17-relations.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/17-relations.md).
