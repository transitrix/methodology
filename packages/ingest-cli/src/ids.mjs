// Canonical ID grammar — IDS_AND_REFERENCES.md §1: <TYPE>-[<middle>-]<INTEGER>.
// Uppercase TYPE (letter-led, letters/digits/underscore), optional middle
// segments, terminal positive integer with NO leading zeros.

export const ID_RE = /^[A-Z][A-Z0-9_]*(?:-[A-Za-z0-9_]+)*-[1-9][0-9]*$/;

// A bare TYPE prefix: uppercase, letter-led.
export const TYPE_RE = /^[A-Z][A-Z0-9_]*$/;

export function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

export function isValidType(type) {
  return typeof type === 'string' && TYPE_RE.test(type);
}

// Split an ID into { type, middle: [...], ordinal }. Returns null if invalid.
export function parseId(id) {
  if (!isValidId(id)) return null;
  const parts = id.split('-');
  const ordinal = Number(parts[parts.length - 1]);
  const type = parts[0];
  const middle = parts.slice(1, -1);
  return { type, middle, ordinal };
}

// Compare two IDs of the same TYPE/middle by their terminal integer, numerically.
export function compareIds(a, b) {
  const pa = parseId(a);
  const pb = parseId(b);
  if (!pa || !pb) return String(a).localeCompare(String(b));
  if (pa.type !== pb.type) return pa.type.localeCompare(pb.type);
  const ma = pa.middle.join('-');
  const mb = pb.middle.join('-');
  if (ma !== mb) return ma.localeCompare(mb);
  return pa.ordinal - pb.ordinal;
}

// Build a canonical ID. `middle` is an array of already-sanitised segments.
export function makeId(type, middle, ordinal) {
  const segs = [type, ...(middle || []), String(ordinal)];
  const id = segs.join('-');
  if (!isValidId(id)) {
    throw new Error(`makeId produced an invalid ID: ${id}`);
  }
  return id;
}

// Lower-case a free-text label into a safe middle segment (letters/digits/underscore,
// hyphen-free so it does not collide with the ID separator). Empty → null.
export function slugSegment(text) {
  const s = String(text || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return s || null;
}
