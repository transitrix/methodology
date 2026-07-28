#!/usr/bin/env node
// @transitrix/reqif-cli — the reference converter + validator for the ReqIF
// domain package (notations/packages/reqif.md). Never wired into
// @transitrix/ingest-cli or scripts/check-notations.mjs (PACKAGES.md §4.2) —
// standalone, self-contained, zero cross-package dependency, so deleting this
// folder plus the `packages:` line in an adopter's transitrix.yaml leaves no
// trace (PACKAGES.md §4.3).
//
// Commands: export, import, validate, roundtrip, transition, revise, history, suspect.
// Exit codes: 0 = ok · 1 = findings (validation errors / roundtrip mismatch) · 2 = usage/error

import { readFile, writeFile } from 'node:fs/promises';
import { loadPackage, writePackage, writeOne, normalizeModel, deepEqual } from './src/model.mjs';
import { modelToReqifXml, reqifXmlToModel } from './src/reqif-xml.mjs';
import { validatePackage } from './src/validate.mjs';
import { currentState, isValidTransition, applyTransition } from './src/workflow.mjs';
import { reviseObject, historyOf } from './src/revisions.mjs';
import { computeSuspectLinks } from './src/suspect.mjs';

function usage() {
  return `@transitrix/reqif-cli — ReqIF-shaped package converter + validator (notations/packages/reqif.md)

Usage:
  transitrix-reqif export <reqif-folder> <out.reqif>     Write the package as ReqIF XML.
  transitrix-reqif import <in.reqif> <reqif-folder>       Write a ReqIF XML document as package YAML.
  transitrix-reqif validate <reqif-folder>                Run the package's own validator (REQIF-001..009).
  transitrix-reqif roundtrip <reqif-folder>                Export then re-import in memory; assert an identical object set.
  transitrix-reqif transition <reqif-folder> <spec-object-id> <new-state>
                                                            Advance a spec-object's workflow_state by exactly one legal step.
  transitrix-reqif revise <reqif-folder> <spec-object-id> <ReqIF.Attr> <new-value>
                                                            Change one value, snapshotting the prior values into the object's revision history.
  transitrix-reqif history <reqif-folder> <spec-object-id> Print a spec-object's revision history, oldest first.
  transitrix-reqif suspect <reqif-folder>                  List every spec-relation with its computed suspect status.
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

function findSpecObject(model, id) {
  const so = model.specObjects.find(o => o.id === id);
  if (!so) throw new Error(`no spec-object "${id}" in this package`);
  return so;
}

async function cmdTransition(args) {
  const [dir, id, toState] = args;
  if (!dir || !id || !toState) { console.error('usage: transitrix-reqif transition <reqif-folder> <spec-object-id> <new-state>'); return 2; }
  const model = await loadPackage(dir);
  let so;
  try { so = findSpecObject(model, id); } catch (err) { console.error(err.message); return 2; }
  const from = currentState(so);
  if (!isValidTransition(from, toState)) {
    console.error(`transition  rejected — "${from}" -> "${toState}" is not a legal step for spec-object "${id}" (notations/packages/reqif.md §2.9).`);
    return 1;
  }
  const updated = applyTransition(so, toState);
  await writeOne(dir, 'spec-object', updated);
  console.log(`transition  spec-object "${id}": "${from}" -> "${toState}".`);
  return 0;
}

async function cmdRevise(args) {
  const [dir, id, key, value] = args;
  if (!dir || !id || !key || value === undefined) { console.error('usage: transitrix-reqif revise <reqif-folder> <spec-object-id> <ReqIF.Attr> <new-value>'); return 2; }
  const model = await loadPackage(dir);
  let so;
  try { so = findSpecObject(model, id); } catch (err) { console.error(err.message); return 2; }
  const recordedAt = new Date().toISOString();
  const updated = reviseObject(so, { [key]: value }, recordedAt);
  await writeOne(dir, 'spec-object', updated);
  console.log(`revise  spec-object "${id}": revision ${updated.revision - 1} -> ${updated.revision} ("${key}" changed, recorded ${recordedAt}).`);
  return 0;
}

async function cmdHistory(args) {
  const [dir, id] = args;
  if (!dir || !id) { console.error('usage: transitrix-reqif history <reqif-folder> <spec-object-id>'); return 2; }
  const model = await loadPackage(dir);
  let so;
  try { so = findSpecObject(model, id); } catch (err) { console.error(err.message); return 2; }
  const entries = historyOf(so);
  console.log(`history  spec-object "${id}" — ${entries.length} revision(s):`);
  for (const e of entries) {
    console.log(`  revision ${e.revision}${e.recorded_at ? ` (superseded ${e.recorded_at})` : ' (current)'}: ${JSON.stringify(e.values)}`);
  }
  return 0;
}

async function cmdSuspect(args) {
  const [dir] = args;
  if (!dir) { console.error('usage: transitrix-reqif suspect <reqif-folder>'); return 2; }
  const model = await loadPackage(dir);
  const links = computeSuspectLinks(model);
  const suspectCount = links.filter(l => l.suspect).length;
  console.log(`suspect  ${suspectCount}/${links.length} spec-relation(s) flagged suspect:`);
  for (const l of links) {
    console.log(`  [${l.suspect ? 'SUSPECT' : 'ok'}] "${l.id}" (${l.type}) -> "${l.target}" — recorded at revision ${l.recordedTargetRevision}, target now at revision ${l.targetRevision}.`);
  }
  return 0;
}

async function main(argv) {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === '--help' || cmd === '-h') { console.log(usage()); return cmd ? 0 : 1; }
  switch (cmd) {
    case 'export':     return cmdExport(args);
    case 'import':     return cmdImport(args);
    case 'validate':   return cmdValidate(args);
    case 'roundtrip':  return cmdRoundtrip(args);
    case 'transition': return cmdTransition(args);
    case 'revise':     return cmdRevise(args);
    case 'history':    return cmdHistory(args);
    case 'suspect':    return cmdSuspect(args);
    default:
      console.error(`unknown command: ${cmd}\n\n${usage()}`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { console.error(err && err.stack ? err.stack : err); process.exit(2); });
