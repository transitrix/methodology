// Shared syntax primitives of the document directive language.
//
// `.ttrs` templates and the view engine's skeleton files are one notation with two
// current implementations (parse-template.mjs here, parse-skeleton.mjs in
// @transitrix/document-view-engine). The two differ in which constructs they
// implement and in how they report errors — but the pieces below are the grammar
// itself, and were carried as byte-identical copies in both. One notation, one
// parser: they are defined once, here, and imported by both.
//
// What deliberately stays with each parser: the construct set it implements, its
// error shape (this package's codes vs. the engine's bare messages), and its AST
// node names. Those are implementation surface, not grammar.

import { CAPABILITY_PREFIX } from './ids.mjs';

// A document file is YAML front matter followed by a body.
export const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?([\s\S]*)$/;

// A field-path segment / header key.
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Header scalars are the flat subset both headers use: an optional trailing ` #`
// comment, and optional single or double quoting.
export function cleanScalar(raw) {
  let s = String(raw).trim();
  const hash = s.indexOf(' #');
  if (hash >= 0) s = s.slice(0, hash).trim();
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

// Reads a front-matter block into a flat field map. Which fields are required, and
// what a missing one costs, is each parser's own business — this only reads.
export function parseHeaderFields(headerText) {
  const fields = {};
  for (const line of headerText.split(/\r?\n/)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/);
    if (!m) continue;
    fields[m[1]] = cleanScalar(m[2]);
  }
  return fields;
}

// Splits `REQ-14.text` into its id and the raw field path after it. A CAPABILITY id
// embeds its own dots (the V/H diagram address), so that form is matched first.
export function splitIdAndFields(trimmed) {
  const capMatch = CAPABILITY_PREFIX.exec(trimmed);
  if (capMatch) return { id: capMatch[1], fieldsRaw: capMatch[2] ?? '' };
  const dot = trimmed.indexOf('.');
  if (dot === -1) return { id: trimmed, fieldsRaw: '' };
  return { id: trimmed.slice(0, dot), fieldsRaw: trimmed.slice(dot + 1) };
}
