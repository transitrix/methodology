// Minimal, purpose-built YAML for decisions.reviewed.yaml + reading the admission
// fields (admission_state, gate_checks, …) off the admission_state-bearing artefacts
// this CLI flips. Same discipline as ingest-cli / reg-intel-cli's own copies: zero
// dependencies, full control over output, NOT a general YAML library. Each CLI keeps
// its own copy by design (see @transitrix/ingest-cli's batch-path.mjs) — no
// cross-package runtime dependency.

// Trim, strip a trailing ` # comment`, unquote, and type bare null/true/false.
//
// A double-quoted scalar is unescaped via JSON.parse, not a bare slice(1,-1) —
// dump()'s scalar() always double-quotes via JSON.stringify, so a value with a
// backslash (a Windows absolute path — exactly what an ingest review-queue.yaml
// candidate's `ref` is, per map-in.mjs) comes out JSON-escaped (`\\`) on disk.
// Un-escaping it back is required for record/apply's item_ref round-trip to
// match: a slice-only unquote would leave the doubled backslashes in place, so
// the same path read back from decisions.reviewed.yaml would never again equal
// the literal path in review-queue.yaml, and the decision would look undecided
// forever.
function cleanScalar(raw) {
  if (raw === undefined || raw === null) return undefined;
  let s = String(raw).trim();
  const h = s.indexOf(' #');
  if (h >= 0) s = s.slice(0, h).trim();
  if (s === '') return undefined;
  if (s.startsWith('"') && s.endsWith('"')) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

// Read a single top-level scalar key (e.g. `admission_state: proposed`). Returns the
// typed value, or undefined when the key is absent or its value is a block/map.
export function readTopScalar(text, key) {
  if (typeof text !== 'string') return undefined;
  const re = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm');
  const m = text.match(re);
  if (!m) return undefined;
  return cleanScalar(m[1]);
}

// Read the immediate child scalars of a top-level block `key:` (e.g. `gate_checks:`).
// Returns a map of childKey -> typed value, or null when the block is absent.
export function readBlockScalars(text, key) {
  if (typeof text !== 'string') return null;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${key}:[ \\t]*(#.*)?$`).test(l));
  if (start < 0) return null;
  const out = {};
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (/^\S/.test(l)) break; // dedent back to a top-level key — block ended
    const m = l.match(/^[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m) out[m[1]] = cleanScalar(m[2]);
  }
  return out;
}

// Read a top-level list-of-maps `key:` (e.g. `decisions:`). Returns an array of flat
// objects (one per `- ` item; each item's scalar fields only — no nested sub-lists),
// except for any field named in `arrayKeys`, which is instead collected as a string
// array (e.g. review-queue.yaml's per-candidate `validation_flags: [...]`). Still not
// a general YAML parser — arrayKeys is for the one known list-of-scalars shape a
// caller needs, not arbitrary nesting.
export function readMapList(text, key, arrayKeys = []) {
  if (typeof text !== 'string') return [];
  const arraySet = new Set(arrayKeys);
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${key}:[ \\t]*(#.*)?$`).test(l));
  if (start < 0) return [];
  const items = [];
  let cur = null;
  let openArrayKey = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (/^\S/.test(l)) break;
    let m = l.match(/^[ \t]+-[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m) { cur = {}; cur[m[1]] = cleanScalar(m[2]); items.push(cur); openArrayKey = null; continue; }
    if (!cur) continue;
    const lm = l.match(/^[ \t]+-[ \t]+(.+)$/);
    if (lm && openArrayKey) { cur[openArrayKey].push(cleanScalar(lm[1])); continue; }
    m = l.match(/^[ \t]+([A-Za-z0-9_]+):[ \t]*$/);
    if (m && arraySet.has(m[1])) { cur[m[1]] = []; openArrayKey = m[1]; continue; }
    m = l.match(/^[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m) { cur[m[1]] = cleanScalar(m[2]); openArrayKey = null; }
  }
  return items;
}

// Read a nested shape: a top-level list `topKey:` of maps, each optionally carrying
// one or more list-of-maps sub-keys (e.g. review-digest.yaml's `sources: [{id,
// segments: [...], candidates: [...], amendments: [...]}]`). Returns an array of
// { ...topLevelScalars, [subKey]: [...] } — deliberately two levels deep, no further
// nesting, matching the one shape this CLI needs to read (review-digest.yaml).
export function readNestedList(text, topKey, subKeys) {
  if (typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${topKey}:[ \\t]*(#.*)?$`).test(l));
  if (start < 0) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\S/.test(lines[i])) { end = i; break; }
  }
  const block = lines.slice(start + 1, end);

  const items = [];
  let cur = null;
  let subKey = null; // which sub-list we're currently inside, if any
  const subKeySet = new Set(subKeys);

  for (const l of block) {
    if (l.trim() === '') continue;
    // A new top-level list item: exactly 2-space indent, "- key: val".
    let m = l.match(/^ {2}-[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m) {
      cur = {}; for (const sk of subKeys) cur[sk] = [];
      cur[m[1]] = cleanScalar(m[2]);
      items.push(cur);
      subKey = null;
      continue;
    }
    if (!cur) continue;
    // A sub-key block start: `  segments:` / `  candidates:` / `  amendments:` (4-space indent).
    m = l.match(/^ {4}([A-Za-z0-9_]+):[ \t]*(#.*)?$/);
    if (m && subKeySet.has(m[1])) { subKey = m[1]; continue; }
    // A scalar top-level field of the current item (4-space indent, has a value).
    m = l.match(/^ {4}([A-Za-z0-9_]+):[ \t]*(.+)$/);
    if (m && !subKeySet.has(m[1])) { cur[m[1]] = cleanScalar(m[2]); subKey = null; continue; }
    // A sub-list item: `    - id: ...` (6-space indent) inside the current sub-key.
    m = l.match(/^ {6}-[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m && subKey) {
      const item = {}; item[m[1]] = cleanScalar(m[2]);
      cur[subKey].push(item);
      continue;
    }
    // A further scalar field of the current sub-list item (8-space indent).
    m = l.match(/^ {8}([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m && subKey && cur[subKey].length) {
      cur[subKey][cur[subKey].length - 1][m[1]] = cleanScalar(m[2]);
    }
  }
  return items;
}

// ── Emission ─────────────────────────────────────────────────────
// Purpose-built dumper — strings double-quoted, numbers/booleans/null bare,
// block-style maps + lists, nested maps inside list items keep their indentation.
// Mirrors ingest-cli / reg-intel-cli's own emitters so all three CLIs produce
// consistent YAML.

function scalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  return JSON.stringify(String(v));
}

function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function dumpMap(obj, indent) {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === 'string' && v.includes('\n')) {
      lines.push(`${pad}${k}: |`);
      for (const ln of v.replace(/\n$/, '').split('\n')) lines.push(`${pad}  ${ln}`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${pad}${k}: []`); continue; }
      lines.push(`${pad}${k}:`);
      for (const item of v) {
        if (isPlainObject(item)) {
          const itemIndent = indent + 2;
          const sub = dumpMap(item, itemIndent);
          const childPad = '  '.repeat(itemIndent);
          lines.push(`${pad}  - ${sub[0].slice(childPad.length)}`);
          for (let i = 1; i < sub.length; i++) lines.push(sub[i]);
        } else {
          lines.push(`${pad}  - ${scalar(item)}`);
        }
      }
    } else if (isPlainObject(v)) {
      if (Object.keys(v).length === 0) { lines.push(`${pad}${k}: {}`); continue; }
      lines.push(`${pad}${k}:`);
      lines.push(...dumpMap(v, indent + 1));
    } else {
      lines.push(`${pad}${k}: ${scalar(v)}`);
    }
  }
  return lines;
}

export function dump(obj) {
  if (!isPlainObject(obj)) throw new Error('yaml.dump expects a plain object at the top level');
  return dumpMap(obj, 0).join('\n') + '\n';
}
