// Telemetry (§6) — records which types, fields, relation kinds and matrix
// pairs a render referenced, and how often, plus a tally of each §3 failure
// state. Threaded through render.mjs's single render pass — no second AST
// walk, no canon re-read.
//
// §6 draws a hard line on what this may hold: "which types, fields, relation
// kinds and matrix pairs were referenced and how often; counts of each
// failure state; derivation share. Do not record: section titles, heading
// text, prose, file names, skeleton ordering, or anything from which a
// layout could be reconstructed." Every key below is a canonical TYPE name,
// a `TYPE.field` pair, a relation kind, or a `from|to|via` triple — never a
// document position, heading string, or file path — so nothing recorded
// here can be replayed back into a document's shape. Derivation share is
// tracked separately by derivation-share.mjs; render.mjs folds its own
// already-computed number into the telemetry snapshot this module produces.

function bump(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toObject(map) {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function createTelemetryCollector() {
  const types = new Map();
  const fields = new Map();
  const relations = new Map();
  const matrixPairs = new Map();
  const failureStates = new Map();

  return {
    recordType(type) {
      if (type) bump(types, type);
    },
    // `fieldPath` is the `.field.field...` array off an `{{ ID.a.b }}` /
    // `{{ .a.b }}` reference — recorded as the dotted path under its type,
    // never the id or the surrounding prose.
    recordField(type, fieldPath) {
      if (!type || !fieldPath || fieldPath.length === 0) return;
      bump(fields, `${type}.${fieldPath.join('.')}`);
    },
    recordRelation(via) {
      if (via) bump(relations, via);
    },
    recordMatrixPair(fromType, toType, via) {
      if (!fromType || !toType || !via) return;
      bump(matrixPairs, `${fromType}|${toType}|${via}`);
    },
    // §3's four states only — 'ok' is not a failure and is never counted.
    recordFailureState(state) {
      if (state && state !== 'ok') bump(failureStates, state);
    },
    snapshot() {
      return {
        types: toObject(types),
        fields: toObject(fields),
        relations: toObject(relations),
        matrixPairs: toObject(matrixPairs),
        failureStates: toObject(failureStates),
      };
    },
  };
}
