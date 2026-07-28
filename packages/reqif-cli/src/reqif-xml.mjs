// Model ↔ ReqIF XML — notations/packages/reqif.md §6.
//
// Emits/reads a ReqIF-conformant document (REQ-IF root, THE-HEADER,
// CORE-CONTENT/REQ-IF-CONTENT with DATATYPES / SPEC-TYPES / SPEC-OBJECTS /
// SPEC-RELATIONS / SPECIFICATIONS) covering the five attribute datatypes this
// package supports in v1 (reqif.md §2.6): STRING, XHTML (escaped plain text,
// no rich markup), DATE, INTEGER, BOOLEAN.
//
// Round-trip keys: an ATTRIBUTE-DEFINITION's LONG-NAME is the authoritative
// `values` map key (not its IDENTIFIER, which is a synthesized, opaque id);
// a SPEC-RELATION-TYPE's LONG-NAME is the authoritative `type` label on a
// spec-relation, for the same reason.

import { escapeXmlAttr, escapeXmlText, parseXml, findChild, findChildren, textAt } from './xml.mjs';

const DATATYPE_TAG = { STRING: 'STRING', XHTML: 'XHTML', DATE: 'DATE', INTEGER: 'INTEGER', BOOLEAN: 'BOOLEAN' };

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function attrDefId(sotId, key) { return `${sotId}__attr__${slug(key)}`; }
function reltypeId(typeLabel) { return `reltype-${slug(typeLabel)}`; }

function formatValue(datatype, value) {
  if (datatype === 'BOOLEAN') return value ? 'true' : 'false';
  return String(value);
}

function parseValue(datatype, raw) {
  if (datatype === 'INTEGER') return parseInt(raw, 10);
  if (datatype === 'BOOLEAN') return raw === 'true';
  return raw;
}

// --- build (model → XML) ----------------------------------------------

