// Recipe-file parser for the document-view engine (hub epic "Document-view engine:
// recipe transclusion, reference flags, render profiles", §1-2).
//
// Scope of this module: syntax only. It turns a recipe file's text into a header
// object and a body AST. It does NOT resolve references against canon, does not compute
// the four reference-resolution states (§3), and does not render — those are the
// engine's next layers, built on top of this AST.
//
// The recipe format and `.ttrs` are one notation, and @transitrix/document-renderer
// owns its parser and resolver. The grammar below — the ID rules, front matter, header
// scalars, the id/field-path split — is imported from there rather than copied. What
// this module still owns is the construct set the view engine implements (`each`,
// `trace`, the `.field` row reference) and its own error shape.

import { isValidId, isValidTypeName } from '../../document-renderer/src/ids.mjs';
import {
  FRONT_MATTER,
  IDENTIFIER,
  parseHeaderFields,
  splitIdAndFields,
} from '../../document-renderer/src/syntax.mjs';

// ── Header (§1) ──────────────────────────────────────────────────────────

function parseHeader(headerText) {
  const errors = [];
  const fields = parseHeaderFields(headerText);

  const document = fields.document;
  const canon = fields.canon;
  let profile = fields.profile;

  if (!document) errors.push({ message: 'header: `document` is required' });
  if (!canon) errors.push({ message: 'header: `canon` is required' });
  if (profile === undefined) {
    profile = 'neutral';
  } else if (profile !== 'neutral') {
    errors.push({ message: `header: \`profile\` is reserved — only "neutral" exists today, got "${profile}"` });
  }

  return { header: { document, canon, profile }, errors };
}

// ── Tokenizer ────────────────────────────────────────────────────────────
// Walks the raw body text, splitting it into literal-text runs and `{{ ... }}`
// directives. `\{{` is the one defined escape (§2) — renders as a literal `{{`.

