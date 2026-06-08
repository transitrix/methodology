// Minimal, purpose-built YAML for codex artefacts + the reg-intel review digest —
// just enough to read the codex top-level scalars (`id`, `type`, `monitoring_needed`,
// `source_url`), the nested `scan:` block, `monitor_instead:` / scalar lists, and to
// EMIT the constrained shapes the digest produces. NOT a general YAML library; the
// reg-intel CLI keeps zero dependencies, the same discipline as the ingest CLI's
// yaml.mjs. The `scan` block is written back textually by update-scan.mjs.

// Trim, strip a trailing ` # comment`, unquote, and type bare null/true/false.
function cleanScalar(raw) {
  if (raw === undefined || raw === null) return undefined;
  let s = String(raw).trim();
  const h = s.indexOf(' #');
  if (h >= 0) s = s.slice(0, h).trim();
  if (s === '') return undefined;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

// Read a single top-level scalar key (e.g. `monitoring_needed: true`). Returns the
// typed value, or undefined when the key is absent or its value is a block/map.
export function readTopScalar(text, key) {
  if (typeof text !== 'string') return undefined;
  const re = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm');
  const m = text.match(re);
  if (!m) return undefined;
  return cleanScalar(m[1]);
}

// Read the immediate child scalars of a top-level block `key:` (e.g. the `scan:`
// block). Returns a map of childKey → typed value, or null when the block is absent.
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

// Read a top-level scalar list `key:` — inline `[a, b]` or a block of `- ` items.
// Returns an array of typed scalars, or [] when the key is absent.
export function readScalarList(text, key) {
  if (typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${key}:[ \\t]*(.*)$`).test(l));
  if (start < 0) return [];
  const inline = lines[start].replace(new RegExp(`^${key}:[ \\t]*`), '').trim();
  if (inline.startsWith('[')) {
    const body = inline.replace(/^\[/, '').replace(/\][ \t]*(#.*)?$/, '').trim();
    return body === '' ? [] : body.split(',').map((x) => cleanScalar(x)).filter((v) => v !== undefined);
  }
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (/^\S/.test(l)) break;
    const m = l.match(/^[ \t]+-[ \t]+(.*)$/);
    if (m) { const v = cleanScalar(m[1]); if (v !== undefined) out.push(v); }
    else break;
  }
  return out;
}

// Read a top-level list-of-maps `key:` (e.g. `monitor_instead:`). Returns an array of
// objects (one per `- ` item), or [] when the key is absent.
export function readMapList(text, key) {
  if (typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${key}:[ \\t]*(#.*)?$`).test(l));
  if (start < 0) return [];
  const items = [];
  let cur = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (/^\S/.test(l)) break;
    let m = l.match(/^[ \t]+-[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m) { cur = {}; cur[m[1]] = cleanScalar(m[2]); items.push(cur); continue; }
    m = l.match(/^[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (m && cur) cur[m[1]] = cleanScalar(m[2]);
  }
  return items;
}

// ── Emission ─────────────────────────────────────────────────────
// Purpose-built dumper for the digest's constrained shapes — strings double-quoted,
// numbers/booleans/null bare, block-style maps + lists, nested maps inside list items
// keep their indentation. Mirrors the ingest CLI's emitter (same rules + the list-item
// nesting fix), so the two CLIs produce consistent YAML.

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
