// Closed-vocabulary loader — reads `notations/vocabulary.yaml`, the single
// source of truth for the element TYPE registry, the relation `type` enum, the
// closed value vocabularies, and the validation rule codes.
//
// SOURCE OF TRUTH: notations/vocabulary.yaml. Nothing in this package may hold
// a literal copy of a closed set — derive it from here. scripts/check-notations.mjs
// cross-checks a spec table against the artefact (VOC1, element_types vs
// ELEMENT_PRIMITIVES.md §4, implemented); VOC2 (relation_types), VOC3
// (value_vocabularies), and VOC4 (rule_codes) are the same idea, not yet built.
// The Markdown specs are never parsed to recover a set — only, eventually, to
// verify their prose still agrees with it.
//
// FAILS CLOSED. Missing file, unparseable content, a shape that does not match
// what a consumer needs, or a `methodology_version` that does not match the pin
// in notations/CURRENT_VERSION.yaml are all thrown errors — never a built-in
// fallback, never a silent pass. Loading is synchronous and happens at module
// init in the consumers, so a broken artefact fails the process immediately
// rather than surfacing as a mysteriously empty enum much later.
//
// The YAML read here is a deliberately narrow subset — block maps, flow lists of
// bare scalars, `>-` folded blocks, and comments — matching exactly what the
// artefact uses. A real YAML parser reading the same file produces the same
// result; the subset exists so this package keeps zero dependencies. Anything
// outside the subset is an error, not a best-effort guess.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// packages/ingest-cli/src → repo root
const REPO_ROOT = resolve(HERE, '..', '..', '..');
export const VOCABULARY_PATH = join(REPO_ROOT, 'notations', 'vocabulary.yaml');
export const VERSION_PIN_PATH = join(REPO_ROOT, 'notations', 'CURRENT_VERSION.yaml');

class VocabularyError extends Error {
  constructor(message) {
    super(`vocabulary: ${message}`);
    this.name = 'VocabularyError';
  }
}

// --- the narrow YAML subset ------------------------------------------------

// Strip a trailing `# …` comment that starts outside a quoted string.
function stripComment(s) {
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) {
      return s.slice(0, i);
    }
  }
  return s;
}

function scalar(raw, lineNo) {
  const v = raw.trim();
  if (v === '' ) return null;
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
      (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) {
    return v.slice(1, -1);
  }
  if (/^-?\d+$/.test(v)) return Number(v);
  if (v.startsWith('[') || v.startsWith('{') || v.startsWith('&') || v.startsWith('*')) {
    throw new VocabularyError(`line ${lineNo}: unsupported YAML construct \`${v}\``);
  }
  return v;
}

function flowList(raw, lineNo) {
  const inner = raw.trim().slice(1, -1).trim();
  if (inner === '') return [];
  return inner.split(',').map(part => {
    const item = scalar(part, lineNo);
    if (item === null || typeof item === 'object') {
      throw new VocabularyError(`line ${lineNo}: flow list item must be a scalar`);
    }
    return item;
  });
}

// Parse the artefact's subset into a plain object. Pure — no I/O, so a caller
// (and the test suite) can hand it deliberately corrupted text.
export function parseVocabulary(text) {
  if (typeof text !== 'string') throw new VocabularyError('input is not a string');

  const lines = text.split(/\r?\n/);
  const root = {};
  // Stack of open containers, innermost last. Each frame owns one indent level.
  const stack = [{ indent: -2, value: root }];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const rawLine = lines[i];
    if (/^\s*$/.test(rawLine)) continue;
    if (/^\s*#/.test(rawLine)) continue;

    const line = stripComment(rawLine).replace(/\s+$/, '');
    if (/^\s*$/.test(line)) continue;

    const indent = line.length - line.trimStart().length;
    if (indent % 2 !== 0) throw new VocabularyError(`line ${lineNo}: indent is not a multiple of 2`);

    const body = line.trimStart();
    const m = body.match(/^([A-Za-z_][A-Za-z0-9_.-]*):(?:\s+(.*))?$/);
    if (!m) throw new VocabularyError(`line ${lineNo}: not a \`key:\` or \`key: value\` line — \`${body}\``);
    const [, key, rest] = m;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];
    if (indent !== parent.indent + 2) {
      throw new VocabularyError(`line ${lineNo}: unexpected indent ${indent} under \`${key}\``);
    }
    if (Object.prototype.hasOwnProperty.call(parent.value, key)) {
      throw new VocabularyError(`line ${lineNo}: duplicate key \`${key}\``);
    }

    if (rest === undefined || rest === '') {
      // `key:` — opens a nested map.
      const child = {};
      parent.value[key] = child;
      stack.push({ indent, value: child });
      continue;
    }

    if (rest === '>-' || rest === '>' || rest === '|' || rest === '|-') {
      // Folded / literal block scalar: consume the more-indented lines that follow.
      const sep = rest.startsWith('>') ? ' ' : '\n';
      const parts = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (/^\s*$/.test(lines[j])) { parts.push(''); continue; }
        const ind = lines[j].length - lines[j].trimStart().length;
        if (ind <= indent) break;
        parts.push(lines[j].slice(indent + 2));
      }
      i = j - 1;
      parent.value[key] = parts.join(sep).trim();
      continue;
    }

    if (rest.startsWith('[')) {
      if (!rest.endsWith(']')) throw new VocabularyError(`line ${lineNo}: unterminated flow list`);
      parent.value[key] = flowList(rest, lineNo);
      continue;
    }

    parent.value[key] = scalar(rest, lineNo);
  }

  return root;
}

