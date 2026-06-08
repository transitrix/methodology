// Minimal, purpose-built YAML reader for codex artefacts — just enough to read the
// top-level scalars (`id`, `type`, `monitoring_needed`, `source_url`), the nested
// `scan:` block, and the `monitor_instead:` list-of-maps that the scheduler needs.
// NOT a general YAML library; the reg-intel CLI keeps zero dependencies, the same
// discipline as the ingest CLI's yaml.mjs. Writing the `scan` block back is done by
// update-scan.mjs textually, so this file is read-only.

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
