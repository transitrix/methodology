#!/usr/bin/env node
// @transitrix/ingest-cli — deterministic front-door pipeline for the Transitrix
// ingest skill. The skill's SKILL.md shells out to this CLI; it never reimplements
// the logic, so behaviour is identical under Claude and GitHub Copilot.
//
// THE ONE RULE: this CLI proposes. It writes field artefacts, candidates, and a
// review queue into _intake/ and field/, and it never writes *admitted* canon. The
// one path that writes under canon/ is the §13 holding area `canon/unresolved/`:
// emit-candidates parks objects it could not TYPE there as NON-admitted records (no
// admission record), which a human later resolves. Admitted canon stays human-gated.
//
// Exit codes:  0 = ok  ·  1 = usage / findings that need review  ·  2 = error
//
// Implemented: --version, scaffold-intake, convert, privacy-scan, admit-source (field
// + codex; field-artefact / codex-artefact remain as deprecated aliases),
// emit-candidates, validate, review-queue.

import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { scaffoldIntake, findOrgRoot, stageDir, readManifestText } from './src/intake.mjs';
import { convert, ConvertError } from './src/convert.mjs';
import { emitFieldArtefact } from './src/field-artefact.mjs';
import { validateCandidate, loadCandidates } from './src/validate.mjs';
import { readCoverageProfile, parseProfileDecl } from './src/coverage.mjs';
import { buildReviewQueue, writeReviewQueue } from './src/review-queue.mjs';
import { buildProfileSuggestion } from './src/suggest-profile.mjs';
import { emitCandidates } from './src/emit-candidates.mjs';
import { emitCodexArtefact } from './src/codex-artefact.mjs';
import { resolvePlacement, checkCanonPlacement } from './src/placement.mjs';
import { repoCheck } from './src/repo-check.mjs';
import { checkStale } from './src/check-stale.mjs';
import { dump } from './src/yaml.mjs';
import { runPrivacyScan, parsePrivacyGateConfig } from './src/privacy-scan.mjs';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tiny flag parser: returns { _: [positionals], flags: { name: value } }.
// `--k v` and `--k=v` are supported; a bare `--k` becomes boolean true.
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

async function version() {
  const pkg = JSON.parse(await readFile(join(__dirname, 'package.json'), 'utf8'));
  return pkg.version;
}

function usage() {
  return [
    'transitrix-ingest <command> [args]',
    '',
    'Commands:',
    '  scaffold-intake <org-root>     Create _intake/{inbox,processing,processed} (idempotent)',
    '  convert <inbox-file>           Convert a document to Markdown in _intake/processing/',
    '  privacy-scan <processing/file.md>   Fail-closed PII/medical pre-admission gate (SKILL.md Step 2b)',
    '                                 CLEAN|STRIPPED proceed to admit-source; REJECTED|ERROR halt the pipeline',
    '  admit-source <md> --zone field|codex   Admit a converted source to the field or codex zone',
    '                 field: --type INTERVIEW|SURVEY|OBSERVATION|DRAFT --role R --date YYYY-MM-DD',
    '                        [--captured-by X] [--source-quality Q] [--slug SL] [--admitted-at A]',
    '                 codex: --type LAW|REGULATION|POLICY|INTERNAL_STANDARD --effective-date YYYY-MM-DD',
    '                        [--jurisdiction J] [--source-authority A] [--issuing-authority A] [--slug SL] [--monitoring]',
    '                 [--force]  admit even if an identical source (same source_hash) is already admitted',
    '  field-artefact / codex-artefact        Deprecated aliases of admit-source --zone field|codex',
    '  emit-candidates <field-artefact> --from <result.json> [--candidates-dir <dir>]',
    '                                 Shape the agent extraction result into candidates',
    '  validate <candidates-dir>      Validate candidate *.json against the contract + coverage profile',
    '  review-queue <candidates-dir>  Assemble the human review queue (writes review-queue.yaml)',
    '                 [--out <path>]',
    '  suggest-profile <candidates-dir>  Propose a coverage-profile delta for out-of-profile TYPEs (read-only; prints to stdout)',
    '  repo-check [org-root]          Data-free health report (version, profile, zone/TYPE counts, integrity flags); read-only',
    '  check-placement [org-root]     Flag admitted elements sitting outside their ELEMENT_PRIMITIVES §4 folder',
    '  check-stale [org-root]         List REQUIREMENT/CONSTRAINT elements whose next_review_at has passed (REQ-STALE-001)',
    '  resolve-placement <TYPE>       Print a TYPE\'s §4 materialisation mode + layer + folder',
    '  --version, -v                  Print the CLI version',
    '  --help, -h                     Show this help',
  ].join('\n');
}

