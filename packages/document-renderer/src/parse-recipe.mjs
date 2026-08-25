// `.ttrs` document-recipe parser — syntax only.
//
// A `.ttrs` file is prose with directives, not a mapping. It carries a YAML
// front-matter header and a body made of four slot kinds:
//
//   fixed text              anything outside `{{ … }}` — copied verbatim
//   model-object reference  `{{ REQ-14 }}` / `{{ REQ-14.text }}`
//   figure                  `{{ view … }}` (derived) / `{{ figure … }}` (supplied)
//                           / `{{ figref … }}` (cross-reference)
//   instruction slot        `{{# instruct <slot-id> }} … {{/ instruct }}`
//
// Scope of this module: syntax. It turns a recipe's text into a header object
// and a body AST. It resolves nothing against a repository and renders nothing —
// that is pass1.mjs, built on top of this AST.
//
// The directive language is ONE language with more constructs than this pass
// implements (DIRECTIVE_LANGUAGE.md, notations/views/documents/). Two failures
// that look alike from a distance are kept apart on purpose:
//
//   TTRS-002  unknown or malformed syntax — not in the language at all
//   TTRS-004  recognised, not implemented in this pass — `each`, `trace` and
//             the `.field` row reference are defined constructs this parser
//             names and declines, never silently drops and never reports as
//             though the author mistyped something
//
// Folding the second into the first would tell an author their valid recipe
// is a typo.
//
// Zero runtime dependencies outside this package. The grammar itself — front
// matter, header scalars, the id/field-path split — lives in syntax.mjs, shared
// with the view engine's recipe parser: one notation, one parser. What stays
// here is what pass 1 alone decides: its construct set and its error codes.

import { isValidId } from './ids.mjs';
import {
  FRONT_MATTER,
  IDENTIFIER,
  parseHeaderFields,
  splitIdAndFields,
} from './syntax.mjs';

// `<basename>.<kind>.ttrs` — the middle segment is the document kind, so the
// existing extension/parent-folder lint applies to it unchanged.
const RECIPE_FILENAME = /^[^.]+\.([a-z0-9-]+)\.ttrs$/;

const SLOT_ID = /^[a-z0-9][a-z0-9-]*$/;

const REQUIRED_HEADER_FIELDS = ['document', 'kind', 'recipe_id', 'recipe_version'];

// Returns the document kind declared by a `.ttrs` filename, or undefined when the
// name is not of that shape. Exported so a caller can check it against the header's
// `kind:` without re-deriving the pattern.
export function recipeKindFromFilename(name) {
  const m = RECIPE_FILENAME.exec(String(name));
  return m ? m[1] : undefined;
}

// ── Header ───────────────────────────────────────────────────────────────
// `canon:` is deliberately optional — the repository is an optional input. A
// recipe naming no model object and no derived figure renders standalone.

function parseHeader(headerText) {
  const errors = [];
  const fields = parseHeaderFields(headerText);

  for (const name of REQUIRED_HEADER_FIELDS) {
    if (!fields[name]) {
      errors.push({ code: 'TTRS-001', message: `header: \`${name}\` is required` });
    }
  }
  if (fields.kind && !/^[a-z0-9-]+$/.test(fields.kind)) {
    errors.push({
      code: 'TTRS-001',
      message: `header: \`kind\` must be lower-case letters, digits and hyphens, got "${fields.kind}"`,
    });
  }

  return {
    header: {
      document: fields.document,
      kind: fields.kind,
      recipe_id: fields.recipe_id,
      recipe_version: fields.recipe_version,
      canon: fields.canon ?? null,
    },
    errors,
  };
}

// ── Tokenizer ────────────────────────────────────────────────────────────
// Walks the body, splitting it into literal-text runs and `{{ … }}` directives.
// `\{{` is the one defined escape — renders as a literal `{{`.
//
// An instruction slot's body is opaque: on `{{# instruct … }}` the tokenizer
// scans straight to the matching `{{/ instruct }}` and keeps everything between
// as raw text. No slot kind nests inside another, by design.

const INSTRUCT_OPEN = /^#\s*instruct(?:\s+([^\s}]+))?\s*$/;
const INSTRUCT_CLOSE = '{{/ instruct }}';
const INSTRUCT_CLOSE_RE = /\{\{\/\s*instruct\s*\}\}/;

// `{{# each TYPE where … order by … }} … {{/ each }}` — a construct of the
// language this pass does not implement. Scanned to its close and reported
// once, so an author gets one honest "not implemented here" rather than a
// cascade of syntax errors from the block's own contents.
const EACH_OPEN = /^#\s*each(\s|$)/;
const EACH_CLOSE = '{{/ each }}';
const EACH_CLOSE_RE = /\{\{\/\s*each\s*\}\}/;

