#!/usr/bin/env node
// @transitrix/decisions-cli — the shared human-gate admission decision contract over
// the ingest review-queue and reg-intel review-digest (hub ADR
// architecture/methodology/2026-07-28-ingest-admission-decision-contract.md).
//
// THE ONE RULE: `record` only ever reads/writes decisions.reviewed.yaml, never canon
// and never the presentation artifact it answers. `apply` is the one command that
// writes CONTRACT §6.1 admission transitions, and only onto an artefact that already
// carries admission_state: proposed — it never invents a new admission state and
// never admits anything the pipeline's own pre-admission gates have not already
// cleared.
//
// Exit codes: 0 = ok · 1 = usage / items still need attention · 2 = error

import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { loadGateItems, undecided } from './src/map-in.mjs';
import { loadDecisions, findSourceGate } from './src/io.mjs';
import { record, RecordError } from './src/record.mjs';
import { applyDecisions } from './src/apply.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) out.flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < args.length && !args[i + 1].startsWith('--')) out.flags[a.slice(2)] = args[++i];
      else out.flags[a.slice(2)] = true;
    } else out._.push(a);
  }
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);
async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function version() {
  const pkg = JSON.parse(await readFile(join(__dirname, 'package.json'), 'utf8'));
  return pkg.version;
}

function usage() {
  return [
    'transitrix-decisions <command> [args]',
    '',
    'Commands:',
    '  list-undecided <org-root> [--source-gate <path>]',
    '                                 Gate items (review-queue/-digest candidates, segments,',
    '                                 amendments) with no matching decisions.reviewed.yaml row yet.',
    '  record <org-root> --item-ref <ref> --decision accept|reject|defer --by <id> --at <date>',
    '                 [--reason <text>] [--kind <k>] [--reviewer-authority ai_reviewed|expert_confirmed]',
    '                 [--source-gate <path>]',
    '                                 Upsert one decision row (idempotent per item_ref).',
    '  apply <org-root> [--source-gate <path>]',
    '                                 Apply every accept/reject row as a CONTRACT §6.1 transition;',
    '                                 defer rows are left untouched (audit trail only).',
    '  --version, -v                  Print the CLI version',
    '  --help, -h                     Show this help',
  ].join('\n');
}

async function resolveSourceGate(orgRoot, flags) {
  if (flags['source-gate']) {
    const p = resolve(flags['source-gate']);
    if (!(await exists(p))) throw new Error(`--source-gate not found: ${p}`);
    return p;
  }
  const found = await findSourceGate(orgRoot);
  if (!found) throw new Error(`no review-queue.yaml or review-digest.yaml found under ${resolve(orgRoot)}/_intake/processing/ — pass --source-gate explicitly for a dated batch directory`);
  return found;
}

async function cmdListUndecided(args) {
  const { _, flags } = parseArgs(args);
  const orgRoot = _[0];
  if (!orgRoot) { console.error('list-undecided: missing <org-root>'); return 1; }

  let sourceGatePath;
  try { sourceGatePath = await resolveSourceGate(orgRoot, flags); }
  catch (err) { console.error(`list-undecided: ${err.message}`); return 2; }

  const { kind, items } = await loadGateItems(sourceGatePath);
  const decisionsDoc = await loadDecisions(join(dirname(sourceGatePath), 'decisions.reviewed.yaml'));
  const pending = undecided(items, decisionsDoc ? decisionsDoc.decisions : []);

  console.log(`source_gate: ${sourceGatePath} (${kind})`);
  console.log(`total: ${items.length}  decided: ${items.length - pending.length}  undecided: ${pending.length}`);
  for (const it of pending) console.log(`  ${it.item_ref}  (${it.kind})`);
  return pending.length > 0 ? 1 : 0;
}

async function cmdRecord(args) {
  const { _, flags } = parseArgs(args);
  const orgRoot = _[0];
  if (!orgRoot) { console.error('record: missing <org-root>'); return 1; }

  let sourceGatePath;
  try { sourceGatePath = await resolveSourceGate(orgRoot, flags); }
  catch (err) { console.error(`record: ${err.message}`); return 2; }

  try {
    const { path, row, replaced } = await record({
      orgRoot,
      sourceGatePath,
      asOf: flags['as-of'] || today(),
      itemRef: flags['item-ref'],
      kind: flags.kind,
      decision: flags.decision,
      by: flags.by,
      at: flags.at,
      reason: flags.reason,
      reviewerAuthority: flags['reviewer-authority'],
    });
    console.log(`${replaced ? 'updated' : 'recorded'}  ${row.item_ref}  ${row.decision}  ->  ${path}`);
    return 0;
  } catch (err) {
    if (err instanceof RecordError) { console.error(err.message); return 1; }
    throw err;
  }
}

async function cmdApply(args) {
  const { _, flags } = parseArgs(args);
  const orgRoot = _[0];
  if (!orgRoot) { console.error('apply: missing <org-root>'); return 1; }

  let sourceGatePath;
  try { sourceGatePath = await resolveSourceGate(orgRoot, flags); }
  catch (err) { console.error(`apply: ${err.message}`); return 2; }

  const decisionsPath = join(dirname(sourceGatePath), 'decisions.reviewed.yaml');
  const doc = await loadDecisions(decisionsPath);
  if (!doc) { console.error(`apply: no decisions.reviewed.yaml found beside ${sourceGatePath} — run \`record\` first`); return 2; }

  const results = await applyDecisions(orgRoot, doc.decisions);
  let problems = 0;
  for (const r of results) {
    console.log(`${r.item_ref}  ${r.decision}  ->  ${r.outcome}${r.detail ? `  (${r.detail})` : ''}`);
    if (!['active', 'rejected', 'no_transition'].includes(r.outcome)) problems++;
  }
  console.log(`\n${results.length} decision(s) processed, ${problems} not applied.`);
  return problems > 0 ? 1 : 0;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return 0; }
  if (cmd === '--version' || cmd === '-v') { console.log(await version()); return 0; }

  switch (cmd) {
    case 'list-undecided': return cmdListUndecided(rest);
    case 'record':         return cmdRecord(rest);
    case 'apply':           return cmdApply(rest);
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.error(usage());
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
