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
          const sub = dumpMap(item, indent + 1);
          // First entry shares the "- " marker; subsequent entries align under it.
          lines.push(`${pad}  - ${sub[0].trimStart()}`);
          for (let i = 1; i < sub.length; i++) lines.push(`${pad}    ${sub[i].trimStart()}`);
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

// Read a single top-level scalar key from manifest-style YAML text (e.g.
// `coverage_profile: full`). Returns the unquoted string, or null if the key is
// absent or its value is a block/map (not a top-level scalar). Intentionally tiny.
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
