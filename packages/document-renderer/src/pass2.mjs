// Pass 2 — fills the instruction slots pass 1 left untouched.
//
// Pass 1 is deterministic and calls no model (pass1.mjs). Pass 2 is the other
// half of the two-pass split: "an agent, executing the instruction the slot
// carries". This module stays agent-agnostic on purpose —
// it takes the agent as a caller-supplied `fill` hook, the same shape pass 1
// already uses for figure rasterisation (`rasterise`). Nothing in this file
// calls a model; it orchestrates a caller-supplied one.
//
// The rules below are normative — the 2026-08-12 decision "an instruction
// slot specifies the outcome, not the procedure" (accepted 2026-08-15):
//
//   * `inputs:` is a closed list. A slot declaring none is not fillable by a
//     conforming implementation — it renders open, verdict `not-attempted`,
//     and `fill` is never called for it.
//   * Every statement in a filled slot is attributable to a declared input —
//     that is the filler's obligation, not this module's; pass 2 only carries
//     the filler's own account of what it used, and rejects the one part of
//     that account it CAN check mechanically: an attribution outside the
//     slot's own declared `inputs:` is a closed-list violation, not a content
//     question, so it throws rather than passing it through.
//   * An insufficient answer is declared, not padded — a slot the filler could
//     not fill to `sufficient:` stays visibly open, never dressed up as text
//     that reads like an answer.
//   * The run record — built from this module's `slotResults`, see
//     run-record.mjs — carries a verdict per slot: `sufficient`,
//     `insufficient`, or `not-attempted`.
//
// Scope: filling slots and rewriting the markdown they sit in. Nothing here
// writes to the model, and nothing here decides what a "sufficient" answer
// looks like beyond what the filler itself reports.

// Matches a `{{# instruct <slot-id> }} … {{/ instruct }}` span, verbatim, the
// same shape pass 1 copies through untouched
// (DIRECTIVE_LANGUAGE.md §4.2 — the body is opaque). Pass 2 deliberately does
// not re-parse the slot body; it locates the span in pass 1's own markdown
// output and treats it as a unit to replace, matching pass1's instructionSlots
// (by document order) for the instruction text.
const INSTRUCT_SPAN = /\{\{#\s*instruct\s+([a-z0-9][a-z0-9-]*)\s*\}\}[\s\S]*?\{\{\/\s*instruct\s*\}\}/g;

const OPEN_MARKER = '*Open — not answered.*';
const DISCLOSURE =
  '\n\n*This section was produced by an automated pass; it has not been admitted through a review gate.*';

function notAttempted(slot, reason) {
  return { ...slot, verdict: 'not-attempted', reason, text: null };
}

async function resolveSlot(slot, fill) {
  if (slot.inputs.length === 0) {
    return notAttempted(slot, 'no declared inputs');
  }
  if (typeof fill !== 'function') {
    return notAttempted(slot, 'no filler configured');
  }

  const outcome = await fill({
    slotId: slot.slotId,
    question: slot.question,
    inputs: slot.inputs,
    sufficient: slot.sufficient,
  });

  if (!outcome || (outcome.status !== 'sufficient' && outcome.status !== 'insufficient')) {
    throw new TypeError(
      `pass2: fill(${JSON.stringify(slot.slotId)}) must resolve to `
      + '{ status: "sufficient", text } or { status: "insufficient" }, '
      + `got ${JSON.stringify(outcome)}`,
    );
  }

  if (outcome.status === 'insufficient') {
    return { ...slot, verdict: 'insufficient', reason: null, text: null };
  }

  if (typeof outcome.text !== 'string' || outcome.text.trim() === '') {
    throw new TypeError(
      `pass2: fill(${JSON.stringify(slot.slotId)}) reported "sufficient" with no text`,
    );
  }

  const attributions = Array.isArray(outcome.attributions) ? outcome.attributions : [];
  // The closed-input discipline (2026-08-12 ADR §3, §6) is mechanically checkable
  // at this one point: a filler cannot attribute a statement to something it was
  // never given. Content-level attribution — that each *sentence* is actually
  // supported by what it cites — stays the filler's own obligation; this module
  // only enforces that it cited from the set it was allowed to read.
  const undeclared = attributions.filter((a) => !slot.inputs.includes(a));
  if (undeclared.length > 0) {
    throw new TypeError(
      `pass2: fill(${JSON.stringify(slot.slotId)}) attributed to ${JSON.stringify(undeclared)}, `
      + `not in this slot's declared inputs ${JSON.stringify(slot.inputs)} — inputs is a closed list`,
    );
  }

  return {
    ...slot,
    verdict: 'sufficient',
    reason: null,
    text: outcome.text,
    attributions,
  };
}

/**
 * Run pass 2 over pass 1's output.
 *
 * @param {object} options
 * @param {string} options.markdown          pass 1's `markdown` — instruction
 *                                            slots still present verbatim
 * @param {Array}  options.instructionSlots   pass 1's `instructionSlots`, in
 *                                            document order
 * @param {Function} [options.fill]           `(slot) => Promise<{status, text?}>`
 *                                            — the agent. Omitted entirely, every
 *                                            slot resolves `not-attempted` and pass 2
 *                                            behaves like pass 1 alone: unfilled and
 *                                            visible.
 * @returns {Promise<{markdown, slotResults}>}
 */
export async function runPass2({ markdown, instructionSlots, fill } = {}) {
  const spans = [...markdown.matchAll(INSTRUCT_SPAN)];
  if (spans.length !== instructionSlots.length) {
    throw new Error(
      `pass2: markdown carries ${spans.length} instruction slot(s) but `
      + `instructionSlots lists ${instructionSlots.length} — pass 2 must run `
      + 'against the markdown pass 1 produced for the same template',
    );
  }
  for (let i = 0; i < spans.length; i++) {
    if (spans[i][1] !== instructionSlots[i].slotId) {
      throw new Error(
        `pass2: slot order mismatch at position ${i} — markdown has `
        + `"${spans[i][1]}", instructionSlots has "${instructionSlots[i].slotId}"`,
      );
    }
  }

  const slotResults = [];
  for (const slot of instructionSlots) {
    slotResults.push(await resolveSlot(slot, fill));
  }

  let cursor = 0;
  let out = '';
  let i = 0;
  for (const match of markdown.matchAll(INSTRUCT_SPAN)) {
    out += markdown.slice(cursor, match.index);
    const result = slotResults[i];
    out += result.verdict === 'sufficient' ? `${result.text}${DISCLOSURE}` : OPEN_MARKER;
    cursor = match.index + match[0].length;
    i++;
  }
  out += markdown.slice(cursor);

  return { markdown: out, slotResults };
}