// --- shape validation ------------------------------------------------------

const MODES = new Set(['standalone', 'contained', 'view-defined']);

function requireMap(v, what) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new VocabularyError(`${what} is missing or not a map`);
  }
  return v;
}

function validate(voc) {
  requireMap(voc, 'document');

  if (typeof voc.methodology_version !== 'string' || voc.methodology_version === '') {
    throw new VocabularyError('methodology_version is missing or not a string');
  }

  const elements = requireMap(voc.element_types, 'element_types');
  if (Object.keys(elements).length === 0) throw new VocabularyError('element_types is empty');
  for (const [type, e] of Object.entries(elements)) {
    requireMap(e, `element_types.${type}`);
    if (!MODES.has(e.mode)) {
      throw new VocabularyError(`element_types.${type}.mode must be one of ${[...MODES].join('|')} (got ${JSON.stringify(e.mode)})`);
    }
    if (e.layer !== null && typeof e.layer !== 'string') {
      throw new VocabularyError(`element_types.${type}.layer must be a string or null`);
    }
    if (e.folder !== null && typeof e.folder !== 'string') {
      throw new VocabularyError(`element_types.${type}.folder must be a string or null`);
    }
    if (typeof e.promotable !== 'boolean') {
      throw new VocabularyError(`element_types.${type}.promotable must be a boolean`);
    }
  }

  const depElements = requireMap(voc.deprecated_element_types, 'deprecated_element_types');
  for (const [type, e] of Object.entries(depElements)) {
    requireMap(e, `deprecated_element_types.${type}`);
    if (!elements[e.replaced_by]) {
      throw new VocabularyError(`deprecated_element_types.${type}.replaced_by \`${e.replaced_by}\` is not a live element TYPE`);
    }
  }

  const relations = requireMap(voc.relation_types, 'relation_types');
  if (Object.keys(relations).length === 0) throw new VocabularyError('relation_types is empty');
  for (const [kind, r] of Object.entries(relations)) {
    requireMap(r, `relation_types.${kind}`);
    for (const side of ['from', 'to']) {
      if (!Array.isArray(r[side]) || r[side].length === 0) {
        throw new VocabularyError(`relation_types.${kind}.${side} must be a non-empty list of element TYPEs`);
      }
      for (const t of r[side]) {
        if (!elements[t]) {
          throw new VocabularyError(`relation_types.${kind}.${side} names \`${t}\`, which is not a live element TYPE`);
        }
      }
    }
  }

  const depRelations = requireMap(voc.deprecated_relation_types, 'deprecated_relation_types');
  for (const [kind, r] of Object.entries(depRelations)) {
    requireMap(r, `deprecated_relation_types.${kind}`);
    if (!relations[r.replaced_by]) {
      throw new VocabularyError(`deprecated_relation_types.${kind}.replaced_by \`${r.replaced_by}\` is not a live relation kind`);
    }
  }

  const vocabs = requireMap(voc.value_vocabularies, 'value_vocabularies');
  if (Object.keys(vocabs).length === 0) throw new VocabularyError('value_vocabularies is empty');
  for (const [name, entry] of Object.entries(vocabs)) {
    requireMap(entry, `value_vocabularies.${name}`);
    if (!Array.isArray(entry.values) || entry.values.length === 0) {
      throw new VocabularyError(`value_vocabularies.${name}.values must be a non-empty list`);
    }
    if (entry.spec !== null && typeof entry.spec !== 'string') {
      throw new VocabularyError(`value_vocabularies.${name}.spec must be a string or null`);
    }
    if (entry.rule !== null && typeof entry.rule !== 'string') {
      throw new VocabularyError(`value_vocabularies.${name}.rule must be a string or null`);
    }
  }

  const severities = new Set((vocabs['rule.severity'] || {}).values || []);
  if (severities.size === 0) throw new VocabularyError('value_vocabularies["rule.severity"] is missing');

  const rules = requireMap(voc.rule_codes, 'rule_codes');
  if (Object.keys(rules).length === 0) throw new VocabularyError('rule_codes is empty');
  for (const [code, r] of Object.entries(rules)) {
    requireMap(r, `rule_codes.${code}`);
    if (!severities.has(r.severity)) {
      throw new VocabularyError(`rule_codes.${code}.severity \`${r.severity}\` is not in value_vocabularies["rule.severity"]`);
    }
    if (typeof r.spec !== 'string' || r.spec === '') {
      throw new VocabularyError(`rule_codes.${code}.spec is missing`);
    }
  }

  requireMap(voc.deferred, 'deferred');

  return voc;
}

