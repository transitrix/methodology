// Unit tests for the C1 class-derivation logic in check-notations.mjs.
// Run: node --test scripts/check-notations.test.mjs
//
// Exercises the pure functions only (no filesystem, no subprocess) — the
// integration-level guarantee (the real repo's counts match its README) is
// covered by running scripts/check-notations.mjs itself in CI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveClassCounts,
  parseStatedViewCounts,
  findStandardIdentifierEmissions,
  checkPackageEnvelopeStatement,
  deriveDeprecationFailures,
  parseVocabularyElementTypes,
  parseElementPrimitivesTable,
  parseVocabularyRelationTypes,
  parseRelationsEnumTable,
  decomposeSpan,
  parseVocabularyValueVocabularies,
  parseRuleRowValues,
} from './check-notations.mjs';

test('deriveClassCounts — positive: counts non-deprecated specs per class', () => {
  const counts = deriveClassCounts({
    diagrams: [{ deprecated: false }, { deprecated: false }, { deprecated: false }],
    reports: [{ deprecated: false }],
    documents: [{ deprecated: false }],
  });
  assert.deepEqual(counts, { diagrams: 3, reports: 1, documents: 1 });
});

test('deriveClassCounts — negative: a deprecated spec does not count', () => {
  const counts = deriveClassCounts({
    diagrams: [{ deprecated: false }, { deprecated: true }],
    reports: [],
    documents: [],
  });
  assert.equal(counts.diagrams, 1, 'the deprecated spec must be excluded');
});

test('deriveClassCounts — negative: moving a spec between class folders changes both counts', () => {
  const before = deriveClassCounts({
    diagrams: [{ deprecated: false }, { deprecated: false }],
    reports: [{ deprecated: false }],
    documents: [],
  });
  // Simulate moving one spec from diagrams/ to reports/.
  const after = deriveClassCounts({
    diagrams: [{ deprecated: false }],
    reports: [{ deprecated: false }, { deprecated: false }],
    documents: [],
  });
  assert.notEqual(before.diagrams, after.diagrams);
  assert.notEqual(before.reports, after.reports);
});

test('parseStatedViewCounts — positive: reads all three counts from README-shaped prose', () => {
  const text = '### Diagram views (A = 11)\n\nsome text\n\n### Report views (C = 4)\n\nmore text\n\n### Document views (D = 1)\n';
  const stated = parseStatedViewCounts(text);
  assert.deepEqual(stated, { diagrams: 11, reports: 4, documents: 1 });
});

test('parseStatedViewCounts — negative: a missing pattern reports null, not zero', () => {
  const stated = parseStatedViewCounts('# Notations\n\nno counts stated here.\n');
  assert.equal(stated.diagrams, null);
  assert.equal(stated.reports, null);
  assert.equal(stated.documents, null);
});

test('parseStatedViewCounts — negative: diagrams/reports present but document count still missing reports null', () => {
  const text = '### Diagram views (A = 11)\n\n### Report views (C = 4)\n';
  const stated = parseStatedViewCounts(text);
  assert.equal(stated.documents, null);
});

test('findStandardIdentifierEmissions — positive: a clean fields table with no standard-identifier value', () => {
  const text = [
    '| Field | Required | Type | Default | Semantics |',
    '|---|---|---|---|---|',
    '| `view.standard` | no | string | unset | Reserved for future use; not read by the render contract. |',
  ].join('\n');
  assert.deepEqual(findStandardIdentifierEmissions(text), []);
});

test('findStandardIdentifierEmissions — positive: a narrative mention outside a table row is not flagged', () => {
  const text = 'This layout deliberately avoids adopting a named specification numbering convention as a default.';
  assert.deepEqual(findStandardIdentifierEmissions(text), []);
});

test('findStandardIdentifierEmissions — negative: a documented iso-… default value in a table row is flagged', () => {
  const text = [
    '| Field | Required | Type | Default | Semantics |',
    '|---|---|---|---|---|',
    '| `view.standard` | no | string | `iso-29148` | default document-structure profile |',
  ].join('\n');
  assert.deepEqual(findStandardIdentifierEmissions(text), ['iso-29148']);
});

test('findStandardIdentifierEmissions — negative: a documented ieee-… default value in a table row is flagged', () => {
  const text = [
    '| Field | Required | Type | Default | Semantics |',
    '|---|---|---|---|---|',
    '| `view.standard` | no | string | `ieee-830` | default document-structure profile |',
  ].join('\n');
  assert.deepEqual(findStandardIdentifierEmissions(text), ['ieee-830']);
});

