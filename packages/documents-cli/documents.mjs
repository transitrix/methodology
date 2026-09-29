#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseDocument } from 'yaml';
import { validateRecords } from './src/validate.mjs';
import { inspectEvent } from './src/events.mjs';
import { createEvent, readEvent, localLoader, parseRecord } from './src/register.mjs';

async function validate(folder) {
  const root = resolve(folder);
  if (!(await stat(root)).isDirectory()) throw new Error('Expected a documents package directory.');
  const records = [];
  const findings = [];
  for (const [subdir, kind] of [['document-types', 'document-type'], ['documents', 'document'], ['events', 'issuance-event']]) {
    let entries;
    try { entries = await readdir(join(root, subdir), { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!/\.ya?ml$/.test(entry.name)) continue;
      const file = `${subdir}/${entry.name}`;
      try {
        if (!entry.isFile()) throw new Error('Expected a regular YAML record file.');
        const parsed = parseDocument(await readFile(join(root, file), 'utf8'), { uniqueKeys: true });
        if (parsed.errors.length) throw new Error(parsed.errors.map(e => e.message).join('; '));
        const value = parsed.toJS({ maxAliasCount: 100 });
        records.push({ file, value });
        if (value?.kind !== kind || entry.name.replace(/\.ya?ml$/, '') !== value?.id) {
          findings.push({ code: 'INPUT', severity: 'error', file, message: 'Filename must match id and folder must match kind (documents.md §2.3).' });
        }
      } catch (error) {
        findings.push({ code: 'INPUT', severity: 'error', file, message: error.message });
      }
    }
  }
  findings.push(...validateRecords(records));
  for (const { file, value } of records.filter(r => r.value?.kind === 'issuance-event')) {
    const report = await inspectEvent(value, { load: localLoader(root) });
    for (const e of report.evidence) {
      if (e.status !== 'consistent') findings.push({ code: 'DOCS-EVIDENCE',
        severity: e.status === 'conflict' ? 'error' : 'warning', file,
        message: `${e.name}: ${e.status}${e.format ? ` (${e.format})` : ''}.` });
    }
    if (value.timestamp) console.log(`documents timestamp ${file}: external evidence; trust not verified`);
  }
  const errors = findings.filter(f => f.severity === 'error').length;
  for (const f of findings) console.log(`${f.code} ${f.severity} ${f.file}: ${f.message}`);
  console.log(`documents validate: ${records.length} record(s), ${errors} error(s), ${findings.length - errors} warning(s)`);
  return errors ? 1 : 0;
}

const [command, folder, arg, ...extra] = process.argv.slice(2);
if (!folder || extra.length || !['validate', 'record', 'read'].includes(command)
    || (command === 'validate' ? !!arg : !arg)) {
  console.error('Usage: transitrix-documents validate <documents-folder> | record <documents-folder> <act.yaml> | read <documents-folder> <issue-id>');
  process.exitCode = 2;
} else {
  try {
    if (command === 'validate') process.exitCode = await validate(folder);
    else {
      const result = command === 'record'
        ? await createEvent(folder, parseRecord(await readFile(arg, 'utf8')))
        : await readEvent(folder, arg);
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = ['invalid', 'conflict'].includes(result.status) ? 1 : 0;
    }
  } catch (error) {
    // Generic dispatch retains stdout, including failures to read package input.
    console.log(`INPUT error: ${error.message}`);
    process.exitCode = 2;
  }
}
