#!/usr/bin/env node
// Discovery — noticing drift on a schedule.
//
// Realises the scheduled-trigger contract in
// method/04-methodology-update-propagation.md §7. For each consumer listed in
// adopters.yaml, per run:
//   * clones the consumer's default branch (shallow, read-only);
//   * reads its `pin_key` from `pin_file` and compares against the latest tag
//     on the source repo (this one);
//   * scans its `decisions_path` for ADR-NNNN-*.md at `status: proposed` whose
//     `date:` is older than fourteen calendar days.
//
// Emits one digest to stdout (YAML) and, when running under GitHub Actions,
// a Markdown summary appended to $GITHUB_STEP_SUMMARY.
//
// Scope: READ-ONLY. This script never pushes, never opens a PR, never edits
// a consumer. The bounded-PR write side of §7.2 requires cross-repo write
// auth and is a follow-on. When the digest reports `behind`, a maintainer
// runs the existing recipe locally (RELEASING.md §"Adopter upgrade
// procedure") until the write side lands.
//
// Args (all optional):
//   --registry <path>       default: <repo-root>/adopters.yaml
//   --source-repo <path>    default: <repo-root>
//   --workdir <path>        default: OS tmpdir + "/transitrix-discovery"
//   --now <YYYY-MM-DD>      default: today (UTC); useful for tests
//   --stale-days <n>        default: 14 (per §7.3)
//
// Exit codes:  0 clean run (findings are informational, not failures)
//              2 script-internal error (registry missing, clone failed)

import { readFile, readdir, mkdir, rm, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');

const args = process.argv.slice(2);
function argVal(flag, dflt) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
}
const REGISTRY = resolve(argVal('--registry', join(REPO_ROOT, 'adopters.yaml')));
const SOURCE_REPO = resolve(argVal('--source-repo', REPO_ROOT));
const WORKDIR = resolve(argVal('--workdir', join(tmpdir(), 'transitrix-discovery')));
const NOW = argVal('--now', new Date().toISOString().slice(0, 10));
const STALE_DAYS = parseInt(argVal('--stale-days', '14'), 10);

// --- helpers ---------------------------------------------------------------

