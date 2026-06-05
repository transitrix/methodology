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
// Implemented in this increment: --version, scaffold-intake, convert.
// field-artefact / emit-candidates / validate / review-queue land next.

import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { scaffoldIntake, findOrgRoot, stageDir } from './src/intake.mjs';
import { convert, ConvertError } from './src/convert.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    '  --version, -v                  Print the CLI version',
    '  --help, -h                     Show this help',
    '',
    'Not yet implemented in this increment:',
    '  field-artefact  emit-candidates  validate  review-queue',
  ].join('\n');
}

const NOT_YET = new Set(['field-artefact', 'emit-candidates', 'validate', 'review-queue']);

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

async function main(argv) {
  const [cmd, ...args] = argv;

  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  if (cmd === '--version' || cmd === '-v') { console.log(await version()); return 0; }

  if (NOT_YET.has(cmd)) {
    console.error(`\`${cmd}\` is not implemented in this CLI increment yet.`);
    return 2;
  }

  switch (cmd) {
    case 'scaffold-intake': return cmdScaffoldIntake(args);
    case 'convert':         return cmdConvert(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
