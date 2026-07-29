// Apply decisions.reviewed.yaml onto CONTRACT §6.1 admission transitions:
//   accept -> admission_state: active  (+ admitted_at/admitted_by, gate_checks -> pass,
//             reviewer_authority per §6.2)
//   reject -> admission_state: rejected (+ rejected_at/rejected_by/rejection_reason)
//   defer  -> no transition; the decision row is itself the audit trail (ADR §3)
//
// This step does NOT invent new admission states and does NOT admit anything the
// pre-admission gates of that pipeline have not already cleared: it only flips a field
// on an artefact that already exists on disk as an admission_state-bearing candidate
// (reg-intel's SEGMENT / REQUIREMENT|CONSTRAINT / AMENDMENT artefacts under
// _intake/processing/{segments,candidates,amendments}/<id>.yaml). An ingest-pipeline
// candidate (_intake/processing/candidates/<ref>.json) is pre-canon and carries no
// admission_state field at all yet — decisions-cli records its accept/reject decision
// same as any other item, but `apply` cannot write a CONTRACT transition onto a file
// that has no admission lifecycle to transition; it reports the item as
// not_admission_state_bearing rather than silently skip it or fabricate one.

import { readFile, writeFile, access } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { readTopScalar, readBlockScalars } from './yaml.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

const ADMISSION_STATE_DIRS = ['segments', 'candidates', 'amendments'];

// Locate the artefact an item_ref names. review-digest.yaml items carry a bare id
// (e.g. `SEGMENT-gdpr-1`); review-queue.yaml items today carry the candidate file's
// resolved path (validate.mjs's loadCandidates joins dir + filename) — handle both.
export async function locateArtefact(orgRoot, itemRef) {
  const processing = join(resolve(orgRoot), '_intake', 'processing');

  const looksLikePath = itemRef.includes('/') || itemRef.includes('\\') || /\.(json|yaml)$/i.test(itemRef);
  if (looksLikePath) {
    const p = isAbsolute(itemRef) ? itemRef : join(processing, itemRef);
    if (await exists(p)) {
      return { path: p, format: p.toLowerCase().endsWith('.yaml') ? 'yaml' : 'json' };
    }
  }

  for (const sub of ADMISSION_STATE_DIRS) {
    const p = join(processing, sub, `${itemRef}.yaml`);
    if (await exists(p)) return { path: p, format: 'yaml' };
  }
  // Bare id, ingest-shaped candidate (no admission_state — flagged not-applicable below).
  const jsonPath = join(processing, 'candidates', `${itemRef}.json`);
  if (await exists(jsonPath)) return { path: jsonPath, format: 'json' };

  return null;
}

function scalarYaml(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return JSON.stringify(String(v));
}

// Replace an existing top-level `key: ...` line, or insert a new one right after
// `anchorKey:`'s line (falls back to end-of-file when the anchor is absent).
function spliceScalar(text, key, value, anchorKey) {
  const line = `${key}: ${scalarYaml(value)}`;
  const existingRe = new RegExp(`^${key}:.*$`, 'm');
  if (existingRe.test(text)) return text.replace(existingRe, line);
  const anchorRe = new RegExp(`^(${anchorKey}:.*)$`, 'm');
  if (anchorRe.test(text)) return text.replace(anchorRe, `$1\n${line}`);
  return text.replace(/\s*$/, '') + `\n${line}\n`;
}

