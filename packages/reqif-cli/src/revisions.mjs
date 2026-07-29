// Revision history — the package's experimental surface, notations/packages/reqif.md
// §2.9. A `spec-object` MAY carry `revision` (its current revision number,
// default 1 when absent) and `revisions` (a list of past snapshots). The
// `revise` CLI command is the only writer of both fields together, so the
// two never drift apart.
//
// A snapshot captures the object's `values` map exactly as it stood *before*
// the edit being applied, tagged with the revision number that is ending —
// so "what changed, when" (epic vkgeorgia/strategy#813's #829 acceptance
// criterion) is answerable by diffing two adjacent entries (or the last
// entry against the object's current `values`).

export function currentRevision(specObject) {
  return Number.isInteger(specObject.revision) ? specObject.revision : 1;
}

// Returns a new spec-object: `values` merged with `changes`, `revision`
// bumped by one, and a snapshot of the pre-change `values` appended to
// `revisions`. `recordedAt` is an ISO-8601 timestamp string supplied by the
// caller (the CLI stamps it at invocation time; keeping it a parameter, not
// a `new Date()` call inside this module, keeps the function pure and
// testable).
export function reviseObject(specObject, changes, recordedAt) {
  const fromRevision = currentRevision(specObject);
  const priorValues = { ...specObject.values };
  const snapshot = { revision: fromRevision, values: priorValues, recorded_at: recordedAt };
  return {
    ...specObject,
    values: { ...specObject.values, ...changes },
    revision: fromRevision + 1,
    revisions: [...(specObject.revisions || []), snapshot],
  };
}

// "What changed, when" — the full history plus the current state, oldest
// first, for a `history` command to print.
export function historyOf(specObject) {
  const entries = (specObject.revisions || []).map(r => ({ revision: r.revision, values: r.values, recorded_at: r.recorded_at }));
  entries.push({ revision: currentRevision(specObject), values: specObject.values, recorded_at: null });
  return entries;
}
