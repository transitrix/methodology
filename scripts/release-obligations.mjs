#!/usr/bin/env node
// "What must hold in release R" — elements/17-relations.md §3.2, reference
// implementation of the derived release-obligation query.
//
// Nothing here is stored. The answer is recomputed from the `required_for`
// relation files and the `predecessor` chain every time it is asked: no list
// accumulates on the RELEASE element (ELEMENT_PRIMITIVES.md §7.29 — "no list
// of its own contents") and none accumulates on the REQUIREMENT.
//
// The query answers a *scope* question — which obligations must hold in a
// given state of the subject (§3.1). It deliberately does not answer whether
// they are met (ASSERTION / VERIFICATION) or what work would make them hold
// (ACTION / CHANGE), and it never reads `version` strings: release order comes
// from `predecessor` links only.
//
// Usage:
//   node scripts/release-obligations.mjs --release RELEASE-X \
//     [--root <adopter-repo>] [--as-at YYYY-MM-DD] [--json]
//
// Exit codes: 0 clean · 1 endpoint findings (REL-002) reported · 2 script error.

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// --- lifecycle windows -----------------------------------------------------

// Whole-file YAML (canon elements carry no front-matter fence). Not a general
// YAML parser: sufficient for the scalar fields this script reads, and adds no
// new dependency to the root scripts/ toolchain — the same posture
// scripts/baseline-manifest.mjs and scripts/check-link-suspicion.mjs take.
function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n#]*?)"?\\s*(?:#.*)?$`, 'm'));
  if (!m) return undefined;
  const v = m[1].trim();
  return v === '' || v === 'null' || v === '~' ? null : v;
}

// TYPE is the ID's leading segment — IDS_AND_REFERENCES.md §1.
export function deriveType(id) {
  const m = String(id ?? '').match(/^([A-Z][A-Z0-9_]*)-/);
  return m ? m[1] : undefined;
}

// A window is inclusive at both ends: in effect at `d` iff
// valid_from <= d and (valid_to is null or d <= valid_to). §3.2 — this follows
// LIFECYCLE-004 (CONTRACT.md §7.3), which calls a reference dangling only when
// the referenced valid_to is *earlier than* the referrer's valid_from, so a
// valid_to equal to the date in question is still in effect on that date.
// ISO 8601 date strings compare correctly as plain strings (§4, date precision
// only), so no Date construction is needed or wanted.
export function inEffect({ valid_from: from, valid_to: to }, asOf) {
  if (from && from > asOf) return false;
  if (to && to < asOf) return false;
  return true;
}

// --- catalogue -------------------------------------------------------------

const SKIP_DIRS = new Set(['.git', 'node_modules']);

async function walkYaml(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkYaml(full)));
    else if (e.name.endsWith('.yaml')) out.push(full);
  }
  return out;
}

// Reads every `.yaml` under `<root>/canon/`, excluding `canon/views/` — the
// whole admitted-set scope, so a catalogue folder added by a newly registered
// TYPE is picked up without touching this function.
export async function loadCatalogue(root) {
  const canon = join(root, 'canon');
  const elements = new Map();
  const relations = [];
  for (const abs of await walkYaml(canon)) {
    const rel = relative(canon, abs).split(sep).join('/');
    if (rel.startsWith('views/')) continue;
    const text = await readFile(abs, 'utf8');
    const id = field(text, 'id');
    if (!id) continue;
    const record = {
      id,
      type: deriveType(id),
      notation: field(text, 'notation'),
      of: field(text, 'of'),
      predecessor: field(text, 'predecessor'),
      version: field(text, 'version'),
      valid_from: field(text, 'valid_from'),
      valid_to: field(text, 'valid_to'),
      path: rel,
    };
    if (record.type === 'REL') {
      relations.push({ ...record, relType: field(text, 'type'), from: field(text, 'from'), to: field(text, 'to') });
    } else {
      elements.set(id, record);
    }
  }
  return { elements, relations };
}

// --- the query -------------------------------------------------------------

// Step 1 (§3.2) — the ancestor list, `R` at depth 0, following `predecessor`.
// Cycle-safe: an id already seen ends the walk (RELEASE-004 reports the cycle;
// this query must not hang on one). An unresolvable predecessor also ends it —
// a dangling reference is RELEASE-003/REL-002 territory, not this query's.
export function ancestorChain(releaseId, catalogue) {
  const chain = [];
  const seen = new Set();
  let current = releaseId;
  let depth = 0;
  while (current && !seen.has(current)) {
    seen.add(current);
    const el = catalogue.elements.get(current);
    if (!el) break;
    chain.push({ id: current, depth, release: el });
    current = el.predecessor;
    depth += 1;
  }
  return chain;
}

