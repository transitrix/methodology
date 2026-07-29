// Map a presentation artifact (review-queue.yaml or review-digest.yaml) into the flat
// list of gate items a human can decide on. ADR §2: absence of a decisions[] row means
// "not yet decided", never "reject" — list-undecided is a set difference, not a scan
// for a rejected/accepted marker on the presentation file itself (which never carries
// one; the presentation artifact stays untouched by review).
//
// Scope (v1): review-queue.yaml's `candidates[]` and review-digest.yaml's per-source
// `segments[]` / `candidates[]` / `amendments[]`. review-queue's `relation_suggestions`
// are explicitly SUGGESTIONS below the emission threshold, never candidates — they are
// not yet admission-gate items and are out of scope here (ADR §2 talks about "candidate
// / suggestion row[s] the reviewer acts on", but a suggestion has no candidate id to
// record a decision against until it is promoted to a candidate).

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { readMapList, readNestedList } from './yaml.mjs';

export const SOURCE_GATE_KIND = { REVIEW_QUEUE: 'review-queue', REVIEW_DIGEST: 'review-digest' };

export function detectSourceGateKind(path) {
  const name = basename(path);
  if (name === 'review-queue.yaml') return SOURCE_GATE_KIND.REVIEW_QUEUE;
  if (name === 'review-digest.yaml') return SOURCE_GATE_KIND.REVIEW_DIGEST;
  return null;
}

// Beyond item_ref/kind, an item MAY carry `confidence`, `flags` (array of strings)
// and `summary` — all read straight off fields the gate artifact already emits, for
// `review`'s one-card view (HUB-855). No LLM, no synthesis: absent fields are
// simply omitted from the card.
function itemsFromReviewQueue(text) {
  const candidates = readMapList(text, 'candidates', ['validation_flags']);
  return candidates
    .filter((c) => c.ref)
    .map((c) => {
      const flags = [
        ...(c.coverage_flag ? [c.coverage_flag] : []),
        ...(Array.isArray(c.validation_flags) ? c.validation_flags : []),
      ];
      return {
        item_ref: c.ref,
        kind: c.kind || 'unknown',
        ...(c.extraction_confidence != null ? { confidence: c.extraction_confidence } : {}),
        ...(flags.length ? { flags } : {}),
        ...(c.coverage_reason ? { summary: c.coverage_reason } : {}),
      };
    });
}

function itemsFromReviewDigest(text) {
  const sources = readNestedList(text, 'sources', ['segments', 'candidates', 'amendments']);
  const items = [];
  for (const src of sources) {
    for (const s of src.segments || []) if (s.id) items.push({
      item_ref: s.id, kind: 'segment', derived_from_source: src.id,
      ...(s.extraction_confidence != null ? { confidence: s.extraction_confidence } : {}),
      ...(s.locator ? { summary: s.locator } : {}),
    });
    for (const c of src.candidates || []) if (c.id) items.push({
      item_ref: c.id, kind: c.kind || 'candidate', derived_from_source: src.id,
      ...(c.extraction_confidence != null ? { confidence: c.extraction_confidence } : {}),
    });
    for (const a of src.amendments || []) if (a.id) items.push({
      item_ref: a.id, kind: 'amendment', derived_from_source: src.id,
      ...(a.change_description ? { summary: a.change_description } : {}),
    });
  }
  return items;
}

// Returns the full list of gate items a decision package MAY answer for this source
// gate — every candidate/segment/amendment it currently presents, decided or not.
export async function loadGateItems(sourceGatePath) {
  const kind = detectSourceGateKind(sourceGatePath);
  if (!kind) throw new Error(`map-in: unrecognised source gate filename: ${sourceGatePath} (expected review-queue.yaml or review-digest.yaml)`);
  const text = await readFile(sourceGatePath, 'utf8');
  const items = kind === SOURCE_GATE_KIND.REVIEW_QUEUE ? itemsFromReviewQueue(text) : itemsFromReviewDigest(text);
  return { kind, items };
}

// Set difference: gate items with no matching decisions[] row (by item_ref). Absence
// means undecided, never rejected (ADR §2).
export function undecided(gateItems, decisions) {
  const decided = new Set((decisions || []).map((d) => d.item_ref));
  return gateItems.filter((it) => !decided.has(it.item_ref));
}
