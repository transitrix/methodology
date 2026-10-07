# Extract Transitrix Canon Candidates

Extract typed Transitrix element candidates from the source document. Only propose what the source explicitly supports — be conservative on relations.

## Element types to look for

| Type | Look for |
|---|---|
| DRIVER | External pressures, regulatory requirements, market forces, constraints the organisation cannot change |
| GOAL | Intended outcomes, strategic objectives, targets |
| CHANGE | Initiatives, transformations, programmes, projects being undertaken |
| CAPABILITY | Abilities the organisation has or needs to develop |
| ACTOR | Named external entities (regulators, customers, partners) |
| ROLE | Named internal roles with responsibilities |
| PROCESS | Named business processes with clear scope |
| APPLICATION | Named IT systems or tools |
| PRODUCT | Named goods or services delivered |

## Relations (conservative)

Only propose a relation when the source text *explicitly states* the connection — not when you infer it. Examples of explicit statements:
- "The GDPR requirement (DRIVER) drives the data retention initiative (CHANGE)"
- "The Compliance Officer (ROLE) owns the risk register process (PROCESS)"

For each relation candidate, note the verbatim phrase that justifies it.

## Output format

For each candidate element:

```yaml
type: DRIVER
id: <TYPE>-TBD     # leave TBD — IDs are assigned during review to avoid conflicts
name: "<name>"
description: "<one-sentence>"
derived_from: [/_intake/processed/<source-document-filename>]
admitted_to: pending
extraction_confidence: high | medium | low
```

`extraction_confidence` rules:
- `high` — the source names the element explicitly with enough context to be unambiguous
- `medium` — the element is implied but not named; some interpretation required
- `low` — uncertain; surface for human judgement

For each proposed relation:

```yaml
relation:
  type: <REL_KIND>
  from: <TYPE>-TBD-<name>
  to: <TYPE>-TBD-<name>
  source_quote: "<verbatim phrase>"
  extraction_confidence: medium | low
```

Relations never get `extraction_confidence: high` — they are structural claims and always need human validation.

## After extraction

List all candidate elements, grouped by type. Then list all candidate relations. State:
- Total elements and relations proposed
- Elements or passages skipped and why (out of scope, too vague, existing canon ID known)

Save these proposals in a YAML review file under `_intake/drafts/` (for example `canon-candidates.yaml`), outside `canon/`. Follow SKILL Step 5b: the reviewer assigns unique canonical IDs and resolves relation endpoints before canonical placement and validation. Unresolved placeholders block the canon PR and can never become admitted IDs. Relations remain `medium` or lower. Human admission is still required; extraction does not write admitted canon.
