// Read and render the glossary report subset of YAML (32-glossary.md).
// Like blocks-view.mjs, this is a notation reader, not a general YAML parser.
// Supports block mappings, scalar lists (flow or block), and literal/folded text.
import { isValidId } from '../../document-renderer/src/ids.mjs';

function uncomment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote === '"' && c === '\\') { i++; continue; }
    if (quote === "'" && c === "'" && text[i + 1] === "'") { i++; continue; }
    if (quote === c) quote = null;
    else if (!quote && (c === '"' || c === "'")) quote = c;
    else if (!quote && c === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i).trim();
  }
  return text.trim();
}

function scalar(raw) {
  const s = uncomment(raw);
  if (s.startsWith('"')) return JSON.parse(s);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  if (/^(null|~)$/.test(s)) return null;
  return s;
}

function list(raw) {
  const s = uncomment(raw);
  if (!s.startsWith('[') || !s.endsWith(']')) throw new Error('Expected scalar list');
  const items = s.slice(1, -1).match(/"(?:\\.|[^"\\])*"|'(?:''|[^'])*'|[^,]+/g) || [];
  return items.map(scalar);
}

// Extract a field at an exact mapping path; unrelated fields cannot override it.
export function glossaryField(text, path) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const stack = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^( *)([a-z_]+):[ \t]*(.*)$/);
    if (!m) continue;
    const indent = m[1].length;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const keys = [...stack.map((s) => s.key), m[2]];
    const raw = uncomment(m[3]);
    if (keys.join('.') !== path) {
      // Skip scalar bodies so text inside a definition is never a config field.
      if (/^[|>][+-]?$/.test(raw)) {
        while (i + 1 < lines.length && (!lines[i + 1].trim() || lines[i + 1].match(/^ */)[0].length > indent)) i++;
      } else if (!raw) stack.push({ key: m[2], indent });
      continue;
    }
    if (/^[|>][+-]?$/.test(raw)) {
      const body = [];
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || lines[j].match(/^ */)[0].length > indent)) body.push(lines[j++]);
      const nonempty = body.filter((line) => line.trim());
      const width = nonempty.length ? Math.min(...nonempty.map((line) => line.match(/^ */)[0].length)) : 0;
      let value = body.map((line) => line.slice(width)).join('\n');
      if (raw[0] === '>') value = value.replace(/([^\n])\n(?=[^\n])/g, '$1 ');
      return raw.endsWith('-') ? value.trimEnd() : value.trimEnd() + '\n';
    }
    if (raw.startsWith('[')) return list(raw);
    if (raw) return scalar(raw);
    const values = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim() || lines[j].trim().startsWith('#')) continue;
      if (lines[j].match(/^ */)[0].length <= indent) break;
      const item = lines[j].match(/^ +-\s+(.+)$/);
      if (!item) return undefined;
      values.push(scalar(item[1]));
    }
    return values;
  }
  return undefined;
}

export function parseGlossaryYaml(text) {
  try {
    const field = (path) => glossaryField(text, path);
    const id = field('id');
    const name = field('name');
    if (field('notation') !== 'glossary' || typeof id !== 'string' || !id.startsWith('GLOSSARY-') || !isValidId(id) || typeof name !== 'string' || !name.trim()) return { ok: false };
    for (const path of ['view_config', 'view_config.scope', 'view_config.display']) {
      const value = field(path);
      if (value !== undefined && !(Array.isArray(value) && value.length === 0)) return { ok: false };
    }
    const types = field('view_config.scope.types') ?? [];
    const groupBy = field('view_config.display.group_by') ?? 'first_letter';
    const badge = field('view_config.display.show_type_badge') ?? 'true';
    if (!Array.isArray(types) || types.some((t) => typeof t !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(t)) || !['first_letter', 'none'].includes(groupBy) || !['true', 'false'].includes(badge)) return { ok: false };
    return { ok: true, name, types, groupBy, showTypeBadge: badge === 'true' };
  } catch { return { ok: false }; }
}

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderGlossaryHtml(entries, config) {
  const rows = entries.filter((entry) => entry.name?.trim() && entry.description?.trim() && (!config.types.length || config.types.includes(entry.type)));
  rows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en') || a.id.localeCompare(b.id, 'en'));
  const html = [`<section class="dv-glossary"><h2>${escape(config.name)}</h2>`];
  let letter;
  for (const entry of rows) {
    const next = entry.name.trim().slice(0, 1).toUpperCase();
    if (config.groupBy === 'first_letter' && next !== letter) {
      html.push(`<h3>${escape(next)}</h3>`);
      letter = next;
    }
    html.push(`<article><h4>${escape(entry.name)}${config.showTypeBadge ? ` <small>${escape(entry.type)}</small>` : ''}</h4>`);
    if (entry.aliases.length) html.push(`<p>Also known as: ${entry.aliases.map(escape).join(', ')}</p>`);
    html.push(`<p style="white-space: pre-wrap">${escape(entry.description)}</p></article>`);
  }
  html.push('</section>');
  return html.join('\n');
}