test('checkPackageEnvelopeStatement — positive: a "No." answer citing CONTRACT.md passes', () => {
  const text = [
    '## 9. Core envelope statement',
    '',
    '**No.** This package does not carry CONTRACT.md\'s envelope on any object kind.',
    '',
    '## 10. Evolution',
  ].join('\n');
  assert.equal(checkPackageEnvelopeStatement(text), null);
});

test('checkPackageEnvelopeStatement — positive: a "Yes." answer passes without needing a CONTRACT.md citation', () => {
  const text = [
    '## 6. Core envelope statement',
    '',
    '**Yes.** Every object carries the core envelope, per CONTRACT.md §2/§6/§7.',
  ].join('\n');
  assert.equal(checkPackageEnvelopeStatement(text), null);
});

test('checkPackageEnvelopeStatement — negative: no section at all fails', () => {
  const text = '## 5. Validation rules\n\nsome rules\n';
  assert.match(checkPackageEnvelopeStatement(text), /missing a "## N\. Core envelope statement" section/);
});

test('checkPackageEnvelopeStatement — negative: a section present but silent on yes/no fails', () => {
  const text = [
    '## 9. Core envelope statement',
    '',
    'This package interacts with the core envelope in some ways.',
    '',
    '## 10. Evolution',
  ].join('\n');
  assert.match(checkPackageEnvelopeStatement(text), /does not open with a plain/);
});

test('checkPackageEnvelopeStatement — negative: a "No." answer that never cites CONTRACT.md fails', () => {
  const text = [
    '## 9. Core envelope statement',
    '',
    '**No.** This package just does not.',
    '',
    '## 10. Evolution',
  ].join('\n');
  assert.match(checkPackageEnvelopeStatement(text), /does not cite CONTRACT\.md/);
});

test('deriveDeprecationFailures — positive: deprecated spec with removed_in passes clean', () => {
  const failures = deriveDeprecationFailures(
    [{ name: '03-fga.md', deprecated: true, removedIn: '4.0.0' }],
    'notations/views/diagrams'
  );
  assert.deepEqual(failures, []);
});

test('deriveDeprecationFailures — negative: deprecated spec with no removed_in reports DEP1', () => {
  const failures = deriveDeprecationFailures(
    [{ name: '03-fga.md', deprecated: true, removedIn: null }],
    'notations/views/diagrams'
  );
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'DEP1');
  assert.match(failures[0].message, /03-fga\.md/);
});

test('deriveDeprecationFailures — negative: a non-deprecated spec without removed_in is not flagged', () => {
  const failures = deriveDeprecationFailures(
    [{ name: '02-dgca.md', deprecated: false, removedIn: null }],
    'notations/views/diagrams'
  );
  assert.deepEqual(failures, []);
});

// --- VOC1: vocabulary.yaml element_types vs ELEMENT_PRIMITIVES.md §4 -------

test('parseVocabularyElementTypes — positive: reads mode/layer/folder, tolerating a comment and blank line', () => {
  const text = `
element_types:

  # 01_motivation
  DRIVER:
    mode: standalone
    layer: 01_motivation
    folder: 01_motivation/factors/
    promotable: false
  GOAL:
    mode: standalone
    layer: 01_motivation
    folder: 01_motivation/goals/
    promotable: false

deprecated_element_types:
  FACTOR:
    replaced_by: DRIVER
`;
  const out = parseVocabularyElementTypes(text);
  assert.deepEqual([...out.keys()], ['DRIVER', 'GOAL']);
  assert.deepEqual(out.get('DRIVER'), { mode: 'standalone', layer: '01_motivation', folder: '01_motivation/factors/' });
});

test('parseVocabularyElementTypes — negative: a missing "element_types:" block throws', () => {
  assert.throws(() => parseVocabularyElementTypes('methodology_version: "3.1.0"\n'), /element_types/);
});

test('parseVocabularyElementTypes — negative: an unrecognised line inside the block throws', () => {
  const text = `
element_types:
  DRIVER:
    mode: standalone
    - not a recognised field line
`;
  assert.throws(() => parseVocabularyElementTypes(text), /unrecognised line/);
});