function daysBetween(isoA, isoB) {
  const a = Date.parse(isoA + 'T00:00:00Z');
  const b = Date.parse(isoB + 'T00:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

// Split a Markdown file into { fm, body }. fm is null if no front-matter.
// Tolerant to LF or CRLF line endings — a cloned consumer may carry either.
function splitFrontMatter(text) {
  const normalised = text.replace(/\r\n/g, '\n');
  const m = normalised.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: null, body: normalised };
  return { fm: m[1], body: m[2] };
}

// Minimal scalar front-matter parser: `key: value` per line. Matches the style
// of scripts/check-adl.mjs — sufficient for the flat ADR header.
function parseFm(fmText) {
  const out = {};
  if (!fmText) return out;
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*?)\s*$/i);
    if (!m) continue;
    let v = m[2];
    v = v.replace(/\s+#.*$/, '').trim();
    v = v.replace(/^["']|["']$/g, '');
    out[m[1]] = v;
  }
  return out;
}

// Parse adopters.yaml — accepts the flat schema in §7.4. Regex-based, matching
// the codebase style (no external YAML dep).
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

function stripQuotes(v) {
  return v.replace(/^["']|["']$/g, '');
}

// Read pin_key from pin_file (YAML, flat scalar).
function extractPin(text, pinKey) {
  const re = new RegExp(`^${pinKey}\\s*:\\s*(.*)$`, 'm');
  const m = text.match(re);
  if (!m) return null;
  return stripQuotes(m[1].replace(/\s+#.*$/, '').trim());
}

// Latest release tag of the source repo. `git describe --tags --abbrev=0` for
// simplicity; falls back to `git tag --sort=-v:refname` if describe fails.
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

// Normalise a version string to comparable numeric parts. Accepts "0.7.0",
// "v0.7.0". Returns [major, minor, patch] or null if unparseable.
function semverParts(v) {
  if (!v) return null;
  const m = v.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

// Compare two versions; positive if a > b, 0 if equal, negative if a < b.
// Returns null if either is unparseable.
function semverCmp(a, b) {
  const pa = semverParts(a), pb = semverParts(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

// Shallow-clone (or refresh) a consumer repo into WORKDIR/<owner-repo>.
async function checkoutConsumer(consumer) {
  const safeName = consumer.repo.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const dest = join(WORKDIR, safeName);
  await mkdir(WORKDIR, { recursive: true });
  if (existsSync(dest)) {
    // Existing checkout — bring HEAD up to date.
    try {
      execFileSync('git', ['-C', dest, 'fetch', '--depth', '1', 'origin'],
        { stdio: ['ignore', 'ignore', 'pipe'] });
      execFileSync('git', ['-C', dest, 'reset', '--hard', 'origin/HEAD'],
        { stdio: ['ignore', 'ignore', 'pipe'] });
      return dest;
    } catch {
      // Fall through to re-clone.
      await rm(dest, { recursive: true, force: true });
    }
  }
  execFileSync('git', ['clone', '--depth', '1', consumer.clone, dest],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  return dest;
}

// Walk decisions_path and return ADR-NNNN-*.md paths.
async function findAdrs(root, subpath) {
  const dir = join(root, subpath);
  if (!existsSync(dir)) return [];
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (/^ADR-\d{4}-.+\.md$/.test(e.name)) out.push(join(dir, e.name));
  }
  return out.sort();
}

// --- main ------------------------------------------------------------------

async function main() {
  if (!existsSync(REGISTRY)) {
    process.stderr.write(`discovery: registry not found: ${REGISTRY}\n`);
    process.exit(2);
  }
  const registryText = await readFile(REGISTRY, 'utf8');
  const { consumers } = parseRegistry(registryText);
  if (consumers.length === 0) {
    process.stderr.write(`discovery: registry lists no consumers\n`);
    process.exit(2);
  }

  const tag = latestTag(SOURCE_REPO);
  if (!tag) {
    process.stderr.write(`discovery: could not determine latest tag on ${SOURCE_REPO}\n`);
    process.exit(2);
  }

  const entries = [];
  for (const c of consumers) {
    const entry = { repo: c.repo, role: c.role || null, latest_tag: tag };
    try {
      const dest = await checkoutConsumer(c);
      const pinText = await readFile(join(dest, c.pin_file), 'utf8');
      const pin = extractPin(pinText, c.pin_key);
      entry.pin = pin;
      const cmp = semverCmp(pin, tag);
      if (cmp === null) entry.status = 'unparseable';
      else if (cmp < 0) entry.status = 'behind';
      else if (cmp > 0) entry.status = 'ahead-of-tag';
      else entry.status = 'current';

      const adrs = await findAdrs(dest, c.decisions_path);
      const stale = [];
      for (const abs of adrs) {
        const text = await readFile(abs, 'utf8');
        const { fm } = splitFrontMatter(text);
        const parsed = parseFm(fm);
        if (parsed.status !== 'proposed') continue;
        const age = daysBetween(parsed.date, NOW);
        if (age === null) continue;
        if (age >= STALE_DAYS) {
          stale.push({ id: parsed.id || abs.split(/[\\/]/).pop(), age_days: age, date: parsed.date });
        }
      }
      entry.stale_proposed = stale;
    } catch (err) {
      entry.status = 'error';
      entry.error = err.message.split('\n')[0];
    }
    entries.push(entry);
  }

  emitDigest(entries, tag);
}

// --- output ----------------------------------------------------------------

function emitDigest(entries, tag) {
  const y = [];
  y.push('# Discovery digest');
  y.push(`# source_repo: transitrix/methodology`);
  y.push(`# latest_tag: ${tag}`);
  y.push(`# run_at: ${new Date().toISOString()}`);
  y.push(`# stale_threshold_days: ${STALE_DAYS}`);
  y.push('entries:');
  for (const e of entries) {
    y.push(`  - repo: ${e.repo}`);
    if (e.role) y.push(`    role: ${e.role}`);
    y.push(`    latest_tag: ${e.latest_tag}`);
    y.push(`    pin: ${e.pin ?? 'null'}`);
    y.push(`    status: ${e.status}`);
    if (e.error) y.push(`    error: ${JSON.stringify(e.error)}`);
    if (e.stale_proposed && e.stale_proposed.length) {
      y.push(`    stale_proposed:`);
      for (const s of e.stale_proposed) {
        y.push(`      - id: ${s.id}`);
        y.push(`        age_days: ${s.age_days}`);
        y.push(`        date: ${s.date}`);
      }
    } else {
      y.push(`    stale_proposed: []`);
    }
  }
  const out = y.join('\n') + '\n';
  process.stdout.write(out);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = renderMarkdown(entries, tag);
    appendFile(process.env.GITHUB_STEP_SUMMARY, md).catch(() => { /* best-effort */ });
  }
}

function renderMarkdown(entries, tag) {
  const lines = [];
  lines.push(`## Discovery digest`);
  lines.push('');
  lines.push(`- Source repo: \`transitrix/methodology\``);
  lines.push(`- Latest tag: \`${tag}\``);
  lines.push(`- Run at: ${new Date().toISOString()}`);
  lines.push(`- Stale-proposed threshold: ${STALE_DAYS} days`);
  lines.push('');
  lines.push(`| Consumer | Role | Pin | Status | Stale-proposed ADRs |`);
  lines.push(`|---|---|---|---|---|`);
  for (const e of entries) {
    const stale = (e.stale_proposed || []).map(s => `${s.id} (${s.age_days}d)`).join(', ') || '—';
    lines.push(`| \`${e.repo}\` | ${e.role || '—'} | \`${e.pin ?? '—'}\` | ${e.status}${e.error ? ` — ${e.error}` : ''} | ${stale} |`);
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

main().catch((err) => {
  process.stderr.write(`discovery: ${err.stack || err.message}\n`);
  process.exit(2);
});
