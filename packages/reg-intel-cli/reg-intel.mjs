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
import { checkSignal } from './src/check-signal.mjs';
import { fetchSnapshot } from './src/snapshot.mjs';
import { emitSegments } from './src/segment.mjs';
import { emitCandidates } from './src/classify.mjs';
import { validateStaged } from './src/validate.mjs';
import { emitAmendment } from './src/amendment.mjs';
import { buildDigest, writeDigest, defaultDigestPath } from './src/digest.mjs';

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
    '  check-signal <CODEX-ID|file> --observed <value> [--method etag|last_modified|api_version|amended_date|fragment_hash]',
    '               [--accept-no-signal] [--today YYYY-MM-DD]',
    '                                 The cheap change-signal gate: compare the observed signal to the',
    '                                 last-seen value (operations/state/reg-intel/signal-cache.json).',
    '                                 unchanged → bump scan; moved/no_signal → proceed.',
    '  fetch-snapshot <CODEX-ID|file> --from <fetched-file> [--ext <ext>] [--today YYYY-MM-DD] [--json]',
    '                                 Snapshot the fetched bytes to _intake/snapshots/, fingerprint',
    '                                 (source_hash), and detect captured | changed | bytes_identical.',
    '  segment <snapshot> --from <result.json> [--source <CODEX-ID>] [--today YYYY-MM-DD]',
    '                                 Shape the segment agent result into proposed SEGMENT-* field',
    '                                 artefacts under _intake/processing/segments/.',
    '  classify [segments-dir] --from <result.json> [--today YYYY-MM-DD]',
    '                                 Shape the classify agent result into proposed REQUIREMENT-* /',
    '                                 CONSTRAINT-* candidates under _intake/processing/candidates/.',
    '  validate [org-root] [--json]   Validate staged SEGMENTs + candidates against the contract',
    '                                 (23-segment.md, ID grammar); flags, never drops.',
    '  amendment <CODEX-ID|file> --change "<what moved>" [--name N] [--amended-at YYYY-MM-DD]',
    '            [--likely-impacted ID,ID] [--from <result.json>] [--today YYYY-MM-DD]',
    '                                 Emit a proposed AMENDMENT-* field artefact recording source drift.',
    '  digest [org-root] [--run-id <id>] [--as-of YYYY-MM-DD] [--out <path>]',
    '                                 Assemble the human review digest from staged run artefacts',
    '                                 (review-digest.yaml). Nothing is admitted — a human gates it.',
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

async function cmdCheckSignal(args) {
  const { _, flags } = parseArgs(args);
  const target = _[0];
  if (!target) { console.error('check-signal: missing <CODEX-ID|file>'); return 1; }

  let file = null;
  let orgRoot = null;
  if (await exists(resolve(target))) {
    file = resolve(target);
    orgRoot = await findOrgRoot(file);
    if (!orgRoot) { console.error('check-signal: file is not inside a Transitrix workspace (no transitrix.yaml).'); return 2; }
  } else {
    orgRoot = await resolveOrgRoot(undefined, 'check-signal');
    if (!orgRoot) return 2;
    file = await findCodexFile(orgRoot, target);
    if (!file) { console.error(`check-signal: no codex artefact with id ${target} under codex/`); return 2; }
  }

  try {
    const res = await checkSignal(orgRoot, file, {
      observed: typeof flags.observed === 'string' ? flags.observed : null,
      method: typeof flags.method === 'string' ? flags.method : null,
      acceptNoSignal: flags['accept-no-signal'] === true || flags['accept-no-signal'] === 'true',
      today: flags.today ? String(flags.today) : today(),
    });
    if (flags.json) { console.log(JSON.stringify(res, null, 2)); return 0; }
    console.log(`check-signal  ${res.id}  ->  ${res.outcome}  (proceed: ${res.proceed})`);
    if (res.outcome === 'moved') console.log(`  signal moved [${res.method}] — fetch + segment/classify next. previous: ${res.previous ?? '(none)'}`);
    else if (res.outcome === 'unchanged') console.log(`  signal unchanged [${res.method}] — scan bumped to next_scan_due ${res.scan.next_scan_due}; no extraction.`);
    else console.log('  no cheap signal available — proceeding to fetch (degraded gate).');
    return 0;
  } catch (err) {
    console.error(`check-signal: ${err.message}`);
    return 2;
  }
}