function tokenize(body) {
  const tokens = [];
  const errors = [];
  let buf = '';
  let i = 0;

  const flushText = () => {
    if (buf !== '') { tokens.push({ type: 'text', value: buf }); buf = ''; }
  };

  while (i < body.length) {
    if (body.startsWith('\\{{', i)) { buf += '{{'; i += 3; continue; }
    if (body.startsWith('{{', i)) {
      const close = body.indexOf('}}', i + 2);
      if (close === -1) {
        errors.push({ code: 'TTRS-002', message: `unterminated "{{" at offset ${i} — no matching "}}"` });
        i = body.length;
        break;
      }
      const content = body.slice(i + 2, close);
      const openMatch = INSTRUCT_OPEN.exec(content.trim());
      if (openMatch) {
        flushText();
        const afterOpen = close + 2;
        const closeMatch = INSTRUCT_CLOSE_RE.exec(body.slice(afterOpen));
        if (!closeMatch) {
          errors.push({
            code: 'TTRS-002',
            message: `instruction slot "${content.trim()}" is never closed — expected a matching "${INSTRUCT_CLOSE}"`,
          });
          i = body.length;
          break;
        }
        const bodyStart = afterOpen;
        const bodyEnd = afterOpen + closeMatch.index;
        const rawSource = body.slice(i, bodyEnd + closeMatch[0].length);
        tokens.push(parseInstruct(openMatch[1], body.slice(bodyStart, bodyEnd), rawSource, errors));
        i = bodyEnd + closeMatch[0].length;
        continue;
      }
      if (EACH_OPEN.test(content.trim())) {
        flushText();
        const afterOpen = close + 2;
        const eachClose = EACH_CLOSE_RE.exec(body.slice(afterOpen));
        if (!eachClose) {
          errors.push({
            code: 'TTRS-004',
            message: `"{{ ${content.trim()} }}" is recognised, not implemented in this pass — and it is never closed either (expected a matching "${EACH_CLOSE}")`,
          });
          i = body.length;
          break;
        }
        errors.push({
          code: 'TTRS-004',
          message: `"{{ ${content.trim()} }}": the \`each\` block is a construct of the directive language that pass 1 does not implement — recognised, not implemented in this pass`,
        });
        tokens.push({ type: 'unimplemented', construct: 'each' });
        i = afterOpen + eachClose.index + eachClose[0].length;
        continue;
      }
      flushText();
      tokens.push(classify(content, errors));
      i = close + 2;
      continue;
    }
    buf += body[i];
    i++;
  }
  flushText();
  return { tokens, errors };
}

// ── Instruction slot ─────────────────────────────────────────────────────
// Pass 1 never fills one of these; it copies the slot through untouched so the
// unresolved section is visible in the Markdown and pass 2 can find it. The
// three body keys are the epic's shape: the question the section answers, the
// inputs it may read, and what makes an answer sufficient.

function parseInstruct(slotId, bodyText, rawSource, errors) {
  const label = slotId ? `instruction slot "${slotId}"` : 'instruction slot';

  if (!slotId) {
    errors.push({ code: 'TTRS-002', message: '"{{# instruct … }}": missing slot id' });
  } else if (!SLOT_ID.test(slotId)) {
    errors.push({
      code: 'TTRS-002',
      message: `${label}: slot id must be lower-case letters, digits and hyphens`,
    });
  }

  const fields = {};
  for (const line of bodyText.split(/\r?\n/)) {
    const m = line.match(/^\s*(question|inputs|sufficient):[ \t]*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }

  if (!fields.question) {
    errors.push({ code: 'TTRS-002', message: `${label}: \`question:\` is required` });
  }
  if (!fields.sufficient) {
    errors.push({ code: 'TTRS-002', message: `${label}: \`sufficient:\` is required` });
  }

  const inputs = fields.inputs
    ? fields.inputs.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    type: 'instruct',
    slotId,
    question: fields.question,
    inputs,
    sufficient: fields.sufficient,
    raw: rawSource,
  };
}

// ── Model-object reference and figures ───────────────────────────────────

function splitFieldPath(raw, errors, context) {
  const segments = raw.split('.').filter((s) => s !== '');
  if (segments.length === 0) {
    errors.push({ code: 'TTRS-002', message: `${context}: empty field path` });
    return [];
  }
  if (segments.length > 3) {
    errors.push({ code: 'TTRS-002', message: `${context}: field path "${raw}" exceeds max traversal depth 3` });
  }
  for (const seg of segments) {
    if (!IDENTIFIER.test(seg)) {
      errors.push({ code: 'TTRS-002', message: `${context}: "${seg}" in field path "${raw}" is not a valid field name` });
    }
  }
  return segments;
}

// `key = value` attribute list, values optionally double-quoted.
function parseAttrs(rest) {
  const attrs = {};
  const re = /([a-z_][a-z0-9_]*)\s*=\s*("(?:[^"\\]|\\.)*"|\S+)/gi;
  let m;
  while ((m = re.exec(rest)) !== null) {
    let value = m[2];
    if (value.startsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    }
    attrs[m[1]] = value;
  }
  return attrs;
}

