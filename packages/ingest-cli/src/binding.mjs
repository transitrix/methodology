// `binding` — L2 (recognition) and L3 (promotion) tooling for catalogue integration
// (method/09-releases-and-propagation.md §6.5; CONTRACT.md §17). Two concerns:
//
//   proposeBindings        — L2: match unbound local elements against the pinned
//                             catalogue by normalised name/alias, filtered to the
//                             same TYPE (BIND-002 would reject a cross-TYPE binding
//                             anyway). Pure, propose-only — never writes a binding
//                             into canon.
//   applyBinding            — the human-gated write: once a proposal (L2) or a
//                             central admission response (L3) is accepted, this is
//                             the one place that adds `canon_id:` to a local element
//                             file. Idempotent against an already-applied identical
//                             binding; refuses to silently overwrite a different one.
//   buildPromotionProposal   — L3: shape a local element's fields into a promotion
//                             proposal file consumable by the central repository's
//                             human admission gate. Never writes across the
//                             repository boundary — the file is the whole
//                             deliverable; a human carries it to the central
//                             repository by hand.
//
// Propose, never auto-merge (method/09-releases-and-propagation.md §6.5): nothing in this
// module writes a binding without an explicit, human-supplied accept.

import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadCatalogueSlice, collectLocalElements } from './catalogue.mjs';
import { readTopScalar } from './yaml.mjs';
import { isUnresolvedPath } from './unresolved.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function walkYaml(dir) {
  const out = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walkYaml(p));
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

function normSurface(s) { return typeof s === 'string' ? s.trim().toLowerCase() : null; }

export class BindingError extends Error {
  constructor(message) { super(`binding: ${message}`); this.name = 'BindingError'; }
}

// ── L2 — recognition: propose a binding ─────────────────────────────────

// Match every unbound local element (no canon_id) against the pinned catalogue by
// normalised name/alias, restricted to a matching TYPE (a cross-TYPE surface-form
// match is never proposed — BIND-002 would reject it once accepted). Proposes only
// when the match is unambiguous: exactly one distinct central id survives the TYPE
// filter across every surface form the local element carries. An element already
// bound (`canon_id` set) is never re-proposed — recognition targets only the unbound
// remainder findVocabularyDivergence's `unbound_matches` already reports.
// Pure, idempotent: the same (localElements, catalogueSlice) pair always returns the
// same proposals.
export function proposeBindings(localElements, catalogueSlice) {
  if (!catalogueSlice) return [];

  const centralByForm = new Map(); // normalised surface form -> Set(central id)
  const centralById = new Map();
  for (const ce of catalogueSlice.elements || []) {
    centralById.set(ce.id, ce);
    for (const f of [ce.name, ...(ce.aliases || [])]) {
      const key = normSurface(f);
      if (!key) continue;
      if (!centralByForm.has(key)) centralByForm.set(key, new Set());
      centralByForm.get(key).add(ce.id);
    }
  }

  const proposals = [];
  for (const le of localElements || []) {
    if (le.canon_id) continue;

    const matches = new Map(); // central id -> matched_on
    for (const [value, matchedOn] of [[le.name, 'name'], ...((le.aliases || []).map((a) => [a, 'alias']))]) {
      const key = normSurface(value);
      if (!key) continue;
      const ids = centralByForm.get(key);
      if (!ids) continue;
      for (const id of ids) {
        const ce = centralById.get(id);
        if (ce.type !== le.type) continue; // cross-TYPE match — never proposed (BIND-002)
        if (!matches.has(id)) matches.set(id, matchedOn);
      }
    }

    if (matches.size === 1) {
      const [[canonId, matchedOn]] = matches;
      proposals.push({ local_id: le.id, proposed_canon_id: canonId, matched_on: matchedOn });
    }
  }

  proposals.sort((a, b) => a.local_id.localeCompare(b.local_id));
  return proposals;
}

// Assemble the review artefact `catalogue-recognize` writes — a proposal PROPOSES a
// binding; nothing here admits one (`gate.admits_to_canon: false`, same invariant
// review-queue.mjs states). Loads the pin fails-closed the same way catalogueCheck
// does; a pin absent (L0/pre-L1) yields zero proposals, not an error.
export async function buildBindingProposals(orgRoot) {
  const slice = await loadCatalogueSlice(orgRoot);
  const localElements = await collectLocalElements(orgRoot);
  const proposals = proposeBindings(localElements, slice);
  return {
    generated_by: '@transitrix/ingest-cli',
    org_root: resolve(orgRoot),
    ...(slice ? { pin: { source: slice.source, version: slice.version } } : {}),
    proposals,
    gate: { admits_to_canon: false },
  };
}

// ── The shared apply step (L2 accept, and L3's "returned binding") ─────────

async function findLocalElementFile(orgRoot, id) {
  const canonDir = join(resolve(orgRoot), 'canon');
  if (!(await exists(canonDir))) return null;
  for (const file of await walkYaml(canonDir)) {
    if (isUnresolvedPath(file)) continue;
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    if (readTopScalar(text, 'id') === id) return { path: file, text };
  }
  return null;
}

function scalarYaml(v) { return JSON.stringify(String(v)); }

