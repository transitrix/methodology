#!/usr/bin/env node
// Read-only postcheck for the 1.0 → 2.0 recipe. Inline authoring and
// projection are both valid; this is not a whole-model notation validator.
// Requires Node >= 20, Python 3 and PyYAML (also used by tools/lint.py).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith('--')) {
  console.error('Usage: node validate.mjs <adopter-root>');
  process.exit(2);
}
const root = resolve(args[0]);
let errors = 0;
let warnings = 0;
const fail = (file, message) => {
  console.error(`ERROR ${relative(root, file)}: ${message}`);
  errors++;
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const has = (value, key) => Object.hasOwn(value, key);

// Parse YAML rather than treating comments, descriptions or inline definitions
// as projection references. SafeLoader supports block/flow forms and aliases;
// reject duplicate keys instead of silently discarding authored data.
const parser = String.raw`
import json, sys, yaml
class Loader(yaml.SafeLoader):
    pass
def mapping(loader, node, deep=False):
    keys = set()
    for key_node, _ in node.value:
        if key_node.tag == 'tag:yaml.org,2002:merge':
            continue
        key = loader.construct_object(key_node, deep=deep)
        if key in keys:
            raise ValueError('duplicate mapping key: ' + str(key))
        keys.add(key)
    loader.flatten_mapping(node)
    return yaml.SafeLoader.construct_mapping(loader, node, deep=deep)
Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
results = []
for source in json.load(sys.stdin):
    try:
        value = yaml.load(source, Loader=Loader)
        # Serialize each document here so cyclic aliases fail per file, too.
        results.append({'value': json.loads(json.dumps(value, default=str, allow_nan=False))})
    except Exception as error:
        results.append({'error': str(error)})
json.dump(results, sys.stdout)
`;
function parse(sources) {
  const result = spawnSync('python3', ['-c', parser], {
    input: JSON.stringify(sources), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error('YAML parsing unavailable. Install Python 3 and PyYAML; ensure python3 is on PATH.');
  }
  return JSON.parse(result.stdout);
}
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.isFile() && /\.(goals|action)\.transitrix\.yaml$/.test(entry.name) ? [path] : [];
  });
}
const elements = new Map();
function resolves(id, kind) {
  if (!text(id) || !new RegExp(`^${kind.toUpperCase()}-(?:[A-Za-z0-9]+-)*[1-9][0-9]*$`).test(id)) return false;
  const layer = kind === 'goal' ? '01_motivation' : '05_implementation';
  const path = join(root, 'canon', 'elements', layer, `${kind}s`, `${id}.yaml`);
  if (!elements.has(path)) {
    let value;
    try { value = parse([readFileSync(path, 'utf8')])[0].value; } catch { /* unresolved */ }
    elements.set(path, object(value) && value.id === id && value.notation === kind);
  }
  return elements.get(path);
}
function reference(file, id, kind, field, local = new Set()) {
  if (!text(id) || (!local.has(id) && !resolves(id, kind))) {
    fail(file, `${field}: ${JSON.stringify(id)} does not resolve to a ${kind}.`);
  }
}
function inline(file, entries, kind) {
  if (!Array.isArray(entries)) { fail(file, `${kind}s must be an array.`); return; }
  const ids = new Set();
  for (const entry of entries) {
    if (!object(entry) || !text(entry.id) || !text(entry.name)) {
      fail(file, `Each inline ${kind} requires non-empty id and name strings.`);
      continue;
    }
    if (ids.has(entry.id)) fail(file, `Duplicate inline ${kind} id ${entry.id}.`);
    ids.add(entry.id);
    if (kind === 'goal' && (!text(entry.type) || !Number.isInteger(entry.level) || entry.level < 0)) {
      fail(file, `${entry.id}: a goal requires type and a non-negative integer level.`);
    }
  }
  for (const entry of entries.filter(object)) {
    if (entry.parent != null) reference(file, entry.parent, kind, 'parent', ids);
    if (kind === 'action' && has(entry, 'predecessors')) {
      if (!Array.isArray(entry.predecessors)) fail(file, 'predecessors must be an array.');
      else for (const id of entry.predecessors) reference(file, id, kind, 'predecessors', ids);
    }
  }
}
function validate(file, doc) {
  if (!object(doc)) { fail(file, 'Expected a YAML mapping.'); return; }
  const kind = file.endsWith('.goals.transitrix.yaml') ? 'goal' : 'action';
  const key = `${kind}s`;
  if (!has(doc, 'methodology_version')) {
    console.warn(`WARN ${relative(root, file)}: missing methodology_version; check the adopter manifest pin.`);
    warnings++;
  }
  if (doc.notation !== (kind === 'goal' ? 'goals' : 'action')) fail(file, 'Unexpected or missing notation.');
  if (kind === 'action' && has(doc, 'activities')) fail(file, 'Rename deprecated activities to actions before the 2.0 boundary.');
  if (has(doc, key)) inline(file, doc[key], kind);
  if (has(doc, 'project') && !object(doc.project)) fail(file, 'project must be a mapping.');
  if (!has(doc, 'view_config')) return; // Includes the unfiltered catalogue projection.
  const config = doc.view_config;
  if (!object(config)) { fail(file, 'view_config must be a mapping.'); return; }
  if (has(doc, key) || (kind === 'action' && has(doc, 'project'))) {
    fail(file, `Inline ${key}${kind === 'action' ? '/project' : ''} and view_config are mutually exclusive.`);
  }
  if (kind === 'goal' && has(doc, 'goal_types') && has(config, 'goal_types')) {
    fail(file, 'goal_types and view_config.goal_types are mutually exclusive.');
  }
  if (!has(config, 'scope')) return;
  const scope = config.scope;
  if (!object(scope)) { fail(file, 'view_config.scope must be a mapping.'); return; }
  const field = `root_${kind}`;
  if (scope[field] != null) reference(file, scope[field], kind, `view_config.scope.${field}`);
  if (kind === 'action' && has(scope, 'goals')) {
    if (!Array.isArray(scope.goals)) fail(file, 'view_config.scope.goals must be an array.');
    else for (const id of scope.goals) reference(file, id, 'goal', 'view_config.scope.goals');
  }
}
try {
  if (!statSync(root).isDirectory()) throw new Error('Target must be a directory.');
  const files = walk(root);
  const docs = files.length ? parse(files.map(file => readFileSync(file, 'utf8'))) : [];
  docs.forEach((doc, i) => {
    if (doc.error) fail(files[i], `Invalid YAML: ${doc.error}`);
    else validate(files[i], doc.value);
  });
  console.log(`Checked ${files.length} view file(s): ${errors} error(s), ${warnings} warning(s).`);
  console.log('Run the notation and whole-model validators separately for full schema, scheduling and admission checks.');
  process.exitCode = errors ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
