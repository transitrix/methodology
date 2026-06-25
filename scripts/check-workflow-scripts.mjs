#!/usr/bin/env node
// Verifies that every local script path referenced in CI workflow run: blocks
// exists in the repository. Prevents stale task definitions from silently
// breaking CI.
//
// What we check:
//   A. `node <path>` and `node scripts/<file>` references in run: steps
//   B. `python[3] <path>` references in run: steps (ignoring -c/-m inline code)
//   C. `npx` invocations are NOT checked — they reference published packages,
//      not local scripts.
//
// What we do NOT check:
//   - Inline python/node code (python3 -c "...", eval constructs)
//   - Shell built-ins (bash, set, echo, etc.)
//   - Scripts in integration/ — these are adopter-facing examples and may
//     legitimately reference tools not yet in this repo (e.g. @transitrix/cli)
//
// Exit codes:
//   0 — every referenced local script exists
//   1 — one or more referenced scripts are missing
//   2 — script-internal error (file not found, parse failure)

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');
const WORKFLOWS_DIR = join(REPO_ROOT, '.github', 'workflows');

// Patterns that indicate a local script reference in a run: block.
// Each returns { path } when it matches, or null when it doesn't.
const EXTRACTORS = [
  // node scripts/foo.mjs [args...]
  // node scripts/foo.mjs
  line => {
    const m = line.match(/\bnode\s+((?:scripts\/|transitrix\/|packages\/|tools\/)[^\s]+\.[mc]?js)\b/);
    return m ? m[1] : null;
  },
  // python3 path/to/script.py [args...] — but not `python3 -c` or `python3 -m`
  line => {
    const m = line.match(/\bpython3?\s+(?!-[cm]\s)([^\s]+\.py)\b/);
    return m ? m[1] : null;
  },
];

async function findWorkflowFiles() {
  let entries;
  try {
    entries = await readdir(WORKFLOWS_DIR);
  } catch {
    throw new Error(`Cannot read ${WORKFLOWS_DIR}`);
  }
  return entries
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map(f => join(WORKFLOWS_DIR, f));
}

function extractScriptRefs(workflowText) {
  const refs = [];
  for (const line of workflowText.split('\n')) {
    const stripped = line.trim().replace(/^\|/, '').trim(); // handle YAML block scalars
    for (const extractor of EXTRACTORS) {
      const path = extractor(stripped);
      if (path) refs.push(path);
    }
  }
  return refs;
}

async function main() {
  let workflowFiles;
  try {
    workflowFiles = await findWorkflowFiles();
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(2);
  }

  if (workflowFiles.length === 0) {
    console.log('No workflow files found — nothing to check.');
    process.exit(0);
  }

  const missing = [];

  for (const wf of workflowFiles) {
    let text;
    try {
      text = await readFile(wf, 'utf8');
    } catch (e) {
      console.error(`error: cannot read ${wf}: ${e.message}`);
      process.exit(2);
    }

    const refs = extractScriptRefs(text);
    const wfName = wf.replace(REPO_ROOT + '/', '').replace(REPO_ROOT + '\\', '');

    for (const ref of refs) {
      const abs = resolve(REPO_ROOT, ref);
      if (!existsSync(abs)) {
        missing.push({ workflow: wfName, script: ref });
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      `\nWorkflow script integrity check failed — ${missing.length} missing reference(s):\n`
    );
    for (const { workflow, script } of missing) {
      console.error(`  [WFSCRIPT-001] ${workflow}: references '${script}' which does not exist in the repo.`);
    }
    console.error(
      `\nEither add the missing script to the repo, or remove the stale workflow step.\n`
    );
    process.exit(1);
  }

  console.log(
    `Workflow script integrity check passed — ${workflowFiles.length} workflow file(s) checked, ` +
    `no missing local script references.`
  );
  process.exit(0);
}

main().catch(e => {
  console.error(`error: ${e.message}`);
  process.exit(2);
});