// Endpoint constraint for `required_for` (§3, enforced as REL-002 — the kind
// adds no code of its own). Reported rather than thrown: a malformed pair is
// excluded from the answer and named in `findings`, never silently included.
function endpointFinding(rel, catalogue) {
  const fromEl = catalogue.elements.get(rel.from);
  const toEl = catalogue.elements.get(rel.to);
  if (!rel.from || deriveType(rel.from) !== 'REQUIREMENT') {
    return `REL-002 ${rel.id}: \`from\` is ${rel.from ?? '(missing)'} — a required_for source must be a REQUIREMENT.`;
  }
  if (!fromEl) {
    return `REL-002 ${rel.id}: \`from\` ${rel.from} does not resolve to an admitted primitive in canon.`;
  }
  if (!rel.to || deriveType(rel.to) !== 'RELEASE') {
    return `REL-002 ${rel.id}: \`to\` is ${rel.to ?? '(missing)'} — a required_for target must be a RELEASE.`;
  }
  if (!toEl) {
    return `REL-002 ${rel.id}: \`to\` ${rel.to} does not resolve to an admitted primitive in canon.`;
  }
  return null;
}

/**
 * "What must hold in release R" (§3.2).
 *
 * @param {string} releaseId  the RELEASE the question is about
 * @param {object} catalogue  from loadCatalogue()
 * @param {string} asOf       as-at date, ISO 8601 (CONTRACT.md §7.5 — "today
 *                            is the date of the query or render")
 * @returns {{release, chain, obligations, findings}} obligations carry the
 *          attachment point and its depth; `depth > 0` means inherited along
 *          the predecessor chain rather than introduced at this release.
 */
export function releaseObligations(releaseId, catalogue, asOf) {
  const findings = [];
  const release = catalogue.elements.get(releaseId);
  if (!release) {
    return { release: null, chain: [], obligations: [], findings: [`${releaseId} does not resolve to an element in canon.`] };
  }
  if (release.type !== 'RELEASE') {
    return { release, chain: [], obligations: [], findings: [`${releaseId} is a ${release.type}, not a RELEASE.`] };
  }

  // 1 — the chain, R at depth 0.
  const chain = ancestorChain(releaseId, catalogue);
  const depthOf = new Map(chain.map((c) => [c.id, c.depth]));

  // 2 — collect every required_for pointing at any release in the chain.
  const candidates = [];
  for (const rel of catalogue.relations) {
    if (rel.relType !== 'required_for') continue;
    const finding = endpointFinding(rel, catalogue);
    if (finding) {
      // Only report a malformed pair when it claims to concern this chain;
      // a broken relation elsewhere in canon is not this query's business.
      if (!rel.to || depthOf.has(rel.to)) findings.push(finding);
      continue;
    }
    if (!depthOf.has(rel.to)) continue;
    candidates.push({ rel, depth: depthOf.get(rel.to) });
  }

  // 3 — filter by window at the as-at date: the relation must be in effect,
  //     and the REQUIREMENT must not have retired.
  const live = candidates.filter(({ rel }) => {
    if (!inEffect(rel, asOf)) return false;
    const req = catalogue.elements.get(rel.from);
    return inEffect(req, asOf);
  });

  // 4 — deduplicate by requirement, keeping the nearest attachment.
  const byRequirement = new Map();
  for (const c of live) {
    const prev = byRequirement.get(c.rel.from);
    if (!prev || c.depth < prev.depth) byRequirement.set(c.rel.from, c);
  }

  const obligations = [...byRequirement.values()]
    .map(({ rel, depth }) => ({
      requirement: rel.from,
      attached_to: rel.to,
      depth,
      inherited: depth > 0,
      relation: rel.id,
    }))
    .sort((a, b) => a.depth - b.depth || a.requirement.localeCompare(b.requirement));

  return { release, chain, obligations, findings };
}

// --- CLI -------------------------------------------------------------------

function argVal(args, flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}

async function main(argv) {
  const args = argv.slice(2);
  const releaseId = argVal(args, '--release', null);
  if (!releaseId) {
    process.stderr.write('usage: release-obligations.mjs --release RELEASE-X [--root <dir>] [--as-at YYYY-MM-DD] [--json]\n');
    return 2;
  }
  const root = resolve(argVal(args, '--root', process.cwd()));
  const asOf = argVal(args, '--as-at', new Date().toISOString().slice(0, 10));
  const catalogue = await loadCatalogue(root);
  const result = releaseObligations(releaseId, catalogue, asOf);

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ as_at: asOf, ...result, release: result.release?.id ?? null }, null, 2)}\n`);
  } else {
    process.stdout.write(`What must hold in ${releaseId} as at ${asOf}\n`);
    if (result.chain.length > 1) {
      process.stdout.write(`  chain: ${result.chain.map((c) => c.id).join(' <- ')}\n`);
    }
    if (result.obligations.length === 0) {
      process.stdout.write('  (no obligations in scope)\n');
    }
    for (const o of result.obligations) {
      const via = o.inherited ? ` (inherited from ${o.attached_to}, depth ${o.depth})` : '';
      process.stdout.write(`  ${o.requirement}${via}\n`);
    }
    for (const f of result.findings) process.stdout.write(`  ! ${f}\n`);
  }
  return result.findings.length > 0 ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main(process.argv)
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`release-obligations: ${err?.stack ?? err}\n`);
      process.exit(2);
    });
}
