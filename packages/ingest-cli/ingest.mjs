#!/usr/bin/env node
// Catch vocabulary failures during module initialization as well as command execution.
import { readFile } from 'node:fs/promises';
import { VocabularyError } from './src/vocabulary.mjs';

const args = process.argv.slice(2);
try {
  if (args[0] === '--version' || args[0] === '-v') {
    const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
  } else {
    const { main } = await import('./cli.mjs');
    process.exitCode = await main(args);
  }
} catch (error) {
  if (error instanceof VocabularyError) {
    if (args[0] === 'repo-check') {
      console.error('repo-check: incomplete — all health checks unavailable; no checks ran.');
    }
    console.error(error.message);
    console.error('Set TRANSITRIX_NOTATIONS_DIR to a directory containing vocabulary.yaml and CURRENT_VERSION.yaml from the same compatible methodology release. Restore missing or damaged files from that release; do not bypass the version pin.');
  } else {
    console.error(error?.stack || error);
  }
  process.exitCode = 2;
}
