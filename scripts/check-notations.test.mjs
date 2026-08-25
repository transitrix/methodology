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
  findDocumentSourceFailures,
  deriveDeprecationFailures,
  parseVocabularyElementTypes,
  parseElementPrimitivesTable,
  parseVocabularyRelationTypes,
  parseRelationsEnumTable,
  decomposeSpan,
  parseVocabularyValueVocabularies,
  parseRuleRowValues,
  parseVocabularyRuleCodes,
  parseVocabularyDeferredRuleCodes,
  parseIdTypeRegistry,
  validateIdToken,
  findIdCandidates,
  findLayerEnumerationGroups,
  parseMarkdownTables,
  findSizeCeilingWarnings,
  parsePresetTable,
  derivePresetMembershipFindings,
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

// --- VOC4: vocabulary.yaml rule_codes vs the codes specs actually use ------

test('parseVocabularyRuleCodes — positive: reads severity/spec, tolerating a comment and blank line', () => {
  const text = `
rule_codes:

  # ACT — views/diagrams/07-action.md
  ACT-001:
    severity: error
    spec: notations/views/diagrams/07-action.md

  BOBJ-D001:
    severity: warning
    spec: notations/ELEMENT_PRIMITIVES.md
`;
  const out = parseVocabularyRuleCodes(text);
  assert.deepEqual([...out.keys()], ['ACT-001', 'BOBJ-D001']);
  assert.deepEqual(out.get('ACT-001'), { severity: 'error', spec: 'notations/views/diagrams/07-action.md' });
  assert.deepEqual(out.get('BOBJ-D001'), { severity: 'warning', spec: 'notations/ELEMENT_PRIMITIVES.md' });
});

test('parseVocabularyRuleCodes — negative: a missing "rule_codes:" block throws', () => {
  assert.throws(() => parseVocabularyRuleCodes('methodology_version: "3.2.0"\n'), /rule_codes/);
});

test('parseVocabularyRuleCodes — negative: an unrecognised line inside the block throws', () => {
  const text = `
rule_codes:
  ACT-001:
    severity: error
    - not a recognised field line
`;
  assert.throws(() => parseVocabularyRuleCodes(text), /unrecognised line/);
});

test('parseVocabularyDeferredRuleCodes — positive: reads review_by, tolerating the folded "reason:" prose', () => {
  const text = `
deferred:
  rule_codes:
    COMPIMP-010:
      review_by: "2026-11-07"
      reason: >-
        views/reports/21-compliance-impact.md numbers two distinct rules
        COMPIMP-010 at two severities.

rule_codes:
  ACT-001:
    severity: error
    spec: notations/views/diagrams/07-action.md
`;
  const out = parseVocabularyDeferredRuleCodes(text);
  assert.deepEqual([...out.keys()], ['COMPIMP-010']);
  assert.deepEqual(out.get('COMPIMP-010'), { reviewBy: '2026-11-07' });
});

test('parseVocabularyDeferredRuleCodes — positive: no "deferred:" block returns an empty Map', () => {
  const out = parseVocabularyDeferredRuleCodes('rule_codes:\n  ACT-001:\n    severity: error\n    spec: x\n');
  assert.equal(out.size, 0);
});

test('parseVocabularyDeferredRuleCodes — negative: an unrecognised line inside the block throws', () => {
  const text = `
deferred:
  rule_codes:
    - not a recognised entry line
`;
  assert.throws(() => parseVocabularyDeferredRuleCodes(text), /unrecognised line/);
});

test('parseVocabularyDeferredRuleCodes — negative: an entry with no review_by throws', () => {
  const text = `
deferred:
  rule_codes:
    COMPIMP-010:
      reason: >-
        no review_by given.
`;
  assert.throws(() => parseVocabularyDeferredRuleCodes(text), /no review_by date/);
});

test('findDocumentSourceFailures — positive: a canonical document source passes clean', () => {
  const failures = findDocumentSourceFailures(['templates/product.mrd.ttrs']);
  assert.deepEqual(failures, []);
});

test('findDocumentSourceFailures — negative: a .trs file is named as the near-miss, in words', () => {
  const failures = findDocumentSourceFailures(['templates/product.mrd.trs']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'T1');
  // The point of the check: it must say ".ttrs" and say why ".trs" is wrong,
  // rather than surfacing as an unrecognised-file error.
  assert.match(failures[0].message, /\.ttrs/);
  assert.match(failures[0].message, /one keystroke away/);
});

test('findDocumentSourceFailures — negative: a .ttrs file with no kind segment is flagged', () => {
  const failures = findDocumentSourceFailures(['templates/product.ttrs']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'T1');
  assert.match(failures[0].message, /<basename>\.<kind>\.ttrs/);
});

