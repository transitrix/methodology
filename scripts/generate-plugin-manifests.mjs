#!/usr/bin/env node
// Plugin manifest generator — derives the portable Agent Plugins v1.0.0
// manifest (`transitrix/plugin.json`) from the hand-maintained Claude Code
// manifest (`transitrix/.claude-plugin/plugin.json`), so the two never drift
// out of hand-editing sync (epic transitrix-hq#158, deliverable 1).
//
// Agent Plugins Specification v1.0.0 <https://agent-plugins.org/specification>
// closes the root `plugin.json` schema to exactly: $schema, name, version,
// description, author, homepage, repository, license, keywords, extensions.
// Every one of those (bar $schema, which is fixed, and extensions, which we
// don't use) already exists on the Claude Code manifest, so generation is a
// field copy plus the schema URL — no client-specific fields survive.
//
// Usage:
//   node scripts/generate-plugin-manifests.mjs          # write transitrix/plugin.json
//   node scripts/generate-plugin-manifests.mjs --check  # fail if it would change (CI drift check)
//
// Exit codes: 0 clean/written · 1 drift found (--check only) · 2 script-internal error

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = join(REPO_ROOT, 'transitrix', '.claude-plugin', 'plugin.json');
const TARGET_PATH = join(REPO_ROOT, 'transitrix', 'plugin.json');

const AGENT_PLUGINS_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';

// Fields the Agent Plugins v1.0.0 manifest schema permits, in the order
// they're emitted. `$schema` and `extensions` are handled separately.
const PORTABLE_FIELDS = ['name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords'];

// §5.5 plugin name constraints: 1-64 chars, lowercase alnum/hyphen/period,
// alnum start and end, no consecutive hyphens or periods.
const NAME_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-)|\.(?!\.))*[a-z0-9]$|^[a-z0-9]$/;

export function derivePortableManifest(source) {
  if (!NAME_RE.test(source.name) || source.name.length > 64) {
    throw new Error(`source manifest name "${source.name}" violates Agent Plugins §5.5 name constraints`);
  }
  const manifest = { $schema: AGENT_PLUGINS_SCHEMA };
  for (const field of PORTABLE_FIELDS) {
    if (source[field] !== undefined) manifest[field] = source[field];
  }
  return manifest;
}

function serialize(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes('--check');

  const source = JSON.parse(await readFile(SOURCE_PATH, 'utf8'));
  const generated = serialize(derivePortableManifest(source));

  if (check) {
    let existing;
    try {
      existing = await readFile(TARGET_PATH, 'utf8');
    } catch {
      console.error(`generate-plugin-manifests: ${TARGET_PATH} does not exist. Run without --check to create it.`);
      process.exitCode = 1;
      return;
    }
    if (existing !== generated) {
      console.error(`generate-plugin-manifests: ${TARGET_PATH} is stale relative to ${SOURCE_PATH}.`);
      console.error('Run: node scripts/generate-plugin-manifests.mjs');
      process.exitCode = 1;
      return;
    }
    console.log('generate-plugin-manifests: transitrix/plugin.json is up to date.');
    return;
  }

  await writeFile(TARGET_PATH, generated, 'utf8');
  console.log(`generate-plugin-manifests: wrote ${TARGET_PATH}`);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 2;
  });
}
