// Stored handoff acts and read-only evidence checks. No provider or DMS calls.
import { createHash } from 'node:crypto';

const map = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.trim().length > 0;
const digest = v => typeof v === 'string' && v.length === 71 && /^sha256:[a-f0-9]{64}$/.test(v);
export const hashBytes = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const fields = new Set(['package', 'kind', 'id', 'document', 'edition', 'issued_at', 'issuer', 'recipient',
  'run_record', 'baseline', 'resource', 'issue_hash', 'timestamp', 'synthetic']);

export function localPointer(uri) {
  return typeof uri === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(uri)
    && uri.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
function absoluteURI(uri) {
  if (!text(uri) || /[\s\\]/.test(uri) || /%(?![a-f0-9]{2})/i.test(uri)) return false;
  try { const u = new URL(uri); return !!u.protocol && !u.username && !u.password && uri.length > u.protocol.length; }
  catch { return false; }
}
const pointer = (v, external = false) => map(v) && Object.keys(v).every(k => ['uri', 'sha256'].includes(k))
  && digest(v.sha256) && (absoluteURI(v.uri) || (!external && localPointer(v.uri)));
const canonical = v => Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : map(v) ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
    : JSON.stringify(v);

// Timestamp evidence is excluded so a provider can bind to a precomputed act hash.
export function issueHash(row) {
  const { issue_hash, timestamp, ...act } = row;
  return hashBytes(canonical(act));
}

export function validateEvent(row, file = '') {
  const findings = [];
  const flag = (code, message) => findings.push({ code, severity: 'error', file, message });
  if (!map(row)) { flag('DOCS-EVENT', 'Expected an issuance-event mapping.'); return findings; }
  if (row.package !== 'documents' || row.kind !== 'issuance-event'
      || !text(row.id) || row.id.trim() !== row.id || !/^issue-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$/.test(row.id ?? '')
      || !text(row.document) || row.document.trim() !== row.document || !/^doc-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$/.test(row.document ?? '')
      || !['edition', 'issuer', 'recipient'].every(k => text(row[k]))) {
    flag('DOCS-EVENT', 'Required act: package, kind, issue ID, document ID, edition, issuer and recipient.');
  }
  const date = typeof row.issued_at === 'string' ? new Date(row.issued_at) : null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(row.issued_at ?? '')
      || !Number.isFinite(date?.getTime()) || date.toISOString() !== row.issued_at.replace('Z', '.000Z')) {
    flag('DOCS-EVENT', 'issued_at must be a real UTC second-precision timestamp.');
  }
  if (Object.keys(row).some(k => !fields.has(k)) || ('synthetic' in row && typeof row.synthetic !== 'boolean')) {
    flag('DOCS-EVENT', 'Unknown event field or non-boolean synthetic marker. Store derived facts in referenced evidence.');
  }
  for (const k of ['run_record', 'baseline', 'resource']) {
    if (!pointer(row[k], k === 'resource')) flag('DOCS-POINTER', `${k} requires uri and sha256; resource must be an absolute external URI.`);
  }
  if (!digest(row.issue_hash) || row.issue_hash !== issueHash(row)) flag('DOCS-HASH', 'issue_hash must match the canonical act and pointers.');
  if ('timestamp' in row) {
    const t = row.timestamp;
    const keys = ['format', 'issue_hash', 'token_base64', 'reference'];
    const hasToken = map(t) && Object.hasOwn(t, 'token_base64');
    const hasRef = map(t) && Object.hasOwn(t, 'reference');
    const validToken = hasToken && text(t.token_base64) && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(t.token_base64)
      && Buffer.from(t.token_base64, 'base64').toString('base64') === t.token_base64;
    if (!map(t) || Object.keys(t).some(k => !keys.includes(k)) || t.format !== 'rfc3161'
        || t.issue_hash !== row.issue_hash || !digest(t.issue_hash) || (!hasToken && !hasRef)
        || (hasToken && !validToken) || (hasRef && !pointer(t.reference))
        || (hasToken && hasRef && validToken && hashBytes(Buffer.from(t.token_base64, 'base64')) !== t.reference.sha256)) {
      flag('DOCS-TIMESTAMP', 'Expected external rfc3161 evidence bound to issue_hash: canonical base64 token and/or hashed reference, with matching bytes when both are supplied.');
    }
  }
  return findings;
}

// load receives a validated pointer and returns bytes or null. The CLI loads
// only retained local files; authorized adapters can supply external evidence.
export async function inspectEvent(row, { load = async () => null } = {}) {
  const findings = validateEvent(row);
  if (findings.length) return { status: 'invalid', findings, evidence: [], timestamp_trust: 'not-verified' };
  const evidence = [];
  for (const [name, ref] of [['run_record', row.run_record], ['baseline', row.baseline], ['resource', row.resource],
    ...(row.timestamp?.reference ? [['timestamp', row.timestamp.reference]] : [])]) {
    let bytes;
    try { bytes = await load(ref); } catch { bytes = null; }
    let status = bytes instanceof Uint8Array ? hashBytes(bytes) === ref.sha256 ? 'consistent' : 'conflict' : 'unavailable';
    let format;
    if (name === 'run_record' && status === 'consistent') {
      let run;
      try { run = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { /* unknown format */ }
      const flat = map(run) && text(run.recipe_id) && text(run.recipe_version) && Array.isArray(run.slots);
      const legacy = map(run?.recipe) && text(run.recipe.id) && text(run.recipe.version) && Array.isArray(run.slots);
      format = flat ? 'flat' : legacy ? 'legacy-nested' : 'unknown';
      for (const [flatKey, nested, key] of [['recipe_id', 'recipe', 'id'],
        ['recipe_version', 'recipe', 'version'], ['repository_commit', 'repository', 'commit']]) {
        if (map(run) && Object.hasOwn(run, flatKey) && map(run[nested])
            && Object.hasOwn(run[nested], key) && run[flatKey] !== run[nested][key]) status = 'conflict';
      }
      if (format === 'unknown' && status !== 'conflict') status = 'unavailable';
    }
    evidence.push({ name, status, ...(format ? { format } : {}) });
  }
  return { status: evidence.some(e => e.status === 'conflict') ? 'conflict'
    : evidence.some(e => e.status === 'unavailable') ? 'incomplete' : 'consistent', findings, evidence,
    timestamp_trust: row.timestamp ? 'not-verified' : 'not-supplied' };
}
