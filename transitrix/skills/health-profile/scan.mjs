#!/usr/bin/env node
/** Node entry point for the shared health-profile collector (Python 3.10+, PyYAML). */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const collector = fileURLToPath(new URL('./health_profile.py', import.meta.url));
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const run = spawnSync(python, [collector, ...process.argv.slice(2)], { stdio: 'inherit' });
if (run.error) {
  console.error(`Cannot start health-profile collector: ${run.error.message}. Install Python 3.10+ and PyYAML; PYTHON may name the interpreter.`);
}
process.exit(run.status ?? 2);