test('findDocumentSourceFailures — negative: an upper-case kind segment is flagged', () => {
  const failures = findDocumentSourceFailures(['templates/product.MRD.ttrs']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].check, 'T1');
});

test('findDocumentSourceFailures — unrelated files are untouched', () => {
  const failures = findDocumentSourceFailures([
    'notations/CONTRACT.md',
    'notations/examples/bpmn/order.bpmn.transitrix.yaml',
    'packages/document-renderer/src/pass1.mjs',
  ]);
  assert.deepEqual(failures, []);
});

// --- ID1: example-ID grammar ------------------------------------------------

test('parseIdTypeRegistry — positive: reads every TYPE prefix from §3, across subsections', () => {
  const text = `
intro

## 3. TYPE registry

### 3.1 Element types

| \`GOAL\` | a goal |
| \`ACTION\` | a work package |

### 3.2 Other types

| \`REL\` | a relation |

## 4. Next section

| \`NOT_REGISTERED\` | should not be read |
`;
  const out = parseIdTypeRegistry(text);
  assert.deepEqual([...out].sort(), ['ACTION', 'GOAL', 'REL']);
});

test('parseIdTypeRegistry — negative: a missing "## 3. TYPE registry" heading throws', () => {
  assert.throws(() => parseIdTypeRegistry('# Some doc\n\nno registry here\n'), /TYPE registry/);
});

test('parseIdTypeRegistry — negative: a section with no parseable rows throws', () => {
  const text = `
## 3. TYPE registry

Prose only, no table rows.

## 4. Next
`;
  assert.throws(() => parseIdTypeRegistry(text), /parsed empty/);
});

test('validateIdToken — positive: a plain TYPE-id with no leading zeros is valid', () => {
  assert.deepEqual(validateIdToken('GOAL-CUST-1'), { valid: true });
});

test('validateIdToken — positive: a CAPABILITY V/H diagram address is valid', () => {
  assert.deepEqual(validateIdToken('CAPABILITY-V1.2'), { valid: true });
});

test('validateIdToken — negative: a leading-zero terminal segment is invalid', () => {
  const result = validateIdToken('ROLE-OPS-001');
  assert.equal(result.valid, false);
  assert.match(result.reason, /positive integer with no leading zeros/);
});

test('validateIdToken — negative: a non-numeric terminal segment is invalid', () => {
  const result = validateIdToken('GOAL-XYZ');
  assert.equal(result.valid, false);
  assert.match(result.reason, /positive integer with no leading zeros/);
});

test('validateIdToken — negative: a malformed CAPABILITY address is invalid', () => {
  const result = validateIdToken('CAPABILITY-V01');
  assert.equal(result.valid, false);
  assert.match(result.reason, /V\/H diagram-address form/);
});

test('validateIdToken — positive: underscore in TYPE is valid', () => {
  assert.deepEqual(validateIdToken('PROCESS_BLUEPRINT-FULFIL-1'), { valid: true });
});

test('validateIdToken — positive: hyphen-separated middle segments are valid', () => {
  assert.deepEqual(validateIdToken('LAW-PERSONAL-DATA-1'), { valid: true });
});

test('validateIdToken — negative: underscore in a middle segment is invalid', () => {
  const result = validateIdToken('LAW-PERSONAL_DATA-1');
  assert.equal(result.valid, false);
  assert.match(result.reason, /underscore is TYPE-only/);
});

test('findIdCandidates — positive: a backtick span outside a fence is scanned', () => {
  const out = findIdCandidates('See `GOAL-CUST-1` for the target.');
  assert.deepEqual(out, [{ token: 'GOAL-CUST-1', line: 1 }]);
});

test('findIdCandidates — positive: a fenced code block line is scanned whole, not just backtick spans', () => {
  const text = '```yaml\nowner_role: ROLE-OPS-001\n```\n';
  const out = findIdCandidates(text);
  assert.deepEqual(out, [{ token: 'ROLE-OPS-001', line: 2 }]);
});

test('findIdCandidates — negative: prose outside a backtick span is not scanned', () => {
  const out = findIdCandidates('GOAL-CUST-1 with no backticks around it.');
  assert.deepEqual(out, []);
});

test('findIdCandidates — negative: an angle-bracket placeholder is excluded', () => {
  const out = findIdCandidates('`<STEP-id>` is a placeholder.');
  assert.deepEqual(out, []);
});

test('findIdCandidates — negative: a family-prefix ellipsis marker is excluded', () => {
  const out = findIdCandidates('`GOAL-…` refers to any goal id.');
  assert.deepEqual(out, []);
});

// --- LAYER1: layer/folder enumeration ---------------------------------------

