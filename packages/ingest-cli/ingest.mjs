#!/usr/bin/env node
// @transitrix/ingest-cli — deterministic front-door pipeline for the Transitrix
// ingest skill. The skill's SKILL.md shells out to this CLI; it never reimplements
// the logic, so behaviour is identical under Claude and GitHub Copilot.
//
// THE ONE RULE: this CLI proposes. It writes field artefacts, candidates, and a
// review queue into _intake/ and field/. It NEVER writes into canon/.
//
// Exit codes:  0 = ok  ·  1 = usage / findings that need review  ·  2 = error
//
// Implemented: --version, scaffold-intake, convert, admit-source (field + codex;
// field-artefact / codex-artefact remain as deprecated aliases), emit-candidates,
// validate, review-queue.

import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { scaffoldIntake, findOrgRoot, stageDir } from './src/intake.mjs';
import { convert, ConvertError } from './src/convert.mjs';
import { emitFieldArtefact } from './src/field-artefact.mjs';
import { validateCandidate, loadCandidates } from './src/validate.mjs';
import { readCoverageProfile } from './src/coverage.mjs';
import { buildReviewQueue, writeReviewQueue } from './src/review-queue.mjs';
import { emitCandidates } from './src/emit-candidates.mjs';
import { emitCodexArtefact } from './src/codex-artefact.mjs';

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
    '  admit-source <md> --zone field|codex   Admit a converted source to the field or codex zone',
    '                 field: --type INTERVIEW|SURVEY|OBSERVATION|DRAFT --role R --date YYYY-MM-DD',
    '                        [--captured-by X] [--source-quality Q] [--slug SL] [--admitted-at A]',
    '                 codex: --type LAW|REGULATION|POLICY|INTERNAL_STANDARD --effective-date YYYY-MM-DD',
    '                        [--jurisdiction J] [--source-authority A] [--issuing-authority A] [--slug SL] [--monitoring]',
    '  field-artefact / codex-artefact        Deprecated aliases of admit-source --zone field|codex',
    '  emit-candidates <field-artefact> --from <result.json> [--candidates-dir <dir>]',
    '                                 Shape the agent extraction result into candidates',
    '  validate <candidates-dir>      Validate candidate *.json against the contract + coverage profile',
    '  review-queue <candidates-dir>  Assemble the human review queue (writes review-queue.yaml)',
    '                 [--out <path>]',
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
    });
    console.log(`field artefact  ${res.id}  ->  ${res.outPath}`);
    console.log(`  proposed source_quality: ${res.proposedSQ} (confirm at admission)`);
    if (res.rawMoved) console.log(`  raw source retained: ${res.rawMoved}`);
    if (res.sourceHash) console.log(`  source_hash:         ${res.sourceHash}`);
    return 0;
  } catch (err) {
    console.error(`field-artefact: ${err.message}`);
    return 2;
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
    });
    console.log(`codex artefact  ${res.id}  ->  ${res.outPath}`);
    console.log(`  zone: codex (${res.scope}) — authoritative by construction; derive obligations as REQUIREMENT + ASSERTION candidates`);
    if (res.snapshotFile) console.log(`  snapshot retained: ${res.snapshotFile}`);
    if (res.sourceHash) console.log(`  source_hash:       ${res.sourceHash}`);
    return 0;
  } catch (err) {
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
  console.log(`review queue  ->  ${out}`);
  console.log(`  ${queue.field_artefacts.length} field artefact(s), ${queue.candidates.length} candidate(s) (${flagged} flagged), ${queue.relation_suggestions.length} relation suggestion(s).`);
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
    });
    console.log(`emit-candidates  derived_from ${res.derivedFrom}`);
    console.log(`  ${res.candidates.length} candidate(s) -> ${res.dir}`);
    console.log(`  ${res.suggestions.length} relation suggestion(s) held back (relation-conservative) -> ${res.suggPath}`);
    console.log('  candidates are pending — nothing admitted to canon.');
    return 0;
  } catch (err) {
    console.error(`emit-candidates: ${err.message}`);
    return 2;
  }
}

async function main(argv) {
  const [cmd, ...args] = argv;

  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  if (cmd === '--version' || cmd === '-v') { console.log(await version()); return 0; }

  switch (cmd) {
    case 'scaffold-intake': return cmdScaffoldIntake(args);
    case 'convert':         return cmdConvert(args);
    case 'admit-source':    return cmdAdmitSource(args);
    case 'field-artefact':  return cmdFieldArtefact(args);
    case 'codex-artefact':  return cmdCodexArtefact(args);
    case 'emit-candidates': return cmdEmitCandidates(args);
    case 'validate':        return cmdValidate(args);
    case 'review-queue':    return cmdReviewQueue(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