async function cmdScaffoldIntake(args) {
  const orgRoot = args[0];
  if (!orgRoot) { console.error('scaffold-intake: missing <org-root>'); return 1; }
  const { created, existing } = await scaffoldIntake(orgRoot);
  for (const d of created) console.log(`created  ${d}/`);
  for (const d of existing) console.log(`exists   ${d}/`);
  console.log(`\n_intake/ ready under ${resolve(orgRoot)} (${created.length} created, ${existing.length} already present).`);
  return 0;
}

async function cmdConvert(args) {
  const file = args[0];
  if (!file) { console.error('convert: missing <inbox-file>'); return 1; }
  const src = resolve(file);
  try { await access(src); } catch { console.error(`convert: file not found: ${file}`); return 2; }
  const orgRoot = await findOrgRoot(src);
  if (!orgRoot) {
    console.error(`convert: "${file}" is not inside an _intake/ workspace. Run \`scaffold-intake <org-root>\` first and drop the file in _intake/inbox/.`);
    return 2;
  }
  const processing = stageDir(orgRoot, 'processing');
  try {
    const { out, mode } = await convert(src, processing);
    console.log(`converted (${mode})  ${file}  ->  ${out}`);
    return 0;
  } catch (err) {
    if (err instanceof ConvertError) {
      console.error(err.message);
      return err.exitCode;
    }
    throw err;
  }
}

async function cmdPrivacyScan(args) {
  const { _ } = parseArgs(args);
  const md = _[0];
  if (!md) { console.error('privacy-scan: missing <processing/file.md>'); return 1; }
  const mdPath = resolve(md);
  try { await access(mdPath); } catch { console.error(`privacy-scan: file not found: ${md}`); return 2; }
  const orgRoot = await findOrgRoot(mdPath);
  if (!orgRoot) { console.error(`privacy-scan: "${md}" is not inside an _intake/ workspace.`); return 2; }

  const config = parsePrivacyGateConfig(await readManifestText(orgRoot));
  const processingDir = stageDir(orgRoot, 'processing');
  const res = await runPrivacyScan({ mdPath, processingDir, config, runId: randomUUID() });

  console.log(`privacy-scan  ${md}  ->  ${res.outcome}`);
  if (res.outcome === 'STRIPPED') {
    console.log(`  ${res.blockedFragments.filter((f) => !f.allowlist_cleared).length} fragment(s) redacted -> ${res.redactedFile}`);
    console.log('  admit-source must be run on the redacted copy, not the original.');
  }
  if (res.outcome === 'REJECTED') {
    console.error(`  ${res.blockedFragments.length} fragment(s) blocked — document not admissible; see privacy-report.yaml`);
  }
  if (res.outcome === 'ERROR') {
    console.error(`  ${res.errorDetail}`);
  }
  console.log(`  privacy-report.yaml  ->  ${join(processingDir, 'privacy-report.yaml')}`);

  if (res.outcome === 'CLEAN' || res.outcome === 'STRIPPED') return 0;
  if (res.outcome === 'REJECTED') return 1;
  return 2;
}

async function cmdFieldArtefact(args) {
  const { _, flags } = parseArgs(args);
  const md = _[0];
  if (!md) { console.error('field-artefact: missing <md> (a converted file in _intake/processing/)'); return 1; }
  const mdPath = resolve(md);
  try { await access(mdPath); } catch { console.error(`field-artefact: file not found: ${md}`); return 2; }
  if (!flags.type || !flags.role || !flags.date) {
    console.error('field-artefact: --type, --role and --date are required');
    return 1;
  }
  const orgRoot = await findOrgRoot(mdPath);
  if (!orgRoot) { console.error(`field-artefact: "${md}" is not inside an _intake/ workspace.`); return 2; }

  try {
    const res = await emitFieldArtefact({
      orgRoot, mdPath,
      type: String(flags.type).toUpperCase(),
      role: flags.role,
      date: flags.date,
      setting: flags.setting,
      capturedBy: flags['captured-by'] || '@transitrix/ingest-cli',
      sourceQuality: flags['source-quality'],
      slug: flags.slug,
      admittedAt: flags['admitted-at'] || today(),
      name: flags.name,
      force: flags.force === true || flags.force === 'true',
    });
    console.log(`field artefact  ${res.id}  ->  ${res.outPath}`);
    console.log(`  proposed source_quality: ${res.proposedSQ} (confirm at admission)`);
    if (res.rawMoved) console.log(`  raw source retained: ${res.rawMoved}`);
    if (res.sourceHash) console.log(`  source_hash:         ${res.sourceHash}`);
    return 0;
  } catch (err) {
    if (err.duplicate) {
      console.log(`field artefact  skipped — ${err.message}`);
      return 0;
    }
    console.error(`field-artefact: ${err.message}`);
    return err.privacyGate ? 1 : 2;
  }
}

