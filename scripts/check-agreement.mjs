#!/usr/bin/env node
// Agreement-axis checker — CONTRACT.md §6.3, reference implementation.
//
// Validates the AGREE-* rules over REQUIREMENT / CONSTRAINT / NEED files:
//   AGREE-001  `agreement` present and not draft|agreed|disputed.
//   AGREE-002  `agreement: agreed` but `agreed_by` identifies a tool.
//   AGREE-003  `agreement` present but `agreed_by` is missing.
//
// `agreed_by` tool-detection reuses the same convention as `ADMIT-007`'s
// footgun-catcher (packages/decisions-cli/src/apply.mjs): an npm-scoped name
// or a hyphenated *-cli / *-reviewer / *-bot / *-scanner id reads as a tool;
// anything else reads as a human handle. Not a security boundary — catches
// the common mistake of a tool defaulting/copy-pasting `agreed`.
//
// Usage:
//   node scripts/check-agreement.mjs [--root <adopter-repo>]
//
// Exit codes: 0 clean · 1 findings · 2 script-internal error

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const AGREEMENT_TYPES = ['REQUIREMENT', 'CONSTRAINT', 'NEED'];
const AGREEMENT_VALUES = ['draft', 'agreed', 'disputed'];

const TOOL_ID_RE = /^@|-cli$|-reviewer(?:-\w+)?$|-bot$|-scanner$/i;

export function looksLikeTool(id) {
  return TOOL_ID_RE.test(String(id || ''));
}

// Targeted top-level scalar extraction — same convention as
// scripts/baseline-manifest.mjs's `field()`; not a general YAML parser.
function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n#]*?)"?\\s*(?:#.*)?$`, 'm'));
  return m ? m[1].trim() : undefined;
}

export function deriveType(id) {
  const m = id?.match(/^([A-Z][A-Z0-9_]*)-/);
  return m ? m[1] : undefined;
}

// Pure check over an already-extracted {agreement, agreed_by} pair.
// Returns a list of finding codes — empty means clean (including the
// back-compat case where `agreement` is absent entirely).
export function checkAgreement({ agreement, agreed_by: agreedBy } = {}) {
  if (agreement === undefined) return [];

  if (!AGREEMENT_VALUES.includes(agreement)) {
    return ['AGREE-001'];
  }
  if (!agreedBy) {
    return ['AGREE-003'];
  }
  const findings = [];
  if (agreement === 'agreed' && looksLikeTool(agreedBy)) {
    findings.push('AGREE-002');
  }
  return findings;
}

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.isFile() && entry.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const rootFlagIndex = args.indexOf('--root');
  const root = resolve(rootFlagIndex >= 0 && args[rootFlagIndex + 1] ? args[rootFlagIndex + 1] : '.');
  const canonElements = join(root, 'canon', 'elements');

  const files = await walk(canonElements);
  let findingsCount = 0;

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const id = field(text, 'id');
    const type = deriveType(id);
    if (!type || !AGREEMENT_TYPES.includes(type)) continue;

    const agreement = field(text, 'agreement');
    const agreedBy = field(text, 'agreed_by');
    const codes = checkAgreement({ agreement, agreed_by: agreedBy });
    for (const code of codes) {
      findingsCount++;
      console.log(`${code}  ${file}  (id=${id}, agreement=${agreement}, agreed_by=${agreedBy || '(absent)'})`);
    }
  }

  if (findingsCount > 0) {
    console.log(`\n${findingsCount} finding(s).`);
    process.exitCode = 1;
  } else {
    console.log('check-agreement: clean.');
  }
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 2;
  });
}
