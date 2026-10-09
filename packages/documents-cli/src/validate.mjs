// Package-internal checks from notations/packages/documents.md §4.
// Citations are checked for syntax only; no core files are read.
import { validateEvent } from './events.mjs';

const PREFIX = { 'document-type': 'doct', document: 'doc', 'issuance-event': 'issue' };
const CORE_ID = /^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9]+)*-[1-9][0-9]*$/;
const CAPABILITY_ID = /^CAPABILITY-[VH][1-9][0-9]*(?:\.[1-9][0-9]*){0,2}$/;
const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)?$/;
const STATUSES = new Set(['draft', 'issued', 'superseded', 'archived']);
const DATATYPES = new Set(['STRING', 'TEXT', 'DATE', 'INTEGER', 'BOOLEAN']);
const map = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && v.length > 0;

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value.replace('Z', '.000Z');
}

// Each record carries its relative filename for actionable diagnostics.
// INPUT denotes unreadable/schema-invalid input, not an additional DOCS rule.
export function validateRecords(records) {
  const findings = [];
  const flag = (code, file, message) => findings.push({ code, severity: 'error', file, message });
  const ids = new Map();
  const types = new Map();
  for (const { file, value: obj } of records) {
    if (!map(obj) || obj.package !== 'documents' || !Object.hasOwn(PREFIX, obj.kind)) {
      flag('INPUT', file, 'Expected a mapping with package: documents and kind: document-type, document or issuance-event.');
      continue;
    }
    if (!text(obj.id) || !new RegExp(`^${PREFIX[obj.kind]}-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$`).test(obj.id)) {
      flag('DOCS-001', file, `id ${JSON.stringify(obj.id)} must use the ${PREFIX[obj.kind]}-<lowercase-slug>-<positive-integer> grammar.`);
    }
    if (ids.has(obj.id)) flag('DOCS-002', file, `id ${JSON.stringify(obj.id)} is also used in ${ids.get(obj.id)}.`);
    else ids.set(obj.id, file);
    if (obj.kind === 'issuance-event') findings.push(...validateEvent(obj, file));
    if (obj.kind === 'document-type') {
      const fieldsValid = Array.isArray(obj.fields) && obj.fields.length > 0 && obj.fields.every(f =>
        map(f) && text(f.key) && DATATYPES.has(f.datatype) && typeof f.required === 'boolean');
      if (!text(obj.name) || !fieldsValid || new Set(obj.fields?.map?.(f => f?.key)).size !== obj.fields?.length) {
        flag('INPUT', file, 'A document-type needs name and nonempty fields with unique key, supported datatype and boolean required.');
      } else types.set(obj.id, obj);
    }
  }
  for (const { file, value: obj } of records) {
    if (!map(obj) || obj.package !== 'documents' || obj.kind !== 'document') continue;
    const type = types.get(obj.type);
    if (!type) flag('DOCS-003', file, `type ${JSON.stringify(obj.type)} must resolve to a valid document-type in this package.`);
    if (!map(obj.values)) flag('DOCS-004', file, 'values must be a map containing the document-type required fields.');
    else if (type) {
      const keys = new Set(type.fields.map(f => f.key));
      for (const key of Object.keys(obj.values)) {
        if (!keys.has(key)) flag('DOCS-004', file, `values.${key} is not defined by ${obj.type}.`);
      }
      for (const field of type.fields) {
        if (field.required && !Object.hasOwn(obj.values, field.key)) flag('DOCS-004', file, `values is missing required field ${field.key} from ${obj.type}.`);
      }
    }
    if (Object.hasOwn(obj, 'canon_refs')) {
      if (!Array.isArray(obj.canon_refs)) flag('DOCS-005', file, 'canon_refs must be an array of core ID citations.');
      else for (const ref of obj.canon_refs) {
        if (typeof ref !== 'string' || !(CORE_ID.test(ref) || CAPABILITY_ID.test(ref))) {
          flag('DOCS-005', file, `canon_refs entry ${JSON.stringify(ref)} is not a grammar-valid core ID.`);
        }
      }
    }
    // §2.5 explicitly includes two-component versions such as "1.0".
    if (typeof obj.version !== 'string' || !VERSION.test(obj.version)) {
      flag('DOCS-006', file, 'version must be a quoted major.minor compatibility version or a full SemVer string.');
    }
    if (!timestamp(obj.issued_at)) flag('DOCS-006', file, 'issued_at must be a valid UTC second-precision timestamp (YYYY-MM-DDTHH:mm:ssZ).');
    if (!STATUSES.has(obj.status)) flag('DOCS-007', file, 'status must be draft, issued, superseded or archived.');
  }
  return findings;
}
