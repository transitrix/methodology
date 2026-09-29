// Synthetic handoff acceptance through the packed CLI and normal dispatch.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildRunRecord, serializeRunRecord } from '../../document-renderer/src/run-record.mjs';

const root = resolve(process.argv[2]);
const folder = join(root, 'documents');
const installed = join(root, 'node_modules/@transitrix/documents-cli');
const cli = join(installed, 'documents.mjs');
const { hashBytes, issueHash, inspectEvent, validateEvent } = await import(pathToFileURL(join(installed, 'src/events.mjs')));
const { createEvent, readEvent } = await import(pathToFileURL(join(installed, 'src/register.mjs')));
const dispatch = () => spawnSync(process.execPath, ['packages/ingest-cli/ingest.mjs', 'check-packages', root], { encoding: 'utf8' });
const run = Buffer.from(serializeRunRecord(buildRunRecord({
  header: { recipe_id: 'rp17', recipe_version: '1.0' }, repositoryCommit: 'synthetic-base-b',
  runTimestamp: '2026-07-10T09:00:00Z', renderDate: '2026-07-10', profile: 'strict', slotResults: [],
})));
const baseline = Buffer.from('Synthetic retained baseline-b; repository commit synthetic-base-b\n');
const output = Buffer.from('Synthetic RP-17 B output; no actual issuance or submission\n');
await mkdir(join(folder, 'evidence'));
await writeFile(join(folder, 'evidence/run-b.json'), run);
await writeFile(join(folder, 'evidence/baseline-b.txt'), baseline);
const act = {
  package: 'documents', kind: 'issuance-event', id: 'issue-rp17-b-1', synthetic: true,
  document: 'doc-rp17-b-1', edition: 'B', issued_at: '2026-07-10T10:00:00Z',
  issuer: 'Synthetic Issuer', recipient: 'Synthetic Recipient',
  run_record: { uri: 'evidence/run-b.json', sha256: hashBytes(run) },
  baseline: { uri: 'evidence/baseline-b.txt', sha256: hashBytes(baseline) },
  resource: { uri: 'resource://documents/rp17/b.pdf', sha256: hashBytes(output) },
};
const temp = await mkdtemp(join(tmpdir(), 'documents-events-'));
try {
  const outputPath = join(temp, 'b.pdf');
  await writeFile(outputPath, output);
  const input = join(temp, 'act.yaml');
  await writeFile(input, JSON.stringify(act));
  const receipt = JSON.parse(execFileSync(process.execPath, [cli, 'record', folder, input], { encoding: 'utf8' }));
  const row = receipt.row;
  assert.equal(receipt.status, 'incomplete');
  assert.equal(receipt.timestamp_trust, 'not-supplied');
  assert.deepEqual(receipt.evidence.map(e => e.status), ['consistent', 'consistent', 'unavailable']);
  assert.equal(receipt.evidence[0].format, 'flat');
  assert(!Object.hasOwn(row, 'timestamp'));
  const read = JSON.parse(execFileSync(process.execPath, [cli, 'read', folder, row.id], { encoding: 'utf8' }));
  assert.deepEqual(read.row, row);
  assert.equal(dispatch().status, 0);
  const historicalPath = join(folder, `events/${row.id}.yaml`);
  const historicalBytes = await readFile(historicalPath);
  await assert.rejects(createEvent(folder, act), /EEXIST/);
  assert.deepEqual(await readFile(historicalPath), historicalBytes);

  const retained = new Map([[row.run_record.uri, run], [row.baseline.uri, baseline], [row.resource.uri, output]]);
  const complete = await inspectEvent(row, { load: async ref => retained.get(ref.uri) });
  assert.equal(complete.status, 'consistent');
  // A structurally accepted synthetic token is not a trusted RFC 3161 assertion.
  const token = Buffer.from('Synthetic timestamp evidence, not a DER timestamp token');
  const second = { ...act, id: 'issue-rp17-b-2', recipient: 'Synthetic Second Recipient' };
  second.issue_hash = issueHash(second);
  second.timestamp = { format: 'rfc3161', issue_hash: second.issue_hash,
    token_base64: token.toString('base64'), reference: { uri: 'evidence/timestamp.tsr', sha256: hashBytes(token) } };
  await writeFile(join(folder, 'evidence/timestamp.tsr'), token);
  const supplied = await createEvent(folder, second);
  assert.equal(supplied.timestamp_trust, 'not-verified');
  assert.deepEqual(supplied.row.timestamp, second.timestamp);
  assert.deepEqual(await readFile(historicalPath), historicalBytes);
  assert.deepEqual(await readFile(outputPath), output);
  assert.deepEqual(await readFile(join(folder, act.run_record.uri)), run);
  assert.deepEqual(await readFile(join(folder, act.baseline.uri)), baseline);
  const externalToken = structuredClone(second);
  delete externalToken.timestamp.token_base64;
  externalToken.timestamp.reference.uri = 'https://example.invalid/synthetic.tsr';
  assert.equal((await inspectEvent(externalToken)).status, 'incomplete');
  assert.equal(validateEvent(externalToken).length, 0);
  const tokenOnly = structuredClone(second);
  delete tokenOnly.timestamp.reference;
  assert.equal(validateEvent(tokenOnly).length, 0);

  const cases = [];
  for (const key of ['document', 'edition', 'issued_at', 'issuer', 'recipient']) {
    cases.push(['DOCS-EVENT', `missing ${key}`, r => { delete r[key]; }]);
  }
  for (const key of ['run_record', 'baseline', 'resource']) {
    cases.push(['DOCS-POINTER', `missing ${key}`, r => { delete r[key]; }]);
    cases.push(['DOCS-POINTER', `malformed ${key}`, r => { r[key].uri = '../escape'; }]);
    cases.push(['DOCS-POINTER', `malformed ${key} hash`, r => { r[key].sha256 = 'sha256:abc'; }]);
  }
  for (const uri of ['https://example.invalid/bad uri', 'https://user:secret@example.invalid/file',
                     'https://example.invalid/%QQ', '/absolute/local', 'evidence//run.json', 'evidence/./run.json']) {
    cases.push(['DOCS-POINTER', 'malformed URI', r => { r.run_record.uri = uri; }]);
  }
  cases.push(
    ['DOCS-EVENT', 'invalid calendar date', r => { r.issued_at = '2026-02-30T10:00:00Z'; }],
    ['DOCS-EVENT', 'derived facts rejected', r => { r.elements_cited = ['GOAL-synthetic-1']; }],
    ['DOCS-TIMESTAMP', 'bad token', r => { r.timestamp = { format: 'rfc3161', issue_hash: r.issue_hash, token_base64: '?' }; }],
    ['DOCS-TIMESTAMP', 'conflicting association', r => { r.timestamp = { ...second.timestamp }; }],
    ['DOCS-TIMESTAMP', 'conflicting token/reference', r => { r.timestamp = { ...second.timestamp, issue_hash: r.issue_hash, token_base64: Buffer.from('other').toString('base64') }; }],
    ['DOCS-TIMESTAMP', 'empty evidence', r => { r.timestamp = { format: 'rfc3161', issue_hash: r.issue_hash }; }],
    ['DOCS-TIMESTAMP', 'malformed reference', r => { r.timestamp = { format: 'rfc3161', issue_hash: r.issue_hash, reference: { uri: 'bad uri', sha256: hashBytes(token) } }; }],
  );
  for (const [code, name, mutate] of cases) {
    const bad = structuredClone(row);
    mutate(bad);
    bad.issue_hash = issueHash(bad);
    await writeFile(historicalPath, JSON.stringify(bad));
    const result = dispatch();
    assert.equal(result.status, 1, `${name}: ${result.stdout}`);
    assert(result.stdout.includes(`${code} error events/${row.id}.yaml`), `${name}: ${result.stdout}`);
  }
  const ymlPath = join(folder, 'events/issue-legacy-file-1.yml');
  const yml = { ...act, id: 'issue-legacy-file-1' };
  yml.issue_hash = issueHash(yml);
  await writeFile(ymlPath, JSON.stringify(yml));
  assert.deepEqual((await readEvent(folder, yml.id)).row, yml);
  await assert.rejects(createEvent(folder, yml), /already exists/);
  await rm(ymlPath);
  const reordered = Object.fromEntries(Object.entries(row).reverse());
  assert.equal(issueHash(reordered), row.issue_hash);
  const invalidNew = { ...act, id: 'issue-invalid-1', issuer: '' };
  await assert.rejects(createEvent(folder, invalidNew), /DOCS-EVENT/);
  await assert.rejects(readFile(join(folder, 'events/issue-invalid-1.yaml')), /ENOENT/);
  await writeFile(historicalPath, historicalBytes);
  const duplicatePath = join(folder, 'events/issue-duplicate-1.yaml');
  await writeFile(duplicatePath, historicalBytes);
  assert.equal(dispatch().status, 1);
  assert.match(dispatch().stdout, /DOCS-002 error/);
  await rm(duplicatePath);
  await writeFile(join(folder, 'evidence/timestamp.tsr'), 'different token');
  assert.match(dispatch().stdout, /timestamp: conflict/);
  await writeFile(join(folder, 'evidence/timestamp.tsr'), token);
  const tampered = { ...row, recipient: 'Synthetic Tamper' };
  await writeFile(historicalPath, JSON.stringify(tampered));
  assert.match(dispatch().stdout, /DOCS-HASH error/);
  await writeFile(historicalPath, historicalBytes);
  await writeFile(join(folder, act.run_record.uri), 'Changed run bytes');
  assert.equal(dispatch().status, 1);
  assert.match(dispatch().stdout, /run_record: conflict/);
  await writeFile(join(folder, act.run_record.uri), run);
  await rm(join(folder, act.baseline.uri));
  const missing = await readEvent(folder, row.id);
  assert.equal(missing.evidence.find(e => e.name === 'baseline').status, 'unavailable');
  assert.equal(dispatch().status, 0);
  await writeFile(join(folder, act.baseline.uri), baseline);

  const inspectRun = async value => {
    const bytes = Buffer.from(JSON.stringify(value));
    const r = structuredClone(row);
    r.run_record.sha256 = hashBytes(bytes);
    r.issue_hash = issueHash(r);
    return inspectEvent(r, { load: async ref => ref.uri === r.run_record.uri ? bytes : retained.get(ref.uri) });
  };
  const flat = JSON.parse(run);
  const legacy = { recipe: { id: flat.recipe_id, version: flat.recipe_version }, repository: { commit: flat.repository_commit }, slots: [] };
  assert.equal((await inspectRun(legacy)).evidence[0].format, 'legacy-nested');
  assert.equal((await inspectRun({})).status, 'incomplete');
  assert.equal((await inspectRun({ ...flat, ...legacy, recipe: { id: 'conflict', version: '1.0' } })).status, 'conflict');
  assert.equal((await inspectRun({ ...flat, repository: { commit: 'other' } })).status, 'conflict');
  assert.equal((await inspectRun({ ...flat, recipe: { version: 'other' } })).status, 'conflict');
  assert.equal((await inspectRun({ repository_commit: 'one', repository: { commit: 'two' } })).status, 'conflict');
  const denied = await inspectEvent(row, { load: async () => { throw new Error('unavailable'); } });
  assert.equal(denied.status, 'incomplete');
  const outside = join(temp, 'outside.json');
  await writeFile(outside, run);
  await symlink(outside, join(folder, 'evidence/outside.json'));
  const escaped = { ...act, id: 'issue-symlink-1', run_record: { uri: 'evidence/outside.json', sha256: hashBytes(run) } };
  const escapedReport = await createEvent(folder, escaped);
  assert.equal(escapedReport.evidence[0].status, 'unavailable');
  await rm(join(folder, 'events/issue-symlink-1.yaml'));
  await rm(join(folder, 'evidence/outside.json'));
  assert.equal(dispatch().status, 0);
  assert.deepEqual(await readFile(historicalPath), historicalBytes);
  assert.deepEqual(await readFile(outputPath), output);
  assert.deepEqual(await readFile(join(folder, act.run_record.uri)), run);
  assert.deepEqual(await readFile(join(folder, act.baseline.uri)), baseline);
  console.log(`PASS issuance: ${cases.length} dispatched invalid acts/pointers/timestamps; hash/byte conflicts fail; missing evidence explicit; legacy and unknown runs; no external fetch; history retained`);
  console.log(`SYNTHETIC HANDOFF RECEIPT ${JSON.stringify({ ...receipt, supplied_bundle: complete.status, supplied_timestamp: supplied.timestamp_trust })}`);
} finally { await rm(temp, { recursive: true, force: true }); }