test('findLayerEnumerationGroups — positive: three or more distinct folders in a fence form a group', () => {
  const text = '```\ncanon/elements/\n  01_motivation/\n  02_business/\n  03_application/\n```\n';
  const groups = findLayerEnumerationGroups(text);
  assert.equal(groups.length, 1);
  assert.deepEqual([...groups[0].folders].sort(), ['01_motivation', '02_business', '03_application']);
});

test('findLayerEnumerationGroups — negative: fewer than three distinct folders is not a group', () => {
  const text = '```\n01_motivation/\n02_business/\n```\n';
  assert.deepEqual(findLayerEnumerationGroups(text), []);
});

test('findLayerEnumerationGroups — negative: folders outside a fence are ignored', () => {
  const text = '01_motivation/, 02_business/, 03_application/ are all layers.';
  assert.deepEqual(findLayerEnumerationGroups(text), []);
});

test('findLayerEnumerationGroups — negative: a table row citing several folders on one line is not a tree entry', () => {
  const text = '```\n| 01_motivation/ | 02_business/ | 03_application/ |\n```\n';
  assert.deepEqual(findLayerEnumerationGroups(text), []);
});

// --- DUALHOME1: no dual-home tables ------------------------------------------

test('parseMarkdownTables — positive: reads a header/separator/data table into rows with a 1-based startLine', () => {
  const text = 'intro\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n';
  const tables = parseMarkdownTables(text);
  assert.equal(tables.length, 1);
  assert.equal(tables[0].startLine, 3);
  assert.deepEqual(tables[0].rows, ['| 1 | 2 |', '| 3 | 4 |']);
});

test('parseMarkdownTables — negative: text with no separator row is not read as a table', () => {
  assert.deepEqual(parseMarkdownTables('| A | B |\nnot a separator row\n'), []);
});

// --- SIZE1: per-file soft ceiling (warn-only) --------------------------------

test('findSizeCeilingWarnings — positive: a short file with few sections warns not at all', () => {
  const text = '## One\n\ntext\n\n## Two\n\ntext\n';
  assert.deepEqual(findSizeCeilingWarnings(text, 'method/00-x.md'), []);
});

test('findSizeCeilingWarnings — negative: over 250 lines warns', () => {
  const text = Array.from({ length: 251 }, (_, i) => `line ${i}`).join('\n');
  const warnings = findSizeCeilingWarnings(text, 'method/00-x.md');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].check, 'SIZE1');
  assert.match(warnings[0].message, /251 lines/);
});

test('findSizeCeilingWarnings — negative: more than nine "##" sections warns', () => {
  const text = Array.from({ length: 10 }, (_, i) => `## Section ${i}`).join('\n\n');
  const warnings = findSizeCeilingWarnings(text, 'method/00-x.md');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].check, 'SIZE1');
  assert.match(warnings[0].message, /10 "##" sections/);
});

// --- PRESETS1: shipped coverage presets vs COVERAGE_PROFILES.md --------------

// §3-shaped: three columns, membership in the third. §3.1-shaped: two columns,
// membership in the second. Both carry a `full` row stated as a sentinel.
const PRESET_SPEC_FIXTURE = `
## 3. Shipped presets

| Preset | Intent | Element TYPEs (in scope) |
|---|---|---|
| **\`minimal\`** | Bare chain. | 01_motivation: \`DRIVER\`, \`GOAL\` · 05_implementation: \`ACTION\` |
| **\`full\`** | Everything. | Every TYPE in [\`IDS_AND_REFERENCES.md\`](IDS_AND_REFERENCES.md) §3.1. |

### 3.1 Per-preset relation allowlists

| Preset | Allowed relation kinds (per \`from\` layer) |
|---|---|
| **\`minimal\`** | 01_motivation: \`goal_parent\` · 05_implementation: \`action_goal\` |
| **\`full\`** | Every relation kind in [\`elements/17-relations.md\`](elements/17-relations.md) §3. |

## 4. Custom profiles
`;

test('parsePresetTable — positive: reads the §3 element table, its layers, and the sentinel row', () => {
  const table = parsePresetTable(PRESET_SPEC_FIXTURE, '## 3. Shipped presets', 2);
  assert.deepEqual([...table.keys()].sort(), ['full', 'minimal']);
  assert.equal(table.get('minimal').sentinel, false);
  assert.deepEqual(table.get('minimal').layers.get('01_motivation'), ['DRIVER', 'GOAL']);
  assert.deepEqual(table.get('minimal').layers.get('05_implementation'), ['ACTION']);
  assert.equal(table.get('full').sentinel, true, '"Every TYPE in …" is the sentinel, not an enumeration');
});

test('parsePresetTable — positive: reads the §3.1 relation table from its own column index', () => {
  const table = parsePresetTable(PRESET_SPEC_FIXTURE, '### 3.1 Per-preset relation allowlists', 1);
  assert.deepEqual(table.get('minimal').layers.get('01_motivation'), ['goal_parent']);
  assert.deepEqual(table.get('minimal').layers.get('05_implementation'), ['action_goal']);
  assert.equal(table.get('full').sentinel, true);
});

