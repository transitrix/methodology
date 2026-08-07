// Canonical ID grammar (notations/IDS_AND_REFERENCES.md §1-2): `<TYPE>-[<middle>-]<INTEGER>`,
// plus the CAPABILITY V/H diagram-address exception. Own copy by design — same posture
// as decisions-cli's src/yaml.mjs: zero cross-package runtime dependency.

const GENERAL_ID = /^[A-Z][A-Z0-9_]*(-[A-Za-z0-9]+)*-[1-9][0-9]*$/;
const CAPABILITY_ID = /^CAPABILITY-[VH][1-9][0-9]*(\.[1-9][0-9]*){0,2}$/;

export function isValidId(id) {
  if (typeof id !== 'string' || id === '') return false;
  return GENERAL_ID.test(id) || CAPABILITY_ID.test(id);
}

// A CAPABILITY id embeds its own dots (the V/H diagram address, IDS_AND_REFERENCES.md
// §2) — split it off first so those dots aren't mistaken for a field path separator.
export const CAPABILITY_PREFIX = /^(CAPABILITY-[VH][1-9][0-9]*(?:\.[1-9][0-9]*){0,2})(?:\.(.*))?$/;
