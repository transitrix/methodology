// `record` — write or update one decision row in decisions.reviewed.yaml. Never
// touches the presentation artifact (review-queue.yaml / review-digest.yaml) or canon;
// `apply` is the only step that writes admission transitions.

import { loadDecisions, saveDecisions, emptyDecisions, defaultDecisionsPath } from './io.mjs';

const DECISIONS = new Set(['accept', 'reject', 'defer']);
const AUTHORITIES = new Set(['ai_reviewed', 'expert_confirmed']);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export class RecordError extends Error {}

function validate({ itemRef, decision, by, at, reason, reviewerAuthority }) {
  if (!itemRef) throw new RecordError('record: --item-ref is required');
  if (!DECISIONS.has(decision)) throw new RecordError(`record: --decision must be accept|reject|defer (got ${JSON.stringify(decision)})`);
  if (!by) throw new RecordError('record: --by is required');
  if (!at) throw new RecordError('record: --at is required');
  if (!ISO_DATE_RE.test(at) && !ISO_DATETIME_RE.test(at)) throw new RecordError('record: --at must be YYYY-MM-DD or an ISO-8601 timestamp');
  if (decision === 'reject' && !reason) throw new RecordError('record: --reason is required when --decision reject');
  if (reviewerAuthority && !AUTHORITIES.has(reviewerAuthority)) throw new RecordError(`record: --reviewer-authority must be ai_reviewed|expert_confirmed (got ${JSON.stringify(reviewerAuthority)})`);
  if (reviewerAuthority && decision !== 'accept') throw new RecordError('record: --reviewer-authority is only meaningful with --decision accept');
}

// Create (if absent) or update decisions.reviewed.yaml beside `sourceGatePath`,
// upserting one row by item_ref (idempotent re-record — a later `record` call for the
// same item_ref replaces the earlier row rather than duplicating it).
export async function record({ orgRoot, sourceGatePath, generatedBy, asOf, itemRef, kind, decision, by, at, reason, reviewerAuthority }) {
  validate({ itemRef, decision, by, at, reason, reviewerAuthority });

  const path = defaultDecisionsPath(sourceGatePath);
  const existing = await loadDecisions(path);
  const doc = existing || emptyDecisions({
    generatedBy: generatedBy || '@transitrix/decisions-cli',
    orgRoot,
    asOf,
    sourceGate: sourceGatePath,
  });

  const row = {
    item_ref: itemRef,
    ...(kind ? { kind } : {}),
    decision,
    by,
    at,
    ...(reason ? { reason } : {}),
    ...(decision === 'accept' && reviewerAuthority ? { reviewer_authority: reviewerAuthority } : {}),
  };

  const idx = doc.decisions.findIndex((d) => d.item_ref === itemRef);
  const replaced = idx >= 0;
  if (replaced) doc.decisions[idx] = row; else doc.decisions.push(row);

  await saveDecisions(doc, path);
  return { path, row, replaced };
}
