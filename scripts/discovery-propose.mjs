#!/usr/bin/env node
// Discovery write-side — proposes bounded upgrade PRs on behind consumers.
//
// Realises the write half of RELEASING.md, "Discovery — noticing drift on a
// schedule" § "The scheduled-trigger contract": for each consumer in
// adopters.yaml whose pin is behind the latest source-repo tag, this script
// opens the bounded upgrade PR specified in method/09-releases-and-propagation.md
// §4 — exactly the diff that section permits (pin bump + one agent-authored
// proposed ADR).
//
// Idempotent per §7.6: before opening a PR it checks whether an open PR for
// the same version bump already exists on the consumer repo and skips if found.
//
// Environment:
//   CONSUMER_WRITE_TOKEN — GitHub PAT (or app installation token) with
//                          `contents:write` + `pull-requests:write` on each
//                          registered consumer repo. Set this secret in the
//                          methodology repo's GitHub Settings → Secrets before
//                          running. If unset the script exits 0 so the
//                          read-only digest from discovery.mjs still works.
//
// Args (all optional, same defaults as discovery.mjs):
//   --registry <path>       default: <repo-root>/adopters.yaml
//   --source-repo <path>    default: <repo-root>
//   --workdir <path>        default: OS tmpdir + "/transitrix-discovery"
//   --now <YYYY-MM-DD>      default: today (UTC)
//
// Exit codes:  0 clean run (skips are informational, not failures)
//              2 script-internal error