async function cmdCodexArtefact(args) {
  const { _, flags } = parseArgs(args);
  const md = _[0];
  if (!md) { console.error('codex-artefact: missing <md> (a converted file in _intake/processing/)'); return 1; }
  const mdPath = resolve(md);
  try { await access(mdPath); } catch { console.error(`codex-artefact: file not found: ${md}`); return 2; }
  if (!flags.type || !flags['effective-date']) {
    console.error('codex-artefact: --type and --effective-date are required');
    return 1;
  }
  const orgRoot = await findOrgRoot(mdPath);
  if (!orgRoot) { console.error(`codex-artefact: "${md}" is not inside an _intake/ workspace.`); return 2; }

  try {
    const res = await emitCodexArtefact({
      orgRoot, mdPath,
      type: String(flags.type).toUpperCase(),
      jurisdiction: flags.jurisdiction,
      effectiveDate: flags['effective-date'],
      sourceAuthority: flags['source-authority'],
      issuingAuthority: flags['issuing-authority'],
      admittedAt: flags['admitted-at'] || today(),
      admittedBy: flags['admitted-by'] || '@transitrix/ingest-cli',
      monitoring: flags.monitoring === true || flags.monitoring === 'true',
      slug: flags.slug,
      name: flags.name,
      force: flags.force === true || flags.force === 'true',
    });
    console.log(`codex artefact  ${res.id}  ->  ${res.outPath}`);
    console.log(`  zone: codex (${res.scope}) — authoritative by construction; derive obligations as REQUIREMENT + ASSERTION candidates`);
    if (res.snapshotFile) console.log(`  snapshot retained: ${res.snapshotFile}`);
    if (res.sourceHash) console.log(`  source_hash:       ${res.sourceHash}`);
    return 0;
  } catch (err) {
    if (err.duplicate) {
      console.log(`codex artefact  skipped — ${err.message}`);
      return 0;
    }
    console.error(`codex-artefact: ${err.message}`);
    return 2;
  }
}

// Unified front door (admit-source --zone). `field-artefact` and `codex-artefact`
// remain as deprecated aliases for one release; both route through here.
async function cmdAdmitSource(args) {
  const { flags } = parseArgs(args);
  const zone = flags.zone || 'field';
  if (zone === 'field') return cmdFieldArtefact(args);
  if (zone === 'codex') return cmdCodexArtefact(args);
  console.error(`admit-source: --zone must be field|codex (got ${JSON.stringify(zone)})`);
  return 1;
}

async function resolveDir(dirArg, label) {
  if (!dirArg) { console.error(`${label}: missing <candidates-dir>`); return { code: 1 }; }
  const dir = resolve(dirArg);
  try { await access(dir); } catch { console.error(`${label}: directory not found: ${dirArg}`); return { code: 2 }; }
  const orgRoot = await findOrgRoot(dir);
  if (!orgRoot) { console.error(`${label}: "${dirArg}" is not inside an _intake/ workspace.`); return { code: 2 }; }
  return { dir, orgRoot, profile: await readCoverageProfile(orgRoot) };
}

async function cmdValidate(args) {
  const { _ } = parseArgs(args);
  const r = await resolveDir(_[0], 'validate');
  if (r.code) return r.code;

  if (r.profile && r.profile.warning) console.error(`WARNING: ${r.profile.warning}`);

  const loaded = await loadCandidates(r.dir);
  if (loaded.length === 0) { console.log(`validate: no candidate *.json files in ${_[0]}`); return 0; }

  let needsReview = 0;
  for (const { ref, candidate, parseError } of loaded) {
    if (parseError || !candidate) { console.log(`FLAG   ${ref}\n         - does not parse: ${parseError || 'null'}`); needsReview++; continue; }
    const v = validateCandidate(candidate, r.profile);
    const issues = [...v.validation_flags];
    if (v.coverage_flag === 'out_of_profile') issues.push(`coverage: ${v.coverage_reason || 'out of profile'}`);
    if (issues.length) { needsReview++; console.log(`FLAG   ${ref}`); for (const i of issues) console.log(`         - ${i}`); }
    else console.log(`ok     ${ref}`);
  }
  console.log(`\n${loaded.length} candidate(s); ${needsReview} need review.`);
  return needsReview ? 1 : 0;
}

