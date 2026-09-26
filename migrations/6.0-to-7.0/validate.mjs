#!/usr/bin/env node
// Read-only, release-specific numeric preflight; not whole-model certification.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if (args.length > 1 || args.some(a => a.startsWith('--'))) {
  console.error('Usage: node validate.mjs [target-dir]'); process.exit(2);
}
const result = spawnSync('python3', [fileURLToPath(new URL('./check-action-numbers.py', import.meta.url)), args[0] ?? '.'], { stdio: 'inherit' });
if (result.error || result.signal) { console.error(result.error?.message ?? result.signal); process.exit(2); }
process.exit(result.status ?? 2);
