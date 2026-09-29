// Synthetic retained editions queried through the installed distribution.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildRunRecord, serializeRunRecord } from '../../document-renderer/src/run-record.mjs';
const installed = resolve(process.argv[2], 'node_modules/@transitrix/documents-cli');
const { queryIssuedDocuments } = await import(pathToFileURL(join(installed, 'src/queries.mjs')));
const { createEvent, localLoader } = await import(pathToFileURL(join(installed, 'src/register.mjs')));
const { hashBytes, issueHash } = await import(pathToFileURL(join(installed, 'src/events.mjs')));
const digest = b => hashBytes(b).slice(7);
const root = await mkdtemp(join(tmpdir(), 'documents-query-'));
const folder = join(root, 'documents');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = async (p, bytes) => { await mkdir(join(root, p, '..'), { recursive: true }); await writeFile(join(root, p), bytes); };
const save = message => { git('add', 'canon'); git('-c', 'user.name=Synthetic Test', '-c', 'user.email=synthetic@example.invalid', 'commit', '-qm', message); return git('rev-parse', 'HEAD'); };
const snapshot = async dir => {
  const files = {};
  async function walk(p, prefix = '') {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const key = prefix + e.name;
      if (e.isDirectory()) await walk(join(p, e.name), `${key}/`);
      else files[key] = hashBytes(await readFile(join(p, e.name)));
    }
  }
  await walk(dir); return files;
};
try {
  git('init', '-q');
  await put('canon/elements/REQ-14.yaml', 'id: REQ-14\nname: Synthetic retained content\n');
  await put('canon/elements/REQ-99.yaml', 'id: REQ-99\nname: Synthetic unrelated content\n');
  const base = save('Synthetic baseline');
  await put('canon/elements/REQ-14.yaml', 'id: REQ-14\nname: Synthetic relevant modification\n');
  const relevant = save('Synthetic relevant content');
  git('checkout', '-q', base);
  await put('canon/elements/REQ-99.yaml', 'id: REQ-99\nname: Synthetic unrelated modification\n');
  const unrelated = save('Synthetic unrelated content');
  git('checkout', '-q', base);
  await rename(join(root, 'canon/elements/REQ-14.yaml'), join(root, 'canon/elements/REQ-14-moved.yaml'));
  const moved = save('Synthetic move');
  await rm(join(root, 'canon/elements/REQ-14-moved.yaml'));
  const deleted = save('Synthetic deletion');
  git('checkout', '-q', base);
  const recipe = await readFile(new URL('../../document-renderer/tests/fixtures/product.mrd.ttrs', import.meta.url));
  const run = Buffer.from(serializeRunRecord(buildRunRecord({
    header: { recipe_id: 'product.mrd', recipe_version: '1.0' }, repositoryCommit: base,
    modelId: 'synthetic-prose-model', runTimestamp: '2026-07-10T09:00:00Z', renderDate: '2026-07-10', profile: 'strict',
    slotResults: [{ slotId: 'synthetic', question: 'Synthetic', inputs: ['REQ-14'], sufficient: true,
      verdict: 'sufficient', text: 'Synthetic', attributions: ['REQ-14'] }],
  })));
  const output = Buffer.from('Synthetic retained RP-17 B; no real issuance');
  const baseline = { format: 'document-baseline/1', document: 'doc-rp17-b-1', edition: 'B',
    repository_id: 'synthetic-model', commit: base, run_sha256: digest(run), output_sha256: digest(output),
    product_id: 'PRODUCT-portal-1', release_id: 'RELEASE-portal-3.2' };
  await put('documents/evidence/run-b.json', run);
  await put('documents/evidence/baseline-b.json', JSON.stringify(baseline));
  const act = { package: 'documents', kind: 'issuance-event', id: 'issue-rp17-b-1', synthetic: true,
    document: baseline.document, edition: baseline.edition, issued_at: '2026-07-10T10:00:00Z',
    issuer: 'Synthetic Issuer', recipient: 'Synthetic Recipient',
    run_record: { uri: 'evidence/run-b.json', sha256: hashBytes(run) },
    baseline: { uri: 'evidence/baseline-b.json', sha256: hashBytes(Buffer.from(JSON.stringify(baseline))) },
    resource: { uri: 'resource://documents/rp17/b.pdf', sha256: hashBytes(output) } };
  await createEvent(folder, act);
  await createEvent(folder, { ...act, id: 'issue-rp17-b-2', recipient: 'Synthetic Second Recipient' });
  const input = Buffer.from('Synthetic tool/rule/configuration evidence');
  const claims = { repository_id: baseline.repository_id, input_kind: 'committed', snapshot_id: base,
    document_issue_id: act.document, document_revision: 'B', product_id: baseline.product_id, release_id: baseline.release_id,
    output_sha256: digest(output), output_run_sha256: digest(run), recipe_sha256: digest(recipe), selection_sha256: digest(input),
    tools: [{ id: 'synthetic-tool', sha256: digest(input) }], rules: [{ id: 'synthetic-rule', sha256: digest(input) }],
    configuration: [{ id: 'synthetic-config', sha256: digest(input) }], external: [] };
  // This synthetic observer witnessed a fixed-ID selection over the controlled
  // baseline. A dynamic query must include its membership dependencies instead.
  const observed = { repository_id: baseline.repository_id, snapshot: { kind: 'committed', id: base, available: true, commit: base },
    document_issue_id: act.document, document_revision: 'B', product_id: baseline.product_id, release_id: baseline.release_id,
    release_product_id: baseline.product_id, selection_sha256: digest(input), as_at: '2026-07-10', profile: 'strict',
    closure: { complete: true, run_sha256: digest(run), snapshot_id: base, input_ids: ['REQ-14'] },
    tools: [{ id: 'synthetic-tool', bytes: input }], rules: [{ id: 'synthetic-rule', bytes: input }],
    configuration: [{ id: 'synthetic-config', bytes: input }], external: [] };
  const bundle = { run, recipe, output, claims, observed };
  const options = { folder, repository: { root, id: baseline.repository_id }, authorize: async () => true,
    load: async ref => ref.uri === act.resource.uri ? output : localLoader(folder)(ref),
    observe: async () => bundle };
  const query = (q, extra = {}) => queryIssuedDocuments({ ...options, query: q, ...extra });
  const before = await snapshot(root);
  const originalBundle = structuredClone(bundle);
  let result = await query({ kind: 'document', id: act.document });
  assert.equal(result.status, 'incomplete'); // generation is never established
  assert.deepEqual(result.matches, ['issue-rp17-b-1', 'issue-rp17-b-2']);
  assert.equal(result.records[0].model.commit, base);
  assert.equal(result.records[0].model.repository_id, baseline.repository_id);
  assert.equal(result.records[0].model.generated_prose_model, 'synthetic-prose-model');
  assert.equal(result.records[0].model.release_id, baseline.release_id);
  assert.deepEqual(result.records[0].elements.attributions, ['REQ-14']);
  assert.equal(result.records[0].findings.length, 0, JSON.stringify(result));
  assert.deepEqual((await query({ kind: 'element', id: 'REQ-14' })).matches, result.matches);
  assert.deepEqual((await query({ kind: 'element', id: 'REQ-99' })).records.map(r => r.match), ['no', 'no']);
  for (const [name, target, expected] of [['relevant-content', relevant, 'review-needed'], ['unrelated-content', unrelated, 'no-relevant-change'],
    ['move', moved, 'review-needed'], ['deletion', deleted, 'review-needed']]) {
    result = await query({ kind: 'review', id: 'REQ-14', target });
    assert.deepEqual(result.records.map(r => r.review), [expected, expected], JSON.stringify(result));
    assert.equal(result.matches.length, expected === 'review-needed' ? 2 : 0);
    console.log(JSON.stringify({ case: name, status: result.status, review: expected, matches: result.matches }));
  }
  for (const [name, mutate, conflict] of [
    ['missing-closure', b => { delete b.observed.closure; }, false],
    ['partial-closure', b => { b.observed.closure.complete = false; }, false],
    ['missing-binding', b => { delete b.claims.output_run_sha256; }, false],
    ['wrong-document', b => { b.observed.document_issue_id = 'doc-other-1'; }, true],
    ['wrong-edition', b => { b.observed.document_revision = 'A'; }, true],
    ['wrong-release', b => { b.observed.release_id = 'RELEASE-portal-9'; }, true],
    ['substituted-run', b => { b.run = Buffer.from('{}'); }, true],
  ]) {
    const b = structuredClone(bundle); mutate(b);
    result = await query({ kind: 'review', id: 'REQ-14', target: relevant }, { observe: async () => b });
    assert.equal(result.status, conflict ? 'inconsistent' : 'incomplete', name);
    assert(result.records.every(r => r.review === 'unknown' && r.match === 'unknown'), name);
  }
  result = await query({ kind: 'review', id: 'REQ-14', target: '0'.repeat(40) });
  assert(result.records.every(r => r.review === 'unknown' && r.findings.some(f => f.reason === 'history-unavailable')));
  for (const unavailable of [act.baseline.uri, act.run_record.uri, act.resource.uri]) {
    result = await query({ kind: 'review', id: 'REQ-14', target: relevant },
      { load: async ref => ref.uri === unavailable ? null : options.load(ref) });
    assert.equal(result.status, 'incomplete');
    assert(result.records.every(r => r.review === 'unknown'));
  }
  result = await query({ kind: 'review', id: 'REQ-14', target: relevant },
    { load: async ref => ref.uri === act.baseline.uri ? Buffer.from('{}') : options.load(ref) });
  assert.equal(result.status, 'inconsistent');
  assert(result.records.every(r => r.review === 'unknown'));
  let loaded = false;
  result = await query({ kind: 'document', id: act.document }, { authorize: async () => false, load: async () => { loaded = true; } });
  assert.deepEqual(result, { status: 'incomplete', reason: 'unavailable', matches: [], records: [] });
  assert.equal(loaded, false);
  assert.deepEqual(await snapshot(root), before, 'queries must preserve Git, records and all retained bytes');
  assert.deepEqual(structuredClone(bundle), originalBundle, 'adapter input must not mutate');
  // Retained A is selected by its own identity; later actual reviews of A or B
  // remain independent external evidence and never select or mint an edition.
  const outputA = Buffer.from('Synthetic retained RP-17 A; original content');
  const baselineA = { ...baseline, document: 'doc-rp17-a-1', edition: 'A', output_sha256: digest(outputA) };
  delete baselineA.release_id; delete baselineA.product_id;
  await put('documents/evidence/baseline-a.json', JSON.stringify(baselineA));
  const actA = { ...act, id: 'issue-rp17-a-1', document: baselineA.document, edition: 'A', issued_at: '2026-04-10T10:00:00Z',
    baseline: { uri: 'evidence/baseline-a.json', sha256: hashBytes(Buffer.from(JSON.stringify(baselineA))) },
    resource: { uri: 'resource://documents/rp17/a.pdf', sha256: hashBytes(outputA) } };
  await createEvent(folder, actA);
  const bundleA = structuredClone(bundle);
  bundleA.output = outputA;
  for (const data of [bundleA.claims, bundleA.observed]) {
    data.document_issue_id = actA.document; data.document_revision = 'A';
    delete data.product_id; delete data.release_id; delete data.release_product_id;
  }
  bundleA.claims.output_sha256 = digest(outputA);
  const editions = { load: async ref => ref.uri === actA.resource.uri ? outputA : options.load(ref),
    observe: async row => row.document === actA.document ? bundleA : bundle };
  result = await query({ kind: 'document', id: actA.document }, editions);
  assert.deepEqual(result.matches, ['issue-rp17-a-1']);
  assert.equal(result.records[0].edition, 'A');
  assert.equal(result.records[0].findings.length, 0);
  const retainedEditions = await snapshot(folder);
  // These are synthetic external observations, not newly adopted review schema.
  await put('actual-reviews.json', JSON.stringify([
    { document: 'RP-17', edition: 'A', performed: '2026-04-20', outcome: 'unchanged' },
    { document: 'RP-17', edition: 'B', performed: '2027-04-20', outcome: 'unchanged' },
  ]));
  result = await query({ kind: 'document', id: act.document }, editions);
  assert.deepEqual(result.matches, ['issue-rp17-b-1', 'issue-rp17-b-2']);
  assert(result.records.every(r => r.edition === 'B' && r.model.release_id === baseline.release_id));
  assert.deepEqual(await snapshot(folder), retainedEditions, 'unchanged review must not rewrite A/B or create C');
  for (const malformed of ['null', '[]', '"unknown"']) {
    const badBytes = Buffer.from(malformed);
    const malformedAct = { ...act, baseline: { ...act.baseline, sha256: hashBytes(badBytes) } };
    malformedAct.issue_hash = issueHash(malformedAct);
    result = await query({ kind: 'document', id: act.document }, { load: async ref =>
      ref.uri === 'events/issue-rp17-b-1.yaml' ? Buffer.from(JSON.stringify(malformedAct)) :
        ref.uri === act.baseline.uri ? badBytes : options.load(ref) });
    assert.equal(result.records[0].status, 'incomplete');
    assert.equal(result.records[0].review, 'unknown');
  }
  // Persisted contradictions remain conflicts even when event hashes agree.
  const badBaseline = { ...baseline, edition: 'A' };
  await put('documents/evidence/baseline-b.json', JSON.stringify(badBaseline));
  const bad = { ...act, baseline: { ...act.baseline, sha256: hashBytes(Buffer.from(JSON.stringify(badBaseline))) } };
  bad.issue_hash = issueHash(bad);
  await put('documents/events/issue-rp17-b-1.yaml', JSON.stringify(bad));
  result = await query({ kind: 'document', id: act.document });
  assert.equal(result.records[0].status, 'inconsistent');
  assert(result.records[0].findings.some(f => f.reason === 'edition-conflict'));
  await put('documents/events/broken.yaml', 'package: [');
  result = await query({ kind: 'element', id: 'REQ-99' });
  assert(result.failures.length > 0);
  assert.notEqual(result.status, 'consistent');
  await rm(join(folder, 'events'), { recursive: true });
  assert.equal((await query({ kind: 'document', id: act.document })).reason, 'register-unavailable');
  console.log('PASS packed queries: reverse/forward; controlled Git content/move/deletion; missing/conflicting evidence; read-only bytes; authorization; explicit release/B binding');
} finally { await rm(root, { recursive: true, force: true }); }
