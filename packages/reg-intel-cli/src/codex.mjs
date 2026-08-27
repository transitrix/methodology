// Codex discovery + parsing. The reg-intel scanner reads source discovery from
// operations/config/scan-sources.yaml (14-codex.md §3.7); the per-artefact `scan:`
// block (14-codex.md §3.5) holds runtime state (last_scanned_at, next_scan_due, …)
// and doubles as a human-facing visibility marker. This module exposes both the
// centralised watch-list loader and the per-file codex artefact parser.

import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve, dirname, basename, relative } from 'node:path';
import { readTopScalar, readBlockScalars, readMapList } from './yaml.mjs';
import { isDue } from './schedule.mjs';

async function exists(p) { try { await access(p); return true; } catch { return false; } }

// Load operations/config/scan-sources.yaml from the adopter org root.
// Returns the parsed `sources` list, or null when the file does not exist.
export async function loadScanSources(orgRoot) {
  const p = join(resolve(orgRoot), 'operations', 'config', 'scan-sources.yaml');
  if (!(await exists(p))) return null;
  let text;
  try { text = await readFile(p, 'utf8'); } catch { return null; }
  return readMapList(text, 'sources');
}

// Walk upward from a path to the adopter org root (the dir holding transitrix.yaml).
export async function findOrgRoot(fromPath) {
  let dir = resolve(fromPath);
  if (await exists(dir)) {
    try {
      const { stat } = await import('node:fs/promises');
      if ((await stat(dir)).isFile()) dir = dirname(dir);
    } catch { /* fall through */ }
  }
  for (;;) {
    if (await exists(join(dir, 'transitrix.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Convert a glob pattern (supporting * and **) to a RegExp for path matching.
function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const rx = escaped
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp('^' + rx + '$');
}

async function walkYaml(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walkYaml(p, out);
    else if (e.isFile() && e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

// Parse one codex artefact file into the fields the scheduler reads.
export function parseCodexArtefact(text, file) {
  const id = readTopScalar(text, 'id') ?? basename(file, '.yaml');
  return {
    file,
    id,
    type: readTopScalar(text, 'type') ?? null,
    name: readTopScalar(text, 'name') ?? null,
    source_url: readTopScalar(text, 'source_url') ?? null,
    monitoring_needed: readTopScalar(text, 'monitoring_needed'),
    scan: readBlockScalars(text, 'scan'),
    monitor_instead: readMapList(text, 'monitor_instead'),
  };
}

// Discover every codex artefact under <orgRoot>/codex/ (external + internal).
// excludePatterns — optional glob list (relative to codex/ root) matching paths to skip.
// Mirrors view.regimes.exclude_paths from 22-coverage-metric.md §4.
export async function discoverCodex(orgRoot, { excludePatterns = [] } = {}) {
  const codexDir = join(resolve(orgRoot), 'codex');
  if (!(await exists(codexDir))) return [];
  const regexes = excludePatterns.map(globToRegex);
  const out = [];
  for (const file of (await walkYaml(codexDir)).sort()) {
    if (regexes.length > 0) {
      const rel = relative(codexDir, file).replace(/\\/g, '/');
      if (regexes.some(rx => rx.test(rel))) continue;
    }
    let text;
    try { text = await readFile(file, 'utf8'); } catch { continue; }
    out.push(parseCodexArtefact(text, file));
  }
  return out;
}

// The due set for a run as-of a date. Source discovery comes from
// operations/config/scan-sources.yaml (14-codex.md §3.7); the per-artefact scan: block
// holds the runtime state (last_scanned_at / next_scan_due). Returns null when the
// watch-list file does not exist, or an array of due entries when it does.
export async function listDue(orgRoot, asOf) {
  const scanSources = await loadScanSources(orgRoot);
  if (scanSources === null) return null;

  const due = [];
  for (const entry of scanSources) {
    if (entry.type !== 'codex') continue; // non-codex connectors reserved for a future increment
    if (!entry.path_or_url) continue;

    const codexPath = join(resolve(orgRoot), String(entry.path_or_url));
    let text;
    try { text = await readFile(codexPath, 'utf8'); } catch { continue; }
    const art = parseCodexArtefact(text, codexPath);

    // A static source (monitoring_needed: false) does not get scanned directly;
    // instead, its monitor_instead counterparts are surfaced as separate scan targets.
    if (!art.monitoring_needed && art.monitor_instead) {
      for (const alt of art.monitor_instead) {
        due.push({
          id: alt.id,
          type: null,
          name: alt.name || alt.id,
          source_url: alt.url,
          scan_frequency: entry.cadence || null,
          next_scan_due: null,
          monitoring_needed: true,
          reason: 'monitor_instead',
          via: entry.id || art.id,
        });
      }
    } else {
      // A live source (monitoring_needed: true) is scanned directly.
      const next = (art.scan && art.scan.next_scan_due) || null;
      if (!isDue(next, asOf)) continue;

      due.push({
        id: entry.id || art.id,
        type: art.type,
        name: art.name,
        source_url: art.source_url,
        scan_frequency: entry.cadence || (art.scan && art.scan.scan_frequency) || null,
        next_scan_due: next,
        monitoring_needed: true,
        reason: next ? 'due' : 'never_scanned',
      });
    }
  }
  return due;
}

// Locate a codex artefact file by its ID under <orgRoot>/codex/. Returns the path or null.
export async function findCodexFile(orgRoot, id) {
  const codexDir = join(resolve(orgRoot), 'codex');
  for (const file of await walkYaml(codexDir)) {
    if (basename(file, '.yaml') === id) return file;
    try {
      if (readTopScalar(await readFile(file, 'utf8'), 'id') === id) return file;
    } catch { /* skip */ }
  }
  return null;
}
