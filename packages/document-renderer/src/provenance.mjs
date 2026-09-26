// Read-only evidence comparison. Adapters own authorization and observation;
// matching recorded claims never establishes that generation consumed inputs.
import { createHash } from 'node:crypto';
import { parseRecipe } from './parse-recipe.mjs';

export const PROVENANCE_VERSION = 'document-provenance/1';
const kinds = new Set(['committed', 'index', 'working-tree', 'mixed']);
const digestPattern = /^[a-f0-9]{64}$/;
const token = (v) => typeof v === 'string' && v.length > 0 && v.length <= 512 ? v : null;
const digest = (v) => typeof v === 'string' && digestPattern.test(v) ? v : null;
const bytes = (v) => v instanceof Uint8Array ? v : null;
const sha = (v) => bytes(v) ? createHash('sha256').update(v).digest('hex') : null;
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ordered = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function result(checks) {
  checks.sort((a, b) => ordered(a.id, b.id));
  const coverage = Object.fromEntries(['consistent', 'inconsistent', 'unverifiable', 'not-applicable']
    .map((s) => [s, checks.filter((c) => c.status === s).length]));
  return {
    contract_version: PROVENANCE_VERSION,
    status: coverage.inconsistent ? 'inconsistent' : coverage.unverifiable ? 'incomplete' : 'consistent',
    incomplete: coverage.unverifiable > 0,
    coverage,
    checks,
  };
}

function unavailable(reason) {
  // Constant shape: never expose hidden identities, locations, or cardinality.
  return result([{
    id: 'evidence', scope: 'authorized-bundle', status: 'unverifiable', reason,
    expected: null, observed: null, evidence: [], basis: 'none',
  }]);
}

/**
 * Check one fully authorized evidence bundle. See ../PROVENANCE.md for the
 * versioned adapter contract. Neither callback may regenerate or write data.
 * No bundle is loaded unless authorize() resolves to exactly true.
 */
export async function checkDocumentProvenance({ authorize, load } = {}) {
  try {
    if (typeof authorize !== 'function' || await authorize() !== true) return unavailable('unavailable');
  } catch {
    return unavailable('unavailable');
  }
  try {
    if (typeof load !== 'function') return unavailable('unavailable');
    const bundle = await load();
    if (!object(bundle)) return unavailable('invalid-evidence');
    return checkBundle(bundle);
  } catch {
    // Exceptions can contain paths or parser excerpts; never forward them.
    return unavailable('invalid-evidence');
  }
}