function tokenize(body) {
  const tokens = [];
  const errors = [];
  let buf = '';
  let i = 0;

  const flushText = () => {
    if (buf !== '') { tokens.push({ kind: 'text', value: buf }); buf = ''; }
  };

  while (i < body.length) {
    if (body.startsWith('\\{{', i)) { buf += '{{'; i += 3; continue; }
    if (body.startsWith('{{', i)) {
      flushText();
      const close = body.indexOf('}}', i + 2);
      if (close === -1) {
        errors.push({ message: `tokenizer: unterminated "{{" at offset ${i} — no matching "}}"` });
        i = body.length;
        break;
      }
      const content = body.slice(i + 2, close);
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

function splitFieldPath(raw, errors, context) {
  const segments = raw.split('.').filter((s) => s !== '');
  if (segments.length === 0) {
    errors.push({ message: `${context}: empty field path` });
    return [];
  }
  if (segments.length > 3) {
    errors.push({ message: `${context}: field path "${raw}" exceeds max traversal depth 3 (§2)` });
  }
  for (const seg of segments) {
    if (!IDENTIFIER.test(seg)) {
      errors.push({ message: `${context}: "${seg}" in field path "${raw}" is not a valid field name` });
    }
  }
  return segments;
}

function classify(rawContent, errors) {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith('#')) {
    const rest = trimmed.slice(1).trim();
    return parseEachOpen(rest, errors);
  }

  if (trimmed.startsWith('/')) {
    const rest = trimmed.slice(1).trim();
    if (rest !== 'each') {
      errors.push({ message: `unknown closing directive "{{/${rest}}}" — only "{{/ each }}" is defined` });
    }
    return { kind: 'each-close' };
  }

  if (trimmed.startsWith('.')) {
    if (/\s/.test(trimmed)) {
      errors.push({ message: `malformed field reference "{{ ${trimmed} }}"` });
      return { kind: 'error' };
    }
    const fields = splitFieldPath(trimmed.slice(1), errors, `field reference "{{ ${trimmed} }}"`);
    return { kind: 'field-ref', fields };
  }

  if (/^trace(\s|$)/.test(trimmed)) return parseTrace(trimmed, errors);
  if (/^view(\s|$)/.test(trimmed)) return parseView(trimmed, errors);
  if (/^figure(\s|$)/.test(trimmed)) return parseFigure(trimmed, errors);
  if (/^figref(\s|$)/.test(trimmed)) return parseFigref(trimmed, errors);

  if (/\s/.test(trimmed)) {
    errors.push({ message: `unrecognised directive "{{ ${trimmed} }}"` });
    return { kind: 'error' };
  }

  const { id, fieldsRaw } = splitIdAndFields(trimmed);
  if (!isValidId(id)) {
    errors.push({ message: `inline reference "{{ ${trimmed} }}": "${id}" is not a valid ID (IDS_AND_REFERENCES.md §1)` });
  }
  let fields = [];
  if (fieldsRaw !== '') {
    fields = splitFieldPath(fieldsRaw, errors, `inline reference "{{ ${trimmed} }}"`);
  }
  return { kind: 'inline', id, fields };
}

function parseEachOpen(rest, errors) {
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens[0] !== 'each') {
    errors.push({ message: `"{{# ${rest} }}" does not open with "each"` });
    return { kind: 'each-open', entityType: undefined, where: [], orderBy: null };
  }
  const entityType = tokens[1];
  if (!entityType) {
    errors.push({ message: '"{{# each ... }}": missing entity type' });
    return { kind: 'each-open', entityType: undefined, where: [], orderBy: null };
  }
  if (!isValidTypeName(entityType)) {
    errors.push({ message: `"{{# each ${entityType} ... }}": "${entityType}" is not a valid TYPE name` });
  }

  let idx = 2;
  const where = [];
  if (tokens[idx] === 'where') {
    idx++;
    for (;;) {
      const field = tokens[idx++];
      const op = tokens[idx++];
      const value = tokens[idx++];
      if (field === undefined || op === undefined || value === undefined) {
        errors.push({ message: `"{{# each ${entityType} where ... }}": incomplete comparison clause` });
        break;
      }
      if (op !== '=' && op !== '!=') {
        errors.push({ message: `"{{# each ${entityType} where ... }}": unsupported operator "${op}" — only "=" / "!=" (§2)` });
      }
      where.push({ field, op, value });
      if (tokens[idx] === 'and') { idx++; continue; }
      break;
    }
  }

  let orderBy = null;
  if (tokens[idx] === 'order') {
    idx++;
    if (tokens[idx] !== 'by') {
      errors.push({ message: `"{{# each ${entityType} ... }}": expected "order by <field>"` });
    } else {
      idx++;
      orderBy = tokens[idx++] ?? null;
      if (!orderBy) errors.push({ message: `"{{# each ${entityType} ... }}": "order by" missing a field` });
    }
  }

  if (idx < tokens.length) {
    errors.push({ message: `"{{# each ${entityType} ... }}": unexpected trailing "${tokens.slice(idx).join(' ')}"` });
  }

  return { kind: 'each-open', entityType, where, orderBy };
}

function parseKeyValuePairs(tokens, startIdx, errors, label) {
  const kv = {};
  let idx = startIdx;
  while (idx < tokens.length) {
    const key = tokens[idx++];
    const eq = tokens[idx++];
    const value = tokens[idx++];
    if (eq !== '=' || value === undefined) {
      errors.push({ message: `${label}: malformed "${key ?? ''} ${eq ?? ''}" — expected "key = value"` });
      break;
    }
    kv[key] = value;
  }
  return kv;
}

// `caption = "Device, front"` needs quote-aware tokenizing (a bare `.split(/\s+/)`
// would split the caption itself) — figure is the one directive whose values carry
// spaces, so only its key/value parsing goes through this path.
function tokenizeRespectingQuotes(s) {
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(s)) !== null) tokens.push(m[1] !== undefined ? m[1] : m[2]);
  return tokens;
}

function parseQuotedKeyValuePairs(rest, errors, label) {
  return parseKeyValuePairs(tokenizeRespectingQuotes(rest), 0, errors, label);
}

// Splits "<path> key = value key2 = value2" into the leading bare path token (view/figure
// share this shape: a whitespace-free path followed by key/value pairs) and the remainder.
function splitPathAndRest(afterKeyword) {
  const trimmed = afterKeyword.trim();
  const m = /^(\S*)(?:\s+([\s\S]*))?$/.exec(trimmed);
  if (!m) return { path: '', rest: '' };
  return { path: m[1], rest: m[2] ?? '' };
}

function parseTrace(trimmed, errors) {
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const kv = parseKeyValuePairs(tokens, 1, errors, `"{{ ${trimmed} }}"`);
  for (const required of ['from', 'to', 'via']) {
    if (!kv[required]) errors.push({ message: `"{{ ${trimmed} }}": missing required "${required}"` });
  }
  return { kind: 'trace', from: kv.from, to: kv.to, via: kv.via };
}

const VIEW_FIT_VALUES = ['width', 'page', 'none'];

