#!/usr/bin/env node
// @transitrix/reg-intel-cli — deterministic CLI for the Transitrix reg-intel skill.
// The skill's SKILL.md shells out to this CLI; it never reimplements the logic, so
// behaviour is identical under Claude and GitHub Copilot.
//
// THE ONE RULE: this CLI proposes. It reads the codex registry, runs the change-signal
// gate, snapshots/segments/classifies, and stages a review digest. It NEVER writes into
// canon/, and it NEVER silently flips an existing active canon element.
//
// Exit codes:  0 = ok  ·  1 = usage / nothing-to-do / findings  ·  2 = error
//
// Implemented so far (scheduler core): --version, list-due, update-scan. The rest of
// the SKILL.md pipeline (check-signal, fetch-snapshot, segment, classify, validate,
// amendment, digest) lands in later increments.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { access } from 'node:fs/promises';

import { findOrgRoot, listDue, findCodexFile } from './src/codex.mjs';
import { updateScan } from './src/update-scan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tiny flag parser: `--k v`, `--k=v`, and bare `--k` (boolean true).
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
    'transitrix-reg-intel <command> [args]',
    '',
    'Commands:',
    '  list-due [org-root] [--as-of YYYY-MM-DD] [--json]',
    '                                 List codex sources whose scan.next_scan_due <= today',
    '                                 (monitoring_needed: true), plus monitor_instead targets.',
    '  update-scan <CODEX-ID|file> [--today YYYY-MM-DD] [--frequency daily|weekly|monthly|quarterly]',
    '              [--change "<summary>"] [--review]',
    '                                 Write the codex scan block (last_scanned_at, next_scan_due, …).',
    '  --version, -v                  Print the CLI version',
    '  --help, -h                     Show this help',
    '',
    'This CLI proposes; a human admits. It never writes canon/.',
  ].join('\n');
}

async function resolveOrgRoot(arg, label) {
  const from = arg ? resolve(arg) : process.cwd();
  const orgRoot = await findOrgRoot(from);
  if (!orgRoot) { console.error(`${label}: not inside a Transitrix workspace (no transitrix.yaml found); pass <org-root>.`); return null; }
  return orgRoot;
}

async function cmdListDue(args) {
  const { _, flags } = parseArgs(args);
  const orgRoot = await resolveOrgRoot(_[0], 'list-due');
  if (!orgRoot) return 2;
  const asOf = flags['as-of'] ? String(flags['as-of']) : today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) { console.error('list-due: --as-of must be YYYY-MM-DD'); return 1; }

  const due = await listDue(orgRoot, asOf);
  if (flags.json) { console.log(JSON.stringify(due, null, 2)); return 0; }

  if (due.length === 0) {
    console.log(`list-due  as-of ${asOf}: nothing due — no watched codex source is due for a scan.`);
    return 0;
  }
  console.log(`list-due  as-of ${asOf}: ${due.length} target(s) due`);
  for (const d of due) {
    const tag = d.reason === 'monitor_instead' ? `monitor_instead via ${d.via}`
      : d.reason === 'never_scanned' ? 'never scanned' : `due ${d.next_scan_due}`;
    console.log(`  ${d.id || '(no id)'}  [${d.type || '—'}]  ${tag}  ${d.source_url || ''}`.trimEnd());
  }
  console.log('  run the signal gate on each before any fetch — a human gates the digest.');
  return 0;
}

async function cmdUpdateScan(args) {
  const { _, flags } = parseArgs(args);
  const target = _[0];
  if (!target) { console.error('update-scan: missing <CODEX-ID|file>'); return 1; }

  let file = null;
  if (await exists(resolve(target))) {
    file = resolve(target);
  } else {
    const orgRoot = await resolveOrgRoot(undefined, 'update-scan');
    if (!orgRoot) return 2;
    file = await findCodexFile(orgRoot, target);
    if (!file) { console.error(`update-scan: no codex artefact with id ${target} under codex/`); return 2; }
  }

  try {
    const res = await updateScan(file, {
      today: flags.today ? String(flags.today) : today(),
      frequency: flags.frequency ? String(flags.frequency) : undefined,
      changeDescription: typeof flags.change === 'string' ? flags.change : null,
      reviewNeeded: flags.review === true || flags.review === 'true',
    });
    console.log(`update-scan  ${res.file}`);
    console.log(`  last_scanned_at: ${res.scan.last_scanned_at}  next_scan_due: ${res.scan.next_scan_due}  (${res.scan.scan_frequency})`);
    console.log(`  change_detected: ${res.scan.change_detected}  review_needed: ${res.scan.review_needed}`);
    return 0;
  } catch (err) {
    console.error(`update-scan: ${err.message}`);
    return 2;
  }
}

async function main(argv) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  if (cmd === '--version' || cmd === '-v') { console.log(await version()); return 0; }

  switch (cmd) {
    case 'list-due':    return cmdListDue(args);
    case 'update-scan': return cmdUpdateScan(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
