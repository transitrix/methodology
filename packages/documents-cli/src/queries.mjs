// Read-only register enumeration with explicit retained bindings and Git evidence.
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hashBytes, inspectEvent } from './events.mjs';
import { localLoader, parseRecord } from './register.mjs';

const map = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.length > 0;
const oid = v => typeof v === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(v);
const hash = bytes => hashBytes(bytes).slice(7);
const unknown = reason => ({ status: 'incomplete', reason, matches: [], records: [] });
const json = bytes => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
function git(root, ...args) {
  return execFileSync('git', ['--no-optional-locks', '-C', root, ...args],
    { env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1' }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 });
}
function commit(root, value) {
  if (!oid(value) || git(root, 'rev-parse', '--verify', `${value}^{commit}`).trim() !== value) throw new Error('history unavailable');
  return value;
}
function tree(root, revision) {
  const result = new Map();
  for (const line of git(root, 'ls-tree', '-rz', '--full-tree', revision).split('\0').filter(Boolean)) {
    const tab = line.indexOf('\t');
    const meta = line.slice(0, tab), path = line.slice(tab + 1);
    const [mode, kind, object] = meta.split(' ');
    if (!path || kind !== 'blob' || !['100644', '100755'].includes(mode)) throw new Error('unsupported tree entry');
    result.set(path, object);
  }
  return result;
}
// Compare complete trees, including both sides of moves and deletions. No
// rename heuristic, timestamp, shallow-log walk or current working-tree read.
function changes(root, base, target) {
  const before = tree(root, base), after = tree(root, target);
  const ids = new Set();
  const files = [];
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    if (before.get(path) === after.get(path)) continue;
    files.push({ path, kind: !before.has(path) ? 'added' : !after.has(path) ? 'deleted' : 'modified' });
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) ids.add(`path:${parts.slice(0, i).join('/')}`);
    if (!path.startsWith('canon/elements/') || !/\.ya?ml$/.test(path)) continue;
    for (const object of [before.get(path), after.get(path)].filter(Boolean)) {
      const value = parseRecord(git(root, 'cat-file', 'blob', object));
      if (!text(value?.id)) throw new Error('element identity unavailable');
      ids.add(value.id);
    }
  }
  return { ids: [...ids].sort(), files };
}

/**
 * authorize covers the entire selected register, Git repository and observations.
 * observe(row) supplies independent, retained provenance adapter observations;
 * it must not manufacture closure from run citations. See ../README.md.
 */