async function cmdReviewQueue(args) {
  const { _, flags } = parseArgs(args);
  const r = await resolveDir(_[0], 'review-queue');
  if (r.code) return r.code;

  // Pick up relation suggestions emitted by `emit-candidates`, if present.
  let suggestions = [];
  const suggPath = join(stageDir(r.orgRoot, 'processing'), 'relation-suggestions.json');
  try { suggestions = JSON.parse(await readFile(suggPath, 'utf8')); } catch { /* none */ }

  const queue = await buildReviewQueue({ orgRoot: r.orgRoot, candidatesDir: r.dir, profile: r.profile, suggestions });
  const out = flags.out ? resolve(flags.out) : join(stageDir(r.orgRoot, 'processing'), 'review-queue.yaml');
  await writeReviewQueue(queue, out);
  const flagged = queue.candidates.filter(c => c.validation_flags.length || c.coverage_flag === 'out_of_profile').length;
  if (queue.coverage_warning) console.error(`WARNING: ${queue.coverage_warning}`);
  console.log(`review queue  ->  ${out}`);
  console.log(`  coverage_profile: ${queue.coverage_profile}`);
  console.log(`  ${queue.field_artefacts.length} field artefact(s), ${queue.candidates.length} candidate(s) (${flagged} flagged), ${queue.relation_suggestions.length} relation suggestion(s).`);
  if (queue.excluded_admitted.length) {
    console.log(`  ${queue.excluded_admitted.length} candidate(s) excluded — already admitted to canon (idempotent re-run).`);
  }
  console.log('  nothing admitted to canon — a human gates this queue.');
  return 0;
}

async function cmdEmitCandidates(args) {
  const { _, flags } = parseArgs(args);
  const fa = _[0];
  if (!fa) { console.error('emit-candidates: missing <field-artefact>'); return 1; }
  if (!flags.from) { console.error('emit-candidates: --from <result.json> is required (the agent extraction result)'); return 1; }
  const fieldArtefactPath = resolve(fa);
  try { await access(fieldArtefactPath); } catch { console.error(`emit-candidates: field artefact not found: ${fa}`); return 2; }
  const orgRoot = await findOrgRoot(fieldArtefactPath);
  if (!orgRoot) { console.error(`emit-candidates: "${fa}" is not inside an _intake/ workspace.`); return 2; }

  try {
    const res = await emitCandidates({
      orgRoot, fieldArtefactPath,
      resultPath: resolve(flags.from),
      candidatesDir: flags['candidates-dir'] ? resolve(flags['candidates-dir']) : undefined,
      ingestDate: flags['ingest-date'] || today(),
    });
    console.log(`emit-candidates  derived_from ${res.derivedFrom}`);
    console.log(`  ${res.candidates.length} candidate(s) -> ${res.dir}`);
    console.log(`  ${res.suggestions.length} relation suggestion(s) held back (relation-conservative) -> ${res.suggPath}`);
    if (res.unresolved && res.unresolved.written.length) {
      console.log(`  ${res.unresolved.written.length} untyped object(s) parked (non-admitted) -> ${res.unresolved.dir}`);
    }
    if (res.unresolved && res.unresolved.skipped) {
      console.error(`  WARNING: ${res.unresolved.skipped} unresolved item(s) dropped — missing required ingest_field / data (CONTRACT §13.2)`);
    }
    for (const w of res.warnings || []) console.error(`  WARNING: ${w}`);
    console.log('  candidates are pending — nothing admitted to canon.');
    return 0;
  } catch (err) {
    console.error(`emit-candidates: ${err.message}`);
    return 2;
  }
}

// Discovery: scan candidates for out-of-profile TYPEs and PROPOSE a coverage delta.
// Read-only — prints a paste-ready suggestion to stdout, never widens the profile.
async function cmdSuggestProfile(args) {
  const { _ } = parseArgs(args);
  const r = await resolveDir(_[0], 'suggest-profile');
  if (r.code) return r.code;

  const loaded = await loadCandidates(r.dir);
  if (loaded.length === 0) { console.error(`suggest-profile: no candidate *.json files in ${_[0]}`); return 0; }

  const decl = parseProfileDecl((await readManifestText(r.orgRoot)) || '');
  const baseName = decl.kind === 'short' ? decl.name : decl.kind === 'custom' ? decl.extends : 'full';
  const report = buildProfileSuggestion(loaded, r.profile, baseName);
  process.stdout.write(dump(report));
  return 0;
}

