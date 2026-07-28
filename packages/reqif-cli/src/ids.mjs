// ReqIF package id grammar — notations/packages/reqif.md §2.2.
// <kind>-<slug>-<INTEGER>, entirely lowercase — unconditionally disjoint from the
// core grammar (IDS_AND_REFERENCES.md §1), which is TYPE-led and TYPE always
// starts with an uppercase letter. Standalone: this package carries no dependency
// on @transitrix/ingest-cli, so deleting the reqif-cli folder leaves no trace.

export const KIND_PREFIX = {
  'spec-object-type': 'sot',
  'spec-object': 'so',
  'spec-relation': 'sr',
  'spec-hierarchy': 'sh',
};

export const PREFIX_KIND = Object.fromEntries(
  Object.entries(KIND_PREFIX).map(([kind, prefix]) => [prefix, kind])
);

// Builds a regex that requires the exact kind token followed by a hyphen, so
// `so-…` and `sot-…` never collide (a prefix test alone would let `so-` match
// the front of `sot-…`).
export function idRegexFor(kind) {
  const prefix = KIND_PREFIX[kind];
  if (!prefix) throw new Error(`unknown package object kind: ${kind}`);
  return new RegExp(`^${prefix}-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$`);
}

export function isValidPackageId(id, kind) {
  return typeof id === 'string' && idRegexFor(kind).test(id);
}

// Core id grammar (IDS_AND_REFERENCES.md §1) — used only to validate a
// Transitrix.CanonRef value's shape (reqif.md §3); this package never resolves
// the reference against an adopter's canon/.
const CORE_ID_RE = /^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+)*-[1-9][0-9]*$/;

export function isValidCoreId(id) {
  return typeof id === 'string' && CORE_ID_RE.test(id);
}

export function coreIdType(id) {
  return typeof id === 'string' ? id.split('-')[0] : null;
}
