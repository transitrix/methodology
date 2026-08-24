// Repository index — the deterministic half of what pass 1 resolves against.
//
// A recipe's `canon:` header names a `canon/` directory. This module walks it
// once into an id → object map so every reference in one render pass shares a
// single index. Top-level scalars only: a model-object reference substitutes a
// field's text, it does not traverse into nested structure.
//
// The repository is an OPTIONAL input. `buildRepositoryIndex(null)` is not an
// error — it yields an empty index, and pass 1 decides whether the recipe
// actually needed one.
//
// Own hand-rolled field extraction, no shared cross-package runtime import —
// same convention as this repo's other packages.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Record folders carrying ids alongside `elements/`. Kept in one place so a new
// record kind is a one-line addition.
const RECORD_DIRS = ['elements', 'relations', 'assertions', 'verifications', 'validations'];

async function walkYaml(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  // Sort so an index built twice over unchanged inputs is byte-identical —
  // readdir order is filesystem-dependent and must not leak into the output.
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkYaml(p)));
    else if (entry.isFile() && entry.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

// Every top-level `key: scalar` in the document. Block scalars (`|`, `>`) are
// folded to their content so `{{ REQ-14.text }}` picks up multi-line prose.
export function topLevelFields(text) {
  const fields = {};
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    const value = rawValue.trim();

    if (value === '|' || value === '>' || value === '|-' || value === '>-') {
      const block = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') { block.push(''); continue; }
        if (!/^\s/.test(lines[j])) break;
        block.push(lines[j].replace(/^\s+/, ''));
      }
      fields[key] = (value.startsWith('|') ? block.join('\n') : block.join(' ')).trim();
      continue;
    }
    if (value === '') continue; // a nested mapping or sequence — not a scalar field
    fields[key] = stripScalar(value);
  }
  return fields;
}

function stripScalar(value) {
  let s = value;
  const hash = s.indexOf(' #');
  if (hash >= 0) s = s.slice(0, hash).trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

// A `valid_to:` of literal `null` means "no end" — an open interval, not the
// string "null". Read as a scalar it arrives as text, so it is normalised here
// rather than at every use site.
function dateOrNull(value) {
  if (value === undefined || value === '' || value === 'null' || value === '~') return null;
  return value;
}

// Walks `canonRoot` into an id → entry index. A null/undefined root yields an
// empty index — the no-repository-configured case, which is legitimate input.
//
// Each entry carries the fields a reference substitutes AND the three envelope
// values the four-state classification is decided from. An object with no
// `admission_state:` is `active`, matching @transitrix/document-view-engine's
// buildCanonIndex(): absence is the ordinary case, not an unknown one.
//
// Proposed and rejected drafts are indexed, never skipped — telling "does not
// exist" apart from "exists, not admitted" is the whole point of the split.
export async function buildRepositoryIndex(canonRoot) {
  const index = new Map();
  if (!canonRoot) return index;

  for (const dir of RECORD_DIRS) {
    for (const file of await walkYaml(join(canonRoot, dir))) {
      const text = await readFile(file, 'utf8');
      const fields = topLevelFields(text);
      if (!fields.id) continue;
      index.set(fields.id, {
        fields,
        admissionState: fields.admission_state ?? 'active',
        validFrom: dateOrNull(fields.valid_from),
        validTo: dateOrNull(fields.valid_to),
      });
    }
  }
  return index;
}
