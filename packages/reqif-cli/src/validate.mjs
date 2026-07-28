// Package-internal validator — notations/packages/reqif.md §5 (REQIF-001..007).
// Reaches only into the loaded model; never into an adopter's canon/, field/,
// or codex/ (PACKAGES.md §4.2 — a package's own validator checks the
// package's own content only).

import { isValidPackageId, isValidCoreId, coreIdType } from './ids.mjs';

const SUPPORTED_DATATYPES = new Set(['STRING', 'XHTML', 'DATE', 'INTEGER', 'BOOLEAN']);
const CORE_REF_TYPES = new Set(['REQUIREMENT', 'CONSTRAINT']);
const CANON_REF_KEY = 'Transitrix.CanonRef';

// Returns [{ code, severity, message }]. Empty array ⇒ the package validates clean.
export function validatePackage(model) {
  const findings = [];
  const flag = (code, message) => findings.push({ code, severity: 'error', message });

  const seenIds = new Map(); // id -> kind, for REQIF-002 (duplicate across the whole package)
  function checkId(kind, id, where) {
    if (!isValidPackageId(id, kind)) {
      flag('REQIF-001', `${where}: id "${id}" does not match the ${kind} grammar (reqif.md §2.2).`);
    }
    if (seenIds.has(id)) {
      flag('REQIF-002', `${where}: id "${id}" is also used by ${seenIds.get(id)}.`);
    } else {
      seenIds.set(id, where);
    }
  }

  const sotIds = new Set(model.specObjectTypes.map(t => t.id));
  const soIds = new Set(model.specObjects.map(o => o.id));

  for (const sot of model.specObjectTypes) {
    checkId('spec-object-type', sot.id, `spec-object-type "${sot.id}"`);
    for (const a of sot.attributes) {
      if (!SUPPORTED_DATATYPES.has(a.datatype)) {
        flag('REQIF-007', `spec-object-type "${sot.id}": attribute "${a.key}" names unsupported datatype "${a.datatype}" (reqif.md §2.6).`);
      }
    }
  }

  for (const so of model.specObjects) {
    checkId('spec-object', so.id, `spec-object "${so.id}"`);
    if (!sotIds.has(so.type)) {
      flag('REQIF-003', `spec-object "${so.id}": type "${so.type}" does not resolve to a spec-object-type in this package.`);
    } else {
      const sot = model.specObjectTypes.find(t => t.id === so.type);
      const attrByKey = new Map(sot.attributes.map(a => [a.key, a.datatype]));
      for (const key of Object.keys(so.values)) {
        if (key === CANON_REF_KEY) {
          const ref = so.values[key];
          if (!isValidCoreId(ref) || !CORE_REF_TYPES.has(coreIdType(ref))) {
            flag('REQIF-005', `spec-object "${so.id}": ${CANON_REF_KEY} value "${ref}" is not a grammar-valid REQUIREMENT or CONSTRAINT id (reqif.md §3).`);
          }
        } else if (attrByKey.has(key) && !SUPPORTED_DATATYPES.has(attrByKey.get(key))) {
          flag('REQIF-007', `spec-object "${so.id}": value "${key}" uses unsupported datatype "${attrByKey.get(key)}" (reqif.md §2.6).`);
        }
      }
    }
  }

  for (const sr of model.specRelations) {
    checkId('spec-relation', sr.id, `spec-relation "${sr.id}"`);
    if (!soIds.has(sr.source)) flag('REQIF-004', `spec-relation "${sr.id}": source "${sr.source}" does not resolve to a spec-object in this package.`);
    if (!soIds.has(sr.target)) flag('REQIF-004', `spec-relation "${sr.id}": target "${sr.target}" does not resolve to a spec-object in this package.`);
  }

  function checkHierarchyNode(node, where) {
    if (!soIds.has(node.object)) {
      flag('REQIF-006', `${where}: object "${node.object}" does not resolve to a spec-object in this package.`);
    }
    for (const child of node.children || []) checkHierarchyNode(child, `${where} → child of "${node.object}"`);
  }
  for (const sh of model.specHierarchies) {
    checkId('spec-hierarchy', sh.id, `spec-hierarchy "${sh.id}"`);
    for (const child of sh.children) checkHierarchyNode(child, `spec-hierarchy "${sh.id}"`);
  }

  return findings;
}