async function cmdFetchSnapshot(args) {
  const { _, flags } = parseArgs(args);
  const target = _[0];
  if (!target) { console.error('fetch-snapshot: missing <CODEX-ID|file>'); return 1; }
  if (typeof flags.from !== 'string') { console.error('fetch-snapshot: --from <fetched-file> is required (the CLI is network-free; the caller fetches)'); return 1; }

  let file = null;
  let orgRoot = null;
  if (await exists(resolve(target))) {
    file = resolve(target);
    orgRoot = await findOrgRoot(file);
    if (!orgRoot) { console.error('fetch-snapshot: file is not inside a Transitrix workspace (no transitrix.yaml).'); return 2; }
  } else {
    orgRoot = await resolveOrgRoot(undefined, 'fetch-snapshot');
    if (!orgRoot) return 2;
    file = await findCodexFile(orgRoot, target);
    if (!file) { console.error(`fetch-snapshot: no codex artefact with id ${target} under codex/`); return 2; }
  }

  try {
    const res = await fetchSnapshot(orgRoot, file, {
      fromPath: flags.from,
      today: flags.today ? String(flags.today) : today(),
      ext: typeof flags.ext === 'string' ? flags.ext : undefined,
    });
    if (flags.json) { console.log(JSON.stringify(res, null, 2)); return 0; }
    console.log(`fetch-snapshot  ${res.id}  ->  ${res.outcome}  (proceed: ${res.proceed})`);
    console.log(`  snapshot: ${res.snapshot}`);
    console.log(`  source_hash: ${res.source_hash}`);
    if (res.outcome === 'bytes_identical') console.log('  signal moved, bytes identical — no extraction; reported on the digest.');
    return 0;
  } catch (err) {
    console.error(`fetch-snapshot: ${err.message}`);
    return 2;
  }
}

async function cmdSegment(args) {
  const { _, flags } = parseArgs(args);
  const snapshot = _[0];
  if (typeof flags.from !== 'string') { console.error('segment: --from <result.json> is required (the segment agent output)'); return 1; }
  const fromPath = resolve(flags.from);
  if (!(await exists(fromPath))) { console.error(`segment: --from file not found: ${flags.from}`); return 2; }

  const anchor = snapshot ? resolve(snapshot) : process.cwd();
  const orgRoot = await findOrgRoot(anchor);
  if (!orgRoot) { console.error('segment: not inside a Transitrix workspace (no transitrix.yaml); pass a <snapshot> inside one.'); return 2; }

  try {
    const res = await emitSegments({
      orgRoot,
      snapshotPath: snapshot ? resolve(snapshot) : undefined,
      resultPath: fromPath,
      source: typeof flags.source === 'string' ? flags.source : undefined,
      today: flags.today ? String(flags.today) : today(),
    });
    console.log(`segment  source ${res.source}  ->  ${res.segments.length} SEGMENT(s) -> ${res.dir}`);
    for (const f of res.flags) console.log(`  flag: ${f}`);
    console.log('  segments are proposed — nothing admitted to the field zone.');
    return 0;
  } catch (err) {
    console.error(`segment: ${err.message}`);
    return 2;
  }
}

async function cmdClassify(args) {
  const { _, flags } = parseArgs(args);
  if (typeof flags.from !== 'string') { console.error('classify: --from <result.json> is required (the classify agent output)'); return 1; }
  const fromPath = resolve(flags.from);
  if (!(await exists(fromPath))) { console.error(`classify: --from file not found: ${flags.from}`); return 2; }

  const segmentsDir = _[0] ? resolve(_[0]) : undefined;
  const anchor = segmentsDir || process.cwd();
  const orgRoot = await findOrgRoot(anchor);
  if (!orgRoot) { console.error('classify: not inside a Transitrix workspace (no transitrix.yaml); pass the <segments-dir> inside one.'); return 2; }

  try {
    const res = await emitCandidates({
      orgRoot,
      resultPath: fromPath,
      segmentsDir,
      today: flags.today ? String(flags.today) : today(),
    });
    console.log(`classify  ${res.candidates.length} candidate(s) (REQUIREMENT ${res.requirements} / CONSTRAINT ${res.constraints}) -> ${res.dir}`);
    for (const f of res.flags) console.log(`  flag: ${f}`);
    console.log('  candidates are proposed — nothing admitted to canon.');
    return 0;
  } catch (err) {
    console.error(`classify: ${err.message}`);
    return 2;
  }
}