export async function queryIssuedDocuments({ folder, repository, query, authorize, observe,
  load = localLoader(folder) } = {}) {
  try { if (await authorize?.() !== true) return unknown('unavailable'); }
  catch { return unknown('unavailable'); }
  if (!query || !['document', 'element', 'review'].includes(query.kind)
      || !text(query.id) || !text(repository?.id) || !text(repository?.root)) return unknown('invalid-query');
  const retained = new Map();
  const safeLoad = async ref => {
    if (!retained.has(ref.uri)) {
      let bytes;
      try { bytes = await load(ref); } catch { /* unavailable */ }
      retained.set(ref.uri, bytes instanceof Uint8Array ? Buffer.from(bytes) : null);
    }
    return retained.get(ref.uri);
  };
  let checker;
  try { ({ checkDocumentProvenance: checker } = await import('@transitrix/document-renderer/src/provenance.mjs')); }
  catch { return unknown('provenance-checker-unavailable'); }
  let entries;
  try { entries = await readdir(resolve(folder, 'events'), { withFileTypes: true }); }
  catch { return unknown('register-unavailable'); }
  const records = [], failures = [], seen = new Set();
  for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    if (!/\.ya?ml$/.test(entry.name)) continue;
    let row;
    try {
      if (!entry.isFile()) throw new Error('not a record');
      row = parseRecord(await safeLoad({ uri: `events/${entry.name}` }));
      if (!map(row)) throw new Error('invalid record');
      if (entry.name.replace(/\.ya?ml$/, '') !== row.id || seen.has(row.id)) {
        failures.push({ file: entry.name, status: 'inconsistent', reason: 'invalid-or-duplicate-identity' });
        continue;
      }
      seen.add(row.id);
    } catch { failures.push({ file: entry.name, status: 'incomplete', reason: 'record-unreadable-or-duplicate' }); continue; }
    // Validate before filtering: malformed rows cannot silently disappear.
    const event = await inspectEvent(row, { load: safeLoad });
    if (event.status === 'invalid') { failures.push({ file: entry.name, status: 'inconsistent', reason: 'invalid-event' }); continue; }
    if (query.kind === 'document' && row.document !== query.id) continue;
    const r = { event_id: row.id, document: row.document, edition: row.edition,
      synthetic: row.synthetic === true, status: 'incomplete', review: 'unknown', match: 'unknown',
      baseline: row.baseline, run_record: row.run_record, resource: row.resource,
      evidence: event, findings: [] };
    records.push(r);
    const conflict = reason => r.findings.push({ status: 'inconsistent', reason });
    const missing = reason => r.findings.push({ status: 'incomplete', reason });
    if (event.status === 'conflict') conflict('retained-bytes-conflict');
    if (event.status === 'incomplete') missing('retained-bytes-unavailable');
    let run, baseline, bundle;
    const runBytes = await safeLoad(row.run_record), baselineBytes = await safeLoad(row.baseline);
    try { run = json(runBytes); if (!map(run)) throw new Error('invalid run'); } catch { missing('run-unavailable'); }
    try { baseline = json(baselineBytes); if (!map(baseline)) throw new Error('invalid baseline'); } catch { missing('baseline-unavailable'); }
    try { bundle = structuredClone(await observe?.(structuredClone(row))); } catch { /* missing observation */ }
    const b = map(baseline) ? baseline : {};
    const c = map(bundle?.claims) ? bundle.claims : {}, o = map(bundle?.observed) ? bundle.observed : {};
    const compare = (a, z, reason) => {
      if (!text(a) || !text(z)) missing(`${reason}-unavailable`);
      else if (a !== z) conflict(`${reason}-conflict`);
    };
    if (b.format !== 'document-baseline/1') missing('baseline-format-unavailable');
    for (const [a, z, name] of [
      [b.document, row.document, 'document'], [b.edition, row.edition, 'edition'],
      [b.repository_id, repository.id, 'repository'], [b.commit, run?.repository_commit, 'run-baseline'],
      [b.run_sha256, row.run_record.sha256.slice(7), 'run-binding'],
      [b.output_sha256, row.resource.sha256.slice(7), 'output-binding'],
      [c.repository_id, b.repository_id, 'claimed-repository'], [o.repository_id, b.repository_id, 'observed-repository'],
      [c.document_issue_id, row.document, 'claimed-document'], [o.document_issue_id, row.document, 'observed-document'],
      [c.document_revision, row.edition, 'claimed-edition'], [o.document_revision, row.edition, 'observed-edition'],
      [c.output_run_sha256, b.run_sha256, 'claimed-run'], [c.output_sha256, b.output_sha256, 'claimed-output'],
      [o.snapshot?.commit, b.commit, 'observed-commit'], [o.snapshot?.id, b.commit, 'observed-snapshot'],
      [c.snapshot_id, b.commit, 'claimed-snapshot'],
    ]) compare(a, z, name);
    for (const field of ['release_id', 'product_id']) {
      if (field in b || field in c || field in o) {
        compare(b[field], c[field], `claimed-${field}`);
        compare(b[field], o[field], `observed-${field}`);
      }
    }
    if (o.snapshot?.kind !== 'committed' || c.input_kind !== 'committed' || o.snapshot?.available !== true) missing('committed-observation-unavailable');
    if (bundle?.run instanceof Uint8Array && runBytes instanceof Uint8Array
        && hash(bundle.run) !== hash(runBytes)) conflict('observer-run-conflict');
    // The register's retained bytes, never a substituted adapter run/output.
    const output = await safeLoad(row.resource);
    if (bundle?.output instanceof Uint8Array && output instanceof Uint8Array
        && hash(bundle.output) !== hash(output)) conflict('observer-output-conflict');
    const closure = o.closure;
    const bound = closure?.complete === true && closure.run_sha256 === b.run_sha256
      && closure.snapshot_id === b.commit && Array.isArray(closure.input_ids)
      && closure.input_ids.every(text) && new Set(closure.input_ids).size === closure.input_ids.length;
    if (!bound) missing('closure-unavailable');
    let diff;
    try {
      commit(repository.root, b.commit);
      tree(repository.root, b.commit); // prove full retained tree availability for reverse lookup too
      if (query.kind === 'review') diff = changes(repository.root, b.commit, commit(repository.root, query.target));
    } catch { missing('history-unavailable'); }
    const observed = { ...o };
    delete observed.changes; // callers cannot substitute an unexecuted comparison
    if (diff) observed.changes = { complete: true, repository_id: repository.id,
      base_snapshot_id: b.commit, target_snapshot_id: query.target, ids: diff.ids };
    const provenance = await checker({ authorize: async () => true,
      load: async () => ({ ...bundle, run: runBytes, output, observed }) });
    r.provenance = provenance;
    if (provenance.status === 'inconsistent') conflict('provenance-conflict');
    r.model = { repository_id: b.repository_id ?? null, commit: b.commit ?? null,
      generated_prose_model: run?.model_id ?? null, release_id: b.release_id ?? null, product_id: b.product_id ?? null };
    r.recipe = { id: run?.recipe_id ?? null, version: run?.recipe_version ?? null };
    r.elements = { inputs: bound ? [...closure.input_ids] : null,
      attributions: Array.isArray(run?.slots) ? run.slots.flatMap(s => Array.isArray(s?.attributions) ? s.attributions : []) : null };
    if (diff) r.changes = diff;
    const usable = r.findings.length === 0;
    r.status = r.findings.some(f => f.status === 'inconsistent') ? 'inconsistent'
      : !usable || provenance.status === 'incomplete' ? 'incomplete' : 'consistent';
    if (query.kind === 'document') r.match = 'yes';
    else if (usable) r.match = closure.input_ids.includes(query.id) ? 'yes' : 'no';
    if (query.kind === 'review' && usable && diff) {
      const check = provenance.checks.find(x => x.id === 'changes.review');
      if (check?.status === 'consistent') r.review = check.reason === 'relevant-change-review-needed' ? 'review-needed' : 'no-relevant-change';
      // The selected element must actually change; all inputs still contribute
      // to the per-document review result, without date/latest inference.
      r.match = closure.input_ids.includes(query.id) && diff.ids.includes(query.id) ? 'yes' : 'no';
    }
  }
  const inconsistent = [...records, ...failures].some(r => r.status === 'inconsistent');
  return { status: inconsistent ? 'inconsistent' : 'incomplete',
    reason: inconsistent ? 'evidence-conflict' : failures.length ? 'register-incomplete'
      : records.length ? 'generation-not-proven' : 'no-retained-match',
    matches: records.filter(r => r.match === 'yes').map(r => r.event_id), records, failures };
}