import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { appendFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');

const TOKEN = process.env.CONSUMER_WRITE_TOKEN || '';
if (!TOKEN) {
  process.stdout.write(
    'discovery-propose: CONSUMER_WRITE_TOKEN not set — write side skipped.\n' +
    '  To enable: add the secret CONSUMER_WRITE_TOKEN (a PAT with contents:write\n' +
    '  + pull-requests:write on each consumer repo) in the methodology repo\'s\n' +
    '  GitHub Settings → Secrets and variables → Actions. The maintainer must\n' +
    '  provision this credential before the write side can run.\n'
  );
  process.exit(0);
}

const args = process.argv.slice(2);
function argVal(flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const REGISTRY = resolve(argVal('--registry', join(REPO_ROOT, 'adopters.yaml')));
const SOURCE_REPO = resolve(argVal('--source-repo', REPO_ROOT));
const WORKDIR = resolve(argVal('--workdir', join(tmpdir(), 'transitrix-discovery')));
const NOW = argVal('--now', new Date().toISOString().slice(0, 10));

// --- shared helpers (kept in sync with discovery.mjs) ----------------------

function stripQuotes(v) {
  return v.replace(/^["']|["']$/g, '');
}

function parseRegistry(text) {
  const consumers = [];
  const lines = text.split(/\r?\n/);
  let cur = null;
  let inConsumers = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, '');
    if (/^\s*#/.test(raw)) continue;
    if (/^consumers\s*:/.test(line)) { inConsumers = true; continue; }
    if (!inConsumers) continue;
    const item = line.match(/^\s{2}-\s+([a-z_]+)\s*:\s*(.*)$/);
    if (item) {
      if (cur) consumers.push(cur);
      cur = {};
      cur[item[1]] = stripQuotes(item[2].trim());
      continue;
    }
    const field = line.match(/^\s{4,}([a-z_]+)\s*:\s*(.*)$/);
    if (field && cur) {
      cur[field[1]] = stripQuotes(field[2].trim());
    }
  }
  if (cur) consumers.push(cur);
  return { consumers };
}

function extractPin(text, pinKey) {
  const re = new RegExp(`^${pinKey}\\s*:\\s*(.*)$`, 'm');
  const m = text.match(re);
  if (!m) return null;
  return stripQuotes(m[1].replace(/\s+#.*$/, '').trim());
}

function latestTag(repoRoot) {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { /* fall through */ }
  try {
    const out = execFileSync('git', ['tag', '--list', '--sort=-v:refname'],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out.split('\n').filter(Boolean)[0] || null;
  } catch {
    return null;
  }
}

function semverParts(v) {
  if (!v) return null;
  const m = v.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function semverCmp(a, b) {
  const pa = semverParts(a), pb = semverParts(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

async function checkoutConsumer(consumer) {
  const safeName = consumer.repo.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const dest = join(WORKDIR, safeName);
  await mkdir(WORKDIR, { recursive: true });
  if (existsSync(dest)) {
    try {
      execFileSync('git', ['-C', dest, 'fetch', '--depth', '1', 'origin'],
        { stdio: ['ignore', 'ignore', 'pipe'] });
      execFileSync('git', ['-C', dest, 'reset', '--hard', 'origin/HEAD'],
        { stdio: ['ignore', 'ignore', 'pipe'] });
      return dest;
    } catch {
      await rm(dest, { recursive: true, force: true });
    }
  }
  execFileSync('git', ['clone', '--depth', '1', consumer.clone, dest],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  return dest;
}

// --- write-side helpers -----------------------------------------------------

// Return the next unused ADR sequence number in the consumer's decisions folder.
async function nextAdrNumber(consumerRoot, decisionsPath) {
  const dir = join(consumerRoot, decisionsPath);
  if (!existsSync(dir)) return 1;
  const entries = await readdir(dir);
  let max = 0;
  for (const name of entries) {
    const m = name.match(/^ADR-(\d{4})-/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

// Replace the pin_key value in the pin_file text with newVersion.
function bumpPin(text, pinKey, newVersion) {
  const re = new RegExp(`(^${pinKey}\\s*:\\s*)(["\']?[^"\\s#]*["\']?)`, 'm');
  if (!re.test(text)) throw new Error(`pin key '${pinKey}' not found`);
  return text.replace(re, `$1"${newVersion}"`);
}

// Build the body of an agent-authored proposed ADR for a pin bump.
function buildAdr({ padded, repo, targetTag, today }) {
  const label = repo.split('/').pop();
  return [
    '---',
    `id: ADR-${padded}`,
    `title: "Pin methodology_version to ${targetTag} for the ${label} model"`,
    `status: proposed`,
    `date: "${today}"`,
    `author: agent`,
    `source: ad-hoc`,
    `relates_to: []`,
    `superseded_by: null`,
    '---',
    '',
    '## Context',
    '',
    `The methodology released ${targetTag}. The Discovery job, comparing the pinned`,
    `\`methodology_version\` against the latest released tag on the source repository,`,
    `found this repository behind and prepared this record. Per the architecture`,
    `decision log, a consequential change made by an agent leaves a \`proposed\``,
    `decision for human ratification, not an unannounced edit.`,
    '',
    '## Decision',
    '',
    `Pin \`methodology_version: "${targetTag}"\` in \`transitrix.yaml\`.`,
    `(Proposed — not in force until a maintainer ratifies this record.)`,
    '',
    '## Consequences',
    '',
    `- Once ratified, the model is validated against ${targetTag} semantics; any`,
    `  applicable migration notes for the bump apply (\`migrations/\` in the`,
    `  source methodology repository).`,
    `- For a MINOR or PATCH increment with no migration recipe, no codemod is required.`,
    `- For a MAJOR increment, run the migration recipe before accepting this ADR.`,
  ].join('\n') + '\n';
}

// Return true if an open PR already exists for the given head branch.
function openPrExists(repo, branch) {
  try {
    const out = execFileSync(
      'gh', ['pr', 'list', '--repo', repo, '--head', branch, '--state', 'open', '--json', 'number'],
      { encoding: 'utf8', env: { ...process.env, GH_TOKEN: TOKEN }, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

// --- main -------------------------------------------------------------------

const results = [];

async function main() {
  if (!existsSync(REGISTRY)) {
    process.stderr.write(`discovery-propose: registry not found: ${REGISTRY}\n`);
    process.exit(2);
  }
  const registryText = await readFile(REGISTRY, 'utf8');
  const { consumers } = parseRegistry(registryText);
  if (consumers.length === 0) {
    process.stderr.write(`discovery-propose: registry lists no consumers\n`);
    process.exit(2);
  }

  const tag = latestTag(SOURCE_REPO);
  if (!tag) {
    process.stderr.write(`discovery-propose: could not determine latest tag on ${SOURCE_REPO}\n`);
    process.exit(2);
  }
  const tagBare = tag.replace(/^v/, '');

  for (const c of consumers) {
    const result = { repo: c.repo, outcome: 'skipped', detail: '' };
    process.stdout.write(`\ndiscovery-propose: checking ${c.repo}\n`);

    let dest;
    try {
      dest = await checkoutConsumer(c);
    } catch (err) {
      result.outcome = 'error';
      result.detail = `clone failed: ${err.message.split('\n')[0]}`;
      process.stdout.write(`  ${result.detail}\n`);
      results.push(result);
      continue;
    }

    let pin;
    try {
      const pinText = await readFile(join(dest, c.pin_file), 'utf8');
      pin = extractPin(pinText, c.pin_key);
    } catch (err) {
      result.outcome = 'error';
      result.detail = `could not read pin: ${err.message.split('\n')[0]}`;
      process.stdout.write(`  ${result.detail}\n`);
      results.push(result);
      continue;
    }

    const cmp = semverCmp(pin, tag);
    if (cmp === null) {
      result.outcome = 'skipped';
      result.detail = `pin '${pin}' unparseable`;
      process.stdout.write(`  ${result.detail} — skipping\n`);
      results.push(result);
      continue;
    }
    if (cmp >= 0) {
      result.outcome = 'current';
      result.detail = `pin ${pin} >= ${tag}`;
      process.stdout.write(`  ${result.detail} — nothing to do\n`);
      results.push(result);
      continue;
    }

    process.stdout.write(`  pin ${pin} is behind ${tag} — proposing upgrade\n`);
    const branch = `feat/upgrade-methodology-${tagBare}`;

    if (openPrExists(c.repo, branch)) {
      result.outcome = 'existing-pr';
      result.detail = `open PR already exists for branch '${branch}'`;
      process.stdout.write(`  ${result.detail} — skipping\n`);
      results.push(result);
      continue;
    }

    // Reset checkout to a clean default-branch HEAD, then create the branch.
    try {
      execFileSync('git', ['-C', dest, 'checkout', '-b', branch],
        { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch {
      try {
        execFileSync('git', ['-C', dest, 'checkout', branch],
          { stdio: ['ignore', 'ignore', 'pipe'] });
        execFileSync('git', ['-C', dest, 'reset', '--hard', 'origin/HEAD'],
          { stdio: ['ignore', 'ignore', 'pipe'] });
      } catch (err2) {
        result.outcome = 'error';
        result.detail = `could not create branch: ${err2.message.split('\n')[0]}`;
        process.stdout.write(`  ${result.detail}\n`);
        results.push(result);
        continue;
      }
    }

    // Bump pin in pin_file.
    const pinFilePath = join(dest, c.pin_file);
    try {
      const pinContent = await readFile(pinFilePath, 'utf8');
      const bumped = bumpPin(pinContent, c.pin_key, tagBare);
      await writeFile(pinFilePath, bumped, 'utf8');
    } catch (err) {
      result.outcome = 'error';
      result.detail = `pin bump failed: ${err.message.split('\n')[0]}`;
      process.stdout.write(`  ${result.detail}\n`);
      results.push(result);
      continue;
    }

    // Create the proposed ADR.
    const adrNum = await nextAdrNumber(dest, c.decisions_path);
    const padded = String(adrNum).padStart(4, '0');
    const versionSlug = tagBare.replace(/\./g, '-');
    const adrFilename = `ADR-${padded}-pin-methodology-${versionSlug}.md`;
    const adrPath = join(dest, c.decisions_path, adrFilename);
    const adrContent = buildAdr({ padded, repo: c.repo, targetTag: tagBare, today: NOW });
    try {
      await writeFile(adrPath, adrContent, 'utf8');
    } catch (err) {
      result.outcome = 'error';
      result.detail = `ADR write failed: ${err.message.split('\n')[0]}`;
      process.stdout.write(`  ${result.detail}\n`);
      results.push(result);
      continue;
    }

    // Commit and push.
    const tokenUrl = `https://x-access-token:${TOKEN}@github.com/${c.repo}.git`;
    try {
      execFileSync('git', ['-C', dest, 'remote', 'set-url', 'origin', tokenUrl],
        { stdio: ['ignore', 'ignore', 'pipe'] });
      execFileSync('git', ['-C', dest, 'add',
        c.pin_file,
        `${c.decisions_path}/${adrFilename}`,
      ], { stdio: ['ignore', 'ignore', 'pipe'] });
      execFileSync('git', ['-C', dest,
        '-c', 'user.name=Transitrix Discovery Bot',
        '-c', 'user.email=bot@users.noreply.github.com',
        'commit', '-s', '-m',
        `feat: bump methodology_version to ${tagBare}\n\nProposed ADR: ${adrFilename}\nRatification: flip status proposed→accepted in a separate reviewed change.`,
      ], { stdio: ['ignore', 'ignore', 'pipe'] });
      execFileSync('git', ['-C', dest, 'push', '-u', 'origin', branch],
        { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (err) {
      result.outcome = 'error';
      result.detail = `commit/push failed: ${err.message.split('\n')[0]}`;
      process.stdout.write(`  ${result.detail}\n`);
      results.push(result);
      continue;
    }

    // Open the PR.
    const prBody = [
      `## Upgrade: \`methodology_version\` → ${tagBare}`,
      '',
      'Opened by the Discovery job. Bounded to exactly:',
      '',
      `- \`${c.pin_file}\`: \`${c.pin_key}\` bumped from \`${pin}\` to \`${tagBare}\``,
      `- \`${c.decisions_path}/${adrFilename}\`: agent-authored proposed ADR`,
      '',
      '**Ratification gate:** flip the ADR `status: proposed → accepted` in a',
      'separate, reviewed change to put this upgrade in force.',
      '',
      'For a MAJOR version bump, run the migration recipe from `migrations/` in the',
      'source methodology repository before accepting.',
    ].join('\n');

    let prUrl = '';
    try {
      const prOut = execFileSync('gh', [
        'pr', 'create',
        '--repo', c.repo,
        '--head', branch,
        '--title', `feat: bump methodology_version to ${tagBare}`,
        '--body', prBody,
      ], {
        encoding: 'utf8',
        env: { ...process.env, GH_TOKEN: TOKEN },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      prUrl = prOut.trim();
      result.outcome = 'pr-opened';
      result.detail = prUrl;
      process.stdout.write(`  PR opened: ${prUrl}\n`);
    } catch (err) {
      result.outcome = 'error';
      result.detail = `gh pr create failed: ${err.message.split('\n')[0]}`;
      process.stdout.write(`  ${result.detail}\n`);
    }
    results.push(result);
  }

  emitSummary(results, tag);
}

function emitSummary(entries, tag) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const lines = [
    '## Discovery propose',
    '',
    `- Source tag: \`${tag}\``,
    `- Run at: ${new Date().toISOString()}`,
    '',
    '| Consumer | Outcome | Detail |',
    '|---|---|---|',
  ];
  for (const e of entries) {
    const detail = e.detail ? e.detail.replace(/\|/g, '\\|') : '—';
    lines.push(`| \`${e.repo}\` | ${e.outcome} | ${detail} |`);
  }
  lines.push('');
  appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n').catch(() => {});
}

main().catch((err) => {
  process.stderr.write(`discovery-propose: ${err.stack || err.message}\n`);
  process.exit(2);
});
