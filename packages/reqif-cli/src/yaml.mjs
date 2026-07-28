// Minimal, purpose-built YAML — load AND dump, constrained to the shapes this
// package's four object kinds need (nested maps, lists of maps, lists of
// scalars, quoted/bare/numeric/boolean/null scalars). NOT a general YAML
// library — zero dependencies, full control over both sides of the round trip.
// Standalone (no dependency on @transitrix/ingest-cli's own yaml.mjs, which
// only reads a few top-level scalars and cannot load nested structure).
//
// Emission rules (mirrors the sibling package's style):
//   - strings are always double-quoted (JSON-escaped) — single line, no block
//     scalars, so load() never has to reason about blank lines inside a value;
//   - numbers / booleans / null are bare;
//   - maps and lists are block style; empty list is `[]`, empty map is `{}`.

function scalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  return JSON.stringify(String(v));
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function dumpMap(obj, indent) {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
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

// --- load --------------------------------------------------------------

function parseScalar(raw) {
  const v = raw.trim();
  if (v === 'null' || v === '~' || v === '') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === '[]') return [];
  if (v === '{}') return {};
  if (v.startsWith('"') && v.endsWith('"')) return JSON.parse(v);
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  return v; // bare (unquoted) string
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

// True when `content` (a de-indented line, or the text after "- ") opens a
// mapping — i.e. looks like `key: …` or `key:` with a plain (unquoted,
// non-numeric) key. Since dump() always double-quotes string scalars and a
// bare mapping key is never quoted, this disambiguates a sequence item that
// is a mapping from one that is a plain scalar without ambiguity.
function looksLikeMapStart(content) {
  return /^[A-Za-z0-9_.-]+:(\s|$)/.test(content);
}

export function load(text) {
  const raw = String(text).replace(/\r\n/g, '\n').split('\n');
  const lines = [];
  for (const line of raw) {
    if (!line.trim()) continue;      // blank
    if (/^\s*#/.test(line)) continue; // comment
    lines.push(line);
  }
  let pos = 0;

  // Applies one already-de-indented `key: value` / `key:` line to `result`,
  // consuming any nested block that follows (nested map or sequence).
  function applyMappingLine(result, content, indent) {
    const m = content.match(/^([^:]+):(.*)$/);
    if (!m) throw new Error(`yaml.load: cannot parse mapping line: ${JSON.stringify(content)}`);
    const key = m[1].trim();
    const rest = m[2].trim();
    if (rest !== '') {
      result[key] = parseScalar(rest);
      return;
    }
    // Block continuation: nested map or sequence, indented deeper than `indent`.
    if (pos < lines.length && indentOf(lines[pos]) > indent) {
      const childIndent = indentOf(lines[pos]);
      result[key] = lines[pos].slice(childIndent).startsWith('- ')
        ? parseSequence(childIndent)
        : parseMapping(childIndent);
    } else {
      result[key] = null;
    }
  }

  function parseMapping(indent) {
    const result = {};
    while (pos < lines.length) {
      const line = lines[pos];
      const ind = indentOf(line);
      if (ind !== indent) break;
      const content = line.slice(indent);
      if (content.startsWith('- ')) break; // sequence, not a mapping line
      pos++;
      applyMappingLine(result, content, indent);
    }
    return result;
  }

  function parseSequence(indent) {
    const result = [];
    while (pos < lines.length) {
      const line = lines[pos];
      const ind = indentOf(line);
      if (ind !== indent) break;
      const content = line.slice(indent);
      if (!content.startsWith('- ')) break;
      const rest = content.slice(2);
      pos++;
      if (looksLikeMapStart(rest)) {
        const item = {};
        const contIndent = indent + 2;
        applyMappingLine(item, rest, contIndent);
        while (pos < lines.length) {
          const l2 = lines[pos];
          const ind2 = indentOf(l2);
          if (ind2 !== contIndent) break;
          const content2 = l2.slice(contIndent);
          if (content2.startsWith('- ')) break;
          pos++;
          applyMappingLine(item, content2, contIndent);
        }
        result.push(item);
      } else {
        result.push(parseScalar(rest));
      }
    }
    return result;
  }

  if (lines.length === 0) return {};
  return indentOf(lines[0]) === 0 && lines[0].startsWith('- ') ? parseSequence(0) : parseMapping(0);
}