// Read-only "doctor": emit a short, data-free health report for an adopter repo.
async function cmdRepoCheck(args) {
  const { _ } = parseArgs(args);
  const orgRoot = _[0] ? resolve(_[0]) : (await findOrgRoot(process.cwd()) || process.cwd());
  const report = await repoCheck(orgRoot);
  process.stdout.write(dump(report));
  return 0;
}

// Print the canonical §4 placement (mode + layer + folder) for a TYPE.
async function cmdResolvePlacement(args) {
  const { _ } = parseArgs(args);
  const type = _[0] ? String(_[0]).toUpperCase() : null;
  if (!type) { console.error('resolve-placement: missing <TYPE>'); return 1; }
  const p = resolvePlacement(type);
  if (!p) { console.error(`resolve-placement: ${type} has no ELEMENT_PRIMITIVES §4 placement (not a catalogue element TYPE).`); return 1; }
  console.log(`${type}  mode: ${p.mode}  layer: ${p.layer ?? '—'}  folder: ${p.folder ?? '(inline — no catalogue folder)'}${p.promotable ? '  (promotable, §1 rule)' : ''}`);
  return 0;
}

// List REQUIREMENT / CONSTRAINT files whose next_review_at is in the past
// (REQ-STALE-001; 15-requirement.md §2.3, §4). Read-only over canon/.
async function cmdCheckStale(args) {
  const { _ } = parseArgs(args);
  const orgRoot = _[0]
    ? (await findOrgRoot(resolve(_[0])) || resolve(_[0]))
    : (await findOrgRoot(process.cwd()));
  if (!orgRoot) { console.error('check-stale: not inside a Transitrix workspace (no _intake/ found); pass <org-root>.'); return 2; }

  const { scanned, stale, malformed, today } = await checkStale(orgRoot);
  if (stale.length === 0 && malformed.length === 0) {
    console.log(`check-stale  ${scanned} REQUIREMENT/CONSTRAINT file(s) scanned as of ${today} — none stale (REQ-STALE-001).`);
    return 0;
  }
  if (stale.length > 0) {
    console.error(`check-stale  ${stale.length} of ${scanned} REQUIREMENT/CONSTRAINT element(s) stale as of ${today} (REQ-STALE-001):`);
    for (const s of stale) console.error(`  STALE  ${s.id}  next_review_at: ${s.next_review_at}`);
  }
  if (malformed.length > 0) {
    console.error(`check-stale  ${malformed.length} file(s) with an unparseable next_review_at (skipped — evaluation elided per 15-requirement.md §4):`);
    for (const m of malformed) console.error(`  UNPARSED  ${m.id}  next_review_at: ${JSON.stringify(m.next_review_at)}`);
  }
  return stale.length > 0 ? 1 : 0;
}

// Flag admitted elements sitting outside their §4 folder (read-only over canon/).
async function cmdCheckPlacement(args) {
  const { _ } = parseArgs(args);
  const orgRoot = _[0]
    ? (await findOrgRoot(resolve(_[0])) || resolve(_[0]))
    : (await findOrgRoot(process.cwd()));
  if (!orgRoot) { console.error('check-placement: not inside a Transitrix workspace (no _intake/ found); pass <org-root>.'); return 2; }

  const { scanned, findings } = await checkCanonPlacement(orgRoot);
  if (findings.length === 0) {
    console.log(`check-placement  ${scanned} catalogue element(s) scanned — all sit in their ELEMENT_PRIMITIVES §4 folder.`);
    return 0;
  }
  console.error(`check-placement  ${findings.length} of ${scanned} element(s) misplaced (ELEMENT_PRIMITIVES §4):`);
  for (const f of findings) console.error(`  FLAG  ${f.id}\n          - ${f.reason}`);
  return 1;
}

async function main(argv) {
  const [cmd, ...args] = argv;

  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  if (cmd === '--version' || cmd === '-v') { console.log(await version()); return 0; }

  switch (cmd) {
    case 'scaffold-intake': return cmdScaffoldIntake(args);
    case 'convert':         return cmdConvert(args);
    case 'privacy-scan':    return cmdPrivacyScan(args);
    case 'admit-source':    return cmdAdmitSource(args);
    case 'field-artefact':  return cmdFieldArtefact(args);
    case 'codex-artefact':  return cmdCodexArtefact(args);
    case 'emit-candidates': return cmdEmitCandidates(args);
    case 'validate':        return cmdValidate(args);
    case 'review-queue':    return cmdReviewQueue(args);
    case 'suggest-profile': return cmdSuggestProfile(args);
    case 'repo-check':      return cmdRepoCheck(args);
    case 'check-placement': return cmdCheckPlacement(args);
    case 'check-stale':     return cmdCheckStale(args);
    case 'resolve-placement': return cmdResolvePlacement(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
