// The run record — the third artefact a full render produces, beside the
// Markdown and the PDF.
//
// What it must carry:
//
//   template id and version, repository commit, model id, run timestamp
//   (ISO 8601), and per instruction slot the instruction text and the text
//   it produced — every slot, including those that produced nothing.
//
// The 2026-08-12 ADR adds one more field per slot: a verdict —
// `sufficient` / `insufficient` / `not-attempted` — because that is the
// evidence a reader needs to tell "this section is missing" from "this
// section was tried and the model could not support an answer". This module
// only assembles the record; it computes nothing pass 1 and pass 2 have not
// already decided.
//
// This is a pure function over its inputs. It does not read the filesystem
// or git — `repositoryCommit` and `modelId` are the caller's to supply,
// because "which commit" and "which model" are facts about the run's
// environment, not something a record-builder can discover on its own
// without inventing a dependency this package does not otherwise carry.

/**
 * @param {object} options
 * @param {object} options.header          pass 1's `header` — carries
 *                                          `template_id` and `template_version`
 * @param {string} [options.repositoryCommit] the commit the repository was
 *                                          read at; `null` when no repository
 *                                          was configured for this run
 * @param {string} [options.modelId]       identifies which model ran pass 2;
 *                                          `null` when pass 2 filled nothing
 *                                          (no `fill` supplied)
 * @param {string} [options.runTimestamp]  ISO 8601 timestamp; defaults to now
 * @param {string} options.renderDate      pass 1's `renderDate` — the date
 *                                          validity was resolved at
 * @param {string} options.profile         pass 1's `profile` — `strict` | `review`
 * @param {Array}  options.slotResults     pass 2's `slotResults`, in document order
 * @returns {object} a plain, JSON-serialisable run record
 */
export function buildRunRecord({
  header, repositoryCommit = null, modelId = null, runTimestamp, renderDate, profile, slotResults = [],
} = {}) {
  if (!header) {
    throw new TypeError('buildRunRecord: header is required — pass 1 must have parsed the template');
  }
  return {
    template_id: header.template_id,
    template_version: header.template_version,
    repository_commit: repositoryCommit,
    model_id: modelId,
    run_timestamp: runTimestamp ?? new Date().toISOString(),
    render_date: renderDate,
    profile,
    // Every slot pass 1 found, in document order — including one that
    // produced nothing. A slot absent from this list would be indistinguishable
    // from a slot that was never in the template at all.
    slots: slotResults.map((s) => ({
      slot_id: s.slotId,
      question: s.question,
      inputs: s.inputs,
      sufficient: s.sufficient,
      verdict: s.verdict,
      reason: s.reason ?? null,
      produced_text: s.text ?? null,
      attributions: s.attributions ?? [],
    })),
  };
}

// Newline-terminated, stable key order (object literals above already fix
// it) — the record is written as one file, not diffed field-by-field, so
// pretty JSON is the readable choice over a packed one.
export function serializeRunRecord(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
}