function checkBundle(b) {
  const checks = [];
  const add = (id, scope, status, reason, expected = null, observed = null,
    evidence = [], basis = 'comparison') => checks.push({
    id, scope, status, reason, expected, observed, evidence, basis,
  });
  const compare = (id, scope, expected, observed, evidence) => add(id, scope,
    expected === null || observed === null ? 'unverifiable' : expected === observed ? 'consistent' : 'inconsistent',
    expected === null || observed === null ? 'missing-evidence' : expected === observed ? 'match' : 'mismatch',
    expected, observed, evidence);
  const claims = object(b.claims) ? b.claims : {};
  const obs = object(b.observed) ? b.observed : {};
  let run = {};
  if (bytes(b.run)) {
    try {
      const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b.run));
      if (object(parsed)) run = parsed;
    } catch { /* represented by run.record below */ }
  }
  const runValid = token(run.recipe_id) !== null && token(run.recipe_version) !== null
    && Array.isArray(run.slots);
  add('run.record', 'run', runValid ? 'consistent' : 'unverifiable',
    runValid ? 'readable-record' : 'missing-or-invalid-record', null, sha(b.run), ['run'], 'byte-observation');
  // Only these scalar claims are exposed; generated prose and slot inputs are
  // never copied into diagnostics. model_id retains its original meaning.
  add('run.model', 'generated-prose', 'unverifiable', 'recorded-claim-only',
    token(run.model_id), null, ['run'], 'recorded-claim');
  add('run.generation', 'input-consumption', 'unverifiable', 'generation-not-proven',
    null, null, ['run'], 'none');

  let recipe = null;
  if (bytes(b.recipe)) {
    const parsed = parseRecipe(new TextDecoder('utf-8', { fatal: true }).decode(b.recipe));
    if (!parsed.errors.some((e) => e.code === 'TTRS-001')) recipe = parsed.header;
  }
  compare('recipe.id', 'recipe', token(run.recipe_id), token(recipe?.recipe_id), ['run', 'recipe']);
  compare('recipe.edition', 'recipe', token(run.recipe_version), token(recipe?.recipe_version), ['run', 'recipe']);
  compare('recipe.source', 'recipe-bytes', digest(claims.recipe_sha256), sha(b.recipe), ['claims', 'recipe']);

  const snapshot = object(obs.snapshot) ? obs.snapshot : {};
  const kind = kinds.has(snapshot.kind) ? snapshot.kind : null;
  compare('repository.identity', 'repository', token(claims.repository_id), token(obs.repository_id), ['claims', 'adapter']);
  const repositoryMatches = token(claims.repository_id) !== null && claims.repository_id === obs.repository_id;
  compare('snapshot.kind', 'input-state', kinds.has(claims.input_kind) ? claims.input_kind : null, kind, ['claims', 'adapter']);
  // A commit can coexist with dirty bytes, but cannot identify those bytes.
  if (kind && kind !== 'committed') {
    add('repository.commit', 'snapshot', 'unverifiable', 'uncommitted-inputs',
      token(run.repository_commit), null, ['run', 'adapter']);
  } else {
    compare('repository.commit', 'snapshot', token(run.repository_commit),
      repositoryMatches && snapshot.available === true && kind === 'committed' ? token(snapshot.commit) : null,
      ['run', 'adapter']);
  }
  compare('snapshot.identity', 'actual-input-snapshot', token(claims.snapshot_id),
    repositoryMatches && snapshot.available === true && kind ? token(snapshot.id) : null, ['claims', 'adapter']);
  compare('selection.definition', 'selection', digest(claims.selection_sha256), digest(obs.selection_sha256), ['claims', 'adapter']);
  compare('selection.as-at', 'selection', token(run.render_date), token(obs.as_at), ['run', 'adapter']);
  compare('configuration.profile', 'renderer', token(run.profile), token(obs.profile), ['run', 'adapter']);

  for (const field of ['product_id', 'release_id', 'document_issue_id', 'document_revision']) {
    compare(`association.${field}`, 'explicit-association', token(claims[field]), token(obs[field]), ['claims', 'adapter']);
  }
  compare('association.release-product', 'release-membership', token(claims.product_id),
    token(obs.release_id) !== null && obs.release_id === claims.release_id ? token(obs.release_product_id) : null,
    ['claims', 'adapter']);

  compare('output.bytes', 'retained-output', digest(claims.output_sha256), sha(b.output), ['claims', 'output']);
  compare('output.run-binding', 'declared-output-run-link', digest(claims.output_run_sha256),
    sha(b.run), ['claims', 'run']);
  // Tool/rule/configuration and material external inputs have independent
  // collections. Canonical digests are computed here from retained bytes.
  for (const category of ['tools', 'rules', 'configuration', 'external']) {
    const expected = claims[category];
    const observed = obs[category];
    if (!Array.isArray(expected) || !Array.isArray(observed)) {
      add(`inputs.${category}`, category, 'unverifiable', 'missing-evidence');
      continue;
    }
    const names = new Set();
    const normalize = (items, readBytes) => items.map((item) => {
      if (!object(item) || !token(item.id) || names.has(item.id)) throw new Error('invalid');
      names.add(item.id);
      const hash = readBytes ? sha(item.bytes) : digest(item.sha256);
      if (!hash) throw new Error('invalid');
      return [item.id, hash];
    }).sort((a, z) => ordered(a[0], z[0]));
    try {
      const e = normalize(expected, false);
      names.clear();
      const o = normalize(observed, true);
      // Empty external inputs can be N/A only with a complete observed closure.
      if (!e.length && !o.length && category === 'external' && closureBound(obs, b, repositoryMatches)) {
        add(`inputs.${category}`, category, 'not-applicable', 'observed-empty-closure', null, null, ['adapter']);
      } else if (!e.length && !o.length) {
        add(`inputs.${category}`, category, 'unverifiable', 'empty-inventory');
      } else {
        compare(`inputs.${category}`, category, JSON.stringify(e), JSON.stringify(o), ['claims', 'adapter']);
      }
    } catch {
      add(`inputs.${category}`, category, 'unverifiable', 'invalid-or-missing-input-bytes');
    }
  }

  const bound = closureBound(obs, b, repositoryMatches);
  add('inputs.closure', 'generation-input-set', bound ? 'consistent' : 'unverifiable',
    bound ? 'adapter-observed-closure' : 'closure-not-proven', null, null,
    bound ? ['adapter', 'run'] : [], bound ? 'adapter-observation' : 'none');
  const changes = obs.changes;
  if (bound && object(changes) && changes.complete === true
    && changes.repository_id === obs.repository_id && changes.base_snapshot_id === snapshot.id
    && token(changes.target_snapshot_id) && Array.isArray(changes.ids) && changes.ids.every(token)) {
    const relevant = changes.ids.some((id) => obs.closure.input_ids.includes(id));
    add('changes.review', 'observed-input-closure', 'consistent',
      relevant ? 'relevant-change-review-needed' : 'no-relevant-change', null, relevant,
      ['adapter'], 'adapter-observation');
  } else {
    add('changes.review', 'observed-input-closure', 'unverifiable', 'comparison-or-closure-unavailable');
  }
  return result(checks);
}

function closureBound(obs, b, repositoryMatches) {
  const c = obs.closure;
  const s = obs.snapshot;
  return repositoryMatches && object(c) && object(s) && s.available === true && kinds.has(s.kind)
    && token(s.id) !== null && c.complete === true && digest(c.run_sha256) !== null
    && c.run_sha256 === sha(b.run) && c.snapshot_id === s.id
    && Array.isArray(c.input_ids) && c.input_ids.every(token);
}
