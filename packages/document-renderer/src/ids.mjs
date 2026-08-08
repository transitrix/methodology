// Canonical ID grammar (notations/IDS_AND_REFERENCES.md §1-2): `<TYPE>-[<middle>-]<INTEGER>`,
// plus the CAPABILITY V/H diagram-address exception.
//
// One notation, one parser: this package owns the ID grammar for the document
// notation, and @transitrix/document-view-engine imports it from here rather than
// keeping a second copy. The copy it used to hold was byte-identical to this file's
// core, which is the drift-in-waiting that consolidation removes.

const GENERAL_ID = /^[A-Z][A-Z0-9_]*(-[A-Za-z0-9]+)*-[1-9][0-9]*$/;
const CAPABILITY_ID = /^CAPABILITY-[VH][1-9][0-9]*(\.[1-9][0-9]*){0,2}$/;

export function isValidId(id) {
  if (typeof id !== 'string' || id === '') return false;
  return GENERAL_ID.test(id) || CAPABILITY_ID.test(id);
}

// A CAPABILITY id embeds its own dots (the V/H diagram address, IDS_AND_REFERENCES.md
// §2) — split it off first so those dots aren't mistaken for a field path separator.
export const CAPABILITY_PREFIX = /^(CAPABILITY-[VH][1-9][0-9]*(?:\.[1-9][0-9]*){0,2})(?:\.(.*))?$/;

// TYPE registry is open-ended (notations keep adding types) — an entity type is
// validated as an uppercase TYPE-shaped token, not against a closed list. Used by
// the `each` block's selection clause, which only document-view-engine implements
// today; the check itself is generic to the ID grammar, so it lives here.
const TYPE_NAME = /^[A-Z][A-Z0-9_]*$/;

export function isValidTypeName(name) {
  return typeof name === 'string' && TYPE_NAME.test(name);
}