function line(depth, s) { return `${'  '.repeat(depth)}${s}`; }
function open(depth, tag, attrs = {}) {
  const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`).join('');
  return line(depth, `<${tag}${a}>`);
}
function close(depth, tag) { return line(depth, `</${tag}>`); }
function leaf(depth, tag, text) { return line(depth, `<${tag}>${escapeXmlText(text)}</${tag}>`); }
function selfClose(depth, tag, attrs = {}) {
  const a = Object.entries(attrs).map(([k, v]) => ` ${k}="${escapeXmlAttr(v)}"`).join('');
  return line(depth, `<${tag}${a}/>`);
}

export function modelToReqifXml(model) {
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push(open(0, 'REQ-IF'));

  out.push(open(1, 'THE-HEADER'));
  out.push(open(2, 'REQ-IF-HEADER', { IDENTIFIER: 'transitrix-reqif-header-1' }));
  out.push(leaf(3, 'REQ-IF-TOOL-ID', 'transitrix-reqif-cli'));
  out.push(leaf(3, 'REQ-IF-VERSION', '1.0'));
  out.push(leaf(3, 'SOURCE-TOOL-ID', 'transitrix-reqif-cli'));
  out.push(leaf(3, 'TITLE', 'Transitrix ReqIF package export'));
  out.push(close(2, 'REQ-IF-HEADER'));
  out.push(close(1, 'THE-HEADER'));

  out.push(open(1, 'CORE-CONTENT'));
  out.push(open(2, 'REQ-IF-CONTENT'));

  // DATATYPES — only the datatypes actually used by a spec-object-type attribute.
  const usedDatatypes = new Set();
  for (const sot of model.specObjectTypes) for (const a of sot.attributes) usedDatatypes.add(a.datatype);
  out.push(open(3, 'DATATYPES'));
  for (const dt of [...usedDatatypes].sort()) {
    const tag = DATATYPE_TAG[dt];
    if (!tag) throw new Error(`modelToReqifXml: unsupported datatype "${dt}" (reqif.md §2.6)`);
    out.push(selfClose(4, `DATATYPE-DEFINITION-${tag}`, { IDENTIFIER: `datatype-${dt.toLowerCase()}`, 'LONG-NAME': dt }));
  }
  out.push(close(3, 'DATATYPES'));

  // SPEC-TYPES — one SPEC-OBJECT-TYPE per model entry, one SPEC-RELATION-TYPE
  // per distinct relation `type` label in use.
  out.push(open(3, 'SPEC-TYPES'));
  for (const sot of model.specObjectTypes) {
    out.push(open(4, 'SPEC-OBJECT-TYPE', { IDENTIFIER: sot.id, 'LONG-NAME': sot.name }));
    out.push(open(5, 'SPEC-ATTRIBUTES'));
    for (const a of sot.attributes) {
      const tag = DATATYPE_TAG[a.datatype];
      out.push(open(6, `ATTRIBUTE-DEFINITION-${tag}`, { IDENTIFIER: attrDefId(sot.id, a.key), 'LONG-NAME': a.key }));
      out.push(open(7, 'TYPE'));
      out.push(leaf(8, `DATATYPE-DEFINITION-${tag}-REF`, `datatype-${a.datatype.toLowerCase()}`));
      out.push(close(7, 'TYPE'));
      out.push(close(6, `ATTRIBUTE-DEFINITION-${tag}`));
    }
    out.push(close(5, 'SPEC-ATTRIBUTES'));
    out.push(close(4, 'SPEC-OBJECT-TYPE'));
  }
  const relTypes = new Map(); // label -> id
  for (const r of model.specRelations) if (!relTypes.has(r.type)) relTypes.set(r.type, reltypeId(r.type));
  for (const [label, id] of relTypes) {
    out.push(selfClose(4, 'SPEC-RELATION-TYPE', { IDENTIFIER: id, 'LONG-NAME': label }));
  }
  out.push(close(3, 'SPEC-TYPES'));

  // SPEC-OBJECTS
  out.push(open(3, 'SPEC-OBJECTS'));
  for (const so of model.specObjects) {
    const sot = model.specObjectTypes.find(t => t.id === so.type);
    if (!sot) throw new Error(`modelToReqifXml: spec-object "${so.id}" has unresolved type "${so.type}"`);
    out.push(open(4, 'SPEC-OBJECT', { IDENTIFIER: so.id }));
    out.push(open(5, 'VALUES'));
    for (const [key, value] of Object.entries(so.values)) {
      const attrDef = sot.attributes.find(a => a.key === key);
      if (!attrDef) throw new Error(`modelToReqifXml: spec-object "${so.id}" carries value "${key}" undeclared on type "${sot.id}"`);
      const tag = DATATYPE_TAG[attrDef.datatype];
      out.push(open(6, `ATTRIBUTE-VALUE-${tag}`, { 'THE-VALUE': formatValue(attrDef.datatype, value) }));
      out.push(open(7, 'DEFINITION'));
      out.push(leaf(8, `ATTRIBUTE-DEFINITION-${tag}-REF`, attrDefId(sot.id, key)));
      out.push(close(7, 'DEFINITION'));
      out.push(close(6, `ATTRIBUTE-VALUE-${tag}`));
    }
    out.push(close(5, 'VALUES'));
    out.push(open(5, 'TYPE'));
    out.push(leaf(6, 'SPEC-OBJECT-TYPE-REF', so.type));
    out.push(close(5, 'TYPE'));
    out.push(close(4, 'SPEC-OBJECT'));
  }
  out.push(close(3, 'SPEC-OBJECTS'));

  // SPEC-RELATIONS — first-class, addressable (reqif.md §2.7).
  out.push(open(3, 'SPEC-RELATIONS'));
  for (const r of model.specRelations) {
    out.push(open(4, 'SPEC-RELATION', { IDENTIFIER: r.id }));
    out.push(open(5, 'TYPE'));
    out.push(leaf(6, 'SPEC-RELATION-TYPE-REF', relTypes.get(r.type)));
    out.push(close(5, 'TYPE'));
    out.push(open(5, 'SOURCE'));
    out.push(leaf(6, 'SPEC-OBJECT-REF', r.source));
    out.push(close(5, 'SOURCE'));
    out.push(open(5, 'TARGET'));
    out.push(leaf(6, 'SPEC-OBJECT-REF', r.target));
    out.push(close(5, 'TARGET'));
    out.push(close(4, 'SPEC-RELATION'));
  }
  out.push(close(3, 'SPEC-RELATIONS'));

  // SPECIFICATIONS — one SPECIFICATION per spec-hierarchy, CHILDREN is a tree
  // of SPEC-HIERARCHY nodes.
  out.push(open(3, 'SPECIFICATIONS'));
  let nodeCounter = 0;
  function writeHierarchyNode(depth, node) {
    const nid = `${'node'}-${++nodeCounter}`;
    out.push(open(depth, 'SPEC-HIERARCHY', { IDENTIFIER: nid }));
    out.push(open(depth + 1, 'OBJECT'));
    out.push(leaf(depth + 2, 'SPEC-OBJECT-REF', node.object));
    out.push(close(depth + 1, 'OBJECT'));
    if (node.children && node.children.length > 0) {
      out.push(open(depth + 1, 'CHILDREN'));
      for (const child of node.children) writeHierarchyNode(depth + 2, child);
      out.push(close(depth + 1, 'CHILDREN'));
    }
    out.push(close(depth, 'SPEC-HIERARCHY'));
  }
  for (const sh of model.specHierarchies) {
    const attrs = { IDENTIFIER: sh.id };
    if (sh.name) attrs['LONG-NAME'] = sh.name;
    out.push(open(4, 'SPECIFICATION', attrs));
    out.push(open(5, 'CHILDREN'));
    for (const child of sh.children) writeHierarchyNode(6, child);
    out.push(close(5, 'CHILDREN'));
    out.push(close(4, 'SPECIFICATION'));
  }
  out.push(close(3, 'SPECIFICATIONS'));

  out.push(close(2, 'REQ-IF-CONTENT'));
  out.push(close(1, 'CORE-CONTENT'));
  out.push(close(0, 'REQ-IF'));

  return out.join('\n') + '\n';
}

// --- parse (XML → model) ------------------------------------------------

export function reqifXmlToModel(xmlText) {
  const root = parseXml(xmlText);
  const content = root && findChild(findChild(root, 'CORE-CONTENT'), 'REQ-IF-CONTENT');
  if (!content) throw new Error('reqifXmlToModel: no CORE-CONTENT/REQ-IF-CONTENT found');

  // DATATYPES — build id → datatype-name (e.g. "datatype-string" → "STRING").
  const datatypesEl = findChild(content, 'DATATYPES');
  const datatypeById = new Map();
  if (datatypesEl) {
    for (const node of datatypesEl.children) {
      const m = node.tag.match(/^DATATYPE-DEFINITION-([A-Z]+)$/);
      if (m) datatypeById.set(node.attrs.IDENTIFIER, m[1]);
    }
  }

  const specTypesEl = findChild(content, 'SPEC-TYPES');

  // spec-object-types + attribute-definition id → { key, datatype }.
  const specObjectTypes = [];
  const attrDefById = new Map();
  for (const sotEl of findChildren(specTypesEl, 'SPEC-OBJECT-TYPE')) {
    const attributes = [];
    const attrsEl = findChild(sotEl, 'SPEC-ATTRIBUTES');
    for (const adEl of (attrsEl ? attrsEl.children : [])) {
      const m = adEl.tag.match(/^ATTRIBUTE-DEFINITION-([A-Z]+)$/);
      if (!m) continue;
      const datatype = m[1];
      const key = adEl.attrs['LONG-NAME'];
      attributes.push({ key, datatype });
      attrDefById.set(adEl.attrs.IDENTIFIER, { key, datatype });
    }
    specObjectTypes.push({
      package: 'reqif', kind: 'spec-object-type',
      id: sotEl.attrs.IDENTIFIER, name: sotEl.attrs['LONG-NAME'], attributes,
    });
  }

  // spec-relation-types: id → label (LONG-NAME is the authoritative `type` text).
  const relTypeLabelById = new Map();
  for (const rtEl of findChildren(specTypesEl, 'SPEC-RELATION-TYPE')) {
    relTypeLabelById.set(rtEl.attrs.IDENTIFIER, rtEl.attrs['LONG-NAME']);
  }

  // spec-objects
  const specObjectsEl = findChild(content, 'SPEC-OBJECTS');
  const specObjects = [];
  for (const soEl of (specObjectsEl ? specObjectsEl.children : [])) {
    const typeRef = textAt(soEl, 'TYPE.SPEC-OBJECT-TYPE-REF');
    const values = {};
    const valuesEl = findChild(soEl, 'VALUES');
    for (const vEl of (valuesEl ? valuesEl.children : [])) {
      const defRefTag = vEl.tag.replace('ATTRIBUTE-VALUE-', 'ATTRIBUTE-DEFINITION-') + '-REF';
      const defId = textAt(vEl, `DEFINITION.${defRefTag}`);
      const def = attrDefById.get(defId);
      if (!def) throw new Error(`reqifXmlToModel: spec-object "${soEl.attrs.IDENTIFIER}" value references unknown attribute-definition "${defId}"`);
      values[def.key] = parseValue(def.datatype, vEl.attrs['THE-VALUE']);
    }
    specObjects.push({ package: 'reqif', kind: 'spec-object', id: soEl.attrs.IDENTIFIER, type: typeRef, values });
  }

  // spec-relations
  const specRelationsEl = findChild(content, 'SPEC-RELATIONS');
  const specRelations = [];
  for (const srEl of (specRelationsEl ? specRelationsEl.children : [])) {
    const relTypeRef = textAt(srEl, 'TYPE.SPEC-RELATION-TYPE-REF');
    specRelations.push({
      package: 'reqif', kind: 'spec-relation', id: srEl.attrs.IDENTIFIER,
      type: relTypeLabelById.get(relTypeRef),
      source: textAt(srEl, 'SOURCE.SPEC-OBJECT-REF'),
      target: textAt(srEl, 'TARGET.SPEC-OBJECT-REF'),
    });
  }

  // spec-hierarchies (SPECIFICATIONS)
  const specificationsEl = findChild(content, 'SPECIFICATIONS');
  const specHierarchies = [];
  function readHierarchyNode(shEl) {
    const object = textAt(shEl, 'OBJECT.SPEC-OBJECT-REF');
    const childrenEl = findChild(shEl, 'CHILDREN');
    const children = childrenEl ? findChildren(childrenEl, 'SPEC-HIERARCHY').map(readHierarchyNode) : [];
    return { object, children };
  }
  for (const specEl of (specificationsEl ? specificationsEl.children : [])) {
    const topChildrenEl = findChild(specEl, 'CHILDREN');
    const children = topChildrenEl ? findChildren(topChildrenEl, 'SPEC-HIERARCHY').map(readHierarchyNode) : [];
    const entry = { package: 'reqif', kind: 'spec-hierarchy', id: specEl.attrs.IDENTIFIER, children };
    if (specEl.attrs['LONG-NAME']) entry.name = specEl.attrs['LONG-NAME'];
    specHierarchies.push(entry);
  }

  return { specObjectTypes, specObjects, specRelations, specHierarchies };
}
