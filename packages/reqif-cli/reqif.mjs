#!/usr/bin/env node
// @transitrix/reqif-cli — the reference converter + validator for the ReqIF
// domain package (notations/packages/reqif.md). Never wired into
// @transitrix/ingest-cli or scripts/check-notations.mjs (PACKAGES.md §4.2) —
// standalone, self-contained, zero cross-package dependency, so deleting this
// folder plus the `packages:` line in an adopter's transitrix.yaml leaves no
// trace (PACKAGES.md §4.3).
//
// Commands: export, import, validate, roundtrip.
// Exit codes: 0 = ok · 1 = findings (validation errors / roundtrip mismatch) · 2 = usage/error

import { readFile, writeFile } from 'node:fs/promises';
import { loadPackage, writePackage, normalizeModel, deepEqual } from './src/model.mjs';
import { modelToReqifXml, reqifXmlToModel } from './src/reqif-xml.mjs';
import { validatePackage } from './src/validate.mjs';

function usage() {
  return `@transitrix/reqif-cli — ReqIF-shaped package converter + validator (notations/packages/reqif.md)

Usage:
  transitrix-reqif export <reqif-folder> <out.reqif>     Write the package as ReqIF XML.
  transitrix-reqif import <in.reqif> <reqif-folder>       Write a ReqIF XML document as package YAML.
  transitrix-reqif validate <reqif-folder>                Run the package's own validator (REQIF-001..007).
  transitrix-reqif roundtrip <reqif-folder>                Export then re-import in memory; assert an identical object set.
`;
}

async function cmdExport(args) {
  const [dir, out] = args;
  if (!dir || !out) { console.error('usage: transitrix-reqif export <reqif-folder> <out.reqif>'); return 2; }
  const model = await loadPackage(dir);
  await writeFile(out, modelToReqifXml(model), 'utf8');
  console.log(`export  wrote ${out} — ${model.specObjectTypes.length} type(s), ${model.specObjects.length} object(s), ${model.specRelations.length} relation(s), ${model.specHierarchies.length} hierarchy/hierarchies.`);
  return 0;
}

async function cmdImport(args) {
  const [inFile, dir] = args;
  if (!inFile || !dir) { console.error('usage: transitrix-reqif import <in.reqif> <reqif-folder>'); return 2; }
  const xml = await readFile(inFile, 'utf8');
  const model = reqifXmlToModel(xml);
  await writePackage(dir, model);
  console.log(`import  wrote ${dir} — ${model.specObjectTypes.length} type(s), ${model.specObjects.length} object(s), ${model.specRelations.length} relation(s), ${model.specHierarchies.length} hierarchy/hierarchies.`);
  return 0;
}

async function cmdValidate(args) {
  const [dir] = args;
  if (!dir) { console.error('usage: transitrix-reqif validate <reqif-folder>'); return 2; }
  const model = await loadPackage(dir);
  const findings = validatePackage(model);
  if (findings.length === 0) {
    console.log(`validate  clean — ${model.specObjectTypes.length} type(s), ${model.specObjects.length} object(s), ${model.specRelations.length} relation(s), ${model.specHierarchies.length} hierarchy/hierarchies.`);
    return 0;
  }
  console.error(`validate  ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  [${f.code}] ${f.message}`);
  return 1;
}

async function cmdRoundtrip(args) {
  const [dir] = args;
  if (!dir) { console.error('usage: transitrix-reqif roundtrip <reqif-folder>'); return 2; }
  const original = await loadPackage(dir);
  const xml = modelToReqifXml(original);
  const reimported = reqifXmlToModel(xml);
  const ok = deepEqual(normalizeModel(original), normalizeModel(reimported));
  if (ok) {
    console.log(`roundtrip  PASS — export→re-import produced an identical object set (${original.specObjectTypes.length + original.specObjects.length + original.specRelations.length + original.specHierarchies.length} object(s)).`);
    return 0;
  }
  console.error('roundtrip  FAIL — re-imported object set differs from the original.');
  console.error('--- original ---');
  console.error(JSON.stringify(normalizeModel(original), null, 2));
  console.error('--- re-imported ---');
  console.error(JSON.stringify(normalizeModel(reimported), null, 2));
  return 1;
}

async function main(argv) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  switch (cmd) {
    case 'export':     return cmdExport(args);
    case 'import':     return cmdImport(args);
    case 'validate':   return cmdValidate(args);
    case 'roundtrip':  return cmdRoundtrip(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
