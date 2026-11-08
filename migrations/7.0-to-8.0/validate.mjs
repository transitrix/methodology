#!/usr/bin/env node
// Read-only check of the sole mechanical transform; not model qualification.
import { readFileSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(a => a.startsWith('--'))) throw new Error('Usage: node validate.mjs [target-dir]');
  const file = join(resolve(args[0] ?? '.'), 'transitrix.yaml');
  if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) throw new Error('Manifest must be a regular file, not a symlink');
  const text = readFileSync(file, 'utf8');
  const lines = text.match(/^methodology_version:.*$/gm) ?? [];
  const candidateKeys = text.match(/(?:^|[ \t,{])[\"']?methodology_version[\"']?[ \t]*:/gm) ?? [];
  if (candidateKeys.length !== 1 || lines.length !== 1 || !/^methodology_version: (["']?)8\.0\.0\1[ \t]*(?:#.*)?\r?$/.test(lines[0])) {
    console.error('Expected one top-level methodology_version 8.0.0 pin.');
    process.exit(1);
  }
  console.log('PASS: manifest transform only. Model, tooling, profile and reporting qualification remain separate; see README.md.');
} catch (error) { console.error(error.message); process.exit(2); }