test('parseElementPrimitivesTable — positive: reads mode/layer/folder, normalising the layer word and the `contained` mode prefix', () => {
  const text = `
## 4. Materialisation decision per TYPE

| TYPE | Mode | \`notation\` | Layer | Folder | Per-element fields owned by |
|---|---|---|---|---|---|
| \`DRIVER\` | standalone | \`driver\` | motivation | \`01_motivation/factors/\` | §7.1 |
| \`STEP\` | contained (in \`PROCESS.flow\`) → standalone (promotable) | \`step\` | business | \`02_business/steps/\` | §7.20 |

## 5. Reconciliation with the legacy shape
`;
  const out = parseElementPrimitivesTable(text);
  assert.deepEqual(out.get('DRIVER'), { mode: 'standalone', layer: '01_motivation', folder: '01_motivation/factors/' });
  assert.deepEqual(out.get('STEP'), { mode: 'contained', layer: '02_business', folder: '02_business/steps/' });
});

test('parseElementPrimitivesTable — negative: a missing "## 4." heading throws', () => {
  assert.throws(() => parseElementPrimitivesTable('## 3. Something else\n'), /## 4\. Materialisation/);
});

test('parseElementPrimitivesTable — negative: a row with no recognisable mode throws', () => {
  const text = `
## 4. Materialisation decision per TYPE

| TYPE | Mode | \`notation\` | Layer | Folder | Per-element fields owned by |
|---|---|---|---|---|---|
| \`DRIVER\` | sideways | \`driver\` | motivation | \`01_motivation/factors/\` | §7.1 |
`;
  assert.throws(() => parseElementPrimitivesTable(text), /no recognisable mode/);
});

// --- VOC2: vocabulary.yaml relation_types vs elements/17-relations.md §3 ---

test('parseVocabularyRelationTypes — positive: reads from/to and ACTOR subtype narrowing, tolerating a comment and blank line', () => {
  const text = `
relation_types:

  # capability hierarchy
  parent:
    from: [CAPABILITY]
    to: [CAPABILITY]
  offers:
    from: [ACTOR, ROLE]
    from_subtype: [business_unit]
    to: [BUSINESS_SERVICE]

deprecated_relation_types:
  activity_goal:
    replaced_by: action_goal
`;
  const out = parseVocabularyRelationTypes(text);
  assert.deepEqual([...out.keys()], ['parent', 'offers']);
  assert.deepEqual(out.get('parent'), { from: ['CAPABILITY'], fromSubtype: null, to: ['CAPABILITY'], toSubtype: null });
  assert.deepEqual(out.get('offers'), { from: ['ACTOR', 'ROLE'], fromSubtype: ['business_unit'], to: ['BUSINESS_SERVICE'], toSubtype: null });
});

test('parseVocabularyRelationTypes — negative: a missing "relation_types:" block throws', () => {
  assert.throws(() => parseVocabularyRelationTypes('methodology_version: "3.1.0"\n'), /relation_types/);
});

test('parseVocabularyRelationTypes — negative: an unrecognised line inside the block throws', () => {
  const text = `
relation_types:
  parent:
    from: [CAPABILITY]
    - not a recognised field line
`;
  assert.throws(() => parseVocabularyRelationTypes(text), /unrecognised line/);
});

test('parseRelationsEnumTable — positive: reads endpoint TYPEs, ACTOR subtype narrowing, a multi-TYPE alternation, and ignores a trailing plain-text note', () => {
  const text = `
## 3. Relation \`type\` enum

| \`type\` | Direction (from → to) | Endpoint TYPEs | Semantics |
|---|---|---|---|
| \`parent\` | child → parent | \`CAPABILITY\` → \`CAPABILITY\` (V/H sub-grammar applies) | ... |
| \`contracting\` | contractor → org | \`ACTOR(person\\|business_unit)\` → \`ACTOR(business_unit)\` | ... |
| \`stakeholding\` | stakeholder → object | \`STAKEHOLDER\` → \`GOAL\` \\| \`ACTION\` \\| \`CAPABILITY\` | ... |

### 3.1 Something else
`;
  const out = parseRelationsEnumTable(text);
  assert.deepEqual(out.get('parent'), { from: { types: ['CAPABILITY'], actorSubtype: null }, to: { types: ['CAPABILITY'], actorSubtype: null } });
  assert.deepEqual(out.get('contracting'), {
    from: { types: ['ACTOR'], actorSubtype: ['person', 'business_unit'] },
    to: { types: ['ACTOR'], actorSubtype: ['business_unit'] },
  });
  assert.deepEqual(out.get('stakeholding'), {
    from: { types: ['STAKEHOLDER'], actorSubtype: null },
    to: { types: ['GOAL', 'ACTION', 'CAPABILITY'], actorSubtype: null },
  });
});

test('parseRelationsEnumTable — negative: a missing "## 3." heading throws', () => {
  assert.throws(() => parseRelationsEnumTable('## 2. Something else\n'), /## 3\. Relation/);
});

test('parseRelationsEnumTable — negative: a row with no "→" in its Endpoint TYPEs cell throws', () => {
  const text = `
## 3. Relation \`type\` enum

| \`type\` | Direction | Endpoint TYPEs | Semantics |
|---|---|---|---|
| \`parent\` | child → parent | \`CAPABILITY\` only | ... |
`;
  assert.throws(() => parseRelationsEnumTable(text), /no single "→"/);
});

// --- VOC3: vocabulary.yaml value_vocabularies vs their owning specs --------

test('decomposeSpan — positive: a brace-set decomposes to its members', () => {
  assert.deepEqual(decomposeSpan('{PRODUCT, PROCESS, CAPABILITY}'), ['PRODUCT', 'PROCESS', 'CAPABILITY']);
});

test('decomposeSpan — positive: an escaped-pipe list (table cell shape) decomposes to its members', () => {
  assert.deepEqual(decomposeSpan('legislative \\| process-product \\| project-product'), ['legislative', 'process-product', 'project-product']);
});

test('decomposeSpan — positive: a plain-pipe list (prose shape) decomposes to its members', () => {
  assert.deepEqual(decomposeSpan('legislative | process-product | project-product'), ['legislative', 'process-product', 'project-product']);
});

test('decomposeSpan — positive: a span with no delimiter is exactly one value', () => {
  assert.deepEqual(decomposeSpan('draft'), ['draft']);
});

test('parseVocabularyValueVocabularies — positive: reads values/spec/rule, tolerating a comment and blank line, and null spec/rule', () => {
  const text = `
value_vocabularies:

  # REQUIREMENT — elements/15-requirement.md
  REQUIREMENT.origin:
    values: [legislative, process-product, project-product]
    spec: notations/elements/15-requirement.md
    rule: REQ-004

  candidate.kind:
    values: [element, relation, assertion]
    spec: null
    rule: null

deferred:
  rule_codes: {}
`;
  const out = parseVocabularyValueVocabularies(text);
  assert.deepEqual([...out.keys()], ['REQUIREMENT.origin', 'candidate.kind']);
  assert.deepEqual(out.get('REQUIREMENT.origin'), {
    values: ['legislative', 'process-product', 'project-product'],
    spec: 'notations/elements/15-requirement.md',
    rule: 'REQ-004',
  });
  assert.deepEqual(out.get('candidate.kind'), { values: ['element', 'relation', 'assertion'], spec: null, rule: null });
});

test('parseVocabularyValueVocabularies — negative: a missing "value_vocabularies:" block throws', () => {
  assert.throws(() => parseVocabularyValueVocabularies('methodology_version: "3.1.0"\n'), /value_vocabularies/);
});

test('parseVocabularyValueVocabularies — negative: an unrecognised line inside the block throws', () => {
  const text = `
value_vocabularies:
  agreement:
    values: [draft, agreed, disputed]
    - not a recognised field line
`;
  assert.throws(() => parseVocabularyValueVocabularies(text), /unrecognised line/);
});

test('parseRuleRowValues — positive: a single escaped-pipe span (table shape) reads all values', () => {
  const text = '| `REQ-004` | error | `origin` is present but its value is not one of `legislative \\| process-product \\| project-product`. |';
  assert.deepEqual([...parseRuleRowValues(text, 'REQ-004')], ['legislative', 'process-product', 'project-product']);
});

test('parseRuleRowValues — positive: several single-value spans (comma-divided shape) read all values', () => {
  const text = '| `ASSERT-006` | error | `status` is not one of `compliant`, `partial`, `non_compliant`, `under_review`, `n_a`. |';
  assert.deepEqual([...parseRuleRowValues(text, 'ASSERT-006')], ['compliant', 'partial', 'non_compliant', 'under_review', 'n_a']);
});

test('parseRuleRowValues — positive: a brace-set span ("not in") reads all values', () => {
  const text = '| `ASSERT-003` | error | TYPE is not in `{PRODUCT, PROCESS, CAPABILITY}`. |';
  assert.deepEqual([...parseRuleRowValues(text, 'ASSERT-003')], ['PRODUCT', 'PROCESS', 'CAPABILITY']);
});

test('parseRuleRowValues — negative: no matching row returns null, not a throw', () => {
  assert.equal(parseRuleRowValues('| `OTHER-001` | error | something. |', 'REQ-004'), null);
});

test('parseRuleRowValues — negative: a matching row with no "not one of" / "not in" language throws', () => {
  const text = '| `REQ-004` | error | `origin` must be present. |';
  assert.throws(() => parseRuleRowValues(text, 'REQ-004'), /names no "not one of"/);
});