async function cmdValidate(args) {
  const { _, flags } = parseArgs(args);
  const orgRoot = await resolveOrgRoot(_[0], 'validate');
  if (!orgRoot) return 2;

  const res = await validateStaged(orgRoot);
  if (flags.json) { console.log(JSON.stringify(res, null, 2)); return res.reviewed ? 1 : 0; }

  if (res.total === 0) { console.log('validate: no staged SEGMENTs or candidates under _intake/processing/.'); return 0; }
  for (const it of res.items) {
    if (!it.flags.length) { console.log(`ok     ${it.id}`); continue; }
    console.log(`FLAG   ${it.id}`);
    for (const fl of it.flags) console.log(`         - [${fl.code}/${fl.severity}] ${fl.message}`);
  }
  console.log(`\n${res.total} artefact(s); ${res.reviewed} need review (${res.errors} error(s), ${res.warnings} warning(s)).`);
  console.log('  flagged artefacts are review-digest items, not rejections — a human gates them.');
  return res.reviewed ? 1 : 0;
}

async function cmdAmendment(args) {
  const { _, flags } = parseArgs(args);
  const target = _[0];
  if (!target) { console.error('amendment: missing <CODEX-ID|file>'); return 1; }

  let file = null;
  let orgRoot = null;
  if (await exists(resolve(target))) {
    file = resolve(target);
    orgRoot = await findOrgRoot(file);
    if (!orgRoot) { console.error('amendment: file is not inside a Transitrix workspace (no transitrix.yaml).'); return 2; }
  } else {
    orgRoot = await resolveOrgRoot(undefined, 'amendment');
    if (!orgRoot) return 2;
    file = await findCodexFile(orgRoot, target);
    if (!file) { console.error(`amendment: no codex artefact with id ${target} under codex/`); return 2; }
  }

  let fromResult;
  if (typeof flags.from === 'string') {
    try { fromResult = JSON.parse(await readFile(resolve(flags.from), 'utf8')); }
    catch (err) { console.error(`amendment: --from does not parse as JSON: ${err.message}`); return 2; }
  }
  const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

  try {
    const res = await emitAmendment(orgRoot, file, {
      changeDescription: typeof flags.change === 'string' ? flags.change : undefined,
      name: typeof flags.name === 'string' ? flags.name : undefined,
      amendedAt: typeof flags['amended-at'] === 'string' ? flags['amended-at'] : undefined,
      likelyImpacted: list(flags['likely-impacted']),
      segmentRefs: list(flags['segment-refs']),
      fromResult,
      today: flags.today ? String(flags.today) : today(),
    });
    console.log(`amendment  ${res.id}  (source ${res.source})  ->  ${res.file}`);
    console.log(`  segment_refs: ${res.segment_refs.length}  likely_impacted: ${res.likely_impacted.length}  motivates: 0 (human fills)`);
    for (const w of res.warnings) console.log(`  warning: ${w}`);
    console.log('  proposed — a human adjudicates and authors the canon CHANGE response.');
    return 0;
  } catch (err) {
    console.error(`amendment: ${err.message}`);
    return 2;
  }
}

async function cmdDigest(args) {
  const { _, flags } = parseArgs(args);
  const orgRoot = await resolveOrgRoot(_[0], 'digest');
  if (!orgRoot) return 2;
  const asOf = flags['as-of'] ? String(flags['as-of']) : today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) { console.error('digest: --as-of must be YYYY-MM-DD'); return 1; }

  const digest = await buildDigest({ orgRoot, asOf, runId: typeof flags['run-id'] === 'string' ? flags['run-id'] : undefined });
  const out = flags.out ? resolve(flags.out) : await defaultDigestPath(orgRoot);
  await writeDigest(digest, out);

  const t = digest.tally;
  console.log(`review digest  ->  ${out}`);
  console.log(`  ${t.sources_touched} source(s) · proposed: SEGMENT ${t.proposed.SEGMENT} / REQUIREMENT ${t.proposed.REQUIREMENT} / CONSTRAINT ${t.proposed.CONSTRAINT} / AMENDMENT ${t.proposed.AMENDMENT} · review_needed ${t.review_needed}`);
  console.log('  nothing admitted to canon — a human gates this digest.');
  return 0;
}

async function main(argv) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  if (cmd === '--version' || cmd === '-v') { console.log(await version()); return 0; }

  switch (cmd) {
    case 'list-due':     return cmdListDue(args);
    case 'update-scan':  return cmdUpdateScan(args);
    case 'check-signal': return cmdCheckSignal(args);
    case 'fetch-snapshot': return cmdFetchSnapshot(args);
    case 'segment':      return cmdSegment(args);
    case 'classify':     return cmdClassify(args);
    case 'validate':     return cmdValidate(args);
    case 'amendment':    return cmdAmendment(args);
    case 'digest':       return cmdDigest(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
