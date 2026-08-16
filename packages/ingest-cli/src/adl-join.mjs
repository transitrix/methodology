// L0 — join the decision-log network in one step (method/07-decisions.md
// §9, method/09-releases-and-propagation.md §6.2 "L0 — decisions"). L0's mechanism already
// ships (operations/decisions/, check-adl.mjs); this module packages the three manual
// steps guides/adl-adopter-setup.md Step 1/3 otherwise walks a human through by hand into one idempotent call:
// the records folder, the CI guard wired into this repo's own workflow, and the line
// the central architecture repo's harvest.config.yaml needs to see this repo.
//
// Writes only to the target org-root's own filesystem — never across a repository
// boundary, and never overwrites a file a prior run (or an adopter) already placed.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// GH Actions workflow running the vendored guard — same shape as this repo's own
// .github/workflows/adl-guard.yml, the reference wiring check-adl.mjs already runs
// under here. fetch-depth: 0 and --base so the immutability (A2) and agent-gate (A3)
// checks can diff a record against the base branch.
function workflowYaml() {
  return [
    'name: ADL guard',
    '',
    'on:',
    '  pull_request:',
    '  workflow_dispatch:',
    '',
    'jobs:',
    '  check:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Checkout',
    '        uses: actions/checkout@v4',
    '        with:',
    '          fetch-depth: 0',
    '',
    '      - name: Set up Node.js',
    '        uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '20'",
    '',
    '      - name: Run ADL guard',
    "        run: node scripts/check-adl.mjs --base origin/${{ github.base_ref || 'main' }}",
    '',
  ].join('\n');
}

// The `sources:` entry a human adds to the central repo's
// architecture/decision-log/harvest.config.yaml (method/07-decisions.md §5) to onboard this repo
// into the harvest. Returned as text only — this command never writes across a
// repository boundary, so it prints the line rather than opening a PR anywhere.
function harvestSourceLine(repoCoordinate) {
  const name = repoCoordinate.includes('/') ? repoCoordinate.split('/').pop() : repoCoordinate;
  return [
    `  - repo: ${name}`,
    '    path: operations/decisions',
    `    clone: https://github.com/${repoCoordinate}.git`,
  ].join('\n');
}

// Join at L0. Idempotent — a file or folder already in place is left untouched and
// reported under `existing`, never overwritten (a prior run, or hand authoring,
// stays authoritative). `repoCoordinate` (`<org>/<repo>`) is optional — omit it to
// skip the central-onboarding line and do only the local half.
export async function adoptAdl(orgRoot, { repoCoordinate } = {}) {
  const root = resolve(orgRoot);
  const created = [];
  const existing = [];

  const decisionsDir = join(root, 'operations', 'decisions');
  if (await exists(decisionsDir)) existing.push('operations/decisions/');
  else { await mkdir(decisionsDir, { recursive: true }); created.push('operations/decisions/'); }
  const keep = join(decisionsDir, '.gitkeep');
  if (!(await exists(keep))) await writeFile(keep, '', 'utf8');

  const scriptDest = join(root, 'scripts', 'check-adl.mjs');
  if (await exists(scriptDest)) existing.push('scripts/check-adl.mjs');
  else {
    const asset = await readFile(join(__dirname, '..', 'assets', 'check-adl.mjs'), 'utf8');
    await mkdir(dirname(scriptDest), { recursive: true });
    await writeFile(scriptDest, asset, 'utf8');
    created.push('scripts/check-adl.mjs');
  }

  const workflowDest = join(root, '.github', 'workflows', 'adl-check.yml');
  if (await exists(workflowDest)) existing.push('.github/workflows/adl-check.yml');
  else {
    await mkdir(dirname(workflowDest), { recursive: true });
    await writeFile(workflowDest, workflowYaml(), 'utf8');
    created.push('.github/workflows/adl-check.yml');
  }

  return {
    created,
    existing,
    centralLine: repoCoordinate ? harvestSourceLine(repoCoordinate) : null,
  };
}