function parseView(trimmed, errors) {
  const { path, rest } = splitPathAndRest(trimmed.slice(4));
  if (!path) {
    errors.push({ message: `"{{ ${trimmed} }}": "view" requires a path` });
  }
  const kv = parseQuotedKeyValuePairs(rest, errors, `"{{ ${trimmed} }}"`);
  const fit = kv.fit ?? 'width';
  if (!VIEW_FIT_VALUES.includes(fit)) {
    errors.push({ message: `"{{ ${trimmed} }}": fit must be one of ${VIEW_FIT_VALUES.join('/')}, got "${fit}"` });
  }
  return { kind: 'view', path, as: kv.as ?? null, fit };
}

function parseFigure(trimmed, errors) {
  const { path, rest } = splitPathAndRest(trimmed.slice(6));
  if (!path) {
    errors.push({ message: `"{{ ${trimmed} }}": "figure" requires a path` });
  }
  const kv = parseQuotedKeyValuePairs(rest, errors, `"{{ ${trimmed} }}"`);
  return { kind: 'figure', path, caption: kv.caption ?? null, as: kv.as ?? null };
}

function parseFigref(trimmed, errors) {
  const rest = trimmed.slice(6).trim();
  if (!rest) {
    errors.push({ message: `"{{ ${trimmed} }}": "figref" requires a name` });
    return { kind: 'figref', name: undefined };
  }
  const [name, ...extra] = rest.split(/\s+/);
  if (extra.length > 0) {
    errors.push({ message: `"{{ ${trimmed} }}": "figref" takes a single name, got "${rest}"` });
  }
  return { kind: 'figref', name };
}

// ── AST construction ────────────────────────────────────────────────────
// Pairs {{# each }} / {{/ each }} into nested nodes and rejects a `.field`
// reference that appears outside any each block (nothing for it to resolve against).

function buildAst(tokens) {
  const errors = [];
  const root = [];
  const stack = [{ children: root, insideEach: false }];

  for (const token of tokens) {
    const top = stack[stack.length - 1];
    switch (token.kind) {
      case 'text':
        top.children.push({ type: 'text', value: token.value });
        break;
      case 'inline':
        top.children.push({ type: 'inline', id: token.id, fields: token.fields });
        break;
      case 'field-ref':
        if (!top.insideEach) {
          errors.push({ message: 'field reference ("{{ .field }}") used outside an {{# each }} block' });
        } else {
          top.children.push({ type: 'field-ref', fields: token.fields });
        }
        break;
      case 'trace':
        top.children.push({ type: 'trace', from: token.from, to: token.to, via: token.via });
        break;
      case 'view':
        top.children.push({ type: 'view', path: token.path, as: token.as, fit: token.fit });
        break;
      case 'figure':
        top.children.push({ type: 'figure', path: token.path, caption: token.caption, as: token.as });
        break;
      case 'figref':
        top.children.push({ type: 'figref', name: token.name });
        break;
      case 'each-open': {
        const node = {
          type: 'each',
          entityType: token.entityType,
          where: token.where,
          orderBy: token.orderBy,
          children: [],
        };
        top.children.push(node);
        stack.push({ children: node.children, insideEach: true });
        break;
      }
      case 'each-close':
        if (stack.length === 1) {
          errors.push({ message: '"{{/ each }}" with no matching "{{# each }}"' });
        } else {
          stack.pop();
        }
        break;
      case 'error':
        break; // the classifying error was already recorded in errors
      default:
        errors.push({ message: `internal: unknown token kind "${token.kind}"` });
    }
  }

  if (stack.length > 1) {
    errors.push({ message: `${stack.length - 1} unclosed "{{# each }}" block(s) — missing "{{/ each }}"` });
  }

  return { ast: root, errors };
}

// ── Public entry point ──────────────────────────────────────────────────

export function parseRecipe(text) {
  const fmMatch = FRONT_MATTER.exec(text);
  if (!fmMatch) {
    return {
      header: { document: undefined, canon: undefined, profile: 'neutral' },
      ast: [],
      errors: [{ message: 'recipe file must start with a YAML front-matter header (---\\n...\\n---)' }],
    };
  }

  const [, headerText, body] = fmMatch;
  const { header, errors: headerErrors } = parseHeader(headerText);
  const { tokens, errors: tokenErrors } = tokenize(body);
  const { ast, errors: astErrors } = buildAst(tokens);

  return { header, ast, errors: [...headerErrors, ...tokenErrors, ...astErrors] };
}
