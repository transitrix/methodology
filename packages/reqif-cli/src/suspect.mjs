// Suspect links — the package's experimental surface, notations/packages/reqif.md
// §2.9. A `spec-relation` MAY carry `recorded_target_revision`: the target
// `spec-object`'s `revision` (revisions.mjs) at the moment the relation was
// recorded. Absent means 1 — the relation was recorded against the target's
// original text, before any `revise` had happened.
//
// A relation is *suspect* when its target's current revision has moved past
// the revision the relation was recorded against — i.e. the target's text
// changed after the relation was drawn. This is computed, never stored: the
// alternative (a mutable `suspect: true` flag written into the relation
// file) could go stale the moment a further `revise` happens without a
// matching re-check, so suspicion is always derived fresh from the two
// revision numbers, the same way ReqIF tools compute it in practice.

import { currentRevision } from './revisions.mjs';

function recordedTargetRevision(specRelation) {
  return Number.isInteger(specRelation.recorded_target_revision) ? specRelation.recorded_target_revision : 1;
}

// Returns one entry per spec-relation whose target resolves within the
// model: { id, source, target, type, recordedTargetRevision, targetRevision,
// suspect }. A relation is absent from this list only if its target does
// not resolve (REQIF-004 already flags that as a validation error) — every
// resolvable relation gets an explicit `suspect: true|false`, so a suspect
// link is never visually indistinguishable from "no relation exists": the
// latter simply has no entry at all.
export function computeSuspectLinks(model) {
  const objectById = new Map(model.specObjects.map(o => [o.id, o]));
  const out = [];
  for (const r of model.specRelations) {
    const target = objectById.get(r.target);
    if (!target) continue;
    const recorded = recordedTargetRevision(r);
    const targetRevision = currentRevision(target);
    out.push({
      id: r.id,
      source: r.source,
      target: r.target,
      type: r.type,
      recordedTargetRevision: recorded,
      targetRevision,
      suspect: targetRevision > recorded,
    });
  }
  return out;
}
