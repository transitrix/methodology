// Minimal, purpose-built YAML — just enough to emit the constrained shapes this
// CLI produces (field artefacts, candidates, review queues) and to read a few
// top-level scalars from an adopter manifest. NOT a general YAML library; we keep
// zero dependencies and full control over the output.
//
// Emission rules:
//   - strings are double-quoted (JSON-escaped) so no value is ever ambiguous
//     (dates, IDs, enums, free text all stay unambiguous and round-trip);
//   - multi-line strings use a literal block scalar (`key: |`);
//   - numbers / booleans / null are bare;
//   - maps and lists are block style; empty list is `[]`, empty map is `{}`.

function scalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  return JSON.stringify(String(v)); // double-quoted, escaped, single line
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Returns an array of lines (no trailing newline) for a mapping value.
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
          // Render the item one list-level deep so its keys (and any NESTED maps) keep
          // their relative indentation; the first key shares the "- " marker. Earlier
          // this trimStart()ed every sub-line and re-padded flat, which collapsed a
          // nested object inside a list item — fine for scalar-only items, wrong once
          // an item carries a sub-map (e.g. a candidate's `placement`).
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

// Read a top-level list of single-line strings. Accept block sequences with a
// consistent space indent (including zero), plain/quoted items, and empty [].
// Missing keys return []; malformed or unsupported values throw so consumers
// cannot mistake a partial alias index for a complete one. This is not a YAML
// document validator: unrelated keys are outside this reader's scope.
export function readTopList(text, key) {
  if (typeof text !== 'string') throw new TypeError('readTopList expects YAML text');
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const fail = () => { throw new Error(`Unsupported YAML list for ${key}; use a block sequence of single-line strings or []`); };
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyPattern = new RegExp(`^(?:${escapedKey}|"${escapedKey}"|'${escapedKey}')[ \\t]*:`);
  const headers = lines.flatMap((line, i) => keyPattern.test(line) ? [i] : []);
  if (headers.length === 0) return [];
  if (headers.length !== 1) return fail();
  const start = headers[0];
  if (!lines[start].startsWith(`${key}:`)) return fail();
  const header = lines[start].slice(key.length + 1).trim().replace(/(^|\s+)#.*$/, '').trim();
  if (header !== '' && header !== '[]') return fail();
  const values = [];
  let indent;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^ *($|#)/.test(line)) continue;
    // Only a new top-level mapping key terminates this list. In particular, a
    // flush-left sequence item belongs to the current key, not the next one.
    if (/^[^\s:#][^:]*:(?:\s|$)/.test(line) && !line.startsWith('-')) break;
    const item = /^( *)- +(.*)$/.exec(line);
    if (header === '[]' || !item) return fail();
    if (indent === undefined) indent = item[1].length;
    if (item[1].length !== indent) return fail();
    const raw = item[2].trim();
    let value;
    if (raw.startsWith('"')) {
      const quoted = /^"(?:[^"\\]|\\.)*"(?=\s+#|$)/.exec(raw);
      if (!quoted) return fail();
      try { value = JSON.parse(quoted[0]); } catch { return fail(); }
    } else if (raw.startsWith("'")) {
      const quoted = /^'((?:[^']|'')*)'(?=\s+#|$)/.exec(raw);
      if (!quoted) return fail();
      value = quoted[1].replace(/''/g, "'");
    } else {
      value = raw.replace(/\s+#.*$/, '').trim();
      // Reject collections, block scalars, aliases, anchors, tags and implicit
      // non-string scalars rather than indexing their YAML syntax as a name.
      if (!value || /^[\[\]{}&*!|>@`#%"']/.test(value) ||
          /^[-?:](?:\s|$)/.test(value) || /:(?:\s|$)/.test(value) ||
          /^(?:null|~|true|false)$/i.test(value) ||
          /^[-+]?(?:0x[0-9a-f]+|0o[0-7]+|[0-9]+(?:\.[0-9]*)?(?:e[-+]?[0-9]+)?|\.[0-9]+(?:e[-+]?[0-9]+)?|\.(?:inf|nan))$/i.test(value)) return fail();
    }
    values.push(value);
  }
  if (header === '' && values.length === 0) return fail();
  return values;
}

// Read a single top-level scalar key from manifest-style YAML text. Returns the
// unquoted string, or null if absent. Intentionally tiny.
export function readTopScalar(text, key) {
  if (typeof text !== 'string') return null;
  const re = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'm');
  const m = text.match(re);
  if (!m) return null;
  let val = m[1].trim();
  if (val === '' || val.startsWith('#')) return null;          // block scalar / comment-only
  val = val.replace(/\s+#.*$/, '').trim();                      // strip trailing comment
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val || null;
}