// --- loading ---------------------------------------------------------------

function readPin(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new VocabularyError(`version pin not readable at ${path}`);
  }
  const m = text.match(/^methodology_version:\s*"?([^"\s#]+)"?/m);
  if (!m) throw new VocabularyError(`version pin not found in ${path}`);
  return m[1];
}

let cached = null;

// Load, parse, validate, and version-check the artefact. Throws on any failure.
// `opts.path` / `opts.pinPath` override the defaults (used by the tests);
// caching applies only to the default paths.
export function loadVocabulary(opts = {}) {
  const path = opts.path || VOCABULARY_PATH;
  const pinPath = opts.pinPath || VERSION_PIN_PATH;
  const isDefault = path === VOCABULARY_PATH && pinPath === VERSION_PIN_PATH;
  if (isDefault && cached) return cached;

  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new VocabularyError(
      `artefact not found at ${path}. It ships with the methodology release; ` +
      `a consumer that cannot read it must fail rather than fall back to a built-in set.`
    );
  }

  const voc = validate(parseVocabulary(text));

  const pin = readPin(pinPath);
  if (voc.methodology_version !== pin) {
    throw new VocabularyError(
      `methodology_version "${voc.methodology_version}" ≠ pin "${pin}" (${pinPath}). ` +
      `The artefact must carry the version of the release it ships in.`
    );
  }

  const frozen = Object.freeze(voc);
  if (isDefault) cached = frozen;
  return frozen;
}

// --- derived views (what the consumers actually want) ----------------------

// TYPE → { type, mode, layer, folder, promotable, deprecated?, replacedBy? }.
// A deprecated alias resolves to its replacement's placement so existing files
// keep landing in the right folder through the alias window.
export function elementPlacement(voc = loadVocabulary()) {
  const out = {};
  for (const [type, e] of Object.entries(voc.element_types)) {
    out[type] = {
      type,
      mode: e.mode,
      layer: e.layer,
      folder: e.folder,
      promotable: e.promotable,
    };
  }
  for (const [type, d] of Object.entries(voc.deprecated_element_types)) {
    const target = voc.element_types[d.replaced_by];
    out[type] = {
      type,
      mode: target.mode,
      layer: target.layer,
      folder: target.folder,
      promotable: target.promotable,
      deprecated: true,
      replacedBy: d.replaced_by,
    };
  }
  return out;
}

// Every accepted relation `type` value — live kinds plus deprecated aliases.
export function relationKinds(voc = loadVocabulary()) {
  return new Set([
    ...Object.keys(voc.relation_types),
    ...Object.keys(voc.deprecated_relation_types),
  ]);
}

// A closed value vocabulary by name, as a Set. Throws when the name is not a
// closed vocabulary — a typo must not silently produce an empty (allow-nothing
// or allow-everything) set at the call site.
export function valueSet(name, voc = loadVocabulary()) {
  const entry = voc.value_vocabularies[name];
  if (!entry) throw new VocabularyError(`no closed value vocabulary named \`${name}\``);
  return new Set(entry.values);
}

export { VocabularyError };
