// Evaluation — resolves a skeleton's derived content against canon (hub epic
// "Document-view engine: skeleton transclusion, reference flags, render
// profiles"). Given the AST from parse-skeleton.mjs and an index built by
// resolve-references.mjs, this module answers two questions render.mjs (§4)
// needs answered before it can colour anything:
//
//   - what text does `{{ ID.field }}` / `{{ ID.parent.title }}` actually
//     render, and what §3 state does it carry (traversal along a reference
//     field re-runs §3's four-state classification at each hop — a `parent`
//     that itself is out of validity flags the whole chain, not just the leaf)
//   - which objects does `{{# each TYPE where ... order by ... }}` select,
//     and in what order
//   - for `{{ trace from = A to = B via = kind }}`, the full A×B coverage
//     matrix — every row and column, covered or not (§2's "an uncovered
//     item is the point of the matrix")
//
// Scope of this module: inline field access (with traversal, §2's "Inline"
// table), `each` selection (§2's "Selection"), and `trace` matrix building
// (§2's "Trace matrix"). It does NOT evaluate `view` / `figure` / `figref` —
// those need an illustration pipeline, left as a later layer (see this
// package's README for what's still open on the epic).
//
// Own copy of field extraction — same posture as resolve-references.mjs here.
// The ID grammar is not copied: it comes from @transitrix/document-renderer,
// which owns the notation's parser and resolver.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createResolver } from './resolve-references.mjs';
import { isValidId } from '../../document-renderer/src/ids.mjs';

// ── Generic scalar field extraction ─────────────────────────────────────
// A canon element's own content fields (name/description/level/kind/...)
// have no fixed schema this engine knows about — `.field` names whatever the
// skeleton author asks for. Reads one top-level `key: value` scalar; a
// nested mapping/list value (e.g. `gate_checks:` with indented children) has
// no scalar on its own line and is reported as absent, not as its raw YAML.

function extractField(text, name) {
  const m = text.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'));
  if (!m) return undefined;
  let raw = m[1];
  let inQuotes = false;
  let cut = raw.length;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === '#' && !inQuotes) { cut = i; break; }
  }
  raw = raw.slice(0, cut).trim();
  if (raw === '') return undefined;
  if (raw === 'null') return null;
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    try { return JSON.parse(raw); } catch { return raw.slice(1, -1); }
  }
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

// TYPE is the id's leading run before its first hyphen (IDS_AND_REFERENCES.md
// §1's grammar defines TYPE as `[A-Z][A-Z0-9_]*` — no hyphens inside it, so
// splitting at the first hyphen is exact), except the CAPABILITY V/H address
// form, whose id starts `CAPABILITY-V`/`CAPABILITY-H` — still type CAPABILITY.
const CAPABILITY_PREFIX = /^CAPABILITY-[VH][1-9]/;

export function typeOfId(id) {
  if (CAPABILITY_PREFIX.test(id)) return 'CAPABILITY';
  const dash = id.indexOf('-');
  return dash === -1 ? id : id.slice(0, dash);
}

// ── Evaluator ────────────────────────────────────────────────────────────

