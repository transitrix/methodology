#!/usr/bin/env node
// Reuse the release's reference validator so severity and graph rules cannot drift.
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(a => a.startsWith('--'))) throw new Error('Usage: node validate.mjs [target-dir]');
  const root = resolve(args[0] ?? '.');
  if (!statSync(root).isDirectory()) throw new Error('Target must be a directory');
  const text = readFileSync(join(root, 'transitrix.yaml'), 'utf8');
  const pins = text.match(/^methodology_version:.*$/gm) ?? [];
  if (pins.length !== 1 || !/^methodology_version: (["']?)6\.0\.0\1[ \t]*(?:#.*)?\r?$/.test(pins[0])) {
    console.error('transitrix.yaml: expected methodology_version 6.0.0');
    process.exit(1);
  }
  const linter = fileURLToPath(new URL('../../tools/knowledge_store_lint.py', import.meta.url));
  const result = spawnSync('python3', [linter, root], { stdio: 'inherit' });
  if (result.error || result.signal) throw result.error ?? new Error(`Validator stopped: ${result.signal}`);
  if (result.status !== 0) process.exit(result.status === 1 ? 1 : 2);
  console.log('PASS: release pin and knowledge-store checks. Review historical preservation, extraction inputs, and external validator coverage separately (README.md).');
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