test('parsePresetTable — positive: stops at the next heading and does not read the following section', () => {
  const table = parsePresetTable(PRESET_SPEC_FIXTURE, '## 3. Shipped presets', 2);
  // §3.1's rows sit after the next heading; reading them here would put a
  // relation kind in the element table.
  assert.equal(table.get('minimal').layers.get('01_motivation').includes('goal_parent'), false);
});

test('parsePresetTable — negative: a missing section heading throws', () => {
  assert.throws(() => parsePresetTable('# nothing here\n', '## 3. Shipped presets', 2), /not found/);
});

test('parsePresetTable — negative: a membership segment with no layer prefix throws', () => {
  const text = '\n## 3. Shipped presets\n\n| P | I | E |\n|---|---|---|\n| **`minimal`** | x | `DRIVER`, `GOAL` |\n';
  assert.throws(() => parsePresetTable(text, '## 3. Shipped presets', 2), /unparseable segment/);
});

test('parsePresetTable — negative: a layer named with no code-span values throws', () => {
  const text = '\n## 3. Shipped presets\n\n| P | I | E |\n|---|---|---|\n| **`minimal`** | x | 01_motivation: DRIVER |\n';
  assert.throws(() => parsePresetTable(text, '## 3. Shipped presets', 2), /no code-span values/);
});

test('parsePresetTable — negative: a section with no preset rows throws rather than passing empty', () => {
  const text = '\n## 3. Shipped presets\n\nProse only, no table.\n';
  assert.throws(() => parsePresetTable(text, '## 3. Shipped presets', 2), /parsed empty/);
});

// --- derivePresetMembershipFindings -----------------------------------------

const specEl = () => parsePresetTable(PRESET_SPEC_FIXTURE, '## 3. Shipped presets', 2);
const specRel = () => parsePresetTable(PRESET_SPEC_FIXTURE, '### 3.1 Per-preset relation allowlists', 1);

const AGREEING_MODULE = {
  minimal: {
    elements: { '01_motivation': ['DRIVER', 'GOAL'], '05_implementation': ['ACTION'] },
    relations: { '01_motivation': ['goal_parent'], '05_implementation': ['action_goal'] },
  },
  full: 'ALL',
};

test('derivePresetMembershipFindings — positive: agreeing module and spec yield no findings', () => {
  assert.deepEqual(derivePresetMembershipFindings(AGREEING_MODULE, specEl(), specRel()), []);
});

test('derivePresetMembershipFindings — positive: reordering within a layer is presentational, not drift', () => {
  const reordered = structuredClone(AGREEING_MODULE);
  reordered.minimal.elements['01_motivation'] = ['GOAL', 'DRIVER'];
  assert.deepEqual(derivePresetMembershipFindings(reordered, specEl(), specRel()), []);
});

test('derivePresetMembershipFindings — negative: a TYPE the spec states but the module omits is flagged', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  drifted.minimal.elements['01_motivation'] = ['DRIVER'];
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /missing from the module: GOAL/);
  assert.match(findings[0], /§3/);
});

test('derivePresetMembershipFindings — negative: a TYPE only the module carries is flagged', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  drifted.minimal.elements['01_motivation'] = ['DRIVER', 'GOAL', 'CAPABILITY'];
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /present only in the module: CAPABILITY/);
});

test('derivePresetMembershipFindings — negative: a relation-kind drift is reported against §3.1', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  drifted.minimal.relations['05_implementation'] = ['action_goal', 'depends_on'];
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /relations in 05_implementation/);
  assert.match(findings[0], /§3\.1/);
  assert.match(findings[0], /present only in the module: depends_on/);
});

test('derivePresetMembershipFindings — negative: a whole layer only one side names is flagged', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  drifted.minimal.elements['02_business'] = ['CAPABILITY'];
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /02_business/);
});

test('derivePresetMembershipFindings — negative: turning the "everything" sentinel into an allowlist is flagged', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  drifted.full = { elements: { '01_motivation': ['DRIVER'] }, relations: {} };
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /sentinel/);
});

test('derivePresetMembershipFindings — negative: a preset the spec ships but the CLI cannot resolve is flagged', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  delete drifted.minimal;
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /cannot resolve/);
});

test('derivePresetMembershipFindings — negative: a module preset with no spec row is flagged', () => {
  const drifted = structuredClone(AGREEING_MODULE);
  drifted.compliance = { elements: { '01_motivation': ['REQUIREMENT'] }, relations: {} };
  const findings = derivePresetMembershipFindings(drifted, specEl(), specRel());
  assert.equal(findings.length, 1);
  assert.match(findings[0], /no matching row/);
});