export async function createEvaluator(canonRoot) {
  const { index, resolveReference } = await createResolver(canonRoot);
  const orgRoot = join(canonRoot, '..');
  const textCache = new Map();

  async function textOf(entry) {
    const abs = join(orgRoot, ...entry.orgRelPath.split('/'));
    if (!textCache.has(abs)) {
      textCache.set(abs, await readFile(abs, 'utf8').catch(() => ''));
    }
    return textCache.get(abs);
  }

  // Resolves `id` plus a `.field[.field...]` path against it. Every
  // non-terminal segment must hold another id (§2: "traversal along
  // reference fields") — each hop is re-classified through §3's four states,
  // so a broken/expired/unadmitted link partway along the chain flags the
  // whole expression, not just the id closest to the reader. The terminal
  // segment's raw value is the rendered content.
  //
  // `fields.length === 0` is the bare-`{{ ID }}` form (§2's "whole object,
  // default rendering for its type") — default per-type rendering is
  // explicitly out of scope for this epic (each type's own spec owns it), so
  // this evaluator has no formatting to apply; when the id itself resolves,
  // it renders the id as a neutral placeholder rather than refusing to
  // render at all.
  async function evaluateFieldPath(id, fields, { renderDate } = {}) {
    let current = await resolveReference(id, { renderDate });
    if (current.state !== 'ok') return { id, state: current.state, flag: current.flag, content: null };
    if (fields.length === 0) return { id, state: 'ok', flag: null, content: id };

    let entry = index.get(id);
    for (let i = 0; i < fields.length - 1; i++) {
      const text = await textOf(entry);
      const raw = extractField(text, fields[i]);
      if (raw === undefined || typeof raw !== 'string' || !isValidId(raw)) {
        return { id, state: 'unresolved', flag: '⚑U', content: null };
      }
      current = await resolveReference(raw, { renderDate });
      if (current.state !== 'ok') return { id: raw, state: current.state, flag: current.flag, content: null };
      entry = index.get(raw);
    }

    const text = await textOf(entry);
    const raw = extractField(text, fields[fields.length - 1]);
    return { id: current.id, state: 'ok', flag: null, content: raw === undefined || raw === null ? '' : String(raw) };
  }

  // Selects every object of `node.entityType`, applies `where` (AND-only,
  // `=`/`!=` against a literal) and `order by`, per §2's "Selection" form.
  // Only objects that resolve `ok` (admitted, in effect for `renderDate`)
  // are selected — a listing renders the model as it stands at the render
  // date, not draft/expired material; §3's flags still apply to any
  // `.field` reference *within* a selected row (e.g. a row's own `.parent`
  // can still be suspect), just not to row membership itself.
  async function evaluateEach(node, { renderDate } = {}) {
    const rows = [];
    for (const [id, entry] of index) {
      if (typeOfId(id) !== node.entityType) continue;
      const state = await resolveReference(id, { renderDate });
      if (state.state !== 'ok') continue;
      const text = await textOf(entry);
      let matches = true;
      for (const clause of node.where) {
        const value = extractField(text, clause.field);
        const cmp = value === undefined || value === null ? '' : String(value);
        if (clause.op === '=' && cmp !== clause.value) matches = false;
        if (clause.op === '!=' && cmp === clause.value) matches = false;
      }
      if (matches) rows.push(id);
    }
    if (node.orderBy) {
      const keyOf = async (id) => {
        if (node.orderBy === 'id') return id;
        const value = extractField(await textOf(index.get(id)), node.orderBy);
        return value === undefined || value === null ? '' : String(value);
      };
      const keyed = await Promise.all(rows.map(async (id) => [id, await keyOf(id)]));
      keyed.sort((a, b) => a[1].localeCompare(b[1]));
      return keyed.map(([id]) => id);
    }
    return rows;
  }

  // Builds the full `node.from` × `node.to` coverage matrix for `via` (§2's
  // "Trace matrix"). Every admitted, in-effect object of each type gets a
  // row/column regardless of coverage — an uncovered item is the point of
  // the matrix, so nothing is filtered out the way `evaluateEach`'s `where`
  // does.
  //
  // `via` names either of the two link mechanisms canon already has, and
  // this resolves both without the caller having to say which:
  //   - a first-class REL kind (17-relations.md §3, e.g. `parent`,
  //     `realizes`): a REL record's own `endpoints.{from,to}` pair (built by
  //     resolve-references.mjs), kept only when the record's own `type`
  //     field equals `via`, oriented from → to exactly as the record states.
  //   - a claim record's single named endpoint field (verifications'
  //     `verifies`, assertions' `about`, validations' `validates` — the
  //     other three of resolve-references.mjs's LINK_RECORD_KINDS): the
  //     record's own id is one end, `endpoints[via]` the other, oriented
  //     endpoints[via] → record id — the one direction the epic's own
  //     example (`from = REQUIREMENT to = VERIFICATION via = verifies`)
  //     exercises.
  // A `via` matching neither produces an all-empty matrix, not an error —
  // same posture as an unresolved id elsewhere in this module.
  async function evaluateTrace(node, { renderDate } = {}) {
    const { from: fromType, to: toType, via } = node;
    const rowSet = new Set();
    const colSet = new Set();
    for (const [id] of index) {
      const type = typeOfId(id);
      if (type !== fromType && type !== toType) continue;
      // eslint-disable-next-line no-await-in-loop -- one canon walk, bounded by index size
      const state = await resolveReference(id, { renderDate });
      if (state.state !== 'ok') continue;
      if (type === fromType) rowSet.add(id);
      if (type === toType) colSet.add(id);
    }

    const covered = new Set();
    for (const [id, entry] of index) {
      if (!entry.endpoints) continue;
      const keys = Object.keys(entry.endpoints);
      let a;
      let b;
      if (keys.length === 2 && keys.includes('from') && keys.includes('to')) {
        // eslint-disable-next-line no-await-in-loop -- one canon walk, bounded by index size
        const text = await textOf(entry);
        if (extractField(text, 'type') !== via) continue;
        a = entry.endpoints.from;
        b = entry.endpoints.to;
      } else if (via in entry.endpoints) {
        a = entry.endpoints[via];
        b = id;
      } else {
        continue;
      }
      if (rowSet.has(a) && colSet.has(b)) covered.add(`${a}|${b}`);
    }

    return { rows: [...rowSet].sort(), cols: [...colSet].sort(), covered };
  }

  return { index, resolveReference, evaluateFieldPath, evaluateEach, evaluateTrace };
}