// Insert `canon_id: "..."` right after the `id:` line — a fixed, deterministic
// position, matching how the envelope names it as a fact recorded alongside an
// element's own identity (CONTRACT.md §17.1).
function spliceCanonId(text, canonId) {
  const line = `canon_id: ${scalarYaml(canonId)}`;
  const idLineRe = /^(id:.*)$/m;
  return text.replace(idLineRe, `$1\n${line}`);
}

// Write `canon_id` into the local element file `localId` names — the one place any
// binding actually lands in canon. Never invoked without an explicit accept
// (method/09-releases-and-propagation.md §6.5 — propose, never auto-merge): the CLI
// command wrapping this always requires an operator-supplied --canon-id, never a
// value the tool derived itself.
//
// Fails closed against the same three envelope rules a binding must already satisfy
// once written (CONTRACT.md §17.2) — checked HERE, at write time, rather than left
// to a later `repo-check` to discover after the fact: no pin configured/loadable
// (BIND-004), `canonId` not resolving in it (BIND-001), a TYPE mismatch (BIND-002),
// or another local element already claiming the same canon_id (BIND-003).
//
// Idempotent: re-applying the SAME canon_id to an already-bound element is a no-op
// (outcome: 'unchanged'). Refuses to silently replace a DIFFERENT existing binding —
// "No tool ever rewrites a local id" (CONTRACT.md §17.1) extends here to canon_id
// once set: unbinding/rebinding is a deliberate, separate human action this function
// does not perform.
export async function applyBinding({ orgRoot, localId, canonId }) {
  if (!localId) throw new BindingError('--local-id is required');
  if (!canonId) throw new BindingError('--canon-id is required');

  const found = await findLocalElementFile(orgRoot, localId);
  if (!found) throw new BindingError(`no local element with id ${JSON.stringify(localId)} found under canon/`);

  const existing = readTopScalar(found.text, 'canon_id');
  if (existing === canonId) {
    return { local_id: localId, canon_id: canonId, path: found.path, outcome: 'unchanged' };
  }
  if (existing) {
    throw new BindingError(
      `${localId} already carries canon_id ${JSON.stringify(existing)} — refusing to overwrite with ${JSON.stringify(canonId)}. ` +
      'Rebinding is a separate, deliberate human action, not a side effect of applying a new proposal.'
    );
  }

  const slice = await loadCatalogueSlice(orgRoot); // fails closed the same way catalogueCheck's caller expects
  if (!slice) {
    throw new BindingError(`no catalogue pin configured (or it failed to load) for ${resolve(orgRoot)} — a binding cannot be validated without one (BIND-004).`);
  }
  const ce = slice.elements.find((e) => e.id === canonId);
  if (!ce) {
    throw new BindingError(`canon_id ${JSON.stringify(canonId)} does not resolve to any element in the pinned catalogue (BIND-001).`);
  }
  const localTypePrefix = localId.split('-')[0];
  if (ce.type !== localTypePrefix) {
    throw new BindingError(`${localId} is TYPE ${localTypePrefix}, but canon_id ${canonId} resolves to a ${ce.type} — a binding must match TYPE (BIND-002).`);
  }
  const others = await collectLocalElements(orgRoot);
  const claimant = others.find((e) => e.id !== localId && e.canon_id === canonId);
  if (claimant) {
    throw new BindingError(`canon_id ${JSON.stringify(canonId)} is already claimed by ${claimant.id} — a central element cannot be the binding target of more than one local element (BIND-003).`);
  }

  const updated = spliceCanonId(found.text, canonId);
  await writeFile(found.path, updated, 'utf8');
  return { local_id: localId, canon_id: canonId, path: found.path, outcome: 'bound' };
}

// ── L3 — promotion: propose a local element for central admission ─────────

// Shape a local element's own fields into the promotion proposal the central
// repository's human admission gate consumes — the same fields a catalogue slice
// element carries (method/09-releases-and-propagation.md §6.4.1) plus `origin`, the
// local-side provenance a *central* admission attaches once it accepts. `repository`
// is supplied by the caller (an explicit --repository flag, never inferred from git
// remote state or guessed from a manifest field this repository's own
// transitrix.yaml has no slot for) — "no agent writes across a repository boundary"
// (§7) means this function only ever produces a file; carrying it to the central
// repository, and admitting it there, is a human's separate action.
export function buildPromotionProposal(localElement, repository) {
  if (!repository) throw new BindingError('--repository is required (this repository\'s own <org>/<repo> coordinate)');
  return {
    local_id: localElement.id,
    type: localElement.type,
    name: localElement.name,
    aliases: localElement.aliases || [],
    description: localElement.description ?? null,
    origin: { repository, id: localElement.id },
  };
}

export async function buildPromotionProposalDoc(orgRoot, localId, repository) {
  const localElements = await collectLocalElements(orgRoot);
  const le = localElements.find((e) => e.id === localId);
  if (!le) throw new BindingError(`no local element with id ${JSON.stringify(localId)} found under canon/`);
  if (le.canon_id) throw new BindingError(`${localId} already carries canon_id ${JSON.stringify(le.canon_id)} — already bound, nothing to promote`);

  const proposal = buildPromotionProposal(le, repository);
  return {
    generated_by: '@transitrix/ingest-cli',
    org_root: resolve(orgRoot),
    proposal,
    gate: { admits_to_canon: false },
  };
}