// Replace every child scalar of a top-level block (e.g. gate_checks) with `value`,
// keeping the existing set of child keys. No-op (returns text unchanged) if the block
// or a given key is absent.
function spliceBlockAllValues(text, blockKey, value) {
  const existing = readBlockScalars(text, blockKey);
  if (!existing) return text;
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${blockKey}:[ \\t]*(#.*)?$`).test(l));
  if (start < 0) return text;
  let end = start + 1;
  for (; end < lines.length; end++) if (/^\S/.test(lines[end])) break;
  const body = Object.keys(existing).map((k) => `  ${k}: ${scalarYaml(value)}`);
  const out = [...lines.slice(0, start), `${blockKey}:`, ...body, ...lines.slice(end)];
  return out.join('\n').replace(/\s*$/, '') + '\n';
}

// A crude, non-authoritative ADMIT-007 footgun-catcher: this codebase's convention for
// a TOOL identifier is an npm-scoped name (`@transitrix/...`) or a hyphenated
// `*-cli` / `*-reviewer` / `*-bot` / `*-scanner` id (e.g. `reg-intel-scanner`,
// `ingest-reviewer-claude`); anything else is treated as a human handle. This cannot
// be enforced with certainty from the string alone (CONTRACT ADMIT-007 is a
// content-based rule about who actually admitted the record) — it only catches the
// common mistake of defaulting/copy-pasting the wrong tier, not a security boundary.
const TOOL_ID_RE = /^@|-cli$|-reviewer(?:-\w+)?$|-bot$|-scanner$/i;

function admitterLooksLikeTool(id) { return TOOL_ID_RE.test(String(id || '')); }

export class ApplyError extends Error {}

// Apply one decision to the artefact it names. Returns a result row; never throws for
// an expected/reportable outcome (missing artefact, ADMIT-007 mismatch, defer) — only
// for a genuine I/O failure.
export async function applyDecision(orgRoot, decision) {
  const { item_ref: itemRef, decision: verdict, by, at, reason, reviewer_authority: reviewerAuthorityIn } = decision;

  if (verdict === 'defer') {
    return { item_ref: itemRef, decision: 'defer', outcome: 'no_transition', detail: 'parked; remains proposed (audit trail only)' };
  }

  const found = await locateArtefact(orgRoot, itemRef);
  if (!found) {
    return { item_ref: itemRef, decision: verdict, outcome: 'not_found', detail: 'no admission_state-bearing artefact or ingest candidate found for this item_ref' };
  }
  if (found.format === 'json') {
    return {
      item_ref: itemRef, decision: verdict, outcome: 'not_admission_state_bearing',
      detail: `${found.path} is a pre-canon ingest candidate (admitted_to: pending) with no admission_state field — promote it to a canon-shaped artefact by hand (CONTRACT §6) before it can be applied`,
    };
  }

  const text = await readFile(found.path, 'utf8');
  const currentState = readTopScalar(text, 'admission_state');
  if (currentState !== 'proposed') {
    return { item_ref: itemRef, decision: verdict, outcome: 'not_proposed', detail: `admission_state is ${JSON.stringify(currentState)}, not "proposed" — nothing to apply` };
  }

  if (verdict === 'accept') {
    const reviewerAuthority = reviewerAuthorityIn || 'expert_confirmed'; // ADR §1 default
    if (reviewerAuthority !== 'ai_reviewed' && reviewerAuthority !== 'expert_confirmed') {
      return { item_ref: itemRef, decision: verdict, outcome: 'error', detail: `reviewer_authority must be ai_reviewed|expert_confirmed, got ${JSON.stringify(reviewerAuthority)}` };
    }
    const admitterIsTool = admitterLooksLikeTool(by);
    if (reviewerAuthority === 'ai_reviewed' && !admitterIsTool) {
      return { item_ref: itemRef, decision: verdict, outcome: 'admit_007_mismatch', detail: `reviewer_authority: ai_reviewed but by=${JSON.stringify(by)} does not look like a tool id (CONTRACT ADMIT-007) — a human writes expert_confirmed` };
    }
    if (reviewerAuthority === 'expert_confirmed' && admitterIsTool) {
      return { item_ref: itemRef, decision: verdict, outcome: 'admit_007_mismatch', detail: `reviewer_authority: expert_confirmed but by=${JSON.stringify(by)} looks like a tool id (CONTRACT ADMIT-007) — a tool must never write expert_confirmed` };
    }

    let updated = text;
    updated = spliceScalar(updated, 'admission_state', 'active', 'admission_state');
    updated = spliceScalar(updated, 'admitted_at', at, 'admission_state');
    updated = spliceScalar(updated, 'admitted_by', by, 'admitted_at');
    updated = spliceScalar(updated, 'reviewer_authority', reviewerAuthority, 'admitted_by');
    updated = spliceBlockAllValues(updated, 'gate_checks', 'pass');
    await writeFile(found.path, updated, 'utf8');
    return { item_ref: itemRef, decision: verdict, outcome: 'active', detail: found.path };
  }

  // reject
  let updated = text;
  updated = spliceScalar(updated, 'admission_state', 'rejected', 'admission_state');
  updated = spliceScalar(updated, 'rejected_at', at, 'admission_state');
  updated = spliceScalar(updated, 'rejected_by', by, 'rejected_at');
  if (reason) updated = spliceScalar(updated, 'rejection_reason', reason, 'rejected_by');
  await writeFile(found.path, updated, 'utf8');
  return { item_ref: itemRef, decision: verdict, outcome: 'rejected', detail: found.path };
}

export async function applyDecisions(orgRoot, decisions) {
  const results = [];
  for (const d of decisions) results.push(await applyDecision(orgRoot, d));
  return results;
}
