#!/usr/bin/env node
// Repository paths are admitted explicitly. Diagnostics identify paths only.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function validateManifest(manifest) {
  if (!manifest || manifest.schema !== 'publish-manifest/v1' ||
      Object.keys(manifest).sort().join(',') !== 'files,schema' ||
      !Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('Invalid publish manifest');
  }
  const seen = new Set();
  for (const path of manifest.files) {
    if (typeof path !== 'string' || !path || /[\\\x00-\x1f\x7f*?\[\]]/.test(path) ||
        path.split('/').some(part => !part || part === '.' || part === '..') || seen.has(path)) {
      throw new Error('Invalid publish manifest');
    }
    seen.add(path);
  }
  return seen;
}

export function undeclaredPaths(paths, manifest) {
  const allowed = validateManifest(manifest);
  return [...new Set(paths)].filter(path => !allowed.has(path)).sort();
}

export function main() {
  try {
    const manifest = JSON.parse(readFileSync('publish-manifest.json', 'utf8'));
    const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    const missing = undeclaredPaths(paths, manifest);
    for (const path of missing) console.error(`Undeclared path: ${JSON.stringify(path)}`);
    if (missing.length) return 1;
    console.log('Publish manifest passed');
    return 0;
  } catch {
    console.error('Publish manifest check failed');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
