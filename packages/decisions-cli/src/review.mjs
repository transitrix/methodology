// `review` — optional interactive one-card admission review loop over
// list-undecided / record. Every
// accept/reject/defer here is exactly one `record` call — this module invents no
// new decision path or schema. `stop` is a first-class exit: the pending queue is
// a snapshot taken at review start, so a card left unanswered when the reviewer
// stops simply stays undecided — `list-undecided` (via a later `review` run) is
// the resume cursor, no separate session-state file.

import { loadGateItems, undecided } from './map-in.mjs';
import { loadDecisions, defaultDecisionsPath } from './io.mjs';
import { record } from './record.mjs';

const DECISIONS = new Set(['accept', 'reject', 'defer']);
const STOP = new Set(['stop', 'quit']);

function formatCard(item, index, total) {
  const lines = [`[${index + 1}/${total}] ${item.item_ref}  (${item.kind})`];
  if (item.derived_from_source) lines.push(`  source: ${item.derived_from_source}`);
  if (item.confidence !== undefined && item.confidence !== null) lines.push(`  confidence: ${item.confidence}`);
  if (Array.isArray(item.flags) && item.flags.length) lines.push(`  flags: ${item.flags.join('; ')}`);
  if (item.summary) lines.push(`  summary: ${item.summary}`);
  return lines.join('\n');
}

// `ask(prompt) -> Promise<string>` is injected so a real TTY (node:readline/promises)
// and a scripted test harness share the same loop. Returns
// { recorded, undecided, stopped } — `undecided` is what's left in the snapshot,
// including anything left unanswered by `stop`.
export async function runReview({ orgRoot, sourceGatePath, by, asOf, ask, log = () => {} }) {
  const { items } = await loadGateItems(sourceGatePath);
  const decisionsPath = defaultDecisionsPath(sourceGatePath);
  const existing = await loadDecisions(decisionsPath);
  const pending = undecided(items, existing ? existing.decisions : []);

  if (pending.length === 0) {
    log('review: nothing undecided — the queue is clear.');
    return { recorded: 0, undecided: 0, stopped: false };
  }

  let reviewerHandle = (by || '').trim();
  while (!reviewerHandle) reviewerHandle = (await ask('reviewer handle (--by): ')).trim();

  let recorded = 0;
  let stopped = false;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    log(formatCard(item, i, pending.length));

    let decision = null;
    while (!decision) {
      const answer = (await ask('accept | reject | defer | stop > ')).trim().toLowerCase();
      if (STOP.has(answer)) decision = 'stop';
      else if (DECISIONS.has(answer)) decision = answer;
      else log(`  unrecognised answer ${JSON.stringify(answer)} — accept | reject | defer | stop`);
    }

    if (decision === 'stop') { stopped = true; break; }

    let reason;
    if (decision === 'reject') {
      while (!reason) reason = (await ask('reason (required): ')).trim();
    } else if (decision === 'defer') {
      reason = (await ask('reason (optional, recommended): ')).trim() || undefined;
    }

    const { row, replaced } = await record({
      orgRoot, sourceGatePath, asOf,
      itemRef: item.item_ref, kind: item.kind, decision,
      by: reviewerHandle, at: asOf, reason,
    });
    recorded++;
    log(`  ${replaced ? 'updated' : 'recorded'}: ${row.item_ref} -> ${row.decision}`);
  }

  const remaining = pending.length - recorded;
  log(`\nrecorded=${recorded} undecided=${remaining}`);
  return { recorded, undecided: remaining, stopped };
}
