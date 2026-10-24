// Reconcile only reminders owned by this workflow; release decisions stay separate.
'use strict';
const MARKER = '_Updated by the weekly release-drift-check workflow._';

function integer(value, name, minimum) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`Invalid ${name}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) throw new Error(`Invalid ${name}`);
  return parsed;
}

module.exports = async function reconcile({github, context, core, env}) {
  const count = integer(env.COUNT, 'commit count', 0);
  const threshold = integer(env.THRESHOLD, 'threshold', 1);
  const tag = env.TAG;
  if (typeof tag !== 'string' || !/^v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.+-]+)?$/.test(tag)) {
    throw new Error('Invalid release tag');
  }
  const repo = context.repo;
  const label = 'needs:release';
  const issues = await github.paginate(github.rest.issues.listForRepo,
    {...repo, labels: label, state: 'open', per_page: 100});
  const owned = issues.filter(issue => !issue.pull_request &&
    issue.user?.login === 'github-actions[bot]' &&
    /^\[reminder\] (Cut a new release|Release drift)/.test(issue.title || '') &&
    (issue.body || '').includes(MARKER));
  if (owned.length > 1) throw new Error('Multiple release reminders require reconciliation');
  const overdue = count > threshold;
  const title = overdue
    ? `[reminder] Cut a new release — ${count} commits since ${tag}`
    : `[reminder] Release drift within threshold — ${count} commits since ${tag}`;
  const body = `**${count} commits** on \`main\` since \`${tag}\` — ` +
    (overdue ? `exceeds the ${threshold}-commit reminder threshold.\n\nRun through \`RELEASING.md\` checklist to prepare the next release.`
      : `within the ${threshold}-commit reminder threshold.\n\nClosing this automated reminder does not claim that a release was prepared or published. Release readiness still follows \`RELEASING.md\`.`) +
    `\n\n${MARKER}`;
  if (owned.length) {
    const issue = owned[0];
    if (!overdue || issue.title !== title || issue.body !== body) {
      await github.rest.issues.update({...repo, issue_number: issue.number, title, body,
        ...(!overdue ? {state: 'closed', state_reason: 'completed'} : {})});
    }
    core.notice(`Reconciled release reminder #${issue.number}`);
  } else if (overdue) {
    try { await github.rest.issues.getLabel({...repo, name: label}); }
    catch (error) {
      if (error.status !== 404) throw error;
      await github.rest.issues.createLabel({...repo, name: label, color: 'e11d48',
        description: 'A release tag is overdue'});
    }
    await github.rest.issues.create({...repo, title, body, labels: [label]});
  } else {
    core.notice(`Drift is ${count}; threshold is ${threshold}. No reminder needed.`);
  }
};
module.exports.MARKER = MARKER;
