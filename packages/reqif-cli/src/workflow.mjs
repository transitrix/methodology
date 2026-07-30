// Workflow-state — the package's experimental surface, notations/packages/reqif.md
// §2.9. A `spec-object` MAY carry a top-level `workflow_state` field; absent
// means `draft` (the sequence's starting state). This module is the single
// place the state graph and its enforcement live — the `transition` CLI
// command is the only writer of this field, so a state written by this
// package's own tooling always arrived via a legal edge.
//
// Strictly linear, one step at a time — no skips, no jump straight to
// `superseded` from an earlier state (epic HUB-813's own
// acceptance criterion for #829: "no skipping draft -> approved without
// reviewed").

export const WORKFLOW_STATES = ['draft', 'reviewed', 'approved', 'baselined', 'superseded'];

const NEXT = {
  draft: 'reviewed',
  reviewed: 'approved',
  approved: 'baselined',
  baselined: 'superseded',
};

export function isWorkflowState(v) {
  return typeof v === 'string' && WORKFLOW_STATES.includes(v);
}

// A spec-object with no `workflow_state` is implicitly `draft` — this keeps
// every object from the base package (notations/packages/reqif.md §2.5, the
// #387 worked example) valid without modification; the experimental surface
// is opt-in.
export function currentState(specObject) {
  return specObject.workflow_state || 'draft';
}

export function isValidTransition(from, to) {
  return NEXT[from] === to;
}

// Returns a new spec-object with `workflow_state` advanced to `to`, or throws
// if the edge from the object's current state to `to` is not the single
// legal next step.
export function applyTransition(specObject, to) {
  const from = currentState(specObject);
  if (!isValidTransition(from, to)) {
    throw new Error(`illegal transition "${from}" -> "${to}" for spec-object "${specObject.id}" (allowed: "${from}" -> "${NEXT[from] || '(none — terminal state)'}")`);
  }
  return { ...specObject, workflow_state: to };
}
