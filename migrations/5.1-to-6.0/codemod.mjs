#!/usr/bin/env node
// Only the manifest pin is mechanical. Knowledge relationships require review.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
if (args.some(a => a.startsWith('--') && a !== '--dry-run') || args.filter(a => !a.startsWith('--')).length > 1) {
  console.error('Usage: node codemod.mjs [--dry-run] [target-dir]');
  process.exit(2);
}
try {
  const file = join(resolve(args.find(a => !a.startsWith('--')) ?? '.'), 'transitrix.yaml');
  const text = readFileSync(file, 'utf8');
  const lines = text.match(/^methodology_version:.*$/gm) ?? [];
  const pin = /^methodology_version: (["']?)(5\.1\.0|6\.0\.0)\1([ \t]*(?:#.*)?)(\r?)$/;
  if (lines.length !== 1 || !pin.test(lines[0])) {
    console.error('Manual intervention: expected one top-level 5.1.0 or 6.0.0 methodology_version pin.');
    process.exit(1);
  }
  const next = text.replace(/^methodology_version:.*$/m, line => line.replace(pin, (_, quote, version, comment, cr) => `methodology_version: ${quote}6.0.0${quote}${comment}${cr}`));
  const changed = next !== text;
  if (changed && !args.includes('--dry-run')) writeFileSync(file, next);
  if (changed) console.log('transitrix.yaml: methodology_version 5.1.0 -> 6.0.0 (1 field)');
  console.log(`1 file scanned; ${changed ? 1 : 0} file${changed ? '' : 's'} ${args.includes('--dry-run') ? 'would change' : 'changed'}.`);
  console.log('Pin update only: complete the manual compatibility review and run validate.mjs.');
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