// The leading path argument: everything before the first `key =` attribute.
function splitPathAndAttrs(rest) {
  const attrStart = rest.search(/[a-z_][a-z0-9_]*\s*=/i);
  if (attrStart === -1) return { path: rest.trim(), attrRest: '' };
  return { path: rest.slice(0, attrStart).trim(), attrRest: rest.slice(attrStart) };
}

const FIT_VALUES = new Set(['width', 'page', 'none']);

function parseView(trimmed, errors) {
  const { path, attrRest } = splitPathAndAttrs(trimmed.replace(/^view\s*/, ''));
  const attrs = parseAttrs(attrRest);
  if (!path) {
    errors.push({ code: 'TTRS-002', message: `"{{ ${trimmed} }}": missing view source path` });
  }
  const fit = attrs.fit ?? 'width';
  if (!FIT_VALUES.has(fit)) {
    errors.push({ code: 'TTRS-002', message: `"{{ ${trimmed} }}": fit must be width, page or none — got "${fit}"` });
  }
  return { type: 'view', path, as: attrs.as ?? null, fit };
}

function parseFigure(trimmed, errors) {
  const { path, attrRest } = splitPathAndAttrs(trimmed.replace(/^figure\s*/, ''));
  const attrs = parseAttrs(attrRest);
  if (!path) {
    errors.push({ code: 'TTRS-002', message: `"{{ ${trimmed} }}": missing figure asset path` });
  }
  return { type: 'figure', path, caption: attrs.caption ?? null, as: attrs.as ?? null };
}

function parseFigref(trimmed, errors) {
  const name = trimmed.replace(/^figref\s*/, '').trim();
  if (!name) {
    errors.push({ code: 'TTRS-002', message: `"{{ ${trimmed} }}": missing figure name` });
  }
  return { type: 'figref', name };
}

function classify(rawContent, errors) {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith('/')) {
    errors.push({
      code: 'TTRS-002',
      message: `unexpected closing directive "{{${trimmed}}}" — no block is open here`,
    });
    return { type: 'error' };
  }

  if (trimmed.startsWith('#')) {
    errors.push({
      code: 'TTRS-002',
      message: `unknown block directive "{{${trimmed}}}" — "{{# instruct <slot-id> }}" and "{{# each … }}" are the language's only block forms`,
    });
    return { type: 'error' };
  }

  if (/^view(\s|$)/.test(trimmed)) return parseView(trimmed, errors);
  if (/^figure(\s|$)/.test(trimmed)) return parseFigure(trimmed, errors);
  if (/^figref(\s|$)/.test(trimmed)) return parseFigref(trimmed, errors);

  // Recognised constructs of the language that pass 1 declines by name.
  if (/^trace(\s|$)/.test(trimmed)) {
    errors.push({
      code: 'TTRS-004',
      message: `"{{ ${trimmed} }}": \`trace\` is a construct of the directive language that pass 1 does not implement — recognised, not implemented in this pass`,
    });
    return { type: 'unimplemented', construct: 'trace' };
  }

  // `{{ .field }}` — the row reference, meaningful only inside an `each` block.
  // Reported as unimplemented rather than as a malformed id: it is in the
  // language, and its own block form is what pass 1 does not implement.
  if (trimmed.startsWith('.')) {
    errors.push({
      code: 'TTRS-004',
      message: `"{{ ${trimmed} }}": a field reference belongs to an \`each\` block — recognised, not implemented in this pass`,
    });
    return { type: 'unimplemented', construct: 'field-ref' };
  }

  if (/\s/.test(trimmed)) {
    errors.push({ code: 'TTRS-002', message: `unrecognised directive "{{ ${trimmed} }}"` });
    return { type: 'error' };
  }

  const { id, fieldsRaw } = splitIdAndFields(trimmed);
  if (!isValidId(id)) {
    errors.push({
      code: 'TTRS-002',
      message: `model-object reference "{{ ${trimmed} }}": "${id}" is not a valid ID (IDS_AND_REFERENCES.md §1)`,
    });
  }
  const fields = fieldsRaw === ''
    ? []
    : splitFieldPath(fieldsRaw, errors, `model-object reference "{{ ${trimmed} }}"`);
  return { type: 'reference', id, fields };
}

// ── Entry point ──────────────────────────────────────────────────────────

export function parseRecipe(text) {
  const errors = [];
  const m = FRONT_MATTER.exec(String(text));
  if (!m) {
    return {
      header: null,
      ast: [],
      errors: [{ code: 'TTRS-001', message: 'recipe has no `---` front-matter header' }],
    };
  }

  const { header, errors: headerErrors } = parseHeader(m[1]);
  errors.push(...headerErrors);

  const { tokens, errors: bodyErrors } = tokenize(m[2]);
  errors.push(...bodyErrors);

  // A slot id names a section in the run record, so two slots may not share one.
  const seen = new Set();
  for (const node of tokens) {
    if (node.type !== 'instruct' || !node.slotId) continue;
    if (seen.has(node.slotId)) {
      errors.push({ code: 'TTRS-003', message: `duplicate instruction slot id "${node.slotId}"` });
    }
    seen.add(node.slotId);
  }

  return { header, ast: tokens, errors };
}
